<script setup lang="ts">
// A big lenticular card, played with the pointer (or by tilting / dragging on a phone). Moving across it tilts the
// card, and as the viewing angle changes the picture under the ridges switches from one photo to the next. Mid-switch,
// like the real plastic: the ridges show, the photos ghost into a few offset copies and the edges split into a
// rainbow. Drawn in WebGL; without it, the first picture shows plain. Takes two or three pictures.
const props = defineProps<{ images: { image: string; alt: string }[] }>()
import { warmLenticular } from '~/lib/lenticular-warm'
const asset = useAssetUrl()
const hydrating = useNuxtApp().isHydrating // true on a hard refresh or a direct visit: the visitor has already been looking at the empty card
const FILL_SHIFT = .05 // how far the empty card sits from the page colour (0 = exactly the page colour, .05 = a touch darker in light mode, lighter in dark)
const root = ref<HTMLElement>()
const cardEl = ref<HTMLElement>()
const live = ref(false) // false: the CSS swing runs (from first paint, before any JS); true: the script drives the card
const canvas = ref<HTMLCanvasElement>()
const tilt = reactive({ x: 0, y: 0 })
const gl = ref(true)
const needsTilt = ref(false) // iOS only lets a page read the tilt after a tap
const tiltOn = ref(false)
const tiltLabel = useSite().keyboard.tilt
let askTilt: () => void = () => {}
let cleanup: (() => void) | null = null
let dead = false
onBeforeUnmount(() => { dead = true; cleanup?.() })

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`
const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D t0, t1, t2;
uniform vec2 s0, s1, s2;      // cover-fit scale of each picture
uniform float uView, uCount, uPitch, uReveal, uAsp;
uniform vec3 uFill;
vec3 pic(float i, vec2 uv) {
  if (i < .5) return texture2D(t0, (uv - .5) * s0 + .5).rgb;
  if (i < 1.5) return texture2D(t1, (uv - .5) * s1 + .5).rgb;
  return texture2D(t2, (uv - .5) * s2 + .5).rgb;
}
// the picture seen at view position s (0 … count-1): sharp in the middle of a step, ghosting and doubling at the edge
vec3 lens(float s, vec2 uv) {
  s = clamp(s, 0., uCount - 1.);
  float i = floor(s), f = fract(s);
  float w = smoothstep(.38, .62, f);
  float g = sin(f * 3.1416);                  // how far into a switch: 0 settled, 1 mid-switch
  vec2 o = vec2(.035 * g, 0.);
  vec3 a = (pic(i, uv) * 2. + pic(i, uv + o) + pic(i, uv - o)) / 4.;
  vec3 b = (pic(i + 1., uv) * 2. + pic(i + 1., uv + o) + pic(i + 1., uv - o)) / 4.;
  return mix(a, b, w);
}
void main() {
  vec2 uv = vec2(v.x, 1. - v.y);
  float ridge = fract(uv.x * uPitch);
  float x = ridge * 2. - 1.;                  // -1 … 1 across one cylindrical ridge
  // a round lens bends light more towards its edges, so the view changes faster there: the switch sweeps over the card in fine stripes
  float s = uView + (x + .35 * x * x * x) * .1;
  float mid = sin(fract(uView) * 3.1416);
  float spread = (.06 + .12 * mid) * (.6 + .4 * abs(x));   // the rainbow split: widest mid-switch and at a ridge's edge
  vec3 col = vec3(lens(s - spread, uv).r, lens(s, uv).g, lens(s + spread, uv).b);
  // the picture is revealed by a circle growing from the top right corner; outside it the plain fill shows (the ridges stay on top)
  float d = length(vec2((1. - uv.x) * uAsp, uv.y));
  float rad = uReveal * (length(vec2(uAsp, 1.)) + .25);
  col = mix(uFill, col, 1. - smoothstep(rad - .15, rad, d));
  // the ridges: dark where the lens curls away, a bright line where it faces the light (the light slides with the view)
  col *= 1. - .16 * pow(abs(x), 4.);
  float lit = (uView / max(uCount - 1., 1.)) * 1.6 - .8;
  col += .07 * exp(-pow((x - lit) * 3.2, 2.));
  // a moving glint across the plastic, tied to the view so it settles when the card does
  float glint = exp(-pow((uv.x + uv.y * .3 - .2 - uView * .45) * 5., 2.));
  col += glint * .12 * vec3(.9 + .1 * sin(uv.y * 30.), 1., 1.1);
  gl_FragColor = vec4(col, 1.);
}`

onMounted(async () => {
  const c = canvas.value!, el = root.value!
  const coarse = matchMedia('(pointer: coarse)').matches
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const g = c.getContext('webgl', { antialias: true, premultipliedAlpha: false })
  if (!g) { gl.value = false; return }
  const sh = (type: number, src: string) => { const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s); return s }
  const prog = g.createProgram()!
  g.attachShader(prog, sh(g.VERTEX_SHADER, VERT)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, FRAG)); g.linkProgram(prog)
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) { gl.value = false; return }
  g.useProgram(prog)
  const buf = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, buf)
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW)
  const loc = g.getAttribLocation(prog, 'p'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0)
  const u = (n: string) => g.getUniformLocation(prog, n)

  const pics = props.images.slice(0, 3)
  const loading = warmLenticular(pics.map(p => asset(p.image)!))   // shared with the background prefetch: never fetched twice
  const imgs: HTMLImageElement[] = []
  // each picture slot starts as a 1px placeholder so the shader can run (grooves + fill) before any picture has arrived
  const texs = [0, 1, 2].map((k) => {
    const t = g.createTexture(); g.activeTexture(g.TEXTURE0 + k); g.bindTexture(g.TEXTURE_2D, t)
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 1, 1, 0, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
    g.uniform1i(u(`t${k}`), k)
    return t
  })
  g.uniform1f(u('uCount'), 1)
  g.uniform1f(u('uReveal'), 0)
  const add = async (p: Promise<HTMLImageElement>) => {
    const img = await p
    await img.decode().catch(() => {})                              // decode off the main thread before the upload
    const k = imgs.length
    g.activeTexture(g.TEXTURE0 + k); g.bindTexture(g.TEXTURE_2D, texs[k]!)
    g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, img)
    imgs.push(img)
    g.uniform1f(u('uCount'), imgs.length)
  }

  // the empty card's colour: the page background (read from CSS), nudged a little so the card shape still reads; follows the theme toggle
  const probe = document.createElement('canvas'); probe.width = probe.height = 1
  const px = probe.getContext('2d', { willReadFrequently: true })!
  const toRgb = (css: string): number[] | null => {
    if (!css) return null
    px.clearRect(0, 0, 1, 1); px.fillStyle = '#010203'; px.fillStyle = css
    if (px.fillStyle === '#010203') return null                     // not a colour the browser understands
    px.fillRect(0, 0, 1, 1)
    const d = px.getImageData(0, 0, 1, 1).data
    return d[3] ? [d[0]!, d[1]!, d[2]!] : null
  }
  const setFill = () => {
    const root = document.documentElement, dark = root.dataset.theme === 'dark'
    const rgb = toRgb(getComputedStyle(root).getPropertyValue('--bg').trim())
      ?? toRgb(getComputedStyle(document.body).backgroundColor) ?? toRgb(getComputedStyle(root).backgroundColor)
      ?? (dark ? [24, 24, 28] : [224, 222, 218])
    const to = dark ? 255 : 0
    const [r, gg, b] = rgb.map(ch => (ch + (to - ch) * FILL_SHIFT) / 255)
    g.uniform3f(u('uFill'), r!, gg!, b!)
  }
  setFill()
  const mo = new MutationObserver(() => { setFill(); wake() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  const fit = () => {
    const r = c.getBoundingClientRect(), dpr = Math.min(coarse ? 1.5 : 2, devicePixelRatio)
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); g.viewport(0, 0, c.width, c.height)
    const ca = r.width / r.height
    imgs.forEach((img, k) => { const ia = img.width / img.height; g.uniform2f(u(`s${k}`), ca > ia ? 1 : ca / ia, ca > ia ? ia / ca : 1) })
    for (let k = imgs.length; k < 3; k++) g.uniform2f(u(`s${k}`), 1, 1)
    g.uniform1f(u('uPitch'), Math.max(60, r.width / 5)) // a ridge about every 5px
    g.uniform1f(u('uAsp'), r.width / r.height)
  }
  const ro = new ResizeObserver(() => { fit(); wake() }); ro.observe(c)

  // where the viewer "is": pointer across the card (and a little beyond), a dragged finger, or the phone's tilt
  const want = { x: 0, y: 0 }
  const fromPoint = (x: number, y: number) => {
    const r = el.getBoundingClientRect()
    want.x = Math.max(-1, Math.min(1, ((x - r.left) / r.width - .5) * 2.2))
    want.y = Math.max(-1, Math.min(1, ((y - r.top) / r.height - .5) * 2.2))
  }
  let raf = 0, vis = false, view = 0, armed = false, auto = !reduced   // auto: the card drifts on its own until the visitor moves a pointer or tilts the phone
  const wake = () => { if (vis && armed && !raf) raf = requestAnimationFrame(draw) }
  // a pointer move, a dragged finger or a real tilt takes over; after 3 seconds with nothing the card swings on its own again
  const IDLE = 1000
  let idleT = 0
  const resume = () => { if (dead || reduced) return; startDrift(); auto = true; wake() }
  const touched = () => { auto = false; clearTimeout(idleT); if (!reduced) idleT = window.setTimeout(resume, IDLE) }
  const onMove = (e: PointerEvent) => { touched(); fromPoint(e.clientX, e.clientY); wake() }
  let haveO = false, lg = 0, lb = 0
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return
    if (!haveO) { haveO = true; lg = e.gamma; lb = e.beta; return }    // the first reading is only the starting point
    if (Math.abs(e.gamma - lg) < 1.5 && Math.abs(e.beta - lb) < 1.5) return   // phone held still: ignore sensor noise
    lg = e.gamma; lb = e.beta; touched()
    want.x = Math.max(-1, Math.min(1, e.gamma / 30)); want.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); wake()
  }
  addEventListener('pointermove', onMove, { passive: true })
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  if (coarse && DOE?.requestPermission) needsTilt.value = true
  else if (coarse) { addEventListener('deviceorientation', onOrient); tiltOn.value = true }
  askTilt = async () => {
    try { if ((await DOE!.requestPermission!()) === 'granted') { addEventListener('deviceorientation', onOrient); tiltOn.value = true } } catch { /* stays on touch-drag */ }
  }

  // draws only while the card is still moving or the picture is still being revealed; a pointer or tilt change wakes it again
  const DUR = reduced ? 1 : 520   // ms, the circle reveal
  let wantReveal = false, revealAt = 0
  const startReveal = () => { wantReveal = true; wake() }
  // the idle drift: the card moves in "legs". Each leg goes to a new random spot over a random time with a random feel
  // (speeding up, slowing down, steady, or both), left/right and up/down on their own clocks, so the pace keeps changing
  // and the card ends up facing every direction. Runs even while the card is still blank; the tilt easing below smooths the joins.
  type Leg = { a: number, b: number, t: number, d: number, e: (u: number) => number }
  const FEELS: ((u: number) => number)[] = [u => u * u, u => 1 - (1 - u) * (1 - u), u => u * u * u, u => 1 - Math.pow(1 - u, 3), u => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2), u => u]
  const leg = (a: number, b: number, minD: number, maxD: number): Leg => ({ a, b, t: 0, d: minD + Math.random() * (maxD - minD), e: FEELS[Math.floor(Math.random() * FEELS.length)]! })
  let lastNow = 0, sideX = 1, legX = leg(0, .8, .8, 2), legY = leg(0, .4, .8, 2.4)
  const startDrift = () => {                                           // begin (or begin again) from wherever the card is now
    lastNow = 0; sideX = tilt.y > 0 ? -1 : 1
    legX = leg(tilt.y, sideX * (.5 + Math.random() * .4), .8, 2)
    legY = leg(tilt.x, (Math.random() * 2 - 1) * .7, .8, 2.4)
  }
  const along = (l: Leg, dt: number) => { l.t += dt; return l.a + (l.b - l.a) * l.e(Math.min(1, l.t / l.d)) }
  const drift = (now: number) => {
    const dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0; lastNow = now
    want.x = along(legX, dt)
    if (legX.t >= legX.d) { sideX = -sideX; legX = leg(legX.b, sideX * (.5 + Math.random() * .4), .8, 2) }
    want.y = along(legY, dt)
    if (legY.t >= legY.d) legY = leg(legY.b, (Math.random() * 2 - 1) * .7, .8, 2.4)
  }
  const draw = (now: number = performance.now()) => {
    cancelAnimationFrame(raf); raf = 0
    if (!live.value) {                                                 // hand over from the CSS swing to the script without a jump
      const cs = getComputedStyle(cardEl.value!)
      const ly = parseFloat(cs.getPropertyValue('--ly')) || 0, lx = parseFloat(cs.getPropertyValue('--lx')) || 0
      tilt.x = lx / -14; tilt.y = ly / 26
      if (auto) {
        want.x = tilt.y; want.y = tilt.x
        startDrift()
      }
      live.value = true
    }
    if (auto) drift(now)
    tilt.x += (want.y - tilt.x) * .08; tilt.y += (want.x - tilt.y) * .08
    view = (tilt.y + 1) / 2 * Math.max(0, imgs.length - 1)
    if (wantReveal && !revealAt && vis) revealAt = now                // the clock starts when the card is actually on screen
    const p = revealAt ? Math.min(1, (now - revealAt) / DUR) : 0
    g.uniform1f(u('uReveal'), p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)   // ease in and out
    g.uniform1f(u('uView'), view)
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4)
    const moving = Math.abs(want.x - tilt.y) > .0008 || Math.abs(want.y - tilt.x) > .0008
    if (vis && (auto || moving || (wantReveal && p < 1))) raf = requestAnimationFrame(draw)
  }
  const io = new IntersectionObserver(([e]) => { vis = !!e?.isIntersecting; if (!vis) { cancelAnimationFrame(raf); raf = 0 } else wake() })
  io.observe(el)
  cleanup = () => { dead = true; clearTimeout(idleT); ro.disconnect(); io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('deviceorientation', onOrient) }

  // HARD REFRESH / DIRECT VISIT: the empty card was already on screen, so the circle reveal plays the moment picture 1 is ready (no waiting).
  // FAST (opened from another page and every picture is here within GRACE ms): no empty card and no animation, the card is just shown as it should be.
  // SLOW (anything still loading after GRACE): the empty card with its grooves shows first, then the circle reveal plays when picture 1 arrives.
  const GRACE = 300 // ms
  ;(async () => {
    const everything = Promise.allSettled(loading).then(() => true)
    const fast = !hydrating && await Promise.race([everything, new Promise<boolean>(r => setTimeout(() => r(false), GRACE))])
    if (dead) return
    if (fast) {
      for (const p of loading) { try { await add(p) } catch { /* that one is skipped */ } if (dead) return }
      fit(); wantReveal = true; revealAt = 1; armed = true; draw()                   // already complete: the picture is simply there, no animation
      return
    }
    armed = true; fit(); draw()                                        // grooves on the empty fill, and the card starts moving
    try { await add(loading[0]!) } catch { return }                    // no picture: the card just keeps its grooves
    if (dead) return
    fit(); startReveal()
    for (const p of loading.slice(1)) {                                // the others join as they arrive
      try { await add(p) } catch { continue }
      if (dead) return
      fit(); draw()
    }
  })()
})
</script>

<template>
  <div ref="root" class="lenti">
    <div ref="cardEl" class="card" :class="{ pre: !live }" :style="{ '--lx': `${tilt.x * -14}deg`, '--ly': `${tilt.y * 26}deg`, '--lsheen': `${50 - tilt.y * 50}%` }" role="img" :aria-label="images.map(i => i.alt).join(' / ')">
      <!-- the thickness of the plastic sheet: plates behind the face -->
      <i v-for="n in 8" :key="n" class="plate" aria-hidden="true" :style="{ transform: `translateZ(${-n}px)` }" />
      <div class="face">
        <canvas v-show="gl" ref="canvas" />
        <img v-if="!gl" :src="asset(images[0]?.image)" alt="">
        <span class="edge" aria-hidden="true" />
        <span class="gloss" aria-hidden="true" />
      </div>
    </div>
    <button v-if="needsTilt && !tiltOn" type="button" class="enable" @click="askTilt">{{ tiltLabel }}</button>
  </div>
</template>

<style scoped>
.lenti { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: clamp(40px, 6vw, 80px) var(--gutter); perspective: 1200px; }
.card {
  position: relative; width: min(100%, 560px, 62svh); aspect-ratio: 4 / 5; border-radius: 22px; transform-style: preserve-3d;
  transform: rotateX(var(--lx)) rotateY(var(--ly)); will-change: transform;
}
.plate { position: absolute; inset: 0; border-radius: 22px; background: color-mix(in srgb, var(--fg) 30%, #1a1a1e); }
.plate:nth-child(8) { box-shadow: 0 40px 80px -30px rgba(0, 0, 0, .55); }
.face { position: absolute; inset: 0; border-radius: 22px; overflow: hidden; background: repeating-linear-gradient(90deg, rgba(0, 0, 0, .09) 0, rgba(0, 0, 0, 0) 2.5px, rgba(0, 0, 0, 0) 5px), color-mix(in srgb, var(--fg) 6%, var(--bg, #e0deda)); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .22), inset 0 2px 5px rgba(255, 255, 255, .3), inset 0 -4px 8px rgba(0, 0, 0, .35); }
/* the side shading is its own layer on top of everything, so it is the same while empty, while revealing and when loaded */
.edge { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 14px 0 16px -10px rgba(0, 0, 0, .22), inset -14px 0 16px -10px rgba(0, 0, 0, .22); }
.gloss { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; mix-blend-mode: soft-light; background: linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, .7) 45%, transparent 62%); background-size: 280% 100%; background-position: var(--lsheen) 0; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .22), inset 0 2px 5px rgba(255, 255, 255, .3), inset 0 -4px 8px rgba(0, 0, 0, .35); }
.enable { font: inherit; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; min-height: 44px; padding: 0 16px; cursor: pointer; }
canvas, img { display: block; width: 100%; height: 100%; object-fit: cover; }
.face canvas, .face img { position: absolute; inset: 0; }
[data-theme="dark"] .plate:nth-child(8) { box-shadow: none; }
/* the swing before any JavaScript: the same sweep the script does later, so the card is alive from the first paint */
@keyframes lenti-sway-y {
  0%   { --ly: 0deg;   --lsheen: 50%; animation-timing-function: cubic-bezier(.6, 0, 1, .7); }
  18%  { --ly: 19deg;  --lsheen: 13%; animation-timing-function: cubic-bezier(.2, .5, .5, 1); }
  47%  { --ly: -8deg;  --lsheen: 65%; animation-timing-function: ease-in; }
  63%  { --ly: -21deg; --lsheen: 90%; animation-timing-function: ease-out; }
  100% { --ly: 0deg;   --lsheen: 50%; }
}
@keyframes lenti-sway-x {
  0%   { --lx: 0deg;  animation-timing-function: ease-in; }
  30%  { --lx: -7deg; animation-timing-function: cubic-bezier(.3, 0, .2, 1); }
  52%  { --lx: 4deg;  animation-timing-function: ease-out; }
  78%  { --lx: 8deg;  animation-timing-function: ease-in-out; }
  100% { --lx: 0deg; }
}
.card.pre { animation: lenti-sway-y 3.7s linear infinite, lenti-sway-x 2.6s linear infinite; }
@media (prefers-reduced-motion: reduce) { .card { transform: none; } .card.pre { animation: none; } }
</style>

<style>
@property --lx { syntax: '<angle>'; inherits: true; initial-value: 0deg; }
@property --ly { syntax: '<angle>'; inherits: true; initial-value: 0deg; }
@property --lsheen { syntax: '<percentage>'; inherits: true; initial-value: 50%; }
</style>
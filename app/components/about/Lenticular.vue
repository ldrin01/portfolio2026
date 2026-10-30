<script setup lang="ts">
// A big lenticular card, played with the pointer (or by tilting / dragging on a phone). Moving across it tilts the
// card, and as the viewing angle changes the picture under the ridges switches from one photo to the next. Mid-switch,
// like the real plastic: the ridges show, the photos ghost into a few offset copies and the edges split into a
// rainbow. Drawn in WebGL; without it, the first picture shows plain. Takes two or three pictures.
const props = defineProps<{ images: { image: string; alt: string }[] }>()
const asset = useAssetUrl()
const root = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const tilt = reactive({ x: 0, y: 0 })
const gl = ref(true)

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`
const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D t0, t1, t2;
uniform vec2 s0, s1, s2;      // cover-fit scale of each picture
uniform float uView, uCount, uPitch, uTime;
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
  // each ridge bends the view a little across its width, so the switch sweeps over the card in fine stripes
  float s = uView + (ridge - .5) * .22;
  float spread = .08 + .12 * sin(fract(uView) * 3.1416);   // the rainbow split, widest mid-switch
  vec3 col = vec3(lens(s - spread, uv).r, lens(s, uv).g, lens(s + spread, uv).b);
  // the ridges: a soft dark line between each, a faint highlight on top
  col *= .86 + .14 * smoothstep(.0, .25, ridge) * smoothstep(1., .75, ridge);
  col += .05 * smoothstep(.45, .5, ridge) * smoothstep(.55, .5, ridge);
  // a moving glint across the plastic
  float glint = exp(-pow((uv.x + uv.y * .3 - .2 - uView * .45) * 5., 2.));
  col += glint * .12 * vec3(.9 + .1 * sin(uv.y * 30. + uTime), 1., 1.1);
  gl_FragColor = vec4(col, 1.);
}`

onMounted(async () => {
  const c = canvas.value!, el = root.value!
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
  const imgs = await Promise.all(pics.map(p => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = asset(p.image)! })))
  imgs.forEach((img, k) => {
    const t = g.createTexture(); g.activeTexture(g.TEXTURE0 + k); g.bindTexture(g.TEXTURE_2D, t)
    g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, img)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
    g.uniform1i(u(`t${k}`), k)
  })
  for (let k = imgs.length; k < 3; k++) g.uniform1i(u(`t${k}`), 0)
  g.uniform1f(u('uCount'), imgs.length)

  const fit = () => {
    const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio)
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); g.viewport(0, 0, c.width, c.height)
    const ca = r.width / r.height
    imgs.forEach((img, k) => { const ia = img.width / img.height; g.uniform2f(u(`s${k}`), ca > ia ? 1 : ca / ia, ca > ia ? ia / ca : 1) })
    for (let k = imgs.length; k < 3; k++) g.uniform2f(u(`s${k}`), 1, 1)
    g.uniform1f(u('uPitch'), Math.max(60, r.width / 5)) // a ridge about every 5px
  }
  const ro = new ResizeObserver(fit); ro.observe(c)

  // where the viewer "is": pointer across the card (and a little beyond), a dragged finger, or the phone's tilt
  const want = { x: 0, y: 0 }
  const fromPoint = (x: number, y: number) => {
    const r = el.getBoundingClientRect()
    want.x = Math.max(-1, Math.min(1, ((x - r.left) / r.width - .5) * 2.2))
    want.y = Math.max(-1, Math.min(1, ((y - r.top) / r.height - .5) * 2.2))
  }
  const onMove = (e: PointerEvent) => fromPoint(e.clientX, e.clientY)
  const onOrient = (e: DeviceOrientationEvent) => { if (e.gamma != null && e.beta != null) { want.x = Math.max(-1, Math.min(1, e.gamma / 30)); want.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) } }
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('deviceorientation', onOrient)

  let raf = 0, vis = false, view = 0
  const draw = (t: number) => {
    raf = requestAnimationFrame(draw)
    tilt.x += (want.y - tilt.x) * .08; tilt.y += (want.x - tilt.y) * .08
    view = (tilt.y + 1) / 2 * (imgs.length - 1)
    g.uniform1f(u('uView'), view); g.uniform1f(u('uTime'), t / 1000)
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4)
  }
  const io = new IntersectionObserver(([e]) => { vis = !!e?.isIntersecting; cancelAnimationFrame(raf); if (vis) raf = requestAnimationFrame(draw) })
  io.observe(el)
  fit(); draw(0)
  onBeforeUnmount(() => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('deviceorientation', onOrient) })
})
</script>

<template>
  <div ref="root" class="lenti">
    <div class="card" :style="{ '--rx': `${tilt.x * -14}deg`, '--ry': `${tilt.y * 26}deg` }" role="img" :aria-label="images.map(i => i.alt).join(' / ')">
      <canvas v-show="gl" ref="canvas" />
      <img v-if="!gl" :src="asset(images[0]?.image)" alt="">
    </div>
  </div>
</template>

<style scoped>
.lenti { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: clamp(40px, 6vw, 80px) var(--gutter); perspective: 1200px; }
.card {
  width: min(100%, 560px, 62svh); aspect-ratio: 4 / 5; border-radius: 22px; overflow: hidden; background: #111;
  box-shadow: 0 40px 80px -30px rgba(0, 0, 0, .55);
  transform: rotateX(var(--rx)) rotateY(var(--ry)); will-change: transform;
}
canvas, img { display: block; width: 100%; height: 100%; object-fit: cover; }
[data-theme="dark"] .card { box-shadow: none; }
@media (prefers-reduced-motion: reduce) { .card { transform: none; } }
</style>

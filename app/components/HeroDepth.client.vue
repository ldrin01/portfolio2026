<script setup lang="ts">
// Depth portrait: only the depth map is used, as a smooth orange gradient (dark burnt orange far, yellow near).
// Hover and scroll slide near pixels more than far ones; the intro fades in from the nearest depth to the farthest.
const loaderDone = useState('loaderDone', () => false)
const canvas = useTemplateRef<HTMLCanvasElement>('cv')
const base = useRuntimeConfig().app.baseURL // "/" locally, "/portfolio2026/" on GitHub Pages

const VERT = `attribute vec2 p; varying vec2 vUv;
void main() { vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uDepth;
uniform vec2 uTexel;    // one depth-map pixel in uv
uniform vec2 uMouse;    // -1..1
uniform float uScroll;  // 0..1.5 of the first screen
uniform float uReveal;  // 0..1 intro: the nearest depth and the top of the portrait fade in first

float H(vec2 p) { return texture2D(uDepth, p).r; }

// the depth map has 8-bit steps, so smooth it a little to keep the gradient continuous
float hs(vec2 p) {
  vec2 o = uTexel * 2.;
  float s = H(p) * 4.;
  s += (H(p + vec2(o.x, 0.)) + H(p - vec2(o.x, 0.)) + H(p + vec2(0., o.y)) + H(p - vec2(0., o.y))) * 2.;
  s += H(p + o) + H(p - o) + H(p + vec2(o.x, -o.y)) + H(p + vec2(-o.x, o.y));
  return s / 16.;
}

// far = deep burnt orange, then red-orange, orange, yellow (linear between stops, so no visible bands)
vec3 grade(float v) {
  vec3 c0 = vec3(.27, .075, .03), c1 = vec3(.62, .15, .06), c2 = vec3(.93, .30, .10), c3 = vec3(1., .50, .16), c4 = vec3(1., .86, .42);
  v = clamp(v, 0., 1.) * 4.;
  vec3 c = mix(c0, c1, clamp(v, 0., 1.));
  c = mix(c, c2, clamp(v - 1., 0., 1.));
  c = mix(c, c3, clamp(v - 2., 0., 1.));
  return mix(c, c4, clamp(v - 3., 0., 1.));
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1., 0.), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0., 1.), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1., 1.), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // the silhouette never moves (so there is no ghost edge); only the gradient inside it slides, near depths more than far ones
  float a = texture2D(uDepth, vUv).a;
  float d0 = H(vUv);
  vec2 shift = (vec2(uMouse.x * .07, uMouse.y * .045) + vec2(0., uScroll * .1)) * (d0 - .2);
  vec2 uv = vUv - shift;
  if (texture2D(uDepth, uv).a < .98) uv = vUv; // never pull colour in from outside the subject

  float v = (hs(uv) - .14) / .86; // subject depth runs about .16 (far) to 1 (near)
  vec3 col = grade(v);

  // intro: the front moves from the nearest depth to the farthest AND from top to bottom, with an uneven wobble
  float n = noise(vUv * vec2(4., 6.)) * .65 + noise(vUv * vec2(11., 15.)) * .35;
  float k = .55 * (1. - clamp(v, 0., 1.)) + .45 * (1. - vUv.y) + .2 * (n - .5);
  float front = uReveal * 1.6 - .1;
  float vis = 1. - smoothstep(front - .22, front, k);
  float edge = smoothstep(front - .22, front - .1, k) * (1. - smoothstep(front - .1, front, k));
  col += vec3(1., .8, .45) * edge * .5;

  a *= vis;
  gl_FragColor = vec4(col * a, a);
}`

let cleanup = () => {}
onBeforeUnmount(() => cleanup())

onMounted(async () => {
  await nextTick()
  const el = canvas.value
  const gl = el?.getContext('webgl', { premultipliedAlpha: true, alpha: true })
  if (!el || !gl) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[HeroDepth] shader:', gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog); gl.useProgram(prog)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const u = (n: string) => gl.getUniformLocation(prog, n)
  const uMouse = u('uMouse'), uScroll = u('uScroll'), uTexel = u('uTexel'), uReveal = u('uReveal')

  const loadTex = (src: string, unit: number, name: string) => new Promise<void>((res) => {
    const img = new Image()
    img.onload = () => {
      const t = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.uniform1i(u(name), unit)
      gl.uniform2f(uTexel, 1 / img.width, 1 / img.height)
      res()
    }
    img.onerror = () => console.error('[HeroDepth] could not load', src)
    img.src = src
  })

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr)
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h }
    gl.viewport(0, 0, el.width, el.height)
  }

  // eased values so the motion feels weighty
  let tx = 0, ty = 0, mx = 0, my = 0, sy = scrollY / innerHeight, raf = 0, visible = true, revealAt = 0
  const onMove = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = -((e.clientY / innerHeight) * 2 - 1) }
  const REVEAL_MS = 5600
  const frame = () => {
    raf = requestAnimationFrame(frame)
    if (!visible) return
    mx += (tx - mx) * .09; my += (ty - my) * .09
    sy += (scrollY / innerHeight - sy) * .1
    resize()
    gl.uniform2f(uMouse, mx, my)
    gl.uniform1f(uScroll, Math.min(sy, 1.5))
    const p = reduced ? 1 : revealAt ? Math.min((performance.now() - revealAt) / REVEAL_MS, 1) : 0
    gl.uniform1f(uReveal, 1 - (1 - p) ** 2) // ease out
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const stopWatch = watch(loaderDone, (done) => { if (done && !revealAt) revealAt = performance.now() }, { immediate: true })
  loadTex(`${base}me-depth.png`, 0, 'uDepth').then(() => {
    resize(); frame()
    if (reduced) { cancelAnimationFrame(raf); return }
    addEventListener('pointermove', onMove, { passive: true })
  })

  const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting })
  io.observe(el)
  cleanup = () => { stopWatch(); cancelAnimationFrame(raf); io.disconnect(); removeEventListener('pointermove', onMove) }
})
</script>

<template>
  <canvas ref="cv" class="hero-depth" aria-hidden="true" />
</template>

<style>
/* unscoped on purpose: the client-only wrapper means a parent's scoped styles can miss this canvas.
   Placement: the head's centre (58.3% across the artwork) sits on the right rule-of-thirds line (66.67vw);
   the body then falls in the right third. --s scales the portrait per breakpoint; the aspect ratio is the artwork's (970 x 1400). */
.hero-depth {
  --s: 1;
  --h: calc(100vh * var(--s)); --h: calc(100svh * var(--s));
  position: absolute; z-index: 0; bottom: -10%; height: var(--h); aspect-ratio: 970 / 1400;
  left: calc(66.667vw - var(--h) * 0.693 * 0.583);
  pointer-events: none; user-select: none;
}
@media (max-width: 1024px) { .hero-depth { --s: .9; } }
@media (max-width: 600px) { .hero-depth { --s: .78; } }
</style>

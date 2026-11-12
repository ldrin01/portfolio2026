// SANDBOX COPY of app/lib/personas.js (copied 2026-10-31). Edit freely: the site does not use this file.
// Original: one art style per role. Ported from public/lab/personas.html.
// createPersonas() builds a style the first time it is shown; show(key) cross-fades to it.
import { getStroke } from 'https://cdn.jsdelivr.net/npm/perfect-freehand@1.2.2/+esm'

export const PERSONA_FOR_ROLE = {
  'Video Editor': 'depth', '3D Designer': 'chladni', 'Graphic Artist': 'pencil',
  'Digital Storyteller': 'ascii', 'UI/UX Designer': 'windows', 'Visual Strategist': 'cmyk',
}

export async function createPersonas({ stage, base }) {
const ART_W = 970, ART_H = 1400
const ROLES = [{ k: 'depth' }, { k: 'chladni' }, { k: 'pencil' }, { k: 'ascii' }, { k: 'windows' }, { k: 'cmyk' }]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = matchMedia('(pointer: coarse)').matches
const $ = (id) => document.getElementById(id)
const isLight = () => document.documentElement.dataset.theme === 'light' // the site's theme; styles pick their inks from it
let dragging = 0

// ── assets ───────────────────────────────────────────────────────────
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('[HeroPersonas] could not load ' + src)); i.src = src })
const [photo, depthImg, strokes] = await Promise.all([loadImg(`${base}me.webp`), loadImg(`${base}me-depth.png`), fetch(`${base}me-strokes-sandbox.json`).then((r) => r.json())])
const pixels = (img) => { const c = document.createElement('canvas'); c.width = ART_W; c.height = ART_H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, ART_W, ART_H).data }
const P = pixels(photo), D = pixels(depthImg)
const at = (x, y) => (Math.min(ART_H - 1, Math.max(0, y | 0)) * ART_W + Math.min(ART_W - 1, Math.max(0, x | 0))) * 4
const alphaAt = (x, y) => D[at(x, y) + 3] / 255
const depthAt = (x, y) => Math.max(0, Math.min(1, (D[at(x, y)] - 40) / 215)) // 0 far .. 1 near
const lumAt = (x, y) => { const i = at(x, y); return (P[i] * .299 + P[i + 1] * .587 + P[i + 2] * .114) / 255 }
const rgbAt = (x, y) => { const i = at(x, y); return [P[i] / 255, P[i + 1] / 255, P[i + 2] / 255] }

// the site's depth palette: deep burnt orange (far) to yellow (near)
const STOPS = [[.27, .075, .03], [.62, .15, .06], [.93, .30, .10], [1, .50, .16], [1, .86, .42]]
const grade = (v) => { v = Math.max(0, Math.min(1, v)) * 4; const i = Math.min(3, v | 0), f = v - i; return STOPS[i].map((c, j) => c + (STOPS[i + 1][j] - c) * f) }

// tiny seeded random, so the hand-drawn jitter is repeatable
const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }

const fit = (cv) => {
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr)
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true }
  return false
}
const glProgram = (gl, vs, fs) => {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o }
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p))
  gl.useProgram(p); return p
}
const glTexture = (gl, img, unit) => {
  const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  return t
}
const quad = (gl, prog) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const l = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0)
}
const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n'
const QUAD_VS = 'attribute vec2 p; varying vec2 vUv; void main() { vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }'

// ── input: mouse on desktop, tilt on phones (iOS asks on the first tap), and the page scroll ──
const input = { tx: 0, ty: 0, mx: 0, my: 0, cx: -1e4, cy: -1e4, tilting: false, sw: 0 }
const offs = []
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)) }
on(window, 'pointermove', (e) => {
  input.cx = e.clientX; input.cy = e.clientY
  if (input.tilting && e.pointerType !== 'mouse') return
  input.tx = (e.clientX / innerWidth) * 2 - 1; input.ty = -((e.clientY / innerHeight) * 2 - 1)
}, { passive: true })
{
  let b0 = null, g0 = 0
  const onOrient = (e) => {
    if (e.beta == null || e.gamma == null) return
    const a = screen.orientation?.angle ?? 0
    const [x, y] = a === 90 ? [e.beta, -e.gamma] : a === 270 || a === -90 ? [-e.beta, e.gamma] : [e.gamma, e.beta]
    if (b0 == null) { b0 = y; g0 = x }
    b0 += (y - b0) * .004; g0 += (x - g0) * .004 // the centre slowly follows the hand
    input.tilting = true
    input.tx = Math.max(-1, Math.min(1, (x - g0) / 22)); input.ty = Math.max(-1, Math.min(1, (y - b0) / 22))
  }
  if (coarse && 'DeviceOrientationEvent' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const ask = () => { DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') on(window, 'deviceorientation', onOrient) }).catch(() => {}) }
      on(window, 'touchend', ask, { passive: true, once: true })
    } else on(window, 'deviceorientation', onOrient)
  }
}

// ═════ 1. Video Editor: depth ═══════════════════════════════════════
function depthStyle() {
  const cv = $('cDepth'), gl = cv.getContext('webgl', { premultipliedAlpha: true })
  const prog = glProgram(gl, QUAD_VS, PREC + `
varying vec2 vUv; uniform sampler2D uDepth; uniform vec2 uTexel, uMouse; uniform float uReveal, uLight;
float H(vec2 p) { return texture2D(uDepth, p).r; }
float hs(vec2 p) { vec2 o = uTexel * 2.; float s = H(p) * 4.;
  s += (H(p + vec2(o.x, 0.)) + H(p - vec2(o.x, 0.)) + H(p + vec2(0., o.y)) + H(p - vec2(0., o.y))) * 2.;
  s += H(p + o) + H(p - o) + H(p + vec2(o.x, -o.y)) + H(p + vec2(-o.x, o.y)); return s / 16.; }
vec3 grade(float v) {
  vec3 c0 = vec3(.27, .075, .03), c1 = vec3(.62, .15, .06), c2 = vec3(.93, .30, .10), c3 = vec3(1., .50, .16), c4 = vec3(1., .86, .42);
  v = clamp(v, 0., 1.) * 4.; vec3 c = mix(c0, c1, clamp(v, 0., 1.)); c = mix(c, c2, clamp(v - 1., 0., 1.)); c = mix(c, c3, clamp(v - 2., 0., 1.)); return mix(c, c4, clamp(v - 3., 0., 1.)); }
// on paper the ramp flips: far parts fade to a pale peach near the paper, near parts are the deepest orange
vec3 gradeLight(float v) {
  vec3 c0 = vec3(.96, .87, .77), c1 = vec3(.98, .72, .50), c2 = vec3(.95, .50, .24), c3 = vec3(.82, .30, .10), c4 = vec3(.55, .15, .05);
  v = clamp(v, 0., 1.) * 4.; vec3 c = mix(c0, c1, clamp(v, 0., 1.)); c = mix(c, c2, clamp(v - 1., 0., 1.)); c = mix(c, c3, clamp(v - 2., 0., 1.)); return mix(c, c4, clamp(v - 3., 0., 1.)); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1., 0.), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0., 1.), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1., 1.), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main() {
  float a = texture2D(uDepth, vUv).a, d0 = H(vUv);
  vec2 uv = vUv - vec2(uMouse.x * .07, uMouse.y * .045) * (d0 - .2);
  if (texture2D(uDepth, uv).a < .98) uv = vUv;
  float v = (hs(uv) - .14) / .86; vec3 col = mix(grade(v), gradeLight(v), uLight);
  float n = noise(vUv * vec2(4., 6.)) * .65 + noise(vUv * vec2(11., 15.)) * .35;
  float k = .55 * (1. - clamp(v, 0., 1.)) + .45 * (1. - vUv.y) + .2 * (n - .5);
  float front = uReveal * 1.6 - .1, vis = 1. - smoothstep(front - .22, front, k);
  float band = smoothstep(front - .22, front - .1, k) * (1. - smoothstep(front - .1, front, k));
  col = mix(col + vec3(1., .8, .45) * band * .5, mix(col, vec3(.62, .18, .05), band * .55), uLight); // a glowing edge on dark, an inked one on paper
  a *= vis; gl_FragColor = vec4(col * a, a);
}`)
  quad(gl, prog); glTexture(gl, depthImg, 0)
  const u = (n) => gl.getUniformLocation(prog, n)
  gl.uniform1i(u('uDepth'), 0); gl.uniform2f(u('uTexel'), 1 / ART_W, 1 / ART_H)
  let t0 = 0
  return {
    enter(t) { t0 = t },
    frame(t) {
      fit(cv); gl.viewport(0, 0, cv.width, cv.height)
      const p = reduced ? 1 : Math.min((t - t0) / 2200, 1)
      gl.uniform1f(u('uReveal'), 1 - (1 - p) ** 2); gl.uniform2f(u('uMouse'), input.mx, input.my + input.sw * 2.2)
      gl.uniform1f(u('uLight'), isLight() ? 1 : 0)
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
  }
}

// ═════ 2. 3D Designer: sand on a Chladni plate cut in my shape ══════
function chladniStyle() {
  const sand = $('cSand'), sx = sand.getContext('2d'), wrap = $('hpPlate')
  // fields at a quarter of the artwork's resolution
  const GW = ART_W >> 2, GH = ART_H >> 2, N = GW * GH
  const inside = new Uint8Array(N), me = new Float32Array(N), dep = new Float32Array(N)
  { // where my sand belongs: on my contours and in the dark parts (hair, brows, beard, glasses)
    const c = document.createElement('canvas'); c.width = GW; c.height = GH
    const g = c.getContext('2d', { willReadFrequently: true }); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.lineJoin = g.lineCap = 'round'
    g.scale(GW / ART_W, GH / ART_H)
    for (const p of [strokes.sil.concat([strokes.sil[0]]), ...strokes.lines]) { g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke() }
    const line = g.getImageData(0, 0, GW, GH).data
    let m = new Float32Array(N)
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x, ax = x * 4 + 2, ay = y * 4 + 2
      inside[i] = alphaAt(ax, ay) > .5 ? 1 : 0; dep[i] = depthAt(ax, ay)
      const dark = Math.max(0, Math.min(1, (.42 - lumAt(ax, ay)) / .3))
      m[i] = Math.max(line[i * 4] / 255, dark * .8)
    }
    for (let pass = 0; pass < 2; pass++) { // soften so the sand has a slope to slide down
      const o = new Float32Array(N)
      for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) { const i = y * GW + x; o[i] = (m[i] * 4 + m[i - 1] + m[i + 1] + m[i - GW] + m[i + GW]) / 8 }
      m = o
    }
    for (let i = 0; i < N; i++) me[i] = 1 - Math.min(1, m[i] * 1.6) // amplitude: 0 = the plate is still here, so sand stays
  }
  const grid = (arr, u, v) => arr[Math.min(GH - 1, Math.max(0, v * GH | 0)) * GW + Math.min(GW - 1, Math.max(0, u * GW | 0))]
  // a square plate's standing waves, precomputed per mode; sand gathers on the lines where they are zero
  const MODES = [[3, 5], [2, 7], [5, 8], [4, 9], [1, 6], [6, 11], [3, 10], [7, 4]]
  const CHL = MODES.map(([n, m]) => {
    const f = new Float32Array(N)
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const u = (x + .5) / GW, v = (y + .5) / GH * 1.44 // 1.44 = 1 / the artwork's aspect, so the cells are square
      f[y * GW + x] = Math.min(1, Math.abs(Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v) - Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v)) * .6)
    }
    return f
  })

  const COUNT = coarse ? 14000 : 26000
  const gx = new Float32Array(COUNT), gy = new Float32Array(COUNT)
  const scatter = () => { for (let i = 0; i < COUNT; i++) { let u, v; do { u = Math.random(); v = Math.random() } while (!grid(inside, u, v)); gx[i] = u; gy[i] = v } }
  // grain colour from the site's depth palette, lifted toward sand
  // on paper the grains are the raw palette, a little deeper, so they read against the light background
  const LUT = new Uint32Array(64), LUT_LIGHT = new Uint32Array(64)
  for (let i = 0; i < 64; i++) {
    const [r, g, b] = grade(i / 63)
    LUT[i] = (255 << 24) | ((b * 140 + 70) << 16) | ((g * 150 + 80) << 8) | (r * 120 + 135)
    LUT_LIGHT[i] = (255 << 24) | ((b * 150) << 16) | ((g * 170) << 8) | (r * 225)
  }

  let t0 = 0, prev = 0, mix = 0, energy = 0, mode = 0, lastTx = 0, lastTy = 0, img = null
  return {
    enter(t) { t0 = t; prev = t; mix = 0; energy = 0; mode = 0; scatter() },
    frame(t) {
      if (fit(sand)) img = null
      if (!img) img = sx.createImageData(sand.width, sand.height)
      const e = reduced ? 99 : (t - t0) / 1000, dtf = Math.min((t - prev) / 16.7, 3); prev = t
      // moving the cursor (or tilting) bows the plate: the pattern breaks back into geometry, picked by where you are
      energy = Math.min(1, energy * Math.pow(.95, dtf) + (Math.abs(input.tx - lastTx) + Math.abs(input.ty - lastTy)) * 1.4)
      lastTx = input.tx; lastTy = input.ty
      const INTRO = 1.8 // two classic patterns, then the plate rings at "my" frequency
      if (e < INTRO) mode = e < .9 ? 0 : 1
      else if (energy > .25) mode = (Math.floor((input.tx + 1) * 2) + Math.floor((input.ty + 1) * 2) * 4) % MODES.length
      const target = e < INTRO ? 0 : 1 - Math.min(1, energy * 1.4)
      mix += (target - mix) * (target > mix ? .06 : .15) * dtf
      const C = CHL[mode], k = 1 - mix, kick = .016 * dtf, pull = .045 * dtf
      const amp = (j) => C[j] * k + me[j] * mix
      for (let i = 0; i < COUNT; i++) {
        const u = gx[i], v = gy[i]
        const cx_ = Math.min(GW - 2, Math.max(1, u * GW | 0)), cy_ = Math.min(GH - 2, Math.max(1, v * GH | 0)), j = cy_ * GW + cx_
        const a = amp(j)
        // vibration throws the grain about in proportion to how much the plate moves here...
        const s = (a * a + .01) * kick, ang = Math.random() * 6.2832
        // ...and it slides downhill toward the still lines
        const du = -(amp(j + 1) - amp(j - 1)) * pull / GW * 40, dv = -(amp(j + GW) - amp(j - GW)) * pull / GH * 40
        const nu = u + Math.cos(ang) * s + du, nv = v + (Math.sin(ang) * s + dv) * .693
        if (grid(inside, nu, nv)) { gx[i] = nu; gy[i] = nv }
      }
      // draw grains straight into pixels
      const W = sand.width, H = sand.height, buf = new Uint32Array(img.data.buffer), sz = W > 900 ? 2 : 1, lut = isLight() ? LUT_LIGHT : LUT
      buf.fill(0)
      for (let i = 0; i < COUNT; i++) {
        const x = gx[i] * W | 0, y = gy[i] * H | 0, col = lut[grid(dep, gx[i], gy[i]) * 63 | 0]
        for (let dy = 0; dy < sz; dy++) { const row = (y + dy) * W; if (y + dy < H) for (let dx = 0; dx < sz; dx++) if (x + dx < W) buf[row + x + dx] = col }
      }
      sx.putImageData(img, 0, 0)
      wrap.style.transform = `rotateY(${input.mx * 14}deg) rotateX(${-input.my * 9 + input.sw * 10}deg)`
    },
  }
}

// ═════ 3. Graphic Artist: a pencil drawing that turns in 3D ═════════
// Every point of the drawing has a depth from the depth map. Hover, tilt and scroll swing the view,
// so near lines (nose, glasses, shoulder) travel further than far ones.
function pencilStyle() {
  const cv = $('cPencil'), cx = cv.getContext('2d')
  // depth of a point; on the outline, look a little inside so edges take the subject's depth, not the background's
  const depthIn = (x, y) => { let d = 0; for (const [ox, oy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [8, 0], [-8, 0], [0, 8], [0, -8]]) if (alphaAt(x + ox, y + oy) > .5) d = Math.max(d, depthAt(x + ox, y + oy)); return d }
  // cross-hatching like a pen study: long, slightly curved strokes in layers. Every layer adds a new direction,
  // and each one only goes where the photo is darker than its threshold, so shadows build up as a mesh.
  const QW = ART_W >> 2, QH = ART_H >> 2
  let tone = new Float32Array(QW * QH)
  for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) tone[y * QW + x] = alphaAt(x * 4 + 2, y * 4 + 2) > .5 ? lumAt(x * 4 + 2, y * 4 + 2) : 1
  for (let pass = 0; pass < 3; pass++) { // blur, so strokes follow shadow shapes instead of breaking on every hair
    const o = new Float32Array(tone.length)
    for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) {
      let s = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < QW && yy < QH) { s += tone[yy * QW + xx]; n++ } }
      o[y * QW + x] = s / n
    }
    tone = o
  }
  const toneAt = (x, y) => tone[Math.min(QH - 1, Math.max(0, y / 4 | 0)) * QW + Math.min(QW - 1, Math.max(0, x / 4 | 0))]
  const LAYERS = [ // [darker than, angle, spacing, ink]
    [.56, -1.0, 17, .5], [.4, .62, 16, .55], [.27, -.18, 13, .6], [.15, 1.35, 10, .66],
  ]
  const hatch = LAYERS.map(([T, ang, sp, ink], li) => {
    const out = [], c = Math.cos(ang), s_ = Math.sin(ang), D = Math.hypot(ART_W, ART_H) / 2
    for (let o = -D; o < D; o += sp * (.8 + hash(o * .37 + li) * .4)) {
      let run = null, runLen = 0, maxLen = 0
      const bulge = 80 + hash(o + li * 9) * 50 // lines bow over the form: nearer parts push them sideways
      const end = () => { if (run && run.length > 3) out.push({ pts: run, ink, w: .9 + hash(o * 3 + li) * .8, o }); run = null }
      for (let t = -D; t < D; t += 3) {
        let x = ART_W / 2 + c * t - s_ * o, y = ART_H / 2 + s_ * t + c * o
        if (x < -20 || y < -20 || x > ART_W + 20 || y > ART_H + 20) { end(); continue }
        const d = depthAt(x, y); x -= s_ * d * bulge; y += c * d * bulge
        const ok = alphaAt(x, y) > .5 && toneAt(x, y) < T * (.92 + hash(t * .01 + o) * .16)
        if (!ok) { end(); continue }
        if (!run) { run = []; runLen = 0; maxLen = 60 + hash(t + o * 7 + li) * 120 }
        run.push([x + Math.sin(t * .05 + o) * .8, y, d]) // a slight hand wobble
        if ((runLen += 3) > maxLen) { end(); t += 3 + hash(t * 3 + o) * 9 } // lift the pen, leave a small gap
      }
      end()
    }
    return out
  })
  const hatchCount = hatch.reduce((n, l) => n + l.length, 0)
  const lines = [strokes.sil.concat([strokes.sil[0]]), ...strokes.lines].map((p) => p.map(([x, y]) => [x, y, depthIn(x, y)]))
  const lens = lines.map((p) => p.reduce((s, q, i) => i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0))
  const total = lens.reduce((a, b) => a + b, 0)
  ROLES[2].note = `${lines.length} pressure-tapered contours and ${hatchCount.toLocaleString()} cross-hatch strokes in four layers, each at its own depth. Move to turn the drawing.`

  let t0 = 0, view = [0, 0]
  const T_LINES = 1300, T_HATCH = 1300
  // the 3D view: shift by depth around a middle plane (art px)
  const P = (x, y, d) => { const f = d - .4; return [x + f * view[0], y + f * view[1]] }
  // the points of a contour up to `upto` of its length, wobbled per boil frame and projected
  const take = (p, k, seed, wob, upto) => {
    const out = []; let run = 0
    for (let i = 0; i < p.length; i++) {
      let [x, y, d] = p[i], end = false
      if (i) {
        const seg = Math.hypot(x - p[i - 1][0], y - p[i - 1][1])
        if (run + seg > upto) { const f = (upto - run) / seg; x = p[i - 1][0] + (x - p[i - 1][0]) * f; y = p[i - 1][1] + (y - p[i - 1][1]) * f; end = true }
        run += seg
      }
      const [px, py] = P(x + (hash(seed + i * 1.7) - .5) * wob, y + (hash(seed + i * 2.9 + 5) - .5) * wob, d)
      out.push([px * k, py * k])
      if (end) break
    }
    return out
  }
  const fillOutline = (pts) => {
    if (pts.length < 2) return
    cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1])
    cx.closePath(); cx.fill()
  }
  const polyline = (pts) => { cx.beginPath(); pts.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.stroke() }

  return {
    enter(t) { t0 = t },
    frame(t) {
      fit(cv)
      const e = reduced ? 1e6 : t - t0, k = cv.width / (ART_W * 1.4), dpr = cv.width / cv.clientWidth
      const boil = Math.floor(t / 125) // 8 fps line boil
      view = [input.mx * 190, -input.my * 120 + input.sw * 150]
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height)
      cx.translate(ART_W * .2 * k, ART_H * .12 * k) // the artwork sits inside the free margin
      cx.lineCap = 'round'; cx.lineJoin = 'round'
      let tip = null

      // 2) contours by length: a perfect-freehand stroke (tapered, pressure-shaped) plus a loose graphite pass
      const lp = Math.min(Math.max(e / T_LINES, 0), 1) * total
      const opts = { size: 2.4 * dpr, thinning: .65, smoothing: .55, streamline: .35, simulatePressure: true, start: { taper: 14 * dpr }, end: { taper: 14 * dpr } }
      let run = 0
      const ink = isLight() ? '28, 28, 34' : '232, 234, 238' // graphite on paper, chalk on black
      cx.fillStyle = `rgba(${ink}, .86)`
      for (let i = 0; i < lines.length && run < lp; i++) {
        const upto = lp - run
        const pts = take(lines[i], k, boil * 13 + i * 7, 1.6, upto)
        fillOutline(getStroke(pts, { ...opts, last: upto >= lens[i] }))
        cx.strokeStyle = `rgba(${ink}, .22)`; cx.lineWidth = .8 * dpr
        polyline(take(lines[i], k, boil * 17 + i * 11 + 400, 3.4, upto)) // a second, looser pass like a real pencil
        if (upto < lens[i]) tip = pts[pts.length - 1]
        run += lens[i]
      }

      // 3) cross-hatching, one layer after another (light single strokes first, then the crossing layers)
      const hp = Math.min(Math.max((e - T_LINES * .75) / T_HATCH, 0), 1) * hatch.length
      hatch.forEach((layer, li) => {
        const n = Math.floor(Math.min(Math.max(hp - li, 0), 1) * layer.length)
        if (!n) return
        cx.strokeStyle = `rgba(${ink}, ${(layer[0]?.ink ?? .5) * (isLight() ? .85 : 1)})`
        for (const thin of [0, 1]) { // two widths per layer, so the marks are not all the same weight
          cx.lineWidth = (thin ? 1 : 1.6) * dpr; cx.beginPath()
          for (let i = 0; i < n; i++) {
            const h = layer[i]; if ((h.w > 1.15) === !!thin) continue
            const jx = (hash(i + li * 97 + boil * .31) - .5) * 1.2, jy = (hash(i * 3 + li + boil * .17) - .5) * 1.2
            h.pts.forEach(([x0, y0, d], j) => { const [x, y] = P(x0 + jx, y0 + jy, d); j ? cx.lineTo(x * k, y * k) : cx.moveTo(x * k, y * k) })
          }
          cx.stroke()
        }
        if (n < layer.length) { const q = layer[n - 1].pts.at(-1), [x, y] = P(q[0], q[1], q[2]); tip = [x * k, y * k] }
      })

      // the pencil tip while drawing
      if (tip && e < T_LINES + T_HATCH + 400) {
        cx.fillStyle = '#ff5a2d'; cx.beginPath(); cx.arc(tip[0], tip[1], 3.2 * dpr, 0, 7); cx.fill()
        cx.fillStyle = 'rgba(255, 90, 45, .25)'; cx.beginPath(); cx.arc(tip[0], tip[1], 9 * dpr, 0, 7); cx.fill()
      }
    },
  }
}

// ═════ 4. Digital Storyteller: ASCII, one size, tone from how much ink each glyph covers ═
function asciiStyle() {
  const cv = $('cAscii'), cx = cv.getContext('2d')
  // printable ASCII plus symbols, light shades, box drawing and outline shapes, so every tone has several glyphs to pick from.
  // Solid shapes are left out: they read as pixels, not type.
  const SOLID = '█▌▐▀▄■▬▲►▼◄●◘◙◆◉★♠♣♥♦'
  const POOL = [...new Set([...Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)),
    ...'·•°¨´¸¯˜ˆ×÷±¬¦§¶©®¤¢£¥µ¿¡«»‹›†‡‰※∙∘∗∴∵∶∷≈≠≡≤≥∞∑∏√∫∂∆∇∈∋∩∪⊂⊃⊕⊗⊙⊥⌐⌂─│┌┐└┘├┤┬┴┼═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬░▒▓□▫◊○◦◇◈◌◍◎◐◑◒◓☆☼♪♫'].filter((ch) => !SOLID.includes(ch)))]
  const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
  const LEVELS = 40
  let buckets = [], cells = [], builtFor = '', fs = 0, cw = 0, chh = 0

  // measure how much of its cell each glyph actually inks, then bucket the glyphs by coverage
  const measure = (size) => {
    const w = Math.ceil(size * .62), h = Math.ceil(size * 1.2), c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d', { willReadFrequently: true }); g.font = `${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'
    const cov = POOL.map((ch) => {
      g.clearRect(0, 0, w, h)
      if (g.measureText(ch).width > w * 1.15) return null // skip glyphs the font draws too wide for one cell
      g.fillText(ch, w / 2, h / 2)
      const d = g.getImageData(0, 0, w, h).data; let s = 0
      for (let i = 3; i < d.length; i += 4) s += d[i]
      return { ch, c: s / (255 * w * h) }
    }).filter((q) => q && q.c > 0)
    const sorted = cov.map((q) => q.c).sort((a, b) => a - b), max = sorted[Math.floor(sorted.length * .94)] // the densest few share the top tone instead of owning it
    buckets = Array.from({ length: LEVELS }, () => [])
    for (const q of cov) buckets[Math.min(LEVELS - 1, Math.floor(Math.pow(q.c / max, .8) * LEVELS))].push(q.ch)
    for (let i = 0; i < LEVELS; i++) if (!buckets[i].length) { // borrow from the nearest filled level
      for (let r = 1; r < LEVELS; r++) { const b = buckets[i - r]?.length ? buckets[i - r] : buckets[i + r]; if (b?.length) { buckets[i] = b; break } }
    }
  }
  const pick = (lv) => { const b = buckets[lv]; return b[Math.random() * b.length | 0] }

  const build = () => {
    const css = cv.clientWidth
    fs = coarse ? 8 : 10                                  // css px; every glyph is this size
    measure(fs * 3)
    cx.font = `${fs}px ${FONT}`; cw = cx.measureText('M').width || fs * .6; chh = fs * 1.12
    const cols = Math.floor(css / cw), rows = Math.floor(cv.clientHeight / chh), toArt = ART_W * 1.4 / css
    const offX = css * .2 / 1.4, offY = cv.clientHeight * .12 / 1.24 // where the artwork starts inside the free margin
    cells = []
    const raw = []
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = ((c + .5) * cw - offX) * toArt, y = ((r + .5) * chh - offY) * toArt
      if (x < 0 || y < 0 || x >= ART_W || y >= ART_H || alphaAt(x, y) < .5) continue
      const d = depthAt(x, y)
      raw.push({ r, c, d, t: .7 * lumAt(x, y) + .3 * d }) // mostly the photo's light, a little depth
    }
    // stretch the tones so the darkest cell gets the thinnest glyph and the lightest the densest
    const ts = raw.map((q) => q.t).sort((a, b) => a - b), lo = ts[Math.floor(ts.length * .02)], hi = ts[Math.floor(ts.length * .98)]
    for (const { r, c, d, t } of raw) {
      const v = Math.min(1, Math.max(0, (t - lo) / (hi - lo))) ** .8
      const lv = Math.min(LEVELS - 1, Math.floor(v * LEVELS))
      const [R, G, B] = grade(d), b = isLight() ? .62 + .1 * v : .7 + .3 * v // deeper on paper so the yellows still read
      cells.push({ c, r, d, lv, ch: pick(lv), next: 0, col: `rgb(${R * b * 255 | 0},${G * b * 255 | 0},${B * b * 255 | 0})`, settle: r / rows * 1.1 + Math.random() * .4 })
    }
    COLS = cols; ROWS = rows
    owner = new Int32Array(cols * rows); zbuf = new Float32Array(cols * rows); fill = new Int32Array(cols * rows)
    builtFor = cv.clientWidth + 'x' + cv.clientHeight + document.documentElement.dataset.theme
  }
  let COLS = 0, ROWS = 0, owner, zbuf, fill

  // 3D by rewriting: the grid never moves. Each frame every cell of the portrait works out which cell its
  // point lands on from the new viewing angle (near points travel more cells than far ones), and writes its
  // glyph there. Where two land on one cell the nearer wins; one-cell cracks are filled from the farther neighbour.
  const PIVOT = .45 // depth that stays put; nearer slides with the view, farther slides against it
  const project = (sx, sy) => {
    owner.fill(-1); zbuf.fill(-1)
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i], f = c.d - PIVOT
      const tc = c.c + Math.round(sx * f), tr = c.r + Math.round(sy * f)
      if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) continue
      const j = tr * COLS + tc
      if (c.d > zbuf[j]) { zbuf[j] = c.d; owner[j] = i }
    }
    fill.set(owner)
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const j = r * COLS + c
      if (owner[j] >= 0) continue
      const pairs = [[c > 0 ? j - 1 : -1, c < COLS - 1 ? j + 1 : -1], [r > 0 ? j - COLS : -1, r < ROWS - 1 ? j + COLS : -1]]
      for (const [a, b] of pairs) {
        if (a < 0 || b < 0 || owner[a] < 0 || owner[b] < 0) continue
        fill[j] = zbuf[a] < zbuf[b] ? owner[a] : owner[b]; break
      }
    }
  }
  let t0 = 0, last = 0
  return {
    enter(t) { t0 = t },
    frame(t) {
      if (t - last < 33) return // 30 fps is plenty for type
      last = t
      fit(cv)
      if (builtFor !== cv.clientWidth + 'x' + cv.clientHeight + document.documentElement.dataset.theme) build()
      const e = reduced ? 99 : (t - t0) / 1000, k = cv.width / cv.clientWidth
      cx.setTransform(k, 0, 0, k, 0, 0); cx.clearRect(0, 0, cv.clientWidth, cv.clientHeight)
      cx.font = `${fs}px ${FONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'
      // view angle in cells: hover/tilt turns it sideways and up/down, scrolling tips it up/down
      project(input.mx * 16, -input.my * 10 + input.sw * 14)
      for (const c of cells) if (t > c.next) { c.ch = pick(c.lv); c.next = t + 300 + Math.random() * 2800 } // swaps for another glyph of the same tone
      for (let j = 0; j < fill.length; j++) {
        const i = fill[j]
        if (i < 0) continue
        const c = cells[i], left = c.settle - e
        if (left > .35) continue
        const x = (j % COLS + .5) * cw, y = ((j / COLS | 0) + .5) * chh
        cx.fillStyle = left > 0 ? (isLight() ? '#e8471c' : '#ffd27a') : c.col
        cx.fillText(left > 0 ? pick(Math.random() * LEVELS | 0) : c.ch, x, y)
      }
    },
  }
}

// ═════ 5. UI/UX Designer: windows that piece the photo together ═════
function windowsStyle() {
  const root = $('hpWins')
  const W = [ // body rect in artwork pixels (the photo under it); dx/dy nudge each window off, so the pieces almost line up
    { x: 250, y: 830, w: 720, h: 570, t: 'Frame 24 — shirt', dx: 14, dy: 10 },
    { x: 0, y: 1110, w: 430, h: 290, t: 'arm.png', dx: -18, dy: 16 },
    { x: 420, y: 470, w: 490, h: 380, t: 'neck_v3.fig', dx: 22, dy: -6 },
    { x: 262, y: 22, w: 600, h: 470, t: 'eldrin.png — 100%', dx: -10, dy: -14 },
    { x: 18, y: 380, w: 230, h: 0, t: 'Layers', panel: ['Hair', 'Glasses', 'Face', 'Neck', 'Shirt', 'Arm'], dx: -6, dy: 4 },
    { x: 600, y: 130, w: 270, h: 170, t: 'Inspect — hair', dx: -26, dy: 12 },
    // small ones
    { x: 548, y: 262, w: 120, h: 150, t: 'ear.png', dx: 30, dy: -18 },
    { x: 470, y: 618, w: 150, h: 110, t: 'collar.png', dx: -10, dy: 8 },
    { x: 700, y: 600, w: 170, h: 0, t: 'Colours', swatches: true, dx: 40, dy: 8 },
  ]
  // colours for the swatch window, sampled from the photo: hair, skin, lips, shirt, glasses
  const SW = [[560, 120], [420, 330], [305, 405], [700, 1000], [330, 240]].map(([x, y]) => '#' + rgbAt(x, y).map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join(''))
  const els = W.map((w, i) => {
    const el = document.createElement('div')
    el.className = 'win' + (w.panel || w.swatches ? ' panel' : '')
    el.style.cssText = `--x:${w.x};--y:${w.y};--w:${w.w};--h:${w.h};z-index:${i + 1}`
    el.innerHTML = `<div class="bar"><i></i><i></i><i></i><span>${w.t}</span></div><div class="body">${w.panel ? '<p>Layers</p>' + w.panel.map((n, j) => `<div class="${j === 2 ? 'sel' : ''}">${n}</div>`).join('') : w.swatches ? '<p>Sampled</p>' + SW.map((c) => `<div class="sw" style="--c:${c}">${c}</div>`).join('') : ''}</div>`
    root.appendChild(el)
    return { el, depth: .4 + i * .14, ox: 0, oy: 0, vx: 0, vy: 0, drag: null, rest: w }
  })
  const cur = document.createElement('div')
  cur.className = 'cursor'
  cur.innerHTML = '<svg width="18" height="20" viewBox="0 0 18 20"><path d="M1 1l15 7.5-6.5 1.8L6.6 18z" fill="#ff5a2d" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg><b>Eldrin</b>'
  root.appendChild(cur)

  let z = 10
  els.forEach((w) => {
    w.el.addEventListener('pointerdown', (e) => {
      w.el.setPointerCapture(e.pointerId); w.el.classList.add('drag'); w.el.style.zIndex = ++z
      w.drag = { x: e.clientX - w.ox, y: e.clientY - w.oy }; dragging++
    })
    w.el.addEventListener('pointermove', (e) => { if (w.drag) { w.ox = e.clientX - w.drag.x; w.oy = e.clientY - w.drag.y } })
    const up = () => { if (!w.drag) return; w.drag = null; w.el.classList.remove('drag'); dragging-- } // the spring brings it home
    w.el.addEventListener('pointerup', up); w.el.addEventListener('pointercancel', up)
  })
  const setUnit = () => stage.style.setProperty('--u', stage.clientWidth / ART_W + 'px')
  new ResizeObserver(setUnit).observe(stage); setUnit()

  // entrance: each window opens like a macOS window, a quick zoom up from slightly smaller with a soft settle
  const OPEN_MS = 450, STAGGER = 70
  const backOut = (n) => { const c = 1.5, m = n - 1; return 1 + (c + 1) * m * m * m + c * m * m }
  let t0 = 0, prev = 0
  return {
    enter(t) {
      t0 = t
      els.forEach((w, i) => { w.ox = w.oy = w.vx = w.vy = 0; w.at = reduced ? -1e9 : i * STAGGER })
    },
    frame(t) {
      const dt = Math.min((t - (prev || t)) / 16.7, 3); prev = t
      const u = stage.clientWidth / ART_W
      els.forEach((w) => {
        const p = Math.max(0, Math.min(1, (t - t0 - w.at) / OPEN_MS))
        const rx = w.rest.dx * u, ry = w.rest.dy * u // where this window rests: a little off its piece of the photo
        if (!w.drag) { // spring to its resting spot (also after a drag)
          w.vx = (w.vx + (rx - w.ox) * .07 * dt) * Math.pow(.8, dt); w.vy = (w.vy + (ry - w.oy) * .07 * dt) * Math.pow(.8, dt)
          w.ox += w.vx * dt; w.oy += w.vy * dt
        }
        const px = input.mx * w.depth * 10, py = -input.my * w.depth * 8
        const sc = p < 1 ? .86 + .14 * backOut(p) : 1
        w.el.style.transform = `translate(${w.ox + px}px, ${w.oy + py + (1 - p) * 14}px) scale(${sc})`
        w.el.style.opacity = Math.min(1, p * 2.2)
        w.el.style.filter = p < 1 ? `blur(${(1 - p) * 6}px)` : ''
        // the photo inside moves with the window, so the pieces sit slightly out of line
      })
      // a teammate's cursor wandering the file
      const s = (t - t0) / 1000, sw = stage.clientWidth, sh = stage.clientHeight
      cur.style.transform = `translate(${sw * (.42 + Math.sin(s * .55) * .22 + Math.sin(s * 1.3) * .05)}px, ${sh * (.36 + Math.sin(s * .37 + 1) * .2 + Math.cos(s * 1.1) * .04)}px)`
    },
  }
}

// ═════ 6. Visual Strategist: CMYK separation ════════════════════════
function cmykStyle() {
  const cv = $('cCmyk'), gl = cv.getContext('webgl', { premultipliedAlpha: true })
  const prog = glProgram(gl, QUAD_VS, PREC + `
varying vec2 vUv; uniform sampler2D uImg; uniform vec2 uRes, uO0, uO1, uO2, uO3; uniform float uCell, uDark;
// the canvas bleeds 10% past the artwork on every side
vec2 art(vec2 px) { return (px / uRes) * 1.2 - .1; }
vec4 img(vec2 uv) { return (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) ? vec4(0.) : texture2D(uImg, uv); }
float ink(vec4 c, int i) {
  float k = 1. - max(c.r, max(c.g, c.b)); vec3 cmy = (1. - c.rgb - k) / max(1. - k, .001);
  k *= .85; // leave a little black to the colour plates, like a real separation
  return i == 0 ? cmy.x : i == 1 ? cmy.y : i == 2 ? cmy.z : k;
}
// one halftone plate: rotated dot grid, dot size from the ink amount at the cell centre
float plate(vec2 px, vec2 off, float ang, int i, out float paper) {
  vec2 p = px - off; paper = img(art(p)).a;
  float cs = cos(ang), sn = sin(ang);
  vec2 g = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y) / uCell, cc = floor(g) + .5;
  vec2 cpx = vec2(cs * cc.x - sn * cc.y, sn * cc.x + cs * cc.y) * uCell;
  vec4 c = img(art(cpx));
  float r = sqrt(clamp(ink(c, i), 0., 1.) * c.a) * .72, d = length(g - cc), aa = 1.2 / uCell;
  return (1. - smoothstep(r - aa, r + aa, d)) * paper;
}
// dark mode: the paper becomes a white dot screen. Dot size follows how light the photo is, so white shows where the
// picture is light, and the ink plates cut it away where they print.
float whiteDots(vec2 px) {
  float ang = .5236, cs = cos(ang), sn = sin(ang);
  vec2 g = vec2(cs * px.x + sn * px.y, -sn * px.x + cs * px.y) / uCell, cc = floor(g) + .5;
  vec2 cpx = vec2(cs * cc.x - sn * cc.y, sn * cc.x + cs * cc.y) * uCell;
  vec4 c = img(art(cpx));
  float r = sqrt(clamp(min(c.r, min(c.g, c.b)), 0., 1.) * c.a) * .72, d = length(g - cc), aa = 1.2 / uCell;
  return (1. - smoothstep(r - aa, r + aa, d)) * img(art(px)).a;
}
void main() {
  vec2 px = vUv * uRes; float a0, a1, a2, a3;
  float c = plate(px, uO0, .2618, 0, a0), m = plate(px, uO1, 1.309, 1, a1), y = plate(px, uO2, 0., 2, a2), k = plate(px, uO3, .7854, 3, a3);
  float paper = max(max(a0, a1), max(a2, a3));
  vec3 col = vec3(.97, .95, .91);
  col *= mix(vec3(1.), vec3(0., .63, .89), c);
  col *= mix(vec3(1.), vec3(.93, .05, .55), m);
  col *= mix(vec3(1.), vec3(1., .91, .05), y);
  col *= mix(vec3(1.), vec3(.1, .1, .12), k);
  if (uDark > .5) {
    float ic = max(max(c, m), max(y, k)), w = whiteDots(px) * (1. - ic); // white only in the gaps between inks
    gl_FragColor = vec4(col * ic + vec3(.97, .95, .91) * w, ic + w);
  } else gl_FragColor = vec4(col * paper, paper);
}`)
  quad(gl, prog); glTexture(gl, photo, 0)
  const u = (n) => gl.getUniformLocation(prog, n)
  gl.uniform1i(u('uImg'), 0)
  const DIRS = [0, 2.1, 4.2] // C, M, Y drift apart in three directions; K is the key plate and stays
  const regs = $('hpRegs'), INKS = ['#00a1e3', '#ed0d8c', '#ffe80d', 'currentColor']
  const marks = [[.08, .06], [.9, .06], [.08, .97]].map(([x, y]) => {
    const r = document.createElement('div'); r.className = 'reg'; r.style.left = `calc(${x * 100}% - 14px)`; r.style.top = `calc(${y * 100}% - 14px)`
    r.innerHTML = INKS.map((c) => `<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="7" fill="none" stroke="${c}" stroke-width="1"/><path d="M14 1v26M1 14h26" stroke="${c}" stroke-width="1"/></svg>`).join('')
    regs.appendChild(r); return [...r.children]
  })
  let t0 = 0
  return {
    enter(t) { t0 = t },
    frame(t) {
      fit(cv); gl.viewport(0, 0, cv.width, cv.height)
      const dpr = cv.width / cv.clientWidth, e = reduced ? 99 : (t - t0) / 1000
      // intro: plates start far out of register and snap in with a little overshoot
      const p = Math.min(e / 1.3, 1), intro = (1 - p) ** 3 * Math.cos(p * 9) * 110 * (1 - p * .2)
      const m = Math.hypot(input.mx, input.my), ang = Math.atan2(-input.my, input.mx)
      const drift = 6 + m * 34 + Math.sin(t / 900) * 2.5 // the cursor pulls the plates apart
      const offs = DIRS.map((d, i) => [Math.cos(ang + d) * drift + Math.cos(d + 1) * intro, Math.sin(ang + d) * drift + Math.sin(d + 1) * intro]).concat([[0, 0]])
      offs.forEach(([x, y], i) => gl.uniform2f(u('uO' + i), x * dpr, -y * dpr))
      gl.uniform2f(u('uRes'), cv.width, cv.height); gl.uniform1f(u('uCell'), (coarse ? 5 : 6.5) * dpr); gl.uniform1f(u('uDark'), isLight() ? 0 : 1)
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      marks.forEach((svgs) => svgs.forEach((s, i) => { s.style.transform = `translate(${offs[i][0]}px, ${offs[i][1]}px)` }))
    },
  }
}

// ── director ─────────────────────────────────────────────────────────
const factories = { depth: depthStyle, chladni: chladniStyle, pencil: pencilStyle, ascii: asciiStyle, windows: windowsStyle, cmyk: cmykStyle }
const styles = {}
const layers = Object.fromEntries([...stage.querySelectorAll('.hp-layer')].map((l) => [l.dataset.k, l]))
const running = new Map() // style key -> time it stops drawing (after its fade out)
let current = null, raf = 0, visible = true

function show(k) {
  if (k === current || !factories[k]) return
  const now = performance.now()
  if (current) {
    const l = layers[current]
    l.classList.remove('on'); l.classList.add('out'); running.set(current, now + 950)
    clearTimeout(l.outTimer); l.outTimer = setTimeout(() => l.classList.remove('out'), 950)
  }
  styles[k] ??= factories[k]() // each style is built the first time it is needed
  const l = layers[k]; clearTimeout(l.outTimer); l.classList.remove('out'); l.classList.add('on')
  running.set(k, Infinity); styles[k].enter(now)
  current = k
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  if (!visible) return
  input.mx += (input.tx - input.mx) * .08; input.my += (input.ty - input.my) * .08
  input.sw += (Math.min(scrollY / innerHeight, 1) * .8 - input.sw) * .1
  for (const [k, until] of running) { if (t > until) running.delete(k); else styles[k].frame(t) }
}
const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting })
io.observe(stage)
raf = requestAnimationFrame(loop)

return {
  show,
  destroy() { cancelAnimationFrame(raf); io.disconnect(); offs.forEach((f) => f()) },
}
}

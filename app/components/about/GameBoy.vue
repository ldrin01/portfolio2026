<script setup lang="ts">
// The grey brick handheld, built in 3D from flat faces: warm grey grained plastic, a dark screen bezel with its two
// coloured lines, the red battery light, a cross pad that tilts, two magenta buttons that sink, two rubber pills and
// the slanted speaker slots. It turns toward the pointer and a soft highlight slides across the plastic.
// Switch-on plays a little scrolling logo, then on the 160x144 screen (pixel grid, ghosting) a pixel kid of our own
// runs and jumps over crates. It plays itself; press A (or Space) and you take over until you bump into something.
// A: big jump · B: small hop · pad: left/right to move, down to drop fast · Start: pause · Select: next screen colours.
// Keys: A, B and Space always work while it is on screen; arrows, Enter (Start) and Shift (Select) work while it is
// hovered or focused, so the page still scrolls normally.
const W = 320, H = 520, D = 84, R = 84 // body size, depth and the bottom-right corner's radius, in px

// the side walls: one face per edge of the outline, the round corner cut into a few facets
const walls = computed(() => {
  const pts: [number, number][] = [[0, 0], [W, 0], [W, H - R]]
  for (let k = 1; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; pts.push([W - R + Math.cos(a) * R, H - R + Math.sin(a) * R]) }
  pts.push([0, H])
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]!, dx = q[0] - p[0], dy = q[1] - p[1]
    const r3 = (n: number) => Math.round(n * 1000) / 1000 // rounded so server and browser print the same numbers
    return { left: r3(p[0]), top: r3(p[1]), len: r3(Math.hypot(dx, dy)), angle: r3(Math.atan2(dy, dx)), shade: r3(.82 + Math.sin(Math.atan2(dy, dx)) * .1) }
  })
})

type Btn = 'a' | 'b' | 'start' | 'select' | 'up' | 'down' | 'left' | 'right'
const root = ref<HTMLElement>()
const screen = ref<HTMLCanvasElement>()
const tilt = reactive({ x: 0, y: 0, mx: 35, my: 25 })
const down = reactive<Record<Btn, boolean>>({ a: false, b: false, start: false, select: false, up: false, down: false, left: false, right: false })
const power = ref(false) // the battery light comes on with the boot
const active = ref(false) // hovered or focused: arrows and Enter belong to the console
const calm = ref(false) // reduced motion
const act = ref<(k: Btn) => void>(() => {})
let cleanup = () => {}
onBeforeUnmount(() => cleanup())

const onMove = (e: PointerEvent) => {
  const r = root.value!.getBoundingClientRect()
  const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height
  tilt.mx = Math.round(u * 100); tilt.my = Math.round(v * 100)
  if (calm.value) return
  tilt.y = (u - .5) * 30
  tilt.x = -(v - .5) * 16
}
const resetTilt = () => { tilt.x = 0; tilt.y = 0; tilt.mx = 35; tilt.my = 25; active.value = false }

// pressing (the action fires on the press, not on release)
const setBtn = (k: Btn, on: boolean) => { if (down[k] === on) return; down[k] = on; if (on) act.value(k) }
const tap = (k: Btn, e: MouseEvent) => { if (e.detail === 0) { setBtn(k, true); setTimeout(() => setBtn(k, false), 120) } } // keyboard click
const dpadAt = (e: PointerEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5
  const go = Math.hypot(dx, dy) > .09, h = Math.abs(dx) > Math.abs(dy)
  setBtn('left', go && h && dx < 0); setBtn('right', go && h && dx > 0)
  setBtn('up', go && !h && dy < 0); setBtn('down', go && !h && dy > 0)
}
const dpadDown = (e: PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); dpadAt(e) }
const dpadMove = (e: PointerEvent) => { if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) dpadAt(e) }
const dpadUp = () => { setBtn('left', false); setBtn('right', false); setBtn('up', false); setBtn('down', false) }
// the pad tips toward the side you press
const dpadTilt = computed(() => `perspective(240px) translateZ(4px) rotateX(${(down.up ? 11 : 0) - (down.down ? 11 : 0)}deg) rotateY(${(down.right ? 11 : 0) - (down.left ? 11 : 0)}deg)`)

// ── the game ────────────────────────────────────────────────────────────────
const PALETTES = [ // lightest to darkest; Select cycles through them
  ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'],
  ['#c6cbc0', '#9aa093', '#575d57', '#1b1f1c'],
  ['#ffe9a8', '#e6b44c', '#9a5b1c', '#2c1608'],
  ['#d7f0f5', '#8fc4d6', '#3d6f94', '#10233d']
]
const KID = [ // 0 clear, 1–3 shades; two running frames share the top
  '..3333..', '.333333.', '..2222..', '..2323..', '..2222..', '...33...', '.333333.', '3.3333.3', '..3333..'
]
const LEGS = [['..3..3..', '.3....3.'], ['...33...', '...33...']]
const CRATE = ['33333333', '32222223', '32322323', '32233223', '32233223', '32322323', '32222223', '33333333']
// a 3x5 pixel font for the few words on screen
const FONT: Record<string, string> = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
  H: '101101111101101', I: '111010010010111', P: '111101111100100', R: '110101110101101', E: '111100110100111', S: '111100111001111', A: '010101111101101',
  G: '111100101101111', M: '101111111101101', O: '111101101101111', V: '101101101101010', ' ': '000000000000000',
  D: '110101101101110', N: '110101101101101', W: '101101101111101', K: '101101110101101', U: '101101101101111', X: '101101010101101', L: '100100100100111'
}

onMounted(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  calm.value = reduced
  const SC = 5 // the visible canvas is the game drawn five times bigger, so the grid lines stay crisp
  const out = screen.value!.getContext('2d')!
  const mk = () => { const c = document.createElement('canvas'); c.width = 160; c.height = 144; return c }
  const buf = mk(), ghost = mk() // buf: the frame as drawn; ghost: what the slow LCD still remembers
  const ctx = buf.getContext('2d')!, gctx = ghost.getContext('2d')!
  let pal = 0, SHADES = PALETTES[0]!
  const GROUND = 124
  let kidY = 0, kidX = 20, vy = 0, speed = 1.4, dist = 0, score = 0, hi = 0, frame = 0
  let crates: { x: number; h: number }[] = [{ x: 170, h: 1 }]
  let clouds = [{ x: 30, y: 26 }, { x: 110, y: 40 }]
  let manual = false, over = 0, paused = false
  let mode: 'off' | 'boot' | 'play' = reduced ? 'play' : 'off', bootT = 0
  if (reduced) power.value = true

  const px = (rows: string[], x: number, y: number) => rows.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '.' && c !== '0') { ctx.fillStyle = SHADES[+c]!; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1) }
  }))
  const text = (s: string, x: number, y: number, shade = 3, sc = 1) => {
    ctx.fillStyle = SHADES[shade]!
    ;[...s].forEach((ch, k) => [...(FONT[ch] ?? FONT[' ']!)].forEach((b, n) => { if (b === '1') ctx.fillRect(x + (k * 4 + (n % 3)) * sc, y + Math.floor(n / 3) * sc, sc, sc) }))
  }
  const clear = () => { ctx.fillStyle = SHADES[0]!; ctx.fillRect(0, 0, 160, 144) }
  const jump = (v = 4.4) => { if (kidY === 0) vy = v }

  act.value = (k) => {
    if (k === 'select') { pal = (pal + 1) % PALETTES.length; SHADES = PALETTES[pal]!; if (calm.value) { drawScene(); present() }; return }
    if (mode === 'boot') { if (k === 'start') bootT = 175; return }
    if (mode !== 'play') return
    if (k === 'start') { paused = !paused; if (calm.value) { drawScene(); present() }; return }
    if (paused || over) return
    if (k === 'a' || k === 'b' || k === 'up') { if (!manual) { manual = true; score = 0 } jump(k === 'b' ? 3.3 : 4.4) }
  }

  const update = () => {
    if (over) { if (--over === 0) { manual = false; crates = [{ x: 170, h: 1 }]; speed = 1.4; score = 0 } return }
    dist += speed; speed = Math.min(2.6, speed + .0006)
    if (frame % 6 === 0) score++
    hi = Math.max(hi, score)
    crates.forEach((c) => { c.x -= speed })
    if (crates[0] && crates[0].x < -10) crates.shift()
    const lastX = crates.at(-1)?.x ?? 0
    if (lastX < 160 - 60 - Math.random() * 60) crates.push({ x: 168, h: Math.random() < .25 ? 2 : 1 })
    clouds.forEach((c) => { c.x -= speed * .25; if (c.x < -20) { c.x = 170; c.y = 18 + Math.random() * 30 } })
    // the pad moves the kid; without you it drifts back to its spot
    if (manual) kidX = Math.max(6, Math.min(70, kidX + (down.right ? 1.3 : 0) - (down.left ? 1.3 : 0)))
    else kidX += (20 - kidX) * .1
    // the kid plays itself until you press A
    const next = crates.find(c => c.x + 8 > kidX)
    if (!manual && next && next.x - 28 < 6 + speed * 6 && next.x > kidX + 2) jump()
    vy -= .3 + (manual && down.down && kidY > 0 ? .35 : 0); kidY = Math.max(0, kidY + vy); if (kidY === 0) vy = 0
    const hit = crates.some(c => c.x < kidX + 7 && c.x + 8 > kidX + 1 && kidY < c.h * 8 - 1)
    if (hit && manual) over = 90
  }

  const drawScene = () => {
    clear()
    clouds.forEach(c => px(['..1111..', '.111111.', '11111111'], c.x, c.y))
    ctx.fillStyle = SHADES[3]!; ctx.fillRect(0, GROUND, 160, 1)
    ctx.fillStyle = SHADES[2]!
    for (let x = -(dist % 12); x < 160; x += 12) ctx.fillRect(Math.round(x), GROUND + 4, 4, 1)
    for (let x = -((dist * .5) % 20); x < 160; x += 20) ctx.fillRect(Math.round(x + 7), GROUND + 9, 2, 1)
    crates.forEach(c => { for (let k = 0; k < c.h; k++) px(CRATE, c.x, GROUND - 8 * (k + 1)) })
    const legs = kidY > 0 ? LEGS[1]! : LEGS[Math.floor(frame / 6) % 2]!
    px([...KID, ...legs], kidX, GROUND - 11 - Math.round(kidY))
    text(String(score).padStart(5, '0'), 134, 6)
    text('HI ' + String(hi).padStart(5, '0'), 6, 6, 2)
    if (paused) text('PAUSE', 70, 60)
    else if (over) { if (Math.floor(over / 15) % 2) text('GAME OVER', 62, 60) }
    else if (!manual && Math.floor(frame / 30) % 2) text('PRESS A', 66, 60, 2)
  }

  // the switch-on: our logo slides down to the middle, glints, and holds a moment
  const drawBoot = () => {
    clear()
    const e = Math.min(1, bootT / 70), y = Math.round(-12 + (1 - (1 - e) ** 3) * 78)
    text('DRINWORKS', 45, y, 3, 2)
    if (bootT > 70 && bootT < 90) {
      const g = bootT < 80 ? ['..3..', '.333.', '33333', '.333.', '..3..'] : ['.....', '..3..', '.333.', '..3..', '.....']
      px(g, 112, y - 4)
    }
    if (bootT > 84) text('PIXEL PAL', 62, 86, 2)
  }

  const tick = () => {
    frame++
    if (mode === 'boot') { bootT++; if (bootT > 175) mode = 'play'; drawBoot(); return }
    if (mode === 'off') { clear(); return }
    if (!paused) update()
    drawScene()
  }

  // show the frame: blend it over what the screen still remembers, then draw it big with the pixel grid on top
  const present = () => {
    gctx.globalAlpha = calm.value ? 1 : .55; gctx.drawImage(buf, 0, 0); gctx.globalAlpha = 1
    out.imageSmoothingEnabled = false
    out.drawImage(ghost, 0, 0, 160 * SC, 144 * SC)
    out.fillStyle = SHADES[3]!; out.globalAlpha = .14
    for (let x = 0; x < 160; x++) out.fillRect(x * SC, 0, 1, 144 * SC)
    for (let y = 0; y < 144; y++) out.fillRect(0, y * SC, 160 * SC, 1)
    out.globalAlpha = 1
  }

  let raf = 0, visible = false, acc = 0, t0 = 0
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop)
    acc += Math.min(100, t - (t0 || t)); t0 = t
    while (acc >= 16.67) { tick(); acc -= 16.67 }
    present()
  }
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting
    cancelAnimationFrame(raf); t0 = 0
    if (visible && mode === 'off') { mode = 'boot'; power.value = true }
    if (visible && !reduced) raf = requestAnimationFrame(loop)
  })
  io.observe(root.value!)
  gctx.fillStyle = SHADES[0]!; gctx.fillRect(0, 0, 160, 144)
  tick(); present()

  const KEYS: Record<string, Btn> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'start', Shift: 'select' }
  const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest?.('input, textarea, [contenteditable]')
  const onKey = (e: KeyboardEvent) => {
    if (!visible || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
    const lk = e.key.toLowerCase()
    const k: Btn | undefined = e.code === 'Space' || lk === 'a' ? 'a' : lk === 'b' ? 'b' : active.value ? KEYS[e.key] : undefined
    if (!k) return
    if (k !== 'select') e.preventDefault()
    if (!e.repeat) setBtn(k, true)
  }
  const onKeyUp = (e: KeyboardEvent) => {
    const lk = e.key.toLowerCase()
    const k: Btn | undefined = e.code === 'Space' || lk === 'a' ? 'a' : lk === 'b' ? 'b' : KEYS[e.key]
    if (k) setBtn(k, false)
  }
  const onBlur = () => (Object.keys(down) as Btn[]).forEach(k => setBtn(k, false))
  addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp); addEventListener('blur', onBlur)
  cleanup = () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('keyup', onKeyUp); removeEventListener('blur', onBlur) }
})
</script>

<template>
  <div
    ref="root" class="stage" tabindex="0" role="group" aria-label="Handheld console. A or Space jumps, B hops, arrows move, Enter pauses, Shift changes the screen colours."
    @pointermove="onMove" @pointerenter="active = true" @pointerleave="resetTilt" @focusin="active = true" @focusout="active = false"
  >
    <div class="gb" :style="{ '--w': `${W}px`, '--h': `${H}px`, '--d': `${D}px`, '--r': `${R}px`, '--tx': `${tilt.x}deg`, '--ty': `${tilt.y}deg`, '--mx': `${tilt.mx}%`, '--my': `${tilt.my}%` }">
      <div class="back" aria-hidden="true" />
      <div v-for="(w, i) in walls" :key="i" class="wall" aria-hidden="true" :style="{ left: `${w.left}px`, top: `${w.top}px`, width: `${w.len + .6}px`, transform: `rotateZ(${w.angle}rad) rotateX(-90deg)`, filter: `brightness(${w.shade})` }" />
      <div class="front">
        <div class="top-line" aria-hidden="true"><span>◁ OFF·ON ▷</span></div>
        <div class="bezel">
          <div class="stripes" aria-hidden="true" />
          <p class="label" aria-hidden="true">PIXEL MATRIX WITH MONO BLEEP SOUND</p>
          <div class="led" :class="{ on: power }" aria-hidden="true"><i /><span>BATTERY</span></div>
          <div class="lcd">
            <canvas ref="screen" class="screen" width="800" height="720" role="img" aria-label="A little pixel game: a kid running and jumping over crates" />
            <div class="glass" aria-hidden="true" />
          </div>
        </div>
        <p class="brand" aria-hidden="true"><b>DRINWORKS</b><em>PIXEL PAL</em></p>
        <div class="well pad-well" aria-hidden="true" />
        <div class="dpad" aria-hidden="true" :style="{ transform: dpadTilt }" @pointerdown.prevent="dpadDown" @pointermove="dpadMove" @pointerup="dpadUp" @pointercancel="dpadUp">
          <svg viewBox="0 0 100 106">
            <defs>
              <linearGradient id="gb-pad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a52" /><stop offset=".5" stop-color="#2a2a30" /><stop offset="1" stop-color="#18181c" /></linearGradient>
              <radialGradient id="gb-dip" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#0d0d10" /><stop offset="1" stop-color="#2a2a30" /></radialGradient>
            </defs>
            <path d="M37 10H63a4 4 0 0 1 4 4V39H92a4 4 0 0 1 4 4V69a4 4 0 0 1-4 4H67V98a4 4 0 0 1-4 4H37a4 4 0 0 1-4-4V73H8a4 4 0 0 1-4-4V43a4 4 0 0 1 4-4H33V14a4 4 0 0 1 4-4Z" fill="#050507" />
            <path d="M37 4H63a4 4 0 0 1 4 4V33H92a4 4 0 0 1 4 4V63a4 4 0 0 1-4 4H67V92a4 4 0 0 1-4 4H37a4 4 0 0 1-4-4V67H8a4 4 0 0 1-4-4V37a4 4 0 0 1 4-4H33V8a4 4 0 0 1 4-4Z" fill="url(#gb-pad)" stroke="rgba(255,255,255,.16)" stroke-width=".8" />
            <circle cx="50" cy="50" r="14" fill="url(#gb-dip)" />
            <g fill="rgba(255,255,255,.14)"><path d="M50 10l6 9H44Z" /><path d="M50 90l6-9H44Z" /><path d="M10 50l9-6v12Z" /><path d="M90 50l-9-6v12Z" /></g>
          </svg>
        </div>
        <div class="ab">
          <div class="well" aria-hidden="true" />
          <button type="button" class="b" :class="{ on: down.b }" aria-label="B button: small hop" @pointerdown.prevent="setBtn('b', true)" @pointerup="setBtn('b', false)" @pointerleave="setBtn('b', false)" @pointercancel="setBtn('b', false)" @keydown.space.stop @keydown.enter.stop @click="tap('b', $event)"><span>B</span></button>
          <button type="button" class="a" :class="{ on: down.a }" aria-label="A button: jump" @pointerdown.prevent="setBtn('a', true)" @pointerup="setBtn('a', false)" @pointerleave="setBtn('a', false)" @pointercancel="setBtn('a', false)" @keydown.space.stop @keydown.enter.stop @click="tap('a', $event)"><span>A</span></button>
        </div>
        <div class="pills">
          <div class="pill-slot">
            <button type="button" :class="{ on: down.select }" aria-label="Select: change screen colours" @pointerdown.prevent="setBtn('select', true)" @pointerup="setBtn('select', false)" @pointerleave="setBtn('select', false)" @pointercancel="setBtn('select', false)" @keydown.space.stop @keydown.enter.stop @click="tap('select', $event)" />
            <span aria-hidden="true">SELECT</span>
          </div>
          <div class="pill-slot">
            <button type="button" :class="{ on: down.start }" aria-label="Start: pause" @pointerdown.prevent="setBtn('start', true)" @pointerup="setBtn('start', false)" @pointerleave="setBtn('start', false)" @pointercancel="setBtn('start', false)" @keydown.space.stop @keydown.enter.stop @click="tap('start', $event)" />
            <span aria-hidden="true">START</span>
          </div>
        </div>
        <div class="speaker" aria-hidden="true"><i v-for="n in 6" :key="n" /></div>
        <div class="sheen" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage { display: flex; justify-content: center; padding: 30px 0; perspective: 1600px; outline: 0; }
.stage:focus-visible .gb { outline: 2px dashed rgba(120, 120, 140, .7); outline-offset: 14px; border-radius: 14px; }
.gb {
  --body: #cdcbc1; --side: #b3b1a8; --ink: #2b2d7c;
  position: relative; width: var(--w); height: var(--h); transform-style: preserve-3d; flex: none;
  transform: rotateX(calc(12deg + var(--tx))) rotateY(calc(-24deg + var(--ty))) rotateZ(2deg);
  transition: transform .5s cubic-bezier(.2, .8, .2, 1); scale: var(--fit, 1);
}
.front, .back { position: absolute; inset: 0; border-radius: 14px 14px var(--r) 14px; }
.back { transform: translateZ(calc(var(--d) * -1)); background: #a5a39b; box-shadow: 0 50px 70px -24px rgba(0, 0, 0, .4), 0 20px 30px -12px rgba(0, 0, 0, .25); }
.wall { position: absolute; height: var(--d); background: linear-gradient(#d4d2c9, var(--side) 18%, #a9a79f); transform-origin: 0 0; backface-visibility: visible; }
/* the front plastic: a soft gradient, a lit rim, a darker lower rim and fine grain on top */
.front {
  transform-style: preserve-3d;
  background: linear-gradient(155deg, #dddbd2, var(--body) 42%, #c1bfb5);
  box-shadow: inset 0 1.5px 0 rgba(255, 255, 255, .85), inset 1.5px 0 0 rgba(255, 255, 255, .45), inset 0 -3px 5px rgba(0, 0, 0, .14), inset -3px 0 5px rgba(0, 0, 0, .08), 0 0 0 1px rgba(0, 0, 0, .08);
}
.front::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: .13; mix-blend-mode: multiply;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
/* a highlight that follows the pointer, lifted above everything so it lies over buttons and screen too */
.sheen {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; transform: translateZ(8px);
  background: radial-gradient(circle at var(--mx) var(--my), rgba(255, 255, 255, .28), rgba(255, 255, 255, 0) 52%);
  transition: background .2s;
}
.top-line { position: absolute; left: 0; right: 0; top: 27px; height: 2px; border-top: 1px solid rgba(0, 0, 0, .16); border-bottom: 1px solid rgba(255, 255, 255, .7); }
.top-line span { position: absolute; left: 24px; top: -18px; font: 700 8px/1 system-ui, sans-serif; letter-spacing: .1em; color: #6b6a72; }
.bezel {
  position: absolute; left: 22px; right: 22px; top: 46px; height: 238px; border-radius: 12px 12px 54px 12px; transform: translateZ(2px); transform-style: preserve-3d;
  background: linear-gradient(170deg, #747389, #5a596e 55%, #4b4a5d);
  box-shadow: inset 0 2px 3px rgba(255, 255, 255, .28), inset 0 -3px 5px rgba(0, 0, 0, .35), 0 1px 0 rgba(255, 255, 255, .75), 0 4px 8px rgba(0, 0, 0, .25);
}
.stripes { position: absolute; left: 14px; right: 14px; top: 12px; height: 4px; border-top: 2px solid #9a2262; border-bottom: 2px solid #2c4aa0; }
.label { position: absolute; left: 0; right: 0; top: 24px; margin: 0; text-align: center; font: 600 6.5px/1 system-ui, sans-serif; letter-spacing: .14em; color: #cfcedd; text-shadow: 0 -1px 0 rgba(0, 0, 0, .35); }
.led { position: absolute; left: 12px; top: 98px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.led i { width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7a2a24, #3b0f0c); box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .4), 0 1px 0 rgba(255, 255, 255, .15); transition: background .3s, box-shadow .3s; }
.led.on i { background: radial-gradient(circle at 35% 30%, #ffb3a6, #ff2a1a 55%); box-shadow: 0 0 6px 2px rgba(255, 50, 30, .85), 0 0 18px 4px rgba(255, 40, 20, .45); animation: glow 2.8s ease-in-out infinite; }
@keyframes glow { 50% { box-shadow: 0 0 4px 1px rgba(255, 50, 30, .6), 0 0 10px 2px rgba(255, 40, 20, .25); } }
.led span { font: 700 5.5px/1 system-ui, sans-serif; letter-spacing: .06em; color: #b9b8c6; }
/* the screen sits in a dark frame with the bezel's shadow falling across its top and left edge */
.lcd { position: absolute; left: 48px; top: 44px; width: 200px; height: 180px; transform: translateZ(1px); background: #2c2b38; box-shadow: 0 0 0 4px #34333f, 0 0 0 5px rgba(0, 0, 0, .35), 0 1px 0 5px rgba(255, 255, 255, .12); }
.screen { display: block; width: 200px; height: 180px; filter: contrast(.94) saturate(.92); }
.glass {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 30% 20%, rgba(255, 255, 255, 0) 55%, rgba(0, 20, 0, .16)), linear-gradient(118deg, rgba(255, 255, 255, .2), rgba(255, 255, 255, 0) 38%);
  box-shadow: inset 0 7px 8px -4px rgba(0, 0, 0, .4), inset 4px 0 6px -3px rgba(0, 0, 0, .25), inset 0 -1px 0 rgba(255, 255, 255, .08);
}
.brand { position: absolute; left: 26px; top: 298px; margin: 0; display: flex; align-items: baseline; gap: 8px; font-family: var(--font, system-ui), sans-serif; color: var(--ink); }
.brand b { font: italic 800 17px/1 var(--font, system-ui), sans-serif; letter-spacing: .02em; }
.brand em { font: italic 700 13px/1 var(--font, system-ui), sans-serif; letter-spacing: .03em; color: #8d2a62; }
/* the dents the pad and buttons sit in */
.well { position: absolute; background: rgba(0, 0, 0, .035); box-shadow: inset 0 3px 6px rgba(0, 0, 0, .28), inset 0 -1px 1px rgba(255, 255, 255, .4), 0 1px 0 rgba(255, 255, 255, .8); pointer-events: none; }
.pad-well { left: 28px; top: 342px; width: 108px; height: 108px; border-radius: 50%; }
.dpad { position: absolute; left: 38px; top: 350px; width: 88px; height: 93px; cursor: pointer; touch-action: none; transition: transform .09s ease-out; user-select: none; }
.dpad svg { display: block; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 4px 4px rgba(0, 0, 0, .35)); }
.ab { position: absolute; right: 26px; top: 346px; width: 138px; height: 72px; transform: rotate(-25deg); transform-style: preserve-3d; }
.ab .well { inset: 0; border-radius: 36px; }
.ab button, .pills button { cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.ab button {
  position: absolute; top: 12px; width: 48px; height: 48px; padding: 0; border: 0; border-radius: 50%; transform: translateZ(5px);
  background: radial-gradient(circle at 36% 28%, #e0558c, #a8235f 52%, #7a1547);
  box-shadow: 0 6px 0 #54102f, 0 9px 9px rgba(0, 0, 0, .38), inset 0 1.5px 1px rgba(255, 255, 255, .45), inset 0 -4px 6px rgba(0, 0, 0, .25);
  transition: transform .07s ease-out, box-shadow .07s ease-out;
}
.ab button.on { transform: translateZ(1px) translateY(5px); box-shadow: 0 1px 0 #54102f, 0 2px 3px rgba(0, 0, 0, .35), inset 0 1px 1px rgba(255, 255, 255, .25), inset 0 -3px 5px rgba(0, 0, 0, .3); }
.ab button span { position: absolute; left: 50%; top: 60px; translate: -50% 0; font: 700 12px/1 system-ui, sans-serif; color: var(--ink); pointer-events: none; }
.ab .b { left: 10px; }
.ab .a { right: 10px; }
.pills { position: absolute; left: 70px; top: 464px; display: flex; gap: 12px; transform: rotate(-25deg); transform-style: preserve-3d; }
.pill-slot { position: relative; width: 50px; height: 20px; border-radius: 10px; background: rgba(0, 0, 0, .035); box-shadow: inset 0 2px 4px rgba(0, 0, 0, .28), 0 1px 0 rgba(255, 255, 255, .8); transform-style: preserve-3d; }
.pill-slot button {
  position: absolute; inset: 3px 4px; padding: 0; border: 0; border-radius: 7px; transform: translateZ(3px);
  background: linear-gradient(#aaa9b0, #86858d); box-shadow: 0 2px 0 #5b5a62, 0 4px 5px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .45);
  transition: transform .07s ease-out, box-shadow .07s ease-out;
}
.pill-slot button.on { transform: translateZ(1px) translateY(2px); box-shadow: 0 0 0 #5b5a62, 0 1px 2px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .25); }
.pill-slot span { position: absolute; left: 50%; top: 25px; translate: -50% 0; font: 700 7px/1 system-ui, sans-serif; letter-spacing: .08em; color: var(--ink); }
.speaker { position: absolute; right: 30px; bottom: 34px; display: flex; gap: 8px; transform: rotate(-30deg); }
.speaker i { width: 7px; height: 52px; border-radius: 4px; background: #aeaca3; box-shadow: inset 2px 1px 2px rgba(0, 0, 0, .45), inset -1px -1px 0 rgba(255, 255, 255, .55); }
@media (max-width: 520px) { .gb { --fit: .72; } .stage { padding: 0; margin: -70px 0; } }
@media (prefers-reduced-motion: reduce) { .led.on i { animation: none; } .gb, .dpad, .ab button, .pill-slot button { transition: none; } }
</style>

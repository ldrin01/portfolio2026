<script setup lang="ts">
// The grey brick handheld, built in 3D from flat faces: grey body with the big rounded bottom-right corner, dark
// screen bezel with its two coloured lines, the red battery light, a black cross pad, two magenta buttons, two
// rubber pills and the slanted speaker slots. It turns toward the pointer.
// On the 160x144 screen, in four shades of green, a little pixel kid of our own runs and jumps over crates. It plays
// itself; press A (or Space) and you take over until you bump into something.
const W = 300, H = 492, D = 84, R = 72 // body size, depth and the bottom-right corner's radius, in px

// the side walls: one face per edge of the outline, the round corner cut into a few facets
const walls = computed(() => {
  const pts: [number, number][] = [[0, 0], [W, 0], [W, H - R]]
  for (let k = 1; k <= 5; k++) { const a = (k / 5) * Math.PI / 2; pts.push([W - R + Math.cos(a) * R, H - R + Math.sin(a) * R]) }
  pts.push([0, H])
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]!, dx = q[0] - p[0], dy = q[1] - p[1]
    return { left: p[0], top: p[1], len: Math.hypot(dx, dy), angle: Math.atan2(dy, dx), shade: .82 + Math.sin(Math.atan2(dy, dx)) * .1 }
  })
})

const root = ref<HTMLElement>()
const screen = ref<HTMLCanvasElement>()
const tilt = reactive({ x: 0, y: 0 })
const onMove = (e: PointerEvent) => {
  const r = root.value!.getBoundingClientRect()
  tilt.y = ((e.clientX - r.left) / r.width - .5) * 30
  tilt.x = -((e.clientY - r.top) / r.height - .5) * 16
}
const resetTilt = () => { tilt.x = 0; tilt.y = 0 }

// ── the game ────────────────────────────────────────────────────────────────
const SHADES = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'] // lightest to darkest
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
  G: '111100101101111', M: '101111111101101', O: '111101101101111', V: '101101101101010', ' ': '000000000000000'
}
const pressA = ref<() => void>(() => {})

onMounted(() => {
  const ctx = screen.value!.getContext('2d')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const GROUND = 124
  let kidY = 0, vy = 0, speed = 1.4, dist = 0, score = 0, hi = 0, frame = 0
  let crates: { x: number; h: number }[] = [{ x: 170, h: 1 }]
  let clouds = [{ x: 30, y: 26 }, { x: 110, y: 40 }]
  let manual = false, over = 0

  const px = (rows: string[], x: number, y: number) => rows.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '.' && c !== '0') { ctx.fillStyle = SHADES[+c]!; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1) }
  }))
  const text = (s: string, x: number, y: number, shade = 3) => {
    ctx.fillStyle = SHADES[shade]!
    ;[...s].forEach((ch, k) => [...(FONT[ch] ?? FONT[' ']!)].forEach((b, n) => { if (b === '1') ctx.fillRect(x + k * 4 + (n % 3), y + Math.floor(n / 3), 1, 1) }))
  }
  const jump = () => { if (kidY === 0) vy = 4.4 }
  pressA.value = () => { if (over) return; if (!manual) { manual = true; score = 0 } jump() }

  const tick = () => {
    frame++
    if (over) { if (--over === 0) { manual = false; crates = [{ x: 170, h: 1 }]; speed = 1.4; score = 0 } }
    else {
      dist += speed; speed = Math.min(2.6, speed + .0006)
      if (frame % 6 === 0) score++
      hi = Math.max(hi, score)
      crates.forEach((c) => { c.x -= speed })
      if (crates[0] && crates[0].x < -10) crates.shift()
      const lastX = crates.at(-1)?.x ?? 0
      if (lastX < 160 - 60 - Math.random() * 60) crates.push({ x: 168, h: Math.random() < .25 ? 2 : 1 })
      clouds.forEach((c) => { c.x -= speed * .25; if (c.x < -20) { c.x = 170; c.y = 18 + Math.random() * 30 } })
      // the kid plays itself until you press A
      const next = crates.find(c => c.x + 8 > 20)
      if (!manual && next && next.x - 28 < 6 + speed * 6 && next.x > 22) jump()
      vy -= .3; kidY = Math.max(0, kidY + vy); if (kidY === 0) vy = 0
      const hit = crates.some(c => c.x < 20 + 7 && c.x + 8 > 20 + 1 && kidY < c.h * 8 - 1)
      if (hit && manual) over = 90
    }
    // draw
    ctx.fillStyle = SHADES[0]!; ctx.fillRect(0, 0, 160, 144)
    clouds.forEach(c => px(['..1111..', '.111111.', '11111111'], c.x, c.y))
    ctx.fillStyle = SHADES[3]!; ctx.fillRect(0, GROUND, 160, 1)
    ctx.fillStyle = SHADES[2]!
    for (let x = -(dist % 12); x < 160; x += 12) ctx.fillRect(Math.round(x), GROUND + 4, 4, 1)
    for (let x = -((dist * .5) % 20); x < 160; x += 20) ctx.fillRect(Math.round(x + 7), GROUND + 9, 2, 1)
    crates.forEach(c => { for (let k = 0; k < c.h; k++) px(CRATE, c.x, GROUND - 8 * (k + 1)) })
    const legs = kidY > 0 ? LEGS[1]! : LEGS[Math.floor(frame / 6) % 2]!
    px([...KID, ...legs], 20, GROUND - 11 - Math.round(kidY))
    text(String(score).padStart(5, '0'), 134, 6)
    text('HI ' + String(hi).padStart(5, '0'), 6, 6, 2)
    if (over) { if (Math.floor(over / 15) % 2) text('GAME OVER', 62, 60) }
    else if (!manual && Math.floor(frame / 30) % 2) text('PRESS A', 66, 60, 2)
  }

  let raf = 0, visible = false, acc = 0, t0 = 0
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop)
    acc += Math.min(100, t - (t0 || t)); t0 = t
    while (acc >= 16.67) { tick(); acc -= 16.67 }
  }
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting
    cancelAnimationFrame(raf); t0 = 0
    if (visible && !reduced) raf = requestAnimationFrame(loop)
  })
  io.observe(root.value!)
  tick()
  const onKey = (e: KeyboardEvent) => { if (visible && (e.code === 'Space' || e.key === 'a' || e.key === 'A') && !(e.target as HTMLElement).closest('input, textarea, [contenteditable]')) { e.preventDefault(); pressA.value() } }
  addEventListener('keydown', onKey)
  onBeforeUnmount(() => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('keydown', onKey) })
})
</script>

<template>
  <div ref="root" class="stage" @pointermove="onMove" @pointerleave="resetTilt">
    <div class="gb" :style="{ '--w': `${W}px`, '--h': `${H}px`, '--d': `${D}px`, '--r': `${R}px`, '--tx': `${tilt.x}deg`, '--ty': `${tilt.y}deg` }">
      <div class="back" aria-hidden="true" />
      <div v-for="(w, i) in walls" :key="i" class="wall" aria-hidden="true" :style="{ left: `${w.left}px`, top: `${w.top}px`, width: `${w.len + .6}px`, transform: `rotateZ(${w.angle}rad) rotateX(-90deg)`, filter: `brightness(${w.shade})` }" />
      <div class="front">
        <div class="top-line" aria-hidden="true"><span>◁OFF·ON▷</span></div>
        <div class="bezel">
          <div class="stripes" aria-hidden="true" />
          <div class="led" aria-hidden="true"><i /><span>BATTERY</span></div>
          <canvas ref="screen" class="screen" width="160" height="144" role="img" aria-label="A little pixel game: a kid running and jumping over crates" />
        </div>
        <p class="brand" aria-hidden="true">DRINWORKS</p>
        <div class="dpad" aria-hidden="true"><i /><i /></div>
        <div class="ab">
          <button type="button" class="b" aria-label="B button" @click="pressA()"><span>B</span></button>
          <button type="button" class="a" aria-label="A button: jump" @click="pressA()"><span>A</span></button>
        </div>
        <div class="pills" aria-hidden="true"><span><i />SELECT</span><span><i />START</span></div>
        <div class="speaker" aria-hidden="true"><i v-for="n in 6" :key="n" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage { display: flex; justify-content: center; padding: 30px 0; perspective: 1600px; }
.gb {
  --body: #c9c8c2; --side: #b5b4ae; --ink: #2b2d7c;
  position: relative; width: var(--w); height: var(--h); transform-style: preserve-3d; flex: none;
  transform: rotateX(calc(12deg + var(--tx))) rotateY(calc(-24deg + var(--ty))) rotateZ(2deg);
  transition: transform .6s cubic-bezier(.2, .8, .2, 1); scale: var(--fit, 1);
}
.front, .back { position: absolute; inset: 0; border-radius: 12px 12px var(--r) 12px; }
.back { transform: translateZ(calc(var(--d) * -1)); background: #a9a8a2; box-shadow: 0 40px 60px -20px rgba(0, 0, 0, .35); }
.wall { position: absolute; height: var(--d); background: var(--side); transform-origin: 0 0; backface-visibility: visible; }
.front { background: linear-gradient(160deg, #d6d5cf, var(--body) 40%, #c2c1bb); box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .06); }
.top-line { position: absolute; left: 0; right: 0; top: 26px; height: 1px; background: rgba(0, 0, 0, .14); }
.top-line span { position: absolute; left: 22px; top: -17px; font: 700 8px/1 system-ui, sans-serif; letter-spacing: .08em; color: #6b6a72; }
.bezel { position: absolute; left: 22px; right: 22px; top: 44px; height: 200px; border-radius: 10px 10px 42px 10px; background: #5f5e70; }
.stripes { position: absolute; left: 12px; right: 12px; top: 12px; height: 5px; border-top: 2px solid #8b1d58; border-bottom: 2px solid #253c8f; }
.led { position: absolute; left: 13px; top: 80px; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.led i { width: 9px; height: 9px; border-radius: 50%; background: #ff2a1a; box-shadow: 0 0 6px 2px rgba(255, 50, 30, .85), 0 0 18px 4px rgba(255, 40, 20, .45); animation: glow 2.8s ease-in-out infinite; }
@keyframes glow { 50% { box-shadow: 0 0 4px 1px rgba(255, 50, 30, .6), 0 0 10px 2px rgba(255, 40, 20, .25); } }
.led span { font: 700 6px/1 system-ui, sans-serif; letter-spacing: .06em; color: #b9b8c6; }
.screen { position: absolute; left: 48px; top: 30px; width: 160px; height: 144px; image-rendering: pixelated; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .3); }
.brand { position: absolute; left: 24px; top: 254px; margin: 0; font: italic 800 17px/1 var(--font, system-ui), sans-serif; letter-spacing: .02em; color: var(--ink); }
.dpad { position: absolute; left: 38px; top: 302px; width: 80px; height: 80px; }
.dpad i { position: absolute; inset: 27px 0; border-radius: 4px; background: #1f1f24; box-shadow: 0 3px 0 #0c0c0f, inset 0 1px 0 rgba(255, 255, 255, .12); }
.dpad i + i { inset: 0 27px; }
.ab { position: absolute; right: 22px; top: 300px; width: 112px; height: 80px; transform: rotate(-25deg); }
.ab button { position: absolute; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%; background: #9c1c5d; box-shadow: 0 4px 0 #5e0f37, inset 0 2px 2px rgba(255, 255, 255, .25); cursor: pointer; transition: transform .08s, box-shadow .08s; }
.ab button:active { transform: translateY(3px); box-shadow: 0 1px 0 #5e0f37; }
.ab button span { position: absolute; left: 50%; top: 50px; translate: -50% 0; font: 700 11px/1 system-ui, sans-serif; color: var(--ink); }
.ab .b { left: 0; top: 22px; }
.ab .a { right: 0; top: 22px; }
.pills { position: absolute; left: 92px; top: 410px; display: flex; gap: 14px; }
.pills span { display: flex; flex-direction: column; align-items: center; gap: 6px; font: 700 7px/1 system-ui, sans-serif; letter-spacing: .08em; color: var(--ink); transform: rotate(-25deg); }
.pills i { width: 36px; height: 9px; border-radius: 6px; background: #8d8c93; box-shadow: 0 2px 0 #66656c; }
.speaker { position: absolute; right: 26px; bottom: 30px; display: flex; gap: 7px; transform: rotate(-30deg); }
.speaker i { width: 6px; height: 46px; border-radius: 3px; background: #8f8e88; box-shadow: inset 0 2px 2px rgba(0, 0, 0, .35); }
@media (max-width: 520px) { .gb { --fit: .78; } .stage { padding: 0; margin: -40px 0; } }
@media (prefers-reduced-motion: reduce) { .led i { animation: none; } }
</style>

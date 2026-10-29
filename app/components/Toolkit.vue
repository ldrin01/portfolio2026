<script setup lang="ts">
import { toolkit } from '~/data/tools'

// Each logo is its outline drawn LAYERS times, each copy pushed further back: an extruded wireframe.
const LAYERS = 10

const root = ref<HTMLElement | null>(null)
const intro = ref<HTMLElement | null>(null)
const grid = ref<HTMLElement | null>(null)
const seen = ref(false)
const revealed = ref<number[]>([])

const words = toolkit.heading.split(' ')

// Every logo turns to "look at" a point: the mouse, or the middle of the screen on touch screens,
// so the logos also turn as they scroll past. Centers are measured once (and on resize).
interface Tile { el: HTMLElement; x: number; y: number; rx: number; ry: number }
let tiles: Tile[] = []
let pointer: { x: number; y: number } | null = null

function measure() {
  const sy = window.scrollY
  tiles = [...(grid.value?.querySelectorAll<HTMLElement>('.logo') ?? [])].map((el, i) => {
    const r = el.getBoundingClientRect()
    const old = tiles[i]
    return { el, x: r.left + r.width / 2, y: r.top + sy + r.height / 2, rx: old?.rx ?? 0, ry: old?.ry ?? 0 }
  })
}

const clamp = (v: number) => Math.min(1, Math.max(-1, v))
let raf = 0
function frame() {
  raf = 0
  const vw = window.innerWidth
  const vh = window.innerHeight
  const tx = pointer?.x ?? vw / 2
  const ty = pointer?.y ?? vh * 0.5
  let moving = false
  for (const t of tiles) {
    const dx = clamp((tx - t.x) / (vw * 0.5))
    const dy = clamp((ty - (t.y - window.scrollY)) / (vh * 0.6))
    const ry = dx * 28
    const rx = -dy * 24
    // ease toward the target with a little inertia, like the timeline's weight
    t.rx += (rx - t.rx) * 0.08
    t.ry += (ry - t.ry) * 0.08
    if (Math.abs(rx - t.rx) > 0.05 || Math.abs(ry - t.ry) > 0.05) moving = true
    t.el.style.setProperty('--rx', `${t.rx.toFixed(2)}deg`)
    t.el.style.setProperty('--ry', `${t.ry.toFixed(2)}deg`)
  }
  if (moving) raf = requestAnimationFrame(frame)
}
const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
const onPointer = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') return
  pointer = { x: e.clientX, y: e.clientY }
  kick()
}
const onLeave = () => { pointer = null; kick() }
const onResize = () => { measure(); kick() }

const observers: IntersectionObserver[] = []
let tracking = false
const track = (on: boolean) => {
  if (on === tracking) return
  tracking = on
  const m = on ? 'addEventListener' : 'removeEventListener'
  window[m]('scroll', kick, { passive: true })
  window[m]('pointermove', onPointer as EventListener, { passive: true })
  document.documentElement[m]('pointerleave', onLeave)
  if (on) { measure(); kick() }
}

onMounted(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    seen.value = true
    revealed.value = toolkit.tools.map((_, i) => i)
    return // logos keep the fixed three-quarter angle from the CSS
  }
  const heading = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { seen.value = true; heading.disconnect() } }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' })
  if (intro.value) heading.observe(intro.value)

  const items = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      revealed.value.push(Number((e.target as HTMLElement).dataset.i))
      items.unobserve(e.target)
    }
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' })
  grid.value?.querySelectorAll('.tool').forEach(t => items.observe(t))

  // only follow the pointer and scroll while the frame is near the screen
  const near = new IntersectionObserver(([e]) => track(!!e?.isIntersecting), { rootMargin: '200px 0px' })
  if (root.value) near.observe(root.value)
  observers.push(heading, items, near)

  window.addEventListener('resize', onResize)
  document.fonts?.ready.then(onResize)
})
onBeforeUnmount(() => {
  observers.forEach(o => o.disconnect())
  track(false)
  window.removeEventListener('resize', onResize)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <section id="toolkit" ref="root">
    <!-- each logo's outline is defined once; every layer reuses it -->
    <svg class="defs" aria-hidden="true">
      <defs>
        <path v-for="(t, i) in toolkit.tools" :id="`tk-${i}`" :key="t.name" :d="t.path" />
      </defs>
    </svg>

    <div class="wrap">
      <header ref="intro" class="intro">
        <p v-lag="0" class="eyebrow">Toolkit</p>
        <h2 v-lag="1" :class="{ seen }" :aria-label="toolkit.heading">
          <template v-for="(w, i) in words" :key="i">
            <span class="mask" aria-hidden="true"><span class="w" :style="{ '--i': i }">{{ w }}</span></span>{{ ' ' }}
          </template>
        </h2>
      </header>

      <ul ref="grid" class="grid">
        <li
          v-for="(t, i) in toolkit.tools"
          :key="t.name"
          v-lag="(i % 3) + 1"
          class="tool"
          :class="{ in: revealed.includes(i) }"
          :data-i="i"
          :style="{ '--c': t.color, '--d': `${(i % 3) * 0.08}s` }"
        >
          <div class="stage" aria-hidden="true">
            <div class="logo">
              <svg v-for="l in LAYERS" :key="l" class="layer" :style="{ '--l': l - 1 }" viewBox="0 0 24 24">
                <use :href="`#tk-${i}`" />
              </svg>
            </div>
          </div>
          <p class="name">{{ t.name }}</p>
          <p class="use">{{ t.use }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.intro { margin-bottom: clamp(40px, 7vw, 88px); }
h2 { font-size: clamp(34px, 5.5vw, 72px); letter-spacing: -.02em; font-weight: 500; }
.mask { display: inline-block; overflow-y: clip; padding-bottom: .14em; margin-bottom: -.14em; }
.w { display: inline-block; transform: translateY(110%); }
.seen .w { animation: rise .9s cubic-bezier(.16, .84, .3, 1) both; animation-delay: calc(var(--i) * 70ms); }
@keyframes rise { from { transform: translateY(110%); } to { transform: none; } }

.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(48px, 7vw, 96px) clamp(16px, 4vw, 48px); }
.tool { text-align: center; --size: clamp(64px, 9vw, 112px); }

/* the 3D logo: outlines stacked in depth, turned by --rx / --ry from the script */
.stage { width: var(--size); height: var(--size); margin: 0 auto 28px; perspective: 520px; }
.logo { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transform: rotateX(var(--rx, 14deg)) rotateY(var(--ry, -22deg)); transition: scale .5s cubic-bezier(.16, .84, .3, 1); }
.layer {
  position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;
  fill: none; stroke: var(--muted); stroke-width: .22; stroke-linejoin: round;
  transform: translateZ(calc(var(--l) * -2.2px));
  opacity: calc(.55 - var(--l) * .05); /* deeper copies fade out */
  transition: stroke .4s, opacity .4s, fill .4s;
}
.layer:first-child { stroke: var(--fg); stroke-width: .3; opacity: 1; }

/* hover (or keyboard focus within): the stack takes the brand color and the face glows */
.tool:hover .logo { scale: 1.08; }
.tool:hover .layer { stroke: var(--c); opacity: calc(.9 - var(--l) * .07); }
.tool:hover .layer:first-child { stroke: var(--fg); fill: color-mix(in srgb, var(--c) 22%, transparent); filter: drop-shadow(0 0 6px var(--c)); }
/* touch screens have no hover: show the brand color softly instead */
@media (hover: none) {
  .layer { stroke: var(--c); opacity: calc(.7 - var(--l) * .06); }
}

.name { margin: 0; font-size: clamp(16px, 1.6vw, 22px); font-weight: 500; letter-spacing: -.01em; line-height: 1.3; }
.use { margin: 6px 0 0; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); line-height: 1.5; }

/* each tile blurs in, a beat later along each row */
.tool > * { opacity: 0; filter: blur(12px); transform: translateY(18px); transition: opacity .9s ease var(--d), filter .9s ease var(--d), transform .9s cubic-bezier(.16, .84, .3, 1) var(--d); }
.tool.in > * { opacity: 1; filter: none; transform: none; }
.tool.in > .name { transition-delay: calc(var(--d) + .12s); }
.tool.in > .use { transition-delay: calc(var(--d) + .24s); }
.tool > .stage { filter: none; } /* blur would flatten the 3D stack */

@media (max-width: 600px) {
  .grid { gap: 40px 8px; }
  .tool { --size: 56px; }
  .stage { margin-bottom: 18px; }
  .use { font-size: 10px; letter-spacing: .1em; }
}
@media (prefers-reduced-motion: reduce) {
  .w { transform: none; animation: none !important; }
  .tool > * { opacity: 1; filter: none; transform: none; }
}
</style>

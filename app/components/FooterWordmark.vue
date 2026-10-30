<script setup lang="ts">
// The footer's wordmark, sunk into the bottom edge of the page. It is alive:
//  · hover: letters near the pointer rise out of the edge, thicken (the font is variable, 300–800) and brighten
//  · scroll: reaching the end of the page, the word surfaces letter by letter
//  · tilt: on phones, tilting sweeps a virtual pointer across the word
//  · tap / click: a ripple runs through the letters from where you touched
//  · idle: a slow breathing wave
// Each letter only gets three numbers per frame (--w weight, --y lift, --g glow); CSS does the rest per theme.
const props = defineProps<{ text: string }>()
const letters = computed(() => [...props.text])

const root = ref<HTMLElement | null>(null)
const spans = ref<HTMLElement[]>([])

interface L { cx: number; w: number; y: number; g: number }
let state: L[] = []
let raf = 0, last = 0, live = false, reduce = false
const pointer = { x: -1, on: false, strength: 0 } // x in px within the word; strength fades in and out
let surfaced = 0 // 0..1, from the scroll
const ripples: { x: number; t0: number }[] = []
let tiltX: number | null = null

function measure() {
  const r = root.value?.getBoundingClientRect()
  if (!r) return
  state = spans.value.map((el, i) => {
    const b = el.getBoundingClientRect()
    return { cx: b.left + b.width / 2 - r.left, w: state[i]?.w ?? 0, y: state[i]?.y ?? 0, g: state[i]?.g ?? 0 }
  })
}

function readScroll() {
  const r = root.value?.getBoundingClientRect()
  if (!r) return
  // 0 when the word's top is at the bottom of the screen, 1 when its bottom edge reaches it (the end of the page)
  surfaced = Math.min(1, Math.max(0, (innerHeight - r.top) / Math.max(1, r.height * 1.4)))
}

function frame(t: number) {
  raf = 0
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016
  last = t
  const el = root.value
  if (!el || !state.length) return
  const W = el.clientWidth || 1
  const R = W * 0.11 // reach of the pointer's influence

  // the virtual pointer: the mouse, else the phone's tilt; its strength eases in and out
  const px = pointer.on ? pointer.x : tiltX != null ? tiltX * W : -1
  const want = pointer.on || tiltX != null ? 1 : 0
  pointer.strength += (want - pointer.strength) * (1 - Math.exp(-dt * 5))

  const k = 1 - Math.exp(-dt * 9) // easing toward targets: smooth at any frame rate
  let moving = false
  const n = state.length
  for (let i = 0; i < n; i++) {
    const s = state[i]!
    // scroll: letters surface one after another, left to right
    const stag = Math.min(1, Math.max(0, surfaced * 1.6 - (i / n) * 0.6))
    const sink = (1 - stag) * 0.35 // em below its resting place
    // idle breathing: a slow travelling wave
    const breath = reduce ? 0 : (Math.sin(t / 900 - i * 0.7) * 0.5 + 0.5) * 0.18
    // pointer: a soft bell around the pointer
    const near = px >= 0 ? Math.exp(-(((s.cx - px) / R) ** 2)) * pointer.strength : 0
    // ripples: a crest running outward from each tap, fading over a second and a half
    let wave = 0
    for (const rp of ripples) {
      const age = (t - rp.t0) / 1000
      const front = age * W * 0.9
      wave += Math.exp(-(((Math.abs(s.cx - rp.x) - front) / (R * 0.6)) ** 2)) * Math.max(0, 1 - age / 1.5)
    }
    const wT = Math.min(1, 0.12 + breath * 0.6 + near * 0.88 + wave * 0.7)
    const yT = sink - near * 0.2 - wave * 0.14 - breath * 0.03 // negative lifts out of the edge
    const gT = Math.min(1, near + wave * 0.8 + breath * 0.25)
    s.w += (wT - s.w) * k; s.y += (yT - s.y) * k; s.g += (gT - s.g) * k
    const sp = spans.value[i]!
    sp.style.setProperty('--w', s.w.toFixed(3))
    sp.style.setProperty('--y', `${s.y.toFixed(4)}em`)
    sp.style.setProperty('--g', s.g.toFixed(3))
    if (Math.abs(wT - s.w) + Math.abs(yT - s.y) + Math.abs(gT - s.g) > 0.002) moving = true
  }
  for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i]!.t0 > 1600) ripples.splice(i, 1)
  // keep going while visible: the breathing never stops; reduced motion only animates what the user does
  if (live && (!reduce || moving || ripples.length)) raf = requestAnimationFrame(frame)
}
const kick = () => { if (!raf && live) raf = requestAnimationFrame(frame) }

// the pointer is tracked over the whole footer, so the letters react before you are on top of them
const onMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse' || !root.value) return
  pointer.x = e.clientX - root.value.getBoundingClientRect().left
  pointer.on = true
  kick()
}
const onLeave = () => { pointer.on = false; kick() }
const onDown = (e: PointerEvent) => {
  if (!root.value) return
  ripples.push({ x: e.clientX - root.value.getBoundingClientRect().left, t0: performance.now() })
  kick()
}
const onScroll = () => { readScroll(); kick() }
const onTilt = (e: DeviceOrientationEvent) => {
  if (e.gamma == null) return
  tiltX = Math.min(1, Math.max(0, 0.5 + e.gamma / 50)) // ±25° sweeps the whole word
  kick()
}

let io: IntersectionObserver | null = null, ro: ResizeObserver | null = null
let zone: HTMLElement | null = null
onMounted(async () => {
  reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  zone = root.value?.closest('footer') ?? root.value
  await document.fonts?.ready
  measure(); readScroll()
  ro = new ResizeObserver(() => { measure(); kick() })
  if (root.value) ro.observe(root.value)
  io = new IntersectionObserver(([e]) => {
    live = !!e?.isIntersecting
    const m = live ? 'addEventListener' : 'removeEventListener'
    zone?.[m]('pointermove', onMove as EventListener)
    zone?.[m]('pointerleave', onLeave)
    zone?.[m]('pointerdown', onDown as EventListener)
    window[m]('scroll', onScroll, { passive: true } as AddEventListenerOptions)
    if (matchMedia('(pointer: coarse)').matches) window[m]('deviceorientation', onTilt as EventListener)
    if (live) { last = 0; readScroll(); kick() }
  }, { rootMargin: '100px 0px' })
  if (root.value) io.observe(root.value)
})
onBeforeUnmount(() => {
  io?.disconnect(); ro?.disconnect(); cancelAnimationFrame(raf)
  zone?.removeEventListener('pointermove', onMove as EventListener)
  zone?.removeEventListener('pointerleave', onLeave)
  zone?.removeEventListener('pointerdown', onDown as EventListener)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('deviceorientation', onTilt as EventListener)
})
</script>

<template>
  <p ref="root" class="wordmark" aria-hidden="true">
    <span v-for="(c, i) in letters" :key="i" ref="spans" class="ch" :data-c="c"><span class="g">{{ c }}</span></span>
  </p>
</template>

<style scoped>
.wordmark {
  /* the box clips the sunken part (so it can't stretch the page), with headroom on top so rising letters are never cut:
     the padding adds room above, the negative margin keeps the word where it was */
  margin: calc(clamp(8px, 2vw, 24px) - 6vw) 0 0; padding-top: 6vw; height: calc(10.6vw + 6vw); overflow: hidden; text-align: center; white-space: nowrap; user-select: none;
  font-family: var(--display); font-size: 15.6vw; line-height: .78; /* sized so the word at full weight still fits the width */ letter-spacing: -.04em;
  cursor: default; -webkit-tap-highlight-color: transparent;
}
.ch {
  --w: .12; --y: .35em; --g: 0;
  display: inline-grid; will-change: transform;
  transform: translateY(var(--y));
}
/* each letter's slot is as wide as its boldest form (an invisible copy at 800), so thickening never pushes its neighbours */
.ch::after { content: attr(data-c); font-weight: 800; visibility: hidden; }
.g, .ch::after { grid-area: 1 / 1; justify-self: center; }
.g { font-weight: calc(300 + 500 * var(--w)); } /* Funnel Display is variable from 300 to 800 */
/* LIGHT: letterpress on paper. Faint, with an embossed edge; the letters near you darken like pressed ink */
[data-theme="light"] .ch {
  color: color-mix(in srgb, var(--fg) calc(6% + 22% * var(--g)), transparent);
  text-shadow: 0 .012em 0 rgba(255, 255, 255, calc(.5 + .3 * var(--g))), 0 -.006em 0 rgba(22, 22, 27, calc(.04 + .06 * var(--g)));
}
/* DARK: outlined in orange, filling with a glow where you are */
[data-theme="dark"] .ch {
  color: color-mix(in srgb, var(--accent) calc(var(--g) * 85%), transparent);
  -webkit-text-stroke: 1px color-mix(in srgb, var(--accent) calc(18% + 40% * var(--g)), transparent);
  text-shadow: 0 0 calc(var(--g) * .08em) color-mix(in srgb, var(--accent) calc(var(--g) * 70%), transparent);
}
@media (prefers-reduced-motion: reduce) { .ch { --y: 0em; } }
</style>

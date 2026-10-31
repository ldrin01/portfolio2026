<script setup lang="ts">
// A strip of pictures that keeps moving on its own. Each picture is small at the edges and grows as it reaches the
// middle. Drag (or swipe) to throw it; let go and it carries on with your push, then eases back into its own pace.
// It speeds up (and leans) when the page is scrolled, and slows to a stop under the mouse or keyboard focus.
// Click a picture to see it full screen.
// dir: which way it travels (left, right, up, down); tilt: the strip's angle; speed: pixels per second.
const props = withDefaults(defineProps<{ items: { image: string; caption: string }[]; dir?: 'left' | 'right' | 'up' | 'down'; tilt?: number; speed?: number }>(), { dir: 'left', tilt: -3, speed: 40 })
const asset = useAssetUrl()
const vertical = computed(() => props.dir === 'up' || props.dir === 'down')
const sign = computed(() => (props.dir === 'left' || props.dir === 'up' ? -1 : 1))
// enough copies to fill the strip twice over, so it can loop without a gap
const copies = computed(() => Math.max(3, Math.ceil(14 / Math.max(1, props.items.length))))
const list = computed(() => Array.from({ length: copies.value }, (_, c) => props.items.map((it, i) => ({ ...it, i, c, key: `${c}-${i}` }))).flat())
const root = ref<HTMLElement>()
const track = ref<HTMLElement>()
const open = ref<number | null>(null)
let moved = 0, stop = () => {}
onBeforeUnmount(() => stop())

onMounted(() => {
  const el = root.value!, tr = track.value!
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
  let pos = 0, vel = 0, hover = 1, lean = 0, push = 0, lastY = scrollY, raf = 0, t0 = 0
  let held: { at: number; pos: number; t: number; last: number; grab: boolean; id: number } | null = null
  let paused = false, focused = false
  // sizes are measured once (and again on resize), so a frame never has to read the layout
  let L = 1, size = 1, centers: number[] = []
  const kids = [...tr.children] as HTMLElement[]
  const measure = () => {
    const n = props.items.length, v = vertical.value
    const o = (k: HTMLElement) => (v ? k.offsetTop : k.offsetLeft), s = (k: HTMLElement) => (v ? k.offsetHeight : k.offsetWidth)
    const a = kids[0]
    if (!a) return
    centers = kids.map((k) => o(k) - o(a) + s(k) / 2)
    L = kids.length > n ? Math.max(1, o(kids[n]!) - o(a)) : 1
    size = v ? el.clientHeight : el.clientWidth
  }
  const axis = (e: PointerEvent) => (vertical.value ? e.clientY : e.clientX)

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(.05, (t - (t0 || t)) / 1000); t0 = t
    const calm = motion.matches
    // how fast the page is being scrolled right now (smoothed), which pushes the strip along
    const y = scrollY, sv = dt > 0 ? (y - lastY) / dt : 0; lastY = y
    push += ((calm ? 0 : clamp(sv * .3, -600, 600)) - push) * (1 - Math.exp(-dt * 6))
    hover += ((paused || focused ? 0 : 1) - hover) * (1 - Math.exp(-dt * 5)) // eases to a stop and back
    const cruise = calm ? 0 : sign.value * props.speed * hover
    if (!held) {
      vel += (cruise + sign.value * push - vel) * (1 - Math.exp(-dt * 1.8)) // your push fades back into its own pace
      pos += vel * dt
    }
    pos = ((pos % L) - L) % L // keep it inside one loop
    // lean into the motion, like the strip has weight
    lean += (clamp(calm ? 0 : (cruise - vel) * .012, -7, 7) - lean) * (1 - Math.exp(-dt * 8))
    tr.style.transform = vertical.value ? `translate3d(0,${pos.toFixed(2)}px,0) skewY(${(-lean).toFixed(2)}deg)` : `translate3d(${pos.toFixed(2)}px,0,0) skewX(${lean.toFixed(2)}deg)`
    // size by distance from the middle of the strip; half is wider than the screen, so pictures at the edges stay big and run off it
    const mid = size / 2, half = size * .75
    for (let i = 0; i < kids.length; i++) {
      const c = pos + centers[i]!
      if (c < -half * 1.2 || c > size + half * 1.2) continue // far off screen, leave it be
      const near = Math.max(0, 1 - Math.abs(c - mid) / half)
      const e = near * near * (3 - 2 * near), k = kids[i]!
      k.style.transform = `scale(${(.7 + .6 * e).toFixed(3)})`
      k.style.zIndex = String(Math.round((.7 + .6 * e) * 100))
    }
  }
  const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); t0 = 0; lastY = scrollY; if (e?.isIntersecting) raf = requestAnimationFrame(frame) })
  io.observe(el)
  const ro = new ResizeObserver(measure)
  ro.observe(el); ro.observe(tr)
  measure()

  const down = (e: PointerEvent) => {
    if (e.button > 0) return
    held = { at: axis(e), pos, t: performance.now(), last: axis(e), grab: false, id: e.pointerId }; moved = 0
  }
  const move = (e: PointerEvent) => {
    if (!held) return
    const a = axis(e), now = performance.now()
    moved = Math.max(moved, Math.abs(a - held.at))
    if (!held.grab && moved > 4) { held.grab = true; vel = 0; el.setPointerCapture(held.id); el.classList.add('grabbing') } // a click stays a click
    if (!held.grab) return
    pos = held.pos + (a - held.at)
    const inst = (a - held.last) / Math.max(.004, (now - held.t) / 1000)
    vel += (inst - vel) * .35; held.last = a; held.t = now // smoothed, so one jumpy event can't fling it
  }
  const up = () => {
    if (held?.grab && performance.now() - held.t > 90) vel = 0 // held still before letting go: no throw
    held = null; el.classList.remove('grabbing')
  }
  const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse') paused = true }
  const leave = () => { paused = false }
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
  el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave)
  el.addEventListener('focusin', () => { focused = true }); el.addEventListener('focusout', () => { focused = false })
  stop = () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf) }
})
const pick = (i: number) => { if (moved < 6) open.value = i }
// pictures fade in as they arrive
const shown = (e: Event) => (e.target as HTMLElement).classList.add('in')
const early = (img: unknown) => { const el = img as HTMLImageElement | null; if (el?.complete) el.classList.add('in') }
</script>

<template>
  <div ref="root" class="marquee" :class="{ vertical }" :style="{ '--tilt': `${tilt}deg`, '--t': tilt }">
    <div class="fade"><div class="tilt"><div ref="track" class="track">
      <button v-for="it in list" :key="it.key" type="button" class="item" :aria-label="it.caption" :aria-hidden="it.c > 0 || undefined" :tabindex="it.c > 0 ? -1 : undefined" @click="pick(it.i)">
        <span class="card">
          <img :ref="early" :src="asset(it.image)" :alt="it.c > 0 ? '' : it.caption" draggable="false" decoding="async" :loading="it.c === 0 ? 'eager' : 'lazy'" @load="shown">
        </span>
      </button>
    </div></div></div>
    <AboutLightbox v-model="open" :items="items" />
  </div>
</template>

<style scoped>
.marquee { position: relative; overflow-x: clip; padding: clamp(64px, 6vw, 90px) 0; width: 100vw; margin-left: calc(50% - 50vw); cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.marquee.grabbing { cursor: grabbing; }
.marquee.vertical { overflow: clip; height: min(88svh, 860px); padding: 0; touch-action: pan-x; }
/* soft edges: the strip melts into the page instead of being cut off */
/* the mask only clips to its own box, so the box is made taller than the strip: a tilted strip, the hover lift and the shadows are never cut */
.fade { padding: 180px 0; margin: -180px 0; pointer-events: none; -webkit-mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent); mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent); }
.item { pointer-events: auto; }
.vertical .fade { padding: 0; margin: 0; height: 100%; -webkit-mask-image: linear-gradient(180deg, transparent, #000 9%, #000 91%, transparent); mask-image: linear-gradient(180deg, transparent, #000 9%, #000 91%, transparent); }
.track { display: flex; align-items: center; gap: clamp(18px, 3vw, 40px); width: max-content; will-change: transform; transform-origin: 0 50%; }
/* the strip tilts about the middle of the screen; the shift keeps its left end (under the title) at the same height whatever the tilt */
.tilt { rotate: var(--tilt); translate: 0 calc(var(--t) * 10px); }
.vertical .tilt { rotate: none; translate: none; }
.vertical .track { rotate: none; flex-direction: column; width: auto; height: max-content; align-items: center; transform-origin: 50% 0; }
.vertical { display: flex; justify-content: center; }
.item { flex: none; padding: 0; border: 0; background: none; cursor: inherit; transform: scale(.7); will-change: transform; border-radius: 14px; }
.item:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; }
/* the card lifts on hover; the picture inside zooms a touch */
.card { display: block; border-radius: 14px; overflow: hidden; background: var(--surface); box-shadow: 0 0 0 1px var(--line), 0 18px 36px -18px rgba(0, 0, 0, .45), 0 4px 10px -6px rgba(0, 0, 0, .25); transition: transform .45s cubic-bezier(.2, .8, .2, 1), box-shadow .45s; }
.item img { display: block; height: clamp(150px, 21vw, 300px); width: auto; max-width: 70vw; pointer-events: none; opacity: 0; transform: scale(1.001); transition: opacity .6s ease, transform .7s cubic-bezier(.2, .8, .2, 1); }
.item img.in { opacity: 1; }
.vertical .item { rotate: var(--tilt); }
.vertical .item img { height: auto; width: clamp(180px, 24vw, 320px); }
@media (hover: hover) {
  .item:hover .card, .item:focus-visible .card { transform: translateY(-8px); box-shadow: 0 0 0 1px var(--line), 0 30px 50px -20px rgba(0, 0, 0, .55), 0 8px 16px -8px rgba(0, 0, 0, .3); }
  .item:hover img, .item:focus-visible img { transform: scale(1.06); }
}
[data-theme="dark"] .card { box-shadow: 0 0 0 1px var(--line); }
@media (hover: hover) { [data-theme="dark"] .item:hover .card { box-shadow: 0 0 0 1px var(--accent); } }
@media (prefers-reduced-motion: reduce) { .card, .item img { transition: none; } }
</style>

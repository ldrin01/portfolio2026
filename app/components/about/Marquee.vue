<script setup lang="ts">
// A strip of pictures that keeps moving on its own. Each picture is small at the edges and grows as it reaches the
// middle. Drag (or swipe) to move it yourself; let go and it carries on with your push, then eases back into its own
// pace. Click a picture to see it full screen.
// dir: which way it travels (left, right, up, down); tilt: the strip's angle; speed: pixels per second.
const props = withDefaults(defineProps<{ items: { image: string; caption: string }[]; dir?: 'left' | 'right' | 'up' | 'down'; tilt?: number; speed?: number }>(), { dir: 'left', tilt: -3, speed: 40 })
const asset = useAssetUrl()
const vertical = computed(() => props.dir === 'up' || props.dir === 'down')
const sign = computed(() => (props.dir === 'left' || props.dir === 'up' ? -1 : 1))
// enough copies to fill the strip twice over, so it can loop without a gap
const copies = computed(() => Math.max(3, Math.ceil(14 / Math.max(1, props.items.length))))
const list = computed(() => Array.from({ length: copies.value }, (_, c) => props.items.map((it, i) => ({ ...it, i, key: `${c}-${i}` }))).flat())
const root = ref<HTMLElement>()
const track = ref<HTMLElement>()
const open = ref<number | null>(null)
let moved = 0

onMounted(() => {
  const el = root.value!, tr = track.value!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let pos = 0, vel = 0, held: { at: number; pos: number; t: number; last: number } | null = null, raf = 0, t0 = 0
  const kids = () => [...tr.children] as HTMLElement[]
  const span = () => { const k = kids(), n = props.items.length; if (k.length <= n) return 1; const a = k[0]!, b = k[n]!; return vertical.value ? b.offsetTop - a.offsetTop : b.offsetLeft - a.offsetLeft }
  const axis = (e: PointerEvent) => (vertical.value ? e.clientY : e.clientX)

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(.05, (t - (t0 || t)) / 1000); t0 = t
    if (!held) {
      const cruise = reduced ? 0 : sign.value * props.speed
      vel += (cruise - vel) * (1 - Math.exp(-dt * 1.6)) // your push fades back into its own pace
      pos += vel * dt
    }
    const L = span()
    pos = ((pos % L) - L) % L // keep it inside one loop
    tr.style.transform = vertical.value ? `translateY(${pos}px)` : `translateX(${pos}px)`
    // size by distance from the middle of the strip
    const box = el.getBoundingClientRect(), mid = vertical.value ? box.top + box.height / 2 : box.left + box.width / 2, half = (vertical.value ? box.height : box.width) * .75 // wider than the screen, so pictures at the edges stay big and run off it
    for (const k of kids()) {
      const r = k.getBoundingClientRect(), c = vertical.value ? r.top + r.height / 2 : r.left + r.width / 2
      const near = Math.max(0, 1 - Math.abs(c - mid) / half)
      const s = .7 + .6 * near * near * (3 - 2 * near)
      k.style.setProperty('--s', s.toFixed(3)); k.style.zIndex = String(Math.round(s * 100))
    }
  }
  const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); t0 = 0; if (e?.isIntersecting) raf = requestAnimationFrame(frame) })
  io.observe(el)

  const down = (e: PointerEvent) => { held = { at: axis(e), pos, t: performance.now(), last: axis(e) }; moved = 0; vel = 0; el.setPointerCapture(e.pointerId) }
  const move = (e: PointerEvent) => {
    if (!held) return
    const a = axis(e), now = performance.now()
    pos = held.pos + (a - held.at); moved = Math.max(moved, Math.abs(a - held.at))
    vel = (a - held.last) / Math.max(.001, (now - held.t) / 1000) * .6; held.last = a; held.t = now
  }
  const up = () => { held = null }
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
  onBeforeUnmount(() => { io.disconnect(); cancelAnimationFrame(raf) })
})
const pick = (i: number) => { if (moved < 6) open.value = i }
</script>

<template>
  <div ref="root" class="marquee" :class="{ vertical }" :style="{ '--tilt': `${tilt}deg`, '--t': tilt }">
    <div class="tilt"><div ref="track" class="track">
      <button v-for="it in list" :key="it.key" type="button" class="item" :aria-label="it.caption" @click="pick(it.i)">
        <img :src="asset(it.image)" :alt="it.caption" draggable="false" loading="lazy">
      </button>
    </div></div>
    <AboutLightbox v-model="open" :items="items" />
  </div>
</template>

<style scoped>
.marquee { position: relative; overflow-x: clip; padding: clamp(64px, 6vw, 90px) 0; width: 100vw; margin-left: calc(50% - 50vw); cursor: grab; touch-action: pan-y; user-select: none; }
.marquee:active { cursor: grabbing; }
.marquee.vertical { overflow: clip; height: min(88svh, 860px); padding: 0; touch-action: pan-x; }
.track { display: flex; align-items: center; gap: clamp(18px, 3vw, 40px); width: max-content; will-change: transform; }
/* the strip tilts about the middle of the screen; the shift keeps its left end (under the title) at the same height whatever the tilt */
.tilt { rotate: var(--tilt); translate: 0 calc(var(--t) * 10px); }
.vertical .tilt { rotate: none; translate: none; }
.vertical .track { rotate: none; flex-direction: column; width: auto; height: max-content; align-items: center; }
.vertical { display: flex; justify-content: center; }
.item { --s: .6; flex: none; padding: 0; border: 0; background: none; cursor: inherit; transform: scale(var(--s)); transition: transform .12s linear; }
.item img { display: block; height: clamp(150px, 21vw, 300px); width: auto; max-width: 70vw; border-radius: 4px; box-shadow: 0 20px 40px -18px rgba(0, 0, 0, .45); pointer-events: none; }
.vertical .item { rotate: var(--tilt); }
.vertical .item img { height: auto; width: clamp(180px, 24vw, 320px); }
[data-theme="dark"] .item img { box-shadow: none; }
</style>

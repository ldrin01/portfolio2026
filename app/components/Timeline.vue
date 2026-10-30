<script setup lang="ts">
const { journey } = useSite()

const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const intro = ref<HTMLElement | null>(null)
const seen = ref(false) // heading has been revealed
const live = ref(false) // section is near the screen: the line glows and scroll is tracked
const started = ref(false) // the line has reached the first point: only then does the glowing dot exist
const activeCount = ref(0)
const revealed = ref<number[]>([])

const words = journey.heading.split(' ')

// Geometry is measured once (and on resize), so a scroll tick does no layout reads.
interface Geo { top: number; height: number; start: number; span: number; items: { el: HTMLElement; center: number; dot: number; target: number; cur: number }[] }
let geo: Geo | null = null

function measure() {
  const el = list.value
  if (!el) return
  const sy = window.scrollY
  const r = el.getBoundingClientRect()
  geo = {
    top: r.top + sy,
    height: r.height,
    start: 0,
    span: 1,
    items: [...el.querySelectorAll<HTMLElement>('.item')].map(item => {
      const ir = item.getBoundingClientRect()
      const dr = item.querySelector('.dot')!.getBoundingClientRect()
      return { el: item, center: ir.top + sy + ir.height / 2, dot: dr.top + sy + dr.height / 2, target: 0, cur: 0 }
    })
  }
  // the line runs only from the first point to the last point, never beyond them
  const first = geo.items[0]?.dot ?? geo.top
  const last = geo.items[geo.items.length - 1]?.dot ?? geo.top + geo.height
  geo.start = first
  geo.span = Math.max(1, last - first)
  track.value?.style.setProperty('--t', `${first - geo.top}px`)
  track.value?.style.setProperty('--h', `${geo.span}px`)
}

let raf = 0
function update() {
  raf = 0
  if (!geo) return
  const vh = window.innerHeight
  const mid = window.scrollY + vh * 0.55
  const raw = (mid - geo.start) / geo.span
  const p = Math.min(1, Math.max(0, raw))
  const has = raw > 0.002
  if (has !== started.value) started.value = has
  track.value?.style.setProperty('--p', p.toFixed(4)) // only the line reads this: transforms, no layout

  let n = 0
  for (const it of geo.items) {
    if (it.dot < mid) n++
    // the role thickens near the focus line; the value it eases toward (smooth() below does the easing)
    it.target = Math.max(0, 1 - Math.abs(it.center - mid) / (vh * 0.5))
  }
  if (n !== activeCount.value) activeCount.value = n
  if (!sraf) sraf = requestAnimationFrame(smooth)
}

// Weight follows its target with a little inertia every frame, so it glides instead of stepping.
let sraf = 0
function smooth() {
  sraf = 0
  if (!geo) return
  let moving = false
  for (const it of geo.items) {
    const d = it.target - it.cur
    if (Math.abs(d) > 0.002) {
      it.cur += d * 0.1
      it.el.style.setProperty('--k', it.cur.toFixed(3))
      moving = true
    } else if (it.cur !== it.target) {
      it.cur = it.target
      it.el.style.setProperty('--k', String(it.cur))
    }
  }
  if (moving) sraf = requestAnimationFrame(smooth)
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
const onResize = () => { measure(); onScroll() }

const observers: IntersectionObserver[] = []
let ro: ResizeObserver | undefined
let tracking = false
const track_ = (on: boolean) => {
  if (on === tracking) return
  tracking = on
  if (on) { measure(); update(); window.addEventListener('scroll', onScroll, { passive: true }) }
  else window.removeEventListener('scroll', onScroll)
}

onMounted(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    seen.value = true
    revealed.value = journey.entries.map((_, i) => i)
  } else {
    // observe the heading itself: a share of the whole (tall) section can never be visible on a short phone screen
    const heading = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { seen.value = true; heading.disconnect() } }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' })
    if (intro.value) heading.observe(intro.value)

    const items = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        revealed.value.push(Number((e.target as HTMLElement).dataset.i))
        items.unobserve(e.target)
      }
    }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' })
    list.value?.querySelectorAll('.item').forEach(i => items.observe(i))
    observers.push(heading, items)
  }

  // only track scroll (and glow) while the section is near the screen
  const near = new IntersectionObserver(([e]) => { live.value = !!e?.isIntersecting; track_(live.value) }, { rootMargin: '200px 0px' })
  if (root.value) near.observe(root.value)
  observers.push(near)

  window.addEventListener('resize', onResize)
  if (list.value && 'ResizeObserver' in window) { ro = new ResizeObserver(onResize); ro.observe(list.value) }
  document.fonts?.ready.then(onResize)
})
onBeforeUnmount(() => {
  observers.forEach(o => o.disconnect())
  ro?.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  if (raf) cancelAnimationFrame(raf)
  if (sraf) cancelAnimationFrame(sraf)
})
</script>

<template>
  <section id="journey" ref="root">
    <div class="wrap">
      <header ref="intro" v-lag="0" class="intro">
        <h2 :class="{ seen }" :aria-label="journey.heading">
          <template v-for="(w, i) in words" :key="i">
            <span class="mask" aria-hidden="true"><span class="w" :style="{ '--i': i }">{{ w }}</span></span>{{ ' ' }}
          </template>
        </h2>
      </header>

      <ol ref="list" class="list" :class="{ live, started }">
        <li ref="track" class="track" aria-hidden="true">
          <span class="glow-wrap"><span class="glow-rail"><span class="glow" /></span></span>
          <span class="fill" />
          <span class="rail"><span class="spark" /></span>
        </li>
        <li
          v-for="(e, i) in journey.entries"
          :key="e.org"
          class="item"
          :class="[i % 2 ? 'right' : 'left', { in: revealed.includes(i), on: i < activeCount }]"
          :data-i="i"
        >
          <span class="dot" aria-hidden="true" />
          <div class="card">
            <p v-lag="0" class="period"><span class="num">{{ String(i + 1).padStart(2, '0') }}</span> {{ e.period }}</p>
            <h3 v-lag="1">{{ e.role }}</h3>
            <p v-lag="2" class="org">{{ e.org }}</p>
            <p v-lag="3" class="blurb">{{ e.blurb }}</p>
            <ul v-lag="4" class="tags">
              <li v-for="t in e.tags" :key="t">{{ t }}</li>
            </ul>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.intro { margin-bottom: clamp(32px, 6vw, 72px); }
h2 { font-size: clamp(34px, 5.5vw, 72px); letter-spacing: -.02em; font-weight: 500; }
.mask { display: inline-block; overflow-y: clip; padding-bottom: .14em; margin-bottom: -.14em; }
.w { display: inline-block; transform: translateY(110%); }
.seen .w { animation: rise .9s cubic-bezier(.16, .84, .3, 1) both; animation-delay: calc(var(--i) * 70ms); }
@keyframes rise { from { transform: translateY(110%); } to { transform: none; } }

.list { list-style: none; margin: 0; padding: 0; position: relative; display: grid; gap: clamp(24px, 8vh, 80px); }

/* the center line */
.track { position: absolute; left: 50%; top: var(--t, 0px); height: var(--h, 0px); width: 2px; margin-left: -1px; background: var(--line); }
/* the line, glow and spark only use transform/opacity, so scrolling never repaints them */
.fill { position: absolute; inset: 0; background: var(--accent); border-radius: 2px; transform-origin: top; transform: scaleY(var(--p, 0)); }
.glow-wrap { /* glow along the line: a soft side falloff that rides up with the dot and fades out into it */
  position: absolute; inset: 0 -14px; overflow: hidden; opacity: 0; transition: opacity .8s ease;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 48px); mask-image: linear-gradient(to bottom, transparent, #000 48px);
}
.glow-rail { position: absolute; left: 0; right: 0; top: 0; height: 100%; transform: translateY(calc(var(--p, 0) * 100%)); }
.glow { position: absolute; left: 0; right: 0; bottom: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 55%, transparent) 50%, transparent);
  -webkit-mask-image: linear-gradient(to top, transparent, #000 70px); mask-image: linear-gradient(to top, transparent, #000 70px); }
.live.started .glow-wrap { opacity: 1; }
/* zero-height rail moved by the measured track height: a tall translated box would stretch the page's scroll height */
.rail { position: absolute; left: 0; right: 0; top: 0; height: 0; transform: translateY(calc(var(--p, 0) * var(--h, 0px))); }
.spark { /* bright head at the leading edge of the line */
  position: absolute; left: 50%; top: 0; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%;
  background: var(--fg); opacity: 0; transition: opacity .8s ease;
  box-shadow: 0 0 12px 4px var(--accent), 0 0 36px 14px color-mix(in srgb, var(--accent) 50%, transparent), 0 0 70px 24px color-mix(in srgb, var(--accent) 22%, transparent);
}
.live.started .spark { opacity: 1; }

/* alternating entries */
.item { position: relative; display: grid; grid-template-columns: 1fr 1fr; min-height: 38vh; align-items: center; --k: 0; }
.left .card { grid-column: 1; text-align: right; padding-right: clamp(32px, 5vw, 72px); }
.left .tags { justify-content: flex-end; }
.right .card { grid-column: 2; padding-left: clamp(32px, 5vw, 72px); }
.left .blurb { margin-left: auto; }

/* each line blurs in on its own, one after another */
.card > * { opacity: 0; filter: blur(12px); transform: translateY(18px); transition: opacity .9s ease, filter .9s ease, transform .9s cubic-bezier(.16, .84, .3, 1); }
.item.in .card > * { opacity: 1; filter: none; transform: none; }
.item.in .card > :nth-child(2) { transition-delay: .15s; }
.item.in .card > :nth-child(3) { transition-delay: .3s; }
.item.in .card > :nth-child(4) { transition-delay: .45s; }
.item.in .card > :nth-child(5) { transition-delay: .6s; }

.dot { position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; border: 1.5px solid var(--muted); background: var(--bg); z-index: 1; transition: background .3s, border-color .3s, box-shadow .5s; }
.item.on .dot { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 12px 3px color-mix(in srgb, var(--accent) 60%, transparent); }

.period { margin: 0 0 8px; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.num { color: var(--accent); margin-right: 8px; }
h3 { font-size: clamp(30px, 4vw, 54px); font-weight: calc(300 + 500 * var(--k)); letter-spacing: -.02em; }
.org { margin: 4px 0 12px; color: var(--muted); }
.blurb { margin: 0; max-width: 40ch; }
.tags { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
.tags li { border: 1px solid var(--line); border-radius: 8px; padding: 2px 14px; font-size: 13px; background: var(--surface); }

@media (max-width: 800px) {
  .list { gap: 56px; }
  .item { min-height: 0; }
  .track { left: 8px; }
  .item { grid-template-columns: 1fr; }
  .left .card, .right .card { grid-column: 1; text-align: left; padding: 0 0 0 40px; }
  .left .tags { justify-content: flex-start; }
  .left .blurb { margin-left: 0; }
  .dot { left: 8px; }
  /* phones: a bolder title is a wider title, and in one narrow column it re-wraps mid-scroll, shifting everything below
     (the line and dots then drift off). Keep the weight fixed and show focus with opacity, which never moves layout. */
  h3 { font-weight: 500; opacity: calc(.45 + .55 * var(--k)); }
}
@media (prefers-reduced-motion: reduce) {
  .w { transform: none; animation: none !important; }
  .card > * { opacity: 1; filter: none; transform: none; transition: none; }
}
</style>

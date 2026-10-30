<script setup lang="ts">
// Where I am, drawn from real boundaries (PSA, via scripts/build-qc-map.mjs) instead of a map library. One SVG holds the
// country, Metro Manila and Quezon City's barangays in a shared coordinate space; a camera moves (the viewBox)
// from the whole Philippines in to Quezon City, which ends up highlighted in the middle of the frame.
import map from '~/data/qc-map.json'

const frame = ref<HTMLElement>()
const svg = ref<SVGSVGElement>()
const stage = ref(0)

const stages = ['Philippines', 'Luzon', 'Metro Manila', 'Quezon City']
const { ph, qc } = map.boxes as Record<string, number[]>
const START_H = ph[3]! * 1.06, END_H = qc[3]! / .8 // visible height: the whole country, to Quezon City filling 80% of the frame
const from = [ph[0]! + ph[2]! / 2, ph[1]! + ph[3]! / 2], to = [qc[0]! + qc[2]! / 2, qc[1]! + qc[3]! / 2]
const viewBox = `${from[0]! - START_H * .8} ${from[1]! - START_H / 2} ${START_H * 1.6} ${START_H}`

// zoom is smooth in log space, and Quezon City's offset from the middle of the frame shrinks evenly as we go in
const camera = (p: number, aspect: number) => {
  const h = START_H * Math.pow(END_H / START_H, p), left = h / START_H * (1 - p)
  const cx = to[0]! - (to[0]! - from[0]!) * left, cy = to[1]! - (to[1]! - from[1]!) * left
  return { h, x: cx - h * aspect / 2, y: cy - h / 2 }
}
const ease = (t: number) => t * t * (3 - 2 * t)

onMounted(() => {
  const el = frame.value!, s = svg.value!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let aspect = 1.6, p = reduced ? 1 : 0, raf = 0, last = -1
  const measure = () => { aspect = el.clientWidth / el.clientHeight || 1.6 }
  const ro = new ResizeObserver(() => { measure(); draw() }); ro.observe(el)
  const draw = () => {
    const c = camera(ease(p), aspect)
    s.setAttribute('viewBox', `${c.x.toFixed(1)} ${c.y.toFixed(1)} ${(c.h * aspect).toFixed(1)} ${c.h.toFixed(1)}`)
    // what is drawn depends on how far in we are (c.h is the visible height in view units)
    s.style.setProperty('--regions', String(Math.max(0, Math.min(1, (c.h - 1800) / 3000))))
    s.style.setProperty('--ncr', String(Math.max(0, Math.min(1, (9000 - c.h) / 3000))))
    s.style.setProperty('--brgy', String(Math.max(0, Math.min(1, (900 - c.h) / 500))))
    const f = Math.log(START_H / c.h) / Math.log(START_H / END_H)
    const now = f < .12 ? 0 : f < .45 ? 1 : f < .8 ? 2 : 3
    if (now !== last) { last = now; stage.value = now }
  }
  // once the frame is in view, zoom in on its own, easing in and out, and stay there
  const run = () => {
    const t0 = performance.now(), DURATION = 4200
    const tick = (t: number) => {
      p = Math.min(1, (t - t0) / DURATION); draw()
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  measure(); draw()
  const io = new IntersectionObserver(([e]) => { if (e!.isIntersecting) { io.disconnect(); setTimeout(run, 500) } }, { threshold: .6 })
  if (!reduced) io.observe(el)
  onBeforeUnmount(() => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf) })
})
</script>

<template>
  <div>
    <figure ref="frame" class="frame" role="img" aria-label="A map zooming from the Philippines to Metro Manila and Quezon City, highlighted">
      <svg ref="svg" :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="regions"><path v-for="r in map.regions" :key="r.name" :d="r.d" /></g>
        <g class="ncr"><path v-for="c in map.cities.filter(c => !c.qc)" :key="c.name" :d="c.d" /></g>
        <path class="qc" :d="map.qc" />
        <g class="brgy"><path v-for="b in map.barangays" :key="b.name" :d="b.d" /></g>
        <path class="qc-edge" :d="map.qc" />
      </svg>
      <figcaption class="where" aria-hidden="true">
        <ol><li v-for="(n, i) in stages" :key="n" :class="{ on: i === stage, past: i < stage }">{{ n }}</li></ol>
        <span class="coords">14.65° N, 121.05° E</span>
      </figcaption>
      <p class="credit">Boundaries: PSA, via faeldon/philippines-json-maps</p>
    </figure>
  </div>
</template>

<style scoped>
.frame {
  position: relative; margin: 56px 0 0; width: 100%; height: min(42svh, 400px); overflow: hidden;
  border: 1px solid var(--line); border-radius: 18px; background: color-mix(in srgb, var(--fg) 4%, var(--bg));
}
svg { display: block; width: 100%; height: 100%; }
path { vector-effect: non-scaling-stroke; stroke-linejoin: round; }

/* the country and the neighbours stay quiet; only Quezon City is lit */
.regions path { fill: color-mix(in srgb, var(--fg) 9%, transparent); stroke: var(--line); stroke-width: 1; }
.regions { opacity: var(--regions, 1); }
.ncr path { fill: color-mix(in srgb, var(--fg) 7%, transparent); stroke: color-mix(in srgb, var(--fg) 30%, transparent); stroke-width: 1; }
.ncr { opacity: var(--ncr, 0); }
.qc { fill: color-mix(in srgb, var(--accent) 38%, transparent); stroke: none; }
.brgy { opacity: var(--brgy, 0); }
.brgy path { fill: none; stroke: color-mix(in srgb, var(--accent) 70%, transparent); stroke-width: .6; }
.qc-edge { fill: none; stroke: var(--accent); stroke-width: 1.8; }


.where { position: absolute; left: 20px; right: 20px; bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; pointer-events: none; }
.where ol { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.where li { opacity: .45; transition: opacity .3s, color .3s; }
.where li.past { opacity: .7; }
.where li.on { opacity: 1; color: var(--accent); }
.where li:not(:last-child)::after { content: '/'; margin-left: 14px; opacity: .5; }
.coords { font-size: 12px; letter-spacing: .08em; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.credit { position: absolute; right: 20px; top: 14px; margin: 0; font-size: 10px; letter-spacing: .06em; color: var(--muted); opacity: .6; }

@media (max-width: 700px) {
  .frame { margin-top: 40px; height: min(46svh, 360px); border-radius: 14px; }
  .where { left: 14px; right: 14px; bottom: 12px; flex-direction: column; align-items: flex-start; gap: 6px; }
  .where ol { font-size: 10px; gap: 2px 10px; }
  .credit { display: none; }
}
@media (prefers-reduced-motion: reduce) {
}
</style>

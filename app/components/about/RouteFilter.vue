<script setup lang="ts">
// The route wall's filter panel: quick chips, then one two-knob range for every figure the routes have (distance, pace, time,
// elevation, heart rate, calories, and any other figure a screenshot showed), a live summary, Surprise me and Reset. The wall
// behind it reacts as you drag, so this is a small popover (a bottom sheet on phones), not a screen-filling modal.
// A figure only gets a slider when at least 3 routes have it and they differ. A narrowed range hides routes without that figure.
import { METRIC_ORDER, metricInfo, routeMetrics, visibleMetrics, type RouteLike } from '~/utils/routeStats'
type Ranges = Record<string, [number, number]>
const props = defineProps<{ routes: (RouteLike & { kind: string })[]; kind: 'all' | 'run' | 'ride'; count: number; km: number; avg: string }>()
const ranges = defineModel<Ranges>({ required: true })
const emit = defineEmits<{ close: []; surprise: [] }>()

const all = computed(() => props.routes.map(routeMetrics))
const pool = computed(() => all.value.filter((_, i) => props.kind === 'all' || props.routes[i]!.kind === props.kind)) // for the bars
const nice = (n: number, step: number, up: boolean) => Number(((up ? Math.ceil : Math.floor)(n / step + 1e-9) * step).toFixed(2))

// one slider per figure that suits what is shown (see visibleMetrics), its scale taken from the routes of that kind
const sliders = computed(() => {
  const inPool = (i: number) => props.kind === 'all' || props.routes[i]!.kind === props.kind
  return visibleMetrics(props.routes, props.kind).map((key) => {
    const vals = all.value.filter((_, i) => inPool(i)).map(m => m[key]).filter((v): v is number => v !== undefined)
    const info = metricInfo(key, props.routes)
    const min = key === 'distance' ? 0 : nice(Math.min(...vals), info.step, false), max = nice(Math.max(...vals), info.step, true)
    const bins = Array.from({ length: 24 }, () => 0)
    for (const v of vals) bins[Math.min(23, Math.floor(((v - min) / (max - min || 1)) * 24))]!++
    return { info, min, max, bins, vals: vals.sort((a, b) => a - b) }
  }).sort((a, b) => (METRIC_ORDER.indexOf(a.info.key) + 1 || 99) - (METRIC_ORDER.indexOf(b.info.key) + 1 || 99) || a.info.label.localeCompare(b.info.label))
})
const by = (key: string) => sliders.value.find(s => s.info.key === key)

function set(key: string, v: [number, number]) {
  const s = by(key)!
  const next = { ...ranges.value }
  if (v[0] <= s.min && v[1] >= s.max) delete next[key]; else next[key] = v // back at the full range = not filtering
  ranges.value = next
}

// chips are set from the data, so "Quick ones" is your fastest third whatever your pace is
const q = (key: string, p: number) => { const v = by(key)?.vals; return v ? v[Math.floor(p * (v.length - 1))]! : 0 }
const chips = computed(() => {
  const list: { label: string; r: Ranges }[] = []
  const lo = (key: string, p: number): [number, number] => [nice(q(key, p), by(key)!.info.step, false), by(key)!.max]
  const hi = (key: string, p: number): [number, number] => [by(key)!.min, nice(q(key, p), by(key)!.info.step, true)]
  if (by('distance')) list.push({ label: '5K club', r: { distance: [4.8, 5.3] } })
  if (by('pace')) list.push({ label: 'Quick ones', r: { pace: hi('pace', 0.34) } }, { label: 'Easy does it', r: { pace: lo('pace', 0.66) } })
  if (by('speed')) list.push({ label: 'Speed demons', r: { speed: lo('speed', 0.66) } }, { label: 'Cruisers', r: { speed: hi('speed', 0.34) } })
  if (by('distance')) list.push({ label: 'Long hauls', r: { distance: lo('distance', 0.66) } })
  if (by('elev')) list.push({ label: 'Hill days', r: { elev: lo('elev', 0.66) } })
  if (by('hr')) list.push({ label: 'Heart pounding', r: { hr: lo('hr', 0.66) } })
  if (by('power')) list.push({ label: 'Big watts', r: { power: lo('power', 0.66) } })
  // a chip is only offered when it would leave at least 2 routes
  const left = (c: { r: Ranges }) => pool.value.filter(m => Object.entries(c.r).every(([k, [a, b]]) => m[k] !== undefined && m[k]! >= a - 1e-9 && m[k]! <= b + 1e-9)).length
  return list.filter(c => left(c) >= 2)
})
const isOn = (c: { r: Ranges }) => {
  const a = Object.keys(c.r), b = Object.keys(ranges.value)
  return a.length === b.length && a.every(k => ranges.value[k] && Math.abs(ranges.value[k]![0] - c.r[k]![0]) < 1e-6 && Math.abs(ranges.value[k]![1] - c.r[k]![1]) < 1e-6)
}
const apply = (c: { r: Ranges }) => { ranges.value = isOn(c) ? {} : c.r }
const narrowed = computed(() => Object.keys(ranges.value).length > 0)
</script>

<template>
  <div class="panel" role="dialog" aria-label="Filter routes" data-lenis-prevent @keydown.esc.stop="emit('close')">
    <div class="top">
      <strong>Filter</strong>
      <button type="button" class="x" aria-label="Close" @click="emit('close')">✕</button>
    </div>
    <div v-if="chips.length" class="chips">
      <button v-for="c in chips" :key="c.label" type="button" :class="{ on: isOn(c) }" :aria-pressed="isOn(c)" @click="apply(c)">{{ c.label }}</button>
    </div>
    <AboutRouteRange
      v-for="s in sliders" :key="s.info.key" :model-value="ranges[s.info.key] ?? [s.min, s.max]" :min="s.min" :max="s.max" :step="s.info.step"
      :label="s.info.label" :bins="s.bins" :fmt="s.info.fmt" @update:model-value="v => set(s.info.key, v)"
    />
    <div class="foot">
      <span class="sum"><b>{{ count }}</b> routes · <b>{{ Math.round(km).toLocaleString() }}</b> km<template v-if="avg"> · <b>{{ avg }}</b> avg</template></span>
      <div class="acts">
        <button type="button" class="ghost" :disabled="!count" @click="emit('surprise')">Surprise me</button>
        <button type="button" class="ghost" :disabled="!narrowed" @click="ranges = {}">Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel { position: absolute; left: 0; top: calc(100% + 10px); z-index: 30; display: grid; gap: 14px; width: min(380px, 92vw); max-height: min(72vh, 620px); overflow: auto; padding: 16px; text-align: left; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 24px 60px rgb(0 0 0 / .28); overscroll-behavior: contain; }
.top { display: flex; justify-content: space-between; align-items: center; }
.x { width: 28px; height: 28px; border: 0; border-radius: 50%; background: none; color: var(--muted); font: inherit; cursor: pointer; }
.x:hover { color: var(--fg); background: var(--line); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button, .ghost { font: inherit; font-size: 13px; padding: 6px 12px; color: var(--fg); background: none; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; transition: background-color .2s, color .2s, border-color .2s; }
.chips button:hover, .ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.chips button.on { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.ghost:disabled { opacity: .4; cursor: default; }
.foot { display: grid; gap: 10px; padding-top: 12px; border-top: 1px solid var(--line); }
.sum { font-size: 13px; color: var(--muted); } .sum b { color: var(--fg); font-weight: 600; }
.acts { display: flex; gap: 8px; }
@media (max-width: 900px) {
  /* a bottom sheet on phones, short enough that the wall stays visible above it */
  .panel { position: fixed; inset: auto 0 0 0; width: auto; max-height: 54vh; border-radius: 20px 20px 0 0; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
}
</style>

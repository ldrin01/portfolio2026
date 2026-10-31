<script setup lang="ts">
// A two-knob range with a small histogram behind it (how many routes sit at each value). Two real range inputs are stacked, so the
// keyboard and touch work as usual; the bars outside the chosen range dim. The value is [low, high].
const props = defineProps<{ min: number; max: number; step: number; label: string; bins: number[]; fmt: (n: number) => string }>()
const model = defineModel<[number, number]>({ required: true })
const lo = computed(() => model.value[0]), hi = computed(() => model.value[1])
const span = computed(() => Math.max(props.max - props.min, props.step))
const pct = (n: number) => ((n - props.min) / span.value) * 100
const top = computed(() => Math.max(1, ...props.bins))
const binIn = (i: number) => {
  const a = props.min + (i / props.bins.length) * span.value, b = props.min + ((i + 1) / props.bins.length) * span.value
  return b > lo.value && a < hi.value
}
const setLo = (e: Event) => { model.value = [Math.min(Number((e.target as HTMLInputElement).value), hi.value), hi.value] }
const setHi = (e: Event) => { model.value = [lo.value, Math.max(Number((e.target as HTMLInputElement).value), lo.value)] }
</script>

<template>
  <div class="range">
    <div class="head"><span>{{ label }}</span><b>{{ fmt(lo) }} – {{ fmt(hi) }}</b></div>
    <div class="body">
      <div class="hist" aria-hidden="true"><i v-for="(n, i) in bins" :key="i" :class="{ in: binIn(i) }" :style="{ height: `${Math.max(n ? 12 : 0, (n / top) * 100)}%` }" /></div>
      <div class="track" aria-hidden="true"><i :style="{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }" /></div>
      <!-- when the knobs meet near the end, the low knob goes on top so it can still be pulled back -->
      <input type="range" :min="min" :max="max" :step="step" :value="lo" :aria-label="`Lowest ${label.toLowerCase()}`" :style="{ zIndex: lo > min + span * 0.9 ? 3 : 1 }" @input="setLo">
      <input type="range" :min="min" :max="max" :step="step" :value="hi" :aria-label="`Highest ${label.toLowerCase()}`" :style="{ zIndex: 2 }" @input="setHi">
    </div>
  </div>
</template>

<style scoped>
.range { display: grid; gap: 6px; }
.head { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; color: var(--muted); }
.head b { color: var(--fg); font-weight: 600; font-size: 14px; font-variant-numeric: tabular-nums; }
.body { position: relative; height: 54px; }
.hist { position: absolute; inset: 0 0 18px; display: flex; align-items: flex-end; gap: 2px; }
.hist i { flex: 1; border-radius: 2px 2px 0 0; background: var(--line); transition: background-color .2s; }
.hist i.in { background: color-mix(in srgb, var(--accent) 55%, transparent); }
.track { position: absolute; left: 0; right: 0; bottom: 7px; height: 4px; border-radius: 4px; background: var(--line); }
.track i { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: var(--accent); }
input { position: absolute; left: 0; bottom: 0; width: 100%; height: 18px; margin: 0; background: none; appearance: none; -webkit-appearance: none; pointer-events: none; }
input::-webkit-slider-runnable-track { background: none; height: 18px; }
input::-moz-range-track { background: none; }
input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; pointer-events: auto; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--accent); background: var(--bg); cursor: grab; }
input::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--accent); background: var(--bg); cursor: grab; }
input:active::-webkit-slider-thumb { cursor: grabbing; }
input:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--fg); outline-offset: 2px; }
input:focus-visible::-moz-range-thumb { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>

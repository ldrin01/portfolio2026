<script setup lang="ts">
// Every run and ride as a small route drawing, laid out in a circle (a sunflower spiral, packed from the middle).
// The pointer works like a magnifier: routes near it swell and light up, and the nearest one gets a small label with
// its name, date and distance. On a phone, tap a route to see its label and tap anywhere else to put it away.
// Filtering shrinks the routes that go away on the spot and the rest slide in toward the middle to close the gap (and
// spread back out when they return). The switch piles every route into one bright tangle at the middle. The circle
// keeps its size however many routes there are: the more routes, the smaller each one. Each route is a PNG of the
// line on a transparent background; it is used as a mask, so it takes the theme's colour.
type Route = { image: string; name: string; kind: string; km: number; date: string }
const props = defineProps<{ routes: Route[] }>()
const asset = useAssetUrl()
const filter = ref<'all' | 'run' | 'ride'>('all')
const pile = ref(false)
const shown = computed(() => props.routes.filter(r => filter.value === 'all' || r.kind === filter.value))
const total = computed(() => Math.round(shown.value.reduce((s, r) => s + r.km, 0)))
const pick = ref(0)
const active = ref(false) // a route is being pointed at or tapped, so its label shows
const current = computed(() => shown.value[Math.min(pick.value, shown.value.length - 1)])
watch(filter, () => { pick.value = 0; active.value = false })

// Where each route sits: the k-th shown route is on the spiral at radius u·√k, turned by the golden angle. u is fixed
// by the full set, so fewer routes means a smaller circle, not bigger routes.
const U = computed(() => 46 / Math.sqrt(Math.max(1, props.routes.length)))
const slots = computed(() => {
  const at = new Map(shown.value.map((r, k) => [r.image, k]))
  return props.routes.map((r) => {
    const k = at.get(r.image)
    if (k === undefined) return { on: false, x: 50, y: 50, k: 0 } // gone: shrunk to nothing where it was
    const rad = U.value * Math.sqrt(k + .5), th = k * 2.39996
    return { on: true, x: 50 + rad * Math.cos(th), y: 50 + rad * Math.sin(th), k }
  })
})
const size = computed(() => Math.min(18, U.value * 1.68))
// the label sits above the route it names, or below / to the side when that would run off the circle's frame
const at = computed(() => slots.value.find(s => s.on && s.k === pick.value) ?? { x: 50, y: 50 })
const place = computed(() => `${at.value.y < 24 ? 'below' : 'above'} ${at.value.x < 24 ? 'start' : at.value.x > 76 ? 'end' : ''}`)

const grid = ref<HTMLElement>()
const live = () => [...grid.value!.children].filter(c => (c as HTMLElement).dataset.on === '1') as HTMLElement[]
const onMove = (e: PointerEvent) => {
  if (pile.value || e.pointerType === 'touch') return
  let best = 0, bestD = Infinity
  for (const c of live()) {
    const r = c.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
    if (d < bestD) { bestD = d; best = Number(c.dataset.k) }
    c.style.setProperty('--f', Math.max(0, 1 - d / 150).toFixed(3))
  }
  if (bestD < 90) { pick.value = best; active.value = true } else active.value = false
}
const onLeave = (e?: PointerEvent) => {
  if (e?.pointerType === 'touch') return
  active.value = false
  ;[...grid.value!.children].forEach(c => (c as HTMLElement).style.setProperty('--f', '0'))
}
const choose = (k: number) => { pick.value = k; active.value = true }
// a tap on the empty part of the circle puts the label away
const tapAway = (e: PointerEvent) => { if (e.pointerType === 'touch' && e.target === e.currentTarget) active.value = false }
const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="routes">
  <div class="bar">
    <span />
    <div class="seg" role="radiogroup" aria-label="Show">
      <button v-for="f in (['all', 'run', 'ride'] as const)" :key="f" type="button" role="radio" :aria-checked="filter === f" :class="{ on: filter === f }" @click="filter = f">{{ f === 'all' ? 'All' : f === 'run' ? 'Runs' : 'Rides' }}</button>
    </div>
    <!-- circle or one pile: a sliding switch -->
    <button type="button" class="switch" role="switch" :aria-checked="pile" aria-label="Pile all routes into one" @click="pile = !pile; active = false; onLeave()">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" /></svg>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v12H2z" /></svg>
      <i aria-hidden="true" />
    </button>
  </div>
  <p class="stats"><span><b>{{ shown.length }}</b> routes</span><span><b>{{ total.toLocaleString() }}</b> km</span></p>
  <div class="stage">
    <div ref="grid" class="grid" :class="{ pile }" @pointermove="onMove" @pointerleave="onLeave" @pointerdown="tapAway">
      <button
        v-for="(r, i) in routes" :key="r.image" type="button" class="tile" :class="{ on: active && slots[i]!.on && slots[i]!.k === pick && !pile }"
        :data-on="slots[i]!.on ? '1' : '0'" :data-k="slots[i]!.k" :tabindex="slots[i]!.on && !pile ? 0 : -1"
        :style="{ '--x': pile ? 50 : slots[i]!.x, '--y': pile ? 50 : slots[i]!.y, '--sz': `${size}%`, '--vis': slots[i]!.on ? (pile ? 84 / size : 1) : 0, '--turn': pile ? `${((i * 53) % 40) - 20}deg` : '0deg', '--d': `${Math.min(slots[i]!.k, 40) * 5}ms` }"
        :aria-label="`${r.name}, ${r.km} km`" @focus="choose(slots[i]!.k)" @blur="active = false" @click="choose(slots[i]!.k)"
      ><i :style="{ '--m': `url(${asset(r.image)})` }" /></button>
      <div v-if="current" class="label" :class="[place, { show: active && !pile }]" :style="{ '--lx': `${at.x}%`, '--ly': `${at.y}%` }" aria-live="polite">
        <span class="kind">{{ current.kind === 'ride' ? 'Ride' : 'Run' }} · {{ fmt(current.date) }}</span>
        <span class="name">{{ current.name }}</span>
        <span class="km"><b>{{ current.km }}</b> km</span>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
/* the bar: the filter centred over the whole section, the pile switch at the right */
.bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-bottom: 14px; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 4px; }
button { font: inherit; color: var(--fg); cursor: pointer; }
.seg button { padding: 8px 18px; border: 0; border-radius: 999px; background: none; font-size: 14px; transition: background-color .2s, color .2s; }
.seg button.on { background: var(--fg); color: var(--bg); }
.switch { justify-self: end; position: relative; display: grid; grid-template-columns: 1fr 1fr; width: 76px; height: 38px; padding: 4px; border: 1px solid var(--line); border-radius: 999px; background: none; }
.switch svg { position: relative; z-index: 1; width: 14px; height: 14px; margin: auto; fill: currentColor; transition: color .25s; }
.switch svg:first-child { color: var(--bg); }
.switch[aria-checked="true"] svg:first-child { color: var(--fg); }
.switch[aria-checked="true"] svg:nth-child(2) { color: var(--bg); }
.switch i { position: absolute; top: 4px; left: 4px; width: 34px; height: 28px; border-radius: 999px; background: var(--fg); transition: transform .3s cubic-bezier(.2, .8, .2, 1); }
.switch[aria-checked="true"] i { transform: translateX(34px); }
.stats { display: flex; justify-content: center; gap: 22px; margin: 0 0 clamp(8px, 2vw, 24px); font-size: 13px; color: var(--muted); }
.stats b { color: var(--fg); font-size: 16px; }

.stage { min-width: 0; }
.grid { position: relative; width: min(100%, 780px); aspect-ratio: 1; margin: 0 auto; container-type: inline-size; }
/* each route sits at its spot in the circle; gone ones shrink to nothing, the rest slide to close the gap. Only
   transforms animate (size is fixed by the full set), so it stays smooth */
.tile {
  --f: 0; position: absolute; left: 50%; top: 50%; width: var(--sz); aspect-ratio: 1; padding: 0; border: 0; background: none;
  transform: translate(-50%, -50%) translate(calc((var(--x) - 50) * 1cqw), calc((var(--y) - 50) * 1cqw)) rotate(var(--turn)) scale(var(--vis)); z-index: calc(var(--f) * 10);
  transition: transform .8s cubic-bezier(.2, .8, .2, 1) var(--d);
}
.tile[data-on="0"] { pointer-events: none; }
.tile i {
  display: block; width: 100%; height: 100%; background: color-mix(in srgb, var(--fg) calc(30% + var(--f) * 70%), var(--accent) calc(var(--f) * 100%));
  -webkit-mask: var(--m) center / contain no-repeat; mask: var(--m) center / contain no-repeat;
  transform: scale(calc(1 + var(--f) * .7)); opacity: calc(var(--rest, .4) + var(--f) * (1 - var(--rest, .4)));
  transition: transform .25s cubic-bezier(.2, .8, .2, 1), opacity .25s, background-color .25s;
}
.tile.on i { background: var(--accent); opacity: 1; transform: scale(1.7); }
.tile:focus-visible { outline: none; }
.tile:focus-visible i { background: var(--accent); opacity: 1; }
[data-theme="light"] .tile { --rest: .7; } /* on the light background the resting routes need more weight */

/* the label for the route being pointed at: above it, or below / beside it near the frame's edge */
.label {
  position: absolute; left: var(--lx); top: var(--ly); z-index: 20; display: grid; gap: 2px; width: max-content; max-width: 70%; padding: 10px 14px;
  border: 1px solid var(--line); border-radius: 12px; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); box-shadow: var(--shadow-card);
  pointer-events: none; opacity: 0; transform: translate(-50%, calc(-100% - 34px)); transition: opacity .2s, transform .25s cubic-bezier(.2, .8, .2, 1);
}
.label.show { opacity: 1; }
.label.below { transform: translate(-50%, 34px); }
.label.start { transform: translate(-14%, calc(-100% - 34px)); } .label.below.start { transform: translate(-14%, 34px); }
.label.end { transform: translate(-86%, calc(-100% - 34px)); } .label.below.end { transform: translate(-86%, 34px); }
.label .kind { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.label .name { font-size: 17px; font-weight: 500; }
.label .km { color: var(--muted); font-size: 13px; }
.label .km b { font-size: 22px; font-weight: 600; color: var(--fg); letter-spacing: -.02em; }
/* piled: every route stacked at the middle, faint alone, bright where they cross */
.grid.pile .tile { pointer-events: none; }
.grid.pile .tile i { background: var(--accent); opacity: .16; transform: scale(.92); }

@media (max-width: 900px) {
  /* the filter hugs its buttons and stays centred; the switch sits at the right, a little smaller to fit */
  .seg { justify-self: center; } .seg button { padding: 8px 13px; }
  .switch { width: 64px; } .switch i { width: 28px; } .switch[aria-checked="true"] i { transform: translateX(28px); }
}
@media (prefers-reduced-motion: reduce) { .tile, .tile i, .label { transition: none; } }
</style>

<script setup lang="ts">
// How I work: four steps on one line that fills in as you scroll. Each node lights up as the line reaches it,
// and each step lists what it hands over. Desktop runs left to right; phones run top to bottom.
const { process } = useSite()

const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const progress = ref(0) // 0..1 along the line
const reached = ref(0) // how many nodes the filled line has reached
const span = ref({ start: 0, len: 0 }) // the line runs from the first node's centre to the last's, in px along the list

let raf = 0
const update = () => {
  raf = 0
  const el = list.value
  if (!el) return
  const r = el.getBoundingClientRect(), vh = window.innerHeight
  const down = matchMedia('(max-width: 860px)').matches // phones: the line runs top to bottom
  const centres = [...el.querySelectorAll<HTMLElement>('.node')].map(n => {
    const b = n.getBoundingClientRect()
    return down ? b.top + b.height / 2 - r.top : b.left + b.width / 2 - r.left
  })
  const start = centres[0] ?? 0, len = (centres.at(-1) ?? 0) - start
  span.value = { start, len }
  progress.value = down
    // the tip of the line follows a point 60% down the screen, so it is always drawing where you are reading
    ? Math.min(1, Math.max(0, (vh * 0.6 - r.top - start) / Math.max(1, len)))
    // starts when the list's top reaches 80% of the screen, done when its bottom passes 55%
    : Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.25)))
  const tip = progress.value * len
  reached.value = progress.value > 0 ? centres.filter(c => c - start <= tip + 1).length : 0
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
let near: IntersectionObserver | null = null
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { update(); progress.value = 1; reached.value = process.steps.length; return }
  window.addEventListener('resize', onScroll)
  near = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) { window.addEventListener('scroll', onScroll, { passive: true }); update() }
    else window.removeEventListener('scroll', onScroll)
  }, { rootMargin: '200px 0px' })
  if (root.value) near.observe(root.value)
})
onBeforeUnmount(() => { near?.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) })
</script>

<template>
  <section id="process" ref="root">
    <div class="wrap">
      <h2 v-lag="1">{{ process.heading }}</h2>
      <p v-lag="2" class="sub">{{ process.sub }}</p>

      <ol ref="list" class="steps" :style="{ '--p': progress, '--n': process.steps.length, '--a': `${span.start}px`, '--len': `${span.len}px` }">
        <li class="line" aria-hidden="true"><span class="fill" /></li>
        <li v-for="(s, i) in process.steps" :key="s.title" class="step" :class="{ on: i < reached }">
          <span class="node" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <template v-if="s.icon === 'brief'"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 15.5h5M10 9h2" /></template>
              <template v-else-if="s.icon === 'map'"><circle cx="12" cy="12" r="2.6" /><circle cx="5" cy="6" r="1.8" /><circle cx="19" cy="6" r="1.8" /><circle cx="5" cy="18" r="1.8" /><circle cx="19" cy="18" r="1.8" /><path d="M6.4 7.2l3.6 3M17.6 7.2l-3.6 3M6.4 16.8l3.6-3M17.6 16.8l-3.6-3" /></template>
              <template v-else-if="s.icon === 'research'"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5M8 10.5a2.5 2.5 0 0 1 2.5-2.5" /></template>
              <template v-else><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18c6 0 3-12 10-12" stroke-dasharray="2 2.4" /></template>
            </svg>
          </span>
          <h3>{{ s.title }}</h3>
          <p class="blurb">{{ s.blurb }}</p>
          <ul class="outs">
            <li v-for="o in s.outputs" :key="o">{{ o }}</li>
          </ul>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
h2 { font-size: clamp(34px, 5.5vw, 72px); letter-spacing: -.02em; font-weight: 500; }
.sub { margin: 12px 0 clamp(40px, 7vw, 88px); color: var(--muted); max-width: 46ch; }

.steps { --node: 56px; list-style: none; margin: 0; padding: 0; position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: clamp(20px, 3vw, 40px); }
/* the line runs through the middle of the nodes, from the first to the last */
.line { position: absolute; top: calc(var(--node) / 2 - 1px); left: var(--a); width: var(--len); height: 2px; background: var(--line); }
.fill { position: absolute; inset: 0; background: var(--accent); transform-origin: left; transform: scaleX(var(--p)); }

.step { position: relative; }
.node {
  position: relative; z-index: 1; display: grid; place-items: center; width: var(--node); height: var(--node); border-radius: 50%;
  color: var(--muted); background: var(--bg); border: 1.5px solid var(--line);
  transition: color .4s, background-color .4s, border-color .4s, transform .5s cubic-bezier(.3, 1.4, .5, 1), box-shadow .5s;
}
.node svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.on .node { color: var(--on-accent); background: var(--accent); border-color: var(--accent); transform: scale(1.06); box-shadow: 0 10px 28px -10px color-mix(in srgb, var(--accent) 70%, transparent); }
[data-theme="dark"] .on .node { box-shadow: none; }

h3 { margin-top: 22px; font-size: clamp(22px, 2.2vw, 30px); font-weight: 500; letter-spacing: -.01em; margin-bottom: 8px; }
.blurb { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.55; }
.outs { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.outs li { font-size: 12px; letter-spacing: .04em; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: var(--surface); transition: border-color .4s, color .4s; }
.on .outs li { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); color: var(--fg); }
/* each step rises in once the line reaches it */
.step > :not(.node) { opacity: .35; transform: translateY(8px); transition: opacity .6s ease, transform .6s cubic-bezier(.16, .84, .3, 1); }
.step.on > :not(.node) { opacity: 1; transform: none; }

/* tablets and phones: one column, the line runs down the left through the nodes */
@media (max-width: 860px) {
  .steps { --node: 48px; grid-template-columns: 1fr; gap: 40px; }
  .line { top: var(--a); left: calc(var(--node) / 2 - 1px); width: 2px; height: var(--len); } /* ends at the last node, not the last step's text */
  .fill { transform-origin: top; transform: scaleY(var(--p)); }
  .step { display: grid; grid-template-columns: var(--node) 1fr; column-gap: 20px; }
  .node { grid-row: 1 / span 4; }
  .step > :not(.node) { grid-column: 2; }
  h3 { margin-top: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .node, .outs li, .step > :not(.node) { transition: none; }
}
</style>

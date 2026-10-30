<script setup lang="ts">
// What's next, as big type that reacts. Each plan is a huge line; letters near the pointer grow heavier and lift a
// little (the font's weight runs 300–800), and the line you are on opens to show its few words. On touch, tapping a
// line opens it.
const props = defineProps<{ plans: { title: string; body: string }[] }>()
const active = ref(-1)
const root = ref<HTMLElement>()
let raf = 0, px = -9999, py = -9999
const paint = () => {
  raf = 0
  root.value?.querySelectorAll<HTMLElement>('.ch').forEach((c) => {
    const r = c.getBoundingClientRect(), d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2))
    const f = Math.max(0, 1 - d / 220)
    c.style.setProperty('--w', String(Math.round(320 + f * f * 480)))
    c.style.setProperty('--lift', `${(-f * f * 10).toFixed(1)}px`)
  })
}
const onMove = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint) }
const onLeave = () => { px = py = -9999; active.value = -1; if (!raf) raf = requestAnimationFrame(paint) }
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <ol ref="root" class="plans" @pointermove="onMove" @pointerleave="onLeave">
    <li v-for="(p, i) in props.plans" :key="p.title" :class="{ open: active === i }" @pointerenter="$event.pointerType === 'mouse' && (active = i)" @pointerup="$event.pointerType !== 'mouse' && (active = active === i ? -1 : i)">
      <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
      <h3 :aria-label="p.title"><span v-for="(c, k) in [...p.title]" :key="k" class="ch" aria-hidden="true">{{ c === ' ' ? '\u00a0' : c }}</span></h3>
      <p class="body">{{ p.body }}</p>
    </li>
  </ol>
</template>

<style scoped>
.plans { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: 70px 1fr; align-items: baseline; column-gap: 20px; padding: clamp(18px, 2.4vw, 30px) 0; border-top: 1px solid var(--line); cursor: default; }
li:last-child { border-bottom: 1px solid var(--line); }
.num { font-size: 14px; font-variant-numeric: tabular-nums; color: var(--muted); transition: color .3s; }
h3 { margin: 0; font-size: clamp(40px, 8vw, 120px); font-weight: 320; letter-spacing: -.035em; line-height: 1; white-space: nowrap; }
.ch { --w: 320; --lift: 0px; display: inline-block; font-variation-settings: 'wght' var(--w); transform: translateY(var(--lift)); transition: font-variation-settings .25s ease-out, transform .25s ease-out, color .3s; }
.body { grid-column: 2; margin: 0; max-height: 0; overflow: hidden; opacity: 0; color: var(--muted); font-size: clamp(16px, 1.4vw, 19px); max-width: 560px; transition: max-height .5s cubic-bezier(.2, .8, .2, 1), opacity .4s, margin .5s; }
.open .num { color: var(--accent); }
.open .ch { color: var(--accent); }
.open .body { max-height: 6em; opacity: 1; margin-top: 14px; }
@media (max-width: 700px) { li { grid-template-columns: 34px 1fr; column-gap: 10px; } h3 { white-space: normal; } }
@media (prefers-reduced-motion: reduce) { .ch { transition: none; } }
</style>

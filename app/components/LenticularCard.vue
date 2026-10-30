<script setup lang="ts">
// About as a lenticular card: scrolling turns the card, and each angle shows a deeper, more personal layer.
const { about } = useSite()
const n = about.layers.length

const root = ref<HTMLElement | null>(null)
const turn = ref(0) // card rotation in degrees
const ops = ref<number[]>(about.layers.map((_, i) => (i === 0 ? 1 : 0)))

let raf = 0
const update = () => {
  raf = 0
  const el = root.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const span = r.height - window.innerHeight
  const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
  const pos = Math.min(n - 0.001, p * n) // 0..n, layer i is centered at i + 0.5
  turn.value = -(pos - Math.floor(pos) - 0.5) * 26
  ops.value = about.layers.map((_, i) => Math.min(1, Math.max(0, (0.62 - Math.abs(pos - (i + 0.5))) / 0.2)))
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
onMounted(() => { update(); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule) })
onBeforeUnmount(() => { cancelAnimationFrame(raf); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) })
</script>

<template>
  <section id="about" ref="root" class="lenti" :style="{ '--n': n }">
    <div class="stick">
      <div class="wrap">
        <p class="eyebrow">{{ about.eyebrow }}</p>
        <div class="stage">
          <div class="card" :style="{ '--turn': `${turn}deg` }">
            <article v-for="(l, i) in about.layers" :key="l.label" class="layer" :style="{ '--op': ops[i] }" :aria-hidden="ops[i] < 0.5 ? 'true' : undefined">
              <p class="label">{{ l.label }}</p>
              <h2>{{ l.title }}</h2>
              <p v-for="line in l.lines" :key="line">{{ line }}</p>
            </article>
            <div class="sheen" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lenti { display: block; padding: 0; min-height: calc(100svh + var(--n) * 70svh); }
.stick { position: sticky; top: 0; height: 100svh; display: flex; align-items: center; }
.stick > .wrap { width: 100%; }
.eyebrow { width: min(100%, 640px); margin-left: auto; margin-right: auto; } /* lines up with the card's left edge */ /* a flex child would shrink to its content, and the layers inside are absolute, so it would collapse */
.stage { perspective: 1200px; }
.card {
  position: relative; width: min(100%, 640px); min-height: min(48svh, 400px); margin: 0 auto; padding: clamp(24px, 4vw, 48px);
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-card);
  transform: rotateY(var(--turn, 0deg)); transform-style: preserve-3d; will-change: transform;
}
.layer { position: absolute; inset: 0; padding: inherit; opacity: var(--op, 0); }
.layer > p { margin: 0 0 8px; }
.label { font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
h2 { font-size: clamp(28px, 4.6vw, 52px); letter-spacing: -.02em; font-weight: 500; margin-bottom: 20px; }
/* the lenticular shimmer: a band of light that slides across as the card turns */
.sheen { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .22) 50%, transparent 65%); background-size: 250% 100%; background-position: calc(50% - var(--turn, 0deg) * 6) 0; mix-blend-mode: soft-light; }
[data-theme="dark"] .sheen { display: none; } /* dark has no gloss */
@media (prefers-reduced-motion: reduce) {
  .lenti { min-height: auto; padding: 96px 0; }
  .stick { position: static; height: auto; }
  .card { transform: none; display: grid; gap: 40px; padding: 0; background: none; border: 0; box-shadow: none; }
  .layer { position: static; opacity: 1; padding: 0; }
  .sheen { display: none; }
}
</style>

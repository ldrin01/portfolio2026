<script setup lang="ts">
// The encyclopedia's logo as a line animation: three translucent blue petals fanning out from one point (the shape
// of its later logo). When it scrolls into view the petals' outlines draw in folded together, fan open, then fill
// with see-through blue so they darken where they overlap. Pointing at it fans them a little wider.
const root = ref<SVGElement>()
const on = ref(false)
const wide = ref(false)
// one petal: from the shared root (0,0) to a tip L up, fuller on one side like the logo's leaves
const petal = (L: number, W: number) => `M0 0 C${-W} ${-L * .3} ${-W * .7} ${-L * .95} 0 ${-L} C${W * .95} ${-L * .97} ${W * 1.05} ${-L * .4} 0 0 Z`
const PETALS = [
  { d: petal(150, 34), turn: -14, fill: 'url(#enc-a)' },
  { d: petal(168, 52), turn: 14, fill: 'url(#enc-b)' },
  { d: petal(196, 64), turn: 52, fill: 'url(#enc-c)' }
]
onMounted(() => {
  const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { on.value = true; io.disconnect() } }, { threshold: .4 })
  io.observe(root.value!)
  onBeforeUnmount(() => io.disconnect())
})
</script>

<template>
  <svg ref="root" class="enc" :class="{ on, wide }" viewBox="0 0 320 250" role="img" aria-label="The Encarta logo: three blue petals fanning out" @pointerenter="wide = true" @pointerleave="wide = false">
    <defs>
      <linearGradient id="enc-a" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1c4fd8" /><stop offset="1" stop-color="#8fc3f7" /></linearGradient>
      <linearGradient id="enc-b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2a63de" /><stop offset="1" stop-color="#a9d3fa" /></linearGradient>
      <radialGradient id="enc-c" cx=".7" cy=".3" r=".9"><stop offset="0" stop-color="#cfe6fd" /><stop offset="1" stop-color="#5b9be9" /></radialGradient>
    </defs>
    <g transform="translate(110 225)">
      <g v-for="(p, i) in PETALS" :key="i" class="petal" :style="{ '--turn': `${p.turn}deg`, '--i': i }">
        <path class="fill" :d="p.d" :fill="p.fill" />
        <path class="line" :d="p.d" pathLength="1" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.enc { display: block; width: 100%; max-width: 360px; height: auto; overflow: visible; margin: 0 auto; }
.petal { transform: rotate(-14deg); transition: transform 1.1s cubic-bezier(.2, .8, .2, 1) calc(1.2s + var(--i) * .12s); }
.on .petal { transform: rotate(var(--turn)); }
.wide .petal { transform: rotate(calc(var(--turn) * 1.25)); transition-delay: 0s; transition-duration: .6s; }
.line { fill: none; stroke: #2f6fdc; stroke-width: 1.6; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
.on .line { animation: draw 1.3s cubic-bezier(.6, .1, .3, 1) forwards; animation-delay: calc(var(--i) * .2s); }
@keyframes draw { to { stroke-dashoffset: 0; } }
.fill { opacity: 0; mix-blend-mode: multiply; transition: opacity 1s calc(2.1s + var(--i) * .15s); }
.on .fill { opacity: .82; }
[data-theme="dark"] .fill { mix-blend-mode: screen; }
[data-theme="dark"] .line { stroke: #8fc3f7; }
@media (prefers-reduced-motion: reduce) {
  .petal { transform: rotate(var(--turn)); transition: none; }
  .line { stroke-dashoffset: 0; animation: none !important; }
  .fill { opacity: .82; transition: none; }
}
</style>

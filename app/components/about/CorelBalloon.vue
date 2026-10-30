<script setup lang="ts">
// The drawing app's balloon, flat like its logo: colour fields (blues at the crown, greens, lime and yellow, purple,
// red and orange at the bottom) inside the envelope, cut by four white curved gores, over a grey trapezoid basket.
// When it comes into view the colours fill the envelope from the bottom up like hot air, the white gores draw down,
// the basket drops in, and then it floats with a slow sway. It sits inline in a big line of text.
const root = ref<SVGElement>()
const on = ref(false)
// a white gore: the band between two curves from the crown to the bottom point (quadratic, controls cx ± w)
const gore = (cx: number, w = 30) => `M330 40 Q${cx - w} 360 330 700 Q${cx + w} 360 330 40 Z`
onMounted(() => {
  const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { on.value = true; io.disconnect() } }, { threshold: .5 })
  io.observe(root.value!)
  onBeforeUnmount(() => io.disconnect())
})
</script>

<template>
  <svg ref="root" class="balloon" :class="{ on }" viewBox="0 0 660 840" role="img" aria-label="CorelDRAW logo">
    <defs>
      <clipPath id="cb-env"><path d="M330 40 C485 40 618 140 612 265 C606 390 440 565 345 700 L315 700 C220 565 54 390 48 265 C42 140 175 40 330 40 Z" /></clipPath>
      <linearGradient id="cb-top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0aa3e6" /><stop offset=".5" stop-color="#1e7fe0" /><stop offset="1" stop-color="#2fd3c6" /></linearGradient>
      <linearGradient id="cb-low" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6a21b" /><stop offset="1" stop-color="#e5302d" /></linearGradient>
      <linearGradient id="cb-purple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b2f93" /><stop offset="1" stop-color="#c0123b" /></linearGradient>
      <linearGradient id="cb-lime" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe01a" /><stop offset="1" stop-color="#9fcc2e" /></linearGradient>
    </defs>
    <g class="float">
      <g clip-path="url(#cb-env)">
        <g class="fill">
          <rect x="0" y="0" width="660" height="720" fill="#00953f" />
          <circle cx="40" cy="760" r="560" fill="#2ebf4f" />
          <circle cx="760" cy="40" r="300" fill="#008c3a" />
          <path d="M0 0 H660 V95 C540 135 430 90 330 110 C230 130 120 150 0 210 Z" fill="url(#cb-top)" />
          <path d="M0 280 C120 300 220 360 300 470 L330 720 L0 720 Z" fill="url(#cb-purple)" />
          <path d="M660 280 C560 300 430 340 370 380 L330 720 L660 720 Z" fill="url(#cb-lime)" />
          <path d="M290 470 C320 420 370 390 420 380 L380 720 L280 720 Z" fill="#e2d400" />
          <path d="M240 520 C280 470 330 450 370 460 L345 720 L290 720 Z" fill="url(#cb-low)" />
        </g>
        <g class="gores" fill="#fff">
          <path :d="gore(-140)" /><path :d="gore(80)" /><path :d="gore(510)" /><path :d="gore(780)" />
        </g>
      </g>
      <path class="basket" d="M275 735 H385 L372 805 H288 Z" fill="#666" />
    </g>
  </svg>
</template>

<style scoped>
.balloon { display: inline-block; width: 1.05em; height: 1.34em; vertical-align: -.3em; margin: 0 .06em; overflow: visible; }
/* the colours fill from the bottom point upward, like hot air */
.fill { clip-path: circle(0 at 50% 86%); transition: clip-path 1.4s cubic-bezier(.5, .1, .2, 1); }
.on .fill { clip-path: circle(110% at 50% 86%); }
/* the white gores draw down from the crown */
.gores path { transform-origin: 330px 40px; transform: scaleY(0); transition: transform .9s cubic-bezier(.2, .8, .2, 1); }
.on .gores path { transform: scaleY(1); }
.on .gores path:nth-child(1) { transition-delay: .9s; }
.on .gores path:nth-child(2) { transition-delay: 1s; }
.on .gores path:nth-child(3) { transition-delay: 1.1s; }
.on .gores path:nth-child(4) { transition-delay: 1.2s; }
.basket { opacity: 0; transform: translateY(-40px); transition: opacity .5s 1.4s, transform .8s cubic-bezier(.3, 1.6, .5, 1) 1.4s; }
.on .basket { opacity: 1; transform: none; }
/* then it floats */
.float { transform-origin: 330px 760px; }
.on .float { animation: float 6s ease-in-out 2.2s infinite; }
@keyframes float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-18px) rotate(2deg); } }
@media (prefers-reduced-motion: reduce) {
  .fill { clip-path: none; transition: none; }
  .gores path { transform: none; transition: none; }
  .basket { opacity: 1; transform: none; transition: none; }
  .on .float { animation: none; }
}
</style>

<script setup lang="ts">
// The quiet part. A tabletop seen from above; when it scrolls into view, the childhood photo, printed on photo paper,
// drops from in front of the screen and drifts down onto the table like real paper: tipping one way then the other,
// its shadow tightening as it nears, a last small slide as it lands. Then the words come in beside it.
defineProps<{ photo: string; alt: string; title: string; body: string[] }>()
const asset = useAssetUrl()
const root = ref<HTMLElement>()
const on = ref(false)
onMounted(() => {
  const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { on.value = true; io.disconnect() } }, { threshold: .45 })
  io.observe(root.value!)
  onBeforeUnmount(() => io.disconnect())
})
</script>

<template>
  <section ref="root" class="far" :class="{ on }">
    <div class="wrap far-in">
      <div class="drop">
        <div class="shadow" aria-hidden="true" />
        <figure class="print">
          <img :src="asset(photo)" :alt="alt" loading="lazy">
        </figure>
      </div>
      <div class="words">
        <h2>{{ title }}</h2>
        <p v-for="(p, i) in body" :key="p" :style="{ '--i': i }">{{ p }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* the table: dark wood, seen from straight above, a lamp's pool of light in the middle */
.far {
  display: block; min-height: 0; margin-top: clamp(72px, 10vw, 140px); padding: clamp(90px, 12vw, 170px) 0; color: #eceae6; overflow: hidden;
  background:
    radial-gradient(ellipse at 35% 45%, rgba(255, 214, 160, .16), transparent 60%),
    repeating-linear-gradient(93deg, rgba(0, 0, 0, .18) 0 2px, transparent 2px 7px, rgba(255, 255, 255, .02) 7px 9px, transparent 9px 23px),
    linear-gradient(#2a1d15, #1d140f);
}
.far-in { display: grid; grid-template-columns: minmax(220px, 380px) 1fr; gap: clamp(36px, 7vw, 100px); align-items: center; }
.drop { position: relative; perspective: 1100px; }
/* the photo print: white border, a little thicker at the bottom */
.print { position: relative; margin: 0; padding: 14px 14px 46px; background: #f4f1ea; border-radius: 2px; transform-origin: 50% 50%; opacity: 0; transform: translate3d(0, -12vh, 760px) rotateX(-40deg) rotateY(24deg) rotate(-28deg); }
.print img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; filter: grayscale(.35) sepia(.3) contrast(.95); }
.on .print { animation: fall 2.4s cubic-bezier(.3, .1, .3, 1) forwards; }
@keyframes fall {
  0% { opacity: 0; transform: translate3d(0, -12vh, 760px) rotateX(-40deg) rotateY(24deg) rotate(-28deg); }
  12% { opacity: 1; }
  38% { transform: translate3d(-6%, -3%, 420px) rotateX(20deg) rotateY(-14deg) rotate(-2deg); }
  64% { transform: translate3d(4%, 2%, 150px) rotateX(-12deg) rotateY(9deg) rotate(-11deg); }
  84% { transform: translate3d(-1%, 0, 24px) rotateX(4deg) rotateY(-3deg) rotate(-5deg); }
  100% { opacity: 1; transform: translate3d(1.5%, 1%, 0) rotate(-6deg); }
}
/* its shadow on the table: wide and faint while it is high, tight and dark when it lands */
.shadow { position: absolute; inset: 4% 2% 0 6%; background: rgba(0, 0, 0, .7); filter: blur(40px); opacity: 0; transform: translate(40px, 50px) scale(1.25) rotate(-6deg); }
.on .shadow { animation: shade 2.4s cubic-bezier(.3, .1, .3, 1) forwards; }
@keyframes shade { 0% { opacity: 0; } 30% { opacity: .2; } 100% { opacity: .85; filter: blur(10px); transform: translate(12px, 16px) scale(1) rotate(-6deg); } }
.words h2 { font-size: clamp(32px, 5vw, 64px); font-weight: 500; letter-spacing: -.02em; line-height: 1.05; margin: 0 0 20px; opacity: 0; transform: translateY(14px); transition: opacity .8s 2.1s, transform .8s 2.1s; }
.words p { color: #b2aca3; font-size: clamp(16px, 1.4vw, 18px); line-height: 1.6; margin: 0 0 12px; opacity: 0; transition: opacity 1s calc(2.6s + var(--i) * .35s); }
.on .words h2 { opacity: 1; transform: none; }
.on .words p { opacity: 1; }
@media (max-width: 800px) { .far-in { grid-template-columns: 1fr; } .drop { max-width: 300px; } }
@media (prefers-reduced-motion: reduce) {
  .print { opacity: 1; transform: rotate(-6deg); animation: none !important; }
  .shadow { opacity: .85; filter: blur(10px); transform: translate(12px, 16px) rotate(-6deg); animation: none !important; }
  .words h2, .words p { opacity: 1; transform: none; transition: none; }
}
</style>

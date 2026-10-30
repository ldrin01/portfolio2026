<script setup lang="ts">
// A company ID on a lanyard. The 1x1 photo takes a GIF, so it can move. Hover (or tilt a phone) and it swings.
const props = defineProps<{ card: { photo: string; company: string; name: string; role: string; role2: string; idNo: string; since: string } }>()
const asset = useAssetUrl()
const rx = ref(0), ry = ref(0)
const onMove = (e: PointerEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  ry.value = ((e.clientX - r.left) / r.width - .5) * 22
  rx.value = -((e.clientY - r.top) / r.height - .5) * 14
}
const reset = () => { rx.value = 0; ry.value = 0 }
// a barcode made from the ID number, so it changes when the number does
const bars = computed(() => [...props.card.idNo].flatMap((c) => { const v = c.charCodeAt(0); return [1 + (v % 3), 1 + ((v >> 2) % 2), 1 + ((v >> 3) % 3)] }))
</script>

<template>
  <div class="hang" @pointermove="onMove" @pointerleave="reset">
    <div class="strap" aria-hidden="true"><span /><span /></div>
    <div class="card" :style="{ '--rx': `${rx}deg`, '--ry': `${ry}deg` }">
      <div class="clip" aria-hidden="true" />
      <div class="band">{{ card.company }}</div>
      <div class="body">
        <img class="photo" :src="asset(card.photo)" alt="ID photo">
        <p class="name">{{ card.name }}</p>
        <p class="role">{{ card.role }}</p>
        <p class="role">{{ card.role2 }}</p>
        <div class="meta">
          <span>ID {{ card.idNo }}</span>
          <span>{{ card.since }}</span>
        </div>
        <div class="code" aria-hidden="true">
          <i v-for="(w, i) in bars" :key="i" :style="{ width: `${w * 2}px`, opacity: i % 2 ? 0 : 1 }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hang { position: relative; display: flex; flex-direction: column; align-items: center; perspective: 900px; padding-bottom: 12px; }
.strap { display: flex; gap: 46px; height: 110px; }
.strap span { width: 16px; height: 100%; background: var(--accent); transform-origin: bottom; }
.strap span:first-child { transform: skewX(14deg); }
.strap span:last-child { transform: skewX(-14deg); }
.card {
  position: relative; width: 260px; border-radius: 16px; background: var(--surface); color: var(--fg);
  border: 1px solid var(--line); box-shadow: var(--shadow-card); overflow: visible;
  transform-origin: 50% -40px; transform: rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .5s cubic-bezier(.2, .8, .2, 1);
  animation: sway 6s ease-in-out infinite;
}
@keyframes sway { 0%, 100% { rotate: -1.2deg; } 50% { rotate: 1.2deg; } }
.clip { position: absolute; top: -22px; left: 50%; width: 46px; height: 30px; translate: -50% 0; border-radius: 8px 8px 4px 4px; background: linear-gradient(#d9d9de, #9c9ca4); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .2); }
.clip::after { content: ''; position: absolute; left: 50%; bottom: 6px; width: 24px; height: 5px; translate: -50% 0; border-radius: 3px; background: rgba(0, 0, 0, .35); }
.band { padding: 22px 18px 12px; border-radius: 16px 16px 0 0; background: var(--accent); color: var(--on-accent, #fff); font-size: 12px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; text-align: center; }
.body { padding: 20px 22px 18px; text-align: center; }
.photo { display: block; width: 132px; aspect-ratio: 1; margin: 0 auto 16px; object-fit: cover; border-radius: 10px; background: var(--line); }
.name { margin: 0 0 6px; font-size: 21px; font-weight: 600; letter-spacing: -.01em; line-height: 1.15; }
.role { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.4; }
.meta { display: flex; justify-content: space-between; margin: 18px 0 10px; padding-top: 12px; border-top: 1px dashed var(--line); font: 11px/1 ui-monospace, 'SF Mono', Menlo, monospace; color: var(--muted); }
.code { display: flex; justify-content: center; height: 30px; }
.code i { display: block; height: 100%; background: var(--fg); }
@media (prefers-reduced-motion: reduce) { .card { animation: none; transition: none; } }
</style>

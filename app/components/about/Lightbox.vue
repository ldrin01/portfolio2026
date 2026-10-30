<script setup lang="ts">
// A full-screen viewer for the galleries: arrows or swipe to move, Esc or a click outside to close.
const props = defineProps<{ items: { image: string; caption: string }[] }>()
const index = defineModel<number | null>({ default: null })
const asset = useAssetUrl()
const step = (d: number) => { if (index.value != null) index.value = (index.value + d + props.items.length) % props.items.length }
const onKey = (e: KeyboardEvent) => {
  if (index.value == null) return
  if (e.key === 'Escape') index.value = null
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}
let x0 = 0
onMounted(() => addEventListener('keydown', onKey))
onBeforeUnmount(() => removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="lb">
      <div v-if="index != null" class="lb" role="dialog" aria-modal="true" :aria-label="items[index]?.caption" @click.self="index = null" @pointerdown="x0 = $event.clientX" @pointerup="Math.abs($event.clientX - x0) > 50 && step($event.clientX < x0 ? 1 : -1)">
        <figure>
          <img :src="asset(items[index]?.image)" :alt="items[index]?.caption">
          <figcaption>{{ items[index]?.caption }} <span>{{ index + 1 }} / {{ items.length }}</span></figcaption>
        </figure>
        <button type="button" class="nav prev" aria-label="Previous" @click="step(-1)">←</button>
        <button type="button" class="nav next" aria-label="Next" @click="step(1)">→</button>
        <button type="button" class="close" aria-label="Close" @click="index = null">×</button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lb { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 64px 72px; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(10px); }
figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 14px; max-height: 100%; pointer-events: none; }
img { max-width: 100%; max-height: calc(100svh - 160px); object-fit: contain; border-radius: 8px; box-shadow: var(--shadow-card); }
figcaption { font-size: 14px; color: var(--muted); }
figcaption span { margin-left: 12px; font-variant-numeric: tabular-nums; }
button { position: absolute; width: 48px; height: 48px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); font: inherit; font-size: 20px; cursor: pointer; }
button:hover { color: var(--accent); }
.prev { left: 16px; top: 50%; translate: 0 -50%; }
.next { right: 16px; top: 50%; translate: 0 -50%; }
.close { top: 16px; right: 16px; }
.lb-enter-active, .lb-leave-active { transition: opacity .25s; }
.lb-enter-from, .lb-leave-to { opacity: 0; }
@media (max-width: 600px) { .lb { padding: 64px 12px; } .nav { top: auto; bottom: 16px; translate: none; } }
</style>

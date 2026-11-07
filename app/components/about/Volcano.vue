<script setup lang="ts">
// Mayon as a miniature terrain block with lava slowly flowing (see app/lib/volcano.js). three.js is already
// loaded by then (the Game Boy uses it too). Drag to turn it.
const canvas = ref<HTMLCanvasElement>()
onMounted(async () => {   // about.vue releases this section at frame 6, so the block builds itself hidden, a few ms at a time, and fades in
  let dispose: (() => void) | undefined, gone = false
  onBeforeUnmount(() => { gone = true; dispose?.() })
  const { mountVolcano } = await import('~/lib/volcano.js')
  if (gone) return
  const d = await mountVolcano(canvas.value!)
  if (gone) d(); else dispose = d
})
</script>

<template>
  <canvas ref="canvas" class="volcano" role="img" aria-label="A miniature 3D terrain block of Mayon Volcano with lava slowly flowing down its slopes" />
</template>

<style scoped>
.volcano { display: block; width: 100%; aspect-ratio: 16 / 10; cursor: grab; touch-action: pan-y; }
.volcano:active { cursor: grabbing; }
</style>
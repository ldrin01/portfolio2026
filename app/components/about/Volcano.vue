<script setup lang="ts">
// Mayon as a miniature terrain block with lava slowly flowing (see app/lib/volcano.js). three.js loads only when the
// block comes near. Drag to turn it.
const canvas = ref<HTMLCanvasElement>()
onMounted(() => {
  let dispose: (() => void) | undefined, gone = false
  const near = new IntersectionObserver(async ([e]) => {
    if (!e?.isIntersecting || dispose) return
    near.disconnect()
    const { mountVolcano } = await import('~/lib/volcano.js')
    if (!gone) dispose = await mountVolcano(canvas.value!)
  }, { rootMargin: '500px' })
  near.observe(canvas.value!)
  onBeforeUnmount(() => { gone = true; near.disconnect(); dispose?.() })
})
</script>

<template>
  <canvas ref="canvas" class="volcano" role="img" aria-label="A miniature 3D terrain block of Mayon Volcano with lava slowly flowing down its slopes" />
</template>

<style scoped>
.volcano { display: block; width: 100%; aspect-ratio: 16 / 10; cursor: grab; touch-action: pan-y; }
.volcano:active { cursor: grabbing; }
</style>

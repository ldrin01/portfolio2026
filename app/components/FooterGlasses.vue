<script setup lang="ts">
// My glasses resting on the footer as on a tabletop. The 3D code (and three.js) loads only when the footer gets close.
const root = ref<HTMLElement | null>(null)
let dispose: (() => void) | null = null

onMounted(() => {
  const near = new IntersectionObserver(async ([e]) => {
    if (!e?.isIntersecting) return
    near.disconnect()
    const { mountGlasses } = await import('~/lib/glasses.js')
    // the first render compiles the shaders (~130 ms): do it while the footer is still a screen or two away, when idle
    await new Promise<void>(res => ('requestIdleCallback' in window ? requestIdleCallback(() => res(), { timeout: 1500 }) : setTimeout(res, 200)))
    if (root.value) dispose = await mountGlasses(root.value)
  }, { rootMargin: '1500px 0px' })
  if (root.value) near.observe(root.value)
  dispose = () => near.disconnect()
})
onBeforeUnmount(() => dispose?.())
</script>

<template>
  <div ref="root" class="glasses" role="img" aria-label="My eyeglasses, resting on the table" />
</template>

<style scoped>
.glasses { width: min(100%, 560px); aspect-ratio: 1.35 / 1; margin: 0 auto; }
.glasses :deep(canvas) { display: block; width: 100%; height: 100%; }
[data-theme="dark"] .glasses :deep(canvas) { image-rendering: pixelated; }
</style>

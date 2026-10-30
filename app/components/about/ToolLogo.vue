<script setup lang="ts">
// A 3D tool logo sized to sit inside a line of big text (see app/lib/toolLogos.js). Loads three.js only when near.
const props = defineProps<{ kind: string; label: string }>()
const canvas = ref<HTMLCanvasElement>()
onMounted(() => {
  let dispose: (() => void) | undefined, gone = false
  const io = new IntersectionObserver(async ([e]) => {
    if (!e?.isIntersecting || dispose) return
    io.disconnect()
    const { mountToolLogo } = await import('~/lib/toolLogos.js')
    if (!gone) dispose = await mountToolLogo(canvas.value!, props.kind)
  }, { rootMargin: '400px' })
  io.observe(canvas.value!)
  onBeforeUnmount(() => { gone = true; io.disconnect(); dispose?.() })
})
</script>

<template>
  <canvas ref="canvas" class="logo" role="img" :aria-label="label" />
</template>

<style scoped>
.logo { display: inline-block; width: 1.5em; height: 1.5em; vertical-align: -.42em; margin: 0 .04em; }
</style>

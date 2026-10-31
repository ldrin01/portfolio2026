<script setup lang="ts">
// The 3D handheld, a light build (app/lib/gameboy-detail.js): plain shapes with the detail painted on as relief (gameboy-lite.js is the plainer one), and the pixel game on its
// screen (it boots with DRINWORKS first). Drag to turn it; click A or B to jump. three.js loads only when it comes near, and it
// stops drawing off screen. A, B and Space work while it is hovered or focused, so the page still scrolls with Space everywhere else.
// (The carved, much heavier version is still in public/lab/gameboy-3d.js.)
const host = ref<HTMLDivElement>()
const active = ref(false)
const base = useRuntimeConfig().app.baseURL
onMounted(() => {
  let model: { pause(): void; resume(): void; dispose(): void } | undefined, gone = false
  const seen = new IntersectionObserver(([e]) => { if (!model) return; e?.isIntersecting ? model.resume() : model.pause() })
  const near = new IntersectionObserver(async ([e]) => {
    if (!e?.isIntersecting || model) return
    near.disconnect()
    const { mountGameboyDetail } = await import('~/lib/gameboy-detail.js')
    const m = await mountGameboyDetail(host.value!, { base: `${base}lab/`, cam: [1.8, 0.8, 4.65], keyActive: () => active.value })
    if (gone) { m.dispose(); return }
    model = m
    seen.observe(host.value!)
  }, { rootMargin: '600px' })
  near.observe(host.value!)
  onBeforeUnmount(() => { gone = true; near.disconnect(); seen.disconnect(); model?.dispose() })
})
</script>

<template>
  <div
    ref="host" class="gb3d" tabindex="0" role="img"
    aria-label="A 3D Game Boy playing a little pixel game. Drag to turn it; click A or B, or press A, B or Space, to jump."
    @pointerenter="active = true" @pointerleave="active = false" @focusin="active = true" @focusout="active = false"
  />
</template>

<style scoped>
.gb3d { position: relative; width: 100%; max-width: 680px; margin-inline: auto; aspect-ratio: 1 / 1.1; max-height: 80svh; cursor: grab; outline: 0; }
.gb3d:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; border-radius: 12px; }
.gb3d :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>

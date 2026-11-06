<script setup lang="ts">
const props = defineProps<{
  eager?: boolean      // render on page load
  load?: boolean       // render once this turns true (the previous frame was reached)
  minHeight?: string   // space reserved until it renders
}>()
const emit = defineEmits<{ seen: [] }>()

const el = ref<HTMLElement | null>(null)
const visible = computed(() => !!props.eager || !!props.load)
let io: IntersectionObserver | null = null

onMounted(() => {
  if (!('IntersectionObserver' in window)) { emit('seen'); return }
  io = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) { emit('seen'); io?.disconnect() } // tells the page this frame was reached
  })
  if (el.value) io.observe(el.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div ref="el" :style="visible ? undefined : { minHeight: minHeight ?? '100vh' }">
    <slot v-if="visible" />
  </div>
</template>
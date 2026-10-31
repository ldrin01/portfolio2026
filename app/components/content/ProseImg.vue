<script setup lang="ts">
// Pictures and videos inside articles. Their paths start with "/" (/uploads/x.webp); useAssetUrl adds the site's base URL,
// which is /portfolio2026/ on GitHub Pages. A path ending in .webm or .mp4 plays as a muted loop.
const props = defineProps<{ src?: string; alt?: string; width?: string | number; height?: string | number }>()
const asset = useAssetUrl()
const url = computed(() => asset(props.src))
const isVideo = computed(() => /\.(webm|mp4)$/i.test(props.src ?? ''))
</script>

<template>
  <video v-if="isVideo" :src="url" :aria-label="alt" :width="width" :height="height" autoplay loop muted playsinline preload="metadata" />
  <img v-else :src="url" :alt="alt" :width="width" :height="height" loading="lazy">
</template>

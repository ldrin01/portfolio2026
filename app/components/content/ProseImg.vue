<script setup lang="ts">
// Pictures inside articles. Their paths start with "/" (/uploads/x.webp), so add the site's base URL,
// which is /portfolio2026/ on GitHub Pages.
const props = defineProps<{ src?: string; alt?: string; width?: string | number; height?: string | number }>()
const base = useRuntimeConfig().app.baseURL.replace(/\/$/, '')
const url = computed(() => (props.src?.startsWith('/') && !props.src.startsWith(`${base}/`) ? base + props.src : props.src))
</script>

<template>
  <img :src="url" :alt="alt" :width="width" :height="height" loading="lazy">
</template>

<script setup lang="ts">
// Pictures inside articles. Their paths start with "/" (/uploads/x.webp); useAssetUrl adds the site's base URL,
// which is /portfolio2026/ on GitHub Pages.
const props = defineProps<{ src?: string; alt?: string; width?: string | number; height?: string | number }>()
const asset = useAssetUrl()
const url = computed(() => asset(props.src))
</script>

<template>
  <img :src="url" :alt="alt" :width="width" :height="height" loading="lazy">
</template>

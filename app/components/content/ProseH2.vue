<script setup lang="ts">
// Article headings are plain text: no anchor link, no underline
defineProps<{ id?: string }>()
</script>

<template>
  <h2 :id="id"><slot /></h2>
</template>

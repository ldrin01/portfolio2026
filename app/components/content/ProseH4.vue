<script setup lang="ts">
// Article headings are plain text: no anchor link, no underline
defineProps<{ id?: string }>()
</script>

<template>
  <h4 :id="id"><slot /></h4>
</template>

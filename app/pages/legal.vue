<script setup lang="ts">
// The text lives in content/legal.md (edited in the local editor: Pages → Privacy & Terms).
const { data: doc } = await useAsyncData('legal', () => queryCollection('legal').first())
usePageSeo('legal')
</script>

<template>
  <main v-if="doc" class="legal">
    <article class="wrap">
      <p class="eyebrow">{{ doc.eyebrow }}</p>
      <h1>{{ doc.title }}</h1>
      <ContentRenderer :value="doc" class="prose" />
    </article>
  </main>
</template>

<style scoped>
.legal { padding: 140px 0 80px; }
article { max-width: 720px; }
h1 { font-size: clamp(40px, 7vw, 84px); letter-spacing: -.02em; margin-bottom: 32px; }
.prose :deep(h2) { font-size: 26px; margin: 32px 0 8px; font-weight: 500; }
.prose :deep(p) { margin: 0 0 16px; }
</style>

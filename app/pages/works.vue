<script setup lang="ts">
usePageSeo('works')
</script>

<template>
  <main class="works-page">
    <div class="wrap">
      <h1 class="sr-only">Works</h1>
      <WorksWindow mode="page" />
    </div>
  </main>
</template>

<style scoped>
.works-page { padding: 84px 0 0; }
@media (max-width: 700px) { .works-page { padding-top: 72px; } }
.wrap { max-width: 1400px; } /* as wide as the keyboard on the home page */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>

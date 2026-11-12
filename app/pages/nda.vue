<script setup lang="ts">
usePageSeo('nda')
const { nda } = useSite()
</script>

<template>
  <main class="nda-page">
    <article class="wrap">
      <h1>{{ nda.title }} <span class="bar" aria-hidden="true" />{{ nda.titleEnd }}</h1>
      <p v-for="(t, i) in nda.body" :key="i">{{ t }}</p>
      <p><NuxtLink class="back" to="/works">{{ nda.backLabel }}</NuxtLink></p>
    </article>
  </main>
</template>

<style scoped>
.nda-page { padding: 140px 0 80px; min-height: 70svh; }
article { max-width: 720px; }
h1 { font-size: clamp(40px, 7vw, 84px); letter-spacing: -.02em; margin-bottom: 28px; }
.bar { display: inline-block; background: #000; height: .8em; width: 3.2em; border-radius: 4px; vertical-align: -.05em; box-shadow: 0 0 0 1px var(--line); }
p { font-size: 19px; line-height: 1.55; color: var(--muted); margin: 0 0 14px; }
.back { color: var(--accent); text-decoration: none; font-family: ui-monospace, Menlo, monospace; font-size: 14px; }
.back:hover { text-decoration: underline; }
</style>

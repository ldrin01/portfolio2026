<script setup lang="ts">
defineProps<{ title: string; category: string; year: string; color: string; blurb: string }>()
</script>

<template>
  <article class="card">
    <div class="art" :style="{ background: color }" role="img" :aria-label="`${title} cover`">
      <span>{{ title.charAt(0) }}</span>
    </div>
    <div class="meta">
      <h3>{{ title }}</h3>
      <span class="year">{{ year }}</span>
    </div>
    <p class="cat">{{ category }}</p>
    <p class="blurb">{{ blurb }}</p>
  </article>
</template>

<style scoped>
.art { aspect-ratio: 4 / 3; border-radius: 6px; display: grid; place-items: center; overflow: hidden; transition: transform .4s ease, border-radius .4s ease; }
.art span { font: 400 clamp(80px, 12vw, 160px)/1 var(--serif); color: rgba(255, 255, 255, .85); }
.card:hover .art { transform: translateY(-4px); border-radius: 24px; }
.meta { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; }
h3 { font-size: 28px; }
.year, .cat { color: var(--muted); font-size: 14px; margin: 4px 0 0; }
.blurb { margin: 8px 0 0; }
</style>

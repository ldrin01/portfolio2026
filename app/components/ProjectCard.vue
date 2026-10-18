<script setup lang="ts">
defineProps<{ title: string; category: string; year: string; color: string; blurb: string }>()
</script>

<template>
  <article class="card">
    <div class="frame">
      <div class="art" :style="{ '--tone': color }" role="img" :aria-label="`${title} cover`">
        <span>{{ title.charAt(0) }}</span>
      </div>
    </div>
    <p class="cat">{{ category }} · {{ year }}</p>
    <h3>{{ title }}</h3>
    <p class="blurb">{{ blurb }}</p>
  </article>
</template>

<style scoped>
.card { text-align: left; }
.frame { transition: transform .5s cubic-bezier(.16, .84, .3, 1); }
@media (hover: hover) { .card:hover .frame { transform: translateY(-6px); } }
.art {
  aspect-ratio: 4 / 3; border-radius: 10px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--tone) 80%, white), var(--tone) 75%);
  border: 1px solid var(--line); transition: border-color .3s, box-shadow .3s;
}
@media (hover: hover) { .card:hover .art { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 12px 40px -12px color-mix(in srgb, var(--accent) 50%, transparent); } }
.art span { font: 300 clamp(88px, 12vw, 150px)/1 var(--serif); color: color-mix(in srgb, var(--bg) 82%, transparent); }
.cat { margin: 16px 0 4px; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
h3 { font-size: 30px; font-weight: 500; letter-spacing: -.01em; }
.blurb { margin: 8px 0 0; max-width: 32ch; color: var(--muted); }
</style>

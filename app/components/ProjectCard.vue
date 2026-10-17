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
.card { text-align: center; }
/* arched, double-ruled frame */
.frame { border: 1.5px solid var(--gold); border-radius: 999px 999px 8px 8px; padding: 8px; transition: transform .5s ease; }
.card:hover .frame { transform: translateY(-6px); }
.art {
  aspect-ratio: 3 / 4; border-radius: 999px 999px 4px 4px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--tone) 70%, white), var(--tone) 70%);
  border: 1px solid color-mix(in srgb, var(--gold) 60%, transparent);
}
.art span { font: italic 400 clamp(88px, 12vw, 150px)/1 var(--serif); color: rgba(248, 241, 224, .88); }
.cat { margin: 20px 0 4px; font-size: 12px; letter-spacing: .24em; text-transform: uppercase; color: var(--muted); }
h3 { font-size: 32px; font-style: italic; }
.blurb { margin: 8px auto 0; max-width: 28ch; color: var(--muted); }
</style>

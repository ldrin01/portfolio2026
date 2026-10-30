<script setup lang="ts">
const route = useRoute()
const { data: doc } = await useAsyncData(`study-${route.params.slug}`, () => queryCollection('caseStudies').path(`/case-studies/${route.params.slug}`).first())
if (!doc.value) throw createError({ statusCode: 404, statusMessage: 'Case study not found', fatal: true })
// SEO title and description from the article, or its title and summary when those are left empty
const { seo } = useSite()
const seoTitle = doc.value.seoTitle || `${doc.value.title} — ${seo.siteName}`
const seoDescription = doc.value.seoDescription || doc.value.summary
const asset = useAssetUrl()
// the header settles in once the loader has gone: title words rise one after another, then the lead, then a hairline draws
const loaderDone = useState('loaderDone', () => false)
const words = computed(() => doc.value?.title.split(' ') ?? [])
useSeoMeta({ title: seoTitle, description: seoDescription, ogTitle: seoTitle, ogDescription: seoDescription, ogType: 'article' })
</script>

<template>
  <main v-if="doc" class="study">
    <article class="wrap" :class="{ in: loaderDone }">
      <NuxtLink to="/case-studies" class="back">← All case studies</NuxtLink>
      <p class="eyebrow">{{ optionName('articleCategories', doc.shelf) }}</p>
      <h1 :aria-label="doc.title"><span v-for="(w, i) in words" :key="i" class="w" :style="{ '--i': i }" aria-hidden="true">{{ w }}</span></h1>
      <p class="lead">{{ doc.summary }}</p>
      <span class="rule" aria-hidden="true" />
      <p v-if="doc.draft" class="draft">Draft: full write-up coming.</p>
      <!-- the article's cover picture (optional): the full width of the article, under the title and lead -->
      <figure v-if="doc.cover" class="cover">
        <img :src="asset(doc.cover)" alt="" width="1600" height="900" fetchpriority="high">
      </figure>
      <ContentRenderer :value="doc" class="prose" />
    </article>
  </main>
</template>

<style scoped>
.study { padding: 130px 0 80px; }
article { max-width: 1080px; }
.back { display: inline-block; margin-bottom: 32px; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; color: var(--muted); }
.back:hover { color: var(--accent); }
h1 { font-size: clamp(36px, 6.4vw, 84px); letter-spacing: -.02em; }
.lead { max-width: 820px; font-size: clamp(19px, 1.8vw, 23px); color: var(--muted); margin: 20px 0 8px; }
.rule { display: block; width: min(160px, 30%); height: 2px; margin: 24px 0 8px; background: var(--accent); border-radius: 2px; transform-origin: left; }

/* the entrance: hidden while the loader is up, then a soft rise; reduced motion skips it (main.css turns animations off) */
.w { display: inline-block; margin-right: .24em; }
article:not(.in) :is(.w, .lead, .rule) { opacity: 0; }
.in .w { animation: rise .9s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--i) * 70ms); }
.in .lead { animation: rise .9s .35s cubic-bezier(.2, .7, .2, 1) both; }
.in .rule { animation: draw 1.1s .6s cubic-bezier(.6, 0, .2, 1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(.35em); filter: blur(6px); } }
@keyframes draw { from { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) { article:not(.in) :is(.w, .lead, .rule) { opacity: 1; } }
.draft { display: inline-block; font-size: 13px; padding: 2px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); }
.cover { margin: 40px 0 8px; }
.cover img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 14px; border: 1px solid var(--line); box-shadow: var(--shadow-card); background: var(--surface); }
.prose { max-width: 880px; margin-top: 40px; font-size: clamp(17px, 1.3vw, 19px); line-height: 1.7; }
.prose :deep(h2) { font-size: clamp(28px, 2.8vw, 36px); margin: 48px 0 10px; }
/* dark world: body copy a step down from pure white so it reads softer on black; headings and bold stay bright */
[data-theme="dark"] .prose { color: color-mix(in srgb, var(--fg) 76%, var(--bg)); }
[data-theme="dark"] .prose :deep(:is(h2, h3, strong)) { color: var(--fg); }
.prose :deep(img) { display: block; max-width: 100%; height: auto; margin: 28px 0; border-radius: 12px; }
</style>

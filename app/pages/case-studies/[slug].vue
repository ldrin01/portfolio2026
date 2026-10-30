<script setup lang="ts">
const route = useRoute()
const { data: doc } = await useAsyncData(`study-${route.params.slug}`, () => queryCollection('caseStudies').path(`/case-studies/${route.params.slug}`).first())
if (!doc.value) throw createError({ statusCode: 404, statusMessage: 'Case study not found', fatal: true })
// SEO title and description from the article, or its title and summary when those are left empty
const { seo } = useSite()
const seoTitle = doc.value.seoTitle || `${doc.value.title} — ${seo.siteName}`
const seoDescription = doc.value.seoDescription || doc.value.summary
useSeoMeta({ title: seoTitle, description: seoDescription, ogTitle: seoTitle, ogDescription: seoDescription, ogType: 'article' })
</script>

<template>
  <main v-if="doc" class="study">
    <article class="wrap">
      <NuxtLink to="/case-studies" class="back">← All case studies</NuxtLink>
      <p class="eyebrow">{{ optionName('articleCategories', doc.shelf) }}</p>
      <h1>{{ doc.title }}</h1>
      <p class="lead">{{ doc.summary }}</p>
      <p v-if="doc.draft" class="draft">Draft: full write-up coming.</p>
      <ContentRenderer :value="doc" class="prose" />
    </article>
  </main>
</template>

<style scoped>
.study { padding: 130px 0 80px; }
article { max-width: 760px; }
.back { display: inline-block; margin-bottom: 32px; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; color: var(--muted); }
.back:hover { color: var(--accent); }
h1 { font-size: clamp(36px, 6vw, 72px); letter-spacing: -.02em; }
.lead { font-size: 21px; color: var(--muted); margin: 20px 0 8px; }
.draft { display: inline-block; font-size: 13px; padding: 2px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); }
.prose { margin-top: 32px; }
.prose :deep(h2) { font-size: 28px; margin: 36px 0 8px; }
.prose :deep(img) { display: block; max-width: 100%; height: auto; margin: 28px 0; border-radius: 12px; }
</style>

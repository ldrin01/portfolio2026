<script setup lang="ts">
const { data: studies } = await useAsyncData('studies', () => queryCollection('caseStudies').order('order', 'ASC').all())
// one section per category, in the order set in Settings; categories with no articles yet are left out
const { options, caseStudiesPage } = useSite()
const shelves = computed(() => options.articleCategories.filter(c => (studies.value ?? []).some(x => x.shelf === c.id)))
usePageSeo('case-studies')
</script>

<template>
  <main class="studies">
    <div class="wrap">
      <h1>{{ caseStudiesPage.heading }}</h1>
      <section v-for="s in shelves" :key="s.id" class="shelf">
        <p class="eyebrow">{{ s.heading || s.name }}</p>
        <p v-if="s.blurb" class="blurb">{{ s.blurb }}</p>
        <ul>
          <li v-for="c in (studies ?? []).filter(x => x.shelf === s.id)" :key="c.path">
            <NuxtLink :to="c.path"><span class="t">{{ c.title }}</span><span class="s">{{ c.summary }}</span></NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style scoped>
.studies { padding: 130px 0 80px; }
h1 { font-size: clamp(44px, 8vw, 104px); letter-spacing: -.02em; margin-bottom: 48px; }
.shelf { min-height: 0; display: block; padding: 32px 0; border-top: 1px solid var(--line); }
.blurb { margin: 0 0 16px; color: var(--muted); }
ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px; }
li a { display: block; height: 100%; padding: 20px; text-decoration: none; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow-card); transition: border-color .2s; }
li a:hover { border-color: var(--accent); }
.t { display: block; font-size: 20px; font-weight: 500; line-height: 1.2; }
.s { display: block; margin-top: 8px; font-size: 15px; color: var(--muted); }
</style>

<script setup lang="ts">
const route = useRoute()
const { data: doc } = await useAsyncData(`study-${route.params.slug}`, () => queryCollection('caseStudies').path(`/case-studies/${route.params.slug}`).first())
if (!doc.value) throw createError({ statusCode: 404, statusMessage: 'Case study not found', fatal: true })
// SEO title and description from the article, or its title and summary when those are left empty
const { seo } = useSite()
const seoTitle = doc.value.seoTitle || `${doc.value.title} | ${seo.siteName}`
const seoDescription = doc.value.seoDescription || doc.value.summary
const asset = useAssetUrl()
// the header settles in once the loader has gone: title words rise one after another, then the lead, then a hairline draws
const loaderDone = useState('loaderDone', () => false)
const words = computed(() => doc.value?.title.split(' ') ?? [])
// three more to read: studies this reader has not opened come first, then the same category, then the next categories in the site's list (wrapping round),
// newest first inside each. "Opened" lives only in this browser (localStorage, no cookies), so it needs no banner.
const { data: others } = await useAsyncData(`more-${route.params.slug}`, () => queryCollection('caseStudies').order('order', 'DESC').all())
const opened = ref<Record<string, number>>({})
const KEY = 'studiesOpened'
const KEEP = 365 * 24 * 60 * 60 * 1000 // an open is forgotten after 365 days
// saved as { path: time opened }; an older list (plain array) is read as "opened now"
function loadOpened(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    const now = Date.now()
    const map: Record<string, number> = Array.isArray(raw) ? Object.fromEntries(raw.map((p: string) => [p, now])) : raw
    return Object.fromEntries(Object.entries(map).filter(([, t]) => typeof t === 'number' && now - t < KEEP))
  } catch { return {} }
}
function markOpened(path?: string) {
  const map = loadOpened()
  if (path) map[path] = Date.now()
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch { /* private mode: just skip */ }
  opened.value = map
}
onMounted(() => { markOpened(doc.value?.path); watch(() => doc.value?.path, markOpened) })
const more = computed(() => {
  const cats = useSite().options.articleCategories.map(c => c.id)
  const start = Math.max(0, cats.indexOf(doc.value?.shelf ?? ''))
  const rank = (shelf: string) => { const i = cats.indexOf(shelf); return i < 0 ? cats.length : (i - start + cats.length) % cats.length }
  // unopened first (same category, then the next ones, newest first); once everything is opened it loops: the one opened longest ago comes back first
  const at = (path: string) => opened.value[path] ?? 0
  return (others.value ?? [])
    .filter(x => x.path !== doc.value?.path)
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (at(a.x.path) ? 1 : 0) - (at(b.x.path) ? 1 : 0)
      || (at(a.x.path) ? at(a.x.path) - at(b.x.path) : rank(a.x.shelf) - rank(b.x.shelf) || a.i - b.i))
    .slice(0, 3)
    .map(r => r.x)
})
// a thumbnail that is missing falls back to the main picture
const useMain = (e: Event, cover: string) => { const im = e.target as HTMLImageElement; if (!im.src.endsWith(asset(cover)!)) im.src = asset(cover)! }
const shelfName = (id: string) => optionName('articleCategories', id)
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
      <section v-if="more.length" class="more" aria-labelledby="more-h">
        <h2 id="more-h">More case studies</h2>
        <ul>
          <li v-for="c in more" :key="c.path">
            <NuxtLink :to="c.path" class="mcard">
              <span class="mcover"><img v-if="c.cover" :src="asset(thumbOf(c))" alt="" width="640" height="360" loading="lazy" @error="useMain($event, c.cover)"></span>
              <span class="mmeta">{{ shelfName(c.shelf) }}</span>
              <span class="mt"><span>{{ c.title }}</span></span>
              <span class="ms">{{ c.summary }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
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
.prose :deep(h2) { font-size: clamp(28px, 2.8vw, 36px); font-weight: 600; margin: 52px 0 12px; }
/* "Sources" closes every study like the fine print on a medicine leaflet: one tiny muted run of text, bold caps word first, entries split by ";" */
.prose :deep(:has(+ h2#sources)) { margin-bottom: 56px; }
.prose :deep(h2#sources) { float: left; margin: 0 .5em 0 0; font: 700 11.5px/16.5px var(--sans); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.prose :deep(h2#sources ~ *) { font-size: 11.5px; line-height: 16.5px; color: var(--muted); overflow-wrap: anywhere; }
.prose :deep(h2#sources ~ ul) { display: block; list-style: none; margin: 0; padding: 0; }
.prose :deep(h2#sources ~ ul li) { display: inline; margin: 0; padding: 0; }
.prose :deep(h2#sources ~ ul li:not(:last-child)::after) { content: "; "; }
.prose :deep(h3) { font-size: clamp(21px, 2vw, 25px); font-weight: 600; margin: 34px 0 8px; }
.prose :deep(p) { margin: 0 0 1em; }
.prose :deep(:is(ul, ol)) { margin: 0 0 1.2em; padding-left: 1.4em; }
.prose :deep(li) { margin: .35em 0; padding-left: .2em; }
.prose :deep(li::marker) { color: var(--accent); font-weight: 600; }
.prose :deep(li > :is(ul, ol)) { margin: .3em 0 .5em; }
.prose :deep(blockquote) { margin: 32px 0; padding: 4px 0 4px 22px; border-left: 3px solid var(--accent); font-family: var(--serif); font-size: 1.25em; line-height: 1.35; }
.prose :deep(blockquote p) { margin: 0; }
.prose :deep(hr) { border: 0; height: 1px; background: var(--line); margin: 40px 0; }
.prose :deep(code) { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: .88em; padding: 1px 6px; border-radius: 6px; background: var(--surface); border: 1px solid var(--line); }
.prose :deep(table) { width: 100%; border-collapse: collapse; margin: 28px 0; font-size: .94em; }
.prose :deep(th) { text-align: left; font-weight: 600; }
.prose :deep(:is(th, td)) { padding: 10px 14px 10px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
/* dark world: body copy a step down from pure white so it reads softer on black; headings and bold stay bright */
[data-theme="dark"] .prose { color: color-mix(in srgb, var(--fg) 76%, var(--bg)); }
[data-theme="dark"] .prose :deep(:is(h2, h3, strong)) { color: var(--fg); }
.prose :deep(img), .prose :deep(video) { display: block; max-width: 100%; height: auto; margin: 28px 0; border-radius: 12px; }

/* more to read: three plain cards under the article */
.more { min-height: 0; display: block; padding: 0; margin-top: 96px; }
.more h2 { font-size: clamp(28px, 2.8vw, 36px); font-weight: 600; margin-bottom: 28px; }
.more ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 40px 28px; }
.mcard { display: block; text-decoration: none; color: var(--fg); }
.mcover { display: block; overflow: hidden; aspect-ratio: 16 / 9; border-radius: 14px; background: var(--surface); box-shadow: var(--shadow-card); }
.mcover img { display: block; width: 100%; height: 100%; object-fit: cover; transition: scale .7s cubic-bezier(.16, .84, .3, 1); }
.mcard:hover .mcover img, .mcard:focus-visible .mcover img { scale: 1.06; }
.mcard:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; border-radius: 14px; }
.mmeta { display: block; margin-top: 16px; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.mt { display: block; margin-top: 8px; font-family: var(--display); font-size: clamp(20px, 2vw, 24px); font-weight: 600; line-height: 1.2; letter-spacing: -.015em; }
.mt span { background: linear-gradient(var(--accent), var(--accent)) 0 100% / 0 2px no-repeat; transition: background-size .5s cubic-bezier(.2, .8, .2, 1); }
.mcard:hover .mt span, .mcard:focus-visible .mt span { background-size: 100% 2px; }
.ms { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 8px; font-size: 15px; line-height: 1.5; color: var(--muted); }
[data-theme="dark"] .mcover { border-radius: 0; }
@media (prefers-reduced-motion: reduce) { .mcover img, .mt span { transition: none; } }
</style>

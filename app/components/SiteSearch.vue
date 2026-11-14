<script setup lang="ts">
import MiniSearch from 'minisearch'

// Search: the icon grows a pill-shaped field to its left and turns into an X. The whole screen blurs as soon as it opens; with nothing typed yet, the
// recent searches and suggested topics sit under the field, and once the visitor types, results take their place. Scrolling or clicking away closes it. The index is built in the
// browser, which is fast at this size and works on static hosting.
const { data: studies } = await useAsyncData('menu-studies', () => queryCollection('caseStudies').order('order', 'ASC').all())
const sections = useSiteSections()
const site = useSite()
const loaderDone = useState('loaderDone', () => false)
const route = useRoute()
const asset = useAssetUrl()

interface Hit { id: string; title: string; text: string; kind: string; to: string; cover: string; thumb: string }
// every tag the projects carry, with how many projects have it (the Works window has a filter for each)
const workFilters = () => {
  const n = new Map<string, number>()
  for (const p of site.works.projects) for (const t of p.tags) n.set(t, (n.get(t) ?? 0) + 1)
  return [...n]
}
const docs = (): Hit[] => [
  ...(studies.value ?? []).map(c => ({ id: c.path, title: c.title, text: c.summary, kind: optionName('articleCategories', c.shelf), to: c.path, cover: c.cover, thumb: thumbOf(c) })),
  ...workFilters().map(([tag, n]) => ({ id: `filter-${tag}`, title: tag, text: `${n} ${n === 1 ? 'project' : 'projects'}`, kind: 'Filter', to: `/works?f=${encodeURIComponent(tag)}`, cover: '', thumb: '' })),
  ...site.options.articleCategories.map(c => ({ c, n: (studies.value ?? []).filter(x => x.shelf === c.id).length })).filter(x => x.n).map(({ c, n }) => ({ id: `shelf-${c.id}`, title: c.heading || c.name, text: `${n} ${n === 1 ? 'article' : 'articles'}`, kind: 'Category', to: `/case-studies?c=${c.id}`, cover: '', thumb: '' })),
  ...site.works.projects.map(w => ({ id: `work-${w.id}`, title: w.fullTitle, text: `${w.description} ${w.tags.join(' ')}`, kind: 'Project', to: `/works?open=${w.id}`, cover: '', thumb: '' })),
  // the home page's modules: a click scrolls to that section (/#toolkit and so on, see router.options.ts)
  ...site.toolkit.tools.map(t => ({ id: `tool-${t.name}`, title: t.name, text: t.use, kind: 'Tool', to: '/#toolkit', cover: '', thumb: '' })),
  ...site.toolkit.code.map(t => ({ id: `code-${t.name}`, title: t.name, text: `${site.toolkit.codeHeading} ${t.level}`, kind: 'Tool', to: '/#toolkit', cover: '', thumb: '' })),
  ...site.journey.entries.map(e => ({ id: `journey-${e.period}`, title: `${e.role}, ${e.org}`, text: `${e.period}. ${e.blurb}`, kind: 'Journey', to: '/#journey', cover: '', thumb: '' })),
  ...site.process.steps.map(st => ({ id: `process-${st.title}`, title: st.title, text: st.blurb, kind: 'Process', to: '/#process', cover: '', thumb: '' })),
  ...sections.map(s => ({ id: s.to, title: s.label, text: '', kind: 'Page', to: s.to, cover: '', thumb: '' }))
]

const open = ref(false)
const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)
const pill = ref<HTMLElement | null>(null)
const btn = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const typing = computed(() => open.value && query.value.trim().length > 0)
const panel = ref<HTMLElement | null>(null)

// recent searches live in this browser only; suggestions are the project tags used most often (every one of them finds something)
const KEY = 'search-recent'
const recent = ref<string[]>([])
const suggestions = computed(() => {
  return workFilters().sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([t]) => t)
})
function loadRecent() { try { recent.value = JSON.parse(localStorage.getItem(KEY) || '[]').filter((x: unknown) => typeof x === 'string').slice(0, 5) } catch { recent.value = [] } }
function remember(q: string) {
  q = q.trim()
  if (!q) return
  recent.value = [q, ...recent.value.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 5)
  try { localStorage.setItem(KEY, JSON.stringify(recent.value)) } catch { /* private window: it just won't be kept */ }
}
function forget(q?: string) {
  recent.value = q ? recent.value.filter(r => r !== q) : []
  try { localStorage.setItem(KEY, JSON.stringify(recent.value)) } catch { /* ignore */ }
}
function ask(q: string) { query.value = q; input.value?.focus() }

let index: MiniSearch<Hit> | null = null
const results = computed<Hit[]>(() => {
  const q = query.value.trim()
  if (!q) return []
  if (!index) {
    index = new MiniSearch<Hit>({ fields: ['title', 'text', 'kind'], storeFields: ['title', 'text', 'kind', 'to', 'cover', 'thumb'], searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3 }, boostDocument: (_id, _term, stored) => (stored?.kind === 'Filter' || stored?.kind === 'Category' ? 2 : 1) } })
    index.addAll(docs())
  }
  return index.search(q).slice(0, 6) as unknown as Hit[]
})
watch(results, () => { active.value = 0 })

let openedAt = 0 // page scroll position when the search opened

async function show() {
  openedAt = window.scrollY
  loadRecent()
  open.value = true
  await nextTick()
  input.value?.focus()
}
function hide() {
  open.value = false
  query.value = ''
  input.value?.blur() // a closed field must not keep the keyboard, or "/" would type into it instead of reopening search
}
const toggle = () => (open.value ? hide() : show())
function go(h?: Hit) {
  if (!h) return
  remember(query.value)
  hide()
  navigateTo(h.to)
}
function onInputKey(e: KeyboardEvent) {
  const n = results.value.length
  if (e.key === 'ArrowDown' && n) { e.preventDefault(); active.value = (active.value + 1) % n; reveal() }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); active.value = (active.value - 1 + n) % n; reveal() }
  else if (e.key === 'Enter') { e.preventDefault(); go(results.value[active.value]) }
}
// keyboard moves keep the highlighted result in view (the mouse never scrolls the list, so nothing slides under the pointer)
function reveal() { nextTick(() => list.value?.querySelector(`#sr-${active.value}`)?.scrollIntoView({ block: 'nearest' })) }
// "/" or Cmd/Ctrl+K opens it, Esc closes it
function onKey(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') return hide()
  const inField = (e.target as HTMLElement)?.closest('input, textarea, [contenteditable]')
  if (!open.value && !inField && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) { e.preventDefault(); show() }
}
// scrolling the page means they moved on; so does a click anywhere outside the field, button and results
const onScroll = () => { if (open.value && Math.abs(window.scrollY - openedAt) > 40) hide() }
const onDown = (e: PointerEvent) => {
  if (!open.value) return
  const t = e.target as Node
  if (![pill.value, btn.value, list.value, panel.value].some(el => el?.contains(t))) hide()
}
watch(() => route.fullPath, () => { if (open.value) hide() })
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('pointerdown', onDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('pointerdown', onDown)
})
</script>

<template>
  <div v-if="loaderDone" class="search" :class="{ open, typing }">
    <Transition name="veil"><div v-if="open" class="veil" aria-hidden="true" /></Transition>

    <div ref="pill" class="pill" :aria-hidden="!open">
      <svg class="lens" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
      <input
        ref="input" v-model="query" type="search" class="field" placeholder="Search here..." autocomplete="off" spellcheck="false" :tabindex="open ? 0 : -1"
        role="combobox" aria-label="Search the site" aria-controls="search-results" :aria-expanded="results.length > 0"
        :aria-activedescendant="results.length ? `sr-${active}` : undefined" @keydown="onInputKey"
      >
    </div>

    <button ref="btn" type="button" class="btn" :aria-label="open ? 'Close search' : 'Search (press /)'" :aria-expanded="open" @click="toggle">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g class="mag"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></g>
        <g class="x"><path d="M6 6l12 12M18 6L6 18" /></g>
      </svg>
    </button>

    <div v-if="open && !typing && (recent.length || suggestions.length)" ref="panel" class="panel" @mousedown.prevent>
      <div v-if="recent.length" role="group" aria-label="Recent searches">
        <h3 class="head">Recent <button type="button" class="clear" @click="forget()">Clear</button></h3>
        <ul class="rows">
          <li v-for="r in recent" :key="r" class="row">
            <button type="button" class="again" @click="ask(r)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.8" /></svg>{{ r }}
            </button>
            <button type="button" class="drop" :aria-label="`Remove ${r}`" @click="forget(r)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg></button>
          </li>
        </ul>
      </div>
      <div v-if="suggestions.length" role="group" aria-label="Suggested searches">
        <h3 class="head">Try</h3>
        <div class="chips"><button v-for="t in suggestions" :key="t" type="button" class="chip" @click="ask(t)">{{ t }}</button></div>
      </div>
    </div>

    <ul v-if="typing" id="search-results" ref="list" class="results sb-inset" role="listbox" data-lenis-prevent>
      <li
        v-for="(r, i) in results" :id="`sr-${i}`" :key="r.id" role="option" :aria-selected="i === active"
        class="hit" :class="{ on: i === active, 'has-cover': r.cover }" :data-kind="r.kind.toLowerCase()" :style="{ '--i': i }"
        @mouseenter="active = i" @mousedown.prevent="go(r)"
      >
        <img v-if="r.cover" class="thumb" :src="asset(r.thumb)" alt="" width="160" height="90" loading="lazy">
        <span class="kind">{{ r.kind }}</span>
        <span class="title">{{ r.title }}</span>
        <span v-if="r.text" class="text">{{ r.text }}</span>
      </li>
      <li v-if="!results.length" class="none">Nothing found for “{{ query.trim() }}”.</li>
    </ul>
  </div>
</template>

<style scoped>
.search { --r: max(calc(var(--gutter) - 8px), env(safe-area-inset-right)); --top: max(20px, env(safe-area-inset-top)); --w: min(360px, calc(100vw - var(--gutter) * 2 - 104px)); }

/* the search icon, which becomes an X in a round button (like the field it opened) */
.btn {
  position: fixed; z-index: 1250; top: var(--top); right: calc(var(--r) + 48px);
  width: 44px; height: 44px; display: grid; place-items: center; padding: 0; color: var(--fg); background: transparent; border: 1px solid transparent; border-radius: 50%; cursor: pointer;
  transition: color .2s, background-color .3s, border-color .3s, box-shadow .3s; animation: pop .5s .04s cubic-bezier(.3, 1.4, .5, 1) both;
}
@keyframes pop { from { opacity: 0; scale: .6; } }
.btn:hover { color: var(--accent); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.open .btn { background: var(--surface); border-color: var(--line); box-shadow: var(--shadow-card); }
svg { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.btn svg { width: 22px; height: 22px; overflow: visible; }
.mag, .x { transform-origin: 12px 12px; transition: transform .45s cubic-bezier(.3, 1.4, .5, 1), opacity .25s; }
.x { opacity: 0; transform: rotate(-90deg) scale(.4); }
.open .mag { opacity: 0; transform: rotate(90deg) scale(.4); }
.open .x { opacity: 1; transform: none; }

/* the field grows out of the icon, to the left */
.pill {
  position: fixed; z-index: 1250; top: var(--top); right: calc(var(--r) + 48px + 44px + 8px); width: var(--w); height: 44px;
  display: flex; align-items: center; gap: 10px; padding: 0 20px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 999px; box-shadow: var(--shadow-card);
  clip-path: inset(0 0 0 100% round 999px); opacity: 0; pointer-events: none;
  transition: clip-path .5s cubic-bezier(.7, 0, .2, 1), opacity .2s .3s;
}
.open .pill { clip-path: inset(0 round 999px); opacity: 1; pointer-events: auto; transition: clip-path .55s cubic-bezier(.16, .84, .3, 1), opacity .15s; }
.lens { flex: none; width: 16px; height: 16px; color: var(--muted); opacity: .7; }
.field { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: var(--fg); background: none; border: 0; outline: none; }
.field::placeholder { color: var(--muted); opacity: .8; }
.field::-webkit-search-cancel-button { display: none; }

/* once there is a query: everything but the search blurs */
.veil { position: fixed; inset: 0; z-index: 1240; background: color-mix(in srgb, var(--bg) 35%, transparent); backdrop-filter: blur(14px) saturate(1.1); -webkit-backdrop-filter: blur(14px) saturate(1.1); }
.veil-enter-active, .veil-leave-active { transition: opacity .35s ease; }
.veil-enter-from, .veil-leave-to { opacity: 0; }

.results {
  position: fixed; z-index: 1250; top: calc(var(--top) + 42px); right: calc(var(--r) + 48px);
  width: min(460px, calc(100vw - var(--gutter) * 2)); max-height: calc(100svh - var(--top) - 66px); overflow-y: auto; overscroll-behavior: contain;
  list-style: none; margin: 0; padding: 14px 0; display: grid; gap: 10px; --sb-top: 14px; --sb-bottom: 14px;
  /* cards melt into the screen at the top and bottom instead of being cut off */
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 14px, #000 calc(100% - 14px), transparent); mask-image: linear-gradient(to bottom, transparent, #000 14px, #000 calc(100% - 14px), transparent);
}
.hit { cursor: pointer; animation: rise .4s cubic-bezier(.16, .84, .3, 1) both; animation-delay: calc(var(--i) * 35ms); }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } }
.kind { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; }
.title { display: block; font-size: 19px; font-weight: 500; line-height: 1.2; }
.text { display: block; margin-top: 4px; font-size: 14px; line-height: 1.45; color: var(--muted); }
.results .hit.has-cover { padding-right: 116px; }
.thumb { position: absolute; z-index: 1; top: 50%; right: 16px; translate: 0 -50%; width: 84px; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); }
.none { padding: 16px 20px; color: var(--muted); background: var(--surface); border-radius: 14px; }

/* LIGHT: paper cards with real colour tags, a soft shadow and a glossy edge */
[data-theme="light"] .hit { position: relative; padding: 16px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-card); transition: border-color .2s; }
[data-theme="light"] .hit::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: var(--gloss); pointer-events: none; opacity: .6; }
[data-theme="light"] .hit.on { border-color: var(--accent); }
[data-theme="light"] .kind { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; color: #fff; background: var(--muted); }
[data-theme="light"] [data-kind="work"] .kind { background: var(--c-green); }
[data-theme="light"] [data-kind="craft"] .kind { background: var(--c-blue); }
[data-theme="light"] [data-kind="opinion"] .kind { background: var(--c-purple); }
[data-theme="light"] [data-kind="page"] .kind { background: var(--c-yellow); color: #16161b; }

/* DARK: the same pill and cards, quieter: dark surfaces, no shadows, orange-ramp tags. The veil is the one blur dark keeps: the whole screen softens behind the search */
[data-theme="dark"] .veil { background: rgba(10, 6, 5, .5); -webkit-backdrop-filter: blur(14px) !important; backdrop-filter: blur(14px) !important; }
[data-theme="dark"] .pill, [data-theme="dark"] .open .btn, [data-theme="dark"] .hit, [data-theme="dark"] .none { box-shadow: none; }
[data-theme="dark"] .hit { position: relative; padding: 16px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; transition: border-color .2s; }
[data-theme="dark"] .hit.on { border-color: var(--accent); }
[data-theme="dark"] .kind { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; color: var(--ramp-1); background: color-mix(in srgb, var(--ramp-3) 18%, transparent); }
[data-theme="dark"] [data-kind="craft"] .kind { color: var(--ramp-2); background: color-mix(in srgb, var(--ramp-4) 22%, transparent); }
[data-theme="dark"] [data-kind="opinion"] .kind { color: var(--ramp-3); background: color-mix(in srgb, var(--ramp-5) 28%, transparent); }
[data-theme="dark"] [data-kind="page"] .kind { color: var(--muted); background: color-mix(in srgb, var(--muted) 14%, transparent); }

/* nothing typed yet: recent searches and suggested topics, in the same place the results will appear */
.panel {
  position: fixed; z-index: 1250; top: calc(var(--top) + 56px); right: calc(var(--r) + 48px); width: min(460px, calc(100vw - var(--gutter) * 2));
  padding: 6px 8px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-card); animation: rise .35s cubic-bezier(.16, .84, .3, 1) both;
}
[data-theme="dark"] .panel { box-shadow: none; }
.head { display: flex; align-items: center; justify-content: space-between; margin: 10px 12px 6px; font: 500 11px/1 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.clear { padding: 4px 6px; margin: -4px -6px; font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--muted); background: none; border: 0; border-radius: 6px; cursor: pointer; transition: color .2s; }
.clear:hover { color: var(--accent); }
.rows { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; border-radius: 10px; transition: background-color .2s; }
.row:hover { background: color-mix(in srgb, var(--fg) 6%, transparent); }
.again { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 9px 12px; font: inherit; font-size: 15px; color: var(--fg); text-align: left; background: none; border: 0; cursor: pointer; }
.again svg, .drop svg { flex: none; width: 15px; height: 15px; color: var(--muted); }
.drop { flex: none; display: grid; place-items: center; width: 30px; height: 30px; margin-right: 6px; padding: 0; background: none; border: 0; border-radius: 50%; cursor: pointer; opacity: 0; transition: opacity .2s, background-color .2s; }
.row:hover .drop, .drop:focus-visible { opacity: 1; }
.drop:hover { background: color-mix(in srgb, var(--fg) 10%, transparent); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 12px; }
.chip { padding: 6px 14px; font: inherit; font-size: 14px; color: var(--muted); background: none; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; transition: color .2s, border-color .2s; }
.chip:hover { color: var(--accent); border-color: var(--accent); }
.again:focus-visible, .chip:focus-visible, .clear:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
@media (hover: none) { .drop { opacity: 1; } }

/* phones: results span the screen between the gutters instead of hanging off the left edge */
@media (max-width: 600px) { .panel, .results { left: var(--gutter); right: var(--gutter); width: auto; } }

@media (prefers-reduced-motion: reduce) {
  .btn, .hit { animation: none; }
  .pill, .open .pill, .mag, .x, .veil-enter-active, .veil-leave-active { transition: none; }
}
</style>

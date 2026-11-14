<script setup lang="ts">
// The Works: every project is a file in a Finder-style window (drag, sort, filter, list view; double-click opens a project window).
// mode "window" = the framed window on the home page, mode "page" = the page itself is the window (/works).
// The window's behaviour lives in app/lib/works/engine.js, loaded in the browser only; this file is just its markup.
const props = withDefaults(defineProps<{ mode?: 'window' | 'page' }>(), { mode: 'window' })
const root = ref<HTMLElement | null>(null)
let destroy: ((() => void) & { show: (q: { filter?: string; open?: number | string }) => void }) | null = null
let gone = false

// the projects from content/works.json, in the shape the engine reads (the file type's ending, e.g. "inf", is its key)
const { works, options } = useSite()
const types = options.workTypes
const extOf = (id: string) => types.find(t => t.id === id)?.ext || id
const data = {
  EXT: Object.fromEntries(types.map(t => [t.ext || t.id, t.name])),
  DATA: works.projects.map(p => ({ id: p.id, ext: extOf(p.fileType), short: p.title, discreet: p.fullTitle || p.title, nda: p.nda !== false, tags: p.tags, role: p.role, tool: p.tools, snippet: p.description, model: p.model })),
  EXTRA: Object.fromEntries(works.projects.filter(p => p.challenge || p.approach || p.features.length || p.deliverables.length || p.highlights.length)
    .map(p => [p.id, { c: p.challenge, a: p.approach, f: p.features, d: p.deliverables, g: p.highlights }]))
}

// on the /works page the filter lives in the address (?f=Web App) and ?open=<id> opens that project's window, so a link or a search result can land on either
const page = props.mode === 'page'
const route = useRoute()
const router = useRouter()
const one = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
const fromUrl = () => ({ filter: one(route.query.f) ?? 'all', open: one(route.query.open) })
function consumeOpen() { if (route.query.open) router.replace({ query: { ...route.query, open: undefined } }) }

onMounted(async () => {
  const { mountWorks } = await import('~/lib/works/engine')
  if (gone || !root.value) return
  destroy = mountWorks(root.value, {
    mode: props.mode,
    data,
    initial: page ? fromUrl() : undefined,
    onFilter: page ? (key: string) => { if ((one(route.query.f) ?? 'all') !== key) router.replace({ query: key === 'all' ? {} : { f: key } }) } : undefined,
    onOpenPage: () => navigateTo('/works'), // green light on the home page's window
    nextSection: () => root.value?.closest('section')?.nextElementSibling ?? null // red light: on to the next frame
  })
  if (page) setTimeout(consumeOpen, 400)
})
if (page) watch(() => route.query, () => { if (destroy) { destroy.show(fromUrl()); consumeOpen() } })
onBeforeUnmount(() => { gone = true; destroy?.(); destroy = null })
</script>

<template>
  <div ref="root" class="wk" :data-mode="mode">
    <div id="win" class="win" role="region" aria-label="Works" data-view="icons">
      <aside id="side" class="side" data-lenis-prevent />

      <div class="main">
        <div class="stage">
          <div class="toolbar">
            <button id="filterBtn" class="pill icon" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Show Works filters"><svg viewBox="0 0 12 12"><path d="M4.5 2.5L8 6l-3.5 3.5" /></svg></button>
            <h3 id="title" class="title"><span id="titleText">All Works</span></h3>
            <div class="spacer" />

            <div id="access" class="seg acc" role="group" aria-label="Show works" hidden>
              <button type="button" data-acc="all" aria-pressed="true">All</button>
              <button type="button" data-acc="open" aria-pressed="false">Open</button>
              <button type="button" data-acc="nda" aria-pressed="false">NDA</button>
            </div>

            <div class="seg" role="group" aria-label="View">
              <button id="vIcons" type="button" aria-pressed="true" aria-label="Icon view"><svg viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1.2" /><rect x="9" y="2" width="5" height="5" rx="1.2" /><rect x="2" y="9" width="5" height="5" rx="1.2" /><rect x="9" y="9" width="5" height="5" rx="1.2" /></svg></button>
              <button id="vList" type="button" aria-pressed="false" aria-label="List view"><svg viewBox="0 0 16 16"><path d="M5.5 4h8M5.5 8h8M5.5 12h8" /><circle cx="2.5" cy="4" r=".6" /><circle cx="2.5" cy="8" r=".6" /><circle cx="2.5" cy="12" r=".6" /></svg></button>
            </div>

            <div class="menu-wrap">
              <button id="sortBtn" class="pill" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Sort"><span class="sort-label">Sort</span><svg class="chev" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5" /></svg></button>
              <div id="wkSortMenu" class="menu" role="menu" />
            </div>
          </div>

          <div class="body">
            <div id="canvas" class="canvas" data-lenis-prevent><div id="field" class="field" /></div>
            <div id="list" class="list" aria-label="Works list" data-lenis-prevent />
          </div>
        </div>

        <div class="statusbar">
          <span id="count">{{ works.projects.length }} items</span>
          <span id="selname" class="sel" />
          <button id="cleanup" class="linkbtn" type="button">Clean up <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 2.8L8.6 7.4" /><path d="M7 6.6l2.4 2.4c.3.3.3.8 0 1.1l-3.1 3.3H2.7c1.5-1.4 2-2.9 2-4.4z" /><path d="M5.2 10.6l1.3 1.3" /></svg></button>
        </div>
      </div>
    </div>

    <!-- a project's own window -->
    <div id="qlBack" class="ql-back" data-lenis-prevent>
      <div class="ql" role="dialog" aria-modal="true" aria-labelledby="qlTitle">
        <div class="ql-top">
          <div id="qlLights" class="lights" role="group" aria-label="Window controls" />
          <div id="qlName" class="ql-name" />
          <div class="ql-nav"><button id="qlPrev" class="ql-chev" type="button" aria-label="Previous project"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L4 6l3.5 3.5" /></svg></button><button id="qlNext" class="ql-chev" type="button" aria-label="Next project"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6 4.5 9.5" /></svg></button></div>
        </div>
        <div class="ql-body sb-inset">
          <div class="ql-main">
            <div class="ql-left">
              <h3 id="qlTitle" />
              <div id="qlTags" class="ql-tags" />
              <dl class="ql-facts">
                <div><dt>Client</dt><dd><span id="qlClient" /><NuxtLink class="nda" to="/nda">NDA</NuxtLink></dd></div>
                <div><dt>Role</dt><dd id="qlRole" /></div>
                <div><dt>Tools</dt><dd id="qlTool" /></div>
              </dl>
            </div>
            <div class="ql-art"><canvas id="qlCanvas" aria-label="50 by 50 light grid. Drag to turn the model." role="img" /></div>
          </div>
          <div class="ql-desc">
            <p id="qlSnippet" />
            <div id="qlNote" class="note" />
          </div>
          <div id="qlExtra" class="ql-more" />
          <button id="qlDone" class="pill ql-done" type="button">Done</button>
        </div>
      </div>
      <div class="ql-mnav"><button id="qlPrev2" type="button" aria-label="Previous project"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L4 6l3.5 3.5" /></svg></button><button id="qlNext2" type="button" aria-label="Next project"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6 4.5 9.5" /></svg></button></div>
    </div>
  </div>
</template>


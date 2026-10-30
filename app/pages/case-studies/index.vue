<script setup lang="ts">
// newest first: new articles get the next order number, so the highest is the latest and the oldest sit at the end
const { data: studies } = await useAsyncData('studies', () => queryCollection('caseStudies').order('order', 'DESC').all())
// every article in one continuous grid (left to right, top to bottom), with a filter per category under the title
const { options, caseStudiesPage } = useSite()
const asset = useAssetUrl()
const route = useRoute()
const router = useRouter()
usePageSeo('case-studies')

const all = computed(() => studies.value ?? [])
const shelves = computed(() => options.articleCategories.filter(c => all.value.some(x => x.shelf === c.id))) // empty categories stay hidden
const shelfName = (id: string) => options.articleCategories.find(c => c.id === id)?.name ?? id
const filters = computed(() => [
  { id: 'all', label: 'All', count: all.value.length },
  ...shelves.value.map(s => ({ id: s.id, label: s.heading || s.name, count: all.value.filter(x => x.shelf === s.id).length }))
])

// the filter lives in the URL (?c=craft) so a filtered list can be shared
const active = computed(() => (filters.value.some(f => f.id === route.query.c) ? String(route.query.c) : 'all'))
const pick = (id: string) => router.replace({ query: id === 'all' ? {} : { c: id } })
const shown = computed(() => (active.value === 'all' ? all.value : all.value.filter(x => x.shelf === active.value)))
const blurb = computed(() => shelves.value.find(s => s.id === active.value)?.blurb ?? '')

// the accent pill slides under whichever filter is active
const chips = ref<HTMLElement[]>([])
const pill = ref({ x: 0, w: 0, on: false })
const placePill = () => {
  const el = chips.value[filters.value.findIndex(f => f.id === active.value)]
  if (el) pill.value = { x: el.offsetLeft, w: el.offsetWidth, on: true }
}
watch(active, () => nextTick(placePill))
onMounted(() => { placePill(); document.fonts?.ready.then(placePill); window.addEventListener('resize', placePill) })
onBeforeUnmount(() => window.removeEventListener('resize', placePill))

// a leaving card is lifted out of the grid (absolute) so the others can glide; keep it where and as wide as it was
function pin(el: Element) {
  const li = el as HTMLElement
  Object.assign(li.style, { left: `${li.offsetLeft}px`, top: `${li.offsetTop}px`, width: `${li.offsetWidth}px` })
}

// hover: the card leans toward the pointer, and a "Read" badge chases it over the cover on a spring (it trails, then catches up)
const badge = { el: null as HTMLElement | null, tx: 0, ty: 0, x: 0, y: 0, raf: 0 }
function chase() {
  const b = badge
  if (!b.el) return
  const dx = (b.tx - b.x) * .16, dy = (b.ty - b.y) * .16
  b.x += dx; b.y += dy
  b.el.style.setProperty('--bx', `${b.x}px`)
  b.el.style.setProperty('--by', `${b.y}px`)
  b.el.style.setProperty('--bt', `${Math.max(-18, Math.min(18, dx * 1.4))}deg`) // leans into the direction it is pulled
  b.raf = requestAnimationFrame(chase)
}
function lean(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  const card = e.currentTarget as HTMLElement
  const r = card.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
  card.style.setProperty('--rx', `${(.5 - y) * 6}deg`)
  card.style.setProperty('--ry', `${(x - .5) * 8}deg`)
  badge.tx = e.clientX - r.left
  badge.ty = e.clientY - r.top
  if (badge.el !== card) { // just arrived: start the badge right under the pointer
    cancelAnimationFrame(badge.raf)
    Object.assign(badge, { el: card, x: badge.tx, y: badge.ty })
    chase()
  }
}
function rest(e: PointerEvent) {
  const card = e.currentTarget as HTMLElement
  card.style.setProperty('--rx', '0deg')
  card.style.setProperty('--ry', '0deg')
  card.style.setProperty('--bt', '0deg')
  if (badge.el === card) { cancelAnimationFrame(badge.raf); badge.el = null }
}
onBeforeUnmount(() => cancelAnimationFrame(badge.raf))
</script>

<template>
  <main class="studies">
    <div class="wrap">
      <h1>{{ caseStudiesPage.heading }}</h1>

      <div class="filters" role="group" aria-label="Filter by category">
        <span class="pill" :class="{ on: pill.on }" :style="{ translate: `${pill.x}px 0`, width: `${pill.w}px` }" aria-hidden="true" />
        <button
          v-for="f in filters" :key="f.id" ref="chips" type="button" class="chip"
          :class="{ active: active === f.id }" :aria-pressed="active === f.id" @click="pick(f.id)"
        >{{ f.label }}<sup>{{ f.count }}</sup></button>
      </div>
      <Transition name="blurb" mode="out-in"><p :key="active" class="blurb">{{ blurb || ' ' }}</p></Transition>

      <TransitionGroup tag="ul" name="card" class="grid" @before-leave="pin">
        <li v-for="(c, i) in shown" :key="c.path" :style="{ '--d': `${Math.min(i, 8) * 50}ms` }">
          <NuxtLink :to="c.path" class="card" @pointermove="lean" @pointerleave="rest">
            <span class="cover">
              <img v-if="c.cover" :src="asset(c.cover)" alt="" width="1600" height="900" loading="lazy">
              <span class="read" aria-hidden="true">
                <svg class="ring" viewBox="0 0 100 100">
                  <path :id="`ring-${i}`" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0" fill="none" />
                  <text><textPath :href="`#ring-${i}`" textLength="232" lengthAdjust="spacing">READ READ READ READ </textPath></text>
                </svg>
                <span class="arrow"><b>→</b></span>
              </span>
            </span>
            <span class="meta">{{ shelfName(c.shelf) }}</span>
            <span class="t"><span>{{ c.title }}</span></span>
            <span class="s">{{ c.summary }}</span>
          </NuxtLink>
        </li>
      </TransitionGroup>
    </div>
  </main>
</template>

<style scoped>
.studies { padding: 130px 0 96px; }
h1 { font-size: clamp(44px, 8vw, 104px); letter-spacing: -.02em; margin-bottom: 28px; }

/* filters: text chips with counts; one accent pill slides between them */
.filters { position: relative; display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 999px; }
.pill { position: absolute; top: 4px; left: 0; bottom: 4px; border-radius: 999px; background: var(--accent); opacity: 0; transition: translate .5s cubic-bezier(.3, 1.3, .5, 1), width .5s cubic-bezier(.3, 1.3, .5, 1), opacity .2s; }
.pill.on { opacity: 1; }
.chip {
  position: relative; z-index: 1; padding: 9px 18px; border: 0; border-radius: 999px; background: none; cursor: pointer;
  font: 500 15px/1 var(--font); color: var(--muted); transition: color .25s;
}
.chip:hover { color: var(--fg); }
.chip.active { color: var(--on-accent); }
.chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.chip sup { margin-left: 3px; font-size: 10px; vertical-align: .7em; opacity: .7; font-variant-numeric: tabular-nums; }
.blurb { margin: 14px 0 40px; color: var(--muted); min-height: 1.5em; }
.blurb-enter-active, .blurb-leave-active { transition: opacity .2s, translate .25s; }
.blurb-enter-from { opacity: 0; translate: 0 6px; }
.blurb-leave-to { opacity: 0; translate: 0 -6px; }

/* one continuous grid, left to right, top to bottom */
.grid { position: relative; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 56px 28px; }
.grid li { perspective: 900px; }
/* filtering: cards leave by shrinking away, the rest glide to their new places, newcomers rise in one after another */
.card-move { transition: transform .6s cubic-bezier(.2, .8, .2, 1); }
.card-enter-active { transition: opacity .5s var(--d), translate .6s cubic-bezier(.2, .8, .2, 1) var(--d), filter .5s var(--d); }
.card-enter-from { opacity: 0; translate: 0 32px; filter: blur(6px); }
.card-leave-active { position: absolute; transition: opacity .25s, scale .3s; }
.card-leave-to { opacity: 0; scale: .92; }

/* the card: no box, just the picture and words; it leans toward the pointer */
.card {
  --rx: 0deg; --ry: 0deg;
  display: block; text-decoration: none; color: var(--fg); transform: rotateX(var(--rx)) rotateY(var(--ry)); transform-style: preserve-3d;
  transition: transform .5s cubic-bezier(.2, .8, .2, 1);
}
.card:hover { transition-duration: .15s; }
.card:focus-visible { outline: none; }
.cover {
  position: relative; display: block; overflow: hidden; aspect-ratio: 16 / 9; border-radius: 14px; background: var(--surface);
  box-shadow: var(--shadow-card);
}
.cover img { display: block; width: 100%; height: 100%; object-fit: cover; transition: scale .7s cubic-bezier(.16, .84, .3, 1), filter .4s; }
.card:hover .cover img, .card:focus-visible .cover img { scale: 1.07; }
.card:focus-visible .cover { outline: 2px solid var(--accent); outline-offset: 4px; }
/* the badge: an orange disc with READ spinning round its rim and an arrow that keeps shooting off and coming back.
   It pops in with a twist, chases the pointer on a spring, and leans the way it is pulled. Keyboard focus parks it in the middle. */
.read {
  --bt: 0deg;
  position: absolute; z-index: 1; left: var(--bx, 50%); top: var(--by, 50%); translate: -50% -50%; scale: 0; rotate: -90deg;
  display: grid; place-items: center; width: 104px; height: 104px; border-radius: 50%; background: var(--accent); color: var(--on-accent); pointer-events: none;
  transition: scale .55s cubic-bezier(.3, 1.5, .5, 1), rotate .55s cubic-bezier(.3, 1.5, .5, 1);
}
.card:hover .read, .card:focus-visible .read { scale: 1; rotate: var(--bt); }
.card:hover .read { transition-duration: .55s, .25s; }
.ring { position: absolute; inset: 0; width: 100%; height: 100%; animation: spin 7s linear infinite paused; }
.ring text { font: 600 10.5px var(--font); letter-spacing: .1em; fill: currentColor; }
.card:hover .ring, .card:focus-visible .ring { animation-play-state: running; }
@keyframes spin { to { rotate: 1turn; } }
.arrow { display: block; overflow: hidden; font: 600 26px/1 var(--font); }
.arrow b { display: block; font-weight: inherit; }
.card:hover .arrow b, .card:focus-visible .arrow b { animation: shoot 1.4s cubic-bezier(.7, 0, .3, 1) .35s infinite; }
@keyframes shoot {
  0%, 35% { translate: 0 0; }
  60% { translate: 120% 0; }
  60.1% { translate: -120% 0; }
  85%, 100% { translate: 0 0; }
}

.meta { display: block; margin-top: 18px; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
/* title: an accent underline draws in under it */
.t { display: block; margin-top: 10px; font-family: var(--display); font-size: clamp(22px, 2.2vw, 27px); font-weight: 600; line-height: 1.2; letter-spacing: -.015em; }
.t span { background: linear-gradient(var(--accent), var(--accent)) 0 100% / 0 2px no-repeat; transition: background-size .5s cubic-bezier(.2, .8, .2, 1); }
.card:hover .t span, .card:focus-visible .t span { background-size: 100% 2px; }
.s { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 10px; font-size: 15px; line-height: 1.5; color: var(--muted); }

/* dark world: square corners on the pictures, like pixels (the badge stays round in both worlds) */
[data-theme="dark"] .cover { border-radius: 0; }

/* phones: no pointer to follow, so the badge stays hidden and nothing leans */
@media (hover: none) { .read { display: none; } .card { transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .card, .cover img, .read, .pill, .card-move, .card-enter-active, .card-leave-active { transition: none; }
  .ring, .arrow b { animation: none !important; }
}
</style>

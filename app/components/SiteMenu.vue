<script setup lang="ts">
// The creative menu: a full-screen mega menu over the categories of writing, plus the main sections of the home page.
const { caseStudies } = await useAsyncData('menu-studies', () => queryCollection('caseStudies').order('order', 'ASC').all()).then(r => ({ caseStudies: r.data }))
const open = ref(false)
const loaderDone = useState('loaderDone', () => false)
const route = useRoute()

const inShelf = (k: string) => (caseStudies.value ?? []).filter(c => c.shelf === k)
const { options, header } = useSite()
const shelves = computed(() => options.articleCategories.filter(c => inShelf(c.id).length)) // empty categories stay hidden
const sections = useSiteSections()

const close = () => { open.value = false }
watch(() => route.fullPath, close)
watch(open, (v) => { if (import.meta.client) document.documentElement.style.overflow = v ? 'hidden' : '' })
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <!-- appears only once the loader is done -->
  <div v-if="loaderDone" class="topfade" aria-hidden="true" />
  <button v-if="loaderDone" class="menu-btn" :class="{ open }" type="button" :aria-expanded="open" aria-controls="mega" :aria-label="open ? 'Close menu' : 'Open menu'" @click="open = !open">
    <span class="bars" aria-hidden="true"><i /><i /></span>
  </button>
  <NuxtLink v-if="loaderDone" to="/" class="logo" :aria-label="`${header.logo}, home`" @click="close">{{ header.logo }}</NuxtLink>

  <nav v-if="open" id="mega" class="mega" aria-label="Main">
    <div class="wrap grid">
      <div v-for="s in shelves" :key="s.id" class="col">
        <p class="eyebrow">{{ s.heading || s.name }}</p>
        <ul>
          <li v-for="c in inShelf(s.id)" :key="c.path"><NuxtLink :to="c.path">{{ c.title }}</NuxtLink></li>
        </ul>
      </div>
      <div class="col">
        <p class="eyebrow">{{ header.siteHeading }}</p>
        <ul>
          <li v-for="l in sections" :key="l.to"><NuxtLink :to="l.to">{{ l.label }}</NuxtLink></li>
          <li><NuxtLink to="/case-studies">{{ header.allCaseStudies }}</NuxtLink></li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* a soft band behind the fixed header icons, so scrolling text never sits right under them */
.topfade { position: fixed; z-index: 1150; top: 0; left: 0; right: 0; height: calc(84px + env(safe-area-inset-top)); pointer-events: none; background: linear-gradient(var(--bg) 35%, color-mix(in srgb, var(--bg) 0%, transparent)); animation: fadein .6s ease both; }
@keyframes fadein { from { opacity: 0; } }
.menu-btn {
  position: fixed; z-index: 1200; top: max(20px, env(safe-area-inset-top)); left: max(calc(var(--gutter) - 8px), env(safe-area-inset-left));
  width: 48px; height: 44px; display: grid; place-items: center; padding: 0; cursor: pointer; color: var(--fg);
  background: none; border: 0; transition: color .2s; animation: pop .5s cubic-bezier(.3, 1.4, .5, 1) both;
}
@keyframes pop { from { opacity: 0; scale: .6; } }
.menu-btn:hover, .menu-btn.open { color: var(--accent); }
.menu-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
.logo {
  position: fixed; z-index: 1200; top: max(20px, env(safe-area-inset-top)); left: calc(max(calc(var(--gutter) - 8px), env(safe-area-inset-left)) + 56px);
  height: 44px; display: flex; align-items: center; font-family: var(--display); font-weight: 800; font-size: 18px; letter-spacing: -.01em; line-height: 1;
  color: var(--fg); text-decoration: none; transition: color .2s; animation: pop .5s .08s cubic-bezier(.3, 1.4, .5, 1) both;
}
.logo:hover, .logo:focus-visible { color: var(--accent); outline: none; }
/* two bars: the lower one is shorter and slides out on hover; when open they cross into an X */
.bars { position: relative; width: 30px; height: 12px; }
.bars i { position: absolute; left: 0; height: 2.5px; border-radius: 3px; background: currentColor; transition: transform .45s cubic-bezier(.3, 1.4, .5, 1), width .35s cubic-bezier(.3, 1.4, .5, 1); }
.bars i:nth-child(1) { top: 0; width: 30px; }
.bars i:nth-child(2) { bottom: 0; width: 18px; }
.menu-btn:hover .bars i:nth-child(2) { width: 30px; }
.open .bars i:nth-child(1) { transform: translateY(4.75px) rotate(45deg); }
.open .bars i:nth-child(2) { transform: translateY(-4.75px) rotate(-45deg); width: 30px; }
/* dark world: square ends, and everything moves in hard steps like pixels */
[data-theme="dark"] .menu-btn, [data-theme="dark"] .logo { animation-timing-function: steps(4); }
[data-theme="dark"] .bars i { border-radius: 0; transition-timing-function: steps(4); }
@media (prefers-reduced-motion: reduce) { .menu-btn, .logo { animation: none; } .bars i { transition: none; } }

.mega { position: fixed; inset: 0; z-index: 1100; overflow-y: auto; background: var(--bg) var(--bg-image); padding: 110px 0 48px; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px 32px; }
ul { list-style: none; margin: 0; padding: 0; }
li a { display: block; padding: 6px 0; text-decoration: none; font-size: 17px; line-height: 1.35; transition: color .2s; }
li a:hover { color: var(--accent); }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
</style>

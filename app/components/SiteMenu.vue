<script setup lang="ts">
// The menu: a full-frame sheet that sweeps open from the left and folds back to the left. Its moving edge bows under the "force" of the motion,
// then settles flat. Two layers: an accent sheet leads, the page-coloured sheet carrying the links follows.
const open = ref(false) // what the button says
const shown = ref(false) // whether the sheets are mounted (stays true while they sweep back)
const ready = ref(false) // links rise in once the sheet has mostly arrived
const loaderDone = useState('loaderDone', () => false)
const route = useRoute()

const { header, footer, profile } = useSite()
const links = useSiteSections()
// the small links: the not-so-important page and the accounts
const small = computed(() => [
  { label: footer.legalLink, to: '/legal' },
  ...profile.links.map(l => ({ label: l.label, href: l.href })),
  { label: profile.email, href: `mailto:${profile.email}` }
])
const chars = (s: string) => [...s].map(c => (c === ' ' ? '\u00a0' : c))
const isHere = (to: string) => !to.includes('#') && (to === '/' ? route.path === '/' : route.path.startsWith(to))

const accent = ref<HTMLElement>()
const sheet = ref<HTMLElement>()
const DUR = 520 // ms per sheet
const LAG = 70 // ms between the two sheets
const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
let raf = 0

// the edge sits at x; its middle bows by bulge in the direction of travel (a quadratic curve reaches half its control offset)
const clip = (x: number, b: number, h: number) => `path('M0 0 L${x} 0 Q${x + b} ${h / 2} ${x} ${h} L0 ${h} Z')`

function sweep(dir: 'in' | 'out') {
  cancelAnimationFrame(raf)
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const layers = dir === 'in' ? [accent.value, sheet.value] : [sheet.value, accent.value]
  const w = innerWidth, h = innerHeight
  const force = Math.min(w * .3, 280) * (dir === 'in' ? 1 : -1)
  const t0 = performance.now()
  const total = still ? 0 : DUR + LAG
  const tick = (now: number) => {
    const t = now - t0
    layers.forEach((el, i) => {
      if (!el) return
      const p = still ? 1 : Math.min(Math.max((t - i * LAG) / DUR, 0), 1)
      const x = (dir === 'in' ? ease(p) : 1 - ease(p)) * w
      el.style.clipPath = clip(x, Math.sin(Math.PI * p) * force, h) // strongest mid-sweep, flat at rest
    })
    if (dir === 'in' && t > LAG + DUR * .4) ready.value = true
    if (t < total) { raf = requestAnimationFrame(tick); return }
    if (dir === 'in') layers.forEach(el => el && (el.style.clipPath = 'none')) // flat and free to resize
    else { shown.value = false; ready.value = false }
  }
  raf = requestAnimationFrame(tick)
}

watch(open, async (v) => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = v ? 'hidden' : ''
  if (v) {
    shown.value = true
    await nextTick()
    sweep('in')
  } else sweep('out') // the links stay put and fold away with their sheet
})

const close = () => { open.value = false }
// a click anywhere on the sheet that isn't a link closes it
const onSheetClick = (e: MouseEvent) => { if (!(e.target as Element).closest('a')) close() }
watch(() => route.fullPath, close)
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf) })
</script>

<template>
  <!-- appears only once the loader is done -->
  <div v-if="loaderDone" class="topfade" :class="{ hide: shown }" aria-hidden="true" />
  <button v-if="loaderDone" class="menu-btn" :class="{ open }" type="button" :aria-expanded="open" aria-controls="menu" :aria-label="open ? 'Close menu' : 'Open menu'" @click="open = !open">
    <span class="bars" aria-hidden="true"><i /><i /></span>
  </button>
  <NuxtLink v-if="loaderDone" to="/" class="logo" :aria-label="`${header.logo}, home`" @click="close">{{ header.logo }}</NuxtLink>

  <div v-if="shown" id="menu" class="menu" :class="{ ready }">
    <div ref="accent" class="layer accent" style="clip-path: inset(0 100% 0 0)" aria-hidden="true" />
    <nav ref="sheet" class="layer sheet" style="clip-path: inset(0 100% 0 0)" aria-label="Main" @click="onSheetClick">
      <ul class="big">
        <li v-for="(l, i) in links" :key="l.to" :style="{ '--n': i }">
          <NuxtLink :to="l.to" :class="{ here: isHere(l.to) }" :aria-label="l.label" @click="close">
            <span v-for="(c, j) in chars(l.label)" :key="j" class="ch" :style="{ '--i': j }" aria-hidden="true">{{ c }}</span>
          </NuxtLink>
        </li>
      </ul>

      <div class="small" :style="{ '--n': links.length }">
        <ul>
          <li v-for="l in small" :key="l.label">
            <NuxtLink v-if="l.to" :to="l.to" @click="close">{{ l.label }}</NuxtLink>
            <a v-else :href="l.href" :target="l.href.startsWith('http') ? '_blank' : undefined" rel="noopener">{{ l.label }}</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* a soft band behind the fixed header icons, so scrolling text never sits right under them */
.topfade { position: fixed; z-index: 1150; top: 0; left: 0; right: 0; height: calc(84px + env(safe-area-inset-top)); pointer-events: none; background: linear-gradient(var(--bg) 35%, color-mix(in srgb, var(--bg) 0%, transparent)); animation: fadein .6s ease both; transition: opacity .3s; }
.topfade.hide { opacity: 0; }
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

/* ── the sheets ── */
.menu { position: fixed; inset: 0; z-index: 1100; }
.layer { position: absolute; inset: 0; will-change: clip-path; }
.accent { background: var(--accent); }
/* links sit on the left, in line with the logo, and centred top to bottom: a short trip from the button */
.sheet {
  display: flex; flex-direction: column; justify-content: safe center; align-items: flex-start; overflow-y: auto; overscroll-behavior: contain; background: var(--bg) var(--bg-image);
  padding: 96px var(--gutter) 48px calc(max(calc(var(--gutter) - 8px), env(safe-area-inset-left)) + 56px);
}
/* phones: the links sit halfway between the page's edge and the logo (they were a full logo-width in) */
@media (max-width: 700px) {
  .sheet { padding-left: calc(max(var(--gutter), env(safe-area-inset-left)) + 24px); }
}

.big { list-style: none; margin: 0; padding: 0; }

/* small links: carry on straight under the big ones, same entrance, just smaller */
.small { margin-top: clamp(16px, 3vh, 32px); opacity: 0; translate: -40px 0; filter: blur(8px); transition: opacity .45s, translate .6s cubic-bezier(.2, .8, .2, 1), filter .45s; transition-delay: calc(var(--n) * 45ms); }
.ready .small { opacity: 1; translate: 0 0; filter: none; }
.small ul { list-style: none; margin: 0; padding: 0; }
.small a { display: inline-block; padding: 5px 0; font-size: 15px; color: var(--muted); text-decoration: none; background: linear-gradient(var(--accent), var(--accent)) 0 100% / 0 1px no-repeat; transition: color .2s, background-size .35s cubic-bezier(.2, .8, .2, 1); }
.small a:hover, .small a:focus-visible { color: var(--fg); background-size: 100% 1px; outline: none; }
.big a {
  display: inline-block; padding: .06em 0; text-decoration: none; color: var(--fg);
  font-family: var(--display); font-weight: 700; font-size: clamp(40px, min(8vw, 11vh), 112px); line-height: 1.04; letter-spacing: -.035em;
  transition: color .3s, -webkit-text-stroke-color .3s, translate .45s cubic-bezier(.2, .8, .2, 1), scale .2s;
}
/* entrance: each link drifts in from the left out of a blur, one after another (nothing is masked, so no letter gets cut) */
.big li { opacity: 0; translate: -40px 0; filter: blur(8px); transition: opacity .45s, translate .6s cubic-bezier(.2, .8, .2, 1), filter .45s; transition-delay: calc(var(--n) * 45ms); }
.ready .big li { opacity: 1; translate: 0 0; filter: none; }

/* hover: the letters hop in a wave and catch the accent colour as it passes; the link leans right and the others hollow out to outlines */
.ch { display: inline-block; transition: color .25s calc(var(--i) * 25ms); }
.big a:hover, .big a:focus-visible { translate: .12em 0; outline: none; }
.big a:hover .ch, .big a:focus-visible .ch { color: var(--accent); animation: hop .55s cubic-bezier(.3, 1.6, .5, 1) calc(var(--i) * 25ms) both; }
@keyframes hop {
  40% { translate: 0 -.16em; rotate: -6deg; }
  100% { translate: 0 0; rotate: 0deg; }
}
.big:has(a:hover) a:not(:hover) { color: transparent; -webkit-text-stroke: 1.5px color-mix(in srgb, var(--fg) 45%, transparent); }
.big a:active { scale: .96; }
/* the page you are on carries an accent dot */
.big a.here::after { content: ''; display: inline-block; width: .14em; height: .14em; margin-left: .18em; border-radius: 50%; background: var(--accent); vertical-align: .1em; }

[data-theme="dark"] .big a.here::after { border-radius: 0; }
@media (prefers-reduced-motion: reduce) {
  .big li, .big a, .ch, .small { transition: none; }
  .big a:hover .ch, .big a:focus-visible .ch { animation: none; }
}
</style>

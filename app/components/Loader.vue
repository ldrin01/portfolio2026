<script setup lang="ts">
const FONT = '"Funnel Display"'
const LINES = ['DRIN', 'WORKS'] // one line on wide screens, two stacked lines on phones
const PHONE = '(max-width: 600px)'
const STACK_LINE_HEIGHT = 0.8225 // leading for the stacked lines (keep in sync with .word.stack in the CSS)

// Timeline: enter 0.5s, hold 0.15s, exit 0.55s (1.2s total).
const DURATION = 1200
const ENTER_END = 500 / DURATION
const EXIT_START = 650 / DURATION
const IN = [0.4, 0, 0.2, 1] as const // ease in-out for the entry
const OUT = [0.8, 0, 0.6, 1] as const // ease for the exit
const TRAVEL = 1 // slide distance above/below center, in word heights (try 0.7 to 1.5)

const word = ref<HTMLElement | null>(null)
const loaderDone = useState('loaderDone', () => false) // tells the hero when to start
const heroReady = useState('heroPersonaReady', () => false) // set by HeroPersonas once its first style is on screen
const stack = ref(false)
const fading = ref(false)
const done = ref(false)

const finish = () => {
  done.value = true
  loaderDone.value = true
  document.documentElement.style.overflow = ''
}

onMounted(async () => {
  const el = word.value
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return finish()
  document.documentElement.style.overflow = 'hidden'

  try {
    await document.fonts.load(`800 100px ${FONT}`)
    await document.fonts.load(`300 100px ${FONT}`)
  } catch { /* the CSS failsafe still hides the loader */ }

  // Width of some text at the boldest weight, measured at 100px.
  const measure = (text: string) => {
    const probe = document.createElement('span')
    probe.textContent = text
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:800 100px ${FONT}`
    document.body.appendChild(probe)
    const w = probe.getBoundingClientRect().width
    probe.remove()
    return w
  }
  const vw = window.innerWidth
  const avail = vw - Math.max(16, vw * 0.02) * 2

  // Fit to the full width at the boldest weight: one line (DRINWORKS), or on phones each of
  // DRIN / WORKS on its own line, each sized so that line spans the whole width.
  let blockH: number
  stack.value = window.matchMedia(PHONE).matches
  if (stack.value) {
    const sizes = LINES.map(l => { const w = measure(l); return w ? (100 * avail) / w : vw * 0.3 })
    el.querySelectorAll<HTMLElement>('.ln').forEach((ln, i) => { ln.style.fontSize = `${sizes[i]}px` })
    blockH = sizes.reduce((sum, s) => sum + s * STACK_LINE_HEIGHT, 0) + Math.max(...sizes) * 0.3
  } else {
    const w = measure(LINES.join(''))
    const fs = w ? (100 * avail) / w : vw * 0.13
    el.style.fontSize = `${fs}px`
    blockH = fs
  }

  // Rises from just below center and leaves just above it:
  // thin and transparent at the ends, thick and opaque at center.
  const off = blockH * TRAVEL
  const ease = (b: readonly number[]) => `cubic-bezier(${b.join(',')})`

  const anim = el.animate([
    { transform: `translateY(${off}px)`, opacity: 0, fontWeight: 300, offset: 0, easing: ease(IN) },
    { transform: 'translateY(0)', opacity: 1, fontWeight: 800, offset: ENTER_END },
    { transform: 'translateY(0)', opacity: 1, fontWeight: 800, offset: EXIT_START, easing: ease(OUT) },
    { transform: `translateY(${-off}px)`, opacity: 0, fontWeight: 300, offset: 1 }
  ], { duration: DURATION, fill: 'forwards' })

  await anim.finished
  // hold the exit until the hero portrait is on screen, so nothing pops in afterwards (waits 2s at most)
  if (!heroReady.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(heroReady, (v) => { if (v) { stop(); resolve() } })
      setTimeout(() => { stop(); resolve() }, 2000)
    })
  }
  fading.value = true
  setTimeout(finish, 250)
})
</script>

<template>
  <div v-if="!done" class="loader" :class="{ fading }" aria-hidden="true">
    <span ref="word" class="word" :class="{ stack }"><span v-for="l in LINES" :key="l" class="ln">{{ l }}</span></span>
  </div>
</template>

<style scoped>
.loader {
  position: fixed; inset: 0; z-index: 1000; overflow: hidden;
  display: grid; place-items: center;
  background: var(--bg);
  transition: opacity .25s ease;
  /* failsafe: never stay on screen if JS or the font fails */
  animation: failsafe 0s 8s forwards;
}
.loader.fading { opacity: 0; }
.word {
  display: flex; justify-content: center; white-space: nowrap; line-height: 1;
  font-family: 'Funnel Display', system-ui, sans-serif;
  font-size: 13vw;
  color: var(--fg);
  font-weight: 300;
  opacity: 0;
  will-change: transform, opacity;
}
/* phones: DRIN over WORKS, centered, each line fitted to the width in script */
.word.stack { flex-direction: column; align-items: center; line-height: 0.8225; }
.ln { display: block; white-space: nowrap; }
@keyframes failsafe { to { opacity: 0; visibility: hidden; } }
@media (prefers-reduced-motion: reduce) { .loader { display: none; } }
</style>
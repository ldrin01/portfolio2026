<script setup lang="ts">
const FONT = '"Funnel Display"'
const WORD = 'DRINWORKS'

// Timeline: enter 1.2s, hold 0.4s, exit 1.2s.
const DURATION = 2800
const ENTER_END = 1200 / DURATION
const EXIT_START = 1600 / DURATION
const IN = [0.4, 0, 0.2, 1] as const // ease in-out for the entry; the exit uses the mirror
const OUT = [0.8, 0, 0.6, 1] as const
const THICKEN_FROM = 0.1 // word center height (0 = bottom edge, 1 = top edge) where the weight starts rising
const SAMPLES = 60

const word = ref<HTMLElement | null>(null)
const loaderDone = useState('loaderDone', () => false) // tells the hero when to start
const fading = ref(false)
const done = ref(false)

const bez = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3

// Eased progress (0..1) of the slide at a given fraction (0..1) of the entry time.
function slideProgress(u: number) {
  let lo = 0, hi = 1
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2
    if (bez(m, IN[0], IN[2]) < u) lo = m
    else hi = m
  }
  return bez((lo + hi) / 2, IN[1], IN[3])
}

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

  // Size the word to span the full width at its boldest weight.
  const probe = document.createElement('span')
  probe.textContent = WORD
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:800 100px ${FONT}`
  document.body.appendChild(probe)
  const w = probe.getBoundingClientRect().width
  probe.remove()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pad = Math.max(16, vw * 0.02)
  const fs = w ? (100 * (vw - pad * 2)) / w : vw * 0.13
  el.style.fontSize = `${fs}px`

  // Start just off-screen, travel to center, leave just off the top.
  const off = vh / 2 + fs / 2 + 4
  const ease = (b: readonly number[]) => `cubic-bezier(${b.join(',')})`

  const opts = { duration: DURATION, fill: 'forwards' as const }
  el.animate([
    { transform: `translateY(${off}px)`, offset: 0, easing: ease(IN) },
    { transform: 'translateY(0)', offset: ENTER_END },
    { transform: 'translateY(0)', offset: EXIT_START, easing: ease(OUT) },
    { transform: `translateY(${-off}px)`, offset: 1 }
  ], opts)

  // Weight rises evenly with the word's height on screen, from THICKEN_FROM up to center.
  const weightAt = (u: number) => {
    const height = 0.5 - (off * (1 - slideProgress(u))) / vh // word center, 0 = bottom edge
    return 300 + 500 * Math.min(1, Math.max(0, (height - THICKEN_FROM) / (0.5 - THICKEN_FROM)))
  }
  const enter = Array.from({ length: SAMPLES + 1 }, (_, i) => ({ fontWeight: weightAt(i / SAMPLES), offset: (i / SAMPLES) * ENTER_END }))
  const exit = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const u = (SAMPLES - i) / SAMPLES // exit mirrors the entry
    return { fontWeight: weightAt(u), offset: EXIT_START + (1 - u) * (1 - EXIT_START) }
  })
  const weight = el.animate([...enter, ...exit], opts)

  await weight.finished
  fading.value = true
  setTimeout(finish, 450)
})
</script>

<template>
  <div v-if="!done" class="loader" :class="{ fading }" aria-hidden="true">
    <span ref="word" class="word">{{ WORD }}</span>
  </div>
</template>

<style scoped>
.loader {
  position: fixed; inset: 0; z-index: 1000; overflow: hidden;
  display: grid; place-items: center;
  background: var(--bg);
  transition: opacity .4s ease;
  /* failsafe: never stay on screen if JS or the font fails */
  animation: failsafe 0s 8s forwards;
}
.loader.fading { opacity: 0; }
.word {
  display: block; white-space: nowrap; line-height: 1;
  font-family: 'Funnel Display', system-ui, sans-serif;
  font-size: 13vw;
  color: var(--fg);
  font-weight: 300;
  transform: translateY(110vh);
  will-change: transform;
}
@keyframes failsafe { to { opacity: 0; visibility: hidden; } }
@media (prefers-reduced-motion: reduce) { .loader { display: none; } }
</style>

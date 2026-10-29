<script setup lang="ts">
// Light / dark switch, fixed top right. The head script sets the theme before first paint (saved choice, else the
// system setting); this button flips it and remembers the choice. Until someone picks, it follows the system.
const theme = ref<'light' | 'dark'>('dark')
const apply = (t: 'light' | 'dark', animate: boolean) => {
  const html = document.documentElement
  if (animate) { html.classList.add('theme-switching'); setTimeout(() => html.classList.remove('theme-switching'), 500) }
  html.dataset.theme = t; theme.value = t
}
const toggle = () => {
  const next = theme.value === 'light' ? 'dark' : 'light'
  apply(next, true)
  try { localStorage.setItem('theme', next) } catch {}
}

let mq: MediaQueryList | null = null
const onSystem = (e: MediaQueryListEvent) => {
  let saved: string | null = null
  try { saved = localStorage.getItem('theme') } catch {}
  if (!saved) apply(e.matches ? 'light' : 'dark', true)
}
onMounted(() => {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  mq = matchMedia('(prefers-color-scheme: light)'); mq.addEventListener('change', onSystem)
})
onBeforeUnmount(() => mq?.removeEventListener('change', onSystem))
</script>

<template>
  <button class="theme-toggle" :class="{ light: theme === 'light' }" type="button" :aria-label="theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'" :aria-pressed="theme === 'light'" @click="toggle">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <!-- one circle that is a sun in light mode and a crescent in dark mode -->
      <mask id="theme-moon"><rect width="24" height="24" fill="#fff" /><circle class="bite" cx="24" cy="2" r="7" fill="#000" /></mask>
      <circle class="core" cx="12" cy="12" r="5" mask="url(#theme-moon)" />
      <g class="rays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" /></g>
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: fixed; z-index: 30; top: max(20px, env(safe-area-inset-top)); right: max(var(--gutter), env(safe-area-inset-right));
  width: 44px; height: 44px; display: grid; place-items: center; padding: 0; cursor: pointer; color: var(--fg);
  background: color-mix(in srgb, var(--surface) 70%, transparent); border: 1px solid var(--line); border-radius: 50%;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: border-color .2s, color .2s;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
.theme-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
svg { width: 20px; height: 20px; overflow: visible; }
.core { fill: currentColor; transition: r .5s cubic-bezier(.3, 1.4, .5, 1); r: 8.5px; }
.bite { transition: cx .5s cubic-bezier(.3, 1.4, .5, 1), cy .5s cubic-bezier(.3, 1.4, .5, 1); cx: 17px; cy: 7px; }
.rays { stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; fill: none; transform-origin: 12px 12px; opacity: 0; transform: rotate(-45deg) scale(.6); transition: opacity .3s, transform .5s cubic-bezier(.3, 1.4, .5, 1); }
/* light mode: the bite slides away, the circle shrinks to a sun and the rays spin in */
.light .core { r: 5px; }
.light .bite { cx: 26px; cy: -2px; }
.light .rays { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .core, .bite, .rays { transition: none; } }
</style>

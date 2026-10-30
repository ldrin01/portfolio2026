<script setup lang="ts">
// Light / dark switch, fixed top right. The head script sets the theme before first paint (saved choice, else light);
// this button flips it and remembers the choice.
const theme = ref<'light' | 'dark'>('light')
const loaderDone = useState('loaderDone', () => false) // nothing shows over the loader
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

onMounted(() => {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
})
</script>

<template>
  <button v-if="loaderDone" class="theme-toggle" :class="{ light: theme === 'light' }" type="button" :aria-label="theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'" :aria-pressed="theme === 'light'" @click="toggle">
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
  position: fixed; z-index: 1200; top: max(20px, env(safe-area-inset-top)); right: max(calc(var(--gutter) - 8px), env(safe-area-inset-right));
  width: 44px; height: 44px; display: grid; place-items: center; padding: 0; cursor: pointer; color: var(--fg);
  background: none; border: 0; transition: color .2s; animation: pop .5s .08s cubic-bezier(.3, 1.4, .5, 1) both;
}
@keyframes pop { from { opacity: 0; scale: .6; } }
.theme-toggle:hover { color: var(--accent); }
.theme-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
svg { width: 26px; height: 26px; overflow: visible; transition: transform .6s cubic-bezier(.3, 1.4, .5, 1); }
/* the whole icon turns half a circle on every switch, and leans a little on hover */
.light svg { transform: rotate(180deg); }
.theme-toggle:hover svg { transform: rotate(-20deg); }
.light.theme-toggle:hover svg { transform: rotate(200deg); }
.core { fill: currentColor; transition: r .5s cubic-bezier(.3, 1.4, .5, 1); r: 8.5px; }
.bite { transition: cx .5s cubic-bezier(.3, 1.4, .5, 1), cy .5s cubic-bezier(.3, 1.4, .5, 1); cx: 17px; cy: 7px; }
.rays { stroke: currentColor; stroke-width: 2; stroke-linecap: round; fill: none; transform-origin: 12px 12px; opacity: 0; transform: rotate(-45deg) scale(.4); transition: opacity .3s, transform .6s cubic-bezier(.3, 1.4, .5, 1); }
/* light mode: the bite slides away, the circle shrinks to a sun and the rays spin out */
.light .core { r: 4.5px; }
.light .bite { cx: 26px; cy: -2px; }
.light .rays { opacity: 1; transform: none; }
/* dark: the moon moves in pixel steps */
[data-theme="dark"] svg, [data-theme="dark"] .core, [data-theme="dark"] .bite { transition-timing-function: steps(5); }
@media (prefers-reduced-motion: reduce) { .theme-toggle { animation: none; } svg, .core, .bite, .rays { transition: none; } }
</style>

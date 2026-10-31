// The browser tab: the favicon follows the site's theme, and a hidden tab calls you back.
export default defineNuxtPlugin(() => {
  const base = useRuntimeConfig().app.baseURL
  const root = document.documentElement
  // Chrome ignores a changed href on an existing icon link, so swap in a fresh element each time
  const paint = () => {
    const light = root.dataset.theme === 'light'
    document.querySelectorAll('link[rel="icon"]').forEach(l => l.remove())
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.setAttribute('sizes', 'any')
    link.href = `${base}favicon${light ? '-light' : ''}.svg?v=${light ? 'l' : 'd'}`
    document.head.appendChild(link)
  }
  paint()
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  // away from the tab: a short nudge that types itself in and repeats; back: whatever the page's own title is.
  // (Browsers run timers in a hidden tab at most once a second, and slower after a few minutes, so keep it gentle.)
  const frames = ['Psst…', 'Psst, still…', 'Psst, still here 👀', 'Psst, still here 👀']
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  let title = '', timer = 0, i = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      title = document.title
      i = 0
      document.title = still ? frames[2]! : frames[0]!
      if (!still) timer = window.setInterval(() => { i = (i + 1) % frames.length; document.title = frames[i]! }, 900)
    } else {
      clearInterval(timer)
      if (title) { document.title = title; title = '' }
    }
  })
})

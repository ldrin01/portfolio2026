// The browser tab: the favicon follows the site's theme, and a hidden tab calls you back.
export default defineNuxtPlugin(() => {
  const base = useRuntimeConfig().app.baseURL
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')
  const root = document.documentElement
  const paint = () => { if (icon) icon.href = `${base}favicon${root.dataset.theme === 'light' ? '-light' : ''}.svg` }
  paint()
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  // away from the tab: a short nudge; back: whatever the page's own title is
  let title = ''
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { title = document.title; document.title = 'Come back soon 👋' }
    else if (title) { document.title = title; title = '' }
  })
})

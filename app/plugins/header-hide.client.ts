// The fixed header (menu button, logo, search, theme toggle and the soft band behind them) slips up out of the way while you read down the page.
// It comes back on a hard flick up, when the pointer reaches the top edge, when you are near the top, or when something in it takes focus.
// Only a CSS variable on <html> changes (--hdr-y, see main.css), so one ease in and out moves every piece together.
export default defineNuxtPlugin(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const html = document.documentElement
  const coarse = window.matchMedia('(pointer: coarse)').matches

  const FLICK = 2200      // px/s going up that counts as "hard"
  const BURST = 420       // px climbed within BURST_MS that also counts
  const BURST_MS = 350
  const TOP_ZONE = 90     // always shown this close to the top of the page
  const EDGE = 8          // px from the top of the screen that reveals it

  let hidden = false
  const set = (h: boolean) => { if (h === hidden) return; hidden = h; if (h) html.dataset.header = 'hidden'; else delete html.dataset.header }
  const busy = () => !!document.getElementById('menu') || !!document.querySelector('.search.open')   // never hide under an open menu or search

  let lastY = scrollY, lastT = performance.now(), upFrom = scrollY, upT = lastT
  const onScroll = () => {
    const y = scrollY, now = performance.now(), dy = y - lastY, dt = Math.max(1, now - lastT)
    lastY = y; lastT = now
    if (y < TOP_ZONE || busy()) { set(false); upFrom = y; upT = now; return }
    if (dy > 0) { upFrom = y; upT = now; if (dy > 1 || hidden) set(true); return }   // reading down: hide
    if (dy < 0) {
      if (now - upT > BURST_MS) { upFrom = y + -dy; upT = now }                       // a new upward run
      const speed = -dy / dt * 1000, climbed = upFrom - y
      if (coarse ? climbed > 24 : (speed > FLICK || (climbed > BURST && now - upT <= BURST_MS))) set(false)
    }
  }
  addEventListener('scroll', onScroll, { passive: true })

  if (!coarse) addEventListener('mousemove', (e) => { if (e.clientY <= EDGE) set(false) }, { passive: true })
  addEventListener('focusin', (e) => { if ((e.target as HTMLElement)?.closest?.('.menu-btn, .logo, .theme-toggle, .search')) set(false) })
  useRouter().afterEach(() => { set(false); lastY = scrollY })
})

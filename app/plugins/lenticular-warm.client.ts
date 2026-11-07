// Downloads the About page's lenticular pictures in the background, once the current page has loaded and the browser
// is idle, so they are ready when the visitor opens About. Download only: no decode, no WebGL, so nothing to stutter.
import about from '~~/content/about-page.json'
import { warmLenticular } from '~/lib/lenticular-warm'

export default defineNuxtPlugin(() => {
  const asset = useAssetUrl()
  const urls = ((about as { lenticular?: { image: string }[] }).lenticular ?? [])
    .slice(0, 3).map(p => asset(p.image)).filter((u): u is string => !!u)
  if (!urls.length) return

  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return // respect data saver

  let started = false
  const run = () => { if (started) return; started = true; warmLenticular(urls) }
  const whenIdle = () => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 2500))

  if (document.readyState === 'complete') whenIdle()
  else addEventListener('load', whenIdle, { once: true })

  // safety net for a fast clicker: start as soon as the About link is hovered, focused or touched
  const near = (e: Event) => { if ((e.target as Element | null)?.closest?.('a[href*="about"]')) run() }
  for (const t of ['pointerover', 'focusin', 'touchstart']) document.addEventListener(t, near, { passive: true })
})
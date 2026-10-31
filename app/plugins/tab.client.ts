// The browser tab: a hidden tab calls you back. (The favicon needs no code: public/favicon.svg picks its colour from the browser's own light/dark mode.)
export default defineNuxtPlugin(() => {
  // away from the tab: a short nudge that types itself in and repeats; back: whatever the page's own title is.
  // (Browsers run timers in a hidden tab at most once a second, and slower after a few minutes, so keep it gentle.)
  const frames = ['Psst…', 'Psst, still…', 'Psst, still here 👀', 'Psst, still here 👀']
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const router = useRouter()
  const inAdmin = () => router.currentRoute.value.path.startsWith('/admin') // the editor's tab stays plain and informative
  let title = '', timer = 0, i = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (inAdmin()) return
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

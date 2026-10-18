import Lenis from 'lenis'

// Smooth (inertial) page scrolling. Held back while the loader plays, skipped for reduced motion.
export default defineNuxtPlugin(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true })
  lenis.stop()

  const loaderDone = useState('loaderDone', () => false)
  watch(loaderDone, done => { if (done) lenis.start() }, { immediate: true })

  const raf = (time: number) => { lenis.raf(time); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)

  return { provide: { lenis } }
})

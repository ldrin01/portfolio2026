// Inset scrollbars (.sb-inset, the menu .sheet) are invisible until something scrolls, then fade out again after a pause.
// Scroll events don't bubble, so one capture listener on the document covers every scroller.
export default defineNuxtPlugin(() => {
  const timers = new WeakMap<Element, number>()
  document.addEventListener('scroll', (e) => {
    const el = e.target
    if (!(el instanceof HTMLElement) || !el.matches('.sb-inset, .sheet')) return
    el.setAttribute('data-scrolling', '')
    clearTimeout(timers.get(el))
    timers.set(el, window.setTimeout(() => el.removeAttribute('data-scrolling'), 900))
  }, { capture: true, passive: true })
})

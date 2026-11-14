import type { RouterConfig } from '@nuxt/schema'

// every page change lands at the top, including from the home page's "More about me" link.
// A link with a #section (a search result for a tool, say) lands on that section instead: sliding there when it is on this page, straight there once the new page has drawn it.
const appears = async (sel: string) => {
  for (let i = 0; i < 40; i++) { if (document.querySelector(sel)) return true; await new Promise(r => setTimeout(r, 50)) }
  return false
}
export default <RouterConfig>{
  async scrollBehavior(to, from, saved) {
    if (to.hash && await appears(to.hash)) return { el: to.hash, top: 84, behavior: to.path === from.path ? 'smooth' : 'instant' }
    if (to.path === from.path) return saved || undefined
    return { left: 0, top: 0, behavior: 'instant' }
  }
}

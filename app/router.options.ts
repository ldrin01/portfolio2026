import type { RouterConfig } from '@nuxt/schema'

// every page change lands at the top, including from the home page's "More about me" link
export default <RouterConfig>{
  scrollBehavior(to, from, saved) {
    if (to.path === from.path) return saved || undefined
    return { left: 0, top: 0, behavior: 'instant' }
  }
}

// Title, description and share card for a page, from content/seo.json (edited under SEO in the local editor).
// Share images need a full address (https://…), so the site URL is put in front of the picture's path.
export function shareImageUrl(path: string) {
  return /^https?:/.test(path) ? path : useSiteConfig().url.replace(/\/$/, '') + path
}

// Site-wide defaults, set once in app.vue; each page overrides what it has.
export function useSiteSeo() {
  const { seo } = useSite()
  useSeoMeta({
    title: seo.siteName,
    description: seo.defaultDescription,
    ogSiteName: seo.siteName,
    ogImage: shareImageUrl(seo.shareImage),
    twitterCard: 'summary_large_image'
  })
}

// One of the fixed pages listed in seo.json ("home", "case-studies", "contact", "legal").
export function usePageSeo(id: string) {
  const page = useSite().seo.pages.find(p => p.id === id)
  if (!page) return
  useSeoMeta({ title: page.title, description: page.description, ogTitle: page.title, ogDescription: page.description })
}

// Picture paths in the content start with "/" (/uploads/x.webp, /covers/x.webp), so add the site's base URL,
// which is /portfolio2026/ on GitHub Pages. Call it in setup; the function it returns can be used anywhere.
export const useAssetUrl = () => {
  const base = useRuntimeConfig().app.baseURL.replace(/\/$/, '')
  return (src?: string) => (src?.startsWith('/') && !src.startsWith(`${base}/`) ? base + src : src)
}

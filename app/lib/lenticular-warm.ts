// One shared loader for the lenticular pictures. The background prefetch (plugin) and the About page both call it,
// so each picture is requested once and the same Image object is reused.
const cache = new Map<string, Promise<HTMLImageElement>>()

export function warmLenticular(urls: string[]): Promise<HTMLImageElement>[] {
  return urls.map((url) => {
    let p = cache.get(url)
    if (!p) {
      p = new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => res(img)
        img.onerror = rej
        img.src = url
      })
      p.catch(() => cache.delete(url)) // a failed load can be retried later
      cache.set(url, p)
    }
    return p
  })
}
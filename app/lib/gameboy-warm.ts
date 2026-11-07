// Downloads for the 3D Game Boy, released one stage at a time by the About page (stage 1 with the page, then one per frame),
// so nothing arrives in one batch when the Game Boy shows up. Each file is measured once (HEAD request), then dealt out biggest
// first: the biggest file waits for stage 1, the second biggest for stage 2, and so on; if there are more files than stages the
// smallest ones share a stage. three.js goes in stage 1, its helpers and our code in stage 2.
// Downloads are kept in memory (blob URLs, read by gameboy-detail.js), so the model never fetches them a second time.
// Optional: put sizes in KB in KNOWN_KB (from `ls -lh public/lab`) to skip the HEAD requests.
const FILES = ['gameboy-wear.js', 'gameboy-game.js', 'gameboy-cart.webp', 'gameboy-cart-zombie.webp', 'gameboy-sticker-cats.webp', 'gameboy-battery.webp']
const KNOWN_KB: Record<string, number> = {}
export const GAMEBOY_STAGES = 6

type Bin = { kb: number; files: string[] }
let lab = '', bins: Promise<Bin[]> | undefined, done = 0, chain: Promise<void> = Promise.resolve()

const store = () => ((window as any).__gbAssets ||= {}) as Record<string, string>
const grab = async (f: string) => {
  if (store()[f]) return
  try { const r = await fetch(lab + f); if (r.ok) store()[f] = URL.createObjectURL(await r.blob()) } catch { /* the model falls back to the network */ }
}
const plan = async (): Promise<Bin[]> => {
  const sized = await Promise.all(FILES.map(async f => {
    let kb = KNOWN_KB[f]
    if (kb == null) { try { kb = Number((await fetch(lab + f, { method: 'HEAD' })).headers.get('content-length') || 0) / 1024 } catch { kb = 0 } }
    return { f, kb }
  }))
  sized.sort((a, b) => b.kb - a.kb)
  const out: Bin[] = Array.from({ length: GAMEBOY_STAGES }, () => ({ kb: 0, files: [] }))
  for (const { f, kb } of sized) {
    const b = out.reduce((m, x) => (x.kb < m.kb || (x.kb === m.kb && x.files.length < m.files.length) ? x : m))
    b.files.push(f); b.kb += kb
  }
  return out
}
const idle = () => new Promise<void>(r => ('requestIdleCallback' in window ? window.requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200)))

// runs every stage up to n that has not run yet, one after another, each at idle; calls can overlap safely
export const gameboyWarmTo = (n: number, labBase: string): Promise<void> => {
  lab = labBase
  return (chain = chain.then(async () => {
    try {
      const b = await (bins ||= plan())
      while (done < n) {
        await idle()
        const i = done++
        if (i === 0) await import('three')
        if (i === 1) await Promise.all([import('three/examples/jsm/controls/OrbitControls.js'), import('three/examples/jsm/environments/RoomEnvironment.js'), import('~/lib/gameboy-detail.js')])
        await Promise.all(b[i]!.files.map(grab))
      }
    } catch { /* a failed prefetch only means the model fetches that file itself */ }
  }))
}
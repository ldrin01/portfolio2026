// The Paint demo's scribble, learned from real hand-drawn takes.
// Takes are recorded in the editor (/lab/scribble or Settings → Paint scribbles) on a 720 x 440 sheet with a quarter-sheet
// bleed margin all round. learnScribble() boils every take down to a small style: how long the strokes are, how long they
// take, how speed rises and falls through a stroke, how sharp the corners are, how often and how long the hand pauses,
// how much a stroke bows, how far past the paper it goes. makeScribble() then draws a brand new scribble by sampling
// those (with a little jitter), so every run is different but moves like the hand that recorded them. More takes, more range.
// Only the style ships with the site (content/paint-style.json); the raw takes stay on the laptop.

export type TakePoint = [number, number, number] // x, y on the sheet (can be off it, in the bleed), time in ms since the take began
export type Take = { id: string; created: number; runs: TakePoint[][]; main?: boolean; fill?: FillTake } // a run is one press of the mouse / trackpad; main: the take that leads
// the main take counts this many times over when learning, so the demo leans toward it while the others still add range
export const MAIN_WEIGHT = 4
export type ScribbleStyle = {
  takes: number
  strokes?: number
  lengths?: number[] // stroke lengths, sheet px
  turns?: number[] // how far the line swings at a corner, degrees (180 = straight back)
  sameSide?: number // chance a corner turns the same way as the one before
  bows?: number[] // sideways bulge of a stroke, as a share of its length
  dur?: { c: number; k: number; sd: number } // stroke time in ms ≈ exp(c + k·ln(length)), spread sd
  profile?: number[] // speed through a stroke in 20 steps, average 1
  pause?: { chance: number; ms: number[] } // hesitations at corners
  counts?: number[] // strokes per take
  reach?: { x0: number; x1: number; y0: number; y1: number } // where corners land, as fractions of the sheet
  fill?: FillStyle // learned from takes that include the fill part
  tune?: ScribbleTune // hand-set adjustments on top of what was learned (kept when the style is learned again)
}
// The fill part of a take: after the scribble the hand goes to the bucket, then the colour, then clicks shapes.
// path: every mouse position (pressed or not) from the moment the fill part began; clicks: what was clicked and when.
// For fill clicks, near / big say how the shape ranked among the shapes still empty: 0 = the nearest / biggest, 1 = the farthest / smallest.
export type FillClick = { t: number; x: number; y: number; kind: 'bucket' | 'swatch' | 'fill'; near?: number; big?: number }
export type FillTake = { path: TakePoint[]; clicks: FillClick[] }
// How the hand moves the cursor from one click to the next, and in what order it fills shapes
export type FillStyle = {
  moves: number
  dur: { c: number; k: number; sd: number } // move time in ms ≈ exp(c + k·ln(distance)) (Fitts-like: far is slower, not proportionally)
  curves: number[] // how much a move bows sideways, as a share of its distance
  side: number // chance a move bows to the left of its direction
  overshoot: { chance: number; amount: number[] } // going past the target then coming back, amount as a share of the distance
  dwell: number[] // ms the cursor rests on the target before clicking
  profile?: number[] // speed through a move in 20 steps, average 1
  order?: { near: number; nearRanks: number[]; bigRanks: number[] } // near: share of clicks that went for a near shape rather than a big one
}
// Adjustments set in the editor. Multipliers are 1 and offsets 0 by default; null means "as learned".
export type ScribbleTune = {
  seconds?: number | null // how long the scribbling lasts (it keeps adding strokes until then)
  speed?: number // × how fast every stroke moves
  length?: number // × how long strokes are
  sharp?: number // degrees added to every corner's swing (more = pointier, toward hairpins)
  pauses?: number // × how often the hand hesitates at a corner
  wobble?: number // × how much strokes bow and shake
  bleed?: number | null // how far past the paper the line may go, as a share of the sheet
  fill?: number | null // seconds the bucket part takes; null = at the learned pace (or 2.5 s with nothing learned)
  order?: 'learned' | 'near' | 'big' | 'random' // which shape the bucket goes to next
  curve?: number // × how much cursor moves bow
}
export const TUNE_DEFAULTS: Required<ScribbleTune> = { seconds: null, speed: 1, length: 1, sharp: 0, pauses: 1, wobble: 1, bleed: null, fill: null, order: 'learned', curve: 1 }
export type Scribble = { pts: [number, number][]; speed: number[]; rest: Map<number, number> }

export const SHEET = { W: 720, H: 440, BLEED: 0.25 }
const BINS = 20

const dist = (a: number[], b: number[]) => Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!)
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]!
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]! }
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]! }
const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random())
// keep a stored list small: an even spread of the values, not the first n
const thin = (a: number[], n: number, dp = 0) => {
  const s = [...a].sort((x, y) => x - y), out = s.length <= n ? s : Array.from({ length: n }, (_, i) => s[Math.round(i * (s.length - 1) / (n - 1))]!)
  const f = 10 ** dp
  return out.map(v => Math.round(v * f) / f)
}

// Ramer–Douglas–Peucker: the few points that keep a run's shape
function simplify(p: TakePoint[], eps: number): number[] {
  const keep = new Uint8Array(p.length)
  keep[0] = keep[p.length - 1] = 1
  const stack: [number, number][] = [[0, p.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const A = p[a]!, B = p[b]!, L = dist(A, B) || 1
    let far = -1, fd = eps
    for (let i = a + 1; i < b; i++) {
      const P = p[i]!, d = L < 1e-6 ? dist(A, P) : Math.abs((B[0] - A[0]) * (A[1] - P[1]) - (A[0] - P[0]) * (B[1] - A[1])) / L
      if (d > fd) { fd = d; far = i }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]) }
  }
  return [...keep.keys()].filter(i => keep[i])
}

export type Corner = { i: number; turn: number; side: number }
export type Stroke = { len: number; dur: number; bow: number; pause: number; profile: number[] | null }

// One run → its corners and strokes
export function analyseRun(p: TakePoint[]) {
  const strokes: Stroke[] = [], corners: Corner[] = []
  if (p.length < 4) return { strokes, corners }
  const v = simplify(p, 4)
  // a kept point where the line swings more than 50 degrees is a corner
  const cut = [0]
  for (let k = 1; k < v.length - 1; k++) {
    const a = p[v[k - 1]!]!, b = p[v[k]!]!, c = p[v[k + 1]!]!
    const d1 = Math.atan2(b[1] - a[1], b[0] - a[0]), d2 = Math.atan2(c[1] - b[1], c[0] - b[0])
    let t = d2 - d1
    while (t > Math.PI) t -= 2 * Math.PI
    while (t < -Math.PI) t += 2 * Math.PI
    if (Math.abs(t) > (50 * Math.PI) / 180) { cut.push(v[k]!); corners.push({ i: v[k]!, turn: (Math.abs(t) * 180) / Math.PI, side: Math.sign(t) }) }
  }
  cut.push(p.length - 1)
  // how long the hand sat still at each cut: the time spent within 3 px of it
  const dwell = cut.map((c) => {
    let a = c, b = c
    while (a > 0 && dist(p[a - 1]!, p[c]!) < 3) a--
    while (b < p.length - 1 && dist(p[b + 1]!, p[c]!) < 3) b++
    return [a, b] as const
  })
  for (let s = 0; s < cut.length - 1; s++) {
    const i0 = dwell[s]![1], i1 = Math.max(i0 + 1, dwell[s + 1]![0])
    const A = p[i0]!, B = p[i1]!
    let len = 0, dev = 0
    const chord = dist(A, B) || 1
    for (let i = i0 + 1; i <= i1; i++) {
      len += dist(p[i - 1]!, p[i]!)
      const P = p[i]!
      dev = Math.max(dev, Math.abs((B[0] - A[0]) * (A[1] - P[1]) - (A[0] - P[0]) * (B[1] - A[1])) / chord)
    }
    const dur = B[2] - A[2]
    if (len < 25 || dur < 30) continue
    // speed through the stroke: the distance covered in each twentieth of its time, as a multiple of the average
    let profile: number[] | null = null
    if (i1 - i0 >= 6) {
      const at = (t: number) => { // distance travelled by time t
        let d = 0
        for (let i = i0 + 1; i <= i1; i++) {
          const q = p[i - 1]!, r = p[i]!, seg = dist(q, r)
          if (r[2] >= t) return d + (r[2] > q[2] ? seg * (t - q[2]) / (r[2] - q[2]) : seg)
          d += seg
        }
        return d
      }
      profile = Array.from({ length: BINS }, (_, k) => (at(A[2] + (dur * (k + 1)) / BINS) - at(A[2] + (dur * k) / BINS)) / (len / BINS))
    }
    const pause = s > 0 ? p[dwell[s]![1]]![2] - p[dwell[s]![0]]![2] : 0
    strokes.push({ len, dur, bow: chord > 20 ? dev / chord : 0, pause, profile })
  }
  return { strokes, corners }
}

export function analyseTake(t: Take) {
  const runs = t.runs.map(r => ({ r, ...analyseRun(r) }))
  const pts = t.runs.flat()
  const time = pts.length ? Math.max(...pts.map(p => p[2])) - Math.min(...pts.map(p => p[2])) : 0
  return { runs, strokes: runs.reduce((n, r) => n + r.strokes.length, 0), time }
}

export function learnScribble(takes: Take[]): ScribbleStyle {
  const lengths: number[] = [], turns: number[] = [], bows: number[] = [], pauses: number[] = [], counts: number[] = []
  const lnL: number[] = [], lnD: number[] = [], xs: number[] = [], ys: number[] = []
  const prof = new Array(BINS).fill(0)
  let nProf = 0, same = 0, pairs = 0, corners = 0
  const weighted = takes.flatMap(t => Array<Take>(t.main ? MAIN_WEIGHT : 1).fill(t))
  const seen = new Map<Take, ReturnType<typeof analyseTake>>()
  for (const t of weighted) {
    if (!seen.has(t)) seen.set(t, analyseTake(t))
    const a = seen.get(t)!
    if (a.strokes) counts.push(a.strokes)
    for (const { r, strokes, corners: cs } of a.runs) {
      for (const s of strokes) {
        lengths.push(s.len); bows.push(s.bow); lnL.push(Math.log(s.len)); lnD.push(Math.log(s.dur))
        if (s.pause > 50) pauses.push(s.pause)
        if (s.profile) { s.profile.forEach((v, k) => (prof[k] += v)); nProf++ }
      }
      cs.forEach((c, k) => {
        turns.push(c.turn); corners++
        xs.push(r[c.i]![0] / SHEET.W); ys.push(r[c.i]![1] / SHEET.H)
        if (k) { pairs++; if (c.side === cs[k - 1]!.side) same++ }
      })
      // the ends of a run count as places the hand reached too
      for (const e of [r[0], r[r.length - 1]]) if (e) { xs.push(e[0] / SHEET.W); ys.push(e[1] / SHEET.H) }
    }
  }
  const fill = learnFill(takes)
  const style: ScribbleStyle = { takes: takes.length, strokes: lengths.length, ...(fill ? { fill } : {}) }
  if (lengths.length < 6) return style
  // stroke time against length, as a power law fitted on logs (long strokes take longer, but not in proportion)
  const n = lnL.length, mx = lnL.reduce((a, b) => a + b, 0) / n, my = lnD.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) { sxy += (lnL[i]! - mx) * (lnD[i]! - my); sxx += (lnL[i]! - mx) ** 2 }
  const k = sxx > 1e-6 ? Math.max(0.2, Math.min(1.2, sxy / sxx)) : 0.6, c = my - k * mx
  const sd = Math.sqrt(lnL.reduce((a, x, i) => a + (lnD[i]! - (c + k * x)) ** 2, 0) / n)
  const mean = prof.reduce((a, b) => a + b, 0) / BINS || 1
  return {
    ...style,
    lengths: thin(lengths, 300),
    turns: thin(turns, 300),
    sameSide: pairs ? Math.round((same / pairs) * 100) / 100 : 0.5,
    bows: thin(bows, 200, 3),
    dur: { c: Math.round(c * 1000) / 1000, k: Math.round(k * 1000) / 1000, sd: Math.round(Math.min(0.6, sd) * 1000) / 1000 },
    profile: nProf ? prof.map(v => Math.round((v / mean) * 100) / 100) : undefined,
    pause: { chance: Math.round((pauses.length / Math.max(1, corners)) * 100) / 100, ms: thin(pauses, 100) },
    counts: thin(counts, 100),
    reach: { x0: Math.round(pct(xs, 0.03) * 100) / 100, x1: Math.round(pct(xs, 0.97) * 100) / 100, y0: Math.round(pct(ys, 0.03) * 100) / 100, y1: Math.round(pct(ys, 0.97) * 100) / 100 }
  }
}

// speed over a stretch of timed points, in BINS steps of its time, as a multiple of its average
function timeProfile(p: TakePoint[], i0: number, i1: number, len: number): number[] | null {
  const A = p[i0]!, dur = p[i1]![2] - A[2]
  if (i1 - i0 < 6 || dur <= 0 || len <= 0) return null
  const at = (t: number) => {
    let d = 0
    for (let i = i0 + 1; i <= i1; i++) {
      const q = p[i - 1]!, r = p[i]!, seg = dist(q, r)
      if (r[2] >= t) return d + (r[2] > q[2] ? seg * (t - q[2]) / (r[2] - q[2]) : seg)
      d += seg
    }
    return d
  }
  return Array.from({ length: BINS }, (_, k) => (at(A[2] + (dur * (k + 1)) / BINS) - at(A[2] + (dur * k) / BINS)) / (len / BINS))
}

export type Move = { dist: number; dur: number; curve: number; side: number; over: number; dwell: number; profile: number[] | null }
export function analyseFill(f: FillTake) {
  const moves: Move[] = [], p = f.path
  if (p.length < 3) return { moves, clicks: f.clicks }
  let from: [number, number] = [p[0]![0], p[0]![1]], fromT = p[0]![2]
  for (const c of f.clicks) {
    const T: [number, number] = [c.x, c.y], D = dist(from, T)
    const seg: TakePoint[] = p.filter(q => q[2] >= fromT && q[2] <= c.t)
    seg.push([c.x, c.y, c.t])
    let si = seg.findIndex(q => dist(q, from) > 3)
    if (si > 0) si--
    let ai = seg.length - 1
    while (ai > 0 && dist(seg[ai - 1]!, T) <= 8) ai--
    if (si >= 0 && ai > si && D >= 15) {
      const dur = seg[ai]![2] - seg[si]![2]
      if (dur >= 30) {
        const ux = (T[0] - from[0]) / D, uy = (T[1] - from[1]) / D
        let dev = 0, over = 0, len = 0
        for (let i = si; i <= ai; i++) {
          const q = seg[i]!, rx = q[0] - from[0], ry = q[1] - from[1]
          const along = rx * ux + ry * uy, across = rx * -uy + ry * ux
          if (Math.abs(across) > Math.abs(dev)) dev = across
          over = Math.max(over, along - D)
          if (i > si) len += dist(seg[i - 1]!, q)
        }
        moves.push({ dist: D, dur, curve: Math.abs(dev) / D, side: dev < 0 ? 1 : 0, over: over > 6 ? over / D : 0, dwell: Math.max(0, c.t - seg[ai]![2]), profile: timeProfile(seg, si, ai, len) })
      }
    }
    from = T; fromT = c.t
  }
  return { moves, clicks: f.clicks }
}

export function learnFill(takes: Take[]): FillStyle | undefined {
  const weighted = takes.filter(t => t.fill).flatMap(t => Array<Take>(t.main ? MAIN_WEIGHT : 1).fill(t))
  const lnD: number[] = [], lnT: number[] = [], curves: number[] = [], overs: number[] = [], dwell: number[] = [], nearR: number[] = [], bigR: number[] = []
  const prof = new Array(BINS).fill(0)
  let n = 0, nProf = 0, left = 0, nOver = 0, near = 0, ranked = 0
  for (const t of weighted) {
    const a = analyseFill(t.fill!)
    for (const m of a.moves) {
      n++; lnD.push(Math.log(m.dist)); lnT.push(Math.log(m.dur)); curves.push(m.curve); left += m.side; dwell.push(m.dwell)
      if (m.over) { nOver++; overs.push(m.over) }
      if (m.profile) { m.profile.forEach((v, k) => (prof[k] += v)); nProf++ }
    }
    for (const c of a.clicks) {
      if (c.kind !== 'fill' || c.near === undefined || c.big === undefined) continue
      ranked++; nearR.push(c.near); bigR.push(c.big)
      if (c.near <= c.big) near++
    }
  }
  if (n < 4) return undefined
  const mx = lnD.reduce((a, b) => a + b, 0) / n, my = lnT.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) { sxy += (lnD[i]! - mx) * (lnT[i]! - my); sxx += (lnD[i]! - mx) ** 2 }
  const k = sxx > 1e-6 ? Math.max(0.1, Math.min(1, sxy / sxx)) : 0.4, c = my - k * mx
  const sd = Math.sqrt(lnD.reduce((a, x, i) => a + (lnT[i]! - (c + k * x)) ** 2, 0) / n)
  const mean = prof.reduce((a, b) => a + b, 0) / BINS || 1
  const r3 = (v: number) => Math.round(v * 1000) / 1000
  return {
    moves: n,
    dur: { c: r3(c), k: r3(k), sd: r3(Math.min(0.6, sd)) },
    curves: thin(curves, 200, 3),
    side: Math.round((left / n) * 100) / 100,
    overshoot: { chance: Math.round((nOver / n) * 100) / 100, amount: thin(overs, 100, 3) },
    dwell: thin(dwell, 200),
    profile: nProf ? prof.map(v => Math.round((v / mean) * 100) / 100) : undefined,
    order: ranked >= 3 ? { near: Math.round((near / ranked) * 100) / 100, nearRanks: thin(nearR, 200, 2), bigRanks: thin(bigR, 200, 2) } : undefined
  }
}

// A readable summary of a style, for the editor
export function describeStyle(s: ScribbleStyle) {
  if (!s.lengths?.length || !s.dur) return null
  const L = median(s.lengths), ms = Math.exp(s.dur.c + s.dur.k * Math.log(L))
  return {
    takes: s.takes,
    strokes: s.strokes ?? 0,
    length: Math.round(L),
    strokeMs: Math.round(ms),
    speed: Math.round((L / ms) * 1000), // sheet px per second
    turn: Math.round(median(s.turns ?? [])),
    hairpins: Math.round(((s.turns ?? []).filter(t => t >= 160).length / Math.max(1, s.turns?.length ?? 0)) * 100),
    sameSide: Math.round((s.sameSide ?? 0.5) * 100),
    pauseChance: Math.round((s.pause?.chance ?? 0) * 100),
    pauseMs: Math.round(median(s.pause?.ms ?? [])),
    perTake: Math.round(median(s.counts ?? [])),
    scribbleMs: Math.round(median(s.counts ?? []) * ms * (1 + (s.pause?.chance ?? 0) * 0.3)), // a typical take, start to finish
    bleed: Math.round(Math.min(0.3, Math.max(0, -(s.reach?.x0 ?? 0), (s.reach?.x1 ?? 1) - 1, -(s.reach?.y0 ?? 0), (s.reach?.y1 ?? 1) - 1)) * 100), // the demo never goes more than 30% past
    profile: s.profile ?? []
  }
}
export function describeFill(f: FillStyle | undefined) {
  if (!f) return null
  const ms = (d: number) => Math.exp(f.dur.c + f.dur.k * Math.log(d))
  return {
    moves: f.moves,
    shortMs: Math.round(ms(80)), // a hop to a neighbouring shape
    longMs: Math.round(ms(400)), // across the sheet
    curve: Math.round(median(f.curves) * 100),
    overshoot: Math.round(f.overshoot.chance * 100),
    dwellMs: Math.round(median(f.dwell)),
    near: f.order ? Math.round(f.order.near * 100) : null,
    profile: f.profile ?? []
  }
}

// ---- making a new scribble ----

// One closed line (it must end where it started: that is what lets the fill alternate like a chessboard),
// as points every ~3 px with the speed at each (sheet px per ms) and pauses before some points (ms).
export function makeScribble(style: ScribbleStyle | null | undefined, W = SHEET.W, H = SHEET.H): Scribble {
  const learned = !!(style?.lengths && style.lengths.length >= 6 && style.turns?.length && style.dur)
  const T = { ...TUNE_DEFAULTS, ...(style?.tune ?? {}) }
  const sx = W / SHEET.W, sy = H / SHEET.H, scale = Math.sqrt(sx * sy)
  const reach = T.bleed !== null ? { x0: -T.bleed, x1: 1 + T.bleed, y0: -T.bleed, y1: 1 + T.bleed }
    : learned && style!.reach ? style!.reach : { x0: -0.25, x1: 1.25, y0: -0.25, y1: 1.25 }
  // never smaller than a fair piece of the sheet, never past the bleed
  const lo = [Math.max(-0.3, Math.min(0.15, reach.x0)) * W, Math.max(-0.3, Math.min(0.15, reach.y0)) * H]
  const hi = [Math.min(1.3, Math.max(0.85, reach.x1)) * W, Math.min(1.3, Math.max(0.85, reach.y1)) * H]
  const ok = (p: number[]) => p[0]! >= lo[0]! && p[0]! <= hi[0]! && p[1]! >= lo[1]! && p[1]! <= hi[1]!
  // how many strokes: a set time keeps adding strokes until it is used up; otherwise as many as a take usually has
  const n = learned ? Math.max(10, Math.min(80, Math.round(pick(style!.counts?.length ? style!.counts : [40]) * (0.85 + Math.random() * 0.3)))) : 38 + Math.floor(Math.random() * 8)
  const budget = T.seconds ? T.seconds * 1000 : 0
  const nextTurn = () => Math.max(60, Math.min(179, (learned ? pick(style!.turns!) + gauss() * 5 : Math.random() < 0.15 ? 165 + Math.random() * 10 : 120 + Math.random() * 40) + T.sharp))
  const nextLen = () => (learned ? pick(style!.lengths!) * (0.85 + Math.random() * 0.3) : 180 + Math.random() * 420) * T.length * scale
  const durOf = (len: number) => (learned
    ? Math.exp(style!.dur!.c + style!.dur!.k * Math.log(len / scale) + gauss() * style!.dur!.sd)
    : (90 + (len / scale) * 0.35) * (0.8 + Math.random() * 0.5)) / T.speed
  const pauseOf = () => {
    const chance = Math.min(1, (learned ? style!.pause?.chance ?? 0 : 0.18) * T.pauses)
    return Math.random() < chance ? (learned && style!.pause?.ms.length ? pick(style!.pause.ms) : 40 + Math.random() * 160) : 0
  }

  // the corners, each stroke's time and the pause before it
  const ctrl: [number, number][] = [[W * (0.15 + Math.random() * 0.7), H * (0.15 + Math.random() * 0.7)]]
  const durs: number[] = [], waits: number[] = []
  let dir = Math.random() * Math.PI * 2, side = Math.random() < 0.5 ? 1 : -1, used = 0
  for (let i = 1; budget ? used < budget && i < 400 : i < n; i++) {
    const [x, y] = ctrl[i - 1]!
    let next: [number, number] | null = null
    for (let tries = 0; tries < 30 && !next; tries++) {
      const s = learned ? (Math.random() < (style!.sameSide ?? 0.5) ? side : -side) : Math.random() < 0.5 ? 1 : -1
      const d = dir + ((nextTurn() * Math.PI) / 180) * (tries > 15 ? -s : s), len = nextLen()
      const p: [number, number] = [x + Math.cos(d) * len, y + Math.sin(d) * len]
      if (ok(p)) { next = p; dir = d; side = tries > 15 ? -s : s }
    }
    if (!next) { const d = Math.atan2(H / 2 - y, W / 2 - x); next = [x + Math.cos(d) * 300 * sx, y + Math.sin(d) * 300 * sy]; dir = d }
    ctrl.push(next)
    const len = Math.hypot(next[0] - x, next[1] - y) || 1, dur = durOf(len), wait = i > 1 ? pauseOf() : 0
    durs.push(dur); waits.push(wait); used += dur + wait
  }
  // and home again, so the line closes
  const home = Math.hypot(ctrl[0]![0] - ctrl[ctrl.length - 1]![0], ctrl[0]![1] - ctrl[ctrl.length - 1]![1]) || 1
  ctrl.push(ctrl[0]!); durs.push(durOf(home)); waits.push(pauseOf())

  const prof = learned && style!.profile?.length ? style!.profile : null
  const profileAt = (t: number) => {
    if (!prof) return 30 * t * t * (1 - t) * (1 - t) // minimum-jerk bell
    const f = t * prof.length - 0.5, i = Math.max(0, Math.min(prof.length - 1, Math.floor(f))), j = Math.min(prof.length - 1, i + 1), w = Math.max(0, Math.min(1, f - i))
    return prof[i]! * (1 - w) + prof[j]! * w
  }
  // the profile is speed over the stroke's time, but points are laid out along its distance: map distance → time first,
  // so a stroke takes exactly its duration (using time-speed per distance would linger on the slow ends)
  const N = 200, cum = [0]
  for (let k = 1; k <= N; k++) cum.push(cum[k - 1]! + Math.max(0.02, profileAt((k - 0.5) / N)) / N)
  const total = cum[N]!
  const speedAtDistance = (u: number) => {
    const target = Math.max(0, Math.min(1, u)) * total
    let a = 0, b = N
    while (b - a > 1) { const m = (a + b) >> 1; if (cum[m]! < target) a = m; else b = m }
    const tau = (a + (cum[b]! > cum[a]! ? (target - cum[a]!) / (cum[b]! - cum[a]!) : 0)) / N
    return Math.max(0.02, profileAt(tau)) / total
  }
  const pts: [number, number][] = [], speed: number[] = [], rest = new Map<number, number>()
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [ax, ay] = ctrl[i]!, [bx, by] = ctrl[i + 1]!, len = Math.hypot(bx - ax, by - ay) || 1
    const nx = -(by - ay) / len, ny = (bx - ax) / len
    const bow = (learned && style!.bows?.length ? pick(style!.bows) : Math.random() * 0.01) * len * T.wobble * (Math.random() < 0.5 ? 1 : -1)
    const ph = Math.random() * 6.3, f = 1 + Math.random() * 1.5, shake = 0.6 * T.wobble // a hair of tremor on top of the bow
    const steps = Math.max(2, Math.ceil(len / 3))
    if (waits[i]) rest.set(pts.length, waits[i]!)
    const avg = len / durs[i]! // sheet px per ms on average for this stroke
    for (let s = 0; s < steps; s++) {
      const t = s / steps, w = bow * Math.sin(t * Math.PI) + shake * Math.sin(t * Math.PI) * Math.sin(ph + t * f * Math.PI * 2)
      pts.push([Math.round(ax + (bx - ax) * t + nx * w), Math.round(ay + (by - ay) * t + ny * w)])
      speed.push(avg * speedAtDistance(t + 0.5 / steps))
    }
  }
  pts.push(pts[0]!); speed.push(speed[0]!)
  return { pts, speed, rest }
}

// A generated scribble as timed points, for previews
export function scribbleTimeline(s: Scribble): TakePoint[] {
  const out: TakePoint[] = []
  let t = 0
  s.pts.forEach((p, i) => {
    if (i) t += dist(s.pts[i - 1]!, p) / (s.speed[i - 1] || 0.1)
    if (s.rest.has(i)) t += s.rest.get(i)!
    out.push([p[0], p[1], Math.round(t)])
  })
  return out
}

// ---- moving the cursor like a hand, for the tool picks and the bucket ----

const shuffle = <T>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j]!, b[i]!] } return b }

// time fraction → distance fraction for a speed profile (min-jerk without one)
function progressFn(profile: number[] | undefined) {
  const N = 100, cum = [0]
  const at = (t: number) => {
    if (!profile?.length) return 30 * t * t * (1 - t) * (1 - t)
    const f = t * profile.length - 0.5, i = Math.max(0, Math.min(profile.length - 1, Math.floor(f))), j = Math.min(profile.length - 1, i + 1), w = Math.max(0, Math.min(1, f - i))
    return Math.max(0.02, profile[i]! * (1 - w) + profile[j]! * w)
  }
  for (let k = 1; k <= N; k++) cum.push(cum[k - 1]! + at((k - 0.5) / N) / N)
  const total = cum[N]!
  return (t: number) => { const x = Math.max(0, Math.min(1, t)) * N, i = Math.min(N - 1, Math.floor(x)); return (cum[i]! + (cum[i + 1]! - cum[i]!) * (x - i)) / total }
}

export type Plan = { total: number; at: (t: number) => [number, number] }
// A cursor move from `from` to `to` (any units; k = sheet px per unit, so the learned timing applies), ending with the
// little rest before the click. Bows, overshoots and speeds up / slows down the way the recorded hand did.
export function planMove(f: FillStyle | undefined, from: [number, number], to: [number, number], k = 1, tune?: ScribbleTune): Plan {
  const T = { ...TUNE_DEFAULTS, ...(tune ?? {}) }
  const D = dist(from, to)
  const durOf = (d: number) => (f ? Math.exp(f.dur.c + f.dur.k * Math.log(Math.max(5, d * k)) + gauss() * f.dur.sd) : 160 + 3 * Math.pow(Math.max(5, d * k), 0.75))
  const prog = progressFn(f?.profile)
  const bend = (f?.curves.length ? pick(f.curves) : Math.random() * 0.06) * T.curve * (Math.random() < (f?.side ?? 0.5) ? 1 : -1)
  const over = f && D * k > 30 && Math.random() < f.overshoot.chance && f.overshoot.amount.length ? Math.min(0.3, pick(f.overshoot.amount)) : 0
  const ux = D ? (to[0] - from[0]) / D : 0, uy = D ? (to[1] - from[1]) / D : 0
  const end: [number, number] = over ? [to[0] + ux * over * D, to[1] + uy * over * D] : to
  const legs: { a: [number, number]; b: [number, number]; c: [number, number]; dur: number }[] = []
  const leg = (a: [number, number], b: [number, number], bow: number) => {
    const L = dist(a, b), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = L ? -(b[1] - a[1]) / L : 0, ny = L ? (b[0] - a[0]) / L : 0
    legs.push({ a, b, c: [mx + nx * 2 * bow * L, my + ny * 2 * bow * L], dur: L < 0.5 ? 0 : durOf(L) })
  }
  leg(from, end, bend)
  if (over) leg(end, to, 0)
  const dwell = f?.dwell.length ? pick(f.dwell) : 50 + Math.random() * 90
  const moveTotal = legs.reduce((a, l) => a + l.dur, 0)
  return {
    total: moveTotal + dwell,
    at: (t: number) => {
      for (const l of legs) {
        if (t <= l.dur && l.dur > 0) {
          const u = prog(t / l.dur), v = 1 - u
          return [v * v * l.a[0] + 2 * v * u * l.c[0] + u * u * l.b[0], v * v * l.a[1] + 2 * v * u * l.c[1] + u * u * l.b[1]]
        }
        t -= l.dur
      }
      return to
    }
  }
}

// The order the bucket visits shapes: each step goes for a near shape or a big one, as often and as strictly as the
// recorded hand did (the rank it picks is sampled from the recorded ranks). Without a learned order it is random.
export function orderTargets<R extends { x: number; y: number; size: number }>(targets: R[], start: [number, number], f?: FillStyle, tune?: ScribbleTune): R[] {
  const how = tune?.order ?? 'learned'
  if (how === 'random' || (how === 'learned' && !f?.order)) return shuffle(targets)
  const left = [...targets], out: R[] = []
  let cur = start
  while (left.length) {
    const n = left.length
    const useNear = how === 'near' ? true : how === 'big' ? false : Math.random() < f!.order!.near
    const sorted = useNear ? [...left].sort((a, b) => dist([a.x, a.y], cur) - dist([b.x, b.y], cur)) : [...left].sort((a, b) => b.size - a.size)
    const ranks = how === 'learned' ? (useNear ? f!.order!.nearRanks : f!.order!.bigRanks) : []
    const r = ranks.length ? pick(ranks) : Math.random() * 0.1
    const choice = sorted[Math.min(n - 1, Math.round(r * (n - 1)))]!
    out.push(choice); left.splice(left.indexOf(choice), 1); cur = [choice.x, choice.y]
  }
  return out
}

// Article covers: simple generative art, one per article, as public/covers/<slug>.webp (1600x900).
//   node tools/covers.mjs            every article in content/case-studies
//   node tools/covers.mjs pwa seo-maxxing   only these
//   node tools/covers.mjs --svg      also keep the .svg next to each .webp (for tweaking)
// Each cover is seeded by its slug (same slug = same picture) and its motif hints at the topic.
// One family: a deep warm charcoal ground, the site's LED-orange ramp, cream and silver lines, a faint grid and corner marks,
// so they sit well on both the light paper and the dark orange theme. Add a motif to MOTIFS for a new article
// (unknown slugs get a generic tile pattern). Then add `cover: "/covers/<slug>.webp"` to the article's frontmatter.
import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'covers')
const W = 1600
const H = 900

// palette (app/assets/css/main.css)
const RAMP = ['#ff7a3d', '#ff5a2d', '#e84a1c', '#c43a14', '#9a2c10', '#6e200c']
const CREAM = '#f2efe9'
const SILVER = '#a8aaaf'
const CHAR = '#3a3b43'
const INK = '#16161b'

// ---- seeded randomness ----
function hash(s) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}
function rng(seed) {
  let a = seed
  const r = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  r.range = (lo, hi) => lo + r() * (hi - lo)
  r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1))
  r.pick = arr => arr[Math.floor(r() * arr.length)]
  r.chance = p => r() < p
  return r
}

// ---- tiny SVG helpers ----
const n = v => Math.round(v * 10) / 10
const attrs = o => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}="${typeof v === 'number' ? n(v) : v}"`).join(' ')
const rect = (x, y, w, h, o = {}) => `<rect ${attrs({ x, y, width: w, height: h, ...o })}/>`
const circle = (cx, cy, r, o = {}) => `<circle ${attrs({ cx, cy, r, ...o })}/>`
const line = (x1, y1, x2, y2, o = {}) => `<line ${attrs({ x1, y1, x2, y2, strokeLinecap: 'round', ...o })}/>`
const poly = (pts, o = {}) => `<polygon ${attrs({ points: pts.map(p => `${n(p[0])},${n(p[1])}`).join(' '), ...o })}/>`
const polyline = (pts, o = {}) => `<polyline ${attrs({ points: pts.map(p => `${n(p[0])},${n(p[1])}`).join(' '), fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', ...o })}/>`
const path = (d, o = {}) => `<path ${attrs({ d, ...o })}/>`
const g = (inner, o = {}) => `<g ${attrs(o)}>${inner}</g>`
const ngon = (cx, cy, r, k, rot = 0) => Array.from({ length: k }, (_, i) => [cx + r * Math.cos(rot + (i * 2 * Math.PI) / k), cy + r * Math.sin(rot + (i * 2 * Math.PI) / k)])
const star = (cx, cy, r, rot = -Math.PI / 2) => Array.from({ length: 10 }, (_, i) => { const rr = i % 2 ? r * 0.42 : r; const a = rot + (i * Math.PI) / 5; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] })
const stroke = (c, w, op = 1) => ({ fill: 'none', stroke: c, strokeWidth: w, strokeOpacity: op })
// a hand-drawn line: the straight line with a little seeded wobble
function wobble(r, pts, amp = 6) {
  let d = `M${n(pts[0][0])},${n(pts[0][1])}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    d += ` Q${n((x0 + x1) / 2 + r.range(-amp, amp))},${n((y0 + y1) / 2 + r.range(-amp, amp))} ${n(x1 + r.range(-amp / 2, amp / 2))},${n(y1 + r.range(-amp / 2, amp / 2))}`
  }
  return d
}

// ---- the shared frame: ground, glow, grid, corner marks ----
function frame(r, inner) {
  const gx = r.range(0.25, 0.8) * W
  const gy = r.range(0.2, 0.85) * H
  const tilt = r.range(-0.15, 0.15)
  const grid = []
  for (let x = 50; x < W; x += 50) grid.push(line(x, 0, x, H, { stroke: CREAM, strokeOpacity: x % 200 ? 0.03 : 0.06, strokeWidth: 1, strokeLinecap: 'butt' }))
  for (let y = 50; y < H; y += 50) grid.push(line(0, y, W, y, { stroke: CREAM, strokeOpacity: y % 200 ? 0.03 : 0.06, strokeWidth: 1, strokeLinecap: 'butt' }))
  const mark = (x, y) => g(line(x - 12, y, x + 12, y) + line(x, y - 12, x, y + 12), { stroke: CREAM, strokeOpacity: 0.35, strokeWidth: 1.5 })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="${n(1 + tilt)}"><stop offset="0" stop-color="#141317"/><stop offset=".55" stop-color="#1a171a"/><stop offset="1" stop-color="#2a1610"/></linearGradient>
  <radialGradient id="glow" cx="${n(gx)}" cy="${n(gy)}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${RAMP[1]}" stop-opacity=".30"/><stop offset=".45" stop-color="${RAMP[3]}" stop-opacity=".10"/><stop offset="1" stop-color="${RAMP[5]}" stop-opacity="0"/></radialGradient>
</defs>
${rect(0, 0, W, H, { fill: 'url(#bg)' })}
${rect(0, 0, W, H, { fill: 'url(#glow)' })}
${grid.join('')}
${inner}
${mark(60, 60)}${mark(W - 60, 60)}${mark(60, H - 60)}${mark(W - 60, H - 60)}
</svg>`
}

// ---- motifs, one per article; each returns SVG for the middle of the frame ----
const fills = r => r.pick([RAMP[0], RAMP[1], RAMP[2], RAMP[3], RAMP[4], CREAM, CHAR])

const MOTIFS = {
  // many industries, one pattern: a hex grid of small glyphs, a route threading through some of them
  'across-industries'(r) {
    const out = []
    const s = 62
    const cells = []
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 15; col++) {
        const cx = 170 + col * s * 1.74 + (row % 2) * s * 0.87
        const cy = 130 + row * s * 1.5 * 0.86
        if (cx > W - 130 || cy > H - 110) continue
        cells.push([cx, cy])
        const lit = r.chance(0.22)
        out.push(poly(ngon(cx, cy, s * 0.92, 6, Math.PI / 6), lit ? { fill: fills(r), fillOpacity: 0.9 } : stroke(CREAM, 1.5, 0.14)))
        const glyph = r.int(0, 4)
        const c = lit ? INK : r.pick([RAMP[0], CREAM, SILVER])
        const op = lit ? 0.75 : 0.5
        if (glyph === 0) out.push(circle(cx, cy, 12, { fill: c, fillOpacity: op }))
        else if (glyph === 1) out.push(rect(cx - 11, cy - 11, 22, 22, { fill: c, fillOpacity: op }))
        else if (glyph === 2) out.push(poly(ngon(cx, cy + 3, 15, 3, -Math.PI / 2), { fill: c, fillOpacity: op }))
        else if (glyph === 3) out.push(line(cx - 14, cy, cx + 14, cy, { stroke: c, strokeOpacity: op, strokeWidth: 4 }))
      }
    }
    const route = []
    let i = r.int(0, 10)
    for (let k = 0; k < 9 && i < cells.length; k++) { route.push(cells[i]); i += r.int(9, 19) }
    out.push(polyline(route, { stroke: RAMP[1], strokeWidth: 6 }))
    route.forEach(p => out.push(circle(p[0], p[1], 11, { fill: CREAM })))
    return out.join('')
  },

  // AI and creative work: a rigid node network on the left melting into loose ribbons on the right
  'ai-and-creatives'(r) {
    const out = []
    const nodes = []
    for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) nodes.push([200 + c * 150, 210 + k * 160 + r.range(-20, 20), c])
    for (const a of nodes) for (const b of nodes) if (b[2] === a[2] + 1 && r.chance(0.6)) out.push(line(a[0], a[1], b[0], b[1], { stroke: CREAM, strokeOpacity: 0.22, strokeWidth: 2 }))
    nodes.forEach(p => out.push(circle(p[0], p[1], p[2] === 3 ? 16 : 11, p[2] === 3 ? { fill: RAMP[1] } : { fill: CREAM, fillOpacity: 0.85 })))
    for (let k = 0; k < 7; k++) {
      const y0 = 210 + (k % 4) * 160
      const y1 = r.range(140, 760)
      const c = RAMP[k % RAMP.length]
      out.push(path(`M650,${n(y0)} C${n(r.range(850, 1000))},${n(y0 + r.range(-200, 200))} ${n(r.range(1050, 1250))},${n(y1 + r.range(-250, 250))} ${n(W - 140)},${n(y1)}`, stroke(c, r.range(10, 34), 0.85)))
    }
    out.push(circle(W - 300, 260, 70, stroke(CREAM, 3, 0.6)))
    return out.join('')
  },

  // a chatbot: alternating speech bubbles, the last one still typing
  'ai-chatbot'(r) {
    const out = []
    let y = 120
    let k = 0
    while (y < H - 220) {
      const user = k % 2 === 1
      const w = r.range(380, 640)
      const h = r.range(90, 150)
      const x = user ? W - 220 - w : 220
      out.push(rect(x, y, w, h, { rx: 34, ...(user ? { fill: RAMP[1] } : { fill: CHAR, fillOpacity: 0.85, stroke: CREAM, strokeOpacity: 0.25, strokeWidth: 2 }) }))
      out.push(poly(user ? [[x + w - 40, y + h - 2], [x + w + 26, y + h + 26], [x + w - 6, y + h - 40]] : [[x + 40, y + h - 2], [x - 26, y + h + 26], [x + 6, y + h - 40]], user ? { fill: RAMP[1] } : { fill: CHAR, fillOpacity: 0.85 }))
      const lines = Math.max(1, Math.floor((h - 40) / 34))
      for (let i = 0; i < lines; i++) {
        const lw = (w - 80) * (i === lines - 1 ? r.range(0.35, 0.7) : r.range(0.8, 1))
        out.push(rect(x + 40, y + 34 + i * 34 + (h - 40 - lines * 34) / 2, lw, 12, { rx: 6, fill: user ? INK : CREAM, fillOpacity: user ? 0.5 : 0.4 }))
      }
      y += h + r.range(44, 70)
      k++
    }
    out.push(rect(220, H - 190, 200, 86, { rx: 43, fill: CHAR, stroke: RAMP[0], strokeWidth: 2.5 }))
    for (let i = 0; i < 3; i++) out.push(circle(272 + i * 48, H - 147, 12, { fill: RAMP[i], fillOpacity: 1 - i * 0.25 }))
    return out.join('')
  },

  // art direction: a bold composition on rule-of-thirds guides, with crop and registration marks
  'art-direction'(r) {
    const out = []
    const dash = { stroke: CREAM, strokeOpacity: 0.28, strokeWidth: 2, strokeDasharray: '10 12' }
    for (const t of [1 / 3, 2 / 3]) { out.push(line(W * t, 110, W * t, H - 110, dash)); out.push(line(160, H * t, W - 160, H * t, dash)) }
    const cx = W * r.pick([1 / 3, 2 / 3])
    const cy = H * r.pick([1 / 3, 2 / 3])
    out.push(rect(cx - r.range(380, 460), cy - 150, r.range(520, 640), 340, { fill: CREAM, fillOpacity: 0.92, transform: `rotate(${n(r.range(-6, 6))} ${n(cx)} ${n(cy)})` }))
    out.push(circle(cx + r.range(40, 120), cy - r.range(10, 60), 200, { fill: RAMP[1] }))
    out.push(poly([[cx - 300, cy + 240], [cx - 60, cy - 120], [cx + 160, cy + 240]], { fill: RAMP[4], fillOpacity: 0.95 }))
    out.push(circle(cx + r.range(40, 120), cy - r.range(10, 60), 200, stroke(INK, 3, 0.5)))
    const crop = (x, y, sx, sy) => line(x, y, x + sx * 60, y, { stroke: RAMP[0], strokeWidth: 4 }) + line(x, y, x, y + sy * 60, { stroke: RAMP[0], strokeWidth: 4 })
    out.push(crop(180, 140, 1, 1), crop(W - 180, 140, -1, 1), crop(180, H - 140, 1, -1), crop(W - 180, H - 140, -1, -1))
    const rx = W - 250
    const ry = r.chance(0.5) ? 230 : H - 230
    out.push(circle(rx, ry, 34, stroke(CREAM, 2.5, 0.7)), line(rx - 52, ry, rx + 52, ry, { stroke: CREAM, strokeOpacity: 0.7, strokeWidth: 2.5 }), line(rx, ry - 52, rx, ry + 52, { stroke: CREAM, strokeOpacity: 0.7, strokeWidth: 2.5 }))
    return out.join('')
  },

  // a design system: a grid of token tiles (colours, radii, shapes), one row of components built from them
  'design-system'(r) {
    const out = []
    const s = 118
    const gap = 22
    const cols = 9
    const rows = 4
    const x0 = (W - (cols * s + (cols - 1) * gap)) / 2
    const y0 = (H - (rows * s + (rows - 1) * gap)) / 2
    for (let c = 0; c < cols; c++) {
      for (let k = 0; k < rows; k++) {
        const x = x0 + c * (s + gap)
        const y = y0 + k * (s + gap)
        const kind = r.int(0, 5)
        const rad = r.pick([0, 12, 28, s / 2])
        if (kind <= 1) out.push(rect(x, y, s, s, { rx: rad, fill: RAMP[(c + k) % RAMP.length] }))
        else if (kind === 2) out.push(rect(x, y, s, s, { rx: rad, ...stroke(CREAM, 2.5, 0.45) }))
        else if (kind === 3) { out.push(rect(x, y, s, s, { rx: 18, fill: CHAR })); out.push(path(`M${x},${y + s} A${s},${s} 0 0 1 ${x + s},${y}`, { fill: 'none', stroke: RAMP[0], strokeWidth: 3 })); out.push(path(`M${x},${y + s} L${x},${y + s * 0.4} A${s * 0.6},${s * 0.6} 0 0 1 ${x + s * 0.6},${y + s} Z`, { fill: RAMP[2] })) }
        else if (kind === 4) { out.push(rect(x, y, s, s, { rx: 18, fill: CREAM, fillOpacity: 0.92 })); out.push(circle(x + s / 2, y + s / 2, s * 0.22, { fill: RAMP[r.int(0, 3)] })) }
        else { out.push(rect(x, y, s, s, { rx: 18, fill: CHAR, fillOpacity: 0.7 })); for (let i = 0; i < 3; i++) out.push(rect(x + 20, y + 30 + i * 26, (s - 40) * (1 - i * 0.25), 10, { rx: 5, fill: CREAM, fillOpacity: 0.5 })) }
      }
    }
    return out.join('')
  },

  // dynamic pricing: price tags climbing a step line
  'dynamic-pricing-in-e-commerse'(r) {
    const out = []
    const steps = 6
    const pts = []
    for (let i = 0; i < steps; i++) {
      const x = 170 + i * 200
      const y = 740 - i * 92 - r.range(0, 30)
      pts.push([x, y], [x + 200, y])
    }
    out.push(polyline(pts, { stroke: CREAM, strokeOpacity: 0.35, strokeWidth: 3, strokeDasharray: '2 14' }))
    for (let i = 0; i < steps; i++) {
      const [x, y] = pts[i * 2]
      const w = 130 + i * 16
      const h = w * 0.55
      const tx = x + 30
      const ty = y - h - 30
      const rot = r.range(-14, 10)
      const tag = poly([[tx, ty + h / 2], [tx + h / 2, ty], [tx + w + h / 2, ty], [tx + w + h / 2, ty + h], [tx + h / 2, ty + h]], { fill: RAMP[Math.max(0, 5 - i)], stroke: i === steps - 1 ? CREAM : 'none', strokeWidth: 3 })
      const hole = circle(tx + h / 2, ty + h / 2, h * 0.12, { fill: '#17151a' })
      const bars = rect(tx + h / 2 + 30, ty + h * 0.32, w * 0.55, h * 0.14, { rx: h * 0.07, fill: INK, fillOpacity: 0.45 }) + rect(tx + h / 2 + 30, ty + h * 0.56, w * 0.35, h * 0.14, { rx: h * 0.07, fill: INK, fillOpacity: 0.3 })
      out.push(line(tx + h / 2, ty + h / 2, x + 20, y - 4, { stroke: CREAM, strokeOpacity: 0.5, strokeWidth: 2 }))
      out.push(g(tag + hole + bars, { transform: `rotate(${n(rot)} ${n(tx)} ${n(ty + h / 2)})` }))
    }
    out.push(polyline(pts, { stroke: RAMP[1], strokeWidth: 5 }))
    return out.join('')
  },

  // auto layout: frames in frames with even padding and gaps, stacked in layers
  'figma-auto-layout'(r) {
    const out = []
    const fx = 300
    const fy = 170
    const fw = 1000
    const fh = 560
    for (let L = 3; L >= 1; L--) out.push(rect(fx - L * 34, fy - L * 34, fw, fh, { rx: 26, ...stroke(CREAM, 2, 0.08 + (3 - L) * 0.06) }))
    out.push(rect(fx, fy, fw, fh, { rx: 26, fill: CHAR, fillOpacity: 0.55, stroke: CREAM, strokeOpacity: 0.5, strokeWidth: 2.5 }))
    const pad = 40
    const gap = 28
    const kids = r.int(3, 4)
    const widths = Array.from({ length: kids }, () => r.range(0.7, 1.4))
    const total = widths.reduce((a, b) => a + b, 0)
    const avail = fw - pad * 2 - gap * (kids - 1)
    let x = fx + pad
    const stackAt = r.int(0, kids - 1)
    widths.forEach((wf, i) => {
      const w = (avail * wf) / total
      const y = fy + pad
      const h = fh - pad * 2
      if (i === stackAt) {
        out.push(rect(x, y, w, h, { rx: 16, ...stroke(RAMP[0], 2.5) }))
        const m = r.int(3, 4)
        const ih = (h - 24 * 2 - 18 * (m - 1)) / m
        for (let k = 0; k < m; k++) out.push(rect(x + 24, y + 24 + k * (ih + 18), w - 48, ih, { rx: 12, fill: RAMP[k + 1] }))
        out.push(line(x + w / 2, y + 2, x + w / 2, y + 22, { stroke: RAMP[0], strokeWidth: 2, strokeDasharray: '3 5' }))
      } else {
        out.push(rect(x, y, w, h, { rx: 16, fill: i % 2 ? CREAM : RAMP[4], fillOpacity: i % 2 ? 0.9 : 1 }))
      }
      if (i < kids - 1) { const gx = x + w + gap / 2; out.push(line(gx, fy + fh / 2 - 26, gx, fy + fh / 2 + 26, { stroke: RAMP[0], strokeWidth: 3 })) }
      x += w + gap
    })
    out.push(line(fx + 4, fy + fh / 2, fx + pad - 4, fy + fh / 2, { stroke: RAMP[0], strokeWidth: 2, strokeDasharray: '3 5' }))
    out.push(line(fx + fw - pad + 4, fy + fh / 2, fx + fw - 4, fy + fh / 2, { stroke: RAMP[0], strokeWidth: 2, strokeDasharray: '3 5' }))
    return out.join('')
  },

  // components: the four-diamond main component, and its instances in a grid
  'figma-components'(r) {
    const out = []
    const four = (cx, cy, s, o) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => poly(ngon(cx + dx * s * 1.05, cy + dy * s * 1.05, s, 4, 0), o)).join('')
    const mainX = 430
    const mainY = H / 2
    out.push(four(mainX, mainY, 110, { fill: RAMP[1] }))
    out.push(rect(mainX - 290, mainY - 290, 580, 580, { rx: 30, ...stroke(RAMP[0], 2, 0.6), strokeDasharray: '12 10' }))
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 3; k++) {
        const cx = 900 + c * 165
        const cy = 230 + k * 220
        const filled = r.chance(0.25)
        out.push(g(poly(ngon(cx, cy, 60, 4, 0), filled ? { fill: r.pick([RAMP[0], RAMP[2], CREAM]) } : stroke(CREAM, 3, 0.55)), {}))
        if (r.chance(0.3)) out.push(circle(cx, cy, 10, { fill: RAMP[0] }))
        if (k === 0 || r.chance(0.35)) out.push(path(`M${mainX + 250},${mainY} C${n(700)},${mainY} ${n(cx - 140)},${n(cy)} ${n(cx - 68)},${n(cy)}`, stroke(CREAM, 1.5, 0.18)))
      }
    }
    return out.join('')
  },

  // variables: one token per row, one column per mode, values changing across modes
  'figma-variables'(r) {
    const out = []
    const modes = 3
    const rows = 6
    const x0 = 420
    const colW = 330
    const y0 = 150
    const rowH = 105
    for (let m = 0; m < modes; m++) out.push(rect(x0 + m * colW - 40, y0 - 50, colW - 40, rows * rowH + 40, { rx: 22, fill: m === 1 ? CHAR : 'none', fillOpacity: 0.5, stroke: CREAM, strokeOpacity: m === 1 ? 0.35 : 0.12, strokeWidth: 2 }))
    for (let k = 0; k < rows; k++) {
      const y = y0 + k * rowH + 20
      out.push(rect(200, y - 9, r.range(100, 160), 18, { rx: 9, fill: CREAM, fillOpacity: 0.4 }))
      for (let m = 0; m < modes; m++) {
        const x = x0 + m * colW
        const v = (k + m * 2 + r.int(0, 1)) % RAMP.length
        out.push(circle(x, y, 26, { fill: m === 2 && k % 2 ? CREAM : RAMP[v] }))
        const t = r.range(0.15, 0.95)
        out.push(line(x + 56, y, x + 230, y, { stroke: CREAM, strokeOpacity: 0.2, strokeWidth: 6 }))
        out.push(line(x + 56, y, x + 56 + 174 * t, y, { stroke: RAMP[v], strokeWidth: 6 }))
        out.push(circle(x + 56 + 174 * t, y, 10, { fill: CREAM }))
      }
    }
    return out.join('')
  },

  // WebP: an image in pixel blocks, coarse on the left and finer to the right
  'is-webp-the-goat'(r) {
    const out = []
    const a = r.range(0, 6)
    const b = r.range(0, 6)
    const field = (x, y) => 0.5 + 0.25 * Math.sin(x / 210 + a) + 0.25 * Math.cos(y / 160 + b + x / 500)
    const bands = [[120, 450, 75], [450, 780, 50], [780, 1080, 30], [1080, 1480, 15]]
    const top = 120
    const bot = H - 120
    for (const [xa, xb, s] of bands) {
      for (let x = xa; x < xb; x += s) {
        for (let y = top; y < bot; y += s) {
          const v = field(x + s / 2, y + s / 2)
          const idx = Math.min(RAMP.length - 1, Math.floor((1 - v) * RAMP.length))
          if (v > 0.86) out.push(rect(x, y, s - 2, s - 2, { fill: CREAM, fillOpacity: 0.9 }))
          else if (v < 0.18) continue
          else out.push(rect(x, y, s - 2, s - 2, { fill: RAMP[idx], fillOpacity: 0.35 + v * 0.65 }))
        }
      }
      out.push(line(xa, top - 30, xa, bot + 30, { stroke: CREAM, strokeOpacity: 0.25, strokeWidth: 2 }))
    }
    return out.join('')
  },

  // Pinoy e-commerce: a sun with eight rays and three stars over stacked parcels
  'pinoy-e-commerce'(r) {
    const out = []
    const sx = r.range(420, 560)
    const sy = 420
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + Math.PI / 8
      const p = (rad, da) => [sx + rad * Math.cos(ang + da), sy + rad * Math.sin(ang + da)]
      out.push(poly([p(150, -0.12), p(330, 0), p(150, 0.12)], { fill: RAMP[1], fillOpacity: 0.9 }))
    }
    out.push(circle(sx, sy, 120, { fill: RAMP[0] }))
    out.push(circle(sx, sy, 120, stroke(CREAM, 3, 0.4)))
    ;[[sx - 290, sy - 260], [sx + 310, sy - 250], [sx + 10, sy + 360]].forEach(([x, y]) => out.push(poly(star(x, y, 34), { fill: CREAM })))
    const bx = 950
    const by = H - 140
    const sizes = [[220, 170], [200, 150], [260, 140], [170, 130], [150, 110]]
    let stackY = by
    let stackX = bx
    sizes.forEach(([w, h], i) => {
      const x = stackX + r.range(-30, 30) + (i === 2 ? 210 : 0)
      const y = i === 2 ? by - h : stackY - h
      const c = [RAMP[3], CREAM, RAMP[2], RAMP[4], RAMP[1]][i]
      out.push(rect(x, y, w, h, { rx: 8, fill: c, fillOpacity: c === CREAM ? 0.9 : 1 }))
      out.push(rect(x + w / 2 - 14, y, 28, h, { fill: INK, fillOpacity: 0.22 }))
      out.push(line(x + 18, y + 22, x + 70, y + 22, { stroke: INK, strokeOpacity: 0.35, strokeWidth: 6 }))
      if (i !== 2) stackY = y - 10
      stackX += i === 2 ? 0 : r.range(-10, 10)
    })
    return out.join('')
  },

  // a PWA: a phone of app tiles, one installed, with signal arcs that keep going offline
  pwa(r) {
    const out = []
    const px = r.range(560, 700)
    const py = 110
    const pw = 360
    const ph = 680
    out.push(rect(px, py, pw, ph, { rx: 52, fill: CHAR, fillOpacity: 0.75, stroke: CREAM, strokeOpacity: 0.55, strokeWidth: 3 }))
    out.push(rect(px + pw / 2 - 50, py + 22, 100, 14, { rx: 7, fill: INK }))
    const t = 76
    const gap = 26
    const lit = r.int(0, 11)
    for (let k = 0; k < 4; k++) {
      for (let c = 0; c < 3; c++) {
        const i = k * 3 + c
        const x = px + 40 + c * (t + gap) + 6
        const y = py + 90 + k * (t + gap + 14)
        out.push(rect(x, y, t, t, { rx: 20, ...(i === lit ? { fill: RAMP[1] } : r.chance(0.5) ? { fill: CREAM, fillOpacity: 0.16 } : stroke(CREAM, 2, 0.3)) }))
        if (i === lit) out.push(poly(ngon(x + t / 2, y + t / 2, 18, 4, Math.PI / 4), { fill: CREAM }))
      }
    }
    out.push(rect(px + 120, py + ph - 40, 120, 8, { rx: 4, fill: CREAM, fillOpacity: 0.5 }))
    const ax = px + pw + 90
    const ay = py + 170
    for (let i = 1; i <= 5; i++) out.push(path(`M${n(ax + i * 70 * Math.cos(-0.8))},${n(ay + i * 70 * Math.sin(-0.8))} A${i * 70},${i * 70} 0 0 1 ${n(ax + i * 70 * Math.cos(0.8))},${n(ay + i * 70 * Math.sin(0.8))}`, stroke(i < 4 ? RAMP[i - 1] : CREAM, 10, i < 4 ? 1 : 0.15)))
    out.push(circle(ax, ay, 16, { fill: RAMP[0] }))
    out.push(rect(px - 330, py + 380, 240, 150, { rx: 22, ...stroke(CREAM, 2.5, 0.35), strokeDasharray: '14 10' }))
    out.push(line(px - 90, py + 455, px - 10, py + 455, { stroke: RAMP[0], strokeWidth: 3, strokeDasharray: '6 8' }))
    return out.join('')
  },

  // SEO: a list of search results, bars climbing, a lens over the top spot
  'seo-maxxing'(r) {
    const out = []
    for (let i = 0; i < 6; i++) {
      const y = 170 + i * 100
      const top = i === 0
      out.push(rect(180, y, top ? 560 : r.range(330, 520), 22, { rx: 11, fill: top ? RAMP[1] : CREAM, fillOpacity: top ? 1 : 0.5 - i * 0.05 }))
      out.push(rect(180, y + 38, r.range(240, 480), 12, { rx: 6, fill: CREAM, fillOpacity: 0.18 }))
    }
    const bars = 6
    const base = H - 140
    const pts = []
    for (let i = 0; i < bars; i++) {
      const x = 900 + i * 95
      const h = 90 + i * 70 + r.range(-20, 20)
      out.push(rect(x, base - h, 62, h, { rx: 10, fill: RAMP[5 - i] }))
      pts.push([x + 31, base - h - 40])
    }
    out.push(polyline(pts, { stroke: CREAM, strokeWidth: 4 }))
    const [lx, ly] = pts[pts.length - 1]
    out.push(poly([[lx, ly - 40], [lx - 26, ly + 4], [lx + 26, ly + 4]], { fill: CREAM }))
    out.push(circle(470, 182, 110, stroke(CREAM, 10, 0.85)))
    out.push(line(548, 260, 640, 352, { stroke: CREAM, strokeOpacity: 0.85, strokeWidth: 18 }))
    return out.join('')
  },

  // sketching: loose hatching and wobbly boxes, one bold orange loop
  sketching(r) {
    const out = []
    const box = (x, y, w, h, c, sw, op) => out.push(path(wobble(r, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y - 6]], 7), stroke(c, sw, op)))
    box(200, 160, 520, 340, CREAM, 3, 0.6)
    box(780, 160, 620, 200, CREAM, 3, 0.45)
    box(780, 410, 300, 330, CREAM, 3, 0.45)
    box(1120, 410, 280, 330, CREAM, 3, 0.45)
    box(200, 550, 520, 190, CREAM, 3, 0.35)
    for (let i = 0; i < 26; i++) { const x = 220 + i * 19; out.push(path(wobble(r, [[x, 480], [x + 120, 180]].map(([a, b]) => [Math.min(a, 700), b]), 4), stroke(SILVER, 2, 0.3))) }
    for (let i = 0; i < 4; i++) out.push(path(wobble(r, [[230, 590 + i * 34], [230 + r.range(250, 460), 590 + i * 34]], 5), stroke(CREAM, 4, 0.4)))
    const cx = 1090
    const cy = 260
    let d = ''
    for (let t = 0; t <= Math.PI * 4.2; t += 0.18) { const rr = 120 + 16 * Math.sin(t * 3) + r.range(-6, 6); d += `${d ? 'L' : 'M'}${n(cx + rr * 1.8 * Math.cos(t))},${n(cy + rr * 0.6 * Math.sin(t))} ` }
    out.push(path(d, stroke(RAMP[1], 7, 0.95)))
    out.push(path(wobble(r, [[930, 590], [1000, 520], [1060, 640]], 6), stroke(RAMP[0], 6)))
    out.push(path(wobble(r, [[1160, 680], [1260, 470], [1360, 680], [1160, 680]], 6), stroke(RAMP[2], 6)))
    return out.join('')
  },

  // a mega menu: a nav bar, then a wide panel of link columns and a featured tile
  'the-mega-menu-of-academics'(r) {
    const out = []
    const x0 = 180
    const w = W - 360
    out.push(rect(x0, 110, w, 74, { rx: 37, fill: CHAR, fillOpacity: 0.8, stroke: CREAM, strokeOpacity: 0.25, strokeWidth: 2 }))
    const active = r.int(1, 4)
    for (let i = 0; i < 6; i++) out.push(rect(x0 + 60 + i * 190, 138, 120, 18, { rx: 9, fill: i === active ? RAMP[1] : CREAM, fillOpacity: i === active ? 1 : 0.4 }))
    out.push(poly([[x0 + 120 + active * 190 - 18, 215], [x0 + 120 + active * 190, 196], [x0 + 120 + active * 190 + 18, 215]], { fill: CREAM, fillOpacity: 0.95 }))
    out.push(rect(x0, 214, w, H - 214 - 110, { rx: 24, fill: CREAM, fillOpacity: 0.95 }))
    const cols = 4
    const colW = (w - 400 - 60) / cols
    for (let c = 0; c < cols; c++) {
      const cx = x0 + 50 + c * colW
      out.push(rect(cx, 270, colW * 0.62, 20, { rx: 10, fill: RAMP[c % 3 + 1] }))
      const items = r.int(5, 8)
      for (let k = 0; k < items; k++) out.push(rect(cx, 322 + k * 46, colW * r.range(0.4, 0.8), 13, { rx: 6.5, fill: INK, fillOpacity: k === 0 && c === 1 ? 0.75 : 0.28 }))
    }
    const fx = x0 + w - 380
    out.push(rect(fx, 260, 330, H - 260 - 160, { rx: 18, fill: '#1c191c' }))
    out.push(circle(fx + 240, 360, 70, { fill: RAMP[1] }))
    out.push(poly([[fx + 30, H - 190], [fx + 150, 400], [fx + 270, H - 190]], { fill: RAMP[3] }))
    out.push(rect(fx + 30, H - 250 + 25, 160, 14, { rx: 7, fill: CREAM, fillOpacity: 0.7 }))
    return out.join('')
  },

  // three fonts: three letter-ish shapes in three weights, on type guide lines
  'three-fonts'(r) {
    const out = []
    const base = 690
    const xh = 410
    const cap = 220
    for (const [y, op] of [[cap, 0.18], [xh, 0.28], [base, 0.5]]) out.push(line(130, y, W - 130, y, { stroke: CREAM, strokeOpacity: op, strokeWidth: 2, strokeDasharray: y === base ? '' : '10 10' }))
    out.push(path(`M${n(270)},${base} L${n(470)},${cap} L${n(670)},${base} M${n(340)},${n(base - 150)} L${n(600)},${n(base - 150)}`, stroke(CREAM, 14, 0.95)))
    out.push(circle(470, cap, 9, { fill: RAMP[0] }))
    const ox = 860
    out.push(`<ellipse ${attrs({ cx: ox, cy: (xh + base) / 2, rx: 150, ry: (base - xh) / 2 + 4, fill: 'none', stroke: RAMP[1], strokeWidth: 52 })}/>`)
    const ix = 1240
    const wgt = r.range(80, 110)
    out.push(rect(ix - wgt / 2, cap, wgt, base - cap, { fill: RAMP[3] }))
    out.push(rect(ix - 120, cap, 240, 26, { fill: RAMP[3] }), rect(ix - 120, base - 26, 240, 26, { fill: RAMP[3] }))
    for (let i = 0; i < 3; i++) out.push(rect(270 + i * 420 + 100, base + 60, [60, 140, 220][i], 16, { rx: 8, fill: CREAM, fillOpacity: 0.3 + i * 0.15 }))
    return out.join('')
  },

  // UX research: sticky notes sorted into clusters (an affinity map), with a lens over one
  'ux-research'(r) {
    const out = []
    const centers = [[420, 360], [880, 560], [1240, 300]]
    const colours = [[RAMP[0], RAMP[1]], [CREAM, SILVER], [RAMP[2], RAMP[4]]]
    centers.forEach(([cx, cy], ci) => {
      const notes = r.int(6, 9)
      for (let i = 0; i < notes; i++) {
        const a = r.range(0, Math.PI * 2)
        const d = r.range(30, 170)
        const x = cx + d * Math.cos(a)
        const y = cy + d * Math.sin(a) * 0.75
        out.push(line(cx, cy, x, y, { stroke: CREAM, strokeOpacity: 0.12, strokeWidth: 2 }))
        out.push(rect(x - 42, y - 42, 84, 84, { rx: 6, fill: r.pick(colours[ci]), fillOpacity: 0.95, transform: `rotate(${n(r.range(-14, 14))} ${n(x)} ${n(y)})` }))
      }
      out.push(circle(cx, cy, 14, { fill: CREAM }))
    })
    out.push(line(420, 360, 880, 560, { stroke: RAMP[0], strokeWidth: 3, strokeDasharray: '4 10' }), line(880, 560, 1240, 300, { stroke: RAMP[0], strokeWidth: 3, strokeDasharray: '4 10' }))
    const [lx, ly] = centers[r.int(0, 2)]
    out.push(circle(lx + 60, ly - 40, 190, stroke(CREAM, 8, 0.8)))
    out.push(line(lx + 60 + 134, ly - 40 + 134, lx + 60 + 230, ly - 40 + 230, { stroke: CREAM, strokeOpacity: 0.8, strokeWidth: 16 }))
    return out.join('')
  }
}

// any article without its own motif: a seeded field of polygons
function generic(r) {
  const out = []
  for (let i = 0; i < 40; i++) {
    const k = r.int(3, 6)
    out.push(poly(ngon(r.range(160, W - 160), r.range(140, H - 140), r.range(20, 90), k, r.range(0, 6)), r.chance(0.5) ? { fill: fills(r) } : stroke(CREAM, 2, 0.4)))
  }
  return out.join('')
}

export function coverSvg(slug) {
  const r = rng(hash(slug))
  return frame(r, (MOTIFS[slug] ?? generic)(r))
}

const args = process.argv.slice(2)
const keepSvg = args.includes('--svg')
const only = args.filter(a => !a.startsWith('--'))
const slugs = only.length ? only : (await readdir(join(ROOT, 'content', 'case-studies'))).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
await mkdir(OUT, { recursive: true })
for (const slug of slugs) {
  const svg = coverSvg(slug)
  if (keepSvg) await writeFile(join(OUT, `${slug}.svg`), svg)
  await sharp(Buffer.from(svg)).webp({ quality: 84 }).toFile(join(OUT, `${slug}.webp`))
  console.log(`${MOTIFS[slug] ? '  ' : '* '}public/covers/${slug}.webp`)
}
if (slugs.some(s => !MOTIFS[s])) console.log('* no motif of its own yet (generic polygons): add one to MOTIFS in tools/covers.mjs')

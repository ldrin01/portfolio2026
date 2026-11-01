// The Game Boy's two lives, shared by the lab's carved model (gameboy-3d.js) and the About page's light one (app/lib/gameboy-detail.js).
// Light theme: brand new. Clean grey plastic with no yellowing, a protective film still on the screen with its pull tab, and a crisp
// Figma sticker on the back.
// Dark theme: the old one. The yellowed plastic, scuffed corners and edges, hairline scratches, grime round the buttons, "Drin" in
// marker on the front, a Photoshop sticker on the back with a corner peeling up, and a dent and scratches in the screen cover.
// It was also dropped on its big corner (a chunk gone, cracks running out front and back), left on a hot jeepney dashboard (a melted
// spot by the cartridge slot), lost its battery door (four KINGEVER AAs showing, one end rusted), and has a PH flag sticker by the
// volume wheel, buttons worn shiny, lint in every gap and "Eldrin ♥ Elis" scratched into the back.
// Functions that take a `mode` draw colour ('c') or, for the About model's relief, height ('h').
// (The LCD's own wear, burn-in, dead pixels and weak batteries, is drawn by the game: gameboy-game.js.)
// Everything here paints onto transparent canvases in the models' own coordinates: m.x / m.y map a point, m.s is canvas px per unit.
// The front uses the Front photo's pixels (1049 x 1800); the back uses fractions of the body as you LOOK AT THE BACK.
window.GBWear = (() => {
  const worn = () => document.documentElement.dataset.theme === 'dark'
  const watch = (cb) => { const mo = new MutationObserver(() => cb(worn())); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => mo.disconnect() }
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

  // ── plastic colour: the old shell keeps its yellow; the new one is the same lightness in a clean, faintly cool grey ──
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  // a solid colour (sRGB 0..1) as new plastic
  const fresh = ([r, g, b]) => { const l = lum(r, g, b); return [l * 0.985, l * 0.995, l * 1.02].map(v => Math.min(1, v)) }
  // is this colour the beige plastic (warm, not very saturated, not dark)? buttons, the grey bezel and the black parts are left alone
  const isPlastic = ([r, g, b]) => r >= g && g >= b && r - b > 0.04 && r - b < 0.3 && r > 0.35
  // for a white material whose texture holds the beige: the multiplier (linear) that turns that beige into new grey
  const tintFor = (hex) => {
    const c = [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255], f = fresh(c)
    return f.map((v, i) => Math.pow(v, 2.2) / Math.pow(c[i], 2.2))
  }

  // a painted texture as new plastic: every warm, low-colour pixel (the beige, its shading, the grime-brown grooves) turns to the
  // same lightness of grey; the printing (blue, purple, red) and see-through pixels are left alone
  function freshCanvas(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height
    const g = c.getContext('2d'); g.drawImage(src, 0, 0)
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255
      if (r >= gg && gg >= b - 0.01 && r - b > 0.015 && r - b < 0.32) { const f = fresh([r, gg, b]); d[i] = f[0] * 255; d[i + 1] = f[1] * 255; d[i + 2] = f[2] * 255 }
    }
    g.putImageData(img, 0, 0)
    return c
  }

  // ── the front of the old one ──
  // body silhouette in Front photo px, and where its corners are
  const BODY = { x0: 22, x1: 1027, y0: 31, y1: 1762 }
  const perimeter = (n) => {
    const pts = [], { x0, x1, y0, y1 } = BODY, R = 236          // the big curve bottom right
    for (let i = 0; i < n; i++) {
      const t = i / n, side = Math.floor(t * 4), u = t * 4 - side
      if (side === 0) pts.push([x0 + (x1 - x0) * u, y0])
      else if (side === 1) pts.push([x1, y0 + (y1 - R - y0) * u])
      else if (side === 2) { const a = u * Math.PI / 2; pts.push([x1 - R + Math.cos(a) * R, y1 - R + Math.sin(a) * R]) }
      else pts.push(u < 0.5 ? [x1 - R - (x1 - R - x0) * u * 2, y1] : [x0, y1 - (y1 - y0) * (u - 0.5) * 2])
    }
    return pts
  }
  const scratch = (g, m, r, x, y, len, ang, w, light, dark) => {
    const bend = (r() - 0.5) * 0.25, steps = 6
    const path = []
    for (let i = 0; i <= steps; i++) { const t = i / steps, a = ang + bend * t; path.push([x + Math.cos(a) * len * t, y + Math.sin(a) * len * t]) }
    const stroke = (dx, dy, col, lw) => { g.beginPath(); path.forEach(([px, py], i) => (i ? g.lineTo(m.x(px) + dx, m.y(py) + dy) : g.moveTo(m.x(px) + dx, m.y(py) + dy))); g.strokeStyle = col; g.lineWidth = lw; g.stroke() }
    g.lineCap = 'round'
    if (dark) stroke(m.s * 0.7, m.s * 0.7, dark, w * m.s)
    stroke(0, 0, light, w * m.s)
  }
  function body(g, m) {
    const r = rng(1983)
    g.save()
    // nothing spills past the console's outline (the big round corner bottom right)
    g.beginPath(); g.roundRect(m.x(BODY.x0), m.y(BODY.y0), (BODY.x1 - BODY.x0) * m.s, (BODY.y1 - BODY.y0) * m.s, [40 * m.s, 40 * m.s, 236 * m.s, 42 * m.s]); g.clip()
    // uneven yellowing: big faint blotches, darker toward where hands hold it
    for (let i = 0; i < 26; i++) {
      const x = BODY.x0 + r() * (BODY.x1 - BODY.x0), y = BODY.y0 + r() * (BODY.y1 - BODY.y0), rad = (80 + r() * 220) * m.s
      const gr = g.createRadialGradient(m.x(x), m.y(y), 0, m.x(x), m.y(y), rad)
      gr.addColorStop(0, `rgba(150,118,40,${0.03 + r() * 0.05})`); gr.addColorStop(1, 'rgba(150,118,40,0)')
      g.fillStyle = gr; g.fillRect(m.x(x) - rad, m.y(y) - rad, rad * 2, rad * 2)
    }
    // scuffs and grime along the edges, heaviest at the corners
    perimeter(220).forEach(([x, y], i) => {
      const corner = Math.min(Math.hypot(x - BODY.x0, y - BODY.y0), Math.hypot(x - BODY.x1, y - BODY.y0), Math.hypot(x - BODY.x0, y - BODY.y1), Math.hypot(x - 860, y - 1600))
      const heavy = corner < 160 ? 1 : 0.45
      if (r() > 0.75 * heavy + 0.2) return
      const rad = (6 + r() * 20 * heavy) * m.s
      const gr = g.createRadialGradient(m.x(x), m.y(y), 0, m.x(x), m.y(y), rad)
      gr.addColorStop(0, `rgba(84,66,30,${(0.16 + r() * 0.22) * heavy})`); gr.addColorStop(1, 'rgba(84,66,30,0)')
      g.fillStyle = gr; g.fillRect(m.x(x) - rad, m.y(y) - rad, rad * 2, rad * 2)
      if (r() < 0.5 * heavy) {   // worn shiny where it rubbed
        g.fillStyle = `rgba(255,250,232,${0.12 + r() * 0.2})`; g.beginPath(); g.ellipse(m.x(x + (r() - 0.5) * 12), m.y(y + (r() - 0.5) * 12), (3 + r() * 8) * m.s, (1 + r() * 3) * m.s, r() * Math.PI, 0, Math.PI * 2); g.fill()
      }
      if (i % 3 === 0) scratch(g, m, r, x + (r() - 0.5) * 30, y + (r() - 0.5) * 30, 10 + r() * 30, r() * Math.PI * 2, 0.9, 'rgba(255,252,240,.4)', 'rgba(60,48,24,.25)')
    })
    // grime packed round the buttons and the bezel, where fingers go
    const ring = (x, y, rx, ry, rot = 0, a = 0.22) => { g.save(); g.translate(m.x(x), m.y(y)); g.rotate(rot); g.filter = `blur(${3 * m.s}px)`; g.strokeStyle = `rgba(70,54,22,${a})`; g.lineWidth = 9 * m.s; g.beginPath(); g.ellipse(0, 0, rx * m.s, ry * m.s, 0, 0, Math.PI * 2); g.stroke(); g.restore() }
    ring(223, 1205, 150, 150, 0, 0.26); ring(735, 1225, 66, 66); ring(903, 1146, 66, 66)
    ring(819, 1186, 196, 101, -Math.atan2(79, 168), 0.16); ring(388, 1452, 82, 37, -0.4, 0.2); ring(561, 1449, 82, 37, -0.4, 0.2)
    g.save(); g.filter = `blur(${4 * m.s}px)`; g.strokeStyle = 'rgba(70,54,22,.18)'; g.lineWidth = 8 * m.s; g.beginPath(); g.roundRect(m.x(86), m.y(176), (962 - 86) * m.s, (847 - 176) * m.s, [26 * m.s, 26 * m.s, 118 * m.s, 26 * m.s]); g.stroke(); g.restore()
    // the thumb's favourite spot: a polished, slightly dirty patch next to the D-pad and between A and B
    ;[[300, 1300, 70], [820, 1220, 60]].forEach(([x, y, rad]) => { const gr = g.createRadialGradient(m.x(x), m.y(y), 0, m.x(x), m.y(y), rad * m.s); gr.addColorStop(0, 'rgba(110,88,40,.12)'); gr.addColorStop(1, 'rgba(110,88,40,0)'); g.fillStyle = gr; g.fillRect(m.x(x) - rad * m.s, m.y(y) - rad * m.s, rad * 2 * m.s, rad * 2 * m.s) })
    // hairline scratches all over, mostly at a slant (in and out of pockets)
    for (let i = 0; i < 320; i++) {
      const x = BODY.x0 + 20 + r() * (BODY.x1 - BODY.x0 - 40), y = BODY.y0 + 20 + r() * (BODY.y1 - BODY.y0 - 40)
      scratch(g, m, r, x, y, 6 + r() * 46, -0.5 + (r() - 0.5) * 1.6, 0.5 + r() * 0.8, `rgba(255,252,240,${0.14 + r() * 0.24})`, r() < 0.6 ? 'rgba(60,48,24,.14)' : null)
    }
    // a few deep gouges
    for (let i = 0; i < 7; i++) scratch(g, m, r, 60 + r() * 900, 950 + r() * 780, 30 + r() * 80, r() * Math.PI * 2, 1.8 + r(), 'rgba(255,250,236,.5)', 'rgba(52,40,18,.45)')
    // the printing has worn thin where the thumb rests
    g.globalCompositeOperation = 'source-over'
    g.restore()
    drin(g, m)
  }

  // "Drin", in black marker on the front, bottom left by Select: written fast, slightly faded and rubbed
  const DRIN = [
    'M6 36 C7 26 8 14 9 4', 'M9 4 C34 0 44 32 7 35',                       // D
    'M42 35 L43 19', 'M43 24 C46 17 52 16 56 20',                         // r
    'M62 21 L61 35', 'M63 10 L64 11',                                     // i and its dot
    'M70 35 L71 21', 'M71 27 C75 18 85 18 84 25 L85 35',                  // n
    'M2 43 C28 47 66 45 98 39'                                            // the flourish under it
  ]
  function drin(g, m) {
    const r = rng(77)
    g.save()
    g.translate(m.x(70), m.y(1500)); g.rotate(-0.13); g.scale(2.3 * m.s, 2.3 * m.s)
    g.lineCap = 'round'; g.lineJoin = 'round'
    for (const pass of [[3.4, 'rgba(22,22,34,.82)'], [2.2, 'rgba(10,10,20,.5)']]) {
      g.lineWidth = pass[0]; g.strokeStyle = pass[1]
      DRIN.forEach(d => g.stroke(new Path2D(d)))
    }
    // rubbed off in specks, the way marker wears on plastic
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; g.beginPath(); g.arc(r() * 100, r() * 48, 0.3 + r() * 1.1, 0, Math.PI * 2); g.fill() }
    g.restore()
  }

  // ── the screen cover of the old one: a dent and its stress marks, and scratches from pockets and wiping ──
  function lens(g, m) {
    const r = rng(4242)
    g.save()
    g.beginPath(); g.roundRect(m.x(88), m.y(178), (960 - 88) * m.s, (845 - 178) * m.s, [26 * m.s, 26 * m.s, 118 * m.s, 26 * m.s]); g.clip()
    // wiping swirls: long faint arcs
    for (let i = 0; i < 24; i++) {
      const cx = 100 + r() * 860, cy = 180 + r() * 660, rad = 80 + r() * 380, a0 = r() * Math.PI * 2
      g.beginPath(); g.arc(m.x(cx), m.y(cy), rad * m.s, a0, a0 + 0.2 + r() * 0.5); g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.07})`; g.lineWidth = (0.6 + r() * 0.6) * m.s; g.stroke()
    }
    // hairline scratches
    for (let i = 0; i < 90; i++) scratch(g, m, r, 100 + r() * 850, 190 + r() * 640, 8 + r() * 70, r() * Math.PI * 2, 0.5 + r() * 0.7, `rgba(255,255,255,${0.12 + r() * 0.22})`, null)
    // the dent: a little crater in the cover, lit from the top left, with stress marks running out of it
    const dx = 885, dy = 600, R = 30                                   // on the cover beside the screen, clear of the picture
    const shade = g.createRadialGradient(m.x(dx + 6), m.y(dy + 6), 0, m.x(dx), m.y(dy), R * m.s)
    shade.addColorStop(0, 'rgba(0,0,0,.28)'); shade.addColorStop(0.7, 'rgba(0,0,0,.12)'); shade.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = shade; g.beginPath(); g.arc(m.x(dx), m.y(dy), R * m.s, 0, Math.PI * 2); g.fill()
    g.lineCap = 'round'
    g.beginPath(); g.arc(m.x(dx), m.y(dy), (R - 6) * m.s, Math.PI * 0.95, Math.PI * 1.75); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3 * m.s; g.stroke()
    g.beginPath(); g.arc(m.x(dx), m.y(dy), (R - 6) * m.s, Math.PI * -0.05, Math.PI * 0.75); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3 * m.s; g.stroke()
    g.beginPath(); g.arc(m.x(dx - 3), m.y(dy - 3), 3 * m.s, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill()
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, l0 = R * 0.4, l1 = R * (0.9 + r() * 1.3); g.beginPath(); g.moveTo(m.x(dx + Math.cos(a) * l0), m.y(dy + Math.sin(a) * l0)); g.lineTo(m.x(dx + Math.cos(a + (r() - 0.5) * 0.3) * l1), m.y(dy + Math.sin(a + (r() - 0.5) * 0.3) * l1)); g.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.25})`; g.lineWidth = (0.6 + r() * 0.6) * m.s; g.stroke() }
    g.restore()
  }

  // ── the new one: the clear protective film still on the screen cover, with its pull tab at the bottom left ──
  function film(g, m) {
    g.save()
    const x0 = 82, y0 = 172, x1 = 966, y1 = 851
    g.beginPath(); g.roundRect(m.x(x0), m.y(y0), (x1 - x0) * m.s, (y1 - y0) * m.s, [28 * m.s, 28 * m.s, 122 * m.s, 28 * m.s])
    g.fillStyle = 'rgba(235,242,255,.06)'; g.fill()
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.6 * m.s; g.stroke()
    // a glossy band across it
    g.clip()
    const band = g.createLinearGradient(m.x(x0), m.y(y0), m.x(x1), m.y(y1))
    band.addColorStop(0.18, 'rgba(255,255,255,0)'); band.addColorStop(0.24, 'rgba(255,255,255,.16)'); band.addColorStop(0.3, 'rgba(255,255,255,0)')
    g.fillStyle = band; g.fillRect(m.x(x0), m.y(y0), (x1 - x0) * m.s, (y1 - y0) * m.s)
    g.restore()
    // the tab, sticking out past the corner
    g.save()
    g.translate(m.x(x0 + 6), m.y(y1 - 6)); g.rotate(0.62)
    g.beginPath(); g.roundRect(-14 * m.s, 0, 28 * m.s, 54 * m.s, [0, 0, 10 * m.s, 10 * m.s])
    g.fillStyle = 'rgba(214,232,255,.55)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.4 * m.s; g.stroke()
    g.fillStyle = 'rgba(40,70,120,.55)'; g.font = `700 ${11 * m.s}px "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.save(); g.translate(0, 30 * m.s); g.rotate(-Math.PI / 2); g.fillText('PULL', 0, 0); g.restore()
    g.restore()
  }

  // ── the back of the old one: scratches and dirt, and the Photoshop sticker slapped on crooked, its corner peeling ──
  // m.x(f), m.y(f) map fractions of the body as you look at the back; m.u is canvas px per world unit (the body is 1.118 x 1.924)
  function back(g, m, area = { left: 0.06, right: 0.94, top: 0.2, bottom: 0.97 }) {
    const r = rng(2026)
    g.save()
    // scratches and scuffs: from being put down on tables, heavier toward the bottom
    for (let i = 0; i < 160; i++) {
      const fx = area.left + r() * (area.right - area.left), fy = area.top + Math.sqrt(r()) * (area.bottom - area.top)
      const len = (0.01 + r() * 0.06) * m.u, a = r() * Math.PI * 2
      g.beginPath(); g.moveTo(m.x(fx), m.y(fy)); g.lineTo(m.x(fx) + Math.cos(a) * len, m.y(fy) + Math.sin(a) * len)
      g.strokeStyle = r() < 0.7 ? `rgba(255,250,236,${0.18 + r() * 0.25})` : `rgba(60,46,20,${0.15 + r() * 0.2})`; g.lineWidth = (0.0008 + r() * 0.0012) * m.u; g.lineCap = 'round'; g.stroke()
    }
    for (let i = 0; i < 14; i++) {
      const fx = area.left + r() * (area.right - area.left), fy = area.top + r() * (area.bottom - area.top), rad = (0.02 + r() * 0.05) * m.u
      const gr = g.createRadialGradient(m.x(fx), m.y(fy), 0, m.x(fx), m.y(fy), rad); gr.addColorStop(0, `rgba(90,70,30,${0.08 + r() * 0.1})`); gr.addColorStop(1, 'rgba(90,70,30,0)')
      g.fillStyle = gr; g.fillRect(m.x(fx) - rad, m.y(fy) - rad, rad * 2, rad * 2)
    }
    // the sticker
    const s = 0.28 * m.u, b = 0.011 * m.u, cx = m.x(0.69), cy = m.y(0.47), rot = -0.21
    const half = s / 2 + b, cut = s * 0.3
    const sc = document.createElement('canvas'); sc.width = sc.height = Math.ceil(half * 2 + 4)
    const k = sc.getContext('2d'), o = sc.width / 2
    k.translate(o, o)
    k.beginPath(); k.roundRect(-half, -half, half * 2, half * 2, s * 0.22); k.fillStyle = '#f2efe8'; k.fill()                 // the white die-cut edge
    k.beginPath(); k.roundRect(-s / 2, -s / 2, s, s, s * 0.18); k.fillStyle = '#001e36'; k.fill()                          // the icon
    k.beginPath(); k.roundRect(-s / 2 + s * 0.07, -s / 2 + s * 0.07, s * 0.86, s * 0.86, s * 0.13); k.strokeStyle = '#31a8ff'; k.lineWidth = s * 0.035; k.stroke()
    k.fillStyle = '#31a8ff'; k.font = `700 ${s * 0.46}px "Helvetica Neue", Arial, sans-serif`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('Ps', 0, s * 0.03)
    // years of wear on it: faded, scuffed, scratched through to the white
    const rr = rng(9)
    k.fillStyle = 'rgba(255,255,255,.1)'; k.fillRect(-half, -half, half * 2, half * 2)
    for (let i = 0; i < 40; i++) { k.beginPath(); const x = (rr() - 0.5) * s, y = (rr() - 0.5) * s, a = rr() * Math.PI * 2, l = s * (0.05 + rr() * 0.3); k.moveTo(x, y); k.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); k.strokeStyle = `rgba(255,255,255,${0.2 + rr() * 0.4})`; k.lineWidth = s * (0.004 + rr() * 0.008); k.stroke() }
    for (let i = 0; i < 6; i++) { k.beginPath(); k.ellipse((rr() - 0.5) * s, (rr() - 0.5) * s, s * (0.04 + rr() * 0.08), s * (0.01 + rr() * 0.02), rr() * Math.PI, 0, Math.PI * 2); k.fillStyle = 'rgba(240,236,226,.55)'; k.fill() }
    // the peeling corner (top right): the part past the fold is lifted off
    const A = [half - cut, -half], B = [half, -half + cut]
    k.globalCompositeOperation = 'destination-out'; k.beginPath(); k.moveTo(A[0], A[1]); k.lineTo(half + 2, -half - 2); k.lineTo(B[0], B[1]); k.closePath(); k.fill()
    g.save(); g.translate(cx, cy); g.rotate(rot)
    // dried glue and dirt where it lifted
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(half, -half); g.lineTo(B[0], B[1]); g.closePath(); g.fillStyle = 'rgba(120,96,48,.35)'; g.fill()
    g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 0.004 * m.u; g.shadowOffsetY = 0.0015 * m.u
    g.drawImage(sc, -o, -o)
    g.shadowColor = 'transparent'
    // the flap itself: the lifted corner folded back over, showing its grey backing, with a soft shadow under it
    const ax = A[0], ay = A[1], bx = B[0], by = B[1], px = half, py = -half
    const dxl = bx - ax, dyl = by - ay, t = ((px - ax) * dxl + (py - ay) * dyl) / (dxl * dxl + dyl * dyl), fx = ax + t * dxl, fy = ay + t * dyl
    const qx = 2 * fx - px, qy = 2 * fy - py, lift = 0.92
    const tip = [ax + (qx - ax) * lift + (bx - ax) * (1 - lift) * 0.5, ay + (qy - ay) * lift + (by - ay) * (1 - lift) * 0.5]
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(tip[0] + 0.003 * m.u, tip[1] + 0.004 * m.u); g.lineTo(bx, by); g.closePath(); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill()
    const fg = g.createLinearGradient(fx, fy, tip[0], tip[1]); fg.addColorStop(0, '#cfcac0'); fg.addColorStop(1, '#ebe7df')
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(tip[0], tip[1]); g.lineTo(bx, by); g.closePath(); g.fillStyle = fg; g.fill()
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 0.0006 * m.u; g.stroke()
    g.restore()
    g.restore()
  }

  // ── the new one's back: a Figma sticker where the old one has the Photoshop one, brand new, crisp and flat with a slight gloss ──
  function figma(g, m) {
    const s = 0.28 * m.u, b = 0.011 * m.u, half = s / 2 + b
    g.save(); g.translate(m.x(0.69), m.y(0.47)); g.rotate(-0.1)
    g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 0.002 * m.u; g.shadowOffsetY = 0.0006 * m.u
    g.beginPath(); g.roundRect(-half, -half, half * 2, half * 2, s * 0.22); g.fillStyle = '#ffffff'; g.fill()                 // the white die-cut edge
    g.shadowColor = 'transparent'
    g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * 0.18); g.fillStyle = '#1e1e1e'; g.fill()                          // the icon
    // the logo: two columns of rounded pieces, the circle on the right, the drop at the bottom left
    const u = s * 0.2, x0 = -u, y0 = -u * 1.5
    const piece = (x, y, r, col) => { g.beginPath(); g.roundRect(x0 + x * u, y0 + y * u, u, u, r.map(v => v * u)); g.fillStyle = col; g.fill() }
    piece(0, 0, [0.5, 0, 0, 0.5], '#f24e1e'); piece(1, 0, [0, 0.5, 0.5, 0], '#ff7262'); piece(0, 1, [0.5, 0, 0, 0.5], '#a259ff')
    g.beginPath(); g.arc(x0 + 1.5 * u, y0 + 1.5 * u, u / 2, 0, Math.PI * 2); g.fillStyle = '#1abcfe'; g.fill()
    piece(0, 2, [0.5, 0, 0.5, 0.5], '#0acf83')
    // the gloss: a soft band of light across the top left
    g.beginPath(); g.roundRect(-half, -half, half * 2, half * 2, s * 0.22); g.clip()
    const gl = g.createLinearGradient(-half, -half, half, half)
    gl.addColorStop(0, 'rgba(255,255,255,.22)'); gl.addColorStop(0.32, 'rgba(255,255,255,.06)'); gl.addColorStop(0.38, 'rgba(255,255,255,0)')
    g.fillStyle = gl; g.fillRect(-half, -half, half * 2, half * 2)
    g.restore()
  }

  // ── the marks added to the old one ──
  // In mode 'h' a colour becomes a grey height, for the About model's relief (128 = the surface, darker = lower, lighter = higher).
  const inkFor = mode => (col, h) => mode === 'h' ? `rgb(${h},${h},${h})` : col
  // Front photo px for the parts of the front the marks need
  const fpx = f => (24 + f * 1118) * 1049 / 1166, fpy = f => (34 + f * 1924) * 0.9          // body fractions -> Front photo px
  const SLOTS = [[0.637, 0.890, 0.711, 0.971], [0.686, 0.873, 0.761, 0.955], [0.736, 0.856, 0.815, 0.940], [0.786, 0.840, 0.868, 0.923], [0.839, 0.824, 0.914, 0.909], [0.887, 0.805, 0.965, 0.890]]
  const CROSS = [[180, 1076], [266, 1076], [266, 1163], [352, 1163], [352, 1247], [266, 1247], [266, 1332], [180, 1332], [180, 1247], [97, 1247], [97, 1163], [180, 1163]]
  const PILLS = [[388, 1452], [561, 1449]], AB = [[735, 1225], [903, 1146]]
  // where the old one hit the concrete: the middle of the big curve. Front photo px; on the back, fractions as you look at the back
  const HIT = { front: [958, 1693], back: [0.09, 0.952] }

  // a crack: a jagged line that wanders off in one direction, thinning as it goes, with a few short branches (the caller's units)
  function crackPaths(r, x, y, ang, len, step) {
    const out = []
    const grow = (x, y, head, left, w, depth) => {
      const p = [[x, y, w]]; let a = head
      while (left > 0) {
        a = head + (a - head) * 0.6 + (r() - 0.5) * 0.9                      // wanders, but keeps its heading
        const s = step * (0.5 + r()); x += Math.cos(a) * s; y += Math.sin(a) * s; left -= s; w *= 0.94; p.push([x, y, w])
        if (depth < 2 && r() < 0.15) grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), left * (0.25 + r() * 0.35), w * 0.75, depth + 1)
      }
      out.push(p)
    }
    grow(x, y, ang, len, 1, 0)
    return out
  }
  // draws cracks: P maps a point to canvas px, w is the width at the start in canvas px
  function drawCracks(g, mode, paths, P, w) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'
    const run = (p, col, k, d) => {
      for (let i = 1; i < p.length; i++) {
        const a = P(p[i - 1][0], p[i - 1][1]), b = P(p[i][0], p[i][1])
        g.beginPath(); g.moveTo(a[0] + d, a[1] + d); g.lineTo(b[0] + d, b[1] + d); g.strokeStyle = col; g.lineWidth = Math.max(0.6, p[i][2] * w * k); g.stroke()
      }
    }
    paths.forEach(p => {
      if (mode === 'h') { run(p, 'rgb(64,64,64)', 1.4, 0); return }
      run(p, 'rgba(255,250,238,.4)', 0.9, -w * 0.7)                          // the lifted edge catches the light
      run(p, 'rgba(30,22,12,.85)', 1, 0)                                     // the crack itself
    })
    g.restore()
  }
  // the missing chunk, painted (the About model; the lab model really cuts it): a jagged bite out of the edge, the broken surface
  // inside rough and darker, a shadow along the side away from the light, and the rim whitened where the plastic was stressed
  function chip(g, mode, P, k, x, y, rad, seed) {
    const r = rng(seed), pts = []
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, q = rad * (0.7 + r() * 0.5); pts.push(P(x + Math.cos(a) * q, y + Math.sin(a) * q)) }
    const path = () => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath() }
    const [cx, cy] = P(x, y), I = inkFor(mode)
    g.save()
    path(); g.fillStyle = I('#958a74', 44); g.fill()
    path(); g.clip()
    // the broken face: small rough facets, some catching the light and some in shadow
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2, q = rad * k * r(), fx = cx + Math.cos(a) * q, fy = cy + Math.sin(a) * q, s = (3 + r() * 9) * k
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + s * (r() - 0.2), fy + s * (r() - 0.8)); g.lineTo(fx + s * (r() - 0.8), fy + s * (r() - 0.1)); g.closePath()
      const lit = r() < 0.5; g.fillStyle = I(lit ? `rgba(230,224,206,${0.3 + r() * 0.3})` : `rgba(60,50,32,${0.25 + r() * 0.3})`, lit ? 70 + r() * 30 : 25 + r() * 20); g.fill()
    }
    // the inner wall in shadow along the top left (light comes from the top left, so that wall faces away from it)
    if (mode === 'c') { g.save(); g.translate(5 * k, 5 * k); path(); g.restore(); g.lineWidth = 10 * k; g.strokeStyle = 'rgba(30,24,12,.55)'; g.filter = `blur(${2 * k}px)`; g.stroke(); g.filter = 'none' }
    g.restore()
    // the whitened rim
    path(); g.lineJoin = 'miter'; g.lineWidth = 2.6 * k; g.strokeStyle = I('rgba(248,244,232,.9)', 112); g.stroke()
  }
  // a pale stress halo round the break, where the plastic went white without breaking
  const stress = (g, cx, cy, rad) => { const gr = g.createRadialGradient(cx, cy, rad * 0.55, cx, cy, rad); gr.addColorStop(0, 'rgba(250,246,234,.35)'); gr.addColorStop(1, 'rgba(250,246,234,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill() }

  // the cracks on the front from the broken corner (and the chunk itself when `chunk`), in Front photo px
  function crack(g, m, mode = 'c', chunk = false) {
    const r = rng(311), [hx, hy] = HIT.front, P = (x, y) => [m.x(x), m.y(y)]
    g.save()
    g.beginPath(); g.roundRect(m.x(BODY.x0), m.y(BODY.y0), (BODY.x1 - BODY.x0) * m.s, (BODY.y1 - BODY.y0) * m.s, [40 * m.s, 40 * m.s, 236 * m.s, 42 * m.s]); g.clip()
    if (mode === 'c') stress(g, m.x(hx), m.y(hy), 95 * m.s)
    ;[[-2.4, 430], [-1.85, 260], [-2.95, 220], [-1.3, 130]].forEach(([a, len]) =>
      drawCracks(g, mode, crackPaths(r, hx + Math.cos(a) * 34, hy + Math.sin(a) * 34, a, len, 15), P, 2.4 * m.s))
    if (chunk) chip(g, mode, P, m.s, hx, hy, 50, 12)
    g.restore()
  }
  // the same on the back (fractions as you look at the back, so the corner is bottom left)
  function crackBack(g, m, mode = 'c', chunk = false) {
    const r = rng(733), U = 1.118, V = 1.924, P = (u, v) => [m.x(u / U), m.y(v / V)], k = m.u * 0.00111
    const hx = HIT.back[0] * U, hy = HIT.back[1] * V, w = m.x(1) - m.x(0), h = m.y(1) - m.y(0), pp = w / 1118
    g.save()
    g.beginPath(); g.roundRect(m.x(0), m.y(0), w, h, [44 * pp, 44 * pp, 46 * pp, 262 * pp]); g.clip()
    if (mode === 'c') stress(g, ...P(hx, hy), 0.07 * m.u)
    ;[[-0.85, 0.44], [-1.3, 0.27], [-0.3, 0.24], [-1.7, 0.12]].forEach(([a, len]) =>
      drawCracks(g, mode, crackPaths(r, hx + Math.cos(a) * 0.026, hy + Math.sin(a) * 0.026, a, len, 0.016), P, 2.2 * k))
    if (chunk) chip(g, mode, P, k, hx, hy, 0.034, 21)
    g.restore()
  }

  // ── the melted spot by the cartridge slot (it sat on a hot jeepney dashboard): the plastic slumped into a darker, glossier patch
  //    with ripples where it sagged and little bubbles in it. Drawn filling a w x h canvas, centred ──
  function melt(g, w, h, mode = 'c') {
    const r = rng(512), cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42
    const blob = k => { g.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2, q = R * k * (1 + 0.13 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 5 + 2)); const x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q * 0.88; i ? g.lineTo(x, y) : g.moveTo(x, y) } g.closePath() }
    const bubbles = []; for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, q = R * 0.75 * Math.sqrt(r()); bubbles.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.88, R * (0.025 + r() * 0.06)]) }
    g.save()
    if (mode === 'h') {
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, w, h)
      g.filter = `blur(${R * 0.12}px)`
      blob(1); g.fillStyle = 'rgb(112,112,112)'; g.fill(); blob(0.62); g.fillStyle = 'rgb(94,94,94)'; g.fill()      // it sags most in the middle
      ;[0.92, 0.78].forEach(k => { blob(k); g.lineWidth = R * 0.05; g.strokeStyle = 'rgb(140,140,140)'; g.stroke() })   // the ripples where it slumped
      g.filter = `blur(${R * 0.01}px)`
      bubbles.forEach(([x, y, br]) => { const gr = g.createRadialGradient(x, y, 0, x, y, br); gr.addColorStop(0, 'rgb(190,190,190)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, br, 0, Math.PI * 2); g.fill() })
      g.restore(); return
    }
    g.filter = `blur(${R * 0.07}px)`
    blob(1.04); g.fillStyle = 'rgba(118,92,46,.42)'; g.fill(); blob(0.66); g.fillStyle = 'rgba(88,66,30,.4)'; g.fill()
    g.filter = `blur(${R * 0.02}px)`
    ;[0.92, 0.78].forEach(k => { blob(k); g.lineWidth = R * 0.025; g.strokeStyle = 'rgba(255,246,222,.2)'; g.stroke() })
    g.filter = 'none'
    bubbles.forEach(([x, y, br]) => {
      g.beginPath(); g.arc(x, y, br, 0, Math.PI * 2); g.fillStyle = 'rgba(70,52,22,.35)'; g.fill()
      g.beginPath(); g.arc(x - br * 0.35, y - br * 0.35, br * 0.3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,252,240,.75)'; g.fill()   // the shine on top of each bubble
      g.beginPath(); g.arc(x, y, br, Math.PI * 0.1, Math.PI * 0.9); g.lineWidth = br * 0.25; g.strokeStyle = 'rgba(40,28,10,.4)'; g.stroke()
    })
    g.restore()
  }

  // ── dust and lint: grey fluff packed into the gaps, and loose fibres and specks ──
  const clump = (g, x, y, rx, ry, rot, a) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(128,128,126,${Math.min(1, a * 1.4)})`); gr.addColorStop(0.55, `rgba(136,136,133,${a * 0.9})`); gr.addColorStop(1, 'rgba(136,136,133,0)')
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore()
  }
  const fibre = (g, r, x, y, len, w) => {
    const a = r() * Math.PI * 2, b = a + (r() - 0.5) * 2.4
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + Math.cos(b) * len * 0.4, y + Math.sin(b) * len * 0.4, x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6, x + Math.cos(a + 0.3) * len, y + Math.sin(a + 0.3) * len)
    g.strokeStyle = `rgba(168,164,156,${0.35 + r() * 0.35})`; g.lineWidth = w; g.lineCap = 'round'; g.stroke()
  }
  // lint packed along a closed or open outline (canvas px points): clumps sitting in the gap, heaviest low down where it collects
  const packAlong = (g, r, pts, size, n, closed = true) => {
    const segs = []; let total = 0
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, l]); total += l }
    const ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys)
    for (let i = 0; i < n; i++) {
      let d = r() * total, s = 0; while (d > segs[s][2] && s < segs.length - 1) d -= segs[s++][2]
      const [a, b, l] = segs[s], t = d / (l || 1), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t
      const low = hi > lo ? (y - lo) / (hi - lo) : 0.5
      if (r() > 0.25 + low * 0.75) continue
      clump(g, x, y, size * (0.6 + r()), size * (0.35 + r() * 0.3), Math.atan2(b[1] - a[1], b[0] - a[0]), 0.4 + r() * 0.35)
      if (r() < 0.08) fibre(g, r, x, y, size * (2 + r() * 3), size * 0.12)
    }
  }
  const capsulePts = (m, x, y, len, wid, rot, grow) => {
    const pts = [], hl = len / 2 - wid / 2, R = wid / 2 + grow
    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; pts.push([hl + Math.cos(a) * R, Math.sin(a) * R]) }
    for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 + i / 12 * Math.PI; pts.push([-hl + Math.cos(a) * R, Math.sin(a) * R]) }
    return pts.map(([px, py]) => [m.x(x + px * Math.cos(rot) - py * Math.sin(rot)), m.y(y + px * Math.sin(rot) + py * Math.cos(rot))])
  }
  // the front, in Front photo px: o.slots (the speaker), o.buttons (the gaps round the buttons), o.specks (loose bits all over)
  function dust(g, m, o = {}) {
    const r = rng(6061), s = m.s
    g.save()
    if (o.slots !== false) SLOTS.forEach(([ax, ay, bx, by]) => {
      const A = [m.x(fpx(ax)), m.y(fpy(ay))], B = [m.x(fpx(bx)), m.y(fpy(by))], ang = Math.atan2(B[1] - A[1], B[0] - A[0])
      for (let i = 0; i < 16; i++) {
        const t = Math.pow(r(), 0.6), x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t     // more at the low end
        clump(g, x, y, (5 + r() * 9) * s, (3 + r() * 4) * s, ang, 0.45 + r() * 0.35)
      }
      if (r() < 0.7) fibre(g, r, B[0], B[1], (14 + r() * 18) * s, 0.9 * s)
    })
    if (o.buttons !== false) {
      packAlong(g, r, CROSS.map(([x, y]) => [m.x(x + Math.sign(x - 223) * 4), m.y(y + Math.sign(y - 1205) * 4)]), 6 * s, 90)
      AB.forEach(([x, y]) => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([m.x(x + Math.cos(a) * 62), m.y(y + Math.sin(a) * 62)]) } packAlong(g, r, pts, 5 * s, 50) })
      PILLS.forEach(([x, y]) => packAlong(g, r, capsulePts(m, x, y, 125, 42, -0.4, 3), 4 * s, 34))
    }
    if (o.specks !== false) {
      for (let i = 0; i < 160; i++) { const x = m.x(BODY.x0 + 30 + r() * 960), y = m.y(BODY.y0 + 30 + r() * 1680); g.beginPath(); g.arc(x, y, (0.6 + r() * 1.6) * s, 0, Math.PI * 2); g.fillStyle = r() < 0.6 ? `rgba(120,116,108,${0.3 + r() * 0.3})` : `rgba(40,36,30,${0.25 + r() * 0.3})`; g.fill() }
      for (let i = 0; i < 9; i++) fibre(g, r, m.x(BODY.x0 + 60 + r() * 900), m.y(BODY.y0 + 900 + r() * 800), (16 + r() * 26) * s, 0.8 * s)
    }
    g.restore()
  }
  // the back's grip grooves packed with lint, fractions as you look at the back; skip (an area, e.g. the open battery pocket) stays clear
  function dustBack(g, m, area, skip) {
    const r = rng(8080), k = m.u * 0.00111
    const out = (fx, fy) => skip && fx > skip.left && fx < skip.right && fy > skip.top && fy < skip.bottom
    for (let i = 0; i < 13; i++) {
      const fy = 0.525 + (0.85 - 0.525) * i / 12
      for (let j = 0; j < 55; j++) {
        const fx = area.left + r() * (area.right - area.left); if (out(fx, fy)) continue
        clump(g, m.x(fx), m.y(fy), (6 + r() * 14) * k, (2.5 + r() * 3) * k, (r() - 0.5) * 0.1, 0.4 + r() * 0.4)
        if (r() < 0.04) fibre(g, r, m.x(fx), m.y(fy), (12 + r() * 20) * k, 0.8 * k)
      }
    }
    for (let i = 0; i < 90; i++) { const fx = area.left + r() * (area.right - area.left), fy = area.top + r() * (area.bottom - area.top); if (out(fx, fy)) continue; g.beginPath(); g.arc(m.x(fx), m.y(fy), (0.6 + r() * 1.5) * k, 0, Math.PI * 2); g.fillStyle = `rgba(118,114,106,${0.3 + r() * 0.35})`; g.fill() }
    for (let i = 0; i < 5; i++) { const fx = area.left + r() * (area.right - area.left), fy = area.top + r() * (area.bottom - area.top); if (!out(fx, fy)) fibre(g, r, m.x(fx), m.y(fy), (16 + r() * 24) * k, 0.8 * k) }
  }
  // clears a rounded area of a back canvas (fractions as you look at the back), e.g. where the open battery pocket is
  function hole(g, m, a, rad = 0.01) {
    g.save(); g.globalCompositeOperation = 'destination-out'
    g.beginPath(); g.roundRect(m.x(a.left), m.y(a.top), m.x(a.right) - m.x(a.left), m.y(a.bottom) - m.y(a.top), rad * m.u); g.fill(); g.restore()
  }

  // ── "Eldrin ♥ Elis" scratched into the bottom of the back with a key: thin, whitish, rough-edged, the heart a bit wobbly.
  //    Angular block letters (a key point can't do curves), unlike the marker "Drin" on the front. Glyphs in a 16-tall grid ──
  const GLYPH = {
    E: { w: 9, s: [[[8.5, 0.3], [0.2, 0], [0.6, 16], [8.8, 15.4]], [[0.4, 7.8], [6.4, 7.4]]] },
    l: { w: 3, s: [[[1, 0], [1.5, 16]]] },
    d: { w: 9, s: [[[8, 0], [8.3, 16]], [[8.1, 8.6], [4.2, 6.3], [0.9, 8.4], [0.4, 13], [3, 16], [8.2, 14.6]]] },
    r: { w: 7, s: [[[1, 6.2], [1.2, 16]], [[1.1, 9.6], [3.6, 6.6], [7, 6.4]]] },
    i: { w: 3, s: [[[1, 6.6], [1.3, 16]], [[0.8, 2.4], [1.7, 3.5]]] },
    n: { w: 8, s: [[[1, 6], [1.1, 16]], [[1.1, 9.6], [4, 6.3], [7, 7.3], [7.6, 10.2], [7.7, 16]]] },
    s: { w: 7, s: [[[7, 7.2], [3.6, 6.2], [0.6, 8], [2, 10.8], [6, 11.6], [7.2, 14], [4, 16], [0.3, 14.8]]] },
    // the heart: two strokes from the bottom tip, the second overshooting where it meets the first
    '♥': { w: 15, s: [[[7.2, 16], [2.4, 11.2], [0.2, 6.4], [1.4, 2.6], [4.4, 1.6], [7, 4.2], [7.4, 5.6]], [[7.1, 5.4], [8.6, 2.2], [11.6, 1.2], [14.4, 3.4], [14.2, 7.6], [11.2, 12], [6.8, 16.6]]] },
    ' ': { w: 4, s: [] }
  }
  function names(g, m, mode = 'c', at = 0.955) {
    const r = rng(1414), text = 'Eldrin ♥ Elis', unit = 0.0025 * m.u                              // a glyph unit is 2.5 thousandths of a world unit
    const width = [...text].reduce((t, ch) => t + GLYPH[ch].w + 2, -2)
    g.save(); g.translate(m.x(0.5) - width * unit / 2, m.y(at) - 16 * unit); g.rotate(-0.035); g.scale(unit, unit)
    g.lineCap = 'round'; g.lineJoin = 'round'
    let x = 0
    for (const ch of text) {
      const gl = GLYPH[ch], dy = (r() - 0.5) * 1.2, tilt = (r() - 0.5) * 0.08
      gl.s.forEach(stroke => {
        // each stroke is split into short steps with a little jitter, so the edge reads rough, like a gouge
        const pts = []
        for (let i = 1; i < stroke.length; i++) {
          const [ax, ay] = stroke[i - 1], [bx, by] = stroke[i], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.7))
          for (let j = i === 1 ? 0 : 1; j <= n; j++) { const t = j / n; pts.push([x + ax + (bx - ax) * t + (r() - 0.5) * 0.35, dy + ay + (by - ay) * t + (r() - 0.5) * 0.35 + (ax + (bx - ax) * t) * tilt]) }
        }
        const line = (col, w, d) => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px + d, py + d) : g.moveTo(px + d, py + d))); g.strokeStyle = col; g.lineWidth = w; g.stroke() }
        if (mode === 'h') { line('rgb(76,76,76)', 1.1, 0); return }
        line('rgba(46,36,18,.42)', 1.5, 0.45)                                 // the shadow in the bottom of the groove
        line('rgba(250,247,238,.85)', 0.8, 0)                                // the gouge, whitish where it scraped the plastic
        pts.forEach(([px, py]) => { if (r() < 0.12) { g.beginPath(); g.arc(px + (r() - 0.5) * 1.2, py + (r() - 0.5) * 1.2, 0.2 + r() * 0.35, 0, Math.PI * 2); g.fillStyle = 'rgba(252,250,242,.7)'; g.fill() } })   // the burrs thrown up beside it
      })
      x += gl.w + 2
    }
    g.restore()
  }

  // ── the printed A, B, SELECT and START, half worn off by thumbs: rubbed away in specks, heaviest on one side.
  //    fill: paint the specks in this colour (an opaque plate); without it they are erased (a see-through print sheet). Front photo px ──
  function rubPrint(g, m, fill) {
    const r = rng(2468)
    g.save(); if (!fill) g.globalCompositeOperation = 'destination-out'
    ;[[781, 1326, 40, 42, 0], [951, 1246, 42, 42, 0], [401, 1508, 132, 32, -0.4], [575, 1504, 120, 32, -0.4]].forEach(([x, y, w, h, rot]) => {
      g.save(); g.translate(m.x(x), m.y(y)); g.rotate(rot)
      for (let i = 0, n = w * h * 0.3; i < n; i++) {                       // the same density on every label, big or small
        const u = r(), v = r(); if (r() > 0.1 + u * 0.9) continue             // more worn toward the right, where the thumb slides off
        g.beginPath(); g.ellipse((u - 0.5) * w * m.s, (v - 0.5) * h * m.s, (1 + r() * 3) * m.s, (0.7 + r() * 1.6) * m.s, r() * Math.PI, 0, Math.PI * 2)
        g.fillStyle = fill || `rgba(0,0,0,${0.5 + r() * 0.5})`; g.fill()
      }
      g.restore()
    })
    g.restore()
  }

  // ── the PH flag sticker on the side by the volume wheel: small and old, the colours faded, the sun's rays rubbed thin, a scuff
  //    across it. Drawn filling a w x h canvas (about 2:1); the models curl its edges ──
  function flag(g, w, h) {
    const r = rng(1898), b = h * 0.07
    g.save()
    g.beginPath(); g.roundRect(0, 0, w, h, h * 0.08); g.fillStyle = '#ece6d6'; g.fill()                                          // the die-cut white edge, yellowed
    const x0 = b, y0 = b, x1 = w - b, y1 = h - b, ym = (y0 + y1) / 2, fh = y1 - y0
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip()
    g.fillStyle = '#4c66a0'; g.fillRect(x0, y0, x1 - x0, fh / 2)                                                            // blue, faded
    g.fillStyle = '#b8524e'; g.fillRect(x0, ym, x1 - x0, fh / 2)                                                            // red, faded
    const tx = x0 + fh * 0.866
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(tx, ym); g.lineTo(x0, y1); g.closePath(); g.fillStyle = '#f1ece0'; g.fill()       // the white triangle
    const gold = '#d8bf6a', sx = x0 + fh * 0.29, sr = fh * 0.09
    g.fillStyle = gold; g.beginPath(); g.arc(sx, ym, sr, 0, Math.PI * 2); g.fill()
    for (let i = 0; i < 8; i++) {                                                                                           // eight rays, rubbed thin
      const a = i / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), l0 = sr * 1.25, l1 = sr * (2.1 - r() * 0.3), wd = sr * (0.18 + r() * 0.1)
      g.beginPath(); g.moveTo(sx + c * l0 - s * wd, ym + s * l0 + c * wd); g.lineTo(sx + c * l1, ym + s * l1); g.lineTo(sx + c * l0 + s * wd, ym + s * l0 - c * wd); g.closePath(); g.fill()
    }
    const star = (x, y, R) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * 0.42 : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) } g.closePath(); g.fill() }
    star(x0 + fh * 0.09, y0 + fh * 0.12, fh * 0.05); star(x0 + fh * 0.09, y1 - fh * 0.12, fh * 0.05); star(tx - fh * 0.13, ym, fh * 0.05)
    // the rays and the sun rubbed through in specks
    g.save(); g.globalCompositeOperation = 'source-atop'
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, q = sr * (1 + r() * 1.2); g.beginPath(); g.arc(sx + Math.cos(a) * q, ym + Math.sin(a) * q, sr * (0.06 + r() * 0.14), 0, Math.PI * 2); g.fillStyle = 'rgba(241,236,224,.85)'; g.fill() }
    g.restore()
    // faded all over, and a scuff right across it
    g.fillStyle = 'rgba(255,252,240,.14)'; g.fillRect(x0, y0, x1 - x0, fh)
    g.save(); g.translate(w * 0.55, h * 0.5); g.rotate(-0.42)
    for (let i = 0; i < 40; i++) { const y = (r() - 0.5) * h * 0.22, l = w * (0.1 + r() * 0.4), x = (r() - 0.5) * w * 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 2); g.strokeStyle = `rgba(255,253,246,${0.25 + r() * 0.4})`; g.lineWidth = h * (0.008 + r() * 0.016); g.stroke() }
    g.restore()
    g.restore()
    // grime caught along the edge
    g.beginPath(); g.roundRect(1, 1, w - 2, h - 2, h * 0.08); g.strokeStyle = 'rgba(96,76,40,.4)'; g.lineWidth = h * 0.03; g.stroke()
    g.restore()
  }

  // ── the batteries in the old one: four orange KINGEVER AAs. The label is unrolled from the photo (gameboy-battery.webp): the brand
  //    side round one half, the "+ AA Carbon Battery" side round the other (w = round it, h = along it, + end at the top). Each
  //    photographed half is unrolled by its angle, so the middle isn't stretched and the edges aren't squashed ──
  function batteryWrap(img, w = 512, h = 1024) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')
    const sides = [[306.5, 70], [598, 68]], y0 = 136, y1 = 668                 // [centre x, radius] of the two batteries used, in photo px
    for (let x = 0; x < w; x++) {
      const half = x < w / 2 ? 0 : 1, t = (x - half * w / 2 + 0.5) / (w / 2), [cx, r] = sides[half]
      g.drawImage(img, cx + r * Math.sin((t - 0.5) * Math.PI), y0, 1, y1 - y0, x, 0, 1, h)
    }
    return c
  }
  // rust on a battery's flat end, with dust caught in it (a w x h canvas, the end disc filling it)
  function rust(g, w, h) {
    const r = rng(404)
    g.fillStyle = '#9a9b9e'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, rad = (0.03 + r() * 0.14) * w, gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() < 0.5 ? '120,62,24' : '150,84,36'; gr.addColorStop(0, `rgba(${c},${0.5 + r() * 0.4})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2) }
    for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(r() * w, r() * h, (0.004 + r() * 0.012) * w, 0, Math.PI * 2); g.fillStyle = r() < 0.5 ? 'rgba(80,40,14,.7)' : 'rgba(186,120,60,.6)'; g.fill() }   // the crust
    for (let i = 0; i < 14; i++) clump(g, r() * w, r() * h, (0.06 + r() * 0.1) * w, (0.04 + r() * 0.06) * w, r() * Math.PI, 0.55 + r() * 0.3)   // grey dust packed into it
  }

  // ── the thick puffy sticker on the contrast side (gameboy-sticker-cats.webp: two cats domed in clear epoxy, with googly eyes) ──
  // Cut out of its photo: the cream background is flooded away from the edges, a thin clear rim is grown back round what is left,
  // and it is aged a little (grime toward the edge, a few scuffs). Returns the picture (map) and a height picture (height, white = high)
  // that the model domes it with: high in the middle, falling off at the edge, with a bump for each googly eye.
  function puffy(img) {
    const w = img.naturalWidth, h = img.naturalHeight, cv = (paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); paint(g); return c }
    const photo = cv(g => g.drawImage(img, 0, 0)), pd = photo.getContext('2d').getImageData(0, 0, w, h), d = pd.data
    // the background: flood from every edge pixel through anything close to the corner colour
    const ref = [0, w - 1, (h - 1) * w, h * w - 1].map(i => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]).reduce((a, c) => a.map((v, k) => v + c[k] / 4), [0, 0, 0])
    const bg = new Uint8Array(w * h), near = i => Math.abs(d[i * 4] - ref[0]) + Math.abs(d[i * 4 + 1] - ref[1]) + Math.abs(d[i * 4 + 2] - ref[2]) < 40
    const stack = []; for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x); for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
    while (stack.length) { const i = stack.pop(); if (bg[i] || !near(i)) continue; bg[i] = 1; const x = i % w; if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1); if (i >= w) stack.push(i - w); if (i < w * (h - 1)) stack.push(i + w) }
    const mask = cv(g => { const m = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { m.data[i * 4 + 3] = bg[i] ? 0 : 255; m.data[i * 4] = m.data[i * 4 + 1] = m.data[i * 4 + 2] = 255 } g.putImageData(m, 0, 0) })
    const blurred = r => cv(g => { g.filter = `blur(${r}px)`; g.drawImage(mask, 0, 0); g.drawImage(mask, 0, 0) })
    const rim = blurred(5), rd = rim.getContext('2d').getImageData(0, 0, w, h).data
    const soft = blurred(16), sd = soft.getContext('2d').getImageData(0, 0, w, h).data
    const r = rng(2525)
    const map = cv(g => {
      const out = g.createImageData(w, h), o = out.data
      for (let i = 0; i < w * h; i++) {
        const j = i * 4, inside = !bg[i], edge = 1 - sd[j + 3] / 255
        if (inside) {   // the picture, a touch dull, darker with grime toward the edge
          const k = 0.92 - edge * 0.35
          o[j] = d[j] * k + 6; o[j + 1] = d[j + 1] * k + 4; o[j + 2] = d[j + 2] * k; o[j + 3] = 255
        } else if (rd[j + 3] > 40) { o[j] = 214; o[j + 1] = 208; o[j + 2] = 192; o[j + 3] = 150 }   // the clear epoxy rim, a little cloudy with age
      }
      g.putImageData(out, 0, 0)
      g.globalCompositeOperation = 'source-atop'
      for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI, l = 20 + r() * 90; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.2})`; g.lineWidth = 0.8 + r() * 1.4; g.stroke() }   // scuffs in the dome
    })
    // the height: the dome follows the shape (thick in the middle, thin at the edge), plus the googly eyes (photo px)
    const height = cv(g => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h)
      g.filter = 'blur(14px)'; g.drawImage(mask, 0, 0); g.drawImage(mask, 0, 0); g.filter = 'none'
      g.globalCompositeOperation = 'destination-in'; g.drawImage(rim, 0, 0); g.globalCompositeOperation = 'lighter'
      ;[[156, 241, 42], [229, 220, 40], [311, 254, 36], [370, 270, 36]].forEach(([x, y, rad]) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(150,150,150,1)'); gr.addColorStop(0.8, 'rgba(100,100,100,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill() })
    })
    return { map, height }
  }

  // ── buttons worn by thumbs: A and B polished and faded in the middle, Select and Start rubbed lighter in the centre.
  //    Each gives a colour and a roughness picture (green = roughness). ab: a strip along the lathe profile, top = the middle of the dome ──
  function buttonWear() {
    const cv = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c }
    const ab = {
      map: cv(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bf7090'); gr.addColorStop(0.18, '#ad4b72'); gr.addColorStop(0.4, '#a3305a'); g.fillStyle = gr; g.fillRect(0, 0, w, h) }),
      rough: cv(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(28,28,28)'); gr.addColorStop(0.3, 'rgb(60,60,60)'); gr.addColorStop(0.45, 'rgb(110,110,110)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) })
    }
    const radial = (g, w, h, a, b) => { g.fillStyle = b; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.scale(1, h / w); const gr = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.42); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(-w / 2, -w / 2, w, w); g.restore() }
    const pill = { map: cv(128, 48, (g, w, h) => radial(g, w, h, '#b9b8c3', '#8e8d99')), rough: cv(128, 48, (g, w, h) => radial(g, w, h, 'rgb(64,64,64)', 'rgb(128,128,128)')) }
    return { ab, pill }
  }

  return { worn, watch, fresh, isPlastic, tintFor, freshCanvas, body, lens, film, back, drin, figma, crack, crackBack, melt, dust, dustBack, hole, names, rubPrint, flag, batteryWrap, rust, puffy, buttonWear, HIT }
})()

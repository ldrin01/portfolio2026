// A light 3D Game Boy for the About page. Same look as the lab's carved one (public/lab/gameboy-3d.js), but built from plain
// extruded shapes with no boolean cuts: the recesses, the speaker slots, the grip lines and the printing are painted onto
// thin sheets, so it builds in a few milliseconds and stays small. Only the parts you press are real shapes (D-pad, A, B,
// Select, Start, the power knob). The playable pixel game on the screen is public/lab/gameboy-game.js, shared with the lab.
// mountGameboyLite(host, { base, cam, keyActive }) loads three.js on demand and returns { pause, resume, dispose }.

export async function mountGameboyLite(host, opts = {}) {
  const [THREE, { OrbitControls }] = await Promise.all([import('three'), import('three/examples/jsm/controls/OrbitControls.js')])
  const LAB = opts.base || '/lab/'

  // laid out in photo pixels (1166 x 2000) and scaled to world units; the front art uses the Front photo's own 1049 x 1800
  const PW = 1166, PH = 2000, S = 1 / 1000, KX = PW / 1049, KY = PH / 1800
  const X = px => (px - PW / 2) * S, Y = py => (PH / 2 - py) * S
  const wx = x => X(x * KX), wy = y => Y(y * KY)
  const v2 = (x, y) => new THREE.Vector2(wx(x), wy(y))
  const FRONT = 0.2                                   // half the thickness: the front face is at +FRONT, the back at -FRONT
  const BEZEL_H = 0.012                               // how far the screen bezel stands above the front face (so the LCD sits sunken)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(26, 1 / 1.25, 0.1, 50)
  camera.position.fromArray(opts.cam || [1.8, 0.8, 4.65])
  // lights stay fixed while it turns, so the shading moves across it as you spin it
  scene.add(new THREE.HemisphereLight(0xffffff, 0x58544e, 0.55))
  const dir = (color, intensity, x, y, z) => { const l = new THREE.DirectionalLight(color, intensity); l.position.set(x, y, z); scene.add(l) }
  dir(0xffffff, 1.9, -2.5, 3.5, 3.5); dir(0xfff1e0, 1.7, 2.5, 1.5, -4); dir(0xdfe8ff, 0.9, 3.5, -2.5, 1.5); dir(0xffffff, 0.3, -3, -1, 2)

  const lambert = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o })
  const plastic = (color, roughness = 0.55) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
  const gb = new THREE.Group(); scene.add(gb)

  // rounded rectangle, corners [tl, tr, br, bl] as quarter-ellipses (photo px), sampled finely so the curve reads smooth
  const rr = (x0, y0, x1, y1, [tl, tr, br, bl], seg = 20) => {
    const pts = [], arc = (cx, cy, rx, ry, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(X(cx + Math.cos(a) * rx), Y(cy + Math.sin(a) * ry))) } }
    arc(x1 - tr.rx, y0 + tr.ry, tr.rx, tr.ry, -Math.PI / 2); arc(x1 - br.rx, y1 - br.ry, br.rx, br.ry, 0)
    arc(x0 + bl.rx, y1 - bl.ry, bl.rx, bl.ry, Math.PI / 2); arc(x0 + tl.rx, y0 + tl.ry, tl.rx, tl.ry, Math.PI)
    return new THREE.Shape(pts)
  }
  const rad = r => ({ rx: r, ry: r })
  const SIL = [rad(44), rad(44), { rx: 262, ry: 270 }, rad(46)]           // the silhouette: x 24..1142, y 34..1958, the big curve bottom right
  // the outline shrunk by `inset` px, because the bevel grows it back by the same amount
  const shell = inset => rr(24 + inset, 34 + inset, 1142 - inset, 1958 - inset, SIL.map(c => ({ rx: Math.max(2, c.rx - inset), ry: Math.max(2, c.ry - inset) })))

  // ── the two shells: a front slab with a hairline bevel at the seam, and a back slab with a deep soft round-over at the back ──
  {
    const bt = 0.008
    const fg = new THREE.ExtrudeGeometry(shell(bt / S), { depth: FRONT - 2 * bt, bevelEnabled: true, bevelSize: bt, bevelThickness: bt, bevelSegments: 2, curveSegments: 1 }).translate(0, 0, bt)
    gb.add(new THREE.Mesh(fg, lambert(0xc4bdad)))
    // its seam end is tucked inside the front slab, so only the round-over at the back shows
    const bb = 0.05
    const bg = new THREE.ExtrudeGeometry(shell(bb / S), { depth: FRONT - 2 * bb, bevelEnabled: true, bevelSize: bb, bevelThickness: bb, bevelSegments: 6, curveSegments: 1 }).translate(0, 0, -(FRONT - 2 * bb) - bb)
    gb.add(new THREE.Mesh(bg, lambert(0xc4b592)))
  }

  // ── painting: transparent sheets lying just above a face. paint(g, cx, cy, px) draws in photo px of the Front photo ──
  const FONT = '"Funnel Display", "Helvetica Neue", Arial, sans-serif'
  try { await Promise.all([document.fonts.load('700 40px "Funnel Display"'), document.fonts.load('400 40px "Funnel Display"')]) } catch (e) { /* the fallback font is fine */ }
  const textures = []
  // x0..y1 is the area covered, in Front-photo px; scale is canvas px per photo px
  const sheet = (x0, y0, x1, y1, z, scale, paint, back = false) => {
    const cv = document.createElement('canvas'); cv.width = Math.round((x1 - x0) * KX * scale); cv.height = Math.round((y1 - y0) * KY * scale)
    const g = cv.getContext('2d')
    paint(g, x => (x - x0) * KX * scale, y => (y - y0) * KY * scale, n => n * KY * scale)
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; textures.push(tex)
    const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) * KX * S, (y1 - y0) * KY * S), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
    m.position.set((wx(x0) + wx(x1)) / 2, (wy(y0) + wy(y1)) / 2, z)
    if (back) m.rotation.y = Math.PI
    gb.add(m); return m
  }
  const fit = (g, cx, cy, px, t, x0, x1, y, h, wgt, col, style = '') => {
    g.save(); g.font = `${style} ${wgt} ${px(h)}px ${FONT}`.trim(); g.fillStyle = col; g.textBaseline = 'alphabetic'
    const w = g.measureText(t).width || 1; g.translate(cx(x0), cy(y)); g.scale((cx(x1) - cx(x0)) / w, 1); g.fillText(t, 0, 0); g.restore()
  }
  const INK = '#3a3490'

  // the screen bezel: a grey plate with the big round corner at the bottom right, standing BEZEL_H above the face, with the screen window cut through it
  const abMeshes = {}, screenRect = {}
  {
    const bezel = new THREE.Shape(), bx0 = 88, bx1 = 960, by0 = 178, by1 = 845, r = 26, R = 118
    bezel.moveTo(wx(bx0 + r), wy(by0)); bezel.lineTo(wx(bx1 - r), wy(by0)); bezel.quadraticCurveTo(wx(bx1), wy(by0), wx(bx1), wy(by0 + r))
    bezel.lineTo(wx(bx1), wy(by1 - R)); bezel.quadraticCurveTo(wx(bx1), wy(by1), wx(bx1 - R), wy(by1))
    bezel.lineTo(wx(bx0 + r), wy(by1)); bezel.quadraticCurveTo(wx(bx0), wy(by1), wx(bx0), wy(by1 - r))
    bezel.lineTo(wx(bx0), wy(by0 + r)); bezel.quadraticCurveTo(wx(bx0), wy(by0), wx(bx0 + r), wy(by0))
    const sx0 = wx(248), sx1 = wx(802), sy0 = wy(765), sy1 = wy(255)
    bezel.holes.push(new THREE.Path([new THREE.Vector2(sx0, sy0), new THREE.Vector2(sx0, sy1), new THREE.Vector2(sx1, sy1), new THREE.Vector2(sx1, sy0)]))
    const bg = new THREE.ExtrudeGeometry(bezel, { depth: BEZEL_H, curveSegments: 10, bevelEnabled: false })
    const bm = new THREE.Mesh(bg, [lambert(0x7f7c88), lambert(0x5f5e68)])   // top, then the walls of the window
    bm.position.z = FRONT; gb.add(bm)
    Object.assign(screenRect, { x0: sx0, x1: sx1, y0: sy1, y1: sy0 })

    // printing on the bezel: the two stripes, the title, the battery label and the power light
    sheet(bx0, by0, bx1, by1, FRONT + BEZEL_H + 0.0006, 1, (g, cx, cy, px) => {
      const line = (a, b, y, c) => { g.fillStyle = c; g.fillRect(cx(a), cy(y) - px(3), cx(b) - cx(a), px(6)) }
      line(127, 357, 207, '#b03470'); line(127, 357, 226, '#3b3190'); line(824, 922, 207, '#b03470'); line(824, 922, 226, '#3b3190')
      fit(g, cx, cy, px, 'DOT MATRIX WITH STEREO SOUND', 375, 805, 222, 24, 400, '#d9d7e4')
      fit(g, cx, cy, px, 'BATTERY', 122, 219, 490, 22, 400, '#d4d2dd')
      g.fillStyle = '#3a2b27'; g.beginPath(); g.arc(cx(152), cy(432), px(10), 0, Math.PI * 2); g.fill()
    })
    abMeshes.led = new THREE.Mesh(new THREE.CircleGeometry(10 * KX * S, 20), new THREE.MeshBasicMaterial({ color: 0x3a2b27 }))
    abMeshes.led.position.set(wx(152), wy(432), FRONT + BEZEL_H + 0.001); gb.add(abMeshes.led)
  }

  // printing on the face itself: the D-pad dish, the A/B band, Select and Start, the speaker slots, the name, the OFF-ON label
  const SIDEK = Math.PI / 180 * 23
  sheet(0, 0, 1049, 1800, FRONT + 0.0006, 1, (g, cx, cy, px) => {
    // a shallow dish painted as light and shade on the face: dark on the top-left rim, bright on the bottom-right
    const ringAt = (draw, w) => {
      g.lineWidth = w
      g.save(); g.translate(px(2.2), px(2.2)); draw(); g.strokeStyle = 'rgba(255,253,245,.55)'; g.stroke(); g.restore()          // light on the lower-right lip
      g.save(); g.translate(-px(2), -px(2)); draw(); g.strokeStyle = 'rgba(40,36,26,.4)'; g.stroke(); g.restore()                  // shade on the upper-left lip
    }
    // D-pad: a round dish
    const dishPath = () => { g.beginPath(); g.arc(cx(223), cy(1205), px(152), 0, Math.PI * 2) }
    dishPath(); g.fillStyle = 'rgba(70,64,48,.1)'; g.fill(); ringAt(dishPath, px(5))
    const tri = (x, y, rot) => {
      const t = (dx, dy, fill) => { g.save(); g.translate(cx(x) + dx, cy(y) + dy); g.rotate(rot); g.beginPath(); g.moveTo(0, -px(11)); g.lineTo(-px(11), px(10)); g.lineTo(px(11), px(10)); g.closePath(); g.fillStyle = fill; g.fill(); g.restore() }
      t(px(2), px(3), 'rgba(40,36,26,.4)'); t(0, 0, '#d2cbba')
    }
    tri(223, 1060, 0); tri(223, 1350, Math.PI); tri(80, 1205, -Math.PI / 2); tri(365, 1205, Math.PI / 2)
    // A and B: a tilted capsule dish
    const capsule = (x, y, w, h, rot) => () => { g.beginPath(); g.save(); g.translate(cx(x), cy(y)); g.rotate(rot); g.roundRect(-px(w) / 2, -px(h) / 2, px(w), px(h), px(h) / 2); g.restore() }
    const ab = capsule(819, 1186, 392, 202, -Math.atan2(79, 168)); ab(); g.fillStyle = 'rgba(70,64,48,.1)'; g.fill(); ringAt(ab, px(5))
    // Select and Start: a small dish round each pill, tilted the same way
    ;[[388, 1452], [561, 1449]].forEach(([x, y]) => { const c = capsule(x, y, 160, 70, -SIDEK); c(); g.fillStyle = 'rgba(70,64,48,.1)'; g.fill(); ringAt(c, px(3.5)) })
    // speaker slots: six tilted grooves in the bottom right corner (fractions of the whole body, as measured from the photo)
    const mx = f => (24 + f * 1118) / KX, my = f => (34 + f * 1924) / KY
    ;[[0.637, 0.890, 0.711, 0.971], [0.686, 0.873, 0.761, 0.955], [0.736, 0.856, 0.815, 0.940], [0.786, 0.840, 0.868, 0.923], [0.839, 0.824, 0.914, 0.909], [0.887, 0.805, 0.965, 0.890]]
      .forEach(([ax, ay, bx, by]) => {
        g.lineCap = 'round'; g.lineWidth = px(20)
        g.beginPath(); g.moveTo(cx(mx(ax)) + px(2.5), cy(my(ay)) + px(2.5)); g.lineTo(cx(mx(bx)) + px(2.5), cy(my(by)) + px(2.5)); g.strokeStyle = 'rgba(255,253,245,.6)'; g.stroke()
        g.beginPath(); g.moveTo(cx(mx(ax)), cy(my(ay))); g.lineTo(cx(mx(bx)), cy(my(by))); g.strokeStyle = 'rgba(52,48,38,.62)'; g.stroke()
        g.beginPath(); g.moveTo(cx(mx(ax)) - px(2), cy(my(ay)) - px(2)); g.lineTo(cx(mx(bx)) - px(2), cy(my(by)) - px(2)); g.lineWidth = px(5); g.strokeStyle = 'rgba(20,18,12,.45)'; g.stroke()
      })
    // the name, the button letters, Select and Start
    fit(g, cx, cy, px, 'Drinworks', 82, 312, 918, 40, 700, '#2f2a88'); fit(g, cx, cy, px, 'GAME BOY', 322, 640, 918, 62, 700, '#2f2a88', 'italic'); fit(g, cx, cy, px, 'TM', 641, 679, 905, 18, 700, '#2f2a88')
    fit(g, cx, cy, px, 'B', 765, 797, 1342, 36, 700, INK); fit(g, cx, cy, px, 'A', 934, 968, 1262, 36, 700, INK)
    const tilted = (t, x, y, w) => { g.save(); g.translate(cx(x), cy(y)); g.rotate(-SIDEK); g.font = `700 ${px(30)}px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center'; const tw = g.measureText(t).width || 1; g.scale(px(w) / tw, 1); g.fillText(t, 0, 0); g.restore() }
    tilted('SELECT', 401, 1518, 125); tilted('START', 575, 1514, 112)
    // the OFF - ON print by the power switch, on the top edge
    const mxp = x => x / KX, myp = y => y / KY
    g.lineWidth = px(3); g.strokeStyle = 'rgba(60,56,44,.55)'; g.beginPath(); g.roundRect(cx(mxp(130)), cy(myp(57)), cx(mxp(370)) - cx(mxp(130)), cy(myp(134)) - cy(myp(57)), px(myp(38))); g.stroke()
    g.fillStyle = 'rgba(60,56,44,.7)'; g.font = `700 ${px(26)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OFF • ON', cx(mxp(250)), cy(myp(96)))
  })

  // the back: the grip lines across the lower part, as on the real thing
  sheet(0, 0, 1049, 1800, -FRONT - 0.0006, 0.6, (g, cx, cy, px) => {
    for (let i = 0; i < 13; i++) {
      const y = (34 + (0.525 + (0.85 - 0.525) * i / 12) * 1924) / KY
      g.lineCap = 'round'; g.lineWidth = px(14)
      g.beginPath(); g.moveTo(cx(90), cy(y) + px(2)); g.lineTo(cx(950), cy(y) + px(2)); g.strokeStyle = 'rgba(255,250,235,.4)'; g.stroke()
      g.beginPath(); g.moveTo(cx(90), cy(y)); g.lineTo(cx(950), cy(y)); g.strokeStyle = 'rgba(70,60,40,.4)'; g.stroke()
    }
  }, true)

  // ── the parts you press ──
  const BASE = FRONT - 0.012                                               // the buttons start just under the face and stand up through the printing
  {
    // D-pad: a dark grey cross with rounded corners and a soft bevelled top; pivots at its centre so it rocks toward the arm you press
    const cross = [[180, 1076], [266, 1076], [266, 1163], [352, 1163], [352, 1247], [266, 1247], [266, 1332], [180, 1332], [180, 1247], [97, 1247], [97, 1163], [180, 1163]]
    const ccx = wx(223), ccy = wy(1205), DB = 0.004, DH = 0.012, r = 0.012
    const pts = cross.map(([x, y]) => v2(x, y)), n = pts.length, sh = new THREE.Shape()
    pts.forEach((p, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], d1 = p.distanceTo(a), d2 = p.distanceTo(b), k = Math.min(r, d1 / 2, d2 / 2)
      const p1 = p.clone().lerp(a, k / d1), p2 = p.clone().lerp(b, k / d2)
      i ? sh.lineTo(p1.x, p1.y) : sh.moveTo(p1.x, p1.y); sh.quadraticCurveTo(p.x, p.y, p2.x, p2.y)
    })
    const depth = FRONT + DH - BASE - 2 * DB
    const g = new THREE.ExtrudeGeometry(sh, { depth, curveSegments: 4, bevelEnabled: true, bevelSize: DB, bevelThickness: DB, bevelSegments: 3 }).translate(-ccx, -ccy, BASE + DB)
    const m = new THREE.Mesh(g, plastic(0x47474d, 0.6)); m.position.set(ccx, ccy, 0); gb.add(m); abMeshes.dpad = m
  }
  {
    // A and B: magenta, a gently domed top that rolls over a rounded edge into the straight side
    const disc = (cx, cy) => {
      const R = 0.066, zTop = FRONT + 0.02, zEdge = FRONT + 0.0165, rr_ = 0.007, prof = [new THREE.Vector2(0.0001, BASE), new THREE.Vector2(R, BASE), new THREE.Vector2(R, zEdge - rr_)]
      for (let i = 1; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; prof.push(new THREE.Vector2(R - rr_ + Math.cos(a) * rr_, zEdge - rr_ + Math.sin(a) * rr_)) }
      for (let i = 1; i <= 6; i++) { const t = i / 6, r = (R - rr_) * (1 - t); prof.push(new THREE.Vector2(Math.max(r, 0.0001), zEdge + (zTop - zEdge) * (1 - (r / (R - rr_)) ** 2))) }
      const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 32).rotateX(Math.PI / 2), plastic(0xa3305a, 0.42)); m.position.set(wx(cx), wy(cy), 0); gb.add(m); return m
    }
    abMeshes.b = disc(735, 1225); abMeshes.a = disc(903, 1146)
    // Select and Start: grey capsules, tilted
    const pill = (cx, cy) => {
      const len = 125 * KX * S, wid = 42 * KY * S, PB = wid * 0.32, hl = (len - 2 * PB) / 2 - (wid - 2 * PB) / 2, hw = (wid - 2 * PB) / 2, sh = new THREE.Shape()
      sh.moveTo(-hl, -hw); sh.lineTo(hl, -hw); sh.absarc(hl, 0, hw, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-hl, hw); sh.absarc(-hl, 0, hw, Math.PI / 2, Math.PI * 1.5, false)
      const g = new THREE.ExtrudeGeometry(sh, { depth: FRONT + 0.008 - BASE - 2 * PB * 0.7, curveSegments: 8, bevelEnabled: true, bevelSize: PB, bevelThickness: PB * 0.7, bevelSegments: 3 })
      const m = new THREE.Mesh(g, plastic(0x8e8d99, 0.5)); m.position.set(wx(cx), wy(cy), BASE + PB * 0.7); m.rotation.z = SIDEK; gb.add(m); return m
    }
    abMeshes.select = pill(388, 1452); abMeshes.start = pill(561, 1449)
  }

  // the power switch: a knob that slides along its slot on the top edge
  const power = {}
  {
    const topY = Y(34), xa = X(24 + 0.100 * 1118), xb = X(24 + 0.222 * 1118), kw = 0.058, zc = -0.034
    const slot = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, 0.004, 0.06), lambert(0x8c8895)); slot.position.set((xa + xb) / 2, topY, zc); gb.add(slot)
    const knob = new THREE.Mesh(new THREE.BoxGeometry(kw, 0.016, 0.044), plastic(0xb4b2bb, 0.5)); knob.position.set(xb - 0.003 - kw / 2, topY + 0.004, zc); gb.add(knob)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(xb - xa + 0.06, 0.07, 0.12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set((xa + xb) / 2, topY, zc); gb.add(hit)
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.09), new THREE.MeshBasicMaterial({ visible: false })); label.position.set(X(24 + 0.2 * 1118), Y(34 + 0.032 * 1924), FRONT + 0.02); gb.add(label)
    Object.assign(power, { knob, offX: xa + 0.003 + kw / 2, onX: xb - 0.003 - kw / 2, hits: [hit, label] })
  }

  // ── controls: drag to turn; a slow sway shows the shape until you touch it ──
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true
  controls.minPolarAngle = 0.5; controls.maxPolarAngle = Math.PI - 0.5
  let touched = false
  controls.addEventListener('start', () => { touched = true })
  const ac = new AbortController()
  const size = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
  const ro = new ResizeObserver(size); ro.observe(host); size()
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches

  const frameHooks = []
  let lastT = 0
  const loop = t => {
    const dt = lastT ? t - lastT : 0; lastT = t; frameHooks.forEach(f => f(dt))
    if (!touched && !still) gb.rotation.y = Math.sin(t / 1900) * 0.3
    controls.update(); renderer.render(scene, camera)
  }
  renderer.setAnimationLoop(loop)

  // ── the screen: the About page's pixel game on the LCD, and A / B you can click ──
  try {
    if (!window.GBGame) await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = LAB + 'gameboy-game.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s) })
    const game = window.GBGame.create()
    const stex = new THREE.CanvasTexture(game.canvas); stex.colorSpace = THREE.SRGBColorSpace; stex.magFilter = THREE.LinearFilter; stex.anisotropy = 8; textures.push(stex)
    const { x0, x1, y0, y1 } = screenRect, zL = FRONT + 0.0008
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y0 - y1), lambert(0xd8d8d8, { map: stex })); lcd.position.set((x0 + x1) / 2, (y0 + y1) / 2, zL); gb.add(lcd)
    frameHooks.push(dt => { if (game.step(dt)) stex.needsUpdate = true })
    // the shadow the bezel casts on the LCD: strongest along the top and left
    {
      const W = 400, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H
      const g = cv.getContext('2d')
      const edge = (ax, ay, bx, by, a, rx, ry, rw, rh) => { const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, `rgba(12,14,6,${a})`); gr.addColorStop(1, 'rgba(12,14,6,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh) }
      edge(0, 0, 0, H * 0.09, 0.7, 0, 0, W, H * 0.09); edge(0, 0, W * 0.065, 0, 0.6, 0, 0, W * 0.065, H)
      edge(W, 0, W * 0.97, 0, 0.3, W * 0.97, 0, W * 0.03, H); edge(0, H, 0, H * 0.97, 0.3, 0, H * 0.97, W, H * 0.03)
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; textures.push(tex)
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y0 - y1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); inner.position.set((x0 + x1) / 2, (y0 + y1) / 2, zL + 0.0004); gb.add(inner)
    }

    // A and B: press with the pointer (raycast), or the A / B / Space keys. The button sinks while held.
    const rest = { a: abMeshes.a.position.z, b: abMeshes.b.position.z }, SINK = 0.008
    const setBtn = (k, on) => { abMeshes[k].position.z = rest[k] - (on ? SINK : 0); on ? game.press(k) : game.release(k) }
    let powered = true
    const ledOn = new THREE.Color(0xff3b2a), ledOff = new THREE.Color(0x3a2b27)
    const setPower = on => { powered = on; game.setPower(on); abMeshes.led.material.color.copy(on ? ledOn : ledOff) }
    setPower(true)
    frameHooks.push(dt => { const k = power.knob, to = powered ? power.onX : power.offX; k.position.x += (to - k.position.x) * Math.min(1, dt / 60) })
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), el = renderer.domElement
    const targets = [abMeshes.a, abMeshes.b, abMeshes.dpad, abMeshes.select, abMeshes.start, power.knob, ...power.hits]
    let held = null
    const hitBtn = e => {
      const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(targets)[0]
      if (!hit) return null
      const o = hit.object
      if (o === abMeshes.dpad) { const p = o.worldToLocal(hit.point.clone()); return Math.abs(p.x) > Math.abs(p.y) ? (p.x > 0 ? 'right' : 'left') : (p.y > 0 ? 'up' : 'down') }
      return o === abMeshes.a ? 'a' : o === abMeshes.b ? 'b' : o === abMeshes.select ? 'select' : o === abMeshes.start ? 'start' : 'power'
    }
    // the D-pad, Select and Start move when pressed but do nothing in the game: the pad rocks toward the arm, the pills sink
    const restZ = { select: abMeshes.select.position.z, start: abMeshes.start.position.z }, TILT = 0.03
    abMeshes.dpad.geometry.computeBoundingBox()
    const padR = abMeshes.dpad.geometry.boundingBox.max.x
    const feel = (k, on) => {
      if (k === 'select' || k === 'start') { abMeshes[k].position.z = restZ[k] - (on ? 0.005 : 0); return }
      const d = abMeshes.dpad
      d.rotation.set(on && k === 'up' ? -TILT : on && k === 'down' ? TILT : 0, on && k === 'right' ? TILT : on && k === 'left' ? -TILT : 0, 0)
      d.position.z = -(on ? padR * Math.sin(TILT) : 0)
    }
    const isAB = k => k === 'a' || k === 'b'
    el.addEventListener('pointerdown', e => {
      const k = hitBtn(e); if (!k) return
      e.stopImmediatePropagation()
      if (k === 'power') { setPower(!powered); return }
      held = k; controls.enabled = false; isAB(k) ? setBtn(k, true) : feel(k, true)
      if (k === 'select') game.win?.()                       // Select fast-forwards to the win
      if (k === 'start') game.restart?.()                    // Start resets: a fresh run from Monumento
    }, { capture: true, signal: ac.signal })
    addEventListener('pointerup', () => { if (!held) return; isAB(held) ? setBtn(held, false) : feel(held, false); held = null; controls.enabled = true }, { signal: ac.signal })
    el.addEventListener('pointermove', e => { if (!held) el.style.cursor = hitBtn(e) ? 'pointer' : '' }, { signal: ac.signal })
    const keyOf = e => (e.code === 'Space' || e.key.toLowerCase() === 'a') ? 'a' : e.key.toLowerCase() === 'b' ? 'b' : null
    addEventListener('keydown', e => { const k = keyOf(e); if (!k || (opts.keyActive && !opts.keyActive()) || e.metaKey || e.ctrlKey || /input|textarea/i.test(e.target.tagName)) return; e.preventDefault(); if (!e.repeat) setBtn(k, true) }, { signal: ac.signal })
    addEventListener('keyup', e => { const k = keyOf(e); if (k) setBtn(k, false) }, { signal: ac.signal })
  } catch (e) { console.warn('game screen not loaded', e) }

  return {
    pause() { renderer.setAnimationLoop(null); lastT = 0 },
    resume() { renderer.setAnimationLoop(loop) },
    dispose() {
      renderer.setAnimationLoop(null); ro.disconnect(); ac.abort(); controls.dispose()
      scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()) })
      textures.forEach(t => t.dispose())
      renderer.dispose(); renderer.domElement.remove()
    }
  }
}

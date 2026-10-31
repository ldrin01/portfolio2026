// The 3D Game Boy for the About page, detailed but light. The carved version in public/lab/gameboy-3d.js gets its recesses from ~220
// boolean cuts (640k vertices, 12 s to build). Here every recess, slot, groove and screw is a height map painted on a canvas and turned
// into a normal map, so the lights still catch their edges as you turn it, while the shapes underneath are plain extrusions
// (tens of thousands of vertices, built in milliseconds). Only things that move or stand proud are real: the buttons, the wheels,
// the power knob and the cartridge. gameboy-lite.js is the plainer sibling (no relief, no cartridge, no wheels).
// mountGameboyDetail(host, { base, cam, keyActive }) loads three.js on demand and returns { pause, resume, dispose }.

export async function mountGameboyDetail(host, opts = {}) {
  const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import('three'), import('three/examples/jsm/controls/OrbitControls.js'), import('three/examples/jsm/environments/RoomEnvironment.js')
  ])
  const LAB = opts.base || '/lab/'

  // laid out in photo pixels (1166 x 2000) and scaled to world units; the front art uses the Front photo's own 1049 x 1800
  const PW = 1166, PH = 2000, S = 1 / 1000, KX = PW / 1049, KY = PH / 1800
  const X = px => (px - PW / 2) * S, Y = py => (PH / 2 - py) * S
  const wx = x => X(x * KX), wy = y => Y(y * KY)
  const v2 = (x, y) => new THREE.Vector2(wx(x), wy(y))
  const FRONT = 0.2                                   // half the thickness: the front face is at +FRONT, the back at -FRONT
  const BEZEL_H = 0.012                               // how far the screen bezel stands above the front face (so the LCD sits sunken)
  const BX0 = 24, BY0 = 34, BW = 1118, BH = 1924      // the body's box in model px: x 24..1142, y 34..1958

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(26, 1 / 1.25, 0.1, 50)
  camera.position.fromArray(opts.cam || [1.8, 0.8, 4.65])
  // a faint room reflection gives the plastics their sheen; the four lights stay fixed while it turns, so the shading moves across it
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04); pmrem.dispose()
  scene.environment = envRT.texture; scene.environmentIntensity = 0.3
  scene.add(new THREE.HemisphereLight(0xffffff, 0x58544e, 0.5))
  const dir = (color, intensity, x, y, z) => { const l = new THREE.DirectionalLight(color, intensity); l.position.set(x, y, z); scene.add(l) }
  dir(0xffffff, 1.9, -2.5, 3.5, 3.5); dir(0xfff1e0, 1.7, 2.5, 1.5, -4); dir(0xdfe8ff, 0.9, 3.5, -2.5, 1.5); dir(0xffffff, 0.3, -3, -1, 2)

  const std = (color, roughness = 0.62, o = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o })
  const gb = new THREE.Group(); scene.add(gb)
  const textures = []
  const keep = t => { textures.push(t); return t }
  const FRONT_C = '#c4bdad', BACK_C = '#c4b592', INK = '#3a3490'
  const FONT = '"Funnel Display", "Helvetica Neue", Arial, sans-serif'
  try { await Promise.all([document.fonts.load('700 40px "Funnel Display"'), document.fonts.load('400 40px "Funnel Display"')]) } catch (e) { /* the fallback font is fine */ }

  // rounded rectangle, corners [tl, tr, br, bl] as quarter-ellipses (photo px), sampled finely so the curve reads smooth
  const rr = (x0, y0, x1, y1, [tl, tr, br, bl], seg = 20) => {
    const pts = [], arc = (cx, cy, rx, ry, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(X(cx + Math.cos(a) * rx), Y(cy + Math.sin(a) * ry))) } }
    arc(x1 - tr.rx, y0 + tr.ry, tr.rx, tr.ry, -Math.PI / 2); arc(x1 - br.rx, y1 - br.ry, br.rx, br.ry, 0)
    arc(x0 + bl.rx, y1 - bl.ry, bl.rx, bl.ry, Math.PI / 2); arc(x0 + tl.rx, y0 + tl.ry, tl.rx, tl.ry, Math.PI)
    return new THREE.Shape(pts)
  }
  const rad = r => ({ rx: r, ry: r })
  const SIL = [rad(44), rad(44), { rx: 262, ry: 270 }, rad(46)]           // the silhouette, the big curve bottom right
  const shell = inset => rr(BX0 + inset, BY0 + inset, 1142 - inset, 1958 - inset, SIL.map(c => ({ rx: Math.max(2, c.rx - inset), ry: Math.max(2, c.ry - inset) })))

  // ── relief: paint a height map (grey = flat, darker = lower), turn it into a normal map ──
  // the painted colour and its relief are drawn by the same function (mode 'c' or 'h'), so a groove is always where its shading is
  const normalFrom = (hc, strength) => {
    const w = hc.width, h = hc.height
    const soft = document.createElement('canvas'); soft.width = w; soft.height = h
    const sg = soft.getContext('2d'); sg.filter = 'blur(1.1px)'; sg.drawImage(hc, 0, 0)           // softens the edges so a groove reads as bevelled (a no-op where filters are missing)
    const src = sg.getImageData(0, 0, w, h).data, out = document.createElement('canvas'); out.width = w; out.height = h
    const og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data
    const H = (x, y) => src[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4]
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 2, y) - H(x - 2, y)) * strength / 255, dy = (H(x, y + 2) - H(x, y - 2)) * strength / 255
      const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255
    }
    og.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(out); t.anisotropy = 8; return keep(t)
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c }
  // a textured material from one paint function: paint(g, 'c' | 'h', scale)
  const relief = (w, h, scaleC, scaleH, paint, strength, matOpts = {}) => {
    const cc = canvas(w * scaleC, h * scaleC), hc = canvas(w * scaleH, h * scaleH)
    paint(cc.getContext('2d'), 'c', scaleC); paint(hc.getContext('2d'), 'h', scaleH)
    const map = new THREE.CanvasTexture(cc); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; keep(map)
    return std(0xffffff, 0.62, { map, normalMap: normalFrom(hc, strength), ...matOpts })
  }
  // fills and strokes that mean something in both maps: colour in 'c', height (0 deep .. 255 high) in 'h'
  const ink = (g, mode) => (col, hgt) => mode === 'c' ? col : `rgb(${hgt},${hgt},${hgt})`

  // ── the two shells: a front slab with a hairline bevel at the seam, and a back slab with a deep soft round-over at the back ──
  const bt = 0.008, bb = 0.05
  gb.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shell(bt / S), { depth: FRONT - 2 * bt, bevelEnabled: true, bevelSize: bt, bevelThickness: bt, bevelSegments: 2, curveSegments: 1 }).translate(0, 0, bt), std(0xc4bdad, 0.66)))
  gb.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shell(bb / S), { depth: FRONT - 2 * bb, bevelEnabled: true, bevelSize: bb, bevelThickness: bb, bevelSegments: 6, curveSegments: 1 }).translate(0, 0, -(FRONT - 2 * bb) - bb), std(0xc4b592, 0.66)))

  // a face plate: the flat cap of a shell, redrawn with relief. uv.x is mirrored for the back so it reads the right way round
  const plate = (inset, z, material, back) => {
    const g = new THREE.ShapeGeometry(shell(inset), 24), p = g.attributes.position, uv = g.attributes.uv
    const x0 = X(BX0), w = BW * S, y0 = Y(BY0 + BH), h = BH * S
    for (let i = 0; i < p.count; i++) uv.setXY(i, back ? 1 - (p.getX(i) - x0) / w : (p.getX(i) - x0) / w, (p.getY(i) - y0) / h)
    if (back) material.side = THREE.BackSide
    const m = new THREE.Mesh(g, material); m.position.z = z; gb.add(m); return m
  }

  // ── the front face ──
  const abMeshes = {}, screenRect = {}
  const SIDEK = Math.PI / 180 * 23
  {
    const paint = (g, mode, s) => {
      const c = mode === 'c', k = s, cx = x => (x * KX - BX0) * k, cy = y => (y * KY - BY0) * k, px = n => n * KY * k, I = ink(g, mode)
      g.fillStyle = I(FRONT_C, 128); g.fillRect(0, 0, BW * k, BH * k)
      if (c) {   // the bezel's soft shadow on the face round it
        g.save(); g.shadowColor = 'rgba(40,34,20,.5)'; g.shadowBlur = px(26); g.shadowOffsetX = px(3); g.shadowOffsetY = px(9); g.fillStyle = '#7f7c88'
        g.beginPath(); g.roundRect(cx(88), cy(178), cx(960) - cx(88), cy(845) - cy(178), [px(26), px(26), px(118), px(26)]); g.fill(); g.restore()
      }
      // a recess: flat floor, with a lip you can feel in the light; `depth` is the floor's height in the relief
      const recess = (path, depth, lip) => {
        path(); g.fillStyle = I('rgba(70,62,44,.13)', depth); g.fill()
        path(); g.lineWidth = px(lip); g.strokeStyle = I('rgba(60,54,40,.28)', Math.max(0, depth - 40)); g.stroke()
      }
      const capsule = (x, y, w, h, rot) => () => { g.beginPath(); g.save(); g.translate(cx(x), cy(y)); g.rotate(rot); g.roundRect(-px(w) / 2, -px(h) / 2, px(w), px(h), px(h) / 2); g.restore() }
      // D-pad: a round dish, with the four little arrows raised on its floor
      recess(() => { g.beginPath(); g.arc(cx(223), cy(1205), px(152), 0, Math.PI * 2) }, 78, 9)
      const tri = (x, y, rot) => { g.save(); g.translate(cx(x), cy(y)); g.rotate(rot); g.beginPath(); g.moveTo(0, -px(11)); g.lineTo(-px(11), px(10)); g.lineTo(px(11), px(10)); g.closePath(); g.fillStyle = I('#d2cbba', 150); g.fill(); g.restore() }
      tri(223, 1060, 0); tri(223, 1350, Math.PI); tri(80, 1205, -Math.PI / 2); tri(365, 1205, Math.PI / 2)
      // A and B: a tilted capsule dish; Select and Start: a small dish round each pill
      recess(capsule(819, 1186, 392, 202, -Math.atan2(79, 168)), 88, 9)
      ;[[388, 1452], [561, 1449]].forEach(([x, y]) => recess(capsule(x, y, 160, 70, -SIDEK), 98, 6))
      // under each button a soft dark ring where it meets the face
      if (c) {
        const soft = (x, y, r) => { const gr = g.createRadialGradient(cx(x), cy(y), px(r * 0.6), cx(x), cy(y), px(r * 1.35)); gr.addColorStop(0, 'rgba(30,26,16,.5)'); gr.addColorStop(1, 'rgba(30,26,16,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx(x), cy(y), px(r * 1.35), 0, Math.PI * 2); g.fill() }
        soft(735, 1225, 62); soft(903, 1146, 62); soft(223, 1205, 118)
      }
      // speaker slots: six tilted grooves in the bottom right corner (fractions of the whole body, measured from the photo)
      const mx = f => (BX0 + f * BW) / KX, my = f => (BY0 + f * BH) / KY
      ;[[0.637, 0.890, 0.711, 0.971], [0.686, 0.873, 0.761, 0.955], [0.736, 0.856, 0.815, 0.940], [0.786, 0.840, 0.868, 0.923], [0.839, 0.824, 0.914, 0.909], [0.887, 0.805, 0.965, 0.890]]
        .forEach(([ax, ay, bx, by]) => {
          g.lineCap = 'round'; g.lineWidth = px(20)
          g.beginPath(); g.moveTo(cx(mx(ax)), cy(my(ay))); g.lineTo(cx(mx(bx)), cy(my(by))); g.strokeStyle = I('rgba(44,40,30,.7)', 24); g.stroke()
          if (!c) { g.lineWidth = px(9); g.strokeStyle = 'rgb(0,0,0)'; g.beginPath(); g.moveTo(cx(mx(ax)), cy(my(ay))); g.lineTo(cx(mx(bx)), cy(my(by))); g.stroke() }
        })
      // the OFF - ON print by the power switch: a shallow capsule
      const px0 = x => x / KX, py0 = y => y / KY
      g.beginPath(); g.roundRect(cx(px0(130)), cy(py0(57)), cx(px0(370)) - cx(px0(130)), cy(py0(134)) - cy(py0(57)), px(py0(38)))
      g.lineWidth = px(3.5); g.strokeStyle = I('rgba(60,56,44,.6)', 70); g.stroke()
      if (c) { g.fillStyle = 'rgba(60,56,44,.75)'; g.font = `700 ${px(26)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OFF • ON', cx(px0(250)), cy(py0(96))) }
      if (!c) return
      // printing
      const fit = (t, x0, x1, y, h, wgt, col, style = '') => { g.save(); g.font = `${style} ${wgt} ${px(h)}px ${FONT}`.trim(); g.fillStyle = col; g.textBaseline = 'alphabetic'; g.textAlign = 'left'
        const w = g.measureText(t).width || 1; g.translate(cx(x0), cy(y)); g.scale((cx(x1) - cx(x0)) / w, 1); g.fillText(t, 0, 0); g.restore() }
      fit('Drinworks', 82, 312, 918, 40, 700, '#2f2a88'); fit('GAME BOY', 322, 640, 918, 62, 700, '#2f2a88', 'italic'); fit('TM', 641, 679, 905, 18, 700, '#2f2a88')
      fit('B', 765, 797, 1342, 36, 700, INK); fit('A', 934, 968, 1262, 36, 700, INK)
      const tilted = (t, x, y, w) => { g.save(); g.translate(cx(x), cy(y)); g.rotate(-SIDEK); g.font = `700 ${px(30)}px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center'; const tw = g.measureText(t).width || 1; g.scale(px(w) / tw, 1); g.fillText(t, 0, 0); g.restore() }
      tilted('SELECT', 401, 1518, 125); tilted('START', 575, 1514, 112)
    }
    plate(bt / S, FRONT + 0.0004, relief(BW, BH, 1, 0.5, paint, 3.2, { roughness: 0.66 }), false)
  }

  // the screen bezel: a grey plate with the big round corner at the bottom right, standing BEZEL_H above the face, with the screen window cut through it
  {
    const bezel = new THREE.Shape(), bx0 = 88, bx1 = 960, by0 = 178, by1 = 845, r = 26, R = 118
    bezel.moveTo(wx(bx0 + r), wy(by0)); bezel.lineTo(wx(bx1 - r), wy(by0)); bezel.quadraticCurveTo(wx(bx1), wy(by0), wx(bx1), wy(by0 + r))
    bezel.lineTo(wx(bx1), wy(by1 - R)); bezel.quadraticCurveTo(wx(bx1), wy(by1), wx(bx1 - R), wy(by1))
    bezel.lineTo(wx(bx0 + r), wy(by1)); bezel.quadraticCurveTo(wx(bx0), wy(by1), wx(bx0), wy(by1 - r))
    bezel.lineTo(wx(bx0), wy(by0 + r)); bezel.quadraticCurveTo(wx(bx0), wy(by0), wx(bx0 + r), wy(by0))
    const sx0 = wx(248), sx1 = wx(802), sy0 = wy(765), sy1 = wy(255)
    bezel.holes.push(new THREE.Path([new THREE.Vector2(sx0, sy0), new THREE.Vector2(sx0, sy1), new THREE.Vector2(sx1, sy1), new THREE.Vector2(sx1, sy0)]))
    const bm = new THREE.Mesh(new THREE.ExtrudeGeometry(bezel, { depth: BEZEL_H, curveSegments: 10, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }), [std(0x7f7c88, 0.5), std(0x5f5e68, 0.6)])
    bm.position.z = FRONT; gb.add(bm)
    Object.assign(screenRect, { x0: sx0, x1: sx1, y0: sy1, y1: sy0 })

    // printing on the bezel: the two stripes, the title, the battery label and the power light
    const cv = canvas((bx1 - bx0) * KX, (by1 - by0) * KY), g = cv.getContext('2d')
    const cx = x => (x - bx0) * KX, cy = y => (y - by0) * KY, px = n => n * KY
    const line = (a, b, y, col) => { g.fillStyle = col; g.fillRect(cx(a), cy(y) - px(3), cx(b) - cx(a), px(6)) }
    line(127, 357, 207, '#b03470'); line(127, 357, 226, '#3b3190'); line(824, 922, 207, '#b03470'); line(824, 922, 226, '#3b3190')
    const fit = (t, x0, x1, y, h, wgt, col) => { g.save(); g.font = `${wgt} ${px(h)}px ${FONT}`; g.fillStyle = col; const w = g.measureText(t).width || 1; g.translate(cx(x0), cy(y)); g.scale((cx(x1) - cx(x0)) / w, 1); g.fillText(t, 0, 0); g.restore() }
    fit('DOT MATRIX WITH STEREO SOUND', 375, 805, 222, 24, 400, '#d9d7e4'); fit('BATTERY', 122, 219, 490, 22, 400, '#d4d2dd')
    const tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    const label = new THREE.Mesh(new THREE.PlaneGeometry((bx1 - bx0) * KX * S, (by1 - by0) * KY * S), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
    label.position.set((wx(bx0) + wx(bx1)) / 2, (wy(by0) + wy(by1)) / 2, FRONT + BEZEL_H + 0.0026); gb.add(label)
    // the power light, a little dome
    abMeshes.led = new THREE.Mesh(new THREE.SphereGeometry(10 * KX * S, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a2b27 }))
    abMeshes.led.scale.z = 0.4; abMeshes.led.position.set(wx(152), wy(432), FRONT + BEZEL_H + 0.0026); gb.add(abMeshes.led)
  }

  // ── the back: grip grooves, the battery door with its screws and finger ridges, and the cartridge slot ──
  // painted as fractions of the body as you LOOK AT THE BACK (fx from the left of that view, fy from the top)
  const CART = { w: 0.7277, h: 0.7277 * 1187 / 1034 }   // the cartridge picture in world units (a cut-out, so its corners are see-through)
  const cartY = 0.966 + 0.02 - CART.h / 2               // its middle; the top edge pokes 0.02 above the console
  {
    const paint = (g, mode, k) => {
      const c = mode === 'c', I = ink(g, mode), W = BW * k, H = BH * k
      g.fillStyle = I(BACK_C, 128); g.fillRect(0, 0, W, H)
      const fxp = f => f * W, fyp = f => f * H, u = n => n * k
      // the cartridge's slot: a darker, lower rectangle round where it sits
      const slotL = fxp(0.5) - u(CART.w / S) / 2 - u(18), slotR = fxp(0.5) + u(CART.w / S) / 2 + u(18), slotB = (0.966 - (cartY - CART.h / 2) + 0.02) / (BH * S) * H + u(14)
      g.beginPath(); g.roundRect(slotL, -u(60), slotR - slotL, slotB + u(60), [0, 0, u(16), u(16)])
      g.fillStyle = I('#3a372f', 60); g.fill(); g.lineWidth = u(6); g.strokeStyle = I('rgba(30,26,16,.7)', 35); g.stroke()
      // grip grooves across the lower back
      for (let i = 0; i < 13; i++) {
        const y = fyp(0.525 + (0.85 - 0.525) * i / 12)
        g.lineCap = 'round'; g.lineWidth = u(14); g.beginPath(); g.moveTo(fxp(0.07), y); g.lineTo(fxp(0.93), y); g.strokeStyle = I('rgba(70,60,40,.45)', 26); g.stroke()
      }
      // the battery door: a rounded panel with a groove round it, two screws and finger ridges
      const dx = fxp(0.3), dy = fyp(0.585), dw = fxp(0.4), dh = fyp(0.155)
      g.beginPath(); g.roundRect(dx, dy, dw, dh, u(22)); g.fillStyle = I(BACK_C, 150); g.fill(); g.lineWidth = u(8); g.strokeStyle = I('rgba(50,42,26,.7)', 20); g.stroke()
      for (let i = 0; i < 6; i++) { const y = dy + dh * (0.58 + i * 0.07); g.lineWidth = u(5); g.beginPath(); g.moveTo(dx + dw * 0.32, y); g.lineTo(dx + dw * 0.68, y); g.strokeStyle = I('rgba(70,60,40,.5)', 60); g.stroke() }
      ;[[0.08, 0.2], [0.92, 0.2]].forEach(([fx, fy]) => {
        const sx = dx + dw * fx, sy = dy + dh * fy
        g.beginPath(); g.arc(sx, sy, u(13), 0, Math.PI * 2); g.fillStyle = I('#a89a78', 190); g.fill(); g.lineWidth = u(3); g.strokeStyle = I('rgba(50,42,26,.7)', 30); g.stroke()
        g.beginPath(); g.moveTo(sx - u(9), sy); g.lineTo(sx + u(9), sy); g.lineWidth = u(4); g.strokeStyle = I('rgba(50,42,26,.8)', 10); g.stroke()
      })
      if (c) { g.fillStyle = 'rgba(70,60,40,.6)'; g.font = `600 ${u(15)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PUSH', dx + dw / 2, dy + dh * 0.3); g.fillText('Drinworks', dx + dw / 2, dy + dh * 0.86) }
    }
    plate(bb / S, -FRONT - 0.0004, relief(BW, BH, 0.7, 0.45, paint, 3, { roughness: 0.7 }), true)

    // the cartridge: a thin body poking above the top edge, its label facing out (the photo is public/lab/gameboy-cart.webp)
    // the body is a rounded block just inside the picture's outline; the picture itself (with its see-through corners) is the face
    const bw = CART.w * 0.97, bh = CART.h * 0.985, br = 0.03, shape = new THREE.Shape()
    shape.moveTo(-bw / 2 + br, -bh / 2); shape.lineTo(bw / 2 - br, -bh / 2); shape.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, -bh / 2 + br); shape.lineTo(bw / 2, bh / 2 - br)
    shape.quadraticCurveTo(bw / 2, bh / 2, bw / 2 - br, bh / 2); shape.lineTo(-bw / 2 + br, bh / 2); shape.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh / 2 - br)
    shape.lineTo(-bw / 2, -bh / 2 + br); shape.quadraticCurveTo(-bw / 2, -bh / 2, -bw / 2 + br, -bh / 2)
    const bev = 0.003
    const body = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.6, bevelSegments: 2, curveSegments: 4 }).rotateY(Math.PI)
    body.computeBoundingBox(); body.translate(0, 0, -FRONT - 0.003 - body.boundingBox.min.z)
    const face = new THREE.PlaneGeometry(CART.w, CART.h).rotateY(Math.PI)
    const cart = new THREE.Group(); cart.position.y = cartY
    cart.add(new THREE.Mesh(body, std(0x8a858c, 0.6)))
    const faceMat = std(0xffffff, 0.55, { alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2 })
    const face_ = new THREE.Mesh(face, faceMat); face_.position.z = -FRONT - 0.0035; cart.add(face_)
    gb.add(cart)
    new THREE.TextureLoader().load(LAB + 'gameboy-cart.webp', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; faceMat.map = keep(t); faceMat.needsUpdate = true })
  }

  // ── the sides: a flat plate on each wall, painted with its pockets, openings and the grip ridges, with relief ──
  const SK = 1400                                         // plate canvas px per world unit
  const ZH = 0.13, SY0 = -0.7, SY1 = 0.76                 // each plate spans z -ZH..ZH and y SY0..SY1
  const sidePlate = (side, paint) => {
    const w = 2 * ZH, h = SY1 - SY0
    const zc = z => (side > 0 ? ZH - z : z + ZH) * SK, yc = y => (SY1 - y) * SK
    const mat = relief(w, h, SK, SK * 0.6, (g, mode, s) => {
      const f = s / SK, I = ink(g, mode)
      g.save(); g.scale(f, f)
      g.fillStyle = I(BACK_C, 128); g.fillRect(0, 0, w * SK, h * SK)
      g.fillStyle = I(FRONT_C, 128); g.fillRect(side > 0 ? 0 : zc(0), 0, side > 0 ? zc(0) : w * SK - zc(0), h * SK)   // the front half is the front shell's colour
      g.beginPath(); g.moveTo(zc(0.002), 0); g.lineTo(zc(0.002), h * SK); g.lineWidth = 3; g.strokeStyle = I('rgba(40,34,20,.55)', 40); g.stroke()   // the seam
      paint(g, mode, { zc, yc, I, u: SK })
      g.restore()
    }, 3, { roughness: 0.66 })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    m.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2
    m.position.set(side * (X(1142) + 0.0004), (SY0 + SY1) / 2, 0); gb.add(m); return m
  }
  const pocket = (g, mode, a, z0, z1, y0, y1, r, depth) => {    // a rounded recess on a side wall (world units)
    g.beginPath(); g.roundRect(Math.min(a.zc(z0), a.zc(z1)), a.yc(y1), Math.abs(a.zc(z1) - a.zc(z0)), a.yc(y0) - a.yc(y1), r * a.u)
    g.fillStyle = a.I('rgba(60,54,38,.16)', depth); g.fill(); g.lineWidth = 3; g.strokeStyle = a.I('rgba(50,44,30,.4)', Math.max(0, depth - 45)); g.stroke()
  }
  const vtext = (g, a, t, z, y, size, rot, col = 'rgba(70,64,48,.75)') => { g.save(); g.translate(a.zc(z), a.yc(y)); g.rotate(rot); g.fillStyle = col; g.font = `600 ${size * a.u}px "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore() }
  const ridges = (g, a) => {
    for (let i = 0; i < 13; i++) {
      const y = 0.966 - (0.525 + (0.85 - 0.525) * i / 12) * 1.924
      g.lineCap = 'round'; g.lineWidth = 0.014 * a.u; g.beginPath(); g.moveTo(a.zc(-0.14), a.yc(y)); g.lineTo(a.zc(-0.0), a.yc(y)); g.strokeStyle = a.I('rgba(70,60,40,.4)', 26); g.stroke()
    }
  }
  const wheels = {}
  const wheelTex = (() => { const c = canvas(16, 4), g = c.getContext('2d'); g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, 10, 4); g.fillStyle = '#121214'; g.fillRect(10, 0, 6, 4)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(70, 1); t.magFilter = THREE.NearestFilter; return keep(t) })()
  const wheel = (wallX, side, y, z, slotH, thick) => {
    const R = slotH * 0.6, OUT = 0.011
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, thick, 56).rotateX(Math.PI / 2), std(0xffffff, 0.5, { map: wheelTex, bumpMap: wheelTex, bumpScale: 2 }))
    m.position.set(wallX + side * (OUT - R), y, z); gb.add(m); return m
  }
  {
    // right wall: the EXT connector, the volume wheel and its label, the grip ridges
    sidePlate(1, (g, mode, a) => {
      pocket(g, mode, a, 0.022, 0.048, 0.427, 0.689, 0.02, 92); if (mode === 'c') vtext(g, a, 'EXT CONNECTOR', 0.035, 0.558, 0.0125, -Math.PI / 2)
      pocket(g, mode, a, 0.022, 0.048, 0.18, 0.37, 0.02, 92); if (mode === 'c') { vtext(g, a, 'VOL', 0.035, 0.29, 0.0135, -Math.PI / 2); }
      // the socket on the back half: a dark opening with a row of pins
      g.beginPath(); g.roundRect(Math.min(a.zc(-0.047), a.zc(-0.005)), a.yc(0.67), Math.abs(a.zc(-0.005) - a.zc(-0.047)), a.yc(0.45) - a.yc(0.67), 0.006 * a.u); g.fillStyle = a.I('#222124', 20); g.fill()
      g.lineWidth = 3; g.strokeStyle = a.I('rgba(30,26,16,.7)', 50); g.stroke()
      for (let i = 0; i < 6; i++) { const y = 0.63 - i * 0.032; g.fillStyle = a.I('#9b8f4a', 170); g.fillRect(a.zc(-0.034), a.yc(y) - 0.006 * a.u, 0.018 * a.u, 0.012 * a.u) }
      // the volume wheel's slot
      g.beginPath(); g.roundRect(Math.min(a.zc(-0.0398), a.zc(0.0055)), a.yc(0.373), Math.abs(a.zc(0.0055) - a.zc(-0.0398)), a.yc(0.1805) - a.yc(0.373), 0.004 * a.u); g.fillStyle = a.I('#17171a', 10); g.fill()
      ridges(g, a)
    })
    const vw = wheel(X(1142), 1, 0.277, -0.017, 0.1925, 0.0353); wheels.volume = vw
    // left wall: the power input, the contrast dial and its label, the rating, the grip ridges
    sidePlate(-1, (g, mode, a) => {
      pocket(g, mode, a, 0.0555, 0.096, 0.269, 0.483, 0.02, 92); if (mode === 'c') vtext(g, a, 'CONTRAST', 0.0755, 0.376, 0.0135, Math.PI / 2)
      pocket(g, mode, a, -0.0265, 0.013, 0.194, 0.507, 0.014, 98)
      if (mode === 'c') { vtext(g, a, 'USE ONLY DMG-03 0.5', -0.0105, 0.35, 0.0115, -Math.PI / 2); vtext(g, a, 'DC 6V', 0.006, 0.35, 0.0115, -Math.PI / 2) }
      // the contrast dial's slot
      g.beginPath(); g.roundRect(Math.min(a.zc(0.06), a.zc(0.092)), a.yc(0.44), Math.abs(a.zc(0.092) - a.zc(0.06)), a.yc(0.31) - a.yc(0.44), 0.004 * a.u); g.fillStyle = a.I('#17171a', 10); g.fill()
      // the power input: a round hole with a ring round it and a pin in the middle
      const jz = a.zc(-0.0429), jy = a.yc(0.6425), JR = 0.019 * a.u
      g.beginPath(); g.ellipse(jz, jy, JR * 1.7, JR * 2.2, 0, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = a.I('rgba(50,44,30,.5)', 60); g.stroke()
      g.beginPath(); g.arc(jz, jy, JR, 0, Math.PI * 2); g.fillStyle = a.I('#0e0e10', 0); g.fill()
      g.beginPath(); g.arc(jz, jy, JR * 0.62, 0, Math.PI * 2); g.fillStyle = a.I('#232326', 70); g.fill()
      g.beginPath(); g.arc(jz, jy, JR * 0.22, 0, Math.PI * 2); g.fillStyle = a.I('#8c8a82', 200); g.fill()
      ridges(g, a)
    })
    const cw = wheel(X(24), -1, 0.376, 0.0755, 0.13, 0.03); wheels.contrast = cw
  }

  // ── the parts you press ──
  const BASE = FRONT - 0.012                                               // the buttons start just under the face and stand up through the printing
  {
    // D-pad: a dark grey cross with rounded corners, a soft bevelled top and a shallow dimple; pivots at its centre so it rocks toward the arm you press
    const cross = [[180, 1076], [266, 1076], [266, 1163], [352, 1163], [352, 1247], [266, 1247], [266, 1332], [180, 1332], [180, 1247], [97, 1247], [97, 1163], [180, 1163]]
    const ccx = wx(223), ccy = wy(1205), DB = 0.004, DH = 0.012, r = 0.012
    const pts = cross.map(([x, y]) => v2(x, y)), n = pts.length, sh = new THREE.Shape()
    pts.forEach((p, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], d1 = p.distanceTo(a), d2 = p.distanceTo(b), k = Math.min(r, d1 / 2, d2 / 2)
      const p1 = p.clone().lerp(a, k / d1), p2 = p.clone().lerp(b, k / d2)
      i ? sh.lineTo(p1.x, p1.y) : sh.moveTo(p1.x, p1.y); sh.quadraticCurveTo(p.x, p.y, p2.x, p2.y)
    })
    const g = new THREE.ExtrudeGeometry(sh, { depth: FRONT + DH - BASE - 2 * DB, curveSegments: 4, bevelEnabled: true, bevelSize: DB, bevelThickness: DB, bevelSegments: 3 }).translate(-ccx, -ccy, BASE + DB)
    // the dimple: a bump map on the top, drawn once (a little round dish and fine ridges across each arm's end)
    const bc = canvas(256, 256), bg = bc.getContext('2d'); bg.fillStyle = '#808080'; bg.fillRect(0, 0, 256, 256)
    const gr = bg.createRadialGradient(128, 128, 0, 128, 128, 34); gr.addColorStop(0, '#585858'); gr.addColorStop(1, '#808080'); bg.fillStyle = gr; bg.fillRect(0, 0, 256, 256)
    bg.strokeStyle = '#5a5a5a'; bg.lineWidth = 2; for (let t = 0; t < 3; t++) { const o = 70 + t * 12; [[128 - o, 'v'], [128 + o, 'v'], [128 - o, 'h'], [128 + o, 'h']].forEach(([p, d]) => { bg.beginPath(); d === 'v' ? (bg.moveTo(p, 96), bg.lineTo(p, 160)) : (bg.moveTo(96, p), bg.lineTo(160, p)); bg.stroke() }) }
    const bump = keep(new THREE.CanvasTexture(bc))
    // map the top face's x,y onto the 256 px bump map: the whole cross spans about 0.3 world units
    const pos = g.attributes.position, uv = g.attributes.uv, span = (352 - 97) * KX * S
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / span + 0.5, pos.getY(i) / span + 0.5)
    const m = new THREE.Mesh(g, std(0x47474d, 0.55, { bumpMap: bump, bumpScale: 1.4 })); m.position.set(ccx, ccy, 0); gb.add(m); abMeshes.dpad = m
  }
  {
    // A and B: magenta, a gently domed top that rolls over a rounded edge into the straight side
    const disc = (cx, cy) => {
      const R = 0.066, zTop = FRONT + 0.02, zEdge = FRONT + 0.0165, rr_ = 0.007, prof = [new THREE.Vector2(0.0001, BASE), new THREE.Vector2(R, BASE), new THREE.Vector2(R, zEdge - rr_)]
      for (let i = 1; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; prof.push(new THREE.Vector2(R - rr_ + Math.cos(a) * rr_, zEdge - rr_ + Math.sin(a) * rr_)) }
      for (let i = 1; i <= 6; i++) { const t = i / 6, r = (R - rr_) * (1 - t); prof.push(new THREE.Vector2(Math.max(r, 0.0001), zEdge + (zTop - zEdge) * (1 - (r / (R - rr_)) ** 2))) }
      const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 32).rotateX(Math.PI / 2), std(0xa3305a, 0.4)); m.position.set(wx(cx), wy(cy), 0); gb.add(m); return m
    }
    abMeshes.b = disc(735, 1225); abMeshes.a = disc(903, 1146)
    // Select and Start: grey capsules, tilted
    const pill = (cx, cy) => {
      const len = 125 * KX * S, wid = 42 * KY * S, PB = wid * 0.32, hl = (len - 2 * PB) / 2 - (wid - 2 * PB) / 2, hw = (wid - 2 * PB) / 2, sh = new THREE.Shape()
      sh.moveTo(-hl, -hw); sh.lineTo(hl, -hw); sh.absarc(hl, 0, hw, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-hl, hw); sh.absarc(-hl, 0, hw, Math.PI / 2, Math.PI * 1.5, false)
      const g = new THREE.ExtrudeGeometry(sh, { depth: FRONT + 0.008 - BASE - 2 * PB * 0.7, curveSegments: 8, bevelEnabled: true, bevelSize: PB, bevelThickness: PB * 0.7, bevelSegments: 3 })
      const m = new THREE.Mesh(g, std(0x8e8d99, 0.5)); m.position.set(wx(cx), wy(cy), BASE + PB * 0.7); m.rotation.z = SIDEK; gb.add(m); return m
    }
    abMeshes.select = pill(388, 1452); abMeshes.start = pill(561, 1449)
  }

  // the power switch: a knob that slides along its slot on the top edge
  const power = {}
  {
    const topY = Y(34), xa = X(24 + 0.100 * 1118), xb = X(24 + 0.222 * 1118), kw = 0.058, zc = -0.034
    const slot = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, 0.004, 0.06), std(0x8c8895, 0.6)); slot.position.set((xa + xb) / 2, topY, zc); gb.add(slot)
    const knob = new THREE.Mesh(new THREE.BoxGeometry(kw, 0.016, 0.044), std(0xb4b2bb, 0.45)); knob.position.set(xb - 0.003 - kw / 2, topY + 0.004, zc); gb.add(knob)
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
    const stex = keep(new THREE.CanvasTexture(game.canvas)); stex.colorSpace = THREE.SRGBColorSpace; stex.magFilter = THREE.LinearFilter; stex.anisotropy = 8
    const { x0, x1, y0, y1 } = screenRect, zL = FRONT + 0.0008
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y0 - y1), new THREE.MeshLambertMaterial({ color: 0xd8d8d8, map: stex })); lcd.position.set((x0 + x1) / 2, (y0 + y1) / 2, zL); gb.add(lcd)
    frameHooks.push(dt => { if (game.step(dt)) stex.needsUpdate = true })
    // the shadow the bezel casts on the LCD: strongest along the top and left
    {
      const W = 400, H = 360, cv = canvas(W, H), g = cv.getContext('2d')
      const edge = (ax, ay, bx, by, a, rx, ry, rw, rh) => { const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, `rgba(12,14,6,${a})`); gr.addColorStop(1, 'rgba(12,14,6,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh) }
      edge(0, 0, 0, H * 0.09, 0.7, 0, 0, W, H * 0.09); edge(0, 0, W * 0.065, 0, 0.6, 0, 0, W * 0.065, H)
      edge(W, 0, W * 0.97, 0, 0.3, W * 0.97, 0, W * 0.03, H); edge(0, H, 0, H * 0.97, 0.3, 0, H * 0.97, W, H * 0.03)
      const tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y0 - y1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); inner.position.set((x0 + x1) / 2, (y0 + y1) / 2, zL + 0.0004); gb.add(inner)
    }
    // the acrylic window over the screen: clear, with a very faint sheen; the lights glint off it as you turn it
    {
      const cv = canvas(128, 128), g = cv.getContext('2d'), gl = g.createLinearGradient(0, 0, 128, 128)
      gl.addColorStop(0, 'rgb(20,20,20)'); gl.addColorStop(0.45, 'rgb(5,5,5)'); gl.addColorStop(1, 'rgb(0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, 128, 128)
      const glaze = keep(new THREE.CanvasTexture(cv)); glaze.colorSpace = THREE.SRGBColorSpace
      const acrylic = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 0.004, y0 - y1 + 0.004),
        new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: glaze, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
      acrylic.position.set((x0 + x1) / 2, (y0 + y1) / 2, FRONT + 0.0018); gb.add(acrylic)
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
    const targets = [abMeshes.a, abMeshes.b, abMeshes.dpad, abMeshes.select, abMeshes.start, power.knob, ...power.hits, wheels.volume, wheels.contrast]
    let held = null, turning = null
    const hitBtn = e => {
      const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(targets)[0]
      if (!hit) return null
      const o = hit.object
      if (o === wheels.volume) return 'volume'
      if (o === wheels.contrast) return 'contrast'
      if (o === abMeshes.dpad) { const p = o.worldToLocal(hit.point.clone()); return Math.abs(p.x) > Math.abs(p.y) ? (p.x > 0 ? 'right' : 'left') : (p.y > 0 ? 'up' : 'down') }
      return o === abMeshes.a ? 'a' : o === abMeshes.b ? 'b' : o === abMeshes.select ? 'select' : o === abMeshes.start ? 'start' : 'power'
    }
    // the D-pad, Select and Start move when pressed: the pad rocks toward the arm, the pills sink. Select also
    // fast-forwards the game to the win (the finish party, then the prizes); the rest do nothing in the game
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
      if (k === 'volume' || k === 'contrast') { turning = { m: wheels[k], y: e.clientY, s: k === 'volume' ? -1 : 1 }; controls.enabled = false; return }
      held = k; controls.enabled = false; isAB(k) ? setBtn(k, true) : feel(k, true)
      if (k === 'select') game.win?.()
      if (k === 'start') game.restart?.()                    // Start resets: a fresh run from Monumento
    }, { capture: true, signal: ac.signal })
    // the wheels: drag up or down on one and it turns with your finger, tooth by tooth
    addEventListener('pointermove', e => { if (!turning) return; const dy = e.clientY - turning.y; turning.y = e.clientY; turning.m.rotation.z += dy * 0.02 * turning.s }, { signal: ac.signal })
    addEventListener('pointerup', () => { if (turning) { turning = null; controls.enabled = true } }, { signal: ac.signal })
    addEventListener('pointerup', () => { if (!held) return; isAB(held) ? setBtn(held, false) : feel(held, false); held = null; controls.enabled = true }, { signal: ac.signal })
    el.addEventListener('pointermove', e => { if (!held && !turning) el.style.cursor = hitBtn(e) ? 'pointer' : '' }, { signal: ac.signal })
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
      textures.forEach(t => t.dispose()); envRT.dispose()
      renderer.dispose(); renderer.domElement.remove()
    }
  }
}

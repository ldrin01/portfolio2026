// My eyeglasses in 3D, built from code (no model file), for the footer: they rest on the footer as if on a tabletop,
// seen from above, and turn toward the pointer. Light world: smoky acetate and real glass; dark world: an orange line
// drawing at half resolution. Modelled from my photos (see public/lab/glasses.html for the full lab with controls).
// mountGlasses(el) loads three.js on demand and returns a dispose function.

function buildModel(THREE, RoomEnvironment) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  const curve = (pts, closed = false) => new THREE.CatmullRomCurve3(pts, closed, 'centripetal')

  // ── a profile (a rounded rectangle) swept along a curve; `up` decides how the profile is turned ──
  function roundRect(w, h, r, seg) {
    if (seg === 0) return [[w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]] // plain rectangle
    const pts = [], cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]]
    for (const [cx, cy, a0] of cs) for (let s = 0; s <= seg; s++) { const a = ((a0 + (s / seg) * 90) * Math.PI) / 180; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]) }
    return pts
  }
  function sweep(c, opts = {}) {
    const { steps = 64, closed = false, up = V(0, 1, 0), w = 0.3, h = 0.3, w2, h2, r = 0.5, seg = 3, lo = false, taper = 0 } = opts
    const ringN = (seg + 1) * 4, pos = [], uvs = [], idx = []
    const n = closed ? steps : steps + 1
    for (let i = 0; i < n; i++) {
      const k = i / steps, p = c.getPointAt(k), t = c.getTangentAt(k)
      const side = t.clone().cross(up).normalize(), u = side.clone().cross(t).normalize()
      // taper: both ends slim down, so a part can disappear into the one it joins without showing its end
      const f = taper ? 1 - taper * (1 - Math.min(1, Math.min(k, 1 - k) / 0.12)) ** 2 : 1
      const ww = (w2 == null ? w : w + (w2 - w) * k) * f, hh = (h2 == null ? h : h + (h2 - h) * k) * f
      const prof = roundRect(ww, hh, Math.min(ww, hh) * r, seg)
      prof.forEach(([a, b], j) => { pos.push(...p.clone().addScaledVector(side, a).addScaledVector(u, b).toArray()); uvs.push(j / ringN, k) })
    }
    for (let i = 0; i < steps; i++) {
      const a = i * ringN, b = ((i + 1) % n) * ringN
      for (let j = 0; j < ringN; j++) { const j2 = (j + 1) % ringN; idx.push(a + j, b + j, b + j2, a + j, b + j2, a + j2) }
    }
    if (!closed) { // caps
      const cap = (base, flip) => { const ctr = pos.length / 3; const pc = c.getPointAt(base === 0 ? 0 : 1); pos.push(pc.x, pc.y, pc.z); uvs.push(0, 0); for (let j = 0; j < ringN; j++) { const j2 = (j + 1) % ringN; flip ? idx.push(ctr, base + j2, base + j) : idx.push(ctr, base + j, base + j2) } }
      cap(0, false); cap(steps * ringN, true)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setIndex(idx); g.computeVertexNormals()
    if (lo) { // the line drawing: one ring per step and a rail along each corner, no diagonals
      const seg = []
      const P = (i, j) => pos.slice((i * ringN + j) * 3, (i * ringN + j) * 3 + 3)
      for (let i = 0; i < n; i++) for (let j = 0; j < ringN; j++) seg.push(...P(i, j), ...P(i, (j + 1) % ringN))
      for (let i = 0; i < steps; i++) for (let j = 0; j < ringN; j++) seg.push(...P(i, j), ...P((i + 1) % n, j))
      g.userData.wire = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))
    }
    // the dark world draws a simpler twin as lines: square profile, far fewer rings
    if (!lo) g.userData.lo = sweep(c, { ...opts, steps: Math.max(3, Math.round(steps / 3)), w: w * 1.08, h: h * 1.08, w2: w2 && w2 * 1.08, h2: h2 && h2 * 1.08, seg: 0, lo: true }) // sharp corners just outside the round body, so the solid never hides them
    return g
  }

  // ── the lens shape, upright and seen from the front, right lens (x outward, -x toward the nose) ──
  // From the photos: a straight, broad top; the outer side drops nearly vertical and rounds into the bottom;
  // the nose side slants in diagonally from the bridge, so the bottom is narrower than the top (a soft P3 / panto).
  const LENS = [[-2.3, 1.42], [-1.6, 1.8], [-0.4, 1.96], [0.9, 1.95], [1.95, 1.76], [2.5, 1.18], [2.64, 0.25], [2.42, -0.8], [1.86, -1.6], [0.9, -2.04], [-0.2, -2.1], [-1.15, -1.8], [-1.86, -1.15], [-2.26, -0.3], [-2.42, 0.58]]
  const GAP = 0.95 // half the bridge: 19 mm between the lenses
  const CX = GAP + 2.36
  const BASE = 0.045 // lens base curve: the front bows forward a little
  const lensCurve = (side) => curve(LENS.map(([x, y]) => V(side * (CX + x), y, -BASE * x * x)), true)
  // the point on the rim nearest to a spot given in the lens's own coordinates (x outward, y up)
  function rimNear(side, x, y) {
    const pts = lensCurve(side).getSpacedPoints(600), want = V(side * (CX + x), y, 0)
    let best = pts[0], bd = Infinity
    for (const p of pts) { const d = (p.x - want.x) ** 2 + (p.y - want.y) ** 2; if (d < bd) { bd = d; best = p } }
    return best.clone()
  }

  // ── materials: the light world (physical) and the dark world (orange wireframe) ──
  const LIGHT = {
    frame: new THREE.MeshPhysicalMaterial({ color: 0x4a4f57, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transmission: 0.6, thickness: 0.3, ior: 1.5, attenuationColor: 0x1b1d21, attenuationDistance: 0.22, specularIntensity: 0.9 }), // smoky translucent acetate
    // the same acetate where it is thick (hinge blocks, tips): light travels further through it, so it reads darker
    thick: new THREE.MeshPhysicalMaterial({ color: 0x33363c, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, transmission: 0.35, thickness: 0.6, ior: 1.5, attenuationColor: 0x15171a, attenuationDistance: 0.18 }),
    // the lens groove: the inner edge of the rim, lighter where the acetate is thin
    groove: new THREE.MeshPhysicalMaterial({ color: 0x8a919a, roughness: 0.18, clearcoat: 1, transmission: 0.3, thickness: 0.05, ior: 1.5 }),
    bridge: new THREE.MeshPhysicalMaterial({ color: 0x1c1e22, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transmission: 1, thickness: 0.12, ior: 1.6, transparent: true, opacity: 1, side: THREE.DoubleSide, envMapIntensity: 1.3, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [260, 420] }), // the anti-reflective coating's green / violet glint
    pad: new THREE.MeshPhysicalMaterial({ color: 0xeeda9c, roughness: 0.3, transmission: 0.3, thickness: 0.25, ior: 1.45, clearcoat: 0.6 }),
    metal: new THREE.MeshPhysicalMaterial({ color: 0xbfc3ca, roughness: 0.25, metalness: 1 }),
    lime: new THREE.MeshPhysicalMaterial({ color: 0xc4e346, roughness: 0.35, clearcoat: 0.5 }),
    sleeve: new THREE.MeshPhysicalMaterial({ color: 0xf1efe8, roughness: 0.45, transmission: 0.4, thickness: 0.4 })
  }
  // dark: every part is an orange line drawing; solid bodies in the background colour hide the lines behind them
  const ln = (c) => new THREE.LineBasicMaterial({ color: c })
  const DARK_LINES = { frame: ln(0xff5a2d), thick: ln(0xff5a2d), groove: ln(0x9a2c10), bridge: ln(0xff7a3d), lens: ln(0x6e200c), pad: ln(0xe84a1c), metal: ln(0xc43a14), lime: ln(0xffb070), sleeve: ln(0x9a2c10), print: ln(0) }
  const OCCLUDE = new THREE.MeshBasicMaterial({ color: 0x0a0605, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })

  // ── build, upright: x right, y up, z toward the viewer ──
  const parts = []
  const PRINTS = []
  const add = (g, role) => parts.push([g, role])
  const EY = 1.5 // hinge height

  for (const side of [-1, 1]) {
    const rim = lensCurve(side)
    // the rim: a thin band, flat to the front (profile turned so its width runs around the lens)
    add(sweep(rim, { steps: 120, closed: true, up: V(0, 0, 1), w: 0.24, h: 0.34, r: 0.45 }), 'frame')
    // the lens groove: a thin lighter edge just inside the band, where the lens is seated
    {
      const pts = rim.getSpacedPoints(160), c = V(side * CX, 0, 0)
      const inner = pts.map(p => { const d = V(p.x - c.x, p.y - c.y, 0).normalize(); return V(p.x - d.x * 0.115, p.y - d.y * 0.115, p.z + 0.1) })
      add(sweep(curve(inner.slice(0, -1), true), { steps: 160, closed: true, up: V(0, 0, 1), w: 0.03, h: 0.07, r: 0.5, seg: 1 }), 'groove')
    }
    // the lens sits inside the band
    const shape = new THREE.Shape(rim.getSpacedPoints(80).map(p => new THREE.Vector2(p.x, p.y)))
    const lg = new THREE.ShapeGeometry(shape, 24)
    const lp = lg.attributes.position
    for (let i = 0; i < lp.count; i++) { const x = lp.getX(i) - side * CX; lp.setZ(i, -BASE * x * x) }
    lg.computeVertexNormals()
    add(lg, 'lens')

    // endpiece: a slightly thicker block off the outer top corner, turning back to the hinge
    const o = rimNear(side, 2.45, 1.3)
    add(sweep(curve([o.clone().add(V(-side * 0.08, 0, 0)), V(side * (CX + 2.62), EY, -0.15), V(side * (CX + 2.7), EY, -0.75)]), { steps: 12, w: 0.42, h: 0.3, r: 0.4 }), 'thick')
    add(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12).rotateZ(Math.PI / 2).translate(side * (CX + 2.86), EY, -0.55), 'metal')

    // temple: thin and flat, straight back with a slight outward splay, then down over the ear
    const tp = curve([V(side * (CX + 2.74), EY, -0.7), V(side * (CX + 2.95), EY + 0.02, -4), V(side * (CX + 3.15), EY - 0.05, -8.5), V(side * (CX + 3.2), EY - 0.35, -10.8), V(side * (CX + 3.18), EY - 1.3, -12.1), V(side * (CX + 3.12), EY - 2.0, -12.7)])
    add(sweep(tp, { steps: 80, w: 0.13, h: 0.3, h2: 0.22, r: 0.45 }), 'frame')
    // the size print on the inside of the temple, like real frames (white ink, tiny)
    {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64
      const cx = cv.getContext('2d'); cx.fillStyle = 'rgba(235, 236, 238, .92)'; cx.font = '500 40px ui-monospace, Menlo, monospace'; cx.textBaseline = 'middle'
      cx.fillText(side > 0 ? '51\u25A120  145' : 'C.02  ACETATE', 24, 34)
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
      PRINTS.push(tex)
      const z0 = -2.7, z1 = -5.5, x0 = CX + 2.74 + (2.95 - 2.74) * ((-z0 - 0.7) / 3.3), x1 = CX + 2.74 + (2.95 - 2.74) * ((-z1 - 0.7) / 3.3)
      const g = new THREE.PlaneGeometry(Math.hypot(z1 - z0, x1 - x0), 0.15)
      g.rotateY(-side * (Math.PI / 2 + Math.atan2(x1 - x0, z0 - z1))) // facing the inside, following the temple's splay
      g.translate(side * ((x0 + x1) / 2 - 0.068), EY - 0.01, (z0 + z1) / 2)
      g.userData.tex = tex
      add(g, 'print')
    }
    // the tip: a lime band and the dark end, a little fatter than the temple
    const tip = curve([V(side * (CX + 3.12), EY - 1.95, -12.66), V(side * (CX + 3.06), EY - 2.6, -13.05), V(side * (CX + 3.0), EY - 3.05, -13.15)])
    add(sweep(tip, { steps: 16, w: 0.2, h: 0.3, h2: 0.24, r: 0.5 }), 'thick')
    add(sweep(curve([V(side * (CX + 3.13), EY - 1.75, -12.52), V(side * (CX + 3.12), EY - 2.02, -12.7)]), { steps: 4, w: 0.205, h: 0.31, r: 0.5 }), 'lime')

    // nose pad: a little metal arm from the inner rim, angling back, holding a clear cream oval
    const m = rimNear(side, -2.4, 0.2)
    add(sweep(curve([m, m.clone().add(V(side * 0.12, -0.15, -0.35)), V(side * (GAP + 0.18), m.y - 0.45, -0.62)]), { steps: 10, w: 0.06, h: 0.06, r: 0.5 }), 'metal')
    add(new THREE.BoxGeometry(0.12, 0.16, 0.12).translate(side * (GAP + 0.18), m.y - 0.45, -0.66), 'metal')
    const padAt = (g) => g.scale(0.24, 0.52, 0.1).rotateX(-0.25).rotateY(side * 0.85).translate(side * (GAP - 0.02), m.y - 0.75, -0.78)
    const pad = padAt(new THREE.SphereGeometry(1, 24, 16))
    pad.userData.lo = padAt(new THREE.SphereGeometry(1, 8, 5))
    add(pad, 'pad')
  }
  // the clear silicone sleeve on one temple, just behind the hinge
  add(sweep(curve([V(-(CX + 2.78), EY, -1.0), V(-(CX + 2.86), EY, -2.25)]), { steps: 6, w: 0.4, h: 0.52, r: 0.5 }), 'sleeve')
  // the bridge: thick, glossy, a low saddle from one inner top corner to the other, set a hair behind the rims
  {
    // keyhole: it leaves each rim partway down the nose side and arches up to about the top line of the lenses
    const l = rimNear(-1, -2.35, 1.2), r = rimNear(1, -2.35, 1.2)
    add(sweep(curve([l.clone().add(V(-0.02, 0, 0)), V(-0.5, 1.62, -0.1), V(0, 1.78, -0.15), V(0.5, 1.62, -0.1), r.clone().add(V(0.02, 0, 0))]), { steps: 48, up: V(0, 0, 1), w: 0.36, h: 0.33, r: 0.5, taper: 0.4 }), 'bridge')
  }
  return { parts, LIGHT, DARK_LINES, OCCLUDE, V }
}

export async function mountGlasses(el) {
  const [THREE, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/environments/RoomEnvironment.js')
  ])
  const { parts, LIGHT, DARK_LINES, OCCLUDE, V } = buildModel(THREE, RoomEnvironment)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = matchMedia('(pointer: coarse)').matches

  // On a see-through canvas real refraction has nothing behind it to bend (it reads as grey), so here the acetate and
  // lenses use plain transparency with reflections. That also drops refraction's second render pass.
  for (const k of ['frame', 'thick', 'groove', 'pad', 'sleeve']) Object.assign(LIGHT[k], { transmission: 0, transparent: true, opacity: k === 'frame' ? 0.94 : k === 'thick' ? 0.97 : 0.85 })
  LIGHT.frame.color.set(0x2c3036); LIGHT.thick.color.set(0x212428); LIGHT.groove.color.set(0x7d848d) // without refraction the acetate needs its depth in the colour
  Object.assign(LIGHT.lens, { transmission: 0, opacity: 0.1, depthWrite: false })

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0) // see-through: the footer itself is the tabletop
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = !coarse // phones: the baked contact shadow alone
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 300)

  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(-8, 20, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0008
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 })
  scene.add(sun)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb6a8, 0.5))

  // the table: invisible, it only catches the shadow
  const table = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.12 }))
  table.receiveShadow = true
  scene.add(table)

  const glasses = new THREE.Group()
  const holder = new THREE.Group()
  holder.add(glasses)
  scene.add(holder)
  const disposables = [env, pmrem, table.geometry, table.material, OCCLUDE, ...Object.values(LIGHT), ...Object.values(DARK_LINES)]
  const meshes = parts.map(([g, role]) => {
    if (role === 'print') g.userData.mat = new THREE.MeshBasicMaterial({ map: g.userData.tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(g, role === 'print' ? g.userData.mat : LIGHT[role])
    mesh.userData.role = role
    mesh.castShadow = role !== 'lens' && role !== 'print'
    glasses.add(mesh)
    disposables.push(g)
    if (g.userData.mat) disposables.push(g.userData.mat, g.userData.tex)
    return mesh
  })
  const lines = parts.filter(([, role]) => role !== 'lens' && role !== 'print').map(([g, role]) => {
    const lg = g.userData.lo?.userData.wire ?? new THREE.EdgesGeometry(g.userData.lo ?? g, 1)
    const l = new THREE.LineSegments(lg, DARK_LINES[role])
    l.visible = false
    glasses.add(l)
    disposables.push(lg)
    return l
  })

  // rest them upside down, as in the photos: the brow line on the table, the ear bends pointing up
  glasses.rotation.set(0, 0, Math.PI)
  holder.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(glasses)
  glasses.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  const baseY = glasses.position.y
  holder.updateMatrixWorld(true)

  // contact shadow, baked once: parts near the table darken it, the closer the darker
  let contact
  {
    const b = new THREE.Box3().setFromObject(glasses), M = 1.2
    const x0 = b.min.x - M, z0 = b.min.z - M, w = b.max.x - b.min.x + 2 * M, d = b.max.z - b.min.z + 2 * M
    const S = 1024, sx = S / w, sz = S / d
    const cv = document.createElement('canvas'); cv.width = cv.height = S
    const cx = cv.getContext('2d')
    const H = 0.45, p = V(0, 0, 0)
    meshes.forEach(mesh => {
      if (['lens', 'print'].includes(mesh.userData.role)) return
      const pos = mesh.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
        if (p.y > H) continue
        const k = 1 - p.y / H, r = (0.07 + p.y * 0.7) * sx, X = (p.x - x0) * sx, Z = (p.z - z0) * sz
        const g = cx.createRadialGradient(X, Z, 0, X, Z, r)
        g.addColorStop(0, `rgba(30, 24, 16, ${0.1 * k * k * k})`); g.addColorStop(1, 'rgba(30, 24, 16, 0)')
        cx.fillStyle = g; cx.fillRect(X - r, Z - r, r * 2, r * 2)
      }
    })
    const soft = document.createElement('canvas'); soft.width = soft.height = S
    const sc = soft.getContext('2d'); sc.filter = 'blur(3px)'; sc.drawImage(cv, 0, 0)
    const tex = new THREE.CanvasTexture(soft); tex.colorSpace = THREE.SRGBColorSpace
    contact = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x0 + w / 2, 0.004, z0 + d / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
    holder.add(contact)
    disposables.push(contact.geometry, contact.material, tex)
  }

  // camera: from above and a little in front, looking down on the glasses, framed to fit
  function frame() {
    const w = el.clientWidth, h = el.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const dir = V(0, 0.42, 0.91).normalize() // about 25° down: low over the table, the lenses face you and the temples run back into the distance
    const vfov = (camera.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect)
    const dist = Math.max(8.4 / Math.tan(hfov / 2), 7.2 / Math.tan(vfov / 2)) // room to turn without leaving the frame
    const target = V(0, 0.8, 0.6)
    camera.position.copy(target).addScaledVector(dir, dist)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    kick()
  }

  // theme: physical materials in light, the line drawing in dark
  let dark = false
  function applyTheme() {
    dark = document.documentElement.dataset.theme === 'dark'
    meshes.forEach(mesh => {
      const role = mesh.userData.role
      mesh.material = dark ? OCCLUDE : role === 'print' ? mesh.geometry.userData.mat : LIGHT[role]
      mesh.visible = !(dark && (role === 'lens' || role === 'print'))
      mesh.castShadow = !dark && role !== 'lens' && role !== 'print'
    })
    lines.forEach(l => { l.visible = dark })
    contact.visible = table.visible = !dark
    scene.environment = dark ? null : env
    renderer.setPixelRatio(dark ? 0.5 : Math.min(devicePixelRatio, 2)) // dark: half resolution, shown pixelated
    frame()
  }
  const themeWatch = new MutationObserver(applyTheme)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const ro = new ResizeObserver(frame)
  ro.observe(el)

  // motion: an eased turn toward the pointer and a slow float; on touch screens a gentle sway instead.
  // Only a turn, never a tilt: tilting would sink the long temples into the table.
  const follow = { tx: 0, yaw: 0 }
  let mouse = false
  const onPointer = (e) => { if (e.pointerType !== 'mouse') return; mouse = true; follow.tx = (e.clientX / innerWidth) * 2 - 1; kick() }
  addEventListener('pointermove', onPointer, { passive: true })

  let raf = 0, seen = false, last = 0
  const tick = (t) => {
    raf = 0
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0 // seconds since the last frame, capped after a pause
    last = t
    if (!reduce) {
      if (!mouse) follow.tx = Math.sin(t / 2600) * 0.6
      // ease toward the target by elapsed time: smooth at any frame rate, and no overshoot to fight the next move
      follow.yaw += (follow.tx * 0.25 - follow.yaw) * (1 - Math.exp(-dt * 4))
      holder.rotation.y = follow.yaw
      glasses.position.y = baseY + (Math.sin(t / 900) * 0.5 + 0.5) * 0.06
    }
    renderer.render(scene, camera)
    if (seen && !reduce) raf = requestAnimationFrame(tick) // runs only while the footer is on screen
    else last = 0
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick) }
  const visible = new IntersectionObserver(([e]) => { seen = !!e?.isIntersecting; if (seen) kick() })
  visible.observe(el)

  applyTheme()

  return () => {
    cancelAnimationFrame(raf)
    visible.disconnect(); ro.disconnect(); themeWatch.disconnect()
    removeEventListener('pointermove', onPointer)
    disposables.forEach(d => d.dispose?.())
    renderer.dispose()
    renderer.domElement.remove()
  }
}

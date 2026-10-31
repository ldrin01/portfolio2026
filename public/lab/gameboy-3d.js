// The 3D Game Boy. Loaded by gameboy.html as a plain script, so it also works when the page is opened as a file.
// The "Reload 3D" button re-fetches this file and rebuilds only the model.
window.GB3D = {
  async mount(host, saved = {}) {
    const THREE = await import('three')
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
    const { Brush, Evaluator, SUBTRACTION } = await import('three-bvh-csg')


  // Everything is laid out in photo pixels (1166 x 2000) and scaled to world units, so it lines up with the picture.
  const PW = 1166, PH = 2000, S = 1 / 1000
  const X = px => (px - PW / 2) * S, Y = py => (PH / 2 - py) * S
  const DEPTH = 0.4, FRONT = DEPTH / 2

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(26, 1 / 1.25, 0.1, 50)
  camera.position.set(0, 0, 5.6)
  // lights stay fixed while the model turns, so the shading moves across it as you spin it
  scene.add(new THREE.HemisphereLight(0xffffff, 0x58544e, 0.5))                                       // low ambient, so shadows stay deep
  const dir = (color, intensity, x, y, z) => { const l = new THREE.DirectionalLight(color, intensity); l.position.set(x, y, z); scene.add(l) }
  dir(0xffffff, 1.9, -2.5, 3.5, 3.5)   // key: front, top-left
  dir(0xfff1e0, 1.7, 2.5, 1.5, -4)     // back light: from behind, lights the back face and the back edges
  dir(0xdfe8ff, 0.9, 3.5, -2.5, 1.5)   // side light: lower right, separates the sides from the front and top
  dir(0xffffff, 0.3, -3, -1, 2)        // small fill so nothing goes black

  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o })
  const M = { body: mat(0xd2cec4), bezel: mat(0x85848d), lens: mat(0x8f9a22), dark: mat(0x2b2b2e), btn: mat(0xa5305c), pill: mat(0x8a8993), groove: mat(0x8d8a82), led: mat(0x7a2a1c), switch: mat(0x74737b) }

  // rounded rectangle in pixel coords, corners [tl, tr, br, bl] as {rx, ry} quarter-ellipses, sampled finely so the curve reads smooth
  function rr(x0, y0, x1, y1, [tl, tr, br, bl], seg = 32) {
    const pts = []
    const arc = (cx, cy, rx, ry, a0) => {
      for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(X(cx + Math.cos(a) * rx), Y(cy + Math.sin(a) * ry))) }
    }
    arc(x1 - tr.rx, y0 + tr.ry, tr.rx, tr.ry, -Math.PI / 2)  // top right
    arc(x1 - br.rx, y1 - br.ry, br.rx, br.ry, 0)             // bottom right
    arc(x0 + bl.rx, y1 - bl.ry, bl.rx, bl.ry, Math.PI / 2)   // bottom left
    arc(x0 + tl.rx, y0 + tl.ry, tl.rx, tl.ry, Math.PI)       // top left
    return new THREE.Shape(pts)
  }
  const rad = r => ({ rx: r, ry: r })
  // the photo's silhouette: x 24..1142, y 34..1958, big curve at the bottom right
  const SIL = [rad(44), rad(44), { rx: 262, ry: 270 }, rad(46)]

  // Two shells meet at the parting line, as on the real thing (top, bottom and side photos):
  //  - front shell (white): tight, crisp edges
  //  - back shell (cream): same footprint as the front at the parting line (no shrinking), a short straight wall,
  //    then a wide soft round-over on the L-back and R-back edges ONLY. Top-back and bottom-back stay sharp.
  const SEAM_Z = 0

  const shellShape = inset => rr(24 + inset, 34 + inset, 1142 - inset, 1958 - inset,
    SIL.map(c => ({ rx: Math.max(c.rx - inset, 4), ry: Math.max(c.ry - inset, 4) })))
  const FRONT_B = 0.02
  let fg = new THREE.ExtrudeGeometry(shellShape(FRONT_B * 1000),
    { depth: FRONT - SEAM_Z, curveSegments: 1, bevelEnabled: true, bevelSize: FRONT_B, bevelThickness: FRONT_B, bevelSegments: 6 })
  fg.translate(0, 0, SEAM_Z - FRONT_B) // its bottom bevel sinks into the back shell's wall, so no groove at the seam

  const slotFloors = []
  // ── LRF facet: the front face is pressed into a flat, tilted face at the big bottom-right corner ──
  // Move it by changing these three numbers (all fractions of the body, 0..1):
  const FACET = {
    bottomX: 0.604, // where the line meets the BOTTOM edge, as a fraction of body width counted from the LEFT   (60.4%)
    rightY: 0.858,  // where the line meets the RIGHT edge, as a fraction of body height counted from the TOP    (85.8%)
    drop: 0.055     // how far the outer corner is pressed down, as a fraction of the body thickness             (5.5% = about 10 degrees)
  }
  {
    const B = new THREE.Vector2(X(24 + FACET.bottomX * 1118), Y(1958))   // line start, on the bottom edge
    const R = new THREE.Vector2(X(1142), Y(34 + FACET.rightY * 1924))    // line end, on the right edge
    const dir = R.clone().sub(B).normalize()
    const nrm = new THREE.Vector2(dir.y, -dir.x)                          // points toward the corner that gets pressed
    const corner = new THREE.Vector2(X(1065), Y(1879)).sub(B)             // the middle of the big curve
    const tilt = Math.atan2(FACET.drop * DEPTH, corner.dot(nrm))
    const cutter = new THREE.BoxGeometry(4, 2, 0.6).translate(0, 1, 0.3)  // x along the line, y toward the corner, z up from the plane
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(-dir.x, -dir.y, 0), new THREE.Vector3(nrm.x, nrm.y, 0), new THREE.Vector3(0, 0, 1))
    basis.setPosition(B.x, B.y, FRONT)
    cutter.applyMatrix4(basis.multiply(new THREE.Matrix4().makeRotationX(-tilt)))
    const ev = new Evaluator(); ev.useGroups = false; ev.attributes = ['position', 'normal']
    fg = ev.evaluate(new Brush(fg), new Brush(cutter), SUBTRACTION).geometry

    // ── speaker slots: six tilted shallow grooves that straddle the top edge of the facet, as on the Front photo ──
    // each slot is [topX, topY, bottomX, bottomY] as fractions of the body (x from the LEFT, y from the TOP)
    // slots 2 to 6 also have a thin dark slit along their LEFT wall; slot 1 is a plain groove
    const SPEAKER = {
      width: 0.0198,  // slot width as a fraction of body width (about 2%)
      depth: 0.02,    // groove depth below the face, in z units (5% of the thickness); it follows the facet
      slit: { width: 0.25, from: 0.15, to: 0.95, depth: 0.08 }, // slit width as a fraction of the slot width; start/end along the slot (0 = top end, 1 = bottom end)
      slots: [
        [0.637, 0.890, 0.711, 0.971],
        [0.686, 0.873, 0.761, 0.955],
        [0.736, 0.856, 0.815, 0.940],
        [0.786, 0.840, 0.868, 0.923],
        [0.839, 0.824, 0.914, 0.909],
        [0.887, 0.805, 0.965, 0.890]
      ]
    }
    const sx = f => X(24 + f * 1118), sy = f => Y(34 + f * 1924)
    const stadiumPts = (x1, y1, x2, y2, r, n = 12) => {
      const a = Math.atan2(y2 - y1, x2 - x1), p = []
      for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; p.push(new THREE.Vector2(x2 + Math.cos(t) * r, y2 + Math.sin(t) * r)) }
      for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; p.push(new THREE.Vector2(x1 + Math.cos(t) * r, y1 + Math.sin(t) * r)) }
      return p
    }
    const side = v => nrm.dot(v.clone().sub(B))                          // + = on the facet side of the line
    const clip = (poly, keep) => {                                       // keep the part of a convex polygon on one side of the line
      const out = []
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], da = side(a) * keep, db = side(b) * keep
        if (da >= 0) out.push(a)
        if ((da >= 0) !== (db >= 0)) out.push(a.clone().lerp(b, da / (da - db)))
      }
      return out
    }
    const cutOut = (geo) => { fg = ev.evaluate(new Brush(fg), new Brush(geo), SUBTRACTION).geometry }
    const prism = (pts, z0, h) => pts.length < 3 ? null : new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, curveSegments: 1, bevelEnabled: false }).translate(0, 0, z0)
    const k = Math.tan(tilt)
    const shear = new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, -k * nrm.x, -k * nrm.y, 1, k * nrm.dot(B), 0, 0, 0, 1) // z' = z - k * (distance past the line)

    const r = SPEAKER.width * 1.118 / 2
    SPEAKER.slots.forEach(([tx, ty, bx, by], i) => {
      const T = new THREE.Vector2(sx(tx), sy(ty)), E = new THREE.Vector2(sx(bx), sy(by))
      const pts = stadiumPts(T.x, T.y, E.x, E.y, r)
      // the groove: flat on the flat side of the line, sheared to follow the ramp on the other side
      const flat = prism(clip(pts, -1), FRONT - SPEAKER.depth, 0.27); if (flat) cutOut(flat)
      const ramp = prism(clip(pts, 1), FRONT - SPEAKER.depth, 0.27); if (ramp) cutOut(ramp.applyMatrix4(shear))
      if (i === 0) return
      // the slit hugs the slot's left wall
      const d = E.clone().sub(T).normalize(); let n = new THREE.Vector2(d.y, -d.x); if (n.x > 0) n.negate()
      const sw = SPEAKER.slit.width * r * 2, off = r - sw / 2
      const p0 = T.clone().lerp(E, SPEAKER.slit.from).addScaledVector(n, off), p1 = T.clone().lerp(E, SPEAKER.slit.to).addScaledVector(n, off)
      const slitPts = stadiumPts(p0.x, p0.y, p1.x, p1.y, sw / 2, 8)
      // like the groove: flat on the flat side of the line, sheared to follow the ramp on the other side
      const sd = SPEAKER.slit.depth
      ;[[-1, null], [1, shear]].forEach(([keep, sh]) => {
        const part = clip(slitPts, keep); if (part.length < 3) return
        const cutG = prism(part, FRONT - sd, sd + 0.05); if (sh) cutG.applyMatrix4(sh); cutOut(cutG)
        const plugG = new THREE.ShapeGeometry(new THREE.Shape(part)).translate(0, 0, FRONT - sd + 0.002); if (sh) plugG.applyMatrix4(sh)
        slotFloors.push(new THREE.Mesh(plugG, M.dark))
      })
    })
  }
  // CSG can leave tiny loose slivers floating beside the speaker: keep only the biggest connected piece, and drop stray cutter triangles above the face
  {
    const pa = fg.attributes.position, na = fg.attributes.normal, nT = pa.count / 3, id = new Map(), par = []
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i] } return i }
    const vid = i => { const k = Math.round(pa.getX(i) * 1e4) + ',' + Math.round(pa.getY(i) * 1e4) + ',' + Math.round(pa.getZ(i) * 1e4); if (!id.has(k)) { id.set(k, par.length); par.push(par.length) } return id.get(k) }
    const tv = []
    for (let t = 0; t < nT; t++) { const a = vid(t * 3), b = vid(t * 3 + 1), c = vid(t * 3 + 2); tv.push(a); par[find(b)] = find(a); par[find(c)] = find(a) }
    const size = new Map(); tv.forEach(a => { const r = find(a); size.set(r, (size.get(r) || 0) + 1) })
    const best = [...size.entries()].sort((x, y) => y[1] - x[1])[0][0]
    const P = [], N = []
    tv.forEach((a, t) => { if (find(a) !== best) return; if (Math.max(pa.getZ(t*3), pa.getZ(t*3+1), pa.getZ(t*3+2)) > FRONT + 0.002) return; for (let j = 0; j < 3; j++) { const i = t * 3 + j; P.push(pa.getX(i), pa.getY(i), pa.getZ(i)); if (na) N.push(na.getX(i), na.getY(i), na.getZ(i)) } })
    const clean = new THREE.BufferGeometry(); clean.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); if (na) clean.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
    fg = clean
  }
  const frontShell = new THREE.Mesh(fg, M.body)

  // back shell, lofted from rings: each ring is the silhouette pulled in by d px on the LEFT and RIGHT only
  const WALL = 0.09         // straight wall below the parting line
  const ROUND_Z = 0.11      // how far the round-over drops (z)
  const ROUND_D = 140       // how far it sweeps in from the left and right (px)
  const ring = (d, seg = 24) => {
    const x0 = 24 + d, y0 = 34, x1 = 1142 - d, y1 = 1958
    const [tl, tr, br, bl] = SIL
    const pts = []
    const arc = (cx, cy, rx, ry, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(X(cx + Math.cos(a) * rx), Y(cy + Math.sin(a) * ry))) } }
    arc(x1 - tr.rx, y0 + tr.ry, tr.rx, tr.ry, -Math.PI / 2)
    arc(x1 - br.rx, y1 - br.ry, br.rx, br.ry, 0)
    arc(x0 + bl.rx, y1 - bl.ry, bl.rx, bl.ry, Math.PI / 2)
    arc(x0 + tl.rx, y0 + tl.ry, tl.rx, tl.ry, Math.PI)
    return pts
  }
  const layers = [{ z: SEAM_Z, d: 0 }, { z: -WALL, d: 0 }]
  const STEPS = 14
  for (let i = 1; i <= STEPS; i++) { const t = i / STEPS * Math.PI / 2; layers.push({ z: -WALL - ROUND_Z * Math.sin(t), d: ROUND_D * (1 - Math.cos(t)) }) }
  const rings = layers.map(l => ring(l.d))
  const K = rings[0].length
  const pos = [], idx = []
  rings.forEach((r, li) => r.forEach(v => pos.push(v.x, v.y, layers[li].z)))
  const V = i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
  const tri = (a, b, c, nz = 0) => { // orient every face outward
    const va = V(a), vb = V(b), vc = V(c)
    const n = vb.clone().sub(va).cross(vc.clone().sub(va)); if (n.lengthSq() < 1e-14) return
    const out = nz ? n.z * nz > 0 : n.dot(va.clone().add(vb).add(vc).multiplyScalar(1 / 3).sub(new THREE.Vector3(0, 0, 0.05))) >= 0
    idx.push(...(out ? [a, b, c] : [a, c, b]))
  }
  for (let l = 0; l < rings.length - 1; l++) for (let i = 0; i < K; i++) {
    const j = (i + 1) % K, a = l * K + i, b = l * K + j, c = (l + 1) * K + i, d = (l + 1) * K + j
    tri(a, c, b); tri(b, c, d)
  }
  const cap = (li, nz) => { // flat cap on a ring, with duplicate corner points removed
    const uniq = [], map = []
    rings[li].forEach((v, i) => { if (!uniq.length || v.distanceTo(uniq[uniq.length - 1]) > 1e-6) { uniq.push(v); map.push(li * K + i) } })
    if (uniq[0].distanceTo(uniq[uniq.length - 1]) < 1e-6) { uniq.pop(); map.pop() }
    THREE.ShapeUtils.triangulateShape(uniq, []).forEach(([a, b, c]) => tri(map[a], map[b], map[c], nz))
  }
  cap(rings.length - 1, -1) // back face
  cap(0, 1)                 // top of the back shell: the floor of the parting-line groove
  const bg = new THREE.BufferGeometry()
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals()
  const backShell = new THREE.Mesh(bg, M.body)

  const gb = new THREE.Group(); scene.add(gb)
  gb.add(frontShell, backShell, ...slotFloors)

  // ── BACK RECTANGLE: guide line only (nothing embossed yet) ──
  // Sizes are fractions of the body as you LOOK AT THE BACK (so "left" is the console's right side).
  // Tell me which edge to move and by how much, then I'll emboss it.
  let plateMesh = null // the raised face, so the tunnel can cut into it
  const BACK_RECT = {
    left: 0.140,   // from the left edge of the body (14.0%)
    right: 0.847,  // from the left edge of the body (84.7%), so the width is 70.7%
    top: 0.195,    // from the top of the body (19.5%), just under the cartridge bay
    bottom: 0.975, // from the top of the body (97.5%), so the height is 78.0%
    cornerTop: 0.015,    // corner radius at the TOP two corners, as a fraction of the body width (1.5%)
    cornerBottom: 0.05,  // corner radius at the BOTTOM two corners, as a fraction of the body width (5.0%)
    lift: 0.024,         // how far the face stands out from the back, in world units (24 px on the photo scale)
    shrink: 0.008,       // how far the TOP of the raised face is pulled in from its base (8 px); the base keeps the full rectangle
    showGuide: false     // true brings back the orange outline
  }
  {
    const w = 0.006 // line thickness in world units
    const xa = 0.559 - BACK_RECT.left * 1.118, xb = 0.559 - BACK_RECT.right * 1.118 // the back view is mirrored
    const xMin = Math.min(xa, xb), xMax = Math.max(xa, xb)
    const yTop = 0.966 - BACK_RECT.top * 1.924, yBot = 0.966 - BACK_RECT.bottom * 1.924
    const rT = BACK_RECT.cornerTop * 1.118, rB = BACK_RECT.cornerBottom * 1.118
    // rounded rectangle outline, grown (grow > 0) or shrunk (grow < 0) by the same amount all round
    const roundRect = (grow, seg = 20) => {
      const x0 = xMin - grow, x1 = xMax + grow, y0 = yBot - grow, y1 = yTop + grow
      const rt = Math.max(rT + grow, 0.001), rb = Math.max(rB + grow, 0.001)
      const pts = []
      const arc = (cx, cy, r, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) } }
      arc(x1 - rt, y1 - rt, rt, 0)            // top right
      arc(x0 + rt, y1 - rt, rt, Math.PI / 2)  // top left
      arc(x0 + rb, y0 + rb, rb, Math.PI)      // bottom left
      arc(x1 - rb, y0 + rb, rb, Math.PI * 1.5) // bottom right
      return pts
    }
    const outer = new THREE.Shape(roundRect(w / 2))
    outer.holes.push(new THREE.Path(roundRect(-w / 2).reverse()))
    const guide = new THREE.Mesh(new THREE.ShapeGeometry(outer), new THREE.MeshBasicMaterial({ color: 0xe84a1c, side: THREE.DoubleSide }))
    guide.position.z = -FRONT - 0.002
    if (BACK_RECT.showGuide) gb.add(guide)

    // the raised face: the base keeps the full rectangle, the top is pulled in by BACK_RECT.shrink,
    // and the wall between them is a smooth quarter-ellipse shoulder (tangent to the back at the base, tangent to the top face at the top)
    {
      const STEPS = 14, pos = [], idx = []
      const rings = []
      for (let i = 0; i <= STEPS; i++) {
        const th = i / STEPS * Math.PI / 2
        const pts = roundRect(-BACK_RECT.shrink * (1 - Math.cos(th)))
        rings.push(pts); const z = -FRONT - BACK_RECT.lift * Math.sin(th)
        pts.forEach(v => pos.push(v.x, v.y, z))
      }
      const K = rings[0].length
      const cx = (xMin + xMax) / 2, cy = (yTop + yBot) / 2
      const V = i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
      const tri = (a, b, c) => { // every face points away from the body
        const va = V(a), vb = V(b), vc = V(c)
        const n = vb.clone().sub(va).cross(vc.clone().sub(va)); if (n.lengthSq() < 1e-16) return
        const mid = va.clone().add(vb).add(vc).multiplyScalar(1 / 3).sub(new THREE.Vector3(cx, cy, -FRONT))
        idx.push(...(n.dot(mid) >= 0 ? [a, b, c] : [a, c, b]))
      }
      for (let l = 0; l < STEPS; l++) for (let i = 0; i < K; i++) {
        const j = (i + 1) % K, a = l * K + i, b = l * K + j, c = (l + 1) * K + i, d = (l + 1) * K + j
        tri(a, c, b); tri(b, c, d)
      }
      THREE.ShapeUtils.triangulateShape(rings[STEPS], []).forEach(([a, b, c]) => tri(STEPS * K + a, STEPS * K + b, STEPS * K + c))
      // closed underside (faces the body), so the plate is a solid and can be cut
      const uniq = [], map = []
      rings[0].forEach((v, i) => { if (!uniq.length || v.distanceTo(uniq[uniq.length - 1]) > 1e-6) { uniq.push(v); map.push(i) } })
      if (uniq[0].distanceTo(uniq[uniq.length - 1]) < 1e-6) { uniq.pop(); map.pop() }
      THREE.ShapeUtils.triangulateShape(uniq, []).forEach(([a, b, c]) => {
        const va = V(map[a]), vb = V(map[b]), vc = V(map[c])
        const n = vb.clone().sub(va).cross(vc.clone().sub(va))
        idx.push(...(n.z > 0 ? [map[a], map[b], map[c]] : [map[a], map[c], map[b]]))
      })
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
      plateMesh = new THREE.Mesh(g, M.body); gb.add(plateMesh)
    }
  }

  // ── CARTRIDGE TUNNEL: guide lines only (nothing cut yet) ──
  // From the Top edge, Top-angle and Back photos: the tunnel is one rectangular channel in the BACK half,
  // open at the top end and open to the back face. Same width at the top end and on the back.
  const TUNNEL = {
    left: 0.174,    // from the left edge of the body (17.4%); the tunnel is centred, so the right edge is 82.6%
    right: 0.826,
    bottom: 0.195,  // where the channel ends on the back face, as a fraction of body height from the top (19.5%): it meets the raised face
    bottomOut: 0.018, // the GREEN edge only: how far it is moved out along the direction the back face points, in world units (18 px)
    depth: 0.1,     // how far in from the back face it goes, in world units (25% of the body thickness): halfway from the back face to the middle
    length: 0.5,    // how far DOWN the body it runs, as a fraction of the body height from the top (50% = halfway down the whole body)
    showGuide: false // true brings back the coloured guide lines
  }
  {
    const w = 0.006                 // edge thickness
    const cs = 0.02                 // corner marker size
    const rect = (a, b, c, d) => new THREE.Shape([new THREE.Vector2(a, b), new THREE.Vector2(c, b), new THREE.Vector2(c, d), new THREE.Vector2(a, d)])
    const mesh = (shape, color) => new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }))
    // "left" and "right" below are as you LOOK AT THE BACK, so left is the console's right side
    const XL = Math.max(-0.559 + TUNNEL.left * 1.118, -0.559 + TUNNEL.right * 1.118), XR = -XL
    const yTop = 0.966, yBot = 0.966 - TUNNEL.bottom * 1.924
    const z0 = -FRONT, z1 = -FRONT + TUNNEL.depth
    const EDGE = { bLeft: 0xe53935, bRight: 0x1e88e5, bBottom: 0x43a047, eBack: 0xfb8c00, eDeep: 0x8e24aa, eLeft: 0x00acc1, eRight: 0xd81b60 }
    const CORNER = { bBL: 0xfdd835, bBR: 0x26a69a, bTL: 0x6d4c41, bTR: 0x9ccc65, eBL: 0x3949ab, eBR: 0xff7043, eDL: 0x757575, eDR: 0x29b6f6 }
    // ── the tunnel itself ──
    // From the top end down to the green line the channel is open to the back. From the green line down to TUNNEL.length
    // it runs under the lifted face: the plate is cut from the back face up to the green edge's height (TUNNEL.bottomOut),
    // so only the top of the plate (24 - 18 = 6 px) is left as a roof.
    {
      const zIn = -FRONT + TUNNEL.depth, yMax = yTop + 0.1
      const yEnd = Math.min(yBot, 0.966 - TUNNEL.length * 1.924)
      const ev = new Evaluator(); ev.useGroups = false; ev.attributes = ['position', 'normal']
      const boxFor = (y0, y1, z0, z1) => new THREE.BoxGeometry(XL - XR, y1 - y0, z1 - z0).translate(0, (y0 + y1) / 2, (z0 + z1) / 2)
      // back half: open all the way (the plate is a separate piece, so nothing else is in the way)
      const cutBack = ev.evaluate(new Brush(backShell.geometry), new Brush(boxFor(yEnd, yMax, -FRONT - 0.1, zIn)), SUBTRACTION)
      cutBack.material = M.body; gb.remove(backShell); gb.add(cutBack)
      // lifted face: cut from the back face up to the green edge's height, so a roof is left
      if (plateMesh) {
        const roofZ = -FRONT - TUNNEL.bottomOut
        const cutPlate = ev.evaluate(new Brush(plateMesh.geometry), new Brush(boxFor(yEnd, yMax, roofZ, zIn)), SUBTRACTION)
        cutPlate.material = M.body; gb.remove(plateMesh); gb.add(cutPlate)
      }
    }
    if (TUNNEL.showGuide) {
      // ── on the back face: left, right and bottom edges (the top is the open end) ──
      const back = new THREE.Group()
      back.add(mesh(rect(XL - w / 2, yBot - w / 2, XL + w / 2, yTop), EDGE.bLeft))
      back.add(mesh(rect(XR - w / 2, yBot - w / 2, XR + w / 2, yTop), EDGE.bRight))
      const green = mesh(rect(XR - w / 2, yBot - w / 2, XL + w / 2, yBot + w / 2), EDGE.bBottom)
      green.position.z = -TUNNEL.bottomOut // out of the back face, the way the back face points
      back.add(green)
      // two short edges that join the lifted green edge back down to the yellow and teal corners on the back face
      const link = (x, color) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, w, TUNNEL.bottomOut), new THREE.MeshBasicMaterial({ color }))
        m.position.set(x, yBot, -TUNNEL.bottomOut / 2); back.add(m)
      }
      link(XL, 0x111111) // black, on the left as you look at the back (joins yellow)
      link(XR, 0xff00cc) // magenta, on the right (joins teal)
      back.position.z = -FRONT - 0.002; gb.add(back)
      const bc = new THREE.Group()  // corners sit just above the edges
      for (const [x, y, c] of [[XL, yBot, CORNER.bBL], [XR, yBot, CORNER.bBR], [XL, yTop - cs / 2, CORNER.bTL], [XR, yTop - cs / 2, CORNER.bTR]])
        bc.add(mesh(rect(x - cs / 2, y - cs / 2, x + cs / 2, y + cs / 2), c))
      bc.position.z = -FRONT - 0.004; gb.add(bc)

      // ── on the top end: the opening, from the back face (z0) in to the depth (z1) ──
      const end = new THREE.Group()   // drawn flat in x / (-z), then laid down on the top end
      end.add(mesh(rect(XR - w / 2, -z0 - w / 2, XL + w / 2, -z0 + w / 2), EDGE.eBack))
      end.add(mesh(rect(XR - w / 2, -z1 - w / 2, XL + w / 2, -z1 + w / 2), EDGE.eDeep))
      end.add(mesh(rect(XL - w / 2, -z1, XL + w / 2, -z0), EDGE.eLeft))
      end.add(mesh(rect(XR - w / 2, -z1, XR + w / 2, -z0), EDGE.eRight))
      for (const [x, z, c] of [[XL, z0, CORNER.eBL], [XR, z0, CORNER.eBR], [XL, z1, CORNER.eDL], [XR, z1, CORNER.eDR]]) {
        const m = mesh(rect(x - cs / 2, -z - cs / 2, x + cs / 2, -z + cs / 2), c); m.position.z = 0.002; end.add(m)
      }
      end.rotation.x = -Math.PI / 2; end.position.y = yTop + 0.002; gb.add(end)
    }
  }

  // ── floating labels: each one is pinned to a spot on the body and hides when that spot turns away from you ──
  // L / R are as seen from the front (screen side). Corners read upper/lower, left/right, front/back.
  const HX = 0.559, TOP = Y(34), BOT = Y(1958), HZ = FRONT
  const CUR = { x: X(1065), y: Y(1879) } // 45 degrees round the big bottom-right curve
  const A = []
  const add = (group, name, pos, n) => A.push({ group, name, pos: new THREE.Vector3(...pos), n: new THREE.Vector3(...n).normalize() })
  add('faces', 'Front face', [0, 0.15, HZ], [0, 0, 1])
  add('faces', 'Back face', [0, 0.15, -HZ], [0, 0, -1])
  add('faces', 'Top', [0, TOP, 0.04], [0, 1, 0])
  add('faces', 'Bottom', [-0.12, BOT, 0.04], [0, -1, 0])
  add('faces', 'L side', [-HX, 0.2, 0.04], [-1, 0, 0])
  add('faces', 'R side', [HX, 0.2, 0.04], [1, 0, 0])
  add('corners', 'ULF', [-HX + 0.012, TOP - 0.012, HZ], [-1, 1, 1])
  add('corners', 'URF', [HX - 0.012, TOP - 0.012, HZ], [1, 1, 1])
  add('corners', 'LLF', [-HX + 0.012, BOT + 0.012, HZ], [-1, -1, 1])
  add('corners', 'LRF', [CUR.x, CUR.y, HZ], [1, -1, 1])
  add('corners', 'ULB', [-HX + 0.012, TOP - 0.012, -HZ], [-1, 1, -1])
  add('corners', 'URB', [HX - 0.012, TOP - 0.012, -HZ], [1, 1, -1])
  add('corners', 'LLB', [-HX + 0.012, BOT + 0.012, -HZ], [-1, -1, -1])
  add('corners', 'LRB', [CUR.x, CUR.y, -HZ], [1, -1, -1])
  add('edges', 'Top-front edge', [0.15, TOP, HZ], [0, 1, 1])
  add('edges', 'Top-back edge', [0.15, TOP, -HZ], [0, 1, -1])
  add('edges', 'Bottom-front edge', [-0.2, BOT, HZ], [0, -1, 1])
  add('edges', 'Bottom-back edge', [-0.2, BOT, -HZ], [0, -1, -1])
  add('edges', 'L-front edge', [-HX, -0.3, HZ], [-1, 0, 1])
  add('edges', 'L-back edge', [-HX, -0.3, -HZ], [-1, 0, -1])
  add('edges', 'R-front edge', [HX, -0.25, HZ], [1, 0, 1])
  add('edges', 'R-back edge', [HX, -0.25, -HZ], [1, 0, -1])
  add('edges', 'Top-L edge', [-HX, TOP, 0], [-1, 1, 0])
  add('edges', 'Top-R edge', [HX, TOP, 0], [1, 1, 0])
  add('edges', 'Bottom-L edge', [-HX, BOT, 0], [-1, -1, 0])
  add('edges', 'Curve edge', [CUR.x, CUR.y, 0], [1, -1, 0])

  const tagLayer = document.createElement('div'); tagLayer.className = 'tags'; host.appendChild(tagLayer)
  for (const a of A) {
    a.el = document.createElement('div'); a.el.className = 'tag ' + a.group
    a.el.innerHTML = `<i></i><b>${a.name}</b>`
    tagLayer.appendChild(a.el)
  }
  const shown = { faces: true, corners: true, edges: true, ...(saved.shown || {}) }
  const ac = new AbortController() // lets dispose() remove the button listeners
  document.querySelectorAll('[data-tags]').forEach(btn => {
    btn.setAttribute('aria-pressed', shown[btn.dataset.tags])
    btn.addEventListener('click', () => { const k = btn.dataset.tags; shown[k] = !shown[k]; btn.setAttribute('aria-pressed', shown[k]) }, { signal: ac.signal })
  })
  const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3()
  function placeTags() {
    gb.updateMatrixWorld()
    const w = host.clientWidth, h = host.clientHeight
    for (const a of A) {
      _p.copy(a.pos).applyMatrix4(gb.matrixWorld)
      _n.copy(a.n).applyQuaternion(gb.quaternion)
      _c.copy(camera.position).sub(_p).normalize()
      const facing = _n.dot(_c) > 0.12 && shown[a.group]
      a.el.style.opacity = facing ? 1 : 0
      if (!facing) continue
      _p.project(camera)
      a.el.style.transform = `translate(${(_p.x * .5 + .5) * w}px, ${(-_p.y * .5 + .5) * h}px)`
      a.el.classList.toggle('left', _n.x < -0.05) // text goes to the outside of the object
    }
  }

  // controls: drag to turn; a slow sway shows the facets until you touch it
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true
  controls.minPolarAngle = 0.5; controls.maxPolarAngle = Math.PI - 0.5
  let touched = !!saved.touched
  if (saved.rot) gb.rotation.set(saved.rot[0], saved.rot[1], saved.rot[2])   // keep the angle you were looking at
  if (saved.cam) { camera.position.fromArray(saved.cam); controls.update() }
  controls.addEventListener('start', () => { touched = true })

  function size() {
    const w = host.clientWidth, h = host.clientHeight
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(size); ro.observe(host); size()

  renderer.setAnimationLoop(t => {
    if (!touched) gb.rotation.y = Math.sin(t / 1800) * 0.5, gb.rotation.x = Math.sin(t / 2600) * 0.08
    controls.update(); placeTags(); renderer.render(scene, camera)
  })

  return {
    // what to carry over to the next build, so a reload does not move you
    state: () => ({ touched, shown: { ...shown }, rot: [gb.rotation.x, gb.rotation.y, gb.rotation.z], cam: camera.position.toArray() }),
    dispose() {
      renderer.setAnimationLoop(null); ro.disconnect(); ac.abort(); controls.dispose()
      scene.traverse(o => { if (o.geometry) o.geometry.dispose() })
      renderer.dispose(); renderer.domElement.remove(); tagLayer.remove()
    }
  }
  }
}

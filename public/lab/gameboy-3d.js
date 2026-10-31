// The 3D Game Boy. Loaded by gameboy.html as a plain script, so it also works when the page is opened as a file.
// The "Reload 3D" button re-fetches this file and rebuilds only the model.
window.GB3D = {
  // gameboy-csg.bin: 4-byte header length, a JSON list with one entry per cut, then the data of the cuts that are kept.
  // Most cuts only feed the next one (the shell is cut again and again), so just the last of each chain is stored: positions as
  // 16-bit numbers inside the shape's box, normals as 8-bit, plus the index. A cut that only feeds another one is replayed as an empty stand-in.
  async loadBake(url, THREE) {
    try {
      const res = await fetch(url); if (!res.ok) return null
      const buf = await res.arrayBuffer(), hl = new Uint32Array(buf, 0, 1)[0]
      const list = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)))
      let off = (4 + hl + 3) & ~3
      const pad = n => (n + 3) & ~3
      return list.map(r => {
        if (r.skip) return r
        const at = off, c3 = r.c * 3
        off = pad(off + c3 * 2); off = pad(off + c3); if (r.i) off = pad(off + r.i * r.w)
        r.make = () => {
          let o = at
          const q = new Int16Array(buf, o, c3), pos = new Float32Array(c3); o = pad(o + c3 * 2)
          for (let k = 0; k < c3; k++) pos[k] = r.mn[k % 3] + (q[k] + 32768) * r.sc[k % 3]
          const q8 = new Int8Array(buf, o, c3), nor = new Float32Array(c3); o = pad(o + c3)
          for (let k = 0; k < c3; k++) nor[k] = q8[k] / 127
          const geo = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
          if (r.i) geo.setIndex(new THREE.BufferAttribute(new (r.w === 2 ? Uint16Array : Uint32Array)(buf, o, r.i), 1))
          return geo
        }
        return r
      })
    } catch (e) { return null }
  },
  saveBake(rec) {
    const pad = n => (n + 3) & ~3
    const list = [], parts = []
    rec.forEach(r => {
      const e = { n: r.n, op: r.op, src: r.src }
      if (!r.g) { e.skip = 1; list.push(e); return }
      const pos = r.g.attributes.position.array, nor = r.g.attributes.normal.array, idx = r.g.index?.array
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
      for (let j = 0; j < pos.length; j++) { const d = j % 3; if (pos[j] < mn[d]) mn[d] = pos[j]; if (pos[j] > mx[d]) mx[d] = pos[j] }
      const sc = mn.map((v, d) => (mx[d] - v) / 65535 || 1)
      const q = new Int16Array(pos.length); for (let j = 0; j < pos.length; j++) q[j] = Math.round((pos[j] - mn[j % 3]) / sc[j % 3]) - 32768
      const q8 = new Int8Array(nor.length); for (let j = 0; j < nor.length; j++) q8[j] = Math.round(nor[j] * 127)
      Object.assign(e, { c: pos.length / 3, mn, sc, i: idx ? idx.length : 0, w: idx ? idx.BYTES_PER_ELEMENT : 0 })
      list.push(e); parts.push(q, q8); if (idx) parts.push(idx)
    })
    const head = new TextEncoder().encode(JSON.stringify(list))
    let total = pad(4 + head.length); for (const a of parts) total = pad(total + a.byteLength)
    const out = new Uint8Array(total); new Uint32Array(out.buffer, 0, 1)[0] = head.length; out.set(head, 4)
    let off = pad(4 + head.length); for (const a of parts) { out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), off); off = pad(off + a.byteLength) }
    return out
  },
  async mount(host, saved = {}) {
    // saved.libs lets a bundled page (the About page) hand in its own three.js; the lab page loads them through its import map.
    // saved.base is where the helper scripts live; saved.keyActive() says when the A / B / Space keys belong to the console.
    const L = saved.libs || {}
    const THREE = L.THREE || await import('three')
    const { OrbitControls } = L.OrbitControls ? L : await import('three/addons/controls/OrbitControls.js')
    const { Brush, Evaluator: CsgEvaluator, SUBTRACTION, INTERSECTION } = L.csg || await import('three-bvh-csg')
    const { toCreasedNormals } = L.BufferGeometryUtils || await import('three/addons/utils/BufferGeometryUtils.js')
    const BASE = saved.base || ''

    // ── baked cuts ──
    // The shells are carved with ~100 boolean cuts that take about 12 s. The About page (saved.csgCache) instead replays the results
    // from gameboy-csg.bin, in the same order. Each cut checks the size of the shape it starts from; if the model code has moved on and
    // no longer matches, the cache is dropped and the cuts run for real. To rebake after editing the model, open the lab page and run
    //   const rec = []; await GB3D.mount(document.createElement('div'), { base: '', csgRecord: rec }); GB3D.saveBake(rec)
    // (that returns the bytes of gameboy-csg.bin; save them next to this file).
    const baked = saved.csgCache ? await GB3D.loadBake(saved.csgFile || BASE + 'gameboy-csg.bin', THREE) : null
    let csgN = 0, csgLive = !!baked
    const csgOut = []   // what each cut handed back, so a later cut can tell it was fed by the one the cache expects
    class Evaluator extends CsgEvaluator {
      evaluate(a, b, op, target) {
        // (1% slack: the clean-up between cuts runs on the rounded numbers)
        const i = csgN++, hit = baked && csgLive ? baked[i] : null
        if (hit && hit.op === op && (hit.src >= 0 ? a.geometry === csgOut[hit.src] : Math.abs(hit.n - a.geometry.attributes.position.count) <= hit.n * 0.01)) {
          csgOut[i] = hit.skip ? new THREE.BufferGeometry() : hit.make()
          return new Brush(csgOut[i])
        }
        if (baked && csgLive && saved.csgStrict) throw new Error('cut ' + i)
        if (baked && csgLive) console.warn('gameboy-csg.bin no longer matches the model (cut ' + i + '): running the cuts for real. Rebake it.')
        csgLive = false
        const out = super.evaluate(a, b, op, target)
        csgOut[i] = out.geometry
        if (saved.csgRecord) {
          // copy the result now: the model code goes on to move and shade these shapes in place. One that only feeds the next cut is not kept.
          const rec = saved.csgRecord, src = csgOut.indexOf(a.geometry), g = out.geometry, at = g.attributes
          if (src >= 0 && src < i) rec[src].g = null
          const snap = new THREE.BufferGeometry()
          snap.setAttribute('position', new THREE.BufferAttribute(at.position.array.slice(), 3)); snap.setAttribute('normal', new THREE.BufferAttribute(at.normal.array.slice(), 3))
          if (g.index) snap.setIndex(new THREE.BufferAttribute(g.index.array.slice(), 1))
          rec[i] = { n: a.geometry.attributes.position.count, op, src: src < i ? src : -1, g: snap }
        }
        return out
      }
    }


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
  const dir = (color, intensity, x, y, z) => { const l = new THREE.DirectionalLight(color, intensity); l.position.set(x, y, z); scene.add(l); return l }
  const keyLight = dir(0xffffff, 1.9, -2.5, 3.5, 3.5)   // key: front, top-left. It casts the one real shadow: the bezel's edge falling onto the sunken LCD
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
  keyLight.castShadow = true; keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.0004; keyLight.shadow.radius = 3
  Object.assign(keyLight.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 12 })
  dir(0xfff1e0, 1.7, 2.5, 1.5, -4)     // back light: from behind, lights the back face and the back edges
  dir(0xdfe8ff, 0.9, 3.5, -2.5, 1.5)   // side light: lower right, separates the sides from the front and top
  dir(0xffffff, 0.3, -3, -1, 2)        // small fill so nothing goes black

  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o })
  // a thumbwheel: a toothed disc standing in its slot (axis along z), so only a slice of its rim pokes out of the wall.
  // side = +1 for the right wall, -1 for the left. It turns about its own centre (drag it).
  const thumbwheel = (wallX, side, yc, zc, slotH, thick) => {
    const R = slotH * 0.6, OUT = 0.011, TEETH = 72, TD = 0.0035, sh = new THREE.Shape()
    for (let i = 0; i < TEETH; i++) {
      const a = (i / TEETH) * Math.PI * 2, p = Math.PI * 2 / TEETH
      ;[[0, R - TD], [0.22, R], [0.5, R], [0.72, R - TD]].forEach(([f, r], j) => { const t = a + f * p, x = Math.cos(t) * r, y = Math.sin(t) * r; i === 0 && j === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y) })
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelSize: 0.0008, bevelThickness: 0.0008, bevelSegments: 1, curveSegments: 1 }).translate(0, 0, -thick / 2)
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.5 }))
    m.position.set(wallX + side * (OUT - R), yc, zc); m.castShadow = false
    return m
  }
  const M = { body: mat(0xc4b592), front: mat(0xc4bdad), bezel: mat(0x85848d), lens: mat(0x8f9a22), dark: mat(0x2b2b2e), btn: mat(0xa5305c), pill: mat(0x8a8993), groove: mat(0x8d8a82), led: mat(0x7a2a1c), switch: mat(0x74737b) }

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
    let B = new THREE.Vector2(X(24 + FACET.bottomX * 1118), Y(1958))   // line start, on the bottom edge
    const R = new THREE.Vector2(X(1142), Y(34 + FACET.rightY * 1924))    // line end, on the right edge
    const dir = R.clone().sub(B).normalize()
    let nrm = new THREE.Vector2(dir.y, -dir.x)                          // points toward the corner that gets pressed
    const corner = new THREE.Vector2(X(1065), Y(1879)).sub(B)             // the middle of the big curve
    const tilt = Math.atan2(FACET.drop * DEPTH, corner.dot(nrm))
    // ── the ramp follows the guide triangle: the face is the plane through its three corners ──
    // yellow: B (bottom edge), teal: R (right edge), orange: the middle of the big curve. Each is moved a little (nudge), and the orange one sits further back.
    const k = Math.tan(tilt)
    const C0 = new THREE.Vector2(X(1065), Y(1879)), cen = B.clone().add(R).add(C0).multiplyScalar(1 / 3)
    const nudge = [new THREE.Vector2(-0.05, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0)]   // yellow: 50 toward -x; teal: back at its start (it was 50 up, then 50 down)
    const P = [B, R, C0].map((v, i) => { const q = v.clone().lerp(cen, 0.06).add(nudge[i]); return new THREE.Vector3(q.x, q.y, FRONT - k * Math.max(0, nrm.dot(q.clone().sub(B))) - (i === 2 ? 0.06 : 0)) })   // orange: 60 toward the back (+Y)
    const pn = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])).normalize(); if (pn.z < 0) pn.negate()
    const pa = -pn.x / pn.z, pb = -pn.y / pn.z, pc = P[0].z - pa * P[0].x - pb * P[0].y   // ramp height: z = pa * x + pb * y + pc
    B = new THREE.Vector2(P[0].x, P[0].y)                                  // the line where the ramp starts is now yellow to teal
    const ld = new THREE.Vector2(P[1].x - P[0].x, P[1].y - P[0].y).normalize()
    nrm = new THREE.Vector2(ld.y, -ld.x); if (nrm.dot(C0.clone().sub(B)) < 0) nrm.negate()
    const ev = new Evaluator(); ev.useGroups = false; ev.attributes = ['position', 'normal']
    // ── the ramp is made by bending the front skin, so the soft edges are truly smooth (no cuts, no steps) ──
    // SOFT: the crease between the flat face and the ramp is rounded over 2 * SOFT either side of the yellow-teal line.
    // RIM: where the ramp meets the curved side wall, the edge is rounded with a quarter circle of this radius.
    // The skin is first split into small triangles, then each point is pushed down by how far the ramp (plus the rounding) sits below the flat face.
    const SOFT = 0.05, RIM = 0.04, MAXEDGE = 0.014, REACH = 0.25
    const sd = -(pa * nrm.x + pb * nrm.y)                                  // ramp drop per unit of distance past the line
    const outline = shellShape(0).getPoints()                              // the plan outline of the front shell, for the rim
    const distToOutline = (x, y) => {
      let best = 1e9
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i], b = outline[(i + 1) % outline.length], ex = b.x - a.x, ey = b.y - a.y
        const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (y - a.y) * ey) / (ex * ex + ey * ey || 1)))
        const dx = x - a.x - ex * t, dy = y - a.y - ey * t, q = dx * dx + dy * dy
        if (q < best) best = q
      }
      return Math.sqrt(best)
    }
    const side0 = (x, y) => nrm.x * (x - B.x) + nrm.y * (y - B.y)          // distance past the yellow-teal line (+ = on the ramp side)
    const dropAt = (x, y) => {
      const d = side0(x, y)
      let f = d <= -SOFT ? 0 : d >= SOFT ? sd * d : sd * (d + SOFT) * (d + SOFT) / (4 * SOFT)
      const w = Math.max(0, Math.min(1, (d + 0.15) / 0.15)), ww = w * w * (3 - 2 * w)   // the rim rounding fades in as we reach the ramp
      if (ww > 0) { const e = distToOutline(x, y); if (e < RIM) f += ww * (RIM - Math.sqrt(RIM * RIM - (RIM - e) * (RIM - e))) }
      return f
    }
    const bendGeo = (geo) => {   // split a piece of the front skin into small triangles and push each point down into the ramp
      const src = geo.index ? geo.toNonIndexed() : geo, pos = src.attributes.position
      const tris = []
      for (let i = 0; i < pos.count; i += 3) tris.push([pos.getX(i), pos.getY(i), pos.getZ(i), pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1), pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)])
      const near = t => Math.max(side0(t[0], t[1]), side0(t[3], t[4]), side0(t[6], t[7])) > -REACH && Math.max(t[2], t[5], t[8]) > FRONT - 0.25
      const done = [], stack = tris.filter(t => { if (near(t)) return true; done.push(t); return false })
      const len2 = (t, i, j) => (t[i * 3] - t[j * 3]) ** 2 + (t[i * 3 + 1] - t[j * 3 + 1]) ** 2 + (t[i * 3 + 2] - t[j * 3 + 2]) ** 2
      while (stack.length) {
        const t = stack.pop()
        if (!near(t)) { done.push(t); continue }
        const l01 = len2(t, 0, 1), l12 = len2(t, 1, 2), l20 = len2(t, 2, 0), m = Math.max(l01, l12, l20)
        if (m <= MAXEDGE * MAXEDGE || done.length + stack.length > 400000) { done.push(t); continue }
        // split the longest edge in two
        const [a, b, c] = m === l01 ? [0, 1, 2] : m === l12 ? [1, 2, 0] : [2, 0, 1]
        const P3 = i => [t[i * 3], t[i * 3 + 1], t[i * 3 + 2]], A = P3(a), Bv = P3(b), Cv = P3(c), M = [(A[0] + Bv[0]) / 2, (A[1] + Bv[1]) / 2, (A[2] + Bv[2]) / 2]
        stack.push([...A, ...M, ...Cv], [...M, ...Bv, ...Cv])
      }
      const Z0 = SEAM_Z - 0.04, Z1 = FRONT - FRONT_B            // the wall is bent less the further down it goes, so it never folds over
      const out = new Float32Array(done.length * 9)
      done.forEach((t, ti) => {
        for (let v = 0; v < 3; v++) {
          const x = t[v * 3], y = t[v * 3 + 1], z = t[v * 3 + 2]
          const g = Math.max(0, Math.min(1, (z - Z0) / (Z1 - Z0)))
          out.set([x, y, g > 0 ? z - dropAt(x, y) * g : z], ti * 9 + v * 3)
        }
      })
      const dense = new THREE.BufferGeometry(); dense.setAttribute('position', new THREE.BufferAttribute(out, 3))
      return { dense, done, near }
    }
    const bendFront = () => {
      const { dense, done, near } = bendGeo(fg)
      fg = toCreasedNormals(dense, 0.7)
      // smooth shading only on the bent zone; everywhere else keep the original flat shading, so the big flat face stays flat
      const nrmA = fg.attributes.normal, pv = new THREE.Vector3(), qv = new THREE.Vector3(), fn = new THREE.Vector3()
      done.forEach((t, ti) => {
        if (near(t)) return
        pv.set(t[3] - t[0], t[4] - t[1], t[5] - t[2]); qv.set(t[6] - t[0], t[7] - t[1], t[8] - t[2]); fn.crossVectors(pv, qv).normalize()
        for (let v = 0; v < 3; v++) nrmA.setXYZ(ti * 3 + v, fn.x, fn.y, fn.z)
      })
    }


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
    const r = SPEAKER.width * 1.118 / 2
    SPEAKER.slots.forEach(([tx, ty, bx, by], i) => {
      const T = new THREE.Vector2(sx(tx), sy(ty)), E = new THREE.Vector2(sx(bx), sy(by))
      const pts = stadiumPts(T.x, T.y, E.x, E.y, r)
      // the groove is cut flat here; the whole skin is bent into the ramp afterwards, so it follows the ramp and the rounded edges exactly
      cutOut(prism(pts, FRONT - SPEAKER.depth, 0.27))
      if (i === 0) return
      // the slit hugs the slot's left wall
      const d = E.clone().sub(T).normalize(); let n = new THREE.Vector2(d.y, -d.x); if (n.x > 0) n.negate()
      const sw = SPEAKER.slit.width * r * 2, off = r - sw / 2
      const p0 = T.clone().lerp(E, SPEAKER.slit.from).addScaledVector(n, off), p1 = T.clone().lerp(E, SPEAKER.slit.to).addScaledVector(n, off)
      const slitPts = stadiumPts(p0.x, p0.y, p1.x, p1.y, sw / 2, 8)
      const sd = SPEAKER.slit.depth
      cutOut(prism(slitPts, FRONT - sd, sd + 0.05))
      const plugG = bendGeo(new THREE.ShapeGeometry(new THREE.Shape(slitPts)).translate(0, 0, FRONT - sd + 0.002)).dense; plugG.computeVertexNormals()
      slotFloors.push(new THREE.Mesh(plugG, M.dark))
    })
    // ── HOLES for the buttons, from the photo: each button is its own piece that pokes up through a hole of its own shape in part A ──
    // The hole is a little bigger than the button (GAP), cut right through part A; the dark floor of the gap is added below.
    {
      const KX = PW / 1049, KY = PH / 1800, wx = x => X(x * KX), wy = y => Y(y * KY), U = KX * S
      const GAPW = 0.004, HZ0 = SEAM_Z + 0.015                          // gap round each button; holes start at the parting line
      const holeMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2e, side: THREE.DoubleSide })
      const hole = (pts, di) => { dishHoles[di].push(pts); cutOut(prism(pts, HZ0, 0.4)); slotFloors.push(new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)).translate(0, 0, HZ0 + 0.001), holeMat)) }
      // ── DISHES behind the buttons, from the photo: carved with a soft, rounded rim (not a sharp step); the floor is part A's grey, a touch darker ──
      // round for the D-pad (big enough to hold the little arrows), one tilted band for A and B, a pill each for Select and Start
      const DISH_D = 0.006, DISH_W = 0.014                              // depth, and the width of the rounded rim
      const dAng = THREE.MathUtils.degToRad(23), dDx = Math.cos(dAng), dDy = Math.sin(dAng), dPh = 28 * U
      const dishDefs = [
        { ax: wx(222), ay: wy(1205), bx: wx(222), by: wy(1205), r: 148 * U },
        { ax: wx(735), ay: wy(1225), bx: wx(903), by: wy(1146), r: 88 * U },
        ...[[388, 1452], [561, 1449]].map(([c, d]) => ({ ax: wx(c) - dDx * dPh, ay: wy(d) - dDy * dPh, bx: wx(c) + dDx * dPh, by: wy(d) + dDy * dPh, r: 38 * U }))
      ]
      const dishMat = M.front.clone(); dishMat.side = THREE.DoubleSide; dishMat.color.multiplyScalar(0.86)
      dishDefs.forEach(d => {
        const pts = stadiumPts(d.ax, d.ay, d.bx, d.by, d.r, 32)
        // a bowl-shaped cutter: its bevel rounds the rim from the flat floor (radius r) up to the surface (radius r + DISH_W)
        cutOut(new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.3, curveSegments: 1, bevelEnabled: true, bevelThickness: DISH_D, bevelSize: DISH_W, bevelOffset: 0, bevelSegments: 8 }).translate(0, 0, FRONT))
      })
      const dishHoles = dishDefs.map(() => [])
      const gp = GAPW / U                                                // the gap in photo pixels
      const cross = [[180, 1076], [266, 1076], [266, 1163], [352, 1163], [352, 1247], [266, 1247], [266, 1332], [180, 1332], [180, 1247], [97, 1247], [97, 1163], [180, 1163]]
      const grown = [[-1, -1], [1, -1], [1, -1], [1, -1], [1, 1], [1, 1], [1, 1], [-1, 1], [-1, 1], [-1, 1], [-1, -1], [-1, -1]]   // push each corner outwards by the gap
      hole(cross.map(([x, y], i) => new THREE.Vector2(wx(x + grown[i][0] * gp), wy(y + grown[i][1] * gp))), 0)                       // D-pad
      hole(stadiumPts(wx(735), wy(1225), wx(735), wy(1225), 0.07 + GAPW, 32), 1); hole(stadiumPts(wx(903), wy(1146), wx(903), wy(1146), 0.07 + GAPW, 32), 1)   // B and A
      const ang = THREE.MathUtils.degToRad(23), dx = Math.cos(ang), dy = Math.sin(ang), pr = 42 * U / 2 + GAPW, ph2 = 125 * U / 2 - 42 * U / 2
      ;[[388, 1452], [561, 1449]].forEach(([cx, cy], i) => hole(stadiumPts(wx(cx) - dx * ph2, wy(cy) - dy * ph2, wx(cx) + dx * ph2, wy(cy) + dy * ph2, pr, 16), 2 + i))   // Select, Start
      dishDefs.forEach((d, i) => {      // the floor of each dish, with the button holes left open
        const sh = new THREE.Shape(stadiumPts(d.ax, d.ay, d.bx, d.by, d.r, 32)); dishHoles[i].forEach(h => sh.holes.push(new THREE.Path(h)))
        slotFloors.push(new THREE.Mesh(new THREE.ShapeGeometry(sh, 8).translate(0, 0, FRONT - DISH_D + 0.0015), dishMat))
      })
    }
    // ── TOP GROOVES, copied from the Front photo (not the ON/OFF cap yet) ──
    // one groove across the top of the front face, and one at each side that runs up from it, over the top edge and back along the top as far as the parting line.
    // Same width and depth as the groove round the middle (GW / GD).
    {
      const GW = 0.014, GD = 0.007                                   // 14 wide, 7 deep
      const TOPG = { y: 0.055, xs: [0.084, 0.92] }                   // y: down from the top, x: in from the left (fractions of the body)
      const yh = Y(34 + TOPG.y * 1924), topY = Y(34), z0 = FRONT - GD
      const box = (x0, x1, y0, y1, za, zb) => new THREE.BoxGeometry(x1 - x0, y1 - y0, zb - za).translate((x0 + x1) / 2, (y0 + y1) / 2, (za + zb) / 2)
      const dark = M.front.clone(); dark.side = THREE.DoubleSide; dark.color.multiplyScalar(0.82)     // the groove floors: part A's colour, a tiny bit darker
      const SZ = SEAM_Z + 0.015                                       // the parting line
      const floorZ = (x0, x1, y0, y1, z) => { slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0).translate((x0 + x1) / 2, (y0 + y1) / 2, z), dark)) }   // faces the front
      const floorY = (x0, x1, za, zb, y) => { slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, zb - za).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (za + zb) / 2), dark)) }   // faces up
      cutOut(box(-2, 2, yh - GW / 2, yh + GW / 2, z0, FRONT + 0.1))                              // across the face
      floorZ(X(24 + 24), X(1142 - 24), yh - GW / 2, yh + GW / 2, z0 + 0.0015)
      // ── OFF / ON switch, copied from the photo: a pill-shaped outline with arrows, OFF, a dot and ON inside; same depth, finer strokes ──
      {
        const PILL = { x0: 0.105, x1: 0.30, y0: 0.022, y1: 0.046 }   // fractions of the body, from the top left
        const ringW = 0.008, strokeW = 0.0035
        const px0 = X(24 + PILL.x0 * 1118), px1 = X(24 + PILL.x1 * 1118), py0 = Y(34 + PILL.y1 * 1924), py1 = Y(34 + PILL.y0 * 1924)   // py0 = bottom, py1 = top
        const pcx = (px0 + px1) / 2, pcy = (py0 + py1) / 2, pw = px1 - px0, ph = py1 - py0
        const stadium = (w, h) => { const r = h / 2, sh = new THREE.Shape()
          sh.moveTo(pcx - w / 2 + r, pcy - h / 2); sh.lineTo(pcx + w / 2 - r, pcy - h / 2); sh.absarc(pcx + w / 2 - r, pcy, r, -Math.PI / 2, Math.PI / 2, false)
          sh.lineTo(pcx - w / 2 + r, pcy + h / 2); sh.absarc(pcx - w / 2 + r, pcy, r, Math.PI / 2, Math.PI * 1.5, false); return sh }
        const ring = stadium(pw, ph); ring.holes.push(new THREE.Path(stadium(pw - 2 * ringW, ph - 2 * ringW).getPoints(24)))
        cutOut(new THREE.ExtrudeGeometry(ring, { depth: 0.1, curveSegments: 12, bevelEnabled: false }).translate(0, 0, z0))
        slotFloors.push(new THREE.Mesh(new THREE.ShapeGeometry(ring, 12).translate(0, 0, z0 + 0.0015), dark))
        // flat filled shapes (arrows, dot) and thin strokes (letters)
        const fill = pts => { const sh = new THREE.Shape(pts.map(q => new THREE.Vector2(q[0], q[1])))
          cutOut(new THREE.ExtrudeGeometry(sh, { depth: 0.1, curveSegments: 1, bevelEnabled: false }).translate(0, 0, z0))
          slotFloors.push(new THREE.Mesh(new THREE.ShapeGeometry(sh).translate(0, 0, z0 + 0.0015), dark)) }
        const stroke = (x1, y1, x2, y2) => { const len = Math.hypot(x2 - x1, y2 - y1) + strokeW, ang = Math.atan2(y2 - y1, x2 - x1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2
          cutOut(new THREE.BoxGeometry(len, strokeW, 0.1).rotateZ(ang).translate(mx, my, z0 + 0.05))
          slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(len, strokeW).rotateZ(ang).translate(mx, my, z0 + 0.0015), dark)) }
        const th = ph * 0.45, lw = th * 0.62, gap = lw * 0.45                     // letter height, width and spacing
        const glyph = { O: [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]], F: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.7, 0.5]], N: [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]] }
        const word = (str, x) => { for (const ch of str) { glyph[ch].forEach(([a, b, c, d]) => stroke(x + a * lw, pcy - th / 2 + b * th, x + c * lw, pcy - th / 2 + d * th)); x += lw + gap } return x - gap }
        const dotW = strokeW * 2.2, offW = 3 * lw + 2 * gap, onW = 2 * lw + gap, space = gap * 1.6
        const total = offW + space + dotW + space + onW
        let cx = pcx - total / 2
        word('OFF', cx); cx += offW + space
        fill([[cx, pcy - dotW / 2], [cx + dotW, pcy - dotW / 2], [cx + dotW, pcy + dotW / 2], [cx, pcy + dotW / 2]]); cx += dotW + space
        word('ON', cx)
        const aw = th * 0.7, ah = th * 0.55, ax = pw / 2 - ringW - th * 0.5                     // arrows at each end: left points left, right points right
        fill([[pcx - ax - aw, pcy], [pcx - ax, pcy + ah], [pcx - ax, pcy - ah]])
        fill([[pcx + ax + aw, pcy], [pcx + ax, pcy - ah], [pcx + ax, pcy + ah]])
        // three thin grip grooves above the left end of the switch, running up over the top edge and all the way back along the top to the parting line
        const zA2 = SZ + 0.004
        ;[0.133, 0.160, 0.187].forEach(f => {
          const gx = X(24 + f * 1118), gw = 0.006, ga = gx - gw / 2, gb2 = gx + gw / 2
          cutOut(new THREE.BoxGeometry(gb2 - ga, topY + 0.1 - py1, 0.1).translate(gx, (py1 + topY + 0.1) / 2, z0 + 0.05))                 // up the face from the switch
          cutOut(new THREE.BoxGeometry(gb2 - ga, GD + 0.1, FRONT + 0.1 - zA2).translate(gx, topY - GD + (GD + 0.1) / 2, (zA2 + FRONT + 0.1) / 2))   // over the top, back to the parting line
          slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(gw, topY - 0.022 - py1).translate(gx, (py1 + topY - 0.022) / 2, z0 + 0.0015), dark))
          slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(gw, z0 - zA2).rotateX(-Math.PI / 2).translate(gx, topY - GD + 0.0015, (zA2 + z0) / 2), dark))
        })
      }
      // the top groove carries on over both sides, from the front face back to the parting line
      const XL = X(24), XR = X(1142), zA = SZ + 0.004
      cutOut(box(XL - 0.1, XL + GD, yh - GW / 2, yh + GW / 2, zA, FRONT + 0.1))
      cutOut(box(XR - GD, XR + 0.1, yh - GW / 2, yh + GW / 2, zA, FRONT + 0.1))
      const floorX = (x, y0, y1, za, zb, dir) => { slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(zb - za, y1 - y0).rotateY(dir * Math.PI / 2).translate(x, (y0 + y1) / 2, (za + zb) / 2), dark)) }
      floorX(XL + GD - 0.0015, yh - GW / 2, yh + GW / 2, zA, z0, -1)
      floorX(XR - GD + 0.0015, yh - GW / 2, yh + GW / 2, zA, z0, 1)
      TOPG.xs.forEach(f => {
        const xc = X(24 + f * 1118), xa = xc - GW / 2, xb = xc + GW / 2
        cutOut(box(xa, xb, yh, topY + 0.1, z0, FRONT + 0.1))                                      // up the face to the top edge
        cutOut(box(xa, xb, topY - GD, topY + 0.1, SZ + 0.004, FRONT + 0.1))                  // over the top and back along it
        floorZ(xa, xb, yh + GW / 2, topY - 0.022, z0 + 0.0015)
        floorY(xa, xb, SZ + 0.004, z0, topY - GD + 0.0015)
      })
    }
    // ── PHONES, from the photos: a pill outline with the word PHONES carved in it, three lines running down from it over the bottom edge, and the headphone socket ──
    {
      const KX = PW / 1049, KY = PH / 1800, U = KX * S, wx = x => X(x * KX), wy = y => Y(y * KY)
      const GD = 0.007, z0 = FRONT - GD, botY = Y(1958), SZb = SEAM_Z + 0.015
      const dark = M.front.clone(); dark.side = THREE.DoubleSide; dark.color.multiplyScalar(0.82)      // groove floors: part A's grey, a touch darker
      const box = (x0, x1, y0, y1, za, zb) => new THREE.BoxGeometry(x1 - x0, y1 - y0, zb - za).translate((x0 + x1) / 2, (y0 + y1) / 2, (za + zb) / 2)
      const flat = (x0, x1, y0, y1, z) => slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0).translate((x0 + x1) / 2, (y0 + y1) / 2, z), dark))
      // the pill and the word
      const pcx = wx(472), pcy = wy(1700), pw = 160 * U, ph = 54 * U, ringW = 0.008, strokeW = 0.0035
      const stadium = (w, h) => { const r = h / 2, sh = new THREE.Shape()
        sh.moveTo(pcx - w / 2 + r, pcy - h / 2); sh.lineTo(pcx + w / 2 - r, pcy - h / 2); sh.absarc(pcx + w / 2 - r, pcy, r, -Math.PI / 2, Math.PI / 2, false)
        sh.lineTo(pcx - w / 2 + r, pcy + h / 2); sh.absarc(pcx - w / 2 + r, pcy, r, Math.PI / 2, Math.PI * 1.5, false); return sh }
      const ring = stadium(pw, ph); ring.holes.push(new THREE.Path(stadium(pw - 2 * ringW, ph - 2 * ringW).getPoints(24)))
      cutOut(new THREE.ExtrudeGeometry(ring, { depth: 0.1, curveSegments: 12, bevelEnabled: false }).translate(0, 0, z0))
      slotFloors.push(new THREE.Mesh(new THREE.ShapeGeometry(ring, 12).translate(0, 0, z0 + 0.0015), dark))
      const stroke = (x1, y1, x2, y2) => { const len = Math.hypot(x2 - x1, y2 - y1) + strokeW, ang = Math.atan2(y2 - y1, x2 - x1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        cutOut(new THREE.BoxGeometry(len, strokeW, 0.1).rotateZ(ang).translate(mx, my, z0 + 0.05))
        slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(len, strokeW).rotateZ(ang).translate(mx, my, z0 + 0.0015), dark)) }
      const th = ph * 0.42, lw = th * 0.62, gap = lw * 0.4
      // letters as strokes in a unit box; the round ones (P, O, S) are built from short arcs so they read like the moulded type
      const arc = (cx, cy, rx, ry, a0, a1, n = 10) => { const out = []; for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n
        out.push([cx + Math.cos(t0) * rx, cy + Math.sin(t0) * ry, cx + Math.cos(t1) * rx, cy + Math.sin(t1) * ry]) } return out }
      const D = Math.PI / 180
      const glyph = {
        P: [[0, 0, 0, 1], [0, 1, 0.5, 1], ...arc(0.5, 0.75, 0.5, 0.25, 90 * D, -90 * D, 8), [0.5, 0.5, 0, 0.5]],
        H: [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]],
        O: arc(0.5, 0.5, 0.52, 0.5, 0, 360 * D, 18),
        N: [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]],
        E: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.75, 0.5], [0, 0, 1, 0]],
        S: [...arc(0.5, 0.75, 0.5, 0.25, 25 * D, 270 * D, 10), ...arc(0.5, 0.25, 0.5, 0.25, 90 * D, -155 * D, 10)]
      }
      const word = 'PHONES', total = word.length * lw + (word.length - 1) * gap; let lx = pcx - total / 2 + ph * 0.3   // nudged right to leave room for the headphone mark
      const wordX0 = lx
      for (const ch of word) { glyph[ch].forEach(([a, b, c, d]) => stroke(lx + a * lw, pcy - th / 2 + b * th, lx + c * lw, pcy - th / 2 + d * th)); lx += lw + gap }
      // the headphone mark before the word: a headband arc over two small ear cups
      {
        const r = th * 0.5, icx = wordX0 - gap * 1.6 - r, icy = pcy - th * 0.1
        arc(icx, icy, r, r * 1.05, 0, Math.PI, 10).forEach(([a, b, c, d]) => stroke(a, b, c, d))
        ;[-1, 1].forEach(sd => { const x0 = icx + sd * r - strokeW * 1.1, x1 = icx + sd * r + strokeW * 1.1, y0 = pcy - th / 2, y1 = icy + strokeW
          cutOut(box(x0, x1, y0, y1, z0, FRONT + 0.1)); flat(x0, x1, y0, y1, z0 + 0.0015) })
      }
      // three lines down from the pill, over the bottom edge, and along the bottom face as far as the socket
      const gw = 0.006, xs = [451, 497 - 0, 543].map(v => v), lineXs = [0.0, 0.021, 0.042].map(o => wx(472) + o * 1 - 0.0)
      const sockX = wx(497), sockR = 0.034, sockZ = SZb + sockR + 0.006   // the jack sits right at the parting line, so its opening is an arch in part A's bottom edge
      const pillBottom = pcy - ph / 2
      lineXs.forEach(cx0 => { const cx = cx0 + 0.0, xa = cx - gw / 2, xb = cx + gw / 2
        cutOut(box(xa, xb, botY - 0.1, pillBottom, z0, FRONT + 0.1))                                                      // down the face
        cutOut(box(xa, xb, botY - 0.1, botY + GD, sockZ + sockR + 0.012, FRONT + 0.1))                                  // along the bottom face
        // the two floors meet at the inner corner of the cut (z0 on the face, botY + GD underneath), so nothing sticks out past the rounded edge
        const zEnd = sockZ + sockR + 0.012
        flat(xa, xb, botY + GD, pillBottom, z0 + 0.0015)
        slotFloors.push(new THREE.Mesh(new THREE.PlaneGeometry(gw, z0 - zEnd).rotateX(Math.PI / 2).translate(cx, botY + GD - 0.0015, (z0 + zEnd) / 2), dark)) })
      // the headphone socket, from the photo: an arch-shaped opening in part A's bottom edge, open down to the parting line,
      // with the round black jack standing in it (a barrel with a darker hole and a soft rim)
      const SD = 0.05                                                                         // how far up into the body the opening goes
      cutOut(new THREE.CylinderGeometry(sockR, sockR, SD * 2, 40).translate(sockX, botY, sockZ))
      cutOut(box(sockX - sockR, sockX + sockR, botY - SD, botY + SD, SZb - 0.001, sockZ))   // the straight sides down to the parting line
      const black = new THREE.MeshBasicMaterial({ color: 0x0c0c0e, side: THREE.DoubleSide })
      const archTop = new THREE.Shape(); archTop.moveTo(sockX - sockR, SZb); archTop.lineTo(sockX + sockR, SZb); archTop.absarc(sockX, sockZ, sockR, 0, Math.PI, false); archTop.closePath()
      slotFloors.push(new THREE.Mesh(new THREE.ShapeGeometry(archTop, 20).rotateX(Math.PI / 2).translate(0, botY + SD - 0.001, 0), black))   // the ceiling of the opening
      const jackMat = new THREE.MeshStandardMaterial({ color: 0x1e1e21, roughness: 0.45 })
      const JR = sockR * 0.86, jy0 = botY + 0.006                                             // the barrel's face sits just inside the opening
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, SD - 0.006, 40).translate(sockX, jy0 + (SD - 0.006) / 2, sockZ), jackMat); slotFloors.push(barrel)
      const rim = new THREE.Mesh(new THREE.RingGeometry(JR * 0.55, JR * 0.98, 40).rotateX(Math.PI / 2).translate(sockX, jy0 - 0.0004, sockZ), new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.35, side: THREE.DoubleSide })); slotFloors.push(rim)
      const hole = new THREE.Mesh(new THREE.CircleGeometry(JR * 0.55, 32).rotateX(Math.PI / 2).translate(sockX, jy0 - 0.0002, sockZ), new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide })); slotFloors.push(hole)
    }
    bendFront()
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
  // ── SPLIT: the body is cut along the parting line (z = SPLIT_Z) into part A (front) and part B (back), then moved slightly apart ──
  const SPLIT_Z = SEAM_Z + 0.015   // where the body is cut
  const SPLIT_GAP = 0           // how far apart the two cut faces end up (40)
  const splitEv = new Evaluator(); splitEv.useGroups = false; splitEv.attributes = ['position', 'normal']
  const slice = (z0, z1) => splitEv.evaluate(new Brush(fg), new Brush(new THREE.BoxGeometry(4, 4, z1 - z0).translate(0, 0, (z0 + z1) / 2)), INTERSECTION).geometry
  // A small groove runs right round the sides, top and bottom at the middle (the parting line): LINE_W wide in total, LINE_D deep.
  const LINE_W = 0.014, LINE_D = 7   // total width (z units) and depth (photo pixels) of the groove
  const grooveRing = (z0, z1) => {   // a ring around the outline, from z0 to z1, reaching LINE_D px into the body
    const ring = new THREE.Shape(shellShape(-3).getPoints()); ring.holes.push(new THREE.Path(shellShape(LINE_D).getPoints()))
    return new THREE.ExtrudeGeometry(ring, { depth: z1 - z0, curveSegments: 1, bevelEnabled: false }).translate(0, 0, z0)
  }
  const cutRing = (geo, ringG) => splitEv.evaluate(new Brush(geo), new Brush(ringG), SUBTRACTION).geometry
  const frontShell = new THREE.Mesh(cutRing(slice(SPLIT_Z, FRONT + 0.5), grooveRing(SPLIT_Z - 0.01, SPLIT_Z + LINE_W / 2)), M.front)            // part A: everything in front of the line
  const rimSlab = new THREE.Mesh(cutRing(slice(SEAM_Z, SPLIT_Z), grooveRing(SPLIT_Z - LINE_W / 2, SPLIT_Z + 0.01)), M.body)   // the thin strip of the front shell that sits on the back half: part B

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
  const partA = new THREE.Group(), partB = new THREE.Group()   // A: front, B: back
  partA.position.z = SPLIT_GAP / 2; partB.position.z = -SPLIT_GAP / 2
  gb.add(partA, partB)
  partA.add(frontShell, ...slotFloors)
  partB.add(backShell, rimSlab)

  // ── GRIP GROOVES on part B only: horizontal grooves that run from the L side, across the back, and round to the R side ──
  // From the back photo. y is a fraction of the body from the top. Each groove follows the back shell's profile (straight side wall,
  // then the round-over, then the flat back) at a constant depth, so it reads as properly carved all the way round.
  const GRIP = { count: 13, top: 0.525, bottom: 0.85, width: 0.022, depth: 0.013 }
  const gripY = i => 0.966 - (GRIP.top + (GRIP.bottom - GRIP.top) * i / (GRIP.count - 1)) * 1.924
  {
    // the profile of the back shell in a horizontal slice (x, z): L side down the round-over, across the back, up the R side
    const prof = []
    const zStart = SPLIT_Z - LINE_W / 2 - 0.002                                           // stop just short of the parting-line groove
    prof.push(new THREE.Vector2(X(24), zStart))
    layers.forEach(l => prof.push(new THREE.Vector2(X(24 + l.d), l.z)))
    ;[...layers].reverse().forEach(l => prof.push(new THREE.Vector2(X(1142 - l.d), l.z)))
    prof.push(new THREE.Vector2(X(1142), zStart))
    const uniq = prof.filter((p, i) => i === 0 || p.distanceTo(prof[i - 1]) > 1e-6)
    const cen = new THREE.Vector2(0, -0.1)
    const norms = uniq.map((p, i) => {                                                     // outward normal at each point
      const a = uniq[Math.max(0, i - 1)], b = uniq[Math.min(uniq.length - 1, i + 1)]
      const n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize()
      return n.dot(p.clone().sub(cen)) < 0 ? n.negate() : n
    })
    // a ribbon: from well outside the surface to GRIP.depth inside it. Shape plane is (x, -z); it is extruded along y.
    const outer = uniq.map((p, i) => p.clone().addScaledVector(norms[i], 0.05))
    const inner = uniq.map((p, i) => p.clone().addScaledVector(norms[i], -GRIP.depth))
    const ribbon = new THREE.Shape([...outer, ...inner.reverse()].map(p => new THREE.Vector2(p.x, -p.y)))
    const cutter = y => new THREE.ExtrudeGeometry(ribbon, { depth: GRIP.width, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2).translate(0, y - GRIP.width / 2, 0)
    const gev = new Evaluator(); gev.useGroups = false; gev.attributes = ['position', 'normal']
    let sg = backShell.geometry, rg = rimSlab.geometry
    for (let i = 0; i < GRIP.count; i++) {
      const c = cutter(gripY(i)); c.deleteAttribute('uv')
      sg = gev.evaluate(new Brush(sg), new Brush(c), SUBTRACTION).geometry
      rg = gev.evaluate(new Brush(rg), new Brush(c), SUBTRACTION).geometry
    }
    backShell.geometry = sg; rimSlab.geometry = rg
    // the groove floors on the flat side walls get a slightly darker strip, so the grooves read from the side like in the photo
    const floorMat = mat(0x9c9073)
    for (let i = 0; i < GRIP.count; i++) for (const side of [-1, 1]) {
      const zh = zStart + WALL, strip = new THREE.Mesh(new THREE.PlaneGeometry(zh, GRIP.width * 0.9).rotateY(side * Math.PI / 2), floorMat)
      strip.position.set(side * (0.559 - GRIP.depth + 0.0006), gripY(i), (zStart - WALL) / 2); partB.add(strip)
    }
  }

  // the floor of the groove: a darker beige, close to part B's colour
  {
    const pts = shellShape(LINE_D + 0.3).getPoints(), n = pts.length, pos = [], idx = [], zl = SPLIT_Z - LINE_W / 2, zh = SPLIT_Z + LINE_W / 2
    pts.forEach(p => pos.push(p.x, p.y, zl, p.x, p.y, zh))
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    gb.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x857a5e, side: THREE.DoubleSide })))   // part B's beige, darker because it is deeper; unlit, so it always shows
  }

  // ── SLIDING SWITCH on part B (see the top-edge photo): a grey pocket on the top edge just behind the parting line, with a lighter knob in it,
  // under the three grip grooves. x is a fraction of the body from the left; z runs back from the parting line.
  // From the photo: the pocket is a real slot cut down into the top wall, lined with lilac-grey plastic a little below the rim;
  // the knob is a light grey rounded block standing in it. Knob at the left end = OFF, slid right = ON (as the ◁OFF·ON▷ print says).
  const powerSwitch = {}   // { knob, offX, onX }: the playable screen at the end slides it and turns the game on and off
  {
    const topY = Y(34), SW = { x0: 0.100, x1: 0.222, kx0: 0.105, kx1: 0.161, z0: 0.006, z1: 0.066, kz0: 0.014, kz1: 0.058, depth: 0.014, liner: 0.006, rise: 0.007 }
    const xa = X(24 + SW.x0 * 1118), xb = X(24 + SW.x1 * 1118), ka = X(24 + SW.kx0 * 1118), kb = X(24 + SW.kx1 * 1118)
    const za = SPLIT_Z - SW.z1, zb = SPLIT_Z - SW.z0
    const pev = new Evaluator(); pev.useGroups = false; pev.attributes = ['position', 'normal']
    const cutter = new THREE.BoxGeometry(xb - xa, SW.depth + 0.1, zb - za).translate((xa + xb) / 2, topY - SW.depth + (SW.depth + 0.1) / 2, (za + zb) / 2)
    backShell.geometry = pev.evaluate(new Brush(backShell.geometry), new Brush(cutter), SUBTRACTION).geometry
    rimSlab.geometry = pev.evaluate(new Brush(rimSlab.geometry), new Brush(cutter), SUBTRACTION).geometry
    // the lilac-grey liner fills the slot up to SW.liner below the rim, so the beige walls show above it
    const lin = new THREE.Mesh(new THREE.BoxGeometry(xb - xa - 0.001, SW.depth - SW.liner, zb - za - 0.001), mat(0x8c8895))
    lin.position.set((xa + xb) / 2, topY - SW.depth + (SW.depth - SW.liner) / 2, (za + zb) / 2); partB.add(lin)
    // the knob: a rounded block (rounded in plan, soft bevelled top), from the liner up to SW.rise above the top edge
    const kw = kb - ka, kd = (SW.kz1 - SW.kz0), kr = 0.006, bev = 0.0025
    const plan = new THREE.Shape(), hw = kw / 2 - bev, hd = kd / 2 - bev, r = Math.min(kr, hw, hd)
    plan.moveTo(-hw + r, -hd); plan.lineTo(hw - r, -hd); plan.quadraticCurveTo(hw, -hd, hw, -hd + r); plan.lineTo(hw, hd - r); plan.quadraticCurveTo(hw, hd, hw - r, hd)
    plan.lineTo(-hw + r, hd); plan.quadraticCurveTo(-hw, hd, -hw, hd - r); plan.lineTo(-hw, -hd + r); plan.quadraticCurveTo(-hw, -hd, -hw + r, -hd)
    const kh = SW.liner + SW.rise
    const kg = new THREE.ExtrudeGeometry(plan, { depth: kh - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 }).rotateX(-Math.PI / 2)
    kg.translate(0, bev, 0)                                                         // its bottom sits at y = 0
    const knob = new THREE.Mesh(kg, mat(0xb4b2bb)); knob.name = 'powerKnob'
    const offX = (ka + kb) / 2, onX = xb - 0.003 - kw / 2
    knob.position.set(onX, topY - SW.liner, SPLIT_Z - (SW.kz0 + SW.kz1) / 2); partB.add(knob)
    // bigger, invisible click targets: a block round the whole slot (top edge and a little down the sides),
    // and the ◁OFF·ON▷ print on the front, so the switch is easy to hit from either side
    const hitMat = new THREE.MeshBasicMaterial({ visible: false })
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(xb - xa + 0.06, 0.07, zb - za + 0.06), hitMat)
    hitBox.position.set((xa + xb) / 2, topY + 0.005, (za + zb) / 2); partB.add(hitBox)
    const lx0 = X(24 + 0.095 * 1118), lx1 = X(24 + 0.31 * 1118), ly0 = Y(34 + 0.052 * 1924), ly1 = Y(34 + 0.012 * 1924)
    const hitLabel = new THREE.Mesh(new THREE.BoxGeometry(lx1 - lx0, ly1 - ly0, 0.03), hitMat)
    hitLabel.position.set((lx0 + lx1) / 2, (ly0 + ly1) / 2, FRONT); partB.add(hitLabel)
    Object.assign(powerSwitch, { knob, offX, onX, hits: [hitBox, hitLabel] })
  }

  const abMeshes = {}, screenRect = {}   // filled in by FRONT ART, used by the playable screen at the end
  const WELL = 0.014                     // how far the LCD sits below the front face, under the acrylic window
  // ── FRONT ART on part A, from the Front photo: screen and bezel, D-pad, A and B, Select and Start, and the printed text ──
  // Everything sits on top of the front face (nothing in the body is changed). Photo coordinates are 1049 x 1800; K converts them to the model's pixel space.
  {
    const KX = PW / 1049, KY = PH / 1800
    const wx = x => X(x * KX), wy = y => Y(y * KY)
    const v2 = (x, y) => new THREE.Vector2(wx(x), wy(y))
    try { await Promise.all([document.fonts.load('700 40px "Funnel Display"'), document.fonts.load('400 40px "Funnel Display"')]) } catch (e) { /* the fallback font is fine */ }
    const FONT = '"Funnel Display", "Helvetica Neue", Arial, sans-serif'

    // the bezel: a grey plate with the big round corner at the bottom right
    const bezel = new THREE.Shape(), bx0 = 88, bx1 = 960, by0 = 178, by1 = 845, r = 26, R = 118
    bezel.moveTo(wx(bx0 + r), wy(by0)); bezel.lineTo(wx(bx1 - r), wy(by0)); bezel.quadraticCurveTo(wx(bx1), wy(by0), wx(bx1), wy(by0 + r))
    bezel.lineTo(wx(bx1), wy(by1 - R)); bezel.quadraticCurveTo(wx(bx1), wy(by1), wx(bx1 - R), wy(by1))
    bezel.lineTo(wx(bx0 + r), wy(by1)); bezel.quadraticCurveTo(wx(bx0), wy(by1), wx(bx0), wy(by1 - r))
    bezel.lineTo(wx(bx0), wy(by0 + r)); bezel.quadraticCurveTo(wx(bx0), wy(by0), wx(bx0 + r), wy(by0))
    // the screen window: the LCD sits WELL below the front face, so the bezel and shell are cut through there
    const sx0 = wx(248), sx1 = wx(802), sy0 = wy(765), sy1 = wy(255)
    bezel.holes.push(new THREE.Path([new THREE.Vector2(sx0, sy0), new THREE.Vector2(sx0, sy1), new THREE.Vector2(sx1, sy1), new THREE.Vector2(sx1, sy0)]))
    const bezelMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(bezel, { depth: 0.005, curveSegments: 16, bevelEnabled: false }), mat(0x7f7c88))
    bezelMesh.position.z = FRONT; bezelMesh.castShadow = true; partA.add(bezelMesh)
    {
      const wev = new Evaluator(); wev.useGroups = false; wev.attributes = ['position', 'normal']
      frontShell.geometry = wev.evaluate(new Brush(frontShell.geometry), new Brush(new THREE.BoxGeometry(sx1 - sx0, sy1 - sy0, WELL + 0.1).translate((sx0 + sx1) / 2, (sy0 + sy1) / 2, FRONT - WELL + (WELL + 0.1) / 2)), SUBTRACTION).geometry
      frontShell.castShadow = true
      // the well's walls: the bezel's grey, going down to the LCD
      const wallMat = mat(0x5f5e68, { side: THREE.DoubleSide }), h = WELL + 0.005, zc = FRONT - WELL + h / 2
      const wall = (w, rx, ry, rz, x, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.rotation.set(rx, ry, rz, 'YXZ'); m.position.set(x, y, zc); m.castShadow = true; partA.add(m) }
      const e = 0.0006   // a hair inside the cut faces, so the two never flicker against each other
      wall(sx1 - sx0, Math.PI / 2, 0, 0, (sx0 + sx1) / 2, sy1 - e); wall(sx1 - sx0, Math.PI / 2, 0, 0, (sx0 + sx1) / 2, sy0 + e)           // top and bottom: lie along x, stand along z
      wall(sy1 - sy0, 0, Math.PI / 2, Math.PI / 2, sx0 + e, (sy0 + sy1) / 2); wall(sy1 - sy0, 0, Math.PI / 2, Math.PI / 2, sx1 - e, (sy0 + sy1) / 2)   // left and right: lie along y
    }

    // D-pad (a cross), A and B (round), Select and Start (tilted pills): small raised parts
    const BASE = SPLIT_Z + 0.004                                          // the buttons start just above the parting line and poke up through their holes
    const raised = (shape, color, h, x = 0, y = 0, rot = 0) => {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: FRONT + h - BASE, curveSegments: 12, bevelEnabled: true, bevelSize: 0.0025, bevelThickness: 0.003, bevelSegments: 2 }), mat(color))
      m.position.set(x, y, BASE); m.rotation.z = rot; partA.add(m); return m
    }
    // ── the buttons, reshaped from the Front photo: soft moulded plastic, nothing sharp ──
    const bev = new Evaluator(); bev.useGroups = false; bev.attributes = ['position', 'normal']
    const plastic = (c, rough = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 })
    // round off every corner of a polygon (convex and concave alike) with radius r
    const filleted = (pts, r) => { const sh = new THREE.Shape(), n = pts.length
      pts.forEach((p, i) => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n]
        const da = a.clone().sub(p).normalize().multiplyScalar(r), db = b.clone().sub(p).normalize().multiplyScalar(r)
        const p0 = p.clone().add(da), p1 = p.clone().add(db)
        i === 0 ? sh.moveTo(p0.x, p0.y) : sh.lineTo(p0.x, p0.y); sh.quadraticCurveTo(p.x, p.y, p1.x, p1.y) })
      sh.closePath(); return sh }
    // D-pad: a dark grey cross with rounded corners and a soft bevelled top, a shallow round dimple in the middle,
    // and three fine ridges across the end of each arm
    {
      const DB = 0.004, DH = 0.012                                       // bevel, and how far it stands above the face
      const inset = DB / (KX * S)                                       // the bevel grows the outline, so start that much smaller (photo px)
      const cross = [[180, 1076], [266, 1076], [266, 1163], [352, 1163], [352, 1247], [266, 1247], [266, 1332], [180, 1332], [180, 1247], [97, 1247], [97, 1163], [180, 1163]]
      const inward = [[1, 1], [-1, 1], [-1, 1], [-1, 1], [-1, -1], [-1, -1], [-1, -1], [1, -1], [1, -1], [1, -1], [1, 1], [1, 1]]
      const pts = cross.map(([x, y], i) => v2(x + inward[i][0] * inset, y + inward[i][1] * inset))
      const depth = FRONT + DH - BASE - 2 * DB
      let g = new THREE.ExtrudeGeometry(filleted(pts, 0.012), { depth, curveSegments: 6, bevelEnabled: true, bevelSize: DB, bevelThickness: DB, bevelSegments: 4 }).translate(0, 0, BASE + DB)
      g.deleteAttribute('uv')
      const topZ = BASE + depth + 2 * DB, ccx = wx(223), ccy = wy(1205)
      const SR = 0.08, SD = 0.0045                                      // the dimple: part of a big sphere, SD deep
      g = bev.evaluate(new Brush(g), new Brush(new THREE.SphereGeometry(SR, 40, 20).translate(ccx, ccy, topZ + SR - SD)), SUBTRACTION).geometry
      const arm = 86 * KX * S, half = 43 * KX * S                       // arm length and half width
      ;[[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([ux, uy]) => [0.55, 0.68, 0.81].forEach(t => {
        const d = half + arm * t, w = half * 1.3, rid = new THREE.BoxGeometry(ux ? 0.0028 : w, ux ? w : 0.0028, 0.004)
        g = bev.evaluate(new Brush(g), new Brush(rid.translate(ccx + ux * d, ccy + uy * d, topZ)), SUBTRACTION).geometry
      }))
      g.computeVertexNormals(); g.translate(-ccx, -ccy, 0)               // pivot at its centre, so it can rock toward the arm you press
      const dpad = new THREE.Mesh(g, plastic(0x47474d, 0.6)); dpad.position.set(ccx, ccy, 0); partA.add(dpad); abMeshes.dpad = dpad
    }
    // A and B: magenta, a gently domed top that rolls over a rounded edge into the straight side
    const disc = (cx, cy) => {
      const R = 0.066, zTop = FRONT + 0.02, zEdge = FRONT + 0.0165, rr = 0.007, prof = []
      prof.push(new THREE.Vector2(0.0001, BASE))
      prof.push(new THREE.Vector2(R, BASE))
      prof.push(new THREE.Vector2(R, zEdge - rr))
      for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; prof.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, zEdge - rr + Math.sin(a) * rr)) }   // the rounded edge
      for (let i = 1; i <= 10; i++) { const t = i / 10, r = (R - rr) * (1 - t); prof.push(new THREE.Vector2(Math.max(r, 0.0001), zEdge + (zTop - zEdge) * (1 - (r / (R - rr)) ** 2))) }   // the dome
      const geo = new THREE.LatheGeometry(prof, 48).rotateX(Math.PI / 2)
      const m = new THREE.Mesh(geo, plastic(0xa3305a, 0.42)); m.position.set(wx(cx), wy(cy), 0); partA.add(m); return m
    }
    // Select and Start: grey pills, rounded right over like a capsule
    const pillShape = (len, wid) => { const sh = new THREE.Shape(), hl = len / 2 - wid / 2, hw = wid / 2
      sh.moveTo(-hl, -hw); sh.lineTo(hl, -hw); sh.absarc(hl, 0, hw, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-hl, hw); sh.absarc(-hl, 0, hw, Math.PI / 2, Math.PI * 1.5, false); return sh }
    const pill = (cx, cy) => {
      const len = 125 * KX * S, wid = 42 * KY * S, PB = wid * 0.32, PH = 0.008
      const g = new THREE.ExtrudeGeometry(pillShape(len - 2 * PB, wid - 2 * PB), { depth: FRONT + PH - BASE - 2 * PB * 0.7, curveSegments: 16, bevelEnabled: true, bevelSize: PB, bevelThickness: PB * 0.7, bevelSegments: 6 })
      const m = new THREE.Mesh(g, plastic(0x8e8d99, 0.5)); m.position.set(wx(cx), wy(cy), BASE + PB * 0.7); m.rotation.z = THREE.MathUtils.degToRad(23); partA.add(m); return m
    }
    abMeshes.select = pill(388, 1452); abMeshes.start = pill(561, 1449)  // Select, Start
    abMeshes.b = disc(735, 1225); abMeshes.a = disc(903, 1146)       // B, A
    { // the power light by BATTERY: dark when off, red when on (the playable screen switches it)
      const led = new THREE.Mesh(new THREE.CircleGeometry(10 * KX * S, 24), new THREE.MeshBasicMaterial({ color: 0x3a2b27 }))
      led.position.set(wx(152), wy(432), FRONT + 0.0064); partA.add(led); abMeshes.led = led }
    Object.assign(screenRect, { x0: wx(248), x1: wx(802), y0: wy(255), y1: wy(765) })

    // everything printed goes on one transparent sheet just above the front face
    const CS = 1.5, cv = document.createElement('canvas'); cv.width = Math.round(PW * CS); cv.height = Math.round(PH * CS)
    const g = cv.getContext('2d'), cx = x => x * KX * CS, cy = y => y * KY * CS, px = n => n * KY * CS
    // screen
    // (the screen itself is a real sunken LCD now, see the playable screen at the end)
    // stripes
    const line = (x0, x1, y, c) => { g.fillStyle = c; g.fillRect(cx(x0), cy(y) - px(3), cx(x1) - cx(x0), px(6)) }
    line(127, 357, 207, '#b03470'); line(127, 357, 226, '#3b3190'); line(824, 922, 207, '#b03470'); line(824, 922, 226, '#3b3190')
    // text, stretched to fit a width: fit(text, x from, x to, baseline y, text height, weight, colour, style)
    const fit = (t, x0, x1, y, h, wgt, col, style = '') => { g.save(); g.font = `${style} ${wgt} ${px(h)}px ${FONT}`.trim(); g.fillStyle = col; g.textBaseline = 'alphabetic'
      const w = g.measureText(t).width || 1; g.translate(cx(x0), cy(y)); g.scale((cx(x1) - cx(x0)) / w, 1); g.fillText(t, 0, 0); g.restore() }
    fit('DOT MATRIX WITH STEREO SOUND', 375, 805, 222, 24, 400, '#d9d7e4')
    g.fillStyle = '#3a2b27'; g.beginPath(); g.arc(cx(152), cy(432), px(10), 0, Math.PI * 2); g.fill()
    fit('BATTERY', 122, 219, 490, 22, 400, '#d4d2dd')
    // the name: "Drinworks GAME BOY TM"
    fit('Drinworks', 82, 312, 918, 40, 700, '#2f2a88')
    fit('GAME BOY', 322, 640, 918, 62, 700, '#2f2a88', 'italic')
    fit('TM', 641, 679, 905, 18, 700, '#2f2a88')
    // A and B, SELECT and START
    fit('B', 765, 797, 1342, 36, 700, '#3a3490'); fit('A', 934, 968, 1262, 36, 700, '#3a3490')
    const tilted = (t, x, y, w) => { g.save(); g.translate(cx(x), cy(y)); g.rotate(-THREE.MathUtils.degToRad(23)); g.font = `700 ${px(30)}px ${FONT}`; g.fillStyle = '#3a3490'; g.textAlign = 'center'
      const tw = g.measureText(t).width || 1; g.scale((w * KX * CS) / tw, 1); g.fillText(t, 0, 0); g.restore() }
    tilted('SELECT', 401, 1518, 125); tilted('START', 575, 1514, 112)
    // the little arrows round the D-pad: embossed on the floor of its dish, part A's colour, with a soft shadow to one side
    {
      const U = KX * S, floorZ = FRONT - 0.006, tri = new THREE.Shape([new THREE.Vector2(0, 9 * U), new THREE.Vector2(-9 * U, -8 * U), new THREE.Vector2(9 * U, -8 * U)])
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
      ;[[223, 1060, 0], [223, 1350, Math.PI], [80, 1205, Math.PI / 2], [365, 1205, -Math.PI / 2]].forEach(([x, y, rot]) => {
        const sh = new THREE.Mesh(new THREE.ShapeGeometry(tri, 1).scale(1.25, 1.25, 1), shadowMat)
        sh.position.set(wx(x) + 0.0022, wy(y) - 0.003, floorZ + 0.0005); sh.rotation.z = rot; partA.add(sh)
        const em = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.005, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0008, bevelSegments: 1 }), M.front)
        em.position.set(wx(x), wy(y), floorZ + 0.0008); em.rotation.z = rot; partA.add(em)
      })
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(PW * S, PH * S), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
    sheet.position.set(0, 0, FRONT + 0.0058); partA.add(sheet)
  }

  // ── RIGHT SIDE (as seen from the front): the EXT CONNECTOR and the VOLUME wheel, from the side photo ──
  // Photo coordinates: front is on the left. SX maps a photo x to a z in the model, SY a photo y to a height (the photo is 1280 wide, body about x 512-800, y 280-1175).
  {
    const XR = X(1142), TOPY = Y(34)
    const SZ0 = 512, SZW = 290, SY0 = 280, SYH = 895
    // the two panels are scaled down (SIDE_K) and moved up so they sit level with the screen: centred on the screen's middle height
    const SIDE_K = 0.7, SIDE_CX = 660, SIDE_CY = 718                      // SIDE_CX / SIDE_CY: the middle of the two panels in the photo
    const zMid = FRONT - ((SIDE_CX - SZ0) / SZW) * DEPTH, yMid = Y(510 * PH / 1800)     // 510 = the middle of the screen in the Front photo
    const perPx = (Y(34) - Y(1958)) / SYH
    const sz = x => zMid - (x - SIDE_CX) * SIDE_K * (DEPTH / SZW), sy = y => yMid - (y - SIDE_CY) * SIDE_K * perPx
    // ── recesses, as on the other side: on part A, a pocket beside each opening with its name embossed in it (round top corner away
    // from the seam); on part B, a shallow step-down round the EXT socket and round the volume wheel. Photo px; the seam is at x ~640.
    const rev = new Evaluator(); rev.useGroups = false; rev.attributes = ['position', 'normal']
    const rcut = (mesh, geo) => { mesh.geometry = rev.evaluate(new Brush(mesh.geometry), new Brush(geo), SUBTRACTION).geometry }
    const PXW = SIDE_K * DEPTH / SZW                                         // world units per photo pixel along this wall
    // a shape drawn in the wall's plane, cut d into the right wall (its u runs along -z so it is not mirrored)
    const wallCut = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d + 0.1, bevelEnabled: false, curveSegments: 10 }).rotateY(Math.PI / 2).translate(XR - d, 0, 0)
    // rounded rectangle in photo px, one radius per corner: [low-x top, high-x top, high-x bottom, low-x bottom]
    const rrShape = (px0, px1, py0, py1, [r0, r1, r2, r3]) => {
      const u0 = -sz(px0), u1 = -sz(px1), vT = sy(py0), vB = sy(py1), R = r => r * PXW, sh = new THREE.Shape()
      sh.moveTo(u0 + R(r3), vB); sh.lineTo(u1 - R(r2), vB); sh.quadraticCurveTo(u1, vB, u1, vB + R(r2)); sh.lineTo(u1, vT - R(r1)); sh.quadraticCurveTo(u1, vT, u1 - R(r1), vT)
      sh.lineTo(u0 + R(r0), vT); sh.quadraticCurveTo(u0, vT, u0, vT - R(r0)); sh.lineTo(u0, vB + R(r3)); sh.quadraticCurveTo(u0, vB, u0 + R(r3), vB); return sh }
    const FONT2 = '"Helvetica Neue", Arial, sans-serif', CS2 = 10
    const emboss = (px0, px1, py0, py1, floorX, parent, draw) => {
      const cv = document.createElement('canvas'); cv.width = (px1 - px0) * CS2; cv.height = (py1 - py0) * CS2
      const g = cv.getContext('2d'); g.scale(CS2, CS2); g.translate(-px0, -py0)
      ;[['rgba(40,36,26,0.42)', 0.7], ['rgba(255,253,245,0.75)', -0.6], ['rgba(205,198,180,1)', 0]].forEach(([c, o]) => { g.save(); g.translate(o, o); g.fillStyle = c; draw(g); g.restore() })   // shadow, light, raised face
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
      const zA = sz(px0), zB = sz(px1), yA = sy(py0), yB = sy(py1)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(zA - zB, yA - yB).rotateY(Math.PI / 2), mat(0xffffff, { map: tex, transparent: true, depthWrite: false }))
      m.position.set(floorX + 0.0004, (yA + yB) / 2, (zA + zB) / 2); parent.add(m)
    }
    const vtext = (g, t, x, y, px) => { g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); g.font = `600 ${px}px ${FONT2}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore() }
    // part A: the label pockets
    const A_D = 0.005, EXT_A = [606, 633, 548, 722], VOL_A = [606, 633, 760, 886]
    rcut(frontShell, wallCut(rrShape(...EXT_A, [20, 0, 0, 5]), A_D)); rcut(frontShell, wallCut(rrShape(...VOL_A, [20, 0, 0, 5]), A_D))
    emboss(...EXT_A, XR - A_D, partA, g => vtext(g, 'EXT CONNECTOR', 621, 642, 12))
    emboss(...VOL_A, XR - A_D, partA, g => { vtext(g, 'VOL', 621, 858, 13)
      g.beginPath(); g.moveTo(613, 815); g.lineTo(628, 790); g.lineTo(628, 815); g.closePath(); g.fill() })   // the little volume ramp
    // part B: a shallow step-down round each opening
    const B_D = 0.004
    for (const box of [[641, 724, 548, 724], [641, 724, 746, 906]]) {
      const c = wallCut(rrShape(...box, [0, 6, 6, 0]), B_D); rcut(backShell, c); rcut(rimSlab, c)
    }
    // the EXT socket and the volume slot are real openings cut into part B's side wall (back shell and the rim strip)
    const sev = new Evaluator(); sev.useGroups = false; sev.attributes = ['position', 'normal']
    const sideBox = (px0, px1, py0, py1, d) => { const z0 = sz(px1), z1 = sz(px0), y0 = sy(py1), y1 = sy(py0)
      return new THREE.BoxGeometry(d + 0.1, y1 - y0, z1 - z0).translate(XR - d + (d + 0.1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) }
    const SOCK = [652, 718, 578, 690], SOCK_D = 0.03, SLOT = [650, 700, 756, 888], SLOT_D = 0.025
    for (const [box, d] of [[SOCK, SOCK_D], [SLOT, SLOT_D]]) {
      const c = sideBox(...box, d)
      backShell.geometry = sev.evaluate(new Brush(backShell.geometry), new Brush(c), SUBTRACTION).geometry
      rimSlab.geometry = sev.evaluate(new Brush(rimSlab.geometry), new Brush(c), SUBTRACTION).geometry
    }
    // the EXT connector inside its opening: a metal shroud with clipped corners, dark inside, a flat pin block in the middle
    {
      const z0 = sz(SOCK[1]), z1 = sz(SOCK[0]), y0 = sy(SOCK[3]), y1 = sy(SOCK[2]), zc = (z0 + z1) / 2, yc = (y0 + y1) / 2
      const w = (z1 - z0) * 0.88, h = (y1 - y0) * 0.9, c = Math.min(w, h) * 0.28
      const oct = (w, h, c) => new THREE.Shape([[-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c], [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c]].map(([a, b]) => new THREE.Vector2(a, b)))
      const ring = oct(w, h, c); ring.holes.push(new THREE.Path(oct(w * 0.78, h * 0.86, c * 0.75).getPoints()))
      const shroud = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: SOCK_D * 0.9, bevelEnabled: false }).rotateY(Math.PI / 2), mat(0xb4b1a8))
      shroud.position.set(XR - SOCK_D * 0.95, yc, zc); partB.add(shroud)
      const inside = new THREE.Mesh(new THREE.BoxGeometry(0.002, h * 0.86, w * 0.78), mat(0x141416)); inside.position.set(XR - SOCK_D + 0.004, yc, zc); partB.add(inside)
      const pins = new THREE.Mesh(new THREE.BoxGeometry(SOCK_D * 0.7, h * 0.6, w * 0.22), mat(0x45433e)); pins.position.set(XR - SOCK_D * 0.6, yc, zc); partB.add(pins)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(0.002, y1 - y0, z1 - z0), mat(0x2a2925)); floor.position.set(XR - SOCK_D + 0.001, yc, zc); partB.add(floor)
    }
    { // a dark floor at the back of the volume slot
      const z0 = sz(SLOT[1]), z1 = sz(SLOT[0]), y0 = sy(SLOT[3]), y1 = sy(SLOT[2])
      const floor = new THREE.Mesh(new THREE.BoxGeometry(0.002, y1 - y0, z1 - z0), mat(0x1a1a1c)); floor.position.set(XR - SLOT_D + 0.001, (y0 + y1) / 2, (z0 + z1) / 2); partB.add(floor)
    }
    // the volume wheel: a dark thumbwheel poking out of the side, with ridges
    const wz0 = sz(650), wz1 = sz(697), wy0 = sy(758), wy1 = sy(886), wl = wz0 - wz1, wh = wy0 - wy1
    const wheel = thumbwheel(XR, 1, (wy0 + wy1) / 2, (wz0 + wz1) / 2, wh, wl * 0.78)   // the volume wheel: a toothed disc in its slot
    wheel.name = 'volumeWheel'; partB.add(wheel); abMeshes.volume = wheel
  }

  // ── LEFT SIDE (as seen from the front): the power input and the CONTRAST dial, from the other side photo ──
  // In that photo the front is on the right, and the seam is at photo x 628. Scaled and placed level with the screen, like the right side.
  {
    const XL = X(24), SK = 0.7, SCY = 727, perPx = (Y(34) - Y(1958)) / 895, zPerPx = DEPTH / 290
    const yMid = Y(510 * PH / 1800)
    const sz = x => SPLIT_Z + (x - 628) * SK * zPerPx, sy = y => yMid - (y - SCY) * SK * perPx
    const lev = new Evaluator(); lev.useGroups = false; lev.attributes = ['position', 'normal']
    const cut = (mesh, geo) => { mesh.geometry = lev.evaluate(new Brush(mesh.geometry), new Brush(geo), SUBTRACTION).geometry }
    const wallBox = (px0, px1, py0, py1, d) => { const z0 = sz(px0), z1 = sz(px1), y0 = sy(py1), y1 = sy(py0)
      return new THREE.BoxGeometry(d + 0.1, y1 - y0, z1 - z0).translate(XL + d - (d + 0.1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) }
    const PXW = SK * zPerPx                                                // world units per photo pixel along the wall
    // a shape drawn in the wall's own plane (u = z, v = y), cut d into the left wall
    const wallCut = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d + 0.1, bevelEnabled: false, curveSegments: 10 }).rotateY(-Math.PI / 2).translate(XL + d, 0, 0)
    // a rounded rectangle in photo px with its own radius per corner: [low-x top, high-x top, high-x bottom, low-x bottom]
    const rrShape = (px0, px1, py0, py1, [r0, r1, r2, r3]) => {
      const u0 = sz(px0), u1 = sz(px1), vT = sy(py0), vB = sy(py1), R = r => r * PXW, sh = new THREE.Shape()
      sh.moveTo(u0 + R(r3), vB); sh.lineTo(u1 - R(r2), vB); sh.quadraticCurveTo(u1, vB, u1, vB + R(r2)); sh.lineTo(u1, vT - R(r1)); sh.quadraticCurveTo(u1, vT, u1 - R(r1), vT)
      sh.lineTo(u0 + R(r0), vT); sh.quadraticCurveTo(u0, vT, u0, vT - R(r0)); sh.lineTo(u0, vB + R(r3)); sh.quadraticCurveTo(u0, vB, u0 + R(r3), vB); return sh }
    // embossed lettering: a lit sheet lying on a recess floor, the letters drawn with a highlight above-left and a shadow below-right
    const FONT3 = '"Helvetica Neue", Arial, sans-serif', CS3 = 10
    const emboss = (px0, px1, py0, py1, floorX, parent, lines) => {
      const cv = document.createElement('canvas'); cv.width = (px1 - px0) * CS3; cv.height = (py1 - py0) * CS3
      const g = cv.getContext('2d'); g.scale(CS3, CS3); g.translate(-px0, -py0)
      lines.forEach(([t, x, y, size, rot]) => {
        g.save(); g.translate(x, y); g.rotate(rot); g.font = `600 ${size}px ${FONT3}`; g.textAlign = 'center'; g.textBaseline = 'middle'
        g.fillStyle = 'rgba(40,36,26,0.42)'; g.fillText(t, 0.7, 0.7)          // shadow side
        g.fillStyle = 'rgba(255,253,245,0.75)'; g.fillText(t, -0.6, -0.6)   // lit side
        g.fillStyle = 'rgba(205,198,180,1)'; g.fillText(t, 0, 0)             // the raised face, plastic coloured
        g.restore() })
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
      const zA = sz(px1), zB = sz(px0), yA = sy(py0), yB = sy(py1)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(zA - zB, yA - yB).rotateY(-Math.PI / 2), mat(0xffffff, { map: tex, transparent: true, depthWrite: false }))
      m.position.set(floorX - 0.0004, (yA + yB) / 2, (zA + zB) / 2); parent.add(m)
    }
    // CONTRAST: a recess carved into part A from the seam, wide enough for the wheel AND the embossed word beside it; round corners away from the seam
    const POCKET = [631, 712, 694, 836], POCKET_D = 0.007, SLOT = [640, 668, 718, 832], SLOT_D = 0.026
    cut(frontShell, wallCut(rrShape(...POCKET, [0, 16, 16, 0]), POCKET_D))
    emboss(670, 712, 694, 836, XL + POCKET_D, partA, [['CONTRAST', 692, 765, 15, Math.PI / 2]])
    // the rating: a light, shallow recess on part B beside the seam, with "USE ONLY DMG-03 0.5" and "DC 6V" embossed in it; round corners away from the seam
    const RATING = [585, 626, 668, 886], RATING_D = 0.003
    cut(backShell, wallCut(rrShape(...RATING, [14, 0, 0, 14]), RATING_D))
    emboss(...RATING, XL + RATING_D, partB, [['USE ONLY DMG-03 0.5', 600, 777, 12, -Math.PI / 2], ['DC 6V  \u2296\u2295', 616, 777, 12, -Math.PI / 2]])
    cut(frontShell, wallBox(...SLOT, SLOT_D))                           // the slot the wheel turns in
    { const z0 = sz(SLOT[0]), z1 = sz(SLOT[1]), y0 = sy(SLOT[3]), y1 = sy(SLOT[2])
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.002, y1 - y0, z1 - z0), mat(0x1a1a1c)); f.position.set(XL + SLOT_D - 0.001, (y0 + y1) / 2, (z0 + z1) / 2); partA.add(f) }
    // the contrast dial: a ridged thumbwheel sitting in its slot, poking a little out of the pocket (part A)
    const cz0 = sz(SLOT[1]), cz1 = sz(SLOT[0]), cy0 = sy(SLOT[2] + 2), cy1 = sy(SLOT[3] - 2), cl = cz0 - cz1, ch = cy0 - cy1
    const dial = thumbwheel(XL, -1, (cy0 + cy1) / 2, (cz0 + cz1) / 2, ch, cl * 0.78)   // the contrast wheel: a toothed disc in its slot
    dial.name = 'contrastWheel'; partA.add(dial); abMeshes.contrast = dial
    // the power input: a round hole in part B with a dark inside and a centre pin, like the photo
    const jz = sz(568), jy = sy(588), JR = 0.019, JD = 0.03
    cut(backShell, new THREE.CylinderGeometry(JR, JR, JD + 0.1, 40).rotateZ(Math.PI / 2).translate(XL + JD - (JD + 0.1) / 2, jy, jz))
    const cyl = (r, h, c) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32).rotateZ(Math.PI / 2), mat(c))
    const jFloor = cyl(JR, 0.002, 0x0e0e10); jFloor.position.set(XL + JD - 0.001, jy, jz); partB.add(jFloor)
    const sleeve = cyl(JR * 0.62, JD * 0.8, 0x232326); sleeve.position.set(XL + JD * 0.55, jy, jz); partB.add(sleeve)          // the plastic sleeve inside
    const pin = cyl(JR * 0.22, JD * 0.9, 0x8c8a82); pin.position.set(XL + JD * 0.5, jy, jz); partB.add(pin)                     // the metal centre pin
    // a thin oval line carved round the power input
    {
      const hw = JR * 1.7, hh = JR * 2.2, gw = 0.0035, st = (w, h) => { const r = w, sh = new THREE.Shape()
        sh.moveTo(jz + w, jy - h + r); sh.lineTo(jz + w, jy + h - r); sh.absarc(jz, jy + h - r, r, 0, Math.PI, false); sh.lineTo(jz - w, jy - h + r); sh.absarc(jz, jy - h + r, r, Math.PI, Math.PI * 2, false); return sh }
      const ring = st(hw, hh); ring.holes.push(new THREE.Path(st(hw - gw, hh - gw).getPoints(40).reverse()))
      cut(backShell, wallCut(ring, 0.0035))
    }
  }

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
    if (BACK_RECT.showGuide) partB.add(guide)

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
      plateMesh = new THREE.Mesh(g, M.body); partB.add(plateMesh)
    }
  }

  // ── BATTERY DOOR: a separate piece sitting in a pocket cut into the raised back face ──
  // The pocket (door + a notch for the latch tab) is cut out of the plate; the door is its own mesh, a little smaller, so a dark gap shows all round it.
  // Fractions as you LOOK AT THE BACK (x from the left edge, y from the top).
  const BATTERY_DOOR = { left: 0.165, right: 0.82, top: 0.60, bottom: 0.907, gap: 0.009, pocketDepth: 0.022, recess: 0.005, doorDepth: 0.014, latch: { left: 0.40, right: 0.59, top: 0.515 }, nib: { left: 0.44, right: 0.55, top: 0.566, bottom: 0.598 } }
  {
    const D = BATTERY_DOOR, zTop = -FRONT - BACK_RECT.lift
    const X = f => 0.559 - f * 1.118, Y = f => 0.966 - f * 1.924
    const ev = new Evaluator(); ev.useGroups = false; ev.attributes = ['position', 'normal']
    const xa = X(D.left), xb = X(D.right), ya = Y(D.top), yb = Y(D.bottom)           // xa > xb (mirrored), ya > yb
    const L = D.latch, lx0 = X(L.left), lx1 = X(L.right), ly = Y(L.top)
    const zFloor = zTop + D.pocketDepth                                               // the pocket floor (further in = less negative)
    const zc = (zFloor + zTop - 0.1) / 2, zh = zFloor - (zTop - 0.1)
    const box = (x0, x1, y0, y1) => new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), zh).translate((x0 + x1) / 2, (y0 + y1) / 2, zc)
    let g = plateMesh.geometry
    for (let i = 0; i < GRIP.count; i++) {                                            // the grip grooves carry on across the raised face (the door is its own piece, so it stays smooth)
      const gz0 = zTop - 0.1, gz1 = zTop + GRIP.depth
      g = ev.evaluate(new Brush(g), new Brush(new THREE.BoxGeometry(1.4, GRIP.width, gz1 - gz0).translate(0, gripY(i), (gz0 + gz1) / 2)), SUBTRACTION).geometry
    }
    g = ev.evaluate(new Brush(g), new Brush(box(xa, xb, ya, yb)), SUBTRACTION).geometry
    g = ev.evaluate(new Brush(g), new Brush(box(lx0, lx1, ly, ya - 0.01)), SUBTRACTION).geometry   // the notch for the latch tab, joined to the pocket
    plateMesh.geometry = g
    // dark floor of the pocket, so the gap reads as a gap
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x24221d, side: THREE.DoubleSide })
    ;[[xa, xb, ya, yb], [lx0, lx1, ly, ya]].forEach(([x0, x1, y0, y1]) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0)), floorMat); f.position.set((x0 + x1) / 2, (y0 + y1) / 2, zFloor - 0.0002); partB.add(f) })
    // the door: ONE T-shaped piece (door + latch tab), inset by the gap, sunk below the surrounding face, with bevelled edges that catch the light
    const gp = D.gap, bev = 0.0025
    const dx0 = Math.min(xa, xb) + gp + bev, dx1 = Math.max(xa, xb) - gp - bev, dy0 = yb + gp + bev, dy1 = ya - gp - bev
    const tx0 = Math.min(lx0, lx1) + gp + bev, tx1 = Math.max(lx0, lx1) - gp - bev, ty1 = ly - gp - bev
    const V2 = (x, y) => new THREE.Vector2(x, y)
    const outline = new THREE.Shape([V2(dx0, dy0), V2(dx1, dy0), V2(dx1, dy1), V2(tx1, dy1), V2(tx1, ty1), V2(tx0, ty1), V2(tx0, dy1), V2(dx0, dy1)])
    const body = D.doorDepth - 2 * bev
    let doorGeo = new THREE.ExtrudeGeometry(outline, { depth: body, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3 })
    doorGeo.translate(0, 0, zTop + D.recess + bev)                                   // the outer face sits D.recess below the surrounding face
    doorGeo.deleteAttribute('uv'); doorGeo = doorGeo.toNonIndexed(); doorGeo.computeVertexNormals()
    // the nib lock: a deep rectangular hole right through the tab, just above the door, where the catch hooks in
    const NIB = D.nib, nx0 = X(NIB.left), nx1 = X(NIB.right), ny0 = Y(NIB.top), ny1 = Y(NIB.bottom)
    doorGeo = ev.evaluate(new Brush(doorGeo), new Brush(new THREE.BoxGeometry(Math.abs(nx1 - nx0), ny0 - ny1, 0.2).translate((nx0 + nx1) / 2, (ny0 + ny1) / 2, zTop)), SUBTRACTION).geometry
    const door = new THREE.Group()
    door.add(new THREE.Mesh(doorGeo, M.body))
    // black floor at the bottom of the nib hole, so it reads as deep
    const nibFloor = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(nx1 - nx0), ny0 - ny1), new THREE.MeshBasicMaterial({ color: 0x141412, side: THREE.DoubleSide }))
    nibFloor.position.set((nx0 + nx1) / 2, (ny0 + ny1) / 2, zFloor - 0.0004); door.add(nibFloor)
    // the catch: a small raised bar on the tab right above the hole, the bit your thumb pushes
    const cH = 0.014, catchBar = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(nx1 - nx0) + 0.01, cH, 0.006), M.body)
    catchBar.position.set((nx0 + nx1) / 2, ny0 + cH / 2, zTop + D.recess - 0.003); door.add(catchBar)
    door.name = 'batteryDoor'; partB.add(door)
  }

  // ── BACK LABELS: the serial sticker and the moulded rating plate on the raised back face, from the back photo (brand swapped to Drinworks) ──
  // Fractions as you LOOK AT THE BACK (x from the left edge, y from the top).
  const BACK_LABELS = {
    serial: { left: 0.345, right: 0.636, top: 0.289, bottom: 0.318, text: 'DW0625151251' },
    plate: { left: 0.245, right: 0.736, top: 0.347, bottom: 0.484, depth: 0.0022 },
    // a little easter egg: the rating plate, rewritten about the person who made this
    lines: ['MODEL NO.  DW-01', '\u00a9 2022 Drinworks', 'RATING :  UI/UX  4 YRS', 'BATTERY : COFFEE\u00d74', 'PAT. PEND.  MADE IN QC, PH'],
    fine: ['Complies with the limits for a Class A design', 'system pursuant to Subpart UX of Part 15 of Figma Rules.']
  }
  {
    const zTop = -FRONT - BACK_RECT.lift, X = f => 0.559 - f * 1.118, Y = f => 0.966 - f * 1.924
    const plane = (r, z, material) => {
      const w = (r.right - r.left) * 1.118, h = (r.bottom - r.top) * 1.924
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateY(Math.PI), material)   // faces the back; reads the right way round
      m.position.set(X((r.left + r.right) / 2), Y((r.top + r.bottom) / 2), z); partB.add(m); return { w, h }
    }
    const canvasFor = (r, draw) => {
      const w = (r.right - r.left) * 1.118, h = (r.bottom - r.top) * 1.924, PXU = 2600
      const cv = document.createElement('canvas'); cv.width = Math.round(w * PXU); cv.height = Math.round(h * PXU)
      draw(cv.getContext('2d'), cv.width, cv.height)
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex
    }
    const SANS = '"Helvetica Neue", Arial, sans-serif'

    // the serial number: a thin silver foil sticker, brushed, with a soft sheen across it and dark blue print
    {
      const tex = canvasFor(BACK_LABELS.serial, (g, W, H) => {
        const base = g.createLinearGradient(0, 0, W, H)
        base.addColorStop(0, '#dfe3e6'); base.addColorStop(0.35, '#aab2b8'); base.addColorStop(0.55, '#e9ecee'); base.addColorStop(0.8, '#9ea6ac'); base.addColorStop(1, '#c8ced2')
        g.fillStyle = base; g.fillRect(0, 0, W, H)
        for (let i = 0; i < H; i += 2) { g.fillStyle = `rgba(255,255,255,${0.04 + 0.06 * Math.random()})`; g.fillRect(0, i, W, 1) }   // brushed lines
        for (let i = 1; i < H; i += 3) { g.fillStyle = `rgba(60,70,80,${0.03 + 0.04 * Math.random()})`; g.fillRect(0, i, W, 1) }
        g.strokeStyle = 'rgba(90,98,105,0.6)'; g.lineWidth = H * 0.05; g.strokeRect(0, 0, W, H)
        g.fillStyle = '#1b2070'; g.font = `500 ${H * 0.72}px "Courier New", monospace`; g.textBaseline = 'middle'; g.textAlign = 'center'
        const t = BACK_LABELS.serial.text, step = (W * 0.92) / t.length
        ;[...t].forEach((ch, i) => g.fillText(ch, W * 0.04 + step * (i + 0.5), H * 0.54))
      })
      plane(BACK_LABELS.serial, zTop - 0.0006, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.28, metalness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }))
    }

    // the rating plate: a shallow recess in the raised face, with everything on it moulded RAISED in the same plastic
    {
      const P = BACK_LABELS.plate, x0 = X(P.right), x1 = X(P.left), y0 = Y(P.bottom), y1 = Y(P.top), r = 0.006
      const sh = new THREE.Shape(); sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1)
      sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0)
      const lev = new Evaluator(); lev.useGroups = false; lev.attributes = ['position', 'normal']
      plateMesh.geometry = lev.evaluate(new Brush(plateMesh.geometry), new Brush(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, zTop - 0.1 + P.depth)), SUBTRACTION).geometry
      const tex = canvasFor(P, (g, W, H) => {
        g.fillStyle = 'rgba(255,250,236,0.22)'; g.fillRect(0, 0, W, H)                 // the recess floor is a touch lighter, like the photo
        const o = H * 0.006
        // everything is drawn three times: a shadow below-right, a highlight above-left, then the raised face itself
        const pass = (fill, stroke, dx) => {
          g.save(); g.translate(dx, dx); g.fillStyle = fill; g.strokeStyle = stroke; g.textBaseline = 'alphabetic'; g.textAlign = 'left'
          const fs = H * 0.1, x0 = W * 0.035
          BACK_LABELS.lines.forEach((t, i) => { g.font = `700 ${fs}px ${SANS}`; g.fillText(t, x0, H * (0.15 + i * 0.152), W * 0.72) })
          g.font = `700 ${H * 0.068}px ${SANS}`; BACK_LABELS.fine.forEach((t, i) => g.fillText(t, x0, H * (0.875 + i * 0.09), W * 0.93))
          // the marks on the right: DW in a double box (where VCCI was), and the Figma logo under it
          const bx = W * 0.775, by = H * 0.3, bw = W * 0.165, bh = H * 0.24
          g.lineWidth = H * 0.014; g.beginPath(); g.roundRect(bx, by, bw, bh, bh * 0.14); g.stroke()
          g.beginPath(); g.roundRect(bx + bw * 0.1, by + bh * 0.14, bw * 0.8, bh * 0.72, bh * 0.1); g.stroke()
          g.font = `800 ${bh * 0.5}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DW', bx + bw / 2, by + bh / 2 + bh * 0.02, bw * 0.66)
          const u = H * 0.055, fx = bx + bw / 2 - u, fy = H * 0.6                        // Figma: two columns of three, rounded
          g.beginPath(); g.roundRect(fx, fy, u, u, [u / 2, 0, 0, u / 2]); g.fill()             // top left
          g.beginPath(); g.roundRect(fx + u, fy, u, u, [0, u / 2, u / 2, 0]); g.fill()         // top right
          g.beginPath(); g.roundRect(fx, fy + u, u, u, [u / 2, 0, 0, u / 2]); g.fill()         // middle left
          g.beginPath(); g.arc(fx + u * 1.5, fy + u * 1.5, u / 2, 0, Math.PI * 2); g.fill()   // middle right: the circle
          g.beginPath(); g.roundRect(fx, fy + u * 2, u, u, [u / 2, 0, u / 2, u / 2]); g.fill() // bottom left: the drop
          g.restore()
        }
        pass('rgba(60,52,36,0.5)', 'rgba(60,52,36,0.5)', o)
        pass('rgba(255,252,240,0.85)', 'rgba(255,252,240,0.85)', -o * 0.8)
        pass('rgb(214,204,176)', 'rgb(214,204,176)', 0)
      })
      plane(P, zTop + P.depth - 0.0004, mat(0xffffff, { map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }))
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
      // the four round holes in the back, from the back photo (fractions as you LOOK AT THE BACK): two near the top corners, two lower down with a screw inside
      const BACK_HOLES = { r: 0.025, depth: 0.05, pts: [[0.08, 0.12, false], [0.92, 0.12, false], [0.07, 0.478, true], [0.92, 0.478, true]] }
      let holedGeo = backShell.geometry
      BACK_HOLES.pts.forEach(([fx, fy, screw]) => {
        const hx = 0.559 - fx * 1.118, hy = 0.966 - fy * 1.924
        const cutter = new THREE.CylinderGeometry(BACK_HOLES.r, BACK_HOLES.r, 0.2, 40).rotateX(Math.PI / 2).translate(hx, hy, -FRONT - 0.1 + BACK_HOLES.depth)
        holedGeo = ev.evaluate(new Brush(holedGeo), new Brush(cutter), SUBTRACTION).geometry
        const floor = new THREE.Mesh(new THREE.CircleGeometry(BACK_HOLES.r, 40).translate(hx, hy, -FRONT + BACK_HOLES.depth - 0.001), new THREE.MeshBasicMaterial({ color: 0x2b2b2e, side: THREE.DoubleSide })); partB.add(floor)
        if (screw) {
          const head = new THREE.Mesh(new THREE.CylinderGeometry(BACK_HOLES.r * 0.62, BACK_HOLES.r * 0.62, 0.008, 24).rotateX(Math.PI / 2).translate(hx, hy, -FRONT + BACK_HOLES.depth - 0.006), new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.5, metalness: 0.6 }))
          const slot = new THREE.Mesh(new THREE.BoxGeometry(BACK_HOLES.r * 1.1, 0.004, 0.003).translate(hx, hy, -FRONT + BACK_HOLES.depth - 0.011), new THREE.MeshBasicMaterial({ color: 0x151518 }))
          partB.add(head, slot)
        }
      })
      const cutBack = ev.evaluate(new Brush(holedGeo), new Brush(boxFor(yEnd, yMax, -FRONT - 0.1, zIn)), SUBTRACTION)
      cutBack.material = M.body; partB.remove(backShell); partB.add(cutBack)
      // lifted face: cut from the back face up to the green edge's height, so a roof is left
      if (plateMesh) {
        const roofZ = -FRONT - TUNNEL.bottomOut
        const cutPlate = ev.evaluate(new Brush(plateMesh.geometry), new Brush(boxFor(yEnd, yMax, roofZ, zIn)), SUBTRACTION)
        cutPlate.material = M.body; partB.remove(plateMesh); partB.add(cutPlate)
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
      back.position.z = -FRONT - 0.002; partB.add(back)
      const bc = new THREE.Group()  // corners sit just above the edges
      for (const [x, y, c] of [[XL, yBot, CORNER.bBL], [XR, yBot, CORNER.bBR], [XL, yTop - cs / 2, CORNER.bTL], [XR, yTop - cs / 2, CORNER.bTR]])
        bc.add(mesh(rect(x - cs / 2, y - cs / 2, x + cs / 2, y + cs / 2), c))
      bc.position.z = -FRONT - 0.004; partB.add(bc)

      // ── on the top end: the opening, from the back face (z0) in to the depth (z1) ──
      const end = new THREE.Group()   // drawn flat in x / (-z), then laid down on the top end
      end.add(mesh(rect(XR - w / 2, -z0 - w / 2, XL + w / 2, -z0 + w / 2), EDGE.eBack))
      end.add(mesh(rect(XR - w / 2, -z1 - w / 2, XL + w / 2, -z1 + w / 2), EDGE.eDeep))
      end.add(mesh(rect(XL - w / 2, -z1, XL + w / 2, -z0), EDGE.eLeft))
      end.add(mesh(rect(XR - w / 2, -z1, XR + w / 2, -z0), EDGE.eRight))
      for (const [x, z, c] of [[XL, z0, CORNER.eBL], [XR, z0, CORNER.eBR], [XL, z1, CORNER.eDL], [XR, z1, CORNER.eDR]]) {
        const m = mesh(rect(x - cs / 2, -z - cs / 2, x + cs / 2, -z + cs / 2), c); m.position.z = 0.002; end.add(m)
      }
      end.rotation.x = -Math.PI / 2; end.position.y = yTop + 0.002; partB.add(end)
    }
  }

  // ── floating labels: each one is pinned to a spot on the body and hides when that spot turns away from you ──
  // L / R are as seen from the front (screen side). Corners read upper/lower, left/right, front/back.
  const HX = 0.559, TOP = Y(34), BOT = Y(1958), HZ = FRONT
  const CUR = { x: X(1065), y: Y(1879) } // 45 degrees round the big bottom-right curve

  // ── GRID: a floor under the model plus x / y / z axes, fixed in the world (they do not turn with the model) ──
  // 1 grid square = 100 photo pixels (0.1 world units). X runs left (-) to right (+) as seen from the front, Y runs along the floor from the front (-) to the back (+),
  // and Z is vertical, down (-) to up (+). Numbers are photo pixels from the centre of the body.
  const gridGroup = new THREE.Group(); scene.add(gridGroup)
  const FLOOR_Y = Y(1958), EXT = 0.9, STEP = 0.1
  {
    const line = (pts, color, op, depth = true) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)))
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthTest: depth })); gridGroup.add(l)
    }
    const thin = 0x8a8f99
    for (let i = -9; i <= 9; i++) {
      const v = i * STEP; if (i === 0) continue
      line([[v, FLOOR_Y, -EXT], [v, FLOOR_Y, EXT]], thin, 0.3)
      line([[-EXT, FLOOR_Y, v], [EXT, FLOOR_Y, v]], thin, 0.3)
    }
    line([[-EXT, FLOOR_Y, 0], [EXT, FLOOR_Y, 0]], 0xe53935, 0.9, false)   // X axis, red
    line([[0, FLOOR_Y, -EXT], [0, FLOOR_Y, EXT]], 0x43a047, 0.9, false)   // Y axis, green: along the floor, front to back
    line([[0, FLOOR_Y, 0], [0, FLOOR_Y + 2.0, 0]], 0x1e88e5, 0.9, false)  // Z axis, blue: vertical, up from the floor (the origin)
  }
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

  const gl = (name, pos, color) => A.push({ group: 'gridlabels', name, pos: new THREE.Vector3(...pos), n: new THREE.Vector3(0, 0, 1), world: true, color })
  gl('+X', [EXT + 0.06, FLOOR_Y, 0], '#e53935'); gl('−X', [-EXT - 0.06, FLOOR_Y, 0], '#e53935')
  gl('−Y (front)', [0, FLOOR_Y, EXT + 0.06], '#43a047'); gl('+Y (back)', [0, FLOOR_Y, -EXT - 0.06], '#43a047')
  gl('+Z', [0, FLOOR_Y + 2.06, 0], '#1e88e5'); gl('0', [0.03, FLOOR_Y, 0.03], '#8a8f99')
  for (const v of [-0.8, -0.6, -0.4, -0.2, 0.2, 0.4, 0.6, 0.8]) {
    gl(String(Math.round(v * 1000)), [v, FLOOR_Y, 0.03], '')
    gl(String(Math.round(-v * 1000)), [0.03, FLOOR_Y, v], '')
    // (Y ticks above: + is toward the back)
  }
  for (const z of [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8]) gl(String(Math.round(z * 1000)), [0.03, FLOOR_Y + z, 0], '')   // Z ticks, up from the floor
  for (const a of A) if (!a.world) a.pos.z += a.pos.z > SPLIT_Z ? SPLIT_GAP / 2 : -SPLIT_GAP / 2   // labels move with their half
  const tagLayer = document.createElement('div'); tagLayer.className = 'tags'; host.appendChild(tagLayer)
  for (const a of A) {
    a.el = document.createElement('div'); a.el.className = 'tag ' + a.group; if (a.color) a.el.style.color = a.color
    a.el.innerHTML = `<i></i><b>${a.name}</b>`
    tagLayer.appendChild(a.el)
  }
  const shown = { faces: false, corners: false, edges: false, grid: false, gridlabels: false, ...(saved.shown || {}) }   // the guide labels and grid are off (their toggles were removed)
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
      _p.copy(a.pos); if (!a.world) _p.applyMatrix4(gb.matrixWorld)
      _n.copy(a.n).applyQuaternion(gb.quaternion)
      _c.copy(camera.position).sub(_p).normalize()
      const facing = (a.world || _n.dot(_c) > 0.12) && shown[a.group]
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
  if (saved.cam) { camera.position.fromArray(saved.cam); controls.update() }
  controls.addEventListener('start', () => { touched = true })

  function size() {
    const w = host.clientWidth, h = host.clientHeight
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(size); ro.observe(host); size()

  const frameHooks = []   // things that move every frame (the game screen)
  let lastT = 0
  const loop = t => {
    const dt = lastT ? t - lastT : 0; lastT = t; frameHooks.forEach(f => f(dt))
    gridGroup.visible = shown.grid; controls.update(); placeTags(); renderer.render(scene, camera)
  }
  renderer.setAnimationLoop(loop)

  // ── CARTRIDGE: Super Mario Land, slid into the tunnel at the back, label facing out ──
  // The photo (gameboy-cart-img.js, a data URL so it also works from file://) is mapped straight onto the outer face.
  // Real sizes: 57 x 65 x 8 mm on a 90 mm wide body, so 1 mm = 1.118 / 90 world units.
  const CART = { topAbove: 0.02, thick: 0.094, color: 0x8d8890 }
  try {
    if (!window.GB_CART_IMG) await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = BASE + 'gameboy-cart-img.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s) })
    const IW = 0.708 / 0.973, IH = IW * 1174 / 1024                       // the whole photo in world units (the cart fills 97.3% of its width)
    // the cart outline in photo fractions (u right, v up, as you look at the label): square, with the step at the top right
    const outline = [[0.012, 0.012], [0.985, 0.012], [0.985, 0.955], [0.875, 0.955], [0.875, 0.998], [0.012, 0.998]]
    const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2((u - 0.5) * IW, (v - 0.5) * IH)))
    const tex = new THREE.TextureLoader().load(window.GB_CART_IMG, () => renderer.render(scene, camera)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    const faceGeo = new THREE.ShapeGeometry(shape)
    const p = faceGeo.attributes.position, uv = faceGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / IW + 0.5, p.getY(i) / IH + 0.5)
    faceGeo.rotateY(Math.PI)                                               // face the back of the console; the label still reads the right way round
    const zOuter = -FRONT + 0.001                                          // the label sits just inside the back face, under the plate's roof lower down
    const bev = 0.003
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: CART.thick - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.6, bevelSegments: 2 }).rotateY(Math.PI)
    bodyGeo.computeBoundingBox(); bodyGeo.translate(0, 0, zOuter + 0.0006 - bodyGeo.boundingBox.min.z)
    faceGeo.translate(0, 0, zOuter)
    const cart = new THREE.Group(); cart.name = 'cartridge'
    cart.add(new THREE.Mesh(bodyGeo, mat(CART.color)), new THREE.Mesh(faceGeo, mat(0xffffff, { map: tex, polygonOffset: true, polygonOffsetFactor: -2 })))
    cart.position.y = 0.966 + CART.topAbove - (0.998 - 0.5) * IH          // the top edge pokes CART.topAbove above the console's top
    partB.add(cart)
  } catch (e) { console.warn('cartridge image not loaded', e) }

  // ── PLAYABLE SCREEN: the About page's pixel game on the LCD, and A / B you can click ──
  // It boots with the DRINWORKS logo (the old switch-on animation), then the kid runs by itself until you press A or B.
  try {
    if (!window.GBGame) await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = BASE + 'gameboy-game.js?v=' + Date.now(); s.onload = ok; s.onerror = fail; document.head.appendChild(s) })
    const game = window.GBGame.create()
    const stex = new THREE.CanvasTexture(game.canvas); stex.colorSpace = THREE.SRGBColorSpace; stex.magFilter = THREE.LinearFilter; stex.anisotropy = 8
    const { x0, x1, y0, y1 } = screenRect
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y0 - y1), mat(0xd8d8d8, { map: stex, polygonOffset: true, polygonOffsetFactor: -4 }))   // lit by the room like the plastic: the LCD has no backlight
    lcd.position.set((x0 + x1) / 2, (y0 + y1) / 2, FRONT - WELL + 0.0004); lcd.name = 'lcd'; lcd.receiveShadow = true; partA.add(lcd)
    frameHooks.push(dt => { if (game.step(dt)) stex.needsUpdate = true })
    // a soft inner shadow on the LCD itself, where it meets the well's walls: very faint all round, a bit wider and darker on the top and left
    {
      const W = 800, H = 720, cv = document.createElement('canvas'); cv.width = W; cv.height = H
      const g = cv.getContext('2d')
      const edge = (x0, y0, x1, y1, a, rx, ry, rw, rh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(12,14,6,${a})`); gr.addColorStop(1, 'rgba(12,14,6,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh) }
      const T = H * 0.07, Lw = W * 0.055, R = W * 0.022, B = H * 0.022
      edge(0, 0, 0, T, 0.68, 0, 0, W, T)                 // top
      edge(0, 0, Lw, 0, 0.58, 0, 0, Lw, H)               // left
      edge(W, 0, W - R, 0, 0.3, W - R, 0, R, H)         // right: faint
      edge(0, H, 0, H - B, 0.3, 0, H - B, W, B)         // bottom: faint
      const inTex = new THREE.CanvasTexture(cv); inTex.colorSpace = THREE.SRGBColorSpace
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y0 - y1), new THREE.MeshBasicMaterial({ map: inTex, transparent: true, depthWrite: false }))
      inner.position.set((x0 + x1) / 2, (y0 + y1) / 2, FRONT - WELL + 0.0008); partA.add(inner)
    }
    // the acrylic window over the whole bezel: clear, with only a very faint glaze; the lights glint off it as you turn it
    {
      // drawn ADDED on top of what is under it: black adds nothing, so the LCD shows through clean; only the glints from the
      // lights (clearcoat) and a very faint sheen towards the top left add a little light
      const W = 256, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H
      const g = cv.getContext('2d'), gl = g.createLinearGradient(0, 0, W, H)
      gl.addColorStop(0, 'rgb(20,20,20)'); gl.addColorStop(0.45, 'rgb(5,5,5)'); gl.addColorStop(1, 'rgb(0,0,0)')
      g.fillStyle = gl; g.fillRect(0, 0, W, H)
      const glaze = new THREE.CanvasTexture(cv); glaze.colorSpace = THREE.SRGBColorSpace
      const acrylic = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 0.004, y0 - y1 + 0.004),
        new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: glaze, roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
      acrylic.position.set((x0 + x1) / 2, (y0 + y1) / 2, FRONT + 0.0052); acrylic.name = 'acrylic'; partA.add(acrylic)
    }

    // A and B: press with the pointer (raycast), or the A / B / Space keys. The button sinks while held.
    const rest = { a: abMeshes.a.position.z, b: abMeshes.b.position.z }, SINK = 0.008
    const setBtn = (k, on) => { abMeshes[k].position.z = rest[k] - (on ? SINK : 0); on ? game.press(k) : game.release(k) }
    // the power switch: click the knob to slide it; the game boots from the logo when it goes on and blanks when it goes off
    let powered = true
    const ledOn = new THREE.Color(0xff3b2a), ledOff = new THREE.Color(0x3a2b27)
    const setPower = on => { powered = on; game.setPower(on); abMeshes.led.material.color.copy(on ? ledOn : ledOff) }
    setPower(true)
    frameHooks.push(dt => { const k = powerSwitch.knob, to = powered ? powerSwitch.onX : powerSwitch.offX; k.position.x += (to - k.position.x) * Math.min(1, dt / 60) })
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), el = renderer.domElement
    let held = null
    const hitBtn = e => {
      const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects([abMeshes.a, abMeshes.b, abMeshes.dpad, abMeshes.select, abMeshes.start, powerSwitch.knob, ...powerSwitch.hits, abMeshes.volume, abMeshes.contrast])[0]
      if (!hit) return null
      const o = hit.object
      if (o === abMeshes.volume || o === abMeshes.contrast) return o === abMeshes.volume ? 'volume' : 'contrast'
      if (o === abMeshes.dpad) { const p = o.worldToLocal(hit.point.clone()); return Math.abs(p.x) > Math.abs(p.y) ? (p.x > 0 ? 'right' : 'left') : (p.y > 0 ? 'up' : 'down') }
      return o === abMeshes.a ? 'a' : o === abMeshes.b ? 'b' : o === abMeshes.select ? 'select' : o === abMeshes.start ? 'start' : 'power'
    }
    // the D-pad, Select and Start move when pressed but do nothing in the game: the pad rocks toward the arm, the pills sink
    const restZ = { select: abMeshes.select.position.z, start: abMeshes.start.position.z }, TILT = 0.03
    abMeshes.dpad.geometry.computeBoundingBox()
    const padR = abMeshes.dpad.geometry.boundingBox.max.x, padZ = abMeshes.dpad.position.z   // half the cross's span, and its rest height
    const feel = (k, on) => {
      if (k === 'select' || k === 'start') { abMeshes[k].position.z = restZ[k] - (on ? 0.005 : 0); return }
      // only the pressed side goes down: the pad tips a little and drops by the same amount, so the opposite arm stays where it was
      const d = abMeshes.dpad
      d.rotation.set(on && k === 'up' ? -TILT : on && k === 'down' ? TILT : 0, on && k === 'right' ? TILT : on && k === 'left' ? -TILT : 0, 0)
      d.position.z = padZ - (on ? padR * Math.sin(TILT) : 0)
    }
    const isAB = k => k === 'a' || k === 'b'
    el.addEventListener('pointerdown', e => {
      const k = hitBtn(e); if (!k) return
      e.stopImmediatePropagation()
      if (k === 'power') { setPower(!powered); return }
      if (k === 'volume' || k === 'contrast') { turning = { m: abMeshes[k], y: e.clientY }; controls.enabled = false; return }
      held = k; controls.enabled = false; isAB(k) ? setBtn(k, true) : feel(k, true)
      if (k === 'select') game.win?.()                       // Select fast-forwards to the win
      if (k === 'start') game.restart?.()                    // Start resets: a fresh run from Monumento
    }, { capture: true, signal: ac.signal })
    // the wheels: drag up or down on one and it turns with your finger, tooth by tooth
    let turning = null
    addEventListener('pointermove', e => { if (!turning) return; const dy = e.clientY - turning.y; turning.y = e.clientY; turning.m.rotation.z += dy * 0.02 * (turning.m === abMeshes.volume ? -1 : 1) }, { signal: ac.signal })
    addEventListener('pointerup', () => { if (turning) { turning = null; controls.enabled = true } }, { signal: ac.signal })
    addEventListener('pointerup', () => { if (!held) return; isAB(held) ? setBtn(held, false) : feel(held, false); held = null; controls.enabled = true }, { signal: ac.signal })
    el.addEventListener('pointermove', e => { if (!held) el.style.cursor = hitBtn(e) ? 'pointer' : '' }, { signal: ac.signal })
    const keyOf = e => (e.code === 'Space' || e.key.toLowerCase() === 'a') ? 'a' : e.key.toLowerCase() === 'b' ? 'b' : null
    addEventListener('keydown', e => { const k = keyOf(e); if (!k || (saved.keyActive && !saved.keyActive()) || e.metaKey || e.ctrlKey || /input|textarea/i.test(e.target.tagName)) return; e.preventDefault(); if (!e.repeat) setBtn(k, true) }, { signal: ac.signal })
    addEventListener('keyup', e => { const k = keyOf(e); if (k) setBtn(k, false) }, { signal: ac.signal })
  } catch (e) { console.warn('game screen not loaded', e) }

  return {
    // what to carry over to the next build, so a reload does not move you
    state: () => ({ touched, shown: { ...shown }, rot: [gb.rotation.x, gb.rotation.y, gb.rotation.z], cam: camera.position.toArray() }),
    pause() { renderer.setAnimationLoop(null); lastT = 0 },
    resume() { renderer.setAnimationLoop(loop) },
    dispose() {
      renderer.setAnimationLoop(null); ro.disconnect(); ac.abort(); controls.dispose()
      scene.traverse(o => { if (o.geometry) o.geometry.dispose() })
      renderer.dispose(); renderer.domElement.remove(); tagLayer.remove()
    }
  }
  }
}

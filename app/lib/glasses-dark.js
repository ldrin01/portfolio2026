// My second pair of glasses in 3D, built from code (no model file), for the dark footer: round frames, a gold band
// round each rim with a rounded tortoiseshell ring inside it, meniscus lenses, a flat gold bridge, flat gold temples
// tapering to tortoiseshell tips. Modelled from my photos (see public/lab/glasses-dark.html for the lab with controls).
// buildDarkGlasses(THREE) returns { root, meshes, disposables }: root rests upside down on y = 0, centred on x and z.

export function buildDarkGlasses(THREE) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  const curve = (pts, closed = false) => new THREE.CatmullRomCurve3(pts, closed, 'centripetal')

  // ── a rounded-rectangle profile swept along a curve ──
  function roundRect(w, h, r, seg) {
    const pts = [], cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]]
    for (const [cx, cy, a0] of cs) for (let s = 0; s <= seg; s++) { const a = ((a0 + (s / seg) * 90) * Math.PI) / 180; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]) }
    return pts
  }
  function sweep(c, { steps = 64, closed = false, up = V(0, 1, 0), w = 0.1, h = 0.1, w2, h2, r = 0.5, seg = 4 } = {}) {
    const ringN = (seg + 1) * 4, pos = [], uvs = [], idx = []
    const n = closed ? steps : steps + 1
    for (let i = 0; i < n; i++) {
      const k = i / steps, p = c.getPointAt(k), t = c.getTangentAt(k)
      const side = t.clone().cross(up).normalize(), u = side.clone().cross(t).normalize()
      const ww = w2 == null ? w : w + (w2 - w) * k, hh = h2 == null ? h : h + (h2 - h) * k
      roundRect(ww, hh, Math.min(ww, hh) * r, seg).forEach(([a, b], j) => { pos.push(...p.clone().addScaledVector(side, a).addScaledVector(u, b).toArray()); uvs.push(j / ringN, k) })
    }
    for (let i = 0; i < steps; i++) {
      const a = i * ringN, b = ((i + 1) % n) * ringN
      for (let j = 0; j < ringN; j++) { const j2 = (j + 1) % ringN; idx.push(a + j, b + j, b + j2, a + j, b + j2, a + j2) }
    }
    const cap = (base, flip, at) => { const ctr = pos.length / 3; const pc = c.getPointAt(at); pos.push(pc.x, pc.y, pc.z); uvs.push(0, 0); for (let j = 0; j < ringN; j++) { const j2 = (j + 1) % ringN; flip ? idx.push(ctr, base + j2, base + j) : idx.push(ctr, base + j, base + j2) } }
    if (!closed) { cap(0, false, 0); cap(steps * ringN, true, 1) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setIndex(idx); g.computeVertexNormals()
    return g
  }

  // ── the lens shape: not a true circle. A touch wider than tall, the top flatter, the nose side drawn in a hair ──
  // side: 1 right lens, -1 left; off: distance outward from the lens edge (negative = inside)
  function lensPts(side, off = 0, n = 180) {
    const pts = []
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t)
      let x = c * 2.36, y = s * 2.24
      if (s > 0) y *= 1 - 0.06 * s ** 6
      if (c * side < 0) x *= 1 - 0.025 * (c * c) * (s > 0 ? 1 : 0.4)
      const len = Math.hypot(x, y)
      pts.push(V(x + (x / len) * off, y + (y / len) * off, 0))
    }
    return pts
  }
  // a band around the lens with a rounded-rectangle profile: `w` across the band, `d` front to back, centred at z
  const ring = (side, off, w, d, z = 0, r = 0.45) => sweep(curve(lensPts(side, off).map(p => p.setZ(z)), true), { steps: 200, closed: true, up: V(0, 0, 1), w, h: d, r })

  // the lens: a meniscus. The front bulges out, the back curves in, the edge has a little thickness. The dome height
  // depends only on how far in from the edge a point is, so each face is one smooth cap with no crease at the centre.
  function lensGeom(side, off, { edge = 0.1, front = 0.042, back = 0.028, rings = 32 } = {}) {
    const out = lensPts(side, off, 128), N = out.length, pos = [], idx = []
    const RR = out.reduce((a, p) => a + p.lengthSq(), 0) / N
    const face = (sign, k) => {
      const ctr = pos.length / 3
      pos.push(0, 0, sign * edge / 2 + k * RR)
      const base = ctr + 1
      for (let j = 1; j <= rings; j++) {
        const f = j / rings
        for (const p of out) pos.push(p.x * f, p.y * f, sign * edge / 2 + k * RR * (1 - f * f))
      }
      for (let i = 0; i < N; i++) { const a = base + i, b = base + (i + 1) % N; sign > 0 ? idx.push(ctr, a, b) : idx.push(ctr, b, a) }
      for (let j = 0; j < rings - 1; j++) for (let i = 0; i < N; i++) {
        const a = base + j * N + i, b = base + j * N + (i + 1) % N, c = a + N, d = b + N
        sign > 0 ? idx.push(a, c, d, a, d, b) : idx.push(a, d, c, a, b, d)
      }
      return base + (rings - 1) * N
    }
    const fr = face(1, front), br = face(-1, back)
    for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; idx.push(fr + i, br + i, br + i2, fr + i, br + i2, fr + i2) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx); g.computeVertexNormals()
    return g
  }

  // ── tortoiseshell, painted: a dark brown body with amber and honey patches ──
  function tortoise({ base, spots, n, seed }) {
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256
    const cx = cv.getContext('2d')
    cx.fillStyle = base; cx.fillRect(0, 0, 1024, 256)
    for (let i = 0; i < n; i++) {
      const [r, g, b, a] = spots[Math.floor(rnd() * spots.length)]
      const x = rnd() * 1024, y = rnd() * 256, rx = 12 + rnd() * 70, ry = 6 + rnd() * 26
      for (const dx of [-1024, 0, 1024]) { // wrap around, so the seam does not show
        cx.save(); cx.translate(x + dx, y); cx.rotate((rnd() - 0.5) * 0.5); cx.scale(rx, ry)
        const gr = cx.createRadialGradient(0, 0, 0, 0, 0, 1)
        gr.addColorStop(0, `rgba(${r},${g},${b},${a})`); gr.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.5})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
        cx.fillStyle = gr; cx.beginPath(); cx.arc(0, 0, 1, 0, Math.PI * 2); cx.fill(); cx.restore()
      }
    }
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8
    return tex
  }
  const shellTex = tortoise({ base: '#150904', n: 110, seed: 7, spots: [[96, 48, 18, 0.5], [140, 80, 32, 0.35], [60, 28, 10, 0.6], [4, 2, 1, 0.8], [4, 2, 1, 0.8]] })
  shellTex.repeat.set(5, 1)
  const tipTex = tortoise({ base: '#120805', n: 90, seed: 23, spots: [[96, 44, 16, 0.6], [140, 72, 26, 0.4], [4, 2, 1, 0.8]] })
  tipTex.center.set(0.5, 0.5); tipTex.rotation = Math.PI / 2; tipTex.repeat.set(1.2, 0.4)

  // ── materials. On the footer's see-through canvas, lens and pads use plain transparency, not refraction (no second
  // render pass, and nothing behind them to bend anyway) ──
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ map: shellTex, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 0.8 }),
    tip: new THREE.MeshPhysicalMaterial({ map: tipTex, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }),
    gold: new THREE.MeshPhysicalMaterial({ color: 0xd8b878, metalness: 1, roughness: 0.2 }),
    goldDim: new THREE.MeshPhysicalMaterial({ color: 0xbfa066, metalness: 1, roughness: 0.32 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xfff4dc, roughness: 0.02, transparent: true, opacity: 0.14, depthWrite: false, specularIntensity: 1, envMapIntensity: 1.6 }),
    pad: new THREE.MeshPhysicalMaterial({ color: 0xeee2a0, roughness: 0.35, transparent: true, opacity: 0.8, clearcoat: 0.5 })
  }

  // ── build, in cm, from the photos (wearing pose: x right, y up, z toward the viewer) ──
  const R = 2.3, GAP = 0.77, CX = GAP + R + 0.1, HY = 0.77
  const BEND = 0.085 // the front is not flat: each half angles back from the bridge (about 5°)
  const front = new THREE.Group(), temples = new THREE.Group()
  const meshes = [], disposables = [shellTex, tipTex, ...Object.values(M)]
  let bend = null
  const add = (g, m, group = front) => {
    if (bend && group === front) bend(g)
    const mesh = new THREE.Mesh(g, m)
    mesh.castShadow = m !== M.lens
    mesh.userData.see = m === M.lens // see-through: left out of the baked contact shadow
    group.add(mesh); meshes.push(mesh); disposables.push(g)
  }
  const onRim = (s, y, r = R + 0.12) => s * (CX + Math.sqrt(r * r - y * y))
  const inRim = (s, y, r = R + 0.12) => s * (CX - Math.sqrt(r * r - y * y))

  for (const s of [-1, 1]) {
    const pivot = s * (GAP + 0.2)
    bend = (g) => g.translate(-pivot, 0, 0).rotateY(s * BEND).translate(pivot, 0, 0)
    const bent = (p) => p.clone().sub(V(pivot, 0, 0)).applyAxisAngle(V(0, 1, 0), s * BEND).add(V(pivot, 0, 0))

    // rim: a gold band round the outside; inside it a rounded tortoiseshell ring that stands proud front and back
    add(ring(s, 0.165, 0.07, 0.17, 0).translate(s * CX, 0, 0), M.gold)
    add(ring(s, 0.04, 0.22, 0.34, 0, 0.5).translate(s * CX, 0, 0), M.shell)
    add(lensGeom(s, -0.04).translate(s * CX, 0, 0), M.lens)

    // endpiece and hinge
    const ex = onRim(s, HY)
    add(sweep(curve([V(ex - s * 0.04, HY, -0.02), V(ex + s * 0.16, HY, -0.12), V(ex + s * 0.22, HY, -0.5)]), { steps: 16, w: 0.22, h: 0.18, r: 0.35 }), M.gold)
    const bx = ex + s * 0.25
    add(new THREE.CylinderGeometry(0.085, 0.085, 0.34, 24).translate(bx, HY, -0.48), M.gold)
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20).translate(bx, HY + 0.185, -0.48), M.goldDim)
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12).rotateZ(Math.PI / 2).translate(ex + s * 0.2, HY, -0.25), M.goldDim)

    // temple: a flat gold band on edge, tall at the hinge and narrowing toward the ear, with a gentle bow and sag
    const H = bent(V(bx, HY, -0.48))
    const T0 = V(H.x + s * 0.02, HY, H.z - 0.08), T2 = V(H.x + s * 0.32, HY - 0.03, -9.6)
    const T1 = V((T0.x + T2.x) / 2 + s * 0.12, HY + 0.05, -5)
    add(sweep(curve([T0, V(T0.x + s * 0.06, HY + 0.02, -2.4), T1, V(T2.x + s * 0.03, HY, -7.6), T2]), { steps: 96, up: V(1, 0, 0), w: 0.32, w2: 0.12, h: 0.055, r: 0.5 }), M.gold, temples)
    // tip: tortoiseshell, curving down behind the ear and turning in toward the head
    const TX = T2.x
    add(sweep(curve([V(TX - s * 0.005, HY - 0.03, -9.3), V(TX - s * 0.04, HY - 0.06, -11.4), V(TX - s * 0.14, HY - 0.38, -12.8), V(TX - s * 0.32, HY - 1.15, -13.75), V(TX - s * 0.46, HY - 1.72, -14.08)]), { steps: 80, up: V(1, 0, 0), w: 0.22, h: 0.2, w2: 0.36, h2: 0.16, r: 0.5, seg: 5 }), M.tip, temples)

    // nose pad on a gold arm
    const ay = 0.35, ax = inRim(s, ay)
    const P = V(s * (GAP + 0.32), -0.12, -0.6)
    add(new THREE.TubeGeometry(curve([V(ax + s * 0.02, ay, -0.06), V(ax - s * 0.14, ay - 0.05, -0.3), V(P.x + s * 0.05, P.y + 0.12, P.z + 0.02)]), 24, 0.028, 10), M.gold)
    add(new THREE.BoxGeometry(0.1, 0.14, 0.08).translate(P.x + s * 0.04, P.y + 0.1, P.z), M.goldDim)
    add(new THREE.SphereGeometry(1, 32, 20).scale(0.15, 0.56, 0.075).rotateX(-0.15).rotateY(-s * 0.65).translate(P.x - s * 0.05, P.y - 0.05, P.z - 0.06), M.pad)
  }
  bend = null
  // bridge: a flat gold strip leaving each rim on the nose side, rising, then straight across near the top line
  {
    const y0 = 0.82, x0 = Math.abs(inRim(1, y0, R + 0.15))
    const pts = [V(-x0, y0, -0.06), V(-x0 + 0.08, y0 + 0.2, -0.06), V(-x0 + 0.12, 1.3, -0.06), V(-x0 + 0.32, 1.46, -0.06), V(0, 1.5, -0.06)]
    add(sweep(curve([...pts, ...pts.slice(0, -1).reverse().map(p => V(-p.x, p.y, p.z))]), { steps: 120, up: V(0, 0, 1), w: 0.1, h: 0.3, r: 0.35 }), M.gold)
  }

  // ── rest them upside down, the top of the rims on the table, posed like the light pair: the front stands upright
  // (so both pairs are seen from the same angle and the theme swap is seamless), and the temples swing down at the
  // hinges until they lie on the table, so the tips curl up ──
  const flip = new THREE.Group(), root = new THREE.Group(), hinge = new THREE.Group()
  hinge.position.set(0, HY, -0.5); temples.position.set(0, -HY, 0.5); hinge.add(temples)
  flip.add(front, hinge); flip.rotation.z = Math.PI
  root.add(flip)
  const lowest = (o) => { root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o, true).min.y }
  let lo = -0.4, hi = 0.4
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; hinge.rotation.x = mid; lowest(temples) > lowest(front) ? (lo = mid) : (hi = mid) }
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root, true)
  const pose = new THREE.Group()
  pose.add(root)
  root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  pose.updateMatrixWorld(true)
  return { root: pose, meshes, disposables }
}

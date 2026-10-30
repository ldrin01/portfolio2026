// Mayon Volcano as a miniature: a square of landscape cut out of the ground, like a museum diorama or a 3D map.
// The top is a heightfield (a broad, gently concave cone with radial gullies, an open summit crater with a rim and a
// glowing lava pool, farmland around it) coloured by height with faint contour lines; the four cut sides show
// layered ground. Lava wells over the rim and creeps slowly down a few gullies, glowing, then cools and fades,
// over and over. Drag to turn it; it turns slowly by itself. mountVolcano(canvas) returns a dispose function.

export async function mountVolcano(canvas) {
  const THREE = await import('three')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100)
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x5a4a38, 1.1))
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(-3, 5, 2.5); scene.add(sun)

  // ── the land ──────────────────────────────────────────────────────────────
  const S = 2.4, N = 200, BASE = -.42 // block half-size, grid resolution, bottom of the block
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v
  }
  const fbm = (x, y) => { let a = 0, f = 1, m = .5; for (let i = 0; i < 5; i++) { a += noise(x * f, y * f) * m; f *= 2.03; m *= .5 } return a }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const RIM = .2 // crater radius
  const cone = r => .95 * Math.exp(-r * 1.25) + .22 * Math.exp(-r * .5)
  const height = (x, z) => {
    const r = Math.hypot(x, z), th = Math.atan2(z, x)
    // a broad cone whose top is cut off at the crater rim
    let h = cone(Math.max(r, RIM))
    // radial gullies, deepest mid-slope
    const g = Math.pow(Math.abs(Math.sin(th * 11 + fbm(x * 1.5, z * 1.5) * 4)), 3)
    h -= g * .06 * Math.sin(Math.min(Math.PI, Math.max(0, r - RIM) * 2.4))
    // the rim, a little raised, and the hole inside it
    h += .035 * Math.exp(-Math.pow((r - RIM) / .05, 2))
    h -= .22 * (1 - smooth(RIM - .06, RIM, r))
    // farmland and small hills around
    h += (fbm(x * 1.2 + 10, z * 1.2) - .5) * .16 * Math.min(1, r * .9)
    return Math.max(.02, h) - .08
  }
  const top = new THREE.PlaneGeometry(S * 2, S * 2, N, N); top.rotateX(-Math.PI / 2)
  const tp = top.attributes.position, colors = []
  const C = { field: new THREE.Color('#6f9a45'), forest: new THREE.Color('#3f6b32'), scrub: new THREE.Color('#8a8150'), rock: new THREE.Color('#857869'), ash: new THREE.Color('#b5ada2'), pit: new THREE.Color('#3a302a'), line: new THREE.Color('#2a2420') }
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = height(x, z), r = Math.hypot(x, z); tp.setY(i, y)
    let c
    if (r < RIM - .02) c = C.pit.clone()
    else if (y < .1) c = C.field.clone().lerp(C.forest, fbm(x * 3, z * 3))
    else if (y < .3) c = C.forest.clone().lerp(C.scrub, (y - .1) / .2)
    else if (y < .6) c = C.scrub.clone().lerp(C.rock, (y - .3) / .3)
    else c = C.rock.clone().lerp(C.ash, Math.min(1, (y - .6) / .3))
    if (Math.abs(((y + 10) / .08) % 1 - .5) < .045 && r > RIM) c.lerp(C.line, .2) // a faint contour line
    colors.push(c.r, c.g, c.b)
  }
  top.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); top.computeVertexNormals()
  const land = new THREE.Group()
  land.add(new THREE.Mesh(top, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 })))

  // the lava pool inside the crater, glowing and slowly pulsing
  const pitY = height(0, 0)
  const pool = new THREE.Mesh(new THREE.CircleGeometry(RIM - .05, 40), new THREE.MeshBasicMaterial({ color: '#ff6a1a' }))
  pool.rotateX(-Math.PI / 2); pool.position.y = pitY + .03; land.add(pool)
  const glow = new THREE.PointLight('#ff6a1a', 1.6, 1.6); glow.position.set(0, pitY + .25, 0); land.add(glow)

  // the four cut faces: the edge of the land down to the base, in soil layers
  const strata = ['#5b4632', '#7a5f42', '#9a7d58', '#6a5a4a', '#8c7a63', '#4a3b2c']
  const sideGeo = (pts) => {
    const pos = [], col = [], idx = [], STEPS = 14
    pts.forEach(([x, z], k) => {
      const y = height(x, z)
      for (let j = 0; j <= STEPS; j++) {
        const yy = y + (BASE - y) * (j / STEPS)
        pos.push(x, yy, z)
        const band = Math.floor((yy - BASE) * 9 + fbm(x * 4, z * 4) * 1.4)
        const c = new THREE.Color(strata[((band % strata.length) + strata.length) % strata.length]).multiplyScalar(.85 + .15 * noise(x * 20, yy * 30))
        col.push(c.r, c.g, c.b)
        if (k && j) { const a = (k - 1) * (STEPS + 1) + j - 1, b = k * (STEPS + 1) + j - 1; idx.push(a, b, a + 1, b, b + 1, a + 1) }
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }
  const edge = fn => Array.from({ length: N + 1 }, (_, i) => fn(-S + (2 * S * i) / N))
  const soil = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })
  ;[edge(t => [t, S]), edge(t => [S, -t]), edge(t => [-t, -S]), edge(t => [-S, t])].forEach(p => land.add(new THREE.Mesh(sideGeo(p), soil)))
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2), new THREE.MeshStandardMaterial({ color: '#3a2e22' }))
  bottom.rotateX(Math.PI / 2); bottom.position.y = BASE; land.add(bottom)
  scene.add(land)

  // ── the lava: slow, glowing flows down a few gullies ─────────────────────
  const MAX = 2400
  const geo = new THREE.BufferGeometry(), lp = new Float32Array(MAX * 3), lc = new Float32Array(MAX * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(lp, 3)); geo.setAttribute('color', new THREE.BufferAttribute(lc, 3))
  land.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .075, vertexColors: true, map: softDot(THREE), transparent: true, depthWrite: false })))
  const FLOWS = [.5, 2.1, 3.6, 5.2].map(th => ({ th, reach: 0 })) // each flow creeps a little further over time
  const parts = []
  const step = (t) => {
    pool.material.color.setHSL(.05 + Math.sin(t * .8) * .01, 1, .5 + Math.sin(t * 1.3) * .04)
    glow.intensity = 1.4 + Math.sin(t * 1.3) * .3
    FLOWS.forEach((f) => { f.reach = Math.min(1.6, f.reach + .0009) })
    if (parts.length < MAX) for (const f of FLOWS) if (Math.random() < .55) {
      parts.push({ th: f.th + (Math.random() - .5) * .07, r: RIM + .01, max: RIM + f.reach * (.7 + Math.random() * .3), life: 0 })
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life++
      if (p.r < p.max) p.r += .0016 / (1 + (p.r - RIM) * 2.5) // slower as it spreads and cools
      p.th += (Math.random() - .5) * .002
      if (p.life > 900) parts.splice(i, 1)
    }
    for (let i = 0; i < MAX; i++) {
      const p = parts[i]
      if (!p) { lp[i * 3 + 1] = -99; continue }
      const x = Math.cos(p.th) * p.r, z = Math.sin(p.th) * p.r
      lp[i * 3] = x; lp[i * 3 + 1] = height(x, z) + .012; lp[i * 3 + 2] = z
      const cool = Math.min(1, Math.max((p.r - RIM) / 1.2, (p.life - 600) / 300)) // yellow-orange at the rim, dark red when cool
      lc[i * 3] = 1 - cool * .6; lc[i * 3 + 1] = .55 * (1 - cool) + .06; lc[i * 3 + 2] = .1 * (1 - cool)
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true
  }

  // ── view: framed so the whole block always fits; drag to turn ────────────
  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w) return
    renderer.setSize(w, h, false); camera.aspect = w / h
    const dist = 12.5 / Math.min(1, camera.aspect / 1.35) // pull back on narrow screens
    camera.position.set(0, dist * .5, dist * .87); camera.lookAt(0, .25, 0); camera.updateProjectionMatrix()
  }
  let yaw = -.5, want = -.5, held = null, lastTouch = 0
  const down = (e) => { held = { x: e.clientX, yaw: want }; lastTouch = performance.now(); canvas.setPointerCapture(e.pointerId) }
  const move = (e) => { if (held) { want = held.yaw + (e.clientX - held.x) * .008; lastTouch = performance.now() } }
  const up = () => { held = null }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)
  const ro = new ResizeObserver(fit); ro.observe(canvas); fit()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf = 0
  const clock = new THREE.Clock()
  const frame = () => {
    raf = requestAnimationFrame(frame)
    if (!held && !reduced && performance.now() - lastTouch > 2500) want += .001
    yaw += (want - yaw) * .08; land.rotation.y = yaw
    if (!reduced) step(clock.getElapsedTime())
    renderer.render(scene, camera)
  }
  const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) frame() }, { threshold: .05 })
  io.observe(canvas)
  if (reduced) for (let k = 0; k < 900; k++) step(k / 60) // show the flows already spread
  renderer.render(scene, camera)

  return () => {
    io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf)
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
    scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose() }) })
    renderer.dispose()
  }
}

// a soft round dot for the lava
function softDot(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g; x.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

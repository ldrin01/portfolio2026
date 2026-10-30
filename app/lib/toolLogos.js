// The video editor's rounded-square "Pr" icon as a small 3D object, extruded with a bevel, that sits inline in a big
// line of text on /about. It floats, wobbles, and leans toward the pointer. (The drawing app's balloon is a flat SVG:
// components/about/CorelBalloon.vue.) mountToolLogo(canvas, kind) returns a dispose function.

export async function mountToolLogo(canvas, kind) {
  const THREE = await import('three')
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(2, devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50)
  camera.position.set(0, 0, 7)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.4))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 4, 5); scene.add(sun)
  const rim = new THREE.DirectionalLight(0xbfd4ff, 1.2); rim.position.set(-4, 1, -3); scene.add(rim)

  const obj = premiere(THREE)
  scene.add(obj.group)

  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(fit); ro.observe(canvas); fit()

  const want = { x: 0, y: 0 }, now = { x: 0, y: 0 }
  let spin = 0, kick = 0
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    want.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / innerWidth * 2))
    want.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / innerHeight * 2))
  }
  const onEnter = () => { kick = Math.PI * 2 } // pointing at it gives it a full turn
  addEventListener('pointermove', onMove, { passive: true })
  canvas.addEventListener('pointerenter', onEnter)

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf = 0, vis = false
  const clock = new THREE.Clock()
  const frame = () => {
    raf = requestAnimationFrame(frame)
    const t = clock.getElapsedTime(), dt = Math.min(.05, clock.getDelta() || .016)
    now.x += (want.x - now.x) * .06; now.y += (want.y - now.y) * .06
    const k = kick * .06; kick -= k; spin += k + (reduced ? 0 : dt * .35)
    obj.group.rotation.y = obj.baseY + Math.sin(spin) * .5 + now.x * .5
    obj.group.rotation.x = obj.baseX + now.y * .35
    obj.group.position.y = reduced ? 0 : Math.sin(t * 1.2) * .08
    renderer.render(scene, camera)
  }
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; cancelAnimationFrame(raf); if (vis) frame() })
  io.observe(canvas)
  renderer.render(scene, camera)

  return () => {
    io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf)
    removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerenter', onEnter)
    scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose() }) })
    renderer.dispose()
  }
}

// ── the "Pr" icon ─────────────────────────────────────────────────────────────
function premiere(THREE) {
  const group = new THREE.Group()
  const s = 1.15, r = .3, shape = new THREE.Shape()
  shape.moveTo(-s + r, -s); shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r)
  shape.lineTo(s, s - r); shape.quadraticCurveTo(s, s, s - r, s); shape.lineTo(-s + r, s)
  shape.quadraticCurveTo(-s, s, -s, s - r); shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .34, bevelEnabled: true, bevelThickness: .07, bevelSize: .06, bevelSegments: 6, curveSegments: 16 })
  geo.center()
  // the face: deep navy with a lavender "Pr" and a thin lavender frame, drawn on a canvas
  const c = document.createElement('canvas'); c.width = c.height = 1024
  const x = c.getContext('2d')
  x.fillStyle = '#00005b'; x.fillRect(0, 0, 1024, 1024)
  x.strokeStyle = '#9999ff'; x.lineWidth = 26; x.beginPath(); x.roundRect(70, 70, 884, 884, 110); x.stroke()
  x.fillStyle = '#9999ff'; x.font = '600 470px "Helvetica Neue", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText('Pr', 512, 560)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  // the face UVs are in shape units (-s … s): map them onto the canvas
  tex.repeat.set(1 / (2 * s), 1 / (2 * s)); tex.offset.set(.5, .5)
  const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: 1, clearcoatRoughness: .15 })
  const side = new THREE.MeshPhysicalMaterial({ color: '#0b0b4a', roughness: .3, metalness: .2, clearcoat: .8 })
  group.add(new THREE.Mesh(geo, [face, side]))
  return { group, baseX: .1, baseY: -.35 }
}

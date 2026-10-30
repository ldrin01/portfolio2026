<script setup lang="ts">
import { keyboardRows } from '~/data/keyboard'

const keyboardCopy = useSite().keyboard

// A creative break: the desk keyboard as a 3D outline. It tilts with the mouse, the scroll and the
// phone's tilt, and the visitor's own key presses push the matching keys down.
// three.js is only loaded when the frame gets close to the screen.

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const needsTiltPermission = ref(false) // iOS only lets a page read the tilt after a tap
const tiltOn = ref(false)

// the line typed out behind the keyboard: split into words so it only ever wraps between them
const typedText = keyboardCopy.typed
const typedWords = typedText.split(' ').reduce<{ ch: string; i: number }[][]>((words, w, wi) => {
  const start = words.flat().length + wi // index of this word's first character in the full line
  words.push([...w].map((ch, k) => ({ ch, i: start + k })))
  return words
}, [])
const typed = ref(0) // how many characters are showing

let dispose: (() => void) | null = null

onMounted(() => {
  const near = new IntersectionObserver(async ([e]) => {
    if (!e?.isIntersecting) return
    near.disconnect()
    dispose = await start()
  }, { rootMargin: '600px 0px' })
  if (root.value) near.observe(root.value)
  dispose = () => near.disconnect()
})
onBeforeUnmount(() => dispose?.())

let requestTilt: () => void = () => {}

async function start() {
  const [THREE, { LineSegments2 }, { LineSegmentsGeometry }, { LineMaterial }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/lines/LineSegments2.js'),
    import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
    import('three/examples/jsm/lines/LineMaterial.js')
  ])
  const el = stage.value
  if (!el) return () => {}

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const css = getComputedStyle(document.documentElement)
  const color = (name: string) => new THREE.Color(css.getPropertyValue(name).trim() || '#fff')
  const bg = color('--bg')

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) // see-through, so the typed line shows behind
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(bg, 0)
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const fog = new THREE.Fog(bg, 18, 42) // the back of the board fades: a depth cue for plain lines (set per view in place())
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200)

  const line = (name: string, opacity: number, linewidth: number) => {
    const m = new LineMaterial({ color: color(name).getHex(), transparent: true, opacity, linewidth, worldUnits: false, fog: true })
    m.userData.token = name // the colour token, so a theme switch can repaint it
    return m
  }
  // line weights: key tops and the case's outer contour are bold, sides and inner details thin
  const mats = {
    top: line('--fg', 0.95, 1.5),
    side: line('--fg', 0.5, 0.9),
    topOn: line('--accent', 1, 2),
    sideOn: line('--accent', 0.75, 1.2),
    glow: line('--accent', 0.4, 1), // the LED ring around each switch
    glowOn: line('--accent', 0.95, 1.8),
    caseBold: line('--fg', 0.75, 1.5),
    caseMid: line('--muted', 0.6, 1),
    caseThin: line('--muted', 0.35, 0.8)
  }
  // every shape also gets an invisible solid body in the background color: it hides the lines behind it,
  // so only the edges you would really see are drawn. Pushed back a hair so its own outline stays on top.
  const solid = new THREE.MeshBasicMaterial({ color: bg, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })

  // ── geometry: rings of points, joined into outlines and solid bodies ──
  type P = [number, number, number]
  interface Ring { pts: P[]; corners: number[] } // corners: the 45° point of each rounded corner
  // a rounded rectangle at height y; straight edges get nx / nz extra points so they can bend (the dish)
  function ring(w: number, d: number, r: number, y: number, nx: number, nz: number, z0 = 0): Ring {
    const pts: P[] = []
    const corners: number[] = []
    const hx = w / 2 - r, hz = d / 2 - r
    const cs: [number, number, number][] = [[hx, hz, 0], [-hx, hz, 90], [-hx, -hz, 180], [hx, -hz, 270]]
    cs.forEach(([cx, cz, a0], k) => {
      for (let s = 0; s <= 4; s++) {
        if (s === 2) corners.push(pts.length)
        const a = ((a0 + s * 22.5) * Math.PI) / 180
        pts.push([cx + Math.cos(a) * r, y, z0 + cz + Math.sin(a) * r])
      }
      // the straight edge from the end of this arc to the start of the next corner's arc
      const [ncx, ncz] = cs[(k + 1) % 4]!
      const a = ((a0 + 90) * Math.PI) / 180
      const sx = cx + Math.cos(a) * r, sz = z0 + cz + Math.sin(a) * r
      const ex = ncx + Math.cos(a) * r, ez = z0 + ncz + Math.sin(a) * r
      const n = k % 2 ? nz : nx // edges alternate: along x, along z, along x, along z
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1)
        pts.push([sx + (ex - sx) * t, y, sz + (ez - sz) * t])
      }
    })
    return { pts, corners }
  }
  const shape = (rg: Ring, f: (p: P) => number): Ring => ({ corners: rg.corners, pts: rg.pts.map(p => [p[0], p[1] + f(p), p[2]] as P) })
  const loop = (rg: Ring) => rg.pts.flatMap((p, i) => [...p, ...rg.pts[(i + 1) % rg.pts.length]!])
  const edges = (a: Ring, b: Ring) => a.corners.flatMap(i => [...a.pts[i]!, ...b.pts[i]!])
  const lines = (positions: number[]) => new LineSegmentsGeometry().setPositions(positions)

  // a solid body through rings (all with the same point count), capped with fans at the given rings
  interface Body { pos: number[]; idx: number[] }
  function body(rings: Ring[], caps: { ring: number; center: P }[], into: Body = { pos: [], idx: [] }, off: P = [0, 0, 0]) {
    const base = into.pos.length / 3
    const n = rings[0]!.pts.length
    for (const rg of rings) for (const p of rg.pts) into.pos.push(p[0] + off[0], p[1] + off[1], p[2] + off[2])
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < n; i++) {
        const a = base + r * n + i, b = base + r * n + ((i + 1) % n), c = a + n, d = b + n
        into.idx.push(a, b, c, b, d, c)
      }
    }
    for (const { ring: r, center } of caps) {
      const ci = into.pos.length / 3
      into.pos.push(center[0] + off[0], center[1] + off[1], center[2] + off[2])
      for (let i = 0; i < n; i++) into.idx.push(ci, base + r * n + i, base + r * n + ((i + 1) % n))
    }
    return into
  }
  function mesh({ pos, idx }: Body) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    return g
  }

  // ── keycaps: a sculpted profile like the real board. Each row has its own height and its top tilts,
  // so the rows form a gentle wave; the tops are dished (scooped side to side) ──
  const PLATE = 0          // the switch plate
  const SWITCH = 0.14      // top of the switch housings
  const CAP = 0.2          // bottom of the caps
  const ROW_H = [0.6, 0.58, 0.52, 0.48, 0.5, 0.52]  // back (F-row) to front (space row)
  const ROW_TILT = [11, 8, 4, 0, -4, -7]             // degrees; positive faces the front
  const PRESS = 0.16

  type LSG = InstanceType<typeof LineSegmentsGeometry>
  const disposables: { dispose(): void }[] = []
  const cache = new Map<string, { top: LSG; side: LSG; body: InstanceType<typeof THREE.BufferGeometry>; glow: LSG; h: number }>()
  function keyGeo(w: number, d: number, row: number) {
    const id = `${w}x${d}r${row}`
    if (!cache.has(id)) {
      const tall = d > 1
      const h = tall ? (ROW_H[row]! + ROW_H[row + 1]!) / 2 : ROW_H[row]!
      const tilt = Math.tan(((tall ? 0 : ROW_TILT[row]!) * Math.PI) / 180)
      const dish = w > 3 ? 0.012 : 0.045
      const bw = w - 0.12, bd = d - 0.12
      const tw = bw - 0.3, td = bd - 0.36, tz = -0.04 // tapered, leaning back a touch
      const nx = Math.max(2, Math.round(bw / 0.18)), nz = Math.max(2, Math.round(bd / 0.18))
      const bottom = ring(bw, bd, 0.08, 0, nx, nz)
      const top = shape(ring(tw, td, 0.12, h, nx, nz, tz), ([x, , z]) => -(z - tz) * tilt - dish * (1 - (x / (tw / 2)) ** 2))
      const g = {
        top: lines(loop(top)),
        side: lines([...loop(bottom), ...edges(bottom, top)]),
        body: mesh(body([bottom, top], [{ ring: 1, center: [0, h - dish, tz] }])),
        glow: lines(loop(ring(0.84, 0.84, 0.12, PLATE + 0.005, 2, 2))),
        h
      }
      disposables.push(g.top, g.side, g.body, g.glow)
      cache.set(id, g)
    }
    return cache.get(id)!
  }

  const COLS = 19
  const ROWS = keyboardRows.length
  type L2 = InstanceType<typeof LineSegments2>
  interface Key { code: string; group: InstanceType<typeof THREE.Group>; top: L2; side: L2; glow: L2; x: number; z: number; w: number; d: number; h: number; p: number; on: boolean; lit: boolean; flash: number; delay: number }
  const keys: Key[] = []
  const board = new THREE.Group()
  scene.add(board)

  // switch housings: one merged outline and one merged solid, since they never move
  const swRingLo = ring(0.62, 0.62, 0.06, PLATE, 2, 2)
  const swRingHi = ring(0.62, 0.62, 0.06, SWITCH, 2, 2)
  const swLines: number[] = []
  const swBody: Body = { pos: [], idx: [] }

  keyboardRows.forEach((row, r) => {
    let col = 0
    for (const [code, w = 1, d = 1] of row) {
      const g = keyGeo(w, d, r)
      const x = col + w / 2 - COLS / 2
      const z = r + d / 2 - ROWS / 2
      const group = new THREE.Group()
      group.position.set(x, CAP, z)
      const top = new LineSegments2(g.top, mats.top)
      const side = new LineSegments2(g.side, mats.side)
      group.add(new THREE.Mesh(g.body, solid), top, side)
      board.add(group)
      const glow = new LineSegments2(g.glow, mats.glow)
      glow.position.set(x, 0, z)
      board.add(glow)
      // one switch per key; long keys get theirs in the middle, like the real stabilized ones
      for (const p of loop(swRingHi).map((v, i) => v + (i % 3 === 0 ? x : i % 3 === 2 ? z : 0))) swLines.push(p)
      body([swRingLo, swRingHi], [{ ring: 1, center: [0, SWITCH, 0] }], swBody, [x, 0, z])
      keys.push({ code, group, top, side, glow, x, z, w, d, h: g.h, p: 0, on: false, lit: false, flash: 0, delay: (col / COLS) * 0.7 + r * 0.05 })
      col += w
    }
  })
  const swLineGeo = lines(swLines)
  const swMeshGeo = mesh(swBody)
  disposables.push(swLineGeo, swMeshGeo)
  board.add(new THREE.Mesh(swMeshGeo, solid), new LineSegments2(swLineGeo, mats.caseThin))

  // ── the case: a chamfered foot, straight outer wall, a stepped rim, then the inner wall down to the plate ──
  const cnx = Math.round(COLS / 0.5), cnz = Math.round(ROWS / 0.5)
  const cr = (inset: number, r: number, y: number) => ring(COLS + inset, ROWS + inset, r, y, cnx, cnz)
  const foot = cr(0.44, 0.3, -0.56)
  const wallLo = cr(0.6, 0.36, -0.44)
  const wallHi = cr(0.6, 0.36, 0.2)
  const stepLo = cr(0.38, 0.27, 0.2)
  const stepHi = cr(0.38, 0.27, 0.34)
  const rim = cr(0.14, 0.16, 0.34)
  const floor = cr(0.14, 0.16, PLATE)
  const caseMesh = mesh(body([foot, wallLo, wallHi, stepLo, stepHi, rim, floor], [{ ring: 6, center: [0, PLATE, 0] }, { ring: 0, center: [0, -0.56, 0] }]))
  const caseBold = lines([...loop(wallHi), ...loop(rim)])
  const caseMid = lines([...loop(stepHi), ...loop(wallLo), ...edges(wallLo, wallHi), ...edges(stepLo, stepHi)])
  const caseThin = lines([...loop(foot), ...loop(stepLo), ...edges(foot, wallLo), ...edges(rim, floor)])
  disposables.push(caseMesh, caseBold, caseMid, caseThin)
  board.add(new THREE.Mesh(caseMesh, solid), new LineSegments2(caseBold, mats.caseBold), new LineSegments2(caseMid, mats.caseMid), new LineSegments2(caseThin, mats.caseThin))

  // ── view: elevation follows the scroll, yaw and pitch follow the mouse or the phone's tilt ──
  const view = { el: 0.3, yaw: 0, pitch: 0 }
  const target = { el: 0.3, yaw: 0, pitch: 0 }
  let input = { x: 0, y: 0 }

  function fit() {
    const w = el!.clientWidth
    const h = el!.clientHeight
    renderer.setSize(w, h)
    for (const m of Object.values(mats)) m.resolution.set(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    readScroll()
    kick()
  }
  // Fit: the whole board must always be on screen, whatever the angle. Project the corners of its
  // bounding box, move the camera back or forward until they fill the frame with a margin, then
  // shift the view so the board sits in the middle.
  const bounds: InstanceType<typeof THREE.Vector3>[] = []
  for (const x of [-1, 1]) for (const y of [-0.56, CAP + 0.7]) for (const z of [-1, 1]) bounds.push(new THREE.Vector3(x * (COLS + 0.6) / 2, y, z * (ROWS + 0.6) / 2))
  const pt = new THREE.Vector3()
  const FILL = { x: 0.86, y: 0.8 } // share of the frame the board may take
  function place() {
    const el_ = view.el + view.pitch
    const dir = new THREE.Vector3(Math.sin(view.yaw) * Math.cos(el_), Math.sin(el_), Math.cos(view.yaw) * Math.cos(el_))
    const w = el!.clientWidth, h = el!.clientHeight
    camera.clearViewOffset()
    let dist = 30, cx = 0, cy = 0
    for (let i = 0; i < 4; i++) {
      camera.position.copy(dir).multiplyScalar(dist)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
      for (const b of bounds) {
        pt.copy(b).project(camera)
        x0 = Math.min(x0, pt.x); x1 = Math.max(x1, pt.x); y0 = Math.min(y0, pt.y); y1 = Math.max(y1, pt.y)
      }
      cx = (x0 + x1) / 2; cy = (y0 + y1) / 2
      dist *= Math.max((x1 - x0) / 2 / FILL.x, (y1 - y0) / 2 / FILL.y)
    }
    camera.position.copy(dir).multiplyScalar(dist)
    camera.lookAt(0, 0, 0)
    camera.setViewOffset(w, h, (cx * w) / 2, (-cy * h) / 2, w, h)
    fog.near = dist - 2
    fog.far = dist + 24
  }

  // The frame is a pinned scene: the keyboard stays on screen while the page scrolls through it.
  // `scroll` is how far through the scene the page is (0 → 1); `play` follows it with inertia, so the
  // keyboard glides on for a moment after the scroll stops and trails further behind a hard flick.
  let scroll = 0
  let play = 0
  function readScroll() {
    const r = root.value!.getBoundingClientRect()
    const travel = r.height - window.innerHeight
    scroll = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0.5
    // the keys drop in once the frame has (nearly) taken the screen, so the entrance is never missed
    if (intro < 0 && r.top < window.innerHeight * 0.2) intro = 0
  }
  function readInput() {
    target.yaw = reduce ? 0 : input.x * 0.26
    target.pitch = reduce ? 0 : -input.y * 0.1
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  // the scene at a point in the scroll: low eye level like the photo → a sweep around and up →
  // nearly top-down. Narrow screens start higher: the board is so wide there that a low view is a thin strip.
  function pose(t: number) {
    const narrow = window.innerWidth <= 800
    const e = smooth(t)
    return {
      // a natural seated view of the keys to start, rising to a high three-quarter view (never top-down)
      el: THREE.MathUtils.degToRad(narrow ? 30 + e * 26 : 22 + e * 30),
      yaw: -0.36 * Math.cos(Math.PI * t) * (1 - e * 0.4)
    }
  }
  // The line behind the keyboard types itself out through the middle of the scroll. Each new letter taps
  // its key on the board (with shift for capitals); scrolling back taps backspace as letters disappear.
  const TYPE = { from: 0.12, to: 0.78 }
  const codeFor = (c: string) => c === ' ' ? 'Space' : c === '.' ? 'Period' : c === ',' ? 'Comma' : /[a-z]/i.test(c) ? `Key${c.toUpperCase()}` : ''
  function tap(code: string, now: number) {
    const k = byCode.get(code)
    if (k) k.flash = now + 170
  }
  function typeTo(n: number, now: number) {
    if (n === typed.value) return
    if (n > typed.value) {
      const c = typedText[n - 1]!
      tap(codeFor(c), now)
      if (c !== c.toLowerCase()) tap('ShiftLeft', now)
    } else tap('Backspace', now)
    typed.value = n
  }

  // ── keys: press from the keyboard, or a tap/click on the board ──
  function light(k: Key, lit: boolean) {
    if (k.lit === lit) return
    k.lit = lit
    k.top.material = lit ? mats.topOn : mats.top
    k.side.material = lit ? mats.sideOn : mats.side
    k.glow.material = lit ? mats.glowOn : mats.glow
  }
  const byCode = new Map(keys.filter(k => k.code).map(k => [k.code, k]))
  function press(k: Key | undefined, on: boolean) {
    if (!k || k.on === on) return
    k.on = on
    if (reduce) k.p = on ? 1 : 0
    kick()
  }
  const onKeyDown = (e: KeyboardEvent) => press(byCode.get(e.code), true)
  const onKeyUp = (e: KeyboardEvent) => press(byCode.get(e.code), false)
  const releaseAll = () => keys.forEach(k => press(k, false))

  const ray = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(CAP + 0.52))
  const hit = new THREE.Vector3()
  function onTap(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    if (!ray.ray.intersectPlane(plane, hit)) return
    const k = keys.find(k => Math.abs(hit.x - k.x) < k.w / 2 && Math.abs(hit.z - k.z) < k.d / 2)
    if (!k) return
    press(k, true)
    setTimeout(() => press(k, false), 180)
  }

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    input = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 }
    readInput(); kick()
  }
  let tiltBase: number | null = null
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return
    tiltBase ??= e.beta
    input = { x: Math.max(-1, Math.min(1, e.gamma / 30)), y: Math.max(-1, Math.min(1, (e.beta - tiltBase) / 30)) }
    readInput(); kick()
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  if (coarse && DOE?.requestPermission) needsTiltPermission.value = true
  else if (coarse) { window.addEventListener('deviceorientation', onTilt); tiltOn.value = true }
  requestTilt = async () => {
    try {
      if ((await DOE!.requestPermission!()) === 'granted') { window.addEventListener('deviceorientation', onTilt); tiltOn.value = true }
    } catch { /* stays on scroll only */ }
  }

  // ── frame loop: only runs while something is still moving ──
  let intro = reduce ? 1 : -1 // -1: waiting to be seen; then 0 → 1 as the keys drop into place
  let introStart = 0
  let raf = 0
  function frame(t: number) {
    raf = 0
    let moving = false
    const ease = (from: number, to: number, k: number) => { const n = from + (to - from) * k; if (Math.abs(to - n) > 0.0005) moving = true; else return to; return n }
    play = reduce ? scroll : ease(play, scroll, 0.06)
    const sc = pose(play)
    target.el = sc.el
    const yaw = sc.yaw + target.yaw // the scene's sweep plus the mouse / tilt
    if (reduce) Object.assign(view, target, { yaw })
    else { view.el = ease(view.el, target.el, 0.12); view.yaw = ease(view.yaw, yaw, 0.08); view.pitch = ease(view.pitch, target.pitch, 0.08) }

    if (intro >= 0 && intro < 1) {
      if (!introStart) introStart = t
      intro = Math.min(1, (t - introStart) / 1600)
      moving = true
    }
    const tp = Math.min(1, Math.max(0, (play - TYPE.from) / (TYPE.to - TYPE.from)))
    typeTo(reduce ? typedText.length : Math.round(tp * typedText.length), t)
    for (const k of keys) {
      const tapped = k.flash > t
      if (tapped) moving = true
      const goal = k.on || tapped ? 1 : 0
      if (!reduce) k.p = ease(k.p, goal, goal > k.p ? 0.45 : 0.2)
      light(k, k.on || tapped)
      let drop = 0
      if (intro < 1) {
        const local = Math.min(1, Math.max(0, (intro * 1.6 - k.delay) / 0.6))
        drop = (1 - local) ** 3 * 2.4
        k.group.visible = intro >= 0 && local > 0
      } else k.group.visible = true
      k.group.position.y = CAP + drop - PRESS * k.p
      k.glow.visible = k.group.visible
    }
    place()
    renderer.render(scene, camera)
    if (moving && live) raf = requestAnimationFrame(frame)
  }
  function kick() { if (!raf && live) raf = requestAnimationFrame(frame) }

  // only listen and draw while the frame is on screen
  let live = false
  const onScroll = () => { readScroll(); kick() }
  const visible = new IntersectionObserver(([e]) => {
    const on = !!e?.isIntersecting
    if (on === live) return
    live = on
    const m = on ? 'addEventListener' : 'removeEventListener'
    window[m]('scroll', onScroll, { passive: true })
    window[m]('pointermove', onPointer as EventListener, { passive: true })
    window[m]('keydown', onKeyDown as EventListener)
    window[m]('keyup', onKeyUp as EventListener)
    window[m]('blur', releaseAll)
    if (on) {
      readScroll(); play = scroll; Object.assign(view, pose(play)); kick()
    } else releaseAll()
  }, { threshold: [0, 0.25] })
  if (root.value) visible.observe(root.value)
  renderer.domElement.addEventListener('pointerdown', onTap)

  const ro = new ResizeObserver(fit)
  ro.observe(el)

  // the theme flips the colour tokens: repaint the lines, the hiding bodies and the fog to match
  const repaint = () => {
    Object.values(mats).forEach(m => m.color.copy(color(m.userData.token)))
    const b = color('--bg')
    solid.color.copy(b); fog.color.copy(b); renderer.setClearColor(b, 0)
    kick()
  }
  const themeWatch = new MutationObserver(repaint)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  readScroll(); readInput(); fit()

  return () => {
    visible.disconnect()
    ro.disconnect()
    themeWatch.disconnect()
    live = false
    if (raf) cancelAnimationFrame(raf)
    for (const ev of ['scroll', 'pointermove', 'keydown', 'keyup', 'blur', 'deviceorientation'] as const) window.removeEventListener(ev, (({ scroll: onScroll, pointermove: onPointer, keydown: onKeyDown, keyup: onKeyUp, blur: releaseAll, deviceorientation: onTilt }) as Record<string, EventListener>)[ev]!)
    disposables.forEach(d => d.dispose())
    solid.dispose()
    Object.values(mats).forEach(m => m.dispose())
    renderer.dispose()
    renderer.domElement.remove()
  }
}
</script>

<template>
  <section id="desk" ref="root" class="desk" aria-label="My keyboard, drawn in 3D">
    <div class="pin">
      <h2 class="typed wrap" :aria-label="typedText">
        <template v-for="(word, wi) in typedWords" :key="wi">
          <span class="word" aria-hidden="true"><template v-for="c in word" :key="c.i"><span v-if="c.i === typed" class="caret" /><span class="ch" :class="{ shown: c.i < typed }">{{ c.ch }}</span></template></span>{{ ' ' }}
        </template><span v-if="typed >= typedText.length" class="caret" aria-hidden="true" />
      </h2>
      <div ref="stage" class="stage" />
      <p v-lag="1" class="hint">
        <button v-if="needsTiltPermission && !tiltOn" type="button" class="tilt" @click="requestTilt">{{ keyboardCopy.tilt }}</button>
        <span class="keys-hint">{{ keyboardCopy.hintKeys }}</span>
        <span class="touch-hint">{{ keyboardCopy.hintTouch }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
/* a tall frame with a screen-high pin inside: the page scrolls through the scene while the keyboard stays put */
.desk { display: block; height: 250vh; height: 250svh; min-height: 0; padding: 0; text-align: center; }
.pin { position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: clamp(56px, 9vh, 96px) 0 clamp(32px, 6vh, 64px); }
/* the typed line: big and bold, above the board and tucked behind its back edge (the board's solid bodies hide what they cover) */
.typed {
  position: relative; z-index: 0; margin: 0 auto; width: 100%; max-width: 1400px;
  font-size: clamp(40px, 7vw, 120px); font-weight: 800; letter-spacing: -.035em; line-height: .95; text-align: center;
  color: var(--fg); pointer-events: none;
}
.word { display: inline-block; white-space: nowrap; }
.ch { visibility: hidden; } /* every letter keeps its place, so the line never re-wraps while typing */
.ch.shown { visibility: visible; }
.caret { position: relative; display: inline-block; width: 0; height: .8em; vertical-align: baseline; }
.caret::before { content: ''; position: absolute; left: .02em; bottom: -.06em; width: .07em; height: .9em; background: var(--accent); animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.stage { z-index: 1; margin-top: calc(-1 * clamp(24px, 7vh, 80px)); }
.stage { position: relative; width: 100%; flex: 1 1 auto; min-height: 0; cursor: pointer; touch-action: pan-y; } /* takes all the height between the eyebrow and the hint */
.stage :deep(canvas) { display: block; width: 100%; height: 100%; }
.hint { margin: 0; display: flex; gap: 16px; align-items: center; justify-content: center; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.touch-hint { display: none; }
@media (hover: none) { .keys-hint { display: none; } .touch-hint { display: inline; } }
.tilt { font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; min-height: 44px; padding: 0 16px; cursor: pointer; }
@media (max-width: 800px) {
  .desk { height: 180vh; height: 180svh; padding: 0; } /* shorter on phones, so it never feels like the scroll is stuck */
  .stage { flex: 0 0 auto; height: max(260px, 72vw); }
}
</style>

<script setup lang="ts">
// A working paint program in an old-school window, drawn the way the real one worked: a plain pixel bitmap with no
// smoothing, so every line is chunky and every fill is exact. Ten tools, a 28-colour palette (left click picks the
// main colour, right click or long press the second), undo and redo, flips, invert, and Save as a PNG.
// Keys work while the window has focus: letters pick tools, Ctrl+Z / Ctrl+Y undo and redo, Ctrl+S saves, [ ] resize.
type Tool = 'eraser' | 'fill' | 'picker' | 'pencil' | 'brush' | 'airbrush' | 'line' | 'rect' | 'ellipse' | 'roundrect'
const TOOLS: { id: Tool; label: string; key: string; hint: string; icon: string }[] = [
  { id: 'eraser', label: 'Eraser', key: 'e', hint: 'Erases a portion of the picture, using the selected eraser size.',
    icon: '<path d="M1.5 9.5l6-6 7 7-4.500 4.500h-4z" fill="#fff" stroke="#000"/><path d="M4 11.500l4-4 4 4-3 3H7z" fill="#f48fb1"/>' },
  { id: 'fill', label: 'Fill With Color', key: 'f', hint: 'Fills an area with the current drawing color.',
    icon: '<path d="M2.500 8.500l5-5 6 6-5 5z" fill="#fff" stroke="#000"/><path d="M3.500 8.500h8l-3 3z" fill="#00f"/><path d="M12.500 11.500c1.500 2 1.500 3 0 3.500-1.500-.5-1.500-1.500 0-3.500z" fill="#00f" stroke="#00f"/>' },
  { id: 'picker', label: 'Pick Color', key: 'i', hint: 'Picks up a color from the picture for drawing.',
    icon: '<path d="M10.500 1.500l4 4-1.500 1.500-1-1-4 4-2-2 4-4-1-1z" fill="#fff" stroke="#000"/><path d="M6.500 8.500l1.500 1.500-4 4-2 .5.500-2z" fill="#808080" stroke="#000"/>' },
  { id: 'pencil', label: 'Pencil', key: 'p', hint: 'Draws a free-form line one pixel wide.',
    icon: '<path d="M2.500 13.500l1-4 7-7 3 3-7 7z" fill="#ff0" stroke="#000"/><path d="M2.500 13.500l1-4 3 3z" fill="#f5cc8a" stroke="#000"/><path d="M2.500 13.500l.5-2 1.500 1.500z" fill="#000"/>' },
  { id: 'brush', label: 'Brush', key: 'b', hint: 'Draws using a brush with the selected shape and size.',
    icon: '<path d="M14.500 1.500l1 1-6 6.500-2-2z" fill="#808080" stroke="#000"/><path d="M6.500 7.500l2 2c-.5 2.500-2 4-5 4.500 1-1.500.5-2.500.5-3.500 0-1.500 1.200-3 2.500-3z" fill="#00f" stroke="#000"/>' },
  { id: 'airbrush', label: 'Airbrush', key: 'a', hint: 'Draws using an airbrush of the selected size.',
    icon: '<path d="M3.500 7.500h6v7h-6z" fill="#c0c0c0" stroke="#000"/><path d="M5.500 4.500h2v3h-2z" fill="#808080" stroke="#000"/><path d="M10 3h1v1h-1zM12 5h1v1h-1zM12 2h1v1h-1zM14 3h1v1h-1zM11 7h1v1h-1zM14 6h1v1h-1z"/>' },
  { id: 'line', label: 'Line', key: 'l', hint: 'Draws a straight line with the selected line width.',
    icon: '<path d="M2 14L14 2" stroke="#000" fill="none"/>' },
  { id: 'rect', label: 'Rectangle', key: 'r', hint: 'Draws a rectangle with the selected fill style.',
    icon: '<rect x="2.500" y="4.500" width="11" height="8" fill="none" stroke="#000"/>' },
  { id: 'ellipse', label: 'Ellipse', key: 'o', hint: 'Draws an ellipse with the selected fill style.',
    icon: '<ellipse cx="8" cy="8.500" rx="6" ry="4.500" fill="none" stroke="#000"/>' },
  { id: 'roundrect', label: 'Rounded Rectangle', key: 'u', hint: 'Draws a rounded rectangle with the selected fill style.',
    icon: '<rect x="2.500" y="4.500" width="11" height="8" rx="3" fill="none" stroke="#000"/>' }
]
const SHAPES: Tool[] = ['rect', 'ellipse', 'roundrect']
const FREE: Tool[] = ['pencil', 'brush', 'eraser']
const PALETTE = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#4000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040']
// the four size choices, per kind of tool
const BARS = [1, 2, 3, 5]
const BRUSH = [2, 4, 6, 9], ERASER = [4, 6, 8, 12], AIR = [4, 7, 10, 14]
const MENUS = ['File', 'Edit', 'Image', 'Help'] as const
type Item = { label: string; keys?: string; run: () => void; off?: boolean } | '-'
const IDLE = 'For Help, click Help Topics on the Help Menu.'
const W = 720, H = 440, KEEP = 20

const root = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const okBtn = ref<HTMLButtonElement>()
const tool = ref<Tool>('pencil')
const fg = ref('#000000'), bg = ref('#ffffff')
const size = ref(1), fillStyle = ref(0)
const pos = ref(''), dims = ref(''), hint = ref(IDLE)
const menu = ref<string>(''), about = ref(false)
const canUndo = ref(false), canRedo = ref(false)

let ctx: CanvasRenderingContext2D | null = null
let drawing = false, changed = false, before: Tool = 'pencil'
let base: ImageData | null = null
let start: [number, number] = [0, 0], last: [number, number] = [0, 0]
let mainCol = '#000000', altCol = '#ffffff'
let airTimer = 0
const undos: ImageData[] = [], redos: ImageData[] = []

const isShape = computed(() => SHAPES.includes(tool.value))
const hasSize = computed(() => ['eraser', 'brush', 'airbrush', 'line'].includes(tool.value) || isShape.value)
const width = computed(() => (tool.value === 'brush' ? BRUSH : tool.value === 'eraser' ? ERASER : tool.value === 'airbrush' ? AIR : tool.value === 'pencil' ? [1, 1, 1, 1] : BARS)[size.value]!)

const snap = () => ctx!.getImageData(0, 0, W, H)
const sync = () => { canUndo.value = undos.length > 0; canRedo.value = redos.length > 0 }
const record = (img: ImageData) => { undos.push(img); if (undos.length > KEEP) undos.shift(); redos.length = 0; sync() }
const blank = () => { ctx!.fillStyle = '#ffffff'; ctx!.fillRect(0, 0, W, H) }
onMounted(() => { ctx = canvas.value!.getContext('2d', { willReadFrequently: true }); ctx!.imageSmoothingEnabled = false; blank() })
onBeforeUnmount(() => clearInterval(airTimer))

// pixel drawing: a dot stamps the brush shape, a trace walks a line of dots with no smoothing
const dot = (x: number, y: number, w: number, round: boolean) => {
  const c = ctx!
  if (w <= 1) return c.fillRect(x, y, 1, 1)
  const o = Math.floor(w / 2)
  if (!round) return c.fillRect(x - o, y - o, w, w)
  const r = w / 2
  for (let j = 0; j < w; j++) {
    const dy = j + 0.5 - r, x0 = Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy)))
    c.fillRect(x - o + x0, y - o + j, w - 2 * x0, 1)
  }
}
const trace = (a: [number, number], b: [number, number], w: number, round: boolean, each?: (x: number, y: number) => void) => {
  let [x, y] = a
  const dx = Math.abs(b[0] - x), dy = -Math.abs(b[1] - y), sx = x < b[0] ? 1 : -1, sy = y < b[1] ? 1 : -1
  let err = dx + dy
  for (;;) {
    if (each) each(x, y); else dot(x, y, w, round)
    if (x === b[0] && y === b[1]) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x += sx }
    if (e2 <= dx) { err += dx; y += sy }
  }
}
const spray = () => {
  const c = ctx!, r = AIR[size.value]!
  c.fillStyle = mainCol
  for (let i = 0; i < r * 2; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r
    c.fillRect(Math.round(last[0] + Math.cos(a) * d), Math.round(last[1] + Math.sin(a) * d), 1, 1)
  }
}

// paint bucket: fills the touching pixels of exactly the same colour, row by row
const pack = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0 }
const flood = (x: number, y: number, hex: string) => {
  const img = snap(), d = new Uint32Array(img.data.buffer), target = d[y * W + x]!, val = pack(hex)
  if (target === val) return false
  const stack = [x, y]
  while (stack.length) {
    const py = stack.pop()!, px = stack.pop()!, row = py * W
    if (d[row + px] !== target) continue
    let l = px, r = px
    while (l > 0 && d[row + l - 1] === target) l--
    while (r < W - 1 && d[row + r + 1] === target) r++
    for (let k = l; k <= r; k++) d[row + k] = val
    for (const ny of [py - 1, py + 1]) {
      if (ny < 0 || ny >= H) continue
      let inside = false
      for (let k = l; k <= r; k++) {
        const m = d[ny * W + k] === target
        if (m && !inside) stack.push(k, ny)
        inside = m
      }
    }
  }
  ctx!.putImageData(img, 0, 0)
  return true
}
const pick = (x: number, y: number) => {
  const p = ctx!.getImageData(x, y, 1, 1).data
  return '#' + [p[0]!, p[1]!, p[2]!].map(v => v.toString(16).padStart(2, '0')).join('')
}

// shapes are drawn as a closed outline of points, then filled row by row between the outline's edges
const outline = (kind: Tool, x0: number, y0: number, x1: number, y1: number, h: number): [number, number][] => {
  const l = x0 + h, t = y0 + h, r = x1 - h, b = y1 - h
  if (kind === 'rect') return [[l, t], [r, t], [r, b], [l, b], [l, t]]
  const out: [number, number][] = []
  if (kind === 'ellipse') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max(0, (x1 - x0) / 2 - h), ry = Math.max(0, (y1 - y0) / 2 - h)
    const n = Math.max(16, Math.ceil((rx + ry) * 3))
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; out.push([Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)]) }
    return out
  }
  const rad = Math.max(0, Math.min(8, Math.floor((r - l) / 2), Math.floor((b - t) / 2)))
  const corners: [number, number, number][] = [[r - rad, t + rad, -90], [r - rad, b - rad, 0], [l + rad, b - rad, 90], [l + rad, t + rad, 180]]
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 8; i++) { const a = ((a0 + (i / 8) * 90) * Math.PI) / 180; out.push([Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad)]) }
  }
  out.push(out[0]!)
  return out
}
const shape = (a: [number, number], b: [number, number], shift: boolean) => {
  const c = ctx!
  c.putImageData(base!, 0, 0)
  let [x1, y1] = b
  const dx = x1 - a[0], dy = y1 - a[1]
  if (tool.value === 'line') {
    if (shift) { // snap to the nearest 45 degrees
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy)
      x1 = Math.round(a[0] + Math.cos(ang) * len); y1 = Math.round(a[1] + Math.sin(ang) * len)
    }
    c.fillStyle = mainCol
    trace(a, [x1, y1], width.value, false)
    dims.value = `${Math.abs(x1 - a[0]) + 1} x ${Math.abs(y1 - a[1]) + 1}`
    return
  }
  if (shift) { const s = Math.min(Math.abs(dx), Math.abs(dy)); x1 = a[0] + Math.sign(dx) * s; y1 = a[1] + Math.sign(dy) * s }
  const x0 = Math.min(a[0], x1), X1 = Math.max(a[0], x1), y0 = Math.min(a[1], y1), Y1 = Math.max(a[1], y1)
  dims.value = `${X1 - x0 + 1} x ${Y1 - y0 + 1}`
  const w = width.value, round = tool.value !== 'rect'
  const pts = outline(tool.value, x0, y0, X1, Y1, fillStyle.value === 2 ? 0 : Math.floor(w / 2))
  if (fillStyle.value > 0) {
    const lo = new Map<number, number>(), hi = new Map<number, number>()
    for (let i = 1; i < pts.length; i++) {
      trace(pts[i - 1]!, pts[i]!, 1, false, (x, y) => {
        if (!lo.has(y) || x < lo.get(y)!) lo.set(y, x)
        if (!hi.has(y) || x > hi.get(y)!) hi.set(y, x)
      })
    }
    c.fillStyle = fillStyle.value === 2 ? mainCol : altCol
    lo.forEach((x, y) => c.fillRect(x, y, hi.get(y)! - x + 1, 1))
  }
  if (fillStyle.value < 2) {
    c.fillStyle = mainCol
    for (let i = 1; i < pts.length; i++) trace(pts[i - 1]!, pts[i]!, w, round)
  }
}

const at = (e: PointerEvent): [number, number] => {
  const r = canvas.value!.getBoundingClientRect()
  return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]
}
const inside = ([x, y]: [number, number]) => x >= 0 && y >= 0 && x < W && y < H
const down = (e: PointerEvent) => {
  if (!e.isPrimary || (e.button !== 0 && e.button !== 2)) return
  e.preventDefault()
  menu.value = ''
  root.value?.focus({ preventScroll: true })
  const p = at(e), right = e.button === 2
  mainCol = right ? bg.value : fg.value
  altCol = right ? fg.value : bg.value
  if (tool.value === 'picker') {
    if (inside(p)) (right ? bg : fg).value = pick(...p)
    tool.value = before
    return
  }
  canvas.value!.setPointerCapture(e.pointerId)
  drawing = true; changed = false; dims.value = ''
  base = snap()
  start = last = p
  const t = tool.value
  if (t === 'fill') { changed = inside(p) && flood(p[0], p[1], mainCol); stop(); return }
  if (FREE.includes(t)) {
    ctx!.fillStyle = t === 'eraser' ? bg.value : mainCol
    dot(p[0], p[1], width.value, t === 'brush'); changed = true
  } else if (t === 'airbrush') {
    spray(); changed = true
    airTimer = window.setInterval(spray, 30)
  }
}
const move = (e: PointerEvent) => {
  const p = at(e)
  pos.value = inside(p) ? `${p[0]}, ${p[1]}` : ''
  if (!drawing || !e.isPrimary) return
  // use every point the browser saw between frames, so fast strokes stay unbroken
  const list = (e.getCoalescedEvents?.() ?? []).filter(Boolean)
  for (const ev of list.length ? list : [e]) {
    const q = at(ev), t = tool.value
    if (FREE.includes(t)) {
      ctx!.fillStyle = t === 'eraser' ? bg.value : mainCol
      trace(last, q, width.value, t === 'brush')
    } else if (t !== 'airbrush') { shape(start, q, e.shiftKey); changed = true }
    last = q
  }
}
const stop = () => {
  if (!drawing) return
  drawing = false
  clearInterval(airTimer)
  if (changed && base) record(base)
  base = null
}
const undo = () => {
  const img = undos.pop()
  if (!img) return
  redos.push(snap()); ctx!.putImageData(img, 0, 0); sync()
}
const redo = () => {
  const img = redos.pop()
  if (!img) return
  undos.push(snap()); ctx!.putImageData(img, 0, 0); sync()
}
const edit = (fn: () => void) => { const img = snap(); fn(); record(img) }
const clear = () => edit(blank)
const invert = () => edit(() => {
  const img = snap(), d = img.data
  for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]!; d[i + 1] = 255 - d[i + 1]!; d[i + 2] = 255 - d[i + 2]! }
  ctx!.putImageData(img, 0, 0)
})
const flip = (h: boolean) => edit(() => {
  const copy = document.createElement('canvas')
  copy.width = W; copy.height = H
  copy.getContext('2d')!.drawImage(canvas.value!, 0, 0)
  ctx!.save()
  ctx!.setTransform(h ? -1 : 1, 0, 0, h ? 1 : -1, h ? W : 0, h ? 0 : H)
  ctx!.drawImage(copy, 0, 0)
  ctx!.restore()
})
const save = () => {
  canvas.value!.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'untitled.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  })
}
const items = computed<Record<string, Item[]>>(() => ({
  File: [{ label: 'New', run: clear }, { label: 'Save As PNG...', keys: 'Ctrl+S', run: save }],
  Edit: [
    { label: 'Undo', keys: 'Ctrl+Z', run: undo, off: !canUndo.value }, { label: 'Repeat', keys: 'Ctrl+Y', run: redo, off: !canRedo.value },
    '-', { label: 'Clear Image', keys: 'Ctrl+Shift+N', run: clear }
  ],
  Image: [{ label: 'Flip Horizontal', run: () => flip(true) }, { label: 'Flip Vertical', run: () => flip(false) }, '-', { label: 'Invert Colors', keys: 'Ctrl+I', run: invert }],
  Help: [{ label: 'About Paint', run: () => { about.value = true; nextTick(() => okBtn.value?.focus()) } }]
}))
const runItem = (it: Exclude<Item, '-'>) => { if (it.off) return; menu.value = ''; it.run() }

const pickTool = (t: Tool) => { if (t === 'picker' && tool.value !== 'picker') before = tool.value; tool.value = t }
const key = (e: KeyboardEvent) => {
  if (about.value) { if (e.key === 'Escape') { about.value = false; root.value?.focus() } return }
  if (e.key === 'Escape') { menu.value = ''; return }
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase()
    if (k === 'z') e.shiftKey ? redo() : undo()
    else if (k === 'y') redo()
    else if (k === 's') save()
    else if (k === 'i') invert()
    else if (k === 'n' && e.shiftKey) clear()
    else return
    e.preventDefault()
    return
  }
  if (e.altKey) return
  if (e.key === '[' || e.key === ']') { size.value = Math.max(0, Math.min(3, size.value + (e.key === ']' ? 1 : -1))); return }
  const t = TOOLS.find(x => x.key === e.key.toLowerCase())
  if (t) pickTool(t.id)
}
// close an open menu when clicking anywhere else
const away = (e: PointerEvent) => { if (menu.value && !(e.target as HTMLElement).closest('.menu')) menu.value = '' }
onMounted(() => window.addEventListener('pointerdown', away))
onBeforeUnmount(() => window.removeEventListener('pointerdown', away))

// cursors are little SVG pictures; everything else uses the plain crosshair
const cur = (svg: string, x: number, y: number) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, crosshair`
const cursor = computed(() => {
  const t = tool.value, w = width.value
  const open = (body: string, n = 24) => `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${body}</svg>`
  if (t === 'pencil') return cur(open('<path d="M1 23l2-6 13-13 4 4-13 13z" fill="#ff0" stroke="#000"/><path d="M1 23l2-6 4 4z" fill="#f5cc8a" stroke="#000"/>'), 1, 23)
  if (t === 'fill') return cur(open('<path d="M5 14l7-7 8 8-7 7z" fill="#fff" stroke="#000"/><path d="M6 14h11l-4 4z" fill="#00f"/><path d="M2 22l1-3 2 2z" fill="#00f"/>'), 2, 22)
  if (t === 'picker') return cur(open('<path d="M15 2l7 7-3 2-1-1-7 7-3-3 7-7-1-1z" fill="#fff" stroke="#000"/><path d="M9 14l3 3-6 6-3 0 0-3z" fill="#808080" stroke="#000"/>'), 3, 22)
  if (t === 'eraser') { const n = w + 2; return cur(open(`<rect x=".5" y=".5" width="${n - 1}" height="${n - 1}" fill="#fff" stroke="#000"/>`, n), n / 2, n / 2) }
  if ((t === 'brush' || t === 'airbrush') && w >= 6) { const n = w + 4; return cur(open(`<circle cx="${n / 2}" cy="${n / 2}" r="${w / 2 + 1}" fill="none" stroke="#000"/>`, n), n / 2, n / 2) }
  return 'crosshair'
})
</script>

<template>
  <div ref="root" class="win" tabindex="0" role="group" aria-label="Paint, a drawing program" @keydown="key">
    <div class="title">
      <svg class="logo" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h10v12H3z" fill="#fff" stroke="#000" /><path d="M5 5h3v3H5z" fill="#f00" /><path d="M9 8h3v3H9z" fill="#00f" /><path d="M5 10h3v2H5z" fill="#0a0" /></svg>
      <span>untitled - Paint</span>
      <span class="btns" aria-hidden="true">
        <i><svg viewBox="0 0 8 8"><path d="M0 6h6v2H0z" /></svg></i>
        <i><svg viewBox="0 0 8 8"><path d="M0 0h8v8H0zM1 2v5h6V2z" fill-rule="evenodd" /></svg></i>
        <i class="x"><svg viewBox="0 0 8 8"><path d="M0 0h2l2 2 2-2h2v1L5 4l3 3v1H6L4 6 2 8H0V7l3-3-3-3z" /></svg></i>
      </span>
    </div>
    <div class="menu" role="menubar" aria-label="Menu">
      <div v-for="m in MENUS" :key="m" class="top">
        <button type="button" role="menuitem" aria-haspopup="true" :aria-expanded="menu === m" :class="{ open: menu === m }" @click="menu = menu === m ? '' : m" @pointerenter="menu && (menu = m)"><u>{{ m[0] }}</u>{{ m.slice(1) }}</button>
        <div v-if="menu === m" class="drop" role="menu">
          <template v-for="(it, i) in items[m]" :key="i">
            <hr v-if="it === '-'">
            <button v-else type="button" role="menuitem" :disabled="it.off" @click="runItem(it)"><span>{{ it.label }}</span><span>{{ it.keys }}</span></button>
          </template>
        </div>
      </div>
    </div>
    <div class="main">
      <div class="side">
        <div class="tools" role="toolbar" aria-label="Tools">
          <button v-for="t in TOOLS" :key="t.id" type="button" :class="{ on: tool === t.id }" :aria-pressed="tool === t.id" :title="t.label" :aria-label="t.label" @click="pickTool(t.id)" @pointerenter="hint = t.hint" @pointerleave="hint = IDLE" @focus="hint = t.hint" @blur="hint = IDLE">
            <svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" v-html="t.icon" />
          </button>
        </div>
        <div class="options">
          <div v-if="isShape" class="styles" role="radiogroup" aria-label="Fill style">
            <button v-for="(n, s) in ['Outline', 'Outline and fill', 'Fill']" :key="n" type="button" role="radio" :aria-checked="fillStyle === s" :class="{ on: fillStyle === s }" :title="n" :aria-label="n" @click="fillStyle = s">
              <svg viewBox="0 0 30 8" shape-rendering="crispEdges" aria-hidden="true"><rect :fill="s ? '#808080' : 'none'" stroke="#000" x=".5" y=".5" width="29" height="7" /><rect v-if="s === 2" fill="currentColor" x="0" y="0" width="30" height="8" /></svg>
            </button>
          </div>
          <div v-if="hasSize" class="sizes" role="radiogroup" aria-label="Size">
            <button v-for="(s, k) in BARS" :key="s" type="button" role="radio" :aria-checked="size === k" :class="{ on: size === k }" :aria-label="`Size ${k + 1}`" @click="size = k"><i :style="{ height: `${s}px` }" /></button>
          </div>
        </div>
      </div>
      <div class="well">
        <canvas ref="canvas" :width="W" :height="H" :style="{ cursor }" aria-label="Drawing area" @pointerdown="down" @pointermove="move" @pointerup="stop" @pointercancel="stop" @pointerleave="pos = ''" @contextmenu.prevent />
        <i class="grip r" aria-hidden="true" /><i class="grip b" aria-hidden="true" /><i class="grip c" aria-hidden="true" />
      </div>
    </div>
    <div class="colors">
      <button type="button" class="current" title="Swap the two colours" aria-label="Swap the two colours" @click="[fg, bg] = [bg, fg]"><i class="b" :style="{ background: bg }" /><i class="f" :style="{ background: fg }" /></button>
      <div class="palette" role="listbox" aria-label="Colours">
        <button v-for="c in PALETTE" :key="c" type="button" role="option" :aria-selected="fg === c" :aria-label="c" :title="c" :style="{ background: c }" @click="fg = c" @contextmenu.prevent="bg = c" />
      </div>
    </div>
    <div class="status"><span class="help">{{ hint }}</span><span class="cell">{{ pos }}</span><span class="cell">{{ dims }}</span></div>
    <div v-if="about" class="dialog" role="dialog" aria-modal="true" aria-label="About Paint">
      <div class="title"><span>About Paint</span><span class="btns"><button type="button" class="x" aria-label="Close" @click="about = false"><svg viewBox="0 0 8 8"><path d="M0 0h2l2 2 2-2h2v1L5 4l3 3v1H6L4 6 2 8H0V7l3-3-3-3z" /></svg></button></span></div>
      <div class="body">
        <svg class="logo" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h10v12H3z" fill="#fff" stroke="#000" /><path d="M5 5h3v3H5z" fill="#f00" /><path d="M9 8h3v3H9z" fill="#00f" /><path d="M5 10h3v2H5z" fill="#0a0" /></svg>
        <p>Paint<br>Made by hand, one pixel at a time.</p>
      </div>
      <button ref="okBtn" type="button" class="ok" @click="about = false; root?.focus()">OK</button>
    </div>
  </div>
</template>

<style scoped>
/* the classic grey window, the same in both themes: it is a picture of an old screen */
.win { --face: #c0c0c0; --hi: #fff; --lo: #808080; --dk: #000; --soft: #dfdfdf; --raised: inset -1px -1px var(--dk), inset 1px 1px var(--hi), inset -2px -2px var(--lo), inset 2px 2px var(--soft); --sunk: inset -1px -1px var(--hi), inset 1px 1px var(--lo), inset -2px -2px var(--soft), inset 2px 2px var(--dk); position: relative; max-width: 820px; margin-inline: auto; background: var(--face); color: #000; font: 12px/1.2 Tahoma, 'MS Sans Serif', system-ui, sans-serif; padding: 3px; box-shadow: var(--raised), var(--shadow-card); user-select: none; -webkit-user-select: none; outline: none; }
.win :is(button, [tabindex]):focus-visible { outline: 1px dotted #000; outline-offset: -4px; }
.title { display: flex; align-items: center; gap: 4px; padding: 3px 2px 3px 3px; background: linear-gradient(90deg, #000080, #1084d0); color: #fff; font-weight: 700; }
.title > span:not(.btns) { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.logo { width: 16px; height: 16px; flex: none; shape-rendering: crispEdges; }
.btns { display: flex; gap: 2px; }
.btns > i, .btns > button { display: grid; place-items: center; width: 16px; height: 14px; background: var(--face); color: #000; box-shadow: inset -1px -1px var(--dk), inset 1px 1px var(--hi), inset -2px -2px var(--lo), inset 2px 2px var(--soft); }
.btns > .x, .btns > i.x { margin-left: 2px; }
.btns svg { width: 8px; height: 8px; fill: #000; shape-rendering: crispEdges; }
.menu { display: flex; padding: 2px 0; }
.top { position: relative; }
.menu .top > button { padding: 2px 6px; background: none; }
.menu .top > button:hover { box-shadow: inset -1px -1px var(--lo), inset 1px 1px var(--hi); }
.menu .top > button.open { box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.drop { position: absolute; z-index: 10; top: 100%; left: 0; min-width: 190px; padding: 2px; white-space: nowrap; background: var(--face); box-shadow: var(--raised), 2px 2px 0 rgba(0, 0, 0, .35); }
.drop button { display: flex; justify-content: space-between; gap: 24px; width: 100%; padding: 3px 6px 3px 20px; text-align: left; background: none; }
.drop button:hover:not(:disabled) { background: #000080; color: #fff; }
.drop button:disabled { color: var(--lo); text-shadow: 1px 1px var(--hi); cursor: default; }
.drop hr { margin: 3px 1px; border: 0; border-top: 1px solid var(--lo); border-bottom: 1px solid var(--hi); }
.main { display: flex; gap: 4px; margin-top: 2px; }
.side { flex: none; width: 56px; }
button { padding: 0; border: 0; background: var(--face); color: inherit; cursor: default; font: inherit; }
.tools { display: grid; grid-template-columns: repeat(2, 25px); grid-auto-rows: 25px; justify-content: center; padding: 2px 0; }
.tools button { display: grid; place-items: center; box-shadow: inset -1px -1px var(--dk), inset 1px 1px var(--hi), inset -2px -2px var(--lo), inset 2px 2px var(--soft); }
.tools button.on { background: conic-gradient(var(--hi) 25%, var(--face) 0 50%, var(--hi) 0 75%, var(--face) 0) 0 0 / 2px 2px; box-shadow: inset 1px 1px var(--dk), inset -1px -1px var(--hi), inset 2px 2px var(--lo); }
.tools button.on svg { transform: translate(1px, 1px); }
.tools svg { width: 16px; height: 16px; }
.options { margin-top: 4px; min-height: 72px; padding: 3px; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.styles, .sizes { display: grid; gap: 1px; }
.styles { margin-bottom: 3px; }
.styles button { display: grid; place-items: center; height: 14px; padding: 2px; color: #808080; }
.styles svg { width: 100%; height: 8px; }
.styles button.on, .sizes button.on { background: #000080; color: #fff; }
.styles button.on rect:first-child { stroke: #fff; }
.styles button:not(.on) rect:nth-child(2) { fill: #808080; }
.sizes button { display: grid; align-content: center; justify-items: center; height: 10px; }
.sizes i { display: block; width: 38px; background: #000; }
.sizes button.on i { background: #fff; }
.well { position: relative; flex: 1; min-width: 0; padding: 4px 8px 8px 4px; background: var(--lo); box-shadow: inset 1px 1px var(--dk), inset -1px -1px var(--hi), inset 2px 2px var(--lo); }
canvas { display: block; width: 100%; height: auto; background: #fff; image-rendering: pixelated; touch-action: none; }
.grip { position: absolute; width: 3px; height: 3px; background: #000080; }
.grip.r { right: 3px; top: 50%; }
.grip.b { bottom: 3px; left: 50%; }
.grip.c { right: 3px; bottom: 3px; }
.colors { display: flex; gap: 6px; align-items: center; padding: 4px 2px 2px; }
.current { position: relative; width: 31px; height: 31px; flex: none; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.current i { position: absolute; width: 14px; height: 14px; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), 0 0 0 1px var(--face); }
.current .f { left: 5px; top: 5px; z-index: 1; }
.current .b { right: 5px; bottom: 5px; }
.palette { display: grid; grid-template-columns: repeat(14, 16px); grid-auto-rows: 16px; }
.palette button { box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), inset 2px 2px var(--dk), inset -2px -2px var(--soft); }
.palette button[aria-selected='true'] { outline: 1px dotted #000; outline-offset: -4px; }
.status { display: flex; gap: 3px; margin-top: 4px; }
.status span { padding: 2px 6px; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); color: #000; white-space: nowrap; }
.status .help { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.status .cell { width: 84px; flex: none; }
.dialog { position: absolute; z-index: 20; left: 50%; top: 50%; translate: -50% -50%; width: min(300px, 92%); padding: 3px; background: var(--face); box-shadow: var(--raised), 3px 3px 0 rgba(0, 0, 0, .35); }
.dialog .body { display: flex; align-items: center; gap: 14px; padding: 18px 14px 10px; }
.dialog .logo { width: 32px; height: 32px; }
.dialog p { margin: 0; line-height: 1.4; }
.dialog .ok { display: block; width: 75px; margin: 6px auto 8px; padding: 4px 0; box-shadow: inset -1px -1px var(--dk), inset 1px 1px var(--hi), inset -2px -2px var(--lo), inset 2px 2px var(--soft), 0 0 0 1px var(--dk); }
.dialog .ok:active { box-shadow: inset 1px 1px var(--lo), 0 0 0 1px var(--dk); }
@media (max-width: 640px) {
  .palette { grid-template-columns: repeat(14, minmax(0, 1fr)); flex: 1; }
  .status .cell { display: none; }
}
</style>

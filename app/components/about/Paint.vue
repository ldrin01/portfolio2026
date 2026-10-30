<script setup lang="ts">
// A small, working paint program in an old-school window: pencil, brush, spray can, eraser and paint bucket, a
// 28-colour palette (left click picks the main colour, right click the second), and New to start over.
// Nothing is saved; it is just there to play with.
type Tool = 'pencil' | 'brush' | 'spray' | 'eraser' | 'fill'
const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'pencil', label: 'Pencil', icon: 'M4 20 L6 14 L16 4 L20 8 L10 18 Z M6 14 L10 18' },
  { id: 'brush', label: 'Brush', icon: 'M14 4 L20 10 L12 14 L10 12 Z M10 12 C6 12 4 16 4 20 C8 20 12 18 12 14' },
  { id: 'spray', label: 'Spray can', icon: 'M8 10 H16 V21 H8 Z M10 10 V6 H14 V10 M17 5 h.01 M19 7 h.01 M19 3 h.01 M21 5 h.01' },
  { id: 'eraser', label: 'Eraser', icon: 'M4 16 L12 8 L18 14 L12 20 H8 Z M12 20 H20' },
  { id: 'fill', label: 'Fill with colour', icon: 'M5 12 L12 5 L19 12 L12 19 Z M19 12 C21 15 21 17 19.5 18 C18 17 18 15 19 12' }
]
const PALETTE = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040']
const W = 720, H = 440
const canvas = ref<HTMLCanvasElement>()
const tool = ref<Tool>('pencil')
const fg = ref('#000000'), bg = ref('#ffffff')
const size = ref(2)
const pos = ref('')
let ctx: CanvasRenderingContext2D | null = null
let last: [number, number] | null = null
let colour = '#000000'
let sprayTimer = 0

const clear = () => { if (!ctx) return; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
onMounted(() => { ctx = canvas.value!.getContext('2d', { willReadFrequently: true }); clear() })
onBeforeUnmount(() => clearInterval(sprayTimer))

const at = (e: PointerEvent): [number, number] => {
  const r = canvas.value!.getBoundingClientRect()
  return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)]
}
const line = (a: [number, number], b: [number, number]) => {
  if (!ctx) return
  const w = tool.value === 'pencil' ? 1.5 : tool.value === 'eraser' ? size.value * 6 : size.value * 3
  ctx.strokeStyle = tool.value === 'eraser' ? bg.value : colour
  ctx.lineWidth = w; ctx.lineCap = tool.value === 'eraser' ? 'square' : 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke()
}
const spray = () => {
  if (!ctx || !last) return
  ctx.fillStyle = colour
  const r = size.value * 7
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * r
    ctx.fillRect(last[0] + Math.cos(a) * d, last[1] + Math.sin(a) * d, 1, 1)
  }
}
// paint bucket: fill the touching area of the same colour
const fill = ([x, y]: [number, number]) => {
  if (!ctx) return
  const img = ctx.getImageData(0, 0, W, H), d = img.data
  const i0 = (y * W + x) * 4, target = [d[i0], d[i0 + 1], d[i0 + 2]]
  const n = parseInt(colour.slice(1), 16), rgb = [n >> 16, (n >> 8) & 255, n & 255]
  if (target.every((v, k) => v === rgb[k])) return
  const same = (i: number) => Math.abs(d[i]! - target[0]!) + Math.abs(d[i + 1]! - target[1]!) + Math.abs(d[i + 2]! - target[2]!) < 48
  const stack = [x, y]
  while (stack.length) {
    const py = stack.pop()!, px = stack.pop()!
    if (px < 0 || py < 0 || px >= W || py >= H) continue
    const i = (py * W + px) * 4
    if (!same(i)) continue
    d[i] = rgb[0]!; d[i + 1] = rgb[1]!; d[i + 2] = rgb[2]!; d[i + 3] = 255
    stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1)
  }
  ctx.putImageData(img, 0, 0)
}
const down = (e: PointerEvent) => {
  e.preventDefault()
  canvas.value!.setPointerCapture(e.pointerId)
  colour = e.button === 2 ? bg.value : fg.value
  const p = at(e)
  if (tool.value === 'fill') return fill(p)
  last = p
  if (tool.value === 'spray') { spray(); sprayTimer = window.setInterval(spray, 30) } else line(p, p)
}
const move = (e: PointerEvent) => {
  const p = at(e)
  pos.value = `${p[0]}, ${p[1]}px`
  if (!last) return
  if (tool.value !== 'spray') line(last, p)
  last = p
}
const up = () => { last = null; clearInterval(sprayTimer) }
</script>

<template>
  <div class="win">
    <div class="title">
      <span>untitled - Paint</span>
      <span class="btns" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span>
    </div>
    <div class="menu" aria-hidden="true">
      <span>File</span><span>Edit</span><span>View</span><span>Image</span><span>Colors</span><span>Help</span>
    </div>
    <div class="main">
      <div class="tools" role="toolbar" aria-label="Tools">
        <button v-for="t in TOOLS" :key="t.id" type="button" :class="{ on: tool === t.id }" :aria-pressed="tool === t.id" :title="t.label" :aria-label="t.label" @click="tool = t.id">
          <svg viewBox="0 0 24 24"><path :d="t.icon" /></svg>
        </button>
        <button type="button" title="New picture" aria-label="New picture" @click="clear"><svg viewBox="0 0 24 24"><path d="M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19" /></svg></button>
        <div class="sizes" role="radiogroup" aria-label="Size">
          <button v-for="s in [1, 2, 4]" :key="s" type="button" role="radio" :aria-checked="size === s" :class="{ on: size === s }" :aria-label="`Size ${s}`" @click="size = s"><i :style="{ height: `${s * 2}px` }" /></button>
        </div>
      </div>
      <div class="well">
        <canvas ref="canvas" :width="W" :height="H" aria-label="Drawing area" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @pointerleave="pos = ''" @contextmenu.prevent />
      </div>
    </div>
    <div class="colors">
      <div class="current" aria-hidden="true"><i class="b" :style="{ background: bg }" /><i class="f" :style="{ background: fg }" /></div>
      <div class="palette" role="listbox" aria-label="Colours">
        <button v-for="c in PALETTE" :key="c" type="button" role="option" :aria-selected="fg === c" :aria-label="c" :style="{ background: c }" @click="fg = c" @contextmenu.prevent="bg = c" />
      </div>
    </div>
    <div class="status"><span>For Help, click Help Topics on the Help Menu.</span><span>{{ pos }}</span></div>
  </div>
</template>

<style scoped>
/* the classic grey window, the same in both themes: it is a picture of an old screen */
.win { --face: #c0c0c0; --hi: #fff; --lo: #808080; --dk: #000; background: var(--face); color: #000; font: 12px/1.2 Tahoma, 'MS Sans Serif', system-ui, sans-serif; padding: 3px; box-shadow: inset -1px -1px var(--dk), inset 1px 1px var(--hi), inset -2px -2px var(--lo), inset 2px 2px #dfdfdf, var(--shadow-card); user-select: none; }
.title { display: flex; justify-content: space-between; align-items: center; padding: 3px 4px; background: linear-gradient(90deg, #000080, #1084d0); color: #fff; font-weight: 700; }
.btns { display: flex; gap: 2px; }
.btns i { display: grid; place-items: center; width: 16px; height: 14px; background: var(--face); color: #000; font-style: normal; font-size: 10px; line-height: 1; box-shadow: inset -1px -1px var(--dk), inset 1px 1px var(--hi); }
.menu { display: flex; gap: 12px; padding: 4px 6px; }
.main { display: flex; gap: 4px; }
.tools { display: grid; grid-template-columns: repeat(2, 26px); grid-auto-rows: 26px; gap: 1px; align-content: start; padding: 2px; }
button { padding: 0; border: 0; background: var(--face); cursor: pointer; font: inherit; }
.tools > button { display: grid; place-items: center; box-shadow: inset -1px -1px var(--dk), inset 1px 1px var(--hi); }
.tools > button.on { background: #dfdfdf; box-shadow: inset 1px 1px var(--dk), inset -1px -1px var(--hi); }
.tools svg { width: 16px; height: 16px; fill: none; stroke: #000; stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
.sizes { grid-column: 1 / 3; display: grid; gap: 3px; margin-top: 6px; padding: 4px; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.sizes button { display: grid; place-items: center; height: 14px; background: none; }
.sizes button.on { background: #000080; }
.sizes i { display: block; width: 36px; background: #000; }
.sizes button.on i { background: #fff; }
.well { flex: 1; min-width: 0; padding: 4px; background: var(--lo); box-shadow: inset 1px 1px var(--dk), inset -1px -1px var(--hi); }
canvas { display: block; width: 100%; height: auto; background: #fff; cursor: crosshair; touch-action: none; }
.colors { display: flex; gap: 6px; align-items: center; padding: 6px 2px 2px; }
.current { position: relative; width: 30px; height: 30px; flex: none; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.current i { position: absolute; width: 14px; height: 14px; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi), 0 0 0 1px var(--face); }
.current .f { left: 4px; top: 4px; }
.current .b { right: 4px; bottom: 4px; }
.palette { display: grid; grid-template-columns: repeat(14, 16px); grid-auto-rows: 16px; gap: 1px; }
.palette button { box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); }
.status { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; padding: 3px 6px; box-shadow: inset 1px 1px var(--lo), inset -1px -1px var(--hi); color: #222; }
@media (max-width: 600px) {
  .palette { grid-template-columns: repeat(14, minmax(0, 1fr)); flex: 1; }
  .status span:first-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
}
</style>

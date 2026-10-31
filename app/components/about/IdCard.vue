<script setup lang="ts">
// A company ID on a long lanyard. The strap is a rope under gravity and the card hangs from its end, so it swings, leans
// and settles on its own. Drag it and let go to fling it, tap to flip it over. The 1x1 photo takes a GIF.
const props = defineProps<{ card: { photo: string; company: string; name: string; role: string; role2: string; idNo: string; since: string } }>()
const asset = useAssetUrl()
const uid = useId()

const CARD_W = 270, CARD_H = 420, EDGE = 13, LINKS = 10
const stage = ref<HTMLElement | null>(null)
const pivot = ref<HTMLElement | null>(null)
const shade = ref<HTMLElement | null>(null)
const ribbon = ref<SVGPathElement | null>(null)
const guide = ref<SVGPathElement | null>(null)
const stitch = ref<SVGPathElement | null>(null)
const ready = ref(false)
const grabbing = ref(false)
const height = ref(400 + CARD_H + 60)

// a barcode made from the ID number, so it changes when the number does
const bars = computed(() => [...props.card.idNo].flatMap((c) => { const v = c.charCodeAt(0); return [1 + (v % 3), 1 + ((v >> 2) % 2), 1 + ((v >> 3) % 3)] }))
const strapText = computed(() => `${props.card.company.toUpperCase()}  ✦  ${props.card.role.toUpperCase()}  ✦  `.repeat(12))

type Pt = { x: number; y: number; px: number; py: number; w: number }
let pts: Pt[] = []
let width = 0, strapLen = 400, anchorX = 0
let ang = 0, angV = 0, ry = 0, ryV = 0, rx = 0, rxV = 0, flip = 0
let hoverX = 0, hoverY = 0
let drag: { lx: number; ly: number; tx: number; ty: number; x0: number; y0: number; t0: number } | null = null
let raf = 0, last = 0, acc = 0, visible = false
let reduce = false
let stopObs: (() => void) | null = null

function layout() {
  const el = stage.value
  if (!el) return
  width = el.clientWidth
  strapLen = window.innerWidth < 700 ? 290 : 400
  height.value = strapLen + CARD_H + 60
  anchorX = width / 2 + Math.min(34, width * .08)
  const seg = strapLen / LINKS
  pts = Array.from({ length: LINKS + 1 }, (_, i) => ({ x: anchorX, y: i * seg, px: anchorX, py: i * seg, w: i === 0 ? 0 : i === LINKS ? .22 : 1 }))
  ang = angV = ry = ryV = rx = rxV = 0
  for (let i = 0; i < 260; i++) step(i * 16) // let it hang before the first paint
  draw()
  ready.value = true
}

function step(t: number) {
  const gravity = .55, lean = -.075
  const wind = reduce ? 0 : Math.sin(t * .0013) * .03 + Math.sin(t * .0031) * .018
  for (let i = 1; i <= LINKS; i++) {
    const p = pts[i]!
    const vx = (p.x - p.px) * .986, vy = (p.y - p.py) * .986
    p.px = p.x; p.py = p.y
    p.x += vx + lean * (i === LINKS ? 1.7 : .3) + wind * (i / LINKS)
    p.y += vy + gravity
  }
  const end = pts[LINKS]!
  if (drag) {
    // the grabbed spot stays under the pointer: turn its offset from the slot by however far the card has turned
    const a = -ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
    const gx = drag.tx - (drag.lx * c - drag.ly * s), gy = drag.ty - (drag.lx * s + drag.ly * c)
    // never further than the strap reaches, and never above where it hangs from
    const ax = gx - anchorX, ay = Math.max(30, gy), reach = strapLen * .97, dist = Math.hypot(ax, ay)
    const k = dist > reach ? reach / dist : 1
    end.x += (anchorX + ax * k - end.x) * .35
    end.y += (ay * k - end.y) * .35
    end.px = end.x - Math.max(-9, Math.min(9, end.x - end.px)); end.py = end.y - Math.max(-9, Math.min(9, end.y - end.py))
  }
  const seg = strapLen / LINKS
  for (let k = 0; k < 16; k++) {
    pts[0]!.x = anchorX; pts[0]!.y = 0
    for (let i = 0; i < LINKS; i++) {
      const a = pts[i]!, b = pts[i + 1]!
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4
      const f = (d - seg) / d, s = a.w + b.w
      a.x += dx * f * a.w / s; a.y += dy * f * a.w / s
      b.x -= dx * f * b.w / s; b.y -= dy * f * b.w / s
    }
  }
  end.x = Math.max(CARD_W / 2 + 6, Math.min(width - CARD_W / 2 - 6, end.x))
  // the card trails the rope's direction on a spring, so it overshoots a little like a real one
  const prev = pts[LINKS - 2]!
  const target = Math.max(-50, Math.min(50, Math.atan2(end.x - prev.x, end.y - prev.y) * 180 / Math.PI * 1.15))
  angV = (angV + (target - ang) * .075) * .87; ang += angV
  // turn about the vertical axis with the swing, the cursor and the flip
  const swing = Math.max(-34, Math.min(34, (end.x - end.px) * 2.4))
  const ryT = -17 + hoverX * 20 + swing + flip
  const rxT = hoverY * -10 + Math.max(-14, Math.min(14, (end.y - end.py) * -1.2))
  ryV = (ryV + (ryT - ry) * .07) * .84; ry += ryV
  rxV = (rxV + (rxT - rx) * .09) * .84; rx += rxV
}

function path() {
  // smooth curve through the rope's points, one string used for the cloth, the stitching and the printed text
  const q = pts
  let d = `M${q[0]!.x} ${q[0]!.y - 60}L${q[0]!.x} ${q[0]!.y}`
  for (let i = 1; i < q.length - 1; i++) d += `Q${q[i]!.x} ${q[i]!.y} ${(q[i]!.x + q[i + 1]!.x) / 2} ${(q[i]!.y + q[i + 1]!.y) / 2}`
  const e = q[q.length - 1]!
  return d + `L${e.x} ${e.y}`
}

function draw() {
  const e = pts[LINKS]
  if (!e || !pivot.value) return
  pivot.value.style.transform = `translate3d(${e.x}px,${e.y}px,0) rotate(${-ang}deg) rotateX(${rx}deg) rotateY(${ry}deg)`
  const rad = ry * Math.PI / 180
  // the shadow only follows the swing and how edge-on the card is, so it stays put when the card flips
  if (shade.value) shade.value.style.transform = `translate(${e.x}px,${e.y}px) rotate(${-ang}deg) scaleX(${Math.max(.3, Math.abs(Math.cos(rad))).toFixed(3)})`
  pivot.value.style.setProperty('--sheen', `${50 + Math.sin(rad) * 50}%`)
  pivot.value.style.setProperty('--hue', `${ry * 1.6}deg`)
  const d = path()
  ribbon.value?.setAttribute('d', d)
  stitch.value?.setAttribute('d', d)
  guide.value?.setAttribute('d', d)
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  acc += Math.min(64, now - (last || now)); last = now
  while (acc >= 16.67) { step(now); acc -= 16.67 }
  draw()
}
function run() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame) } }
function halt() { cancelAnimationFrame(raf); raf = 0 }

const local = (e: PointerEvent) => { const r = stage.value!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }

function onDown(e: PointerEvent) {
  if (e.button > 0) return
  const m = local(e), end = pts[LINKS]!
  const a = ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const wx = m.x - end.x, wy = m.y - end.y
  drag = { lx: wx * c - wy * s, ly: wx * s + wy * c, tx: m.x, ty: m.y, x0: e.clientX, y0: e.clientY, t0: performance.now() }
  grabbing.value = true
  end.w = 0 // held by the hand, so the rope can't stretch
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
function onDrag(e: PointerEvent) { if (drag) { const m = local(e); drag.tx = m.x; drag.ty = m.y } }
function onUp(e: PointerEvent) {
  if (drag && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6 && performance.now() - drag.t0 < 400) flip += 180 // a tap turns it over
  drag = null; grabbing.value = false
  if (pts[LINKS]) pts[LINKS].w = .22
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
}
function onHover(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  const m = local(e)
  hoverX = Math.max(-.5, Math.min(.5, m.x / width - .5)); hoverY = Math.max(-.5, Math.min(.5, m.y / height.value - .35))
}
const onLeave = () => { hoverX = 0; hoverY = 0 }

onMounted(() => {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  layout()
  const size = new ResizeObserver(() => { if (stage.value && stage.value.clientWidth !== width) layout() })
  size.observe(stage.value!)
  const see = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; visible ? run() : halt() }, { rootMargin: '200px 0px' })
  see.observe(stage.value!)
  stopObs = () => { size.disconnect(); see.disconnect() }
})
onBeforeUnmount(() => {
  halt(); stopObs?.()
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
})
</script>

<template>
  <div ref="stage" class="hang" :class="{ ready, grabbing }" :style="{ height: `${height}px` }" @pointermove="onHover" @pointerleave="onLeave">
    <div ref="shade" class="shadow" aria-hidden="true" />
    <svg class="strap" aria-hidden="true">
      <defs><path :id="`${uid}-g`" ref="guide" /></defs>
      <path ref="ribbon" class="edge" />
      <path ref="stitch" class="cloth" />
      <text class="print"><textPath :href="`#${uid}-g`" startOffset="0" dy="3.4">{{ strapText }}</textPath></text>
    </svg>

    <div ref="pivot" class="pivot">
      <div class="slab" @pointerdown.prevent="onDown">
        <div class="clasp" aria-hidden="true"><i /></div>
        <!-- the thickness of the card: a stack of plates between the two faces -->
        <i v-for="n in EDGE" :key="n" class="plate" aria-hidden="true" :style="{ transform: `translateZ(${n - (EDGE + 1) / 2}px)` }" />

        <div class="face front">
          <span class="slot" aria-hidden="true" />
          <div class="band">{{ card.company }}</div>
          <div class="body">
            <div class="frame"><img class="photo" :src="asset(card.photo)" alt="ID photo" draggable="false"></div>
            <p class="name">{{ card.name }}</p>
            <p class="role">{{ card.role }}</p>
            <p class="role">{{ card.role2 }}</p>
            <div class="meta">
              <span>ID {{ card.idNo }}</span>
              <span>{{ card.since }}</span>
            </div>
            <div class="code" aria-hidden="true">
              <i v-for="(w, i) in bars" :key="i" :style="{ width: `${w * 2}px`, opacity: i % 2 ? 0 : 1 }" />
            </div>
          </div>
          <span class="holo" aria-hidden="true" />
          <span class="gloss" aria-hidden="true" />
        </div>

        <div class="face back" aria-hidden="true">
          <span class="slot" />
          <div class="stripe" />
          <p class="fine">This card belongs to {{ card.company }}. If found, please return it to the nearest design desk.</p>
          <div class="sign"><span>Authorised</span><b>{{ card.name }}</b></div>
          <div class="code big">
            <i v-for="(w, i) in bars" :key="i" :style="{ width: `${w * 2.6}px`, opacity: i % 2 ? 0 : 1 }" />
          </div>
          <p class="num">{{ card.idNo }}</p>
          <span class="gloss" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hang {
  --edge: color-mix(in srgb, var(--fg) 24%, var(--surface));
  position: relative; width: 100%; max-width: 440px; margin: 0 auto; perspective: 1200px; perspective-origin: 50% 30%;
  opacity: 0; transition: opacity .5s; user-select: none; -webkit-user-select: none;
}
.hang.ready { opacity: 1; }
.strap {
  position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none;
  mask-image: linear-gradient(180deg, transparent 0, #000 70px); -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 70px);
  filter: drop-shadow(0 6px 5px rgba(0, 0, 0, .22));
}
.strap path { fill: none; stroke-linejoin: round; }
.strap .edge { stroke: color-mix(in srgb, var(--accent) 62%, #000); stroke-width: 26; }
.strap .cloth { stroke: var(--accent); stroke-width: 22; }
.strap .print { fill: var(--on-accent); font: 700 10px/1 var(--font); letter-spacing: .22em; opacity: .85; }

.pivot { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; will-change: transform; }
.shadow { position: absolute; left: -128px; top: -14px; width: 256px; height: 410px; border-radius: 22px; background: #000; opacity: .26; filter: blur(22px); margin: 24px 0 0 16px; pointer-events: none; will-change: transform; }
.slab { position: absolute; left: -135px; top: -16px; width: 270px; height: 420px; transform-style: preserve-3d; cursor: grab; touch-action: pan-y; }
.grabbing .slab { cursor: grabbing; }

.plate { position: absolute; inset: 0; border-radius: 20px; background: var(--edge); }
.face { position: absolute; inset: 0; border-radius: 20px; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: var(--surface); color: var(--fg); box-shadow: inset 0 0 0 1px var(--line); }
.front { transform: translateZ(7px); }
.back { transform: rotateY(180deg) translateZ(7px); display: flex; flex-direction: column; padding: 0 24px 22px; }
.slot { position: absolute; top: 14px; left: 50%; width: 54px; height: 9px; translate: -50% 0; border-radius: 6px; background: var(--bg); box-shadow: inset 0 2px 3px rgba(0, 0, 0, .55), 0 1px 0 rgba(255, 255, 255, .25); z-index: 2; }

.clasp { position: absolute; left: 50%; top: -34px; width: 30px; height: 56px; translate: -50% 0; transform: translateZ(8px); z-index: 3; border-radius: 9px 9px 6px 6px; background: linear-gradient(100deg, #8e8e97, #f4f4f7 38%, #b9b9c2 62%, #6f6f78); box-shadow: 0 2px 5px rgba(0, 0, 0, .4); }
.clasp i { position: absolute; left: 50%; bottom: 7px; width: 14px; height: 14px; translate: -50% 0; border-radius: 50%; background: var(--surface); box-shadow: inset 0 2px 3px rgba(0, 0, 0, .6); }

.band { position: relative; padding: 34px 18px 14px; background: var(--accent); color: var(--on-accent, #fff); font-size: 12px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; text-align: center; }
.band::after { content: ''; position: absolute; inset: auto 0 0; height: 3px; background: repeating-linear-gradient(90deg, rgba(0, 0, 0, .28) 0 6px, transparent 6px 12px); }
.body { padding: 20px 22px 18px; text-align: center; }
.frame { width: 144px; margin: 0 auto 16px; padding: 5px; border-radius: 14px; background: linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 40%, var(--fg))); box-shadow: 0 6px 14px -6px rgba(0, 0, 0, .45); }
.photo { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; background: var(--line); pointer-events: none; }
.name { margin: 0 0 6px; font-size: 22px; font-weight: 600; letter-spacing: -.01em; line-height: 1.15; }
.role { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.4; }
.meta { display: flex; justify-content: space-between; margin: 16px 0 10px; padding-top: 12px; border-top: 1px dashed var(--line); font: 11px/1 ui-monospace, 'SF Mono', Menlo, monospace; color: var(--muted); }
.code { display: flex; justify-content: center; height: 30px; }
.code i { display: block; height: 100%; background: var(--fg); }

/* a hologram sticker and a sheen that slide as the card turns */
.holo { position: absolute; right: 16px; bottom: 74px; width: 34px; height: 34px; border-radius: 50%; mix-blend-mode: screen; opacity: .85; background: conic-gradient(from var(--hue, 0deg), #ff7ad9, #ffd36e, #7affc9, #6ea8ff, #c77aff, #ff7ad9); filter: saturate(1.2); -webkit-mask: radial-gradient(circle, transparent 30%, #000 32%); mask: radial-gradient(circle, transparent 30%, #000 32%); }
.gloss { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: soft-light; background: linear-gradient(115deg, transparent 22%, rgba(255, 255, 255, .85) 42%, transparent 58%); background-size: 260% 100%; background-position: var(--sheen, 50%) 0; }

.stripe { height: 52px; margin: 40px -24px 20px; background: linear-gradient(180deg, #17171b, #2b2b31 50%, #17171b); }
.fine { margin: 0 0 18px; font-size: 12px; line-height: 1.55; color: var(--muted); }
.sign { margin-bottom: auto; padding: 10px 12px; border-radius: 8px; background: repeating-linear-gradient(135deg, var(--line) 0 2px, transparent 2px 7px); display: flex; flex-direction: column; gap: 3px; }
.sign span { font: 10px/1 ui-monospace, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.sign b { font: italic 600 19px/1.2 var(--serif); }
.code.big { height: 54px; margin-top: 18px; }
.num { margin: 8px 0 0; text-align: center; font: 11px/1 ui-monospace, Menlo, monospace; letter-spacing: .2em; color: var(--muted); }

@media (prefers-reduced-motion: reduce) { .hang { transition: none; } }
</style>

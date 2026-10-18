// Scroll lag ("staggered parallax"). Elements trail the scroll, and how far they trail follows the
// *force the user sends*, read from the raw input (wheel / trackpad / finger), not only the page's
// smoothed movement. Gentle nudge → small gap, hard flick → big gap. Later items in a stagger trail more.
//
// Input power:  wheel + touch deltas are summed per frame into a velocity (px/s) → eased (fast attack,
//               slower release) → measured against an adaptive "what is strong on THIS device" scale.
// Fallback:     keyboard, scrollbar drag, anchors and touch momentum send no input events, so the page's
//               own scroll velocity drives the lag there.
// Output:       transform-only (`translate`), one shared frame loop.
//
// Add ?lagdebug to the URL to see what the site is reading from your input device.

interface Item { el: HTMLElement; tau: number; amp: number; off: number; near: boolean }
type Kind = 'unknown' | 'wheel' | 'trackpad' | 'touch'

// Typical "strong scroll" in px/s per device class; the adaptive scale starts here and learns upward.
const FLOORS: Record<Kind, number> = { unknown: 1100, wheel: 1800, trackpad: 700, touch: 1200 }
const ATTACK: Record<Kind, number> = { unknown: 0.05, wheel: 0.04, trackpad: 0.05, touch: 0.04 } // s
const RELEASE = 0.2 // s

const items = new Set<Item>()
const byEl = new WeakMap<Element, Item>()
let io: IntersectionObserver | null = null
let raf = 0
let lastT = 0
let lastY = 0
let cfg = { base: 0.09, step: 0.04, max: 48 }

// live input state
let kind: Kind = 'unknown'
let acc = 0          // page-scroll-equivalent px received since the last frame
let vIn = 0          // eased input velocity, px/s (signed: + = scrolling down)
let vScroll = 0      // eased velocity of the page's actual scroll, px/s
let scale = FLOORS.unknown // adaptive "strong" input for this device, px/s
let lastWheelT = 0
let lastDelta = 0
let lastMode = 0
let touchY = 0
let debugEl: HTMLElement | null = null
let intensity = 0

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0)

function paint(it: Item) {
  it.el.style.translate = Math.abs(it.off) < 0.05 ? '' : `0 ${it.off.toFixed(2)}px`
}

function frame(now: number) {
  raf = 0
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000))
  lastT = now

  // 1. input velocity from raw events: fast attack, slower release
  const vNow = acc / dt
  const hadInput = acc !== 0
  acc = 0
  vIn += (vNow - vIn) * (1 - Math.exp(-dt / (Math.abs(vNow) > Math.abs(vIn) ? ATTACK[kind] : RELEASE)))

  // 2. fallback: velocity of the page's own scroll
  const y = window.scrollY
  let dy = y - lastY
  lastY = y
  if (Math.abs(dy) > 600) dy = 0 // an anchor jump or scroll restore, not a scroll
  vScroll += (dy / dt - vScroll) * (1 - Math.exp(-dt / 0.08))

  // 3. adaptive scale: what counts as "hard" is learned from this device, and slowly forgotten
  scale = Math.max(FLOORS[kind], scale * Math.exp(-dt / 25), Math.min(Math.abs(vIn), FLOORS[kind] * 2.5)) // one spike can't inflate it

  // 4. intensity 0..1 and direction, from whichever source is stronger
  const iIn = clamp01(Math.abs(vIn) / scale)
  const iScroll = clamp01(Math.abs(vScroll) / (scale * 1.2)) * 0.8
  const dir = iIn >= iScroll ? sign(vIn) : sign(vScroll)
  intensity = Math.pow(Math.max(iIn, iScroll), 0.85)

  // 5. each element eases toward its own target; later ones are bigger and slower, so gaps cascade
  let busy = hadInput || Math.abs(vIn) > 8 || Math.abs(vScroll) > 8
  for (const it of items) {
    if (!it.near) {
      if (it.off !== 0) { it.off = 0; paint(it) }
      continue
    }
    const target = dir * intensity * cfg.max * it.amp
    it.off += (target - it.off) * (1 - Math.exp(-dt / it.tau))
    if (Math.abs(it.off) < 0.2 && Math.abs(target) < 0.2) it.off = 0 // settled: snap to whole pixels
    else busy = true
    paint(it)
  }

  if (debugEl) {
    debugEl.textContent = `kind ${kind}  Δ ${lastDelta.toFixed(1)} (mode ${lastMode})  vIn ${vIn.toFixed(0)}  vScroll ${vScroll.toFixed(0)}\nscale ${scale.toFixed(0)}  intensity ${intensity.toFixed(2)}  lag ${(intensity * cfg.max).toFixed(1)}px`
  }

  if (busy) raf = requestAnimationFrame(frame)
  else for (const it of items) if (it.el.style.translate) { it.off = 0; it.el.style.translate = '' } // idle: leave nothing behind
}

function kick() {
  if (raf) return
  lastT = performance.now()
  raf = requestAnimationFrame(frame)
}

function classify(e: WheelEvent, px: number, now: number) {
  const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
  if (e.deltaMode === 1) kind = 'wheel' // line-based: a notched wheel
  else if (legacy && Math.abs(legacy) % 120 === 0 && Math.abs(px) >= 50) kind = 'wheel' // classic notches
  else if (Math.abs(px) < 50 || now - lastWheelT < 40) kind = 'trackpad' // many small, frequent deltas
}

function onWheel(e: WheelEvent) {
  if (e.ctrlKey) return // pinch-zoom, not a scroll
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // horizontal
  const now = performance.now()
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
  const px = e.deltaY * unit
  classify(e, px, now)
  lastWheelT = now
  lastDelta = e.deltaY
  lastMode = e.deltaMode
  acc += px
  kick()
}

function onTouchStart(e: TouchEvent) { touchY = e.touches[0]?.clientY ?? 0 }
function onTouchMove(e: TouchEvent) {
  const y = e.touches[0]?.clientY
  if (y === undefined) return
  kind = 'touch'
  acc += touchY - y // finger up = page scrolls down
  lastDelta = touchY - y
  lastMode = 0
  touchY = y
  kick()
}

let ready = false
function init() {
  if (ready) return
  ready = true
  const touch = window.matchMedia('(pointer: coarse)').matches
  // phones: a much smaller, quicker lag keeps it clean next to native touch scrolling
  cfg = touch ? { base: 0.06, step: 0.022, max: 14 } : { base: 0.09, step: 0.04, max: 48 }
  lastY = window.scrollY
  io = new IntersectionObserver(entries => {
    for (const e of entries) { const it = byEl.get(e.target); if (it) it.near = e.isIntersecting }
  }, { rootMargin: '30% 0px' })

  window.addEventListener('wheel', onWheel, { passive: true, capture: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('scroll', kick, { passive: true })
  document.addEventListener('visibilitychange', () => { lastY = window.scrollY; acc = 0 })

  if (new URLSearchParams(location.search).has('lagdebug')) {
    debugEl = document.createElement('pre')
    debugEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:8px 10px;font:11px/1.4 ui-monospace,monospace;color:#c8ff4d;background:rgba(0,0,0,.75);border-radius:6px;pointer-events:none;white-space:pre'
    document.body.appendChild(debugEl)
  }
}

/** Lag `el` behind the scroll. `order` staggers a group: 0 follows closely, higher values trail further. */
export function registerLag(el: HTMLElement, order = 0): () => void {
  if (reduced()) return () => {}
  init()
  const o = Math.min(order, 6)
  const it: Item = { el, tau: cfg.base + o * cfg.step, amp: 0.55 + 0.45 * Math.min(o, 5) / 5, off: 0, near: false }
  el.classList.add('lag')
  items.add(it)
  byEl.set(el, it)
  io!.observe(el)
  return () => {
    items.delete(it)
    byEl.delete(el)
    io?.unobserve(el)
    el.style.translate = ''
    el.classList.remove('lag')
  }
}

<script setup lang="ts">
// Where I am, drawn from real boundaries (PSA, via scripts/build-qc-map.mjs) instead of a map library. One SVG holds the
// country, Metro Manila and Quezon City's barangays in a shared coordinate space; a camera moves (the viewBox)
// from the whole Earth in to Quezon City, which ends up highlighted in the middle of the frame.
import { geoGraticule10, geoMercator, geoOrthographic, geoPath } from 'd3-geo'
import map from '~/data/qc-map.json'
import world from '~/data/world.json'

const frame = ref<HTMLElement>()
const svg = ref<SVGSVGElement>()
const lens = ref<SVGFilterElement>()
const cam = ref<HTMLElement>()
const globeSvg = ref<SVGSVGElement>()

const { qc } = map.boxes as Record<string, number[]>
const R = 82800 // the planet's radius in view units: the same Mercator scale scripts/build-qc-map.mjs projects the country with
const proj = geoMercator().center([122, 12.5]).scale(R).translate([0, 0])
const globe = geoOrthographic().scale(R).clipAngle(90).precision(.5)
const gpath = geoPath(globe).digits(1)
const graticule = geoGraticule10()
const START_H = R * 2 * 1.18, END_H = qc[3]! / .8 // visible height: the whole planet, to Quezon City filling 80% of the frame
const to = [qc[0]! + qc[2]! / 2, qc[1]! + qc[3]! / 2], from = to // the camera looks straight at Quezon City the whole way down, so nothing ever stops on the Philippines
const viewBox = `${from[0]! - START_H * .8} ${from[1]! - START_H / 2} ${START_H * 1.6} ${START_H}`

// zoom is smooth in log space
const camera = (p: number, aspect: number) => {
  // end on Quezon City filling the frame: by height, but on a narrow (phone) frame by width too, so its orbit never clips it
  const endH = Math.max(END_H, Math.hypot(qc[2]!, qc[3]!) / (.8 * aspect))
  const h = START_H * Math.pow(endH / START_H, p), left = h / START_H * (1 - p)
  const cx = to[0]! - (to[0]! - from[0]!) * left, cy = to[1]! - (to[1]! - from[1]!) * left
  return { h, x: cx - h * aspect / 2, y: cy - h / 2 }
}
// the svg is drawn OVER times larger than the frame so a tilted plane still covers it; the viewBox grows by the same factor
const OVER = 1.9
const ease = (t: number) => t * t * (3 - 2 * t)
// the dive itself eases in and out hard (smootherstep): it drifts, then plunges, then settles. Its speed drives the lens effects
const dive = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
const diveSpeed = (t: number) => 16 * t * t * (1 - t) * (1 - t) // 0 at both ends, 1 in the middle
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const START_LON = 100 // the camera begins this far around the planet from the Philippines, on the other side
const TILT = 22 // the planet's axis leans like a desk globe, until it straightens up for the flat map
const GLOBE_END = .37 // share of the dive over which the planet turns and straightens to face the Philippines

// barrel distortion for the lens: a displacement map (red = x, green = y, 128 = no shift) that does nothing in the middle
// of the frame and pushes harder towards its edges. The layer is the size of the frame
const lensMap = () => {
  const W = 96, H = 40, cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!, img = g.createImageData(W, H)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + .5) / W * 2 - 1, v = (j + .5) / H * 2 - 1, r2 = u * u + v * v
    const k = (j * W + i) * 4
    img.data[k] = 128 + 127 * Math.max(-1, Math.min(1, u * r2 / 2))
    img.data[k + 1] = 128 + 127 * Math.max(-1, Math.min(1, v * r2 / 2))
    img.data[k + 2] = 128; img.data[k + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return cv.toDataURL()
}

onMounted(() => {
  const el = frame.value!, s = svg.value!, gs = globeSvg.value!, cm = cam.value!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const blur = lens.value!.querySelector('feGaussianBlur')!, shift = lens.value!.querySelector('feDisplacementMap')!
  lens.value!.querySelector('feImage')!.setAttribute('href', lensMap())
  const paths = Object.fromEntries(['sphere', 'grat', 'land', 'borders', 'pin'].map(k => [k, gs.querySelector(`.${k}`)!])) as Record<string, Element>
  let aspect = 1.6, p = reduced ? 1 : 0, raf = 0, spin = 0, zoomT0 = 0, dragLon = 0, lastH = START_H, dragYaw = 0, dragPitch = 0, dragging = false, visible = true, spinning = false
  const measure = () => { aspect = el.clientWidth / el.clientHeight || 1.6 }
  const ro = new ResizeObserver(() => { measure(); draw() }); ro.observe(el)
  const draw = () => {
    const c = camera(dive(p), aspect); lastH = c.h
    const w = c.h * aspect
    // the globe is drawn in the same view units, centred on whatever the camera looks at, so it hands over to the flat map
    const globeOn = Math.max(0, Math.min(1, (c.h - 12000) / 20000))
    if (globeOn > .001) {
      const vx = c.x + w / 2, vy = c.y + c.h / 2, at = proj.invert!([vx, vy])!
      // the planet slowly turns from the far side round to the Philippines, its axis tilted, then settles upright and north-up
      const settle = ease(clamp01(p / GLOBE_END)), around = (START_LON + dragLon) * (1 - settle)
      globe.rotate([-(at[0] + around), -at[1], -TILT * (1 - settle)]).translate([vx, vy])
      gpath.pointRadius(c.h * .006)
      paths.sphere.setAttribute('d', gpath({ type: 'Sphere' }) ?? '')
      paths.grat.setAttribute('d', gpath(graticule) ?? '')
      paths.land.setAttribute('d', gpath(world.land as any) ?? '')
      paths.borders.setAttribute('d', gpath(world.borders as any) ?? '')
      paths.pin.setAttribute('d', gpath({ type: 'Point', coordinates: [121.05, 14.65] }) ?? '')
    }
    gs.style.display = globeOn > .001 ? '' : 'none'
    cm.style.setProperty('--globe', String(globeOn))
    // coastlines first, then country borders and the graticule thin out as we come in: detail arrives gradually
    cm.style.setProperty('--borders', String(Math.max(0, Math.min(1, (140000 - c.h) / 70000))))
    const vb = `${(c.x - w * (OVER - 1) / 2).toFixed(1)} ${(c.y - c.h * (OVER - 1) / 2).toFixed(1)} ${(w * OVER).toFixed(1)} ${(c.h * OVER).toFixed(1)}`
    s.setAttribute('viewBox', vb); gs.setAttribute('viewBox', vb)
    // drone camera: pitch down as we close in, and orbit a little around Quezon City
    // (already leaning from the first frame, and deepening all the way down)
    const lean = ease(clamp01(p / .7)), yaw = spin + dragYaw // the turn is one continuous motion that starts early and never stops
    const pitch = Math.max(20, Math.min(78, 25 + 37 * lean + dragPitch))
    s.style.transform = `rotateX(${pitch.toFixed(2)}deg) rotateZ(${yaw.toFixed(2)}deg)`
    gs.style.transform = `rotateZ(${yaw.toFixed(2)}deg)` // the planet only rolls with the camera; tilting it would squash it into an oval
    // the lens: blur and edge distortion follow how fast the dive is going, so it racks in and out of focus as it plunges
    const v = diveSpeed(p)
    if (v > .02) {
      blur.setAttribute('stdDeviation', (2.4 * v * v).toFixed(2)); shift.setAttribute('scale', (30 * v).toFixed(1))
      cam.value!.style.filter = 'url(#lens)'
    } else if (cam.value!.style.filter) cam.value!.style.filter = ''
    // what is drawn depends on how far in we are (c.h is the visible height in view units)
    s.style.setProperty('--regions', String(Math.max(0, Math.min(1, (c.h - 1800) / 3000))))
    s.style.setProperty('--ncr', String(Math.max(0, Math.min(1, (9000 - c.h) / 3000))))
    s.style.setProperty('--brgy', String(Math.max(0, Math.min(1, (900 - c.h) / 500))))
  }
  // once the frame is in view, zoom in on its own, easing in and out, and stay there
  const run = () => {
    const t0 = performance.now(), DURATION = 14000
    zoomT0 = t0
    let prev = t0
    const tick = (t: number) => {
      const dt = Math.min(.05, (t - prev) / 1000); prev = t
      p = Math.min(1, (t - t0) / DURATION); turn(t, dt); draw()
      if (p < 1) raf = requestAnimationFrame(tick); else orbit()
    }
    raf = requestAnimationFrame(tick)
  }
  // the orbit around the camera's centre: it eases up to speed from early in the dive, then just keeps going
  const turn = (t: number, dt: number) => { spin -= 10 * dt * ease(clamp01((t - zoomT0) / 6000)) }
  // then keep circling Quezon City (the camera is centred on it, so turning the plane is an orbit); dragging takes over
  const orbit = () => {
    if (reduced || spinning) return
    spinning = true
    let prev = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(.05, (t - prev) / 1000); prev = t
      if (!dragging && visible) { turn(t, dt); draw() }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  let px = 0, py = 0
  const down = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId) }
  const move = (e: PointerEvent) => {
    if (!dragging) return
    if (p < 1) { // while the planet is showing, dragging only turns it about its own axis (degrees per pixel at the equator)
      dragLon -= (e.clientX - px) * 57.3 / (R * s.clientHeight / (lastH * OVER)); px = e.clientX; py = e.clientY; draw(); return
    }
    dragYaw -= (e.clientX - px) * .4; dragPitch = Math.max(-42, Math.min(16, dragPitch - (e.clientY - py) * .25)); px = e.clientX; py = e.clientY; draw()
  }
  const up = () => { dragging = false }
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
  const vis = new IntersectionObserver(([e]) => { visible = e!.isIntersecting }); vis.observe(el)
  measure(); draw()
  const io = new IntersectionObserver(([e]) => { if (e!.isIntersecting) { io.disconnect(); setTimeout(run, 500) } }, { threshold: .6 })
  if (!reduced) io.observe(el)
  onBeforeUnmount(() => { vis.disconnect(); ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf) })
})
</script>

<template>
  <div>
    <svg class="defs" width="0" height="0" aria-hidden="true">
      <filter id="lens" ref="lens" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="soft" />
        <feImage preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="soft" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
    <figure ref="frame" class="frame" role="img" aria-label="A view zooming from the whole Earth down to the Philippines, Metro Manila and Quezon City, highlighted">
      <div ref="cam" class="cam">
        <!-- the planet gets its own layer: it never takes the pitch, so it stays a true sphere -->
        <svg ref="globeSvg" class="map" :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g class="globe">
            <path class="sphere" /><path class="grat" /><path class="land" /><path class="borders" /><path class="pin" />
          </g>
        </svg>
        <svg ref="svg" class="map" :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="regions"><path v-for="r in map.regions" :key="r.name" :d="r.d" /></g>
        <g class="ncr"><path v-for="c in map.cities.filter(c => !c.qc)" :key="c.name" :d="c.d" /></g>
        <path class="qc" :d="map.qc" />
        <g class="brgy"><path v-for="b in map.barangays" :key="b.name" :d="b.d" /></g>
        <path class="qc-edge" :d="map.qc" />
      </svg></div>
    </figure>
  </div>
</template>

<style scoped>
.frame {
  position: relative; margin: 56px 0 0; width: 100%; height: min(42svh, 400px); overflow: hidden; cursor: grab; touch-action: pan-y; user-select: none;
  /* no box: the edges fade out so the country isn't cut off sharply */
  --fade: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent), linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
  -webkit-mask-image: var(--fade); mask-image: var(--fade);
  -webkit-mask-composite: source-in; mask-composite: intersect;
}
.defs { position: absolute; }
/* the filter runs on a frame-sized layer, not on the oversized svg, which is several times cheaper */
.cam { position: absolute; inset: 0; perspective: 700px; }
.map { pointer-events: none; position: absolute; display: block; left: -45%; top: -45%; width: 190%; height: 190%; will-change: transform; }
/* the frame owns the pointer */
.frame:active { cursor: grabbing; }
path { vector-effect: non-scaling-stroke; stroke-linejoin: round; }

/* the country and the neighbours stay quiet; only Quezon City is lit */
.regions path { fill: none; stroke: color-mix(in srgb, var(--fg) 30%, transparent); stroke-width: 1; }
.regions { opacity: calc(var(--regions, 1) * (1 - var(--globe, 0))); }
.globe { opacity: var(--globe, 1); }
.globe path { fill: none; stroke: color-mix(in srgb, var(--fg) 45%, transparent); stroke-width: 1; }
.globe .sphere { stroke: color-mix(in srgb, var(--fg) 22%, transparent); }
.globe .grat { stroke: color-mix(in srgb, var(--fg) 10%, transparent); stroke-width: .6; opacity: var(--borders, 0); }
.globe .borders { stroke: color-mix(in srgb, var(--fg) 25%, transparent); stroke-width: .7; opacity: var(--borders, 0); }
.globe .pin { fill: var(--accent); stroke: none; }
.ncr path { fill: none; stroke: color-mix(in srgb, var(--fg) 30%, transparent); stroke-width: 1; }
.ncr { opacity: var(--ncr, 0); }
.qc { fill: color-mix(in srgb, var(--accent) 38%, transparent); stroke: none; }
.brgy { opacity: var(--brgy, 0); }
.brgy path { fill: none; stroke: color-mix(in srgb, var(--accent) 70%, transparent); stroke-width: .6; }
.qc, .qc-edge { opacity: calc(1 - var(--globe, 0)); } /* the flat shape waits for the globe to hand over; the globe has its own marker */
.qc-edge { fill: none; stroke: var(--accent); stroke-width: 1.8; }


@media (max-width: 700px) {
  .frame { margin-top: 40px; height: min(46svh, 360px); }
}
</style>

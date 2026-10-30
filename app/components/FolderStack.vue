<script setup lang="ts">
// The work folder, lying on its side: a back and a front cover (no spine) with the case studies as papers between.
// Tap the front: the back slips away and up, the front slides down and toward you, and the papers spread out between
// them, each showing its top strip as a link: the stories front to back, then at the very back the paper that leads
// to all the case studies.
const { folder } = useSite()
const open = ref(false)
const root = ref<HTMLElement>()
const scene = ref<HTMLElement>()

// each story's paper shows the start of its write-up on the right; while the write-up is still a stub (headings and a
// TODO line), the folder's own short description, else the article's summary. Its cover is the photo tucked behind it
const { data: studies } = await useAsyncData('folder-studies', () =>
  queryCollection('caseStudies').where('path', 'IN', folder.items.map(it => it.to)).select('path', 'title', 'summary', 'body', 'cover').all())
const asset = useAssetUrl()
const textOf = (n: unknown): string => typeof n === 'string' ? n
  : Array.isArray(n) ? typeof n[0] === 'string' && n[1] && typeof n[1] === 'object' && !Array.isArray(n[1]) // minimark: [tag, props, ...children]
    ? n.slice(2).map(textOf).join('') + (n[0] === 'li' ? ' ' : '') : n.map(textOf).join('')
  : n && typeof n === 'object' ? textOf((n as { value?: unknown; children?: unknown }).value ?? (n as { children?: unknown }).children) : ''
const excerpt = (body: unknown) => {
  const nodes = (body as { value?: unknown[]; children?: unknown[] } | undefined)?.value ?? (body as { children?: unknown[] } | undefined)?.children ?? []
  const text = nodes
    .filter(n => ['p', 'ul', 'ol', 'blockquote'].includes(Array.isArray(n) ? n[0] : (n as { tag?: string })?.tag ?? ''))
    .map(n => textOf(n).replace(/\s+/g, ' ').trim()).filter(t => t && !/^TODO\b/i.test(t)).join(' ')
  return text.length >= 40 ? text : '' // a word or two left in a stub is not a snippet
}
const snippet = (it: (typeof folder.items)[number]) => {
  const doc = studies.value?.find(d => d.path === it.to)
  return excerpt(doc?.body) || it.blurb || doc?.summary || ''
}
const photo = (it: (typeof folder.items)[number]) => asset(studies.value?.find(d => d.path === it.to)?.cover) || ''

// in reading order, which is also the tab order: the stories, then the way to all of them
const papers = computed(() => [
  ...folder.items.map(it => ({ to: it.to, kind: optionName('articleCategories', it.category), title: studies.value?.find(d => d.path === it.to)?.title || it.title, snippet: snippet(it), photo: photo(it), more: false })),
  { to: folder.more.to, kind: '', title: folder.more.label, snippet: '', photo: '', more: true }
])
// how far toward the back each paper sits (0 = the front, 1 = the back): the first a small step behind the front, the
// last just off the back, the rest evenly between, so any number of papers spaces itself
const K_BACK = .95, K_FRONT = .12
const depth = (i: number) => { const n = papers.value.length; return (K_FRONT + (K_BACK - K_FRONT) * (n > 1 ? i / (n - 1) : 0)).toFixed(3) }

// each cover is one smooth outline (body plus a long tab along half of its top edge: the back's on the left, the
// front's on the right), drawn as an SVG mask so every corner is a real curve, outward or inward
const outline = (w: number, h: number, th: number, side: 'left' | 'right') => {
  const R = 18, TAB = 12, BASE = 6, FILLET = 10, SLANT = 22, m = w / 2
  const pts = side === 'left'
    ? [[0, h, R], [0, th, BASE], [SLANT, 0, TAB], [m - SLANT, 0, TAB], [m, th, FILLET], [w, th, R], [w, h, R]]
    : [[0, h, R], [0, th, R], [m, th, FILLET], [m + SLANT, 0, TAB], [w - SLANT, 0, TAB], [w, th, BASE], [w, h, R]]
  const n = pts.length
  const unit = (a: number[], b: number[]) => { const dx = b[0]! - a[0]!, dy = b[1]! - a[1]!, l = Math.hypot(dx, dy); return [dx / l, dy / l, l] as const }
  let d = ''
  pts.forEach((p, i) => {
    const [ax, ay, al] = unit(p, pts[(i + n - 1) % n]!), [bx, by, bl] = unit(p, pts[(i + 1) % n]!), r = Math.min(p[2]!, al / 2, bl / 2)
    d += `${i ? 'L' : 'M'}${p[0]! + ax * r},${p[1]! + ay * r}Q${p[0]},${p[1]} ${p[0]! + bx * r},${p[1]! + by * r}`
  })
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}Z"/></svg>`)}")`
}

// hovering lifts a paper a little, tilted a different way each time, so its title clears the paper in front; dragging
// moves it a little with resistance and it springs home, like the windows in the UI/UX portrait
const lift = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement
  el.style.setProperty('--lift', `${-(44 + Math.random() * 28).toFixed(0)}px`)
  el.style.setProperty('--tilt', `${((Math.random() < .5 ? -1 : 1) * (.8 + Math.random() * 1.8)).toFixed(2)}deg`)
}
const pulls = new Map<HTMLElement, { x: number, y: number, drag: { x: number, y: number } | null, moved: boolean }>()
const pullOf = (el: HTMLElement) => pulls.get(el) ?? (pulls.set(el, { x: 0, y: 0, drag: null, moved: false }), pulls.get(el)!)
const MAX_PULL = 80
const pull = (v: number) => Math.sign(v) * MAX_PULL * (1 - Math.exp(-Math.abs(v) / MAX_PULL)) // resists more the further it goes
const paint = (el: HTMLElement, s: { x: number, y: number }) => { el.style.setProperty('--dx', `${s.x.toFixed(1)}px`); el.style.setProperty('--dy', `${s.y.toFixed(1)}px`) }
const down = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!open.value || e.button !== 0) return
  const s = pullOf(el)
  s.moved = false; s.drag = { x: e.clientX, y: e.clientY }
  el.setPointerCapture(e.pointerId); el.classList.add('drag')
}
const move = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement, s = pullOf(el)
  if (!s.drag) return
  const dx = e.clientX - s.drag.x, dy = e.clientY - s.drag.y
  if (Math.hypot(dx, dy) > 5) s.moved = true
  s.x = pull(dx); s.y = pull(dy); paint(el, s)
}
const up = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement, s = pullOf(el)
  if (!s.drag) return
  s.drag = null; el.classList.remove('drag')
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { s.x = s.y = 0; paint(el, s) }
}
// a drag is not a click: caught before the link's own handler sees it, so it never navigates
const click = (e: MouseEvent) => {
  const s = pullOf(e.currentTarget as HTMLElement)
  if (!s.moved) return
  e.preventDefault(); e.stopPropagation(); s.moved = false
}

onMounted(() => {
  const el = root.value!, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) open.value = true
  const shape = () => {
    el.style.setProperty('--fh', el.offsetHeight + 'px')
    for (const [sel, side] of [['.back', 'left'], ['.front', 'right']] as const) {
      const c = el.querySelector<HTMLElement>(sel)!, th = parseFloat(getComputedStyle(c).getPropertyValue('--tabh'))
      c.querySelector<HTMLElement>('.shape')!.style.setProperty('--outline', outline(c.offsetWidth, c.offsetHeight, th, side))
    }
  }
  const ro = new ResizeObserver(shape); ro.observe(el)

  // a small, subtle follow: hover leans it toward the cursor, scrolling nudges it and it springs back, and on phones
  // that report it without asking, tilting does what hover does
  const REST_X = -16 // degrees: from a little above, looking at the front
  const f = { tx: 0, ty: 0, wheel: 0 }
  const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse') { f.tx = e.clientX / innerWidth * 2 - 1; f.ty = e.clientY / innerHeight * 2 - 1 } }
  const nudge = (d: number) => { f.wheel = Math.max(-1, Math.min(1, f.wheel + d)) }
  const onWheel = (e: WheelEvent) => nudge(e.deltaY / 600), onScroll = () => nudge(.04)
  let b0: number | null = null, g0 = 0
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return
    if (b0 == null) { b0 = e.beta; g0 = e.gamma }
    b0 += (e.beta - b0) * .004; g0 += (e.gamma - g0) * .004 // the centre slowly follows the hand
    f.tx = Math.max(-1, Math.min(1, (e.gamma - g0) / 20)); f.ty = Math.max(-1, Math.min(1, (e.beta - b0) / 20))
  }
  if (!reduced) {
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('wheel', onWheel, { passive: true })
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('deviceorientation', onOrient)
  }
  let rx = REST_X, ry = 0, fx = 0, fy = 0, sw = 0, raf = 0
  const loop = () => {
    raf = requestAnimationFrame(loop)
    f.wheel *= .93; sw += (f.wheel - sw) * .12
    fx += (f.ty - fx) * .05; fy += (f.tx - fy) * .05
    rx += (REST_X - fx * 3 + sw * 6 - rx) * .12; ry += (fy * 5 - ry) * .12 // about 3 to 6 degrees, never more
    scene.value?.style.setProperty('--rx', `${rx}deg`); scene.value?.style.setProperty('--ry', `${ry}deg`)
    for (const [p, s] of pulls) if (!s.drag && (s.x || s.y)) { // a released paper eases home
      s.x = Math.abs(s.x) < .1 ? 0 : s.x * .86; s.y = Math.abs(s.y) < .1 ? 0 : s.y * .86; paint(p, s)
    }
  }
  if (!reduced) loop()

  onBeforeUnmount(() => {
    ro.disconnect(); cancelAnimationFrame(raf)
    removeEventListener('pointermove', onMove); removeEventListener('wheel', onWheel)
    removeEventListener('scroll', onScroll); removeEventListener('deviceorientation', onOrient)
  })
})
</script>

<template>
  <section id="work" class="work">
    <div class="wrap">
      <div v-lag="0">
        <div ref="root" class="folder" :class="{ open }">
          <div ref="scene" class="scene">
            <div class="cover back" aria-hidden="true"><div class="shape" /></div>
            <NuxtLink
              v-for="(p, i) in papers" :key="p.to" :to="p.to" class="paper" :class="{ more: p.more }"
              :style="{ '--k': depth(i) }" draggable="false" :tabindex="open ? undefined : -1" :aria-hidden="open ? undefined : 'true'"
              @pointerenter="lift" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @click.capture="click"
            >
              <span class="label">
                <span v-if="!p.more" class="num">{{ p.kind }}</span>
                <span class="title">{{ p.title }}<span v-if="p.more" class="arrow" aria-hidden="true"> →</span></span>
              </span>
              <span v-if="p.snippet" class="snippet">{{ p.snippet }}</span>
              <!-- a photo print lying on the paper, low enough that the paper in front hides it; hovering the paper slides it up into view -->
              <span v-if="p.photo" class="photo" aria-hidden="true"><img :src="p.photo" alt="" loading="lazy" width="1600" height="900"></span>
            </NuxtLink>
            <button type="button" class="cover front" :aria-expanded="open" @click="open = !open">
              <span class="shape">
                <span class="head">{{ folder.heading }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.work { overflow-x: clip; }
.work .wrap { max-width: none; padding: 0 max(calc(var(--gutter) * 1.4), 11vw); } /* the folder runs close to the edges */

/* Think of the folder standing up first: two covers, no spine, each with a long tab on its right edge, the back's
   from the top to halfway, the front's from halfway to the bottom. Laid on its side (top to the left), that edge
   becomes the top of the screen. The view is from a little above, looking at the front. */
.folder {
  --gap: 46px; --tabh: 34px;
  --away: 340px; --toward: 60px; --rise: 130px; --push: calc(var(--fh, 500px) * .55); /* how the open folder spreads */
  --drop: 22%; /* moves the folder down under a camera that stays put */
  --f-back: #2f8a50; --f-front: #46b06a; --f-ink: #fff; --f-shadow: rgba(22, 22, 27, .28);
  --paper: #fffdf8; --paper-ink: #16161b;
  position: relative; width: 100%; aspect-ratio: 2.133; perspective: 1800px; perspective-origin: 50% -30%;
  /* open, the front slides down: the frame grows to make room for it */
  margin: 0; transition: margin .9s cubic-bezier(.2, .8, .2, 1);
}
/* and grows at the top too, so the back rising away clears the header */
.folder.open { margin: calc(var(--rise) * .9) 0 calc(var(--push) * .9); }
[data-theme="dark"] .folder { --f-back: var(--ramp-5); --f-front: var(--ramp-3); --f-ink: #0a0605; --f-shadow: transparent; --paper: #efe7df; --paper-ink: #0a0605; }

.scene { position: absolute; inset: 0; transform-style: preserve-3d; pointer-events: none; transform: translateY(var(--drop)) rotateX(var(--rx, -16deg)) rotateY(var(--ry, 0deg)); }
.cover { position: absolute; left: 0; right: 0; top: calc(var(--tabh) * -1); bottom: 0; filter: drop-shadow(0 22px 26px var(--f-shadow)); transition: transform .9s cubic-bezier(.2, .8, .2, 1); }
.shape { position: absolute; inset: 0; -webkit-mask: var(--outline) 0 0 / 100% 100% no-repeat; mask: var(--outline) 0 0 / 100% 100% no-repeat; }

.back { transform: translateZ(calc(var(--gap) * -1)); }
.back .shape { background: var(--f-back); }
.open .back { transform: translateY(calc(var(--rise) * -1)) translateZ(calc(var(--gap) * -1 - var(--away))); }

/* the front is the button */
.front { pointer-events: auto; padding: 0; font: inherit; color: var(--f-ink); background: none; border: 0; cursor: pointer; transform: translateZ(0); }
.open .front { transform: translateY(var(--push)) translateZ(var(--toward)); }
.front .shape {
  display: flex; align-items: flex-end; padding: clamp(24px, 4vw, 48px); text-align: left;
  background: linear-gradient(100deg, rgba(255, 255, 255, .1), transparent 35%), var(--f-front);
}
.head { font-size: clamp(26px, 5vw, 56px); font-weight: 600; letter-spacing: -.02em; line-height: 1.05; max-width: 12ch; }
.front:focus-visible { outline: none; }
.front:focus-visible .head { text-decoration: underline; text-underline-offset: 6px; }

/* papers sit between the covers by --k; opening, they follow the back's path by --k and the front's slide by 1 - --k,
   so every gap stretches by the same percentage. Nearer the back they read a touch darker */
.paper {
  position: absolute; left: 3%; right: 3%; top: calc(var(--tabh) * -.45); bottom: 4%;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 28px;
  padding: 16px clamp(18px, 3vw, 36px); border-radius: 10px; text-decoration: none;
  background: color-mix(in srgb, var(--paper) calc(100% - var(--k) * 14%), var(--paper-ink)); color: var(--paper-ink);
  box-shadow: 0 10px 20px var(--f-shadow);
  transform: translateZ(calc(var(--gap) * -1 * var(--k)));
  transition: transform .9s cubic-bezier(.2, .8, .2, 1);
  translate: var(--dx, 0) var(--dy, 0); touch-action: pan-y; /* the drag offset; no transition, the script eases it */
}
.open .paper { pointer-events: auto; transform: translateY(calc(var(--push) * (1 - var(--k)) - var(--rise) * var(--k))) translateZ(calc((var(--gap) + var(--away)) * -1 * var(--k))); }
.open .paper:is(:hover, :focus-visible) { transition-duration: .45s; transform: translateY(calc(var(--push) * (1 - var(--k)) - var(--rise) * var(--k) + var(--lift, -52px))) translateZ(calc((var(--gap) + var(--away)) * -1 * var(--k))) rotate(var(--tilt, 1.2deg)); }
.open .paper { cursor: grab; }
.open .paper.drag { cursor: grabbing; transition-duration: .3s; }
.label { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 28px; min-width: 0; }
.num { font-size: 12px; letter-spacing: .2em; text-transform: uppercase; opacity: .6; }
.title { font-size: clamp(22px, 3.2vw, 42px); font-weight: 500; letter-spacing: -.01em; line-height: 1.1; transition: color .2s; }
.paper:hover .title, .paper:focus-visible .title { color: var(--accent); }
.paper:focus-visible { outline: 2px solid var(--accent); outline-offset: -4px; }
/* the way to all case studies: small, against the right edge */
.more { justify-content: flex-end; }
.more .title { font-size: clamp(13px, 1.2vw, 16px); font-weight: 600; letter-spacing: .02em; }
/* the start of the write-up, on the right of the strip that shows */
.snippet {
  flex: 0 1 38%; max-width: 46ch; font-size: 14px; line-height: 1.4; opacity: .62;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
}

/* the photo lies a hair in front of its own paper, halfway down, where the next paper forward covers it; hovering lifts it up
   over the paper's top strip and past its top edge */
.paper { transform-style: preserve-3d; }
.photo {
  position: absolute; top: calc(var(--fh, 500px) * .5); left: 40%; width: clamp(180px, 23vw, 340px); padding: 6px 6px 18px; border-radius: 3px;
  background: #fbfaf6; box-shadow: 0 6px 16px rgba(22, 22, 27, .22); pointer-events: none;
  transform: translateZ(3px) rotate(2deg); transition: transform .6s cubic-bezier(.2, .8, .2, 1);
}
.photo img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 1px; }
.open .paper:is(:hover, :focus-visible) .photo { transform: translateZ(3px) translateY(calc(var(--fh, 500px) * -.5 - 28%)) rotate(-4deg); }
[data-theme="dark"] .photo { background: #efe7df; box-shadow: none; }

@media (max-width: 700px) {
  .work .wrap { padding: 0 var(--gutter); }
  .folder { --gap: 30px; --tabh: 26px; --away: 220px; --rise: 90px; aspect-ratio: 1.3; }
  .paper { padding: 10px 14px; gap: 12px; }
  .label { gap: 0 12px; }
  .title { font-size: 20px; }
  .more .title { font-size: 13px; }
  .num { font-size: 10px; }
  .snippet { flex-basis: 44%; font-size: 11px; line-height: 1.35; }
  .photo { width: 150px; padding: 4px 4px 12px; left: 30%; }
}
@media (prefers-reduced-motion: reduce) { .folder, .cover, .paper, .photo { transition: none; } }
</style>

<script setup lang="ts">
// Frame 2: a very large title on the left that stays put, and the introduction on the right. When the frame first
// comes into view the text assembles once, line by line from the right, quickly enough to read straight away; it
// never plays again (scrolling back up leaves it in place). Words near the mouse thicken and warm up.
const { about } = useSite()
const loaderDone = useState('loaderDone', () => false)

// **words** in the content show in orange; each word is its own span so lines can be found and words can react
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
// punctuation right after a highlighted part (no space before it) stays on the same word
const join = (text: string) => {
  const out: string[] = []
  const parts = esc(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean)
  let spaced = true // did the text so far end with a space
  for (const part of parts) {
    const key = part.startsWith('**'), raw = part.replace(/\*\*/g, '')
    const glued = !spaced && !/^\s/.test(raw) && out.length > 0
    spaced = /\s$/.test(raw)
    raw.split(/\s+/).filter(Boolean).forEach((w, i) => {
      const html = key ? `<span class="key">${w}</span>` : w
      if (i === 0 && glued) out[out.length - 1] += html
      else out.push(html)
    })
  }
  return out.map(h => `<span class="wd">${h}</span>`).join(' ')
}
const paras = computed(() => [{ lead: true, html: join(about.heading) }, ...about.body.map(b => ({ lead: false, html: join(b) }))])

const root = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const shown = ref(false) // the entrance has been triggered
const lined = ref(false) // words are grouped into lines

// group each paragraph's words into the lines the browser wrapped them onto, so each line can slide on its own
function group() {
  const el = body.value
  if (!el) return
  el.querySelectorAll<HTMLElement>('p').forEach((p, i) => {
    p.innerHTML = paras.value[i]!.html
    const lines: string[][] = []
    let top: number | null = null
    for (const w of p.querySelectorAll<HTMLElement>('.wd')) {
      if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop }
      lines.at(-1)!.push(w.outerHTML)
    }
    p.innerHTML = lines.map((l, j) => `<span class="row" style="--j:${j}">${l.join(' ')}</span>`).join('')
  })
  // a running line number across paragraphs, for the stagger
  el.querySelectorAll<HTMLElement>('.row').forEach((r, n) => r.style.setProperty('--n', String(n)))
  lined.value = true
}

let io: IntersectionObserver | null = null, raf = 0, mx = -1, my = -1, rw = 0
const hover = () => {
  raf = 0
  body.value?.querySelectorAll<HTMLElement>('.wd').forEach(w => {
    if (mx < 0) return w.style.removeProperty('--h')
    const b = w.getBoundingClientRect()
    const d = Math.hypot(b.left + b.width / 2 - mx, b.top + b.height / 2 - my)
    w.style.setProperty('--h', Math.max(0, 1 - d / 120).toFixed(3))
  })
}
const kick = () => { if (!raf) raf = requestAnimationFrame(hover) }
const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse') { mx = e.clientX; my = e.clientY; kick() } }
const onLeave = () => { mx = my = -1; kick() }
const onResize = () => { if (innerWidth !== rw) { rw = innerWidth; group() } }

onMounted(async () => {
  rw = innerWidth
  await document.fonts?.ready
  group()
  addEventListener('resize', onResize)
  root.value?.addEventListener('pointermove', onMove, { passive: true })
  root.value?.addEventListener('pointerleave', onLeave)
  // play once, when a good part of the frame is on screen and the loader has gone
  io = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting && loaderDone.value) { shown.value = true; io?.disconnect() }
  }, { threshold: 0.25 })
  if (root.value) io.observe(root.value)
  watch(loaderDone, d => { if (d && root.value) { io?.unobserve(root.value); io?.observe(root.value) } })
})
onBeforeUnmount(() => {
  io?.disconnect(); cancelAnimationFrame(raf)
  removeEventListener('resize', onResize)
  root.value?.removeEventListener('pointermove', onMove)
  root.value?.removeEventListener('pointerleave', onLeave)
})
</script>

<template>
  <section id="about" ref="root" class="about" :class="{ shown, lined }">
    <div class="wrap grid">
      <h2 class="title">
        <span class="ln"><span style="--i: 0">{{ about.title }}</span></span>
        <span class="ln"><span style="--i: 1"><em>{{ about.titleAccent }}</em></span></span>
      </h2>
      <div ref="body" class="body">
        <!-- eslint-disable-next-line vue/no-v-html -- built from our own content, escaped in join() -->
        <p v-for="(p, i) in paras" :key="i" :class="{ lead: p.lead }" v-html="p.html" />
        <NuxtLink :to="about.cta.to" class="more">{{ about.cta.label }} <span aria-hidden="true">→</span></NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about { padding: clamp(80px, 14vh, 160px) 0; }
.grid { max-width: 1400px; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: clamp(32px, 6vw, 96px); align-items: start; }

/* the title: huge, on the left, staying on screen while the text goes by */
.title { position: sticky; top: 14vh; margin: 0; font-size: clamp(56px, 9vw, 160px); font-weight: 600; letter-spacing: -.045em; line-height: .88; }
.ln { display: block; overflow: hidden; padding-bottom: .06em; }
.ln > span { display: block; }
.title em { font-style: normal; color: var(--accent); }

.body p { margin: 0 0 1.2em; font-size: clamp(19px, 1.9vw, 28px); line-height: 1.4; letter-spacing: -.01em; }
.body p.lead { font-size: clamp(24px, 2.8vw, 42px); line-height: 1.2; font-weight: 500; }
.body :deep(.key) { color: var(--accent); }
.body :deep(.wd) { display: inline-block; font-weight: calc(400 + var(--h, 0) * 350); color: color-mix(in srgb, var(--accent) calc(var(--h, 0) * 100%), currentColor); transition: font-weight .25s, color .25s; }
.body :deep(.row) { display: block; white-space: nowrap; }
.more { display: inline-block; margin-top: 8px; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; padding: 12px 0; border-bottom: 1px solid var(--line); transition: color .2s, border-color .2s; }
.more:hover, .more:focus-visible { color: var(--accent); border-color: var(--accent); }

/* the entrance, once: hidden until the lines are found, then every line glides in from the right with a short
   stagger (the whole paragraph is in place in about a second), the title slightly ahead of it */
.about:not(.shown) .ln > span { transform: translateX(30%); opacity: 0; }
.about:not(.shown) .body :deep(.row), .about:not(.shown) .more { transform: translateX(40vw); opacity: 0; }
.ln > span { transition: transform 1s cubic-bezier(.16, .84, .3, 1), opacity .8s; transition-delay: calc(var(--i) * 90ms); }
.body :deep(.row), .more { transition: transform .9s cubic-bezier(.16, .84, .3, 1), opacity .7s ease; transition-delay: calc(120ms + var(--n, 0) * 35ms); }
.more { --n: 16; }
/* before the lines are known nothing may jump: keep the text hidden but laid out */
.about:not(.lined) .body p { visibility: hidden; }

@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
  .title { position: relative; top: 0; font-size: 18vw; }
}
@media (prefers-reduced-motion: reduce) {
  .about:not(.shown) .ln > span, .about:not(.shown) .body :deep(.row), .about:not(.shown) .more { transform: none; opacity: 1; }
}
</style>

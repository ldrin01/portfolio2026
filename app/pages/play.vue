<script setup lang="ts">
// The handheld's game, full screen and on its own (no 3D): public/lab/gameboy-game.js, the same game the About page's Game Boy plays.
// Light theme is the sunny jog; dark is ZOMBIE EDSA. On a computer a keyboard guide sits beside the screen (it folds into "?" once
// you've seen it); on a phone the Game Boy's own buttons sit under the screen, in the console's colour (new grey or old yellow).
useSeoMeta({ title: 'Play', description: 'Play the Game Boy game from the About page, full screen.' })
const base = useRuntimeConfig().app.baseURL
const host = ref<HTMLDivElement>()
const stage = ref<HTMLElement>()
const theme = ref<'light' | 'dark'>('dark')
const help = ref(true)
const full = ref(false)
// screen size: 1 (small) to 5 (as big as fits), keys 1-5 or the buttons up top; it glides from one to the next
const SIZES = [0.45, 0.6, 0.74, 0.87, 1]
const size = ref(5)
const setSize = (n: number) => { size.value = n; try { localStorage.setItem('play-size', String(n)) } catch {} }
type Game = { canvas: HTMLCanvasElement; step(ms: number): boolean; press(k: string): void; release(k: string): void; win?(): void; restart?(): void; debug?: { prizes(): void } }
let game: Game | null = null, raf = 0, last = 0

const setTheme = (t: 'light' | 'dark') => {
  theme.value = t; document.documentElement.dataset.theme = t
  try { localStorage.setItem('theme', t) } catch {}
}
const buzz = () => { try { navigator.vibrate?.(12) } catch {} }
// every button does something: A, B and the D-pad all act (the game times the move for you), Start resets, Select skips to the finish
const down = (k: string) => {
  if (!game) return
  buzz()
  if (k === 'start') return game.restart?.()
  if (k === 'select') return game.debug?.prizes()
  game.press(k === 'b' ? 'b' : 'a')
}
const up = (k: string) => { if (game && k !== 'start' && k !== 'select') game.release(k === 'b' ? 'b' : 'a') }

// three keys: Space attacks (or jumps), Enter skips to the prizes, R runs again
const KEYS: Record<string, string> = { ' ': 'a', enter: 'select', r: 'start' }
const keydown = (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const k = e.key.toLowerCase()
  if (k >= '1' && k <= '5') { setSize(+k); return }
  if (k === 'f') { toggleFull(); return }
  if (k === '?' || k === 'h') { help.value = !help.value; return }
  const m = KEYS[k]; if (!m) return
  e.preventDefault(); if (!e.repeat) down(m)
}
const keyup = (e: KeyboardEvent) => { const m = KEYS[e.key.toLowerCase()]; if (m) up(m) }

async function toggleFull() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else { await stage.value?.requestFullscreen(); await (screen.orientation as unknown as { lock?(o: string): Promise<void> }).lock?.('portrait').catch(() => {}) }
  } catch {}
}
const onFull = () => { full.value = !!document.fullscreenElement }

onMounted(async () => {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  try { if (localStorage.getItem('play-help') === 'seen') help.value = false; const z = +(localStorage.getItem('play-size') || 0); if (z >= 1 && z <= 5) size.value = z } catch {}
  const w = window as unknown as { GBGame?: { create(): Game } }
  if (!w.GBGame) await new Promise<void>((ok, fail) => { const s = document.createElement('script'); s.src = `${base}lab/gameboy-game.js`; s.onload = () => ok(); s.onerror = fail; document.head.appendChild(s) })
  game = w.GBGame!.create()
  host.value!.replaceChildren(game.canvas)
  const loop = (t: number) => { if (game) game.step(last ? t - last : 0); last = t; raf = requestAnimationFrame(loop) }
  raf = requestAnimationFrame(loop)
  addEventListener('keydown', keydown); addEventListener('keyup', keyup); document.addEventListener('fullscreenchange', onFull)
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); removeEventListener('keydown', keydown); removeEventListener('keyup', keyup); document.removeEventListener('fullscreenchange', onFull); game = null })
const closeHelp = () => { help.value = false; try { localStorage.setItem('play-help', 'seen') } catch {} }
const night = computed(() => theme.value === 'dark')
// on-screen buttons: press on pointerdown, let go anywhere
const hold = (k: string) => (e: PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); down(k); const end = () => { up(k); removeEventListener('pointerup', end); removeEventListener('pointercancel', end) }; addEventListener('pointerup', end); addEventListener('pointercancel', end) }
</script>

<template>
  <main ref="stage" class="play" :class="{ night, full }" :style="{ '--k': SIZES[size - 1] }">
    <header class="bar">
      <NuxtLink to="/about" class="back" aria-label="Back to the About page">← Bumalik</NuxtLink>
      <strong class="name">{{ night ? 'SURVIVE EDSA!' : 'PIXEL PAL' }}</strong>
      <div class="tools">
        <div class="seg sizes" role="group" aria-label="Screen size">
          <button v-for="n in 5" :key="n" type="button" :aria-pressed="size === n" :aria-label="`Screen size ${n}`" @click="setSize(n)">{{ n }}</button>
        </div>
        <div class="seg" role="group" aria-label="Which game">
          <button type="button" :aria-pressed="!night" @click="setTheme('light')">Araw</button>
          <button type="button" :aria-pressed="night" @click="setTheme('dark')">Gabi</button>
        </div>
        <button type="button" class="icon help-btn" :aria-pressed="help" aria-label="How to play" title="How to play (H)" @click="help = !help">?</button>
        <button type="button" class="icon" :aria-label="full ? 'Exit full screen' : 'Full screen'" :title="full ? 'Exit full screen (F)' : 'Full screen (F)'" @click="toggleFull">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path v-if="!full" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /><path v-else d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
        </button>
      </div>
    </header>

    <div class="body">
      <div class="console">
        <div class="bezel">
          <span class="stripes" aria-hidden="true" />
          <div ref="host" class="screen" role="img" :aria-label="night ? 'SURVIVE EDSA, a zombie run on a Game Boy screen' : 'Pixel Pal, a jog through Metro Manila on a Game Boy screen'" @pointerdown.prevent="down('a')" @pointerup="up('a')" />
        </div>
        <!-- the Game Boy's own buttons, for touch screens -->
        <div class="pad" aria-label="Game Boy buttons">
          <div class="dpad">
            <button v-for="d in ['up', 'right', 'down', 'left']" :key="d" type="button" :class="d" :aria-label="d" @pointerdown="hold(d)($event)" />
            <i aria-hidden="true" />
          </div>
          <div class="ab">
            <button type="button" class="b" aria-label="B" @pointerdown="hold('b')($event)"><span>B</span></button>
            <button type="button" class="a" aria-label="A" @pointerdown="hold('a')($event)"><span>A</span></button>
          </div>
          <div class="pills">
            <button type="button" aria-label="Select: skip to the prizes" @pointerdown="hold('select')($event)"><span>SELECT</span></button>
            <button type="button" aria-label="Start: restart" @pointerdown="hold('start')($event)"><span>START</span></button>
          </div>
        </div>
      </div>

      <aside v-if="help" class="guide" aria-label="How to play">
        <div class="guide-top"><strong>Paano laruin</strong><button type="button" class="x" aria-label="Close the guide" @click="closeHelp">✕</button></div>
        <dl class="keys">
          <div><dt><kbd>Space</kbd></dt><dd>{{ night ? 'Atake' : 'Talon' }}</dd></div>
          <div><dt><kbd>Enter</kbd></dt><dd>Skip to the prizes</dd></div>
          <div><dt><kbd>R</kbd></dt><dd>Restart</dd></div>
          <div><dt><kbd>1</kbd>–<kbd>5</kbd></dt><dd>Screen size</dd></div>
        </dl>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.play { --shell: #c6c5c2; --shell-dark: #a9a8a4; --bezel: #6f6d79; position: relative; min-height: 100svh; display: grid; grid-template-rows: auto 1fr; color: var(--fg); background: var(--bg); overflow: hidden; }
.play.night { --shell: #c4b592; --shell-dark: #a39572; }
.bar { display: flex; align-items: center; gap: 12px; padding: 12px clamp(12px, 3vw, 24px); }
.back { color: var(--muted); text-decoration: none; font-size: 14px; }
.back:hover { color: var(--fg); }
.name { flex: 1; text-align: center; font-size: 13px; letter-spacing: .18em; }
.tools { display: flex; align-items: center; gap: 8px; }
.seg { display: inline-flex; padding: 3px; border: 1px solid var(--line); border-radius: 999px; }
.seg button { font: inherit; font-size: 12px; letter-spacing: .08em; color: var(--muted); background: none; border: 0; border-radius: 999px; padding: 5px 12px; cursor: pointer; }
.seg button[aria-pressed='true'] { color: var(--on-accent); background: var(--accent); }
.sizes button { padding: 5px 9px; font-variant-numeric: tabular-nums; }
.play { transition: --k .5s cubic-bezier(.2, .8, .2, 1); }
.icon { display: grid; place-items: center; width: 34px; height: 34px; font: inherit; font-weight: 700; color: var(--fg); background: none; border: 1px solid var(--line); border-radius: 50%; cursor: pointer; }
.icon[aria-pressed='true'] { border-color: var(--accent); color: var(--accent); }
.icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.body { display: flex; align-items: center; justify-content: center; gap: clamp(16px, 4vw, 48px); padding: 8px clamp(12px, 3vw, 32px) 24px; min-height: 0; }
.console { display: grid; justify-items: center; gap: 18px; }
.bezel { position: relative; padding: clamp(14px, 2.4vw, 28px) clamp(18px, 3.4vw, 44px); background: var(--bezel); border-radius: 14px 14px 56px 14px; box-shadow: 0 10px 30px rgb(0 0 0 / .3); }
.stripes { position: absolute; left: 14px; right: 14px; top: 7px; height: 5px; background: linear-gradient(#b03470 0 40%, transparent 40% 60%, #3b3190 60%); opacity: .8; }
.screen { width: calc(min(78vw, (100svh - 150px) * 160 / 144, 760px) * var(--k, 1)); transition: --k .5s cubic-bezier(.2, .8, .2, 1), width .5s cubic-bezier(.2, .8, .2, 1); aspect-ratio: 160 / 144; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.screen :deep(canvas) { display: block; width: 100%; height: 100%; image-rendering: pixelated; border-radius: 3px; }
/* the buttons only show on touch screens; on a computer the keyboard guide does the job */
.pad { display: none; }
.guide { width: 220px; flex: none; display: grid; gap: 10px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); font-size: 14px; line-height: 1.5; }
.guide-top { display: flex; align-items: center; justify-content: space-between; }
.guide p { margin: 0; }
.x { font: inherit; color: var(--muted); background: none; border: 0; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
.x:hover { color: var(--fg); }
.keys { display: grid; gap: 8px; margin: 4px 0; }
.keys div { display: flex; align-items: center; gap: 12px; }
.keys dt { display: flex; flex-wrap: wrap; gap: 4px; }
.keys dd { margin: 0; color: var(--muted); font-size: 13px; }
kbd { font: 600 12px/1 ui-monospace, Menlo, monospace; padding: 4px 7px; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 6px; background: var(--bg); color: var(--fg); }
.muted { color: var(--muted); font-size: 13px; }

@media (pointer: coarse), (max-width: 760px) {
  .play { background: var(--shell); color: #2a2a30; }
  .play :is(.back, .name, .seg button, .icon) { color: #3a3a44; }
  .seg, .icon { border-color: rgb(0 0 0 / .2); }
  .body { flex-direction: column; justify-content: flex-start; padding-top: 4px; }
  .guide { display: none; }
  .help-btn { display: none; }
  .name { white-space: nowrap; font-size: 11px; letter-spacing: .1em; }
  .bar { gap: 8px; }
  .screen { width: min(86vw, (100svh - 360px) * 160 / 144); }   /* phones: always as big as fits */
  .sizes { display: none; }
  .bezel { box-shadow: inset 0 2px 6px rgb(0 0 0 / .35); }
  .pad { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; align-items: center; width: min(92vw, 420px); gap: 22px 8px; padding-top: 8px; }
  .dpad { position: relative; width: 132px; height: 132px; justify-self: start; }
  .dpad button { position: absolute; width: 44px; height: 44px; background: #2f2f35; border: 0; padding: 0; touch-action: none; }
  .dpad .up { left: 44px; top: 0; border-radius: 6px 6px 0 0; }
  .dpad .down { left: 44px; top: 88px; border-radius: 0 0 6px 6px; }
  .dpad .left { left: 0; top: 44px; border-radius: 6px 0 0 6px; }
  .dpad .right { left: 88px; top: 44px; border-radius: 0 6px 6px 0; }
  .dpad i { position: absolute; left: 44px; top: 44px; width: 44px; height: 44px; background: #2f2f35; pointer-events: none; }
  .dpad button:active { background: #1c1c20; }
  .ab { display: flex; gap: 18px; justify-self: end; transform: rotate(-25deg); }
  .ab .b { margin-top: 30px; }
  .ab button { position: relative; width: 66px; height: 66px; border-radius: 50%; border: 0; background: #a5305c; box-shadow: 0 4px 0 #6d1d3d, 0 6px 12px rgb(0 0 0 / .25); touch-action: none; }
  .ab button:active { transform: translateY(3px); box-shadow: 0 1px 0 #6d1d3d; }
  .ab span { position: absolute; left: 50%; bottom: -22px; transform: translateX(-50%) rotate(25deg); font: 700 15px/1 system-ui, sans-serif; color: #3a3490; }
  .pills { grid-column: 1 / -1; display: flex; justify-content: center; gap: 22px; transform: rotate(-25deg); }
  .pills button { position: relative; width: 58px; height: 16px; border-radius: 10px; border: 0; background: #8e8d99; box-shadow: 0 2px 0 #5d5c66; touch-action: none; }
  .pills button:active { transform: translateY(2px); box-shadow: none; }
  .pills span { position: absolute; left: 50%; top: 22px; transform: translateX(-50%); font: 700 11px/1 system-ui, sans-serif; letter-spacing: .06em; color: #3a3490; }
}
</style>

<style>
/* registered so the screen size (--k) animates smoothly instead of jumping */
@property --k { syntax: '<number>'; inherits: true; initial-value: 1; }
</style>

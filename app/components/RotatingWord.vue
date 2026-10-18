<script setup lang="ts">
const props = withDefaults(defineProps<{ words: string[]; active?: boolean; interval?: number }>(), {
  active: true,
  interval: 2400
})

const STAGGER = 28 // ms between letters
const IN_MS = 700
const OUT_MS = 450

const index = ref(0)
const phase = ref<'hidden' | 'in' | 'idle' | 'out'>('hidden')
const timers: ReturnType<typeof setTimeout>[] = []
let started = false

const word = computed(() => props.words[index.value] ?? '')

// Split into words (so lines can wrap at spaces) and letters (so each can be staggered).
const chunks = computed(() => {
  let i = 0
  return word.value.split(' ').map(w => ({ letters: [...w].map(ch => ({ ch, i: i++ })) }))
})

const later = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }
const letterCount = () => word.value.replace(/ /g, '').length

function playIn() {
  phase.value = 'in'
  later(IN_MS + letterCount() * STAGGER, () => {
    phase.value = 'idle'
    later(props.interval, playOut)
  })
}

function playOut() {
  phase.value = 'out'
  later(OUT_MS + letterCount() * STAGGER, () => {
    index.value = (index.value + 1) % props.words.length
    playIn()
  })
}

function start() {
  if (started) return
  started = true
  index.value = 0 // always open on the first word
  later(450, playIn) // let the line finish rising first
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { phase.value = 'idle'; return }
  if (props.active) start()
})
watch(() => props.active, v => { if (v && phase.value === 'hidden') start() })
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <span class="rotator" :class="phase">
    <span class="sr">{{ word }}</span>
    <template v-for="(c, ci) in chunks" :key="ci">
      <span v-if="ci" class="sp" aria-hidden="true">{{ ' ' }}</span>
      <span class="w" aria-hidden="true">
        <span v-for="l in c.letters" :key="l.i" class="ch" :style="{ '--i': l.i }">{{ l.ch }}</span>
      </span>
    </template>
  </span>
</template>

<style scoped>
.rotator { color: var(--accent); font-weight: 600; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
/* each word is a clipping window the letters slide through */
.w { display: inline-block; white-space: nowrap; overflow-y: clip; padding-bottom: .14em; margin-bottom: -.14em; }
.sp { white-space: pre; }
.ch { display: inline-block; }

.hidden .ch { transform: translateY(110%); font-weight: 300; }
.in .ch { animation: in .7s cubic-bezier(.16, .84, .3, 1) both; animation-delay: calc(var(--i) * 28ms); }
.out .ch { animation: out .45s cubic-bezier(.6, 0, .9, .4) both; animation-delay: calc(var(--i) * 28ms); }

/* letters rise in from thin to bold, and leave bold to thin, echoing the loader */
@keyframes in  { from { transform: translateY(110%);  font-weight: 300; } to { transform: none; font-weight: 600; } }
@keyframes out { from { transform: none; font-weight: 600; } to { transform: translateY(-110%); font-weight: 300; } }

@media (prefers-reduced-motion: reduce) { .ch { animation: none !important; transform: none !important; font-weight: 600 !important; } }
</style>

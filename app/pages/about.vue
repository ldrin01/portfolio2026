<script setup lang="ts">
// "More About Me": the longer story, told to the reader in order, in 12 frames.
// Frames 1-2 load with the page. Every later frame loads when the one before it is reached (seen[n] releases frame n+1).
// Everything is in content/about-page.json (Pages → More about me).
const { data: doc } = await useAsyncData('about-page', () => queryCollection('aboutPage').first())
usePageSeo('about')
const seen = reactive<Record<number, boolean>>({})
</script>

<template>
  <main v-if="doc" class="about-page">
    <!-- 1: More about me + lenticular -->
    <header class="wrap top">
      <h1>{{ doc.title }}</h1>
      <p class="intro">{{ doc.intro }}</p>
    </header>
    <AboutLenticular :images="doc.lenticular" />

    <!-- 2: what I do these days + ID card -->
    <Defer eager @seen="seen[2] = true">
      <section class="chapter wrap">
        <div class="split">
          <div class="text">
            <h2>{{ doc.work.title }}</h2>
            <p v-for="p in doc.work.body" :key="p">{{ p }}</p>
          </div>
          <AboutIdCard :card="doc.work.card" />
        </div>
      </section>
    </Defer>

    <!-- 3: the talk + conference gallery -->
    <Defer :load="seen[2]" min-height="70vh" @seen="seen[3] = true">
      <section class="wrap sub">
        <div class="head">
          <h3>{{ doc.talk.title }}</h3>
          <p v-for="p in doc.talk.body" :key="p" class="lead">{{ p }}</p>
        </div>
        <AboutMarquee :items="doc.talk.photos" dir="left" :tilt="-3" />
      </section>
    </Defer>

    <!-- 4: before design, there was making (tools, family, writing) -->
    <Defer :load="seen[3]" min-height="120vh" @seen="seen[4] = true">
      <section class="chapter wrap">
        <div class="head">
          <h2>{{ doc.more.title }}</h2>
          <p v-for="p in doc.more.body" :key="p" class="lead">{{ p }}</p>
        </div>
        <div v-for="t in doc.more.tools" :key="t.name" class="tool">
          <p class="say">{{ t.before }} <AboutCorelBalloon v-if="t.kind === 'corel'" /><AboutToolLogo v-else :kind="t.kind" :label="`${t.name} logo`" /> <b>{{ t.name }}</b></p>
          <p class="lead">{{ t.body }}</p>
        </div>
        <div class="cards">
          <article v-for="s in doc.more.stories" :key="s.title" class="card">
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
          </article>
        </div>
      </section>
    </Defer>

    <!-- 5: off the clock, I move (routes) -->
    <Defer :load="seen[4]" min-height="100vh" @seen="seen[5] = true">
      <section class="wrap sub">
        <div class="head">
          <h3>{{ doc.more.hobbies.title }}</h3>
          <p class="lead">{{ doc.more.hobbies.body }}</p>
        </div>
        <AboutRouteWall :routes="doc.more.hobbies.routes" />
      </section>
    </Defer>

    <!-- 6: the kid with the family computer (Encarta + Paint) -->
    <Defer :load="seen[5]" min-height="120vh" @seen="seen[6] = true">
      <section class="chapter wrap">
        <div class="head">
          <h2>{{ doc.evenMore.title }}</h2>
          <p v-for="p in doc.evenMore.body" :key="p" class="lead">{{ p }}</p>
        </div>
        <div class="split">
          <div class="text">
            <h3>{{ doc.evenMore.encarta.title }}</h3>
            <p>{{ doc.evenMore.encarta.body }}</p>
          </div>
          <LazyAboutEncarta />
        </div>
        <div class="sub">
          <div class="head">
            <h3>{{ doc.evenMore.paint.title }}</h3>
            <p class="lead">{{ doc.evenMore.paint.body }}</p>
          </div>
          <LazyAboutPaint />
        </div>
      </section>
    </Defer>

    <!-- 7: a GameBoy in the bag -->
    <Defer :load="seen[6]" min-height="80vh" @seen="seen[7] = true">
      <section class="wrap">
        <div class="split sub">
          <div class="text">
            <h3>{{ doc.evenMore.gameboy.title }}</h3>
            <p>{{ doc.evenMore.gameboy.body }}</p>
            <NuxtLink to="/play" class="play-link">▶ Laro na, full screen</NuxtLink>
          </div>
          <LazyAboutGameBoy3D />
        </div>
      </section>
    </Defer>

    <!-- 8: the school project I still remember (volcano) -->
    <Defer :load="seen[7]" min-height="80vh" @seen="seen[8] = true">
      <section class="wrap sub">
        <div class="head">
          <h3>{{ doc.evenMore.volcano.title }}</h3>
          <p class="lead">{{ doc.evenMore.volcano.body }}</p>
        </div>
        <LazyAboutVolcano />
      </section>
    </Defer>

    <!-- 9: some of my artworks -->
    <Defer :load="seen[8]" min-height="60vh" @seen="seen[9] = true">
      <section class="wrap sub">
        <div class="head"><h3>{{ doc.evenMore.paintings.title }}</h3></div>
        <AboutMarquee :items="doc.evenMore.paintings.items" dir="right" :tilt="4" :speed="34" />
      </section>
    </Defer>

    <!-- 10: from the sketchbook -->
    <Defer :load="seen[9]" min-height="60vh" @seen="seen[10] = true">
      <section class="wrap sub">
        <div class="head"><h3>{{ doc.evenMore.sketches.title }}</h3></div>
        <AboutMarquee :items="doc.evenMore.sketches.items" dir="left" :tilt="-4" :speed="30" />
      </section>
    </Defer>

    <!-- 11: you scrolled too far -->
    <Defer :load="seen[10]" @seen="seen[11] = true">
      <LazyAboutTooFar :photo="doc.tooFar.photo" :alt="doc.tooFar.alt" :title="doc.tooFar.title" :body="doc.tooFar.body" />
    </Defer>

    <!-- 12: where I'm heading -->
    <Defer :load="seen[11]" min-height="60vh">
      <section class="chapter wrap">
        <div class="head">
          <h2>{{ doc.next.title }}</h2>
        </div>
        <LazyAboutPlans :plans="doc.next.plans" />
      </section>
    </Defer>
  </main>
</template>

<style scoped>
.about-page { padding: 140px 0 40px; overflow-x: clip; }
h1 { font-size: clamp(44px, 9vw, 120px); letter-spacing: -.03em; line-height: .95; margin-bottom: 20px; }
.intro { max-width: 620px; font-size: clamp(17px, 1.6vw, 20px); color: var(--muted); margin: 0; }

/* each chapter is a normal block, not a full-screen frame */
.chapter { display: block; min-height: 0; padding: clamp(72px, 10vw, 140px) 0 0; }
.chapter.wrap { padding-left: max(var(--gutter), env(safe-area-inset-left)); padding-right: max(var(--gutter), env(safe-area-inset-right)); }
.head { max-width: 720px; margin-bottom: clamp(28px, 4vw, 48px); }
h2 { font-size: clamp(32px, 5vw, 64px); font-weight: 500; letter-spacing: -.02em; line-height: 1.05; margin: 0 0 18px; }
h3 { font-size: clamp(22px, 2.4vw, 30px); font-weight: 500; letter-spacing: -.01em; line-height: 1.15; margin: 0 0 10px; }
.lead, .text p, .card p, .tool .lead { color: var(--muted); font-size: clamp(16px, 1.4vw, 18px); line-height: 1.6; margin: 0 0 12px; }
.sub { margin-top: clamp(64px, 8vw, 110px); }

.split { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 72px); align-items: center; }
.split .text { max-width: 520px; }

/* the tools: one huge line each, with the 3D logo set right in the sentence */
.tool { margin: clamp(32px, 5vw, 64px) 0; }
.say { margin: 0 0 14px; font-size: clamp(40px, 8.4vw, 132px); font-weight: 500; letter-spacing: -.035em; line-height: 1.05; }
.say b { font-weight: 700; }
.tool .lead { max-width: 560px; }

.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-top: clamp(40px, 6vw, 72px); }
.card { padding: 26px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); box-shadow: var(--shadow-card); }



@media (max-width: 800px) {
  .split { grid-template-columns: 1fr; }
}
.play-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; padding: 10px 18px; border: 1px solid var(--line); border-radius: 999px; color: var(--fg); text-decoration: none; font-size: 14px; letter-spacing: .04em; transition: border-color .2s, color .2s; }
.play-link:hover { border-color: var(--accent); color: var(--accent); }
</style>
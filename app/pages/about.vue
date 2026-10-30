<script setup lang="ts">
// "More About Me": the longer story, told to the reader in order. A lenticular photo card, the day job (an ID card
// and the talk's photos in a moving strip), the making that came before (the first tools' logos inside big lines of
// text, family, writing, a wall of run and ride routes), the kid with the family computer (the encyclopedia's logo,
// a working paint program, a handheld, Mayon as a miniature, paintings and sketches in strips going other ways), a
// photo falling onto a table for the personal part, and what's next as reactive type.
// Everything is in content/about-page.json (Pages → More about me).
const { data: doc } = await useAsyncData('about-page', () => queryCollection('aboutPage').first())
usePageSeo('about')
</script>

<template>
  <main v-if="doc" class="about-page">
    <header class="wrap top">
      <h1>{{ doc.title }}</h1>
      <p class="intro">{{ doc.intro }}</p>
    </header>

    <AboutLenticular :images="doc.lenticular" />

    <!-- the day job -->
    <section class="chapter wrap">
      <div class="split">
        <div class="text">
          <h2>{{ doc.work.title }}</h2>
          <p v-for="p in doc.work.body" :key="p">{{ p }}</p>
        </div>
        <AboutIdCard :card="doc.work.card" />
      </div>
      <div class="sub">
        <div class="head">
          <h3>{{ doc.talk.title }}</h3>
          <p v-for="p in doc.talk.body" :key="p" class="lead">{{ p }}</p>
        </div>
        <AboutMarquee :items="doc.talk.photos" dir="left" :tilt="-3" />
      </div>
    </section>

    <!-- a little more -->
    <section class="chapter wrap">
      <div class="head">
        <h2>{{ doc.more.title }}</h2>
        <p v-for="p in doc.more.body" :key="p" class="lead">{{ p }}</p>
      </div>
      <!-- the first tools, as 3D logos sitting inside big lines of text -->
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
      <div class="sub">
        <div class="head">
          <h3>{{ doc.more.hobbies.title }}</h3>
          <p class="lead">{{ doc.more.hobbies.body }}</p>
        </div>
        <AboutRouteWall :routes="doc.more.hobbies.routes" />
      </div>
    </section>

    <!-- even more: the kid with the family computer -->
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
        <AboutEncarta />
      </div>
      <div class="sub">
        <div class="head">
          <h3>{{ doc.evenMore.paint.title }}</h3>
          <p class="lead">{{ doc.evenMore.paint.body }}</p>
        </div>
        <AboutPaint />
      </div>
      <div class="split sub">
        <div class="text">
          <h3>{{ doc.evenMore.gameboy.title }}</h3>
          <p>{{ doc.evenMore.gameboy.body }}</p>
        </div>
        <AboutGameBoy />
      </div>
      <div class="sub">
        <div class="head">
          <h3>{{ doc.evenMore.volcano.title }}</h3>
          <p class="lead">{{ doc.evenMore.volcano.body }}</p>
        </div>
        <AboutVolcano />
      </div>
      <div class="sub">
        <div class="head"><h3>{{ doc.evenMore.paintings.title }}</h3></div>
        <AboutMarquee :items="doc.evenMore.paintings.items" dir="right" :tilt="4" :speed="34" />
      </div>
      <div class="sub">
        <div class="head"><h3>{{ doc.evenMore.sketches.title }}</h3></div>
        <AboutMarquee :items="doc.evenMore.sketches.items" dir="left" :tilt="-4" :speed="30" />
      </div>
    </section>

    <!-- too far: the quiet, personal part -->
    <AboutTooFar :photo="doc.tooFar.photo" :alt="doc.tooFar.alt" :title="doc.tooFar.title" :body="doc.tooFar.body" />

    <!-- what's next -->
    <section class="chapter wrap">
      <div class="head">
        <h2>{{ doc.next.title }}</h2>
      </div>
      <AboutPlans :plans="doc.next.plans" />
    </section>
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
</style>

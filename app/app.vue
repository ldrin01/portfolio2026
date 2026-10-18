<script setup lang="ts">
import { profile, projects } from '~/data/site'

const loaderDone = useState('loaderDone', () => false)
const showHeader = false // header is hidden for now
</script>

<template>
  <Loader />

  <header v-if="showHeader" class="wrap nav">
    <a href="#top" class="logo">{{ profile.name }}</a>
    <nav aria-label="Primary">
      <a href="#work">Work</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main id="top">
    <section class="hero">
      <div class="wrap hero-in">
        <h1 :class="{ ready: loaderDone }">
          <span class="line" v-lag="0"><span class="line-in">I am {{ profile.name }}</span></span>
          <span class="line" v-lag="1"><span class="line-in">I'm a <RotatingWord :words="profile.roles" :active="loaderDone" /></span></span>
        </h1>
      </div>
    </section>

    <section id="work">
      <div class="wrap">
        <p v-lag="0" class="eyebrow">Selected work</p>
        <div class="grid">
          <ProjectCard v-for="(p, i) in projects" :key="p.title" v-lag="(i % 3) + 1" v-bind="p" />
        </div>
      </div>
    </section>

    <section id="about">
      <div class="wrap about">
        <div class="about-title">
          <p v-lag="0" class="eyebrow">About</p>
          <h2 v-lag="1">A bit about me</h2>
        </div>
        <div>
          <p v-for="(para, i) in profile.about" :key="para" v-lag="i + 2">{{ para }}</p>
          <ul v-lag="4" class="skills">
            <li v-for="s in profile.skills" :key="s">{{ s }}</li>
          </ul>
        </div>
      </div>
    </section>

    <Timeline />

    <section id="contact" class="contact">
      <div class="wrap contact-in">
        <h2 class="shout" :aria-label="profile.contactHeading.join(' ')">
          <span v-for="(line, i) in profile.contactHeading" :key="line" v-lag="i" aria-hidden="true">{{ line }}</span>
        </h2>
        <p v-lag="2" class="label">Contact me</p>
        <a v-lag="3" class="mail" :href="`mailto:${profile.email}`">{{ profile.email }}</a>
      </div>
      <div class="bottom">
        <a v-for="l in profile.links" :key="l.label" class="social" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
        <p class="copy">© {{ new Date().getFullYear() }} {{ profile.name }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(8px); display: flex; justify-content: space-between; align-items: center; padding-top: 28px; padding-bottom: 28px; }
.logo { font-family: var(--serif); font-size: 26px; text-decoration: none; }
nav a { margin-left: 28px; text-decoration: none; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); transition: color .2s; }
nav a:hover { color: var(--accent); }
.hero { text-align: left; }

.hero h1 { font-family: var(--display); font-weight: 500; font-size: clamp(32px, 6vw, 88px); letter-spacing: -.02em; line-height: 1.15; }
.line { display: block; overflow-y: clip; padding-bottom: .14em; margin-bottom: -.14em; }
.line-in { display: block; transform: translateY(110%); }
.ready .line-in { animation: rise .9s cubic-bezier(.16, .84, .3, 1) both; }
.ready .line:nth-child(2) .line-in { animation-delay: .12s; }
@keyframes rise { from { transform: translateY(110%); } to { transform: none; } }
@media (prefers-reduced-motion: reduce) { .line-in { transform: none; animation: none !important; } }
.center { text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 64px 40px; margin-top: 24px; }
.about { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; }
.about h2 { font-size: clamp(36px, 5vw, 64px); }
.skills { list-style: none; padding: 0; margin: 32px 0 0; display: flex; flex-wrap: wrap; gap: 10px; }
.skills li { border: 1px solid var(--line); border-radius: 8px; padding: 4px 16px; font-size: 14px; background: var(--surface); }
@media (max-width: 600px) { .hero h1 { font-size: 8.2vw; } }

/* last frame: huge two-line headline, contact, socials along the bottom */
.contact { position: relative; min-height: 100vh; min-height: 100svh; text-align: center; padding: 96px 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; } /* equal top and bottom, so the content sits in the true middle */
.contact-in { position: relative; max-width: none; } /* the headline scales with the screen, so it must not be capped at the normal content width */
.shout { font-size: 11vw; font-weight: 800; text-transform: uppercase; line-height: 0.92; letter-spacing: -0.03em; }
.shout span { display: block; white-space: nowrap; }
.label { margin: clamp(32px, 7vh, 72px) 0 4px; padding-left: .2em; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; } /* padding offsets the trailing letter-space so it centers optically */
.mail { display: block; width: fit-content; margin: 0 auto; line-height: 1.2; padding: 8px 0; font-size: clamp(22px, 3vw, 44px); text-decoration: underline; text-decoration-color: var(--line); text-decoration-thickness: 1px; text-underline-offset: 8px; overflow-wrap: anywhere; transition: color .2s, text-decoration-color .2s; }
.mail:hover { color: var(--accent); text-decoration-color: var(--accent); }
.bottom { position: absolute; left: 0; right: 0; bottom: calc(24px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); align-items: center; text-align: left; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; }
.social { display: flex; align-items: center; min-height: 44px; padding-left: 12px; text-decoration: none; } /* sits on its own column; 44px tap target */
.social:nth-child(1) { grid-column: 1; } .social:nth-child(2) { grid-column: 2; }
.social:hover { color: var(--accent); }
.copy { grid-column: 5 / -1; margin: 0; padding-right: max(var(--gutter), env(safe-area-inset-right)); text-align: right; letter-spacing: normal; text-transform: none; font-size: 14px; color: var(--muted); }
/* content is centered in the space ABOVE the bottom row, so the visible gaps above and below it match */
.contact { padding: 0; }
.contact-in { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-top: var(--shift, 29px); } /* --shift offsets the text boxes' own padding so the VISIBLE gaps match */
.bottom { position: static; padding: 24px 0 calc(24px + env(safe-area-inset-bottom)); }
@media (max-width: 600px) { .shout { font-size: 14vw; } }
@media (max-width: 600px) { .contact-in { --shift: 40px; } }
@media (min-width: 601px) and (max-width: 800px) { .contact-in { --shift: 35px; } } /* phones: let the longest line fill the width */
@media (max-width: 800px) {
  .bottom { grid-template-columns: repeat(4, minmax(0, 1fr)); font-size: 10.5px; letter-spacing: .12em; } /* each link fits inside its column */
  .social { padding-left: 8px; }
  .copy { grid-column: 1 / -1; grid-row: 2; text-align: left; padding: 8px 8px 0; }
}
@media (max-width: 340px) { .bottom { font-size: 10px; letter-spacing: .1em; } } /* the smallest phones */
@media (max-width: 720px) { .about { grid-template-columns: 1fr; gap: 24px; } nav a { margin-left: 16px; } }
</style>

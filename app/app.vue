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
          <span class="line"><span class="line-in">I am {{ profile.name }}</span></span>
          <span class="line"><span class="line-in">I'm a <RotatingWord :words="profile.roles" :active="loaderDone" /></span></span>
        </h1>
      </div>
    </section>

    <section id="work">
      <div class="wrap">
        <p class="eyebrow center">Selected work</p>
        <div class="grid">
          <ProjectCard v-for="p in projects" :key="p.title" v-bind="p" />
        </div>
      </div>
    </section>

    <section id="about">
      <div class="wrap about">
        <div class="about-title">
          <p class="eyebrow">About</p>
          <h2>A bit about me</h2>
        </div>
        <div>
          <p v-for="para in profile.about" :key="para">{{ para }}</p>
          <ul class="skills">
            <li v-for="s in profile.skills" :key="s">{{ s }}</li>
          </ul>
        </div>
      </div>
    </section>

    <Timeline />

    <section id="contact" class="wrap contact">
      <p class="eyebrow">Contact</p>
      <h2 class="big"><a :href="`mailto:${profile.email}`">{{ profile.email }}</a></h2>
      <p class="links">
        <a v-for="l in profile.links" :key="l.label" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
      </p>
      <footer class="foot">
        <p>© {{ new Date().getFullYear() }} {{ profile.name }}</p>
      </footer>
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
.contact { text-align: center; padding-top: 96px; padding-bottom: 32px; }
.contact .foot { margin-top: auto; padding-top: 64px; }
.big { font-size: clamp(28px, 6vw, 72px); overflow-wrap: anywhere; }
.big a { text-decoration-color: var(--line); text-decoration-thickness: 1px; text-underline-offset: 10px; transition: color .2s; }
.big a:hover { color: var(--accent); text-decoration-color: var(--accent); }
.links { display: flex; justify-content: center; gap: 28px; flex-wrap: wrap; margin-top: 32px; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; }
.links a { text-decoration: none; }
.links a:hover { color: var(--accent); }
.foot { text-align: left; color: var(--muted); font-size: 14px; border-top: 1px solid var(--line); padding-top: 20px; }
.foot p { margin: 0; }
@media (max-width: 720px) { .about { grid-template-columns: 1fr; gap: 24px; } nav a { margin-left: 16px; } }
</style>

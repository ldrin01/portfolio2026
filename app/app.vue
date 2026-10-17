<script setup lang="ts">
import { profile, projects } from '~/data/site'
</script>

<template>
  <header class="wrap nav">
    <a href="#top" class="logo">{{ profile.name }}</a>
    <nav aria-label="Primary">
      <a href="#work">Work</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main id="top">
    <section class="hero wrap">
      <p class="eyebrow">{{ profile.role }}</p>
      <h1>{{ profile.tagline }}</h1>
      <Ornament class="orn-gap" />
    </section>

    <section id="work">
      <div class="wrap">
        <p class="eyebrow center">Selected work</p>
        <div class="grid">
          <ProjectCard v-for="p in projects" :key="p.title" v-bind="p" />
        </div>
      </div>
    </section>

    <Ornament />

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

    <section id="contact" class="wrap contact">
      <p class="eyebrow">Contact</p>
      <h2 class="big"><a :href="`mailto:${profile.email}`">{{ profile.email }}</a></h2>
      <p class="links">
        <a v-for="l in profile.links" :key="l.label" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
      </p>
    </section>
  </main>

  <footer class="wrap foot">
    <Ornament />
    <p>© {{ new Date().getFullYear() }} {{ profile.name }}</p>
  </footer>
</template>

<style scoped>
.nav { display: flex; justify-content: space-between; align-items: center; padding-top: 28px; padding-bottom: 28px; }
.logo { font-family: var(--serif); font-style: italic; font-size: 26px; text-decoration: none; }
nav a { margin-left: 28px; text-decoration: none; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); transition: color .2s; }
nav a:hover { color: var(--rose); }
.hero { text-align: center; padding-top: clamp(48px, 9vw, 120px); padding-bottom: clamp(32px, 6vw, 72px); }
.hero h1 { font-size: clamp(38px, 7vw, 88px); font-style: italic; max-width: 18ch; margin: 0 auto; letter-spacing: -.01em; }
.orn-gap { margin-top: 48px; }
.center { text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 64px 40px; margin-top: 24px; }
.about { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; }
.about h2 { font-size: clamp(36px, 5vw, 64px); font-style: italic; }
.skills { list-style: none; padding: 0; margin: 32px 0 0; display: flex; flex-wrap: wrap; gap: 10px; }
.skills li { border: 1px solid var(--gold); border-radius: 999px 999px 999px 4px; padding: 4px 16px; font-size: 14px; background: var(--paper); }
.contact { text-align: center; }
.big { font-size: clamp(28px, 6vw, 72px); font-style: italic; overflow-wrap: anywhere; }
.big a { text-decoration-color: var(--gold); text-decoration-thickness: 1px; text-underline-offset: 10px; transition: color .2s; }
.big a:hover { color: var(--rose); }
.links { display: flex; justify-content: center; gap: 28px; flex-wrap: wrap; margin-top: 32px; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; }
.links a { text-decoration: none; color: var(--teal); }
.links a:hover { color: var(--rose); }
.foot { text-align: center; padding-bottom: 48px; color: var(--muted); font-size: 14px; }
@media (max-width: 720px) { .about { grid-template-columns: 1fr; gap: 24px; } nav a { margin-left: 16px; } }
</style>

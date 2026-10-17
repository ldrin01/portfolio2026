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
    <section class="hero wrap" style="border-top: 0">
      <p class="eyebrow">{{ profile.role }} · Available for projects</p>
      <h1>{{ profile.tagline }}</h1>
    </section>

    <section id="work">
      <div class="wrap">
        <p class="eyebrow">Selected work</p>
        <div class="grid">
          <ProjectCard v-for="p in projects" :key="p.title" v-bind="p" />
        </div>
      </div>
    </section>

    <section id="about">
      <div class="wrap about">
        <div>
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

    <section id="contact">
      <div class="wrap">
        <p class="eyebrow">Contact</p>
        <h2 class="big"><a :href="`mailto:${profile.email}`">{{ profile.email }}</a></h2>
        <p class="links">
          <a v-for="l in profile.links" :key="l.label" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
        </p>
      </div>
    </section>
  </main>

  <footer class="wrap foot">© {{ new Date().getFullYear() }} {{ profile.name }}</footer>
</template>

<style scoped>
.nav { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; padding-bottom: 24px; }
.logo { font-family: var(--serif); font-size: 20px; text-decoration: none; }
nav a { margin-left: 24px; text-decoration: none; color: var(--muted); transition: color .2s; }
nav a:hover { color: var(--fg); }
.hero { padding-top: clamp(64px, 12vw, 160px); padding-bottom: clamp(64px, 12vw, 160px); }
.hero h1 { font-size: clamp(40px, 8vw, 104px); max-width: 16ch; letter-spacing: -.02em; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 48px 32px; }
.about { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; }
.about h2 { font-size: clamp(32px, 5vw, 56px); }
.skills { list-style: none; padding: 0; margin: 32px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
.skills li { border: 1px solid var(--line); border-radius: 999px; padding: 4px 14px; font-size: 14px; }
.big { font-size: clamp(28px, 6vw, 80px); overflow-wrap: anywhere; }
.big a { text-decoration-thickness: 1px; text-underline-offset: 8px; }
.big a:hover { color: var(--accent); }
.links { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 32px; }
.foot { padding-top: 32px; padding-bottom: 48px; color: var(--muted); font-size: 14px; }
@media (max-width: 720px) { .about { grid-template-columns: 1fr; gap: 24px; } nav a { margin-left: 16px; } }
</style>

<script setup lang="ts">
const { profile, footer } = useSite()
const sections = useSiteSections()
</script>

<template>
  <footer class="foot">
    <div class="wrap">
      <FooterGlasses class="glasses" />

      <div class="top">
        <div class="hello">
          <p class="label">{{ footer.label }}</p>
          <a class="mail" :href="`mailto:${profile.email}`">{{ profile.email }}</a>
        </div>

        <nav class="cols" aria-label="Footer">
          <div>
            <p class="label">{{ footer.exploreLabel }}</p>
            <ul><li v-for="l in sections" :key="l.to"><NuxtLink :to="l.to">{{ l.label }}</NuxtLink></li></ul>
          </div>
          <div>
            <p class="label">{{ footer.socialLabel }}</p>
            <ul><li v-for="l in profile.links" :key="l.label"><a :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a></li></ul>
          </div>
        </nav>
      </div>

      <div class="bar">
        <p class="copy">© {{ new Date().getFullYear() }} {{ profile.name }}</p>
        <NuxtLink class="copy" to="/legal">{{ footer.legalLink }}</NuxtLink>
      </div>
    </div>

    <!-- the wordmark, huge and faded, sinking off the bottom edge of the page -->
    <FooterWordmark :text="footer.wordmark" />
  </footer>
</template>

<style scoped>
/* a little more room on top: the footer is the tabletop the glasses rest on */
.foot {
  --pad: clamp(72px, 11vw, 144px); --lift: clamp(150px, 27vw, 340px);
  --rise: max(0px, var(--lift) - var(--pad)); /* how far the glasses poke above the top line */
  position: relative; padding: var(--pad) 0 0; border-top: 1px solid var(--line);
  margin-top: calc(var(--rise) + clamp(24px, 4vw, 56px)); /* every page ends clear of them, whatever its own padding */
  overflow: visible; /* the glasses rise above the footer; the wordmark is clipped by its own box below */
}
.glasses { position: relative; z-index: 1; margin-top: calc(var(--lift) * -1); margin-bottom: clamp(24px, 4vw, 48px); } /* rises above the footer's top line, into the room kept for it */

.top { display: grid; grid-template-columns: 1.1fr 1.4fr; gap: 40px clamp(32px, 6vw, 96px); align-items: start; }
.label { margin: 0 0 12px; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.mail { display: inline-block; font-size: clamp(18px, 2vw, 28px); line-height: 1.25; text-decoration: none; white-space: nowrap; border-bottom: 1px solid var(--line); padding-bottom: 4px; transition: color .2s, border-color .2s; }
.mail:hover { color: var(--accent); border-color: var(--accent); }

.cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
ul { list-style: none; margin: 0; padding: 0; }
li a { display: inline-flex; align-items: center; min-height: 34px; font-size: 15px; text-decoration: none; transition: color .2s; }
li a:hover { color: var(--accent); }

.bar { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-top: clamp(48px, 7vw, 88px); padding-top: 20px; border-top: 1px solid var(--line); }
.copy { margin: 0; font-size: 13px; color: var(--muted); text-decoration: none; }
a.copy:hover { color: var(--accent); }

@media (max-width: 860px) {
  .top { grid-template-columns: 1fr; }
}
</style>

<script setup lang="ts">
const { profile } = useSite()

const loaderDone = useState('loaderDone', () => false)
usePageSeo('home')
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: profile.name, jobTitle: 'UI/UX Designer', email: profile.email, address: { '@type': 'PostalAddress', addressLocality: 'Quezon City', addressCountry: 'PH' }, sameAs: profile.links.map(l => l.href) })
  }]
})
const roleIndex = ref(-1) // which rotating word is showing; the hero portrait follows it
</script>

<template>

  <main id="top">
    <section class="hero">
      <HeroPersonas :role="roleIndex" />
      <div class="wrap hero-in">
        <h1 :class="{ ready: loaderDone }">
          <span class="line" v-lag="0"><span class="line-in">I am {{ profile.name }}</span></span>
          <span class="line" v-lag="1"><span class="line-in">I'm a <RotatingWord :words="profile.roles" :active="loaderDone" @change="roleIndex = $event" /></span></span>
        </h1>
      </div>
    </section>

    <AboutIntro />

    <FolderStack />

    <Keyboard />

    <Timeline />

    <Toolkit />

    <Process />

    <section id="contact" class="contact">
      <div class="wrap contact-in">
        <h2 class="shout" :aria-label="profile.contactHeading.join(' ')">
          <span v-for="(line, i) in profile.contactHeading" :key="line" v-lag="i" aria-hidden="true">{{ line }}</span>
        </h2>
        <p v-lag="2" class="label">Contact me</p>
        <a v-lag="3" class="mail" :href="`mailto:${profile.email}`">{{ profile.email }}</a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hero { position: relative; text-align: left; overflow: hidden; }
.hero-in { position: relative; z-index: 1; }
@media (max-width: 1024px) { .hero { justify-content: flex-start; padding-top: clamp(88px, 14vw, 128px); } } /* tablet and phone: headline up top so it clears the portrait's head */ /* text sits in front of the depth portrait */

.hero h1 { font-family: var(--display); font-weight: 500; font-size: clamp(32px, 6vw, 88px); letter-spacing: -.02em; line-height: 1.15; }
.line { display: block; overflow-y: clip; padding-bottom: .14em; margin-bottom: -.14em; }
.line-in { display: block; transform: translateY(110%); }
.ready .line-in { animation: rise .9s cubic-bezier(.16, .84, .3, 1) both; }
.ready .line:nth-child(2) .line-in { animation-delay: .12s; }
@keyframes rise { from { transform: translateY(110%); } to { transform: none; } }
@media (prefers-reduced-motion: reduce) { .line-in { transform: none; animation: none !important; } }
.center { text-align: center; }
@media (max-width: 600px) { .hero h1 { font-size: 8.2vw; } }

/* last frame: huge two-line headline and the contact email (socials live in the footer) */
.contact { position: relative; min-height: 100vh; min-height: 100svh; text-align: center; padding: 96px 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; } /* equal top and bottom, so the content sits in the true middle */
.contact-in { position: relative; max-width: none; } /* the headline scales with the screen, so it must not be capped at the normal content width */
.shout { font-size: 11vw; font-weight: 800; text-transform: uppercase; line-height: 0.92; letter-spacing: -0.03em; }
.shout span { display: block; white-space: nowrap; }
.label { margin: clamp(32px, 7vh, 72px) 0 4px; padding-left: .2em; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; } /* padding offsets the trailing letter-space so it centers optically */
.mail { display: block; width: fit-content; margin: 0 auto; line-height: 1.2; padding: 8px 0; font-size: clamp(22px, 3vw, 44px); text-decoration: underline; text-decoration-color: var(--line); text-decoration-thickness: 1px; text-underline-offset: 8px; overflow-wrap: anywhere; transition: color .2s, text-decoration-color .2s; }
.mail:hover { color: var(--accent); text-decoration-color: var(--accent); }
.contact { padding: 0; }
.contact-in { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-top: var(--shift, 29px); } /* --shift offsets the text boxes' own padding so the VISIBLE gaps match */
@media (max-width: 600px) { .shout { font-size: 14vw; } }
@media (max-width: 600px) { .contact-in { --shift: 40px; } }
@media (min-width: 601px) and (max-width: 800px) { .contact-in { --shift: 35px; } } /* phones: let the longest line fill the width */
</style>

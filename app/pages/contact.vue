<script setup lang="ts">
const { profile, contact } = useSite()
usePageSeo('contact')
</script>

<template>
  <main class="contact-page">
    <div class="wrap">
      <p class="eyebrow">{{ contact.eyebrow }}</p>
      <h1>{{ contact.heading }}</h1>
      <p class="lead">{{ contact.lead }}</p>
      <a class="mail" :href="`mailto:${profile.email}`">{{ profile.email }}</a>
      <p class="note">{{ contact.note }}</p>
    </div>
  </main>
</template>

<style scoped>
.contact-page { padding: 140px 0 80px; min-height: 70svh; }
h1 { font-size: clamp(44px, 9vw, 120px); letter-spacing: -.02em; }
.lead { font-size: 21px; color: var(--muted); margin: 16px 0 32px; }
.mail { display: block; width: fit-content; font-size: clamp(24px, 4vw, 48px); overflow-wrap: anywhere; transition: color .2s; }
.mail:hover { color: var(--accent); }
.note { margin-top: 24px; color: var(--muted); }
</style>

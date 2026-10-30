<script setup lang="ts">
await loadSite() // every component below reads the content through useSite()
useSiteSeo() // default title, description and share card; pages override them

// the local content editor (/admin, in the git-ignored layers/admin) gets a plain page: no loader, effects, menu or footer
const route = useRoute()
const admin = computed(() => route.path.startsWith('/admin'))
if (admin.value) useState('loaderDone', () => true).value = true
// the loader only plays when the visit starts on the home page; any other page (or a reload of one) opens straight away
const intro = route.path === '/'
if (!intro) useState('loaderDone', () => true).value = true
</script>

<template>
  <NuxtPage v-if="admin" />
  <template v-else>
    <Loader v-if="intro" />
    <ThemeFX />
    <SiteMenu />
    <SiteSearch />
    <ThemeToggle />
    <NuxtPage />
    <SiteFooter />
  </template>
</template>

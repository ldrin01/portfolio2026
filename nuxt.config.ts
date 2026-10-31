// https://nuxt.com/docs/api/configuration/nuxt-config
// NUXT_APP_BASE_URL is set in CI to "/<repo-name>/" for project pages on GitHub Pages.
const base = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content', '@nuxtjs/sitemap'],
  // the public address, used for the sitemap and canonical links; set NUXT_PUBLIC_SITE_URL when the domain changes
  site: { url: process.env.NUXT_PUBLIC_SITE_URL || 'https://ldrin01.github.io/portfolio2026', name: 'Eldrin Bernardino' },
  css: ['~/assets/css/main.css'],
  nitro: { preset: 'github_pages' },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      link: [
        // the tab icon follows the theme, so app/plugins/tab.client.ts owns it (a head entry here would be put back)
        { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }
      ],
      // without JS the loader would never leave, so hide it
      noscript: [{ innerHTML: '<style>.loader{display:none!important}</style>' }],
      script: [
        // theme before first paint, so there is no flash: the saved choice, else light
        { innerHTML: "try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}" },
        // a refresh always starts at the top: no restored scroll position, no jump to a #section
        { innerHTML: "if('scrollRestoration' in history)history.scrollRestoration='manual';if(location.hash)history.replaceState(null,'',location.pathname+location.search);window.scrollTo(0,0);addEventListener('load',function(){window.scrollTo(0,0)})" }
      ]
    }
  }
})

// https://nuxt.com/docs/api/configuration/nuxt-config
// NUXT_APP_BASE_URL is set in CI to "/<repo-name>/" for project pages on GitHub Pages.
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  nitro: { preset: 'github_pages' },
  app: {
    head: {
      title: 'Your Name — Designer',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Portfolio of Your Name, a designer working across brand, product and motion.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500&display=swap' }
      ]
    }
  }
})

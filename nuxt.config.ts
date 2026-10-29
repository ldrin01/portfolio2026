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
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Portfolio of Your Name, a designer working across brand, product and motion.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&display=swap' }
      ],
      script: [
        // theme before first paint, so there is no flash: the saved choice, else the system setting
        { innerHTML: "try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}" },
        // a refresh always starts at the top: no restored scroll position, no jump to a #section
        { innerHTML: "if('scrollRestoration' in history)history.scrollRestoration='manual';if(location.hash)history.replaceState(null,'',location.pathname+location.search);window.scrollTo(0,0);addEventListener('load',function(){window.scrollTo(0,0)})" }
      ]
    }
  }
})

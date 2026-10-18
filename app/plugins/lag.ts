// v-lag="order": trail this element behind the scroll (see app/utils/scrollLag.ts)
export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive('lag', {
    mounted(el: HTMLElement & { __unlag?: () => void }, binding) {
      el.__unlag = registerLag(el, Number(binding.value) || 0)
    },
    unmounted(el: HTMLElement & { __unlag?: () => void }) {
      el.__unlag?.()
    },
    getSSRProps: () => ({})
  })
})

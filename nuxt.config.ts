// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/content',
    '@nuxtjs/turnstile',
    '@nuxt/icon'
  ],
  css: ['~/assets/css/fonts.css'],
  image: {
    provider: 'ipx',
    dir: 'public'
  }
})
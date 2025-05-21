// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
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
  content: {
    markdown: {
      highlight: {
        theme: { default: 'github-light', dark: 'github-dark' },
        langs: ['mcfunction', 'java', 'js', 'ts']     // ваши языки
      },
      remarkPlugins: {
        'remark-emoji': { options: { emoticon: true } },
        'remark-oembed': {}
      }
    }
  }
})
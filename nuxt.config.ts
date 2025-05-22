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
    '@nuxt/icon',
    '@sidebase/nuxt-auth'
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
  },
  runtimeConfig: {
    public: {
      backendURL: process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    }
  },
  auth: {
    isEnabled: true,
    originEnvKey: 'NUXT_PUBLIC_BACKEND_URL', // берём origin из env
    baseURL: `${process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/auth`, // fallback
    sessionRefresh: { enableOnWindowFocus: true, enablePeriodically: 15 * 60_000 },
    globalAppMiddleware: false,                // защищаем всё
    provider: {
      type: 'local',
      endpoints: {
        signIn:    { path: '/auth/login',   method: 'post' },
        signOut:   { path: '/auth/logout',  method: 'post' },
        getSession:{ path: '/auth/session', method: 'get'  },
        // signUp не нужен — отключаем
        signUp: false
      },
      token: {
        signInResponseTokenPointer: '/accessToken', // backend → {accessToken,…}
        type: 'Bearer',
        headerName: 'Authorization',
        cookieName: 'auth.token',
        maxAgeInSeconds: 60 * 30, // 30 мин
        sameSiteAttribute: 'lax'
      },
      refresh: {
        isEnabled: true,
        endpoint: { path: '/auth/refresh', method: 'post' },
        refreshOnlyToken: true,
        token: {
          // refreshToken хранится httpOnly на сервере, nuxt-auth трогать не нужно
          signInResponseRefreshTokenPointer: '/refreshToken',
          refreshResponseTokenPointer: '/accessToken',
          refreshRequestTokenPointer: '/uuid', // вы шлёте {uuid}
          cookieName: 'auth.refresh',
          maxAgeInSeconds: 60 * 60 * 24 * 7  // 7 дней
        }
      },
      pages: { login: '/login' },
      session: {
        dataType: {
          uuid:   'string',
          nickname: 'string'
        }
      }
    }
  }
})
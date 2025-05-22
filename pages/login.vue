<!-- pages/login.vue -->
<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, useCookie } from '#imports'

/* ---------- meta ---------- */
definePageMeta({
  auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: '/account' }
})

/* ---------- refs & state ---------- */
const router        = useRouter()
const { signIn }    = useAuth()

const form          = reactive({ nickname: '', password: '' })
const loading       = ref(false)
const errorMsg      = ref('')

// Plan modal logic removed
/* ——— согласие ——— */
const consentCookie = useCookie<string>('heli-consent', { default: () => '' })
const showConsent   = ref(consentCookie.value !== '1')
const agreeData     = ref(false)
const agreeAge      = ref(false)
const canContinue   = computed(() => agreeData.value && agreeAge.value)
const showError     = ref(false)

/* ——— turnstile ——— */
const turnstile     = ref<{ reset: () => void } | null>(null)
const captchaToken  = ref<string>('')



/* ---------- блокировка скролла фона ---------- */
watch(showConsent, open => {
  document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})



/* ---------- login ---------- */
async function handleLogin () {
  // 1) Не начинаем, пока не принято согласие
  if (showConsent.value) {
    return
  }

  loading.value = true
  errorMsg.value = ''

  // 2) Проверка наличия CAPTCHA-токена
  if (!captchaToken.value) {
    errorMsg.value = 'Пожалуйста, подтвердите, что вы не робот'
    loading.value = false
    return
  }

  // 3) Верификация токена на сервере
  try {
    const { success } = await $fetch('/_turnstile/validate', {
      method: 'POST',
      body: { token: captchaToken.value }
    })
    if (!success) {
      throw new Error('Ошибка проверки CAPTCHA')
    }
  } catch (e: any) {
    errorMsg.value = e.message || 'Ошибка проверки CAPTCHA'
    loading.value = false
    return
  }

  // 4) Попытка входа и редирект
  try {
    await signIn(
        { nickname: form.nickname, password: form.password },
        { redirect: false }
    )
    await router.push('/account')
  } catch (e: any) {
    errorMsg.value = e.message || 'Ошибка входа'
  } finally {
    loading.value = false
  }



}

/* ---------- согласие ---------- */
function acceptConsent () {
  if (!canContinue.value) {
    showError.value = true
    setTimeout(() => (showError.value = false), 600)
    return
  }
  consentCookie.value = '1'
  showConsent.value = false
}

/* ---------- отказаться ---------- */
function declineConsent () {
  consentCookie.value = '0'
  router.push('/')
}
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-24">
    <div class="w-full max-w-lg bg-gray-900/70 backdrop-blur-lg rounded-lg p-8 space-y-8">
      <h1 class="text-center pr2p text-red-500 text-3xl">Вход в аккаунт</h1>

      <p class="text-gray-300 text-sm leading-relaxed">
        Сначала <strong>зайдите на сервер</strong> и зарегистрируйтесь командой
        <code class="bg-gray-800 px-2 py-1 rounded text-red-400">/reg &lt;пароль&gt; &lt;пароль&gt;</code>.
        После этого вы сможете войти здесь.
      </p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <input
            v-model="form.nickname"
            required
            placeholder="Никнейм"
            class="w-full rounded-md bg-gray-800/70 focus:bg-gray-800 px-4 py-3 outline-none"
        />
        <input
            v-model="form.password"
            required
            type="password"
            placeholder="Пароль"
            class="w-full rounded-md bg-gray-800/70 focus:bg-gray-800 px-4 py-3 outline-none"
        />

        <!-- Turnstile -->
        <NuxtTurnstile
            ref="turnstile"
            v-model="captchaToken"
            class="w-full"
        />

        <button
            :disabled="loading || showConsent"
            class="w-full bg-red-500 hover:bg-red-600 transition rounded-md py-3 font-bold text-black disabled:opacity-60"
        >
          {{ loading ? 'Вхожу…' : 'Войти' }}
        </button>

        <p v-if="errorMsg" class="text-red-400 text-center">{{ errorMsg }}</p>
      </form>
    </div>

    <!-- ---------- модал согласия ---------- -->
    <Transition name="fade">
      <div
          v-if="showConsent"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      >
        <div class="w-full max-w-md bg-gray-900 rounded-lg p-6 space-y-6 shadow-xl overflow-hidden">
          <h2 class="pr2p text-red-500 text-2xl text-center">Согласие</h2>

          <div class="text-gray-300 text-sm space-y-4 max-h-60 overflow-y-auto pr-2">
            <p>Для работы личного кабинета мы сохраняем данные в куки и базе:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>Website account</strong> — ник, соль-хэш пароля, IP регистрации,
                TOTP-секрет, время входа/регистрации, offline / premium UUID
              </li>
              <li>
                <strong>Skin uploads</strong> — PNG/BMP-файл, MIME-тип, размер,
                UUID владельца, дата загрузки
              </li>
              <li>
                <strong>Необязательная статистика</strong> — ставится только при согласии
                (Art 6 §1 (a) GDPR)
              </li>
            </ul>
            <p>
              Подробнее:
              <NuxtLink to="/privacy" class="underline"
              >helicraft.ru/privacy</NuxtLink
              >
            </p>

            <label
                :class="[
                'flex items-start gap-2 p-2 rounded',
                showError && !agreeData ? 'ring-2 ring-red-500' : ''
              ]"
            >
              <input v-model="agreeData" type="checkbox" class="mt-1 rounded" />
              <span>Я согласен(на) на обработку куки и данных аккаунта</span>
            </label>

            <label
                :class="[
                'flex items-start gap-2 p-2 rounded',
                showError && !agreeAge ? 'ring-2 ring-red-500' : ''
              ]"
            >
              <input v-model="agreeAge" type="checkbox" class="mt-1 rounded" />
              <span
              >Мне ≥ 13 лет или у меня есть согласие родителя/опекуна (Art 8 GDPR)</span
              >
            </label>
          </div>

          <div class="flex justify-between gap-4">
            <button
                @click="acceptConsent"
                :disabled="!canContinue"
                class="flex-1 bg-red-500 hover:bg-red-600 transition py-3 rounded-md text-black font-bold disabled:opacity-60"
            >
              Продолжить
            </button>
            <button
                @click="declineConsent"
                class="flex-1 bg-gray-700 hover:bg-gray-600 transition py-3 rounded-md text-white"
            >
              Отказаться
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

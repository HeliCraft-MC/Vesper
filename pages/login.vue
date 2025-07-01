<!-- pages/login.vue -->
<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
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
const isPulsing = ref(false)

/* ——— согласие ——— */
const consentCookie = useCookie<boolean>('heli-consent', { default: () => false })
const showConsent   = ref(false)
const agreeData     = ref(false)
const agreeAge      = ref(false)
const canContinue   = computed(() => agreeData.value && agreeAge.value)
const showError     = ref(false)
const agreeDataLabel = ref<HTMLElement | null>(null)
const agreeAgeLabel  = ref<HTMLElement | null>(null)


/* ——— turnstile ——— */
const turnstile     = ref<{ reset: () => void } | null>(null)
const captchaToken  = ref<string>('')

/* Проверка на наличие куки, разрешающего сбор данных */
if(!consentCookie.value) {
  showConsent.value = true;
}

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

  const nicknameRegEx = /^[a-zA-Z0-9_]{3,16}$/

  if (!nicknameRegEx.test(form.nickname)) {
    errorMsg.value = 'Никнейм может содержать 3-16 символов: латинские буквы, цифры и _'
    loading.value = false
    turnstile.value?.reset()
    return
  }

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
    turnstile.value?.reset()
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
    errorMsg.value = e.data.data.statusMessageRu || e.message || 'Ошибка входа. Проверьте никнейм и пароль.'
    turnstile.value?.reset()
  } finally {
    loading.value = false
  }
}

/* ---------- согласие ---------- */
async function acceptConsent() {
  if (isPulsing.value) return
  if (!canContinue.value) {
    showError.value = true
    isPulsing.value = true
    setTimeout(() => { showError.value = false; isPulsing.value=false }, 1500) // Длительность анимации

    // Ждем следующего цикла обновления DOM, чтобы гарантировать, что refs доступны
    await nextTick()

    // Прокрутка к первому невыбранному чекбоксу
    if (!agreeData.value) {
      agreeDataLabel.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (!agreeAge.value) {
      agreeAgeLabel.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }
  consentCookie.value = true
  showConsent.value = false
}



/* ---------- отказаться ---------- */
function declineConsent () {
  consentCookie.value = false
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
            class="w-full rounded-md bg-gray-800/70 focus:bg-gray-800 px-4 py-3 outline-none transition-colors"
        />
        <input
            v-model="form.password"
            required
            type="password"
            placeholder="Пароль"
            class="w-full rounded-md bg-gray-800/70 focus:bg-gray-800 px-4 py-3 outline-none transition-colors"
        />

        <!-- Turnstile -->
        <NuxtTurnstile
            ref="turnstile"
            v-model="captchaToken"
            class="w-full"
        />

        <button
            :disabled="loading || showConsent"
            class="w-full bg-red-500 hover:bg-red-600 transition-all rounded-md py-3 font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div class="w-full max-w-md bg-gray-900 rounded-lg p-6 sm:p-8 space-y-6 shadow-xl overflow-hidden">
          <h2 class="pr2p text-red-500 text-2xl text-center">Согласие</h2>

          <div class="text-gray-300 text-sm space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
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
            </ul>
            <p>
              Подробнее:
              <NuxtLink to="/privacy" class="underline hover:text-red-400 transition"
              >helicraft.ru/privacy</NuxtLink
              >
            </p>

            <label
                ref="agreeDataLabel"
                class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-800/50"
                :class="{ 'animate-pulse-red': !agreeData && showError }"

            >
              <input v-model="agreeData" type="checkbox" class="custom-checkbox" />
              <span>Я согласен(на) на обработку куки и данных аккаунта</span>
            </label>

            <label
                ref="agreeAgeLabel"
                class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-800/50"
                :class="{ 'animate-pulse-red': !agreeAge && showError }"
            >
              <input v-model="agreeAge" type="checkbox" class="custom-checkbox" />
              <span>Мне ≥ 13 лет или у меня есть согласие родителя/опекуна (Art 8 GDPR)</span>
            </label>
          </div>

          <div class="flex flex-col sm:flex-row justify-between gap-4">
            <button
                @click="acceptConsent"
                class="flex-1 bg-red-500 hover:bg-red-600 transition-all py-3 rounded-md text-black font-bold"
                :class=" {'cursor-not-allowed opacity-50': !canContinue} "
            >
              Продолжить
            </button>
            <button
                @click="declineConsent"
                class="flex-1 bg-gray-700 hover:bg-gray-600 transition-colors py-3 rounded-md text-white"
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

/* Анимация пульсации для подсветки ошибок */
@keyframes pulse-red-modern {
  0% {
    transform: scale(1);
    /* начинаем без внутренней обводки */
    box-shadow: inset 0 0 0 0 theme('colors.red.500 / 70%');
    opacity: 1;
  }
  30% {
    transform: scale(0.95);
    /* внутренняя обводка 1px красного цвета */
    box-shadow: inset 0 0 0 1px #ff5555;
    opacity: 0.9;
  }
  60% {
    transform: scale(0.99);
    /* сохраняем обводку до 60% */
    box-shadow: inset 0 0 0 1px #ff5555;
    opacity: 0.8;
  }
  95%{
    transform: scale(1);
    /* возвращаемся к отсутствию обводки */
    box-shadow: inset 0 0 0 0 theme('colors.red.500 / 70%');
    opacity: 1;
  }
  100% {
    transform: scale(1);
    /* возвращаемся к отсутствию обводки */
    box-shadow: inset 0 0 0 0 theme('colors.red.500 / 70%');
    opacity: 1;
  }
}

.animate-pulse-red {
  animation: pulse-red-modern 0.6s ease-out 3;
}

/* Кастомный стиль для чекбоксов */
.custom-checkbox {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-color: theme('colors.gray.800');
  border: 1px solid theme('colors.gray.700');
  width: 1.25rem; /* 20px */
  height: 1.25rem; /* 20px */
  border-radius: 0.375rem; /* rounded-md */
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0.125rem; /* Небольшой отступ сверху для выравнивания с текстом */
  transition: background-color 0.2s, border-color 0.2s;
}

.custom-checkbox:hover {
  border-color: theme('colors.gray.600');
}

.custom-checkbox:checked {
  background-color: theme('colors.red.500');
  border-color: theme('colors.red.500');
}

.custom-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 0.4rem; /* 6.4px */
  top: 0.15rem; /* 2.4px */
  width: 0.375rem; /* 6px */
  height: 0.75rem; /* 12px */
  border: solid white;
  border-width: 0 3px 3px 0;
  transform: rotate(45deg);
}

/* Стилизация скроллбара в модальном окне */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: theme('colors.gray.800');
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: theme('colors.gray.700');
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.600');
}

</style>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuth, useRuntimeConfig } from '#imports'
import { usePlanFetch } from '@/composables/usePlanFetch'

/* ---------- auth ---------- */
const { data }   = useAuth()
const uuid       = computed(() => data.value?.uuid ?? '')
const nickname   = computed(() => data.value?.nickname ?? '')
const config = useRuntimeConfig()

/* ---------- plan url (для открытия логина в новой вкладке) ---------- */
const { public: { planApiURL = 'https://analytics.helicraft.ru' } } = useRuntimeConfig()
const planOrigin = computed(() => {
  try { return new URL(config.public.planApiURL).origin } catch { return 'https://analytics.helicraft.ru' }
})

/* ---------- state ---------- */
const loading   = ref(true)
const needReg   = ref(false)           // нет веб-сессии на Plan
const needWebLogin = ref(false)        // Plan вернул редирект/HTML → нужен вход на сайте Plan
const planCode  = ref('')              // код для /planproxy register
const password  = ref('')
const error     = ref('')
const raw       = ref<any>(null)

/* ---------- helpers ---------- */
const ms = (s?: string) => s ? Number.parseFloat(s) : null
const dt = (e?: number) => e ? new Date(e).toLocaleString() : '–'

/* ---------- fetch ---------- */
onMounted(loadStats)

async function loadStats () {
  loading.value = true
  error.value   = ''
  needWebLogin.value = false
  planCode.value = ''

  try {
    raw.value     = await usePlanFetch('/v1/player', { query:{ player: uuid.value } })
    needReg.value = false
  } catch (e: any) {
    // Не авторизован/редирект/HTML → предложим авторизацию или регистрацию
    if (e?.name === 'PlanAuthRequired' || e?.status === 401 || e?.status === 403) {
      needReg.value = true
      // если ловили именно редирект/HTML — просим зайти на сайт Plan
      if (e?.name === 'PlanAuthRequired') needWebLogin.value = true
    } else {
      error.value = e?.message || 'Ошибка загрузки статистики'
    }
  } finally {
    loading.value = false
  }
}

/* ---------- логин ---------- */
async function planLogin () {
  error.value = ''
  planCode.value = ''
  if (!password.value) { error.value = 'Введите пароль'; return }

  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()
  try {
    await usePlanFetch('/auth/login', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    needReg.value = false
    needWebLogin.value = false
    await loadStats()
  } catch (e: any) {
    if (e?.name === 'PlanAuthRequired') {
      needWebLogin.value = true
      error.value = 'Нужен вход на сайте Plan. Откройте в новой вкладке и войдите, затем нажмите «Я вошёл — проверить».'
    } else if (e?.status === 401) {
      error.value = 'Неверный пароль для веб-аккаунта Plan'
    } else {
      error.value = e?.message || 'Не удалось войти'
    }
  }
}

/* ---------- регистрация ---------- */
async function planRegister () {
  error.value = ''
  needWebLogin.value = false
  if (!password.value) { error.value = 'Введите пароль'; return }

  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()
  try {
    const r:any = await usePlanFetch('/auth/register', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    planCode.value = r?.code || ''
    if (!planCode.value) throw new Error('Пустой код регистрации')
  } catch (e: any) {
    if (e?.name === 'PlanAuthRequired') {
      needWebLogin.value = true
      error.value = 'Похоже, сервер требует вход на сайте Plan перед регистрацией.'
    } else {
      error.value = e?.message || 'Не удалось зарегистрироваться'
    }
  }
}

/* ---------- проверка активации кода ---------- */
async function checkActivation() {
  error.value = ''
  if (!password.value) { error.value = 'Введите пароль'; return }

  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()
  try {
    await usePlanFetch('/auth/login', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    needReg.value = false
    planCode.value = ''
    await loadStats()
  } catch {
    error.value = 'Код ещё не активирован на сервере'
  }
}

/* ---------- ui метрики ---------- */
const stats = computed(() => {
  if (!raw.value) return null
  const i = raw.value.info       ?? {}
  const k = raw.value.kill_data  ?? {}
  return [
    { icon:'mdi:history',             label:'Сессий',          val:i.session_count },
    { icon:'mdi:clock',               label:'Игровое время',   val:i.playtime },
    { icon:'mdi:progress-clock',      label:'Активное',        val:i.active_playtime },
    { icon:'mdi:sleep',               label:'AFK',             val:i.afk_time },
    { icon:'mdi:check-decagram', label: 'Индекс активности', val: i.activity_index },
    { icon:'mdi:login',               label:'Последний визит', val:dt(i.last_seen_raw_value) },
    { icon:'mdi:lan',                 label:'⌀ пинг, мс',      val:ms(i.average_ping) ?? '–' },
    { icon:'mdi:sword',               label:'PvP-киллы',       val:k.player_kills_total },
    { icon:'mdi:emoticon-dead',       label:'Смерти',          val:k.deaths_total },
    { icon:'mdi:cow',                 label:'Mob-киллы',       val:k.mob_kills_total },
    { icon:'mdi:server',              label:'Любимый сервер',  val:i.favorite_server ?? '–' },
    { icon:'mdi:trophy',              label:'MAX сессия',      val:i.longest_session_length }
  ]
})

/* ---------- helpers ui ---------- */
function openPlanInNewTab() {
  window.open(planOrigin.value, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <h2 class="pr2p text-2xl text-red-500 mb-6 flex items-center gap-2">
      <Icon name="mdi:chart-box" class="w-6 h-6"/> Статистика
    </h2>

    <!-- ======= Загрузка ======= -->
    <p v-if="loading" class="text-gray-400">Загружаем…</p>

    <!-- ======= Нет веб-сессии на Plan: авторизация/регистрация ======= -->
    <template v-else-if="needReg">
      <div class="space-y-4">
        <p class="text-gray-300">
          Чтобы видеть личную статистику, войдите в&nbsp;Plan или создайте веб-аккаунт.
        </p>

        <!-- если Plan вернул HTML/редирект — подсказываем открыть Plan -->
        <div v-if="needWebLogin" class="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
          Требуется вход на сайте Plan. Откройте <span class="font-semibold">{{ planOrigin }}</span> в новой вкладке,
          выполните вход, затем вернитесь и нажмите «Я вошёл — проверить».
          <div class="mt-3 flex gap-2">
            <button @click="openPlanInNewTab" class="bg-gray-700 hover:bg-gray-600 rounded-md px-4 py-2">
              Открыть Plan
            </button>
            <button @click="planLogin" class="bg-red-500 hover:bg-red-600 rounded-md px-4 py-2 text-black font-bold">
              Я вошёл — проверить
            </button>
          </div>
        </div>

        <!-- пароль -->
        <input
            v-model="password"
            type="password"
            placeholder="Пароль веб-аккаунта Plan"
            class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none"
        />

        <!-- кнопки Логин / Регистрация -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button @click="planLogin"
                  class="flex-1 bg-red-500 hover:bg-red-600 rounded-md py-3 font-bold text-black">
            Войти
          </button>
          <button @click="planRegister"
                  class="flex-1 bg-gray-700 hover:bg-gray-600 rounded-md py-3">
            Создать веб-аккаунт
          </button>
        </div>

        <p v-if="error" class="text-red-400">{{ error }}</p>

        <!-- этап после /auth/register: показ кода -->
        <div v-if="planCode" class="space-y-3 pt-2">
          <p class="text-gray-300 text-sm">
            На сервере выполните команду:<br>
            <code class="bg-gray-800 px-2 py-1 rounded text-red-400 select-all">
              /planproxy register --code {{ planCode }}
            </code>
          </p>
          <button @click="checkActivation"
                  class="w-full bg-gray-700 hover:bg-gray-600 rounded-md py-3">
            Проверить готово ли
          </button>
        </div>
      </div>
    </template>

    <!-- ======= Готовая статистика ======= -->
    <table v-else class="w-full text-gray-300 text-sm md:text-base">
      <tbody>
      <tr v-for="s in stats" :key="s.label" class="border-t border-gray-800/70">
        <td class="py-2 flex items-center gap-2">
          <Icon :name="s.icon" class="w-4 h-4 shrink-0"/> {{ s.label }}
        </td>
        <td class="py-2 text-right font-semibold">{{ s.val }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

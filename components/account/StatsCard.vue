<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth }      from '#imports'
import { usePlanFetch } from '@/composables/usePlanFetch'

/* ---------- auth ---------- */
const { data }   = useAuth()
const uuid       = computed(() => data.value?.uuid ?? '')
const nickname   = computed(() => data.value?.nickname ?? '')

/* ---------- state ---------- */
const loading   = ref(true)
const needReg   = ref(false)
const planCode  = ref('')
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
  try {
    raw.value   = await usePlanFetch('/v1/player', { query:{ player: uuid.value } })
    needReg.value = false
  } catch {           // 400/401 → нет web-учётки
    needReg.value = true
  } finally {
    loading.value = false
  }
}

/* ---------- (re)login / register ---------- */
async function authOrRegister () {
  if (!password.value) return
  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()

  // 1) пробуем войти
  try {
    await usePlanFetch('/auth/login', { method:'POST', body })
    needReg.value = false
    return loadStats()
  } catch {/* ignore */ }

  // 2) не вышло — пытаемся зарегистрировать
  try {
    const r:any = await usePlanFetch('/auth/register', { method:'POST', body })
    planCode.value = r.code
  } catch {
    error.value = 'Не удалось зарегистрироваться'
  }
}

async function checkActivation() {
  if (!password.value) return
  const body = new URLSearchParams({
    user:     nickname.value,
    password: password.value
  }).toString()

  try {
    // Попытка логина — если код активирован, вернётся 200
    await usePlanFetch('/auth/login', { method: 'POST', body })
    needReg.value = false
    planCode.value = ''
    return loadStats()
  } catch {
    error.value = 'Код ещё не активирован на сервере'
  }
}

/* ---------- вычисленные метрики ---------- */
const stats = computed(() => {
  if (!raw.value) return null
  const i = raw.value.info       ?? {}
  const k = raw.value.kill_data  ?? {}
  return [
    { icon:'mdi:history',  label:'Сессий',          val:i.session_count },
    { icon:'mdi:clock',    label:'Игровое время',   val:i.playtime },
    { icon:'mdi:progress-clock', label:'Активное',  val:i.active_playtime },
    { icon:'mdi:sleep',    label:'AFK',             val:i.afk_time },
    { icon:'mdi:login',    label:'Последний визит', val:dt(i.last_seen_raw_value) },
    { icon:'mdi:lan',      label:'⌀ пинг, мс',      val:ms(i.average_ping) ?? '–' },
    { icon:'mdi:sword',    label:'PvP-киллы',       val:k.player_kills_total },
    { icon:'mdi:emoticon-dead', label:'Смерти',     val:k.deaths_total },
    { icon:'mdi:cow',      label:'Mob-киллы',       val:k.mob_kills_total },
    { icon:'mdi:server',   label:'Любимый сервер',  val:i.favorite_server ?? '–' },
    { icon:'mdi:trophy',   label:'MAX сессия',      val:i.longest_session_length }
  ]
})
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <h2 class="pr2p text-2xl text-red-500 mb-6 flex items-center gap-2">
      <Icon name="mdi:chart-box" class="w-6 h-6"/> Статистика
    </h2>

    <!-- ======= Загрузка ======= -->
    <p v-if="loading" class="text-gray-400">Загружаем…</p>

    <!-- ======= Регистрация ======= -->
    <template v-else-if="needReg">
      <p class="text-gray-300 mb-4">
        Чтобы видеть личную статистику, завершите регистрацию в&nbsp;Plan.
      </p>

      <!-- Шаг 1: пароль -->
      <div v-if="!planCode" class="space-y-3">
        <input v-model="password" type="password" placeholder="Пароль"
               class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none" />
        <button @click="authOrRegister"
                class="w-full bg-red-500 hover:bg-red-600 rounded-md py-3 font-bold text-black">
          Продолжить
        </button>
        <p v-if="error" class="text-red-400">{{ error }}</p>
      </div>

      <!-- Шаг 2: план-код -->
      <div v-else class="space-y-3">
        <p class="text-gray-300 text-sm">
          Введите на сервере команду:<br>
          <code class="bg-gray-800 px-2 py-1 rounded text-red-400 select-all">/planproxy register --code {{ planCode }}</code>
        </p>
        <button @click="checkActivation"
                class="w-full bg-gray-700 hover:bg-gray-600 rounded-md py-3">
          Проверить готово ли
        </button>
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

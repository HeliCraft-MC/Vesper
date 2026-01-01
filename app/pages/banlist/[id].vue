<!-- pages/banlist/[id].vue -->
<script setup lang="ts">
import type { IBan, IBanListResponse } from '~/types/banlist.types'
import TimeFormatToggle from '~/components/ui/TimeFormatToggle.vue'
import { useTimeFormat } from '~/composables/useTimeFormat'
import { getBanStatus, getBanDuration, getBanUntilText, readBanField } from '~/utils/banlist.utils'

definePageMeta({ auth: false })

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { data: session } = useAuth()

// Проверка, включён ли банлист
if (!config.public.banlistEnabled) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Страница не найдена'
  })
}

const banId = computed(() => route.params.id as string)
const userUuid = computed(() => session.value?.uuid)

/* ───── Состояние ───── */
const loading = ref(true)
const error = ref('')
const ban = ref<IBan | null>(null)
const isAdmin = ref(false)
const checkingAdmin = ref(false)
const removingBan = ref(false)
const removeReason = ref('')
const showRemoveModal = ref(false)

const { formatTime, formatAbsoluteTime } = useTimeFormat()

/* ───── Вспомогательные функции ───── */
function formatSpecialName(name: string | null): string {
  if (!name) return '—'
  if (name === '#expired') return 'Автоистечение'
  if (name === '[Console]' || name === 'Console' || name === 'CONSOLE') return 'Консоль'
  if (name?.startsWith('[')) return name.slice(1, -1)
  return name
}

function getPlayerNickname(ban: IBan | null): string {
  if (!ban) return '—'
  return ban.uuid_nickname || ban.uuid.slice(0, 8)
}

/* ───── Загрузка данных о бане ───── */
async function loadBan() {
  loading.value = true
  error.value = ''

  try {
    // Используем query параметр id для загрузки конкретного бана
    const data = await useApiFetch<IBanListResponse>('/banlist', {
      query: { id: banId.value }
    })

    if (data.data.value && data.data.value.items && data.data.value.items.length > 0) {
      ban.value = data.data.value.items[0]
    } else {
      error.value = 'Бан не найден'
    }
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при загрузке данных'
    console.error('Ошибка загрузки бана:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Проверка прав администратора ───── */
async function checkAdminStatus() {
  if (!userUuid.value) {
    isAdmin.value = false
    return
  }

  checkingAdmin.value = true
  try {
    isAdmin.value = await $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`)
  } catch {
    isAdmin.value = false
  } finally {
    checkingAdmin.value = false
  }
}

/* ───── Снятие бана ───── */
async function removeBan() {
  if (!ban.value || !userUuid.value) return

  removingBan.value = true
  error.value = ''

  try {
    const { error: fetchError } = await useApiFetch(`/api/banlist/${ban.value.id}`, {
      method: 'DELETE',
      body: {
        reason: removeReason.value || 'Снят через веб-интерфейс'
      },
      headers: {
        'x-uuid': userUuid.value
      }
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Не удалось снять бан')
    }

    // Успешно снят, возвращаемся на банлист
    await router.push('/banlist')
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при снятии бана'
    console.error('Ошибка снятия бана:', e)
  } finally {
    removingBan.value = false
    showRemoveModal.value = false
  }
}

/* ───── Вспомогательные функции ───── */
function getStatusColor(ban: IBan): string {
  return getBanStatus(ban).color
}

function getStatusText(ban: IBan): string {
  return getBanStatus(ban).text
}

function getDuration(ban: IBan): string {
  return getBanDuration(ban)
}

/* ───── Инициализация ───── */
onMounted(async () => {
  await Promise.all([loadBan(), checkAdminStatus()])
})
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-4xl mx-auto space-y-6">
      <!-- Навигация назад -->
      <NuxtLink to="/banlist" class="inline-flex items-center gap-2 text-gray-400 hover:text-red-400 transition">
        <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
        <span>Вернуться к банлисту</span>
      </NuxtLink>

      <!-- Заголовок -->
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="pr2p text-3xl md:text-4xl font-extrabold text-red-500 flex items-center gap-3">
            <Icon name="solar:shield-warning-bold-duotone" class="w-8 h-8" />
            Бан #{{ banId }}
          </h1>
        </div>

        <!-- Переключатель формата времени -->
        <TimeFormatToggle />
      </header>

      <!-- Загрузка -->
      <div v-if="loading" class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-12 text-center">
        <div class="flex justify-center items-center gap-3">
          <div class="w-8 h-8 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
          <span class="text-gray-400">Загрузка...</span>
        </div>
      </div>

      <!-- Ошибка -->
      <div v-else-if="error" class="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
        <div class="flex items-center gap-3 mb-4">
          <Icon name="solar:danger-circle-bold" class="w-6 h-6 text-red-400" />
          <span class="text-red-300 text-lg">{{ error }}</span>
        </div>
        <NuxtLink to="/banlist" class="inline-block bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md text-black font-bold">
          Вернуться к банлисту
        </NuxtLink>
      </div>

      <!-- Информация о бане -->
      <template v-else-if="ban">
        <!-- Основная информация -->
        <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6 space-y-6">
          <!-- Статус -->
          <div class="flex items-center justify-between pb-4 border-b border-gray-800">
            <h2 class="text-xl font-bold">Статус бана</h2>
            <span class="text-lg font-bold" :class="getStatusColor(ban)">
              {{ getStatusText(ban) }}
            </span>
          </div>

          <!-- Информация -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Никнейм игрока -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">Никнейм игрока</label>
            <NuxtLink
                :to="`/player/${ban.uuid}`"
                class="text-red-400 hover:text-red-300 transition font-bold text-lg"
            >
              {{ getPlayerNickname(ban) }}
            </NuxtLink>
            <div class="font-mono text-xs text-gray-500 mt-1">{{ ban.uuid }}</div>
          </div>

            <!-- IP адрес -->
            <div v-if="ban.ip">
              <label class="block text-sm text-gray-400 mb-2">IP адрес</label>
              <div class="font-mono text-white">{{ ban.ip }}</div>
            </div>

            <!-- Администратор -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Выдал бан</label>
              <div class="text-white font-semibold">{{ ban.banned_by_name }}</div>
              <div class="font-mono text-xs text-gray-500 mt-1">{{ ban.banned_by_uuid }}</div>
            </div>

            <!-- Дата выдачи -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Дата выдачи</label>
              <div class="text-white">{{ formatTime(ban.time) }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ formatAbsoluteTime(ban.time) }}</div>
            </div>

            <!-- Длительность -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Длительность</label>
              <div class="text-white">{{ getDuration(ban) }}</div>
            </div>

            <!-- Истекает -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Истекает</label>
              <div class="text-white">{{ formatTime(ban.until) }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ formatAbsoluteTime(ban.until) }}</div>
            </div>

            <!-- Тип бана -->
            <div class="md:col-span-2">
              <label class="block text-sm text-gray-400 mb-2">Тип бана</label>
              <div class="flex gap-3">
                <span v-if="readBanField(ban.ipban) === 1" class="px-3 py-1 bg-red-900/50 border border-red-500/50 rounded-md text-red-300 text-sm">
                  IP Ban
                </span>
                <span v-if="readBanField(ban.silent) === 1" class="px-3 py-1 bg-purple-900/50 border border-purple-500/50 rounded-md text-purple-300 text-sm">
                  Скрытый
                </span>
                <span v-if="readBanField(ban.ipban) === 0 && readBanField(ban.silent) === 0" class="px-3 py-1 bg-gray-800/50 border border-gray-600/50 rounded-md text-gray-300 text-sm">
                  Обычный
                </span>
              </div>
            </div>

            <!-- Причина -->
            <div class="md:col-span-2">
              <label class="block text-sm text-gray-400 mb-2">Причина бана</label>
              <div class="bg-gray-800/50 rounded-lg p-4 text-white whitespace-pre-wrap">
                {{ ban.reason }}
              </div>
            </div>
          </div>
        </section>

        <!-- Информация о снятии бана -->
        <section v-if="ban.removed_by_uuid" class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6 space-y-4">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <Icon name="solar:check-circle-bold" class="w-6 h-6 text-green-500" />
            Бан снят
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Кто снял -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Снял бан</label>
              <div class="text-white font-semibold">
                {{ formatSpecialName(ban.removed_by_name) }}
              </div>
              <div v-if="ban.removed_by_uuid" class="font-mono text-xs text-gray-500 mt-1">
                {{ ban.removed_by_uuid }}
              </div>
            </div>

            <!-- Дата снятия -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Дата снятия</label>
              <div class="text-white">{{ ban.removed_by_date ? new Date(ban.removed_by_date).toLocaleDateString('ru-RU') : '—' }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ ban.removed_by_date ? formatTime(new Date(ban.removed_by_date).getTime()) : '—' }}</div>
            </div>

            <!-- Причина снятия -->
            <div class="md:col-span-2">
              <label class="block text-sm text-gray-400 mb-2">Причина снятия</label>
              <div class="bg-gray-800/50 rounded-lg p-4 text-white whitespace-pre-wrap">
                {{ ban.removed_by_reason || '—' }}
              </div>
            </div>
          </div>
        </section>

        <!-- Кнопка снятия бана (для админов) -->
        <section v-if="isAdmin && readBanField(ban.active) === 1" class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="solar:shield-user-bold-duotone" class="w-6 h-6 text-red-500" />
            Панель администратора
          </h2>

          <button
              @click="showRemoveModal = true"
              :disabled="removingBan"
              class="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition px-6 py-3 rounded-md text-black font-bold"
          >
            Снять бан
          </button>
        </section>
      </template>
    </div>

    <!-- Модальное окно подтверждения снятия бана -->
    <Teleport to="body">
      <Transition name="fade">
        <div
            v-if="showRemoveModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            @click.self="showRemoveModal = false"
        >
          <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-700 mx-4">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold text-red-500">Снять бан</h2>
              <button @click="showRemoveModal = false" class="text-gray-400 hover:text-white transition">
                <Icon name="mdi:close" class="w-6 h-6" />
              </button>
            </div>

            <p class="text-gray-300">
              Вы уверены, что хотите снять этот бан?
            </p>

            <div>
              <label class="block text-sm text-gray-400 mb-2">Причина снятия (опционально)</label>
              <textarea
                  v-model="removeReason"
                  placeholder="Укажите причину снятия бана..."
                  class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition resize-none"
                  rows="3"
              ></textarea>
            </div>

            <div class="flex justify-end gap-4 pt-4">
              <button
                  @click="showRemoveModal = false"
                  :disabled="removingBan"
                  class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition py-2 px-6 rounded-md font-bold"
              >
                Отмена
              </button>
              <button
                  @click="removeBan"
                  :disabled="removingBan"
                  class="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition py-2 px-6 rounded-md font-bold text-black flex items-center gap-2"
              >
                <span v-if="removingBan" class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>{{ removingBan ? 'Снятие...' : 'Снять бан' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>


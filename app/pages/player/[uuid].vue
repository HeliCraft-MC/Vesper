<!-- pages/player/[uuid].vue -->
<script setup lang="ts">
import type { IBan } from '~/types/banlist.types'
import TimeFormatToggle from '~/components/ui/TimeFormatToggle.vue'
import { useTimeFormat } from '~/composables/useTimeFormat'

definePageMeta({ auth: false })

const route = useRoute()
const config = useRuntimeConfig()

// Проверка, включён ли банлист
if (!config.public.banlistEnabled) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Страница не найдена'
  })
}

const playerUuid = computed(() => route.params.uuid as string)

/* ───── Состояние ───── */
const loading = ref(true)
const error = ref('')
const nickname = ref('')
const playerBans = ref<IBan[]>([])
const expandedBans = ref<Set<number>>(new Set())

const { formatTime, formatAbsoluteTime } = useTimeFormat()

/* ───── Загрузка никнейма игрока ───── */
async function loadPlayerNickname() {
  try {
    // Пытаемся загрузить информацию об игроке через голову (если не получится, будет ошибка)
    const response = await $fetch(`/distant-api/user/uuid/${playerUuid.value}`)
    if (response && typeof response === 'object' && 'nickname' in response) {
      nickname.value = (response as any).nickname
    } else {
      // Если API не возвращает ник, используем UUID
      nickname.value = playerUuid.value.slice(0, 8)
    }
  } catch {
    // В случае ошибки используем сокращённый UUID
    nickname.value = playerUuid.value.slice(0, 8)
  }
}

/* ───── Загрузка банов игрока ───── */
async function loadPlayerBans() {
  loading.value = true
  error.value = ''

  try {
    // Загружаем все баны и фильтруем по UUID
    const data = await useApiFetch<{ items: IBan[], total: number }>('/banlist', {
      query: { limit: 1000, offset: 0, q: playerUuid.value }
    })

    if (data.data.value) {
      // Фильтруем только баны этого игрока
      playerBans.value = data.data.value.items
        .filter(ban => ban.uuid.toLowerCase().replace(/-/g, '') === playerUuid.value.toLowerCase().replace(/-/g, ''))
        .sort((a, b) => b.time - a.time) // Сортируем по дате (новые сверху)

      // По умолчанию раскрываем последние 2 бана
      if (playerBans.value.length > 0) {
        expandedBans.value.add(playerBans.value[0].id)
        if (playerBans.value.length > 1) {
          expandedBans.value.add(playerBans.value[1].id)
        }
      }
    } else if (data.error.value) {
      throw new Error(data.error.value.message || 'Не удалось загрузить историю банов')
    }
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при загрузке данных'
    console.error('Ошибка загрузки банов игрока:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Управление раскрытием банов ───── */
function toggleBan(banId: number) {
  if (expandedBans.value.has(banId)) {
    expandedBans.value.delete(banId)
  } else {
    expandedBans.value.add(banId)
  }
}

function expandAll() {
  playerBans.value.forEach(ban => expandedBans.value.add(ban.id))
}

function collapseAll() {
  expandedBans.value.clear()
}

/* ───── Вспомогательные функции ───── */
function getStatusColor(ban: IBan): string {
  if (ban.active === 0) return 'text-gray-500'
  if (ban.until === -1) return 'text-red-500'
  if (ban.until > Date.now()) return 'text-yellow-500'
  return 'text-green-500'
}

function getStatusText(ban: IBan): string {
  if (ban.active === 0) return 'Снят'
  if (ban.until === -1) return 'Перманентный'
  if (ban.until > Date.now()) return 'Активен'
  return 'Истёк'
}

function getDuration(ban: IBan): string {
  if (ban.until === -1) return 'Перманентно'
  const duration = ban.until - ban.time
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))
  const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days} дн. ${hours} ч.`
  return `${hours} ч.`
}

/* ───── Статистика ───── */
const totalBans = computed(() => playerBans.value.length)
const activeBans = computed(() => playerBans.value.filter(b => b.active === 1).length)
const permanentBans = computed(() => playerBans.value.filter(b => b.until === -1 && b.active === 1).length)

/* ───── Инициализация ───── */
onMounted(async () => {
  await Promise.all([loadPlayerNickname(), loadPlayerBans()])
})
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-5xl mx-auto space-y-6">
      <!-- Навигация назад -->
      <NuxtLink to="/banlist" class="inline-flex items-center gap-2 text-gray-400 hover:text-red-400 transition">
        <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
        <span>Вернуться к банлисту</span>
      </NuxtLink>

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

      <!-- Профиль игрока -->
      <template v-else>
        <!-- Информация об игроке -->
        <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
          <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <!-- Голова и скин -->
            <div class="flex gap-4">
              <img
                  v-if="nickname"
                  :src="`/distant-api/user/${nickname}/skin/head`"
                  :alt="nickname"
                  class="w-24 h-24 rounded-lg border-4 border-gray-800"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />
              <img
                  v-if="nickname"
                  :src="`/distant-api/user/${nickname}/skin`"
                  :alt="`${nickname} skin`"
                  class="h-48 w-auto"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />
            </div>

            <!-- Информация -->
            <div class="flex-1 space-y-4">
              <div>
                <h1 class="pr2p text-3xl md:text-4xl font-extrabold text-red-500">
                  {{ nickname }}
                </h1>
                <p class="font-mono text-sm text-gray-400 mt-1 break-all">
                  {{ playerUuid }}
                </p>
              </div>

              <!-- Статистика банов -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-white">{{ totalBans }}</div>
                  <div class="text-xs text-gray-400 mt-1">Всего банов</div>
                </div>
                <div class="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-yellow-500">{{ activeBans }}</div>
                  <div class="text-xs text-gray-400 mt-1">Активных</div>
                </div>
                <div class="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-red-500">{{ permanentBans }}</div>
                  <div class="text-xs text-gray-400 mt-1">Перманентных</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- История банов -->
        <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6 space-y-4">
          <!-- Заголовок с управлением -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-800">
            <h2 class="text-2xl font-bold flex items-center gap-2">
              <Icon name="solar:history-bold-duotone" class="w-6 h-6 text-red-500" />
              История банов
            </h2>

            <div class="flex items-center gap-4">
              <TimeFormatToggle />

              <div class="flex gap-2">
                <button
                    v-if="playerBans.length > 2"
                    @click="expandAll"
                    class="text-sm text-gray-400 hover:text-red-400 transition"
                >
                  Развернуть все
                </button>
                <button
                    v-if="expandedBans.size > 0"
                    @click="collapseAll"
                    class="text-sm text-gray-400 hover:text-red-400 transition"
                >
                  Свернуть все
                </button>
              </div>
            </div>
          </div>

          <!-- Нет банов -->
          <div v-if="playerBans.length === 0" class="text-center py-12 text-gray-400">
            <Icon name="solar:check-circle-bold-duotone" class="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p class="text-lg">У этого игрока нет банов</p>
          </div>

          <!-- Список банов -->
          <div v-else class="space-y-3">
            <div
                v-for="(ban, index) in playerBans"
                :key="ban.id"
                class="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 transition-all"
                :class="{ 'ring-2 ring-red-500/30': expandedBans.has(ban.id) }"
            >
              <!-- Заголовок бана (всегда видим) -->
              <button
                  @click="toggleBan(ban.id)"
                  class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/30 transition"
              >
                <div class="flex items-center gap-4">
                  <Icon
                      :name="expandedBans.has(ban.id) ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'"
                      class="w-5 h-5 text-gray-400 transition-transform"
                  />
                  <div class="text-left">
                    <div class="flex items-center gap-3">
                      <span class="font-semibold" :class="getStatusColor(ban)">
                        {{ getStatusText(ban) }}
                      </span>
                      <span class="text-sm text-gray-400">
                        {{ formatTime(ban.time) }}
                      </span>
                    </div>
                    <div class="text-sm text-gray-500 mt-1 line-clamp-1">
                      {{ ban.reason }}
                    </div>
                  </div>
                </div>

                <NuxtLink
                    :to="`/banlist/${ban.id}`"
                    @click.stop
                    class="text-red-400 hover:text-red-300 transition text-sm flex items-center gap-1"
                >
                  Подробнее
                  <Icon name="solar:arrow-right-line-duotone" class="w-4 h-4" />
                </NuxtLink>
              </button>

              <!-- Детали бана (раскрывающиеся) -->
              <Transition name="expand">
                <div v-if="expandedBans.has(ban.id)" class="px-4 pb-4 space-y-3 border-t border-gray-700/50">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <!-- Администратор -->
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Выдал бан</label>
                      <div class="text-white">{{ ban.banned_by_name }}</div>
                    </div>

                    <!-- Длительность -->
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Длительность</label>
                      <div class="text-white">{{ getDuration(ban) }}</div>
                    </div>

                    <!-- Истекает -->
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Истекает</label>
                      <div class="text-white">{{ formatTime(ban.until) }}</div>
                      <div class="text-xs text-gray-500 mt-0.5">{{ formatAbsoluteTime(ban.until) }}</div>
                    </div>

                    <!-- Тип бана -->
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Тип</label>
                      <div class="flex gap-2">
                        <span v-if="ban.ipban === 1" class="px-2 py-0.5 bg-red-900/50 border border-red-500/50 rounded text-red-300 text-xs">
                          IP Ban
                        </span>
                        <span v-if="ban.silent === 1" class="px-2 py-0.5 bg-purple-900/50 border border-purple-500/50 rounded text-purple-300 text-xs">
                          Скрытый
                        </span>
                      </div>
                    </div>

                    <!-- Причина -->
                    <div class="md:col-span-2">
                      <label class="block text-xs text-gray-500 mb-1">Причина</label>
                      <div class="bg-gray-900/50 rounded p-3 text-white text-sm whitespace-pre-wrap">
                        {{ ban.reason }}
                      </div>
                    </div>

                    <!-- Информация о снятии -->
                    <template v-if="ban.active === 0">
                      <div class="md:col-span-2 pt-3 border-t border-gray-700/50">
                        <div class="flex items-center gap-2 text-green-400 mb-3">
                          <Icon name="solar:check-circle-bold" class="w-5 h-5" />
                          <span class="font-semibold">Бан снят</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">Снял</label>
                            <div class="text-white">{{ ban.removed_by_name || '—' }}</div>
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">Дата снятия</label>
                            <div class="text-white">{{ ban.removed_by_date || '—' }}</div>
                          </div>
                          <div class="md:col-span-2">
                            <label class="block text-xs text-gray-500 mb-1">Причина снятия</label>
                            <div class="bg-gray-900/50 rounded p-3 text-white text-sm">
                              {{ ban.removed_by_reason || '—' }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>


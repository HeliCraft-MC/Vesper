<!-- components/banlist/BanlistTable.vue -->
<script setup lang="ts">
import type { IBan } from '~/types/banlist.types'
import { useTimeFormat } from '~/composables/useTimeFormat'

const props = defineProps<{
  bans: IBan[]
  loading?: boolean
}>()

const { formatTime } = useTimeFormat()

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

function formatUuid(uuid: string): string {
  // Показываем сокращённый UUID (первые 8 символов)
  return uuid.slice(0, 8) + '...'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-gray-800">
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">UUID Игрока</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Причина</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Администратор</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Дата бана</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Истекает</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Статус</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="border-b border-gray-800/60">
          <td colspan="6" class="px-4 py-8 text-center text-gray-400">
            <div class="flex justify-center items-center gap-3">
              <div class="w-6 h-6 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
              <span>Загрузка...</span>
            </div>
          </td>
        </tr>
        <tr v-else-if="!bans.length" class="border-b border-gray-800/60">
          <td colspan="6" class="px-4 py-8 text-center text-gray-400">
            Банов не найдено
          </td>
        </tr>
        <tr
            v-else
            v-for="ban in bans"
            :key="ban.id"
            class="border-b border-gray-800/60 hover:bg-gray-900/50 transition-colors"
        >
          <!-- UUID с ссылкой на профиль игрока -->
          <td class="px-4 py-3">
            <NuxtLink
                :to="`/player/${ban.uuid}`"
                class="text-red-400 hover:text-red-300 transition font-mono text-sm"
                :title="ban.uuid"
            >
              {{ formatUuid(ban.uuid) }}
            </NuxtLink>
          </td>

          <!-- Причина -->
          <td class="px-4 py-3 max-w-xs">
            <div class="text-gray-300 text-sm truncate" :title="ban.reason">
              {{ ban.reason }}
            </div>
          </td>

          <!-- Администратор -->
          <td class="px-4 py-3">
            <div class="text-gray-400 text-sm">
              {{ ban.banned_by_name }}
            </div>
          </td>

          <!-- Дата бана -->
          <td class="px-4 py-3">
            <div class="text-gray-400 text-sm">
              {{ formatTime(ban.time) }}
            </div>
          </td>

          <!-- Истекает -->
          <td class="px-4 py-3">
            <div class="text-gray-400 text-sm">
              {{ formatTime(ban.until) }}
            </div>
          </td>

          <!-- Статус -->
          <td class="px-4 py-3">
            <NuxtLink
                :to="`/banlist/${ban.id}`"
                class="inline-flex items-center gap-1 text-sm font-medium transition"
                :class="getStatusColor(ban)"
            >
              <span>{{ getStatusText(ban) }}</span>
              <Icon name="solar:arrow-right-line-duotone" class="w-4 h-4" />
            </NuxtLink>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


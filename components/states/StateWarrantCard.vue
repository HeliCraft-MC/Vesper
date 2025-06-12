<!-- components/states/StateWarrantCard.vue -->
<script setup lang="ts">
import type { IStateWarrant } from '@/types/state.types'

const props = defineProps<{
  warrant: IStateWarrant,
  color?: string
}>()

const affectedPlayer = ref<{ nickname: string } | null>(null)

onMounted(async () => {
  try {
    const response = await fetch(`/distant-api/user/${props.warrant.affected_player_uuid}`)
    if (response.ok) {
      const data = await response.json()
      affectedPlayer.value = data
    } else {
      console.error('Failed to fetch player data:', response.statusText)
    }
  } catch (error) {
    console.error('Error fetching player data:', error)
  }
})

</script>
<template>
  <article class="bg-gray-900/50 rounded p-4 space-y-2 border-l-4" :style="{ borderColor: color || '#f87171' }">
    <header class="flex items-center gap-2" :style="color ? { color } : {}">
      <Icon name="mdi:alert-octagram" class="w-6 h-6 text-red-500" />
      <h3 class="font-semibold" :style="color ? { color } : {}">Ордер на арест</h3>
    </header>

    <div v-if="affectedPlayer" class="flex items-center gap-3 py-2">
      <img
          :src="`/distant-api/user/${warrant.affected_player_uuid}/skin/head.png`"
          alt="Player head"
          class="w-12 h-12 rounded-md bg-gray-700"
          @error="($event.target as HTMLImageElement).src = 'https://placehold.co/48x48/1f2937/9ca3af?text=?'"
      />
      <div>
        <p class="text-gray-300" :style="color ? { color } : {}">Разыскиваемый:</p>
        <p class="font-semibold text-lg" :style="color ? { color } : {}">{{ affectedPlayer.nickname }}</p>
      </div>
    </div>

    <div>
      <p class="text-sm text-gray-400">Причина:</p>
      <p class="text-gray-200 text-base">{{ warrant.reason }}</p>
    </div>

    <p class="text-gray-500 text-xs pt-2">
      Выдан: {{ new Date(warrant.created).toLocaleString() }}
    </p>
  </article>
</template>

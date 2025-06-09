<!-- components/history/HistoryEventCard.vue -->
<script setup lang="ts">
import type { IHistoryEvent } from '~/types/history.types'
const props = defineProps<{ event: IHistoryEvent, color?: string }>()
</script>
<template>
  <article class="bg-gray-900/50 rounded p-4 space-y-1">
    <header
        class="flex items-center gap-2"
        :class="!color ? 'text-red-400' : ''"
        :style="color ? { color } : {}"
    >
      <Icon
        name="material-symbols:history"
        class="w-14 h-14"
      />
      <h3 class="font-semibold mt-0"
          :class="!color ? 'text-red-400' : ''"
          :style="color ? { color } : {}"
      >{{ event.title }}</h3>
    </header>
    <p class="text-gray-300 text-sm whitespace-pre-line">{{ event.description }}</p>
    <p class="text-gray-500 text-xs">
      {{ new Date(event.created).toLocaleDateString() }}
    </p>
  </article>
</template>

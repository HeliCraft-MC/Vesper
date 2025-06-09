<!-- components/states/StateOrderCard.vue -->
<script setup lang="ts">
import type { IStateOrder } from '@/types/state.types'
const props = defineProps<{ order: IStateOrder }>()
</script>
<template>
  <article class="bg-gray-800/60 rounded p-4 space-y-2">
    <header class="flex items-center gap-2">
      <Icon name="mdi:script-text-outline" class="w-5 h-5 text-red-400"/>
      <h3 class="font-semibold">{{ order.title }}</h3>
      <span v-if="order.importance==='pinned'"
            class="ml-auto text-xs text-yellow-400">Закреплён</span>
    </header>
    <p class="text-gray-300 text-sm whitespace-pre-line">{{ order.text }}</p>
    <p class="text-gray-500 text-xs">
      Опубликовано: {{ new Date(order.published_at).toLocaleString() }}
    </p>
  </article>
</template>

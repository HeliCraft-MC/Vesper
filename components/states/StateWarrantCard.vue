<!-- components/states/StateWarrantCard.vue -->
<script setup lang="ts">
import type { IStateWarrant } from '@/types/state.types'
const props = defineProps<{ warrant: IStateWarrant }>()
</script>
<template>
  <article class="bg-gray-800/60 rounded p-4 space-y-1 border border-red-500/30">
    <header class="flex items-center gap-2">
      <Icon name="mdi:alert-octagram" class="w-5 h-5 text-red-500"/>
      <h3 class="font-semibold">Ордер</h3>
    </header>
    <p class="text-gray-300 text-sm">Причина: {{ warrant.reason }}</p>
    <p class="text-gray-500 text-xs">
      Выдан: {{ new Date(warrant.created).toLocaleString() }}
    </p>
  </article>
</template>

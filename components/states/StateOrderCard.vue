<!-- components/states/StateOrderCard.vue -->
<script setup lang="ts">
import type { IStateOrder } from '@/types/state.types'
import { computed } from 'vue'

const props = defineProps<{
  order: IStateOrder,
  color?: string
}>()

/**
 * Стили для важности
 */
const importanceStyles = computed(() => {
  switch (props.order.importance) {
    case 'pinned':
      return {
        borderColor: props.color || 'rgba(252, 211, 77, 0.7)',
        badgeColor: 'text-yellow-400',
        icon: 'mdi:pin',
        label: 'Закреплён'
      }
    case 'high':
      return {
        borderColor: props.color || 'rgba(248, 113, 113, 0.7)',
        badgeColor: 'text-red-400',
        icon: 'mdi:alert-circle-outline',
        label: 'Высокая важность'
      }
    case 'medium':
      return {
        borderColor: 'rgba(252, 211, 77, 0.5)',
        badgeColor: 'text-yellow-500',
        icon: 'mdi:chevron-up',
        label: 'Средняя важность'
      }
    default:
      return {
        borderColor: 'rgba(156, 163, 175, 0.3)',
        badgeColor: 'text-gray-400',
        icon: 'mdi:chevron-down',
        label: 'Низкая важность'
      }
  }
})

/**
 * Проверка, истёк ли срок действия указа
 */
const isExpired = computed(() => {
  if (props.order.expires_at === null) {
    return false
  }
  return Date.now() > props.order.expires_at
})

/**
 * Текст для отображения срока действия
 */
const expirationText = computed(() => {
  if (props.order.expires_at === null) {
    return ''
  }
  const date = new Date(props.order.expires_at)
  return isExpired.value
      ? `Истёк ${date.toLocaleString()}`
      : `Действует до ${date.toLocaleString()}`
})

/**
 * Стили и иконка для срока действия
 */
const expirationStyles = computed(() => {
  if (props.order.expires_at === null) {
    return {
      icon: '',
      badgeColor: ''
    }
  }
  return isExpired.value
      ? {
        icon: 'mdi:clock-alert-outline',
        badgeColor: 'text-red-500'
      }
      : {
        icon: 'mdi:clock-outline',
        badgeColor: 'text-green-400'
      }
})
</script>

<template>
  <article
      class="bg-gray-900/50 rounded p-4 space-y-2 border-l-4"
      :style="{ borderColor: importanceStyles.borderColor }"
  >
    <header class="flex items-center gap-2">
      <Icon
          :name="importanceStyles.icon"
          class="w-6 h-6"
          :class="importanceStyles.badgeColor"
          :style="color ? { color } : {}"
      />
      <h3 class="font-semibold" :style="color ? { color } : {}">
        {{ order.title }}
      </h3>
      <span
          class="ml-auto text-xs"
          :class="importanceStyles.badgeColor"
      >{{ importanceStyles.label }}</span>
    </header>

    <p class="text-gray-300 text-sm whitespace-pre-line">
      {{ order.text }}
    </p>

    <!-- Дата публикации -->
    <p class="text-gray-500 text-xs">
      Опубликовано: {{ new Date(order.published_at).toLocaleString() }}
    </p>

    <!-- Срок действия и индикатор -->
    <p
        v-if="order.expires_at !== null"
        class="flex items-center text-xs"
    >
      <Icon
          :name="expirationStyles.icon"
          class="w-4 h-4 mr-1"
          :class="expirationStyles.badgeColor"
      />
      <span :class="expirationStyles.badgeColor">
        {{ expirationText }}
      </span>
    </p>
    <p class="flex items-center text-xs" v-else>
      <Icon
          name="mdi:clock-outline"
          class="w-4 h-4 mr-1 text-green-400"
      />
      <span class="text-green-400">Действует до отмены (бессрочно)</span>
    </p>
  </article>
</template>

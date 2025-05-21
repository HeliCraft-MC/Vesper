<template>
  <div class="relative min-h-screen bg-black text-white flex flex-col">
    <!-- Фоновая карусель -->
    <transition name="fade" mode="out-in">
      <NuxtImg
          v-if="current"
          :src="current"
          :key="current"
          class="absolute inset-0 object-cover w-full h-full"
          priority
      />
    </transition>

    <!-- Тёмная маска -->
    <div class="absolute inset-0 bg-black/70"></div>

    <!-- Кредит за скриншоты -->
    <p
        class="absolute bottom-2 right-4 text-xs text-gray-300/80 backdrop-blur-sm px-2 rounded"
    >
      Скриншоты игроков HeliCraft
    </p>

    <!-- Основной контент -->
    <main
        class="relative flex-grow flex flex-col items-center justify-center px-6 py-16 pt-24 md:pt-28"
    >
      <!-- ⚡ Респонсивный размер -->
      <h1 class="pr2p font-extrabold text-red-500 mb-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
        HeliCraft
      </h1>

      <p class="text-lg sm:text-xl text-gray-300 mb-6">
        Ванильный сервер на версии 1.21.5
      </p>

      <div
          class="flex items-center bg-gray-800/50 rounded-md px-5 py-3 mb-6 space-x-3"
      >
        <p class="font-mono text-xl sm:text-2xl">{{ serverAddress }}</p>
        <button
            @click="copyAddress"
            class="flex items-center justify-center p-2 rounded-full transition hover:bg-gray-700 hover:text-red-400 focus:outline-none"
            aria-label="Скопировать адрес сервера"
        >
          <Icon
              :name="copySuccess ? 'ic:baseline-check' : 'ic:baseline-content-copy'"
              class="w-6 h-6 text-white"
          />
        </button>
      </div>

      <p class="text-red-400 text-base sm:text-lg mb-8">
        Онлайн игроков: <span class="font-semibold">{{ online }}/20</span>
      </p>

      <div class="max-w-xl text-center text-gray-400 mb-8 px-4">
        <p>
          HeliCraft — уникальный ванильный Minecraft-сервер. Вы исследуете мир,
          строите, общаетесь и участвуете в эксклюзивных ивентах. Опытные
          модераторы всегда готовы помочь новичкам.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const serverAddress = 'mc.helicraft.ru'
const online = ref(0)
const copySuccess = ref(false)

const { data: images } = await useFetch<string[]>('/api/intro-images')
const current = ref<string>('')

let timerId: number

onMounted(() => {
  // Имитация онлайна
  setTimeout(() => (online.value = 3), 500)

  // Случайное фоновое изображение
  current.value = images.value?.[Math.floor(Math.random() * images.value.length)] ?? ''

  // Смена фона каждые 5 с
  timerId = window.setInterval(() => {
    current.value = images.value?.[Math.floor(Math.random() * images.value.length)] ?? ''
  }, 5000)
})

onUnmounted(() => clearInterval(timerId))

function copyAddress() {
  navigator.clipboard
      .writeText(serverAddress)
      .then(() => {
        copySuccess.value = true
        setTimeout(() => (copySuccess.value = false), 2000)
      })
      .catch(() => console.error('Не удалось скопировать адрес'))
}
</script>

<style scoped>
/* Плавный fade для фоновых картинок */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

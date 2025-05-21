<template>
  <div class="relative min-h-screen bg-black text-white flex flex-col">
    <!-- Смена фона с плавным исчезанием -->
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
      <h1 class="text-6xl font-extrabold text-red-500 mb-4 pr2p">HeliCraft</h1>
      <p class="text-xl text-gray-300 mb-6">Ванильный сервер на версии 1.21.5</p>

      <div
          class="flex items-center bg-gray-800 bg-opacity-50 rounded-md px-5 py-3 mb-6 space-x-3"
      >
        <p class="font-mono text-2xl">{{ serverAddress }}</p>
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

      <p class="text-red-400 text-lg mb-8">
        Онлайн игроков: <span class="font-semibold">{{ online }}/20</span>
      </p>

      <div class="max-w-xl text-center text-gray-400 mb-8 px-4">
        <p>
          HeliCraft — это уникальный ванильный Minecraft-сервер, созданный для
          безопасной и дружелюбной атмосферы. Здесь вы можете исследовать мир,
          строить сложные конструкции и общаться с командой игроков. Наш сервер
          поддерживает версию 1.21.5, предлагает эксклюзивные эвенты и конкурсы
          с призами. Сообщество активно развивается, а опытные модераторы всегда
          готовы помочь новичкам.
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
const current = ref<string>('')!
let timerId: number

onMounted(() => {
  // Инициализируем онлайн
  setTimeout(() => {
    online.value = 3
  }, 500)

  // Показываем первый фон
  // @ts-ignore
  current.value = images.value[
      // @ts-ignore
      Math.floor(Math.random() * images.value.length)
      ]

  // Меняем фон каждые 5 с
  timerId = window.setInterval(() => {
    // @ts-ignore
    current.value = images.value[
        // @ts-ignore
        Math.floor(Math.random() * images.value.length)
        ]
  }, 5000)
})

onUnmounted(() => {
  clearInterval(timerId)
})

function copyAddress() {
  navigator.clipboard
      .writeText(serverAddress)
      .then(() => {
        copySuccess.value = true
        console.log('Адрес сервера скопирован в буфер')
        setTimeout(() => {
          copySuccess.value = false
        }, 2000)
      })
      .catch(() => {
        console.error('Не удалось скопировать адрес')
      })
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

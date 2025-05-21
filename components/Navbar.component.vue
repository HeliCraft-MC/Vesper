<template>
  <!-- Фиксированная шапка -->
  <nav
      class="fixed inset-x-0 w-screen top-0 z-50 flex items-center justify-center
           bg-gradient-to-b from-red-950/80 to-transparent backdrop-blur-sm"
  >
    <div class="flex items-center justify-between w-full max-w-[1700px] px-4 py-3">
      <!-- Логотип -->
      <NuxtLink
          to="/"
          class="flex items-center space-x-2 text-red-400 text-2xl font-bold pr2p flex-shrink-0"
      >
        <NuxtImg src="/logo_noback.png" alt="HeliCraft Logo" class="w-10 h-10" />
        <!-- Скрываем надпись до 640 px -->
        <span class="hidden sm:inline truncate">HeliCraft</span>
      </NuxtLink>

      <!-- Десктоп-меню ≥1320 px -->
      <ul
          class="hidden min-[1320px]:flex flex-1 justify-end gap-8 items-center overflow-hidden"
      >
        <li>
          <NuxtLink
              to="/"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="ic:outline-home" class="w-5 h-5" />
            <span class="truncate">Главная</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
              to="/rules"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="ic:outline-gavel" class="w-5 h-5" />
            <span class="truncate">Правила сервера</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
              to="/privacy"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="ic:baseline-security" class="w-5 h-5" />
            <span class="truncate">Политика&nbsp;конфиденциальности</span>
          </NuxtLink>
        </li>
        <li>
          <template v-if="isLoggedIn">
            <NuxtLink
                to="/account"
                class="flex items-center gap-2 font-bold pr2p text-gray-200 hover:text-red-400 transition"
            >
              <NuxtImg
                  :src="`${domain}/distant-api/user/${nickname}/skin/head`"
                  alt="Avatar"
                  class="w-8 h-8 rounded-md"
              />
              <span class="truncate">{{ nickname }}</span>
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
                to="/login"
                class="font-bold pr2p text-gray-200 hover:text-red-400 transition"
            >
              Войти
            </NuxtLink>
          </template>
        </li>
      </ul>

      <!-- Бургер ≤1319 px -->
      <button
          class="min-[1320px]:hidden flex-shrink-0 text-gray-200 hover:text-red-400 transition"
          @click="toggleMobileMenu"
          aria-label="Открыть меню"
      >
        <Icon :name="showMobileMenu ? 'ic:outline-close' : 'ic:outline-menu'" class="w-7 h-7" />
      </button>
    </div>

    <!-- Мобильное меню -->
    <Transition
        enter-from-class="opacity-0 -translate-y-4"
        enter-active-class="transition-all duration-300 ease-out"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-to-class="opacity-0 -translate-y-4"
    >
      <div
          v-if="showMobileMenu"
          class="absolute top-full left-0 w-full bg-black/80 backdrop-blur-sm min-[1320px]:hidden"
      >
        <ul class="flex flex-col px-6 py-4 space-y-4">
          <li>
            <NuxtLink
                to="/"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="ic:outline-home" class="w-5 h-5" />
              <span class="truncate">Главная</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/rules"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="ic:outline-gavel" class="w-5 h-5" />
              <span class="truncate">Правила сервера</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/privacy"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="ic:baseline-security" class="w-5 h-5" />
              <span class="truncate">Политика&nbsp;конфиденциальности</span>
            </NuxtLink>
          </li>
          <li>
            <template v-if="isLoggedIn">
              <NuxtLink
                  to="/account"
                  class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                  @click="closeMobileMenu"
              >
                <NuxtImg
                    :src="`${domain}/distant-api/user/${nickname}/skin/head`"
                    alt="Avatar"
                    class="w-8 h-8 rounded-md"
                />
                <span class="truncate">{{ nickname }}</span>
              </NuxtLink>
            </template>
            <template v-else>
              <NuxtLink
                  to="/login"
                  class="pr2p text-gray-200 hover:text-red-400 transition"
                  @click="closeMobileMenu"
              >
                Войти
              </NuxtLink>
            </template>
          </li>
        </ul>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showMobileMenu = ref(false)
const isLoggedIn     = ref(false)    // сюда можно прикрутить real-auth
const nickname       = ref('ms0ur')
const domain         = ref('')

onMounted(() => {
  domain.value = window.location.origin
})

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}
function closeMobileMenu() {
  showMobileMenu.value = false
}
</script>

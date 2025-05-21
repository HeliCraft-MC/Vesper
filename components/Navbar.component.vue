<template>
  <!-- Фиксированная шапка. Высота задаётся только контентом внутри -->
  <nav
      class="fixed top-0 left-0 w-full z-50 flex items-center justify-center
           bg-gradient-to-b from-red-950/80 to-transparent backdrop-blur-sm"
  >
    <div class="flex items-center justify-between w-full max-w-[1700px] px-6 py-4">
      <!-- Логотип + название -->
      <NuxtLink
          to="/"
          class="flex-shrink-0 flex items-center space-x-2 text-red-400 text-2xl font-bold pr2p"
      >
        <NuxtImg
            src="/logo_noback.png"
            alt="HeliCraft Logo"
            class="w-10 h-10"
        />
        <span>HeliCraft</span>
      </NuxtLink>

      <!-- Десктоп-меню (≥ 1401 px) -->
      <ul class="hidden min-[1401px]:flex flex-1 justify-end gap-10 items-center space-x-2">
        <li class="min-w-0 shrink">
          <NuxtLink
              to="/"
              class="flex font-bold pr2p items-center space-x-1 text-gray-200 hover:text-red-400 transition whitespace-nowrap overflow-hidden truncate"
          >
            <Icon name="ic:outline-home" class="w-5 h-5" />
            <span>Главная</span>
          </NuxtLink>
        </li>
        <li class="min-w-0 shrink">
          <NuxtLink
              to="/rules"
              class="flex font-bold pr2p items-center space-x-1 text-gray-200 hover:text-red-400 transition whitespace-nowrap overflow-hidden truncate"
          >
            <Icon name="ic:outline-gavel" class="w-5 h-5" />
            <span>Правила сервера</span>
          </NuxtLink>
        </li>
        <li class="min-w-0 shrink">
          <NuxtLink
              to="/privacy"
              class="flex font-bold pr2p items-center space-x-1 text-gray-200 hover:text-red-400 transition whitespace-nowrap overflow-hidden truncate"
          >
            <Icon name="ic:baseline-security" class="w-5 h-5" />
            <span>Политика&nbsp;конфиденциальности</span>
          </NuxtLink>
        </li>

        <!-- Профиль / вход -->
        <li class="min-w-0 shrink flex items-center space-x-2">
          <template v-if="isLoggedIn">
            <NuxtLink
                to="/account"
                class="flex items-center space-x-2 text-gray-200 hover:text-red-400 transition whitespace-nowrap overflow-hidden truncate"
            >
              <NuxtImg
                  :src="`${domain}/distant-api/user/${nickname}/skin/head`"
                  alt="Avatar"
                  class="w-8 h-8 rounded-md"
              />
              <span class="font-bold pr2p text-gray-200 whitespace-nowrap overflow-hidden truncate">
                {{ nickname }}
              </span>
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
                to="/login"
                class="text-gray-200 font-bold pr2p hover:text-red-400 transition"
            >
              Войти
            </NuxtLink>
          </template>
        </li>
      </ul>

      <!-- Бургер-кнопка (≤ 1400 px) -->
      <button
          class="ml-auto text-gray-200 hover:text-red-400 transition min-[1401px]:hidden"
          @click="toggleMobileMenu"
          aria-label="Открыть меню"
      >
        <Icon name="ic:outline-menu" class="w-6 h-6" />
      </button>
    </div>

    <!-- Мобильное меню. Абсолютно позиционировано и НЕ влияет на высоту navbar -->
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
          class="absolute top-full left-0 w-full min-[1401px]:hidden
               bg-gradient-to-b from-transparent to-black/80 backdrop-blur-sm"
      >
        <ul class="flex flex-col px-6 py-4 space-y-4">
          <li>
            <NuxtLink
                to="/"
                class="flex pr2p items-center space-x-2 text-gray-200 hover:text-red-400 transition"
            >
              <Icon name="ic:outline-home" class="w-5 h-5" />
              <span>Главная</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/rules"
                class="flex pr2p items-center space-x-2 text-gray-200 hover:text-red-400 transition"
            >
              <Icon name="ic:outline-gavel" class="w-5 h-5" />
              <span>Правила сервера</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/privacy"
                class="flex pr2p items-center space-x-2 text-gray-200 hover:text-red-400 transition"
            >
              <Icon name="ic:baseline-security" class="w-5 h-5" />
              <span>Политика&nbsp;конфиденциальности</span>
            </NuxtLink>
          </li>
          <li>
            <template v-if="isLoggedIn">
              <NuxtLink
                  to="/account"
                  class="flex pr2p items-center space-x-2 text-gray-200 hover:text-red-400 transition"
              >
                <NuxtImg
                    :src="`${domain}/distant-api/user/${nickname}/skin/head`"
                    alt="Avatar"
                    class="w-8 h-8 rounded-md"
                />
                <span class="whitespace-nowrap overflow-hidden truncate">
                  {{ nickname }}
                </span>
              </NuxtLink>
            </template>
            <template v-else>
              <NuxtLink
                  to="/login"
                  class="text-gray-200 hover:text-red-400 transition"
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
import { ref, onMounted } from 'vue';

const showMobileMenu = ref(false);
const isLoggedIn     = ref(false);
const nickname       = ref('ms0ur');
const domain         = ref('');

onMounted(() => {
  domain.value = window.location.origin;
  // Здесь можно добавить реальную логику auth-статуса
});

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
}
</script>

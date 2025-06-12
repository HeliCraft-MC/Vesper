<template>
  <div class="min-h-screen w-full" :style="cssVars">
    <div class="relative flex w-full h-screen pt-20">
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 transition-all duration-300" :class="{ 'md:mr-72': isPanelVisible }">
        <!-- Global loader for the entire layout -->
        <div v-if="loading" class="flex items-center justify-center h-full">
          <div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
        </div>

        <!-- Loading error block -->
        <div v-else-if="error" class="flex items-center justify-center h-full text-center">
          <div>
            <h2 class="text-3xl font-bold text-red-500">Ошибка загрузки</h2>
            <p class="mt-2 text-lg text-gray-400">{{ error }}</p>
            <div class="mt-6 flex justify-center gap-4">
              <button @click="fetchStateData" class="btn-base bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400">
                <Icon name="material-symbols:refresh-rounded" class="w-5 h-5"/>
                <span>Повторить</span>
              </button>
              <NuxtLink to="/account" class="btn-base bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500">
                Вернуться в профиль
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Permission error block -->
        <div v-else-if="permissionError" class="flex items-center justify-center h-full text-center">
          <div>
            <h2 class="text-3xl font-bold text-yellow-500">Доступ запрещен</h2>
            <p class="mt-2 text-lg text-gray-400">{{ permissionError }}</p>
            <div class="mt-6 flex justify-center gap-4">
              <NuxtLink to="/account" class="btn-base bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500">
                Вернуться в профиль
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Main content with loader overlay -->
        <div v-else class="relative">
          <!-- Slot for page content -->
          <slot />

          <!-- Loader for page transitions -->
          <div v-if="isPageLoading" class="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center transition-opacity duration-300 rounded-lg">
            <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin" :style="{ borderColor: accentColor }"></div>
          </div>
        </div>
      </main>

      <aside
          class="fixed top-20 right-0 bg-gray-900/80 backdrop-blur-lg border-l border-gray-800 z-40 transition-transform duration-300 ease-in-out w-72 h-[calc(100vh-5rem)]"
          :class="{ 'translate-x-0': isPanelVisible, 'translate-x-full': !isPanelVisible }"
      >
        <div v-if="state" class="flex flex-col h-full">
          <div class="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
            <h2 class="text-lg font-bold truncate pr-2" :style="{ color: accentColor }">{{ state.name }}</h2>
            <button @click="isPanelVisible = false" class="md:hidden text-gray-400 hover:text-white">
              <Icon name="material-symbols:close-rounded" size="24" />
            </button>
          </div>

          <!-- Role-based navigation -->
          <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
            <NuxtLink v-if="canViewOfficerMenu" :to="`/states/${uuid}/panel`" class="panel-link" exact-active-class="panel-link-active">
              <Icon name="material-symbols:dashboard-outline-rounded" />
              <span>Главная</span>
            </NuxtLink>
            <NuxtLink v-if="canViewOfficerMenu" :to="`/states/${uuid}/panel/citizens`" class="panel-link" active-class="panel-link-active">
              <Icon name="material-symbols:groups-outline-rounded" />
              <span>Участники</span>
            </NuxtLink>
            <NuxtLink v-if="canViewOfficerMenu" :to="`/states/${uuid}/panel/decrees`" class="panel-link" active-class="panel-link-active">
              <Icon name="material-symbols:gavel-rounded" />
              <span>Указы и ордеры</span>
            </NuxtLink>
            <NuxtLink v-if="canViewAll" :to="`/states/${uuid}/panel/cities`" class="panel-link" active-class="panel-link-active">
              <Icon name="material-symbols:location-city-rounded" />
              <span>Города</span>
            </NuxtLink>
            <NuxtLink v-if="canViewDiplomacyMenu" :to="`/states/${uuid}/panel/diplomacy`" class="panel-link" active-class="panel-link-active">
              <Icon name="material-symbols:handshake-outline-rounded" />
              <span>Дипломатия</span>
            </NuxtLink>
            <NuxtLink v-if="canViewAll" :to="`/states/${uuid}/panel/settings`" class="panel-link" active-class="panel-link-active">
              <Icon name="material-symbols:settings-outline-rounded" />
              <span>Настройки</span>
            </NuxtLink>
            <div class="pt-4 !mt-6 border-t border-gray-800">
              <NuxtLink to="/account" class="panel-link-secondary">
                <Icon name="material-symbols:arrow-back-rounded" />
                <span>Назад в профиль</span>
              </NuxtLink>
            </div>
          </nav>

          <div class="p-4 border-t border-gray-800 flex-shrink-0">
            <label for="accent-color" class="block text-xs text-gray-400 mb-2">Акцентный цвет</label>
            <div class="flex items-center gap-2">
              <input id="accent-color" type="color" v-model="accentColor" class="color-input" />
              <span class="text-sm font-mono">{{ accentColor }}</span>
              <button @click="resetAccentColor" title="Сбросить цвет" class="ml-auto text-gray-500 hover:text-white transition">
                <Icon name="material-symbols:restart-alt-rounded" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="p-4 text-center text-gray-500">
          Загрузка данных панели...
        </div>
      </aside>

      <button
          @click="isPanelVisible = !isPanelVisible"
          class="fixed bottom-5 right-5 md:hidden w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white z-50"
      >
        <Icon :name="isPanelVisible ? 'material-symbols:close-rounded' : 'material-symbols:menu-rounded'" size="28"/>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
// --- UPDATED: Importing types from the central types file ---
import type { IState, IStateMember, RolesInState } from '~/types/state.types';
import { RolesInState as RolesEnum } from '~/types/state.types'; // Import enum for runtime use

useHead({
  bodyAttrs: { class: 'bg-black text-white' }
});

const route = useRoute();
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);

const uuid = computed(() => route.params.uuid as string);
const state = ref<IState | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const isPageLoading = ref(false);
const isPanelVisible = ref(true);

// State for Permissions, now using imported types
const userRole = ref<RolesInState | null>(null);
const permissionError = ref<string | null>(null);

const defaultAccentColor = ref('#ff5555');
const accentColor = ref('#ff5555');

async function fetchStateData() {
  // Reset states before fetching
  loading.value = true;
  error.value = null;
  permissionError.value = null;
  state.value = null;
  userRole.value = null;

  if (!uuid.value) {
    error.value = "Не найден идентификатор государства.";
    loading.value = false;
    return;
  };

  if (currentUserUuid.value === null) {
    permissionError.value = "Вы не авторизованы. Пожалуйста, войдите в систему.";
    loading.value = false;
    return;
  }

  try {
    // 1. Fetch state data
    const data = await $fetch<IState>(`/distant-api/state/${uuid.value}`);
    if(!data) throw new Error("Государство не найдено или произошла ошибка API.");
    state.value = data;

    const color = data.color_hex || '#ff5555';
    defaultAccentColor.value = color;
    accentColor.value = color;

    // 2. Fetch user's role in this state
    try {
      const memberData = await $fetch<IStateMember>(`/distant-api/state/${uuid.value}/member/${currentUserUuid.value}`);
      userRole.value = memberData.role;
    } catch (memberError: any) {
      // If the user is not found in the state (404), it's a permission issue.
      if (memberError.statusCode === 404) {
        throw new Error("Вы не являетесь участником этого государства.");
      }
      // Rethrow other errors to be caught by the outer catch block
      throw memberError;
    }


    // 3. Check permissions based on the role
    const forbiddenRoles = [RolesEnum.CITIZEN, RolesEnum.APPLICANT, RolesEnum.NONE];
    if (!userRole.value || forbiddenRoles.includes(userRole.value)) {
      let msg = "У вас недостаточно прав для доступа к этой панели.";
      if (userRole.value === RolesEnum.CITIZEN) {
        msg = "Панель управления доступна только для должностных лиц государства.";
      }
      // This will trigger the permission error block in the template
      permissionError.value = msg;
    }

  } catch (err: any) {
    console.error("Ошибка при загрузке данных для панели:", err);
    // Distinguish between permission errors and general fetch errors
    if (err.message.includes("участником") || err.message.includes("прав")) {
      permissionError.value = err.message;
    } else {
      error.value = err.message || "Не удалось загрузить данные панели управления.";
    }
    state.value = null; // Ensure state is cleared on error
  } finally {
    loading.value = false;
  }
}

// Computed properties for conditional rendering of navigation links
const canViewAll = computed(() => {
  if (!userRole.value) return false;
  return [RolesEnum.RULER, RolesEnum.VICE_RULER].includes(userRole.value);
});

const canViewOfficerMenu = computed(() => {
  if (!userRole.value) return false;
  return [
    RolesEnum.RULER,
    RolesEnum.VICE_RULER,
    RolesEnum.MINISTER,
    RolesEnum.OFFICER
  ].includes(userRole.value);
});

const canViewDiplomacyMenu = computed(() => {
  if (!userRole.value) return false;
  return [
    RolesEnum.RULER,
    RolesEnum.VICE_RULER,
    RolesEnum.DIPLOMAT
  ].includes(userRole.value);
});


function resetAccentColor() {
  accentColor.value = defaultAccentColor.value;
}

const cssVars = computed(() => ({
  '--accent-color': accentColor.value,
}));

let pageChangeTimeout: NodeJS.Timeout;
watch(() => route.path, (newPath) => {
  if (newPath.startsWith(`/states/${uuid.value}/panel`)) {
    isPageLoading.value = true;
    if (pageChangeTimeout) clearTimeout(pageChangeTimeout);
    pageChangeTimeout = setTimeout(() => {
      isPageLoading.value = false;
    }, 400);
  }
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    isPanelVisible.value = false;
  }
});

function handleResize() {
  if (typeof window !== 'undefined') {
    isPanelVisible.value = window.innerWidth >= 768;
  }
}

onMounted(() => {
  fetchStateData();
  if (typeof window !== 'undefined') {
    handleResize();
    window.addEventListener('resize', handleResize);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});

provide('accentColor', accentColor);
provide('state', state);
provide('fetchStateData', fetchStateData);
</script>

<style scoped>
.panel-link, .panel-link-secondary {
  @apply flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 transition-colors duration-200;
  @apply hover:bg-white/10 hover:text-white;
}
.panel-link-active {
  background-color: var(--accent-color) !important;
  color: black !important;
  font-weight: 600;
}
.panel-link-active:hover { opacity: 0.9; }
.panel-link-secondary { @apply bg-gray-800/60 hover:bg-gray-700/80; }

.color-input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-color: transparent;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  cursor: pointer;
}
.color-input::-webkit-color-swatch {
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.color-input::-moz-color-swatch {
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.btn-base {
  @apply inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>

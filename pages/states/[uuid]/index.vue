<!-- pages/states/[uuid].vue -->
<script setup lang="ts">
definePageMeta({ auth: false });

import ConfirmationModal from '~/components/ui/ConfirmationModal.vue';
import DiplomaticActionModal from '~/components/states/DiplomaticActionModal.vue';

// Card components
import StateOrderCard from '~/components/states/StateOrderCard.vue';
import StateWarrantCard from '~/components/states/StateWarrantCard.vue';
import HistoryEventCard from '~/components/history/HistoryEventCard.vue';


import { RolesInState, StateStatus, GovernmentForm } from '~/types/state.types';
import type { IState, IStateOrder, IStateWarrant } from '~/types/state.types';
import type { IHistoryEvent } from '~/types/history.types';

const route = useRoute();
const router = useRouter();
const uuid = route.params.uuid as string;

/* --- Reactive Data --- */
const state = ref<IState | null>(null);
const orders = ref<IStateOrder[]>([]);
const warrants = ref<IStateWarrant[]>([]);
const events = ref<IHistoryEvent[]>([]);
const loading = ref(true);
const errorMessage = ref<string | null>(null);
const ruler = ref('');

// User specific data
const { data: session } = useAuth();
const userUuid = computed(() => session.value?.uuid);
const userRole = ref<RolesInState>(RolesInState.NONE);
const isAdmin = ref(false);
const isDiplomatForOtherState = ref(false);
const diplomaticStates = ref<string[]>([]);

// Modal states
const showConfirmationModal = ref(false);
const confirmationDetails = ref({ title: '', message: '', onConfirm: () => {} });
const showDiplomacyModal = ref(false);

/* --- Computed Properties --- */
const isRuler = computed(() => userRole.value === RolesInState.RULER);
const isHighRank = computed(() => [RolesInState.RULER, RolesInState.VICE_RULER, RolesInState.MINISTER, RolesInState.DIPLOMAT, RolesInState.OFFICER].includes(userRole.value));
const isCitizen = computed(() => userRole.value === RolesInState.CITIZEN);
const canTakeAction = computed(() => state.value?.status === StateStatus.ACTIVE);
const canManageRelations = computed(() => isDiplomatForOtherState.value && state.value?.status === StateStatus.ACTIVE);

/* --- Accent & Color Helpers --- */
const accentRaw = computed(() => state.value?.color_hex || '#ff5555');
const isTooDark = (hex: string) => {
  if (!hex) return false;
  const n = parseInt(hex.slice(1), 16);
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return l < 0.25;
};
const lighten = (hex: string, amt = 0.5) => {
  if (!hex) return '#ffffff';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + 255 * amt);
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt);
  const b = Math.min(255, (n & 255) + 255 * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b | 0).toString(16).slice(1);
};
const accent = computed(() => isTooDark(accentRaw.value) ? lighten(accentRaw.value) : accentRaw.value);
const accentBg = computed(() => accentRaw.value);


/* --- Dictionaries for Translations --- */
const govFormTranslations: Record<GovernmentForm, string> = {
  [GovernmentForm.MONARCHY]: 'Монархия',
  [GovernmentForm.REPUBLIC]: 'Республика',
  [GovernmentForm.FEDERATION]: 'Федерация',
  [GovernmentForm.OLIGARCHY]: 'Олигархия / совет',
  [GovernmentForm.TRIBAL]: 'Племенное устройство',
  [GovernmentForm.OTHER]: 'Иное / смешанное'
};

const stateStatusTranslations: Record<StateStatus, string> = {
  [StateStatus.PENDING]: 'Ожидает одобрения',
  [StateStatus.ACTIVE]: 'Активно',
  [StateStatus.REJECTED]: 'Отклонено',
  [StateStatus.MERGED]: 'Объединено',
  [StateStatus.DISSOLVED]: 'Распущено'
};

/* --- API Action Handlers --- */
const handleApiAction = async (action: () => Promise<any>, successMessage: string) => {
  try {
    await action();
    // TODO: Implement a user-friendly toast notification for success
    console.log(successMessage);
    await loadAll(); // Reload data to reflect changes
  } catch (err) {
    console.error(`Ошибка при выполнении действия:`, err);
    // TODO: Implement a user-friendly toast notification for errors
  }
};

const confirmAndExecute = (title: string, message: string, onConfirm: () => Promise<void>) => {
  confirmationDetails.value = { title, message, onConfirm: async () => {
      await onConfirm();
      showConfirmationModal.value = false;
    }};
  showConfirmationModal.value = true;
};

// Admin Actions
const approveState = () => confirmAndExecute('Одобрить государство?', 'Вы уверены, что хотите одобрить это государство?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/approve`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство одобрено'));
const rejectState = () => confirmAndExecute('Отклонить государство?', 'Вы уверены, что хотите отклонить заявку на это государство?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/reject`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство отклонено'));
const denonceState = () => confirmAndExecute('Денонсировать государство?', 'Это действие приведет к роспуску государства. Вы уверены?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/denonce`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство денонсировано'));
const reanonceState = () => confirmAndExecute('Восстановить государство?', 'Государство снова станет активным. Вы уверены?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/reanonce`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство восстановлено'));
const deleteState = () => confirmAndExecute('УДАЛИТЬ ГОСУДАРСТВО?', 'Это действие НЕОБРАТИМО и полностью удалит все данные государства. Вы абсолютно уверены?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}`, { method: 'DELETE', body: { adminUuid: userUuid.value } }), 'Государство удалено'));

// Citizen Actions
const leaveState = () => confirmAndExecute('Покинуть государство?', 'Вы уверены, что хотите выйти из состава этого государства?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/leave`, { method: 'POST', body: { playerUuid: userUuid.value } }), 'Вы покинули государство'));
const applyToState = () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/apply`, { method: 'POST', body: { playerUuid: userUuid.value } }), 'Заявка на вступление отправлена');


/* --- Data Loading --- */
async function loadAll() {
  loading.value = true;
  errorMessage.value = null;
  try {
    // Fetch state data first
    const stateData = await $fetch<IState>(`/distant-api/state/${uuid}`);
    if (!stateData) {
      errorMessage.value = 'Государство не найдено.';
      loading.value = false;
      return;
    }
    state.value = stateData;

    // Fetch ruler nickname
    if (state.value.ruler_uuid) {
      try {
        const rulerData = await $fetch<{ nickname?: string, uuid: string }>(`/distant-api/user/${state.value.ruler_uuid}`);
        ruler.value = rulerData.nickname || 'Неизвестный правитель';
      } catch (error) {
        console.error("Ошибка при загрузке данных правителя:", error);
        ruler.value = 'Не удалось загрузить';
      }
    } else {
      ruler.value = 'Не назначен';
    }

    // Reset content arrays
    orders.value = [];
    warrants.value = [];
    events.value = [];
    ordersOffset = 0;
    warrantsOffset = 0;
    eventsOffset = 0;

    // Parallel fetch for user permissions and initial content
    const promises = [
      fetchContent(), // Initial fetch for orders, warrants, events
    ];

    if (userUuid.value) {
      promises.push(fetchUserPermissions());
    }

    await Promise.all(promises);

  } catch (error: any) {
    if (error.response?.status === 404) {
      errorMessage.value = 'Государство с таким UUID не найдено.';
    } else {
      errorMessage.value = 'Произошла ошибка при загрузке данных.';
    }
    console.error("Ошибка при загрузке данных государства:", error);
  } finally {
    loading.value = false;
    // We need to wait for the DOM to update after loading=false before we can watch the sentinel
    nextTick(() => {
      watchDom();
    });
  }
}

// =================================================================================
// THIS IS THE CORRECTED FUNCTION
// =================================================================================
async function fetchUserPermissions() {
  if (!userUuid.value) return;
  try {
    const [roleData, adminData, diplomatData] = await Promise.all([
      $fetch<{ role: RolesInState }>(`/distant-api/state/${uuid}/member/${userUuid.value}`).catch(() => ({ role: RolesInState.NONE })),
      $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`).catch(() => false),
      // CORRECTED: Using the structure from your sample response.
      $fetch<{ stateUuid: string, isDiplomaticActionsAllowed: boolean }[]>(`/distant-api/user/${userUuid.value}/isDiplomaticActionsAllowedForPlayer`).catch(() => [])
    ]);

    userRole.value = roleData.role;
    isAdmin.value = adminData;

    // CORRECTED: Filter by isDiplomaticActionsAllowed and map using the correct 'stateUuid' property.
    const allowedStatesUuids = diplomatData
        .filter(d => d.isDiplomaticActionsAllowed)
        .map(d => d.stateUuid);

    diplomaticStates.value = allowedStatesUuids;
    isDiplomatForOtherState.value = allowedStatesUuids.length > 0 && !allowedStatesUuids.includes(uuid);

  } catch (error) {
    console.error("Ошибка при получении прав пользователя:", error);
    // Reset to default non-privileged state on error
    userRole.value = RolesInState.NONE;
    isAdmin.value = false;
    isDiplomatForOtherState.value = false;
    diplomaticStates.value = [];
  }
}

/* --- Infinite Scroll --- */
const batch = 15;
let ordersOffset = 0, warrantsOffset = 0, eventsOffset = 0;
let io: IntersectionObserver | null = null;
const isLoadingMore = ref(false);

onMounted(() => {
  if (typeof window !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isLoadingMore.value) {
        loadMore();
      }
    }, { threshold: 0.5, rootMargin: '0px 0px 200px 0px' });
    loadAll();
  }
});

onBeforeUnmount(() => {
  if (io) io.disconnect();
});

function watchDom() {
  if (!io) return;
  io.disconnect(); // Disconnect from any previous sentinels
  const bottom = document.getElementById('bottom-sentinel');
  if (bottom) io.observe(bottom);
}

async function fetchContent() {
  return Promise.allSettled([fetchOrders(), fetchWarrants(), fetchEvents()]);
}

async function fetchOrders() {
  const newOrders = await $fetch<IStateOrder[]>('/distant-api/order/list',{ query:{stateUuid:uuid,startAt:ordersOffset,limit:batch}}).catch(()=>[])
  if(newOrders.length > 0) {
    orders.value.push(...newOrders);
    ordersOffset += batch;
  }
}
async function fetchWarrants() {
  const newWarrants = await $fetch<IStateWarrant[]>('/distant-api/warrant/list',{ query:{stateUuid:uuid,startAt:warrantsOffset,limit:batch}}).catch(()=>[])
  if(newWarrants.length > 0) {
    warrants.value.push(...newWarrants);
    warrantsOffset += batch;
  }
}
async function fetchEvents() {
  const newEvents = await $fetch<IHistoryEvent[]>('/distant-api/history/list', { query: { stateUuid: uuid, startAt: eventsOffset, limit: batch } }).catch(() => []);
  if(newEvents.length > 0) {
    events.value.push(...newEvents);
    eventsOffset += batch;
  }
}

async function loadMore() {
  if(isLoadingMore.value) return;
  isLoadingMore.value = true;
  await fetchContent();
  isLoadingMore.value = false;
}

</script>

<template>
  <div class="bg-black text-white min-h-screen" :style="{ '--accent': accent, '--accent-bg': accentBg }">

    <!-- Modals -->
    <ConfirmationModal
        :is-open="showConfirmationModal"
        :title="confirmationDetails.title"
        :message="confirmationDetails.message"
        @close="showConfirmationModal = false"
        @confirm="confirmationDetails.onConfirm"
    />
    <DiplomaticActionModal
        v-if="state"
        :is-open="showDiplomacyModal"
        :state-uuid="uuid"
        :state-name="state.name"
        :managing-states="diplomaticStates"
        :accent-color="accent"
        @close="showDiplomacyModal = false"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen p-4">
      <div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-neutral-600"></div>
      <p class="mt-4 text-lg text-gray-400">Загружаем данные государства...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <Icon name="material-symbols:error-outline" class="w-20 h-20 text-red-500 mb-4"/>
      <h2 class="text-3xl font-bold text-red-400">Произошла ошибка</h2>
      <p class="mt-2 text-lg text-gray-400 max-w-md">{{ errorMessage }}</p>
      <button @click="router.push('/')" class="mt-8 btn-action-primary">
        Вернуться на главную
      </button>
    </div>

    <!-- Main Content -->
    <main v-else-if="state" class="fade-in max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- Header Section -->
      <header class="pt-24 pb-12 md:pt-28 md:pb-16">
        <div class="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
          <div class="flex-shrink-0 flex flex-col items-center md:items-start">
            <img :src="state.flag_link" alt="Флаг государства" class="w-40 h-auto object-cover rounded-lg shadow-lg shadow-black/50 border-2 border-gray-700"/>
          </div>
          <div class="flex-1 space-y-4 text-center md:text-left">
            <h1 class="pr2p text-4xl lg:text-5xl font-extrabold tracking-tight" :style="{ color: 'var(--accent)' }">{{ state.name }}</h1>
            <p class="text-gray-300 whitespace-pre-line text-base leading-relaxed max-w-4xl">{{ state.description }}</p>
            <!-- External Links -->
            <div class="flex items-center justify-center md:justify-start gap-4 pt-2">
              <a v-if="state.map_link" :href="state.map_link" target="_blank" rel="noopener noreferrer" class="external-link">
                <Icon name="material-symbols:map-outline-rounded" class="w-5 h-5" :style="{ color: 'var(--accent)' }" />
                <span>Карта</span>
              </a>
              <a v-if="state.telegram_link" :href="state.telegram_link" target="_blank" rel="noopener noreferrer" class="external-link">
                <Icon name="simple-icons:telegram" class="w-5 h-5" :style="{ color: 'var(--accent)' }" />
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div class="space-y-10 md:space-y-12 pb-16">
        <!-- Info Grid -->
        <section>
          <div class="border-t border-gray-800 pt-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-gray-300">
              <div class="info-item" title="Форма правления">
                <Icon name="material-symbols:account-balance-outline-rounded" class="info-icon" :style="{ color: 'var(--accent)' }"/>
                <div>
                  <span class="info-label">Форма правления</span>
                  <p class="info-value">{{ govFormTranslations[state.gov_form] || state.gov_form }}</p>
                </div>
              </div>
              <div class="info-item" title="Статус">
                <Icon name="material-symbols:task-alt-outline-rounded" class="info-icon" :style="{ color: 'var(--accent)' }" />
                <div>
                  <span class="info-label">Статус</span>
                  <p class="info-value">{{ stateStatusTranslations[state.status] || state.status }}</p>
                </div>
              </div>
              <div class="info-item" title="Правитель">
                <Icon name="material-symbols:account-circle-outline" class="info-icon" :style="{ color: 'var(--accent)' }" />
                <div>
                  <span class="info-label">Правитель</span>
                  <p class="info-value">{{ ruler }}</p>
                </div>
              </div>
              <div class="info-item" title="Выборы">
                <Icon name="material-symbols:how-to-vote-outline-rounded" class="info-icon" :style="{ color: 'var(--accent)' }" />
                <div>
                  <span class="info-label">Выборы</span>
                  <p class="info-value">{{ state.has_elections ? 'Проводятся' : 'Отсутствуют' }}</p>
                </div>
              </div>
              <div class="info-item" title="Двойное гражданство">
                <Icon name="material-symbols:badge-outline" class="info-icon" :style="{ color: 'var(--accent)' }" />
                <div>
                  <span class="info-label">Двойное гражданство</span>
                  <p class="info-value">{{ state.allow_dual_citizenship ? 'Разрешено' : 'Запрещено' }}</p>
                </div>
              </div>
              <div class="info-item" title="Вход на территорию">
                <Icon name="material-symbols:login-rounded" class="info-icon" :style="{ color: 'var(--accent)' }" />
                <div>
                  <span class="info-label">Вход на территорию</span>
                  <p class="info-value">{{ state.free_entry ? 'Свободный' : 'Ограниченный' }}</p>
                </div>
              </div>

              <!-- Conditional description for restricted entry -->
              <div v-if="!state.free_entry && state.free_entry_description" class="sm:col-span-2 lg:col-span-3 bg-gray-800/50 p-4 rounded-lg mt-2">
                <h4 class="font-semibold mb-2" :style="{ color: 'var(--accent)' }">Порядок входа на территорию:</h4>
                <p class="text-gray-400 text-sm whitespace-pre-line">{{ state.free_entry_description }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Action Panels -->
        <section v-if="userUuid" class="space-y-6">
          <!-- Admin Panel -->
          <div v-if="isAdmin" class="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
            <h3 class="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
              <Icon name="material-symbols:shield-person-outline-rounded" />
              Панель администратора
            </h3>
            <div class="flex flex-wrap gap-4 items-center">
              <template v-if="state.status === 'pending'">
                <button @click="approveState" class="btn-admin-success">Одобрить</button>
                <button @click="rejectState" class="btn-admin-warning">Отклонить</button>
              </template>
              <button v-if="state.status === 'active'" @click="denonceState" class="btn-admin-warning">Денонсировать</button>
              <button v-if="state.status === 'dissolved'" @click="reanonceState" class="btn-admin-success">Восстановить</button>
              <button v-if="state.status !== 'merged'" @click="deleteState" class="btn-admin-danger md:ml-auto">Удалить</button>
            </div>
          </div>

          <!-- User Actions Panel -->
          <div class="bg-gray-800/70 border border-gray-700/80 rounded-lg p-4">
            <h3 class="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Icon name="material-symbols:settings-account-box-outline-rounded" />
              Панель управления
            </h3>
            <div class="flex flex-wrap gap-3 items-center">
              <NuxtLink v-if="isHighRank && canTakeAction" :to="uuid + '/panel'" class="btn-action-primary">
                <Icon name="material-symbols:dashboard-customize-outline-rounded" />
                <span>Панель управления</span>
              </NuxtLink>

              <button v-if="isRuler && canTakeAction" @click="denonceState" class="btn-action-danger">
                <Icon name="material-symbols:gavel-rounded"/>
                <span>Распустить государство</span>
              </button>

              <button v-if="isCitizen && canTakeAction" @click="leaveState" class="btn-action-danger">
                <Icon name="material-symbols:logout-rounded"/>
                <span>Выйти из государства</span>
              </button>

              <div v-if="userRole === 'applicant' && canTakeAction" class="w-full flex items-center gap-3 bg-blue-900/50 text-blue-300 text-sm font-semibold p-3 rounded-lg">
                <Icon name="material-symbols:hourglass-outline-rounded" class="w-5 h-5" />
                <span>Ваша заявка на вступление отправлена и ожидает рассмотрения.</span>
              </div>

              <button v-else-if="userRole === 'none' && canTakeAction" @click="applyToState" class="btn-action-success">
                <Icon name="material-symbols:person-add-outline-rounded" />
                <span>Подать заявку на вступление</span>
              </button>

              <button v-if="canManageRelations" @click="showDiplomacyModal = true" class="btn-action-secondary">
                <Icon name="material-symbols:handshake-outline-rounded" />
                <span>Управлять отношениями</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 3-column Feed -->
        <section>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Decrees -->
            <div class="space-y-4">
              <h2 class="feed-header pr2p" :style="{ color: 'var(--accent)', borderColor: 'var(--accent-bg)' }">Указы</h2>
              <div v-if="!orders.length" class="feed-empty-state">Указов пока нет</div>
              <StateOrderCard v-for="o in orders" :key="o.uuid" :order="o" :color="accent"/>
            </div>

            <!-- Warrants -->
            <div class="space-y-4">
              <h2 class="feed-header pr2p" :style="{ color: 'var(--accent)', borderColor: 'var(--accent-bg)' }">Ордеры</h2>
              <div v-if="!warrants.length" class="feed-empty-state">Активных ордеров нет</div>
              <StateWarrantCard v-for="w in warrants" :key="w.uuid" :warrant="w" :color="accent"/>
            </div>

            <!-- History -->
            <div class="space-y-4 lg:col-span-1">
              <h2 class="feed-header pr2p" :style="{ color: 'var(--accent)', borderColor: 'var(--accent-bg)' }">История</h2>
              <div v-if="!events.length" class="feed-empty-state">Исторических событий нет</div>
              <HistoryEventCard v-for="e in events" :key="e.uuid" :event="e" :color="accent"/>
            </div>
          </div>
        </section>
      </div>

      <!-- Sentinel for infinite scroll -->
      <div id="bottom-sentinel" class="w-full h-10"></div>
      <div v-if="isLoadingMore" class="flex justify-center py-8">
        <div class="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-neutral-600"></div>
      </div>

    </main>
  </div>
</template>

<style scoped>
/* Define CSS variables based on Vue computed properties */
:root {
  --accent: #ff5555;
  --accent-bg: #ff5555;
}

/* General Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

/* Custom Component-specific Styles using Tailwind's @apply */
.external-link {
  @apply inline-flex items-center gap-2 text-sm bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 font-semibold rounded-lg px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md;
}

.info-item {
  @apply flex items-center gap-4 bg-gray-800/30 p-3 rounded-lg transition hover:bg-gray-800/60;
}
.info-icon {
  @apply w-10 h-10 p-2 rounded-lg shrink-0;
}
.info-label {
  @apply text-xs text-gray-500;
}
.info-value {
  @apply font-semibold text-gray-200;
}

.feed-header {
  @apply font-bold text-2xl pb-3 border-b-2;
}
.feed-empty-state {
  @apply text-gray-500 text-center py-10 bg-gray-800/20 rounded-lg border border-dashed border-gray-700;
}

/* Base Button Styles */
.btn-base {
  @apply inline-flex items-center justify-center gap-2.5 font-semibold rounded-lg px-5 py-2.5 transition-all duration-200 transform focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-action-primary {
  @apply btn-base bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400 shadow-md hover:shadow-lg;
}
.btn-action-secondary {
  @apply btn-base bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-400 shadow-md hover:shadow-lg;
}
.btn-action-danger {
  @apply btn-base bg-red-700 hover:bg-red-600 text-white focus:ring-red-500 shadow-md hover:shadow-lg;
}
.btn-action-success {
  @apply btn-base bg-green-600 hover:bg-green-500 text-white focus:ring-green-400 shadow-md hover:shadow-lg;
}

/* Admin Button Styles */
.btn-admin-success {
  @apply btn-base bg-green-500 hover:bg-green-400 text-white focus:ring-green-300;
}
.btn-admin-warning {
  @apply btn-base bg-yellow-500 hover:bg-yellow-400 text-black font-bold focus:ring-yellow-300;
}
.btn-admin-danger {
  @apply btn-base bg-red-700 hover:bg-red-600 text-white focus:ring-red-500;
}
</style>

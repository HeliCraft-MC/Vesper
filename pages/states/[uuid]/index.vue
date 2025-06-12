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

// User specific data
const { data: session } = useAuth();
const userUuid = computed(() => session.value?.uuid);
const userRole = ref<RolesInState>(RolesInState.APPLICANT);
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
const hasApplied = computed(() => userRole.value === RolesInState.APPLICANT && state.value?.status === StateStatus.ACTIVE); // Simplified logic
const canManageRelations = computed(() => isDiplomatForOtherState.value && state.value?.status === StateStatus.ACTIVE);
const canTakeAction = computed(() => state.value?.status === StateStatus.ACTIVE);


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
    // Here you could add a success toast notification
    console.log(successMessage);
    loadAll(); // Reload data to reflect changes
  } catch (err) {
    console.error(`Ошибка при выполнении действия:`, err);
    // Here you could add an error toast notification
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

let ruler = ref('');

/* --- Data Loading --- */
async function loadAll() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const stateData = await $fetch<IState>(`/distant-api/state/${uuid}`);
    if (!stateData) {
      errorMessage.value = 'Государство не найдено.';
      return;
    }
    state.value = stateData;



    //get state ruler
    if (state.value.ruler_uuid) {
      try {
        const rulerData = await $fetch<{ nickname?: string, uuid: string }>(`/distant-api/user/${state.value.ruler_uuid}`);
        ruler.value = rulerData.nickname || 'Неизвестный правитель';
      } catch (error) {
        console.error("Ошибка при загрузке данных правителя:", error);
        ruler.value = 'Неизвестный правитель';
      }
    } else {
      ruler.value = 'Ошибка';
    }

    // Parallel fetch for user roles and content
    const promises = [
      fetchOrders(),
      fetchWarrants(),
      fetchEvents()
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
    watchDom();
  }
}

async function fetchUserPermissions() {
  if (!userUuid.value) return;
  try {
    const [roleData, adminData, diplomatData] = await Promise.all([
      $fetch<{ role: RolesInState }>(`/distant-api/state/${uuid}/member/${userUuid.value}`).catch(() => ({ role: RolesInState.NONE })),
      $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`).catch(() => false),
      $fetch<{ state_uuid: string, isDiplomaticActionsAllowed: boolean }[]>(`/distant-api/user/${userUuid.value}/isDiplomaticActionsAllowedForPlayer`).catch(() => [])
    ]);

    userRole.value = roleData.role;
    isAdmin.value = adminData;

    const allowedStates = diplomatData.filter(d => d.isDiplomaticActionsAllowed).map(d => d.state_uuid);
    diplomaticStates.value = allowedStates;
    isDiplomatForOtherState.value = allowedStates.length > 0 && !allowedStates.includes(uuid);

  } catch (error) {
    console.error("Ошибка при получении прав пользователя:", error);
  }
}


/* --- Infinite Scroll --- */
const batch = 15;
let ordersOffset = 0, warrantsOffset = 0, eventsOffset = 0;
let io: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof window !== 'undefined') {
    io = new IntersectionObserver(onBottom, { threshold: 0.5 });
    loadAll();
  }
});

onBeforeUnmount(() => {
  if (io) io.disconnect();
});

function onBottom(entries: IntersectionObserverEntry[]) {
  if (entries[0]?.isIntersecting) {
    loadMore();
  }
}

function watchDom() {
  if (!io) return;
  const bottom = document.getElementById('bottom-sentinel');
  if (bottom) io.observe(bottom);
}

async function fetchOrders() {
   const r = await $fetch('/distant-api/order/list',{ query:{stateUuid:uuid,startAt:ordersOffset,limit:batch}}).catch(()=>[])
   orders.value.push(...r)
   ordersOffset += batch
}
async function fetchWarrants() {
   const r = await $fetch('/distant-api/warrant/list',{ query:{stateUuid:uuid,startAt:warrantsOffset,limit:batch}}).catch(()=>[])
   warrants.value.push(...r)
   warrantsOffset+=batch
}
async function fetchEvents() {
  const r = await $fetch<IHistoryEvent[]>('/distant-api/history/list', { query: { stateUuid: uuid, startAt: eventsOffset, limit: batch } }).catch(() => []);
  events.value.push(...r);
  eventsOffset += batch;
}
async function loadMore() {
  await Promise.all([fetchOrders(), fetchWarrants(), fetchEvents()]);
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
        @close="showDiplomacyModal = false"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen">
      <div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
      <p class="mt-4 text-lg text-gray-400">Загружаем данные государства...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="flex flex-col items-center justify-center min-h-screen text-center">
      <h2 class="text-3xl font-bold text-red-500">Ошибка</h2>
      <p class="mt-2 text-lg text-gray-400">{{ errorMessage }}</p>
      <button @click="router.push('/')" class="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 transition-colors">
        На главную
      </button>
    </div>

    <!-- Main Content -->
    <main v-else-if="state" class="flex flex-col pt-24 md:pt-28 fade-in">

      <!-- Header Section -->
      <section class="px-6 max-w-7xl mx-auto w-full">
        <div class="flex flex-col md:flex-row md:items-start gap-8">
          <div class="flex-shrink-0 flex flex-col items-center">
            <img :src="state.flag_link" alt="Флаг" class="w-32 h-auto object-cover rounded-lg shadow-lg shadow-black/50"/>
          </div>
          <div class="flex-1 space-y-4">
            <h1 class="pr2p text-4xl font-bold" :style="{ color: 'var(--accent)' }">{{ state.name }}</h1>
            <p class="text-gray-300 whitespace-pre-line text-base leading-relaxed max-w-4xl">{{ state.description }}</p>
            <!-- External Links -->
            <div class="flex items-center gap-4 pt-2">
              <a v-if="state.map_link" :href="state.map_link" target="_blank" class="flex items-center gap-2 text-sm bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 font-semibold rounded-lg px-4 py-2 transition-all">
                <Icon name="material-symbols:location-on-outline" class="w-4 h-4" :style="{ color: 'var(--accent)' }" />
                Карта
              </a>
              <a v-if="state.telegram_link" :href="state.telegram_link" target="_blank" class="flex items-center gap-2 text-sm bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 font-semibold rounded-lg px-4 py-2 transition-all">
                <Icon name="simple-icons:telegram" class="w-4 h-4" :style="{ color: 'var(--accent)' }" />
                Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Info Grid -->
      <section class="px-6 max-w-7xl mx-auto w-full mt-8">
        <div class="border-t border-gray-800/70 pt-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 text-gray-300">

            <div class="flex items-center gap-3" title="Форма правления">
              <Icon name="material-symbols:account-balance-outline" class="w-10 h-10 p-2 rounded-lg shrink-0" :style="{ color: 'var(--accent)' }"/>
              <div>
                <span class="text-xs text-gray-500">Форма правления</span>
                <p class="font-semibold">{{ govFormTranslations[state.gov_form] || state.gov_form }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3" title="Статус">
              <Icon name="material-symbols:task-alt" class="w-10 h-10 p-2 rounded-lg shrink-0" :style="{ color: 'var(--accent)' }" />
              <div>
                <span class="text-xs text-gray-500">Статус</span>
                <p class="font-semibold">{{ stateStatusTranslations[state.status] || state.status }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3" title="Выборы">
              <Icon name="material-symbols:how-to-vote-outline" class="w-10 h-10 p-2 rounded-lg shrink-0" :style="{ color: 'var(--accent)' }" />
              <div>
                <span class="text-xs text-gray-500">Выборы</span>
                <p class="font-semibold">{{ state.has_elections ? 'Проводятся' : 'Отсутствуют' }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3" title="Двойное гражданство">
              <Icon name="material-symbols:style-outline" class="w-10 h-10 p-2 rounded-lg shrink-0" :style="{ color: 'var(--accent)' }" />
              <div>
                <span class="text-xs text-gray-500">Двойное гражданство</span>
                <p class="font-semibold">{{ state.allow_dual_citizenship ? 'Разрешено' : 'Запрещено' }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3" title="Вход на территорию">
              <Icon name="material-symbols:login" class="w-10 h-10 p-2 rounded-lg shrink-0" :style="{ color: 'var(--accent)' }" />
              <div class="flex-1">
                <span class="text-xs text-gray-500">Вход на территорию</span>
                <p class="font-semibold">{{ state.free_entry ? 'Свободный' : 'Ограниченный' }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3" title="Правитель">
              <Icon name="material-symbols:account-circle-outline" class="w-10 h-10 p-2 rounded-lg shrink-0" :style="{ color: 'var(--accent)' }" />
              <div>
                <span class="text-xs text-gray-500">Правитель</span>
                <p class="font-semibold">{{ ruler }}</p>
              </div>
            </div>

            <!-- Conditional description for restricted entry -->
            <div v-if="!state.free_entry && state.free_entry_description" class="sm:col-span-2 lg:col-span-3 bg-gray-800/40 p-4 rounded-lg">
              <h4 class="font-semibold mb-1 mt-0" :style="{ color: 'var(--accent)' }">Порядок входа на территорию:</h4>
              <p class="text-gray-400 text-sm whitespace-pre-line">{{ state.free_entry_description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Action Panels -->
      <section v-if="userUuid" class="px-6 max-w-7xl mx-auto w-full mt-8">
        <!-- Admin Panel -->
        <div v-if="isAdmin" class="bg-purple-900/40 border border-purple-700 rounded-lg p-4 mb-6">
          <h3 class="text-lg font-bold text-purple-300 mb-3">Панель администратора</h3>
          <div class="flex flex-wrap gap-4 items-center">
            <!-- Pending State Actions -->
            <template v-if="state.status === 'pending'">
              <button @click="approveState" class="btn-admin-success">Одобрить</button>
              <button @click="rejectState" class="btn-admin-warning">Отклонить</button>
            </template>
            <!-- Active State Actions -->
            <template v-if="state.status === 'active'">
              <button @click="denonceState" class="btn-admin-warning">Денонсировать</button>
            </template>
            <!-- Dissolved State Actions -->
            <template v-if="state.status === 'dissolved'">
              <button @click="reanonceState" class="btn-admin-success">Восстановить</button>
            </template>
            <!-- Delete is always an option for admin (except merged) -->
            <button v-if="state.status !== 'merged'" @click="deleteState" class="btn-admin-danger ml-auto">Удалить</button>
          </div>
        </div>

        <!-- User Actions Panel -->
        <div class="bg-gray-800/50 rounded-lg p-4 flex flex-wrap gap-4 items-center">
          <h3 class="text-lg font-bold text-gray-300 mr-4 whitespace-nowrap">Панель управления</h3>
          <div class="flex flex-wrap gap-3 items-center w-full">
            <button v-if="isRuler && canTakeAction" @click="denonceState" class="btn-action-danger">Распустить государство</button>

            <NuxtLink :to="uuid + '/panel'" v-if="isHighRank && canTakeAction" class="">
              <button class="btn-action-primary">Панель управления</button>
            </NuxtLink>

            <template v-if="isCitizen && canTakeAction">
              <button @click="leaveState" class="btn-action-danger">Выйти из государства</button>
              <button class="btn-action-secondary" disabled>Панель государства</button>
            </template>

            <div v-if="userRole === 'applicant' && canTakeAction" class="w-full">
              <div class="bg-blue-900/50 text-blue-300 text-sm font-semibold p-3 rounded-lg text-center">
                Ваша заявка на вступление отправлена и ожидает рассмотрения.
              </div>
            </div>

            <button v-else-if="userRole === 'none' && canTakeAction" @click="applyToState" class="btn-action-success w-full md:w-auto">
              Подать заявку на вступление
            </button>

            <template v-if="canManageRelations">
              <button @click="showDiplomacyModal = true" class="btn-action-primary">Управлять отношениями</button>
              <button class="btn-action-secondary" disabled>Управлять войнами</button>
            </template>
          </div>
        </div>
      </section>

      <!-- 3-column Feed -->
      <section class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full mt-4">
        <!-- Decrees -->
        <div class="space-y-4">
          <h2 class="font-bold pr2p text-xl pb-2 border-b-2" :style="{ color: 'var(--accent)', borderColor: 'var(--accent-bg)' }">Указы</h2>
          <div v-if="!orders.length" class="text-gray-500 text-center py-8">Указов пока нет</div>
          <StateOrderCard v-for="o in orders" :key="o.uuid" :order="o" :color="accent"/>
        </div>

        <!-- Warrants -->
        <div class="space-y-4">
          <h2 class="font-bold pr2p text-xl pb-2 border-b-2" :style="{ color: 'var(--accent)', borderColor: 'var(--accent-bg)' }">Ордеры</h2>
          <div v-if="!warrants.length" class="text-gray-500 text-center py-8">Активных ордеров нет</div>
          <StateWarrantCard v-for="w in warrants" :key="w.uuid" :warrant="w" :color="accent"/>
        </div>

        <!-- History -->
        <div class="space-y-4 md:col-span-2 lg:col-span-1">
          <h2 class="font-bold pr2p text-xl pb-2 border-b-2" :style="{ color: 'var(--accent)', borderColor: 'var(--accent-bg)' }">История</h2>
          <div v-if="!events.length" class="text-gray-500 text-center py-8">Исторических событий нет</div>
          <HistoryEventCard v-for="e in events" :key="e.uuid" :event="e" :color="accent"/>
        </div>
      </section>

      <!-- sentinel for infinite scroll -->
      <div id="bottom-sentinel" class="w-full h-10"></div>
    </main>
  </div>
</template>

<style scoped>
/* Using a more modern, cleaner font can improve the look */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

:root {
  --accent: #ff5555;
  --accent-bg: #ff5555;
  font-family: 'Inter', sans-serif;
}

/* Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

/* Button Styles */
.btn-base {
  @apply inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black;
}

.btn-action-primary {
  @apply btn-base bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400;
}
.btn-action-secondary {
  @apply btn-base bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-400;
}
.btn-action-danger {
  @apply btn-base bg-red-600/90 hover:bg-red-600 text-white focus:ring-red-500;
}
.btn-action-success {
  @apply btn-base bg-green-600 hover:bg-green-500 text-white focus:ring-green-400;
}

/* Admin Button Styles */
.btn-admin-success {
  @apply btn-base bg-green-600 hover:bg-green-500 text-white focus:ring-green-400;
}
.btn-admin-warning {
  @apply btn-base bg-yellow-600 hover:bg-yellow-500 text-black font-bold focus:ring-yellow-400;
}
.btn-admin-danger {
  @apply btn-base bg-red-700 hover:bg-red-600 text-white focus:ring-red-500;
}
</style>

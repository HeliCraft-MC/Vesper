<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold flex items-center gap-2">
        <Icon name="material-symbols:person-search-rounded" />
        Ордеры
      </h2>
      <button @click="isCreateModalOpen = true" class="action-button-danger">
        <Icon name="material-symbols:add-circle-outline-rounded" />
        <span>Выдать ордер</span>
      </button>
    </div>

    <!-- Состояние загрузки и ошибок -->
    <div v-if="loading" class="flex justify-center items-center py-10">
      <div class="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
    </div>
    <div v-else-if="error" class="text-center py-10 text-red-400">
      <p>Не удалось загрузить ордеры.</p>
      <p class="text-sm text-gray-500">{{ error }}</p>
    </div>

    <!-- Список ордеров -->
    <div v-else-if="warrants.length > 0" class="space-y-3">
      <div v-for="warrant in warrants" :key="warrant.uuid" class="bg-gray-800/60 p-4 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3">
              <img :src="`/distant-api/user/${warrant.affectedNickname}/skin/head`" alt="head" class="w-10 h-10 rounded-md bg-gray-700 object-cover">
              <span class="font-bold text-lg text-red-400">{{ warrant.affectedNickname }}</span>
            </div>
            <p class="text-sm text-gray-400 mt-2">{{ warrant.reason }}</p>
          </div>
          <button @click="handleDelete(warrant.uuid)" class="text-gray-500 hover:text-red-400 transition-colors">
            <Icon name="material-symbols:delete-outline-rounded" class="w-5 h-5"/>
          </button>
        </div>
        <div class="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700/50">
          Выдан: {{ warrant.issuerNickname }} ({{ formatDate(warrant.created) }})
        </div>
      </div>
    </div>
    <div v-else class="text-center py-10 text-gray-500">
      <p>Нет выданных ордеров.</p>
    </div>

    <!-- Модальное окно создания -->
    <Teleport to="body">
      <div v-if="isCreateModalOpen" class="modal-backdrop">
        <div class="modal-content" v-click-outside="closeModal">
          <h3 class="text-xl font-bold mb-4">Выдать ордер</h3>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div class="relative">
              <input
                  v-model="newWarrant.affectedPlayerNickname"
                  @input="debouncedSearch"
                  type="text"
                  placeholder="Никнейм игрока"
                  class="form-input"
                  required
                  autocomplete="off"
              >
              <!-- Результаты поиска -->
              <div v-if="isSearching || searchResults.length > 0 || (newWarrant.affectedPlayerNickname.length > 1 && !isSearching)" class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <div v-if="isSearching" class="px-4 py-2 text-gray-400">Поиск...</div>
                <ul v-else-if="searchResults.length > 0">
                  <li
                      v-for="user in searchResults"
                      :key="user.uuid"
                      @click="selectUser(user)"
                      class="px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center gap-3"
                  >
                    <img :src="`/distant-api/user/${user.nickname}/skin/head`" alt="head" class="w-6 h-6 rounded-sm">
                    <span>{{ user.nickname }}</span>
                  </li>
                </ul>
                <div v-else-if="newWarrant.affectedPlayerNickname.length > 1" class="px-4 py-2 text-gray-500">
                  Игроки не найдены.
                </div>
              </div>
            </div>

            <textarea v-model="newWarrant.reason" placeholder="Причина" class="form-input" rows="4" required></textarea>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="closeModal" class="form-button-secondary">Отмена</button>
              <button type="submit" class="form-button-primary" :disabled="isSubmitting || !newWarrant.affectedPlayerUuid" :style="{ backgroundColor: accentColor }">
                <span v-if="!isSubmitting">Выдать</span>
                <span v-else>Отправка...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import type { IStateWarrant } from '~/types/state.types';

// --- Типы ---
type WarrantWithDetails = IStateWarrant & { issuerNickname?: string, affectedNickname?: string };
type UserSearchResult = { uuid: string; nickname: string; };
// Тип для ответа от API поиска
type ApiUserResponse = { UUID: string; NICKNAME: string; [key: string]: any; };


const props = defineProps<{ stateUuid?: string, accentColor?: string }>();

// --- Состояние ---
const warrants = ref<WarrantWithDetails[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isCreateModalOpen = ref(false);
const isSubmitting = ref(false);
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);

const newWarrant = reactive({
  affectedPlayerNickname: '',
  affectedPlayerUuid: null as string | null,
  reason: '',
});

// Состояние для поиска
const searchResults = ref<UserSearchResult[]>([]);
const isSearching = ref(false);
let debounceTimer: NodeJS.Timeout;

// --- API ---
async function fetchWarrants() {
  if (!props.stateUuid) return;
  loading.value = true;
  error.value = null;
  try {
    const warrantList = await $fetch<IStateWarrant[]>(`/distant-api/warrant/list`, { query: { stateUuid: props.stateUuid } });
    const warrantsWithDetails = await Promise.all(warrantList.map(async (warrant) => {
      const issuerDetails = await $fetch<{ nickname: string }>(`/distant-api/user/${warrant.issued_by_player_uuid}`).catch(() => ({ nickname: 'Неизвестно' }));
      const affectedDetails = await $fetch<{ nickname: string }>(`/distant-api/user/${warrant.affected_player_uuid}`).catch(() => ({ nickname: 'Неизвестно' }));
      return { ...warrant, issuerNickname: issuerDetails.nickname, affectedNickname: affectedDetails.nickname };
    }));
    warrants.value = warrantsWithDetails.sort((a, b) => b.created - a.created);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!props.stateUuid || !currentUserUuid.value || !newWarrant.affectedPlayerUuid) return;
  isSubmitting.value = true;
  try {
    await $fetch('/distant-api/warrant/create', {
      method: 'POST',
      body: {
        stateUuid: props.stateUuid,
        issuedByPlayerUuid: currentUserUuid.value,
        affectedPlayerUuid: newWarrant.affectedPlayerUuid,
        reason: newWarrant.reason,
      },
    });
    closeModal();
    await fetchWarrants();
  } catch (err: any) {
    alert(`Ошибка выдачи ордера: ${err.data?.statusMessage || err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDelete(warrantUuid: string) {
  if (!currentUserUuid.value || !confirm('Вы уверены, что хотите отозвать этот ордер?')) return;
  try {
    await $fetch(`/distant-api/warrant/${warrantUuid}/delete`, {
      method: 'POST',
      body: { requesterUuid: currentUserUuid.value },
    });
    await fetchWarrants();
  } catch (err: any) {
    alert(`Ошибка удаления ордера: ${err.data?.statusMessage || err.message}`);
  }
}

// --- Логика поиска ---
const debouncedSearch = () => {
  newWarrant.affectedPlayerUuid = null; // Сбрасываем UUID при изменении инпута
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchUsers();
  }, 300); // Задержка в 300 мс
};

async function searchUsers() {
  if (newWarrant.affectedPlayerNickname.trim().length < 2) {
    searchResults.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const usersFromApi = await $fetch<ApiUserResponse[]>(`/distant-api/user/search`, {
      query: { nickname: newWarrant.affectedPlayerNickname, limit: 5 }
    });
    // *** ИЗМЕНЕНИЕ ЗДЕСЬ: Маппинг ответа API в нужный формат ***
    searchResults.value = usersFromApi.map(user => ({
      uuid: user.UUID,
      nickname: user.NICKNAME
    }));
  } catch (err: any) {
    if (err.statusCode === 404) {
      searchResults.value = [];
    } else {
      console.error("Search error:", err);
    }
  } finally {
    isSearching.value = false;
  }
}

function selectUser(user: UserSearchResult) {
  newWarrant.affectedPlayerNickname = user.nickname;
  newWarrant.affectedPlayerUuid = user.uuid;
  searchResults.value = []; // Скрываем результаты после выбора
}

// --- Утилиты ---
const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString('ru-RU');

function resetForm() {
  Object.assign(newWarrant, { affectedPlayerNickname: '', affectedPlayerUuid: null, reason: '' });
  searchResults.value = [];
  isSearching.value = false;
  clearTimeout(debounceTimer);
}

function closeModal() {
  isCreateModalOpen.value = false;
  resetForm();
}

// --- Жизненный цикл ---
onMounted(() => {
  if (props.stateUuid) fetchWarrants();
});

watch(() => props.stateUuid, (newUuid) => {
  if (newUuid) fetchWarrants();
});
</script>

<style scoped>
.action-button-danger { @apply flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 bg-red-600/20 text-red-300 hover:bg-red-600/40; }
.modal-backdrop { @apply fixed inset-0 bg-black/70 flex items-center justify-center z-50; }
.modal-content { @apply bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md; }
.form-input { @apply w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900; }
.form-input:focus { --tw-ring-color: var(--accent-color, #ffffff); }
.form-button-primary { @apply px-4 py-2 rounded-md font-semibold text-white transition-colors; }
.form-button-primary:disabled { @apply opacity-50 cursor-not-allowed; }
.form-button-secondary { @apply px-4 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors; }
</style>

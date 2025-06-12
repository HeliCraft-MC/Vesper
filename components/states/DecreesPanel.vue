<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold flex items-center gap-2">
        <Icon name="material-symbols:article-rounded" />
        Указы
      </h2>
      <button @click="isCreateModalOpen = true" class="action-button-success">
        <Icon name="material-symbols:add-circle-outline-rounded" />
        <span>Создать указ</span>
      </button>
    </div>

    <!-- Состояние загрузки и ошибок -->
    <div v-if="loading" class="flex justify-center items-center py-10">
      <div class="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
    </div>
    <div v-else-if="error" class="text-center py-10 text-red-400">
      <p>Не удалось загрузить указы.</p>
      <p class="text-sm text-gray-500">{{ error }}</p>
    </div>

    <!-- Список указов -->
    <div v-else-if="decrees.length > 0" class="space-y-3">
      <div v-for="decree in decrees" :key="decree.uuid" class="bg-gray-800/60 p-4 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-bold text-lg" :style="{ color: importanceColors[decree.importance] }">{{ decree.title }}</span>
            <p class="text-sm text-gray-400 mt-1">{{ decree.text }}</p>
          </div>
          <button @click="handleDelete(decree.uuid)" class="text-gray-500 hover:text-red-400 transition-colors">
            <Icon name="material-symbols:delete-outline-rounded" class="w-5 h-5"/>
          </button>
        </div>
        <div class="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700/50">
          Выдан: {{ decree.issuerNickname }} ({{ formatDate(decree.created) }})
          <span v-if="decree.expires_at"> | Истекает: {{ formatDate(decree.expires_at) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-10 text-gray-500">
      <p>Нет активных указов.</p>
    </div>

    <!-- Модальное окно создания -->
    <Teleport to="body">
      <div v-if="isCreateModalOpen" class="modal-backdrop">
        <div class="modal-content">
          <h3 class="text-xl font-bold mb-4">Новый указ</h3>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <input v-model="newDecree.title" type="text" placeholder="Заголовок" class="form-input" required>
            <textarea v-model="newDecree.text" placeholder="Текст указа" class="form-input" rows="4" required></textarea>
            <select v-model="newDecree.importance" class="form-input" required>
              <option :value="Importance.LOW">Низкая важность</option>
              <option :value="Importance.MEDIUM">Средняя важность</option>
              <option :value="Importance.HIGH">Высокая важность</option>
            </select>
            <input v-model="newDecree.expiresInDays" type="number" placeholder="Срок действия в днях (0 = бессрочно)" class="form-input" min="0">

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="isCreateModalOpen = false" class="form-button-secondary">Отмена</button>
              <button type="submit" class="form-button-primary" :disabled="isSubmitting">
                <span v-if="!isSubmitting">Опубликовать</span>
                <span v-else>Публикация...</span>
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
import type { IStateOrder } from '~/types/state.types';

// --- Типы и Енамы ---
enum Importance { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', PINNED = 'pinned' };
type DecreeWithDetails = IStateOrder & { issuerNickname?: string };

const props = defineProps<{ stateUuid?: string, accentColor?: string }>();

// --- Состояние ---
const decrees = ref<DecreeWithDetails[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isCreateModalOpen = ref(false);
const isSubmitting = ref(false);
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);

const newDecree = reactive({
  title: '',
  text: '',
  importance: Importance.MEDIUM,
  expiresInDays: 0,
});

// --- API вызовы ---
async function fetchDecrees() {
  if (!props.stateUuid) return;
  loading.value = true;
  error.value = null;
  try {
    const decreeList = await $fetch<IStateOrder[]>(`/distant-api/order/list`, { query: { stateUuid: props.stateUuid } });
    const decreesWithDetails = await Promise.all(decreeList.map(async (decree) => {
      const userDetails = await $fetch<{ nickname: string }>(`/distant-api/user/${decree.issued_by_player_uuid}`).catch(() => ({ nickname: 'Неизвестно' }));
      return { ...decree, issuerNickname: userDetails.nickname };
    }));
    decrees.value = decreesWithDetails.sort((a, b) => b.created - a.created);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!props.stateUuid || !currentUserUuid.value) return;
  isSubmitting.value = true;
  try {
    await $fetch('/distant-api/order/create', {
      method: 'POST',
      body: {
        stateUuid: props.stateUuid,
        issuedByPlayerUuid: currentUserUuid.value,
        title: newDecree.title,
        text: newDecree.text,
        importance: newDecree.importance,
        expiresAt: newDecree.expiresInDays > 0 ? Date.now() + newDecree.expiresInDays * 24 * 60 * 60 * 1000 : null,
      },
    });
    isCreateModalOpen.value = false;
    Object.assign(newDecree, { title: '', text: '', importance: Importance.MEDIUM, expiresInDays: 0 }); // Сброс формы
    await fetchDecrees();
  } catch (err: any) {
    alert(`Ошибка создания указа: ${err.data?.statusMessage || err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDelete(decreeUuid: string) {
  if (!currentUserUuid.value || !confirm('Вы уверены, что хотите удалить этот указ?')) return;
  try {
    await $fetch(`/distant-api/order/${decreeUuid}/delete`, {
      method: 'POST',
      body: { requesterUuid: currentUserUuid.value },
    });
    await fetchDecrees();
  } catch (err: any) {
    alert(`Ошибка удаления указа: ${err.data?.statusMessage || err.message}`);
  }
}


// --- Утилиты ---
const importanceColors: Record<Importance, string> = {
  [Importance.LOW]: '#84cc16',
  [Importance.MEDIUM]: '#f97316',
  [Importance.HIGH]: '#ef4444',
  [Importance.PINNED]: '#38bdf8', // например, голубой
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString('ru-RU');

// --- Жизненный цикл ---
onMounted(() => {
  if (props.stateUuid) fetchDecrees();
});

watch(() => props.stateUuid, (newUuid) => {
  if (newUuid) fetchDecrees();
});

</script>

<style scoped>
/* Стили для кнопок и модального окна можно вынести в глобальные стили, если они повторяются */
.action-button-success { @apply flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 bg-green-600/20 text-green-300 hover:bg-green-600/40; }
.modal-backdrop { @apply fixed inset-0 bg-black/70 flex items-center justify-center z-50; }
.modal-content { @apply bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md; }
.form-input { @apply w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900; }
.form-input:focus { --tw-ring-color: var(--accent-color, #ffffff); }
.form-button-primary { @apply px-4 py-2 rounded-md font-semibold text-white transition-colors; background-color: var(--accent-color); }
.form-button-primary:disabled { @apply opacity-50 cursor-not-allowed; }
.form-button-secondary { @apply px-4 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors; }
</style>

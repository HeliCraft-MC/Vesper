<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold" :style="{ color: accentColor }">
      Участники и Заявки
    </h1>

    <!-- Переключатель вкладок -->
    <div class="flex border-b border-gray-700">
      <button
          @click="activeTab = 'citizens'"
          class="tab-button"
          :class="{ 'tab-button-active': activeTab === 'citizens' }"
      >
        <Icon name="material-symbols:groups-rounded" class="w-5 h-5" />
        <span>Граждане ({{ citizens.length }})</span>
      </button>
      <button
          @click="activeTab = 'applicants'"
          class="tab-button"
          :class="{ 'tab-button-active': activeTab === 'applicants' }"
      >
        <Icon name="material-symbols:how-to-reg-rounded" class="w-5 h-5" />
        <span>Заявки ({{ applicants.length }})</span>
      </button>
    </div>

    <!-- Контент -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
    </div>
    <div v-else-if="error" class="text-center py-16 text-red-400">
      <p>Не удалось загрузить список участников.</p>
      <p class="text-sm text-gray-500">{{ error }}</p>
    </div>
    <div v-else>
      <!-- Таблица граждан -->
      <div v-show="activeTab === 'citizens'">
        <MembersTable
            :members="citizens"
            :current-user-role="currentUserRole"
            :updating-member-uuid="updatingMemberUuid"
            @action="handleAction"
        />
      </div>
      <!-- Таблица заявок -->
      <div v-show="activeTab === 'applicants'">
        <MembersTable
            :members="applicants"
            :current-user-role="currentUserRole"
            :updating-member-uuid="updatingMemberUuid"
            @action="handleAction"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue';
import { RolesInState } from '~/types/state.types';
import type { IState, IStateMember } from '~/types/state.types';
import MembersTable from '~/components/states/MembersTable.vue';

definePageMeta({
  layout: 'panel',
});

// --- Внедрение данных из Layout ---
const accentColor = inject<globalThis.Ref<string>>('accentColor', ref('#ffffff'));
const state = inject<globalThis.Ref<IState | null>>('state', ref(null));

// --- Локальное состояние ---
const members = ref<IStateMember[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref('citizens');
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);
const updatingMemberUuid = ref<string | null>(null); // UUID участника, который сейчас обновляется

// --- Загрузка данных ---
async function fetchMembers() {
  if (!state.value?.uuid) return;
  loading.value = true;
  error.value = null;
  try {
    const memberList = await $fetch<IStateMember[]>(`/distant-api/state/${state.value.uuid}/members`);
    const membersWithDetails = await Promise.all(memberList.map(async (member) => {
      try {
        const userDetails = await $fetch<{ nickname: string }>(`/distant-api/user/${member.player_uuid}`);
        return { ...member, nickname: userDetails.nickname };
      } catch {
        return { ...member, nickname: 'Неизвестно' };
      }
    }));
    members.value = membersWithDetails;
  } catch (err: any) {
    console.error("Ошибка при загрузке участников:", err);
    error.value = err.message || 'Произошла ошибка';
  } finally {
    loading.value = false;
  }
}

// --- Вычисляемые свойства для фильтрации ---
const citizens = computed(() => members.value.filter(m => m.role !== RolesInState.APPLICANT));
const applicants = computed(() => members.value.filter(m => m.role === RolesInState.APPLICANT));

// --- Вычисляемое свойство для роли текущего пользователя ---
const currentUserRole = computed<RolesInState | null>(() => {
  if (!currentUserUuid.value) return null;
  const self = members.value.find(m => m.player_uuid === currentUserUuid.value);
  return self ? self.role : null;
});

// --- Обработка действий из дочернего компонента ---
type ActionPayload =
    | { type: 'accept'; member: IStateMember }
    | { type: 'reject'; member: IStateMember }
    | { type: 'kick'; member: IStateMember }
    | { type: 'changeRole'; member: IStateMember; newRole: RolesInState };

async function handleAction(payload: ActionPayload) {
  if (!state.value?.uuid || !currentUserUuid.value) return;

  const { member } = payload;
  updatingMemberUuid.value = member.player_uuid; // Устанавливаем лоадер для этого участника

  try {
    if (payload.type === 'accept' || payload.type === 'reject') {
      await $fetch(`/distant-api/state/${state.value.uuid}/review`, {
        method: 'POST',
        body: { applicantUuid: member.player_uuid, reviewerUuid: currentUserUuid.value, approve: payload.type === 'accept' },
      });
    }
    else if (payload.type === 'kick') {
      await $fetch(`/distant-api/state/${state.value.uuid}/remove`, {
        method: 'POST',
        body: { uuidToRemove: member.player_uuid, uuidWhoRemoved: currentUserUuid.value },
      });
    }
    else if (payload.type === 'changeRole') {
      await $fetch(`/distant-api/state/${state.value.uuid}/role.update`, {
        method: 'POST',
        body: { playerUuid: member.player_uuid, updaterUuid: currentUserUuid.value, newRole: payload.newRole },
      });
    }

    await fetchMembers(); // Перезагружаем список после любого действия

  } catch (err: any) {
    console.error(`Ошибка при выполнении действия "${payload.type}":`, err);
    alert(`Ошибка: ${err.data?.statusMessage || err.message}`);
  } finally {
    updatingMemberUuid.value = null; // Убираем лоадер
  }
}


// --- Жизненный цикл ---
onMounted(() => {
  if (state.value) {
    fetchMembers();
  }
});

watch(state, (newState) => {
  if(newState && members.value.length === 0) {
    fetchMembers();
  }
});

</script>

<style scoped>
.tab-button {
  @apply px-4 py-3 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px transition-colors duration-200 flex items-center gap-2;
}
.tab-button:hover {
  @apply text-white;
}
.tab-button-active {
  color: var(--accent-color);
  border-color: var(--accent-color);
}
</style>

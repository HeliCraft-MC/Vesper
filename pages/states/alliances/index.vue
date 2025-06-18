<!-- pages/alliances/index.vue -->
<template>
  <div class="bg-black text-white min-h-screen">
    <!-- Main Content -->
    <main class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 class="text-4xl font-bold text-white">Альянсы</h1>
        <button v-if="canCreateAlliance" @click="isCreateModalOpen = true" class="btn-action-primary">
          <Icon name="material-symbols:add-shield-rounded" />
          Создать новый альянс
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-16 text-red-400">
        <p>Не удалось загрузить список альянсов.</p>
        <p class="text-sm text-gray-500">{{ error }}</p>
      </div>

      <!-- Grid of alliances -->
      <div v-else-if="alliances.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
            v-for="alliance in alliances"
            :key="alliance.uuid"
            :to="`/alliances/${alliance.uuid}`"
            class="alliance-card group"
        >
          <div class="flex items-center gap-4">
            <img
                :src="alliance.flag_link"
                :alt="`Флаг ${alliance.name}`"
                class="w-20 h-20 object-cover rounded-lg flex-shrink-0 border-2"
                :style="{ borderColor: alliance.color_hex }"
            />
            <div class="flex-1">
              <h3 class="font-bold text-xl group-hover:underline" :style="{ color: alliance.color_hex }">
                {{ alliance.name }}
              </h3>
              <p class="text-sm text-gray-400">{{ purposeText(alliance.purpose) }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 text-gray-500">
        <Icon name="material-symbols:shield-outline" class="w-24 h-24 mx-auto text-gray-600" />
        <h2 class="mt-4 text-2xl font-semibold">Альянсов нет</h2>
        <p class="mt-2">Пока не создано ни одного альянса. Вы можете стать первым!</p>
      </div>
    </main>

    <!-- Create Alliance Modal -->
    <CreateAllianceModal
        :is-open="isCreateModalOpen"
        :managed-states="creatableStates"
        @close="isCreateModalOpen = false"
        @created="handleAllianceCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { IAlliance, AlliencePurpose } from '~/types/diplomacy.types';
import type { IState, RolesInState } from '~/types/state.types';
import CreateAllianceModal from '~/components/alliances/CreateAllianceModal.vue';

definePageMeta({ auth: true });

const router = useRouter();
const { data: session } = useAuth();
const userUuid = computed(() => session.value?.uuid);

const alliances = ref<IAlliance[]>([]);
const managedStates = ref<IState[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isCreateModalOpen = ref(false);

const canCreateAlliance = computed(() => creatableStates.value.length > 0);

// Only rulers can create alliances
const creatableStates = computed(() => managedStates.value.filter(s => s.ruler_uuid === userUuid.value));


async function fetchData() {
  loading.value = true;
  error.value = null;
  try {
    const promises = [
      $fetch<IAlliance[]>('/distant-api/alliances/list').catch(() => [])
    ];
    if (userUuid.value) {
      // We need an endpoint to get all states a user is a member of. Let's assume this one exists.
      promises.push($fetch<IState[]>(`/distant-api/user/${userUuid.value}/states`).catch(() => []));
    }

    const [alliancesData, managedStatesData] = await Promise.all(promises);

    alliances.value = alliancesData as IAlliance[];
    if (managedStatesData) {
      managedStates.value = managedStatesData as IState[];
    }

  } catch (e: any) {
    error.value = e.data?.message || 'Произошла ошибка';
    console.error("Failed to fetch data:", e);
  } finally {
    loading.value = false;
  }
}

function handleAllianceCreated(allianceUuid: string) {
  isCreateModalOpen.value = false;
  router.push(`/alliances/${allianceUuid}`);
}

const purposeText = (purpose: string) => {
  const purposeMap: Record<string, string> = {
    [AlliencePurpose.ECONOMIC]: 'Экономический',
    [AlliencePurpose.MILITARY]: 'Военный',
    [AlliencePurpose.DIPLOMATIC]: 'Дипломатический',
    [AlliencePurpose.GENERAL]: 'Общий',
    [AlliencePurpose.OTHER]: 'Другое',
  };
  return purposeMap[purpose] || 'Не указана';
};

onMounted(fetchData);

</script>

<style scoped>
.alliance-card {
  @apply bg-gray-800/70 p-4 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-1;
  border: 1px solid transparent;
}
.alliance-card:hover {
  border-color: var(--accent-bg, #4f4f4f);
}

.btn-action-primary {
  @apply inline-flex items-center justify-center gap-2.5 font-semibold rounded-lg px-5 py-2.5 transition-all duration-200 transform focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400 shadow-md hover:shadow-lg;
}
</style>

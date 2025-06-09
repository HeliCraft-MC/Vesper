<!-- components/BannerEditorModal.vue -->
<script setup lang="ts">
/**
 * Улучшенный редактор флагов для Minecraft.
 * Использует нативный Canvas API для рендеринга и не зависит от сторонних библиотек.
 * Спрайт-лист паттернов /banner.webp (20x40 px на паттерн) используется для отрисовки.
 *
 * Алгоритм работы:
 * 1. Загружается спрайт-лист с узорами.
 * 2. Для каждого узора в палитре создается мини-превью на отдельном <canvas>.
 * 3. Пользователь выбирает цвет и кликает на узор, добавляя его как новый слой.
 * 4. Финальный флаг перерисовывается на основном <canvas>: каждый слой-узор
 * из спрайт-листа последовательно наносится и тонируется выбранным цветом
 * через операцию globalCompositeOperation = "source-in".
 *
 * Copyright (c) 2025, ms0ur (original author)
 * Refactored and improved by Gemini
 */
import { ref, watch, onMounted, nextTick, defineEmits } from 'vue'

export interface BannerLayer {
  /** ID узора, например, 'stripe_center' */
  id: string
  /** Цвет в формате web, например, '#RRGGBB' */
  color: string
}

/* ───── PROPS & EMITS ───── */
const props = defineProps<{
  open: boolean;
  modelValue: BannerLayer[];
}>()
const emit  = defineEmits(['update:modelValue', 'close'])

/* ───── МЕТАДАННЫЕ СПРАЙТА ───── */
const SPRITE_URL = '/banner.webp'
const CELL_W = 20
const CELL_H = 40
const GRID_COLS = 10
const GAP = 2 // Отступ между паттернами в спрайте

/**
 * Список доступных узоров. Их порядок должен точно соответствовать
 * расположению в файле banner.webp.
 */
const patterns = [
  'base', 'stripe_small', 'stripe_center', 'stripe_downleft',
  'stripe_downright', 'stripe_top', 'cross', 'border',
  'circle', 'rhombus', 'half_vertical', 'half_horizontal',
  'triangle_top', 'triangle_bottom', 'gradient', 'gradient_up',
  'bricks', 'skull', 'mojang', 'flower'
] as const
type PatternId = typeof patterns[number]

/* ───── РЕАКТИВНОЕ СОСТОЯНИЕ ───── */
const layers = ref<BannerLayer[]>([])
const palette = [
  '#FFFFFF', '#F9FFFE', '#D8D8D8', '#B0B0B0', '#737373', '#454545',
  '#C41E3A', '#D87F33', '#D5D825', '#73D825', '#25D8D8', '#2573D8',
  '#B025D8', '#D825B0'
]
const colorSel = ref(palette[0])

/* ───── REFS & ASSETS ───── */
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const sprite = new Image()
let isSpriteLoaded = false

// Создаем один временный холст для повторного использования
let tempCanvas: HTMLCanvasElement | null = null;
if (typeof window !== 'undefined') {
  tempCanvas = document.createElement('canvas');
  tempCanvas.width = CELL_W;
  tempCanvas.height = CELL_H;
}

/* ───── ЛОГИКА ОТРИСОВКИ ───── */

/**
 * Отрисовывает финальный вид флага на основном холсте.
 */
function drawFinalBanner() {
  if (!previewCanvasRef.value || !isSpriteLoaded || !tempCanvas) return;
  const ctx = previewCanvasRef.value.getContext('2d')!;
  const tempCtx = tempCanvas.getContext('2d')!;

  ctx.clearRect(0, 0, CELL_W, CELL_H);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CELL_W, CELL_H);

  for (const layer of layers.value) {
    const index = patterns.indexOf(layer.id as any);
    if (index === -1) continue;

    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const sx = col * (CELL_W + GAP);
    const sy = row * (CELL_H + GAP);

    tempCtx.clearRect(0, 0, CELL_W, CELL_H);
    tempCtx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = layer.color;
    tempCtx.fillRect(0, 0, CELL_W, CELL_H);
    tempCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tempCanvas, 0, 0);
  }
}

/**
 * Отрисовывает мини-превью для всех узоров в списке выбора.
 */
function drawPatternPreviews() {
  if (!isSpriteLoaded) return;

  patterns.forEach((id, index) => {
    const canvas = document.querySelector(`canvas[data-pattern-id="${id}"]`) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;

    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const sx = col * (CELL_W + GAP);
    const sy = row * (CELL_H + GAP);

    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, CELL_W, CELL_H);
    ctx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
  });
}

/**
 * Вызывает все функции отрисовки.
 */
function drawAll() {
  if (!isSpriteLoaded || !props.open) return;
  nextTick(() => {
    drawFinalBanner();
    drawPatternPreviews();
  });
}

/* ───── МЕТОДЫ-ДЕЙСТВИЯ ───── */
function addLayer(id: PatternId) {
  if (layers.value.length >= 16) return;
  layers.value.push({ id, color: colorSel.value });
}

function removeLayer(index: number) {
  layers.value.splice(index, 1);
}

function clearAllLayers() {
  layers.value.splice(0);
}

function closeAndConfirm() {
  emit('update:modelValue', layers.value);
  emit('close');
}

/* ───── WATCHERS & LIFECYCLE ───── */
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    layers.value = JSON.parse(JSON.stringify(props.modelValue));
    if (isSpriteLoaded) {
      drawAll();
    }
  }
});

watch(layers, drawFinalBanner, { deep: true });

onMounted(() => {
  sprite.onload = () => {
    isSpriteLoaded = true;
    if (props.open) {
      drawAll();
    }
  };
  sprite.src = SPRITE_URL;

  if (sprite.complete) {
    isSpriteLoaded = true;
    if (props.open) {
      drawAll();
    }
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">

        <div class="bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
          <!-- Заголовок -->
          <header class="p-5 border-b border-gray-700/50">
            <h2 class="text-2xl font-bold text-center">Редактор флага</h2>
          </header>

          <!-- Основное содержимое с 3 колонками -->
          <main class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto">

            <!-- Левая колонка: Только предпросмотр -->
            <section class="bg-gray-800 rounded-lg flex flex-col items-center justify-center p-6 min-h-[400px]">
              <h3 class="text-lg font-semibold text-gray-300 mb-4">Предпросмотр</h3>
              <div class="p-2 bg-grid-pattern rounded-md flex-1 w-full flex items-center justify-center">
                <canvas ref="previewCanvasRef" :width="CELL_W" :height="CELL_H"
                        class="border border-gray-600 rounded-sm"
                        style="transform: scale(10); image-rendering: pixelated; transform-origin: center;"></canvas>
              </div>
            </section>

            <!-- Центральная колонка: Слои -->
            <section class="flex flex-col gap-3 min-h-[400px]">
              <h3 class="text-lg font-semibold text-gray-300">Слои ({{ layers.length }}/16)</h3>
              <div v-if="layers.length" class="space-y-2 bg-gray-800 p-4 rounded-lg flex-1 overflow-y-auto">
                <div v-for="(layer, i) in layers" :key="i"
                     class="flex items-center gap-3 p-2 rounded-md bg-gray-700/50">
                  <span class="font-mono text-gray-400">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="w-5 h-5 rounded-sm border border-gray-500" :style="{ background: layer.color }" />
                  <span class="flex-1 truncate font-medium">{{ layer.id }}</span>
                  <button @click="removeLayer(i)"
                          class="text-gray-400 hover:text-red-400 transition-colors text-xl font-bold">
                    ×
                  </button>
                </div>
              </div>
              <div v-else class="flex-1 text-center text-gray-500 bg-gray-800 rounded-lg flex items-center justify-center">
                Нет добавленных слоев
              </div>
            </section>

            <!-- Правая колонка: Палитра и Узоры -->
            <section class="flex flex-col gap-8 min-h-[400px]">
              <!-- Палитра цветов -->
              <div>
                <h3 class="text-lg font-semibold text-gray-300 mb-3">Цвет</h3>
                <div class="grid grid-cols-7 gap-2">
                  <button v-for="color in palette" :key="color"
                          @click="colorSel = color"
                          :style="{ backgroundColor: color }"
                          :class="[
                            'w-full aspect-square rounded-md border-2 transition-all',
                            colorSel === color ? 'border-red-500 scale-110' : 'border-transparent hover:border-gray-500'
                          ]"
                  />
                </div>
              </div>

              <!-- Список узоров -->
              <div class="flex-1 flex flex-col">
                <h3 class="text-lg font-semibold text-gray-300 mb-3">Узоры</h3>
                <div class="grid grid-cols-5 gap-3 overflow-y-auto pr-2 flex-1">
                  <button v-for="id in patterns" :key="id"
                          @click="addLayer(id)"
                          class="w-full aspect-[1/2] bg-gray-800 rounded-md border border-gray-700
                                   hover:border-red-500 hover:scale-105 transition-all
                                   flex items-center justify-center p-1">
                    <canvas :data-pattern-id="id" :width="CELL_W" :height="CELL_H" class="rounded-sm"></canvas>
                  </button>
                </div>
              </div>
            </section>
          </main>

          <!-- Футер с кнопками -->
          <footer class="flex gap-4 p-5 border-t border-gray-700/50">
            <button @click="clearAllLayers" v-if="layers.length"
                    class="flex-1 bg-gray-700 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors">
              Сбросить
            </button>
            <button @click="closeAndConfirm"
                    class="flex-1 bg-red-600 py-3 rounded-lg font-bold text-white hover:bg-red-700 transition-colors">
              Готово
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.bg-grid-pattern {
  background-color: #374151;
  background-image:
      linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Стилизация скроллбара для Webkit (Chrome, Safari, etc.) */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #1f2937; /* gray-800 */
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background: #4b5563; /* gray-600 */
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #6b7280; /* gray-500 */
}
</style>

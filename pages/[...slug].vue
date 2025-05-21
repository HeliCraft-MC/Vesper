<script setup lang="ts">
const route = useRoute()
const path = '/' + (
    Array.isArray(route.params.slug)
        ? route.params.slug.join('/')
        : (route.params.slug ?? '')
)
const { data: page, error } = await useAsyncData(`page:${path}`, () =>
    queryCollection('pages').path(path).first()
)

if (!page.value) {
  setResponseStatus(404, 'Not Found')       // :contentReference[oaicite:0]{index=0}
  throw createError({
    statusCode: 404,
    statusMessage: 'Страница не найдена'
  })                                              // :contentReference[oaicite:1]{index=1}
}

// при каких-то неожиданных ошибках — 500
if (error.value) {
  setResponseStatus(500, 'Internal Error')
  throw createError({
    statusCode: 500,
    statusMessage: 'Внутренняя ошибка сервера',
    message: error.value.message
  })
}

useSeoMeta({ title: page.value?.title ?? 'Страница' })
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28">
    <!-- Markdown-контент -->
    <section
        class="prose prose-invert text-lg max-w-4xl mx-auto px-4 py-16 flex-1"
    >
      <h1
          v-if="page?.title"
          class="mb-6 text-red-500 text-4xl font-bold"
          style="font-family:'Press Start 2P',system-ui"
      >
        {{ page.title }}
      </h1>

      <ContentRenderer v-if="page" :value="page" />
      <template v-else>
        <div class="flex-grow flex flex-col items-center justify-center space-y-6">
          <h1
              class="text-red-500 text-6xl md:text-8xl font-bold"
              style="font-family:'Press Start 2P',system-ui"
          >
            404
          </h1>
          <p class="text-gray-400 text-xl md:text-2xl">
            Упс! Такой страницы не существует.
          </p>
          <client-only>
            <a
                href="/"
                class="inline-block px-8 py-4 bg-red-500 text-black font-mono uppercase rounded-md
                   hover:bg-red-600 transition-colors duration-300"
            >
              Вернуться на главную
            </a>
          </client-only>
        </div>
      </template>
    </section>
  </main>
</template>

<style lang="postcss">
/* ---------- фирменные заголовки ---------- */
h1 {
  font-family: "Press Start 2P", system-ui;
  font-size: 24px;
  padding-top: 1em;
  font-weight: 400;
  color: #f87171; /* red-400 */
}
h2, h3, h4, h5, h6 {
  font-family: "Press Start 2P", system-ui;
  font-weight: 400;
  color: #f87171;
  margin-top: 1.6em;   /* ↑ больше, чем между абзацами */
  margin-bottom: 0.6em;
}

/* ---------- базовая типографика ---------- */
.prose {
  font-size: 1.125rem;    /* text-lg */
  line-height: 1.85;      /* комфортный leading */
}

/* ---------- многоуровневые нумерованные списки ---------- */
.prose ol          { counter-reset: li; padding-left: 0; }
.prose ol > li     { counter-increment: li; display: table-row; margin-bottom: .8em; }
.prose ol ol       { counter-reset: li; }
.prose ol > li::before {
  content: counters(li, ".") ".";
  display: table-cell;
  padding-right: .6em;
  text-align: right;
  font: inherit;
}
.prose > ol > li        { margin-bottom: 1.25em; }
.prose > ol > li::before{
  font-family: "Press Start 2P", system-ui;
  color: #f87171;
  font-size: 1.25rem;
  font-weight: 400;
}

/* ---------- маркеры буллет-списков ---------- */
.prose ul              { @apply list-disc pl-5 space-y-2; }
.prose ul > li::marker { color: #f87171; font-weight: 400; }

/* ---------- таблицы ---------- */
.prose table                 { @apply w-full border-collapse mb-6 text-left; }
.prose thead                 { @apply bg-gray-950; }
.prose thead th              { @apply px-3 py-2 border border-gray-700 text-red-400; }
.prose tbody td              { @apply px-3 py-2 border border-gray-700; }
.prose tbody tr:nth-child(odd){ @apply bg-gray-800; }
.prose tbody tr:hover        { @apply bg-gray-700/50; }

/* ---------- blockquote ---------- */
.prose blockquote {
  @apply border-l-4 border-red-400 bg-gray-900/50 italic pl-6 py-4 my-6;
}
.prose blockquote p { @apply my-0 text-gray-200; }

/* ---------- подчёркивание ссылок ---------- */
 .prose a { @apply underline decoration-dotted underline-offset-4; }
</style>

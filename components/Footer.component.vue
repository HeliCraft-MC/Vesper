<template>
  <footer class="bg-[#2a0000] mt-auto py-8 px-6">
    <div class="max-w-7xl mx-auto text-center text-gray-400 space-y-4">
      <div class="flex items-center justify-center space-x-6">
        <a href="#" class="transition hover:text-red-500 font-medium">Discord</a>
        <a href="#" class="transition hover:text-red-500 font-medium">Telegram</a>
      </div>
      <p class="text-sm">© 2020-{{currentYear}} HeliCraft.</p>
      <p class="text-sm">NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</p>
      <p class="text-sm">Site software developed by ms0ur. Licensed under <NuxtLink to="https://eupl.eu/1.2/en/" class="underline">EUPL-1.2-or-later</NuxtLink></p>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear();
// Пусто — чисто презентационный компонент
</script>

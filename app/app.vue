<script setup lang="ts">

const eventBus = useAppEventBus();

const hideHeaderAndFooter = ref(false);

eventBus.on("showHeaderAndFooter", () => {
  hideHeaderAndFooter.value = false;
});

eventBus.on("hideHeaderAndFooter", () => {
  hideHeaderAndFooter.value = true;
});

</script>
<template>
  <NavbarComponent v-if="!hideHeaderAndFooter" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <FooterComponent v-if="!hideHeaderAndFooter" />
</template>
<style>
.pr2p{
  font-family: "Press Start 2P", system-ui;
  font-weight: 400;
  font-style: normal;
}
.code {
  font-family: "Source Code Pro", monospace;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}
h1, h2, h3, h4, h5, h6 {
  font-family: "Press Start 2P", system-ui;
  font-weight: 400;
  color: #f87171; /* red-400 */
}
</style>

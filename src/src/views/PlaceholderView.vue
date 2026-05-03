<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <section class="view">
    <h1>{{ title }}</h1>
    <p class="placeholder">Nog niet geïmplementeerd.</p>
  </section>
</template>

<style scoped>
.view {
  padding: 0.5rem;
}
.placeholder {
  color: var(--muted, #666);
  font-style: italic;
}
</style>

<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <section class="view">
    <h1>Wedstrijd {{ route.params.id }}</h1>
    <p class="placeholder">Nog niet geïmplementeerd.</p>
  </section>
</template>

<style scoped>
.view {
  padding: 1rem;
}
.placeholder {
  color: #666;
  font-style: italic;
}
</style>

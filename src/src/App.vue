<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="app">
    <nav class="topnav">
      <RouterLink to="/matches">Wedstrijden</RouterLink>
      <RouterLink to="/players">Spelers</RouterLink>
      <RouterLink to="/settings">Instellingen</RouterLink>
    </nav>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.topnav {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #1f2937;
  position: sticky;
  top: 0;
  z-index: 10;
}
.topnav a {
  color: #fff;
  text-decoration: none;
  padding: 0.75rem 1rem;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-weight: 500;
}
.topnav a.router-link-active {
  background: #2563eb;
}
main {
  flex: 1;
}
</style>

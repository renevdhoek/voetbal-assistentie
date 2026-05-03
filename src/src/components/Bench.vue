<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus';
import type { Player } from '../types/domain';

const props = defineProps<{
  players: Player[];
}>();

const emit = defineEmits<{
  'update:players': [value: Player[]];
}>();

function onUpdate(value: Player[]) {
  emit('update:players', value);
}
</script>

<template>
  <div class="bench">
    <div class="bench-label">Bank ({{ props.players.length }})</div>
    <VueDraggable
      :model-value="props.players"
      :group="{ name: 'players' }"
      :animation="150"
      class="list"
      @update:model-value="onUpdate"
    >
      <div
        v-for="element in props.players"
        :key="element.id"
        class="chip"
      >
        <div class="initials">{{ element.name.charAt(0).toUpperCase() }}</div>
        <div class="name">{{ element.name }}</div>
      </div>
    </VueDraggable>
    <p v-if="props.players.length === 0" class="muted small">Iedereen op het veld</p>
  </div>
</template>

<style scoped>
.bench {
  background: #f3f4f6;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
}
.bench-label {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
}
.list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 56px;
}
.chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.25rem 0.65rem 0.25rem 0.25rem;
  cursor: grab;
}
.initials {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: var(--color-muted);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
}
.name {
  font-size: 0.9rem;
  font-weight: 600;
}
.muted {
  color: var(--color-muted);
}
.small {
  font-size: 0.85rem;
}
</style>

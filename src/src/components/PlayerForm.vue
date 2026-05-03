<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Player, Position } from '../types/domain';

const POSITIONS: Position[] = ['K', 'V', 'M', 'A'];
const POSITION_LABELS: Record<Position, string> = {
  K: 'Keeper',
  V: 'Verdediger',
  M: 'Middenvelder',
  A: 'Aanvaller',
};

const props = defineProps<{
  initial?: Player;
}>();

const emit = defineEmits<{
  submit: [value: Omit<Player, 'id'>];
  cancel: [];
}>();

const name = ref('');
const preferences = ref<Position[]>([]);

watch(
  () => props.initial,
  (p) => {
    name.value = p?.name ?? '';
    preferences.value = [...(p?.preferences ?? [])];
  },
  { immediate: true },
);

function togglePreference(pos: Position) {
  const i = preferences.value.indexOf(pos);
  if (i >= 0) {
    preferences.value.splice(i, 1);
    return;
  }
  if (preferences.value.length >= 3) return;
  preferences.value.push(pos);
}

const canSubmit = computed(() => name.value.trim().length > 0);

function submit() {
  if (!canSubmit.value) return;
  emit('submit', {
    name: name.value.trim(),
    preferences: [...preferences.value],
  });
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <label class="field">
      <span>Naam</span>
      <input v-model="name" type="text" required autofocus />
    </label>

    <fieldset class="prefs">
      <legend>Voorkeursposities (max 3)</legend>
      <div class="chips">
        <button
          v-for="pos in POSITIONS"
          :key="pos"
          type="button"
          class="chip"
          :class="{ active: preferences.includes(pos) }"
          :disabled="!preferences.includes(pos) && preferences.length >= 3"
          :aria-pressed="preferences.includes(pos)"
          @click="togglePreference(pos)"
        >
          {{ pos }} <span class="muted">{{ POSITION_LABELS[pos] }}</span>
        </button>
      </div>
    </fieldset>

    <div class="actions">
      <button type="button" @click="emit('cancel')">Annuleren</button>
      <button type="submit" class="primary" :disabled="!canSubmit">
        {{ initial ? 'Opslaan' : 'Toevoegen' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 500;
}
.prefs {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
}
.prefs legend {
  padding: 0 0.5rem;
  font-weight: 500;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
}
.chip.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.muted {
  font-weight: 400;
  font-size: 0.85em;
  opacity: 0.85;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.primary:hover {
  background: #1d4ed8;
}
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

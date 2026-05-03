<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSettings } from '../composables/useSettings';
import type { MatchType } from '../types/domain';

const { settings, isReady, update } = useSettings();

const periods = computed({
  get: () => settings.value?.periods ?? 2,
  set: (v) => void update({ periods: v as 2 | 4 }),
});

const periodLengthMin = computed({
  get: () => settings.value?.periodLengthMin ?? 25,
  set: (v) => {
    if (Number.isFinite(v) && v > 0) void update({ periodLengthMin: Math.floor(v) });
  },
});

const matchType = computed({
  get: () => settings.value?.matchType ?? 7,
  set: (v: MatchType) => void update({ matchType: v }),
});

const savedFlash = ref(false);
let initial = true;
watch(settings, () => {
  if (!isReady.value) return;
  if (initial) {
    initial = false;
    return;
  }
  savedFlash.value = true;
  setTimeout(() => (savedFlash.value = false), 800);
});
</script>

<template>
  <section class="view">
    <h1>Instellingen</h1>
    <p v-if="!isReady" class="loading">Laden…</p>

    <form v-else class="form" @submit.prevent>
      <fieldset class="group">
        <legend>Periodes</legend>
        <label class="radio">
          <input type="radio" :value="2" v-model="periods" />
          <span>2 helften</span>
        </label>
        <label class="radio">
          <input type="radio" :value="4" v-model="periods" />
          <span>4 kwarten</span>
        </label>
      </fieldset>

      <label class="field">
        <span>Duur per periode (minuten)</span>
        <input type="number" min="1" max="60" v-model.number="periodLengthMin" />
      </label>

      <label class="field">
        <span>Speelvorm</span>
        <select v-model.number="matchType">
          <option :value="6">6 tegen 6</option>
          <option :value="7">7 tegen 7</option>
          <option :value="11">11 tegen 11</option>
        </select>
      </label>

      <p class="hint" :class="{ visible: savedFlash }" aria-live="polite">
        Opgeslagen.
      </p>
    </form>
  </section>
</template>

<style scoped>
.view {
  padding: 0.5rem;
  max-width: 480px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
}
.group legend {
  padding: 0 0.5rem;
  font-weight: 500;
}
.radio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  cursor: pointer;
}
.radio input {
  width: 20px;
  height: 20px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 500;
}
.hint {
  color: var(--color-muted);
  opacity: 0;
  transition: opacity 0.2s;
}
.hint.visible {
  opacity: 1;
  color: #16a34a;
}
.loading {
  color: var(--color-muted);
}
</style>

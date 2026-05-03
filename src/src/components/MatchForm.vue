<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { MatchType } from '../types/domain';

const props = defineProps<{
  defaultMatchType: MatchType;
}>();

const emit = defineEmits<{
  submit: [value: { opponent: string; date: Date; type: MatchType }];
  cancel: [];
}>();

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const form = reactive({
  opponent: '',
  date: todayIso(),
  type: props.defaultMatchType,
});

watch(
  () => props.defaultMatchType,
  (next) => {
    form.type = next;
  },
);

const isValid = computed(() => form.opponent.trim().length > 0 && !!form.date);

function onSubmit() {
  if (!isValid.value) return;
  emit('submit', {
    opponent: form.opponent.trim(),
    date: new Date(`${form.date}T12:00:00`),
    type: form.type,
  });
}
</script>

<template>
  <form class="match-form" @submit.prevent="onSubmit">
    <label>
      <span>Tegenstander</span>
      <input v-model="form.opponent" type="text" required maxlength="60" autofocus />
    </label>

    <label>
      <span>Datum</span>
      <input v-model="form.date" type="date" required />
    </label>

    <label>
      <span>Type</span>
      <select v-model.number="form.type">
        <option :value="6">6v6</option>
        <option :value="7">7v7</option>
        <option :value="11">11v11</option>
      </select>
    </label>

    <div class="actions">
      <button type="button" @click="emit('cancel')">Annuleren</button>
      <button type="submit" class="primary" :disabled="!isValid">Aanmaken</button>
    </div>
  </form>
</template>

<style scoped>
.match-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
label span {
  font-weight: 600;
  font-size: 0.9rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.primary:disabled {
  opacity: 0.5;
}
</style>

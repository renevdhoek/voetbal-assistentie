<script setup lang="ts">
import { computed } from 'vue';
import { formatClock } from '../composables/useStopwatch';

const props = defineProps<{
  elapsed: number;
  isRunning: boolean;
  currentPeriod: number;
  totalPeriods: number;
}>();

const emit = defineEmits<{
  start: [];
  pause: [];
  reset: [];
  'finish-period': [];
}>();

const display = computed(() => `P${props.currentPeriod} ${formatClock(props.elapsed)}`);
</script>

<template>
  <div class="stopwatch">
    <div class="clock" :class="{ running: isRunning }" aria-live="polite">{{ display }}</div>
    <div class="controls">
      <button v-if="!isRunning" class="primary" @click="emit('start')">Start</button>
      <button v-else class="warn" @click="emit('pause')">Pauze</button>
      <button
        v-if="isRunning"
        class="finish"
        @click="emit('finish-period')"
      >
        Afronden
      </button>
      <button v-else class="ghost" @click="emit('reset')">Reset</button>
    </div>
    <div class="period">Periode {{ currentPeriod }} / {{ totalPeriods }}</div>
  </div>
</template>

<style scoped>
.stopwatch {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.75rem 1rem;
  background: #111827;
  color: #fff;
  border-radius: 8px;
}
.clock {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}
.clock.running {
  color: #4ade80;
}
.controls {
  display: flex;
  gap: 0.5rem;
}
.controls button {
  min-width: 80px;
}
.primary {
  background: #16a34a;
  color: #fff;
  border-color: #16a34a;
}
.warn {
  background: #f59e0b;
  color: #111;
  border-color: #f59e0b;
}
.ghost {
  background: transparent;
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}
.ghost:disabled {
  opacity: 0.4;
}
.finish {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.finish:hover {
  background: #1d4ed8;
}
.period {
  grid-column: 1 / -1;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from './Modal.vue';
import type { Player } from '../types/domain';

const props = defineProps<{
  fieldPlayers: Player[];
  canEnd: boolean;
}>();

const emit = defineEmits<{
  goal: [playerId: number];
  assist: [playerId: number];
  nextTurn: [];
  endMatch: [];
  stats: [];
}>();

type Pick = 'goal' | 'assist' | null;
const picking = ref<Pick>(null);

function open(kind: 'goal' | 'assist') {
  picking.value = kind;
}

function pickPlayer(p: Player) {
  if (p.id === undefined || picking.value === null) return;
  if (picking.value === 'goal') emit('goal', p.id);
  else emit('assist', p.id);
  picking.value = null;
}
</script>

<template>
  <div class="actionbar">
    <button class="goal" @click="open('goal')">⚽ Doelpunt</button>
    <button class="assist" @click="open('assist')">🅰️ Assist</button>
    <button class="stats" @click="emit('stats')">📊 Stats</button>
    <button class="next" @click="emit('nextTurn')">🔄 Volgende</button>
    <button v-if="canEnd" class="end" @click="emit('endMatch')">🏁 Einde</button>
  </div>

  <Modal
    :open="picking !== null"
    :title="picking === 'goal' ? 'Doelpunt — door wie?' : 'Assist — door wie?'"
    @close="picking = null"
  >
    <ul class="picker">
      <li v-for="p in props.fieldPlayers" :key="p.id">
        <button class="pick" @click="pickPlayer(p)">
          {{ p.name }}
        </button>
      </li>
      <li v-if="props.fieldPlayers.length === 0" class="muted">
        Geen spelers in het veld.
      </li>
    </ul>
  </Modal>
</template>

<style scoped>
.actionbar {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  gap: 0.4rem;
  padding: 0.6rem;
  background: #1f2937;
  border-top: 1px solid #000;
}
.actionbar button {
  min-height: 56px;
  font-weight: 700;
  border: none;
  color: #fff;
}
.goal {
  background: #16a34a;
}
.assist {
  background: #2563eb;
}
.stats {
  background: #6366f1;
}
.next {
  background: #f59e0b;
  color: #111;
}
.end {
  background: #b91c1c;
}
.picker {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.pick {
  width: 100%;
  text-align: left;
  font-size: 1rem;
}
.muted {
  color: var(--color-muted);
  text-align: center;
  padding: 1rem;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePlayers } from '../composables/usePlayers';
import { useMatches } from '../composables/useMatches';
import { computeAllStats, ZERO_STATS } from '../lib/stats';
import type { Player } from '../types/domain';
import PlayerForm from '../components/PlayerForm.vue';
import Modal from '../components/Modal.vue';

const { players, isLoading, add, update, remove } = usePlayers();
const { matches } = useMatches();

type Tab = 'list' | 'stats';
const tab = ref<Tab>('list');

const editing = ref<Player | null>(null);
const isFormOpen = ref(false);

function openAdd() {
  editing.value = null;
  isFormOpen.value = true;
}

function openEdit(player: Player) {
  editing.value = player;
  isFormOpen.value = true;
}

async function onSubmit(value: Omit<Player, 'id'>) {
  if (editing.value?.id !== undefined) {
    await update(editing.value.id, value);
  } else {
    await add(value);
  }
  isFormOpen.value = false;
}

async function onDelete(player: Player) {
  if (player.id === undefined) return;
  if (!confirm(`Speler "${player.name}" verwijderen?`)) return;
  await remove(player.id);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

const stats = computed(() => computeAllStats(players.value, matches.value));
const statsRows = computed(() =>
  players.value.map((p) => ({
    player: p,
    stats: (p.id !== undefined ? stats.value.get(p.id) : null) ?? ZERO_STATS,
  })),
);
</script>

<template>
  <section class="view">
    <header class="head">
      <h1>Spelers</h1>
      <button class="primary" @click="openAdd">+ Toevoegen</button>
    </header>

    <nav class="tabs" role="tablist">
      <button
        role="tab"
        :aria-selected="tab === 'list'"
        :class="{ active: tab === 'list' }"
        @click="tab = 'list'"
      >
        Overzicht
      </button>
      <button
        role="tab"
        :aria-selected="tab === 'stats'"
        :class="{ active: tab === 'stats' }"
        @click="tab = 'stats'"
      >
        Statistieken
      </button>
    </nav>

    <p v-if="isLoading" class="muted">Laden…</p>
    <p v-else-if="players.length === 0" class="muted">
      Nog geen spelers. Klik op "+ Toevoegen" om te beginnen.
    </p>

    <ul v-else-if="tab === 'list'" class="players">
      <li v-for="p in players" :key="p.id" class="row">
        <div class="avatar" aria-hidden="true">{{ initials(p.name) }}</div>
        <div class="info">
          <div class="name">{{ p.name }}</div>
          <div class="prefs">
            <span v-for="pref in p.preferences" :key="pref" class="pref">{{ pref }}</span>
            <span v-if="p.preferences.length === 0" class="muted small">geen voorkeuren</span>
          </div>
        </div>
        <div class="actions">
          <button @click="openEdit(p)">Bewerken</button>
          <button class="danger" @click="onDelete(p)">Verwijderen</button>
        </div>
      </li>
    </ul>

    <table v-else class="stats">
      <thead>
        <tr>
          <th>Naam</th>
          <th title="Doelpunten">G</th>
          <th title="Assists">A</th>
          <th title="Beurten">Beurten</th>
          <th title="Beurten op voorkeurspositie">Voorkeur</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in statsRows" :key="row.player.id">
          <td>{{ row.player.name }}</td>
          <td>{{ row.stats.goals }}</td>
          <td>{{ row.stats.assists }}</td>
          <td>{{ row.stats.totalTurns }}</td>
          <td>
            {{ row.stats.preferredPosTurns }}
            <span v-if="row.stats.totalTurns > 0" class="muted small">
              ({{ Math.round((row.stats.preferredPosTurns / row.stats.totalTurns) * 100) }}%)
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <Modal
      :open="isFormOpen"
      :title="editing ? 'Speler bewerken' : 'Speler toevoegen'"
      @close="isFormOpen = false"
    >
      <PlayerForm
        :initial="editing ?? undefined"
        @submit="onSubmit"
        @cancel="isFormOpen = false"
      />
    </Modal>
  </section>
</template>

<style scoped>
.view {
  padding: 1rem;
  max-width: 720px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}
.tabs button {
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  padding: 0.5rem 1rem;
  font-weight: 500;
}
.tabs button.active {
  border-bottom-color: var(--color-primary);
  color: var(--color-primary);
}
.players {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
  font-size: 1rem;
}
.info {
  min-width: 0;
}
.name {
  font-weight: 600;
}
.prefs {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-top: 0.15rem;
}
.pref {
  font-size: 0.8rem;
  background: #e0e7ff;
  color: #1e3a8a;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-weight: 600;
}
.actions {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.actions button {
  font-size: 0.9rem;
}
.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.primary:hover {
  background: #1d4ed8;
}
.danger {
  color: #b91c1c;
  border-color: #fecaca;
}
.danger:hover {
  background: #fee2e2;
}
.stats {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
.stats th,
.stats td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}
.stats th {
  background: #f9fafb;
  font-weight: 600;
}
.stats tr:last-child td {
  border-bottom: none;
}
.muted {
  color: var(--color-muted);
}
.small {
  font-size: 0.85em;
}
</style>

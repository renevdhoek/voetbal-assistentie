<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Modal from '../components/Modal.vue';
import MatchForm from '../components/MatchForm.vue';
import { useMatches } from '../composables/useMatches';
import { usePlayers } from '../composables/usePlayers';
import { useSettings } from '../composables/useSettings';
import {
  computeOwnScore,
  computeOpponentScore,
  computeMatchStats,
  formatMatchDate,
  statusLabel,
} from '../lib/matchDisplay';
import type { Match } from '../types/domain';

const { matches, isLoading, add, remove } = useMatches();
const { players } = usePlayers();
const { settings } = useSettings();

const isFormOpen = ref(false);
const statsMatch = ref<Match | null>(null);
const statsRows = computed(() =>
  statsMatch.value ? computeMatchStats(statsMatch.value, players.value) : [],
);

function openCreate() {
  isFormOpen.value = true;
}

function openStats(match: Match) {
  statsMatch.value = match;
}

async function onSubmit(data: { opponent: string; date: Date }) {
  if (!settings.value) return;
  const newMatch: Omit<Match, 'id'> = {
    opponent: data.opponent,
    date: data.date,
    type: settings.value.matchType,
    status: 'planned',
    currentPeriod: 1,
    elapsedSeconds: 0,
    turns: [],
    events: [],
  };
  await add(newMatch);
  isFormOpen.value = false;
}

async function onDelete(match: Match) {
  if (match.id === undefined) return;
  if (!confirm(`Wedstrijd tegen "${match.opponent}" verwijderen?`)) return;
  await remove(match.id);
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Wedstrijden</h1>
      <button class="primary" @click="openCreate">+ Nieuwe wedstrijd</button>
    </header>

    <p v-if="isLoading" class="muted">Laden…</p>
    <p v-else-if="matches.length === 0" class="muted empty">
      Nog geen wedstrijden. Maak er een aan om te beginnen.
    </p>

    <ul v-else class="matches">
      <li v-for="m in matches" :key="m.id" class="row">
        <RouterLink :to="`/matches/${m.id}`" class="link">
          <div class="main">
            <div class="opp">vs {{ m.opponent }}</div>
            <div class="meta">
              <span>{{ formatMatchDate(m.date) }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ m.type }}v{{ m.type }}</span>
              <span aria-hidden="true">·</span>
              <span class="badge" :data-status="m.status">{{ statusLabel(m) }}</span>
            </div>
          </div>
          <div class="score" aria-label="Stand">
            {{ computeOwnScore(m.events) }} - {{ computeOpponentScore(m.events) }}
          </div>
        </RouterLink>
        <button
          class="stats"
          @click="openStats(m)"
          aria-label="Statistieken bekijken"
          title="Statistieken"
        >
          📊
        </button>
        <button class="danger" @click="onDelete(m)" aria-label="Verwijderen">×</button>
      </li>
    </ul>

    <Modal :open="isFormOpen" title="Nieuwe wedstrijd" @close="isFormOpen = false">
      <MatchForm
        v-if="settings"
        :match-type="settings.matchType"
        @submit="onSubmit"
        @cancel="isFormOpen = false"
      />
    </Modal>

    <Modal
      :open="statsMatch !== null"
      :title="statsMatch ? `Statistieken \u2014 vs ${statsMatch.opponent}` : 'Statistieken'"
      @close="statsMatch = null"
    >
      <div v-if="statsMatch" class="match-stats">
        <p class="meta">
          {{ formatMatchDate(statsMatch.date) }} · {{ statsMatch.type }}v{{ statsMatch.type }} ·
          stand <strong>{{ computeOwnScore(statsMatch.events) }} - {{ computeOpponentScore(statsMatch.events) }}</strong>
        </p>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Speler</th>
              <th title="Beurten">B</th>
              <th>K</th>
              <th>V</th>
              <th>M</th>
              <th>A</th>
              <th>⚽</th>
              <th>🅰️</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in statsRows" :key="row.player.id">
              <td>{{ row.player.name }}</td>
              <td>{{ row.matchTurns }}</td>
              <td>{{ row.positions.K }}</td>
              <td>{{ row.positions.V }}</td>
              <td>{{ row.positions.M }}</td>
              <td>{{ row.positions.A }}</td>
              <td>{{ row.goals }}</td>
              <td>{{ row.assists }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 0.5rem;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}
.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.muted {
  color: var(--color-muted);
}
.empty {
  text-align: center;
  padding: 2rem 1rem;
}
.matches {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0;
  align-items: stretch;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
.link {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: inherit;
  min-height: 64px;
}
.link:hover {
  background: #f3f4f6;
}
.opp {
  font-weight: 600;
  font-size: 1.05rem;
}
.meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--color-muted);
  margin-top: 0.15rem;
  align-items: center;
}
.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
  font-size: 0.75rem;
}
.badge[data-status='running'] {
  background: #dcfce7;
  color: #166534;
}
.badge[data-status='paused'] {
  background: #fef3c7;
  color: #92400e;
}
.badge[data-status='finished'] {
  background: #e0e7ff;
  color: #3730a3;
}
.score {
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 2ch;
  text-align: right;
}
.danger {
  border-radius: 0;
  border: none;
  border-left: 1px solid var(--color-border);
  color: #b91c1c;
  font-size: 1.4rem;
  background: #fff;
}
.danger:hover {
  background: #fee2e2;
}
.stats {
  border-radius: 0;
  border: none;
  border-left: 1px solid var(--color-border);
  background: #fff;
  font-size: 1.1rem;
}
.stats:hover {
  background: #eef2ff;
}
.match-stats .meta {
  margin: 0 0 0.5rem 0;
  color: var(--color-muted);
  font-size: 0.85rem;
}
.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.stats-table th,
.stats-table td {
  padding: 0.2rem 0.35rem;
  border-bottom: 1px solid var(--color-border);
  text-align: right;
}
.stats-table th:first-child,
.stats-table td:first-child {
  text-align: left;
}
</style>

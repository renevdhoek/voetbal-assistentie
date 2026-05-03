<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Modal from '../components/Modal.vue';
import MatchForm from '../components/MatchForm.vue';
import { useMatches } from '../composables/useMatches';
import { useSettings } from '../composables/useSettings';
import { computeOwnScore, formatMatchDate, statusLabel } from '../lib/matchDisplay';
import type { Match } from '../types/domain';

const { matches, isLoading, add, remove } = useMatches();
const { settings } = useSettings();

const isFormOpen = ref(false);

function openCreate() {
  isFormOpen.value = true;
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
          <div class="score" aria-label="Eigen doelpunten">
            {{ computeOwnScore(m.events) }}
          </div>
        </RouterLink>
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
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem;
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
</style>

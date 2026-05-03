<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { liveQuery } from 'dexie';
import { onScopeDispose } from 'vue';

import Stopwatch from '../components/Stopwatch.vue';
import Field from '../components/Field.vue';
import Bench from '../components/Bench.vue';
import ActionBar from '../components/ActionBar.vue';

import { db } from '../db/database';
import * as matchesRepo from '../db/repositories/matches';
import { usePlayers } from '../composables/usePlayers';
import { useSettings } from '../composables/useSettings';
import { useStopwatch } from '../composables/useStopwatch';

import { getFormation } from '../lib/formations';
import { suggestFormation } from '../lib/suggester';
import { computeAllStats, ZERO_STATS } from '../lib/stats';
import { computeOwnScore } from '../lib/matchDisplay';
import type { Match, MatchEvent, PositionAssignment, Turn } from '../types/domain';

const route = useRoute();
const router = useRouter();
const matchId = computed(() => Number(route.params.id));

const { players } = usePlayers();
const { settings } = useSettings();

const match = ref<Match | null>(null);
const sub = liveQuery(() => db.matches.get(matchId.value)).subscribe({
  next: (value) => {
    match.value = value ?? null;
  },
});
onScopeDispose(() => sub.unsubscribe());

const formation = computed(() => (match.value ? getFormation(match.value.type) : []));

const totalPeriods = computed(() => settings.value?.periods ?? 2);
const periodLengthSeconds = computed(() => (settings.value?.periodLengthMin ?? 25) * 60);

const currentTurn = computed<Turn | null>(() => {
  if (!match.value || match.value.turns.length === 0) return null;
  return match.value.turns[match.value.turns.length - 1] ?? null;
});

const fieldPlayers = computed(() => {
  if (!currentTurn.value) return [];
  const ids = new Set(currentTurn.value.positions.map((p) => p.playerId));
  return players.value.filter((p) => p.id !== undefined && ids.has(p.id));
});

const benchPlayers = computed(() => {
  if (!currentTurn.value) return players.value;
  const ids = new Set(currentTurn.value.positions.map((p) => p.playerId));
  return players.value.filter((p) => p.id !== undefined && !ids.has(p.id));
});

const ownScore = computed(() => (match.value ? computeOwnScore(match.value.events) : 0));

// ---- Stopwatch wiring -----------------------------------------------------
const stopwatch = useStopwatch({
  initialSeconds: 0,
  periodLengthSeconds: () => periodLengthSeconds.value,
  onTick: (elapsed) => {
    void persist({ elapsedSeconds: elapsed });
  },
  onPeriodEnd: handlePeriodEnd,
});

// Synchroniseer initiele elapsed wanneer match laadt.
watch(
  () => match.value?.elapsedSeconds,
  (val) => {
    if (val !== undefined) stopwatch.setElapsed(val);
  },
);

async function onStart() {
  if (!match.value) return;
  if (match.value.turns.length === 0) {
    await initialiseFirstTurn();
  }
  if (match.value.status !== 'running') {
    await persist({ status: 'running' });
  }
  stopwatch.start();
}

async function onPause() {
  stopwatch.pause();
  if (match.value && match.value.status === 'running') {
    await persist({ status: 'paused' });
  }
}

async function onReset() {
  if (!confirm('Stopwatch terugzetten naar 0?')) return;
  stopwatch.reset();
}

const periodEndPrompt = ref(false);
function handlePeriodEnd() {
  void persist({ status: 'paused' });
  periodEndPrompt.value = true;
}

async function nextPeriod() {
  if (!match.value) return;
  const next = match.value.currentPeriod + 1;
  if (next > totalPeriods.value) {
    await endMatch();
    return;
  }
  // Sluit lopende beurt af, zet klok op 0, hoog periode op.
  await closeCurrentTurn();
  await persist({ currentPeriod: next, elapsedSeconds: 0, status: 'paused' });
  stopwatch.setElapsed(0);
  // Open nieuwe beurt met huidige opstelling.
  const last = match.value!.turns[match.value!.turns.length - 1];
  const newTurn: Turn = {
    startedAtSeconds: 0,
    endedAtSeconds: null,
    positions: last ? [...last.positions] : [],
  };
  await persist({ turns: [...match.value!.turns, newTurn] });
  periodEndPrompt.value = false;
}

// ---- Turn / formation -----------------------------------------------------
async function initialiseFirstTurn() {
  if (!match.value) return;
  const allMatches = await db.matches.toArray();
  const stats = computeAllStats(players.value, allMatches);
  const suggestion = suggestFormation(players.value, formation.value, (id) =>
    stats.get(id) ?? ZERO_STATS,
  );
  const turn: Turn = {
    startedAtSeconds: 0,
    endedAtSeconds: null,
    positions: suggestion,
  };
  await persist({ turns: [turn] });
}

async function onPositionsUpdate(positions: PositionAssignment[]) {
  if (!match.value || !currentTurn.value) return;
  const turns = [...match.value.turns];
  turns[turns.length - 1] = { ...currentTurn.value, positions };
  await persist({ turns });
}

async function onBenchUpdate(_value: unknown) {
  // Bench-mutaties zijn impliciet: spelers verschijnen vanzelf zodra ze niet meer
  // in `currentTurn.positions` zitten. We hoeven hier niets te doen — de drag-drop
  // group laat de Field-zones de update versturen via onPositionsUpdate.
}

async function closeCurrentTurn() {
  if (!match.value || !currentTurn.value) return;
  const turns = [...match.value.turns];
  turns[turns.length - 1] = {
    ...currentTurn.value,
    endedAtSeconds: stopwatch.elapsed.value,
  };
  await persist({ turns });
}

async function onNextTurn() {
  if (!match.value || !currentTurn.value) return;
  await closeCurrentTurn();
  const startSec = stopwatch.elapsed.value;
  const newTurn: Turn = {
    startedAtSeconds: startSec,
    endedAtSeconds: null,
    positions: [...currentTurn.value.positions],
  };
  await persist({ turns: [...match.value!.turns, newTurn] });
}

// ---- Events ---------------------------------------------------------------
async function pushEvent(ev: MatchEvent) {
  if (!match.value) return;
  await persist({ events: [...match.value.events, ev] });
}

async function onGoal(playerId: number) {
  if (!currentTurn.value || !match.value) return;
  await pushEvent({ type: 'goal', playerId, turnIndex: match.value.turns.length - 1 });
}

async function onAssist(playerId: number) {
  if (!currentTurn.value || !match.value) return;
  await pushEvent({ type: 'assist', playerId, turnIndex: match.value.turns.length - 1 });
}

// ---- End match ------------------------------------------------------------
const canEnd = computed(() => match.value !== null && match.value.status !== 'finished');

async function endMatch() {
  if (!confirm('Wedstrijd beëindigen? Dit sluit de huidige beurt af.')) return;
  stopwatch.pause();
  await closeCurrentTurn();
  await persist({ status: 'finished' });
  periodEndPrompt.value = false;
}

// ---- Persist helper -------------------------------------------------------
async function persist(patch: Partial<Omit<Match, 'id'>>) {
  if (matchId.value && Number.isFinite(matchId.value)) {
    await matchesRepo.update(matchId.value, patch);
  }
}
</script>

<template>
  <section class="match" v-if="match && settings">
    <header class="header">
      <RouterLink to="/matches" class="back">← Terug</RouterLink>
      <div class="title">
        <div class="opp">vs {{ match.opponent }}</div>
        <div class="sub">{{ match.type }}v{{ match.type }}</div>
      </div>
      <div class="score" aria-label="Eigen doelpunten">{{ ownScore }}</div>
    </header>

    <Stopwatch
      :elapsed="stopwatch.elapsed.value"
      :is-running="stopwatch.isRunning.value"
      :current-period="match.currentPeriod"
      :total-periods="totalPeriods"
      @start="onStart"
      @pause="onPause"
      @reset="onReset"
    />

    <div v-if="periodEndPrompt" class="prompt">
      <p>
        Periode {{ match.currentPeriod }} is afgelopen.
      </p>
      <div class="prompt-actions">
        <button v-if="match.currentPeriod < totalPeriods" class="primary" @click="nextPeriod">
          Volgende periode
        </button>
        <button class="warn" @click="endMatch">Beëindig wedstrijd</button>
        <button @click="periodEndPrompt = false">Sluiten</button>
      </div>
    </div>

    <div v-if="match.status === 'finished'" class="finished">
      Wedstrijd is afgesloten. Eindscore: <strong>{{ ownScore }}</strong>.
    </div>

    <Field
      v-if="currentTurn"
      :formation="formation"
      :positions="currentTurn.positions"
      :players="players"
      @update:positions="onPositionsUpdate"
    />
    <p v-else class="muted">Druk op Start om de wedstrijd te beginnen — opstelling wordt automatisch gesuggereerd.</p>

    <Bench
      v-if="currentTurn"
      :players="benchPlayers"
      @update:players="onBenchUpdate"
    />

    <ActionBar
      v-if="match.status !== 'finished' && currentTurn"
      :field-players="fieldPlayers"
      :can-end="canEnd"
      @goal="onGoal"
      @assist="onAssist"
      @next-turn="onNextTurn"
      @end-match="endMatch"
    />
  </section>

  <section v-else-if="!match" class="loading">
    <p class="muted">Wedstrijd laden…</p>
    <button @click="router.push('/matches')">Terug naar overzicht</button>
  </section>
</template>

<style scoped>
.match {
  max-width: 720px;
  margin: 0 auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 5rem;
}
.header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
}
.back {
  text-decoration: none;
  color: var(--color-primary);
  font-weight: 600;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
}
.title .opp {
  font-weight: 700;
  font-size: 1.1rem;
}
.title .sub {
  color: var(--color-muted);
  font-size: 0.85rem;
}
.score {
  font-size: 1.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.prompt {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 0.75rem;
}
.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.warn {
  background: #b91c1c;
  color: #fff;
  border-color: #b91c1c;
}
.finished {
  background: #e0e7ff;
  border: 1px solid #818cf8;
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}
.muted {
  color: var(--color-muted);
}
.loading {
  padding: 2rem;
  text-align: center;
}
</style>

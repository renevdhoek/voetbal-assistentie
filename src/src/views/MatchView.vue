<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { liveQuery } from 'dexie';
import { onScopeDispose } from 'vue';

import Stopwatch from '../components/Stopwatch.vue';
import Field from '../components/Field.vue';
import Bench from '../components/Bench.vue';
import ActionBar from '../components/ActionBar.vue';
import Modal from '../components/Modal.vue';

import { db } from '../db/database';
import * as matchesRepo from '../db/repositories/matches';
import { usePlayers } from '../composables/usePlayers';
import { useSettings } from '../composables/useSettings';
import { useStopwatch } from '../composables/useStopwatch';

import { getFormation } from '../lib/formations';
import { suggestFormation } from '../lib/suggester';
import { computeAllStats, ZERO_STATS } from '../lib/stats';
import { computeOwnScore } from '../lib/matchDisplay';
import type { Match, MatchEvent, Player, PositionAssignment, Position, Turn } from '../types/domain';

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

/**
 * Pending wissel: als de wedstrijd loopt of gepauzeerd is wordt een aanpassing
 * van de opstelling niet direct doorgevoerd op de huidige beurt. In plaats
 * daarvan wordt een conceptopstelling getoond die de coach kan **bevestigen**
 * (oude beurt sluit, nieuwe beurt opent → telt mee in stats) of **herstellen**
 * (geen wijziging → telt niet als beurt). Vóór de start (`planned`) gaan
 * aanpassingen direct naar de eerste beurt (pre-match opstelling).
 */
const pendingPositions = ref<PositionAssignment[] | null>(null);

const hasPendingSwap = computed(() => pendingPositions.value !== null);

/** Posities zoals nu zichtbaar in het veld (pending heeft voorrang). */
const displayedPositions = computed<PositionAssignment[]>(() =>
  pendingPositions.value ?? currentTurn.value?.positions ?? [],
);

function needsConfirmation(): boolean {
  const status = match.value?.status;
  return status === 'running' || status === 'paused';
}

const fieldPlayers = computed(() => {
  const ids = new Set(displayedPositions.value.map((p) => p.playerId));
  return players.value.filter((p) => p.id !== undefined && ids.has(p.id));
});

const benchPlayers = computed(() => {
  if (displayedPositions.value.length === 0) return players.value;
  const ids = new Set(displayedPositions.value.map((p) => p.playerId));
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

// Auto-initialiseer een eerste opstelling zodra een geplande wedstrijd wordt
// geopend (en spelers + settings geladen zijn). Coach kan voor de start nog
// schuiven via drag & drop of via tap-picker.
let didInitTurn = false;
watch(
  [match, players, settings],
  async () => {
    if (didInitTurn) return;
    if (!match.value || !settings.value) return;
    if (match.value.turns.length > 0) {
      didInitTurn = true;
      return;
    }
    if (match.value.status !== 'planned') return;
    if (players.value.length < formation.value.length) return;
    didInitTurn = true;
    await initialiseFirstTurn();
  },
  { immediate: true },
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
  if (needsConfirmation()) {
    pendingPositions.value = positions;
    return;
  }
  // Pre-match: direct schrijven naar de eerste (geplande) beurt.
  const turns = [...match.value.turns];
  turns[turns.length - 1] = { ...currentTurn.value, positions };
  await persist({ turns });
}

/** Bevestig de wissel: sluit de huidige beurt en open een nieuwe met de pending opstelling. */
async function confirmSwap() {
  if (!match.value || !currentTurn.value || pendingPositions.value === null) return;
  const newPositions = pendingPositions.value;
  const elapsed = stopwatch.elapsed.value;
  const closed: Turn = { ...currentTurn.value, endedAtSeconds: elapsed };
  const fresh: Turn = {
    startedAtSeconds: elapsed,
    endedAtSeconds: null,
    positions: newPositions,
  };
  const turns = [...match.value.turns, fresh];
  turns[turns.length - 2] = closed;
  pendingPositions.value = null;
  await persist({ turns });
}

/** Herstel de wissel: gooi de pending opstelling weg, oude beurt blijft ongewijzigd. */
function revertSwap() {
  pendingPositions.value = null;
}

// ---- Tap-to-pick selectie -------------------------------------------------
interface PickContext {
  position: Position;
  /** Index in zone.players (0-based, binnen zelfde positie). */
  zoneIndex: number;
  /** Speler-id die nu in dit slot staat (voor "Maak leeg"). */
  currentPlayerId: number | null;
}

const pickContext = ref<PickContext | null>(null);

function onPickSlot(ctx: PickContext) {
  pickContext.value = ctx;
}

const pickCandidates = computed<Array<{ player: Player; currentPosition: Position | null }>>(() => {
  if (!pickContext.value) return [];
  const ctx = pickContext.value;
  const posByPlayer = new Map<number, Position>();
  for (const a of displayedPositions.value) posByPlayer.set(a.playerId, a.position);

  return players.value
    .filter((p) => p.id !== undefined && p.id !== ctx.currentPlayerId)
    .map((p) => ({ player: p, currentPosition: posByPlayer.get(p.id!) ?? null }));
});

async function applyPick(playerId: number | null) {
  if (!match.value || pickContext.value === null) return;
  const ctx = pickContext.value;
  const positions = displayedPositions.value.map((a) => ({ ...a }));

  // Verwijder oude bezetting van dit slot.
  if (ctx.currentPlayerId !== null) {
    const idx = positions.findIndex(
      (p) => p.playerId === ctx.currentPlayerId && p.position === ctx.position,
    );
    if (idx >= 0) positions.splice(idx, 1);
  }

  if (playerId !== null) {
    // Als de gekozen speler al ergens anders stond: swap door de oude bewoner
    // van dit slot terug te zetten op de oorspronkelijke positie van de keuze.
    const prevIdx = positions.findIndex((p) => p.playerId === playerId);
    let swappedFrom: Position | null = null;
    if (prevIdx >= 0) {
      swappedFrom = positions[prevIdx].position;
      positions.splice(prevIdx, 1);
    }
    positions.push({ playerId, position: ctx.position });
    if (swappedFrom !== null && ctx.currentPlayerId !== null) {
      positions.push({ playerId: ctx.currentPlayerId, position: swappedFrom });
    }
  }

  pickContext.value = null;
  await onPositionsUpdate(positions);
}

const positionLabels: Record<Position, string> = {
  K: 'Keeper',
  V: 'Verdediging',
  M: 'Middenveld',
  A: 'Aanval',
};

async function onBenchUpdate(_value: unknown) {
  // Bench-mutaties zijn impliciet: spelers verschijnen vanzelf zodra ze niet meer
  // in `currentTurn.positions` zitten. We hoeven hier niets te doen — de drag-drop
  // group laat de Field-zones de update versturen via onPositionsUpdate.
}

async function closeCurrentTurn() {
  if (!match.value || !currentTurn.value) return;
  // Een lopende pending wissel wordt verworpen bij sluiten van de beurt
  // (perioden- of wedstrijdeinde): hij telde toch nog niet als beurt.
  pendingPositions.value = null;
  const turns = [...match.value.turns];
  turns[turns.length - 1] = {
    ...currentTurn.value,
    endedAtSeconds: stopwatch.elapsed.value,
  };
  await persist({ turns });
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

// ---- Statistieken ---------------------------------------------------------
const statsOpen = ref(false);
const allMatches = ref<Match[]>([]);
const allMatchesSub = liveQuery(() => db.matches.toArray()).subscribe({
  next: (value) => {
    allMatches.value = value ?? [];
  },
});
onScopeDispose(() => allMatchesSub.unsubscribe());

interface MatchPlayerStat {
  player: Player;
  matchTurns: number;
  positions: Record<Position, number>;
  onField: boolean;
  onFieldPosition: Position | null;
}

const matchStats = computed<MatchPlayerStat[]>(() => {
  const turns = match.value?.turns ?? [];
  const fieldIds = new Set<number>();
  const fieldPosById = new Map<number, Position>();
  for (const a of displayedPositions.value) {
    fieldIds.add(a.playerId);
    fieldPosById.set(a.playerId, a.position);
  }
  return players.value
    .filter((p): p is Player & { id: number } => p.id !== undefined)
    .map((p) => {
      const positions: Record<Position, number> = { K: 0, V: 0, M: 0, A: 0 };
      let matchTurns = 0;
      for (const t of turns) {
        for (const a of t.positions) {
          if (a.playerId !== p.id) continue;
          matchTurns += 1;
          positions[a.position] += 1;
        }
      }
      return {
        player: p,
        matchTurns,
        positions,
        onField: fieldIds.has(p.id),
        onFieldPosition: fieldPosById.get(p.id) ?? null,
      };
    })
    .sort((a, b) => a.matchTurns - b.matchTurns || a.player.name.localeCompare(b.player.name));
});

const totalStats = computed(() => computeAllStats(players.value, allMatches.value));

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
    // Vue reactive proxies kunnen niet door structured-clone (IndexedDB).
    // Maak een diepe plain-JS kopie voordat we persisteren. (Geen Date-velden
    // in deze patches, dus JSON-roundtrip is veilig.)
    const raw = JSON.parse(JSON.stringify(patch)) as Partial<Omit<Match, 'id'>>;
    await matchesRepo.update(matchId.value, raw);
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
      :positions="displayedPositions"
      :players="players"
      @update:positions="onPositionsUpdate"
      @pick-slot="onPickSlot"
    />
    <p v-else class="muted">
      Voeg minimaal {{ formation.length }} spelers toe via <RouterLink to="/players">Spelers</RouterLink> om een opstelling te kunnen maken.
    </p>

    <div v-if="hasPendingSwap" class="swap-confirm">
      <p class="swap-msg">
        Wissel voorgesteld. Bevestig om dit als nieuwe beurt te tellen,
        of herstel om de wissel niet mee te tellen.
      </p>
      <div class="swap-actions">
        <button class="primary" @click="confirmSwap">Bevestig wissel</button>
        <button @click="revertSwap">Herstel</button>
      </div>
    </div>

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
      @stats="statsOpen = true"
      @end-match="endMatch"
    />

    <Modal
      :open="statsOpen"
      title="Statistieken"
      @close="statsOpen = false"
    >
      <h3 class="stats-h">Deze wedstrijd</h3>
      <table class="stats-table">
        <thead>
          <tr><th>Speler</th><th>Beurten</th><th>K</th><th>V</th><th>M</th><th>A</th><th>Nu</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in matchStats" :key="row.player.id">
            <td>{{ row.player.name }}</td>
            <td>{{ row.matchTurns }}</td>
            <td>{{ row.positions.K }}</td>
            <td>{{ row.positions.V }}</td>
            <td>{{ row.positions.M }}</td>
            <td>{{ row.positions.A }}</td>
            <td>{{ row.onField ? row.onFieldPosition : 'bank' }}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="stats-h">Totaal (alle wedstrijden)</h3>
      <table class="stats-table">
        <thead>
          <tr><th>Speler</th><th>Beurten</th><th>Voorkeur</th><th>⚽</th><th>🅰️</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in players" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ totalStats.get(p.id ?? -1)?.totalTurns ?? 0 }}</td>
            <td>{{ totalStats.get(p.id ?? -1)?.preferredPosTurns ?? 0 }}</td>
            <td>{{ totalStats.get(p.id ?? -1)?.goals ?? 0 }}</td>
            <td>{{ totalStats.get(p.id ?? -1)?.assists ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </Modal>

    <Modal
      :open="pickContext !== null"
      :title="pickContext ? `Speler kiezen — ${positionLabels[pickContext.position]}` : ''"
      @close="pickContext = null"
    >
      <ul v-if="pickContext" class="pick-list">
        <li v-if="pickContext.currentPlayerId !== null">
          <button class="pick clear" @click="applyPick(null)">Slot leegmaken</button>
        </li>
        <li v-for="c in pickCandidates" :key="c.player.id">
          <button
            class="pick"
            :class="{ pref: c.player.preferences.includes(pickContext.position) }"
            @click="applyPick(c.player.id!)"
          >
            <span class="pname">{{ c.player.name }}</span>
            <span class="meta">
              <span v-if="c.currentPosition" class="loc">nu: {{ c.currentPosition }}</span>
              <span v-else class="loc bench">bank</span>
              <span v-if="c.player.preferences.includes(pickContext.position)" class="badge">voorkeur</span>
            </span>
          </button>
        </li>
        <li v-if="pickCandidates.length === 0 && pickContext.currentPlayerId === null" class="muted">
          Geen spelers beschikbaar.
        </li>
      </ul>
    </Modal>
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
.swap-confirm {
  background: #ecfeff;
  border: 1px solid #06b6d4;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.swap-msg {
  margin: 0;
  font-weight: 500;
}
.swap-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
.stats-h {
  margin: 0.75rem 0 0.4rem 0;
  font-size: 0.95rem;
}
.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.stats-table th,
.stats-table td {
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
}
.stats-table th:first-child,
.stats-table td:first-child {
  text-align: left;
}
.loading {
  padding: 2rem;
  text-align: center;
}
.pick-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.pick {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  font-size: 1rem;
}
.pick.pref {
  border-color: #16a34a;
  background: #f0fdf4;
}
.pick.clear {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
  font-weight: 600;
}
.badge {
  font-size: 0.75rem;
  background: #16a34a;
  color: #fff;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}
.meta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.loc {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
}
.loc.bench {
  background: #f3f4f6;
  color: var(--color-muted);
}
</style>

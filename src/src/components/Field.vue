<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Player, Position, PositionAssignment } from '../types/domain';

const props = defineProps<{
  formation: Position[];
  positions: PositionAssignment[];
  players: Player[];
}>();

const emit = defineEmits<{
  'update:positions': [value: PositionAssignment[]];
}>();

const playerById = computed(() => {
  const m = new Map<number, Player>();
  for (const p of props.players) if (p.id !== undefined) m.set(p.id, p);
  return m;
});

interface ZoneModel {
  position: Position;
  capacity: number;
  players: Array<Player | null>;
}

/** Groepeer slots per positie in de volgorde K, V, M, A en vul met huidige spelers. */
const zones = computed<ZoneModel[]>(() => {
  const order: Position[] = ['K', 'V', 'M', 'A'];
  const result: ZoneModel[] = order.map((pos) => ({
    position: pos,
    capacity: props.formation.filter((p) => p === pos).length,
    players: [],
  }));
  for (const a of props.positions) {
    const z = result.find((r) => r.position === a.position);
    if (!z || z.players.length >= z.capacity) continue;
    const player = playerById.value.get(a.playerId) ?? null;
    z.players.push(player);
  }
  // Pad met null tot capacity.
  for (const z of result) {
    while (z.players.length < z.capacity) z.players.push(null);
  }
  return result.filter((z) => z.capacity > 0);
});

function zonePlayers(zone: ZoneModel): Array<Player | null> {
  return zone.players;
}

function isPreferred(player: Player | null, position: Position): boolean {
  return !!player && player.preferences.includes(position);
}

function onZoneUpdate(zone: ZoneModel, newList: Array<Player | null>) {
  const slotCount = zone.capacity;
  // Verwijder eventuele duplicates binnen deze zone (bv. bij swap).
  const seen = new Set<number>();
  const cleaned: Array<Player | null> = [];
  for (const p of newList) {
    if (p && p.id !== undefined) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
    }
    cleaned.push(p);
  }
  while (cleaned.length < slotCount) cleaned.push(null);
  cleaned.length = slotCount;

  // Bouw nieuwe assignments: behoud andere zones zoals ze nu zijn.
  const newAssignments: PositionAssignment[] = [];
  for (const z of zones.value) {
    const list = z.position === zone.position ? cleaned : z.players;
    list.forEach((pl) => {
      if (pl?.id !== undefined) newAssignments.push({ playerId: pl.id, position: z.position });
    });
  }
  emit('update:positions', dedupe(newAssignments));
}

/** Verwijder dubbele speler-id's globaal: laatste assignment wint (bij cross-zone swap). */
function dedupe(list: PositionAssignment[]): PositionAssignment[] {
  const seen = new Map<number, PositionAssignment>();
  for (const a of list) seen.set(a.playerId, a);
  return Array.from(seen.values());
}

const positionLabels: Record<Position, string> = {
  K: 'Keeper',
  V: 'Verdediging',
  M: 'Middenveld',
  A: 'Aanval',
};
</script>

<template>
  <div class="field">
    <div v-for="zone in zones" :key="zone.position" class="zone" :data-pos="zone.position">
      <div class="zone-label">{{ positionLabels[zone.position] }} ({{ zone.capacity }})</div>
      <VueDraggable
        :model-value="zonePlayers(zone)"
        :group="{ name: 'players' }"
        :animation="150"
        item-key="id"
        class="slots"
        @update:model-value="(val: Array<Player | null>) => onZoneUpdate(zone, val)"
      >
        <template #item="{ element }: { element: Player | null }">
          <div
            class="slot"
            :class="{ filled: !!element, preferred: isPreferred(element, zone.position) }"
          >
            <template v-if="element">
              <div class="initials">{{ element.name.charAt(0).toUpperCase() }}</div>
              <div class="pname">{{ element.name }}</div>
            </template>
            <template v-else>
              <div class="empty-slot">{{ zone.position }}</div>
            </template>
          </div>
        </template>
      </VueDraggable>
    </div>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  grid-template-rows: repeat(4, auto);
  gap: 0.5rem;
  padding: 0.75rem;
  background: #14532d;
  border-radius: 8px;
  background-image: linear-gradient(
    to bottom,
    #14532d 0%,
    #166534 50%,
    #14532d 100%
  );
}
.zone {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 0.5rem;
}
.zone-label {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
  font-weight: 600;
}
.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 64px;
}
.slot {
  flex: 1 1 80px;
  min-width: 80px;
  min-height: 64px;
  background: #fff;
  border: 2px dashed transparent;
  border-radius: 8px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: grab;
}
.slot:not(.filled) {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.3);
}
.slot.preferred {
  border-color: #4ade80;
  border-style: solid;
}
.initials {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
}
.pname {
  margin-top: 0.2rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #111;
  word-break: break-word;
}
.empty-slot {
  font-weight: 700;
  font-size: 1.2rem;
}
</style>

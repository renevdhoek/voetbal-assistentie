import type { PositionAssignment, Player, Position } from '../types/domain';

/**
 * Per-speler statistieken die de suggester nodig heeft voor fairness-sortering.
 * Komt typisch uit `lib/stats.ts`.
 */
export interface PlayerLoad {
  totalTurns: number;
  preferredPosTurns: number;
}

export type LoadLookup = (playerId: number) => PlayerLoad;

/**
 * Pure functie die een opstel-suggestie genereert.
 *
 * Procedure (zie SDD §5.1):
 * 1. Sorteer beschikbare spelers op (totalTurns, preferredPosTurns) oplopend
 *    — minst gespeeld + minst-op-voorkeur eerst.
 * 2. Loop posities af in de volgorde van `formation` (K eerst).
 * 3. Voor elke positie: kies eerst uit nog niet ingedeelde spelers diegene voor
 *    wie de positie in `preferences` staat (hoogste fairness wint bij gelijkstand).
 * 4. Geen voorkeur-match? Kies de speler met hoogste fairness ongeacht voorkeur.
 *
 * Geeft een lege array terug als er onvoldoende spelers zijn.
 */
export function suggestFormation(
  players: Player[],
  formation: Position[],
  load: LoadLookup,
): PositionAssignment[] {
  if (players.length < formation.length) return [];

  // Stabiele fairness-sortering. Bij volledig gelijke load valt het terug op insert-volgorde.
  const ranked = players
    .filter((p): p is Player & { id: number } => p.id !== undefined)
    .map((p, idx) => ({ player: p, idx, load: load(p.id) }))
    .sort((a, b) => {
      if (a.load.totalTurns !== b.load.totalTurns) {
        return a.load.totalTurns - b.load.totalTurns;
      }
      if (a.load.preferredPosTurns !== b.load.preferredPosTurns) {
        return a.load.preferredPosTurns - b.load.preferredPosTurns;
      }
      return a.idx - b.idx;
    });

  if (ranked.length < formation.length) return [];

  const used = new Set<number>();
  const result: PositionAssignment[] = [];

  for (const position of formation) {
    // Eerst: speler met voorkeur voor deze positie, hoogste fairness.
    let pick = ranked.find(
      (r) => !used.has(r.player.id) && r.player.preferences.includes(position),
    );
    // Anders: hoogste fairness ongeacht voorkeur.
    if (!pick) {
      pick = ranked.find((r) => !used.has(r.player.id));
    }
    if (!pick) return []; // mag niet gebeuren door length-check, maar safe.
    used.add(pick.player.id);
    result.push({ playerId: pick.player.id, position });
  }

  return result;
}

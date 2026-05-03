import type { Match, MatchEvent, Player, Position } from '../types/domain';

export interface MatchScore {
  /** Aantal goals door eigen team (events met type 'goal'). */
  ownGoals: number;
}

export function computeOwnScore(events: MatchEvent[]): number {
  return events.filter((e) => e.type === 'goal').length;
}

export function computeOpponentScore(events: MatchEvent[]): number {
  return events.filter((e) => e.type === 'opponentGoal').length;
}

export function statusLabel(match: Pick<Match, 'status'>): string {
  switch (match.status) {
    case 'planned':
      return 'Gepland';
    case 'running':
      return 'Loopt';
    case 'paused':
      return 'Pauze';
    case 'finished':
      return 'Klaar';
  }
}

const dateFmt = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatMatchDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return dateFmt.format(d);
}

export interface MatchPlayerStat {
  player: Player;
  matchTurns: number;
  positions: Record<Position, number>;
  goals: number;
  assists: number;
  /** Laatst bekende positie binnen deze wedstrijd, of null als de speler niet in een veld-beurt voorkwam. */
  lastPosition: Position | null;
}

/**
 * Berekent per speler hoe vaak hij/zij in deze wedstrijd op elke positie stond,
 * inclusief totaal aantal beurten, goals en assists. Gesorteerd op minst-gespeeld.
 */
export function computeMatchStats(match: Match, players: readonly Player[]): MatchPlayerStat[] {
  const turns = match.turns;
  const lastPosByPlayer = new Map<number, Position>();
  for (const t of turns) {
    for (const a of t.positions) lastPosByPlayer.set(a.playerId, a.position);
  }

  const goalsByPlayer = new Map<number, number>();
  const assistsByPlayer = new Map<number, number>();
  for (const e of match.events) {
    if (e.playerId === undefined) continue;
    if (e.type === 'goal') goalsByPlayer.set(e.playerId, (goalsByPlayer.get(e.playerId) ?? 0) + 1);
    else if (e.type === 'assist') assistsByPlayer.set(e.playerId, (assistsByPlayer.get(e.playerId) ?? 0) + 1);
  }

  return players
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
        goals: goalsByPlayer.get(p.id) ?? 0,
        assists: assistsByPlayer.get(p.id) ?? 0,
        lastPosition: lastPosByPlayer.get(p.id) ?? null,
      };
    })
    .sort((a, b) => a.matchTurns - b.matchTurns || a.player.name.localeCompare(b.player.name));
}

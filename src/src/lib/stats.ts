import type { Match, Player, Position } from '../types/domain';

export interface PlayerStats {
  goals: number;
  assists: number;
  totalTurns: number;
  preferredPosTurns: number;
  keeperTurns: number;
}

export const ZERO_STATS: PlayerStats = Object.freeze({
  goals: 0,
  assists: 0,
  totalTurns: 0,
  preferredPosTurns: 0,
  keeperTurns: 0,
});

/** Computes derived statistics for a single player from all matches. */
export function computePlayerStats(player: Player, matches: readonly Match[]): PlayerStats {
  const playerId = player.id;
  if (playerId === undefined) return { ...ZERO_STATS };

  const prefSet = new Set<Position>(player.preferences);
  const stats: PlayerStats = { goals: 0, assists: 0, totalTurns: 0, preferredPosTurns: 0, keeperTurns: 0 };

  for (const match of matches) {
    for (const turn of match.turns) {
      for (const assignment of turn.positions) {
        if (assignment.playerId !== playerId) continue;
        stats.totalTurns += 1;
        if (prefSet.has(assignment.position)) stats.preferredPosTurns += 1;
        if (assignment.position === 'K') stats.keeperTurns += 1;
      }
    }
    for (const event of match.events) {
      if (event.playerId === undefined) continue;
      if (event.playerId !== playerId) continue;
      if (event.type === 'goal') stats.goals += 1;
      else if (event.type === 'assist') stats.assists += 1;
    }
  }

  return stats;
}

/** Computes stats for all players in one pass (more efficient than per-player). */
export function computeAllStats(
  players: readonly Player[],
  matches: readonly Match[],
): Map<number, PlayerStats> {
  const result = new Map<number, PlayerStats>();
  const prefByPlayer = new Map<number, Set<Position>>();

  for (const p of players) {
    if (p.id === undefined) continue;
    result.set(p.id, { goals: 0, assists: 0, totalTurns: 0, preferredPosTurns: 0, keeperTurns: 0 });
    prefByPlayer.set(p.id, new Set(p.preferences));
  }

  for (const match of matches) {
    for (const turn of match.turns) {
      for (const a of turn.positions) {
        const s = result.get(a.playerId);
        if (!s) continue;
        s.totalTurns += 1;
        if (prefByPlayer.get(a.playerId)?.has(a.position)) s.preferredPosTurns += 1;
        if (a.position === 'K') s.keeperTurns += 1;
      }
    }
    for (const e of match.events) {
      if (e.playerId === undefined) continue;
      const s = result.get(e.playerId);
      if (!s) continue;
      if (e.type === 'goal') s.goals += 1;
      else if (e.type === 'assist') s.assists += 1;
    }
  }

  return result;
}

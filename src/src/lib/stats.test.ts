import { describe, it, expect } from 'vitest';
import { computeAllStats, computePlayerStats, ZERO_STATS } from './stats';
import type { Match, Player } from '../types/domain';

const p = (id: number, name: string, prefs: Player['preferences'] = []): Player => ({
  id,
  name,
  preferences: prefs,
});

const match = (overrides: Partial<Match> = {}): Match => ({
  id: 1,
  opponent: 'X',
  date: new Date('2026-01-01'),
  type: 7,
  status: 'finished',
  currentPeriod: 2,
  elapsedSeconds: 0,
  turns: [],
  events: [],
  ...overrides,
});

describe('computePlayerStats', () => {
  it('returns zero stats for player with no data', () => {
    expect(computePlayerStats(p(1, 'A'), [])).toEqual({ ...ZERO_STATS });
  });

  it('returns zero stats when player has no id', () => {
    const player: Player = { name: 'X', preferences: [] };
    expect(computePlayerStats(player, [match()])).toEqual({ ...ZERO_STATS });
  });

  it('counts turns and preferred-position turns', () => {
    const player = p(1, 'A', ['V']);
    const m = match({
      turns: [
        { startedAtSeconds: 0, endedAtSeconds: 60, positions: [{ playerId: 1, position: 'V' }] },
        { startedAtSeconds: 60, endedAtSeconds: 120, positions: [{ playerId: 1, position: 'A' }] },
        { startedAtSeconds: 120, endedAtSeconds: null, positions: [{ playerId: 1, position: 'V' }] },
      ],
    });
    expect(computePlayerStats(player, [m])).toEqual({
      goals: 0,
      assists: 0,
      totalTurns: 3,
      preferredPosTurns: 2,
    });
  });

  it('counts goals and assists', () => {
    const player = p(1, 'A');
    const m = match({
      events: [
        { type: 'goal', playerId: 1, turnIndex: 0 },
        { type: 'goal', playerId: 1, turnIndex: 1 },
        { type: 'assist', playerId: 1, turnIndex: 0 },
        { type: 'goal', playerId: 2, turnIndex: 0 }, // other player
      ],
    });
    expect(computePlayerStats(player, [m])).toMatchObject({ goals: 2, assists: 1 });
  });

  it('aggregates across multiple matches', () => {
    const player = p(1, 'A', ['M']);
    const m1 = match({
      turns: [{ startedAtSeconds: 0, endedAtSeconds: 60, positions: [{ playerId: 1, position: 'M' }] }],
      events: [{ type: 'goal', playerId: 1, turnIndex: 0 }],
    });
    const m2 = match({
      id: 2,
      turns: [{ startedAtSeconds: 0, endedAtSeconds: 60, positions: [{ playerId: 1, position: 'A' }] }],
      events: [{ type: 'assist', playerId: 1, turnIndex: 0 }],
    });
    expect(computePlayerStats(player, [m1, m2])).toEqual({
      goals: 1,
      assists: 1,
      totalTurns: 2,
      preferredPosTurns: 1,
    });
  });
});

describe('computeAllStats', () => {
  it('computes stats for all players in one pass', () => {
    const players = [p(1, 'A', ['K']), p(2, 'B', ['V'])];
    const m = match({
      turns: [
        {
          startedAtSeconds: 0,
          endedAtSeconds: 60,
          positions: [
            { playerId: 1, position: 'K' },
            { playerId: 2, position: 'V' },
          ],
        },
        {
          startedAtSeconds: 60,
          endedAtSeconds: 120,
          positions: [
            { playerId: 1, position: 'V' },
            { playerId: 2, position: 'V' },
          ],
        },
      ],
      events: [
        { type: 'goal', playerId: 2, turnIndex: 0 },
        { type: 'assist', playerId: 1, turnIndex: 0 },
      ],
    });
    const result = computeAllStats(players, [m]);
    expect(result.get(1)).toEqual({ goals: 0, assists: 1, totalTurns: 2, preferredPosTurns: 1 });
    expect(result.get(2)).toEqual({ goals: 1, assists: 0, totalTurns: 2, preferredPosTurns: 2 });
  });

  it('ignores events for unknown players', () => {
    const players = [p(1, 'A')];
    const m = match({ events: [{ type: 'goal', playerId: 99, turnIndex: 0 }] });
    expect(computeAllStats(players, [m]).get(1)).toEqual({ ...ZERO_STATS });
  });
});

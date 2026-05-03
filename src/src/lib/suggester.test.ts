import { describe, expect, it } from 'vitest';
import type { Player } from '../types/domain';
import { getFormation } from './formations';
import { suggestFormation, type LoadLookup, type PlayerLoad } from './suggester';

const player = (id: number, name: string, preferences: Player['preferences'] = []): Player => ({
  id,
  name,
  preferences,
});

const zeroLoad = (): LoadLookup => () => ({ totalTurns: 0, preferredPosTurns: 0 });
const loadFrom = (map: Record<number, PlayerLoad>): LoadLookup => (id) =>
  map[id] ?? { totalTurns: 0, preferredPosTurns: 0 };

describe('suggestFormation', () => {
  it('geeft lege array bij te weinig spelers', () => {
    const result = suggestFormation([player(1, 'A')], getFormation(7), zeroLoad());
    expect(result).toEqual([]);
  });

  it('vult exact formatie-lengte', () => {
    const players = Array.from({ length: 7 }, (_, i) => player(i + 1, `P${i + 1}`));
    const result = suggestFormation(players, getFormation(7), zeroLoad());
    expect(result).toHaveLength(7);
    const ids = result.map((r) => r.playerId);
    expect(new Set(ids).size).toBe(7);
  });

  it('voorkeur wint bij gelijke fairness', () => {
    // 6v6 formatie met 1 K. Speler 2 heeft K als voorkeur.
    const players = [player(1, 'P1'), player(2, 'Keeper', ['K']), player(3, 'P3')].concat(
      Array.from({ length: 3 }, (_, i) => player(i + 4, `P${i + 4}`)),
    );
    const result = suggestFormation(players, getFormation(6), zeroLoad());
    const k = result.find((r) => r.position === 'K');
    expect(k?.playerId).toBe(2);
  });

  it('geen voorkeur-match → kiest fairness-prioriteit', () => {
    // Niemand heeft K-voorkeur. Speler 3 heeft minste totalTurns dus moet K krijgen.
    const players = [
      player(1, 'P1', ['V']),
      player(2, 'P2', ['M']),
      player(3, 'P3', ['A']),
      player(4, 'P4', ['V']),
      player(5, 'P5', ['M']),
      player(6, 'P6', ['A']),
    ];
    const load = loadFrom({
      1: { totalTurns: 5, preferredPosTurns: 0 },
      2: { totalTurns: 5, preferredPosTurns: 0 },
      3: { totalTurns: 0, preferredPosTurns: 0 },
      4: { totalTurns: 5, preferredPosTurns: 0 },
      5: { totalTurns: 5, preferredPosTurns: 0 },
      6: { totalTurns: 5, preferredPosTurns: 0 },
    });
    const result = suggestFormation(players, getFormation(6), load);
    const k = result.find((r) => r.position === 'K');
    expect(k?.playerId).toBe(3);
  });

  it('fairness: minst gespeeld eerst', () => {
    const players = [
      player(1, 'A', ['V']),
      player(2, 'B', ['V']),
      player(3, 'C', ['V']),
      player(4, 'D', ['V']),
      player(5, 'E', ['V']),
      player(6, 'F', ['V']),
      player(7, 'G', ['V']),
    ];
    // Speler 7 heeft minste totalTurns → krijgt K omdat geen K-voorkeur.
    const load = loadFrom({
      1: { totalTurns: 10, preferredPosTurns: 0 },
      2: { totalTurns: 10, preferredPosTurns: 0 },
      3: { totalTurns: 10, preferredPosTurns: 0 },
      4: { totalTurns: 10, preferredPosTurns: 0 },
      5: { totalTurns: 10, preferredPosTurns: 0 },
      6: { totalTurns: 10, preferredPosTurns: 0 },
      7: { totalTurns: 0, preferredPosTurns: 0 },
    });
    const result = suggestFormation(players, getFormation(7), load);
    const k = result.find((r) => r.position === 'K');
    expect(k?.playerId).toBe(7);
  });

  it('preferredPosTurns is tiebreaker na totalTurns', () => {
    const players = [
      player(1, 'A', ['K']),
      player(2, 'B', ['K']),
      player(3, 'C'),
      player(4, 'D'),
      player(5, 'E'),
      player(6, 'F'),
    ];
    // Speler 1 en 2 hebben beide K-voorkeur en gelijke totalTurns,
    // maar speler 2 heeft minder preferredPosTurns → krijgt K.
    const load = loadFrom({
      1: { totalTurns: 4, preferredPosTurns: 3 },
      2: { totalTurns: 4, preferredPosTurns: 1 },
    });
    const result = suggestFormation(players, getFormation(6), load);
    const k = result.find((r) => r.position === 'K');
    expect(k?.playerId).toBe(2);
  });

  it('elke speler komt maximaal één keer voor', () => {
    const players = Array.from({ length: 11 }, (_, i) => player(i + 1, `P${i + 1}`, ['V', 'M', 'A']));
    const result = suggestFormation(players, getFormation(11), zeroLoad());
    const ids = result.map((r) => r.playerId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(11);
  });
});

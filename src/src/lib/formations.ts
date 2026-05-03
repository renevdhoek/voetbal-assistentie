import type { MatchType, Position } from '../types/domain';

/**
 * Geeft de doel-formatie als geordende lijst van posities (K eerst, dan V, M, A).
 *
 * - 6v6: 1xK, 2xV, 1xM, 2xA
 * - 7v7: 1xK, 2xV, 2xM, 2xA
 * - 11v11: 1xK, 4xV, 3xM, 3xA
 */
export function getFormation(type: MatchType): Position[] {
  switch (type) {
    case 6:
      return ['K', 'V', 'V', 'M', 'A', 'A'];
    case 7:
      return ['K', 'V', 'V', 'M', 'M', 'A', 'A'];
    case 11:
      return ['K', 'V', 'V', 'V', 'V', 'M', 'M', 'M', 'A', 'A', 'A'];
  }
}

/** Aantal spelers per positie voor een gegeven match-type. */
export function countByPosition(type: MatchType): Record<Position, number> {
  const counts: Record<Position, number> = { K: 0, V: 0, M: 0, A: 0 };
  for (const p of getFormation(type)) counts[p]++;
  return counts;
}

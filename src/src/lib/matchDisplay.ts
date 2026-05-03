import type { Match, MatchEvent } from '../types/domain';

export interface MatchScore {
  /** Aantal goals door eigen team (events met type 'goal'). */
  ownGoals: number;
}

export function computeOwnScore(events: MatchEvent[]): number {
  return events.filter((e) => e.type === 'goal').length;
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

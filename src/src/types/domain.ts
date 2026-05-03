// Domain types for Voetbal Assistentie.
// Single source of truth: stats are derived from Match data, not denormalized on Player.

export type Position = 'K' | 'V' | 'M' | 'A';
export type MatchType = 6 | 7 | 11;
export type MatchStatus = 'planned' | 'running' | 'paused' | 'finished';
export type EventType = 'goal' | 'assist';

/** Singleton (id = 1) with competition-wide settings. */
export interface Settings {
  id?: number;
  periods: 2 | 4; // 2 = halves, 4 = quarters
  periodLengthMin: number;
  defaultMatchType: MatchType;
  schemaVersion: number;
}

export interface Player {
  id?: number;
  name: string;
  number: number;
  preferences: Position[]; // 0..3
}

export interface PositionAssignment {
  playerId: number;
  position: Position;
}

export interface Turn {
  startedAtSeconds: number;
  endedAtSeconds: number | null;
  positions: PositionAssignment[];
}

export interface MatchEvent {
  type: EventType;
  playerId: number;
  turnIndex: number;
}

export interface Match {
  id?: number;
  opponent: string;
  date: Date;
  type: MatchType;
  status: MatchStatus;
  currentPeriod: number;
  elapsedSeconds: number;
  turns: Turn[];
  events: MatchEvent[];
}

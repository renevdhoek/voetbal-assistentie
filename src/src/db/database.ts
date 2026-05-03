import Dexie, { type Table } from 'dexie';
import type { Match, Player, Settings } from '../types/domain';

export const SCHEMA_VERSION = 1;

export class VoetbalDb extends Dexie {
  settings!: Table<Settings, number>;
  players!: Table<Player, number>;
  matches!: Table<Match, number>;

  constructor() {
    super('voetbal-assistentie');
    this.version(1).stores({
      settings: '++id',
      players: '++id, number',
      matches: '++id, date, status',
    });
  }
}

export const db = new VoetbalDb();

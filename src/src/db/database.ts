import Dexie, { type Table } from 'dexie';
import type { Match, Player, Settings } from '../types/domain';

export const SCHEMA_VERSION = 2;

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
    // v2: remove rugnummer; index by name instead.
    this.version(2)
      .stores({
        settings: '++id',
        players: '++id, name',
        matches: '++id, date, status',
      })
      .upgrade(async (tx) => {
        await tx.table('players').toCollection().modify((player: Record<string, unknown>) => {
          delete player.number;
        });
      });
  }
}

export const db = new VoetbalDb();

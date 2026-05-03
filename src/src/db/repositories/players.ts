import { db } from '../database';
import type { Player } from '../../types/domain';

export function list(): Promise<Player[]> {
  return db.players.orderBy('number').toArray();
}

export function get(id: number): Promise<Player | undefined> {
  return db.players.get(id);
}

export async function add(player: Omit<Player, 'id'>): Promise<number> {
  return db.players.add(player as Player);
}

export async function update(id: number, patch: Partial<Omit<Player, 'id'>>): Promise<void> {
  await db.players.update(id, patch);
}

export async function remove(id: number): Promise<void> {
  await db.players.delete(id);
}

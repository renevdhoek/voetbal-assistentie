import { db } from '../database';
import type { Match } from '../../types/domain';

export function list(): Promise<Match[]> {
  return db.matches.orderBy('date').reverse().toArray();
}

export function get(id: number): Promise<Match | undefined> {
  return db.matches.get(id);
}

export async function add(match: Omit<Match, 'id'>): Promise<number> {
  return db.matches.add(match as Match);
}

export async function update(id: number, patch: Partial<Omit<Match, 'id'>>): Promise<void> {
  await db.matches.update(id, patch);
}

export async function remove(id: number): Promise<void> {
  await db.matches.delete(id);
}

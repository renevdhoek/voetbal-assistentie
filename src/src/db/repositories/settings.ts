import { db, SCHEMA_VERSION } from '../database';
import type { Settings } from '../../types/domain';

const DEFAULTS: Settings = {
  id: 1,
  periods: 2,
  periodLengthMin: 25,
  matchType: 7,
  schemaVersion: SCHEMA_VERSION,
};

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get(1);
  if (existing) return existing;
  await db.settings.put(DEFAULTS);
  return DEFAULTS;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id' | 'schemaVersion'>>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch };
  await db.settings.put(next);
  return next;
}

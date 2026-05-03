import { liveQuery } from 'dexie';
import { ref, computed, onScopeDispose } from 'vue';
import { db } from '../db/database';
import { getSettings, updateSettings } from '../db/repositories/settings';
import type { Settings } from '../types/domain';

/**
 * Reactive Settings singleton. Falls back to a manual subscription on Dexie's
 * liveQuery so we don't need an extra rx dependency.
 */
export function useSettings() {
  const settings = ref<Settings | null>(null);
  const error = ref<unknown>(null);

  // Ensure seeded.
  getSettings().catch((e) => (error.value = e));

  const subscription = liveQuery(() => db.settings.get(1)).subscribe({
    next: (value) => {
      if (value) settings.value = value;
    },
    error: (e) => (error.value = e),
  });

  onScopeDispose(() => subscription.unsubscribe());

  const isReady = computed(() => settings.value !== null);

  return {
    settings,
    isReady,
    error,
    update: updateSettings,
  };
}

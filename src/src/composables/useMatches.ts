import { liveQuery } from 'dexie';
import { ref, onScopeDispose } from 'vue';
import { db } from '../db/database';
import * as repo from '../db/repositories/matches';
import type { Match } from '../types/domain';

export function useMatches() {
  const matches = ref<Match[]>([]);
  const isLoading = ref(true);

  const subscription = liveQuery(() => db.matches.orderBy('date').reverse().toArray()).subscribe({
    next: (value) => {
      matches.value = value;
      isLoading.value = false;
    },
  });

  onScopeDispose(() => subscription.unsubscribe());

  return {
    matches,
    isLoading,
    get: repo.get,
    add: repo.add,
    update: repo.update,
    remove: repo.remove,
  };
}

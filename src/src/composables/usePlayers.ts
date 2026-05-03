import { liveQuery } from 'dexie';
import { ref, onScopeDispose } from 'vue';
import { db } from '../db/database';
import * as repo from '../db/repositories/players';
import type { Player } from '../types/domain';

export function usePlayers() {
  const players = ref<Player[]>([]);
  const isLoading = ref(true);

  const subscription = liveQuery(() => db.players.orderBy('name').toArray()).subscribe({
    next: (value) => {
      players.value = value;
      isLoading.value = false;
    },
  });

  onScopeDispose(() => subscription.unsubscribe());

  return {
    players,
    isLoading,
    add: repo.add,
    update: repo.update,
    remove: repo.remove,
  };
}

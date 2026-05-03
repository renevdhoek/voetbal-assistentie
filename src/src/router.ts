import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/matches' },
  { path: '/players', name: 'players', component: () => import('./views/PlayersView.vue') },
  { path: '/matches', name: 'matches', component: () => import('./views/MatchesView.vue') },
  { path: '/matches/:id', name: 'match', component: () => import('./views/MatchView.vue'), props: true },
  { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

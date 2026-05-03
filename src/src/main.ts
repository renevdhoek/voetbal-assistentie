import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { router } from './router';
import { getSettings } from './db/repositories/settings';
import { registerSW } from 'virtual:pwa-register';

// Ensure Settings singleton is seeded.
getSettings().catch((err) => console.error('Failed to seed settings', err));

// Register service worker (auto-update).
registerSW({ immediate: true });

createApp(App).use(router).mount('#app');

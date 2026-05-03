# Implementatieplan — Voetbal Assistentie PWA v1

Dit plan beschrijft de stappen voor v1 in reviewbare brokken. Elke stap heeft een **doel**, een **deliverable** en een **review-checklist**. Vink af na akkoord. Stappen binnen één fase moeten in volgorde; fases waar aangegeven kunnen parallel.

Status: 🔲 todo · 🟡 in progress · ✅ done

---

## Fase 1 — Projectskelet

### Stap 1.1 — Vite + Vue 3 + TS scaffolding ✅
**Doel:** Werkende lege Vue 3 + TypeScript app.
**Acties:**
- `npm create vite@latest . -- --template vue-ts` (in workspace root, naast `doc/`).
- `npm install`.
- TypeScript `strict: true` controleren in [tsconfig.json](tsconfig.json).
- `.gitignore` voor `node_modules`, `dist`.
**Deliverable:** `npm run dev` toont default Vite-pagina.
**Review:** project draait lokaal, geen TS-fouten.

### Stap 1.2 — Dependencies & mappenstructuur ✅
**Doel:** Alle libs geïnstalleerd, mappen aangemaakt.
**Acties:**
- Installeren: `dexie`, `vue-router`, `vue-draggable-plus`, `vite-plugin-pwa`.
- Dev: `vitest`, `@vue/test-utils`, `jsdom`, `vue-tsc`.
- Mappen: `src/db/`, `src/db/repositories/`, `src/lib/`, `src/components/`, `src/views/`, `src/composables/`, `src/types/`.
- `src/types/domain.ts` met de interfaces uit SDD §3.
**Deliverable:** lege bestanden + werkende imports.
**Review:** type-check slaagt, structuur klopt met SDD.

### Stap 1.3 — Router & app shell ✅
**Doel:** Navigatie tussen 4 views.
**Acties:**
- `vue-router` (hash mode) met routes `/players`, `/matches`, `/matches/:id`, `/settings`.
- `App.vue` met simpele nav-balk (4 links).
- Lege view-stubs in `src/views/`.
**Deliverable:** klikken tussen views werkt.
**Review:** routing werkt, geen 404s, hash-mode actief.

### Stap 1.4 — Dexie database & repositories ✅
**Doel:** IndexedDB werkt, Settings-singleton wordt geseed.
**Acties:**
- `src/db/database.ts`: Dexie class met `version(1).stores(...)` zoals SDD §3.2.
- `src/db/repositories/settings.ts`: `getSettings()`, `updateSettings()`. Bij eerste call → seed `{ periods:2, periodLengthMin:25, defaultMatchType:7, schemaVersion:1 }`.
- `src/db/repositories/players.ts`: `list()`, `add()`, `update()`, `remove()`.
- `src/db/repositories/matches.ts`: idem + `get(id)`.
**Deliverable:** in DevTools → IndexedDB zichtbaar, settings-record bestaat na eerste app-load.
**Review:** schema klopt, geen runtime-errors, repositories typed correct.

### Stap 1.5 — PWA-config ✅
**Doel:** App is installeerbaar en offline bruikbaar.
**Acties:**
- `vite.config.ts` met `vite-plugin-pwa` (autoUpdate, precache app shell).
- Manifest: naam, korte naam, icons (placeholder 192/512 px), theme-color, display=standalone.
- `base` voor GitHub Pages instellen.
**Deliverable:** Lighthouse PWA-audit groen, app werkt na `Network: Offline`.
**Review:** install-prompt verschijnt, manifest valide.

---

## Fase 2 — Spelerbeheer & Settings

### Stap 2.1 — Settings-view ✅
**Doel:** Coach kan periodes en defaults instellen.
**Acties:**
- `SettingsView.vue` met form: `periods` (radio 2/4), `periodLengthMin` (number), `defaultMatchType` (select 6/7/11).
- Wijzigingen → `settingsRepo.updateSettings()`.
- `useSettings()` composable met reactive state (Dexie liveQuery).
**Deliverable:** waarden persisteren na page-reload.
**Review:** validaties (positieve duur), UI gebruikt 48px+ targets.

### Stap 2.2 — Spelerbeheer-view ✅
**Doel:** CRUD voor spelers met voorkeursposities.
**Acties:**
- `PlayersView.vue`: lijst + "Toevoegen" dialog.
- Form: naam (string), preferences (4 toggle-chips K/V/M/A, max 3).
- Edit + delete acties per rij.
**Deliverable:** spelers kunnen worden aangemaakt/bewerkt/verwijderd; data overleeft reload.
**Review:** max-3-validatie werkt, lijst sorteert op naam.

### Stap 2.3 — Stats-library + dashboard ✅
**Doel:** Afgeleide statistieken zichtbaar per speler.
**Acties:**
- `lib/stats.ts`: `computePlayerStats(player, matches, players)` → `{goals, assists, totalTurns, preferredPosTurns}`. Pure functie.
- Vitest unit tests voor stats (5+ scenario's).
- Dashboard-tab in `PlayersView` met tabel: naam | nr | G | A | beurten | voorkeur-beurten.
**Deliverable:** stats kloppen met handmatig opgezette match-fixtures.
**Review:** unit tests slagen, getallen kloppen.

---

## Fase 3 — Wedstrijdbeheer

### Stap 3.1 — Formations-library 🔲
**Doel:** `MatchType` → posities-array.
**Acties:**
- `lib/formations.ts`: `getFormation(type: MatchType): Position[]` met de mappings uit SDD §4.4.2.
- Vitest tests voor 6/7/11 (juiste counts per positie).
**Deliverable:** pure functie + tests groen.
**Review:** counts kloppen.

### Stap 3.2 — Wedstrijd-lijst & aanmaken 🔲
**Doel:** Coach maakt nieuwe wedstrijd.
**Acties:**
- `MatchesView.vue`: lijst van matches (datum, tegenstander, status, score uit events).
- Dialog "Nieuwe wedstrijd": tegenstander, datum (default vandaag), type (default uit Settings).
- Bij aanmaken: `status:'planned'`, `currentPeriod:1`, `elapsedSeconds:0`, `turns:[]`, `events:[]`.
**Deliverable:** wedstrijd verschijnt in lijst.
**Review:** correcte defaults, datum-input bruikbaar op mobiel.

### Stap 3.3 — Suggester-library 🔲
**Doel:** Pure functie voor opstel-suggestie.
**Acties:**
- `lib/suggester.ts` volgens SDD §5.1.
- Input: `Player[]`, `Position[]` (formatie), per-speler stats.
- Output: `PositionAssignment[]`.
- Vitest: ≥6 scenario's (gelijke fairness, voorkeur wint, geen voorkeur-match, te weinig spelers).
**Deliverable:** unit tests groen.
**Review:** logica matcht SDD, randgevallen gedekt.

---

## Fase 4 — Live wedstrijdscherm

### Stap 4.1 — MatchView basis + Stopwatch 🔲
**Doel:** Wedstrijd openen, stopwatch werkt.
**Acties:**
- `MatchView.vue` laadt match op `:id`.
- `composables/useStopwatch.ts`: tick via `setInterval(1000)`, `start/pause/reset`, persist `elapsedSeconds` elke tick.
- `Stopwatch.vue`: toont `Px MM:SS`, knoppen Start/Pauze/Reset (≥48px).
- Wake Lock: opvragen bij start, releasen bij pauze; try/catch fallback.
- Auto-pauze bij periode-einde + bevestiging-dialog "Volgende periode" / "Beëindig wedstrijd".
**Deliverable:** klok loopt, persist na reload, Wake Lock werkt op mobiel.
**Review:** geen drift > 1s, periode-overgang werkt.

### Stap 4.2 — Field & Bench componenten (zonder D&D) 🔲
**Doel:** Statische rendering van formatie + bench.
**Acties:**
- `Field.vue`: rendert zones obv `getFormation(match.type)`, gebruikt CSS-grid met "K" boven, "A" onder.
- `Bench.vue`: lijst van niet-ingedeelde spelers.
- Eerste `Turn` initialiseren met suggester bij eerste open van een `planned` match.
- Voorkeur-highlight (groene rand) op spelers wier `position ∈ preferences`.
**Deliverable:** veld toont initial formatie correct voor 6/7/11.
**Review:** layout klopt visueel, highlight werkt.

### Stap 4.3 — Drag & Drop 🔲
**Doel:** Spelers verplaatsen tussen bench/zones.
**Acties:**
- `vue-draggable-plus` integreren: bench ↔ zone, zone ↔ zone.
- Constraint: per zone max. het aantal slots; bij swap → wissel uitvoeren.
- Mutaties op huidige (open) `Turn.positions`, persist via `matchesRepo.update`.
**Deliverable:** D&D werkt op desktop én touch.
**Review:** geen ghost-state, geen dubbele plaatsing.

### Stap 4.4 — Actiebalk: Goal / Assist / Volgende beurt 🔲
**Doel:** Events registreren, beurt afsluiten.
**Acties:**
- `ActionBar.vue` (sticky bottom).
- Goal/Assist openen modal met spelers in huidige Turn → push `MatchEvent` met `turnIndex`.
- "Volgende beurt": zet `endedAtSeconds` op huidige `elapsedSeconds`, push nieuwe `Turn` met dezelfde `positions` als startpunt.
- Persist na elke actie.
**Deliverable:** events en beurten verschijnen in DB; stats-dashboard updatet.
**Review:** geen race-conditions met stopwatch-persist; modals goed bedienbaar.

### Stap 4.5 — Wedstrijd beëindigen 🔲
**Doel:** Match afsluiten en stats finaliseren.
**Acties:**
- Bij laatste-periode-einde knop "Wedstrijd beëindigen" → `status:'finished'`, sluit lopende Turn.
- MatchesView toont eindscore + status-badge.
**Deliverable:** Finished match verschijnt correct in lijst, stats inclusief.
**Review:** geen open Turn na finish.

---

## Fase 5 — Import / Export *(parallel met Fase 4 mogelijk)*

### Stap 5.1 — Export 🔲
**Doel:** Backup-bestand downloaden.
**Acties:**
- Knop in Settings: "Exporteer". Bouwt `{ schemaVersion:1, settings, players, matches }`. Trigger `Blob` download als `competitie_backup_<datum>.json`.
**Deliverable:** bestand downloadt en bevat alle data.
**Review:** JSON valide, Date-objecten serializen correct (ISO strings).

### Stap 5.2 — Import 🔲
**Doel:** Backup terugzetten.
**Acties:**
- File-input → parse JSON → guards (schemaVersion, arrays aanwezig, basisvelden) → bevestiging-dialog → Dexie-transactie wipe + bulk-insert.
- Bij mismatch: foutmelding zonder data te wijzigen.
**Deliverable:** export → wipe → import = identieke state.
**Review:** validatie weigert corrupte input; transactie atomic.

---

## Fase 6 — Polish & Deploy

### Stap 6.1 — UX polish 🔲
**Doel:** Bruikbaar in kou/regen.
**Acties:**
- Audit alle buttons ≥48x48px.
- Contrast-check.
- Loading/empty states voor lijsten.
- Bevestiging bij destructieve acties (delete speler, reset stopwatch tijdens running, import).
**Deliverable:** review-pass op mobiel device.
**Review:** geen kleine targets, duidelijke feedback.

### Stap 6.2 — GitHub Actions deploy 🔲
**Doel:** Auto-deploy naar GitHub Pages.
**Acties:**
- `.github/workflows/deploy.yml`: build + upload-pages-artifact + deploy-pages.
- `vite.config.ts` `base` matchen met repo-naam.
**Deliverable:** push naar `main` → live URL update.
**Review:** Pages-site laadt + werkt offline na eerste bezoek.

### Stap 6.3 — README + handmatig testscript 🔲
**Doel:** Reproduceerbare smoke-test.
**Acties:**
- `README.md` met install/dev/build/test commando's.
- `doc/test-script.md`: 10-stappen scenario (speler→match→3 beurten→goals→export/import→offline reload).
**Deliverable:** nieuwe gebruiker kan app draaien én verifiëren.
**Review:** scenario doorloopt zonder fouten.

---

## Eindverificatie v1 ✅
1. `npm run build` zonder errors/warnings.
2. `vue-tsc --noEmit` clean.
3. `npm test` alle units groen.
4. Lighthouse PWA-audit ≥90.
5. End-to-end handmatig testscript volledig OK.
6. Export/import roundtrip identiek.

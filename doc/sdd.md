# SDD: Jeugdvoetbal Coach Assistent (PWA)

## 1. Projectoverzicht
Een lichtgewicht Progressive Web App (PWA) voor voetbalcoaches om opstellingen te beheren en statistieken bij te houden op basis van "beurten". De app bevordert eerlijke speeltijd en spelerontwikkeling door voorkeursposities te monitoren.

### 1.1 Kernwaarden
* **Offline-first:** Geen internet nodig tijdens de wedstrijd.
* **Privacy:** Alle data blijft lokaal in de browser (IndexedDB). Geen encryptie at rest in v1 (lokaal device).
* **Eerlijkheid:** Data-gedreven suggesties voor wissels en posities.

---

## 2. Technisch Kader
* **Taal:** TypeScript (strict mode).
* **UI Framework:** Vue 3 (Composition API, `<script setup>`).
* **Build tool:** Vite.
* **Styling:** Plain CSS (CSS-variabelen voor theming).
* **Drag & Drop:** `vue-draggable-plus` (touch + mouse support).
* **Opslag:** IndexedDB via **Dexie.js** met expliciete schema-versionering.
* **PWA:** `vite-plugin-pwa` (Workbox) — precache van app shell, offline runtime cache.
* **Stopwatch:** Wake Lock API met graceful degradation.
* **Routing:** `vue-router` (hash mode i.v.m. GitHub Pages).
* **Testing:** Vitest (unit) voor pure libs (`suggester`, `stats`, `formations`).
* **Hosting:** GitHub Pages via GitHub Actions.
* **Architectuur:** Single Page Application (SPA) met Service Worker.

---

## 3. Data Ontwerp (TypeScript Interfaces)

Het datamodel volgt het principe **single source of truth**: alle statistieken worden afgeleid uit `Match` data, niet gedenormaliseerd op `Player`.

```typescript
export type Position = 'K' | 'V' | 'M' | 'A';
export type MatchType = 6 | 7 | 11;
export type MatchStatus = 'planned' | 'running' | 'paused' | 'finished';
export type EventType = 'goal' | 'assist';

// Singleton (id = 1) met competitie-brede instellingen.
export interface Settings {
  id?: number;
  periods: 2 | 4;            // 2 = helften, 4 = kwarten
  periodLengthMin: number;   // duur per periode in minuten
  defaultMatchType: MatchType;
  schemaVersion: number;     // gebruikt door import/export
}

export interface Player {
  id?: number;
  name: string;
  preferences: Position[];   // 0..3 items
}

export interface PositionAssignment {
  playerId: number;
  position: Position;
}

export interface Turn {
  startedAtSeconds: number;        // klok-stand bij start van de beurt
  endedAtSeconds: number | null;   // null = lopende beurt
  positions: PositionAssignment[]; // spelers in het veld; bench = impliciet
}

export interface MatchEvent {
  type: EventType;
  playerId: number;
  turnIndex: number;               // index in Match.turns op moment van registratie
}

export interface Match {
  id?: number;
  opponent: string;
  date: Date;
  type: MatchType;
  status: MatchStatus;
  currentPeriod: number;           // 1..Settings.periods
  elapsedSeconds: number;          // totaal verstreken klok over alle periodes
  turns: Turn[];                   // chronologisch
  events: MatchEvent[];
}
```

### 3.1 Afgeleide statistieken
Per `Player` worden de volgende waarden runtime berekend (zie `lib/stats.ts`):

| Stat | Berekening |
| --- | --- |
| `goals` | aantal `MatchEvent` met `type='goal'` en deze `playerId` over alle matches |
| `assists` | idem voor `type='assist'` |
| `totalTurns` | aantal `Turn`s waarin `playerId` voorkomt in `positions` |
| `preferredPosTurns` | idem, maar alleen wanneer `position ∈ player.preferences` |

### 3.2 Dexie schema (v2)
```typescript
db.version(1).stores({
  settings: '++id',
  players:  '++id, number',
  matches:  '++id, date, status'
});
// v2: rugnummer verwijderd; index op name.
db.version(2).stores({
  settings: '++id',
  players:  '++id, name',
  matches:  '++id, date, status'
}).upgrade(tx => tx.table('players').toCollection().modify(p => { delete p.number; }));
```
Toekomstige migraties via `db.version(n).upgrade(...)`.

---

## 4. Functioneel Ontwerp

### 4.1 Spelerbeheer
* Spelers aanmaken/bewerken/verwijderen met naam en max. 3 voorkeursposities (K, V, M, A).
* Validatie: max. 3 voorkeuren.
* Dashboard met afgeleide statistieken per speler.

### 4.2 Settings
* Aantal periodes (2 of 4) en duur per periode.
* Default speelvorm voor nieuwe wedstrijden.

### 4.3 Wedstrijd-setup
* Nieuwe wedstrijd: tegenstander, datum, speelvorm (default uit `Settings`).
* Status start als `planned`; gaat naar `running` zodra de stopwatch start.

### 4.4 Wedstrijdscherm (De Kern)
Dit scherm is geoptimaliseerd voor gebruik langs de lijn en bevat:

1. **Stopwatch Header**
   * Digitale klok (`MM:SS`) met huidige periode-indicator (bv. `P2 12:34`).
   * Knoppen: Start/Pauze toggle, Reset.
   * Bij bereiken van `periodLengthMin` → automatische pauze + bevestiging om naar volgende periode te gaan.
   * Schermwakker via Wake Lock API zolang stopwatch loopt.
2. **Visueel Veld (Drag & Drop)**
   * Zones op basis van `MatchType`:
     * **6v6:** 1xK, 2xV, 1xM, 2xA.
     * **7v7:** 1xK, 2xV, 2xM, 2xA.
     * **11v11:** 1xK, 4xV, 3xM, 3xA.
   * Spelers kunnen vanuit de bank naar een zone worden gesleept en onderling gewisseld.
   * Spelers op een voorkeurspositie krijgen een groene rand-highlight.
3. **Bench**
   * Impliciet: alle spelers die niet in `Turn.positions` staan.
4. **Actiebalk (Sticky Bottom)**
   * **⚽ Doelpunt:** modal met spelers in het veld → registreert `MatchEvent('goal')`.
   * **🅰️ Assist:** idem voor `'assist'`.
   * **🔄 Volgende beurt:** sluit huidige `Turn` (zet `endedAtSeconds`), opent nieuwe `Turn` met huidige formatie als startpunt.

### 4.5 Import & Export
* **Export:** Genereert `competitie_backup.json` met `{ schemaVersion, settings, players, matches }`.
* **Import:**
  1. Bestand kiezen.
  2. Validatie van `schemaVersion` en structuur (guards op verplichte velden/typen).
  3. Bevestigingsdialoog: *"Dit overschrijft alle huidige data."*
  4. Wipe + bulk-insert in één Dexie-transactie.

---

## 5. Logica & Algoritmes

### 5.1 Suggester voor opstelling (`lib/suggester.ts`)
Pure functie. Input: lijst spelers, doel-formatie (lijst posities), historische `totalTurns` en `preferredPosTurns`.

Procedure:
1. Sorteer spelers oplopend op `(totalTurns, preferredPosTurns)` — minst gespeeld + minst-op-voorkeur eerst.
2. Loop posities af (K eerst, dan V, M, A).
3. Voor elke positie: kies uit nog niet ingedeelde spelers eerst diegene voor wie deze positie in `preferences` staat; bij gelijkstand wint de hogere fairness-prioriteit.
4. Indien geen voorkeur-match: kies de speler met hoogste fairness-prioriteit ongeacht voorkeur.

Resultaat: `PositionAssignment[]` van lengte gelijk aan formatie.

### 5.2 Voorkeurspositie-tracker
Bij het sluiten van een `Turn`: voor elke `PositionAssignment` waarin `position ∈ player.preferences` telt 1 mee voor `preferredPosTurns` (afgeleid in `lib/stats.ts`).

### 5.3 Periode-overgang
Wanneer `elapsedSecondsBinnenPeriode >= periodLengthMin*60`:
* Stopwatch pauzeert automatisch.
* UI vraagt bevestiging om `currentPeriod++` te zetten.
* Bij laatste periode: knop wordt "Wedstrijd beëindigen" → `status='finished'`.

---

## 6. Gebruikersinterface (UX) Richtlijnen
* **Touch Targets:** Alle knoppen minimaal 48x48px voor bediening in kou/regen.
* **Visuele Feedback:** Spelers op voorkeurspositie krijgen een groene rand.
* **Data Integriteit:** Bevestigingsdialoog bij import en bij reset stopwatch tijdens lopende wedstrijd.
* **Geen notificaties.**

---

## 7. Requirements

### 7.1 Spelerbeheer & Ontwikkeling
* Als coach wil ik spelersnamen kunnen invoeren, zodat ik een overzichtelijk teamoverzicht heb.
* Als coach wil ik per speler maximaal 3 voorkeursposities (K, V, M, A) kunnen instellen.
* Als coach wil ik cumulatieve (afgeleide) statistieken per speler kunnen inzien.

### 7.2 Wedstrijdvoorbereiding
* Als coach wil ik een wedstrijd aanmaken met tegenstander en speelvorm (6v6, 7v7, 11v11).
* Als coach wil ik dat de app een opstelling voorstelt op basis van fairness (minste beurten eerst).
* Als coach wil ik aantal periodes en duur per periode kunnen instellen in Settings.

### 7.3 Live wedstrijd
* Als coach wil ik een stopwatch (start/pauze/reset) die ook bij periode-einde automatisch pauzeert.
* Als coach wil ik spelers via Drag & Drop op K/V/M/A posities slepen.
* Als coach wil ik met één knop een beurtwissel registreren.
* Als coach wil ik doelpunten en assists aan spelers koppelen.
* Als coach wil ik dat voorkeurspositie-beurten automatisch worden geteld.

### 7.4 Data & Beheer
* Als coach wil ik mijn data kunnen exporteren naar JSON.
* Als coach wil ik een JSON-bestand kunnen importeren (met overschrijf-bevestiging).

### 7.5 PWA & Tech
* De app moet offline werken (precache app shell).
* Alle data lokaal in IndexedDB.
* Installeerbaar als PWA vanaf het beginscherm.

### 7.6 Gebruikersinterface (UIR)
* **UIR-1:** Visueel veld met Drag & Drop.
* **UIR-2:** Stopwatch met Start/Pauze/Reset + periode-indicator.
* **UIR-3:** Sticky actiebalk voor goal/assist/volgende beurt.
* **UIR-4:** Posities als K/V/M/A.
* **UIR-5:** Formatie schaalt automatisch:
  * 6v6: 1K-2V-1M-2A
  * 7v7: 1K-2V-2M-2A
  * 11v11: 1K-4V-3M-3A

### 7.7 Non-Functioneel (NFR)
* **NFR-1:** PWA voor mobiel.
* **NFR-2:** Volledig offline bruikbaar.
* **NFR-3:** Opslag in IndexedDB (geen server).
* **NFR-4:** Broncode in TypeScript (strict).
* **NFR-5:** Geen notificaties.
* **NFR-6:** Hosting op gratis dienst (GitHub Pages).
* **NFR-7:** Touch targets ≥48x48px.

### 7.8 Statistieken (afgeleid per speler)
1. Totaal doelpunten.
2. Totaal assists.
3. Totaal aantal beurten.
4. Aantal beurten op voorkeurspositie.

---

## 8. Toekomstige Uitbreidingen (Niet in scope v1)
* Per-actie undo (via event-replay).
* Aanwezigheidslijst per wedstrijd.
* Delen van statistieken via Web Share API (WhatsApp).
* Meerdere competities tegelijk beheren (Competition-entiteit).
* Tijdstempels (minuut) bij goals/assists.

# Voetbal Assistentie

Een offline-first Progressive Web App (PWA) voor jeugdvoetbalcoaches om opstellingen te beheren en statistieken bij te houden op basis van "beurten". De app bevordert eerlijke speeltijd en spelerontwikkeling door voorkeursposities te monitoren.

## Kernwaarden

- **Offline-first** — geen internet nodig langs de lijn.
- **Privacy** — alle data blijft lokaal in de browser (IndexedDB), geen server.
- **Eerlijkheid** — data-gedreven suggesties voor wissels en posities.

## Functionaliteit (v1)

- **Spelerbeheer** met naam, rugnummer en max. 3 voorkeursposities (K/V/M/A).
- **Wedstrijden** in 6v6, 7v7 of 11v11 met automatische formatie-indeling.
- **Live wedstrijdscherm** met stopwatch (helften of kwarten), Drag & Drop opstelling, en sticky actiebalk voor goal/assist/beurtwissel.
- **Statistieken** afgeleid uit wedstrijddata: doelpunten, assists, gespeelde beurten en beurten op voorkeurspositie.
- **Import/Export** van alle data via JSON-backup.
- **Installeerbaar als PWA** vanaf het beginscherm, volledig offline bruikbaar.

## Technisch kader

| Onderdeel | Keuze |
| --- | --- |
| UI framework | Vue 3 + Composition API |
| Build tool | Vite |
| Taal | TypeScript (strict) |
| Styling | Plain CSS |
| Opslag | IndexedDB via Dexie.js |
| Drag & Drop | vue-draggable-plus |
| PWA | vite-plugin-pwa (Workbox) |
| Routing | vue-router (hash mode) |
| Tests | Vitest |
| Hosting | GitHub Pages |

## Projectstructuur

```
voetbal-assistentie/
├── doc/                    Documentatie
│   ├── sdd.md              Software Design Document
│   └── implementatieplan.md Stappenplan v1
├── src/                    Vue/Vite project
│   ├── src/                Broncode (componenten, views, db, lib)
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Aan de slag

```powershell
cd src
npm install
npm run dev
```

Build:

```powershell
npm run build
npm run preview
```

## Documentatie

- [Software Design Document](doc/sdd.md) — datamodel, architectuur en requirements.
- [Implementatieplan](doc/implementatieplan.md) — stap-voor-stap plan voor v1.

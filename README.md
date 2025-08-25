# Terrain World Editor (MVP)

Browser-basierter Editor für `data/world.json` (Places, Ways, Objects). **Schritt 1:** Minimale App zum Laden → Validieren → JSON-Roundtrip.

## Schnellstart

Voraussetzungen: Node.js 18+

```bash
npm i
npm run dev
```

Öffne die Dev-URL aus dem Terminal (typ. `http://localhost:5173/`).

## Was ist drin?

- **Vite + React + TypeScript**
- **Zod**-Schemata für `world.json`
- **Validator** inkl. referentieller Integrität & Callback-Check gemäß Vorgaben
- **UI (MVP)**: JSON-Datei laden, validieren, Issues anzeigen, JSON im Textfeld bearbeiten & erneut prüfen, Download

## Nächste Schritte

- Graph-Ansicht (React Flow)
- Inspector-Forms & CRUD
- Undo/Redo & Dirty-State
- Export im exakten Format
- Autocomplete & strikte Callback-Validierung (Registry erweiterbar unter `src/lib/callbacks.ts`)

# Terrain World Editor – v3.6

**Neu in v3.6**
- Vollständiges **Objects-Panel** (rechts) inkl. **Add/Edit**.
- **Object-Modal** (Create/Edit/Delete, Callbacks per Checkbox).
- **Drag & Drop** aus dem Objects-Panel in den **Place-Editor** (Chip-Zeile). Entfernen per × räumt beide Seiten auf.
- Way-Label-Toggle funktionsfähig, Graph bleibt wie gehabt (Zoom/Pan, Connect A→B = 2 Ways).

## Start
```bash
npm i
npm run dev
```

## Hinweise
- Save exportiert `world_with_editor_meta.json` inkl. `_editor.positions`.
- Callbacks werden als `"Module.Function"`-Strings gesetzt, Validierung warnt bei unbekannten Einträgen.
- Rename-Propagation für Places/Ways ist enthalten (Callnames aktuell read-only im Place-Modal).

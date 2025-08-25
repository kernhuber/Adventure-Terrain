# Terrain World Editor – v0.3 (Rename‑Propagation)

**Neu in diesem Inkrement**
- **Callname‑Bearbeitung** im Place‑Modal.
- **Rename‑Propagation**: Änderung des Callnames führt zu
  - neuem Place‑ID (`p_<slug>`), inkl. Update der `_editor.positions`
  - Neubenennung aller betroffenen Ways nach Schema `w_<src>_<dest>`
  - Aktualisierung aller Referenzen in `place_defs[*].ways`, `way_defs[*].source/destination`
- Toolbar‑Toggle: **Show/Hide Way Labels**

## Start
```bash
npm i
npm run dev
```

## Hinweise
- Kollisionen bei IDs werden mit Suffix `_1`, `_2`, … aufgelöst.
- `text_direction` bleibt bei Way‑Rename unverändert (kannst du im Way‑Modal anpassen).
- Nächste Schritte: Delete/Force‑Delete, Objekt‑Inspector, Runtime‑Export + Python‑Stub‑Bundle.

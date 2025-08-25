# Terrain World Editor – v0.3 (Delete & Force‑Delete)

**Neu in diesem Inkrement**
- **Delete / Force‑Delete** für Places (über Place‑Modal)
  - Normal Delete: nur erlaubt, wenn der Place keine eingehenden/ausgehenden Ways und keine referenzierenden Objects hat.
  - Force‑Delete: löscht zusätzlich alle verbundenen Ways, bereinigt `place_defs[*].ways`, entfernt besitzende Objects und Positionsdaten.
- **Delete** für Ways (über Way‑Modal), bereinigt automatisch `place_defs[source].ways`.
- Way‑Label‑Toggle weiterhin in der Toolbar.
- Bestehende Features bleiben: Rename‑Propagation (Callname → `p_…`, `w_…` & Referenzen), Doppelklick‑Overlays, Save mit `_editor.positions`.

## Start
```bash
npm i
npm run dev
```

## Als Nächstes (Vorschlag)
- **Object‑Inspector & CRUD** (Objects anlegen, umbennen, `ownedby` setzen, etc.)
- **Badges im Graph** (Fehler/Warnungen als Node/Edge‑Styles)
- **Runtime‑Export** ohne `_editor` + **Python‑Stub‑Bundle** bei gesetzten Prompt‑Checkboxen.

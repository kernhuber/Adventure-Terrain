# CLAUDE.md — Terrain World Editor

Web-based level editor (React + Vite + TypeScript) for the text-adventure game in
`../Adventure/`. Its sole job is to build and edit a world definition that the game
loads at runtime as `../Adventure/data/world.json`.

This is teaching material for an "Einführung in die KI" (Introduction to AI) course.
The editor's flaws are being addressed in deliberate, sequential **stages** — fix what
the current stage targets, record findings in memory, and don't rewrite future-stage
work ahead of time.

## Run / build

```bash
npm install
npm run dev      # vite dev server — does NOT typecheck
npm run build    # tsc -b && vite build — typechecks the whole src tree
npm run preview
```

- `npm run dev` works even when types are broken; always run `npx tsc --noEmit`
  before claiming a change is correct, because `npm run build` runs `tsc` first.

## Architecture

Entry: `index.html` → `src/main.tsx` → **`src/App.tsx`** (the one live App component).

- `src/App.tsx` — top-level UI/state (load/save/export, add place, connect places,
  opens the modals). Holds `world` + `positions` in React state.
- `src/types/world.ts` — Zod schemas + TS types for the world file. The schema
  (`WorldSchema`) is `passthrough()` and preserves `_editor.positions` for layout.
- `src/validation.ts` — `validateWorld()`; the live validator surfaced in the side panel.
- `src/lib/callbacks.ts` — `callbackRegistry` + `validateCallback()` (callback ref checks).
- `src/ui/` — `GraphView` (ReactFlow graph), `PlaceModal`, `WayModal`, `ObjectModal`,
  `ObjectPanel`.
- `src/utils/slugify.ts` — id slugging (matches the Python `slug()` in the game).

## The data contract with ../Adventure (read this before touching callbacks)

`world.json` has three record maps: `place_defs`, `way_defs`, `object_defs` (the editor
also adds `_editor.positions`, which the game ignores). Callback fields are stored as
`"module.function"` strings and resolved at runtime by
`../Adventure/services/world_loader.py` via the `module_map` in
`../Adventure/game_state.py`.

**Module names are snake_case** — the authoritative keys are:
`game_apply_functions`, `game_take_functions`, `game_reveal_functions`,
`game_obstruction_check_functions`, `place_prompts`, `object_prompts`, `way_prompts`.

A reference whose module isn't a `module_map` key silently resolves to `None` in the
game (no error). So getting module names exactly right matters.

Runtime function-name conventions (suffix per field):
- place `place_prompt_f`  → `p_<x>_place_prompt_f`
- object `prompt_f`       → `o_<x>_prompt_f`
- object `apply_f`        → `o_<x>_apply_f`  (also `_reveal_f`, `_take_f`)
- way `way_prompt_f`      → `w_<x>_prompt_f`
- way `obstruction_check` → `w_<x>_obstruction_check`

## Callback validation

`validateCallback` (`src/lib/callbacks.ts`) checks the `module.function` format and that
the module is one of the 7 snake_case modules above (the part that must match the runtime
to resolve). It does **not** hard-check that the function exists, because the game's own
function naming is inconsistent and a hardcoded allowlist goes stale. `callbackRegistry`
holds the real function names from `../Adventure/*.py` for autocomplete only — regenerate
it from those files when it drifts.

The PascalCase-vs-snake_case module mismatch that used to break this is fixed (see memory
note `editor-callback-naming-mismatch`). Callback function names follow `<id>_<field>`:
place `p_x_place_prompt_f`, object `o_x_apply_f` / `_reveal_f` / `_take_f` / `_prompt_f`,
way `w_x_prompt_f`, and obstruction `w_x_obstruction_check` (the game's legacy `_f`
obstruction names were renamed to this so the editor's generated suffix always matches).

## Export Runtime → Adventure stubs

"Export Runtime" downloads `world.json` plus `python_stubs.zip` (one stub file per
referenced callback module, with correct per-module signatures). The full round-trip —
unzip, run `../Adventure/apply_editor_stubs.py` (a wrapper around `missing_functions.py`)
to extract only the not-yet-implemented functions, then paste them into the real
modules — is documented in **`../Adventure/docs/EDITOR-RUNTIME-STUBS.md`**.

## Graph & WayModal (current behavior)

- `GraphView` draws **one line per pair of places**: white if bidirectional (ways exist
  both ways), orange with an arrow if one-way. Bidirectionality is decided by endpoints
  (a `D→S` way exists for an `S→D` way), not by guessing ids. Way labels were removed
  (cluttered); double-click an edge to edit.
- `WayModal` edits the **place-pair**: both directions, each with an enable checkbox
  (tick = create the way, untick = delete it) and an editable internal id plus a
  read-only "Suggested Way Name" + apply button. Each enabled callback shows a
  `CallbackStatus` badge (✓ exists in game / ⚠ not implemented), driven by
  `isKnownCallback` against `callbackRegistry`.

## Conventions

- IDs: places `p_`, ways `w_`, objects `o_`. Two places connected = **two** one-way
  `way_defs` (A→B and B→A), each listed in the source place's `ways`.
- German UI strings; keep them German.

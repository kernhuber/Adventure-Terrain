import React, { useMemo, useState } from 'react'
import { World } from '../types/world'
import { callbackRegistry } from '../lib/callbacks'
import { slugify } from '../utils/slugify'

type Props = {
  world: World
  wid: string
  open: boolean
  onClose: () => void
  onApply: (w: World) => void
}

function ensureUniqueId(baseId: string, exists: (id: string)=>boolean): string {
  let id = baseId
  let i = 2
  while (exists(id)) { id = `${baseId}_${i}`; i++ }
  return id
}

function normalizeWid(raw: string): string {
  const base = (raw || '').trim().replace(/^w_/, '')
  return 'w_' + slugify(base || 'weg')
}

export default function WayModal({ world, wid, open, onClose, onApply }: Props) {
  if (!open) return null
  const w = world.way_defs[wid]
  const [textDir, setTextDir] = useState(w.text_direction)
  const [description, setDescription] = useState(w.description ?? '')
  const [hasPromptF, setHasPromptF] = useState(!!w.way_prompt_f)
  const [hasObstruction, setHasObstruction] = useState(!!w.obstruction_check)

  // interner Name editierbar (Rename erfolgt beim Save)
  const [widText, setWidText] = useState<string>(wid)

  const promptOptions = useMemo(() => callbackRegistry.way_prompts, [])
  const obsOptions = useMemo(() => callbackRegistry.game_obstruction_check_functions, [])

  function handleDelete() {
    if (!confirm(`Way ${wid} wirklich löschen?`)) return
    const next: World = JSON.parse(JSON.stringify(world))

    // 1) Weg aus world.way_defs löschen
    delete next.way_defs[wid]

    // 2) Referenzen in allen place_defs[*].ways entfernen
    for (const [, pl] of Object.entries(next.place_defs)) {
      pl.ways = pl.ways.filter(x => x !== wid)
    }

    onApply(next)
    onClose()
  }

  function save() {
    const next: World = JSON.parse(JSON.stringify(world))

    // Feldwerte übernehmen
    next.way_defs[wid].text_direction = textDir
    next.way_defs[wid].description = description
    next.way_defs[wid].way_prompt_f = hasPromptF ? `way_prompts.${wid}_prompt_f` : null
    next.way_defs[wid].obstruction_check = hasObstruction ? `game_obstruction_check_functions.${wid}_obstruction_check` : null

    // Rename, falls internal id geändert wurde
    const desired = normalizeWid(widText)
    let newWid = wid
    if (desired !== wid) {
      // Kollision prüfen
      const unique = next.way_defs[desired] ? ensureUniqueId(desired, id => !!next.way_defs[id]) : desired

      // Datensatz umhängen
      const rec = { ...next.way_defs[wid] }
      delete next.way_defs[wid]
      next.way_defs[unique] = rec
      newWid = unique

      // Callback-Refs anpassen
      if (next.way_defs[newWid].way_prompt_f) {
        next.way_defs[newWid].way_prompt_f = `way_prompts.${newWid}_prompt_f`
      }
      if (next.way_defs[newWid].obstruction_check) {
        next.way_defs[newWid].obstruction_check = `game_obstruction_check_functions.${newWid}_obstruction_check`
      }

      // place_defs[*].ways remappen
      for (const [, pl] of Object.entries(next.place_defs)) {
        pl.ways = pl.ways.map(x => x === wid ? newWid : x)
      }
    }

    onApply(next)
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={(e)=>e.stopPropagation()} onMouseDown={(e)=>e.stopPropagation()}>
        <h2>Way: <code>{wid}</code></h2>

        <div className="row">
          <label>internal id</label>
          <input
            type="text"
            value={widText}
            onChange={(e)=>setWidText(e.target.value)}
            placeholder="z.B. w_labor_flur"
          />
        </div>

        <div className="row">
          <label>text_direction</label>
          <input type="text" value={textDir} onChange={e=>setTextDir(e.target.value)} />
        </div>

        <div className="row">
          <label>description</label>
          <input type="text" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>

        <div className="row">
          <label>way_prompt_f</label>
          <input
            type="checkbox"
            checked={hasPromptF}
            onChange={e=>setHasPromptF(e.target.checked)}
          />
          {hasPromptF && <code style={{ marginLeft: 8 }}>way_prompts.{normalizeWid(widText)}_prompt_f</code>}
        </div>

        <div className="row">
          <label>obstruction_check</label>
          <input
            type="checkbox"
            checked={hasObstruction}
            onChange={e=>setHasObstruction(e.target.checked)}
          />
          {hasObstruction && <code style={{ marginLeft: 8 }}>game_obstruction_check_functions.{normalizeWid(widText)}_obstruction_check</code>}
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          Autocomplete Registry — way_prompts: [{promptOptions.join(', ')}]; game_obstruction_check_functions: [{obsOptions.join(', ')}]
        </div>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="danger" onClick={handleDelete} title="Way löschen">Delete</button>
          <div>
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
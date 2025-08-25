import React, { useState } from 'react'
import { World } from '../types/world'
import { slugify } from '../utils/slugify'

type Props = {
  placeId: string
  world: World
  open: boolean
  onClose: () => void
  onApply: (next: World) => void
  onDelete: (placeId: string, force?: boolean) => void
}

export default function PlaceModal({ placeId, world, open, onClose, onApply, onDelete }: Props) {
  if (!open) return null
  const p = world.place_defs[placeId]
  const [callname, setCallname] = useState(p.callnames?.[0] ?? placeId.replace(/^p_/, ''))
  const [description, setDescription] = useState(p.description)
  const [placePrompt, setPlacePrompt] = useState(p.place_prompt ?? '')
  const [hasPromptF, setHasPromptF] = useState(!!p.place_prompt_f)

  function handleSave() {
    const next: World = JSON.parse(JSON.stringify(world))

    // callname change → rename place id & propagate
    const newSlug = slugify(callname)
    const newPidBase = 'p_' + newSlug
    let newPid = newPidBase; let i=1
    while (next.place_defs[newPid] && newPid !== placeId) { newPid = newPidBase + '_' + i; i++ }

    const wantRename = newPid !== placeId
    if (wantRename) {
      // move entry
      next.place_defs[newPid] = next.place_defs[placeId]
      delete next.place_defs[placeId]
      // update callnames
      next.place_defs[newPid].callnames = [callname]

      // update ways (ids + endpoints)
      const newWayDefs: typeof next.way_defs = {}
      for (const [wid, w] of Object.entries(next.way_defs)) {
        let newW = { ...w }
        let newId = wid
        const srcId = w.source === placeId ? newPid : w.source
        const dstId = w.destination === placeId ? newPid : w.destination
        if (srcId !== w.source || dstId !== w.destination) {
          // recompute id from first callnames
          const srcCN = next.place_defs[srcId].callnames?.[0] ?? srcId.replace(/^p_/, '')
          const dstCN = next.place_defs[dstId].callnames?.[0] ?? dstId.replace(/^p_/, '')
          const base = `w_${slugify(srcCN)}_${slugify(dstCN)}`
          let cand = base; let j=1
          while (next.way_defs[cand] && cand !== wid) { cand = base + '_' + j; j++ }
          newId = cand
          newW.source = srcId
          newW.destination = dstId
        }
        newWayDefs[newId] = newW
      }
      next.way_defs = newWayDefs

      // update place.ways lists to reflect new ids
      for (const [pid, pd] of Object.entries(next.place_defs)) {
        pd.ways = Object.entries(next.way_defs)
          .filter(([wid, w]) => w.source === pid)
          .map(([wid]) => wid)
      }
    } else {
      next.place_defs[placeId].callnames = [callname]
    }

    const id = wantRename ? newPid : placeId
    next.place_defs[id].description = description
    next.place_defs[id].place_prompt = placePrompt
    next.place_defs[id].place_prompt_f = hasPromptF ? `PlacePrompts.${id}_place_prompt_f` : null
    onApply(next)
    onClose()
  }

  function confirmDelete(force?: boolean) {
    if (!force) {
      if (!window.confirm(`Place '${placeId}': löschen?`)) return
    } else {
      if (!window.confirm(`Place '${placeId}' mit ALLEN referenzierenden Ways/Objekten löschen?`)) return
    }
    onDelete(placeId, force)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h2>Place: <code>{placeId}</code></h2>
        <div className="row">
          <label>callname</label>
          <input type="text" value={callname} onChange={e=>setCallname(e.target.value)} />
        </div>
        <div className="row">
          <label>description</label>
          <input type="text" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <div className="row">
          <label>place_prompt</label>
          <input type="text" value={placePrompt} onChange={e=>setPlacePrompt(e.target.value)} />
        </div>
        <div className="row">
          <label>place_prompt_f</label>
          <input type="checkbox" checked={hasPromptF} onChange={e=>setHasPromptF(e.target.checked)} />
          {hasPromptF && <code style={{marginLeft:8}}>PlacePrompts.{placeId}_place_prompt_f</code>}
        </div>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div>
            <button className="danger" onClick={()=>confirmDelete(false)}>Delete</button>
            <button className="danger" onClick={()=>confirmDelete(true)} style={{marginLeft:8}}>Force Delete</button>
          </div>
          <div>
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave}>Save</button>
          </div>
        </div>
        <div className="muted" style={{marginTop:8}}>Normal Delete: nur wenn keine Ways/Objects referenzieren. Force Delete: entfernt Ways, referentielle Einträge und Positionsdaten automatisch.</div>
      </div>
    </div>
  )
}

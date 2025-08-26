import React, { useState } from 'react'
import { World } from '../types/world'
import { slugify } from '../utils/slugify'

type Props = {
  placeId: string
  world: World
  open: boolean
  onClose: () => void
  onApply: (next: World) => void
}

function computeWayId(w: World, sourcePid: string, targetPid: string): string {
  const sc = (w.place_defs[sourcePid].callnames?.[0] ?? sourcePid.replace(/^p_/, ''))
  const tc = (w.place_defs[targetPid].callnames?.[0] ?? targetPid.replace(/^p_/, ''))
  return `w_${slugify(sc)}_${slugify(tc)}`
}

export default function PlaceModal({ placeId, world, open, onClose, onApply }: Props) {
  if (!open) return null
  const p = world.place_defs[placeId]
  const [description, setDescription] = useState(p.description)
  const [placePrompt, setPlacePrompt] = useState(p.place_prompt ?? '')
  const [hasPromptF, setHasPromptF] = useState(!!p.place_prompt_f)
  const [callnamesText, setCallnamesText] = useState((p.callnames?.join(', ') ?? ''))

  const assigned = p.objects

  function persistCommon(next: World, pid: string) {
    next.place_defs[pid].description = description
    next.place_defs[pid].place_prompt = placePrompt
    next.place_defs[pid].place_prompt_f = hasPromptF ? `PlacePrompts.${pid}_place_prompt_f` : null
  }

  function renamePlaceIfNeeded() {
    const list = callnamesText.split(',').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) return
    const newPid = `p_${slugify(list[0])}`

    if (newPid === placeId) {
      // nur callnames + Felder aktualisieren
      const next: World = JSON.parse(JSON.stringify(world))
      next.place_defs[placeId].callnames = list
      persistCommon(next, placeId)
      onApply(next)
      return
    }

    // Deep Rename
    const next: World = JSON.parse(JSON.stringify(world))

    // 1) Place verschieben/umbenennen
    const original = next.place_defs[placeId]
    delete next.place_defs[placeId]
    next.place_defs[newPid] = { ...original, callnames: list }

    // 2) Gemeinsame Felder + place_prompt_f an neue ID koppeln
    persistCommon(next, newPid)

    // 3) Objects: ownedby anpassen
    for (const o of Object.values(next.object_defs)) {
      if (o.ownedby === placeId) o.ownedby = newPid
    }

    // 4) Ways: Endpunkte + IDs + Callback-Refs anpassen
    const widMap: Record<string, string> = {}
    for (const [wid, w] of Object.entries({ ...next.way_defs })) {
      if (w.source === placeId || w.destination === placeId) {
        const newSource = w.source === placeId ? newPid : w.source
        const newDest = w.destination === placeId ? newPid : w.destination
        next.way_defs[wid].source = newSource
        next.way_defs[wid].destination = newDest

        const newWid = computeWayId(next, newSource, newDest)
        if (newWid !== wid) {
          const wrec = { ...next.way_defs[wid] }
          delete next.way_defs[wid]
          next.way_defs[newWid] = wrec
          widMap[wid] = newWid

          // zugehörige Way-Callbacks umbenennen (falls vorhanden)
          if (next.way_defs[newWid].way_prompt_f) {
            next.way_defs[newWid].way_prompt_f = `WayPrompts.${newWid}_prompt_f`
          }
          if (next.way_defs[newWid].obstruction_check) {
            next.way_defs[newWid].obstruction_check = `GameObstructionCheckFunctions.${newWid}_obstruction_check`
          }
        }
      }
    }

    // 5) Alle places[*].ways-Arrays gegen neue Way-IDs mappen
    for (const [, pl] of Object.entries(next.place_defs)) {
      pl.ways = pl.ways.map(wid => widMap[wid] ?? wid)
    }

    onApply(next)
  }

  function handleSave() {
    // Falls nur Felder geändert wurden; Rename passiert bereits onBlur des callnames-Feldes
    const next: World = JSON.parse(JSON.stringify(world))
    const list = callnamesText.split(',').map(s => s.trim()).filter(Boolean)
    if (list.length) {
      next.place_defs[placeId].callnames = list
    }
    persistCommon(next, placeId)
    onApply(next)
    onClose()
  }

  function unassign(oid: string) {
    const next: World = JSON.parse(JSON.stringify(world))
    next.place_defs[placeId].objects = next.place_defs[placeId].objects.filter(x => x !== oid)
    if (next.object_defs[oid]) next.object_defs[oid].ownedby = null
    onApply(next)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const oid = e.dataTransfer.getData('text/plain')
    if (!oid || !world.object_defs[oid]) return
    const next: World = JSON.parse(JSON.stringify(world))
    const prevOwner = next.object_defs[oid].ownedby
    if (prevOwner && next.place_defs[prevOwner]) {
      next.place_defs[prevOwner].objects = next.place_defs[prevOwner].objects.filter(x => x !== oid)
    }
    if (!next.place_defs[placeId].objects.includes(oid)) next.place_defs[placeId].objects.push(oid)
    next.object_defs[oid].ownedby = placeId
    onApply(next)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h2>Place: <code>{placeId}</code></h2>

        <div className="row">
          <label>callnames</label>
          <input
            type="text"
            value={callnamesText}
            onChange={e=>setCallnamesText(e.target.value)}
            onBlur={renamePlaceIfNeeded}
            placeholder="z.B. Beginn, Startpunkt"
          />
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

        <div className="row" style={{alignItems:'flex-start'}}>
          <label>Objects</label>
          <div className="chipbar" onDragOver={(e)=>e.preventDefault()} onDrop={onDrop}>
            {assigned.map(oid => (
              <span className="chip" key={oid}>
                {(world.object_defs[oid]?.callnames?.[0]) ?? oid.replace(/^o_/, '')}
                <button onClick={()=>unassign(oid)} title="Remove">×</button>
              </span>
            ))}
            {assigned.length === 0 && <span className="muted">— nichts zugewiesen —</span>}
          </div>
        </div>

        <div className="row" style={{justifyContent:'flex-end'}}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
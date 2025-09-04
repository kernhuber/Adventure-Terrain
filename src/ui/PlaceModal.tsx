import React, { useMemo, useState } from 'react'
import { World } from '../types/world'
import { slugify } from '../utils/slugify'

type Props = {
  placeId: string
  world: World
  open: boolean
  onClose: () => void
  onApply: (next: World) => void
  /** optional: notify app layer to remap positions when pid changes */
  onRenamed?: (oldPid: string, newPid: string) => void
}

function computeWayId(w: World, sourcePid: string, targetPid: string): string {
  const sc = (w.place_defs[sourcePid].callnames?.[0] ?? sourcePid.replace(/^p_/, ''))
  const tc = (w.place_defs[targetPid].callnames?.[0] ?? targetPid.replace(/^p_/, ''))
  return `w_${slugify(sc)}_${slugify(tc)}`
}

export default function PlaceModal({ placeId, world, open, onClose, onApply, onRenamed }: Props) {
  if (!open) return null
  const p = world.place_defs[placeId]
  const [description, setDescription] = useState(p.description)
  const [placePrompt, setPlacePrompt] = useState(p.place_prompt ?? '')
  const [hasPromptF, setHasPromptF] = useState(!!p.place_prompt_f)
  const [callnamesText, setCallnamesText] = useState((p.callnames?.join(', ') ?? ''))
  const [pidText, setPidText] = useState(placeId)

  const assigned = p.objects

  function persistCommon(next: World, pid: string) {
    next.place_defs[pid].description = description
    next.place_defs[pid].place_prompt = placePrompt
    next.place_defs[pid].place_prompt_f = hasPromptF ? `PlacePrompts.${pid}_place_prompt_f` : null
  }

  /** Auto-Rename aus dem 1. Callname */
  function renamePlaceIfNeeded() {
    const list = callnamesText.split(',').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) return
    const candidate = `p_${slugify(list[0])}`
    if (candidate === placeId) {
      const next: World = JSON.parse(JSON.stringify(world))
      next.place_defs[placeId].callnames = list
      persistCommon(next, placeId)
      onApply(next)
      setPidText(placeId)
      return
    }
    renameToPid(candidate, /*alsoUpdateCallnames*/ list)
  }

  /** Explizites Rename auf Ziel-PID (z. B. aus dem „internal id“-Feld), optional neue Callnames */
  function renameToPid(targetPid: string, callnamesList?: string[]) {
    const norm = `p_${slugify(targetPid.replace(/^p_/, ''))}`
    if (!norm || norm === placeId) {
      // ggf. nur callnames aktualisieren
      if (callnamesList) {
        const next: World = JSON.parse(JSON.stringify(world))
        next.place_defs[placeId].callnames = callnamesList
        persistCommon(next, placeId)
        onApply(next)
      }
      setPidText(placeId)
      return
    }
    if (world.place_defs[norm]) {
      alert(`ID ${norm} existiert bereits.`)
      setPidText(placeId)
      return
    }

    // Deep Rename
    const next: World = JSON.parse(JSON.stringify(world))

    const original = next.place_defs[placeId]
    delete next.place_defs[placeId]
    next.place_defs[norm] = {
      ...original,
      ...(callnamesList ? { callnames: callnamesList } : {})
    }

    // Positions remap
    const pos = (next as any)._editor?.positions
    if (pos && pos[placeId]) {
      pos[norm] = pos[placeId]
      delete pos[placeId]
    }

    // gemeinsame Felder / callbacks
    persistCommon(next, norm)

    // Objects: ownedby anpassen
    for (const o of Object.values(next.object_defs)) {
      if (o.ownedby === placeId) o.ownedby = norm
    }

    // Ways: Endpunkte + optional IDs/Callback-Refs umbenennen (per Nachfrage)
    const shouldRenameWays = confirm(
      'Auch die verbundenen Wege nach Schema umbenennen?\n' +
      '• Ja: Way-IDs werden neu generiert (überschreibt manuelle Anpassungen),\n' +
      '• Nein: Way-IDs bleiben erhalten; es werden nur source/destination aktualisiert.'
    )
    const widMap: Record<string, string> = {}
    for (const [wid, w] of Object.entries({ ...next.way_defs })) {
      if (w.source === placeId || w.destination === placeId) {
        const newSource = w.source === placeId ? norm : w.source
        const newDest   = w.destination === placeId ? norm : w.destination
        next.way_defs[wid].source = newSource
        next.way_defs[wid].destination = newDest

        if (shouldRenameWays) {
          const newWid = computeWayId(next, newSource, newDest)
          if (newWid !== wid) {
            const wrec = { ...next.way_defs[wid] }
            delete next.way_defs[wid]
            next.way_defs[newWid] = wrec
            widMap[wid] = newWid

            // Callback-Refs an neue ID koppeln
            if (next.way_defs[newWid].way_prompt_f) {
              next.way_defs[newWid].way_prompt_f = `WayPrompts.${newWid}_prompt_f`
            }
            if (next.way_defs[newWid].obstruction_check) {
              next.way_defs[newWid].obstruction_check = `GameObstructionCheckFunctions.${newWid}_obstruction_check`
            }
          }
        }
      }
    }

    // places[*].ways remappen (nur wenn wir umbenannt haben, ist widMap befüllt;
    // ansonsten bleibt alles wie zuvor)
    for (const [, pl] of Object.entries(next.place_defs)) {
      pl.ways = pl.ways.map(wid => widMap[wid] ?? wid)
    }

    onRenamed?.(placeId, norm)
    onApply(next)
    setPidText(norm)
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
    const oid = e.dataTransfer.getData('text/oid') || e.dataTransfer.getData('text/plain')
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

  function handleDelete() {
    if (!confirm(`Diesen Place ${placeId} und alle referenzierten Wege löschen?`)) return
    const next: World = JSON.parse(JSON.stringify(world))

    // 1) Ways sammeln, die den Place berühren
    const removeWids: string[] = []
    for (const [wid, w] of Object.entries(next.way_defs)) {
      if (w.source === placeId || w.destination === placeId) removeWids.push(wid)
    }
    // 2) Ways löschen
    for (const wid of removeWids) delete next.way_defs[wid]
    // 3) Aus allen place_defs[*].ways entfernen
    for (const [, pl] of Object.entries(next.place_defs)) {
      pl.ways = pl.ways.filter(wid => !removeWids.includes(wid))
    }
    // 4) Objekten die Ownership entziehen
    for (const o of Object.values(next.object_defs)) {
      if (o.ownedby === placeId) o.ownedby = null
    }
    // 5) Editor-Position entfernen
    const pos = (next as any)._editor?.positions
    if (pos && pos[placeId]) delete pos[placeId]
    // 6) Place löschen
    delete next.place_defs[placeId]

    onApply(next)
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
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
          <label>internal id</label>
          <input
            type="text"
            value={pidText}
            onChange={(e)=>setPidText(e.target.value)}
            onBlur={()=>renameToPid(pidText)}
            placeholder="z.B. p_beginn"
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

        <div
          className="row place-objects-dropzone"
          style={{alignItems:'flex-start'}}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
          }}
          onDrop={onDrop}
        >
          <label>Objects</label>
          <div className="chipbar">
            {assigned.map(oid => (
              <span className="chip" key={oid}>
                {(world.object_defs[oid]?.callnames?.[0]) ?? oid.replace(/^o_/, '')}
                <button onClick={()=>unassign(oid)} title="Remove">×</button>
              </span>
            ))}
            {assigned.length === 0 && <span className="muted">— nichts zugewiesen —</span>}
          </div>
          <p className="drop-hint" style={{marginLeft:8, opacity:0.7}}>
            Ziehe Objekte aus der rechten Liste hierher
          </p>
        </div>

        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <button className="danger" onClick={handleDelete} title="Place löschen">Delete</button>
          <div>
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
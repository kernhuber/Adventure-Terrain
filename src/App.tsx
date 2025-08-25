import React, { useMemo, useRef, useState } from 'react'
import { WorldSchema, World, EditorMeta } from './types/world'
import { validateWorld } from './validation'
import { slugify } from './utils/slugify'
import GraphView from './ui/GraphView'
import PlaceModal from './ui/PlaceModal'
import WayModal from './ui/WayModal'
import sampleJson from '../public/sample_world.json?raw'

type Issue = ReturnType<typeof validateWorld>[number]

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [world, setWorld] = useState<World | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [positions, setPositions] = useState<Record<string, {x:number,y:number}>>({})
  const [placeModal, setPlaceModal] = useState<string | null>(null)
  const [wayModal, setWayModal] = useState<string | null>(null)
  const [showWayLabels, setShowWayLabels] = useState(true)

  const counts = useMemo(() => {
    if (!world) return null
    return {
      places: Object.keys(world.place_defs).length,
      ways: Object.keys(world.way_defs).length,
      objects: Object.keys(world.object_defs).length,
    }
  }, [world])

  function chooseFile() { fileInputRef.current?.click() }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const obj = JSON.parse(text)
        const parsed = WorldSchema.parse(obj)
        setWorld(parsed)
        const meta: EditorMeta | undefined = (obj._editor as any)
        setPositions(meta?.positions ?? {})
        setIssues(validateWorld(parsed))
      } catch (err: any) {
        setWorld(null)
        setIssues([{ severity: 'error', code: 'json.parse', message: err.message } as any])
      }
    }
    reader.readAsText(file)
  }

  function handleLoadSample() {
    try {
      const obj = JSON.parse(sampleJson)
      const parsed = WorldSchema.parse(obj)
      setWorld(parsed)
      setPositions((obj._editor && obj._editor.positions) || {})
      setIssues(validateWorld(parsed))
    } catch (err: any) {
      setIssues([{ severity: 'error', code: 'sample.load', message: err.message } as any])
    }
  }

  function handleDownload() {
    if (!world) return
    const payload = { ...world, _editor: { positions } }
    const content = JSON.stringify(payload, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'world_with_editor_meta.json'
    document.body.appendChild(a)
    a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  function ensureUniqueId(baseId: string, exists: (id: string)=>boolean): string {
    let id = baseId
    let i = 1
    while (exists(id)) {
      id = baseId + '_' + i
      i++
    }
    return id
  }

  function addPlace() {
    if (!world) return
    const baseCall = 'Neuer Platz'
    const existing = Object.values(world.place_defs).map(p => p.callnames?.[0] ?? '')
    let callname = baseCall
    let idx = 1
    while (existing.includes(callname)) { callname = baseCall + ' ' + idx; idx++ }
    const slug = slugify(callname)
    const pidBase = 'p_' + slug
    const pid = ensureUniqueId(pidBase, (id)=> !!world.place_defs[id])
    const next: World = JSON.parse(JSON.stringify(world))
    next.place_defs[pid] = {
      description: '',
      place_prompt: '',
      place_prompt_f: null,
      callnames: [callname],
      ways: [],
      objects: []
    }
    setWorld(next)
    setPositions({ ...positions, [pid]: { x: 80, y: 80 } })
    setIssues(validateWorld(next))
  }

  function rebuildWayId(w: {source: string, destination: string}): string {
    if (!world) return 'w_invalid'
    const sc = world.place_defs[w.source].callnames?.[0] ?? w.source.replace(/^p_/, '')
    const dc = world.place_defs[w.destination].callnames?.[0] ?? w.destination.replace(/^p_/, '')
    const sslug = slugify(sc)
    const dslug = slugify(dc)
    return `w_${sslug}_${dslug}`
  }

  function onConnectPlaces(sourceId: string, targetId: string) {
    if (!world) return
    const sc = (world.place_defs[sourceId].callnames?.[0] ?? sourceId.replace(/^p_/, ''))
    const tc = (world.place_defs[targetId].callnames?.[0] ?? targetId.replace(/^p_/, ''))
    const sslug = slugify(sc)
    const tslug = slugify(tc)
    const wid1 = ensureUniqueId(`w_${sslug}_${tslug}`, (id)=> !!world.way_defs[id])
    const wid2 = ensureUniqueId(`w_${tslug}_${sslug}`, (id)=> !!world.way_defs[id])

    const next: World = JSON.parse(JSON.stringify(world))
    if (!next.way_defs[wid1]) {
      next.way_defs[wid1] = { source: sourceId, destination: targetId, text_direction: `zu ${tc}`, description: '', obstruction_check: null, way_prompt_f: null }
      next.place_defs[sourceId].ways.push(wid1)
    }
    if (!next.way_defs[wid2]) {
      next.way_defs[wid2] = { source: targetId, destination: sourceId, text_direction: `zu ${sc}`, description: '', obstruction_check: null, way_prompt_f: null }
      next.place_defs[targetId].ways.push(wid2)
    }
    setWorld(next)
    setIssues(validateWorld(next))
  }

  function renamePlaceAndPropagate(oldPid: string, newCallname: string, description: string, placePrompt: string, hasPromptF: boolean) {
    if (!world) return
    const newSlug = slugify(newCallname)
    const basePid = 'p_' + newSlug
    const newPid = ensureUniqueId(basePid, (id)=> !!world.place_defs[id] && id !== oldPid)

    const next: World = JSON.parse(JSON.stringify(world))

    // 1) move place entry
    const place = { ...next.place_defs[oldPid] }
    place.callnames = [newCallname]
    place.description = description
    place.place_prompt = placePrompt
    place.place_prompt_f = hasPromptF ? `PlacePrompts.${newPid}_place_prompt_f` : null
    next.place_defs[newPid] = place
    delete next.place_defs[oldPid]

    // 2) positions key
    const pos = positions[oldPid]
    const nextPositions = { ...positions }
    if (pos) {
      nextPositions[newPid] = pos
      delete nextPositions[oldPid]
    }

    // Helper to replace way id in all place_defs[*].ways arrays
    function replaceWayIdEverywhere(oldWid: string, newWid: string) {
      for (const [pid, p] of Object.entries(next.place_defs)) {
        const idx = p.ways.indexOf(oldWid)
        if (idx >= 0) {
          p.ways.splice(idx, 1, newWid)
        }
      }
    }

    // 3) update way_defs source/dest and rename IDs if needed
    const newWayDefs: World['way_defs'] = {}
    for (const [wid, w] of Object.entries(next.way_defs)) {
      let updated = { ...w }
      if (w.source === oldPid) updated.source = newPid
      if (w.destination === oldPid) updated.destination = newPid
      const suggestedId = rebuildWayId(updated)
      let finalWid = wid
      if (suggestedId !== wid) {
        finalWid = ensureUniqueId(suggestedId, (id)=> !!newWayDefs[id] || !!next.way_defs[id])
        replaceWayIdEverywhere(wid, finalWid)
      }
      newWayDefs[finalWid] = {
        ...updated,
        // keep other fields; update text_direction heuristically if pointing to new place
        text_direction: updated.text_direction
      }
    }
    next.way_defs = newWayDefs

    setWorld(next)
    setPositions(nextPositions)
    setIssues(validateWorld(next))
    setPlaceModal(newPid) // keep modal open conceptually on new id (optional)
  }

  function openPlace(pid: string) { setPlaceModal(pid) }
  function openWay(wid: string) { setWayModal(wid) }

  function applyWorld(next: World) {
    setWorld(next)
    setIssues(validateWorld(next))
  }

  return (<>
    <header>
      <div className="toolbar">
        <button className="primary" onClick={chooseFile}>Load</button>
        <button onClick={handleLoadSample}>Load Sample</button>
        <button onClick={handleDownload} disabled={!world}>Save</button>
        <button onClick={addPlace} disabled={!world}>Add Place</button>
        <button onClick={() => setShowWayLabels(v => !v)} disabled={!world}>
            {showWayLabels ? 'Hide Way Labels' : 'Show Way Labels'}
        </button>
        <div className="right">
          {world && <span className="pill">{Object.keys(world.place_defs).length} places • {Object.keys(world.way_defs).length} ways • {Object.keys(world.object_defs).length} objects</span>}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileChange} />
    </header>
    <main>
      <div id="canvas">
        {world ? (
            <GraphView
              world={world}
              positions={positions}
              onPositionsChange={setPositions}
              onConnectPlaces={onConnectPlaces}
              onNodeDoubleClick={openPlace}
              onEdgeDoubleClick={openWay}
              showWayLabels={showWayLabels}
            />
        ) : (
          <div style={{padding:'24px'}}>
            <p>Starte mit <b>Load</b> (lade deine <code>world.json</code>) oder <b>Load Sample</b>.</p>
          </div>
        )}
      </div>
      <div className="side">
        <div className="card">
          <h3>Validation</h3>
          <div className="issues">
            {issues.length === 0 && <div className="muted">Keine Issues.</div>}
            {issues.map((it, idx) => (
              <div key={idx} className={"issue " + it.severity}>
                <strong>{it.severity.toUpperCase()}</strong> • <code>{it.code}</code><br/>
                <span>{it.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
    {placeModal && world && (
      <PlaceModal
        placeId={placeModal}
        world={world}
        open={true}
        onClose={() => setPlaceModal(null)}
        onApply={applyWorld}
        onRenameCallname={renamePlaceAndPropagate}
      />
    )}
    {wayModal && world && (
      <WayModal
        wayId={wayModal}
        world={world}
        open={true}
        onClose={() => setWayModal(null)}
        onApply={applyWorld}
      />
    )}
  </>)
}

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
    let id = baseId, i = 1
    while (exists(id)) { id = baseId + '_' + i; i++ }
    return id
  }

  function addPlace() {
    if (!world) return
    const baseCall = 'Neuer Platz'
    const existing = Object.values(world.place_defs).map(p => p.callnames?.[0] ?? '')
    let callname = baseCall
    let idx = 1
    while (existing.includes(callname)) { callname = baseCall + ' ' + idx; idx++ }
    const pid = ensureUniqueId('p_' + slugify(callname), id => !!world.place_defs[id])
    const next: World = JSON.parse(JSON.stringify(world))
    next.place_defs[pid] = { description:'', place_prompt:'', place_prompt_f:null, callnames:[callname], ways:[], objects:[] }
    setWorld(next)
    setPositions({ ...positions, [pid]: { x: 100, y: 100 } })
    setIssues(validateWorld(next))
  }

  function onConnectPlaces(sourceId: string, targetId: string) {
    if (!world) return
    const sc = (world.place_defs[sourceId].callnames?.[0] ?? sourceId.replace(/^p_/, ''))
    const tc = (world.place_defs[targetId].callnames?.[0] ?? targetId.replace(/^p_/, ''))
    const wid1 = ensureUniqueId(`w_${slugify(sc)}_${slugify(tc)}`, id=>!!world.way_defs[id])
    const wid2 = ensureUniqueId(`w_${slugify(tc)}_${slugify(sc)}`, id=>!!world.way_defs[id])
    const next: World = JSON.parse(JSON.stringify(world))
    if (!next.way_defs[wid1]) { next.way_defs[wid1] = { source: sourceId, destination: targetId, text_direction: `zu ${tc}`, description: '', obstruction_check: null, way_prompt_f: null }; next.place_defs[sourceId].ways.push(wid1) }
    if (!next.way_defs[wid2]) { next.way_defs[wid2] = { source: targetId, destination: sourceId, text_direction: `zu ${sc}`, description: '', obstruction_check: null, way_prompt_f: null }; next.place_defs[targetId].ways.push(wid2) }
    setWorld(next); setIssues(validateWorld(next))
  }

  function openPlace(pid: string) { setPlaceModal(pid) }
  function openWay(wid: string) { setWayModal(wid) }

  function applyWorld(next: World) { setWorld(next); setIssues(validateWorld(next)) }

  // DELETE HELPERS
  function canDeletePlace(pid: string, w: World): boolean {
    const pd = w.place_defs[pid]
    const hasOutgoing = pd.ways.length > 0
    const hasIncoming = Object.values(w.way_defs).some(way => way.destination === pid)
    const hasOwnedObjects = Object.values(w.object_defs).some(o => o.ownedby === pid) || (pd.objects.length > 0)
    return !hasOutgoing && !hasIncoming && !hasOwnedObjects
  }

  function deletePlace(placeId: string, force?: boolean) {
    if (!world) return
    const next: World = JSON.parse(JSON.stringify(world))
    if (!force && !canDeletePlace(placeId, next)) {
      alert("Delete abgelehnt: Place hat noch Ways oder Objects. Nutze Force Delete.")
      return
    }
    // Remove ways connected to place
    for (const [wid, w] of Object.entries({ ...next.way_defs })) {
      if (w.source === placeId || w.destination === placeId) {
        delete next.way_defs[wid]
      }
    }
    // Cleanup place.ways arrays
    for (const pd of Object.values(next.place_defs)) {
      pd.ways = pd.ways.filter(wid => wid in next.way_defs)
    }
    // Cleanup objects referencing place
    for (const [oid, o] of Object.entries(next.object_defs)) {
      if (o.ownedby === placeId) {
        if (force) {
          delete next.object_defs[oid]
        } else {
          o.ownedby = null
        }
      }
    }
    // Remove place itself and its position
    delete next.place_defs[placeId]
    const pos = { ...positions }; delete pos[placeId]; setPositions(pos)

    setWorld(next); setIssues(validateWorld(next)); setPlaceModal(null)
  }

  function deleteWay(wayId: string) {
    if (!world) return
    const next: World = JSON.parse(JSON.stringify(world))
    const wdef = next.way_defs[wayId]
    if (!wdef) return
    // Remove from source place ways list
    const src = next.place_defs[wdef.source]
    if (src) { src.ways = src.ways.filter(wid => wid !== wayId) }
    delete next.way_defs[wayId]
    setWorld(next); setIssues(validateWorld(next)); setWayModal(null)
  }

  return (
    <>
      <header>
        <div className="toolbar">
          <button className="primary" onClick={chooseFile}>Load</button>
          <button onClick={handleLoadSample}>Load Sample</button>
          <button onClick={handleDownload} disabled={!world}>Save</button>
          <button onClick={addPlace} disabled={!world}>Add Place</button>
          <button onClick={() => setShowWayLabels(v=>!v)} disabled={!world}>{showWayLabels ? 'Hide Way Labels' : 'Show Way Labels'}</button>
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
              <p>Starte mit <b>Load</b> (lade deine <code>world.json</code>) oder mit <b>Load Sample</b>.</p>
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
          onDelete={deletePlace}
        />
      )}
      {wayModal && world && (
        <WayModal
          wayId={wayModal}
          world={world}
          open={true}
          onClose={() => setWayModal(null)}
          onApply={applyWorld}
          onDelete={deleteWay}
        />
      )}
    </>
  )
}

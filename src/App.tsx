import React, { useMemo, useRef, useState } from 'react'
import { WorldSchema, World, EditorMeta } from './types/world'
import { validateWorld } from './validation'
import { slugify } from './utils/slugify'
import GraphView from './ui/GraphView'
import PlaceModal from './ui/PlaceModal'
import ObjectPanel from './ui/ObjectPanel'
import ObjectModal from './ui/ObjectModal'
import WayModal from './ui/WayModal'
import sampleJson from '../public/sample_world.json?raw'

type Issue = ReturnType<typeof validateWorld>[number]

function ensureUniqueId(baseId: string, exists: (id: string)=>boolean): string {
  let id = baseId
  let i = 1
  while (exists(id)) { id = baseId + '_' + i; i++ }
  return id
}

function anyOwnedBy(world: World, pid: string): boolean {
  return Object.values(world.object_defs).some(o => o.ownedby === pid);
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [world, setWorld] = useState<World | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [positions, setPositions] = useState<Record<string, {x:number,y:number}>>({})
  const [placeModal, setPlaceModal] = useState<string | null>(null)
  const [objectModal, setObjectModal] = useState<{oid:string|null} | null>(null)
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
    a.href = url; a.download = 'world_with_editor_meta.json'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  function addPlace() {
    if (!world) return
    const baseCall = 'Neuer Platz'
    const existing = Object.values(world.place_defs).map(p => p.callnames?.[0] ?? '')
    let callname = baseCall; let idx = 1
    while (existing.includes(callname)) { callname = baseCall + ' ' + idx; idx++ }
    const slug = slugify(callname)
    const pidBase = 'p_' + slug
    const pid = ensureUniqueId(pidBase, (id)=> !!world.place_defs[id])
    const next: World = JSON.parse(JSON.stringify(world))
    next.place_defs[pid] = { description: '', place_prompt: '', place_prompt_f: null, callnames: [callname], ways: [], objects: [] }
    setWorld(next); setPositions({ ...positions, [pid]: { x: 80, y: 80 } }); setIssues(validateWorld(next))
  }

  function onConnectPlaces(sourceId: string, targetId: string) {
    if (!world) return
    const sc = (world.place_defs[sourceId].callnames?.[0] ?? sourceId.replace(/^p_/, ''))
    const tc = (world.place_defs[targetId].callnames?.[0] ?? targetId.replace(/^p_/, ''))
    const sslug = slugify(sc); const tslug = slugify(tc)
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
    setWorld(next); setIssues(validateWorld(next))
  }

  function openPlace(pid: string) { setPlaceModal(pid) }
  function openObjectCreate() { setObjectModal({ oid: null }) }
  function openObjectEdit(oid: string) { setObjectModal({ oid }) }

  function applyWorld(next: World) {
    setWorld(next)
    setIssues(validateWorld(next))
  }

  async function exportRuntime() {
      const { default: JSZip } = await import('jszip');
      if (!world) return

      // 1) Arbeitskopie für den Runtime-Export
      const runtimeWorld: World = JSON.parse(JSON.stringify(world))

      // 2) Sicherstellen: jedes Object hat eine prompt_f
      for (const [oid, o] of Object.entries(runtimeWorld.object_defs)) {
        if (!o.prompt_f) {
          // Name bevorzugen; sonst auf ID zurückfallen
          const baseName = (o as any).name || oid
          const fn = `${baseName}_prompt_f`
          o.prompt_f = `object_prompts.${fn}`
        }
      }

      // 3) world.json aus der Runtime-Kopie schreiben
      const runtimeJson = JSON.stringify(runtimeWorld, null, 2)
      const blobJson = new Blob([runtimeJson], { type: 'application/json;charset=utf-8' })
      const a1 = document.createElement('a')
      a1.href = URL.createObjectURL(blobJson)
      a1.download = 'world.json'
      document.body.appendChild(a1); a1.click(); a1.remove()

      // 4) Python-Stub-Module nur für referenzierte Funktionen
      const modules: Record<string, Set<string>> = {
        game_apply_functions: new Set(),
        game_reveal_functions: new Set(),
        game_take_functions: new Set(),
        game_obstruction_check_functions: new Set(),
        place_prompts: new Set(),
        object_prompts: new Set(),
        way_prompts: new Set(),
      }

      // Aus der RUNTIME-Kopie sammeln, damit generierte object_prompts enthalten sind
      for (const p of Object.values(runtimeWorld.place_defs)) {
        if (p.place_prompt_f) { const [m,f] = (p.place_prompt_f as string).split('.'); (modules as any)[m]?.add(f) }
      }
      for (const w of Object.values(runtimeWorld.way_defs)) {
        if (w.way_prompt_f)       { const [m,f] = (w.way_prompt_f as string).split('.');       (modules as any)[m]?.add(f) }
        if (w.obstruction_check)  { const [m,f] = (w.obstruction_check as string).split('.');   (modules as any)[m]?.add(f) }
      }
      for (const o of Object.values(runtimeWorld.object_defs)) {
        for (const r of [o.apply_f, o.reveal_f, o.take_f, o.prompt_f] as (string|null)[]) {
          if (r) { const [m,f] = r.split('.'); (modules as any)[m]?.add(f) }
        }
      }

      function fileFor(mod: string, funcs: Set<string>): string {
        const names = Array.from(funcs)
        const lines: string[] = []
        lines.push('# -*- coding: utf-8 -*-')
        lines.push('# Auto-generated stubs from Terrain World Editor')
        lines.push(`# Module: ${mod}`)
        lines.push('')
        if (names.length === 0) {
          lines.push('# (no functions referenced)')
        } else {
          for (const fn of names) {
            lines.push(`def ${fn}(gs: "GameState", pl: "PlayerState", w: "Way") -> str:`)
            lines.push('    # TODO: implement callback')
            lines.push('    return ""')
            lines.push('')
          }
          lines.push('__all__ = [' + names.map(n => `"${n}"`).join(', ') + ']')
        }
        return lines.join('\n')
      }

      const zip = new JSZip()
      for (const [mod, set] of Object.entries(modules)) {
        if (set.size > 0) zip.file(mod + '.py', fileFor(mod, set as Set<string>))
      }
      zip.file('README.txt', 'Generated by Terrain Editor. Signature: def <fn>(gs: "GameState", pl: "PlayerState", w: "Way") -> str\n')
      const blobZip = await zip.generateAsync({ type: 'blob' })
      const a2 = document.createElement('a')
      a2.href = URL.createObjectURL(blobZip)
      a2.download = 'python_stubs.zip'
      document.body.appendChild(a2); a2.click(); a2.remove()
    }
  return (
    <>
      <header>
        <div className="toolbar">
          <button className="primary" onClick={chooseFile}>Load</button>
          <button onClick={handleLoadSample}>Load Sample</button>
          <button onClick={handleDownload} disabled={!world}>Save</button>
          <button onClick={addPlace} disabled={!world}>Add Place</button>
          <button onClick={exportRuntime} disabled={!world}>Export Runtime</button>
          <button onClick={()=>setShowWayLabels(v=>!v)} disabled={!world}>{showWayLabels ? 'Hide Way Labels' : 'Show Way Labels'}</button>
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
              onEdgeDoubleClick={setWayModal}
              showWayLabels={showWayLabels}
            />
          ) : (
            <div style={{padding:'24px'}}><p>Starte mit <b>Load</b> oder <b>Load Sample</b>.</p></div>
          )}
        </div>
        <div className="side">
          {world && (
            <>
              <ObjectPanel world={world} onAdd={openObjectCreate} onEdit={openObjectEdit} />
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
            </>
          )}
        </div>
      </main>
      {placeModal && world && (
          <PlaceModal
            placeId={placeModal}
            world={world}
            open={true}
            onClose={()=>setPlaceModal(null)}
            onApply={applyWorld}
            onRenamed={(oldPid, newPid) => {
              // 1) Positionen mappen
              setPositions(pos => {
                const { [oldPid]: oldPos, ...rest } = pos
                return oldPos ? { ...rest, [newPid]: oldPos } : pos
              })
              // 2) Offen gehaltenes Modal auf die neue ID umhängen
              setPlaceModal(curr => (curr === oldPid ? newPid : curr))
            }}
          />
        )}

      {wayModal && world && (
        <WayModal world={world} wid={wayModal} open={true} onClose={()=>setWayModal(null)} onApply={applyWorld} />
      )}
      {objectModal && world && (
        <ObjectModal world={world} open={true} oid={objectModal.oid} onClose={()=>setObjectModal(null)} onApply={applyWorld} />
      )}
    </>
  )
}

import React, { useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { WorldSchema } from '../types/world'
import { validateWorld } from '../validation/validation'
import Canvas from './Canvas'

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const world = useStore(s => s.world)
  const loadFromText = useStore(s => s.loadFromText)
  const toJsonText = useStore(s => s.toJsonText)
  const addPlace = useStore(s => s.addPlace)

  const [issues, setIssues] = useState<any[]>([])

  function handleLoadClick() { fileInputRef.current?.click() }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        loadFromText(text)
        const obj = JSON.parse(text)
        const parsed = WorldSchema.parse(obj)
        setIssues(validateWorld(parsed))
      } catch (err: any) { console.error(err); setIssues([{ severity:'error', code:'json.parse', message: err.message }]) }
    }
    reader.readAsText(file)
  }
  function handleSaveClick() {
    const text = toJsonText(false)
    const blob = new Blob([text], { type:'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'world_with_editor_meta.json'; a.click(); URL.revokeObjectURL(url)
  }
  function handleAddPlace() { addPlace('Neuer Platz', { x: Math.random()*400-200, y: Math.random()*200-100 }) }

  const counts = useMemo(() => ({ p:Object.keys(world.place_defs).length, w:Object.keys(world.way_defs).length, o:Object.keys(world.object_defs).length }), [world])

  return (
    <div style={{height:'100%'}}>
      <div className="toolbar">
        <button className="btn primary" onClick={handleLoadClick}>Load</button>
        <button className="btn" onClick={handleSaveClick}>Save</button>
        <button className="btn" onClick={handleAddPlace}>Add Place</button>
        <span className="pill">{counts.p} places · {counts.w} ways · {counts.o} objects</span>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display:'none' }} onChange={handleFileChange} />
      </div>
      <div className="canvas"><Canvas /></div>
      {issues.length>0 && (
        <div style={{position:'fixed', bottom:12, right:12, maxWidth:560}}>
          {issues.map((it, idx) => (
            <div key={idx} style={{background:'#fff', border:'1px solid #fca5a5', padding:'8px 12px', borderRadius:8, marginTop:6, boxShadow:'0 6px 20px rgba(0,0,0,.15)'}}>
              <strong>{(it.severity||'issue').toUpperCase()}</strong> · <code>{it.code}</code><br/><span>{it.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
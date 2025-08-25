import React, { useMemo, useRef, useState } from 'react'
import { WorldSchema, World } from './types/world'
import { validateWorld } from './validation'
import sampleJson from '../public/sample_world.json?raw'

type Issue = ReturnType<typeof validateWorld>[number]

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [world, setWorld] = useState<World | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [raw, setRaw] = useState<string>('')

  const counts = useMemo(() => {
    if (!world) return null
    return {
      places: Object.keys(world.place_defs).length,
      ways: Object.keys(world.way_defs).length,
      objects: Object.keys(world.object_defs).length,
    }
  }, [world])

  function handleChooseFile() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        setRaw(text)
        const obj = JSON.parse(text)
        const parsed = WorldSchema.parse(obj)
        const v = validateWorld(parsed)
        setWorld(parsed)
        setIssues(v)
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
      setRaw(JSON.stringify(obj, null, 2))
      setIssues(validateWorld(parsed))
    } catch (err: any) {
      setIssues([{ severity: 'error', code: 'sample.load', message: err.message } as any])
    }
  }

  function handleDownload() {
    const content = raw.trim().length > 0 ? raw : JSON.stringify(world, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'world.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleTextareaBlur() {
    if (!raw) return
    try {
      const obj = JSON.parse(raw)
      const parsed = WorldSchema.parse(obj)
      setWorld(parsed)
      setIssues(validateWorld(parsed))
    } catch (err: any) {
      setIssues([{ severity: 'error', code: 'json.parse', message: err.message } as any])
    }
  }

  return (
    <>
      <header>
        <h1>Terrain World Editor (MVP)</h1>
        <div className="muted">Load → Validate → Round-trip JSON</div>
      </header>
      <main>
        <div className="row">
          <button className="primary" onClick={handleChooseFile}>Load JSON…</button>
          <button onClick={handleLoadSample}>Load Sample</button>
          <button onClick={handleDownload} disabled={!world && !raw}>Download JSON</button>
          {counts && (
            <span className="pill">{counts.places} places • {counts.ways} ways • {counts.objects} objects</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="card">
          <h3>Validation</h3>
          <div className="issues">
            {issues.length === 0 && <div className="muted">No issues yet. Load a world.json to validate.</div>}
            {issues.map((it, idx) => (
              <div key={idx} className={"issue " + it.severity}>
                <strong>{it.severity.toUpperCase()}</strong> • <code>{it.code}</code><br/>
                <span>{it.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>JSON (edit & blur to re-validate)</h3>
          <textarea
            className="textarea"
            placeholder='Paste world.json here…'
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={handleTextareaBlur}
          />
        </div>
      </main>
    </>
  )
}

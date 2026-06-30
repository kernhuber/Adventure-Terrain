import React, { useState } from 'react'
import { World, WayDef } from '../types/world'
import { slugify } from '../utils/slugify'
import CallbackStatus from './CallbackStatus'

type Props = {
  world: World
  placeA: string
  placeB: string
  open: boolean
  onClose: () => void
  onApply: (w: World) => void
}

function nameOf(world: World, pid: string): string {
  return world.place_defs[pid]?.callnames?.[0] ?? pid.replace(/^p_/, '')
}

/** The existing way (id + def) going from -> to, or null if that direction is absent. */
function findWay(world: World, from: string, to: string): [string, WayDef] | null {
  const e = Object.entries(world.way_defs).find(([, w]) => w.source === from && w.destination === to)
  return e ?? null
}

/** A suggested id for a NEW from -> to direction (callname-based, editable afterwards). */
function genWid(world: World, from: string, to: string): string {
  const fc = world.place_defs[from]?.callnames?.[0] ?? from.replace(/^p_/, '')
  const tc = world.place_defs[to]?.callnames?.[0] ?? to.replace(/^p_/, '')
  const base = `w_${slugify(fc)}_${slugify(tc)}`
  let id = base, i = 2
  while (world.way_defs[id]) { id = `${base}_${i}`; i++ }
  return id
}

type DirState = {
  enabled: boolean
  id: string
  text: string
  desc: string
  hasPrompt: boolean
  hasObs: boolean
}

function DirectionEditor(props: {
  title: string
  state: DirState
  set: (patch: Partial<DirState>) => void
}) {
  const { title, state, set } = props
  const wid = state.id.trim()
  const promptRef = `way_prompts.${wid}_prompt_f`
  const obsRef = `game_obstruction_check_functions.${wid}_obstruction_check`
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <input type="checkbox" checked={state.enabled} onChange={e => set({ enabled: e.target.checked })} />
        <strong style={{ marginLeft: 8 }}>{title}</strong>
      </div>
      {state.enabled && (
        <>
          <div className="row">
            <label>internal id</label>
            <input type="text" value={state.id} onChange={e => set({ id: e.target.value })} placeholder="z.B. w_korridor_hoehle" />
          </div>
          <div className="row">
            <label>text_direction</label>
            <input type="text" value={state.text} onChange={e => set({ text: e.target.value })} />
          </div>
          <div className="row">
            <label>description</label>
            <input type="text" value={state.desc} onChange={e => set({ desc: e.target.value })} />
          </div>
          <div className="row">
            <label>way_prompt_f</label>
            <input type="checkbox" checked={state.hasPrompt} onChange={e => set({ hasPrompt: e.target.checked })} />
            {state.hasPrompt && <CallbackStatus refName={promptRef} />}
          </div>
          <div className="row">
            <label>obstruction_check</label>
            <input type="checkbox" checked={state.hasObs} onChange={e => set({ hasObs: e.target.checked })} />
            {state.hasObs && <CallbackStatus refName={obsRef} />}
          </div>
        </>
      )}
    </div>
  )
}

export default function WayModal({ world, placeA, placeB, open, onClose, onApply }: Props) {
  if (!open) return null

  const dirAB = findWay(world, placeA, placeB)
  const dirBA = findWay(world, placeB, placeA)

  const initDir = (d: [string, WayDef] | null, from: string, to: string): DirState => ({
    enabled: !!d,
    id: d?.[0] ?? genWid(world, from, to),
    text: d?.[1].text_direction ?? `zu ${nameOf(world, to)}`,
    desc: d?.[1].description ?? '',
    hasPrompt: !!d?.[1].way_prompt_f,
    hasObs: !!d?.[1].obstruction_check
  })

  const [ab, setAb] = useState<DirState>(() => initDir(dirAB, placeA, placeB))
  const [ba, setBa] = useState<DirState>(() => initDir(dirBA, placeB, placeA))

  // Apply one direction's state to `next`. Handles create, update, rename (id edited)
  // and delete (unchecked). The id is taken as typed (internal tool — ids are kept
  // stable in the Adventure even when places are renamed), only trimmed and de-duped.
  function applyDir(next: World, s: DirState, existingWid: string | null, from: string, to: string) {
    if (!s.enabled) {
      if (existingWid) {
        delete next.way_defs[existingWid]
        for (const p of Object.values(next.place_defs)) p.ways = p.ways.filter(x => x !== existingWid)
      }
      return
    }
    let wid = s.id.trim() || genWid(next, from, to)
    // Don't clobber a different existing way that happens to share the id.
    if (wid !== existingWid) {
      const base = wid; let i = 2
      while (next.way_defs[wid]) { wid = `${base}_${i}`; i++ }
    }
    if (existingWid && existingWid !== wid) {
      delete next.way_defs[existingWid]
      for (const p of Object.values(next.place_defs)) p.ways = p.ways.map(x => x === existingWid ? wid : x)
    }
    next.way_defs[wid] = {
      source: from,
      destination: to,
      text_direction: s.text,
      description: s.desc,
      obstruction_check: s.hasObs ? `game_obstruction_check_functions.${wid}_obstruction_check` : null,
      way_prompt_f: s.hasPrompt ? `way_prompts.${wid}_prompt_f` : null
    }
    if (!next.place_defs[from].ways.includes(wid)) next.place_defs[from].ways.push(wid)
  }

  function save() {
    const next: World = JSON.parse(JSON.stringify(world))
    applyDir(next, ab, dirAB?.[0] ?? null, placeA, placeB)
    applyDir(next, ba, dirBA?.[0] ?? null, placeB, placeA)
    onApply(next)
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <h2>Verbindung: <code>{nameOf(world, placeA)}</code> ↔ <code>{nameOf(world, placeB)}</code></h2>
        <p className="muted">Jede Richtung lässt sich per Checkbox an-/abschalten und einzeln bearbeiten. Die interne id kann frei vergeben werden (Umbenennen passt way_defs, place.ways und die Callback-Namen an).</p>

        <DirectionEditor
          title={`${nameOf(world, placeA)} → ${nameOf(world, placeB)}`}
          state={ab}
          set={patch => setAb(s => ({ ...s, ...patch }))}
        />
        <DirectionEditor
          title={`${nameOf(world, placeB)} → ${nameOf(world, placeA)}`}
          state={ba}
          set={patch => setBa(s => ({ ...s, ...patch }))}
        />

        <div className="row" style={{ justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

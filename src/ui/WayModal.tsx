import React, { useState } from 'react'
import { World } from '../types/world'

type Props = {
  wayId: string
  world: World
  open: boolean
  onClose: () => void
  onApply: (next: World) => void
}

export default function WayModal({ wayId, world, open, onClose, onApply }: Props) {
  if (!open) return null
  const w = world.way_defs[wayId]
  const [textDirection, setTextDirection] = useState(w.text_direction ?? '')
  const [description, setDescription] = useState(w.description ?? '')
  const [hasPromptF, setHasPromptF] = useState(!!w.way_prompt_f)

  function handleSave() {
    const next: World = JSON.parse(JSON.stringify(world))
    next.way_defs[wayId].text_direction = textDirection
    next.way_defs[wayId].description = description
    next.way_defs[wayId].way_prompt_f = hasPromptF ? `WayPrompts.${wayId}_prompt_f` : null
    onApply(next)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h2>Way: <code>{wayId}</code></h2>
        <div className="row">
          <label>source</label>
          <input type="text" value={w.source} readOnly />
        </div>
        <div className="row">
          <label>destination</label>
          <input type="text" value={w.destination} readOnly />
        </div>
        <div className="row">
          <label>text_direction</label>
          <input type="text" value={textDirection} onChange={e=>setTextDirection(e.target.value)} />
        </div>
        <div className="row">
          <label>description</label>
          <input type="text" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <div className="row">
          <label>way_prompt_f</label>
          <input type="checkbox" checked={hasPromptF} onChange={e=>setHasPromptF(e.target.checked)} />
          {hasPromptF && <code style={{marginLeft:8}}>WayPrompts.{wayId}_prompt_f</code>}
        </div>
        <div className="row" style={{justifyContent:'flex-end'}}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

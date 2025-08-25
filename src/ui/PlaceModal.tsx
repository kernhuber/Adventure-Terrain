import React, { useState } from 'react'
import { World } from '../types/world'

type Props = {
  placeId: string
  world: World
  open: boolean
  onClose: () => void
  onApply: (next: World) => void
  onRenameCallname: (placeId: string, newCallname: string, description: string, placePrompt: string, hasPromptF: boolean) => void
}

export default function PlaceModal({ placeId, world, open, onClose, onApply, onRenameCallname }: Props) {
  if (!open) return null
  const p = world.place_defs[placeId]
  const [callname, setCallname] = useState(p.callnames?.[0] ?? placeId.replace(/^p_/, ''))
  const [description, setDescription] = useState(p.description)
  const [placePrompt, setPlacePrompt] = useState(p.place_prompt ?? '')
  const [hasPromptF, setHasPromptF] = useState(!!p.place_prompt_f)

  function handleSave() {
    const original = p.callnames?.[0] ?? ''
    if (callname.trim() && callname.trim() !== original) {
      onRenameCallname(placeId, callname.trim(), description, placePrompt, hasPromptF)
    } else {
      const next: World = JSON.parse(JSON.stringify(world))
      next.place_defs[placeId].description = description
      next.place_defs[placeId].place_prompt = placePrompt
      next.place_defs[placeId].place_prompt_f = hasPromptF ? `PlacePrompts.${placeId}_place_prompt_f` : null
      onApply(next)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h2>Place: <code>{placeId}</code></h2>
        <div className="row">
          <label>Callname (Anzeigename)</label>
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
        <div className="row" style={{justifyContent:'flex-end'}}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save</button>
        </div>
        <div className="muted" style={{marginTop:8}}>Umbenennen ändert IDs (p_… & w_… ) und Referenzen automatisch.</div>
      </div>
    </div>
  )
}

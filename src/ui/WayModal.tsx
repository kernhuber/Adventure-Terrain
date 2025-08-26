import React, { useMemo, useState } from 'react'
import { World } from '../types/world'
import { callbackRegistry } from '../lib/callbacks'

type Props={world:World; wid:string; open:boolean; onClose:()=>void; onApply:(w:World)=>void}

export default function WayModal({world,wid,open,onClose,onApply}:Props){
  if(!open) return null
  const w = world.way_defs[wid]
  const [textDir,setTextDir] = useState(w.text_direction)
  const [description,setDescription] = useState(w.description ?? '')
  const [hasPromptF,setHasPromptF] = useState(!!w.way_prompt_f)
  const [hasObstruction,setHasObstruction] = useState(!!w.obstruction_check)
  const promptOptions = useMemo(()=> callbackRegistry.WayPrompts, [])
  const obsOptions = useMemo(()=> callbackRegistry.GameObstructionCheckFunctions, [])

  function save(){
    const next:World = JSON.parse(JSON.stringify(world))
    next.way_defs[wid].text_direction = textDir
    next.way_defs[wid].description = description
    next.way_defs[wid].way_prompt_f = hasPromptF ? `WayPrompts.${wid}_prompt_f` : null
    next.way_defs[wid].obstruction_check = hasObstruction ? `GameObstructionCheckFunctions.${wid}_obstruction_check` : null
    onApply(next); onClose()
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <h2>Way: <code>{wid}</code></h2>
    <div className="row"><label>text_direction</label><input type="text" value={textDir} onChange={e=>setTextDir(e.target.value)} /></div>
    <div className="row"><label>description</label><input type="text" value={description} onChange={e=>setDescription(e.target.value)} /></div>
    <div className="row"><label>way_prompt_f</label><input type="checkbox" checked={hasPromptF} onChange={e=>setHasPromptF(e.target.checked)} />{hasPromptF&&<code style={{marginLeft:8}}>WayPrompts.{wid}_prompt_f</code>}</div>
    <div className="row"><label>obstruction_check</label><input type="checkbox" checked={hasObstruction} onChange={e=>setHasObstruction(e.target.checked)} />{hasObstruction&&<code style={{marginLeft:8}}>GameObstructionCheckFunctions.{wid}_obstruction_check</code>}</div>
    <div className="muted" style={{marginTop:8}}>Autocomplete Registry — WayPrompts: [{promptOptions.join(', ')}]; Obstruction: [{obsOptions.join(', ')}]</div>
    <div className="row" style={{justifyContent:'flex-end'}}><button onClick={onClose}>Cancel</button><button className="primary" onClick={save}>Save</button></div>
  </div></div>
}
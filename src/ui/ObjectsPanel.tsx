import React from 'react'
import { World } from '../types/world'

type Props = {
  world: World
  onAdd: () => void
  onEdit: (oid: string) => void
}

export default function ObjectsPanel({ world, onAdd, onEdit }: Props) {
  const list = Object.entries(world.object_defs)
    .map(([oid, o]) => ({ oid, call: o.callnames?.[0] ?? oid.replace(/^o_/, ''), owned: o.ownedby ?? '(none)' }))
    .sort((a,b)=> a.call.localeCompare(b.call))

  return (
    <div className="card">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <h3 style={{margin:0}}>Objects</h3>
        <button onClick={onAdd}>Add Object</button>
      </div>
      <div style={{marginTop:8}}>
        {list.length === 0 && <div className="muted">Keine Objekte.</div>}
        {list.map(it => (
          <div key={it.oid} className="row" style={{alignItems:'center'}}>
            <code style={{fontSize:12}}>{it.oid}</code>
            <span style={{flex:1}}>{it.call}</span>
            <span className="pill">{it.owned}</span>
            <button onClick={()=>onEdit(it.oid)}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  )
}

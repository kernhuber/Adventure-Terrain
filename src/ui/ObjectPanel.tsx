import React from 'react'
import { World } from '../types/world'

type Props = {
  world: World
  onAdd: () => void
  onEdit: (oid: string) => void
}

export default function ObjectPanel({ world, onAdd, onEdit }: Props) {
  return (
    <div className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0}}>Objects</h3>
        <button onClick={onAdd}>Add Object</button>
      </div>
      <div className="list" style={{marginTop:8}}>
        {Object.entries(world.object_defs).map(([oid, o]) => (
          <div key={oid} className="item" draggable
               onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', oid) }}
          >
            <div>
              <div><strong>{o.callnames?.[0] ?? oid.replace(/^o_/, '')}</strong> <span className="muted">({oid})</span></div>
              <div className="muted" style={{fontSize:12}}>ownedby: {o.ownedby ?? '—'}</div>
            </div>
            <div>
              <button onClick={()=>onEdit(oid)}>Edit</button>
            </div>
          </div>
        ))}
        {Object.keys(world.object_defs).length === 0 && <div className="muted">No objects yet.</div>}
      </div>
      <div className="hint" style={{marginTop:8}}>Tipp: Zieh ein Objekt in den Place‑Editor, um es zuzuweisen.</div>
    </div>
  )
}

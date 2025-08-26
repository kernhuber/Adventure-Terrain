import React, { useMemo, useState } from 'react'
import { World } from '../types/world'
import { slugify } from '../utils/slugify'

type Props = {
  world: World
  open: boolean
  oid: string | null // if null -> create mode
  onClose: () => void
  onApply: (next: World) => void
}

function ensureUniqueId(baseId: string, exists: (id: string)=>boolean): string {
  let id = baseId
  let i = 1
  while (exists(id)) { id = baseId + '_' + i; i++ }
  return id
}

export default function ObjectModal({ world, open, oid, onClose, onApply }: Props) {
  if (!open) return null
  const editing = !!oid
  const initial = editing ? world.object_defs[oid!] : {
    name: '',
    examine: '',
    help_text: '',
    callnames: ['Neues Objekt'],
    ownedby: null,
    fixed: false,
    hidden: false,
    apply_f: null,
    reveal_f: null,
    take_f: null,
    prompt_f: null
  }
  const [callname, setCallname] = useState(initial.callnames?.[0] ?? 'Neues Objekt')
  const [examine, setExamine] = useState(initial.examine ?? '')
  const [help, setHelp] = useState(initial.help_text ?? '')
  const [ownedby, setOwnedby] = useState<string | null>(initial.ownedby ?? null)
  const [fixed, setFixed] = useState(!!initial.fixed)
  const [hidden, setHidden] = useState(!!initial.hidden)
  const [hasApply, setHasApply] = useState(!!initial.apply_f)
  const [hasReveal, setHasReveal] = useState(!!initial.reveal_f)
  const [hasTake, setHasTake] = useState(!!initial.take_f)
  const [hasPrompt, setHasPrompt] = useState(!!initial.prompt_f)

  const placeOptions = useMemo(()=> Object.keys(world.place_defs), [world])

  function handleDelete() {
    if (!editing) return
    if (!confirm(`Objekt ${oid} wirklich löschen?`)) return
    const next: World = JSON.parse(JSON.stringify(world))
    // remove from any place list
    for (const p of Object.values(next.place_defs)) {
      p.objects = p.objects.filter(x => x !== oid)
    }
    delete next.object_defs[oid!]
    onApply(next); onClose()
  }

  function handleSave() {
    const next: World = JSON.parse(JSON.stringify(world))
    const slug = slugify(callname)
    const newOidBase = 'o_' + slug
    const newOid = editing ? (oid as string) : ensureUniqueId(newOidBase, (x)=> !!next.object_defs[x])

    const obj = {
      name: newOid,
      examine,
      help_text: help,
      callnames: [callname],
      ownedby,
      fixed,
      hidden,
      apply_f: hasApply ? `GameApplyFunctions.${newOid}_apply_f` : null,
      reveal_f: hasReveal ? `GameRevealFunctions.${newOid}_reveal_f` : null,
      take_f: hasTake ? `GameTakeFunctions.${newOid}_take_f` : null,
      prompt_f: hasPrompt ? `ObjectPrompts.${newOid}_prompt_f` : null
    }

    if (editing) {
      // update references in places if oid changed (we don't rename in this modal to keep scope tight)
      next.object_defs[newOid] = obj
      if (ownedby) {
        // ensure in place list
        const list = next.place_defs[ownedby].objects
        if (!list.includes(newOid)) list.push(newOid)
      }
    } else {
      next.object_defs[newOid] = obj
      if (ownedby) {
        const list = next.place_defs[ownedby].objects
        if (!list.includes(newOid)) list.push(newOid)
      }
    }
    onApply(next); onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h2>{editing ? 'Edit Object' : 'Add Object'} {editing && <code>{oid}</code>}</h2>
        <div className="row">
          <label>callname</label>
          <input type="text" value={callname} onChange={e=>setCallname(e.target.value)} />
        </div>
        <div className="row">
          <label>examine</label>
          <input type="text" value={examine} onChange={e=>setExamine(e.target.value)} />
        </div>
        <div className="row">
          <label>help_text</label>
          <input type="text" value={help} onChange={e=>setHelp(e.target.value)} />
        </div>
        <div className="row">
          <label>ownedby</label>
          <select value={ownedby ?? ''} onChange={e=>setOwnedby(e.target.value || null)}>
            <option value="">— none —</option>
            {placeOptions.map(pid => <option key={pid} value={pid}>{pid}</option>)}
          </select>
        </div>
        <div className="row">
          <label>fixed</label>
          <input type="checkbox" checked={fixed} onChange={e=>setFixed(e.target.checked)} />
        </div>
        <div className="row">
          <label>hidden</label>
          <input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} />
        </div>
        <div className="row"><label>apply_f</label><input type="checkbox" checked={hasApply} onChange={e=>setHasApply(e.target.checked)} />{hasApply && <code style={{marginLeft:8}}>GameApplyFunctions.o_…_apply_f</code>}</div>
        <div className="row"><label>reveal_f</label><input type="checkbox" checked={hasReveal} onChange={e=>setHasReveal(e.target.checked)} />{hasReveal && <code style={{marginLeft:8}}>GameRevealFunctions.o_…_reveal_f</code>}</div>
        <div className="row"><label>take_f</label><input type="checkbox" checked={hasTake} onChange={e=>setHasTake(e.target.checked)} />{hasTake && <code style={{marginLeft:8}}>GameTakeFunctions.o_…_take_f</code>}</div>
        <div className="row"><label>prompt_f</label><input type="checkbox" checked={hasPrompt} onChange={e=>setHasPrompt(e.target.checked)} />{hasPrompt && <code style={{marginLeft:8}}>ObjectPrompts.o_…_prompt_f</code>}</div>

        <div className="row" style={{justifyContent:'space-between'}}>
          {editing ? <button onClick={handleDelete} style={{borderColor:'#ef4444', background:'#7f1d1d'}}>Delete</button> : <span />}
          <div>
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

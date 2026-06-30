import React, { useEffect, useMemo, useState } from 'react'
import { World } from '../types/world'
import { slugify } from '../utils/slugify'
import CallbackStatus from './CallbackStatus'

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

  // internal id: auto aus callname, aber editierbar
  const autoIdFromCallname = () => 'o_' + slugify(callname || 'neues_objekt')
  const [oidText, setOidText] = useState<string>(editing ? (oid as string) : autoIdFromCallname())
  const [idTouched, setIdTouched] = useState<boolean>(false)

  useEffect(() => {
    if (!editing && !idTouched) {
      setOidText(autoIdFromCallname())
    }
  }, [callname]) // eslint-disable-line react-hooks/exhaustive-deps

  const placeOptions = useMemo(()=> Object.keys(world.place_defs), [world])

  function handleDelete() {
    if (!editing) return
    if (!confirm(`Objekt ${oid} wirklich löschen?`)) return
    const next: World = JSON.parse(JSON.stringify(world))
    // 1) aus allen Place-Listen entfernen
    for (const p of Object.values(next.place_defs)) {
      p.objects = p.objects.filter(x => x !== oid)
    }
    // 2) Objekt löschen
    delete next.object_defs[oid!]
    onApply(next); onClose()
  }

  function normalizeOid(raw: string): string {
    const base = raw?.trim() ? raw.replace(/^o_/, '') : slugify(callname || 'neues_objekt')
    return 'o_' + slugify(base)
  }

  function handleSave() {
    const next: World = JSON.parse(JSON.stringify(world))

    const newOidDesired = normalizeOid(oidText)
    const newOid = editing
      ? (newOidDesired === oid ? newOidDesired
         : (next.object_defs[newOidDesired] ? ensureUniqueId(newOidDesired, (x)=> !!next.object_defs[x]) : newOidDesired))
      : ensureUniqueId(newOidDesired, (x)=> !!next.object_defs[x])

    // Objekt-Datensatz vorbereiten
    const obj = {
      name: newOid,
      examine,
      help_text: help,
      callnames: [callname],
      ownedby,
      fixed,
      hidden,
      apply_f: hasApply ? `game_apply_functions.${newOid}_apply_f` : null,
      reveal_f: hasReveal ? `game_reveal_functions.${newOid}_reveal_f` : null,
      take_f: hasTake ? `game_take_functions.${newOid}_take_f` : null,
      prompt_f: hasPrompt ? `object_prompts.${newOid}_prompt_f` : null
    }

    if (editing) {
      const old = oid as string

      // Wenn die ID sich ändert: Schlüssel in object_defs umhängen
      if (newOid !== old) {
        // 1) neuen Key setzen
        next.object_defs[newOid] = obj
        // 2) alten löschen
        delete next.object_defs[old]
        // 3) in allen place_defs[*].objects austauschen
        for (const p of Object.values(next.place_defs)) {
          p.objects = p.objects.map(x => x === old ? newOid : x)
        }
      } else {
        next.object_defs[newOid] = obj
      }

      // Ownership-Listen anpassen (falls ownedby gesetzt/entfernt wurde)
      for (const [pid, p] of Object.entries(next.place_defs)) {
        if (pid === (ownedby || '')) {
          if (!p.objects.includes(newOid)) p.objects.push(newOid)
        } else {
          // Sicherstellen, dass das Objekt nicht an anderen Orten doppelt bleibt
          p.objects = p.objects.filter(x => x !== newOid)
        }
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
    <div className="modal-backdrop">
      <div className="modal" onClick={(e)=>e.stopPropagation()} onMouseDown={(e)=>e.stopPropagation()}>
        <h2>{editing ? 'Edit Object' : 'Add Object'} {editing && <code>{oid}</code>}</h2>

        <div className="row">
          <label>callname</label>
          <input type="text" value={callname} onChange={e=>setCallname(e.target.value)} />
        </div>

        <div className="row">
          <label>internal id</label>
          <input
            type="text"
            value={oidText}
            onChange={(e)=>{ setOidText(e.target.value); setIdTouched(true) }}
            placeholder="z.B. o_trank"
          />
          <span className="muted" style={{marginLeft:8}}>auto aus Callname: <code>{autoIdFromCallname()}</code></span>
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

        <div className="row">
          <label>apply_f</label>
          <input type="checkbox" checked={hasApply} onChange={e=>setHasApply(e.target.checked)} />
          {hasApply && <CallbackStatus refName={`game_apply_functions.${normalizeOid(oidText)}_apply_f`} />}
        </div>
        <div className="row">
          <label>reveal_f</label>
          <input type="checkbox" checked={hasReveal} onChange={e=>setHasReveal(e.target.checked)} />
          {hasReveal && <CallbackStatus refName={`game_reveal_functions.${normalizeOid(oidText)}_reveal_f`} />}
        </div>
        <div className="row">
          <label>take_f</label>
          <input type="checkbox" checked={hasTake} onChange={e=>setHasTake(e.target.checked)} />
          {hasTake && <CallbackStatus refName={`game_take_functions.${normalizeOid(oidText)}_take_f`} />}
        </div>
        <div className="row">
          <label>prompt_f</label>
          <input type="checkbox" checked={hasPrompt} onChange={e=>setHasPrompt(e.target.checked)} />
          {hasPrompt && <CallbackStatus refName={`object_prompts.${normalizeOid(oidText)}_prompt_f`} />}
        </div>

        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          {editing ? <button className="danger" onClick={handleDelete} title="Objekt löschen">Delete</button> : <span />}
          <div>
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
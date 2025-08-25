import { create } from 'zustand'
import { World, WorldSchema } from '../types/world'

export type EditorMeta = { positions: Record<string, { x: number, y: number }> }
const emptyWorld: World = { place_defs:{}, way_defs:{}, object_defs:{}, _editor:{ positions:{} } }

type State = { world: World, fileName: string | null }
type Actions = {
  loadFromText: (text: string) => void
  toJsonText: (pure?: boolean) => string
  addPlace: (displayName?: string, pos?: {x:number,y:number}) => string
  movePlace: (placeId: string, pos: {x:number,y:number}) => void
  connectPlaces: (sourceId: string, targetId: string) => void
  setFileName: (name: string | null) => void
}
function slug(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')
}
function firstCallname(p: { callnames: string[] | null | undefined }): string { return (p.callnames && p.callnames[0]) || 'platz' }
export const useStore = create<State & Actions>((set, get) => ({
  world: emptyWorld, fileName: null,
  loadFromText: (text) => {
    const obj = JSON.parse(text)
    const parsed = WorldSchema.parse(obj)
    const positions = parsed._editor?.positions ?? {}
    set({ world: { ...parsed, _editor: { positions } } })
  },
  toJsonText: (pure?: boolean) => {
    const w = get().world
    if (pure) { const { _editor, ...rest } = w as any; return JSON.stringify(rest, null, 2) }
    return JSON.stringify(w, null, 2)
  },
  addPlace: (displayName?: string, pos?: {x:number,y:number}) => {
    const w = structuredClone(get().world)
    const name = displayName || `Neuer Platz`
    const base = slug(name)
    let id = `p_${base || 'platz'}`
    let counter = 1
    while (w.place_defs[id]) id = `p_${base || 'platz'}_${counter++}`
    w.place_defs[id] = { description:"", place_prompt:"", place_prompt_f: null, callnames:[name], ways:[], objects:[] }
    const p = w._editor?.positions ?? {}; p[id] = pos ?? { x: 0, y: 0 }; w._editor = { positions: p }
    set({ world: w }); return id
  },
  movePlace: (placeId, pos) => {
    const w = structuredClone(get().world)
    const p = w._editor?.positions ?? {}; p[placeId] = pos; w._editor = { positions: p }
    set({ world: w })
  },
  connectPlaces: (sourceId, targetId) => {
    const w = structuredClone(get().world)
    const s = w.place_defs[sourceId]; const t = w.place_defs[targetId]; if (!s || !t) return
    const sc = slug(firstCallname(s)); const tc = slug(firstCallname(t))
    const idAB = `w_${sc}_${tc}`; const idBA = `w_${tc}_${sc}`
    function ensureWay(fromId: string, toId: string, wayId: string) {
      if (!w.way_defs[wayId]) { w.way_defs[wayId] = { source: fromId, destination: toId, text_direction: `zu ${firstCallname(w.place_defs[toId])}`, description: "", obstruction_check: null, way_prompt_f: null } }
      const p = w.place_defs[fromId]; if (!p.ways.includes(wayId)) p.ways.push(wayId)
    }
    ensureWay(sourceId, targetId, idAB); ensureWay(targetId, sourceId, idBA); set({ world: w })
  },
  setFileName: (name) => set({ fileName: name })
}))
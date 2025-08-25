import { World, Issue } from '../types/world'
import { validateCallback } from '../lib/callbacks'
const PLACE_PREFIX = 'p_'
const WAY_PREFIX = 'w_'
const OBJ_PREFIX = 'o_'
export function validateWorld(world: World): Issue[] {
  const issues: Issue[] = []
  const placeIds = new Set(Object.keys(world.place_defs))
  const wayIds   = new Set(Object.keys(world.way_defs))
  const objIds   = new Set(Object.keys(world.object_defs))
  for (const id of placeIds) { if (!id.startsWith(PLACE_PREFIX)) issues.push({ severity:'warning', code:'id.place.prefix', message:`Place id '${id}' should start with '${PLACE_PREFIX}'.`, path:['place_defs', id] })}
  for (const id of wayIds) { if (!id.startsWith(WAY_PREFIX)) issues.push({ severity:'warning', code:'id.way.prefix', message:`Way id '${id}' should start with '${WAY_PREFIX}'.`, path:['way_defs', id] })}
  for (const id of objIds) { if (!id.startsWith(OBJ_PREFIX)) issues.push({ severity:'warning', code:'id.object.prefix', message:`Object id '${id}' should start with '${OBJ_PREFIX}'.`, path:['object_defs', id] })}
  for (const [pid,p] of Object.entries(world.place_defs)) {
    if (!p.description || p.description.trim().length===0) issues.push({ severity:'error', code:'place.description.empty', message:`Place '${pid}' has empty description.`, path:['place_defs', pid, 'description'] })
    const v = validateCallback(p.place_prompt_f ?? null); if (!v.valid) issues.push({ severity:'warning', code:'place.callback.invalid', message:`place_prompt_f invalid: ${v.reason}`, path:['place_defs', pid, 'place_prompt_f'] })
    for (const wid of p.ways) if (!world.way_defs[wid]) issues.push({ severity:'error', code:'place.way.missing', message:`Place '${pid}' references missing way '${wid}'.`, path:['place_defs', pid, 'ways'] })
    for (const oid of p.objects) if (!world.object_defs[oid]) issues.push({ severity:'error', code:'place.object.missing', message:`Place '${pid}' references missing object '${oid}'.`, path:['place_defs', pid, 'objects'] })
  }
  for (const [wid,w] of Object.entries(world.way_defs)) {
    if (!w.text_direction || w.text_direction.trim().length===0) issues.push({ severity:'error', code:'way.text_direction.empty', message:`Way '${wid}' has empty text_direction.`, path:['way_defs', wid, 'text_direction'] })
    if (!('description' in w)) issues.push({ severity:'warning', code:'way.description.missing', message:`Way '${wid}' has missing/empty description.`, path:['way_defs', wid, 'description'] })
    if (!world.place_defs[w.source]) issues.push({ severity:'error', code:'way.source.missing', message:`Way '${wid}' source '${w.source}' does not exist.`, path:['way_defs', wid, 'source'] })
    if (!world.place_defs[w.destination]) issues.push({ severity:'error', code:'way.destination.missing', message:`Way '${wid}' destination '${w.destination}' does not exist.`, path:['way_defs', wid, 'destination'] })
    const v1 = validateCallback(w.obstruction_check ?? null); if (!v1.valid) issues.push({ severity:'warning', code:'way.obstruction_check.invalid', message:`obstruction_check invalid: ${v1.reason}`, path:['way_defs', wid, 'obstruction_check'] })
    const v2 = validateCallback(w.way_prompt_f ?? null); if (!v2.valid) issues.push({ severity:'warning', code:'way.way_prompt_f.invalid', message:`way_prompt_f invalid: ${v2.reason}`, path:['way_defs', wid, 'way_prompt_f'] })
  }
  const referencedWays = new Set<string>(); Object.values(world.place_defs).forEach(p => p.ways.forEach(wid => referencedWays.add(wid)))
  Object.keys(world.way_defs).forEach(wid => { if (!referencedWays.has(wid)) issues.push({ severity:'info', code:'way.unreferenced', message:`Way '${wid}' is not listed in any place.ways.`, path:['way_defs', wid] }) })
  const referencedObjects = new Set<string>(); Object.values(world.place_defs).forEach(p => p.objects.forEach(oid => referencedObjects.add(oid)))
  Object.entries(world.object_defs).forEach(([oid,obj]) => { if (!referencedObjects.has(oid) && (obj.ownedby===null || obj.ownedby===undefined)) issues.push({ severity:'info', code:'object.unreferenced', message:`Object '${oid}' is not listed in any place.objects and has no owner.`, path:['object_defs', oid] }) })
  return issues
}
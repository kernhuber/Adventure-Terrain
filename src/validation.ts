import { World, Issue } from './types/world'
import { validateCallback } from './lib/callbacks'

const PLACE_PREFIX = 'p_'
const WAY_PREFIX = 'w_'
const OBJ_PREFIX = 'o_'

export function validateWorld(world: World): Issue[] {
  const issues: Issue[] = []

  // Basic key prefix checks
  const placeIds = new Set(Object.keys(world.place_defs))
  const wayIds   = new Set(Object.keys(world.way_defs))
  const objIds   = new Set(Object.keys(world.object_defs))

  for (const id of placeIds) {
    if (!id.startsWith(PLACE_PREFIX)) {
      issues.push({ severity: 'warning', code: 'id.place.prefix', message: `Place id '${id}' should start with '${PLACE_PREFIX}'.`, path: ['place_defs', id] })
    }
  }
  for (const id of wayIds) {
    if (!id.startsWith(WAY_PREFIX)) {
      issues.push({ severity: 'warning', code: 'id.way.prefix', message: `Way id '${id}' should start with '${WAY_PREFIX}'.`, path: ['way_defs', id] })
    }
  }
  for (const id of objIds) {
    if (!id.startsWith(OBJ_PREFIX)) {
      issues.push({ severity: 'warning', code: 'id.object.prefix', message: `Object id '${id}' should start with '${OBJ_PREFIX}'.`, path: ['object_defs', id] })
    }
  }

  // Required field non-emptiness (semantic)
  for (const [pid, p] of Object.entries(world.place_defs)) {
    if (!p.description || p.description.trim().length === 0) {
      issues.push({ severity: 'error', code: 'place.description.empty', message: `Place '${pid}' has empty description.`, path: ['place_defs', pid, 'description'] })
    }
    // Validate callback if set
    const v = validateCallback(p.place_prompt_f ?? null)
    if (!v.valid) {
      issues.push({ severity: 'warning', code: 'place.callback.invalid', message: `place_prompt_f invalid: ${v.reason}`, path: ['place_defs', pid, 'place_prompt_f'] })
    }
    // ways references exist
    for (const wid of p.ways) {
      if (!world.way_defs[wid]) {
        issues.push({ severity: 'error', code: 'place.way.missing', message: `Place '${pid}' references missing way '${wid}'.`, path: ['place_defs', pid, 'ways'] })
      }
    }
    // objects references exist
    for (const oid of p.objects) {
      if (!world.object_defs[oid]) {
        issues.push({ severity: 'error', code: 'place.object.missing', message: `Place '${pid}' references missing object '${oid}'.`, path: ['place_defs', pid, 'objects'] })
      }
    }
  }

  for (const [wid, w] of Object.entries(world.way_defs)) {
    if (!w.text_direction || w.text_direction.trim().length === 0) {
      issues.push({ severity: 'error', code: 'way.text_direction.empty', message: `Way '${wid}' has empty text_direction.`, path: ['way_defs', wid, 'text_direction'] })
    }
    if (!w.description) {
      issues.push({ severity: 'warning', code: 'way.description.missing', message: `Way '${wid}' has missing/empty description.`, path: ['way_defs', wid, 'description'] })
    }
    if (!world.place_defs[w.source]) {
      issues.push({ severity: 'error', code: 'way.source.missing', message: `Way '${wid}' source '${w.source}' does not exist.`, path: ['way_defs', wid, 'source'] })
    }
    if (!world.place_defs[w.destination]) {
      issues.push({ severity: 'error', code: 'way.destination.missing', message: `Way '${wid}' destination '${w.destination}' does not exist.`, path: ['way_defs', wid, 'destination'] })
    }
    const v1 = validateCallback(w.obstruction_check ?? null)
    if (!v1.valid) {
      issues.push({ severity: 'warning', code: 'way.obstruction_check.invalid', message: `obstruction_check invalid: ${v1.reason}`, path: ['way_defs', wid, 'obstruction_check'] })
    }
    const v2 = validateCallback(w.way_prompt_f ?? null)
    if (!v2.valid) {
      issues.push({ severity: 'warning', code: 'way.way_prompt_f.invalid', message: `way_prompt_f invalid: ${v2.reason}`, path: ['way_defs', wid, 'way_prompt_f'] })
    }
  }

  for (const [oid, o] of Object.entries(world.object_defs)) {
    if (!o.examine || o.examine.trim().length === 0) {
      issues.push({ severity: 'error', code: 'object.examine.empty', message: `Object '${oid}' has empty examine.`, path: ['object_defs', oid, 'examine'] })
    }
    if (o.name !== oid) {
      issues.push({ severity: 'warning', code: 'object.name.mismatch', message: `Object '${oid}' has name '${o.name}' which differs from its key.`, path: ['object_defs', oid, 'name'] })
    }
    if (o.ownedby && !world.place_defs[o.ownedby]) {
      issues.push({ severity: 'error', code: 'object.ownedby.missing', message: `Object '${oid}' ownedby '${o.ownedby}' does not exist.`, path: ['object_defs', oid, 'ownedby'] })
    }
    for (const field of ['apply_f', 'reveal_f', 'take_f', 'prompt_f'] as const) {
      const val = (o as any)[field] ?? null
      const v = validateCallback(val)
      if (!v.valid) {
        issues.push({ severity: 'warning', code: `object.${field}.invalid`, message: `${field} invalid: ${v.reason}`, path: ['object_defs', oid, field] })
      }
    }
  }

  // Unused ways: not referenced by any place.ways
  const referencedWays = new Set<string>()
  for (const p of Object.values(world.place_defs)) {
    p.ways.forEach(wid => referencedWays.add(wid))
  }
  for (const wid of Object.keys(world.way_defs)) {
    if (!referencedWays.has(wid)) {
      issues.push({ severity: 'info', code: 'way.unreferenced', message: `Way '${wid}' is not listed in any place.ways.`, path: ['way_defs', wid] })
    }
  }

  // Unused objects: not listed in any place.objects and ownedby === null
  const referencedObjects = new Set<string>()
  for (const p of Object.values(world.place_defs)) {
    p.objects.forEach(oid => referencedObjects.add(oid))
  }
  for (const oid of Object.keys(world.object_defs)) {
    const obj = world.object_defs[oid]
    if (!referencedObjects.has(oid) && (obj.ownedby === null || obj.ownedby === undefined)) {
      issues.push({ severity: 'info', code: 'object.unreferenced', message: `Object '${oid}' is not listed in any place.objects and has no owner.`, path: ['object_defs', oid] })
    }
  }

  return issues
}

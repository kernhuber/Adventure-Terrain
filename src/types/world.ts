import { z } from 'zod'

export const CallbackModuleEnum = z.enum([
  "GameApplyFunctions",
  "GameTakeFunctions",
  "GameRevealFunctions",
  "GameObstructionCheckFunctions",
  "PlacePrompts",
  "ObjectPrompts",
  "WayPrompts"
])

export const CallbackRefSchema = z.string().nullable()

export const PlaceDefSchema = z.object({
  description: z.string(),
  place_prompt: z.string(),
  place_prompt_f: CallbackRefSchema.nullable().optional().transform(v => v ?? null),
  callnames: z.array(z.string()).nullable().optional().transform(v => v ?? null),
  ways: z.array(z.string()),
  objects: z.array(z.string())
})

export const WayDefSchema = z.object({
  source: z.string(),
  destination: z.string(),
  text_direction: z.string(),
  description: z.string(),
  obstruction_check: CallbackRefSchema.nullable().optional().transform(v => v ?? null),
  way_prompt_f: CallbackRefSchema.nullable().optional().transform(v => v ?? null)
})

export const ObjectDefSchema = z.object({
  name: z.string(),
  examine: z.string(),
  help_text: z.string().optional().default(""),
  callnames: z.array(z.string()).nullable().optional().transform(v => v ?? null),
  ownedby: z.string().nullable(),
  fixed: z.boolean().optional().default(false),
  hidden: z.boolean().optional().default(false),
  apply_f: CallbackRefSchema.nullable().optional().transform(v => v ?? null),
  reveal_f: CallbackRefSchema.nullable().optional().transform(v => v ?? null),
  take_f: CallbackRefSchema.nullable().optional().transform(v => v ?? null),
  prompt_f: CallbackRefSchema.nullable().optional().transform(v => v ?? null)
})

export const PlaceDefsSchema = z.record(z.string(), PlaceDefSchema)
export const WayDefsSchema   = z.record(z.string(), WayDefSchema)
export const ObjectDefsSchema= z.record(z.string(), ObjectDefSchema)

export const WorldSchema = z.object({
  place_defs: PlaceDefsSchema,
  way_defs: WayDefsSchema,
  object_defs: ObjectDefsSchema
}).passthrough()

export type PlaceDef = z.infer<typeof PlaceDefSchema>
export type WayDef   = z.infer<typeof WayDefSchema>
export type ObjectDef= z.infer<typeof ObjectDefSchema>
export type World    = z.infer<typeof WorldSchema>

export type Severity = 'error' | 'warning' | 'info'
export type Issue = { severity: Severity; code: string; message: string; path?: string[]; }

export type EditorMeta = { positions: Record<string, { x: number, y: number }> }

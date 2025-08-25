export type CallbackModule =
  | "GameApplyFunctions"
  | "GameTakeFunctions"
  | "GameRevealFunctions"
  | "GameObstructionCheckFunctions"
  | "PlacePrompts"
  | "ObjectPrompts"
  | "WayPrompts";

// Static registry (extend later or generate from backend)
export const callbackRegistry: Record<CallbackModule, string[]> = {
  GameApplyFunctions: ["o_warenautomat_apply_f"],
  GameTakeFunctions: [],
  GameRevealFunctions: [],
  GameObstructionCheckFunctions: [],
  PlacePrompts: [],
  ObjectPrompts: ["o_warenautomat_prompt_f"],
  WayPrompts: []
};

export function validateCallback(ref: string | null): { valid: boolean; reason?: string } {
  if (ref === null) return { valid: true };
  if (!ref || typeof ref !== "string") return { valid: false, reason: "empty" };
  const parts = ref.split(".");
  if (parts.length !== 2) return { valid: false, reason: "invalid format" };
  const [module, func] = parts;
  const allowedModules = Object.keys(callbackRegistry) as CallbackModule[];
  if (!allowedModules.includes(module as CallbackModule)) {
    return { valid: false, reason: `unknown module '${module}'` };
  }
  if (!func || !callbackRegistry[module as CallbackModule].includes(func)) {
    return { valid: false, reason: `unknown function '${func}' in ${module}` };
  }
  return { valid: true };
}

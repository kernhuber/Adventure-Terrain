// Callback module names MUST match the snake_case keys of `module_map` in
// ../Adventure/game_state.py. A reference whose module is not one of these resolves
// to None at runtime (services/world_loader.py) — silently, with no game error.
export type CallbackModule =
  | "game_apply_functions"
  | "game_take_functions"
  | "game_reveal_functions"
  | "game_obstruction_check_functions"
  | "place_prompts"
  | "object_prompts"
  | "way_prompts";

// Known function names per module, mirrored from the Adventure Python modules.
// Used for autocomplete/hints only — NOT as a hard validation allowlist, since the list
// drifts as the game grows. Regenerate from ../Adventure/*.py when it gets stale.
export const callbackRegistry: Record<CallbackModule, string[]> = {
  game_apply_functions: ["o_schluessel_apply_f", "o_umschlag_apply_f", "o_warenautomat_apply_f", "o_muelleimer_apply_f", "o_salami_apply_f", "o_geheimzahl_apply_f", "o_tuerschliesser_apply_f", "o_pizzaautomat_apply_f", "o_geld_lire_apply_f", "o_pizza_apply_f", "o_geldautomat_apply_f", "o_geld_dollar_apply_f", "o_schuppen_apply_f", "o_blumentopf_apply_f", "o_stuhl_apply_f", "o_schrott_apply_f", "o_hebel_apply_f", "o_sprengladung_apply_f", "o_felsen_apply_f", "o_hauptschalter_apply_f", "o_leiter_apply_f", "o_skelett_apply_f", "o_geldboerse_apply_f", "o_ec_karte_apply_f", "o_pinsel_apply_f", "o_farbeimer_apply_f", "o_fahrradkette_apply_f", "o_wasserspender_apply_f", "o_flasche_apply_f", "o_falltuer_apply_f", "o_tinktur_apply_f", "o_schalter_kontrollraum_apply_f", "o_schalter_generatorraum_apply_f", "o_manual_apply_f", "o_stahltuer_apply_f", "o_werbeplakat_apply_f"],
  game_take_functions: ["o_leiter_take_f", "o_fahrradkette_take_f", "o_geldboerse_take_f", "o_blumentopf_take_f"],
  game_reveal_functions: ["o_blumentopf_reveal_f", "o_skelett_reveal_f", "o_geldboerse_reveal_f", "o_muelleimer_reveal_f"],
  game_obstruction_check_functions: ["w_schuppen_innen_obstruction_check", "w_warenautomat_ubahn_obstruction_check", "w_felsen_hoehle_obstruction_check", "w_schuppen_dach_obstruction_check", "w_wagen_ubahn_obstruction_check", "w_ubahn_wagen_obstruction_check", "w_wagen_ubahn2_obstruction_check", "w_ubahn2_wagen_obstruction_check", "w_hoehle_korridor_obstruction_check", "w_korridor_hoehle_obstruction_check", "w_solaranlage_ubahn2_obstruction_check", "w_ubahn2_solaranlage_obstruction_check", "w_ubahn2_kontrollraum_obstruction_check", "w_kontrollraum_ubahn2_obstruction_check", "w_ubahn2_ubahnschacht_obstruction_check", "w_ubahnschacht_ubahn2_obstruction_check", "w_ubahn_schacht_korridor_obstruction_check", "w_labor_korridor_obstruction_check", "w_korridor_labor_obstruction_check", "w_korridor_bibliothek_obstruction_check", "w_korridor_besenkammer_obstruction_check", "w_besenkammer_korridor_obstruction_check", "w_generatorraum_labor_obstruction_check", "w_labor_generatorraum_obstruction_check"],
  place_prompts: ["p_warenautomat_place_prompt_f", "p_felsnische_place_prompt_f", "p_hoehle_place_prompt_f", "p_schuppen_place_prompt_f", "p_innen_place_prompt_f", "p_geldautomat_place_prompt_f", "p_ubahn_place_prompt_f", "p_ubahn2_place_prompt_f", "p_solaranlage_place_prompt_f", "p_kontrollraum_place_prompt_f", "p_ubahn_schacht_place_prompt_f", "p_korridor_place_prompt_f", "p_labor_place_prompt_f", "p_bibliothek_place_prompt_f", "p_besenkammer_place_prompt_f", "p_generatorraum_place_prompt_f"],
  object_prompts: ["o_umschlag_prompt_f", "o_warenautomat_prompt_f", "o_fahrradkette_prompt_f", "o_fahrrad_prompt_f", "o_muelleimer_prompt_f", "o_salami_prompt_f", "o_geheimzahl_prompt_f", "o_tuerschliesser_prompt_f", "o_pizzaautomat_prompt_f", "o_geld_lire_prompt_f", "o_pizza_prompt_f", "o_geldautomat_prompt_f", "o_geld_dollar_prompt_f", "o_schuppen_prompt_f", "o_blumentopf_prompt_f", "o_schluessel_prompt_f", "o_stuhl_prompt_f", "o_schrott_prompt_f", "o_hebel_prompt_f", "o_leiter_prompt_f", "o_skelett_prompt_f", "o_geldboerse_prompt_f", "o_ec_karte_prompt_f", "o_pinsel_prompt_f", "o_farbeimer_prompt_f", "o_sprengladung_prompt_f", "o_felsen_prompt_f", "o_hauptschalter_prompt_f", "o_wasserspender_prompt_f", "o_flasche_prompt_f", "o_solaranlage_prompt_f", "o_falltuer_prompt_f", "o_tinktur_prompt_f", "o_schalter_kontrollraum_prompt_f", "o_schalter_generatorraum_prompt_f", "o_stahltuer_prompt_f", "o_manual_prompt_f", "o_werbeplakat_prompt_f"],
  way_prompts: ["w_schuppen_dach_prompt_f", "w_dach_schuppen_prompt_f", "w_innen_schuppen_prompt_f", "w_ubahn_warenautomat_prompt_f", "w_hoehle_felsen_prompt_f", "w_solaranlage_plateau_prompt_f", "w_plateau_solaranlage_prompt_f", "w_plateau_felsen_prompt_f", "w_felsen_plateau_prompt_f", "w_ubahn2_ubahnschacht_prompt_f", "w_ubahnschacht_ubahn2_prompt_f", "w_hoehle_korridor_prompt_f", "w_korridor_hohle_prompt_f"]
};

export const CALLBACK_MODULES = Object.keys(callbackRegistry) as CallbackModule[];

// Validate a "module.function" reference. We enforce the dotted format and a known
// snake_case module (the part that must match the runtime to resolve), and accept any
// well-formed function name. Whether the Python function actually exists is surfaced by
// the "Export Runtime" stub generator, not by hard validation here.
export function validateCallback(ref: string | null): { valid: boolean; reason?: string } {
  if (ref === null) return { valid: true };
  if (!ref || typeof ref !== "string") return { valid: false, reason: "empty" };
  const parts = ref.split(".");
  if (parts.length !== 2) return { valid: false, reason: "invalid format (expected 'module.function')" };
  const [module, func] = parts;
  if (!CALLBACK_MODULES.includes(module as CallbackModule)) {
    return { valid: false, reason: `unknown module '${module}' (expected one of: ${CALLBACK_MODULES.join(", ")})` };
  }
  if (!func) return { valid: false, reason: "missing function name" };
  return { valid: true };
}

// True if the function is a known name in the Adventure modules (autocomplete hint).
export function isKnownCallback(ref: string | null): boolean {
  if (!ref) return false;
  const [module, func] = ref.split(".");
  return CALLBACK_MODULES.includes(module as CallbackModule) && callbackRegistry[module as CallbackModule]?.includes(func);
}

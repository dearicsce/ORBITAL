export const RULE_PRESETS = {
  reserve: {Late: [15, 30], Standard: [22, 40], Early: [35, 55]},
  hot: {Late: [69, 58], Standard: [62, 51], Early: [54, 43]},
  recorder: {Late: [88, 40], Standard: [70, 25], Early: [50, 15]}
};
export const DEFAULT_RULES = Object.freeze({
  reserve:true, hot:true, recorder:true,
  reservePreset:'Standard', hotPreset:'Standard', recorderPreset:'Standard'
});

export function validateRules(input) {
  if (input === undefined) return {...DEFAULT_RULES};
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !Object.hasOwn(DEFAULT_RULES,key))) throw Error('Invalid Autopilot rules');
  const rules = {...DEFAULT_RULES,...input};
  for (const [key,presets] of Object.entries(RULE_PRESETS)) {
    if (typeof rules[key] !== 'boolean' || !Object.hasOwn(presets,rules[key+'Preset'])) throw Error('Invalid Autopilot '+key+' rule');
  }
  return rules;
}

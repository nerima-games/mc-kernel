import { snapshotAnvilState } from './anvil-snapshot-codec.js'
import { finalizeAnvilPlan, initialTransformationOf, mergeEnchantments, nextAnvilRepairCost, repairOf, withRename } from './anvil-transformation.js'
import { validateInputEnchantments, validateRuleSet } from './anvil-validation.js'
import type { AnvilPlan, AnvilRuleSet, AnvilState } from './anvil.js'

export { ANVIL_REPAIR_BONUS_RATIO, ANVIL_TOO_EXPENSIVE_LEVEL } from './anvil-constants.js'
export { nextAnvilRepairCost }

export const planAnvil = (state: AnvilState, rules: AnvilRuleSet): AnvilPlan => {
  const snapshot = snapshotAnvilState(state)
  if (!snapshot.ok) return { ok: false, reason: 'invalid-input', issues: snapshot.issues }

  const { left, right, rename } = snapshot.snapshot.state
  if (left === null) {
    return {
      ok: false,
      reason: 'invalid-input',
      issues: [{ path: '$.state.left', reason: 'an anvil requires a left input' }],
    }
  }

  const ruleValidation = validateRuleSet(rules)
  if (!ruleValidation.ok) return ruleValidation
  const { definitions } = ruleValidation

  const inputFailure = validateInputEnchantments(left, right, definitions)
  if (inputFailure !== undefined) return inputFailure

  let transformation = initialTransformationOf(left)
  if (right !== null) {
    const repairResult = repairOf(left, right, rules, transformation)
    if (repairResult !== undefined) {
      if ('failure' in repairResult) return repairResult.failure
      transformation = repairResult.state
    }

    const enchantmentResult = mergeEnchantments(left, right, definitions, transformation)
    if (enchantmentResult !== undefined) {
      if ('failure' in enchantmentResult) return enchantmentResult.failure
      transformation = enchantmentResult.state
    }
  }

  return finalizeAnvilPlan(left, right, rename, withRename(left, rename, transformation))
}

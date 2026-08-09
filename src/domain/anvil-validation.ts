import { isEnchantmentId, isPositiveSafeInteger } from './anvil-primitives.js'
import type {
  AnvilEnchantmentId,
  AnvilEnchantmentRule,
  AnvilPlan,
  AnvilRejectionReason,
  AnvilRuleSet,
  CanonicalAnvilItemPayload,
} from './anvil.js'
import type { StackCount } from './quantities.js'

export type AnvilPlanFailure = Extract<AnvilPlan, { readonly ok: false }>

export type CanonicalAnvilStateRight = {
  readonly payload: CanonicalAnvilItemPayload
  readonly count: StackCount
}

export const rejection = (
  reason: Exclude<AnvilRejectionReason, 'insufficient-experience'>,
  path: string,
  message: string,
): AnvilPlanFailure => ({ ok: false, reason, issues: [{ path, reason: message }] })

export const conflicts = (
  leftId: AnvilEnchantmentId,
  rightId: AnvilEnchantmentId,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
): boolean => {
  if (leftId === rightId) return false

  return (
    definitions.get(leftId)?.incompatibleWith.includes(rightId) === true ||
    definitions.get(rightId)?.incompatibleWith.includes(leftId) === true
  )
}

const validateEnchantmentSet = (
  payload: CanonicalAnvilItemPayload,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
  sourceBook: boolean,
): AnvilPlanFailure | undefined => {
  for (const [index, enchantment] of payload.enchantments.entries()) {
    const definition = definitions.get(enchantment.id)
    if (definition === undefined || enchantment.level > definition.maxLevel) {
      return rejection('invalid-enchantment', `$.enchantments.${String(index)}`, 'is unregistered or exceeds its level cap')
    }
    if (!sourceBook && !definition.applicableItems.includes(payload.item)) {
      return rejection('invalid-enchantment', `$.enchantments.${String(index)}`, 'does not apply to this item')
    }
    if (payload.enchantments.some((other) => conflicts(enchantment.id, other.id, definitions))) {
      return rejection('enchantment-conflict', `$.enchantments.${String(index)}`, 'conflicts with another enchantment')
    }
  }

  return undefined
}

export const validateRuleSet = (
  rules: AnvilRuleSet,
):
  | { readonly ok: true; readonly definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule> }
  | AnvilPlanFailure => {
  const definitions = new Map<AnvilEnchantmentId, AnvilEnchantmentRule>()

  for (const [index, rule] of rules.enchantments.entries()) {
    const invalidIncompatibleWith = rule.incompatibleWith.some((id) => !isEnchantmentId(id))
    if (
      !isEnchantmentId(rule.id) ||
      invalidIncompatibleWith ||
      !isPositiveSafeInteger(rule.maxLevel) ||
      (rule.costPerLevel !== undefined && !isPositiveSafeInteger(rule.costPerLevel)) ||
      definitions.has(rule.id)
    ) {
      return rejection('invalid-rules', `$.rules.enchantments.${String(index)}`, 'contains an invalid or duplicate rule')
    }
    definitions.set(rule.id, rule)
  }

  for (const [index, rule] of (rules.repairMaterials ?? []).entries()) {
    if (!isPositiveSafeInteger(rule.durabilityPerUnit)) {
      return rejection('invalid-rules', `$.rules.repairMaterials.${String(index)}`, 'durabilityPerUnit must be positive')
    }
  }

  return { ok: true, definitions }
}

export const validateInputEnchantments = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight | null,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
): AnvilPlanFailure | undefined => {
  const leftFailure = validateEnchantmentSet(left, definitions, left.item === 'enchanted_book')
  if (leftFailure !== undefined) return leftFailure
  if (right === null) return undefined
  return validateEnchantmentSet(right.payload, definitions, right.payload.item === 'enchanted_book')
}

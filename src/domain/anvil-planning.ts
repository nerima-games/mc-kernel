import { isEnchantmentId, isPositiveSafeInteger } from './anvil-primitives.js'
import { canonicalEnchantments } from './anvil-normalization.js'
import { snapshotAnvilState } from './anvil-snapshot-codec.js'
import { StackCount } from './quantities.js'
import type {
  AnvilDurability,
  AnvilEnchantment,
  AnvilEnchantmentId,
  AnvilEnchantmentRule,
  AnvilPlan,
  AnvilRejectionReason,
  AnvilRuleSet,
  AnvilState,
  CanonicalAnvilItemPayload,
} from './anvil.js'

export const ANVIL_TOO_EXPENSIVE_LEVEL = 40
export const ANVIL_REPAIR_BONUS_RATIO = 0.12

type AnvilPlanFailure = Extract<AnvilPlan, { readonly ok: false }>

type TransformationState = {
  readonly durability: AnvilDurability | null
  readonly enchantments: ReadonlyArray<AnvilEnchantment>
  readonly operationCost: number
  readonly materialCost: StackCount
  readonly rightContributed: boolean
}

type TransformationResult =
  | { readonly state: TransformationState }
  | { readonly failure: AnvilPlanFailure }

type CanonicalAnvilStateRight = {
  readonly payload: CanonicalAnvilItemPayload
  readonly count: StackCount
}

const rejection = (
  reason: Exclude<AnvilRejectionReason, 'insufficient-experience'>,
  path: string,
  message: string,
): AnvilPlanFailure => ({ ok: false, reason, issues: [{ path, reason: message }] })

const conflicts = (
  leftId: AnvilEnchantmentId,
  rightId: AnvilEnchantmentId,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
): boolean => {
  if (leftId === rightId) return false
  return definitions.get(leftId)?.incompatibleWith.includes(rightId) === true ||
    definitions.get(rightId)?.incompatibleWith.includes(leftId) === true
}

const validateRuleSet = (
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

const validateInputEnchantments = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight | null,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
): AnvilPlanFailure | undefined => {
  const leftFailure = validateEnchantmentSet(left, definitions, left.item === 'enchanted_book')
  if (leftFailure !== undefined) return leftFailure
  if (right === null) return undefined
  return validateEnchantmentSet(right.payload, definitions, right.payload.item === 'enchanted_book')
}

const safeAdd = (left: number, right: number): number =>
  Math.min(Number.MAX_SAFE_INTEGER, left + right)

export const nextAnvilRepairCost = (repairCost: number): number =>
  Math.min(Number.MAX_SAFE_INTEGER, repairCost * 2 + 1)

const initialTransformationOf = (left: CanonicalAnvilItemPayload): TransformationState => ({
  durability: left.durability === null ? null : { ...left.durability },
  enchantments: [...left.enchantments],
  operationCost: 0,
  materialCost: StackCount(0),
  rightContributed: false,
})

const repairWithSameItem = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight,
  transformation: TransformationState,
): TransformationResult | undefined => {
  if (right.payload.item !== left.item || transformation.durability === null) return undefined

  const rightDurability = right.payload.durability
  if (rightDurability === null || rightDurability.max !== transformation.durability.max) {
    return {
      failure: rejection('incompatible-input', '$.state.right.payload.durability', 'must match the left item durability'),
    }
  }

  const repaired = Math.min(
    transformation.durability.max,
    transformation.durability.current + rightDurability.current +
      Math.floor(transformation.durability.max * ANVIL_REPAIR_BONUS_RATIO),
  )
  if (repaired <= transformation.durability.current) return { state: transformation }

  return {
    state: {
      ...transformation,
      durability: { current: repaired, max: transformation.durability.max },
      operationCost: safeAdd(transformation.operationCost, 2),
      materialCost: StackCount(1),
      rightContributed: true,
    },
  }
}

const hasRepairMaterialState = (payload: CanonicalAnvilItemPayload): boolean =>
  payload.durability !== null ||
  payload.enchantments.length > 0 ||
  payload.customName !== null ||
  payload.repairCost !== 0

const repairWithMaterial = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight,
  rules: AnvilRuleSet,
  transformation: TransformationState,
): TransformationResult | undefined => {
  const repairRule = (rules.repairMaterials ?? []).find(
    (candidate) => candidate.target === left.item && candidate.material === right.payload.item,
  )
  if (repairRule === undefined || transformation.durability === null) return undefined
  if (hasRepairMaterialState(right.payload)) {
    return {
      failure: rejection('incompatible-input', '$.state.right.payload', 'repair material must not carry per-item state'),
    }
  }

  const missing = transformation.durability.max - transformation.durability.current
  const units = Math.min(right.count, Math.ceil(missing / repairRule.durabilityPerUnit))
  if (units <= 0) return { state: transformation }

  return {
    state: {
      ...transformation,
      durability: {
        current: Math.min(
          transformation.durability.max,
          transformation.durability.current + units * repairRule.durabilityPerUnit,
        ),
        max: transformation.durability.max,
      },
      operationCost: safeAdd(transformation.operationCost, units),
      materialCost: StackCount(units),
      rightContributed: true,
    },
  }
}

const repairOf = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight,
  rules: AnvilRuleSet,
  transformation: TransformationState,
): TransformationResult | undefined =>
  repairWithSameItem(left, right, transformation) ?? repairWithMaterial(left, right, rules, transformation)

const mergedLevelOf = (
  existing: AnvilEnchantment | undefined,
  source: AnvilEnchantment,
  maxLevel: number,
): number => {
  if (existing === undefined) return Math.min(maxLevel, source.level)
  if (existing.level === source.level) return Math.min(maxLevel, source.level + 1)
  return Math.min(maxLevel, Math.max(existing.level, source.level))
}

const enchantmentsWith = (
  enchantments: ReadonlyArray<AnvilEnchantment>,
  existing: AnvilEnchantment | undefined,
  source: AnvilEnchantment,
  mergedLevel: number,
): ReadonlyArray<AnvilEnchantment> => {
  if (existing === undefined) return [...enchantments, { id: source.id, level: mergedLevel }]
  return enchantments.map((candidate) => {
    if (candidate.id === source.id) return { id: source.id, level: mergedLevel }
    return candidate
  })
}

const mergeOneEnchantment = (
  left: CanonicalAnvilItemPayload,
  source: AnvilEnchantment,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
  transformation: TransformationState,
): TransformationResult => {
  const definition = definitions.get(source.id)
  if (definition === undefined || (left.item !== 'enchanted_book' && !definition.applicableItems.includes(left.item))) {
    return {
      failure: rejection('invalid-enchantment', '$.state.right.payload.enchantments', 'does not apply to the output item'),
    }
  }

  const existing = transformation.enchantments.find((candidate) => candidate.id === source.id)
  const mergedLevel = mergedLevelOf(existing, source, definition.maxLevel)
  if (transformation.enchantments.some((candidate) => conflicts(candidate.id, source.id, definitions))) {
    return {
      failure: rejection('enchantment-conflict', '$.state.right.payload.enchantments', 'conflicts with the output item'),
    }
  }
  if (existing !== undefined && existing.level === mergedLevel) return { state: transformation }

  return {
    state: {
      ...transformation,
      enchantments: enchantmentsWith(transformation.enchantments, existing, source, mergedLevel),
      operationCost: safeAdd(
        transformation.operationCost,
        mergedLevel * (definition.costPerLevel ?? 1),
      ),
      materialCost: StackCount(Math.max(transformation.materialCost, 1)),
      rightContributed: true,
    },
  }
}

const mergeEnchantments = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight,
  definitions: ReadonlyMap<AnvilEnchantmentId, AnvilEnchantmentRule>,
  transformation: TransformationState,
): TransformationResult | undefined => {
  if (right.payload.item !== 'enchanted_book' && right.payload.item !== left.item) return undefined

  let next = transformation
  for (const source of right.payload.enchantments) {
    const result = mergeOneEnchantment(left, source, definitions, next)
    if ('failure' in result) return result
    next = result.state
  }
  return { state: next }
}

const withRename = (
  left: CanonicalAnvilItemPayload,
  rename: CanonicalAnvilItemPayload['customName'],
  transformation: TransformationState,
): TransformationState => {
  if (rename === left.customName) return transformation
  return { ...transformation, operationCost: safeAdd(transformation.operationCost, 1) }
}

const finalizePlan = (
  left: CanonicalAnvilItemPayload,
  right: CanonicalAnvilStateRight | null,
  rename: CanonicalAnvilItemPayload['customName'],
  transformation: TransformationState,
): AnvilPlan => {
  if (right !== null && !transformation.rightContributed) {
    return rejection('incompatible-input', '$.state.right', 'does not repair or enchant the left input')
  }
  if (transformation.operationCost === 0) {
    return rejection('nothing-to-do', '$.state', 'does not change the output item')
  }

  let levelCost = safeAdd(transformation.operationCost, left.repairCost)
  if (right !== null) levelCost = safeAdd(levelCost, right.payload.repairCost)
  if (levelCost >= ANVIL_TOO_EXPENSIVE_LEVEL) {
    return rejection('too-expensive', '$.state', 'level cost reaches the survival anvil limit')
  }

  const priorRepairCost = Math.max(left.repairCost, right?.payload.repairCost ?? 0)
  return {
    ok: true,
    output: {
      item: left.item,
      durability: transformation.durability,
      enchantments: canonicalEnchantments(transformation.enchantments),
      repairCost: nextAnvilRepairCost(priorRepairCost),
      customName: rename,
    },
    levelCost,
    materialCost: transformation.materialCost,
  }
}

export const planAnvil = (state: AnvilState, rules: AnvilRuleSet): AnvilPlan => {
  const snapshot = snapshotAnvilState(state)
  if (!snapshot.ok) return { ok: false, reason: 'invalid-input', issues: snapshot.issues }

  const { left, right, rename } = snapshot.snapshot.state
  if (left === null) return rejection('invalid-input', '$.state.left', 'an anvil requires a left input')

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

  return finalizePlan(left, right, rename, withRename(left, rename, transformation))
}

/* eslint-disable complexity, curly, init-declarations, max-statements, no-continue, no-control-regex, no-magic-numbers, no-nested-ternary, no-ternary, no-undefined, prefer-destructuring, sort-keys -- Validation and deterministic anvil rules intentionally expose the complete wire contract in one module. */
import { type ItemType } from './item-type.js'
import { StackCount } from './quantities.js'
import { Brand } from 'effect'
import {
  ANVIL_MAX_CUSTOM_NAME_LENGTH as maxCustomNameLength,
  ANVIL_SNAPSHOT_VERSION as snapshotVersion,
  AnvilCustomName as createAnvilCustomName,
  AnvilEnchantmentId as createAnvilEnchantmentId,
  isAnvilCustomName as narrowAnvilCustomName,
  isAnvilEnchantmentId as narrowAnvilEnchantmentId,
  isEnchantmentId,
  isPositiveSafeInteger,
} from './anvil-primitives.js'
import { canonicalEnchantments } from './anvil-normalization.js'
import {
  AnvilSnapshotString as createAnvilSnapshotString,
  decodeAnvilSnapshot,
  decodeAnvilSnapshotString,
  encodeAnvilSnapshot,
  isAnvilSnapshotString,
  snapshotAnvilState,
} from './anvil-snapshot-codec.js'

export const ANVIL_SNAPSHOT_VERSION = snapshotVersion
export const ANVIL_TOO_EXPENSIVE_LEVEL = 40
export const ANVIL_REPAIR_BONUS_RATIO = 0.12
export const ANVIL_MAX_CUSTOM_NAME_LENGTH = maxCustomNameLength

export type AnvilEnchantmentId = string & Brand.Brand<'AnvilEnchantmentId'>
export type AnvilCustomName = string & Brand.Brand<'AnvilCustomName'>

export type AnvilDurability = {
  readonly current: number
  readonly max: number
}

export type AnvilEnchantment = {
  readonly id: AnvilEnchantmentId
  readonly level: number
}

/** Structurally compatible with mx-gameplay's EnchantedItem wire shape. */
export type AnvilItemPayload = {
  readonly item: ItemType
  readonly durability: AnvilDurability | null
  readonly enchantments: ReadonlyArray<AnvilEnchantment>
  readonly repairCost?: number
  readonly customName?: AnvilCustomName | null
}

export type CanonicalAnvilItemPayload = {
  readonly item: ItemType
  readonly durability: AnvilDurability | null
  readonly enchantments: ReadonlyArray<AnvilEnchantment>
  readonly repairCost: number
  readonly customName: AnvilCustomName | null
}

export type AnvilInputStack = {
  readonly payload: AnvilItemPayload
  readonly count: number
}

export type AnvilState = {
  readonly left: AnvilItemPayload | null
  readonly right: AnvilInputStack | null
  /** Desired output name. Use null to clear an existing custom name. */
  readonly rename: AnvilCustomName | null
  readonly experienceLevels: number
}

export type CanonicalAnvilState = {
  readonly left: CanonicalAnvilItemPayload | null
  readonly right: {
    readonly payload: CanonicalAnvilItemPayload
    readonly count: StackCount
  } | null
  readonly rename: AnvilCustomName | null
  readonly experienceLevels: number
}

export type AnvilEnchantmentRule = {
  readonly id: AnvilEnchantmentId
  readonly maxLevel: number
  readonly applicableItems: ReadonlyArray<ItemType>
  readonly incompatibleWith: ReadonlyArray<AnvilEnchantmentId>
  readonly costPerLevel?: number
}

export type AnvilRepairMaterialRule = {
  readonly target: ItemType
  readonly material: ItemType
  readonly durabilityPerUnit: number
}

export type AnvilRuleSet = {
  readonly enchantments: ReadonlyArray<AnvilEnchantmentRule>
  readonly repairMaterials?: ReadonlyArray<AnvilRepairMaterialRule>
}

export type AnvilValidationIssue = {
  readonly path: string
  readonly reason: string
}

export type AnvilSnapshot = {
  readonly version: typeof ANVIL_SNAPSHOT_VERSION
  readonly state: CanonicalAnvilState
}

export type AnvilSnapshotString = string & Brand.Brand<'AnvilSnapshotString'>

export type AnvilSnapshotResult =
  | { readonly ok: true; readonly snapshot: AnvilSnapshot }
  | { readonly ok: false; readonly issues: ReadonlyArray<AnvilValidationIssue> }

export type AnvilSnapshotEncodingResult =
  | { readonly ok: true; readonly encoded: AnvilSnapshotString; readonly snapshot: AnvilSnapshot }
  | { readonly ok: false; readonly issues: ReadonlyArray<AnvilValidationIssue> }

export type AnvilRejectionReason =
  | 'invalid-input'
  | 'invalid-rules'
  | 'incompatible-input'
  | 'invalid-enchantment'
  | 'enchantment-conflict'
  | 'nothing-to-do'
  | 'too-expensive'
  | 'insufficient-experience'

export type AnvilPlan =
  | {
      readonly ok: true
      readonly output: CanonicalAnvilItemPayload
      readonly levelCost: number
      readonly materialCost: StackCount
    }
  | {
      readonly ok: false
      readonly reason: Exclude<AnvilRejectionReason, 'insufficient-experience'>
      readonly issues: ReadonlyArray<AnvilValidationIssue>
    }

type AnvilPlanFailure = Extract<AnvilPlan, { readonly ok: false }>

export type AnvilApplyResult =
  | {
      readonly ok: true
      readonly state: CanonicalAnvilState
      readonly output: CanonicalAnvilItemPayload
      readonly levelCost: number
      readonly materialCost: StackCount
    }
  | {
      readonly ok: false
      readonly state: AnvilState
      readonly reason: AnvilRejectionReason
      readonly issues: ReadonlyArray<AnvilValidationIssue>
    }

/** Narrow external text to a canonical enchantment id without throwing. */
export const isAnvilEnchantmentId = narrowAnvilEnchantmentId

/** Narrow external text to a canonical custom name without throwing. */
export const isAnvilCustomName = narrowAnvilCustomName

export const AnvilEnchantmentId = createAnvilEnchantmentId

export const AnvilCustomName = createAnvilCustomName

export const AnvilSnapshotString = createAnvilSnapshotString

export {
  decodeAnvilSnapshot,
  decodeAnvilSnapshotString,
  encodeAnvilSnapshot,
  isAnvilSnapshotString,
  snapshotAnvilState,
}

export const nextAnvilRepairCost = (repairCost: number): number =>
  Math.min(Number.MAX_SAFE_INTEGER, repairCost * 2 + 1)

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

const safeAdd = (left: number, right: number): number =>
  Math.min(Number.MAX_SAFE_INTEGER, left + right)

export const planAnvil = (state: AnvilState, rules: AnvilRuleSet): AnvilPlan => {
  const snapshot = snapshotAnvilState(state)
  if (!snapshot.ok) return { ok: false, reason: 'invalid-input', issues: snapshot.issues }
  const { left, right, rename } = snapshot.snapshot.state
  if (left === null) return rejection('invalid-input', '$.state.left', 'an anvil requires a left input')

  const ruleValidation = validateRuleSet(rules)
  if (!ruleValidation.ok) return ruleValidation
  const { definitions } = ruleValidation

  const leftValidation = validateEnchantmentSet(left, definitions, left.item === 'enchanted_book')
  if (leftValidation !== undefined) return leftValidation
  if (right !== null) {
    const rightValidation = validateEnchantmentSet(
      right.payload,
      definitions,
      right.payload.item === 'enchanted_book',
    )
    if (rightValidation !== undefined) return rightValidation
  }

  let durability = left.durability === null ? null : { ...left.durability }
  let enchantments = [...left.enchantments]
  let operationCost = 0
  let materialCost = StackCount(0)
  let rightContributed = false

  if (right !== null && right.payload.item === left.item && durability !== null) {
    const rightDurability = right.payload.durability
    if (rightDurability === null || rightDurability.max !== durability.max) {
      return rejection('incompatible-input', '$.state.right.payload.durability', 'must match the left item durability')
    }
    const repaired = Math.min(
      durability.max,
      durability.current + rightDurability.current + Math.floor(durability.max * ANVIL_REPAIR_BONUS_RATIO),
    )
    if (repaired > durability.current) {
      durability = { current: repaired, max: durability.max }
      operationCost = safeAdd(operationCost, 2)
      materialCost = StackCount(1)
      rightContributed = true
    }
  } else if (right !== null) {
    const repairRule = (rules.repairMaterials ?? []).find(
      (candidate) => candidate.target === left.item && candidate.material === right.payload.item,
    )
    if (repairRule !== undefined && durability !== null) {
      if (
        right.payload.durability !== null ||
        right.payload.enchantments.length > 0 ||
        right.payload.customName !== null ||
        right.payload.repairCost !== 0
      ) {
        return rejection('incompatible-input', '$.state.right.payload', 'repair material must not carry per-item state')
      }
      const missing = durability.max - durability.current
      const units = Math.min(right.count, Math.ceil(missing / repairRule.durabilityPerUnit))
      if (units > 0) {
        durability = {
          current: Math.min(durability.max, durability.current + units * repairRule.durabilityPerUnit),
          max: durability.max,
        }
        operationCost = safeAdd(operationCost, units)
        materialCost = StackCount(units)
        rightContributed = true
      }
    }
  }

  if (right !== null && (right.payload.item === 'enchanted_book' || right.payload.item === left.item)) {
    for (const source of right.payload.enchantments) {
      const definition = definitions.get(source.id)
      if (definition === undefined || (left.item !== 'enchanted_book' && !definition.applicableItems.includes(left.item))) {
        return rejection('invalid-enchantment', '$.state.right.payload.enchantments', 'does not apply to the output item')
      }
      const existing = enchantments.find((candidate) => candidate.id === source.id)
      const mergedLevel = Math.min(
        definition.maxLevel,
        existing?.level === source.level ? source.level + 1 : Math.max(existing?.level ?? 0, source.level),
      )
      if (enchantments.some((candidate) => conflicts(candidate.id, source.id, definitions))) {
        return rejection('enchantment-conflict', '$.state.right.payload.enchantments', 'conflicts with the output item')
      }
      if (existing === undefined || existing.level !== mergedLevel) {
        enchantments = existing === undefined
          ? [...enchantments, { id: source.id, level: mergedLevel }]
          : enchantments.map((candidate) => candidate.id === source.id
            ? { id: source.id, level: mergedLevel }
            : candidate)
        operationCost = safeAdd(operationCost, mergedLevel * (definition.costPerLevel ?? 1))
        materialCost = StackCount(Math.max(materialCost, 1))
        rightContributed = true
      }
    }
  }

  if (right !== null && !rightContributed) {
    return rejection('incompatible-input', '$.state.right', 'does not repair or enchant the left input')
  }

  const renamed = rename !== left.customName
  if (renamed) operationCost = safeAdd(operationCost, 1)
  if (operationCost === 0) return rejection('nothing-to-do', '$.state', 'does not change the output item')

  let levelCost = safeAdd(operationCost, left.repairCost)
  if (right !== null) levelCost = safeAdd(levelCost, right.payload.repairCost)
  if (levelCost >= ANVIL_TOO_EXPENSIVE_LEVEL) {
    return rejection('too-expensive', '$.state', 'level cost reaches the survival anvil limit')
  }

  const priorRepairCost = Math.max(left.repairCost, right?.payload.repairCost ?? 0)
  return {
    ok: true,
    output: {
      item: left.item,
      durability,
      enchantments: canonicalEnchantments(enchantments),
      repairCost: nextAnvilRepairCost(priorRepairCost),
      customName: rename,
    },
    levelCost,
    materialCost,
  }
}

export const applyAnvil = (state: AnvilState, rules: AnvilRuleSet): AnvilApplyResult => {
  const plan = planAnvil(state, rules)
  if (!plan.ok) return { ...plan, state }
  if (state.experienceLevels < plan.levelCost) {
    return {
      ok: false,
      state,
      reason: 'insufficient-experience',
      issues: [{ path: '$.state.experienceLevels', reason: 'is lower than the planned level cost' }],
    }
  }

  const canonical = snapshotAnvilState(state)
  if (!canonical.ok) {
    return { ok: false, state, reason: 'invalid-input', issues: canonical.issues }
  }
  const right = canonical.snapshot.state.right
  const remainingRight = right === null || right.count === plan.materialCost
    ? null
    : { payload: right.payload, count: StackCount(right.count - plan.materialCost) }

  return {
    ok: true,
    state: {
      left: null,
      right: remainingRight,
      rename: null,
      experienceLevels: canonical.snapshot.state.experienceLevels - plan.levelCost,
    },
    output: plan.output,
    levelCost: plan.levelCost,
    materialCost: plan.materialCost,
  }
}

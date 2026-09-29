import type {
  AnvilEnchantment,
  AnvilEnchantmentId,
  AnvilValidationIssue,
  CanonicalAnvilItemPayload,
} from './anvil.js'
import { canonicalEnchantments } from './anvil-normalization.js'
import {
  GRINDSTONE_CURSE_ENCHANTMENT_IDS,
  GRINDSTONE_DURABILITY_BONUS_PERCENT,
  GRINDSTONE_REPAIR_COST_MAX,
} from './grindstone-data.js'
import { maxStackCountOfItem } from './item-registry.js'

export {
  GRINDSTONE_CURSE_ENCHANTMENT_IDS,
  GRINDSTONE_DURABILITY_BONUS_PERCENT,
  GRINDSTONE_REPAIR_COST_MAX,
} from './grindstone-data.js'

export type GrindstoneInput = {
  readonly payload: CanonicalAnvilItemPayload
  readonly count: number
}

export type GrindstoneOutput = {
  readonly payload: CanonicalAnvilItemPayload
  readonly count: number
  readonly experienceLevels: number
}

export type GrindstoneFailureReason =
  | 'empty-input'
  | 'invalid-stack'
  | 'incompatible-input'
  | 'nothing-to-do'

export type GrindstonePlan =
  | { readonly ok: true; readonly output: GrindstoneOutput }
  | {
      readonly ok: false
      readonly reason: GrindstoneFailureReason
      readonly issues: ReadonlyArray<AnvilValidationIssue>
    }

const CURSE_ENCHANTMENT_LOOKUP: ReadonlySet<string> = new Set(GRINDSTONE_CURSE_ENCHANTMENT_IDS)

const isCurseEnchantment = (id: AnvilEnchantmentId): boolean => CURSE_ENCHANTMENT_LOOKUP.has(id)

const issue = (path: string, reason: string): AnvilValidationIssue => ({ path, reason })

const failure = (reason: GrindstoneFailureReason, path: string, message: string): GrindstonePlan => ({
  ok: false,
  reason,
  issues: [issue(path, message)],
})

const success = (output: GrindstoneOutput): GrindstonePlan => ({ ok: true, output })

export const grindstoneExperienceFor = (nonCurseEnchantmentCount: number): number => {
  const count = Math.max(0, Math.floor(nonCurseEnchantmentCount))
  let cost = 0

  for (let index = 0; index < count && cost < GRINDSTONE_REPAIR_COST_MAX; index += 1) {
    cost = Math.min(cost * 2 + 1, GRINDSTONE_REPAIR_COST_MAX)
  }

  return cost
}

const mergeEnchantments = (
  first: ReadonlyArray<AnvilEnchantment>,
  second: ReadonlyArray<AnvilEnchantment>,
): ReadonlyArray<AnvilEnchantment> => {
  const merged = new Map<AnvilEnchantmentId, AnvilEnchantment>()

  for (const enchantment of canonicalEnchantments(first)) {
    merged.set(enchantment.id, enchantment)
  }

  for (const enchantment of canonicalEnchantments(second)) {
    const existing = merged.get(enchantment.id)
    if (existing !== undefined && isCurseEnchantment(enchantment.id)) {
      continue
    }
    merged.set(enchantment.id, enchantment)
  }

  return canonicalEnchantments([...merged.values()])
}

const stripNonCurses = (
  payload: CanonicalAnvilItemPayload,
  enchantments: ReadonlyArray<AnvilEnchantment>,
): CanonicalAnvilItemPayload => {
  const canonical = canonicalEnchantments(enchantments)
  const curses = canonical.filter(({ id }) => isCurseEnchantment(id))
  const item = payload.item === 'enchanted_book' && curses.length === 0 ? 'book' : payload.item

  return {
    ...payload,
    item,
    enchantments: curses,
    repairCost: grindstoneExperienceFor(canonical.length - curses.length),
  }
}

const sameEnchantments = (
  first: ReadonlyArray<AnvilEnchantment>,
  second: ReadonlyArray<AnvilEnchantment>,
): boolean => {
  const left = canonicalEnchantments(first)
  const right = canonicalEnchantments(second)
  if (left.length !== right.length) {
    return false
  }

  const leftIterator = left.values()
  const rightIterator = right.values()
  while (true) {
    const leftNext = leftIterator.next()
    const rightNext = rightIterator.next()
    if (leftNext.done || rightNext.done) {
      return leftNext.done === rightNext.done
    }
    if (leftNext.value.id !== rightNext.value.id || leftNext.value.level !== rightNext.value.level) {
      return false
    }
  }
}

const sameComponents = (first: CanonicalAnvilItemPayload, second: CanonicalAnvilItemPayload): boolean => {
  if (first.repairCost !== second.repairCost) {
    return false
  }
  if (first.customName !== second.customName) {
    return false
  }
  return sameEnchantments(first.enchantments, second.enchantments)
}

const planSingle = (input: GrindstoneInput): GrindstonePlan => {
  if (input.payload.enchantments.length === 0) {
    return failure('nothing-to-do', '$.input.enchantments', 'must contain at least one enchantment')
  }

  const payload = stripNonCurses(input.payload, input.payload.enchantments)
  return success({ payload, count: 1, experienceLevels: payload.repairCost })
}

const planPair = (left: GrindstoneInput, right: GrindstoneInput): GrindstonePlan => {
  if (left.payload.item !== right.payload.item) {
    return failure('incompatible-input', '$.right.item', 'must match the left item')
  }

  const leftDurability = left.payload.durability
  const rightDurability = right.payload.durability

  if (leftDurability === null && rightDurability === null) {
    if (maxStackCountOfItem(left.payload.item) < 2) {
      return failure('incompatible-input', '$.left.item', 'must be stackable')
    }
    if (!sameComponents(left.payload, right.payload)) {
      return failure('incompatible-input', '$.right.components', 'must match the left components')
    }

    const enchantments = mergeEnchantments(left.payload.enchantments, right.payload.enchantments)
    const payload = stripNonCurses(left.payload, enchantments)
    return success({ payload, count: 2, experienceLevels: payload.repairCost })
  }

  if (leftDurability === null || rightDurability === null) {
    return failure('incompatible-input', '$.durability', 'both inputs must be damageable or neither')
  }

  const maxDamage = Math.max(leftDurability.max, rightDurability.max)
  const combinedDamage =
    leftDurability.max - leftDurability.current +
    (rightDurability.max - rightDurability.current) +
    Math.floor((maxDamage * GRINDSTONE_DURABILITY_BONUS_PERCENT) / 100)
  const durability = {
    max: maxDamage,
    current: Math.max(maxDamage - combinedDamage, 0),
  }
  const enchantments = mergeEnchantments(left.payload.enchantments, right.payload.enchantments)
  const payload = stripNonCurses({ ...left.payload, durability }, enchantments)

  return success({ payload, count: 1, experienceLevels: payload.repairCost })
}

export const planGrindstone = (
  left: GrindstoneInput | null,
  right: GrindstoneInput | null,
): GrindstonePlan => {
  if (left === null) {
    if (right === null) {
      return failure('empty-input', '$.input', 'requires at least one input')
    }
    if (right.count !== 1) {
      return failure('invalid-stack', '$.right.count', 'must contain exactly one item')
    }
    return planSingle(right)
  }
  if (left.count !== 1) {
    return failure('invalid-stack', '$.left.count', 'must contain exactly one item')
  }
  if (right === null) {
    return planSingle(left)
  }
  if (right.count !== 1) {
    return failure('invalid-stack', '$.right.count', 'must contain exactly one item')
  }
  return planPair(left, right)
}

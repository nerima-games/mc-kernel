/* eslint-disable no-magic-numbers, no-undefined, no-ternary, prefer-destructuring, sort-keys -- Snapshot validation reports every wire-level issue with its exact path. */
import {
  ANVIL_SNAPSHOT_VERSION,
  AnvilCustomName,
  AnvilEnchantmentId,
  isCustomName,
  isEnchantmentId,
  isNonNegativeSafeInteger,
  isPositiveSafeInteger,
} from './anvil-primitives.js'
import { canonicalEnchantments } from './anvil-normalization.js'
import { maxStackCountOfItem } from './item-registry.js'
import { isItemType } from './item-type.js'
import { StackCount } from './quantities.js'
import type {
  AnvilDurability,
  AnvilEnchantment,
  AnvilCustomName as AnvilCustomNameType,
  AnvilSnapshotEncodingResult,
  AnvilSnapshotResult,
  AnvilEnchantmentId as AnvilEnchantmentIdType,
  AnvilSnapshotString as AnvilSnapshotStringType,
  AnvilState,
  AnvilValidationIssue,
  CanonicalAnvilItemPayload,
  CanonicalAnvilState,
} from './anvil.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const decodeDurability = (
  value: unknown,
  path: string,
  issues: Array<AnvilValidationIssue>,
): AnvilDurability | null | undefined => {
  if (value === null) return null
  if (
    isRecord(value) &&
    isPositiveSafeInteger(value['current']) &&
    isPositiveSafeInteger(value['max']) &&
    value['current'] <= value['max']
  ) {
    return { current: value['current'], max: value['max'] }
  }

  issues.push({ path, reason: 'must be null or valid remaining durability' })
  return
}

const decodeCustomName = (
  value: unknown,
  path: string,
  issues: Array<AnvilValidationIssue>,
): AnvilCustomNameType | null | undefined => {
  if (value === null) return null
  if (typeof value === 'string' && isCustomName(value)) return AnvilCustomName(value)

  issues.push({ path, reason: 'must be null or a valid custom name' })
  return
}

const decodeEnchantment = (
  candidate: unknown,
  path: string,
  seen: Set<AnvilEnchantmentIdType>,
  issues: Array<AnvilValidationIssue>,
): AnvilEnchantment | undefined => {
  if (!isRecord(candidate)) {
    issues.push({ path, reason: 'must be an object' })
    return
  }

  const id = candidate['id']
  const level = candidate['level']
  if (!isEnchantmentId(id)) {
    issues.push({ path: `${path}.id`, reason: 'must be a canonical enchantment id' })
    return
  }
  if (!isPositiveSafeInteger(level)) {
    issues.push({ path: `${path}.level`, reason: 'must be a positive safe integer' })
    return
  }

  const canonicalId = AnvilEnchantmentId(id)
  if (seen.has(canonicalId)) {
    issues.push({ path: `${path}.id`, reason: 'must be unique' })
    return
  }

  seen.add(canonicalId)
  return { id: canonicalId, level }
}

const decodeEnchantments = (
  value: unknown,
  path: string,
  issues: Array<AnvilValidationIssue>,
): Array<AnvilEnchantment> => {
  if (!Array.isArray(value)) {
    issues.push({ path, reason: 'must be an array' })
    return []
  }

  const seen = new Set<AnvilEnchantmentIdType>()
  const enchantments: Array<AnvilEnchantment> = []
  for (const [index, candidate] of value.entries()) {
    const enchantment = decodeEnchantment(candidate, `${path}.${String(index)}`, seen, issues)
    if (enchantment !== undefined) enchantments.push(enchantment)
  }
  return enchantments
}

const decodeItemPayload = (
  value: unknown,
  path: string,
  issues: Array<AnvilValidationIssue>,
): CanonicalAnvilItemPayload | undefined => {
  if (!isRecord(value)) {
    issues.push({ path, reason: 'must be an object' })
    return
  }

  const itemValue = value['item']
  const item = typeof itemValue === 'string' && isItemType(itemValue) ? itemValue : undefined
  if (item === undefined) issues.push({ path: `${path}.item`, reason: 'must be a known item type' })

  const durability = decodeDurability(value['durability'], `${path}.durability`, issues)

  const repairCostValue = value['repairCost'] ?? 0
  const repairCost = isNonNegativeSafeInteger(repairCostValue) ? repairCostValue : undefined
  if (repairCost === undefined) {
    issues.push({ path: `${path}.repairCost`, reason: 'must be a non-negative safe integer' })
  }

  const customName = decodeCustomName(value['customName'] ?? null, `${path}.customName`, issues)
  const enchantments = decodeEnchantments(value['enchantments'], `${path}.enchantments`, issues)

  if (
    item === undefined ||
    durability === undefined ||
    repairCost === undefined ||
    customName === undefined
  ) return

  return {
    item,
    durability: durability === null ? null : { ...durability },
    enchantments: canonicalEnchantments(enchantments),
    repairCost,
    customName,
  }
}

const decodeRightInput = (
  value: unknown,
  path: string,
  issues: Array<AnvilValidationIssue>,
): CanonicalAnvilState['right'] | undefined => {
  if (value === null) return null
  if (!isRecord(value)) {
    issues.push({ path, reason: 'must be null or an input stack' })
    return
  }

  const payload = decodeItemPayload(value['payload'], `${path}.payload`, issues)
  const countValue = value['count']
  if (!isPositiveSafeInteger(countValue)) {
    issues.push({ path: `${path}.count`, reason: 'must be a positive safe integer' })
    return
  }
  if (payload !== undefined && countValue > maxStackCountOfItem(payload.item)) {
    issues.push({ path: `${path}.count`, reason: 'exceeds the item stack limit' })
    return
  }
  if (payload !== undefined && payload.durability !== null && countValue !== 1) {
    issues.push({ path: `${path}.count`, reason: 'durable item payloads cannot stack' })
    return
  }
  if (payload === undefined) return

  return { payload, count: StackCount(countValue) }
}

const decodeState = (
  value: unknown,
  path: string,
  issues: Array<AnvilValidationIssue>,
): CanonicalAnvilState | undefined => {
  if (!isRecord(value)) {
    issues.push({ path, reason: 'must be an object' })
    return
  }

  const leftValue = value['left']
  const left = leftValue === null ? null : decodeItemPayload(leftValue, `${path}.left`, issues)

  const right = decodeRightInput(value['right'], `${path}.right`, issues)

  const rename = decodeCustomName(value['rename'], `${path}.rename`, issues)

  const experienceLevelsValue = value['experienceLevels']
  const experienceLevels = isNonNegativeSafeInteger(experienceLevelsValue)
    ? experienceLevelsValue
    : undefined
  if (experienceLevels === undefined) {
    issues.push({ path: `${path}.experienceLevels`, reason: 'must be a non-negative safe integer' })
  }

  if (left === undefined || right === undefined || rename === undefined || experienceLevels === undefined) {
    return
  }
  return { left, right, rename, experienceLevels }
}

export const snapshotAnvilState = (state: AnvilState): AnvilSnapshotResult => {
  const issues: Array<AnvilValidationIssue> = []
  const decoded = decodeState(state, '$.state', issues)
  return decoded === undefined || issues.length > 0
    ? { ok: false, issues }
    : { ok: true, snapshot: { version: ANVIL_SNAPSHOT_VERSION, state: decoded } }
}

export const decodeAnvilSnapshot = (value: unknown): AnvilSnapshotResult => {
  const issues: Array<AnvilValidationIssue> = []
  if (!isRecord(value)) return { ok: false, issues: [{ path: '$', reason: 'must be an object' }] }
  if (value['version'] !== ANVIL_SNAPSHOT_VERSION) {
    issues.push({ path: '$.version', reason: `must be ${String(ANVIL_SNAPSHOT_VERSION)}` })
  }
  const state = decodeState(value['state'], '$.state', issues)
  return state === undefined || issues.length > 0
    ? { ok: false, issues }
    : { ok: true, snapshot: { version: ANVIL_SNAPSHOT_VERSION, state } }
}

export const decodeAnvilSnapshotString = (encoded: string): AnvilSnapshotResult => {
  try {
    return decodeAnvilSnapshot(JSON.parse(encoded) as unknown)
  } catch {
    return { ok: false, issues: [{ path: '$', reason: 'must be valid JSON' }] }
  }
}

/** Narrow external snapshot storage text to a validated branded token without throwing. */
export const isAnvilSnapshotString = (value: string): value is AnvilSnapshotStringType =>
  decodeAnvilSnapshotString(value).ok

/** Validate an external JSON snapshot string before it becomes a branded persistence token. */
export const AnvilSnapshotString = (value: string): AnvilSnapshotStringType => {
  if (!isAnvilSnapshotString(value)) {
    throw new TypeError(`Invalid AnvilSnapshotString: ${value}`)
  }

  return value as AnvilSnapshotStringType
}

export const encodeAnvilSnapshot = (state: AnvilState): AnvilSnapshotEncodingResult => {
  const snapshot = snapshotAnvilState(state)
  if (!snapshot.ok) return snapshot

  // snapshotAnvilState has already canonicalized and validated every field.
  // Re-entering AnvilSnapshotString here would parse and validate this fresh
  // snapshot a second time, while the public constructor still validates text
  // supplied by callers.
  const encoded = JSON.stringify(snapshot.snapshot) as AnvilSnapshotStringType
  return { ok: true, encoded, snapshot: snapshot.snapshot }
}

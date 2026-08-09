/* eslint-disable complexity, curly, init-declarations, max-statements, no-continue, no-control-regex, no-magic-numbers, no-nested-ternary, no-ternary, no-undefined, prefer-destructuring, sort-keys -- Snapshot validation reports every wire-level issue with its exact path. */
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

  const durabilityValue = value['durability']
  let durability: AnvilDurability | null | undefined
  if (durabilityValue === null) {
    durability = null
  } else if (
    isRecord(durabilityValue) &&
    isPositiveSafeInteger(durabilityValue['current']) &&
    isPositiveSafeInteger(durabilityValue['max']) &&
    durabilityValue['current'] <= durabilityValue['max']
  ) {
    durability = { current: durabilityValue['current'], max: durabilityValue['max'] }
  }
  if (durability === undefined) {
    issues.push({ path: `${path}.durability`, reason: 'must be null or valid remaining durability' })
  }

  const repairCostValue = value['repairCost'] ?? 0
  const repairCost = isNonNegativeSafeInteger(repairCostValue) ? repairCostValue : undefined
  if (repairCost === undefined) {
    issues.push({ path: `${path}.repairCost`, reason: 'must be a non-negative safe integer' })
  }

  const customNameValue = value['customName'] ?? null
  const customName = customNameValue === null
    ? null
    : typeof customNameValue === 'string' && isCustomName(customNameValue)
    ? AnvilCustomName(customNameValue)
    : undefined
  if (customName === undefined) {
    issues.push({ path: `${path}.customName`, reason: 'must be null or a valid custom name' })
  }

  const enchantmentsValue = value['enchantments']
  const enchantments: Array<AnvilEnchantment> = []
  if (!Array.isArray(enchantmentsValue)) {
    issues.push({ path: `${path}.enchantments`, reason: 'must be an array' })
  } else {
    const seen = new Set<AnvilEnchantmentIdType>()
    for (const [index, candidate] of enchantmentsValue.entries()) {
      const candidatePath = `${path}.enchantments.${String(index)}`
      if (!isRecord(candidate)) {
        issues.push({ path: candidatePath, reason: 'must be an object' })
        continue
      }
      const id = candidate['id']
      const level = candidate['level']
      if (!isEnchantmentId(id)) {
        issues.push({ path: `${candidatePath}.id`, reason: 'must be a canonical enchantment id' })
        continue
      }
      if (!isPositiveSafeInteger(level)) {
        issues.push({ path: `${candidatePath}.level`, reason: 'must be a positive safe integer' })
        continue
      }
      const canonicalId = AnvilEnchantmentId(id)
      if (seen.has(canonicalId)) {
        issues.push({ path: `${candidatePath}.id`, reason: 'must be unique' })
        continue
      }
      seen.add(canonicalId)
      enchantments.push({ id: canonicalId, level })
    }
  }

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

  const rightValue = value['right']
  let right: CanonicalAnvilState['right'] | undefined
  if (rightValue === null) {
    right = null
  } else if (!isRecord(rightValue)) {
    issues.push({ path: `${path}.right`, reason: 'must be null or an input stack' })
  } else {
    const payload = decodeItemPayload(rightValue['payload'], `${path}.right.payload`, issues)
    const countValue = rightValue['count']
    if (!isPositiveSafeInteger(countValue)) {
      issues.push({ path: `${path}.right.count`, reason: 'must be a positive safe integer' })
    } else if (payload !== undefined && countValue > maxStackCountOfItem(payload.item)) {
      issues.push({ path: `${path}.right.count`, reason: 'exceeds the item stack limit' })
    } else if (payload !== undefined && payload.durability !== null && countValue !== 1) {
      issues.push({ path: `${path}.right.count`, reason: 'durable item payloads cannot stack' })
    } else if (payload !== undefined) {
      right = { payload, count: StackCount(countValue) }
    }
  }

  const renameValue = value['rename']
  const rename = renameValue === null
    ? null
    : typeof renameValue === 'string' && isCustomName(renameValue)
    ? AnvilCustomName(renameValue)
    : undefined
  if (rename === undefined) {
    issues.push({ path: `${path}.rename`, reason: 'must be null or a valid custom name' })
  }

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
  return snapshot.ok
    ? { ok: true, encoded: AnvilSnapshotString(JSON.stringify(snapshot.snapshot)), snapshot: snapshot.snapshot }
    : snapshot
}

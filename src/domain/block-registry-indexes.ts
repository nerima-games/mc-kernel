/**
 * Dense indexes derived from the block registry.
 *
 * The registry entries are intentionally kept as data. This module owns the
 * derived tables and query logic so the data source can be reviewed without
 * also navigating every lookup implementation.
 */
import type { BlockCapabilities, BlockCapabilityFlag } from './block-capabilities.js'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from './block-capabilities.js'
import type { ResolvedBlock } from './block-definition.js'
import { resolveBlock } from './block-definition.js'
import type { BlockDrop, HarvestContext } from './block-harvest.js'
import { BARE_HANDED, resolveDrop } from './block-harvest.js'
import type { BlockOpacity, BlockProperties, BlockPropertyName } from './block-properties.js'
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS, LightLevel } from './block-properties.js'
import type { SupportRule } from './block-support.js'
import { isSupportSensitive } from './block-support.js'
import type { BlockType } from './block-type.js'
import { BLOCK_TYPES } from './block-type.js'
import { BLOCK_REGISTRY } from './block-registry-entries.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { BLOCK_ID_MAX, BlockId } from './block-registry-types.js'

const BLOCK_ID_TABLE_LENGTH = BLOCK_ID_MAX + 1

const buildResolvedById = (): ReadonlyArray<ResolvedBlock | undefined> => {
  const table: Array<ResolvedBlock | undefined> = Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => undefined)

  for (const entry of BLOCK_REGISTRY) {
    table[entry.id] = resolveBlock(entry.definition)
  }

  return table
}

const RESOLVED_BY_ID = buildResolvedById()

const isAddressableBlockId = (id: number): boolean =>
  Number.isInteger(id) && id >= 0 && id <= BLOCK_ID_MAX

const buildCapabilitiesById = (): Readonly<Record<BlockCapabilityFlag, Uint8Array>> => {
  const columns = {} as Record<BlockCapabilityFlag, Uint8Array>

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const column = new Uint8Array(BLOCK_ID_TABLE_LENGTH)
    column.fill(BLOCK_CAPABILITY_DEFAULTS[flag] ? 1 : 0)
    columns[flag] = column
  }

  for (const entry of BLOCK_REGISTRY) {
    const resolved = RESOLVED_BY_ID[entry.id]!

    for (const flag of BLOCK_CAPABILITY_FLAGS) {
      columns[flag][entry.id] = resolved.capabilities[flag] ? 1 : 0
    }
  }

  return columns
}

const CAPABILITIES_BY_ID = buildCapabilitiesById()

type PropertyColumns = {
  readonly opacity: ReadonlyArray<BlockOpacity>
  readonly lightEmission: Uint8Array
  readonly supportRule: ReadonlyArray<SupportRule>
  readonly supportSensitive: Uint8Array
}

const buildPropertyColumns = (): PropertyColumns => {
  const opacity: BlockOpacity[] = Array.from(
    { length: BLOCK_ID_TABLE_LENGTH },
    () => BLOCK_PROPERTY_DEFAULTS.opacity,
  )
  const lightEmission = new Uint8Array(BLOCK_ID_TABLE_LENGTH)
  const supportRule: SupportRule[] = Array.from(
    { length: BLOCK_ID_TABLE_LENGTH },
    () => BLOCK_PROPERTY_DEFAULTS.supportRule,
  )
  const supportSensitive = new Uint8Array(BLOCK_ID_TABLE_LENGTH)

  lightEmission.fill(BLOCK_PROPERTY_DEFAULTS.lightEmission)

  for (const entry of BLOCK_REGISTRY) {
    const { properties } = RESOLVED_BY_ID[entry.id]!
    opacity[entry.id] = properties.opacity
    lightEmission[entry.id] = properties.lightEmission
    supportRule[entry.id] = properties.supportRule
    supportSensitive[entry.id] = isSupportSensitive(properties.supportRule) ? 1 : 0
  }

  return { opacity, lightEmission, supportRule, supportSensitive }
}

const PROPERTY_COLUMNS = buildPropertyColumns()

const seededRecord = <K extends string, V>(keys: ReadonlyArray<K>, build: (key: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((key) => [key, build(key)])) as Record<K, V>

/**
 * Builds the vocabulary-to-id index and rejects an incomplete registry.
 * Exported only for focused invariant tests; the package surface is the
 * stable facade in `block-registry.ts`.
 */
export const buildIdByType = (
  entries: ReadonlyArray<Pick<BlockRegistryEntry, 'id' | 'definition'>>,
  types: ReadonlyArray<BlockType>,
): Readonly<Record<BlockType, BlockId>> => {
  const assignedIds = new Map<BlockType, BlockId>()

  for (const entry of entries) {
    assignedIds.set(entry.definition.type, entry.id)
  }

  return seededRecord(types, (type) => {
    const blockId = assignedIds.get(type)

    if (blockId === undefined) {
      throw new Error(`Block registry is missing a row for ${type}`)
    }

    return blockId
  })
}

const ID_BY_TYPE = buildIdByType(BLOCK_REGISTRY, BLOCK_TYPES)

type SupportBlockIdsById = ReadonlyArray<ReadonlySet<number> | undefined>

const buildSupportBlockIdsById = (): SupportBlockIdsById => {
  const blockIdsById: Array<ReadonlySet<number> | undefined> = Array.from(
    { length: BLOCK_ID_TABLE_LENGTH },
    () => undefined,
  )

  for (const entry of BLOCK_REGISTRY) {
    const supportRule = PROPERTY_COLUMNS.supportRule[entry.id]!

    if (supportRule.kind === 'oneOf') {
      blockIdsById[entry.id] = new Set(supportRule.blocks.map((type) => ID_BY_TYPE[type]))
    }
  }

  return blockIdsById
}

const SUPPORT_BLOCK_IDS_BY_ID = buildSupportBlockIdsById()

/** Every id currently assigned, ascending. */
export const BLOCK_IDS: ReadonlyArray<BlockId> = BLOCK_REGISTRY.map((entry) => entry.id)

/** Block vocabulary to its permanent wire-format id. */
export const blockIdOf = (type: BlockType): BlockId => {
  const blockId = ID_BY_TYPE[type]

  if (blockId === undefined) {
    throw new Error(`Block registry is missing a row for ${type}`)
  }

  return blockId
}

/** Block id to its resolved definition, or `undefined` for an unknown byte. */
export const blockTypeOfId = (id: number): BlockType | undefined =>
  isAddressableBlockId(id) ? RESOLVED_BY_ID[id]?.type : undefined

/** Block id to its fully resolved definition, or `undefined` when unknown. */
export const resolvedBlockOfId = (id: number): ResolvedBlock | undefined =>
  isAddressableBlockId(id) ? RESOLVED_BY_ID[id] : undefined

/** Whether this number names a block in the current registry. */
export const isKnownBlockId = (id: number): id is BlockId => resolvedBlockOfId(id) !== undefined

/** Read one capability from a raw chunk-buffer byte. */
export const capabilityOfBlockId = (id: number, flag: BlockCapabilityFlag): boolean =>
  isAddressableBlockId(id) ? CAPABILITIES_BY_ID[flag][id] === 1 : BLOCK_CAPABILITY_DEFAULTS[flag]

/** Read one resolved property from a raw chunk-buffer byte. */
export const propertyOfBlockId = <K extends BlockPropertyName>(id: number, name: K): BlockProperties[K] =>
  resolvedBlockOfId(id)?.properties[name] ?? BLOCK_PROPERTY_DEFAULTS[name]

/** Read all resolved capabilities from a raw chunk-buffer byte. */
export const capabilitiesOfBlockId = (id: number): BlockCapabilities =>
  resolvedBlockOfId(id)?.capabilities ?? BLOCK_CAPABILITY_DEFAULTS

/** Resolve the item dropped by a raw chunk-buffer byte. */
export const dropOfBlockId = (id: number, context: HarvestContext = BARE_HANDED): BlockDrop | undefined => {
  const resolved = resolvedBlockOfId(id)

  return resolved === undefined
    ? undefined
    : resolveDrop(resolved.properties.harvestTool, resolved.properties.drops, resolved.type, context)
}

const buildIdsByCapability = (): Readonly<Record<BlockCapabilityFlag, ReadonlySet<number>>> =>
  seededRecord(BLOCK_CAPABILITY_FLAGS, (flag) => {
    const members = new Set<number>()

    for (const entry of BLOCK_REGISTRY) {
      if (capabilityOfBlockId(entry.id, flag)) {
        members.add(entry.id)
      }
    }

    return members
  })

const IDS_BY_CAPABILITY = buildIdsByCapability()

/** Return the shared native set of ids carrying a capability. */
export const blockIdsWithCapability = (flag: BlockCapabilityFlag): ReadonlySet<number> => IDS_BY_CAPABILITY[flag]

const buildIdsByOpacity = (): Readonly<Record<BlockOpacity, ReadonlySet<number>>> => {
  const table = seededRecord(BLOCK_OPACITIES, () => new Set<number>())

  for (const entry of BLOCK_REGISTRY) {
    table[propertyOfBlockId(entry.id, 'opacity')].add(entry.id)
  }

  return table
}

const IDS_BY_OPACITY = buildIdsByOpacity()

/** Return the shared native set of ids in an opacity bucket. */
export const blockIdsWithOpacity = (opacity: BlockOpacity): ReadonlySet<number> => IDS_BY_OPACITY[opacity]

/** Read the meshing/light-attenuation class of a raw chunk-buffer byte. */
export const opacityOfBlockId = (id: number): BlockOpacity =>
  isAddressableBlockId(id) ? PROPERTY_COLUMNS.opacity[id]! : BLOCK_PROPERTY_DEFAULTS.opacity

/** Read the emitted light level of a raw chunk-buffer byte. */
export const lightEmissionOfBlockId = (id: number): LightLevel =>
  isAddressableBlockId(id)
    ? LightLevel(PROPERTY_COLUMNS.lightEmission[id]!)
    : BLOCK_PROPERTY_DEFAULTS.lightEmission

/** Whether light can cross the cell represented by a raw chunk-buffer byte. */
export const transmitsLight = (id: number): boolean =>
  (isAddressableBlockId(id) ? PROPERTY_COLUMNS.opacity[id] : BLOCK_PROPERTY_DEFAULTS.opacity) !== 'opaque'

/** Read the support rule of a raw chunk-buffer byte. */
export const supportRuleOfBlockId = (id: number): SupportRule =>
  isAddressableBlockId(id) ? PROPERTY_COLUMNS.supportRule[id]! : BLOCK_PROPERTY_DEFAULTS.supportRule

/** Whether a raw chunk-buffer byte needs support below it. */
export const isSupportSensitiveBlockId = (id: number): boolean =>
  isAddressableBlockId(id) && PROPERTY_COLUMNS.supportSensitive[id] === 1

/** Evaluate whether a block can remain supported by the byte below it. */
export const canBlockStaySupported = (id: number, supportBelow: number): boolean => {
  const rule = supportRuleOfBlockId(id)

  if (rule.kind === 'none') {
    return true
  }

  if (rule.kind === 'anySupporting') {
    return capabilityOfBlockId(supportBelow, 'canSupportAttachments')
  }

  return SUPPORT_BLOCK_IDS_BY_ID[id]!.has(supportBelow)
}

/** Block vocabulary entries that have no row in the registry. */
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (type) => !Object.hasOwn(ID_BY_TYPE, type),
)

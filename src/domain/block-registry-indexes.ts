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
import {
  BLOCK_OPACITIES,
  BLOCK_PROPERTY_DEFAULTS,
  LightLevel,
} from './block-properties.js'
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

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
export const resolvedBlockAt = (id: number): ResolvedBlock => {
  const resolved = RESOLVED_BY_ID[id]

  if (resolved === undefined) {
    throw new Error(`Block registry is missing a resolved row for ${id}`)
  }

  return resolved
}

const buildKnownById = (): Uint8Array => {
  const table = new Uint8Array(BLOCK_ID_TABLE_LENGTH)

  for (let id = 0; id < BLOCK_ID_TABLE_LENGTH; id += 1) {
    table[id] = RESOLVED_BY_ID[id] === undefined ? 0 : 1
  }

  return table
}

const KNOWN_BY_ID = buildKnownById()

const seededMap = <K, V>(
  keys: ReadonlyArray<K>,
  build: (key: K) => V,
): ReadonlyMap<K, V> => new Map(keys.map((key): readonly [K, V] => [key, build(key)]))

const requiredMapValue = <K, V>(map: ReadonlyMap<K, V>, key: K, message: string): V => {
  const value = map.get(key)

  if (value === undefined) {
    throw new Error(message)
  }

  return value
}

const buildCapabilitiesById = (): ReadonlyMap<BlockCapabilityFlag, Uint8Array> => {
  const columns = new Map<BlockCapabilityFlag, Uint8Array>()

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const column = new Uint8Array(BLOCK_ID_TABLE_LENGTH)
    column.fill(BLOCK_CAPABILITY_DEFAULTS[flag] ? 1 : 0)
    columns.set(flag, column)
  }

  for (const entry of BLOCK_REGISTRY) {
    const resolved = resolvedBlockAt(entry.id)

    for (const [flag, column] of columns) {
      column[entry.id] = resolved.capabilities[flag] ? 1 : 0
    }
  }

  return columns
}

const CAPABILITIES_BY_ID = buildCapabilitiesById()

type PropertyColumnsByName = {
  readonly [K in BlockPropertyName]: ReadonlyArray<BlockProperties[K]>
}

type MutablePropertyColumnsByName = {
  [K in BlockPropertyName]: Array<BlockProperties[K]>
}

type PropertyColumns = {
  readonly opacity: ReadonlyArray<BlockOpacity>
  readonly lightEmission: Uint8Array
  readonly transmitsLight: Uint8Array
  readonly supportRule: ReadonlyArray<SupportRule>
  readonly supportSensitive: Uint8Array
  readonly byName: PropertyColumnsByName
}

const buildPropertyValuesByName = (): PropertyColumnsByName => {
  const columns: MutablePropertyColumnsByName = {
    opacity: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.opacity),
    lightEmission: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.lightEmission),
    fluid: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.fluid),
    collisionShape: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.collisionShape),
    renderKind: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.renderKind),
    footstepMaterial: Array.from(
      { length: BLOCK_ID_TABLE_LENGTH },
      () => BLOCK_PROPERTY_DEFAULTS.footstepMaterial,
    ),
    hardness: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.hardness),
    friction: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.friction),
    contactDamage: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.contactDamage),
    movementDrag: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.movementDrag),
    xpOnBreak: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.xpOnBreak),
    railKind: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.railKind),
    harvestTool: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.harvestTool),
    drops: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.drops),
    supportRule: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.supportRule),
  }

  for (const entry of BLOCK_REGISTRY) {
    const { properties } = resolvedBlockAt(entry.id)

    columns.opacity[entry.id] = properties.opacity
    columns.lightEmission[entry.id] = properties.lightEmission
    columns.fluid[entry.id] = properties.fluid
    columns.collisionShape[entry.id] = properties.collisionShape
    columns.renderKind[entry.id] = properties.renderKind
    columns.footstepMaterial[entry.id] = properties.footstepMaterial
    columns.hardness[entry.id] = properties.hardness
    columns.friction[entry.id] = properties.friction
    columns.contactDamage[entry.id] = properties.contactDamage
    columns.movementDrag[entry.id] = properties.movementDrag
    columns.xpOnBreak[entry.id] = properties.xpOnBreak
    columns.railKind[entry.id] = properties.railKind
    columns.harvestTool[entry.id] = properties.harvestTool
    columns.drops[entry.id] = properties.drops
    columns.supportRule[entry.id] = properties.supportRule
  }

  return columns
}

const buildPropertyColumns = (): PropertyColumns => {
  const byName = buildPropertyValuesByName()
  const opacity: BlockOpacity[] = Array.from(
    { length: BLOCK_ID_TABLE_LENGTH },
    () => BLOCK_PROPERTY_DEFAULTS.opacity,
  )
  const lightEmission = new Uint8Array(BLOCK_ID_TABLE_LENGTH)
  const transmitsLight = new Uint8Array(BLOCK_ID_TABLE_LENGTH)
  transmitsLight.fill(0)
  const supportRule: SupportRule[] = Array.from(
    { length: BLOCK_ID_TABLE_LENGTH },
    () => BLOCK_PROPERTY_DEFAULTS.supportRule,
  )
  const supportSensitive = new Uint8Array(BLOCK_ID_TABLE_LENGTH)

  for (const entry of BLOCK_REGISTRY) {
    const { properties } = resolvedBlockAt(entry.id)
    opacity[entry.id] = properties.opacity
    lightEmission[entry.id] = properties.lightEmission
    transmitsLight[entry.id] = properties.opacity === 'opaque' ? 0 : 1
    supportRule[entry.id] = properties.supportRule
    supportSensitive[entry.id] = isSupportSensitive(properties.supportRule) ? 1 : 0
  }

  return { opacity, lightEmission, transmitsLight, supportRule, supportSensitive, byName }
}

const PROPERTY_COLUMNS = buildPropertyColumns()

/**
 * Builds the vocabulary-to-id index and rejects an incomplete registry.
 * Exported only for focused invariant tests; the package surface is the
 * stable facade in `block-registry.ts`.
 */
export const buildIdByType = (
  entries: ReadonlyArray<Pick<BlockRegistryEntry, 'id' | 'definition'>>,
  types: ReadonlyArray<BlockType>,
): ReadonlyMap<BlockType, BlockId> => {
  const assignedIds = new Map<BlockType, BlockId>()

  for (const entry of entries) {
    assignedIds.set(entry.definition.type, entry.id)
  }

  const idsByType = new Map<BlockType, BlockId>()

  for (const type of types) {
    const blockId = assignedIds.get(type)

    if (blockId === undefined) {
      throw new Error(`Block registry is missing a row for ${type}`)
    }

    idsByType.set(type, blockId)
  }

  return idsByType
}

const ID_BY_TYPE = buildIdByType(BLOCK_REGISTRY, BLOCK_TYPES)

type SupportBlockIdsById = ReadonlyMap<BlockId, ReadonlySet<number>>

const EMPTY_SUPPORT_BLOCK_IDS: ReadonlySet<number> = new Set()

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
export const buildSupportBlockIdsById = (
  supportRules: ReadonlyArray<SupportRule | undefined> = PROPERTY_COLUMNS.supportRule,
): SupportBlockIdsById => {
  const blockIdsById = new Map<BlockId, ReadonlySet<number>>()

  for (const entry of BLOCK_REGISTRY) {
    blockIdsById.set(entry.id, EMPTY_SUPPORT_BLOCK_IDS)
  }

  for (const entry of BLOCK_REGISTRY) {
    const supportRule = supportRules[entry.id]

    if (supportRule === undefined) {
      throw new Error(`Block registry is missing a support rule for ${entry.id}`)
    }

    if (supportRule.kind === 'oneOf') {
      const supportedBlockIds = new Set<number>()

      for (const type of supportRule.blocks) {
        const blockId = ID_BY_TYPE.get(type)

        if (blockId === undefined) {
          throw new Error(`Block registry is missing a row for ${type}`)
        }

        supportedBlockIds.add(blockId)
      }

      blockIdsById.set(entry.id, supportedBlockIds)
    }
  }

  return blockIdsById
}

const SUPPORT_BLOCK_IDS_BY_ID = buildSupportBlockIdsById()

const supportBlockIdsOf = (blockIdsById: SupportBlockIdsById, id: BlockId): ReadonlySet<number> => {
  return requiredMapValue(blockIdsById, id, `Block registry is missing support ids for ${id}`)
}

/** Every id currently assigned, ascending. */
export const BLOCK_IDS: ReadonlyArray<BlockId> = BLOCK_REGISTRY.map((entry) => entry.id)

/** Block vocabulary to its permanent wire-format id. */
export const blockIdOf = (type: BlockType): BlockId => {
  const blockId = ID_BY_TYPE.get(type)

  if (blockId === undefined) {
    throw new Error(`Block registry is missing a row for ${type}`)
  }

  return blockId
}

/** Block id to its resolved definition, or `undefined` for an unknown byte. */
export const blockTypeOfId = (id: number): BlockType | undefined =>
  RESOLVED_BY_ID[id]?.type

/** Block id to its fully resolved definition, or `undefined` when unknown. */
export const resolvedBlockOfId = (id: number): ResolvedBlock | undefined =>
  RESOLVED_BY_ID[id]

/** Whether this number names a block in the current registry. */
export const isKnownBlockId = (id: number): id is BlockId =>
  KNOWN_BY_ID[id] === 1

/** Read one capability from a raw chunk-buffer byte. */
export const capabilityOfBlockId = (id: number, flag: BlockCapabilityFlag): boolean => {
  const value = CAPABILITIES_BY_ID.get(flag)?.[id]

  return value === undefined ? BLOCK_CAPABILITY_DEFAULTS[flag] : value === 1
}

/** Read one resolved property from a raw chunk-buffer byte. */
export const propertyOfBlockId = <K extends BlockPropertyName>(id: number, name: K): BlockProperties[K] => {
  return PROPERTY_COLUMNS.byName[name][id] ?? BLOCK_PROPERTY_DEFAULTS[name]
}

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

const buildIdsByCapability = (): ReadonlyMap<BlockCapabilityFlag, ReadonlySet<number>> =>
  seededMap(BLOCK_CAPABILITY_FLAGS, (flag) => {
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
export const blockIdsWithCapability = (flag: BlockCapabilityFlag): ReadonlySet<number> => {
  return requiredMapValue(IDS_BY_CAPABILITY, flag, `Block capability index is missing ${flag}`)
}

const buildIdsByOpacity = (): ReadonlyMap<BlockOpacity, ReadonlySet<number>> => {
  const table = new Map<BlockOpacity, Set<number>>()

  for (const opacity of BLOCK_OPACITIES) {
    table.set(opacity, new Set<number>())
  }

  for (const entry of BLOCK_REGISTRY) {
    const opacity = propertyOfBlockId(entry.id, 'opacity')
    const blockIds = requiredMapValue(table, opacity, `Block opacity index is missing ${opacity}`)
    blockIds.add(entry.id)
  }

  return table
}

const IDS_BY_OPACITY = buildIdsByOpacity()

/** Return the shared native set of ids in an opacity bucket. */
export const blockIdsWithOpacity = (opacity: BlockOpacity): ReadonlySet<number> => {
  return requiredMapValue(IDS_BY_OPACITY, opacity, `Block opacity index is missing ${opacity}`)
}

/** Read the meshing/light-attenuation class of a raw chunk-buffer byte. */
export const opacityOfBlockId = (id: number): BlockOpacity =>
  PROPERTY_COLUMNS.opacity[id] ?? BLOCK_PROPERTY_DEFAULTS.opacity

/** Read the emitted light level of a raw chunk-buffer byte. */
export const lightEmissionOfBlockId = (id: number): LightLevel => {
  const value = PROPERTY_COLUMNS.lightEmission[id]

  return LightLevel(value === undefined ? BLOCK_PROPERTY_DEFAULTS.lightEmission : value)
}

/** Whether light can cross the cell represented by a raw chunk-buffer byte. */
export const transmitsLight = (id: number): boolean => {
  return PROPERTY_COLUMNS.transmitsLight[id] === 1
}

/** Read the support rule of a raw chunk-buffer byte. */
export const supportRuleOfBlockId = (id: number): SupportRule =>
  PROPERTY_COLUMNS.supportRule[id] ?? BLOCK_PROPERTY_DEFAULTS.supportRule

/** Whether a raw chunk-buffer byte needs support below it. */
export const isSupportSensitiveBlockId = (id: number): boolean =>
  PROPERTY_COLUMNS.supportSensitive[id] === 1

/** Evaluate whether a block can remain supported by the byte below it. */
export const canBlockStaySupported = (id: number, supportBelow: number): boolean => {
  if (!isKnownBlockId(id)) {
    return true
  }

  const rule = supportRuleOfBlockId(id)

  if (rule.kind === 'none') {
    return true
  }

  if (rule.kind === 'anySupporting') {
    return capabilityOfBlockId(supportBelow, 'canSupportAttachments')
  }

  return supportBlockIdsOf(SUPPORT_BLOCK_IDS_BY_ID, id).has(supportBelow)
}

/** Block vocabulary entries that have no row in the registry. */
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (type) => !ID_BY_TYPE.has(type),
)

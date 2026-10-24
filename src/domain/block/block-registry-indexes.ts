/**
 * Dense indexes derived from the block registry.
 *
 * The registry entries are intentionally kept as data. This module owns the
 * derived tables and query logic so the data source can be reviewed without
 * also navigating every lookup implementation.
 */
import { Option, Result } from 'effect'
import type {
  BlockCapabilities,
  BlockCapabilityFailure,
  BlockCapabilityFlag,
} from './block-capabilities.js'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from './block-capabilities.js'
import type { BlockDefinitionFailure, ResolvedBlock } from './block-definition.js'
import { resolveBlock } from './block-definition.js'
import type { BlockDrop, HarvestContext } from './block-harvest.js'
import { BARE_HANDED, resolveDrop } from './block-harvest.js'
import type {
  BlockOpacity,
  BlockProperties,
  BlockPropertyFailure,
  BlockPropertyName,
} from './block-properties.js'
import {
  BLOCK_OPACITIES,
  BLOCK_PROPERTY_DEFAULTS,
} from './block-properties.js'
import type { SupportRule } from './block-support.js'
import { isSupportSensitive } from './block-support.js'
import type { BlockType } from './block-type.js'
import { BLOCK_TYPES } from './block-type.js'
import { BLOCK_REGISTRY } from './block-registry-entries.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { BlockId } from './block-registry-types.js'

/**
 * Every dense lookup table below is sized to the highest REGISTERED id, not
 * to `BlockId`'s type ceiling (`BLOCK_ID_MAX`). Those answer different
 * questions: `BLOCK_ID_MAX` is "what may a `BlockId` be", this is "how long
 * must this lookup array be" — they coincided only while the registry filled
 * the whole 16-bit id space. An id at or above this length is simply
 * out-of-range, and every accessor below already resolves an out-of-range
 * read to its documented default via `noUncheckedIndexedAccess`.
 */
const BLOCK_ID_TABLE_LENGTH = BLOCK_REGISTRY.reduce((highest, entry) => Math.max(highest, entry.id), -1) + 1

export type BlockRegistryFailure = {
  readonly _tag: 'BlockRegistryFailure'
  readonly reason: 'missing-block-row' | 'missing-support-rule' | 'missing-support-ids'
  readonly message: string
}

type BlockIdValidationFailure = ReturnType<typeof BlockId.result> extends Result.Result<BlockId, infer Failure>
  ? Failure
  : never

export type BlockRegistryResolutionFailure =
  | BlockDefinitionFailure
  | BlockCapabilityFailure
  | BlockPropertyFailure
  | BlockIdValidationFailure

export type BlockRegistryIndexFailure = BlockRegistryFailure | BlockRegistryResolutionFailure

const failure = (
  reason: BlockRegistryFailure['reason'],
  message: string,
): Result.Result<never, BlockRegistryFailure> => Result.fail({ _tag: 'BlockRegistryFailure', reason, message })

/**
 * V8 takes a measurably slower path reading an out-of-bounds index than an
 * in-bounds one, on both a plain `Array` and a typed array — confirmed by
 * isolating each accessor and comparing a guarded read against a raw
 * out-of-bounds read. Every accessor below checks this before indexing, so
 * an out-of-range id returns its default without ever touching the
 * now-much-shorter backing array.
 */
const isWithinTable = (id: number): boolean => id >= 0 && id < BLOCK_ID_TABLE_LENGTH

export const blockPropertyColumnValueOrDefault = <Value>(value: Value | undefined, fallback: Value): Value =>
  Option.fromNullishOr(value).pipe(Option.getOrElse(() => fallback))

const buildResolvedById = (): Result.Result<ReadonlyArray<ResolvedBlock | undefined>, BlockRegistryResolutionFailure> =>
  Result.gen(function* () {
    const table: Array<ResolvedBlock | undefined> = Array.from(
      { length: BLOCK_ID_TABLE_LENGTH },
      () => undefined,
    )

    for (const entry of BLOCK_REGISTRY) {
      table[entry.id] = yield* resolveBlock(entry.definition)
    }

    return table
  })

const RESOLVED_BY_ID = buildResolvedById()

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
export const resolvedBlockAt = (
  id: BlockId,
): Result.Result<Option.Option<ResolvedBlock>, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(RESOLVED_BY_ID, (resolvedById) => Option.fromNullishOr(resolvedById[blockId])),
  )

/**
 * Exported only for focused invariant tests; the package surface is the
 * stable registry facade. The current registry has no gap — every id from 0
 * to the highest registered id is assigned — so the "unregistered but
 * in-range" arm below is unreachable through the real `RESOLVED_BY_ID`; the
 * optional parameter lets a test supply a sparse fixture to exercise it.
 */
export const buildKnownById = (resolvedById: ReadonlyArray<ResolvedBlock | undefined>): Uint8Array => {
  const table = new Uint8Array(resolvedById.length)

  for (let id = 0; id < resolvedById.length; id += 1) {
    table[id] = resolvedById[id] === undefined ? 0 : 1
  }

  return table
}

const KNOWN_BY_ID = Result.map(RESOLVED_BY_ID, buildKnownById)

const seededMap = <K, V>(
  keys: ReadonlyArray<K>,
  build: (key: K) => V,
): ReadonlyMap<K, V> => new Map(keys.map((key): readonly [K, V] => [key, build(key)]))

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
export const buildCapabilitiesById = (
  resolvedById: ReadonlyArray<ResolvedBlock | undefined>,
): ReadonlyMap<BlockCapabilityFlag, Uint8Array> => {
  const columns = new Map<BlockCapabilityFlag, Uint8Array>()

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const column = new Uint8Array(BLOCK_ID_TABLE_LENGTH)
    column.fill(BLOCK_CAPABILITY_DEFAULTS[flag] ? 1 : 0)
    columns.set(flag, column)
  }

  for (const entry of BLOCK_REGISTRY) {
    const resolved = resolvedById[entry.id]
    if (resolved === undefined) continue

    for (const [flag, column] of columns) {
      column[entry.id] = resolved.capabilities[flag] ? 1 : 0
    }
  }

  return columns
}

const CAPABILITIES_BY_ID = Result.map(RESOLVED_BY_ID, buildCapabilitiesById)

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

const buildPropertyValuesByName = (
  resolvedById: ReadonlyArray<ResolvedBlock | undefined>,
): PropertyColumnsByName => {
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
    blastResistance: Array.from(
      { length: BLOCK_ID_TABLE_LENGTH },
      () => BLOCK_PROPERTY_DEFAULTS.blastResistance,
    ),
    contactDamage: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.contactDamage),
    movementDrag: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.movementDrag),
    xpOnBreak: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.xpOnBreak),
    railKind: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.railKind),
    harvestTool: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.harvestTool),
    drops: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.drops),
    supportRule: Array.from({ length: BLOCK_ID_TABLE_LENGTH }, () => BLOCK_PROPERTY_DEFAULTS.supportRule),
  }

  for (const entry of BLOCK_REGISTRY) {
    const resolved = resolvedById[entry.id]
    if (resolved === undefined) continue
    const { properties } = resolved

    columns.opacity[entry.id] = properties.opacity
    columns.lightEmission[entry.id] = properties.lightEmission
    columns.fluid[entry.id] = properties.fluid
    columns.collisionShape[entry.id] = properties.collisionShape
    columns.renderKind[entry.id] = properties.renderKind
    columns.footstepMaterial[entry.id] = properties.footstepMaterial
    columns.hardness[entry.id] = properties.hardness
    columns.friction[entry.id] = properties.friction
    columns.blastResistance[entry.id] = properties.blastResistance
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

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
export const buildPropertyColumns = (resolvedById: ReadonlyArray<ResolvedBlock | undefined>): PropertyColumns => {
  const byName = buildPropertyValuesByName(resolvedById)
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
    const resolved = resolvedById[entry.id]
    if (resolved === undefined) continue
    const { properties } = resolved
    opacity[entry.id] = properties.opacity
    lightEmission[entry.id] = properties.lightEmission
    transmitsLight[entry.id] = properties.opacity === 'opaque' ? 0 : 1
    supportRule[entry.id] = properties.supportRule
    supportSensitive[entry.id] = isSupportSensitive(properties.supportRule) ? 1 : 0
  }

  return { opacity, lightEmission, transmitsLight, supportRule, supportSensitive, byName }
}

const PROPERTY_COLUMNS = Result.map(RESOLVED_BY_ID, buildPropertyColumns)

/**
 * Every `PROPERTY_COLUMNS` entry backed by a raw `Uint8Array` and left at its
 * typed-array zero rather than explicitly filled with a
 * `BLOCK_PROPERTY_DEFAULTS` value, paired with what that zero byte decodes
 * to. `transmitsLight` is not listed here: it derives from `opacity` rather
 * than filling a `BLOCK_PROPERTY_DEFAULTS` entry, and its build loop already
 * calls `.fill(0)` explicitly instead of relying on the typed-array zero.
 *
 * A fresh `Uint8Array` zero-initialises every index a build loop does not
 * assign, so a column built this way reads correctly for an unregistered id
 * only when that zero happens to decode to the column's own documented
 * default — true today for `lightEmission` (`0`) and `supportSensitive`
 * (`false`), but not guaranteed for a future column built the same way.
 * `block-registry-indexes.test.ts` iterates this to check the pairing
 * directly, so a new entry with a mismatched default fails there instead of
 * silently reading `0`.
 */
const byteToBoolean = (byte: number): boolean => byte === 1

export const RAW_COLUMN_DEFAULTS: ReadonlyArray<{
  readonly name: string
  readonly zeroDecodesTo: unknown
  readonly documentedDefault: unknown
}> = [
  {
    name: 'lightEmission',
    zeroDecodesTo: BLOCK_PROPERTY_DEFAULTS.lightEmission,
    documentedDefault: BLOCK_PROPERTY_DEFAULTS.lightEmission,
  },
  {
    name: 'supportSensitive',
    zeroDecodesTo: byteToBoolean(0),
    documentedDefault: isSupportSensitive(BLOCK_PROPERTY_DEFAULTS.supportRule),
  },
]

/**
 * Builds the vocabulary-to-id index and rejects an incomplete registry.
 * Exported only for focused invariant tests; the package surface is the
 * stable facade in `block-registry.ts`.
 */
export const buildIdByType = (
  entries: ReadonlyArray<Pick<BlockRegistryEntry, 'id' | 'definition'>>,
  types: ReadonlyArray<BlockType>,
): Result.Result<ReadonlyMap<BlockType, BlockId>, BlockRegistryFailure> => {
  const assignedIds = new Map<BlockType, BlockId>()

  for (const entry of entries) {
    assignedIds.set(entry.definition.type, entry.id)
  }

  const idsByType = new Map<BlockType, BlockId>()

  for (const type of types) {
    const blockId = assignedIds.get(type)

    if (blockId === undefined) {
      return failure('missing-block-row', `Block registry is missing a row for ${type}`)
    }

    idsByType.set(type, blockId)
  }

  return Result.succeed(idsByType)
}

const ID_BY_TYPE = new Map(BLOCK_REGISTRY.map((entry) => [entry.definition.type, entry.id] as const))

type SupportBlockIdsById = ReadonlyMap<BlockId, ReadonlySet<BlockId>>

const EMPTY_SUPPORT_BLOCK_IDS: ReadonlySet<BlockId> = new Set()

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
function buildSupportBlockIdsByRules(
  supportRules: ReadonlyArray<SupportRule | undefined>,
): Result.Result<SupportBlockIdsById, BlockRegistryFailure> {
  const blockIdsById = new Map<BlockId, ReadonlySet<BlockId>>()

  for (const entry of BLOCK_REGISTRY) {
    blockIdsById.set(entry.id, EMPTY_SUPPORT_BLOCK_IDS)
  }

  for (const entry of BLOCK_REGISTRY) {
    const supportRule = supportRules[entry.id]

    if (supportRule === undefined) {
      return failure('missing-support-rule', `Block registry is missing a support rule for ${entry.id}`)
    }

    if (supportRule.kind === 'oneOf') {
      const supportedBlockIds = new Set<BlockId>()

      for (const type of supportRule.blocks) {
        const blockId = ID_BY_TYPE.get(type)

        if (blockId === undefined) {
          return failure('missing-block-row', `Block registry is missing a row for ${type}`)
        }

        supportedBlockIds.add(blockId)
      }

      blockIdsById.set(entry.id, supportedBlockIds)
    }
  }

  return Result.succeed(blockIdsById)
}

export const buildSupportBlockIdsById = (
  supportRules?: ReadonlyArray<SupportRule | undefined>,
): Result.Result<SupportBlockIdsById, BlockRegistryIndexFailure> => {
  if (supportRules === undefined) {
    return Result.flatMap(PROPERTY_COLUMNS, (columns) => buildSupportBlockIdsByRules(columns.supportRule))
  }
  return buildSupportBlockIdsByRules(supportRules)
}

const SUPPORT_BLOCK_IDS_BY_ID = buildSupportBlockIdsById()

export const supportBlockIdsOf = (
  blockIdsById: SupportBlockIdsById,
  id: BlockId,
): Result.Result<ReadonlySet<BlockId>, BlockRegistryFailure> => {
  const blockIds = blockIdsById.get(id)
  return blockIds === undefined
    ? failure('missing-support-ids', `Block registry is missing support ids for ${id}`)
    : Result.succeed(blockIds)
}

/** Every id currently assigned, ascending. */
export const BLOCK_IDS: ReadonlyArray<BlockId> = BLOCK_REGISTRY.map((entry) => entry.id)

/** Block vocabulary to its permanent wire-format id. */
export const blockIdOf = (type: BlockType): Option.Option<BlockId> =>
  Option.fromNullishOr(ID_BY_TYPE.get(type))

/** Block id to its resolved definition, or `undefined` for an unknown byte. */
export const blockTypeOfId = (
  id: BlockId,
): Result.Result<BlockType | undefined, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(RESOLVED_BY_ID, (resolvedById) =>
      isWithinTable(blockId) ? resolvedById[blockId]?.type : undefined,
    ),
  )

/** Block id to its fully resolved definition, or `undefined` when unknown. */
export const resolvedBlockOfId = (
  id: BlockId,
): Result.Result<ResolvedBlock | undefined, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(RESOLVED_BY_ID, (resolvedById) =>
      isWithinTable(blockId) ? resolvedById[blockId] : undefined,
    ),
  )

/** Whether this number names a block in the current registry. */
export const isKnownBlockId = (id: BlockId): Result.Result<boolean, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(KNOWN_BY_ID, (knownById) => isWithinTable(blockId) && knownById[blockId] === 1),
  )

/** Read one capability from a raw chunk-buffer byte. */
export const capabilityOfBlockId = (
  id: BlockId,
  flag: BlockCapabilityFlag,
): Result.Result<boolean, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(CAPABILITIES_BY_ID, (columns) => {
      const value = isWithinTable(blockId) ? columns.get(flag)?.[blockId] : undefined
      return value === undefined ? BLOCK_CAPABILITY_DEFAULTS[flag] : value === 1
    }),
  )

/** Read one resolved property from a raw chunk-buffer byte. */
export const propertyOfBlockId = <K extends BlockPropertyName>(
  id: BlockId,
  name: K,
): Result.Result<BlockProperties[K], BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(PROPERTY_COLUMNS, (columns) => {
      if (!isWithinTable(blockId)) return BLOCK_PROPERTY_DEFAULTS[name]
      return columns.byName[name][blockId] ?? BLOCK_PROPERTY_DEFAULTS[name]
    }),
  )

/** Read all resolved capabilities from a raw chunk-buffer byte. */
export const capabilitiesOfBlockId = (
  id: BlockId,
): Result.Result<BlockCapabilities, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(RESOLVED_BY_ID, (resolvedById) =>
      (isWithinTable(blockId) ? resolvedById[blockId]?.capabilities : undefined) ?? BLOCK_CAPABILITY_DEFAULTS,
    ),
  )

/** Resolve the item dropped by a raw chunk-buffer byte. */
export const dropOfBlockId = (
  id: BlockId,
  context: HarvestContext = BARE_HANDED,
): Result.Result<BlockDrop | undefined, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(RESOLVED_BY_ID, (resolvedById) => {
      const resolved = isWithinTable(blockId) ? resolvedById[blockId] : undefined
      return resolved === undefined
        ? undefined
        : resolveDrop(resolved.properties.harvestTool, resolved.properties.drops, resolved.type, context)
    }),
  )

const buildIdsByCapability = (
  resolvedById: ReadonlyArray<ResolvedBlock | undefined>,
): ReadonlyMap<BlockCapabilityFlag, ReadonlySet<BlockId>> =>
  seededMap(BLOCK_CAPABILITY_FLAGS, (flag) => {
    const members = new Set<BlockId>()

    for (const entry of BLOCK_REGISTRY) {
      if (resolvedById[entry.id]?.capabilities[flag] === true) {
        members.add(entry.id)
      }
    }

    return members
  })

const IDS_BY_CAPABILITY = Result.map(RESOLVED_BY_ID, buildIdsByCapability)

/** Return the shared native set of ids carrying a capability. */
export const blockIdsWithCapability = (
  flag: BlockCapabilityFlag,
): Result.Result<Option.Option<ReadonlySet<BlockId>>, BlockRegistryResolutionFailure> =>
  Result.map(IDS_BY_CAPABILITY, (idsByCapability) => Option.fromNullishOr(idsByCapability.get(flag)))

/** Exported only for focused invariant tests; the package surface is the stable registry facade. */
export const buildIdsByOpacity = (columns: PropertyColumns): ReadonlyMap<BlockOpacity, ReadonlySet<BlockId>> => {
  const table = new Map<BlockOpacity, Set<BlockId>>()

  for (const opacity of BLOCK_OPACITIES) {
    table.set(opacity, new Set<BlockId>())
  }

  for (const entry of BLOCK_REGISTRY) {
    const opacity = columns.opacity[entry.id] ?? BLOCK_PROPERTY_DEFAULTS.opacity
    const blockIds = table.get(opacity)
    if (blockIds !== undefined) blockIds.add(entry.id)
  }

  return table
}

const IDS_BY_OPACITY = Result.map(PROPERTY_COLUMNS, buildIdsByOpacity)

/** Return the shared native set of ids in an opacity bucket. */
export const blockIdsWithOpacity = (
  opacity: BlockOpacity,
): Result.Result<Option.Option<ReadonlySet<BlockId>>, BlockRegistryResolutionFailure> =>
  Result.map(IDS_BY_OPACITY, (idsByOpacity) => Option.fromNullishOr(idsByOpacity.get(opacity)))

/** Read the meshing/light-attenuation class of a raw chunk-buffer byte. */
export const opacityOfBlockId = (id: BlockId): Result.Result<BlockOpacity, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(PROPERTY_COLUMNS, (columns) =>
      isWithinTable(blockId)
        ? blockPropertyColumnValueOrDefault(columns.opacity[blockId], BLOCK_PROPERTY_DEFAULTS.opacity)
        : BLOCK_PROPERTY_DEFAULTS.opacity,
    ),
  )

/** Read the emitted light level of a raw chunk-buffer byte. */
export const lightEmissionOfBlockId = (
  id: BlockId,
): Result.Result<BlockProperties['lightEmission'], BlockRegistryResolutionFailure> =>
  propertyOfBlockId(id, 'lightEmission')

/** Whether light can cross the cell represented by a raw chunk-buffer byte. */
export const transmitsLight = (id: BlockId): Result.Result<boolean, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(PROPERTY_COLUMNS, (columns) => isWithinTable(blockId) && columns.transmitsLight[blockId] === 1),
  )

/** Read the support rule of a raw chunk-buffer byte. */
export const supportRuleOfBlockId = (
  id: BlockId,
): Result.Result<SupportRule, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(PROPERTY_COLUMNS, (columns) =>
      isWithinTable(blockId)
        ? blockPropertyColumnValueOrDefault(columns.supportRule[blockId], BLOCK_PROPERTY_DEFAULTS.supportRule)
        : BLOCK_PROPERTY_DEFAULTS.supportRule,
    ),
  )

/** Whether a raw chunk-buffer byte needs support below it. */
export const isSupportSensitiveBlockId = (
  id: BlockId,
): Result.Result<boolean, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(PROPERTY_COLUMNS, (columns) => isWithinTable(blockId) && columns.supportSensitive[blockId] === 1),
  )

/** Evaluate whether a block can remain supported by the byte below it. */
export const canBlockStaySupported = (
  id: BlockId,
  supportBelow: BlockId,
): Result.Result<boolean, BlockRegistryIndexFailure> =>
  Result.gen(function* () {
    const blockId = yield* BlockId.result(id)
    const supportingBlockId = yield* BlockId.result(supportBelow)
    if (!(yield* isKnownBlockId(blockId))) return true

    const rule = yield* supportRuleOfBlockId(blockId)
    if (rule.kind === 'none') return true
    if (rule.kind === 'anySupporting') {
      return yield* capabilityOfBlockId(supportingBlockId, 'canSupportAttachments')
    }

    const blockIdsById = yield* SUPPORT_BLOCK_IDS_BY_ID
    const blockIds = yield* supportBlockIdsOf(blockIdsById, blockId)
    return blockIds.has(supportingBlockId)
  })

/** Block vocabulary entries that have no row in the registry. */
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (type) => !ID_BY_TYPE.has(type),
)

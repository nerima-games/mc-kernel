import * as kernel from '../src/index'
import { BLOCK_TYPES, isBlockType } from '../src/domain/block-type'
import { ITEM_REGISTRY, itemIdOf } from '../src/domain/item-registry'
import { ITEM_TYPES, isItemType } from '../src/domain/item-type'
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

const ORIGIN_AXIS = 0
const FIRST_BLOCK_TYPE_INDEX = 0
const ENCHANTED_BOOK_ID = 136
const SINGLE_ITEM_STACK = 1
const BUCKET_ID = 137
const BUCKET_MAX_STACK = 16
const FISHING_ROD_ID = 142
const SADDLE_ID = 151
const STANDARD_ITEM_STACK = 64
const PUBLIC_ITEM_TYPES = [
  'bow',
  'arrow',
  'bone_meal',
  'lily_pad',
  'potion_of_regeneration',
  'enchanted_book',
  'fishing_rod',
  'cod',
  'shears',
  'wool',
] as const

describe('BlockType', () => {
  it.effect('narrows a string that names a known block', () =>
    Effect.sync(() => {
      expect(isBlockType('stone')).toBe(true)
      expect(isBlockType('air')).toBe(true)
      expect(isBlockType(BLOCK_TYPES[FIRST_BLOCK_TYPE_INDEX])).toBe(true)
    }),
  )

  it.effect('rejects a string that does not, so save files and network frames cannot smuggle one in', () =>
    Effect.sync(() => {
      expect(isBlockType('unobtainium')).toBe(false)
      expect(isBlockType('')).toBe(false)
      expect(isBlockType('Stone')).toBe(false)
    }),
  )

  it.effect('accepts every block in the provisional roster', () =>
    Effect.sync(() => {
      for (const blockType of BLOCK_TYPES) {
        expect(isBlockType(blockType)).toBe(true)
      }
      expect(new Set(BLOCK_TYPES).size).toBe(BLOCK_TYPES.length)
    }),
  )
})

describe('public API surface', () => {
  // The barrel is what all 15 other repositories import. A re-export dropped
  // Here is invisible to every other test in this repository but breaks the
  // Whole organisation, so it is pinned explicitly.
  it.effect('re-exports every value the other repositories are expected to import', () =>
    Effect.sync(() => {
      const expected = [
        // Identifiers
        'WorldId',
        'StageId',
        // Quantities
        'StackCount',
        'MAX_STACK_COUNT',
        'DeltaTimeSecs',
        'MonotonicTimeSecs',
        'EpochMillis',
        // Coordinates
        'CHUNK_SIZE_XZ',
        'BlockAxis',
        'ChunkAxis',
        'LocalAxis',
        'position',
        'blockPosition',
        'blockPositionKeyOf',
        'isBlockPositionKey',
        'blockPositionOfKey',
        'decodeBlockPositionKey',
        'BLOCK_FACES',
        'HORIZONTAL_BLOCK_FACES',
        'isBlockFace',
        'oppositeBlockFace',
        'adjacentBlockPosition',
        'horizontalBlockNeighbours',
        'blockNeighbours',
        'blockPositionKey',
        'blockPositionOfKey',
        'isBlockPositionKey',
        'chunkCoord',
        'chunkKeyOf',
        'isChunkKey',
        'chunkCoordOfKey',
        'decodeChunkKey',
        'blockPositionOfPosition',
        'chunkCoordOfBlock',
        'localCoordOfBlock',
        'blockPositionOfChunkLocal',
        'aabb',
        'aabbOfBlock',
        'aabbIntersects',
        'aabbContainsPoint',
        // Versioned chunk storage boundary
        'CHUNK_CODEC_VERSION',
        'CHUNK_HEADER_BYTES',
        'chunk',
        'encodeChunk',
        'decodeChunk',
        // Block types
        'BLOCK_TYPES',
        'isBlockType',
        // Item types — plan.md §3.1's other literal vocabulary
        'ITEM_TYPES',
        'isItemType',
        // Stable item ids, storage codec, and stack metadata
        'ItemId',
        'ITEM_ID_MAX',
        'ITEM_ID_BYTES',
        'ITEM_REGISTRY',
        'ITEM_IDS',
        'isKnownItemId',
        'itemDefinitionOf',
        'maxStackCountOfItem',
        'itemIdOf',
        'itemTypeOfId',
        'encodeItemId',
        'decodeItemId',
        // Deterministic anvil planning, application, and persistence boundary
        'ANVIL_SNAPSHOT_VERSION',
        'ANVIL_TOO_EXPENSIVE_LEVEL',
        'ANVIL_REPAIR_BONUS_RATIO',
        'ANVIL_MAX_CUSTOM_NAME_LENGTH',
        'snapshotAnvilState',
        'decodeAnvilSnapshot',
        'encodeAnvilSnapshot',
        'decodeAnvilSnapshotString',
        'nextAnvilRepairCost',
        'planAnvil',
        'applyAnvil',
        // The block -> item bridge (audit §6-8's intersection, derived)
        'PLACEABLE_ITEM_TYPES',
        'NON_PLACEABLE_ITEM_TYPES',
        'UNITEMISED_BLOCK_TYPES',
        'isPlaceableItem',
        'itemOfBlock',
        'blockOfPlaceableItem',
        // Block capability flags (booleans)
        'BLOCK_CAPABILITY_DEFAULTS',
        'BLOCK_CAPABILITY_FLAGS',
        'TRUE_BY_DEFAULT_CAPABILITY_FLAGS',
        'resolveBlockCapabilities',
        'capabilityOf',
        // Block properties (typed values)
        'BLOCK_PROPERTY_DEFAULTS',
        'BLOCK_PROPERTY_NAMES',
        'BLOCK_OPACITIES',
        'FLUID_KINDS',
        'COLLISION_SHAPES',
        'RENDER_KINDS',
        'RAIL_KINDS',
        'LIGHT_LEVEL_MIN',
        'LIGHT_LEVEL_MAX',
        'isLightLevel',
        'clampLightLevel',
        'resolveBlockProperties',
        'propertyOf',
        // The two struct properties, kept in their own module for API-lock review
        'HARVEST_TOOL_CATEGORIES',
        'HARVEST_TIERS',
        'DEFAULT_HARVEST_TOOL',
        'DEFAULT_BLOCK_DROP',
        'satisfiesHarvestTier',
        'resolveDropItem',
        'BARE_HANDED',
        'resolveDrop',
        // SupportRule (audit §4.6), in its own module for the same reason: its
        // Value is a list of BLOCK NAMES, so it is the one property that can go
        // Stale when a different block's row changes.
        'NEEDS_NO_SUPPORT',
        'NEEDS_ANY_SUPPORT',
        'needsOneOf',
        'isSupportSensitive',
        'satisfiesSupportRule',
        // Block definitions
        'blockCapabilitiesOf',
        'blockPropertiesOf',
        'resolveBlock',
        'AUDITED_CAPABILITY_NAMES',
        'PENDING_CAPABILITIES',
        // Block registry — the numeric-id codec and the table
        'BlockId',
        'BLOCK_ID_MAX',
        'AIR_BLOCK_ID',
        'BLOCK_REGISTRY',
        'BLOCK_IDS',
        'isKnownBlockId',
        'blockIdOf',
        'blockTypeOfId',
        'resolvedBlockOfId',
        'capabilityOfBlockId',
        'propertyOfBlockId',
        'capabilitiesOfBlockId',
        'blockIdsWithCapability',
        'blockIdsWithOpacity',
        // The named light readings — mc-worldgen mirrors these three by name,
        // Because it cannot restate the generic property machinery to ask two
        // Questions. See `domain/block-registry.ts` on why they are the only
        // Named property readings kernel exports.
        'opacityOfBlockId',
        'lightEmissionOfBlockId',
        'transmitsLight',
        // The support readings and the two-byte join. `canBlockStaySupported` is
        // `dropOfBlockId`'s shape — a join no single accessor can express — and
        // Mx-gameplay is its consumer.
        'supportRuleOfBlockId',
        'isSupportSensitiveBlockId',
        'canBlockStaySupported',
        'dropOfBlockId',
        'UNREGISTERED_BLOCK_TYPES',
        // Camera
        'snapshotAgeSecs',
        // Clock
        'ClockPort',
        'fixedClock',
        'FixedClockLayer',
        'monotonicSecs',
        'wallClockEpochMillis',
      ]

      for (const name of expected) {
        expect(Object.keys(kernel)).toContain(name)
      }
    }),
  )

  it.effect('exposes the same implementations through the barrel as through the modules', () =>
    Effect.sync(() => {
      expect(kernel.isBlockType).toBe(isBlockType)
      expect(kernel.BLOCK_TYPES).toBe(BLOCK_TYPES)
      expect(kernel.isItemType).toBe(isItemType)
      expect(kernel.ITEM_TYPES).toBe(ITEM_TYPES)
      expect(kernel.ITEM_REGISTRY).toBe(ITEM_REGISTRY)
      expect(kernel.itemIdOf).toBe(itemIdOf)
      for (const itemType of PUBLIC_ITEM_TYPES) {
        expect(kernel.isItemType(itemType)).toBe(true)
      }
    }),
  )

  it.effect('makes the coordinate key type available to TypeScript callers', () =>
    Effect.sync(() => {
      const key: kernel.BlockPositionKey = kernel.blockPositionKeyOf(
        kernel.blockPosition(ORIGIN_AXIS, ORIGIN_AXIS, ORIGIN_AXIS),
      )

      expect(key).toBe('0,0,0')
    }),
  )

  it.effect('re-exports the ChunkKey type', () =>
    Effect.sync(() => {
      const key: kernel.ChunkKey = kernel.chunkKeyOf(kernel.chunkCoord(ORIGIN_AXIS, ORIGIN_AXIS))
      expect(key).toBe('0,0')
    }),
  )
  it.effect('exports the canonical Eye of Ender item identity', () =>
    Effect.sync(() => {
      expect(kernel.isItemType('eye_of_ender')).toBe(true)
      expect(kernel.itemIdOf('eye_of_ender')).toBe(kernel.itemDefinitionOf('eye_of_ender').id)
      expect(kernel.isPlaceableItem('eye_of_ender')).toBe(false)
    }),
  )

  it.effect('exports the canonical enchanted-book item identity', () =>
    Effect.sync(() => {
      expect(kernel.isItemType('enchanted_book')).toBe(true)
      expect(kernel.itemIdOf('enchanted_book')).toBe(ENCHANTED_BOOK_ID)
      expect(kernel.maxStackCountOfItem('enchanted_book')).toBe(SINGLE_ITEM_STACK)
      expect(kernel.isPlaceableItem('enchanted_book')).toBe(false)
    }),
  )

  it.effect('exports fluid and vehicle item identities with canonical metadata', () =>
    Effect.sync(() => {
      expect(kernel.itemIdOf('bucket')).toBe(BUCKET_ID)
      expect(kernel.maxStackCountOfItem('bucket')).toBe(BUCKET_MAX_STACK)
      for (const type of ['water_bucket', 'lava_bucket', 'oak_boat', 'minecart'] as const) {
        expect(kernel.isItemType(type)).toBe(true)
        expect(kernel.maxStackCountOfItem(type)).toBe(SINGLE_ITEM_STACK)
        expect(kernel.isPlaceableItem(type)).toBe(false)
      }
    }),
  )

  it.effect('exports fishing item identities with canonical metadata', () =>
    Effect.sync(() => {
      expect(kernel.itemIdOf('fishing_rod')).toBe(FISHING_ROD_ID)
      expect(kernel.itemIdOf('saddle')).toBe(SADDLE_ID)
      expect(kernel.maxStackCountOfItem('fishing_rod')).toBe(SINGLE_ITEM_STACK)
      expect(kernel.maxStackCountOfItem('saddle')).toBe(SINGLE_ITEM_STACK)
      const stackableFishingItems = [
        'cod',
        'salmon',
        'tropical_fish',
        'pufferfish',
        'bowl',
        'leather',
        'bone',
        'name_tag',
      ] as const
      for (const type of stackableFishingItems) {
        expect(kernel.isItemType(type)).toBe(true)
        expect(kernel.maxStackCountOfItem(type)).toBe(STANDARD_ITEM_STACK)
        expect(kernel.isPlaceableItem(type)).toBe(false)
      }
    }),
  )
})

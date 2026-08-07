import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as kernel from '../src/index'
import type { BlockRegistryEntry } from '../src/domain/block-registry'
import * as blockRegistry from '../src/domain/block-registry'
import { BLOCK_PROPERTY_DEFAULTS } from '../src/domain/block-properties'
import { BLOCK_TYPES, isBlockType } from '../src/domain/block-type'
import { isItemType, ITEM_TYPES } from '../src/domain/item-type'
import { ITEM_REGISTRY, itemIdOf } from '../src/domain/item-registry'

describe('BlockType', () => {
  it.effect('narrows a string that names a known block', () =>
    Effect.sync(() => {
      expect(isBlockType('stone')).toBe(true)
      expect(isBlockType('air')).toBe(true)
      expect(isBlockType(BLOCK_TYPES[0])).toBe(true)
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
  // here is invisible to every other test in this repository but breaks the
  // whole organisation, so it is pinned explicitly.
  it.effect('re-exports every value the other repositories are expected to import', () =>
    Effect.sync(() => {
      const expected = [
        // identifiers
        'WorldId',
        'StageId',
        // quantities
        'StackCount',
        'MAX_STACK_COUNT',
        'DeltaTimeSecs',
        'MonotonicTimeSecs',
        'EpochMillis',
        // coordinates
        'CHUNK_SIZE_XZ',
        'BlockAxis',
        'ChunkAxis',
        'LocalAxis',
        'position',
        'blockPosition',
        'BLOCK_FACES',
        'HORIZONTAL_BLOCK_FACES',
        'isBlockFace',
        'oppositeBlockFace',
        'adjacentBlockPosition',
        'horizontalBlockNeighbours',
        'blockNeighbours',
        'chunkCoord',
        'blockPositionOfPosition',
        'chunkCoordOfBlock',
        'localCoordOfBlock',
        'blockPositionOfChunkLocal',
        'aabb',
        'aabbOfBlock',
        'aabbIntersects',
        'aabbContainsPoint',
        // versioned chunk storage boundary
        'CHUNK_CODEC_VERSION',
        'CHUNK_HEADER_BYTES',
        'chunk',
        'encodeChunk',
        'decodeChunk',
        // block types
        'BLOCK_TYPES',
        'isBlockType',
        // item types — plan.md §3.1's other literal vocabulary
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
        // deterministic anvil planning, application, and persistence boundary
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
        // the block -> item bridge (audit §6-8's intersection, derived)
        'PLACEABLE_ITEM_TYPES',
        'NON_PLACEABLE_ITEM_TYPES',
        'UNITEMISED_BLOCK_TYPES',
        'isPlaceableItem',
        'itemOfBlock',
        'blockOfPlaceableItem',
        // block capability flags (booleans)
        'BLOCK_CAPABILITY_DEFAULTS',
        'BLOCK_CAPABILITY_FLAGS',
        'TRUE_BY_DEFAULT_CAPABILITY_FLAGS',
        'resolveBlockCapabilities',
        'capabilityOf',
        // block properties (typed values)
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
        // the two struct properties, kept in their own module for API-lock review
        'HARVEST_TOOL_CATEGORIES',
        'HARVEST_TIERS',
        'DEFAULT_HARVEST_TOOL',
        'DEFAULT_BLOCK_DROP',
        'satisfiesHarvestTier',
        'resolveDropItem',
        'BARE_HANDED',
        'resolveDrop',
        // supportRule (audit §4.6), in its own module for the same reason: its
        // value is a list of BLOCK NAMES, so it is the one property that can go
        // stale when a different block's row changes.
        'NEEDS_NO_SUPPORT',
        'NEEDS_ANY_SUPPORT',
        'needsOneOf',
        'isSupportSensitive',
        'satisfiesSupportRule',
        // block definitions
        'blockCapabilitiesOf',
        'blockPropertiesOf',
        'resolveBlock',
        'AUDITED_CAPABILITY_NAMES',
        'PENDING_CAPABILITIES',
        // block registry — the numeric-id codec and the table
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
        // the named light readings — mc-worldgen mirrors these three by name,
        // because it cannot restate the generic property machinery to ask two
        // questions. See `domain/block-registry.ts` on why they are the only
        // named property readings kernel exports.
        'opacityOfBlockId',
        'lightEmissionOfBlockId',
        'transmitsLight',
        // the support readings and the two-byte join. `canBlockStaySupported` is
        // `dropOfBlockId`'s shape — a join no single accessor can express — and
        // mx-gameplay is its consumer.
        'supportRuleOfBlockId',
        'isSupportSensitiveBlockId',
        'canBlockStaySupported',
        'dropOfBlockId',
        'UNREGISTERED_BLOCK_TYPES',
        // camera
        'snapshotAgeSecs',
        // clock
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
      expect(kernel.BLOCK_REGISTRY).toBe(blockRegistry.BLOCK_REGISTRY)
      expect(kernel.BLOCK_IDS).toBe(blockRegistry.BLOCK_IDS)
      expect(kernel.isKnownBlockId).toBe(blockRegistry.isKnownBlockId)
      expect(kernel.blockIdOf).toBe(blockRegistry.blockIdOf)
      expect(kernel.blockTypeOfId).toBe(blockRegistry.blockTypeOfId)
      expect(kernel.resolvedBlockOfId).toBe(blockRegistry.resolvedBlockOfId)
      expect(kernel.capabilityOfBlockId).toBe(blockRegistry.capabilityOfBlockId)
      expect(kernel.capabilitiesOfBlockId).toBe(blockRegistry.capabilitiesOfBlockId)
      expect(kernel.propertyOfBlockId).toBe(blockRegistry.propertyOfBlockId)
      expect(kernel.blockIdsWithCapability).toBe(blockRegistry.blockIdsWithCapability)
      expect(kernel.blockIdsWithOpacity).toBe(blockRegistry.blockIdsWithOpacity)
      expect(kernel.opacityOfBlockId).toBe(blockRegistry.opacityOfBlockId)
      expect(kernel.lightEmissionOfBlockId).toBe(blockRegistry.lightEmissionOfBlockId)
      expect(kernel.transmitsLight).toBe(blockRegistry.transmitsLight)
      expect(kernel.supportRuleOfBlockId).toBe(blockRegistry.supportRuleOfBlockId)
      expect(kernel.isSupportSensitiveBlockId).toBe(blockRegistry.isSupportSensitiveBlockId)
      expect(kernel.canBlockStaySupported).toBe(blockRegistry.canBlockStaySupported)
      expect(kernel.dropOfBlockId).toBe(blockRegistry.dropOfBlockId)
      expect(kernel.UNREGISTERED_BLOCK_TYPES).toBe(blockRegistry.UNREGISTERED_BLOCK_TYPES)
      expect(kernel.AIR_BLOCK_ID).toBe(blockRegistry.AIR_BLOCK_ID)
      expect(kernel.BLOCK_ID_MAX).toBe(blockRegistry.BLOCK_ID_MAX)
      expect(kernel.isItemType('bow')).toBe(true)
      expect(kernel.isItemType('arrow')).toBe(true)
      expect(kernel.isItemType('bone_meal')).toBe(true)
      expect(kernel.isItemType('lily_pad')).toBe(true)
      expect(kernel.isItemType('potion_of_regeneration')).toBe(true)
      expect(kernel.isItemType('enchanted_book')).toBe(true)
      expect(kernel.isItemType('fishing_rod')).toBe(true)
      expect(kernel.isItemType('cod')).toBe(true)
      expect(kernel.isItemType('shears')).toBe(true)
      expect(kernel.isItemType('wool')).toBe(true)
    }),
  )

  it.effect('keeps the stable block-registry import path behaviorally identical to the barrel', () =>
    Effect.sync(() => {
      const blockRegistryEntry: BlockRegistryEntry = blockRegistry.BLOCK_REGISTRY[0]!
      expect(blockRegistryEntry.id).toBe(blockRegistry.AIR_BLOCK_ID)
      expect(blockRegistryEntry.definition.type).toBe('air')

      const stoneId = blockRegistry.blockIdOf('stone')
      const stoneDefinition = blockRegistry.resolvedBlockOfId(stoneId)
      expect(kernel.blockIdOf('stone')).toBe(stoneId)
      expect(blockRegistry.blockTypeOfId(stoneId)).toBe('stone')
      expect(stoneDefinition).toBeDefined()
      expect(stoneDefinition?.type).toBe('stone')
      expect(blockRegistry.capabilityOfBlockId(stoneId, 'canSupportAttachments')).toBe(true)
      expect(blockRegistry.transmitsLight(stoneId)).toBe(false)
    }),
  )

  it.effect('documents unknown block-id defaults on the stable block-registry import path', () =>
    Effect.sync(() => {
      const unknownId = (blockRegistry.BLOCK_ID_MAX + 1) as never
      expect(blockRegistry.isKnownBlockId(unknownId)).toBe(false)
      expect(blockRegistry.dropOfBlockId(unknownId)).toBeUndefined()
      expect(blockRegistry.opacityOfBlockId(unknownId)).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
      expect(blockRegistry.lightEmissionOfBlockId(unknownId)).toBe(BLOCK_PROPERTY_DEFAULTS.lightEmission)
      expect(blockRegistry.supportRuleOfBlockId(unknownId)).toEqual(BLOCK_PROPERTY_DEFAULTS.supportRule)
      expect(blockRegistry.isSupportSensitiveBlockId(unknownId)).toBe(false)
      expect(blockRegistry.canBlockStaySupported(unknownId, blockRegistry.AIR_BLOCK_ID)).toBe(true)
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
      expect(kernel.itemIdOf('enchanted_book')).toBe(136)
      expect(kernel.maxStackCountOfItem('enchanted_book')).toBe(1)
      expect(kernel.isPlaceableItem('enchanted_book')).toBe(false)
    }),
  )

  it.effect('exports fluid and vehicle item identities with canonical metadata', () =>
    Effect.sync(() => {
      expect(kernel.itemIdOf('bucket')).toBe(137)
      expect(kernel.maxStackCountOfItem('bucket')).toBe(16)
      for (const type of ['water_bucket', 'lava_bucket', 'oak_boat', 'minecart'] as const) {
        expect(kernel.isItemType(type)).toBe(true)
        expect(kernel.maxStackCountOfItem(type)).toBe(1)
        expect(kernel.isPlaceableItem(type)).toBe(false)
      }
    }),
  )

  it.effect('exports fishing item identities with canonical metadata', () =>
    Effect.sync(() => {
      expect(kernel.itemIdOf('fishing_rod')).toBe(142)
      expect(kernel.itemIdOf('saddle')).toBe(151)
      expect(kernel.maxStackCountOfItem('fishing_rod')).toBe(1)
      expect(kernel.maxStackCountOfItem('saddle')).toBe(1)
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
        expect(kernel.maxStackCountOfItem(type)).toBe(64)
        expect(kernel.isPlaceableItem(type)).toBe(false)
      }
    }),
  )
})

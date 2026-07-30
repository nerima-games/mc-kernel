import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as kernel from '../index'
import { BLOCK_TYPES, isBlockType } from '../domain/block-type'
import { isItemType, ITEM_TYPES } from '../domain/item-type'

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
        'chunkCoord',
        'blockPositionOfPosition',
        'chunkCoordOfBlock',
        'localCoordOfBlock',
        'blockPositionOfChunkLocal',
        'aabb',
        'aabbOfBlock',
        'aabbIntersects',
        'aabbContainsPoint',
        // block types
        'BLOCK_TYPES',
        'isBlockType',
        // item types — plan.md §3.1's other literal vocabulary
        'ITEM_TYPES',
        'isItemType',
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
      expect(kernel.isItemType('bow')).toBe(true)
      expect(kernel.isItemType('arrow')).toBe(true)
      expect(kernel.isItemType('lily_pad')).toBe(true)
    }),
  )
})

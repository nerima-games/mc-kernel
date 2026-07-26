/**
 * The registry is a WIRE FORMAT, so most of what is asserted here is
 * permanence rather than behaviour.
 *
 * Three classes of assertion, in order of how expensive it is to get them
 * wrong:
 *
 *  1. **Id stability.** Every id is pinned literally. A save file stores block
 *     ids, so a reordering that shifts `sand` from 5 to 6 silently turns every
 *     existing world's deserts into oceans. There is no migration cheaper than
 *     this test.
 *  2. **Cross-repository agreement.** Ids 0-10 must equal
 *     `mc-worldgen/domain/biome.ts`'s `BLOCK` constant, because that repository
 *     has golden fixtures generated against those numbers.
 *  3. **The slice.** `fallsWhenUnsupported` must be answerable from a chunk
 *     buffer byte with no block name in the caller — the hole the vertical
 *     slice spike could not fill.
 */
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../domain/block-capabilities'
import { BLOCK_PROPERTY_DEFAULTS } from '../domain/block-properties'
import {
  AIR_BLOCK_ID,
  BLOCK_ID_MAX,
  BLOCK_IDS,
  BLOCK_REGISTRY,
  BlockId,
  blockIdOf,
  blockIdsWithCapability,
  blockIdsWithOpacity,
  blockTypeOfId,
  capabilitiesOfBlockId,
  capabilityOfBlockId,
  isKnownBlockId,
  propertyOfBlockId,
  resolvedBlockOfId,
  UNREGISTERED_BLOCK_TYPES,
} from '../domain/block-registry'
import { BLOCK_TYPES, type BlockType } from '../domain/block-type'

describe('id assignment is permanent', () => {
  /**
   * The literal table. Changing a number here is changing a save format, and
   * the diff on this array is what makes that visible in review.
   */
  const PINNED_IDS: ReadonlyArray<readonly [BlockType, number]> = [
    ['air', 0],
    ['bedrock', 1],
    ['stone', 2],
    ['dirt', 3],
    ['grass_block', 4],
    ['sand', 5],
    ['water', 6],
    ['snow', 7],
    ['gravel', 8],
    ['oak_log', 9],
    ['oak_leaves', 10],
    ['lava', 11],
    ['oak_planks', 12],
    ['glass', 13],
    ['torch', 14],
    ['glowstone', 15],
    ['piston', 16],
    // Appended when `drops` gained real data: `stone` yields cobblestone, and
    // an item you cannot place back is not a drop anyone can use.
    ['cobblestone', 17],
  ]

  it.effect('assigns exactly the pinned ids', () =>
    Effect.sync(() => {
      for (const [type, id] of PINNED_IDS) {
        expect(blockIdOf(type)).toBe(id)
        expect(blockTypeOfId(id)).toBe(type)
      }
    }),
  )

  it.effect('agrees with mc-worldgen and mc-meshing on ids 0-10', () =>
    Effect.sync(() => {
      // Transcribed from mc-worldgen/domain/biome.ts's `BLOCK` constant. Those
      // repositories' golden fixtures are byte arrays containing these numbers.
      const worldgenBlock = {
        AIR: 0,
        BEDROCK: 1,
        STONE: 2,
        DIRT: 3,
        GRASS: 4,
        SAND: 5,
        WATER: 6,
        SNOW: 7,
        GRAVEL: 8,
        LOG: 9,
        LEAVES: 10,
      } as const

      expect(blockIdOf('air')).toBe(worldgenBlock.AIR)
      expect(blockIdOf('bedrock')).toBe(worldgenBlock.BEDROCK)
      expect(blockIdOf('stone')).toBe(worldgenBlock.STONE)
      expect(blockIdOf('dirt')).toBe(worldgenBlock.DIRT)
      expect(blockIdOf('grass_block')).toBe(worldgenBlock.GRASS)
      expect(blockIdOf('sand')).toBe(worldgenBlock.SAND)
      expect(blockIdOf('water')).toBe(worldgenBlock.WATER)
      expect(blockIdOf('snow')).toBe(worldgenBlock.SNOW)
      expect(blockIdOf('gravel')).toBe(worldgenBlock.GRAVEL)
      expect(blockIdOf('oak_log')).toBe(worldgenBlock.LOG)
      expect(blockIdOf('oak_leaves')).toBe(worldgenBlock.LEAVES)
    }),
  )

  it.effect('is a bijection: no duplicate id, no duplicate type', () =>
    Effect.sync(() => {
      expect(new Set(BLOCK_IDS).size).toBe(BLOCK_REGISTRY.length)
      expect(new Set(BLOCK_REGISTRY.map((entry) => entry.definition.type)).size).toBe(BLOCK_REGISTRY.length)
    }),
  )

  it.effect('covers the whole BlockType vocabulary, so roster and table cannot drift', () =>
    Effect.sync(() => {
      expect(UNREGISTERED_BLOCK_TYPES).toStrictEqual([])
      for (const type of BLOCK_TYPES) {
        expect(blockTypeOfId(blockIdOf(type))).toBe(type)
      }
    }),
  )

  it.effect('air is zero, because a zero-filled buffer must already be a valid chunk', () =>
    Effect.sync(() => {
      expect(AIR_BLOCK_ID).toBe(0)
      const fresh = new Uint8Array(8)
      for (const byte of fresh) {
        expect(blockTypeOfId(byte)).toBe('air')
      }
    }),
  )

  it.effect('rejects ids the chunk buffer cannot hold', () =>
    Effect.sync(() => {
      expect(() => BlockId(-1)).toThrow()
      expect(() => BlockId(BLOCK_ID_MAX + 1)).toThrow()
      expect(() => BlockId(1.5)).toThrow()
      expect(BlockId(BLOCK_ID_MAX)).toBe(BLOCK_ID_MAX)
    }),
  )
})

describe('reading behaviour off a chunk buffer byte', () => {
  it.effect('answers fallsWhenUnsupported for sand and gravel and nothing else', () =>
    Effect.sync(() => {
      // THE slice question. Note that no block NAME appears on the read side:
      // the input is a number that came out of a Uint8Array.
      expect(capabilityOfBlockId(5, 'fallsWhenUnsupported')).toBe(true)
      expect(capabilityOfBlockId(8, 'fallsWhenUnsupported')).toBe(true)
      expect(capabilityOfBlockId(2, 'fallsWhenUnsupported')).toBe(false)
      expect(capabilityOfBlockId(0, 'fallsWhenUnsupported')).toBe(false)

      expect([...blockIdsWithCapability('fallsWhenUnsupported')].sort((a, b) => a - b)).toStrictEqual([5, 8])
    }),
  )

  it.effect('keeps the five "non-solid" concepts apart, exactly as audit §4.9 requires', () =>
    Effect.sync(() => {
      const glass = capabilitiesOfBlockId(blockIdOf('glass'))
      expect(glass.passable).toBe(false)
      expect(glass.suffocates).toBe(false)
      expect(glass.validSpawnSurface).toBe(false)

      const leaves = capabilitiesOfBlockId(blockIdOf('oak_leaves'))
      // The canopy fall-through bug: leaves must stay SOLID for collision.
      expect(leaves.passable).toBe(false)
      expect(leaves.suffocates).toBe(false)
      expect(leaves.validSpawnSurface).toBe(false)

      const snow = capabilitiesOfBlockId(blockIdOf('snow'))
      expect(snow.passable).toBe(false)
      expect(snow.canSupportAttachments).toBe(false)
    }),
  )

  it.effect('gives meshing its buckets as native Sets', () =>
    Effect.sync(() => {
      const transparentSolid = blockIdsWithOpacity('transparentSolid')
      expect(transparentSolid).toBeInstanceOf(Set)
      expect(transparentSolid.has(blockIdOf('glass'))).toBe(true)
      expect(transparentSolid.has(blockIdOf('oak_leaves'))).toBe(true)
      expect(transparentSolid.has(blockIdOf('stone'))).toBe(false)

      const fluid = blockIdsWithOpacity('fluid')
      expect(fluid.has(blockIdOf('water'))).toBe(true)
      expect(fluid.has(blockIdOf('lava'))).toBe(true)
      expect(fluid.has(blockIdOf('glass'))).toBe(false)

      expect(blockIdsWithCapability('fallsWhenUnsupported')).toBeInstanceOf(Set)
    }),
  )

  it.effect('reports light emission as a level and not as a boolean', () =>
    Effect.sync(() => {
      // The one-level gap is why `emissive: boolean` was the wrong type.
      expect(propertyOfBlockId(blockIdOf('torch'), 'lightEmission')).toBe(14)
      expect(propertyOfBlockId(blockIdOf('glowstone'), 'lightEmission')).toBe(15)
      expect(propertyOfBlockId(blockIdOf('lava'), 'lightEmission')).toBe(15)
      expect(propertyOfBlockId(blockIdOf('stone'), 'lightEmission')).toBe(0)
    }),
  )

  it.effect('reports WHICH fluid, not whether-fluid', () =>
    Effect.sync(() => {
      expect(propertyOfBlockId(blockIdOf('water'), 'fluid')).toBe('water')
      expect(propertyOfBlockId(blockIdOf('lava'), 'fluid')).toBe('lava')
      expect(propertyOfBlockId(blockIdOf('stone'), 'fluid')).toBe('none')
    }),
  )
})

describe('unknown ids', () => {
  it.effect('resolve to an ordinary opaque cube rather than failing', () =>
    Effect.sync(() => {
      const unknown = 200

      expect(isKnownBlockId(unknown)).toBe(false)
      expect(blockTypeOfId(unknown)).toBeUndefined()
      expect(resolvedBlockOfId(unknown)).toBeUndefined()

      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(capabilityOfBlockId(unknown, flag)).toBe(BLOCK_CAPABILITY_DEFAULTS[flag])
      }
      expect(propertyOfBlockId(unknown, 'opacity')).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
    }),
  )

  it.effect('are inert: an unknown block does not fall, burn, or let anything through', () =>
    Effect.sync(() => {
      // The failure mode of guessing wrong is a mystery block, never a player
      // falling through the world or terrain deleting itself.
      const unknown = 250
      expect(capabilityOfBlockId(unknown, 'fallsWhenUnsupported')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'flammable')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'passable')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'replaceable')).toBe(false)
    }),
  )

  it.effect('treats non-integers and out-of-range numbers the same way', () =>
    Effect.sync(() => {
      for (const value of [-1, 1.5, Number.NaN, BLOCK_ID_MAX + 1]) {
        expect(isKnownBlockId(value)).toBe(false)
        expect(blockTypeOfId(value)).toBeUndefined()
        expect(capabilityOfBlockId(value, 'fallsWhenUnsupported')).toBe(false)
      }
    }),
  )
})

describe('the table states differences only', () => {
  it.effect('leaves an ordinary cube with no overrides at all', () =>
    Effect.sync(() => {
      // The exemplar was `stone` until `drops` and `harvestTool` carried real
      // data — stone yields cobblestone to a pickaxe, which is a difference and
      // belongs in its row. `piston` is now the row that says nothing but a
      // name, and the claim being pinned is unchanged: an empty row means
      // "ordinary opaque solid cube", not "we forgot".
      const piston = BLOCK_REGISTRY.find((entry) => entry.definition.type === 'piston')
      expect(piston?.definition.capabilities).toBeUndefined()
      expect(piston?.definition.properties).toBeUndefined()

      // ...and resolves it to the documented defaults regardless.
      expect(capabilitiesOfBlockId(blockIdOf('piston'))).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
    }),
  )

  it.effect('resolves every registered id to a complete capability set', () =>
    Effect.sync(() => {
      for (const id of BLOCK_IDS) {
        const resolved = resolvedBlockOfId(id)
        expect(resolved).toBeDefined()
        for (const flag of BLOCK_CAPABILITY_FLAGS) {
          expect(typeof resolved?.capabilities[flag]).toBe('boolean')
        }
      }
    }),
  )
})

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
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS, COLLISION_SHAPES } from '../domain/block-properties'
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
    // Appended together: the rest of the reference's `PASSABLE_BLOCK_IDS`
    // (`block-collision-predicates.ts:22-42`). Appended and not inserted — ids
    // 0-17 were already spent, and an id is a wire format.
    ['ladder', 18],
    ['cobweb', 19],
    ['sapling', 20],
    ['dandelion', 21],
    ['poppy', 22],
    ['brown_mushroom', 23],
    ['red_mushroom', 24],
    ['tall_grass', 25],
    ['fern', 26],
    ['sugar_cane', 27],
    ['lily_pad', 28],
    ['kelp', 29],
    ['seagrass', 30],
    ['rail', 31],
    ['powered_rail', 32],
    // The three non-`full` collision shapes.
    ['cactus', 33],
    ['pressure_plate', 34],
    ['stone_slab', 35],
  ]

  it.effect('assigns exactly the pinned ids', () =>
    Effect.sync(() => {
      for (const [type, id] of PINNED_IDS) {
        expect(blockIdOf(type)).toBe(id)
        expect(blockTypeOfId(id)).toBe(type)
      }
    }),
  )

  it.effect('pins EVERY row, so a new block cannot enter the wire format unpinned', () =>
    Effect.sync(() => {
      // Without this, `PINNED_IDS` protects only the rows somebody remembered
      // to add to it, and the id of a block added later is pinned by nothing —
      // which is the same as not being pinned at all, discovered later.
      const pinned = PINNED_IDS.map(([type]) => type)
      const registered = BLOCK_REGISTRY.map((entry) => entry.definition.type)

      expect(new Set(pinned).size).toBe(pinned.length)
      expect([...pinned].sort()).toStrictEqual([...registered].sort())
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

  it.effect('has a bucket for every opacity and every flag, inhabited or not', () =>
    Effect.sync(() => {
      // Both tables are seeded from their enums rather than discovered from the
      // rows. That distinction is the point: bucketing rows alone gives keys
      // for the values blocks HAPPEN to have, and the roster is deliberately
      // partial (`./block-type`), so an opacity nothing currently uses is an
      // ordinary state rather than a corrupt one. Meshing must get an empty
      // `Set` for it and not `undefined`. Asserting it here is what stops the
      // seeding from being "simplified" back into a `?? new Set()` in the
      // reader — a fallback that cannot run while all three opacities are
      // inhabited, and would start running the day one is not.
      for (const opacity of BLOCK_OPACITIES) {
        expect(blockIdsWithOpacity(opacity)).toBeInstanceOf(Set)
      }
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(blockIdsWithCapability(flag)).toBeInstanceOf(Set)
      }

      // The opacity buckets PARTITION the registry: every id lands in exactly
      // one, and no bucket invents an id. A block reachable through no bucket
      // is a block meshing never draws.
      const bucketed = BLOCK_OPACITIES.flatMap((opacity) => [...blockIdsWithOpacity(opacity)])
      expect(bucketed.length).toBe(BLOCK_IDS.length)
      expect(new Set(bucketed)).toStrictEqual(new Set(BLOCK_IDS))
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

  it.effect('yield a COMPLETE capability set, so no flag on a corrupt byte reads as undefined', () =>
    Effect.sync(() => {
      // The singular reader is covered above; the plural one is what a caller
      // uses when it wants several answers about one byte, and it is the one
      // that can go wrong quietly. `capabilitiesOfBlockId(byte).passable` must
      // be `false` for an unrecognised byte, never `undefined` — both are
      // falsy, so physics would agree with the right answer for the wrong
      // reason and keep agreeing until someone asked a flag whose default is
      // `true`.
      const unknown = 200
      const capabilities = capabilitiesOfBlockId(unknown)

      expect(capabilities).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(capabilities[flag]).toBeTypeOf('boolean')
        expect(capabilities[flag]).toBe(capabilityOfBlockId(unknown, flag))
      }
    }),
  )

  it.effect('read as unknown from isKnownBlockId and resolvedBlockOfId alike, over the whole id space', () =>
    Effect.sync(() => {
      // These two spelled the range test separately until they were made one
      // function, and this sweep is what holds them together. The case they
      // could disagree about is a HOLE — an id below the table length with no
      // row, which a removed block leaves behind forever — and a caller that
      // checks with one and reads with the other would then see a block that
      // exists and has no properties.
      for (let id = -2; id <= BLOCK_ID_MAX + 2; id += 1) {
        expect(isKnownBlockId(id)).toBe(resolvedBlockOfId(id) !== undefined)
      }
      for (const id of BLOCK_IDS) {
        expect(isKnownBlockId(id)).toBe(true)
      }
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

describe('the reference tables this roster transcribes', () => {
  /**
   * ORACLE TESTS, in the sense plan.md §6 Step 2 means: the expectation is a
   * transcription of the reference implementation's own data, so a failure says
   * "kernel and the reference disagree" rather than "someone changed a value".
   *
   * Spelling differs between the two — the reference's `WOOD` / `LEAVES` /
   * `PLANKS` / `GRASS` are kernel's `oak_log` / `oak_leaves` / `oak_planks` /
   * `grass_block` — so these lists are re-spelled, which is exactly the step
   * where a transcription usually goes wrong. That is why they are asserted as
   * whole SETS rather than block by block: a set comparison catches the member
   * that was dropped in translation, and a per-block loop does not.
   */

  /**
   * `block-collision-predicates.ts:22-42`, the closed 19-member set audit §4.1
   * calls the centre of the physics side.
   */
  const REFERENCE_PASSABLE_BLOCKS: ReadonlyArray<BlockType> = [
    'air',
    'water',
    'lava',
    'torch',
    'ladder',
    'cobweb',
    'sapling',
    'dandelion',
    'poppy',
    'brown_mushroom',
    'red_mushroom',
    'tall_grass',
    'fern',
    'sugar_cane',
    'lily_pad',
    'kelp',
    'seagrass',
    'rail',
    'powered_rail',
  ]

  it.effect('reproduces PASSABLE_BLOCK_IDS exactly — every member, and no extras', () =>
    Effect.sync(() => {
      // Both directions matter and they fail differently. A MISSING member means
      // a player walks into a flower; an EXTRA member means a player falls
      // through it. The reference records the second failure in a comment at
      // `block-collision-predicates.ts:18-21` — listing LEAVES there let players
      // drop through tree canopies — so the extras half of this assertion is
      // guarding a bug that has actually happened.
      const passableIds = blockIdsWithCapability('passable')
      const passableTypes = [...passableIds].map((id) => blockTypeOfId(id))

      expect([...passableTypes].sort()).toStrictEqual([...REFERENCE_PASSABLE_BLOCKS].sort())
      expect(passableIds.size).toBe(19)
    }),
  )

  it.effect('keeps oak_leaves OUT of the passable set, which is the canopy bug itself', () =>
    Effect.sync(() => {
      // Named separately from the set comparison above because this is the one
      // membership the reference explicitly warns about, and a test that only
      // compares sorted arrays reports it as an unremarkable diff.
      expect(capabilityOfBlockId(blockIdOf('oak_leaves'), 'passable')).toBe(false)
      expect(blockIdsWithCapability('passable').has(blockIdOf('oak_leaves'))).toBe(false)
    }),
  )

  it.effect('gives every collision shape at least one block to be', () =>
    Effect.sync(() => {
      // `COLLISION_SHAPES` was enumerated from the audit before any row could
      // produce three of its five members. An uninhabited enum member is one
      // mc-physics must branch on and can never test against
      // (`getBlockCollisionShapeAt` :135-140 is that branch), so this asserts
      // the vocabulary and the data have met.
      const shapes = new Set(BLOCK_IDS.map((id) => propertyOfBlockId(id, 'collisionShape')))
      for (const shape of COLLISION_SHAPES) {
        expect(shapes.has(shape)).toBe(true)
      }

      // ...and the three that arrived with the roster are on the blocks the
      // reference branches to, not merely on SOME block.
      expect(propertyOfBlockId(blockIdOf('cactus'), 'collisionShape')).toBe('cactus')
      expect(propertyOfBlockId(blockIdOf('pressure_plate'), 'collisionShape')).toBe('pressurePlate')
      expect(propertyOfBlockId(blockIdOf('stone_slab'), 'collisionShape')).toBe('slab')
    }),
  )

  it.effect('separates rail from powered_rail, because the reference has two predicates', () =>
    Effect.sync(() => {
      // `isOnRail` (:184-195) accepts both; `isOnPoweredRail` (:197-201) accepts
      // only one. Collapsing `railKind` to a boolean would lose the speed tier
      // that `minecart-mount.ts:45` reads.
      expect(propertyOfBlockId(blockIdOf('rail'), 'railKind')).toBe('normal')
      expect(propertyOfBlockId(blockIdOf('powered_rail'), 'railKind')).toBe('powered')
      expect(propertyOfBlockId(blockIdOf('stone'), 'railKind')).toBe('none')

      // The two rails agree on everything a rail is EXCEPT the tier, which is
      // what makes the tier the only reason to keep them apart.
      expect(propertyOfBlockId(blockIdOf('rail'), 'renderKind')).toBe(
        propertyOfBlockId(blockIdOf('powered_rail'), 'renderKind'),
      )
      expect(capabilitiesOfBlockId(blockIdOf('rail'))).toStrictEqual(
        capabilitiesOfBlockId(blockIdOf('powered_rail')),
      )
    }),
  )

  it.effect('does NOT break lily_pad in water, though it breaks the other waterside plants', () =>
    Effect.sync(() => {
      // `WATER_BREAKABLE_BLOCK_TYPES` (`block-support.ts:34-44`) names
      // SUGAR_CANE and CACTUS individually and pointedly omits LILY_PAD, whose
      // support rule IS water (:83). A "plants break in water" generalisation
      // deletes every lily pad on contact with the thing it floats on.
      expect(capabilityOfBlockId(blockIdOf('lily_pad'), 'brokenByWaterFlow')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('sugar_cane'), 'brokenByWaterFlow')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('cactus'), 'brokenByWaterFlow')).toBe(true)
    }),
  )

  it.effect('keeps oak_log off the spawn surface, which the default silently got wrong', () =>
    Effect.sync(() => {
      // REGRESSION. This row carried no `validSpawnSurface` override and so
      // resolved to the default `true`, while the reference lists WOOD in
      // `NON_SPAWN_SURFACE_BLOCK_IDS` (`spawn-selection-search.ts:45`) AND in
      // `VILLAGE_NON_GROUND_IDS` (`village-placement-surface.ts:11`) — the two
      // near-duplicate lists that audit §4.9 cites for DISAGREEING happen to
      // agree here, so there was no ambiguity to hide behind.
      //
      // A true-by-default flag is the dangerous kind: omitting it opts the block
      // INTO the behaviour, and nothing about the row looked wrong.
      expect(capabilityOfBlockId(blockIdOf('oak_log'), 'validSpawnSurface')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('oak_leaves'), 'validSpawnSurface')).toBe(false)

      // ...while an ordinary cube still is one, so this did not become a blanket
      // negative.
      expect(capabilityOfBlockId(blockIdOf('stone'), 'validSpawnSurface')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('snow'), 'validSpawnSurface')).toBe(true)
    }),
  )

  it.effect('carries the plant friction of 0, which is NOT the default 0.6', () =>
    Effect.sync(() => {
      // `plantBlockProperties` (`blocks.config.terrain.ts:29-35`) sets friction
      // 0, and `getBlockFrictionAt` (`block-collision-predicates.ts:152-161`)
      // reads it for whatever a player stands on. A row that omitted it would
      // resolve to 0.6 and be indistinguishable from stone — the omission would
      // look like agreement.
      for (const plant of ['sapling', 'dandelion', 'tall_grass', 'lily_pad', 'kelp'] as const) {
        expect(propertyOfBlockId(blockIdOf(plant), 'friction')).toBe(0)
      }
      expect(BLOCK_PROPERTY_DEFAULTS.friction).toBe(0.6)
      expect(propertyOfBlockId(blockIdOf('stone'), 'friction')).toBe(0.6)
    }),
  )

  it.effect('slows an entity in a cobweb, and in nothing else', () =>
    Effect.sync(() => {
      // `movementDrag` had no inhabitant before this roster, so nothing checked
      // that the field survived resolution at all.
      const dragging = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'movementDrag') > 0)
      expect(dragging.map((id) => blockTypeOfId(id))).toStrictEqual(['cobweb'])

      // 1 - COBWEB_HORIZONTAL_MULTIPLIER (0.25, `player-physics.ts:19`). The
      // vertical multiplier (0.05, :20) has nowhere to go in a one-number field;
      // that loss is recorded at the registry row rather than rounded away here.
      expect(propertyOfBlockId(blockIdOf('cobweb'), 'movementDrag')).toBe(0.75)
    }),
  )

  it.effect('lets exactly one block hurt on contact, at the reference amount', () =>
    Effect.sync(() => {
      // CACTUS_DAMAGE = 1 and LAVA_DAMAGE = 4 (`environment-hazard.config.ts:7,26`).
      // Two damaging blocks with DIFFERENT amounts is what makes `contactDamage`
      // a number rather than a `hurts: boolean`.
      const damaging = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'contactDamage') > 0)
      expect(damaging.map((id) => blockTypeOfId(id)).sort()).toStrictEqual(['cactus', 'lava'])

      expect(propertyOfBlockId(blockIdOf('cactus'), 'contactDamage')).toBe(1)
      expect(propertyOfBlockId(blockIdOf('lava'), 'contactDamage')).toBe(4)
    }),
  )
})

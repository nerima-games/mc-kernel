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
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../src/domain/block-capabilities'
import { blockCapabilitiesOf, resolveBlock } from '../src/domain/block-definition'
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS, COLLISION_SHAPES } from '../src/domain/block-properties'
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
  lightEmissionOfBlockId,
  opacityOfBlockId,
  propertyOfBlockId,
  resolvedBlockOfId,
  transmitsLight,
  UNREGISTERED_BLOCK_TYPES,
} from '../src/domain/block-registry'
import { BLOCK_TYPES, type BlockType } from '../src/domain/block-type'

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

    // ids 36-119: the remaining 84, appended in ONE change so that the four-week
    // API-lock window restarts once rather than seven times (`./block-type`
    // explains the trade). Grouped by the reference file the properties came
    // from, in `BLOCK_REGISTRY` order.
    ['granite', 36],
    ['diorite', 37],
    ['andesite', 38],
    ['deepslate', 39],
    ['obsidian', 40],
    ['smooth_basalt', 41],
    ['calcite', 42],
    ['amethyst_block', 43],
    ['amethyst_cluster', 44],
    ['sandstone', 45],
    ['prismarine', 46],
    ['soul_sand', 47],
    ['ice', 48],
    ['farmland', 49],
    ['coal_ore', 50],
    ['iron_ore', 51],
    ['gold_ore', 52],
    ['diamond_ore', 53],
    ['redstone_ore', 54],
    ['lapis_ore', 55],
    ['emerald_ore', 56],
    ['deepslate_coal_ore', 57],
    ['deepslate_iron_ore', 58],
    ['deepslate_gold_ore', 59],
    ['deepslate_diamond_ore', 60],
    ['deepslate_redstone_ore', 61],
    ['deepslate_lapis_ore', 62],
    ['deepslate_emerald_ore', 63],
    ['coal_block', 64],
    ['iron_block', 65],
    ['gold_block', 66],
    ['diamond_block', 67],
    ['redstone_block', 68],
    ['lapis_block', 69],
    ['emerald_block', 70],
    ['wheat_crop', 71],
    ['potato_crop', 72],
    ['nether_wart_crop', 73],
    ['redstone_wire', 74],
    ['redstone_torch', 75],
    ['lever', 76],
    ['stone_button', 77],
    ['repeater', 78],
    ['redstone_lamp', 79],
    ['redstone_lamp_lit', 80],
    ['observer', 81],
    ['comparator', 82],
    ['dispenser', 83],
    ['hopper', 84],
    ['piston_head', 85],
    ['end_stone', 86],
    ['end_portal_frame', 87],
    ['end_portal_frame_filled', 88],
    ['end_portal', 89],
    ['chorus_flower', 90],
    ['chorus_plant', 91],
    ['dragon_egg', 92],
    ['end_crystal', 93],
    ['end_gateway', 94],
    ['end_rod', 95],
    ['end_stone_bricks', 96],
    ['ender_chest', 97],
    ['purpur_block', 98],
    ['purpur_pillar', 99],
    ['purpur_slab', 100],
    ['purpur_stairs', 101],
    ['shulker_box', 102],
    ['crafting_table', 103],
    ['furnace', 104],
    ['chest', 105],
    ['door', 106],
    ['door_open', 107],
    ['oak_stairs', 108],
    ['anvil', 109],
    ['cauldron', 110],
    ['water_cauldron', 111],
    ['bed', 112],
    ['enchanting_table', 113],
    ['brewing_stand', 114],
    ['tnt', 115],
    ['nether_brick', 116],
    ['netherrack', 117],
    ['nether_portal', 118],
    ['fire', 119],
    ['soul_soil', 120],
    ['wither_skeleton_skull', 121],
    ['dropper', 122],
  ]

  it.effect('assigns exactly the pinned ids', () =>
    Effect.sync(() => {
      for (const [type, id] of PINNED_IDS) {
        expect(blockIdOf(type)).toBe(id)
        expect(blockTypeOfId(id)).toBe(type)
      }
      expect(() => blockIdOf('not_a_block' as BlockType)).toThrow(
        'Block registry is missing a row for not_a_block',
      )
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
  it.effect('answers tillable from the registry for dirt and grass_block only', () =>
    Effect.sync(() => {
      expect(capabilityOfBlockId(blockIdOf('dirt'), 'tillable')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('grass_block'), 'tillable')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('stone'), 'tillable')).toBe(false)
      expect([...blockIdsWithCapability('tillable')]).toStrictEqual([blockIdOf('dirt'), blockIdOf('grass_block')])
    }),
  )

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

/**
 * The three named light readings, and the one property they must have: they are
 * READINGS of the property table, not a second copy of it.
 *
 * mc-worldgen mirrors these three rather than importing them (it cannot import
 * kernel yet — the design contract Step 3 publishes bottom-up). A named accessor that
 * drifted from `propertyOfBlockId` would put kernel itself in the position the
 * mirror discipline exists to prevent: two answers to one question, agreeing
 * until the day they do not.
 */
describe('the named light readings', () => {
  it.effect('are exactly the generic accessor, on every id in the byte range', () =>
    Effect.sync(() => {
      // THE load-bearing assertion of this describe. It sweeps the whole
      // `Uint8Array` domain — registered rows, holes and unknown bytes alike —
      // so there is no id at which a named reading and the generic one can
      // differ. Everything else below is a worked example of a consequence.
      for (let id = 0; id <= BLOCK_ID_MAX; id += 1) {
        expect(opacityOfBlockId(id)).toBe(propertyOfBlockId(id, 'opacity'))
        expect(lightEmissionOfBlockId(id)).toBe(propertyOfBlockId(id, 'lightEmission'))
        expect(transmitsLight(id)).toBe(propertyOfBlockId(id, 'opacity') !== 'opaque')
      }
    }),
  )

  it.effect('are TOTAL, so a corrupt or newer-build byte reads as an unlit opaque cube', () =>
    Effect.sync(() => {
      const unknown = 200
      expect(isKnownBlockId(unknown)).toBe(false)

      expect(opacityOfBlockId(unknown)).toBe('opaque')
      expect(transmitsLight(unknown)).toBe(false)
      expect(lightEmissionOfBlockId(unknown)).toBe(BLOCK_PROPERTY_DEFAULTS.lightEmission)

      // Non-integers and out-of-range bytes take the same arm rather than
      // throwing: `StageRegistration`'s `run` has error channel `never`, so a
      // rule reading light out of a chunk buffer has nowhere to put a failure.
      expect(opacityOfBlockId(-1)).toBe('opaque')
      expect(lightEmissionOfBlockId(1.5)).toBe(0)
    }),
  )

  it.effect('name every emitting row and no others', () =>
    Effect.sync(() => {
      const emitting = BLOCK_IDS.filter((id) => lightEmissionOfBlockId(id) > 0)

      // Every emitter, with its level, in registry order. `EMISSIVE_TABLE`
      // (`light.ts:38-46`) is built from `properties.emissive` and then
      // OVERRIDDEN per block by `EMISSIVE_LEVEL_OVERRIDES` (:24-35), so a row is
      // wrong here if either half was transcribed without the other.
      expect(emitting.map((id) => [blockTypeOfId(id), lightEmissionOfBlockId(id)])).toStrictEqual([
        ['lava', 15],
        ['torch', 14],
        ['glowstone', 15],
        ['amethyst_cluster', 15],
        ['redstone_ore', 9],
        ['deepslate_redstone_ore', 9],
        ['redstone_block', 15],
        ['redstone_torch', 7],
        ['redstone_lamp_lit', 15],
        ['end_portal_frame', 1],
        ['end_portal_frame_filled', 3],
        ['end_portal', 15],
        ['end_gateway', 15],
        ['end_rod', 15],
        ['ender_chest', 15],
        ['nether_portal', 11],
        ['fire', 15],
      ])

      // SIX DISTINCT LEVELS now, which is what retires the last of the
      // `emissive: boolean` argument for good. A boolean could not tell a
      // redstone torch (7) from a redstone ore (9) from a torch (14) from lava
      // (15), and could not say anything at all about a portal frame at 1
      // rising to 3 when its eye is socketed.
      expect(new Set(emitting.map((id) => lightEmissionOfBlockId(id)))).toStrictEqual(new Set([1, 3, 7, 9, 11, 14, 15]))

      expect(lightEmissionOfBlockId(blockIdOf('lava'))).toBe(15)
      expect(lightEmissionOfBlockId(blockIdOf('torch'))).toBe(14)
      expect(lightEmissionOfBlockId(blockIdOf('glowstone'))).toBe(15)

      // `redstone_lamp` and `redstone_lamp_lit` are the pair that shows why the
      // two states are two literals: same block, same hardness, 0 vs 15.
      expect(lightEmissionOfBlockId(blockIdOf('redstone_lamp'))).toBe(0)
      expect(lightEmissionOfBlockId(blockIdOf('redstone_lamp_lit'))).toBe(15)

      // `light.ts:24-46` `EMISSIVE_LEVEL_OVERRIDES` puts TORCH at 14 and not 15.
      // The one-level gap is the entire argument for the column being a number,
      // and a flattening edit has to fail somewhere.
      expect(lightEmissionOfBlockId(blockIdOf('torch'))).not.toBe(lightEmissionOfBlockId(blockIdOf('glowstone')))
    }),
  )

  it.effect('keep the two columns independent — GLOWSTONE is opaque and emits 15', () =>
    Effect.sync(() => {
      // The row that forbids inferring either column from the other. A
      // transcription that assumed "emitters are transparent" or "opaque blocks
      // are dark" gets this wrong in whichever direction it guessed.
      expect(opacityOfBlockId(blockIdOf('glowstone'))).toBe('opaque')
      expect(transmitsLight(blockIdOf('glowstone'))).toBe(false)
      expect(lightEmissionOfBlockId(blockIdOf('glowstone'))).toBe(15)

      // And the mirror image: air transmits and emits nothing.
      expect(transmitsLight(AIR_BLOCK_ID)).toBe(true)
      expect(lightEmissionOfBlockId(AIR_BLOCK_ID)).toBe(0)
    }),
  )

  it.effect('is NOT a synonym for passable — GLASS is the row that says so', () =>
    Effect.sync(() => {
      // Audit §4.9. If `opacity` agreed with an existing flag on every row it
      // would not be a capability, it would be a spelling.
      const glass = blockIdOf('glass')
      expect(transmitsLight(glass)).toBe(true)
      expect(capabilityOfBlockId(glass, 'passable')).toBe(false)

      // THIRTY rows transmit light while colliding, so the disagreement is a
      // property of the table rather than of one hand-picked block. It was five
      // on the 36-row roster; the full roster makes it a quarter of the table.
      //
      // Most of the new ones come from one place: `blocks.config.crafted.ts`
      // marks levers, buttons, wire, doors, beds and repeaters `transparency:
      // true, solid: false`, and NONE of them is in `PASSABLE_BLOCK_IDS`. The
      // reference therefore renders them as see-through and collides with them
      // as full cubes, which is precisely the pair of answers a single
      // `transparent`/`solid` boolean cannot hold at once.
      const solidAndTransmitting = BLOCK_IDS.filter(
        (id) => transmitsLight(id) && !capabilityOfBlockId(id, 'passable'),
      )
      expect(solidAndTransmitting.map((id) => blockTypeOfId(id))).toStrictEqual([
        'oak_leaves',
        'glass',
        'cactus',
        'pressure_plate',
        'stone_slab',
        'ice',
        'wheat_crop',
        'potato_crop',
        'nether_wart_crop',
        'redstone_wire',
        'redstone_torch',
        'lever',
        'stone_button',
        'repeater',
        'end_portal',
        'chorus_flower',
        'chorus_plant',
        'dragon_egg',
        'end_crystal',
        'end_gateway',
        'end_rod',
        'purpur_slab',
        'purpur_stairs',
        'door',
        'door_open',
        'oak_stairs',
        'bed',
        'brewing_stand',
        'nether_portal',
        'fire',
        'wither_skeleton_skull',
      ])

      // The three crops are in this list, and that is the fact most likely to be
      // "fixed" by someone who has not read `block-support.ts`. A crop is not
      // passable in the reference — `PASSABLE_BLOCK_IDS` contains no crop — so a
      // player walks into wheat rather than through it.
      for (const crop of ['wheat_crop', 'potato_crop', 'nether_wart_crop'] as const) {
        expect(capabilityOfBlockId(blockIdOf(crop), 'passable')).toBe(false)
      }
    }),
  )

  it.effect('is NOT a synonym for canSupportAttachments or validSpawnSurface either', () =>
    Effect.sync(() => {
      // Both flags take BOTH values among the light-transmitting rows, which is
      // the shape of "independent" that a single example cannot show.
      const transmitting = BLOCK_IDS.filter((id) => transmitsLight(id))

      const supports = new Set(transmitting.map((id) => capabilityOfBlockId(id, 'canSupportAttachments')))
      expect(supports).toStrictEqual(new Set([true, false]))

      const spawns = new Set(transmitting.map((id) => capabilityOfBlockId(id, 'validSpawnSurface')))
      expect(spawns).toStrictEqual(new Set([true, false]))

      // The named rows behind those sets, so a reviewer need not re-derive them.
      // `ladder` is passable AND transmits AND still holds a torch
      // (`block-support.ts:47-60` omits it); `torch` does not.
      expect(capabilityOfBlockId(blockIdOf('ladder'), 'canSupportAttachments')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('torch'), 'canSupportAttachments')).toBe(false)
      // `stone_slab` transmits and is a spawn surface; `glass` transmits and is not.
      expect(capabilityOfBlockId(blockIdOf('stone_slab'), 'validSpawnSurface')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('glass'), 'validSpawnSurface')).toBe(false)
    }),
  )

  it.effect('is NOT a synonym for !suffocates either — the coincidence that used to hold is over', () =>
    Effect.sync(() => {
      // THIS TEST REPLACES A TRIPWIRE, AND THE TRIPWIRE FIRED AS DESIGNED.
      //
      // On the 36-row roster `transmitsLight(id)` happened to equal
      // `!suffocates` for every row, and the previous test pinned that
      // coincidence to `[]` with an instruction attached: when the row that
      // breaks it lands, DELETE this rather than making the two agree again.
      // The full roster broke it, so the instruction has been followed.
      //
      // One detail is worth keeping because it is the interesting kind of
      // wrong. The old comment predicted the breaking row would be `oak_stairs`,
      // "opaque, and in `NON_SUFFOCATING_BLOCKS`". `oak_stairs` is in that set,
      // but it is `transparency: true` in `blocks.config.crafted.ts:17-21`, so it
      // still COINCIDES and was not the cause at all. The prediction reached the
      // right conclusion through a fact that is not true — which is exactly why
      // the tripwire was written as an assertion over the whole table instead of
      // as a note about one block.
      const separating = BLOCK_IDS.filter((id) => transmitsLight(id) === capabilityOfBlockId(id, 'suffocates'))

      expect(separating.map((id) => blockTypeOfId(id))).toStrictEqual([
        'ice',
        'farmland',
        'potato_crop',
        'end_portal_frame',
        'end_portal_frame_filled',
        'ender_chest',
        'shulker_box',
        'enchanting_table',
        'brewing_stand',
        'fire',
      ])

      // The list separates in BOTH directions, which is what makes it evidence
      // of independence rather than of an offset.
      //
      //   opaque and yet does NOT suffocate — `farmland`, `ender_chest`,
      //   `shulker_box`, `enchanting_table` and both portal frames are all in
      //   `NON_SUFFOCATING_BLOCKS` (`environment-hazard.config.ts:39-85`) while
      //   being `transparency: false` in their config rows.
      expect(transmitsLight(blockIdOf('farmland'))).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('farmland'), 'suffocates')).toBe(false)

      //   transparent and yet DOES suffocate — `ice`, `potato_crop`,
      //   `brewing_stand` and `fire` are absent from that set. Read literally,
      //   the reference suffocates a player standing inside a fire, which is
      //   transcribed rather than repaired for the reason given at the crops
      //   group in `domain/block-registry.ts`.
      expect(transmitsLight(blockIdOf('ice'))).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('ice'), 'suffocates')).toBe(true)

      // The two are decided by different reference tables: opacity by
      // `blocks.config.*` `transparency` plus `meshing-worker-config.ts:7-13`,
      // suffocation by `environment-hazard.config.ts:39-85`. They were never
      // derivable from each other; now the table shows it instead of asserting it.
      expect(transmitsLight(blockIdOf('glass'))).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('glass'), 'suffocates')).toBe(false)
    }),
  )

  it.effect('agrees with the meshing buckets, which are built from the same column', () =>
    Effect.sync(() => {
      // `blockIdsWithOpacity` pre-expands what `opacityOfBlockId` answers one id
      // at a time. mc-meshing takes the sets, mc-worldgen's light grid takes the
      // predicate, and the two must not be able to disagree about one block.
      for (const opacity of BLOCK_OPACITIES) {
        for (const id of blockIdsWithOpacity(opacity)) {
          expect(opacityOfBlockId(id)).toBe(opacity)
        }
      }

      const transmitting = new Set(BLOCK_IDS.filter((id) => transmitsLight(id)))
      const nonOpaque = new Set([...blockIdsWithOpacity('transparentSolid'), ...blockIdsWithOpacity('fluid')])
      expect(transmitting).toStrictEqual(nonOpaque)
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
  it.effect('resolves a definition with no overrides to the documented defaults', () =>
    Effect.sync(() => {
      // NO ROW IN THE TABLE IS BARE ANY MORE, and that is a deliberate reversal.
      //
      // The exemplar was `stone`, then `piston`. `piston` lost the job by being
      // WRONG: it stated nothing, so it resolved to `validSpawnSurface: true`
      // while `NON_SPAWN_SURFACE_BLOCK_IDS` lists it, and mobs could spawn on a
      // piston for as long as the row was empty. The row is annotated in
      // `domain/block-registry.ts` with the whole story.
      //
      // The lesson is that a bare row cannot distinguish "checked, nothing to
      // say" from "not checked" — the two are spelled identically — and a flag
      // that defaults to `true` turns the second into a silent behaviour change.
      // So the invariant is now tested on the MECHANISM, where it actually
      // lives, rather than on whichever row happened to look boring.
      expect(resolveBlock({ type: 'stone' })).toStrictEqual({
        type: 'stone',
        capabilities: { ...BLOCK_CAPABILITY_DEFAULTS },
        properties: { ...BLOCK_PROPERTY_DEFAULTS },
      })

      // the design contract's "adding a block = one table row + flag settings" is
      // unaffected: a definition may still be nothing but a name, and this is
      // what it means when it is.
      expect(blockCapabilitiesOf({ type: 'stone' })).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })

      // And the table no longer contains such a row, asserted so that adding one
      // back is a decision rather than an accident.
      const bare = BLOCK_REGISTRY.filter(
        (entry) => entry.definition.capabilities === undefined && entry.definition.properties === undefined,
      )
      expect(bare).toStrictEqual([])
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

  it.effect('keeps the capability column aligned with resolved rows for every byte', () =>
    Effect.sync(() => {
      for (let rawId = 0; rawId <= BLOCK_ID_MAX; rawId += 1) {
        const resolved = resolvedBlockOfId(rawId)
        expect(capabilitiesOfBlockId(rawId)).toStrictEqual(
          resolved?.capabilities ?? BLOCK_CAPABILITY_DEFAULTS,
        )
        for (const flag of BLOCK_CAPABILITY_FLAGS) {
          expect(capabilityOfBlockId(rawId, flag)).toBe(
            resolved?.capabilities[flag] ?? BLOCK_CAPABILITY_DEFAULTS[flag],
          )
        }
      }
    }),
  )
})

describe('the reference tables this roster transcribes', () => {
  /**
   * ORACLE TESTS, in the sense the design contract Step 2 means: the expectation is a
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

      // CHANGED WITH THE ROSTER, and the change is the point. `stone` used to be
      // the "ordinary" anchor at the default 0.6; it is 0.8 in the reference
      // (`blocks.config.terrain.ts`, the whole stone family), and this row was
      // one of ten that omitted `friction` and silently took the default.
      // `getBlockFrictionAt` reads it for whatever the player stands on, so each
      // omission was a movement difference nobody had written down.
      expect(propertyOfBlockId(blockIdOf('stone'), 'friction')).toBe(0.8)

      // Four distinct values across the table, which is what a column that was
      // actually transcribed looks like. `ice` at 0.98 is the extreme the
      // default could never have approximated.
      expect(propertyOfBlockId(blockIdOf('ice'), 'friction')).toBe(0.98)
      expect(propertyOfBlockId(blockIdOf('snow'), 'friction')).toBe(0.3)
      expect(propertyOfBlockId(blockIdOf('sand'), 'friction')).toBe(0.5)
      expect(propertyOfBlockId(blockIdOf('dirt'), 'friction')).toBe(0.6)
    }),
  )

  it.effect('classifies the reference footstep surfaces without making sound cues a kernel concern', () =>
    Effect.sync(() => {
      expect(BLOCK_PROPERTY_DEFAULTS.footstepMaterial).toBe('default')

      for (const block of ['dirt', 'grass_block', 'farmland'] as const) {
        expect(propertyOfBlockId(blockIdOf(block), 'footstepMaterial')).toBe('grass')
      }
      for (const block of ['oak_log', 'oak_planks', 'oak_leaves', 'sapling', 'ladder', 'chest', 'door'] as const) {
        expect(propertyOfBlockId(blockIdOf(block), 'footstepMaterial')).toBe('wood')
      }
      for (const block of ['stone', 'gravel', 'sand', 'cobblestone', 'end_stone_bricks'] as const) {
        expect(propertyOfBlockId(blockIdOf(block), 'footstepMaterial')).toBe('stone')
      }
      expect(propertyOfBlockId(blockIdOf('glass'), 'footstepMaterial')).toBe('default')
    }),
  )

  it.effect('puts hardness on the reference’s 0-100 scale, so the column can be compared to itself', () =>
    Effect.sync(() => {
      // `historical design audit` §4.5.1 recorded that this column held two
      // scales at once and left the choice open; §4.5.2 records how it was
      // closed. The scale is the reference's, stated at
      // `blocks.config.terrain.ts:4-8`, and these are its anchors.
      expect(BLOCK_PROPERTY_DEFAULTS.hardness).toBe(8)
      expect(propertyOfBlockId(blockIdOf('dirt'), 'hardness')).toBe(8)
      expect(propertyOfBlockId(blockIdOf('bedrock'), 'hardness')).toBe(100)

      // THE ORDERING THAT WAS INVERTED. `oak_log` and `oak_planks` were 2 —
      // vanilla's float — which put a tree trunk BELOW dirt. `break-speed.ts`
      // scales mining time linearly in hardness, so this was a real difference
      // in play and not a cosmetic one.
      expect(propertyOfBlockId(blockIdOf('oak_log'), 'hardness')).toBe(35)
      expect(propertyOfBlockId(blockIdOf('oak_planks'), 'hardness')).toBe(35)
      expect(propertyOfBlockId(blockIdOf('oak_log'), 'hardness')).toBeGreaterThan(
        propertyOfBlockId(blockIdOf('dirt'), 'hardness'),
      )
      expect(propertyOfBlockId(blockIdOf('stone'), 'hardness')).toBe(25)
      expect(propertyOfBlockId(blockIdOf('deepslate'), 'hardness')).toBe(50)
      expect(propertyOfBlockId(blockIdOf('obsidian'), 'hardness')).toBe(90)

      // THE ONE GROUP THAT IS NOT ON THIS SCALE, transcribed rather than
      // converted. `blocks.config.end.ts` passes vanilla floats to its helper,
      // so purpur reads as softer than dirt. Pinned so that the inconsistency is
      // a checked fact with a citation rather than something a reader has to
      // notice; see audit §4.5.2 for why converting would be inventing content.
      expect(propertyOfBlockId(blockIdOf('purpur_block'), 'hardness')).toBe(1.5)
      expect(propertyOfBlockId(blockIdOf('purpur_block'), 'hardness')).toBeLessThan(
        propertyOfBlockId(blockIdOf('dirt'), 'hardness'),
      )
      // ...while its sibling in the SAME reference file is on the 0-100 scale,
      // which is what makes this the reference's inconsistency and not kernel's.
      expect(propertyOfBlockId(blockIdOf('end_stone_bricks'), 'hardness')).toBe(45)

      // `end_gateway` is -1 in the reference. Kept as 0, which is behaviourally
      // identical under `computeBreakTicks` (`hardness <= 0` -> 0 ticks) and is
      // inside the range this column claims. A negative would have travelled to
      // consumers as a number smaller than "instant".
      expect(propertyOfBlockId(blockIdOf('end_gateway'), 'hardness')).toBe(0)
      for (const id of BLOCK_IDS) {
        expect(propertyOfBlockId(id, 'hardness')).toBeGreaterThanOrEqual(0)
      }
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

describe('the completed roster and additive gameplay vocabulary', () => {
  it.effect('keeps the reference’s 120 plus two additions distinct and registered', () =>
    Effect.sync(() => {
      // `docs/testing.md` §5.2 re-derived the 120 from two hand-maintained
      // arrays in the reference that agree as sets (`BlockTypeSchema` and
      // `INDEX_TO_BLOCK_TYPE`). The number is pinned here rather than only in
      // prose because prose is what gets re-quoted without being re-checked, and
      // this repository's most-repeated defect is a figure justified by the
      // wrong measurement.
      //
      // Counting LINES of the reference schema gives 128; eight are comments.
      // That is the trap, and 120 is the answer.
      expect(BLOCK_TYPES.length).toBe(123)
      expect(new Set(BLOCK_TYPES).size).toBe(123)
      expect(BLOCK_REGISTRY.length).toBe(123)

      // The bijection, both ways, over the whole roster. `UNREGISTERED_BLOCK_TYPES`
      // asserts one direction elsewhere; this is the round trip.
      for (const type of BLOCK_TYPES) {
        expect(blockTypeOfId(blockIdOf(type))).toBe(type)
      }
      expect(new Set(BLOCK_IDS).size).toBe(123)
    }),
  )

  it.effect('fits the chunk byte, which is what makes the ids a wire format at all', () =>
    Effect.sync(() => {
      // 120 rows in a 256-value space. Worth an assertion rather than a comment:
      // the ceiling is a property of the `Uint8Array` chunk buffer, and the day
      // the roster crosses it the fix is a chunk-format migration in mc-save,
      // not a bigger number here.
      for (const id of BLOCK_IDS) {
        expect(id).toBeLessThanOrEqual(BLOCK_ID_MAX)
      }
      expect(Math.max(...BLOCK_IDS)).toBe(122)
    }),
  )

  it.effect('keeps the four ore columns independent, which no single flag could', () =>
    Effect.sync(() => {
      // The ore group is where four capabilities that LOOK correlated are
      // decided by four different reference tables. If any pair were derived
      // from another, one of these would be impossible to write.
      //
      // iron ore: gated at STONE tier, yields RAW_IRON, ZERO xp, NO fortune.
      // coal ore: gated at WOODEN tier, yields COAL, 5 xp, fortune applies.
      // Same shape of block, four columns, and every column differs.
      const iron = blockIdOf('iron_ore')
      const coal = blockIdOf('coal_ore')

      expect(propertyOfBlockId(iron, 'harvestTool').minTier).toBe('stone')
      expect(propertyOfBlockId(coal, 'harvestTool').minTier).toBe('wooden')
      expect(propertyOfBlockId(iron, 'drops').item).toBe('raw_iron')
      expect(propertyOfBlockId(coal, 'drops').item).toBe('coal')
      expect(propertyOfBlockId(iron, 'xpOnBreak')).toBe(0)
      expect(propertyOfBlockId(coal, 'xpOnBreak')).toBe(5)
      expect(propertyOfBlockId(iron, 'drops').affectedByFortune).toBe(false)
      expect(propertyOfBlockId(coal, 'drops').affectedByFortune).toBe(true)

      // THE TRAP IN THIS GROUP: "gives no XP" and "no fortune" hold of the same
      // four blocks today (iron and gold, stone and deepslate), so it is easy to
      // treat them as one fact. They come from `ORE_XP_TABLE`
      // (`blocks.config.ores.ts:29-37`) and `FORTUNE_ORE_BLOCKS`
      // (`block-service.config.ts:270-276`) — two lists, written apart, that
      // happen to agree. Recorded as a coincidence so that a later edit deriving
      // one from the other is a visible decision.
      const noXp = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'xpOnBreak') === 0)
      const noFortune = BLOCK_IDS.filter((id) => !propertyOfBlockId(id, 'drops').affectedByFortune)
      expect(noXp.length).not.toBe(noFortune.length)

      // Deepslate is HARDER than its stone twin while being gated at the SAME
      // tier — the clearest single case for hardness and minTier being two axes.
      expect(propertyOfBlockId(blockIdOf('deepslate_iron_ore'), 'hardness')).toBe(60)
      expect(propertyOfBlockId(iron, 'hardness')).toBe(50)
      expect(propertyOfBlockId(blockIdOf('deepslate_iron_ore'), 'harvestTool').minTier).toBe('stone')
    }),
  )

  it.effect('inhabits all four harvest tiers, so the ladder is a ladder and not a boolean', () =>
    Effect.sync(() => {
      const tiers = new Set(BLOCK_IDS.map((id) => propertyOfBlockId(id, 'harvestTool').minTier))
      expect(tiers).toStrictEqual(new Set(['none', 'wooden', 'stone', 'iron', 'diamond']))

      // `obsidian` is the sole member of the top tier in the reference
      // (`harvestable-blocks.ts:53-56`), which is worth pinning: a fifth tier or
      // a second diamond block would be a content decision, not a transcription.
      const diamondTier = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'harvestTool').minTier === 'diamond')
      expect(diamondTier.map((id) => blockTypeOfId(id))).toStrictEqual(['obsidian'])
    }),
  )

  it.effect('transcribes the crop suffocation split instead of smoothing it', () =>
    Effect.sync(() => {
      // The sharpest disagreement in the reference, and the one most likely to
      // be "fixed" by a well-meaning edit. `block-support.ts:20` defines the
      // three crops as ONE set and every rule there treats them identically;
      // `NON_SUFFOCATING_BLOCKS` lists two of the three.
      expect(capabilityOfBlockId(blockIdOf('wheat_crop'), 'suffocates')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('nether_wart_crop'), 'suffocates')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('potato_crop'), 'suffocates')).toBe(true)

      // The audit §4.7 implication that WOULD have licensed inferring `false`
      // does not apply, and this is why: it is licensed by `passable`, and no
      // crop is passable. Pinned so that anyone reaching for the inference finds
      // the reason it is unavailable rather than rediscovering it.
      for (const crop of ['wheat_crop', 'potato_crop', 'nether_wart_crop'] as const) {
        expect(capabilityOfBlockId(blockIdOf(crop), 'passable')).toBe(false)
        // ...while the three agree on everything `block-support.ts` decides,
        // which is what makes the suffocation split a split rather than a
        // difference between blocks.
        expect(capabilityOfBlockId(blockIdOf(crop), 'canSupportAttachments')).toBe(false)
        expect(capabilityOfBlockId(blockIdOf(crop), 'brokenByWaterFlow')).toBe(true)
        expect(capabilityOfBlockId(blockIdOf(crop), 'validSpawnSurface')).toBe(false)
      }
    }),
  )

  it.effect('completes the closed reference tables it set out to complete', () =>
    Effect.sync(() => {
      // The roster grew by CLOSED TABLES rather than by count (`domain/block-type.ts`).
      // These are the ones the last 84 finished, asserted as membership so that
      // "the table is complete" is checked rather than claimed.

      // `FLAMMABLE_BLOCK_TYPES` (`fire-lifecycle.ts:19-30`), 11 members.
      const flammable = BLOCK_IDS.filter((id) => capabilityOfBlockId(id, 'flammable')).map((id) => blockTypeOfId(id))
      expect(flammable).toStrictEqual([
        'oak_log',
        'oak_leaves',
        'oak_planks',
        'ladder',
        'crafting_table',
        'chest',
        'door',
        'door_open',
        'oak_stairs',
        'bed',
        'tnt',
      ])

      // `isFireSourceIndex` (`fire-lifecycle.ts:80-81`) is exactly two, and they
      // are what shows `fireSource` is not a synonym for `flammable`: neither of
      // these is flammable, and no flammable block is a fire source.
      const sources = BLOCK_IDS.filter((id) => capabilityOfBlockId(id, 'fireSource')).map((id) => blockTypeOfId(id))
      expect(sources).toStrictEqual(['lava', 'netherrack'])
      for (const source of ['lava', 'netherrack'] as const) {
        expect(capabilityOfBlockId(blockIdOf(source), 'flammable')).toBe(false)
      }

      // `SLAB_BLOCK_IDS` (`block-collision-predicates.ts:56-59`), 2 members. It
      // had one until `purpur_slab` landed, so `collisionShape: 'slab'` now has
      // the whole reference table behind it rather than a single case.
      const slabs = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'collisionShape') === 'slab')
      expect(slabs.map((id) => blockTypeOfId(id))).toStrictEqual(['stone_slab', 'purpur_slab'])
    }),
  )
})

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
import {
  AIR_BLOCK_ID,
  BLOCK_IDS,
  BLOCK_ID_MAX,
  BLOCK_REGISTRY,
  BlockId,
  UNREGISTERED_BLOCK_TYPES,
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
} from '../src/domain/block-registry'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../src/domain/block-capabilities'
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS, COLLISION_SHAPES } from '../src/domain/block-properties'
import { BLOCK_TYPES, type BlockType } from '../src/domain/block-type'
import { blockCapabilitiesOf, resolveBlock } from '../src/domain/block-definition'
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

const number = Number

const expectUnknownCapabilityDefaults = (unknown: number) => {
  const capabilities = capabilitiesOfBlockId(unknown)
  expect(capabilities).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    expect(capabilities[flag]).toBeTypeOf('boolean')
    expect(capabilities[flag]).toBe(capabilityOfBlockId(unknown, flag))
  }
}

const expectOreProperties = () => {
  const oreExpectations = [
    ['iron_ore', 'stone', 'raw_iron', number('0'), false],
    ['coal_ore', 'wooden', 'coal', number('5'), true],
  ] as const
  for (const [type, minTier, item, xpOnBreak, affectedByFortune] of oreExpectations) {
    const id = blockIdOf(type)
    expect(propertyOfBlockId(id, 'harvestTool').minTier).toBe(minTier)
    expect(propertyOfBlockId(id, 'drops').item).toBe(item)
    expect(propertyOfBlockId(id, 'xpOnBreak')).toBe(xpOnBreak)
    expect(propertyOfBlockId(id, 'drops').affectedByFortune).toBe(affectedByFortune)
  }
}

describe('id assignment is permanent', () => {
  /**
   * The literal table. Changing a number here is changing a save format, and
   * the diff on this array is what makes that visible in review.
   */
  const PINNED_IDS: ReadonlyArray<readonly [BlockType, number]> = [
    ['air', number('0')],
    ['bedrock', number('1')],
    ['stone', number('2')],
    ['dirt', number('3')],
    ['grass_block', number('4')],
    ['sand', number('5')],
    ['water', number('6')],
    ['snow', number('7')],
    ['gravel', number('8')],
    ['oak_log', number('9')],
    ['oak_leaves', number('10')],
    ['lava', number('11')],
    ['oak_planks', number('12')],
    ['glass', number('13')],
    ['torch', number('14')],
    ['glowstone', number('15')],
    ['piston', number('16')],
    // Appended when `drops` gained real data: `stone` yields cobblestone, and
    // An item you cannot place back is not a drop anyone can use.
    ['cobblestone', number('17')],
    // Appended together: the rest of the reference's `PASSABLE_BLOCK_IDS`
    // (`block-collision-predicates.ts:22-42`). Appended and not inserted — ids
    // 0-17 were already spent, and an id is a wire format.
    ['ladder', number('18')],
    ['cobweb', number('19')],
    ['sapling', number('20')],
    ['dandelion', number('21')],
    ['poppy', number('22')],
    ['brown_mushroom', number('23')],
    ['red_mushroom', number('24')],
    ['tall_grass', number('25')],
    ['fern', number('26')],
    ['sugar_cane', number('27')],
    ['lily_pad', number('28')],
    ['kelp', number('29')],
    ['seagrass', number('30')],
    ['rail', number('31')],
    ['powered_rail', number('32')],
    // The three non-`full` collision shapes.
    ['cactus', number('33')],
    ['pressure_plate', number('34')],
    ['stone_slab', number('35')],

    // Ids 36-119: the remaining 84, appended in ONE change so that the four-week
    // API-lock window restarts once rather than seven times (`./block-type`
    // Explains the trade). Grouped by the reference file the properties came
    // From, in `BLOCK_REGISTRY` order.
    ['granite', number('36')],
    ['diorite', number('37')],
    ['andesite', number('38')],
    ['deepslate', number('39')],
    ['obsidian', number('40')],
    ['smooth_basalt', number('41')],
    ['calcite', number('42')],
    ['amethyst_block', number('43')],
    ['amethyst_cluster', number('44')],
    ['sandstone', number('45')],
    ['prismarine', number('46')],
    ['soul_sand', number('47')],
    ['ice', number('48')],
    ['farmland', number('49')],
    ['coal_ore', number('50')],
    ['iron_ore', number('51')],
    ['gold_ore', number('52')],
    ['diamond_ore', number('53')],
    ['redstone_ore', number('54')],
    ['lapis_ore', number('55')],
    ['emerald_ore', number('56')],
    ['deepslate_coal_ore', number('57')],
    ['deepslate_iron_ore', number('58')],
    ['deepslate_gold_ore', number('59')],
    ['deepslate_diamond_ore', number('60')],
    ['deepslate_redstone_ore', number('61')],
    ['deepslate_lapis_ore', number('62')],
    ['deepslate_emerald_ore', number('63')],
    ['coal_block', number('64')],
    ['iron_block', number('65')],
    ['gold_block', number('66')],
    ['diamond_block', number('67')],
    ['redstone_block', number('68')],
    ['lapis_block', number('69')],
    ['emerald_block', number('70')],
    ['wheat_crop', number('71')],
    ['potato_crop', number('72')],
    ['nether_wart_crop', number('73')],
    ['redstone_wire', number('74')],
    ['redstone_torch', number('75')],
    ['lever', number('76')],
    ['stone_button', number('77')],
    ['repeater', number('78')],
    ['redstone_lamp', number('79')],
    ['redstone_lamp_lit', number('80')],
    ['observer', number('81')],
    ['comparator', number('82')],
    ['dispenser', number('83')],
    ['hopper', number('84')],
    ['piston_head', number('85')],
    ['end_stone', number('86')],
    ['end_portal_frame', number('87')],
    ['end_portal_frame_filled', number('88')],
    ['end_portal', number('89')],
    ['chorus_flower', number('90')],
    ['chorus_plant', number('91')],
    ['dragon_egg', number('92')],
    ['end_crystal', number('93')],
    ['end_gateway', number('94')],
    ['end_rod', number('95')],
    ['end_stone_bricks', number('96')],
    ['ender_chest', number('97')],
    ['purpur_block', number('98')],
    ['purpur_pillar', number('99')],
    ['purpur_slab', number('100')],
    ['purpur_stairs', number('101')],
    ['shulker_box', number('102')],
    ['crafting_table', number('103')],
    ['furnace', number('104')],
    ['chest', number('105')],
    ['door', number('106')],
    ['door_open', number('107')],
    ['oak_stairs', number('108')],
    ['anvil', number('109')],
    ['cauldron', number('110')],
    ['water_cauldron', number('111')],
    ['bed', number('112')],
    ['enchanting_table', number('113')],
    ['brewing_stand', number('114')],
    ['tnt', number('115')],
    ['nether_brick', number('116')],
    ['netherrack', number('117')],
    ['nether_portal', number('118')],
    ['fire', number('119')],
    ['soul_soil', number('120')],
    ['wither_skeleton_skull', number('121')],
    ['dropper', number('122')],
  ]

  it.effect('assigns exactly the pinned ids', () =>
    Effect.sync(() => {
      for (const [type, id] of PINNED_IDS) {
        expect(blockIdOf(type)).toBe(id)
        expect(blockTypeOfId(id)).toBe(type)
      }
      expect(blockIdOf('not_a_block' as BlockType)).toBe(AIR_BLOCK_ID)
    }),
  )

  it.effect('pins EVERY row, so a new block cannot enter the wire format unpinned', () =>
    Effect.sync(() => {
      // Without this, `PINNED_IDS` protects only the rows somebody remembered
      // To add to it, and the id of a block added later is pinned by nothing —
      // Which is the same as not being pinned at all, discovered later.
      const pinned = PINNED_IDS.map(([type]) => type)
      const registered = BLOCK_REGISTRY.map((entry) => entry.definition.type)

      expect(new Set(pinned).size).toBe(pinned.length)
      expect([...pinned].sort()).toStrictEqual([...registered].sort())
    }),
  )

  it.effect('agrees with mc-worldgen and mc-meshing on ids 0-10', () =>
    Effect.sync(() => {
      // Transcribed from mc-worldgen/domain/biome.ts's `BLOCK` constant. Those
      // Repositories' golden fixtures are byte arrays containing these numbers.
      const worldgenBlock = {
        AIR: number('0'),
        BEDROCK: number('1'),
        DIRT: number('3'),
        GRASS: number('4'),
        GRAVEL: number('8'),
        LEAVES: number('10'),
        LOG: number('9'),
        SAND: number('5'),
        SNOW: number('7'),
        STONE: number('2'),
        WATER: number('6'),
      } as const

      for (const [type, expectedId] of [
        ['air', worldgenBlock.AIR],
        ['bedrock', worldgenBlock.BEDROCK],
        ['stone', worldgenBlock.STONE],
        ['dirt', worldgenBlock.DIRT],
        ['grass_block', worldgenBlock.GRASS],
        ['sand', worldgenBlock.SAND],
        ['water', worldgenBlock.WATER],
        ['snow', worldgenBlock.SNOW],
        ['gravel', worldgenBlock.GRAVEL],
        ['oak_log', worldgenBlock.LOG],
        ['oak_leaves', worldgenBlock.LEAVES],
      ] as const) {
        expect(blockIdOf(type)).toBe(expectedId)
      }
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
      expect(AIR_BLOCK_ID).toBe(number('0'))
      const fresh = new Uint8Array(number('8'))
      for (const byte of fresh) {
        expect(blockTypeOfId(byte)).toBe('air')
      }
    }),
  )

  it.effect('rejects ids the chunk buffer cannot hold', () =>
    Effect.sync(() => {
      const blockId = BlockId
      expect(() => blockId(number('-1'))).toThrow()
      expect(() => blockId(BLOCK_ID_MAX + number('1'))).toThrow()
      expect(() => blockId(number('1.5'))).toThrow()
      expect(blockId(BLOCK_ID_MAX)).toBe(BLOCK_ID_MAX)
    }),
  )
})

describe('unknown-id fallbacks stay total even for non-byte numbers', () => {
  it.effect('treats negative, fractional, and NaN ids as default-opacity blocks', () =>
    Effect.sync(() => {
      for (const unknown of [number('-1'), number('1.5'), Number.NaN]) {
        expect(transmitsLight(unknown)).toBe(false)
      }
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
      // The input is a number that came out of a Uint8Array.
      expect(capabilityOfBlockId(number('5'), 'fallsWhenUnsupported')).toBe(true)
      expect(capabilityOfBlockId(number('8'), 'fallsWhenUnsupported')).toBe(true)
      expect(capabilityOfBlockId(number('2'), 'fallsWhenUnsupported')).toBe(false)
      expect(capabilityOfBlockId(number('0'), 'fallsWhenUnsupported')).toBe(false)

      expect(
        [...blockIdsWithCapability('fallsWhenUnsupported')].sort((firstId, secondId) => firstId - secondId),
      ).toStrictEqual([number('5'), number('8')])
    }),
  )

  it.effect('keeps the five "non-solid" concepts apart, exactly as audit §4.9 requires', () =>
    Effect.sync(() => {
      const expectedCapabilities = [
        ['glass', 'passable', false],
        ['glass', 'suffocates', false],
        ['glass', 'validSpawnSurface', false],
        ['oak_leaves', 'passable', false],
        ['oak_leaves', 'suffocates', false],
        ['oak_leaves', 'validSpawnSurface', false],
        ['snow', 'passable', false],
        ['snow', 'canSupportAttachments', false],
      ] as const

      // The canopy fall-through bug: leaves must stay SOLID for collision.
      for (const [type, capability, expected] of expectedCapabilities) {
        expect(capabilitiesOfBlockId(blockIdOf(type))[capability]).toBe(expected)
      }
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
      // Rows. That distinction is the point: bucketing rows alone gives keys
      // For the values blocks HAPPEN to have, and the roster is deliberately
      // Partial (`./block-type`), so an opacity nothing currently uses is an
      // Ordinary state rather than a corrupt one. Meshing must get an empty
      // `Set` for it and not `undefined`. Asserting it here is what stops the
      // Seeding from being "simplified" back into a `?? new Set()` in the
      // Reader — a fallback that cannot run while all three opacities are
      // Inhabited, and would start running the day one is not.
      for (const opacity of BLOCK_OPACITIES) {
        expect(blockIdsWithOpacity(opacity)).toBeInstanceOf(Set)
      }
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(blockIdsWithCapability(flag)).toBeInstanceOf(Set)
      }

      // The opacity buckets PARTITION the registry: every id lands in exactly
      // One, and no bucket invents an id. A block reachable through no bucket
      // Is a block meshing never draws.
      const bucketed = BLOCK_OPACITIES.flatMap((opacity) => [...blockIdsWithOpacity(opacity)])
      expect(bucketed.length).toBe(BLOCK_IDS.length)
      expect(new Set(bucketed)).toStrictEqual(new Set(BLOCK_IDS))
    }),
  )

  it.effect('reports light emission as a level and not as a boolean', () =>
    Effect.sync(() => {
      // The one-level gap is why `emissive: boolean` was the wrong type.
      expect(propertyOfBlockId(blockIdOf('torch'), 'lightEmission')).toBe(number('14'))
      expect(propertyOfBlockId(blockIdOf('glowstone'), 'lightEmission')).toBe(number('15'))
      expect(propertyOfBlockId(blockIdOf('lava'), 'lightEmission')).toBe(number('15'))
      expect(propertyOfBlockId(blockIdOf('stone'), 'lightEmission')).toBe(number('0'))
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
      // So there is no id at which a named reading and the generic one can
      // Differ. Everything else below is a worked example of a consequence.
      for (let id = number('0'); id <= BLOCK_ID_MAX; id += number('1')) {
        expect(opacityOfBlockId(id)).toBe(propertyOfBlockId(id, 'opacity'))
        expect(lightEmissionOfBlockId(id)).toBe(propertyOfBlockId(id, 'lightEmission'))
        expect(transmitsLight(id)).toBe(propertyOfBlockId(id, 'opacity') !== 'opaque')
      }
    }),
  )

  it.effect('are TOTAL, so a corrupt or newer-build byte reads as an unlit opaque cube', () =>
    Effect.sync(() => {
      const unknown = number('200')
      expect(isKnownBlockId(unknown)).toBe(false)

      expect(opacityOfBlockId(unknown)).toBe('opaque')
      expect(transmitsLight(unknown)).toBe(false)
      expect(lightEmissionOfBlockId(unknown)).toBe(BLOCK_PROPERTY_DEFAULTS.lightEmission)

      // Non-integers and out-of-range bytes take the same arm rather than
      // Throwing: `StageRegistration`'s `run` has error channel `never`, so a
      // Rule reading light out of a chunk buffer has nowhere to put a failure.
      expect(opacityOfBlockId(number('-1'))).toBe('opaque')
      expect(lightEmissionOfBlockId(number('1.5'))).toBe(number('0'))
    }),
  )

  it.effect('name every emitting row and no others', () =>
    Effect.sync(() => {
      const emitting = BLOCK_IDS.filter((id) => lightEmissionOfBlockId(id) > number('0'))

      // Every emitter, with its level, in registry order. `EMISSIVE_TABLE`
      // (`light.ts:38-46`) is built from `properties.emissive` and then
      // OVERRIDDEN per block by `EMISSIVE_LEVEL_OVERRIDES` (:24-35), so a row is
      // Wrong here if either half was transcribed without the other.
      expect(emitting.map((id) => [blockTypeOfId(id), lightEmissionOfBlockId(id)])).toStrictEqual([
        ['lava', number('15')],
        ['torch', number('14')],
        ['glowstone', number('15')],
        ['amethyst_cluster', number('15')],
        ['redstone_ore', number('9')],
        ['deepslate_redstone_ore', number('9')],
        ['redstone_block', number('15')],
        ['redstone_torch', number('7')],
        ['redstone_lamp_lit', number('15')],
        ['end_portal_frame', number('1')],
        ['end_portal_frame_filled', number('3')],
        ['end_portal', number('15')],
        ['end_gateway', number('15')],
        ['end_rod', number('15')],
        ['ender_chest', number('15')],
        ['nether_portal', number('11')],
        ['fire', number('15')],
      ])

      // SIX DISTINCT LEVELS now, which is what retires the last of the
      // `emissive: boolean` argument for good. A boolean could not tell a
      // Redstone torch (7) from a redstone ore (9) from a torch (14) from lava
      // (15), and could not say anything at all about a portal frame at 1
      // Rising to 3 when its eye is socketed.
      expect(new Set(emitting.map((id) => lightEmissionOfBlockId(id)))).toStrictEqual(new Set([number('1'), number('3'), number('7'), number('9'), number('11'), number('14'), number('15')]))

      expect(lightEmissionOfBlockId(blockIdOf('lava'))).toBe(number('15'))
      expect(lightEmissionOfBlockId(blockIdOf('torch'))).toBe(number('14'))
      expect(lightEmissionOfBlockId(blockIdOf('glowstone'))).toBe(number('15'))

      // `redstone_lamp` and `redstone_lamp_lit` are the pair that shows why the
      // Two states are two literals: same block, same hardness, 0 vs 15.
      expect(lightEmissionOfBlockId(blockIdOf('redstone_lamp'))).toBe(number('0'))
      expect(lightEmissionOfBlockId(blockIdOf('redstone_lamp_lit'))).toBe(number('15'))

      // `light.ts:24-46` `EMISSIVE_LEVEL_OVERRIDES` puts TORCH at 14 and not 15.
      // The one-level gap is the entire argument for the column being a number,
      // And a flattening edit has to fail somewhere.
      expect(lightEmissionOfBlockId(blockIdOf('torch'))).not.toBe(lightEmissionOfBlockId(blockIdOf('glowstone')))
    }),
  )

  it.effect('keep the two columns independent — GLOWSTONE is opaque and emits 15', () =>
    Effect.sync(() => {
      // The row that forbids inferring either column from the other. A
      // Transcription that assumed "emitters are transparent" or "opaque blocks
      // Are dark" gets this wrong in whichever direction it guessed.
      expect(opacityOfBlockId(blockIdOf('glowstone'))).toBe('opaque')
      expect(transmitsLight(blockIdOf('glowstone'))).toBe(false)
      expect(lightEmissionOfBlockId(blockIdOf('glowstone'))).toBe(number('15'))

      // And the mirror image: air transmits and emits nothing.
      expect(transmitsLight(AIR_BLOCK_ID)).toBe(true)
      expect(lightEmissionOfBlockId(AIR_BLOCK_ID)).toBe(number('0'))
    }),
  )

  it.effect('is NOT a synonym for passable — GLASS is the row that says so', () =>
    Effect.sync(() => {
      // Audit §4.9. If `opacity` agreed with an existing flag on every row it
      // Would not be a capability, it would be a spelling.
      const glass = blockIdOf('glass')
      expect(transmitsLight(glass)).toBe(true)
      expect(capabilityOfBlockId(glass, 'passable')).toBe(false)

      // THIRTY rows transmit light while colliding, so the disagreement is a
      // Property of the table rather than of one hand-picked block. It was five
      // On the 36-row roster; the full roster makes it a quarter of the table.
      //
      // Most of the new ones come from one place: `blocks.config.crafted.ts`
      // Marks levers, buttons, wire, doors, beds and repeaters `transparency:
      // True, solid: false`, and NONE of them is in `PASSABLE_BLOCK_IDS`. The
      // Reference therefore renders them as see-through and collides with them
      // As full cubes, which is precisely the pair of answers a single
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
      // Passable in the reference — `PASSABLE_BLOCK_IDS` contains no crop — so a
      // Player walks into wheat rather than through it.
      for (const crop of ['wheat_crop', 'potato_crop', 'nether_wart_crop'] as const) {
        expect(capabilityOfBlockId(blockIdOf(crop), 'passable')).toBe(false)
      }
    }),
  )

  it.effect('is NOT a synonym for canSupportAttachments or validSpawnSurface either', () =>
    Effect.sync(() => {
      // Both flags take BOTH values among the light-transmitting rows, which is
      // The shape of "independent" that a single example cannot show.
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
      // Coincidence to `[]` with an instruction attached: when the row that
      // Breaks it lands, DELETE this rather than making the two agree again.
      // The full roster broke it, so the instruction has been followed.
      //
      // One detail is worth keeping because it is the interesting kind of
      // Wrong. The old comment predicted the breaking row would be `oak_stairs`,
      // "opaque, and in `NON_SUFFOCATING_BLOCKS`". `oak_stairs` is in that set,
      // But it is `transparency: true` in `blocks.config.crafted.ts:17-21`, so it
      // Still COINCIDES and was not the cause at all. The prediction reached the
      // Right conclusion through a fact that is not true — which is exactly why
      // The tripwire was written as an assertion over the whole table instead of
      // As a note about one block.
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
      // Of independence rather than of an offset.
      //
      //   Opaque and yet does NOT suffocate — `farmland`, `ender_chest`,
      //   `shulker_box`, `enchanting_table` and both portal frames are all in
      //   `NON_SUFFOCATING_BLOCKS` (`environment-hazard.config.ts:39-85`) while
      //   Being `transparency: false` in their config rows.
      expect(transmitsLight(blockIdOf('farmland'))).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('farmland'), 'suffocates')).toBe(false)

      //   Transparent and yet DOES suffocate — `ice`, `potato_crop`,
      //   `brewing_stand` and `fire` are absent from that set. Read literally,
      //   The reference suffocates a player standing inside a fire, which is
      //   Transcribed rather than repaired for the reason given at the crops
      //   Group in `domain/block-registry.ts`.
      expect(transmitsLight(blockIdOf('ice'))).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('ice'), 'suffocates')).toBe(true)

      // The two are decided by different reference tables: opacity by
      // `blocks.config.*` `transparency` plus `meshing-worker-config.ts:7-13`,
      // Suffocation by `environment-hazard.config.ts:39-85`. They were never
      // Derivable from each other; now the table shows it instead of asserting it.
      expect(transmitsLight(blockIdOf('glass'))).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('glass'), 'suffocates')).toBe(false)
    }),
  )

  it.effect('agrees with the meshing buckets, which are built from the same column', () =>
    Effect.sync(() => {
      // `blockIdsWithOpacity` pre-expands what `opacityOfBlockId` answers one id
      // At a time. mc-meshing takes the sets, mc-worldgen's light grid takes the
      // Predicate, and the two must not be able to disagree about one block.
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
      const unknown = number('200')

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
      // Uses when it wants several answers about one byte, and it is the one
      // That can go wrong quietly. `capabilitiesOfBlockId(byte).passable` must
      // Be `false` for an unrecognised byte, never `undefined` — both are
      // Falsy, so physics would agree with the right answer for the wrong
      // Reason and keep agreeing until someone asked a flag whose default is
      // `true`.
      const unknown = number('200')
      expectUnknownCapabilityDefaults(unknown)
    }),
  )

  it.effect('read as unknown from isKnownBlockId and resolvedBlockOfId alike, over the whole id space', () =>
    Effect.sync(() => {
      // These two spelled the range test separately until they were made one
      // Function, and this sweep is what holds them together. The case they
      // Could disagree about is a HOLE — an id below the table length with no
      // Row, which a removed block leaves behind forever — and a caller that
      // Checks with one and reads with the other would then see a block that
      // Exists and has no properties.
      for (let id = number('-2'); id <= BLOCK_ID_MAX + number('2'); id += number('1')) {
        expect(isKnownBlockId(id)).toBe(resolvedBlockOfId(id) !== globalThis.undefined)
      }
      for (const id of BLOCK_IDS) {
        expect(isKnownBlockId(id)).toBe(true)
      }
    }),
  )

  it.effect('are inert: an unknown block does not fall, burn, or let anything through', () =>
    Effect.sync(() => {
      // The failure mode of guessing wrong is a mystery block, never a player
      // Falling through the world or terrain deleting itself.
      const unknown = number('250')
      expect(capabilityOfBlockId(unknown, 'fallsWhenUnsupported')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'flammable')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'passable')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'replaceable')).toBe(false)
    }),
  )

  it.effect('treats non-integers and out-of-range numbers the same way', () =>
    Effect.sync(() => {
      for (const value of [number('-1'), number('1.5'), Number.NaN, BLOCK_ID_MAX + number('1')]) {
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
      // While `NON_SPAWN_SURFACE_BLOCK_IDS` lists it, and mobs could spawn on a
      // Piston for as long as the row was empty. The row is annotated in
      // `domain/block-registry.ts` with the whole story.
      //
      // The lesson is that a bare row cannot distinguish "checked, nothing to
      // Say" from "not checked" — the two are spelled identically — and a flag
      // That defaults to `true` turns the second into a silent behaviour change.
      // So the invariant is now tested on the MECHANISM, where it actually
      // Lives, rather than on whichever row happened to look boring.
      expect(resolveBlock({ type: 'stone' })).toStrictEqual({
        capabilities: { ...BLOCK_CAPABILITY_DEFAULTS },
        properties: { ...BLOCK_PROPERTY_DEFAULTS },
        type: 'stone',
      })

      // The design contract's "adding a block = one table row + flag settings" is
      // Unaffected: a definition may still be nothing but a name, and this is
      // What it means when it is.
      expect(blockCapabilitiesOf({ type: 'stone' })).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })

      // And the table no longer contains such a row, asserted so that adding one
      // Back is a decision rather than an accident.
      const bare = BLOCK_REGISTRY.filter(
        (entry) =>
          entry.definition.capabilities === globalThis.undefined && entry.definition.properties === globalThis.undefined,
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
      for (let rawId = number('0'); rawId <= BLOCK_ID_MAX; rawId += number('1')) {
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

  it.effect('reproduces PASSABLE_BLOCK_IDS exactly — every member, and no extras', () =>
    Effect.sync(() => {
      /**
       * `block-collision-predicates.ts:22-42`, the closed 19-member set audit §4.1
       * calls the centre of the physics side.
       */
      const referencePassableBlocks: ReadonlyArray<BlockType> = [
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

      // Both directions matter and they fail differently. A MISSING member means
      // A player walks into a flower; an EXTRA member means a player falls
      // Through it. The reference records the second failure in a comment at
      // `block-collision-predicates.ts:18-21` — listing LEAVES there let players
      // Drop through tree canopies — so the extras half of this assertion is
      // Guarding a bug that has actually happened.
      const passableIds = blockIdsWithCapability('passable')
      const passableTypes = [...passableIds].map((id) => blockTypeOfId(id))

      expect([...passableTypes].sort()).toStrictEqual([...referencePassableBlocks].sort())
      expect(passableIds.size).toBe(number('19'))
    }),
  )

  it.effect('keeps oak_leaves OUT of the passable set, which is the canopy bug itself', () =>
    Effect.sync(() => {
      // Named separately from the set comparison above because this is the one
      // Membership the reference explicitly warns about, and a test that only
      // Compares sorted arrays reports it as an unremarkable diff.
      expect(capabilityOfBlockId(blockIdOf('oak_leaves'), 'passable')).toBe(false)
      expect(blockIdsWithCapability('passable').has(blockIdOf('oak_leaves'))).toBe(false)
    }),
  )

  it.effect('gives every collision shape at least one block to be', () =>
    Effect.sync(() => {
      // `COLLISION_SHAPES` was enumerated from the audit before any row could
      // Produce three of its five members. An uninhabited enum member is one
      // Mc-physics must branch on and can never test against
      // (`getBlockCollisionShapeAt` :135-140 is that branch), so this asserts
      // The vocabulary and the data have met.
      const shapes = new Set(BLOCK_IDS.map((id) => propertyOfBlockId(id, 'collisionShape')))
      for (const shape of COLLISION_SHAPES) {
        expect(shapes.has(shape)).toBe(true)
      }

      // ...and the three that arrived with the roster are on the blocks the
      // Reference branches to, not merely on SOME block.
      expect(propertyOfBlockId(blockIdOf('cactus'), 'collisionShape')).toBe('cactus')
      expect(propertyOfBlockId(blockIdOf('pressure_plate'), 'collisionShape')).toBe('pressurePlate')
      expect(propertyOfBlockId(blockIdOf('stone_slab'), 'collisionShape')).toBe('slab')
    }),
  )

  it.effect('separates rail from powered_rail, because the reference has two predicates', () =>
    Effect.sync(() => {
      // `isOnRail` (:184-195) accepts both; `isOnPoweredRail` (:197-201) accepts
      // Only one. Collapsing `railKind` to a boolean would lose the speed tier
      // That `minecart-mount.ts:45` reads.
      expect(propertyOfBlockId(blockIdOf('rail'), 'railKind')).toBe('normal')
      expect(propertyOfBlockId(blockIdOf('powered_rail'), 'railKind')).toBe('powered')
      expect(propertyOfBlockId(blockIdOf('stone'), 'railKind')).toBe('none')

      // The two rails agree on everything a rail is EXCEPT the tier, which is
      // What makes the tier the only reason to keep them apart.
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
      // Support rule IS water (:83). A "plants break in water" generalisation
      // Deletes every lily pad on contact with the thing it floats on.
      expect(capabilityOfBlockId(blockIdOf('lily_pad'), 'brokenByWaterFlow')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('sugar_cane'), 'brokenByWaterFlow')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('cactus'), 'brokenByWaterFlow')).toBe(true)
    }),
  )

  it.effect('keeps oak_log off the spawn surface, which the default silently got wrong', () =>
    Effect.sync(() => {
      // REGRESSION. This row carried no `validSpawnSurface` override and so
      // Resolved to the default `true`, while the reference lists WOOD in
      // `NON_SPAWN_SURFACE_BLOCK_IDS` (`spawn-selection-search.ts:45`) AND in
      // `VILLAGE_NON_GROUND_IDS` (`village-placement-surface.ts:11`) — the two
      // Near-duplicate lists that audit §4.9 cites for DISAGREEING happen to
      // Agree here, so there was no ambiguity to hide behind.
      //
      // A true-by-default flag is the dangerous kind: omitting it opts the block
      // INTO the behaviour, and nothing about the row looked wrong.
      expect(capabilityOfBlockId(blockIdOf('oak_log'), 'validSpawnSurface')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('oak_leaves'), 'validSpawnSurface')).toBe(false)

      // ...while an ordinary cube still is one, so this did not become a blanket
      // Negative.
      expect(capabilityOfBlockId(blockIdOf('stone'), 'validSpawnSurface')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('snow'), 'validSpawnSurface')).toBe(true)
    }),
  )

  it.effect('carries the plant friction of 0, which is NOT the default 0.6', () =>
    Effect.sync(() => {
      // `plantBlockProperties` (`blocks.config.terrain.ts:29-35`) sets friction
      // 0, and `getBlockFrictionAt` (`block-collision-predicates.ts:152-161`)
      // Reads it for whatever a player stands on. A row that omitted it would
      // Resolve to 0.6 and be indistinguishable from stone — the omission would
      // Look like agreement.
      for (const plant of ['sapling', 'dandelion', 'tall_grass', 'lily_pad', 'kelp'] as const) {
        expect(propertyOfBlockId(blockIdOf(plant), 'friction')).toBe(number('0'))
      }
      expect(BLOCK_PROPERTY_DEFAULTS.friction).toBe(number('0.6'))

      // CHANGED WITH THE ROSTER, and the change is the point. `stone` used to be
      // The "ordinary" anchor at the default 0.6; it is 0.8 in the reference
      // (`blocks.config.terrain.ts`, the whole stone family), and this row was
      // One of ten that omitted `friction` and silently took the default.
      // `getBlockFrictionAt` reads it for whatever the player stands on, so each
      // Omission was a movement difference nobody had written down.
      expect(propertyOfBlockId(blockIdOf('stone'), 'friction')).toBe(number('0.8'))

      // Four distinct values across the table, which is what a column that was
      // Actually transcribed looks like. `ice` at 0.98 is the extreme the
      // Default could never have approximated.
      expect(propertyOfBlockId(blockIdOf('ice'), 'friction')).toBe(number('0.98'))
      expect(propertyOfBlockId(blockIdOf('snow'), 'friction')).toBe(number('0.3'))
      expect(propertyOfBlockId(blockIdOf('sand'), 'friction')).toBe(number('0.5'))
      expect(propertyOfBlockId(blockIdOf('dirt'), 'friction')).toBe(number('0.6'))
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
      // Scales at once and left the choice open; §4.5.2 records how it was
      // Closed. The scale is the reference's, stated at
      // `blocks.config.terrain.ts:4-8`, and these are its anchors.
      expect(BLOCK_PROPERTY_DEFAULTS.hardness).toBe(number('8'))
      const hardnessExpectations = [
        ['dirt', number('8')],
        ['bedrock', number('100')],
        ['oak_log', number('35')],
        ['oak_planks', number('35')],
        ['stone', number('25')],
        ['deepslate', number('50')],
        ['obsidian', number('90')],
        ['purpur_block', number('1.5')],
        ['end_stone_bricks', number('45')],
        ['end_gateway', number('0')],
      ] as const
      for (const [type, expectedHardness] of hardnessExpectations) {
        expect(propertyOfBlockId(blockIdOf(type), 'hardness')).toBe(expectedHardness)
      }

      // THE ORDERING THAT WAS INVERTED. `oak_log` and `oak_planks` were 2 —
      // Vanilla's float — which put a tree trunk BELOW dirt. `break-speed.ts`
      // Scales mining time linearly in hardness, so this was a real difference
      // In play and not a cosmetic one.
      expect(propertyOfBlockId(blockIdOf('oak_log'), 'hardness')).toBeGreaterThan(
        propertyOfBlockId(blockIdOf('dirt'), 'hardness'),
      )

      // THE ONE GROUP THAT IS NOT ON THIS SCALE, transcribed rather than
      // Converted. `blocks.config.end.ts` passes vanilla floats to its helper,
      // So purpur reads as softer than dirt. Pinned so that the inconsistency is
      // A checked fact with a citation rather than something a reader has to
      // Notice; see audit §4.5.2 for why converting would be inventing content.
      expect(propertyOfBlockId(blockIdOf('purpur_block'), 'hardness')).toBeLessThan(
        propertyOfBlockId(blockIdOf('dirt'), 'hardness'),
      )
      // ...while its sibling in the SAME reference file is on the 0-100 scale,
      // Which is what makes this the reference's inconsistency and not kernel's.
      // `end_gateway` is -1 in the reference. Kept as 0, which is behaviourally
      // Identical under `computeBreakTicks` (`hardness <= 0` -> 0 ticks) and is
      // Inside the range this column claims. A negative would have travelled to
      // Consumers as a number smaller than "instant".
      for (const id of BLOCK_IDS) {
        expect(propertyOfBlockId(id, 'hardness')).toBeGreaterThanOrEqual(number('0'))
      }
    }),
  )

  describe('contact and movement properties', () => {
    it.effect('slows an entity in a cobweb, and in nothing else', () =>
      Effect.sync(() => {
      // `movementDrag` had no inhabitant before this roster, so nothing checked
      // That the field survived resolution at all.
      const dragging = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'movementDrag') > number('0'))
      expect(dragging.map((id) => blockTypeOfId(id))).toStrictEqual(['cobweb'])

      // 1 - COBWEB_HORIZONTAL_MULTIPLIER (0.25, `player-physics.ts:19`). The
      // Vertical multiplier (0.05, :20) has nowhere to go in a one-number field;
      // That loss is recorded at the registry row rather than rounded away here.
      expect(propertyOfBlockId(blockIdOf('cobweb'), 'movementDrag')).toBe(number('0.75'))
      }),
    )

    it.effect('lets exactly one block hurt on contact, at the reference amount', () =>
      Effect.sync(() => {
      // CACTUS_DAMAGE = 1 and LAVA_DAMAGE = 4 (`environment-hazard.config.ts:7,26`).
      // Two damaging blocks with DIFFERENT amounts is what makes `contactDamage`
      // A number rather than a `hurts: boolean`.
      const damaging = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'contactDamage') > number('0'))
      expect(damaging.map((id) => blockTypeOfId(id)).sort()).toStrictEqual(['cactus', 'lava'])

      expect(propertyOfBlockId(blockIdOf('cactus'), 'contactDamage')).toBe(number('1'))
      expect(propertyOfBlockId(blockIdOf('lava'), 'contactDamage')).toBe(number('4'))
      }),
    )
  })
})

describe('the completed roster and additive gameplay vocabulary', () => {
  it.effect('keeps the reference’s 120 plus two additions distinct and registered', () =>
    Effect.sync(() => {
      // `docs/testing.md` §5.2 re-derived the 120 from two hand-maintained
      // Arrays in the reference that agree as sets (`BlockTypeSchema` and
      // `INDEX_TO_BLOCK_TYPE`). The number is pinned here rather than only in
      // Prose because prose is what gets re-quoted without being re-checked, and
      // This repository's most-repeated defect is a figure justified by the
      // Wrong measurement.
      //
      // Counting LINES of the reference schema gives 128; eight are comments.
      // That is the trap, and 120 is the answer.
      expect(BLOCK_TYPES.length).toBe(number('123'))
      expect(new Set(BLOCK_TYPES).size).toBe(number('123'))
      expect(BLOCK_REGISTRY.length).toBe(number('123'))

      // The bijection, both ways, over the whole roster. `UNREGISTERED_BLOCK_TYPES`
      // Asserts one direction elsewhere; this is the round trip.
      for (const type of BLOCK_TYPES) {
        expect(blockTypeOfId(blockIdOf(type))).toBe(type)
      }
      expect(new Set(BLOCK_IDS).size).toBe(number('123'))
    }),
  )

  it.effect('fits the chunk byte, which is what makes the ids a wire format at all', () =>
    Effect.sync(() => {
      // 120 rows in a 256-value space. Worth an assertion rather than a comment:
      // The ceiling is a property of the `Uint8Array` chunk buffer, and the day
      // The roster crosses it the fix is a chunk-format migration in mc-save,
      // Not a bigger number here.
      for (const id of BLOCK_IDS) {
        expect(id).toBeLessThanOrEqual(BLOCK_ID_MAX)
      }
      expect(Math.max(...BLOCK_IDS)).toBe(number('122'))
    }),
  )

  it.effect('keeps the four ore columns independent, which no single flag could', () =>
    Effect.sync(() => {
      // The ore group is where four capabilities that LOOK correlated are
      // Decided by four different reference tables. If any pair were derived
      // From another, one of these would be impossible to write.
      //
      // Iron ore: gated at STONE tier, yields RAW_IRON, ZERO xp, NO fortune.
      // Coal ore: gated at WOODEN tier, yields COAL, 5 xp, fortune applies.
      // Same shape of block, four columns, and every column differs.
      const iron = blockIdOf('iron_ore')
      expectOreProperties()

      // THE TRAP IN THIS GROUP: "gives no XP" and "no fortune" hold of the same
      // Four blocks today (iron and gold, stone and deepslate), so it is easy to
      // Treat them as one fact. They come from `ORE_XP_TABLE`
      // (`blocks.config.ores.ts:29-37`) and `FORTUNE_ORE_BLOCKS`
      // (`block-service.config.ts:270-276`) — two lists, written apart, that
      // Happen to agree. Recorded as a coincidence so that a later edit deriving
      // One from the other is a visible decision.
      const noXp = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'xpOnBreak') === number('0'))
      const noFortune = BLOCK_IDS.filter((id) => !propertyOfBlockId(id, 'drops').affectedByFortune)
      expect(noXp.length).not.toBe(noFortune.length)

      // Deepslate is HARDER than its stone twin while being gated at the SAME
      // Tier — the clearest single case for hardness and minTier being two axes.
      expect(propertyOfBlockId(blockIdOf('deepslate_iron_ore'), 'hardness')).toBe(number('60'))
      expect(propertyOfBlockId(iron, 'hardness')).toBe(number('50'))
      expect(propertyOfBlockId(blockIdOf('deepslate_iron_ore'), 'harvestTool').minTier).toBe('stone')
    }),
  )

  it.effect('inhabits all four harvest tiers, so the ladder is a ladder and not a boolean', () =>
    Effect.sync(() => {
      const tiers = new Set(BLOCK_IDS.map((id) => propertyOfBlockId(id, 'harvestTool').minTier))
      expect(tiers).toStrictEqual(new Set(['none', 'wooden', 'stone', 'iron', 'diamond']))

      // `obsidian` is the sole member of the top tier in the reference
      // (`harvestable-blocks.ts:53-56`), which is worth pinning: a fifth tier or
      // A second diamond block would be a content decision, not a transcription.
      const diamondTier = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'harvestTool').minTier === 'diamond')
      expect(diamondTier.map((id) => blockTypeOfId(id))).toStrictEqual(['obsidian'])
    }),
  )

  it.effect('transcribes the crop suffocation split instead of smoothing it', () =>
    Effect.sync(() => {
      // The sharpest disagreement in the reference, and the one most likely to
      // Be "fixed" by a well-meaning edit. `block-support.ts:20` defines the
      // Three crops as ONE set and every rule there treats them identically;
      // `NON_SUFFOCATING_BLOCKS` lists two of the three.
      expect(capabilityOfBlockId(blockIdOf('wheat_crop'), 'suffocates')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('nether_wart_crop'), 'suffocates')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('potato_crop'), 'suffocates')).toBe(true)

      // The audit §4.7 implication that WOULD have licensed inferring `false`
      // Does not apply, and this is why: it is licensed by `passable`, and no
      // Crop is passable. Pinned so that anyone reaching for the inference finds
      // The reason it is unavailable rather than rediscovering it.
      for (const crop of ['wheat_crop', 'potato_crop', 'nether_wart_crop'] as const) {
        expect(capabilityOfBlockId(blockIdOf(crop), 'passable')).toBe(false)
        // ...while the three agree on everything `block-support.ts` decides,
        // Which is what makes the suffocation split a split rather than a
        // Difference between blocks.
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
      // Are what shows `fireSource` is not a synonym for `flammable`: neither of
      // These is flammable, and no flammable block is a fire source.
      const sources = BLOCK_IDS.filter((id) => capabilityOfBlockId(id, 'fireSource')).map((id) => blockTypeOfId(id))
      expect(sources).toStrictEqual(['lava', 'netherrack'])
      for (const source of ['lava', 'netherrack'] as const) {
        expect(capabilityOfBlockId(blockIdOf(source), 'flammable')).toBe(false)
      }

      // `SLAB_BLOCK_IDS` (`block-collision-predicates.ts:56-59`), 2 members. It
      // Had one until `purpur_slab` landed, so `collisionShape: 'slab'` now has
      // The whole reference table behind it rather than a single case.
      const slabs = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'collisionShape') === 'slab')
      expect(slabs.map((id) => blockTypeOfId(id))).toStrictEqual(['stone_slab', 'purpur_slab'])
    }),
  )
})

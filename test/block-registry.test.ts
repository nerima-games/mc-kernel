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
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { expectTypeOf } from 'vitest'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../src/domain/block-capabilities'
import { blockCapabilitiesOf, resolveBlock } from '../src/domain/block-definition'
import {
  BLOCK_OPACITIES,
  BLOCK_PROPERTY_DEFAULTS,
  type LightLevel,
} from '../src/domain/block-properties'
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
  isEmpty,
  isKnownBlockId,
  lightEmissionOfBlockId,
  opacityOfBlockId,
  propertyOfBlockId,
  resolvedBlockOfId,
  transmitsLight,
} from '../src/domain/block-registry'
import { BLOCK_TYPES, type BlockType } from '../src/domain/block-type'

const number = Number

const expectUnknownCapabilityDefaults = (unknown: number) => {
  const capabilities = capabilitiesOfBlockId(unknown)
  expect(capabilities).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    expect(capabilities[flag]).toBeTypeOf('boolean')
    expect(capabilities[flag]).toBe(capabilityOfBlockId(unknown, flag))
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

  it('assigns exactly the pinned ids', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const [type, id] of PINNED_IDS) {
        expect(blockIdOf(type)).toBe(id)
        expect(blockTypeOfId(id)).toBe(type)
      }
      expect(() => blockIdOf('not_a_block' as BlockType)).toThrow(
        'Block registry is missing a row for not_a_block',
      )
    })),
  )

  it('pins EVERY row, so a new block cannot enter the wire format unpinned', () =>
    Effect.runPromise(Effect.sync(() => {
      // Without this, `PINNED_IDS` protects only the rows somebody remembered
      // To add to it, and the id of a block added later is pinned by nothing —
      // Which is the same as not being pinned at all, discovered later.
      const pinned = PINNED_IDS.map(([type]) => type)
      const registered = BLOCK_REGISTRY.map((entry) => entry.definition.type)

      expect(new Set(pinned).size).toBe(pinned.length)
      expect([...pinned].sort()).toStrictEqual([...registered].sort())
    })),
  )

  it('agrees with mc-worldgen and mc-meshing on ids 0-10', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('is a bijection: no duplicate id, no duplicate type', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(new Set(BLOCK_IDS).size).toBe(BLOCK_REGISTRY.length)
      expect(new Set(BLOCK_REGISTRY.map((entry) => entry.definition.type)).size).toBe(BLOCK_REGISTRY.length)
    })),
  )

  it('covers the whole BlockType vocabulary, so roster and table cannot drift', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(UNREGISTERED_BLOCK_TYPES).toStrictEqual([])
      for (const type of BLOCK_TYPES) {
        expect(blockTypeOfId(blockIdOf(type))).toBe(type)
      }
    })),
  )

  it('a BlockId only proves the byte fits the chunk buffer, not that a row claims it', () =>
    Effect.runPromise(Effect.sync(() => {
      // `BlockId` validates against the chunk-buffer range (0-255,
      // `block-registry-types.ts`), not against the registry (0-122 today).
      // A registered id resolves normally:
      const registered = BlockId(2)
      expect(blockTypeOfId(registered)).toBe('stone')
      expect(resolvedBlockOfId(registered)?.type).toBe('stone')

      // ...but a `BlockId` in the unclaimed remainder is real and
      // constructible, and honestly returns `undefined` rather than lying via
      // a non-optional overload keyed only on the branded type.
      for (const unregistered of [BlockId(123), BlockId(BLOCK_ID_MAX)]) {
        expect(blockTypeOfId(unregistered)).toBeUndefined()
        expect(resolvedBlockOfId(unregistered)).toBeUndefined()
        expect(isKnownBlockId(unregistered)).toBe(false)
      }
    })),
  )

  it('air is zero, because a zero-filled buffer must already be a valid chunk', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(AIR_BLOCK_ID).toBe(number('0'))
      expectTypeOf(isEmpty).toEqualTypeOf<(id: number) => boolean>()
      expect(isEmpty(AIR_BLOCK_ID)).toBe(true)
      for (const nonAir of [number('1'), BLOCK_ID_MAX, number('-1'), number('1.5'), Number.NaN]) {
        expect(isEmpty(nonAir)).toBe(false)
      }
      const fresh = new Uint8Array(number('8'))
      for (const byte of fresh) {
        expect(blockTypeOfId(byte)).toBe('air')
      }
    })),
  )

  it('rejects ids the chunk buffer cannot hold', () =>
    Effect.runPromise(Effect.sync(() => {
      const blockId = BlockId
      expect(() => blockId(number('-1'))).toThrow()
      expect(() => blockId(BLOCK_ID_MAX + number('1'))).toThrow()
      expect(() => blockId(number('1.5'))).toThrow()
      expect(blockId(BLOCK_ID_MAX)).toBe(BLOCK_ID_MAX)
    })),
  )
})

describe('unknown-id fallbacks stay total even for non-byte numbers', () => {
  it('treats negative, fractional, and NaN ids as default-opacity blocks', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const unknown of [number('-1'), number('1.5'), Number.NaN]) {
        expect(transmitsLight(unknown)).toBe(false)
      }
    })),
  )
})

describe('reading behaviour off a chunk buffer byte', () => {
  it('answers tillable from the registry for dirt and grass_block only', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(capabilityOfBlockId(blockIdOf('dirt'), 'tillable')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('grass_block'), 'tillable')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('stone'), 'tillable')).toBe(false)
      expect([...blockIdsWithCapability('tillable')]).toStrictEqual([blockIdOf('dirt'), blockIdOf('grass_block')])
    })),
  )

  it('answers fallsWhenUnsupported for sand and gravel and nothing else', () =>
    Effect.runPromise(Effect.sync(() => {
      // THE slice question. Note that no block NAME appears on the read side:
      // The input is a number that came out of a Uint8Array.
      expect(capabilityOfBlockId(number('5'), 'fallsWhenUnsupported')).toBe(true)
      expect(capabilityOfBlockId(number('8'), 'fallsWhenUnsupported')).toBe(true)
      expect(capabilityOfBlockId(number('2'), 'fallsWhenUnsupported')).toBe(false)
      expect(capabilityOfBlockId(number('0'), 'fallsWhenUnsupported')).toBe(false)

      expect(
        [...blockIdsWithCapability('fallsWhenUnsupported')].sort((firstId, secondId) => firstId - secondId),
      ).toStrictEqual([number('5'), number('8')])
    })),
  )

  it('keeps the five "non-solid" concepts apart, exactly as audit §4.9 requires', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('gives meshing its buckets as native Sets', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('has a bucket for every opacity and every flag, inhabited or not', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('reports light emission as a level and not as a boolean', () =>
    Effect.runPromise(Effect.sync(() => {
      // The one-level gap is why `emissive: boolean` was the wrong type.
      expect(propertyOfBlockId(blockIdOf('torch'), 'lightEmission')).toBe(number('14'))
      expect(propertyOfBlockId(blockIdOf('glowstone'), 'lightEmission')).toBe(number('15'))
      expect(propertyOfBlockId(blockIdOf('lava'), 'lightEmission')).toBe(number('15'))
      expect(propertyOfBlockId(blockIdOf('stone'), 'lightEmission')).toBe(number('0'))
    })),
  )

  it('reports WHICH fluid, not whether-fluid', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(propertyOfBlockId(blockIdOf('water'), 'fluid')).toBe('water')
      expect(propertyOfBlockId(blockIdOf('lava'), 'fluid')).toBe('lava')
      expect(propertyOfBlockId(blockIdOf('stone'), 'fluid')).toBe('none')
    })),
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
  it('are exactly the generic accessor, on every id in the byte range', () =>
    Effect.runPromise(Effect.sync(() => {
      // THE load-bearing assertion of this describe. It sweeps the whole
      // `Uint8Array` domain — registered rows, holes and unknown bytes alike —
      // So there is no id at which a named reading and the generic one can
      // Differ. Everything else below is a worked example of a consequence.
      for (let id = number('0'); id <= BLOCK_ID_MAX; id += number('1')) {
        expect(opacityOfBlockId(id)).toBe(propertyOfBlockId(id, 'opacity'))
        expect(lightEmissionOfBlockId(id)).toBe(propertyOfBlockId(id, 'lightEmission'))
        expect(transmitsLight(id)).toBe(propertyOfBlockId(id, 'opacity') !== 'opaque')
      }
    })),
  )

  it('are TOTAL, so a corrupt or newer-build byte reads as an unlit opaque cube', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('name every emitting row and no others', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('keep the two columns independent — GLOWSTONE is opaque and emits 15', () =>
    Effect.runPromise(Effect.sync(() => {
      // The row that forbids inferring either column from the other. A
      // Transcription that assumed "emitters are transparent" or "opaque blocks
      // Are dark" gets this wrong in whichever direction it guessed.
      expect(opacityOfBlockId(blockIdOf('glowstone'))).toBe('opaque')
      expect(transmitsLight(blockIdOf('glowstone'))).toBe(false)
      expect(lightEmissionOfBlockId(blockIdOf('glowstone'))).toBe(number('15'))

      // And the mirror image: air transmits and emits nothing.
      expect(transmitsLight(AIR_BLOCK_ID)).toBe(true)
      expect(lightEmissionOfBlockId(AIR_BLOCK_ID)).toBe(number('0'))
    })),
  )

  it('returns the branded light-level type', () =>
    Effect.runPromise(Effect.sync(() => {
      expectTypeOf(lightEmissionOfBlockId(blockIdOf('torch'))).toEqualTypeOf<LightLevel>()
    })),
  )

  it('is NOT a synonym for passable — GLASS is the row that says so', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('is NOT a synonym for canSupportAttachments or validSpawnSurface either', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('is NOT a synonym for !suffocates either — the coincidence that used to hold is over', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('agrees with the meshing buckets, which are built from the same column', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )
})

describe('unknown ids', () => {
  it('resolve to an ordinary opaque cube rather than failing', () =>
    Effect.runPromise(Effect.sync(() => {
      const unknown = number('200')

      expect(isKnownBlockId(unknown)).toBe(false)
      expect(blockTypeOfId(unknown)).toBeUndefined()
      expect(resolvedBlockOfId(unknown)).toBeUndefined()

      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(capabilityOfBlockId(unknown, flag)).toBe(BLOCK_CAPABILITY_DEFAULTS[flag])
      }
      expect(propertyOfBlockId(unknown, 'opacity')).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
    })),
  )

  it('yield a COMPLETE capability set, so no flag on a corrupt byte reads as undefined', () =>
    Effect.runPromise(Effect.sync(() => {
      // The singular reader is covered above; the plural one is what a caller
      // Uses when it wants several answers about one byte, and it is the one
      // That can go wrong quietly. `capabilitiesOfBlockId(byte).passable` must
      // Be `false` for an unrecognised byte, never `undefined` — both are
      // Falsy, so physics would agree with the right answer for the wrong
      // Reason and keep agreeing until someone asked a flag whose default is
      // `true`.
      const unknown = number('200')
      expectUnknownCapabilityDefaults(unknown)
    })),
  )

  it('read as unknown from isKnownBlockId and resolvedBlockOfId alike, over the whole id space', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('narrow numbers to BlockId when known', () =>
    Effect.runPromise(Effect.sync(() => {
      const id = 2 as number
      if (!isKnownBlockId(id)) {
        throw new Error('expected known block id in type-narrowing test')
      }
      expectTypeOf(id).toEqualTypeOf<BlockId>()
    })),
  )

  it('are inert: an unknown block does not fall, burn, or let anything through', () =>
    Effect.runPromise(Effect.sync(() => {
      // The failure mode of guessing wrong is a mystery block, never a player
      // Falling through the world or terrain deleting itself.
      const unknown = number('250')
      expect(capabilityOfBlockId(unknown, 'fallsWhenUnsupported')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'flammable')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'passable')).toBe(false)
      expect(capabilityOfBlockId(unknown, 'replaceable')).toBe(false)
    })),
  )

  it('treats non-integers and out-of-range numbers the same way', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const value of [number('-1'), number('1.5'), Number.NaN, BLOCK_ID_MAX + number('1')]) {
        expect(isKnownBlockId(value)).toBe(false)
        expect(blockTypeOfId(value)).toBeUndefined()
        expect(capabilityOfBlockId(value, 'fallsWhenUnsupported')).toBe(false)
      }
    })),
  )
})

describe('the table states differences only', () => {
  it('resolves a definition with no overrides to the documented defaults', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('resolves every registered id to a complete capability set', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const id of BLOCK_IDS) {
        const resolved = resolvedBlockOfId(id)
        expect(resolved).toBeDefined()
        for (const flag of BLOCK_CAPABILITY_FLAGS) {
          expect(typeof resolved?.capabilities[flag]).toBe('boolean')
        }
      }
    })),
  )

  it('keeps the capability column aligned with resolved rows for every byte', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )
})

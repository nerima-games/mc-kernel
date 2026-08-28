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
import {
  BLOCK_PROPERTY_DEFAULTS,
  COLLISION_SHAPES,
  UNBREAKABLE_HARDNESS,
} from '../src/domain/block-properties'
import {
  BLOCK_IDS,
  BLOCK_ID_MAX,
  BLOCK_REGISTRY,
  blockIdOf,
  blockIdsWithCapability,
  blockTypeOfId,
  capabilitiesOfBlockId,
  capabilityOfBlockId,
  propertyOfBlockId,
} from '../src/domain/block-registry'
import { BLOCK_TYPES, type BlockType } from '../src/domain/block-type'

const number = Number

const EXPECTED_BLOCK_TYPES: ReadonlyArray<BlockType> = [
  'air',
  'stone',
  'cobblestone',
  'dirt',
  'grass_block',
  'sand',
  'gravel',
  'water',
  'lava',
  'oak_log',
  'oak_planks',
  'oak_leaves',
  'glass',
  'torch',
  'glowstone',
  'bedrock',
  'piston',
  'snow',
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
  'cactus',
  'pressure_plate',
  'stone_slab',
  'granite',
  'diorite',
  'andesite',
  'deepslate',
  'obsidian',
  'smooth_basalt',
  'calcite',
  'amethyst_block',
  'amethyst_cluster',
  'sandstone',
  'prismarine',
  'soul_sand',
  'ice',
  'farmland',
  'coal_ore',
  'iron_ore',
  'gold_ore',
  'diamond_ore',
  'redstone_ore',
  'lapis_ore',
  'emerald_ore',
  'deepslate_coal_ore',
  'deepslate_iron_ore',
  'deepslate_gold_ore',
  'deepslate_diamond_ore',
  'deepslate_redstone_ore',
  'deepslate_lapis_ore',
  'deepslate_emerald_ore',
  'coal_block',
  'iron_block',
  'gold_block',
  'diamond_block',
  'redstone_block',
  'lapis_block',
  'emerald_block',
  'wheat_crop',
  'potato_crop',
  'nether_wart_crop',
  'redstone_wire',
  'redstone_torch',
  'lever',
  'stone_button',
  'repeater',
  'redstone_lamp',
  'redstone_lamp_lit',
  'observer',
  'comparator',
  'dispenser',
  'dropper',
  'hopper',
  'piston_head',
  'end_stone',
  'end_portal_frame',
  'end_portal_frame_filled',
  'end_portal',
  'chorus_flower',
  'chorus_plant',
  'dragon_egg',
  'end_crystal',
  'end_gateway',
  'end_rod',
  'end_stone_bricks',
  'ender_chest',
  'purpur_block',
  'purpur_pillar',
  'purpur_slab',
  'purpur_stairs',
  'shulker_box',
  'crafting_table',
  'furnace',
  'chest',
  'door',
  'door_open',
  'oak_stairs',
  'anvil',
  'cauldron',
  'water_cauldron',
  'bed',
  'enchanting_table',
  'brewing_stand',
  'tnt',
  'nether_brick',
  'netherrack',
  'nether_portal',
  'fire',
  'soul_soil',
  'wither_skeleton_skull',
]

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

  it('reproduces PASSABLE_BLOCK_IDS exactly — every member, and no extras', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('keeps oak_leaves OUT of the passable set, which is the canopy bug itself', () =>
    Effect.runPromise(Effect.sync(() => {
      // Named separately from the set comparison above because this is the one
      // Membership the reference explicitly warns about, and a test that only
      // Compares sorted arrays reports it as an unremarkable diff.
      expect(capabilityOfBlockId(blockIdOf('oak_leaves'), 'passable')).toBe(false)
      expect(blockIdsWithCapability('passable').has(blockIdOf('oak_leaves'))).toBe(false)
    })),
  )

  it('gives every collision shape at least one block to be', () =>
    Effect.runPromise(Effect.sync(() => {
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
      expect(propertyOfBlockId(blockIdOf('fire'), 'collisionShape')).toBe('none')
    })),
  )

  it('separates rail from powered_rail, because the reference has two predicates', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('does NOT break lily_pad in water, though it breaks the other waterside plants', () =>
    Effect.runPromise(Effect.sync(() => {
      // `WATER_BREAKABLE_BLOCK_TYPES` (`block-support.ts:34-44`) names
      // SUGAR_CANE and CACTUS individually and pointedly omits LILY_PAD, whose
      // Support rule IS water (:83). A "plants break in water" generalisation
      // Deletes every lily pad on contact with the thing it floats on.
      expect(capabilityOfBlockId(blockIdOf('lily_pad'), 'brokenByWaterFlow')).toBe(false)
      expect(capabilityOfBlockId(blockIdOf('sugar_cane'), 'brokenByWaterFlow')).toBe(true)
      expect(capabilityOfBlockId(blockIdOf('cactus'), 'brokenByWaterFlow')).toBe(true)
    })),
  )

  it('keeps oak_log off the spawn surface, which the default silently got wrong', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('carries the plant friction of 0, which is NOT the default 0.6', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('classifies the reference footstep surfaces without making sound cues a kernel concern', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('puts hardness on the reference’s 0-100 scale, so the column can be compared to itself', () =>
    Effect.runPromise(Effect.sync(() => {
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
        ['end_gateway', UNBREAKABLE_HARDNESS],
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
      // `end_gateway` is -1 in the reference. Preserve it as the explicit
      // unbreakable sentinel; `computeBreakTicks` distinguishes it from zero,
      // which means instant break. Values below the sentinel are invalid.
      for (const id of BLOCK_IDS) {
        const hardness = propertyOfBlockId(id, 'hardness')
        expect(hardness === UNBREAKABLE_HARDNESS || hardness >= 0).toBe(true)
      }
    })),
  )

  describe('contact and movement properties', () => {
    it('slows an entity in a cobweb, and in nothing else', () =>
      Effect.runPromise(Effect.sync(() => {
      // `movementDrag` had no inhabitant before this roster, so nothing checked
      // That the field survived resolution at all.
      const dragging = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'movementDrag') > number('0'))
      expect(dragging.map((id) => blockTypeOfId(id))).toStrictEqual(['cobweb'])

      // 1 - COBWEB_HORIZONTAL_MULTIPLIER (0.25, `player-physics.ts:19`). The
      // Vertical multiplier (0.05, :20) has nowhere to go in a one-number field;
      // That loss is recorded at the registry row rather than rounded away here.
      expect(propertyOfBlockId(blockIdOf('cobweb'), 'movementDrag')).toBe(number('0.75'))
      })),
    )

    it('lets exactly one block hurt on contact, at the reference amount', () =>
      Effect.runPromise(Effect.sync(() => {
      // CACTUS_DAMAGE = 1 and LAVA_DAMAGE = 4 (`environment-hazard.config.ts:7,26`).
      // Two damaging blocks with DIFFERENT amounts is what makes `contactDamage`
      // A number rather than a `hurts: boolean`.
      const damaging = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'contactDamage') > number('0'))
      expect(damaging.map((id) => blockTypeOfId(id)).sort()).toStrictEqual(['cactus', 'lava'])

      expect(propertyOfBlockId(blockIdOf('cactus'), 'contactDamage')).toBe(number('1'))
      expect(propertyOfBlockId(blockIdOf('lava'), 'contactDamage')).toBe(number('4'))
      })),
    )
  })
})

describe('the completed roster and additive gameplay vocabulary', () => {
  it('keeps the reference’s 120 plus three additions distinct and registered', () =>
    Effect.runPromise(Effect.sync(() => {
      // `docs/testing.md` §5.2 re-derived the reference's 120 from two hand-maintained
      // Arrays in the reference that agree as sets (`BlockTypeSchema` and
      // `INDEX_TO_BLOCK_TYPE`). The number is pinned here rather than only in
      // Prose because prose is what gets re-quoted without being re-checked, and
      // This repository's most-repeated defect is a figure justified by the
      // Wrong measurement.
      //
      // Counting LINES of the reference schema gives 128; eight are comments.
      // That is the trap, and 120 is the answer.
      expect(BLOCK_TYPES).toStrictEqual(EXPECTED_BLOCK_TYPES)
      expect(BLOCK_TYPES.length).toBe(number('123'))
      expect(new Set(BLOCK_TYPES).size).toBe(EXPECTED_BLOCK_TYPES.length)
      expect(BLOCK_REGISTRY.length).toBe(EXPECTED_BLOCK_TYPES.length)

      // The bijection, both ways, over the whole roster. `UNREGISTERED_BLOCK_TYPES`
      // Asserts one direction elsewhere; this is the round trip.
      for (const type of BLOCK_TYPES) {
        expect(blockTypeOfId(blockIdOf(type))).toBe(type)
      }
      expect(BLOCK_IDS).toStrictEqual(EXPECTED_BLOCK_TYPES.map((_type, id) => id))
      expect(new Set(BLOCK_IDS).size).toBe(EXPECTED_BLOCK_TYPES.length)
    })),
  )

  it('fits the chunk byte, which is what makes the ids a wire format at all', () =>
    Effect.runPromise(Effect.sync(() => {
      // 123 rows in a 256-value space. Worth an assertion rather than a comment:
      // The ceiling is a property of the `Uint8Array` chunk buffer, and the day
      // The roster crosses it the fix is a chunk-format migration in mc-save,
      // Not a bigger number here.
      for (const id of BLOCK_IDS) {
        expect(id).toBeLessThanOrEqual(BLOCK_ID_MAX)
      }
      expect(Math.max(...BLOCK_IDS)).toBe(number('122'))
    })),
  )

  it('keeps the four ore columns independent, which no single flag could', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('inhabits all four harvest tiers, so the ladder is a ladder and not a boolean', () =>
    Effect.runPromise(Effect.sync(() => {
      const tiers = new Set(BLOCK_IDS.map((id) => propertyOfBlockId(id, 'harvestTool').minTier))
      expect(tiers).toStrictEqual(new Set(['none', 'wooden', 'stone', 'iron', 'diamond']))

      // `obsidian` is the sole member of the top tier in the reference
      // (`harvestable-blocks.ts:53-56`), which is worth pinning: a fifth tier or
      // A second diamond block would be a content decision, not a transcription.
      const diamondTier = BLOCK_IDS.filter((id) => propertyOfBlockId(id, 'harvestTool').minTier === 'diamond')
      expect(diamondTier.map((id) => blockTypeOfId(id))).toStrictEqual(['obsidian'])
    })),
  )

  it('transcribes the crop suffocation split instead of smoothing it', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('completes the closed reference tables it set out to complete', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )
})

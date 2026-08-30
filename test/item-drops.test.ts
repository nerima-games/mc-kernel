/**
 * Drop resolution and harvest gating contracts.
 *
 * The load-bearing test in this file is `EXPECTED_DROPS`: it is exhaustive over
 * `BLOCK_REGISTRY`, and the coverage assertion below it means a block added
 * WITHOUT a drop decision fails here rather than silently inheriting
 * "one of itself". The default is the right default, which is exactly why it
 * must not be able to be arrived at by accident.
 *
 * The remaining checks are properties rather than examples:
 *
 *   - the tool gate actually gates (stone bare-handed yields nothing);
 *   - additive safety — a block or item added without touching an existing
 *     entry changes no existing answer. That property is what
 *     `docs/versioning.md` §5 calls the most important design constraint in the
 *     repository, and it is cheap to lose the moment one answer starts
 *     depending on another row.
 *   - a `self` drop always names an item that exists in the item vocabulary.
 */
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { expectTypeOf } from 'vitest'
import { blockPropertiesOf, type BlockDefinition } from '../src/domain/block-definition'
import {
  BARE_HANDED,
  type BlockDropRule,
  DEFAULT_BLOCK_DROP,
  DEFAULT_HARVEST_TOOL,
  type HarvestContext,
  type HarvestToolRequirement,
  resolveDrop,
  resolveDropItem,
} from '../src/domain/block-harvest'
import { BLOCK_IDS, BLOCK_REGISTRY, blockIdOf, dropOfBlockId } from '../src/domain/block-registry'
import { BLOCK_TYPES, type BlockType } from '../src/domain/block-type'
import { ITEM_TYPES, type ItemType, isItemType } from '../src/domain/item-type'
import { itemOfBlock } from '../src/domain/block-item'
import { StackCount, type StackCount as StackCountValue } from '../src/domain/quantities'

/** A diamond pickaxe without enchantments: nothing is tier-gated for this player. */
const FULLY_EQUIPPED: HarvestContext = { heldTier: 'diamond', silkTouch: true }

/** A diamond pickaxe with Silk Touch, used only by substitution assertions. */
const SILK_TOUCH: HarvestContext = { heldTier: 'diamond', silkTouch: true }

/** A diamond pickaxe without enchantments, used for the ordinary drop ledger. */
const DIAMOND_PICKAXE: HarvestContext = { heldTier: 'diamond' }

/** A wooden pickaxe, which is the exact tier `stone` demands. */
const WOODEN_PICKAXE: HarvestContext = { heldTier: 'wooden' }

const IRON_ARMOUR_ITEM_TYPES = [
  'iron_helmet',
  'iron_chestplate',
  'iron_leggings',
  'iron_boots',
] as const satisfies ReadonlyArray<ItemType>

const DIAMOND_ARMOUR_ITEM_TYPES = [
  'diamond_helmet',
  'diamond_chestplate',
  'diamond_leggings',
  'diamond_boots',
] as const satisfies ReadonlyArray<ItemType>

const NETHERITE_ARMOUR_ITEM_TYPES = [
  'netherite_helmet',
  'netherite_chestplate',
  'netherite_leggings',
  'netherite_boots',
] as const satisfies ReadonlyArray<ItemType>

const HOE_ITEM_TYPES = ['wooden_hoe', 'stone_hoe', 'iron_hoe', 'diamond_hoe'] as const satisfies ReadonlyArray<ItemType>

const SWORD_ITEM_TYPES = [
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',
] as const satisfies ReadonlyArray<ItemType>

const NETHERITE_TOOL_TYPES = [
  'netherite_pickaxe',
  'netherite_shovel',
  'netherite_axe',
  'netherite_hoe',
  'netherite_sword',
] as const satisfies ReadonlyArray<ItemType>

const ZERO = 0
const UNKNOWN_HIGH_BLOCK_ID = 200
const UNKNOWN_HIGHER_BLOCK_ID = 250
const UNKNOWN_NEGATIVE_BLOCK_ID = -1
const UNKNOWN_FRACTIONAL_BLOCK_ID = 1.5
const UNKNOWN_BLOCK_IDS = [UNKNOWN_HIGH_BLOCK_ID, UNKNOWN_HIGHER_BLOCK_ID, UNKNOWN_NEGATIVE_BLOCK_ID, UNKNOWN_FRACTIONAL_BLOCK_ID, Number.NaN]
const NO_DROP: undefined = globalThis.undefined

const dropContextFor = (type: BlockType): HarvestContext => {
  if (type === 'glass') {
    return FULLY_EQUIPPED
  }

  return DIAMOND_PICKAXE
}

const itemForDropRule = (rule: BlockDropRule, type: BlockType): string => {
  if (rule.item === 'self') {
    return type
  }

  return rule.item
}

const droppedItemTypes = (): ReadonlySet<string> => {
  const dropped = new Set<string>()
  for (const entry of BLOCK_REGISTRY) {
    const rule = blockPropertiesOf(entry.definition).drops
    if (rule.count > ZERO) {
      dropped.add(itemForDropRule(rule, entry.definition.type))
    }
  }

  return dropped
}

describe('every block resolves to a drop or explicitly to nothing', () => {
  /**
   * EXHAUSTIVE over `BLOCK_REGISTRY`. Two contexts, because the interesting
   * rows are the ones that answer differently in each: `stone` is gated on a
   * tool, `glass` on silk touch.
   *
   * `'nothing'` is spelled rather than `undefined` so that a missing row reads
   * as a missing row instead of as a decision.
   */
  const EXPECTED_DROPS: ReadonlyArray<readonly [BlockType, ItemType | 'nothing', ItemType | 'nothing']> = [
    // Block            bare hands        diamond + silk touch
    //
    // EXHAUSTIVE and regenerated with the roster. The three columns that make a
    // Row interesting are the tool gate (`stone`), the silk-touch gate
    // (`glass`), and the drop override (`grass_block` -> dirt, every ore, both
    // State pairs). Rows that answer 'nothing' in BOTH columns are listed in
    // `the converse` test below with the table that refuses them.
    ['air', 'nothing', 'nothing'],
    ['bedrock', 'nothing', 'nothing'],
    ['stone', 'nothing', 'cobblestone'],
    ['dirt', 'dirt', 'dirt'],
    ['grass_block', 'dirt', 'dirt'],
    ['sand', 'sand', 'sand'],
    ['water', 'nothing', 'nothing'],
    ['snow', 'snowball', 'snowball'],
    ['gravel', 'gravel', 'gravel'],
    ['oak_log', 'oak_log', 'oak_log'],
    ['oak_leaves', 'nothing', 'nothing'],
    ['lava', 'nothing', 'nothing'],
    ['oak_planks', 'oak_planks', 'oak_planks'],
    ['glass', 'nothing', 'glass'],
    ['torch', 'torch', 'torch'],
    ['glowstone', 'glowstone_dust', 'glowstone_dust'],
    ['piston', 'piston', 'piston'],
    ['cobblestone', 'nothing', 'cobblestone'],
    ['ladder', 'ladder', 'ladder'],
    ['cobweb', 'string', 'string'],
    ['sapling', 'sapling', 'sapling'],
    ['dandelion', 'dandelion', 'dandelion'],
    ['poppy', 'poppy', 'poppy'],
    ['brown_mushroom', 'brown_mushroom', 'brown_mushroom'],
    ['red_mushroom', 'red_mushroom', 'red_mushroom'],
    ['tall_grass', 'nothing', 'nothing'],
    ['fern', 'nothing', 'nothing'],
    ['sugar_cane', 'sugar_cane', 'sugar_cane'],
    ['lily_pad', 'lily_pad', 'lily_pad'],
    ['kelp', 'kelp', 'kelp'],
    ['seagrass', 'seagrass', 'seagrass'],
    ['rail', 'rail', 'rail'],
    ['powered_rail', 'powered_rail', 'powered_rail'],
    ['cactus', 'cactus', 'cactus'],
    ['pressure_plate', 'nothing', 'pressure_plate'],
    ['stone_slab', 'nothing', 'stone_slab'],
    ['granite', 'granite', 'granite'],
    ['diorite', 'diorite', 'diorite'],
    ['andesite', 'andesite', 'andesite'],
    ['deepslate', 'deepslate', 'deepslate'],
    ['obsidian', 'nothing', 'obsidian'],
    ['smooth_basalt', 'nothing', 'smooth_basalt'],
    ['calcite', 'nothing', 'calcite'],
    ['amethyst_block', 'nothing', 'amethyst_block'],
    ['amethyst_cluster', 'nothing', 'amethyst_shard'],
    ['sandstone', 'sandstone', 'sandstone'],
    ['prismarine', 'prismarine', 'prismarine'],
    ['soul_sand', 'soul_sand', 'soul_sand'],
    ['ice', 'nothing', 'nothing'],
    ['farmland', 'dirt', 'dirt'],
    ['coal_ore', 'nothing', 'coal'],
    ['iron_ore', 'nothing', 'raw_iron'],
    ['gold_ore', 'nothing', 'raw_gold'],
    ['diamond_ore', 'nothing', 'diamond'],
    ['redstone_ore', 'nothing', 'redstone_dust'],
    ['lapis_ore', 'nothing', 'lapis_lazuli'],
    ['emerald_ore', 'nothing', 'emerald'],
    ['deepslate_coal_ore', 'nothing', 'coal'],
    ['deepslate_iron_ore', 'nothing', 'raw_iron'],
    ['deepslate_gold_ore', 'nothing', 'raw_gold'],
    ['deepslate_diamond_ore', 'nothing', 'diamond'],
    ['deepslate_redstone_ore', 'nothing', 'redstone_dust'],
    ['deepslate_lapis_ore', 'nothing', 'lapis_lazuli'],
    ['deepslate_emerald_ore', 'nothing', 'emerald'],
    ['coal_block', 'coal_block', 'coal_block'],
    ['iron_block', 'iron_block', 'iron_block'],
    ['gold_block', 'gold_block', 'gold_block'],
    ['diamond_block', 'diamond_block', 'diamond_block'],
    ['redstone_block', 'redstone_block', 'redstone_block'],
    ['lapis_block', 'lapis_block', 'lapis_block'],
    ['emerald_block', 'emerald_block', 'emerald_block'],
    ['wheat_crop', 'wheat_seeds', 'wheat_seeds'],
    ['potato_crop', 'potato', 'potato'],
    ['nether_wart_crop', 'nether_wart', 'nether_wart'],
    ['redstone_wire', 'redstone_dust', 'redstone_dust'],
    ['redstone_torch', 'redstone_torch', 'redstone_torch'],
    ['lever', 'lever', 'lever'],
    ['stone_button', 'stone_button', 'stone_button'],
    ['repeater', 'repeater', 'repeater'],
    ['redstone_lamp', 'redstone_lamp', 'redstone_lamp'],
    ['redstone_lamp_lit', 'redstone_lamp', 'redstone_lamp'],
    ['observer', 'observer', 'observer'],
    ['comparator', 'comparator', 'comparator'],
    ['dispenser', 'dispenser', 'dispenser'],
    ['dropper', 'dropper', 'dropper'],
    ['hopper', 'hopper', 'hopper'],
    ['piston_head', 'nothing', 'nothing'],
    ['end_stone', 'end_stone', 'end_stone'],
    ['end_portal_frame', 'end_portal_frame', 'end_portal_frame'],
    ['end_portal_frame_filled', 'end_portal_frame_filled', 'end_portal_frame_filled'],
    ['end_portal', 'nothing', 'nothing'],
    ['chorus_flower', 'chorus_flower', 'chorus_flower'],
    ['chorus_plant', 'chorus_plant', 'chorus_plant'],
    ['dragon_egg', 'dragon_egg', 'dragon_egg'],
    ['end_crystal', 'end_crystal', 'end_crystal'],
    ['end_gateway', 'nothing', 'nothing'],
    ['end_rod', 'end_rod', 'end_rod'],
    ['end_stone_bricks', 'end_stone_bricks', 'end_stone_bricks'],
    ['ender_chest', 'ender_chest', 'ender_chest'],
    ['purpur_block', 'purpur_block', 'purpur_block'],
    ['purpur_pillar', 'purpur_pillar', 'purpur_pillar'],
    ['purpur_slab', 'purpur_slab', 'purpur_slab'],
    ['purpur_stairs', 'purpur_stairs', 'purpur_stairs'],
    ['shulker_box', 'shulker_box', 'shulker_box'],
    ['crafting_table', 'crafting_table', 'crafting_table'],
    ['furnace', 'furnace', 'furnace'],
    ['chest', 'chest', 'chest'],
    ['door', 'door', 'door'],
    ['door_open', 'door', 'door'],
    ['oak_stairs', 'oak_stairs', 'oak_stairs'],
    ['anvil', 'nothing', 'anvil'],
    ['cauldron', 'nothing', 'cauldron'],
    ['water_cauldron', 'nothing', 'cauldron'],
    ['bed', 'bed', 'bed'],
    ['enchanting_table', 'enchanting_table', 'enchanting_table'],
    ['brewing_stand', 'brewing_stand', 'brewing_stand'],
    ['tnt', 'tnt', 'tnt'],
    ['nether_brick', 'nether_brick', 'nether_brick'],
    ['netherrack', 'netherrack', 'netherrack'],
    ['nether_portal', 'nothing', 'nothing'],
    ['fire', 'nothing', 'nothing'],
    ['soul_soil', 'soul_soil', 'soul_soil'],
    ['wither_skeleton_skull', 'wither_skeleton_skull', 'wither_skeleton_skull'],
  ]

  it('covers the registry exactly, so a new block without a decision fails here', () =>
    Effect.runPromise(Effect.sync(() => {
      const decided = EXPECTED_DROPS.map(([type]) => type)
      const registered = BLOCK_REGISTRY.map((entry) => entry.definition.type)

      expect(new Set(decided).size).toBe(decided.length)
      expect([...decided].sort()).toStrictEqual([...registered].sort())
    })),
  )

  it('answers each block the pinned way, from a chunk buffer byte', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const [type, bare, equipped] of EXPECTED_DROPS) {
        // No block name on the read side: the input is a number.
        const id = blockIdOf(type)
        expect(dropOfBlockId(id)?.item ?? 'nothing').toBe(bare)
          const context = dropContextFor(type)
        expect(dropOfBlockId(id, context)?.item ?? 'nothing').toBe(equipped)
      }
    })),
  )

  it('never yields a count of zero: "nothing" is undefined, not an empty stack', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const id of BLOCK_IDS) {
        const drop = dropOfBlockId(id, FULLY_EQUIPPED)
          if (drop !== NO_DROP) {
            expect(drop.count).toBeGreaterThan(ZERO)
          expect(isItemType(drop.item)).toBe(true)
        }
      }
    })),
  )

  it('reports the fortune flag instead of rolling it, because kernel has no RNG', () =>
    Effect.runPromise(Effect.sync(() => {
      // `DIAMOND_PICKAXE`, not `FULLY_EQUIPPED`: this test is about the
      // fortune flag, not silk touch, and `glowstone` now has a
      // `silkTouchItem` (`glowstone`, not `glowstone_dust`) — the silk-touch
      // case for glowstone is asserted separately, under "the tool gate".
      const glowstone = dropOfBlockId(blockIdOf('glowstone'), DIAMOND_PICKAXE)
        expect(glowstone).toStrictEqual({ affectedByFortune: true, count: 2, item: 'glowstone_dust' })

      expect(dropOfBlockId(blockIdOf('dirt'))?.affectedByFortune).toBe(false)
    })),
  )

  it('mints nothing out of a byte it cannot name', () =>
    Effect.runPromise(Effect.sync(() => {
      // Unlike `capabilityOfBlockId`, an unknown id does NOT fall back to the
      // Ordinary-cube defaults here: doing so would print items into an
      // Inventory from a corrupt chunk.
        for (const unknown of UNKNOWN_BLOCK_IDS) {
        expect(dropOfBlockId(unknown, FULLY_EQUIPPED)).toBeUndefined()
      }
    })),
  )
})

describe('the tool gate', () => {
  it('stone drops nothing without a pickaxe and cobblestone with one', () =>
    Effect.runPromise(Effect.sync(() => {
      const stone = blockIdOf('stone')

      expect(dropOfBlockId(stone, BARE_HANDED)).toBeUndefined()
      expect(dropOfBlockId(stone)).toBeUndefined()
      expect(dropOfBlockId(stone, WOODEN_PICKAXE)).toStrictEqual({
        affectedByFortune: false,
        count: 1,
        item: 'cobblestone',
      })
    })),
  )

  it('gates on tier alone: the wrong tool family is slow, not fruitless', () =>
    Effect.runPromise(Effect.sync(() => {
      // `dirt` declares `category: 'shovel'` and no minimum tier. Bare hands
      // Must still get the dirt — conflating the speed axis with the drop axis
      // Is the bug `domain/block-harvest.ts` is shaped to prevent.
      expect(dropOfBlockId(blockIdOf('dirt'), BARE_HANDED)?.item).toBe('dirt')
      expect(blockPropertiesOf({ type: 'dirt' }).harvestTool.category).toBe('none')
      expect(BLOCK_REGISTRY.find((entry) => entry.definition.type === 'dirt')?.definition.properties?.harvestTool)
        .toStrictEqual({ category: 'shovel', minTier: 'none' })
    })),
  )

  it('silk touch is a gate on glass, and only on glass', () =>
    Effect.runPromise(Effect.sync(() => {
      const glass = blockIdOf('glass')

      expect(dropOfBlockId(glass, { heldTier: 'diamond' })).toBeUndefined()
      expect(dropOfBlockId(glass, { silkTouch: true })?.item).toBe('glass')
      // Silk touch does not unlock a tier-gated block.
      expect(dropOfBlockId(blockIdOf('stone'), { silkTouch: true })).toBeUndefined()
    })),
  )

  it('silk touch substitutes the block for cobblestone, dirt, and raw ore drops', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(dropOfBlockId(blockIdOf('stone'), { heldTier: 'wooden', silkTouch: true })?.item).toBe('stone')
      expect(dropOfBlockId(blockIdOf('grass_block'), { silkTouch: true })?.item).toBe('grass_block')
      expect(dropOfBlockId(blockIdOf('iron_ore'), SILK_TOUCH)).toStrictEqual({
        affectedByFortune: false,
        count: 1,
        item: 'iron_ore',
      })
      expect(dropOfBlockId(blockIdOf('deepslate_redstone_ore'), SILK_TOUCH)).toStrictEqual({
        affectedByFortune: true,
        count: 4,
        item: 'deepslate_redstone_ore',
      })
      // `glowstone` was the one row missing `silkTouchItem` — see the
      // registry comment at its definition. `count`/`affectedByFortune` stay
      // the row's own (2, true), same as `deepslate_redstone_ore` above: only
      // `item` is substituted. mx-gameplay's `test/block-loot.test.ts:387-389`
      // confirms the qualitative fact (silk touch on glowstone yields the
      // block, not the dust) though its own pre-repoint mirror forced
      // `count: 1` blanket for every silk-touch drop — a simplification
      // kernel's per-row model does not carry.
      expect(dropOfBlockId(blockIdOf('glowstone'), SILK_TOUCH)).toStrictEqual({
        affectedByFortune: true,
        count: 2,
        item: 'glowstone',
      })
    })),
  )

  it('tall_grass and fern yield nothing to a bare hand, unlike every other plant row', () =>
    Effect.runPromise(Effect.sync(() => {
      // Both fell through `PLANT_PROPERTIES` to the default "drops one of
      // itself" until their registry rows gained an explicit `drops:
      // DROPS_NOTHING`. mx-gameplay's `block-vocabulary.ts:638-639` mirror
      // pinned this before its deletion; the small wheat-seed chance on a
      // bare-hand break is a gameplay-layer bonus drop, not a kernel rule.
      for (const plant of ['tall_grass', 'fern'] as const) {
        expect(dropOfBlockId(blockIdOf(plant))).toBeUndefined()
        expect(dropOfBlockId(blockIdOf(plant), FULLY_EQUIPPED)).toBeUndefined()
      }

      // The contrast case: every other cross-mesh plant row in the same file
      // still drops itself, so this is a decision about these two rows and
      // not an accidental blanket change to `PLANT_PROPERTIES`.
      for (const plant of ['sapling', 'dandelion', 'poppy', 'brown_mushroom', 'red_mushroom'] as const) {
        expect(dropOfBlockId(blockIdOf(plant))?.item).toBe(plant)
      }
    })),
  )

  it('resolveDropItem is about identity, not about permission', () =>
    Effect.runPromise(Effect.sync(() => {
      // It answers "which item", never "does anything drop" — the tool gate is
      // `resolveDrop`'s job. Stone's rule names cobblestone whether or not the
      // Player could have mined it.
      expect(resolveDropItem({ ...DEFAULT_BLOCK_DROP, item: 'cobblestone' }, 'stone')).toBe('cobblestone')

      // ...and it became partial when the answer became an ITEM: `self` on a
      // Block with no item form is nothing rather than a fabricated name.
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'dirt')).toBe('dirt')
      expectTypeOf(resolveDropItem(DEFAULT_BLOCK_DROP, 'dirt')).toEqualTypeOf<ItemType>()
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'air')).toBeUndefined()
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'water')).toBeUndefined()

      const resolvedDrop = resolveDrop(DEFAULT_HARVEST_TOOL, DEFAULT_BLOCK_DROP, 'dirt', FULLY_EQUIPPED)
      if (resolvedDrop === undefined) {
        throw new Error('expected dirt to resolve to a drop')
      }
      expectTypeOf(DEFAULT_BLOCK_DROP.count).toEqualTypeOf<StackCountValue>()
      expectTypeOf(resolvedDrop.count).toEqualTypeOf<StackCountValue>()
    })),
  )
})

describe('additive safety', () => {
  it('no answer depends on any other row', () =>
    Effect.runPromise(Effect.sync(() => {
      // Recomputed from each definition ALONE, with no registry lookup. If this
      // Ever diverges, some answer has started depending on a neighbour, and
      // Adding a block would stop being a local edit.
      for (const context of [BARE_HANDED, WOODEN_PICKAXE, FULLY_EQUIPPED]) {
        for (const entry of BLOCK_REGISTRY) {
          const properties = blockPropertiesOf(entry.definition)
          expect(resolveDrop(properties.harvestTool, properties.drops, entry.definition.type, context)).toStrictEqual(
            dropOfBlockId(entry.id, context),
          )
        }
      }
    })),
  )

  it('a block added with no drop decision inherits the documented default', () =>
    Effect.runPromise(Effect.sync(() => {
      // The shape of the row a future block gets: `{ type }` and nothing else.
      // `docs/versioning.md` §5-2's claim is that such a row keeps working as
      // The model grows, which is only true if the omission resolves.
      const newcomer: BlockDefinition = { type: 'oak_planks' }
      const properties = blockPropertiesOf(newcomer)

      expect(properties.drops).toStrictEqual(DEFAULT_BLOCK_DROP)
      expect(properties.harvestTool).toStrictEqual(DEFAULT_HARVEST_TOOL)
      expect(resolveDrop(properties.harvestTool, properties.drops, 'oak_planks', BARE_HANDED)).toStrictEqual({
        affectedByFortune: false,
        count: 1,
        item: 'oak_planks',
      })
    })),
  )

  it('adding a block or an item changes no existing answer', () =>
    Effect.runPromise(Effect.sync(() => {
      const before = BLOCK_IDS.map((id) => dropOfBlockId(id, FULLY_EQUIPPED))

      // The data a hypothetical new row would carry, exercised through the same
      // Resolution path the real rows use. `resolveDrop` takes the rule and the
      // Requirement as ARGUMENTS rather than reading a table, so a new entry
      // Cannot reach an existing one; this is that claim, executed.
      const hypotheticalRule: BlockDropRule = {
        affectedByFortune: true,
        count: StackCount(9),
        item: 'stick',
        requiresSilkTouch: false,
      }
      const hypotheticalTool: HarvestToolRequirement = { category: 'sword', minTier: 'diamond' }

      expect(resolveDrop(hypotheticalTool, hypotheticalRule, 'oak_leaves', FULLY_EQUIPPED)).toStrictEqual({
        affectedByFortune: true,
        count: 9,
        item: 'stick',
      })
      expect(resolveDrop(hypotheticalTool, hypotheticalRule, 'oak_leaves', BARE_HANDED)).toBeUndefined()

      expect(BLOCK_IDS.map((id) => dropOfBlockId(id, FULLY_EQUIPPED))).toStrictEqual(before)
    })),
  )

  it('the harvest context grows without breaking callers: every member is optional', () =>
    Effect.runPromise(Effect.sync(() => {
      // `HarvestContext` is a PARAMETER, so a required member added later would
      // Break every call site in 14 repositories. The empty object being a
      // Legal context is that guarantee, spelled.
      const empty: HarvestContext = {}
      expect(empty).toStrictEqual(BARE_HANDED)
      expect(dropOfBlockId(blockIdOf('dirt'), empty)).toStrictEqual(dropOfBlockId(blockIdOf('dirt')))
    })),
  )
})

describe('the rule that keeps a `self` drop honest', () => {
  it('every row whose drop is `self` has an item form, so no row promises a drop it cannot make', () =>
    Effect.runPromise(Effect.sync(() => {
      // THE INVARIANT THAT MAKES 65 NEW ITEM LITERALS NECESSARY RATHER THAN
      // TIDY, and the one this whole pair of rosters can go wrong in silently.
      //
      // `resolveDropItem` (`domain/block-harvest.ts`) resolves `item: 'self'` by
      // Asking `itemOfBlock`, which answers `undefined` when the block's name is
      // Absent from `ITEM_TYPES`. Nothing in the type system objects: the row
      // Compiles, the registry resolves, `dropOfBlockId` returns `undefined`,
      // And the block simply yields nothing forever. A row that says "this drops
      // Itself" while dropping nothing is worse than a row that says nothing,
      // Because the compiler and the reader both agree with it.
      //
      // Adding 84 blocks without this check would have produced 55 such rows.
      const promising = BLOCK_REGISTRY.filter((entry) => {
        const rule = blockPropertiesOf(entry.definition).drops
          return rule.item === 'self' && rule.count > ZERO
      })

      // Non-empty, or the assertion below is vacuously true.
        expect(promising.length).toBeGreaterThan(ZERO)

      const broken = promising
          .filter((entry) => itemOfBlock(entry.definition.type) === NO_DROP)
        .map((entry) => entry.definition.type)
      expect(broken).toStrictEqual([])

      // Stated the other way as well, on the resolved answer rather than on the
      // Rule, so that a change to `resolveDrop`'s gate order cannot satisfy the
      // First form while breaking the promise.
      for (const entry of promising) {
        expect({
          block: entry.definition.type,
          drops: dropOfBlockId(entry.id, FULLY_EQUIPPED)?.item ?? 'nothing',
        }).toStrictEqual({ block: entry.definition.type, drops: entry.definition.type })
      }
    })),
  )

  it('`resolveDrop` still answers nothing for a `self` rule on a block with no item form', () =>
    Effect.runPromise(Effect.sync(() => {
      // THIS ARM LOST ITS COVERAGE WHEN THE ROSTER WAS FIXED, and that is worth
      // Saying rather than quietly restoring.
      //
      // `resolveDrop`'s last line handles the fourth way to get nothing, the one
      // Its doc comment calls "not a denial but an absence": the rule says
      // `'self'` and the block has no item form. Until this change, 21 registry
      // Rows reached it on every call. Now none does — the invariant asserted
      // Above is precisely that no row can.
      //
      // It is still REACHABLE, which is why the arm stays and why this test is
      // Not a contrivance. `resolveDrop` is exported and takes an arbitrary
      // (requirement, rule, block) triple, so any consumer can construct the
      // Case; `air` is the standing example of a block with no item form. That
      // Is a different thing from an arm the TYPES exclude — `docs/testing.md`
      // §4 deletes those rather than testing them, and deleting this one would
      // Make `resolveDrop` return a malformed `BlockDrop` with `item:
      // Undefined`.
      expect(resolveDrop(DEFAULT_HARVEST_TOOL, DEFAULT_BLOCK_DROP, 'air', FULLY_EQUIPPED)).toBeUndefined()
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'air')).toBeUndefined()

      // ...and the same rule against a block that DOES have an item form takes
      // The other arm, so the test pins a branch rather than a constant.
      expect(resolveDrop(DEFAULT_HARVEST_TOOL, DEFAULT_BLOCK_DROP, 'dirt', FULLY_EQUIPPED)).toStrictEqual({
        affectedByFortune: false,
        count: 1,
        item: 'dirt',
      })
    })),
  )

  it('the converse: a block that yields nothing says so in its rule, not by omission from ITEM_TYPES', () =>
    Effect.runPromise(Effect.sync(() => {
      // The other half of the rule in `domain/item-type.ts`. A block may
      // Legitimately drop nothing, but it has to be a DECISION in the row —
      // `count: 0` — rather than the side effect of a missing item literal.
      //
      // The thirteen blocks below are the roster's honest "nothing"s, and each
      // Has a named reference table behind it. Everything else that yields
      // Nothing does so because its rule points at a different item, or because
      // It is one of the pre-existing passable rows whose drop was never
      // Transcribed as self.
      //
      // `tall_grass` and `fern` are the two most recent additions:
      // mx-gameplay's `block-vocabulary.ts:638-639` mirror pinned
      // `drops: DROPS_NOTHING` for exactly these two among the plant rows,
      // before its pending deletion.
      const explicitlyNothing = BLOCK_REGISTRY.filter(
          (entry) => blockPropertiesOf(entry.definition).drops.count === ZERO,
      ).map((entry) => entry.definition.type)

      expect(explicitlyNothing).toStrictEqual([
        'air',
        'bedrock',
        'water',
        'oak_leaves',
        'lava',
        'tall_grass',
        'fern',
        'ice',
        'piston_head',
        'end_portal',
        'end_gateway',
        'nether_portal',
        'fire',
      ])

      // `ice` is the one the reference refuses BY NAME rather than by gate:
      // `NO_BASE_DROP_BLOCK_TYPES` (`block-service.config.ts:199`) has exactly
      // One member. Pinned because a reader who knows silk touch would expect
      // Ice to behave like glass, and it does not.
      expect(dropOfBlockId(blockIdOf('ice'), FULLY_EQUIPPED)).toBeUndefined()
      expect(dropOfBlockId(blockIdOf('glass'), FULLY_EQUIPPED)?.item).toBe('glass')
    })),
  )

  it('no item was added that no block and no earlier decision asked for', () =>
    Effect.runPromise(Effect.sync(() => {
      // The guard on the OTHER direction of the rule — the guessed-roster
      // Failure `domain/item-type.ts` exists to prevent. Every item literal must
      // Have one of three reasons, and "it seemed like a thing that exists" is
      // Not among them.
      //
      //   1. Some block in this registry drops it.
      //   2. It names a block, so a player can hold and place it. `stone` is the
      //      Case: it DROPS cobblestone, so reason 1 never applies to it, and it
      //      Is still an item because you can carry a stone block.
      //   3. It is an explicitly admitted non-block item, each entry argued
      //      Individually in `domain/item-type.ts`: recipe/tool, ignition,
      //      Brewing, food, portal, and anvil-input vocabulary.
      //   4. The equipment boundary needs its identity. Equipment behaviour is
      //      Owned above kernel, but its closed item vocabulary is not.
      //
      // Reason 2 is why this test cannot simply be the converse of the one
      // Above. Reason 3 is a fixed list that must not grow accidentally: a new
      // Item with no block behind it has to earn its place in review and be
      // Added explicitly here.
      const EXPLICIT_NON_BLOCK_ITEMS: ReadonlySet<string> = new Set([
        'stick',
        'bow',
        'arrow',
        'wooden_pickaxe',
        'stone_pickaxe',
        'iron_pickaxe',
        'diamond_pickaxe',
        'gold_pickaxe',
        'wooden_shovel',
        'stone_shovel',
        'iron_shovel',
        'diamond_shovel',
        'gold_shovel',
        'wooden_axe',
        'stone_axe',
        'iron_axe',
        'diamond_axe',
        'gold_axe',
        ...HOE_ITEM_TYPES,
        'gold_hoe',
        ...SWORD_ITEM_TYPES,
        'gold_sword',
        ...NETHERITE_TOOL_TYPES,
        'iron_ingot',
        'flint',
        'gunpowder',
        'blaze_powder',
        'rotten_flesh',
        'ender_pearl',
        'wheat',
        'flint_and_steel',
        'fire_charge',
        'water_bottle',
        'awkward_potion',
        'potion_of_swiftness',
        'potion_of_poison',
        'potion_of_regeneration',
        'sugar',
        'spider_eye',
        'ghast_tear',
        'eye_of_ender',
        'enchanted_book',
        'book',
        'paper',
        'bucket',
        'water_bucket',
        'lava_bucket',
        'oak_boat',
        'minecart',
        'fishing_rod',
        'cod',
        'salmon',
        'tropical_fish',
        'pufferfish',
        'bowl',
        'leather',
        'bone',
        'name_tag',
        'saddle',
        'nether_star',
        'bone_meal',
        'shears',
        'wool',
        'gold_ingot',
        'netherite_scrap',
        'netherite_ingot',
        'netherite_upgrade_smithing_template',
        'apple',
        'baked_potato',
        'beef',
        'beetroot',
        'beetroot_soup',
        'bread',
        'carrot',
        'chicken',
        'chorus_fruit',
        'cooked_beef',
        'cooked_chicken',
        'cooked_cod',
        'cooked_mutton',
        'cooked_porkchop',
        'cooked_rabbit',
        'cooked_salmon',
        'cookie',
        'dried_kelp',
        'enchanted_golden_apple',
        'glass_bottle',
        'glow_berries',
        'golden_apple',
        'golden_carrot',
        'honey_bottle',
        'melon_slice',
        'mushroom_stew',
        'mutton',
        'poisonous_potato',
        'porkchop',
        'pumpkin_pie',
        'rabbit',
        'rabbit_stew',
        'sweet_berries',
        'written_book',
        'writable_book',
        'filled_map',
        'firework_star',
        'firework_rocket',
        'decorated_pot',
        'shield',
        'brick',
        'feather',
        'gold_nugget',
        'black_dye',
        'blue_dye',
        'brown_dye',
        'cyan_dye',
        'gray_dye',
        'green_dye',
        'light_blue_dye',
        'light_gray_dye',
        'lime_dye',
        'magenta_dye',
        'orange_dye',
        'pink_dye',
        'purple_dye',
        'red_dye',
        'white_dye',
        'yellow_dye',
        'black_banner',
        'blue_banner',
        'brown_banner',
        'cyan_banner',
        'gray_banner',
        'green_banner',
        'light_blue_banner',
        'light_gray_banner',
        'lime_banner',
        'magenta_banner',
        'orange_banner',
        'pink_banner',
        'purple_banner',
        'red_banner',
        'white_banner',
        'yellow_banner',
      ])
      const EQUIPMENT_ITEMS: ReadonlySet<string> = new Set([
        ...IRON_ARMOUR_ITEM_TYPES,
        ...DIAMOND_ARMOUR_ITEM_TYPES,
        ...NETHERITE_ARMOUR_ITEM_TYPES,
      ])

      const dropped = droppedItemTypes()
      const blockNames = new Set<string>(BLOCK_TYPES)

      const unexplained = ITEM_TYPES.filter(
        (item) =>
          !dropped.has(item) &&
          !blockNames.has(item) &&
          !EXPLICIT_NON_BLOCK_ITEMS.has(item) &&
          !EQUIPMENT_ITEMS.has(item),
      )
      expect(unexplained).toStrictEqual([])

      // The explicit list is pinned to its exact membership so that adding an
      // Unexplained item cannot be hidden by adding a name to the exemption.
      expect([...EXPLICIT_NON_BLOCK_ITEMS].filter((name) => !isItemType(name))).toStrictEqual([])
      expect([...EQUIPMENT_ITEMS]).toStrictEqual([
        ...IRON_ARMOUR_ITEM_TYPES,
        ...DIAMOND_ARMOUR_ITEM_TYPES,
        ...NETHERITE_ARMOUR_ITEM_TYPES,
      ])
    })),
  )
})

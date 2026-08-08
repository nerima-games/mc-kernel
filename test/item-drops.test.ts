/**
 * The item vocabulary and the block -> item bridge.
 *
 * The load-bearing test in this file is `EXPECTED_DROPS`: it is exhaustive over
 * `BLOCK_REGISTRY`, and the coverage assertion below it means a block added
 * WITHOUT a drop decision fails here rather than silently inheriting
 * "one of itself". The default is the right default, which is exactly why it
 * must not be able to be arrived at by accident.
 *
 * The other three are properties rather than examples:
 *
 *   - the tool gate actually gates (stone bare-handed yields nothing);
 *   - `ItemType` and `BlockType` do not silently interconvert, pinned with
 *     `Exclude` in both directions the way `test/clock-and-frame.test.ts` pins
 *     `FrameServices`;
 *   - additive safety — a block or item added without touching an existing
 *     entry changes no existing answer. That property is what
 *     `docs/versioning.md` §5 calls the most important design constraint in the
 *     repository, and it is cheap to lose the moment one answer starts
 *     depending on another row.
 */
import { describe, expect, it } from '@effect/vitest'
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
import {
  NON_PLACEABLE_ITEM_TYPES,
  PLACEABLE_ITEM_TYPES,
  UNITEMISED_BLOCK_TYPES,
  blockOfPlaceableItem,
  isPlaceableItem,
  itemOfBlock,
} from '../src/domain/block-item'
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

const HOE_ITEM_TYPES = ['wooden_hoe', 'stone_hoe', 'iron_hoe', 'diamond_hoe'] as const satisfies ReadonlyArray<ItemType>

const SWORD_ITEM_TYPES = [
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',
] as const satisfies ReadonlyArray<ItemType>

const SUPPORT_SENSITIVE_PLANT_ITEM_TYPES = [
  'sapling',
  'dandelion',
  'poppy',
  'brown_mushroom',
  'red_mushroom',
  'tall_grass',
  'fern',
  'sugar_cane',
  'cactus',
  'lily_pad',
] as const satisfies ReadonlyArray<ItemType>

const KNOWN_ITEM_TYPES = [
  'stick',
  'bow',
  'arrow',
  'cobblestone',
  'stone_pickaxe',
  'iron_pickaxe',
  'diamond_pickaxe',
  'eye_of_ender',
] as const satisfies ReadonlyArray<ItemType>

const UNITEMISED_EXAMPLE_BLOCK_TYPES = ['air', 'water', 'bedrock'] as const satisfies ReadonlyArray<BlockType>
const NON_PLACEABLE_EXAMPLE_ITEM_TYPES = ['stick', 'bow', 'arrow', 'glowstone_dust'] as const satisfies ReadonlyArray<ItemType>
const FIRST_ITEM_TYPE_INDEX = 0
const ZERO = 0
const UNKNOWN_HIGH_BLOCK_ID = 200
const UNKNOWN_HIGHER_BLOCK_ID = 250
const UNKNOWN_NEGATIVE_BLOCK_ID = -1
const UNKNOWN_FRACTIONAL_BLOCK_ID = 1.5
const UNKNOWN_BLOCK_IDS = [UNKNOWN_HIGH_BLOCK_ID, UNKNOWN_HIGHER_BLOCK_ID, UNKNOWN_NEGATIVE_BLOCK_ID, UNKNOWN_FRACTIONAL_BLOCK_ID, Number.NaN]
const NO_DROP: undefined = globalThis.undefined

const VALIDATED_ITEM_TYPES = [
  ...KNOWN_ITEM_TYPES,
  ...HOE_ITEM_TYPES,
  ...SWORD_ITEM_TYPES,
  ...SUPPORT_SENSITIVE_PLANT_ITEM_TYPES,
  ...IRON_ARMOUR_ITEM_TYPES,
]

const PLACEABLE_ITEM_BLOCK_TYPES = ['dirt', 'cobblestone', ...SUPPORT_SENSITIVE_PLANT_ITEM_TYPES, 'torch'] as const satisfies ReadonlyArray<BlockType>

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

describe('ItemType is a closed literal union, exactly as BlockType is', () => {
  it.effect('narrows a string that names a known item', () =>
    Effect.sync(() => {
      for (const item of VALIDATED_ITEM_TYPES) {
        expect(isItemType(item)).toBe(true)
      }
      expect(isItemType(ITEM_TYPES[FIRST_ITEM_TYPE_INDEX])).toBe(true)
      expect(isItemType('diamond_helmet')).toBe(false)
    }),
  )

  it.effect('rejects a string that does not, so a save file cannot smuggle one in', () =>
    Effect.sync(() => {
      expect(isItemType('unobtainium')).toBe(false)
      expect(isItemType('')).toBe(false)
      // Mc-sim's provisional roster is UPPER_SNAKE. Repointing it is a
      // Re-casing as well as a re-typing, and this is the assertion that says
      // The compiler will find every site rather than accepting both spellings.
      expect(isItemType('STICK')).toBe(false)
      // `air` is a sentinel, not a thing (audit §6-6).
      expect(isItemType('air')).toBe(false)
    }),
  )

  it.effect('has no duplicate literal', () =>
    Effect.sync(() => {
      expect(new Set(ITEM_TYPES).size).toBe(ITEM_TYPES.length)
    }),
  )
})

describe('ItemType and BlockType are distinct types that do not interconvert', () => {
  // The bracket form `[T] extends [U]` is deliberate: it suppresses the
  // Distribution a bare conditional would apply, so these are assertions about
  // The UNIONS rather than about their members one at a time.
  it.effect('neither union is assignable to the other', () =>
    Effect.sync(() => {
      const itemIsNotABlock: [ItemType] extends [BlockType] ? false : true = true
      const blockIsNotAnItem: [BlockType] extends [ItemType] ? false : true = true

      expect(itemIsNotABlock).toBe(true)
      expect(blockIsNotAnItem).toBe(true)
    }),
  )

  it.effect('each union keeps at least one member the other cannot express', () =>
    Effect.sync(() => {
      // If either of these went empty, the assertion above would start holding
      // For the wrong reason (one roster having swallowed the other), and the
      // Distinction would become decorative without any test failing.
      type ItemsThatAreNotBlocks = Exclude<ItemType, BlockType>
      type BlocksThatAreNotItems = Exclude<BlockType, ItemType>

      const itemsRemain: [ItemsThatAreNotBlocks] extends [never] ? false : true = true
      const blocksRemain: [BlocksThatAreNotItems] extends [never] ? false : true = true

      expect(itemsRemain).toBe(true)
      expect(blocksRemain).toBe(true)

      // ...and the same fact as data, so the reason is legible in a failure.
      //
      // Pinned as a literal list rather than a count so every non-placeable
      // Vocabulary addition remains visible in review.
      expect([...NON_PLACEABLE_ITEM_TYPES]).toStrictEqual([
        'stick',
        'bow',
        'arrow',
        'glowstone_dust',
        'wooden_pickaxe',
        'stone_pickaxe',
        'iron_pickaxe',
        'diamond_pickaxe',
        'wooden_hoe',
        'stone_hoe',
        'iron_hoe',
        'diamond_hoe',
        'wooden_sword',
        'stone_sword',
        'iron_sword',
        'diamond_sword',
        'coal',
        'iron_ingot',
        'flint',
        'gunpowder',
        'blaze_powder',
        'rotten_flesh',
        'ender_pearl',
        'flint_and_steel',
        'fire_charge',
        'iron_helmet',
        'iron_chestplate',
        'iron_leggings',
        'iron_boots',
        'raw_iron',
        'raw_gold',
        'diamond',
        'emerald',
        'lapis_lazuli',
        'redstone_dust',
        'amethyst_shard',
        'wheat_seeds',
        'wheat',
        'potato',
        'nether_wart',
        'string',
        'snowball',
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
      ])

      // The block half of the same ledger: 23 entries over 36 blocks before, 35
      // Over 120 now. It grew far more slowly than the roster did, and its
      // Composition changed completely — seven of the old entries turned out to
      // Be untranscribed drops rather than gaps (a block whose row says "yields
      // Itself" while its name is missing from `ITEM_TYPES` yields nothing,
      // Silently, and eighteen rows were in that state).
      //
      // What is left divides into three kinds, and none is an oversight:
      //
      //   BLOCKS WHOSE DROP IS AN OVERRIDE, which need no item of their own.
      //   Every ore (yields its mineral), `farmland` (dirt), `door_open` (door),
      //   `water_cauldron` (cauldron), `redstone_wire` (redstone dust),
      //   `redstone_lamp_lit` (the unlit lamp), `amethyst_cluster` (shards),
      //   `cobweb` (string), `snow` (snowballs) and the three crops. This is the
      //   "Only if" half of the rule in `domain/item-type.ts` doing its work.
      //
      //   BLOCKS THAT ARE WORLD STATE, which no player carries: `air`, `water`,
      //   `Lava` and `bedrock` as before, plus `fire`, `nether_portal`,
      //   `End_portal`, `end_gateway` and `piston_head`. Each of those five has
      //   `Count: 0` written in its row as well, so the "nothing" is a decision
      //   In two places rather than a consequence of this list.
      //
      //   ...and `ice`, which belongs to none of them: it has an item-shaped
      //   Drop rule that `NO_BASE_DROP_BLOCK_TYPES` refuses by name.
      expect([...UNITEMISED_BLOCK_TYPES]).toStrictEqual([
        'air',
        'water',
        'lava',
        'bedrock',
        'snow',
        'cobweb',
        'amethyst_cluster',
        'ice',
        'farmland',
        'wheat_crop',
        'potato_crop',
        'nether_wart_crop',
        'redstone_wire',
        'redstone_lamp_lit',
        'piston_head',
        'end_portal',
        'end_gateway',
        'door_open',
        'water_cauldron',
        'nether_portal',
        'fire',
      ])
    }),
  )

  it.effect('the mapping is one-directional: block -> item is partial, item -> block needs a proof', () =>
    Effect.sync(() => {
      for (const item of PLACEABLE_ITEM_BLOCK_TYPES) {
        expect(itemOfBlock(item)).toBe(item)
        expect(isPlaceableItem(item)).toBe(true)
        if (isPlaceableItem(item)) {
          expect(blockOfPlaceableItem(item)).toBe(item)
        }
      }

      // No item form. Not a failure — a real answer.
      for (const block of UNITEMISED_EXAMPLE_BLOCK_TYPES) {
        expect(itemOfBlock(block)).toBeUndefined()
      }

      // The other direction only exists once placeability is proven, and there
      // Is deliberately no `blockOfItem(item: ItemType)` to ask about a stick.
      for (const item of NON_PLACEABLE_EXAMPLE_ITEM_TYPES) {
        expect(isPlaceableItem(item)).toBe(false)
      }
      expect(isPlaceableItem('torch')).toBe(true)
      const torch = 'torch'
      if (isPlaceableItem(torch)) {
        expect(itemOfBlock(torch)).toBe('torch')
        expect(blockOfPlaceableItem(torch)).toBe('torch')
      }
    }),
  )

  it.effect('the audit §6-8 intersection is derived, so it cannot go stale', () =>
    Effect.sync(() => {
      // The reference's hand-written `BLOCK_ITEMS` was already missing entries
      // When the audit read it. This one is recomputed from both rosters here,
      // Which is the whole claim.
      const blockNames = new Set<string>(BLOCK_TYPES)
      expect([...PLACEABLE_ITEM_TYPES]).toStrictEqual(ITEM_TYPES.filter((item) => blockNames.has(item)))

      const itemNames = new Set<string>(ITEM_TYPES)
      expect([...UNITEMISED_BLOCK_TYPES]).toStrictEqual(BLOCK_TYPES.filter((block) => !itemNames.has(block)))

      expect(PLACEABLE_ITEM_TYPES.length + NON_PLACEABLE_ITEM_TYPES.length).toBe(ITEM_TYPES.length)
    }),
  )
})

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
    ['tall_grass', 'tall_grass', 'tall_grass'],
    ['fern', 'fern', 'fern'],
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

  it.effect('covers the registry exactly, so a new block without a decision fails here', () =>
    Effect.sync(() => {
      const decided = EXPECTED_DROPS.map(([type]) => type)
      const registered = BLOCK_REGISTRY.map((entry) => entry.definition.type)

      expect(new Set(decided).size).toBe(decided.length)
      expect([...decided].sort()).toStrictEqual([...registered].sort())
    }),
  )

  it.effect('answers each block the pinned way, from a chunk buffer byte', () =>
    Effect.sync(() => {
      for (const [type, bare, equipped] of EXPECTED_DROPS) {
        // No block name on the read side: the input is a number.
        const id = blockIdOf(type)
        expect(dropOfBlockId(id)?.item ?? 'nothing').toBe(bare)
          const context = dropContextFor(type)
        expect(dropOfBlockId(id, context)?.item ?? 'nothing').toBe(equipped)
      }
    }),
  )

  it.effect('never yields a count of zero: "nothing" is undefined, not an empty stack', () =>
    Effect.sync(() => {
      for (const id of BLOCK_IDS) {
        const drop = dropOfBlockId(id, FULLY_EQUIPPED)
          if (drop !== NO_DROP) {
            expect(drop.count).toBeGreaterThan(ZERO)
          expect(isItemType(drop.item)).toBe(true)
        }
      }
    }),
  )

  it.effect('reports the fortune flag instead of rolling it, because kernel has no RNG', () =>
    Effect.sync(() => {
      const glowstone = dropOfBlockId(blockIdOf('glowstone'), FULLY_EQUIPPED)
        expect(glowstone).toStrictEqual({ affectedByFortune: true, count: 2, item: 'glowstone_dust' })

      expect(dropOfBlockId(blockIdOf('dirt'))?.affectedByFortune).toBe(false)
    }),
  )

  it.effect('mints nothing out of a byte it cannot name', () =>
    Effect.sync(() => {
      // Unlike `capabilityOfBlockId`, an unknown id does NOT fall back to the
      // Ordinary-cube defaults here: doing so would print items into an
      // Inventory from a corrupt chunk.
        for (const unknown of UNKNOWN_BLOCK_IDS) {
        expect(dropOfBlockId(unknown, FULLY_EQUIPPED)).toBeUndefined()
      }
    }),
  )
})

describe('the tool gate', () => {
  it.effect('stone drops nothing without a pickaxe and cobblestone with one', () =>
    Effect.sync(() => {
      const stone = blockIdOf('stone')

      expect(dropOfBlockId(stone, BARE_HANDED)).toBeUndefined()
      expect(dropOfBlockId(stone)).toBeUndefined()
      expect(dropOfBlockId(stone, WOODEN_PICKAXE)).toStrictEqual({
        affectedByFortune: false,
        count: 1,
        item: 'cobblestone',
      })
    }),
  )

  it.effect('gates on tier alone: the wrong tool family is slow, not fruitless', () =>
    Effect.sync(() => {
      // `dirt` declares `category: 'shovel'` and no minimum tier. Bare hands
      // Must still get the dirt — conflating the speed axis with the drop axis
      // Is the bug `domain/block-harvest.ts` is shaped to prevent.
      expect(dropOfBlockId(blockIdOf('dirt'), BARE_HANDED)?.item).toBe('dirt')
      expect(blockPropertiesOf({ type: 'dirt' }).harvestTool.category).toBe('none')
      expect(BLOCK_REGISTRY.find((entry) => entry.definition.type === 'dirt')?.definition.properties?.harvestTool)
        .toStrictEqual({ category: 'shovel', minTier: 'none' })
    }),
  )

  it.effect('silk touch is a gate on glass, and only on glass', () =>
    Effect.sync(() => {
      const glass = blockIdOf('glass')

      expect(dropOfBlockId(glass, { heldTier: 'diamond' })).toBeUndefined()
      expect(dropOfBlockId(glass, { silkTouch: true })?.item).toBe('glass')
      // Silk touch does not unlock a tier-gated block.
      expect(dropOfBlockId(blockIdOf('stone'), { silkTouch: true })).toBeUndefined()
    }),
  )

  it.effect('silk touch substitutes the block for cobblestone, dirt, and raw ore drops', () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect('resolveDropItem is about identity, not about permission', () =>
    Effect.sync(() => {
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
    }),
  )
})

describe('additive safety', () => {
  it.effect('no answer depends on any other row', () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect('a block added with no drop decision inherits the documented default', () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect('adding a block or an item changes no existing answer', () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect('the harvest context grows without breaking callers: every member is optional', () =>
    Effect.sync(() => {
      // `HarvestContext` is a PARAMETER, so a required member added later would
      // Break every call site in 14 repositories. The empty object being a
      // Legal context is that guarantee, spelled.
      const empty: HarvestContext = {}
      expect(empty).toStrictEqual(BARE_HANDED)
      expect(dropOfBlockId(blockIdOf('dirt'), empty)).toStrictEqual(dropOfBlockId(blockIdOf('dirt')))
    }),
  )
})

describe('the rule that keeps a `self` drop honest', () => {
  it.effect('every row whose drop is `self` has an item form, so no row promises a drop it cannot make', () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect('`resolveDrop` still answers nothing for a `self` rule on a block with no item form', () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect('the converse: a block that yields nothing says so in its rule, not by omission from ITEM_TYPES', () =>
    Effect.sync(() => {
      // The other half of the rule in `domain/item-type.ts`. A block may
      // Legitimately drop nothing, but it has to be a DECISION in the row —
      // `count: 0` — rather than the side effect of a missing item literal.
      //
      // The eleven blocks below are the roster's honest "nothing"s, and each
      // Has a named reference table behind it. Everything else that yields
      // Nothing does so because its rule points at a different item, or because
      // It is one of the pre-existing passable rows whose drop was never
      // Transcribed as self.
      const explicitlyNothing = BLOCK_REGISTRY.filter(
          (entry) => blockPropertiesOf(entry.definition).drops.count === ZERO,
      ).map((entry) => entry.definition.type)

      expect(explicitlyNothing).toStrictEqual([
        'air',
        'bedrock',
        'water',
        'oak_leaves',
        'lava',
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
    }),
  )

  it.effect('no item was added that no block and no earlier decision asked for', () =>
    Effect.sync(() => {
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
      //      Brewing, portal, and anvil-input vocabulary.
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
        ...HOE_ITEM_TYPES,
        ...SWORD_ITEM_TYPES,
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
      ])
      const EQUIPMENT_ITEMS: ReadonlySet<string> = new Set(IRON_ARMOUR_ITEM_TYPES)

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
      expect([...EXPLICIT_NON_BLOCK_ITEMS].filter((name) => !ITEM_TYPES.includes(name as ItemType))).toStrictEqual([])
      expect([...EQUIPMENT_ITEMS]).toStrictEqual(IRON_ARMOUR_ITEM_TYPES)
    }),
  )
})

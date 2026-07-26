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
import { blockPropertiesOf, type BlockDefinition } from '../domain/block-definition'
import {
  BARE_HANDED,
  DEFAULT_BLOCK_DROP,
  DEFAULT_HARVEST_TOOL,
  resolveDrop,
  resolveDropItem,
  type BlockDropRule,
  type HarvestContext,
  type HarvestToolRequirement,
} from '../domain/block-harvest'
import {
  blockOfPlaceableItem,
  isPlaceableItem,
  itemOfBlock,
  NON_PLACEABLE_ITEM_TYPES,
  PLACEABLE_ITEM_TYPES,
  UNITEMISED_BLOCK_TYPES,
} from '../domain/block-item'
import { BLOCK_IDS, BLOCK_REGISTRY, blockIdOf, dropOfBlockId } from '../domain/block-registry'
import { BLOCK_TYPES, type BlockType } from '../domain/block-type'
import { isItemType, ITEM_TYPES, type ItemType } from '../domain/item-type'

/** A diamond pickaxe with silk touch: nothing is gated for this player. */
const FULLY_EQUIPPED: HarvestContext = { heldTier: 'diamond', silkTouch: true }

/** A wooden pickaxe, which is the exact tier `stone` demands. */
const WOODEN_PICKAXE: HarvestContext = { heldTier: 'wooden' }

describe('ItemType is a closed literal union, exactly as BlockType is', () => {
  it.effect('narrows a string that names a known item', () =>
    Effect.sync(() => {
      expect(isItemType('stick')).toBe(true)
      expect(isItemType('cobblestone')).toBe(true)
      expect(isItemType(ITEM_TYPES[0])).toBe(true)
    }),
  )

  it.effect('rejects a string that does not, so a save file cannot smuggle one in', () =>
    Effect.sync(() => {
      expect(isItemType('unobtainium')).toBe(false)
      expect(isItemType('')).toBe(false)
      // mc-sim's provisional roster is UPPER_SNAKE. Repointing it is a
      // re-casing as well as a re-typing, and this is the assertion that says
      // the compiler will find every site rather than accepting both spellings.
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
  // distribution a bare conditional would apply, so these are assertions about
  // the UNIONS rather than about their members one at a time.
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
      // for the wrong reason (one roster having swallowed the other), and the
      // distinction would become decorative without any test failing.
      type ItemsThatAreNotBlocks = Exclude<ItemType, BlockType>
      type BlocksThatAreNotItems = Exclude<BlockType, ItemType>

      const itemsRemain: [ItemsThatAreNotBlocks] extends [never] ? false : true = true
      const blocksRemain: [BlocksThatAreNotItems] extends [never] ? false : true = true

      expect(itemsRemain).toBe(true)
      expect(blocksRemain).toBe(true)

      // ...and the same fact as data, so the reason is legible in a failure.
      //
      // Pinned as a literal list rather than a count. The seven after
      // `wooden_pickaxe` arrived together when mc-sim's recipe table was
      // repointed onto `ItemType` and seven rows had nothing to name; each has a
      // kernel-side reason recorded beside it in `domain/item-type.ts`, and a
      // list is what makes an eighth arriving without one visible in review.
      expect([...NON_PLACEABLE_ITEM_TYPES]).toStrictEqual([
        'stick',
        'glowstone_dust',
        'wooden_pickaxe',
        'coal',
        'iron_ingot',
        'flint',
        'gunpowder',
        'blaze_powder',
        'flint_and_steel',
        'fire_charge',
      ])
      expect([...UNITEMISED_BLOCK_TYPES]).toStrictEqual(['air', 'water', 'lava', 'bedrock', 'snow'])
    }),
  )

  it.effect('the mapping is one-directional: block -> item is partial, item -> block needs a proof', () =>
    Effect.sync(() => {
      expect(itemOfBlock('dirt')).toBe('dirt')
      expect(itemOfBlock('cobblestone')).toBe('cobblestone')

      // No item form. Not a failure — a real answer.
      expect(itemOfBlock('air')).toBeUndefined()
      expect(itemOfBlock('water')).toBeUndefined()
      expect(itemOfBlock('bedrock')).toBeUndefined()

      // The other direction only exists once placeability is proven, and there
      // is deliberately no `blockOfItem(item: ItemType)` to ask about a stick.
      expect(isPlaceableItem('stick')).toBe(false)
      expect(isPlaceableItem('glowstone_dust')).toBe(false)
      expect(isPlaceableItem('torch')).toBe(true)
      const torch = 'torch'
      if (isPlaceableItem(torch)) {
        expect(blockOfPlaceableItem(torch)).toBe('torch')
      }
    }),
  )

  it.effect('the audit §6-8 intersection is derived, so it cannot go stale', () =>
    Effect.sync(() => {
      // The reference's hand-written `BLOCK_ITEMS` was already missing entries
      // when the audit read it. This one is recomputed from both rosters here,
      // which is the whole claim.
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
    // block            bare hands        diamond + silk touch
    ['air', 'nothing', 'nothing'],
    ['bedrock', 'nothing', 'nothing'],
    ['stone', 'nothing', 'cobblestone'], // tool-gated
    ['cobblestone', 'nothing', 'cobblestone'], // tool-gated, self
    ['dirt', 'dirt', 'dirt'], // self
    ['grass_block', 'dirt', 'dirt'], // different, ungated
    ['sand', 'sand', 'sand'],
    ['water', 'nothing', 'nothing'],
    ['snow', 'nothing', 'nothing'], // roster gap: no `snowball` yet
    ['gravel', 'gravel', 'gravel'],
    ['oak_log', 'oak_log', 'oak_log'],
    ['oak_leaves', 'nothing', 'nothing'], // random drops -> mx-gameplay
    ['lava', 'nothing', 'nothing'],
    ['oak_planks', 'oak_planks', 'oak_planks'],
    ['glass', 'nothing', 'glass'], // silk-touch gated
    ['torch', 'torch', 'torch'],
    ['glowstone', 'glowstone_dust', 'glowstone_dust'], // not a block
    ['piston', 'piston', 'piston'],
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
        expect(dropOfBlockId(id, FULLY_EQUIPPED)?.item ?? 'nothing').toBe(equipped)
      }
    }),
  )

  it.effect('never yields a count of zero: "nothing" is undefined, not an empty stack', () =>
    Effect.sync(() => {
      for (const id of BLOCK_IDS) {
        const drop = dropOfBlockId(id, FULLY_EQUIPPED)
        if (drop !== undefined) {
          expect(drop.count).toBeGreaterThan(0)
          expect(isItemType(drop.item)).toBe(true)
        }
      }
    }),
  )

  it.effect('reports the fortune flag instead of rolling it, because kernel has no RNG', () =>
    Effect.sync(() => {
      const glowstone = dropOfBlockId(blockIdOf('glowstone'), FULLY_EQUIPPED)
      expect(glowstone).toStrictEqual({ item: 'glowstone_dust', count: 2, affectedByFortune: true })

      expect(dropOfBlockId(blockIdOf('dirt'))?.affectedByFortune).toBe(false)
    }),
  )

  it.effect('mints nothing out of a byte it cannot name', () =>
    Effect.sync(() => {
      // Unlike `capabilityOfBlockId`, an unknown id does NOT fall back to the
      // ordinary-cube defaults here: doing so would print items into an
      // inventory from a corrupt chunk.
      for (const unknown of [200, 250, -1, 1.5, Number.NaN]) {
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
        item: 'cobblestone',
        count: 1,
        affectedByFortune: false,
      })
    }),
  )

  it.effect('gates on tier alone: the wrong tool family is slow, not fruitless', () =>
    Effect.sync(() => {
      // `dirt` declares `category: 'shovel'` and no minimum tier. Bare hands
      // must still get the dirt — conflating the speed axis with the drop axis
      // is the bug `domain/block-harvest.ts` is shaped to prevent.
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

  it.effect('resolveDropItem is about identity, not about permission', () =>
    Effect.sync(() => {
      // It answers "which item", never "does anything drop" — the tool gate is
      // `resolveDrop`'s job. Stone's rule names cobblestone whether or not the
      // player could have mined it.
      expect(resolveDropItem({ ...DEFAULT_BLOCK_DROP, item: 'cobblestone' }, 'stone')).toBe('cobblestone')

      // ...and it became partial when the answer became an ITEM: `self` on a
      // block with no item form is nothing rather than a fabricated name.
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'dirt')).toBe('dirt')
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'air')).toBeUndefined()
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'water')).toBeUndefined()
    }),
  )
})

describe('additive safety', () => {
  it.effect('no answer depends on any other row', () =>
    Effect.sync(() => {
      // Recomputed from each definition ALONE, with no registry lookup. If this
      // ever diverges, some answer has started depending on a neighbour, and
      // adding a block would stop being a local edit.
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
      // the model grows, which is only true if the omission resolves.
      const newcomer: BlockDefinition = { type: 'oak_planks' }
      const properties = blockPropertiesOf(newcomer)

      expect(properties.drops).toStrictEqual(DEFAULT_BLOCK_DROP)
      expect(properties.harvestTool).toStrictEqual(DEFAULT_HARVEST_TOOL)
      expect(resolveDrop(properties.harvestTool, properties.drops, 'oak_planks', BARE_HANDED)).toStrictEqual({
        item: 'oak_planks',
        count: 1,
        affectedByFortune: false,
      })
    }),
  )

  it.effect('adding a block or an item changes no existing answer', () =>
    Effect.sync(() => {
      const before = BLOCK_IDS.map((id) => dropOfBlockId(id, FULLY_EQUIPPED))

      // The data a hypothetical new row would carry, exercised through the same
      // resolution path the real rows use. `resolveDrop` takes the rule and the
      // requirement as ARGUMENTS rather than reading a table, so a new entry
      // cannot reach an existing one; this is that claim, executed.
      const hypotheticalRule: BlockDropRule = {
        item: 'stick',
        count: 9,
        requiresSilkTouch: false,
        affectedByFortune: true,
      }
      const hypotheticalTool: HarvestToolRequirement = { category: 'sword', minTier: 'diamond' }

      expect(resolveDrop(hypotheticalTool, hypotheticalRule, 'oak_leaves', FULLY_EQUIPPED)).toStrictEqual({
        item: 'stick',
        count: 9,
        affectedByFortune: true,
      })
      expect(resolveDrop(hypotheticalTool, hypotheticalRule, 'oak_leaves', BARE_HANDED)).toBeUndefined()

      expect(BLOCK_IDS.map((id) => dropOfBlockId(id, FULLY_EQUIPPED))).toStrictEqual(before)
    }),
  )

  it.effect('the harvest context grows without breaking callers: every member is optional', () =>
    Effect.sync(() => {
      // `HarvestContext` is a PARAMETER, so a required member added later would
      // break every call site in 14 repositories. The empty object being a
      // legal context is that guarantee, spelled.
      const empty: HarvestContext = {}
      expect(empty).toStrictEqual(BARE_HANDED)
      expect(dropOfBlockId(blockIdOf('dirt'), empty)).toStrictEqual(dropOfBlockId(blockIdOf('dirt')))
    }),
  )
})

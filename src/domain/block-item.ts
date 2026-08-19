/**
 * The bridge from a block to the item it becomes, and the one place the two
 * vocabularies are allowed to meet.
 *
 * ---------------------------------------------------------------------------
 * Why this is a derivation and not a table
 * ---------------------------------------------------------------------------
 *
 * `historical design audit` §6-8 examined the reference implementation's
 * `BLOCK_ITEMS` (`first-person-held-item.ts:58-76`) — a hand-written list of
 * "blocks you can hold in your hand" — and rejected it as a capability:
 *
 *   > これは `ItemType ∩ BlockType` の導出であり、フラグではなく型レベルで
 *   > 解決すべき（現に KELP / SEAGRASS / AMETHYST_* / RAIL などの新しい型が
 *   > 漏れている手書きの重複リストになっている）
 *
 * The failure mode the audit measured is not that the list was wrong once; it
 * is that a hand-written list of a derivable set goes stale every time either
 * side grows. So the identity case in this file is computed from `BLOCK_TYPES`
 * and `ITEM_TYPES`; the only hand-written data is the small, reviewable set of
 * differently named vanilla placement pairs. Adding a same-named block or item
 * cannot make the derived case wrong; it can only make it longer.
 *
 * ---------------------------------------------------------------------------
 * Name identity is the default; placement exceptions are explicit
 * ---------------------------------------------------------------------------
 *
 * A block's item usually has the same name as the block (`dirt` the block
 * yields `dirt` the item), which is why the intersection is meaningful at all.
 * A small number of vanilla items intentionally use a different name from
 * their placeable block (`redstone_dust` -> `redstone_wire`). Those are
 * vocabulary-level exceptions and live in the two private tables below. A
 * block's breaking drop is a separate concern and still lives in its registry
 * row (`stone` -> `cobblestone`, `grass_block` -> `dirt`,
 * `glowstone` -> `glowstone_dust`).
 *
 * ---------------------------------------------------------------------------
 * The mapping is ONE-DIRECTIONAL, and the types say so
 * ---------------------------------------------------------------------------
 *
 * `itemOfBlock` is PARTIAL: `air` is a sentinel and not a thing (audit §6-6),
 * and `water` / `lava` / `bedrock` / `snow` have no item form in this build.
 * `blockOfPlaceableItem` is TOTAL but only on the placeable-item union, so a caller
 * cannot ask "what block is a stick" without first proving the item is
 * placeable. Neither function accepts the other's input type, and neither
 * union is assignable to the other:
 *
 *   - `ItemType` -> `BlockType` fails on `stick` / `wooden_pickaxe` /
 *     `glowstone_dust`
 *   - `BlockType` -> `ItemType` fails on `air` / `water` / `lava` / `bedrock` /
 *     `snow`
 *
 * `test/item-drops.test.ts` pins both directions with `Exclude`, in the same
 * style `test/clock-and-frame.test.ts` pins `FrameServices`, because "these two
 * string unions do not silently interconvert" is a property that would
 * otherwise quietly stop holding the day one roster grew to swallow the other.
 */
import { BLOCK_TYPES, type BlockType } from './block-type.js'
import { ITEM_TYPES, type ItemType } from './item-type.js'

/**
 * The audit §6-8 intersection plus the explicit vanilla exceptions: an item
 * that can be put back into the world as a block.
 *
 * This is what mx-gameplay's placement rule takes, and what mx-ui's hotbar
 * needs in order to decide whether a slot can render a block preview.
 */
const SPECIAL_BLOCK_BY_ITEM = {
  redstone_dust: 'redstone_wire',
} as const satisfies Partial<Record<ItemType, BlockType>>

const SPECIAL_ITEM_BY_BLOCK = {
  redstone_wire: 'redstone_dust',
} as const satisfies Partial<Record<BlockType, ItemType>>

export type PlaceableItemType = (ItemType & BlockType) | keyof typeof SPECIAL_BLOCK_BY_ITEM

const BLOCK_NAMES: ReadonlySet<string> = new Set<string>(BLOCK_TYPES)
const ITEM_NAMES: ReadonlySet<string> = new Set<string>(ITEM_TYPES)

const specialBlockOfItem = (item: ItemType): BlockType | undefined =>
  SPECIAL_BLOCK_BY_ITEM[item as keyof typeof SPECIAL_BLOCK_BY_ITEM]

const specialItemOfBlock = (block: BlockType): PlaceableItemType | undefined =>
  SPECIAL_ITEM_BY_BLOCK[block as keyof typeof SPECIAL_ITEM_BY_BLOCK]

/** Does this item name a block that can be placed? */
export const isPlaceableItem = (item: ItemType): item is PlaceableItemType =>
  BLOCK_NAMES.has(item) || specialBlockOfItem(item) !== undefined

/** Does this block have an item form at all? */
const isIdentityItemisedBlock = (block: BlockType): block is ItemType & BlockType => ITEM_NAMES.has(block)

/**
 * Every placeable item in `ITEM_TYPES` order, including named placement
 * exceptions whose block has a different name.
 *
 * The replacement for the reference's hand-written `BLOCK_ITEMS`. The
 * identity portion is derived, while the small exception table above is
 * explicit and reviewable.
 */
export const PLACEABLE_ITEM_TYPES: ReadonlyArray<PlaceableItemType> = ITEM_TYPES.filter(isPlaceableItem)

/**
 * Every item with no block form. Small and boring, and the reason `ItemType`
 * is not assignable to `BlockType`.
 */
export const NON_PLACEABLE_ITEM_TYPES: ReadonlyArray<ItemType> = ITEM_TYPES.filter(
  (item) => !isPlaceableItem(item),
)

/**
 * Block -> the item it becomes in an inventory.
 *
 * `undefined` means "this block has no item form", which is a real answer and
 * not a failure: it is what `air` and the fluids are. Callers that are
 * resolving a drop should use `dropOfBlockId` (`./block-registry`) instead,
 * which folds this together with the tool gate and the drop rule.
 */
export function itemOfBlock(block: ItemType & BlockType): PlaceableItemType
export function itemOfBlock(block: BlockType): PlaceableItemType | undefined
export function itemOfBlock(block: BlockType): PlaceableItemType | undefined {
  return specialItemOfBlock(block) ?? (isIdentityItemisedBlock(block) ? block : undefined)
}

/**
 * Every block with no item form.
 *
 * Data a test can assert on, in the same spirit as `UNREGISTERED_BLOCK_TYPES`
 * (`./block-registry`): the gap between the two rosters is allowed to exist,
 * but not to exist silently. A block landing here is a statement that breaking
 * it yields nothing you can carry — which for `air` and the fluids is correct
 * and permanent, and for `snow` is a roster gap (vanilla yields snowballs; the
 * item is not in this build's roster yet).
 */
export const UNITEMISED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (block) => itemOfBlock(block) === undefined,
)

/**
 * Item -> the block it places. TOTAL, but only after placeability is proven.
 *
 * The identity function is the common case, but the explicit table handles
 * differently named items. There is deliberately no `blockOfItem(item:
 * ItemType)` overload — that signature would invite `blockOfItem('stick')`, and
 * answering it would mean either a partial result nobody checks or a lie.
 */
export const blockOfPlaceableItem = (item: PlaceableItemType): BlockType =>
  specialBlockOfItem(item) ?? (item as BlockType)

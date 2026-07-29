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
 * side grows. So everything in this file is computed from `BLOCK_TYPES` and
 * `ITEM_TYPES`, and there is no third roster to forget to update. Adding a
 * block or an item cannot make this file wrong; it can only make it longer.
 *
 * ---------------------------------------------------------------------------
 * Name identity is the bridge; exceptions live in `drops`
 * ---------------------------------------------------------------------------
 *
 * A block's item has the same name as the block (`dirt` the block yields
 * `dirt` the item), which is why the intersection is meaningful at all. That
 * is a modelling decision and it has a fallback: a block whose drop is NOT its
 * own item says so in its `drops` rule (`stone` -> `cobblestone`,
 * `grass_block` -> `dirt`, `glowstone` -> `glowstone_dust`). Per-block
 * exceptions therefore live in the registry row, where every other per-block
 * exception already lives, rather than in a second block->item mapping table
 * that would have to be kept in step with the first.
 *
 * ---------------------------------------------------------------------------
 * The mapping is ONE-DIRECTIONAL, and the types say so
 * ---------------------------------------------------------------------------
 *
 * `itemOfBlock` is PARTIAL: `air` is a sentinel and not a thing (audit §6-6),
 * and `water` / `lava` / `bedrock` / `snow` have no item form in this build.
 * `blockOfPlaceableItem` is TOTAL but only on the intersection, so a caller
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
import type { BlockType } from './block-type.js'
import { BLOCK_TYPES } from './block-type.js'
import type { ItemType } from './item-type.js'
import { ITEM_TYPES } from './item-type.js'

/**
 * The audit §6-8 intersection, solved at the type level: an item that can be
 * put back into the world as a block.
 *
 * This is what mx-gameplay's placement rule takes, and what mx-ui's hotbar
 * needs in order to decide whether a slot can render a block preview.
 */
export type PlaceableItemType = ItemType & BlockType

const BLOCK_NAMES: ReadonlySet<string> = new Set<string>(BLOCK_TYPES)
const ITEM_NAMES: ReadonlySet<string> = new Set<string>(ITEM_TYPES)

/** Does this item name a block that can be placed? */
export const isPlaceableItem = (item: ItemType): item is PlaceableItemType => BLOCK_NAMES.has(item)

/** Does this block have an item form at all? */
const isItemisedBlock = (block: BlockType): block is PlaceableItemType => ITEM_NAMES.has(block)

/**
 * Every item that is also a block, in `ITEM_TYPES` order.
 *
 * The replacement for the reference's hand-written `BLOCK_ITEMS`. It cannot
 * drift, because it is not written down.
 */
export const PLACEABLE_ITEM_TYPES: ReadonlyArray<PlaceableItemType> = ITEM_TYPES.filter(isPlaceableItem)

/**
 * Every item with no block form. Small and boring, and the reason `ItemType`
 * is not assignable to `BlockType`.
 */
export const NON_PLACEABLE_ITEM_TYPES: ReadonlyArray<ItemType> = ITEM_TYPES.filter(
  (item) => !BLOCK_NAMES.has(item),
)

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
  (block) => !ITEM_NAMES.has(block),
)

/**
 * Block -> the item it becomes in an inventory. PARTIAL.
 *
 * `undefined` means "this block has no item form", which is a real answer and
 * not a failure: it is what `air` and the fluids are. Callers that are
 * resolving a drop should use `dropOfBlockId` (`./block-registry`) instead,
 * which folds this together with the tool gate and the drop rule.
 */
export const itemOfBlock = (block: BlockType): PlaceableItemType | undefined =>
  isItemisedBlock(block) ? block : undefined

/**
 * Item -> the block it places. TOTAL, but only on the intersection.
 *
 * The identity function, which is the point: the work is in the type, and the
 * caller had to prove placeability (via `isPlaceableItem`) before it could get
 * here. There is deliberately no `blockOfItem(item: ItemType)` overload — that
 * signature would invite `blockOfItem('stick')`, and answering it would mean
 * either a partial result nobody checks or a lie.
 */
export const blockOfPlaceableItem = (item: PlaceableItemType): BlockType => item

/**
 * Value vocabulary binding a block position to the state attached to it:
 * storage containers, furnaces, brewing stands and signs.
 *
 * `mc-save` serialises chest, sign and furnace contents and depends on
 * `mc-kernel` and nothing else (`docs/architecture.md` §3), so this
 * vocabulary has no other possible home. Runtime validation lives in
 * `./block-entity-validation`; the position-keyed collection and its
 * lookup/update helpers live in `./block-entity`, the public barrel. This
 * module is deliberately data-only, in the same split `./block-property-data`
 * uses.
 */
import type { BrewingState } from './brewing.js'
import type { BlockPosition } from './coordinates.js'
import type { Slot } from './item-stack.js'
import type { FurnaceState } from './smelting.js'
import type { TextComponent } from './text-component.js'

// ---------------------------------------------------------------------------
// Storage container capacities
// ---------------------------------------------------------------------------

/** A single chest. */
export const CHEST_SLOT_COUNT = 27
/** Two chests joined into one inventory. */
export const LARGE_CHEST_SLOT_COUNT = 54
/** A hopper. */
export const HOPPER_SLOT_COUNT = 5
/** A dispenser (3x3). */
export const DISPENSER_SLOT_COUNT = 9
/** A dropper (3x3). */
export const DROPPER_SLOT_COUNT = 9
/** A shulker box, of any colour. */
export const SHULKER_BOX_SLOT_COUNT = 27
/** A barrel. */
export const BARREL_SLOT_COUNT = 27

/** Every plain storage container kind the kernel knows about. */
export const STORAGE_CONTAINER_KINDS = [
  'chest',
  'largeChest',
  'hopper',
  'dispenser',
  'dropper',
  'shulkerBox',
  'barrel',
] as const

export type StorageContainerKind = (typeof STORAGE_CONTAINER_KINDS)[number]

/** The declared capacity for each storage container kind. */
export const STORAGE_CONTAINER_CAPACITIES: Readonly<Record<StorageContainerKind, number>> = {
  chest: CHEST_SLOT_COUNT,
  largeChest: LARGE_CHEST_SLOT_COUNT,
  hopper: HOPPER_SLOT_COUNT,
  dispenser: DISPENSER_SLOT_COUNT,
  dropper: DROPPER_SLOT_COUNT,
  shulkerBox: SHULKER_BOX_SLOT_COUNT,
  barrel: BARREL_SLOT_COUNT,
}

/** A plain storage container: a fixed-capacity array of slots. */
export type StorageContainer = Readonly<{
  kind: StorageContainerKind
  capacity: number
  slots: ReadonlyArray<Slot>
}>

// ---------------------------------------------------------------------------
// Block entities
// ---------------------------------------------------------------------------

/**
 * State attached to a block position. `_tag` is the discriminant —
 * `.oxlintrc.json` allows this one underscore-prefixed name, and
 * `./entity-types.ts` (`EntityTransition`) already uses it the same way.
 */
export type BlockEntity =
  | Readonly<{ _tag: 'StorageContainer'; position: BlockPosition; container: StorageContainer }>
  | Readonly<{ _tag: 'Furnace'; position: BlockPosition; state: FurnaceState }>
  | Readonly<{ _tag: 'BrewingStand'; position: BlockPosition; state: BrewingState }>
  | Readonly<{ _tag: 'Sign'; position: BlockPosition; text: TextComponent }>

/** The `_tag` discriminant of a `BlockEntity`. */
export type BlockEntityTag = BlockEntity['_tag']

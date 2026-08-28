import type { Slot } from './item-stack.js'

export const INVENTORY_SLOT_COUNT = 36

export type Inventory = {
  readonly slots: ReadonlyArray<Slot>
}

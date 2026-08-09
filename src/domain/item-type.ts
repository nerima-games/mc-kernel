/**
 * Closed item vocabulary and runtime guard for untrusted item names.
 * The roster lives in item-type-data.ts; this module owns the logic.
 */

import { ITEM_TYPES } from './item-type-data.js'

export { ITEM_TYPES }

export type ItemType = (typeof ITEM_TYPES)[number]

const ITEM_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(ITEM_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save files,
 * network frames, developer consoles).
 *
 * Same shape as `isBlockType`, and deliberately so — a save file that stores an
 * inventory stores item names, and the two are read on the same path.
 */
export const isItemType = (value: unknown): value is ItemType =>
  typeof value === 'string' && ITEM_TYPE_LOOKUP.has(value)

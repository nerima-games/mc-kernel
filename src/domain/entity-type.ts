/**
 * Closed entity vocabulary and runtime guard for untrusted entity names.
 * The roster lives in entity-type-data.ts; this module owns the logic.
 */

import { ENTITY_TYPES } from './entity-type-data.js'

export { ENTITY_TYPES }

export type EntityType = (typeof ENTITY_TYPES)[number]

const ENTITY_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(ENTITY_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 *
 * Same shape as `isBlockType` and `isItemType`, and deliberately so — a save
 * file that stores entity data stores entity names, and all three are read on
 * the same path.
 */
export const isEntityType = (value: unknown): value is EntityType =>
  typeof value === 'string' && ENTITY_TYPE_LOOKUP.has(value)

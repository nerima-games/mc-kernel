/**
 * Closed block vocabulary and runtime guard for untrusted block names.
 * The roster lives in block-type-data.ts; this module owns the logic.
 */

import { BLOCK_TYPES } from './block-type-data.js'

export { BLOCK_TYPES }

export type BlockType = (typeof BLOCK_TYPES)[number]

const BLOCK_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(BLOCK_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * Files, network frames, developer consoles).
 */
export const isBlockType = (value: unknown): value is BlockType =>
  typeof value === 'string' && BLOCK_TYPE_LOOKUP.has(value)

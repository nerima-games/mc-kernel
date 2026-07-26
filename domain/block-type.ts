/**
 * Block identity.
 *
 * PROVISIONAL AND DELIBERATELY INCOMPLETE. `docs/capability-flag-audit.md` §2
 * counted **120 literals** in the reference implementation's `BlockTypeSchema`
 * (`packages/core/domain/block-type.ts:3-132`); plan.md's "~119" is an
 * approximation of the same number.
 *
 * The subset below exists so that the capability and property mechanisms can be
 * exercised against real, cited cases — in particular the blocks audit §4.9
 * uses to prove that "non-solid" is five independent concepts and not one flag
 * (`glass`, `oak_leaves`, `snow`).
 *
 * Kernel ships no block TABLE (see `./block-definition`), so the roster is a
 * vocabulary only. Completing it to 120 is additive: no consumer's code changes
 * when a literal is added, because behaviour is read from capabilities rather
 * than from the name.
 */

export const BLOCK_TYPES = [
  'air',
  'stone',
  'dirt',
  'grass_block',
  'sand',
  'gravel',
  'water',
  'lava',
  'oak_log',
  'oak_planks',
  'oak_leaves',
  'glass',
  'torch',
  'glowstone',
  'bedrock',
  'piston',
  'snow',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

const BLOCK_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(BLOCK_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 */
export const isBlockType = (value: string): value is BlockType => BLOCK_TYPE_LOOKUP.has(value)

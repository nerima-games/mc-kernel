import { Brand } from 'effect'
import type { BlockDefinition } from './block-definition'

/**
 * The storage encoding of a block inside a chunk buffer.
 *
 * One byte, because the chunk buffer is a `Uint8Array` (16 × 16 × 256 = 65,536
 * bytes per chunk in both the reference implementation and mc-worldgen). The
 * 256-value ceiling is therefore a fact about the chunk format and not a
 * pessimism about the block roster; widening it is a chunk-format migration and
 * belongs to mc-save, not here.
 */
export type BlockId = number & Brand.Brand<'BlockId'>

/** Largest representable id, from the `Uint8Array` chunk buffer. */
export const BLOCK_ID_MAX = 255

export const BlockId = Brand.refined<BlockId>(
  (value) => Number.isInteger(value) && value >= 0 && value <= BLOCK_ID_MAX,
  (value) => Brand.error(`BlockId must be an integer in [0, ${BLOCK_ID_MAX}], received ${value}`),
)

/**
 * Air is id 0, and this is load-bearing rather than conventional.
 *
 * `new Uint8Array(n)` is zero-filled, so a freshly allocated chunk is a chunk
 * full of air with no initialisation pass. mc-worldgen's `emptyBlocks()` and
 * mc-meshing's `emptyChunk()` both rely on it, as does mc-meshing's
 * out-of-bounds `AIR` sentinel (`domain/chunk-view.ts`: an unloaded neighbour
 * meshes as open sky rather than as a black wall).
 */
export const AIR_BLOCK_ID: BlockId = BlockId(0)

/** One row of the table: a permanent id and the definition it names. */
export type BlockRegistryEntry = {
  readonly id: BlockId
  readonly definition: BlockDefinition
}


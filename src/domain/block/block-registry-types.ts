import type { BlockDefinition } from './block-definition.js'
import { Brand } from 'effect'

/**
 * The storage encoding of a block inside a chunk buffer.
 *
 * Two bytes, little-endian — `BlockState`'s `BYTES_PER_ELEMENT`
 * (`block-state.ts`), the v2 wire/storage element width. `BLOCK_ID_MAX` is
 * therefore no longer a fact about storage capacity: storage already
 * addresses every value up to the 16-bit ceiling below. It is now a fact
 * about the registry — the largest id this file lets the registry assign —
 * and raising it further, past that ceiling, would again be a chunk-format
 * migration, because it would need a wider wire element than v2's two bytes.
 */
export type BlockId = number & Brand.Brand<'BlockId'>

/** Largest representable id: the 16-bit ceiling `BlockState`'s wire storage already supports. */
export const BLOCK_ID_MAX = 0xffff
const BLOCK_ID_MIN = 0

export const BlockId: Brand.Brand.Constructor<BlockId> = Brand.refined<BlockId>(
  (value) => Number.isInteger(value) && value >= BLOCK_ID_MIN && value <= BLOCK_ID_MAX,
  (value) => Brand.error(`BlockId must be an integer in [0, ${BLOCK_ID_MAX}], received ${value}`),
)

const blockId = BlockId

/**
 * Air is id 0, and this is load-bearing rather than conventional.
 *
 * `new Uint8Array(n)` is zero-filled, so a freshly allocated chunk is a chunk
 * full of air with no initialisation pass. mc-worldgen's `emptyBlocks()` and
 * mc-meshing's `emptyChunk()` both rely on it, as does mc-meshing's
 * out-of-bounds `AIR` sentinel (`domain/chunk-view.ts`: an unloaded neighbour
 * meshes as open sky rather than as a black wall).
 */
export const AIR_BLOCK_ID: BlockId = blockId(BLOCK_ID_MIN)

/** Tests the zero-byte air sentinel without a registry lookup. */
export const isEmpty = (id: number): boolean => id === AIR_BLOCK_ID

/** One row of the table: a permanent id and the definition it names. */
export type BlockRegistryEntry = {
  readonly id: BlockId
  readonly definition: BlockDefinition
}

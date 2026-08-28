import { BLOCK_IDS, BLOCK_ID_MAX, isKnownBlockId } from './block-registry.js'
import { BlockId } from './block-registry-types.js'

const MIN_INDEX = 0
const INDEX_INCREMENT = 1
const LAST_INDEX_OFFSET = 1
const BLOCK_ID_ENABLED = 1

// Raw chunk bytes are already bounded integers.
// Generic number checks and resolved-object lookups would slow the validation hot path.
// Derive the table from the canonical registry so removed block ids remain invalid.
const KNOWN_BLOCK_ID_TABLE = new Uint8Array(BLOCK_ID_MAX + INDEX_INCREMENT)
for (const blockId of BLOCK_IDS) {
  KNOWN_BLOCK_ID_TABLE[blockId] = BLOCK_ID_ENABLED
}

const assertIndex = (index: number, length: number): void => {
  if (!Number.isInteger(index) || index < MIN_INDEX || index >= length) {
    throw new RangeError(
      `Block state index must be an integer in [${MIN_INDEX}, ${length - LAST_INDEX_OFFSET}], received ${index}`,
    )
  }
}

const assertKnownBlockId = (blockId: number, index: number): void => {
  if (!isKnownBlockId(blockId)) {
    throw new RangeError(`Block state contains unknown block id ${blockId} at index ${index}`)
  }
}

const assertCopyRange = (targetLength: number, sourceLength: number, offset: number): void => {
  if (!Number.isInteger(offset) || offset < MIN_INDEX || offset + sourceLength > targetLength) {
    throw new RangeError(
      `Block state copy range must fit target at offset ${offset}, target length ${targetLength}, source length ${sourceLength}`,
    )
  }
}

/** An owned, registry-validated block buffer with checked mutation boundaries. */
export class BlockState {
  readonly #bytes: Uint8Array
  readonly #view: DataView

  static fromBytes(bytes: Uint8Array): BlockState {
    const ownedBytes = bytes.slice()
    for (const [index, blockId] of bytes.entries()) {
      if (KNOWN_BLOCK_ID_TABLE[blockId] !== BLOCK_ID_ENABLED) {
        throw new RangeError(`Block state contains unknown block id ${blockId} at index ${index}`)
      }
    }
    return new BlockState(ownedBytes)
  }

  private constructor(bytes: Uint8Array) {
    this.#bytes = bytes
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    // Prevent runtime callers from shadowing the derived length getter.
    Object.freeze(this)
  }

  get length(): number {
    return this.#bytes.length
  }

  /** Read a known block id at a checked linear index. */
  get(index: number): BlockId {
    assertIndex(index, this.length)
    return BlockId(this.#view.getUint8(index))
  }

  /** Replace a block id after checking both the index and registry membership. */
  set(index: number, blockId: BlockId): void {
    assertIndex(index, this.length)
    assertKnownBlockId(blockId, index)
    this.#bytes[index] = blockId
  }

  /** Copy the complete state out without exposing the owned buffer. */
  toBytes(): Uint8Array {
    return this.#bytes.slice()
  }

  /** Copy the state into a caller-owned destination without an element scan. */
  copyTo(target: Uint8Array, offset: number = MIN_INDEX): void {
    assertCopyRange(target.length, this.length, offset)
    target.set(this.#bytes, offset)
  }
}

/** Validate a raw chunk buffer once, then retain an owned copy behind BlockState. */
export const blockState = (bytes: Uint8Array): BlockState => BlockState.fromBytes(bytes)

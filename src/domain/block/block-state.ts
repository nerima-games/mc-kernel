import { BLOCK_IDS, BLOCK_ID_MAX, isKnownBlockId } from './block-registry.js'
import { BlockId } from './block-registry-types.js'

const MIN_INDEX = 0
const INDEX_INCREMENT = 1
const LAST_INDEX_OFFSET = 1
const BLOCK_ID_ENABLED = 1

/**
 * Bytes reserved per stored element, little-endian. Exported so a caller
 * that owns a destination buffer (`copyTo`) or that is sizing one from an
 * element count can compute the byte length itself instead of hardcoding
 * the width: `elementCount * BYTES_PER_ELEMENT`, never `elementCount` alone.
 * A destination sized by element count fits half the required bytes and
 * `copyTo` rejects it with a range error rather than truncating silently.
 */
export const BYTES_PER_ELEMENT = 2

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
  // The owned buffer is BYTE-addressed wire storage: BYTES_PER_ELEMENT bytes
  // per element, little-endian. `length` divides it back down to elements.
  readonly #bytes: Uint8Array
  readonly #view: DataView

  /**
   * Construct from one plain id per array slot (the legacy/friendly shape:
   * each byte, 0-255, is a whole element). Every byte is widened into its own
   * 16-bit slot in the owned buffer, which is how a version-1 chunk payload
   * becomes storage-compatible with a version-2 one without a value mapping.
   */
  static fromBytes(bytes: Uint8Array): BlockState {
    const widened = new Uint8Array(bytes.length * BYTES_PER_ELEMENT)
    const widenedView = new DataView(widened.buffer)
    for (const [index, blockId] of bytes.entries()) {
      if (KNOWN_BLOCK_ID_TABLE[blockId] !== BLOCK_ID_ENABLED) {
        throw new RangeError(`Block state contains unknown block id ${blockId} at index ${index}`)
      }
      widenedView.setUint16(index * BYTES_PER_ELEMENT, blockId, true)
    }
    return new BlockState(widened)
  }

  /**
   * Construct from a wire-byte payload that is already in the owned
   * buffer's native shape: BYTES_PER_ELEMENT bytes per element,
   * little-endian, one full-width element per slot (the v2 wire shape).
   * Every element's complete value is read and registry-checked before
   * adoption, so a value that does not name a known block id is rejected as
   * itself — never narrowed into a single byte first and reinterpreted as a
   * different, possibly valid, id. `elementCount` bounds how many elements
   * are read; trailing bytes beyond `elementCount * BYTES_PER_ELEMENT` are
   * ignored rather than validated.
   */
  static fromElementBytes(payload: Uint8Array, elementCount: number): BlockState {
    const owned = payload.slice(MIN_INDEX, elementCount * BYTES_PER_ELEMENT)
    const view = new DataView(owned.buffer, owned.byteOffset, owned.byteLength)
    for (let index = MIN_INDEX; index < elementCount; index += INDEX_INCREMENT) {
      const value = view.getUint16(index * BYTES_PER_ELEMENT, true)
      if (KNOWN_BLOCK_ID_TABLE[value] !== BLOCK_ID_ENABLED) {
        throw new RangeError(`Block state contains unknown block id ${value} at index ${index}`)
      }
    }
    return new BlockState(owned)
  }

  private constructor(bytes: Uint8Array) {
    this.#bytes = bytes
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    // Prevent runtime callers from shadowing the derived length getter.
    Object.freeze(this)
  }

  get length(): number {
    return this.#bytes.length / BYTES_PER_ELEMENT
  }

  /** Read a known block id at a checked linear index. */
  get(index: number): BlockId {
    assertIndex(index, this.length)
    return BlockId(this.#view.getUint16(index * BYTES_PER_ELEMENT, true))
  }

  /** Replace a block id after checking both the index and registry membership. */
  set(index: number, blockId: BlockId): void {
    assertIndex(index, this.length)
    assertKnownBlockId(blockId, index)
    this.#view.setUint16(index * BYTES_PER_ELEMENT, blockId, true)
  }

  /**
   * Copy the complete state out as raw wire bytes: `this.length *
   * BYTES_PER_ELEMENT` bytes, BYTES_PER_ELEMENT per element, little-endian —
   * not one entry per element. A caller that wants an element view reads it
   * back through `get`; this method exists to hand a byte buffer straight to
   * a wire-format writer, and returning a `Uint16Array` here would silently
   * truncate on assignment into any `Uint8Array` destination (see
   * `copyTo`).
   */
  toBytes(): Uint8Array {
    return this.#bytes.slice()
  }

  /**
   * Copy the wire-byte state into a caller-owned destination without an
   * element scan. `target` must hold `this.length * BYTES_PER_ELEMENT`
   * bytes at `offset` — sizing it by element count alone fits half the
   * required bytes; `assertCopyRange` rejects that with a `RangeError`
   * instead of writing a truncated copy.
   */
  copyTo(target: Uint8Array, offset: number = MIN_INDEX): void {
    assertCopyRange(target.length, this.#bytes.length, offset)
    target.set(this.#bytes, offset)
  }
}

/** Validate a raw chunk buffer once, then retain an owned copy behind BlockState. */
export const blockState = (bytes: Uint8Array): BlockState => BlockState.fromBytes(bytes)

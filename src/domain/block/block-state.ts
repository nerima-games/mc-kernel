import { Brand, Result } from 'effect'
import { BLOCK_IDS, BLOCK_ID_MAX } from './block-registry.js'
import { BlockId } from './block-registry-types.js'

const MIN_INDEX = 0
const INDEX_INCREMENT = 1
const LAST_INDEX_OFFSET = 1
const BLOCK_ID_ENABLED = 1

/** Number of block elements held by one state buffer. */
export type BlockStateLength = number & Brand.Brand<'BlockStateLength'>
export const BlockStateLength: Brand.Constructor<BlockStateLength> = Brand.make<BlockStateLength>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0
      ? true
      : `BlockStateLength must be a non-negative safe integer, received ${value}`,
)

/** Zero-based block element index in a state buffer. */
export type BlockStateIndex = number & Brand.Brand<'BlockStateIndex'>
export const BlockStateIndex: Brand.Constructor<BlockStateIndex> = Brand.make<BlockStateIndex>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0
      ? true
      : `BlockStateIndex must be a non-negative safe integer, received ${value}`,
)

/** Zero-based byte offset into a block-state wire buffer. */
export type BlockStateByteOffset = number & Brand.Brand<'BlockStateByteOffset'>
export const BlockStateByteOffset: Brand.Constructor<BlockStateByteOffset> =
  Brand.make<BlockStateByteOffset>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `BlockStateByteOffset must be a non-negative safe integer, received ${value}`,
  )

/**
 * Bytes reserved per stored element, little-endian. Exported so a caller
 * that owns a destination buffer (`copyTo`) or that is sizing one from an
 * element count can compute the byte length itself instead of hardcoding
 * the width: `elementCount * BYTES_PER_ELEMENT`, never `elementCount` alone.
 * A destination sized by element count fits half the required bytes and
 * `copyTo` returns a failure rather than truncating silently.
 */
export const BYTES_PER_ELEMENT = 2

// Raw chunk bytes are already bounded integers.
// Generic number checks and resolved-object lookups would slow the validation hot path.
// Derive the table from the canonical registry so removed block ids remain invalid.
const KNOWN_BLOCK_ID_TABLE = new Uint8Array(BLOCK_ID_MAX + INDEX_INCREMENT)
for (const blockId of BLOCK_IDS) {
  KNOWN_BLOCK_ID_TABLE[blockId] = BLOCK_ID_ENABLED
}

export type BlockStateFailure = {
  readonly _tag: 'BlockStateFailure'
  readonly reason: 'invalid-index' | 'unknown-block-id' | 'invalid-copy-range' | 'invalid-element-count'
  readonly message: string
}

const failureValue = (
  reason: BlockStateFailure['reason'],
  message: string,
): BlockStateFailure => ({ _tag: 'BlockStateFailure', reason, message })

const failure = (
  reason: BlockStateFailure['reason'],
  message: string,
): Result.Result<never, BlockStateFailure> => Result.fail(failureValue(reason, message))

const validateIndex = (index: number, length: number): Result.Result<number, BlockStateFailure> => {
  if (!Number.isInteger(index) || index < MIN_INDEX || index >= length) {
    return failure(
      'invalid-index',
      `Block state index must be an integer in [${MIN_INDEX}, ${length - LAST_INDEX_OFFSET}], received ${index}`,
    )
  }
  return Result.succeed(index)
}

const validateKnownBlockId = (id: number, index: number): Result.Result<BlockId, BlockStateFailure> =>
  Result.flatMap(
    Result.mapError(
      BlockId.result(id),
      () => failureValue('unknown-block-id', `Block state contains unknown block id ${id} at index ${index}`),
    ),
    (blockId) => KNOWN_BLOCK_ID_TABLE[blockId] === BLOCK_ID_ENABLED
      ? Result.succeed(blockId)
      : failure('unknown-block-id', `Block state contains unknown block id ${blockId} at index ${index}`),
  )

const validateCopyRange = (
  targetLength: number,
  sourceLength: number,
  offset: number,
): Result.Result<void, BlockStateFailure> => {
  if (!Number.isInteger(offset) || offset < MIN_INDEX || offset + sourceLength > targetLength) {
    return failure(
      'invalid-copy-range',
      `Block state copy range must fit target at offset ${offset}, target length ${targetLength}, source length ${sourceLength}`,
    )
  }
  return Result.succeed(undefined)
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
  static fromBytes(bytes: Uint8Array): Result.Result<BlockState, BlockStateFailure> {
    const widened = new Uint8Array(bytes.length * BYTES_PER_ELEMENT)
    const widenedView = new DataView(widened.buffer)
    for (const [index, blockId] of bytes.entries()) {
      if (KNOWN_BLOCK_ID_TABLE[blockId] !== BLOCK_ID_ENABLED) {
        return failure('unknown-block-id', `Block state contains unknown block id ${blockId} at index ${index}`)
      }
      widenedView.setUint16(index * BYTES_PER_ELEMENT, blockId, true)
    }
    return Result.succeed(new BlockState(widened))
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
  static fromElementBytes(
    payload: Uint8Array,
    elementCount: BlockStateLength,
  ): Result.Result<BlockState, BlockStateFailure> {
    return Result.flatMap(
      Result.mapError(
        BlockStateLength.result(elementCount),
        () => failureValue(
          'invalid-element-count',
          `Block state element count must be a non-negative safe integer, received ${elementCount}`,
        ),
      ),
      (validatedElementCount) => {
        if (payload.length < validatedElementCount * BYTES_PER_ELEMENT) {
          return failure(
            'invalid-element-count',
            `Block state element payload must contain ${validatedElementCount * BYTES_PER_ELEMENT} bytes, received ${payload.length}`,
          )
        }
        const owned = payload.slice(MIN_INDEX, validatedElementCount * BYTES_PER_ELEMENT)
        const view = new DataView(owned.buffer, owned.byteOffset, owned.byteLength)
        for (let index = MIN_INDEX; index < validatedElementCount; index += INDEX_INCREMENT) {
          const value = view.getUint16(index * BYTES_PER_ELEMENT, true)
          if (KNOWN_BLOCK_ID_TABLE[value] !== BLOCK_ID_ENABLED) {
            return failure('unknown-block-id', `Block state contains unknown block id ${value} at index ${index}`)
          }
        }
        return Result.succeed(new BlockState(owned))
      }
    )
  }

  private constructor(bytes: Uint8Array) {
    this.#bytes = bytes
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    // Prevent runtime callers from shadowing the derived length getter.
    Object.freeze(this)
  }

  get length(): BlockStateLength {
    return BlockStateLength(this.#bytes.length / BYTES_PER_ELEMENT)
  }

  /** Read a known block id at a checked linear index. */
  get(index: BlockStateIndex): Result.Result<BlockId, BlockStateFailure> {
    return Result.flatMap(validateIndex(index, this.length), (checkedIndex) => {
      const value = this.#view.getUint16(checkedIndex * BYTES_PER_ELEMENT, true)
      return validateKnownBlockId(value, checkedIndex)
    })
  }

  /** Replace a block id after checking both the index and registry membership. */
  set(index: BlockStateIndex, blockId: BlockId): Result.Result<void, BlockStateFailure> {
    return Result.flatMap(validateIndex(index, this.length), (checkedIndex) =>
      Result.map(validateKnownBlockId(blockId, checkedIndex), (checkedBlockId) => {
        this.#view.setUint16(checkedIndex * BYTES_PER_ELEMENT, checkedBlockId, true)
      }),
    )
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
   * required bytes, so the returned failure prevents a truncated copy.
   */
  copyTo(
    target: Uint8Array,
    offset: BlockStateByteOffset = BlockStateByteOffset(MIN_INDEX),
  ): Result.Result<void, BlockStateFailure> {
    return Result.map(validateCopyRange(target.length, this.#bytes.length, offset), () => {
      target.set(this.#bytes, offset)
    })
  }
}

/** Validate a raw chunk buffer once, then retain an owned copy behind BlockState. */
export const blockState = (bytes: Uint8Array): Result.Result<BlockState, BlockStateFailure> =>
  BlockState.fromBytes(bytes)

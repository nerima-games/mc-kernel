/* eslint-disable max-statements, no-magic-numbers -- Constants define the fixed binary wire format. */
import { Brand, Result } from 'effect'
import {
  BlockState,
  BlockStateByteOffset,
  BlockStateLength,
  blockState,
  type BlockStateFailure,
} from '../block/block-state.js'
import { CHUNK_SIZE_XZ, ChunkAxis, type ChunkCoord } from '../coordinates/coordinates.js'
import { chunkCoordFromAxes } from '../coordinates/coordinate-primitives.js'

/** Legacy 8-bit-per-block payload. Still decodable; never encoded again. */
const CHUNK_CODEC_VERSION_V1 = 1
export const CHUNK_CODEC_VERSION = 2
export const CHUNK_HEADER_BYTES = 24
export const MAX_CHUNK_HEIGHT = 0xffff

/** Bytes per block element on the wire, keyed by codec version. */
const CHUNK_BLOCK_ELEMENT_BYTES_V1 = 1
const CHUNK_BLOCK_ELEMENT_BYTES_V2 = 2

const MAGIC = [0x4d, 0x43, 0x48, 0x4b] as const // MCHK
const MAX_INT32 = 0x7fffffff
const MIN_INT32 = -0x80000000

/**
 * The payload-length header field (offset 20) is a BYTE count, not an
 * element count. Under the retired 8-bit-per-element v1 format the two
 * numbers were identical, which let the field's meaning stay implicit; v2's
 * 16-bit elements make byte count and element count diverge, so this
 * function is the single place that decides which one the field is and
 * every reader/writer of offset 20 goes through it.
 */
export type ChunkFailure = {
  readonly _tag: 'ChunkFailure'
  readonly reason:
    | 'invalid-height'
    | 'invalid-coordinate'
    | 'invalid-block-state'
    | 'invalid-block-count'
    | 'truncated-header'
    | 'invalid-magic'
    | 'unsupported-version'
    | 'invalid-dimensions'
    | 'invalid-payload-length'
    | 'invalid-chunk-shape'
  readonly message: string
}

const failure = (
  reason: ChunkFailure['reason'],
  message: string,
): Result.Result<never, ChunkFailure> => Result.fail({ _tag: 'ChunkFailure', reason, message })

const bytesPerBlockElement = (version: number): Result.Result<number, ChunkFailure> => {
  if (version === CHUNK_CODEC_VERSION_V1) {
    return Result.succeed(CHUNK_BLOCK_ELEMENT_BYTES_V1)
  }
  if (version === CHUNK_CODEC_VERSION) {
    return Result.succeed(CHUNK_BLOCK_ELEMENT_BYTES_V2)
  }
  return failure('unsupported-version', `Unsupported chunk codec version ${version}`)
}

/** Vertical block count of a chunk column. Integer in [1, MAX_CHUNK_HEIGHT]. */
export type ChunkHeight = number & Brand.Brand<'ChunkHeight'>
export type ChunkLocalY = number & Brand.Brand<'ChunkLocalY'>
export type ChunkBlockCount = number & Brand.Brand<'ChunkBlockCount'>
export type ChunkBlocks = BlockState & Brand.Brand<'ChunkBlocks'>
const brandChunkBlocks = Brand.nominal<ChunkBlocks>()
type ReadonlyByteArray = Omit<
  Uint8Array,
  | 'buffer'
  | 'byteLength'
  | 'byteOffset'
  | 'copyWithin'
  | 'fill'
  | 'reverse'
  | 'set'
  | 'sort'
  | 'subarray'
> & {
  readonly [index: number]: number
}
export type EncodedChunk = ReadonlyByteArray & Brand.Brand<'EncodedChunk'>
const brandEncodedChunk = Brand.nominal<EncodedChunk>()

type EncodedChunkInput = Uint8Array | EncodedChunk
type RecordValue = Readonly<Record<string, unknown>>

type ValidatedEncodedChunk = {
  readonly encoded: Uint8Array
  readonly height: ChunkHeight
  readonly version: number
  readonly view: DataView
}

const ChunkHeightBrand = Brand.nominal<ChunkHeight>()

export const ChunkLocalY: Brand.Constructor<ChunkLocalY> = Brand.make<ChunkLocalY>(
  (value) =>
    Number.isInteger(value) && value >= 0 && value < MAX_CHUNK_HEIGHT
      ? true
      : `ChunkLocalY must be an integer in [0, ${MAX_CHUNK_HEIGHT - 1}], received ${value}`,
)

const chunkBlockCountBrand = Brand.make<ChunkBlockCount>(
  (value) =>
    Number.isSafeInteger(value) &&
    value >= CHUNK_SIZE_XZ * CHUNK_SIZE_XZ &&
    value <= CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * MAX_CHUNK_HEIGHT &&
    value % (CHUNK_SIZE_XZ * CHUNK_SIZE_XZ) === 0
      ? true
      : `ChunkBlockCount must be a positive multiple of ${CHUNK_SIZE_XZ * CHUNK_SIZE_XZ} in [${CHUNK_SIZE_XZ * CHUNK_SIZE_XZ}, ${CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * MAX_CHUNK_HEIGHT}], received ${value}`,
)

export const ChunkBlockCount: Brand.Constructor<ChunkBlockCount> = chunkBlockCountBrand

export const ChunkHeight = (value: number): Result.Result<ChunkHeight, ChunkFailure> => {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_CHUNK_HEIGHT) {
    return failure('invalid-height', `Chunk height must be an integer in [1, ${MAX_CHUNK_HEIGHT}], received ${value}`)
  }
  return Result.succeed(ChunkHeightBrand(value))
}

/** A complete vertical chunk column, stored x-major then z-major then y-major. */
export type Chunk = {
  readonly coord: ChunkCoord
  readonly height: ChunkHeight
  readonly blocks: ChunkBlocks
}

export const chunkBlockCount = (height: ChunkHeight): ChunkBlockCount =>
  ChunkBlockCount(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height)

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validateCoord = (value: unknown, name: 'cx' | 'cz'): Result.Result<number, ChunkFailure> => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_INT32 ||
    value > MAX_INT32
  ) {
    return failure('invalid-coordinate', `Chunk ${name} must fit a signed 32-bit integer, received ${value}`)
  }
  return Result.succeed(value)
}

const validateBlocks = (blocks: unknown, height: ChunkHeight): Result.Result<BlockState, ChunkFailure> => {
  if (!(blocks instanceof BlockState)) {
    return failure('invalid-block-state', 'Chunk blocks must be a BlockState')
  }
  const expected = chunkBlockCount(height)
  if (Number(blocks.length) !== Number(expected)) {
    return failure('invalid-block-count', `Chunk block data length must be ${expected}, received ${blocks.length}`)
  }
  return Result.succeed(blocks)
}

export const ChunkBlocks = (
  height: ChunkHeight,
  blocks: Uint8Array,
): Result.Result<ChunkBlocks, ChunkFailure | BlockStateFailure> =>
  Result.gen(function* () {
    const validatedHeight = yield* ChunkHeight(height)
    const expected = chunkBlockCount(validatedHeight)
    if (blocks.length !== expected) {
      return yield* failure('invalid-block-count', `Chunk block data length must be ${expected}, received ${blocks.length}`)
    }
    return brandChunkBlocks(yield* blockState(blocks))
  })

const chunkBlocksFromValidatedHeight = (
  blocks: Uint8Array,
): Result.Result<ChunkBlocks, BlockStateFailure> =>
  Result.map(blockState(blocks), brandChunkBlocks)

const validateEncodedChunk = (
  encoded: Uint8Array,
): Result.Result<ValidatedEncodedChunk, ChunkFailure> =>
  Result.gen(function* () {
    if (encoded.length < CHUNK_HEADER_BYTES) {
      return yield* failure('truncated-header', `Chunk data is shorter than the ${CHUNK_HEADER_BYTES}-byte header`)
    }
    if (
      encoded[0] !== MAGIC[0] ||
      encoded[1] !== MAGIC[1] ||
      encoded[2] !== MAGIC[2] ||
      encoded[3] !== MAGIC[3]
    ) {
      return yield* failure('invalid-magic', 'Invalid chunk magic')
    }

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
    const version = view.getUint16(4, true)
    const elementBytes = yield* bytesPerBlockElement(version)
    const width = view.getUint16(6, true)
    const depth = view.getUint16(8, true)
    if (width !== CHUNK_SIZE_XZ || depth !== CHUNK_SIZE_XZ) {
      return yield* failure(
        'invalid-dimensions',
        `Invalid chunk dimensions ${width}x${depth}; expected ${CHUNK_SIZE_XZ}x${CHUNK_SIZE_XZ}`,
      )
    }

    const height = yield* ChunkHeight(view.getUint16(10, true))
    const payloadLength = view.getUint32(20, true)
    const expected = chunkBlockCount(height) * elementBytes
    if (payloadLength !== expected) {
      return yield* failure('invalid-payload-length', `Chunk payload length must be ${expected}, header declares ${payloadLength}`)
    }
    if (encoded.length !== CHUNK_HEADER_BYTES + payloadLength) {
      return yield* failure(
        'invalid-payload-length',
        `Chunk encoded length must be ${CHUNK_HEADER_BYTES + payloadLength}, received ${encoded.length}`,
      )
    }

    return { encoded, height, version, view }
  })

const mutableBytesOf = (encoded: EncodedChunkInput): Uint8Array =>
  encoded instanceof Uint8Array ? encoded : encoded.slice()

export const EncodedChunk = (encoded: EncodedChunkInput): Result.Result<EncodedChunk, ChunkFailure> =>
  Result.map(validateEncodedChunk(mutableBytesOf(encoded)), ({ encoded: validated }) =>
    brandEncodedChunk(validated.slice()),
  )

const validatedChunk = (coord: ChunkCoord, height: ChunkHeight, blocks: ChunkBlocks): Chunk => ({
  blocks,
  coord,
  height,
})

type EncodableChunk = {
  readonly coord: {
    readonly cx: number
    readonly cz: number
  }
  readonly height: ChunkHeight
  readonly blocks: BlockState
}

const validateChunkForEncoding = (
  value: unknown,
): Result.Result<EncodableChunk, ChunkFailure> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* failure('invalid-chunk-shape', 'Chunk must be an object')
    }

    const coord = value['coord']
    if (!isRecord(coord)) {
      return yield* failure('invalid-chunk-shape', 'Chunk coordinate must be an object')
    }

    const rawHeight = value['height']
    if (typeof rawHeight !== 'number') {
      return yield* failure('invalid-height', `Chunk height must be a number, received ${rawHeight}`)
    }

    const height = yield* ChunkHeight(rawHeight)
    return {
      blocks: yield* validateBlocks(value['blocks'], height),
      coord: {
        cx: yield* validateCoord(coord['cx'], 'cx'),
        cz: yield* validateCoord(coord['cz'], 'cz'),
      },
      height,
    }
  })

/** Construct a validated chunk without retaining the caller's mutable buffer. */
export const chunk = (
  coord: ChunkCoord,
  height: ChunkHeight,
  blocks: Uint8Array,
): Result.Result<Chunk, ChunkFailure | BlockStateFailure> =>
  Result.gen(function* () {
    const cx = yield* validateCoord(coord.cx, 'cx')
    const cz = yield* validateCoord(coord.cz, 'cz')
    const validatedHeight = yield* ChunkHeight(height)
    const validatedBlocks = yield* ChunkBlocks(validatedHeight, blocks)
    return validatedChunk(
      chunkCoordFromAxes(ChunkAxis(cx), ChunkAxis(cz)),
      validatedHeight,
      validatedBlocks,
    )
  })

/** Encode a chunk into the versioned little-endian kernel wire format. */
export function encodeChunk(value: Chunk): Result.Result<EncodedChunk, ChunkFailure | BlockStateFailure>
export function encodeChunk(value: Chunk): Result.Result<EncodedChunk, ChunkFailure | BlockStateFailure> {
  return Result.gen(function* () {
    const { blocks, coord, height } = yield* validateChunkForEncoding(value)

    // blocks.copyTo speaks wire bytes directly (CHUNK_BLOCK_ELEMENT_BYTES_V2
    // bytes per element, little-endian), so the payload length in bytes is
    // blocks.length times that width, not blocks.length itself.
    const payloadLength = blocks.length * CHUNK_BLOCK_ELEMENT_BYTES_V2
    const encoded = new Uint8Array(CHUNK_HEADER_BYTES + payloadLength)
    encoded.set(MAGIC, 0)
    const view = new DataView(encoded.buffer)
    view.setUint16(4, CHUNK_CODEC_VERSION, true)
    view.setUint16(6, CHUNK_SIZE_XZ, true)
    view.setUint16(8, CHUNK_SIZE_XZ, true)
    view.setUint16(10, height, true)
    view.setInt32(12, coord.cx, true)
    view.setInt32(16, coord.cz, true)
    view.setUint32(20, payloadLength, true)
    yield* blocks.copyTo(encoded, BlockStateByteOffset(CHUNK_HEADER_BYTES))
    // Every wire field was written from validated inputs; avoid revalidating this fresh buffer.
    return brandEncodedChunk(encoded)
  })
}

/** Decode and validate a chunk. Trailing bytes and unknown registry ids are corruption. */
export const decodeChunk = (
  encoded: EncodedChunkInput,
): Result.Result<Chunk, ChunkFailure | BlockStateFailure> =>
  Result.gen(function* () {
    const { encoded: validated, height, version, view } = yield* validateEncodedChunk(mutableBytesOf(encoded))
    const payload = validated.subarray(CHUNK_HEADER_BYTES)
    const blocks =
      version === CHUNK_CODEC_VERSION_V1
        ? yield* chunkBlocksFromValidatedHeight(payload)
        : brandChunkBlocks(yield* BlockState.fromElementBytes(payload, BlockStateLength(chunkBlockCount(height))))

    return validatedChunk(
      chunkCoordFromAxes(ChunkAxis(view.getInt32(12, true)), ChunkAxis(view.getInt32(16, true))),
      height,
      blocks,
    )
  })

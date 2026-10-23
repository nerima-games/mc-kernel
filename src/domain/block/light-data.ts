/* eslint-disable no-magic-numbers -- Constants define the fixed binary wire format, mirroring src/domain/chunk.ts. */
import { Brand, Result } from 'effect'
import { isLightLevel, LightLevel } from './block-property-data.js'
import { MAX_CHUNK_HEIGHT } from '../world/chunk.js'
import type { LocalBlockCoord } from '../coordinates/coordinate-conversions.js'
import { CHUNK_SIZE_XZ } from '../coordinates/coordinate-primitives.js'

export const LIGHT_VOLUME_CODEC_VERSION = 1
export const LIGHT_VOLUME_HEADER_BYTES = 16

const MAGIC = [0x4d, 0x43, 0x4c, 0x54] as const // MCLT
const CHANNEL_COUNT = 2

const MIN_VOLUME_HEIGHT = 1
// A light volume describes exactly one chunk column's vertical extent, so its
// upper bound is Chunk's, not an independently maintained duplicate. Also
// matches the header's uint16 height field, which is why it stays <= 0xffff.
const MAX_VOLUME_HEIGHT = MAX_CHUNK_HEIGHT

/** Vertical block count of the single-chunk-column light volume. */
export type LightVolumeHeight = number & Brand.Brand<'LightVolumeHeight'>

/** Number of byte-sized cells in a light channel. */
export type LightChannelLength = number & Brand.Brand<'LightChannelLength'>
export const LightChannelLength: Brand.Constructor<LightChannelLength> = Brand.make<LightChannelLength>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0
      ? true
      : `LightChannelLength must be a non-negative safe integer, received ${value}`,
)

/** Zero-based light-channel cell offset. */
export type LightChannelIndex = number & Brand.Brand<'LightChannelIndex'>
export const LightChannelIndex: Brand.Constructor<LightChannelIndex> = Brand.make<LightChannelIndex>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0
      ? true
      : `LightChannelIndex must be a non-negative safe integer, received ${value}`,
)

/** Zero-based byte offset when copying a light channel into a wire buffer. */
export type LightChannelByteOffset = number & Brand.Brand<'LightChannelByteOffset'>
export const LightChannelByteOffset: Brand.Constructor<LightChannelByteOffset> =
  Brand.make<LightChannelByteOffset>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `LightChannelByteOffset must be a non-negative safe integer, received ${value}`,
  )

const lightVolumeHeightMessage = (value: number): string =>
  `Light volume height must be an integer in [${MIN_VOLUME_HEIGHT}, ${MAX_VOLUME_HEIGHT}], received ${value}`

const LightVolumeHeightBrand = Brand.make<LightVolumeHeight>(
  (value) =>
    Number.isInteger(value) && value >= MIN_VOLUME_HEIGHT && value <= MAX_VOLUME_HEIGHT
      ? true
      : lightVolumeHeightMessage(value),
)

export type LightVolumeFailure = {
  readonly _tag: 'LightVolumeFailure'
  readonly reason:
    | 'invalid-height'
    | 'invalid-index'
    | 'invalid-channel-value'
    | 'invalid-copy-range'
    | 'invalid-channel-length'
    | 'truncated-header'
    | 'invalid-magic'
    | 'unsupported-version'
    | 'invalid-dimensions'
    | 'invalid-payload-length'
  readonly message: string
}

const failure = (
  reason: LightVolumeFailure['reason'],
  message: string,
): Result.Result<never, LightVolumeFailure> => Result.fail({ _tag: 'LightVolumeFailure', reason, message })

export const LightVolumeHeight = (value: number): Result.Result<LightVolumeHeight, LightVolumeFailure> => {
  if (!Number.isInteger(value) || value < MIN_VOLUME_HEIGHT || value > MAX_VOLUME_HEIGHT) {
    return failure('invalid-height', lightVolumeHeightMessage(value))
  }
  return Result.succeed(LightVolumeHeightBrand(value))
}

export const lightVolumeCellCount = (height: LightVolumeHeight): LightChannelLength =>
  LightChannelLength(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height)

const indexOfAxes = (height: number, lx: number, ly: number, lz: number): number =>
  (lx * CHUNK_SIZE_XZ + lz) * height + ly

/** The linear offset of a chunk-local cell, stored x-major then z-major then y-major. */
export const lightVolumeIndexOf = (
  height: LightVolumeHeight,
  local: LocalBlockCoord,
): Result.Result<LightChannelIndex, LightVolumeFailure> => {
  if (!Number.isInteger(local.ly) || local.ly < 0 || local.ly >= height) {
    return failure('invalid-index', `Light volume y must be an integer in [0, ${height - 1}], received ${local.ly}`)
  }
  return Result.succeed(LightChannelIndex(indexOfAxes(height, local.lx, local.ly, local.lz)))
}

/** An owned, range-validated 0..15 light channel for one chunk column. */
export class LightChannel {
  readonly #bytes: Uint8Array
  readonly #view: DataView

  static fromBytes(bytes: Uint8Array): Result.Result<LightChannel, LightVolumeFailure> {
    const owned = bytes.slice()
    for (const [index, value] of owned.entries()) {
      if (!isLightLevel(value)) {
        return failure('invalid-channel-value', `Light channel contains an out-of-range value ${value} at index ${index}`)
      }
    }
    return Result.succeed(new LightChannel(owned))
  }

  private constructor(bytes: Uint8Array) {
    this.#bytes = bytes
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    Object.freeze(this)
  }

  get length(): LightChannelLength {
    return LightChannelLength(this.#bytes.length)
  }

  /** Read a validated light level at a checked linear index. */
  at(index: LightChannelIndex): Result.Result<LightLevel, LightVolumeFailure> {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) {
      return failure('invalid-index', `Light channel index must be an integer in [0, ${this.length - 1}], received ${index}`)
    }
    return Result.succeed(LightLevel(this.#view.getUint8(index)))
  }

  /** Copy the channel out without exposing the owned buffer. */
  toBytes(): Uint8Array {
    return this.#bytes.slice()
  }

  /** Copy the channel into a caller-owned destination without an element scan. */
  copyTo(
    target: Uint8Array,
    offset: LightChannelByteOffset = LightChannelByteOffset(0),
  ): Result.Result<void, LightVolumeFailure> {
    if (!Number.isInteger(offset) || offset < 0 || offset + this.length > target.length) {
      return failure('invalid-copy-range', `Light channel copy range must fit target at offset ${offset}`)
    }
    target.set(this.#bytes, offset)
    return Result.succeed(undefined)
  }
}

export const lightChannel = (bytes: Uint8Array): Result.Result<LightChannel, LightVolumeFailure> =>
  LightChannel.fromBytes(bytes)

/**
 * The settled two-channel light state for one chunk column: block light
 * (from emissive blocks) and sky light (from open sky / neighbouring chunks).
 * Deliberately kept out of `chunk.ts`'s codec, matching how `fluid-state.ts`
 * and `redstone-state.ts` hold derived per-cell state outside `Chunk`.
 */
export type LightVolume = {
  readonly height: LightVolumeHeight
  readonly blockLight: LightChannel
  readonly skyLight: LightChannel
}

const validateChannelLength = (bytes: Uint8Array, expected: number): Result.Result<void, LightVolumeFailure> => {
  if (bytes.length !== expected) {
    return failure('invalid-channel-length', `Light channel length must be ${expected}, received ${bytes.length}`)
  }
  return Result.succeed(undefined)
}

/** Construct a validated light volume without retaining the caller's mutable buffers. */
export const lightVolume = (
  height: LightVolumeHeight,
  blockLight: Uint8Array,
  skyLight: Uint8Array,
): Result.Result<LightVolume, LightVolumeFailure> =>
  Result.gen(function* () {
    const validatedHeight = yield* LightVolumeHeight(height)
    const expected = lightVolumeCellCount(validatedHeight)
    yield* validateChannelLength(blockLight, expected)
    yield* validateChannelLength(skyLight, expected)
    return {
      height: validatedHeight,
      blockLight: yield* lightChannel(blockLight),
      skyLight: yield* lightChannel(skyLight),
    }
  })

export const blockLightAt = (
  volume: LightVolume,
  local: LocalBlockCoord,
): Result.Result<LightLevel, LightVolumeFailure> =>
  Result.flatMap(lightVolumeIndexOf(volume.height, local), (index) => volume.blockLight.at(index))

export const skyLightAt = (
  volume: LightVolume,
  local: LocalBlockCoord,
): Result.Result<LightLevel, LightVolumeFailure> =>
  Result.flatMap(lightVolumeIndexOf(volume.height, local), (index) => volume.skyLight.at(index))

/** Encode a light volume into the versioned little-endian kernel wire format. */
export const encodeLightVolume = (
  volume: LightVolume,
): Result.Result<Uint8Array, LightVolumeFailure> => {
  const cellCount = lightVolumeCellCount(volume.height)
  const payloadLength = cellCount * CHANNEL_COUNT
  const encoded = new Uint8Array(LIGHT_VOLUME_HEADER_BYTES + payloadLength)
  encoded.set(MAGIC, 0)
  const view = new DataView(encoded.buffer)
  view.setUint16(4, LIGHT_VOLUME_CODEC_VERSION, true)
  view.setUint16(6, CHUNK_SIZE_XZ, true)
  view.setUint16(8, CHUNK_SIZE_XZ, true)
  view.setUint16(10, volume.height, true)
  view.setUint32(12, payloadLength, true)
  return Result.flatMap(
    volume.blockLight.copyTo(encoded, LightChannelByteOffset(LIGHT_VOLUME_HEADER_BYTES)),
    () => Result.map(
      volume.skyLight.copyTo(encoded, LightChannelByteOffset(LIGHT_VOLUME_HEADER_BYTES + cellCount)),
      () => encoded,
    ),
  )
}

/** Decode and validate a light volume. Truncated buffers and wrong magic are corruption. */
export const decodeLightVolume = (encoded: Uint8Array): Result.Result<LightVolume, LightVolumeFailure> => {
  if (encoded.length < LIGHT_VOLUME_HEADER_BYTES) {
    return failure('truncated-header', `Light volume data is shorter than the ${LIGHT_VOLUME_HEADER_BYTES}-byte header`)
  }
  if (
    encoded[0] !== MAGIC[0] ||
    encoded[1] !== MAGIC[1] ||
    encoded[2] !== MAGIC[2] ||
    encoded[3] !== MAGIC[3]
  ) {
    return failure('invalid-magic', 'Invalid light volume magic')
  }

  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
  const version = view.getUint16(4, true)
  if (version !== LIGHT_VOLUME_CODEC_VERSION) {
    return failure('unsupported-version', `Unsupported light volume codec version ${version}`)
  }
  const width = view.getUint16(6, true)
  const depth = view.getUint16(8, true)
  if (width !== CHUNK_SIZE_XZ || depth !== CHUNK_SIZE_XZ) {
    return failure(
      'invalid-dimensions',
      `Invalid light volume dimensions ${width}x${depth}; expected ${CHUNK_SIZE_XZ}x${CHUNK_SIZE_XZ}`,
    )
  }

  const validatedHeight = LightVolumeHeight(view.getUint16(10, true))
  if (Result.isFailure(validatedHeight)) return Result.fail(validatedHeight.failure)
  const height = validatedHeight.success
  const payloadLength = view.getUint32(12, true)
  const cellCount = lightVolumeCellCount(height)
  const expectedPayload = cellCount * CHANNEL_COUNT
  if (payloadLength !== expectedPayload) {
    return failure('invalid-payload-length', `Light volume payload length must be ${expectedPayload}, header declares ${payloadLength}`)
  }
  if (encoded.length !== LIGHT_VOLUME_HEADER_BYTES + payloadLength) {
    return failure(
      'invalid-payload-length',
      `Light volume encoded length must be ${LIGHT_VOLUME_HEADER_BYTES + payloadLength}, received ${encoded.length}`,
    )
  }

  const blockLightBytes = encoded.subarray(LIGHT_VOLUME_HEADER_BYTES, LIGHT_VOLUME_HEADER_BYTES + cellCount)
  const skyLightBytes = encoded.subarray(
    LIGHT_VOLUME_HEADER_BYTES + cellCount,
    LIGHT_VOLUME_HEADER_BYTES + payloadLength,
  )

  return lightVolume(height, blockLightBytes, skyLightBytes)
}

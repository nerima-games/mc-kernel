/* eslint-disable no-magic-numbers -- Constants define the fixed binary wire format, mirroring src/domain/chunk.ts. */
import { Brand } from 'effect'
import { isLightLevel, LightLevel } from './block-property-data.js'
import { MAX_CHUNK_HEIGHT } from './chunk.js'
import type { LocalBlockCoord } from './coordinate-conversions.js'
import { CHUNK_SIZE_XZ } from './coordinate-primitives.js'

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

const lightVolumeHeightMessage = (value: number): string =>
  `Light volume height must be an integer in [${MIN_VOLUME_HEIGHT}, ${MAX_VOLUME_HEIGHT}], received ${value}`

const LightVolumeHeightBrand = Brand.refined<LightVolumeHeight>(
  (value): value is LightVolumeHeight =>
    Number.isInteger(value) && value >= MIN_VOLUME_HEIGHT && value <= MAX_VOLUME_HEIGHT,
  (value) => Brand.error(lightVolumeHeightMessage(value)),
)

/** Validate and brand a light volume height, normalising Effect's raw throw into a real RangeError. */
export const LightVolumeHeight = (value: number): LightVolumeHeight => {
  try {
    return LightVolumeHeightBrand(value)
  } catch {
    throw new RangeError(lightVolumeHeightMessage(value))
  }
}

export const lightVolumeCellCount = (height: LightVolumeHeight): number =>
  CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height

const indexOfAxes = (height: number, lx: number, ly: number, lz: number): number =>
  (lx * CHUNK_SIZE_XZ + lz) * height + ly

/** The linear offset of a chunk-local cell, stored x-major then z-major then y-major. */
export const lightVolumeIndexOf = (height: LightVolumeHeight, local: LocalBlockCoord): number => {
  if (!Number.isInteger(local.ly) || local.ly < 0 || local.ly >= height) {
    throw new RangeError(`Light volume y must be an integer in [0, ${height - 1}], received ${local.ly}`)
  }
  return indexOfAxes(height, local.lx, local.ly, local.lz)
}

/** An owned, range-validated 0..15 light channel for one chunk column. */
export class LightChannel {
  readonly #bytes: Uint8Array
  readonly #view: DataView

  static fromBytes(bytes: Uint8Array): LightChannel {
    const owned = bytes.slice()
    for (const [index, value] of owned.entries()) {
      if (!isLightLevel(value)) {
        throw new RangeError(`Light channel contains an out-of-range value ${value} at index ${index}`)
      }
    }
    return new LightChannel(owned)
  }

  private constructor(bytes: Uint8Array) {
    this.#bytes = bytes
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    Object.freeze(this)
  }

  get length(): number {
    return this.#bytes.length
  }

  /** Read a validated light level at a checked linear index. */
  at(index: number): LightLevel {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) {
      throw new RangeError(`Light channel index must be an integer in [0, ${this.length - 1}], received ${index}`)
    }
    return LightLevel(this.#view.getUint8(index))
  }

  /** Copy the channel out without exposing the owned buffer. */
  toBytes(): Uint8Array {
    return this.#bytes.slice()
  }

  /** Copy the channel into a caller-owned destination without an element scan. */
  copyTo(target: Uint8Array, offset: number = 0): void {
    if (!Number.isInteger(offset) || offset < 0 || offset + this.length > target.length) {
      throw new RangeError(`Light channel copy range must fit target at offset ${offset}`)
    }
    target.set(this.#bytes, offset)
  }
}

export const lightChannel = (bytes: Uint8Array): LightChannel => LightChannel.fromBytes(bytes)

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

const assertChannelLength = (bytes: Uint8Array, expected: number): void => {
  if (bytes.length !== expected) {
    throw new RangeError(`Light channel length must be ${expected}, received ${bytes.length}`)
  }
}

/** Construct a validated light volume without retaining the caller's mutable buffers. */
export const lightVolume = (
  height: number,
  blockLight: Uint8Array,
  skyLight: Uint8Array,
): LightVolume => {
  const validatedHeight = LightVolumeHeight(height)
  const expected = lightVolumeCellCount(validatedHeight)
  assertChannelLength(blockLight, expected)
  assertChannelLength(skyLight, expected)
  return {
    height: validatedHeight,
    blockLight: lightChannel(blockLight),
    skyLight: lightChannel(skyLight),
  }
}

export const blockLightAt = (volume: LightVolume, local: LocalBlockCoord): LightLevel =>
  volume.blockLight.at(lightVolumeIndexOf(volume.height, local))

export const skyLightAt = (volume: LightVolume, local: LocalBlockCoord): LightLevel =>
  volume.skyLight.at(lightVolumeIndexOf(volume.height, local))

/** Encode a light volume into the versioned little-endian kernel wire format. */
export const encodeLightVolume = (volume: LightVolume): Uint8Array => {
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
  volume.blockLight.copyTo(encoded, LIGHT_VOLUME_HEADER_BYTES)
  volume.skyLight.copyTo(encoded, LIGHT_VOLUME_HEADER_BYTES + cellCount)
  return encoded
}

/** Decode and validate a light volume. Truncated buffers and wrong magic are corruption. */
export const decodeLightVolume = (encoded: Uint8Array): LightVolume => {
  if (encoded.length < LIGHT_VOLUME_HEADER_BYTES) {
    throw new RangeError(`Light volume data is shorter than the ${LIGHT_VOLUME_HEADER_BYTES}-byte header`)
  }
  if (
    encoded[0] !== MAGIC[0] ||
    encoded[1] !== MAGIC[1] ||
    encoded[2] !== MAGIC[2] ||
    encoded[3] !== MAGIC[3]
  ) {
    throw new Error('Invalid light volume magic')
  }

  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
  const version = view.getUint16(4, true)
  if (version !== LIGHT_VOLUME_CODEC_VERSION) {
    throw new Error(`Unsupported light volume codec version ${version}`)
  }
  const width = view.getUint16(6, true)
  const depth = view.getUint16(8, true)
  if (width !== CHUNK_SIZE_XZ || depth !== CHUNK_SIZE_XZ) {
    throw new Error(`Invalid light volume dimensions ${width}x${depth}; expected ${CHUNK_SIZE_XZ}x${CHUNK_SIZE_XZ}`)
  }

  const height = LightVolumeHeight(view.getUint16(10, true))
  const payloadLength = view.getUint32(12, true)
  const cellCount = lightVolumeCellCount(height)
  const expectedPayload = cellCount * CHANNEL_COUNT
  if (payloadLength !== expectedPayload) {
    throw new RangeError(`Light volume payload length must be ${expectedPayload}, header declares ${payloadLength}`)
  }
  if (encoded.length !== LIGHT_VOLUME_HEADER_BYTES + payloadLength) {
    throw new RangeError(
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

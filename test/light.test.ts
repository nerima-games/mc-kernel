/* eslint-disable no-magic-numbers -- Exercises the fixed binary wire format's byte offsets, mirroring test/chunk.test.ts. */
import { describe, expect, it } from 'vitest'
import { Result } from 'effect'
import type { LightVolumeFailure } from '../src/domain/block/light'
import {
  LightVolumeHeight as lightVolumeHeightResult,
  blockLightAt as blockLightAtResult,
  decodeLightVolume as decodeLightVolumeResult,
  encodeLightVolume as encodeLightVolumeResult,
  lightChannel as lightChannelResult,
  lightVolume as lightVolumeResult,
  lightVolumeIndexOf as lightVolumeIndexOfResult,
  skyLightAt as skyLightAtResult,
} from '../src/domain/block/light'
import { MAX_CHUNK_HEIGHT } from '../src/domain/world/chunk'
import { BlockAxis, CHUNK_SIZE_XZ, LocalAxis } from '../src/domain/coordinates/coordinate-primitives'
import type { LocalBlockCoord } from '../src/domain/coordinates/coordinate-conversions'
import {
  LIGHT_VOLUME_CODEC_VERSION,
  LIGHT_VOLUME_HEADER_BYTES,
  LightChannelByteOffset,
  LightChannelIndex,
  LightChannelLength,
} from '../src/domain/block/light'
import { resultFailure, resultValue } from './block-result-helpers'

const LightVolumeHeight = (value: number) => resultValue(lightVolumeHeightResult(value))
const blockLightAt = (...args: Parameters<typeof blockLightAtResult>) => resultValue(blockLightAtResult(...args))
const decodeLightVolume = (bytes: Uint8Array) => resultValue(decodeLightVolumeResult(bytes))
const encodeLightVolume = (...args: Parameters<typeof encodeLightVolumeResult>) => resultValue(encodeLightVolumeResult(...args))
const lightChannel = (...args: Parameters<typeof lightChannelResult>) => resultValue(lightChannelResult(...args))
const lightVolume = (...args: Parameters<typeof lightVolumeResult>) => resultValue(lightVolumeResult(...args))
const lightVolumeIndexOf = (...args: Parameters<typeof lightVolumeIndexOfResult>) => resultValue(lightVolumeIndexOfResult(...args))
const skyLightAt = (...args: Parameters<typeof skyLightAtResult>) => resultValue(skyLightAtResult(...args))
const expectLightFailure = (
  result: Result.Result<unknown, LightVolumeFailure>,
  reason: LightVolumeFailure['reason'],
  message: string | RegExp,
) => {
  const failure = resultFailure(result)
  expect(failure).toMatchObject({ _tag: 'LightVolumeFailure', reason })
  if (message instanceof RegExp) expect(failure.message).toMatch(message)
  else expect(failure.message).toBe(message)
}

const at = (lx: number, ly: number, lz: number): LocalBlockCoord => ({
  lx: LocalAxis(lx),
  ly: BlockAxis(ly),
  lz: LocalAxis(lz),
})

describe('light volume construction and bounds', () => {
  it('validates non-negative safe light-channel lengths, indexes, and byte offsets', () => {
    expect(LightChannelLength(0)).toBe(0)
    expect(LightChannelLength(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(LightChannelIndex(0)).toBe(0)
    expect(LightChannelIndex(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(LightChannelByteOffset(0)).toBe(0)
    expect(LightChannelByteOffset(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)

    expect(() => LightChannelLength(-1)).toThrow()
    expect(() => LightChannelLength(1.5)).toThrow()
    expect(() => LightChannelLength(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(() => LightChannelIndex(-1)).toThrow()
    expect(() => LightChannelIndex(1.5)).toThrow()
    expect(() => LightChannelByteOffset(-1)).toThrow()
    expect(() => LightChannelByteOffset(1.5)).toThrow()
  })

  it('rejects an invalid volume height', () => {
    expectLightFailure(lightVolumeHeightResult(0), 'invalid-height', /height/)
    expectLightFailure(lightVolumeHeightResult(1.5), 'invalid-height', /height/)
    expectLightFailure(lightVolumeHeightResult(0x10000), 'invalid-height', /height/)
  })

  it('rejects a channel whose length does not match the declared height', () => {
    expectLightFailure(
      lightVolumeResult(LightVolumeHeight(1), new Uint8Array(10), new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ)),
      'invalid-channel-length',
      `Light channel length must be ${CHUNK_SIZE_XZ * CHUNK_SIZE_XZ}, received 10`,
    )
  })

  it('rejects an out-of-range light value in a channel', () => {
    expectLightFailure(lightChannelResult(new Uint8Array([16])), 'invalid-channel-value', /out-of-range value 16 at index 0/)
  })

  it('rejects an out-of-range channel index', () => {
    const channel = lightChannel(new Uint8Array(4))
    expect(resultValue(channel.at(LightChannelIndex(0)))).toBe(0)
    for (const index of [-1, 1.5, 4]) {
      expectLightFailure(
        Reflect.apply(channel.at, channel, [index]),
        'invalid-index',
        /index must be an integer/,
      )
    }
    expectLightFailure(channel.at(LightChannelIndex(4)), 'invalid-index', /index must be an integer/)
  })

  it('copies channel bytes without exposing its owned buffer', () => {
    const channel = lightChannel(new Uint8Array([2, 7]))
    const bytes = channel.toBytes()

    expect(bytes).toStrictEqual(new Uint8Array([2, 7]))
    bytes[0] = 9
    expect(resultValue(channel.at(LightChannelIndex(0)))).toBe(2)
  })

  it('rejects a copy that does not fit the destination', () => {
    const channel = lightChannel(new Uint8Array(4))
    expectLightFailure(channel.copyTo(new Uint8Array(2)), 'invalid-copy-range', /copy range/)
    expectLightFailure(
      Reflect.apply(channel.copyTo, channel, [new Uint8Array(10), -1]),
      'invalid-copy-range',
      /copy range/,
    )
    expectLightFailure(
      Reflect.apply(channel.copyTo, channel, [new Uint8Array(10), 1.5]),
      'invalid-copy-range',
      /copy range/,
    )
    expectLightFailure(
      channel.copyTo(new Uint8Array(10), LightChannelByteOffset(7)),
      'invalid-copy-range',
      /copy range/,
    )
  })

  it('rejects a chunk-local y outside the declared height', () => {
    const height = LightVolumeHeight(1)
    expectLightFailure(lightVolumeIndexOfResult(height, at(0, 5, 0)), 'invalid-index', /y must be an integer/)
    expect(lightVolumeIndexOf(LightVolumeHeight(2), at(1, 1, 2))).toBe(37)
  })

  it('accepts a light volume height up to the chunk column height bound and rejects one beyond it', () => {
    // A light volume describes exactly one chunk column's vertical extent, so
    // its upper bound must track Chunk's rather than an independently
    // maintained duplicate. This fails if the two bounds ever diverge.
    expect(resultValue(lightVolumeHeightResult(MAX_CHUNK_HEIGHT))).toBe(MAX_CHUNK_HEIGHT)
    expectLightFailure(lightVolumeHeightResult(MAX_CHUNK_HEIGHT + 1), 'invalid-height', /height/)
  })
})

describe('light volume binary codec', () => {
  it('writes the fixed header fields', () => {
    const volume = lightVolume(
      LightVolumeHeight(1),
      new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ),
      new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ),
    )
    const encoded = encodeLightVolume(volume)
    const view = new DataView(encoded.slice().buffer)

    expect(new TextDecoder().decode(encoded.slice(0, 4))).toBe('MCLT')
    expect(view.getUint16(4, true)).toBe(LIGHT_VOLUME_CODEC_VERSION)
    expect(view.getUint16(6, true)).toBe(CHUNK_SIZE_XZ)
    expect(view.getUint16(8, true)).toBe(CHUNK_SIZE_XZ)
    expect(view.getUint16(10, true)).toBe(1)
    expect(view.getUint32(12, true)).toBe(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * 2)
  })

  it('rejects damaged headers and payloads explicitly', () => {
    const valid = encodeLightVolume(lightVolume(
      LightVolumeHeight(1),
      new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ),
      new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ),
    ))
    const corrupt = (offset: number, value: number): Uint8Array => {
      const result = valid.slice()
      result[offset] = value
      return result
    }

    expectLightFailure(decodeLightVolumeResult(valid.slice(0, LIGHT_VOLUME_HEADER_BYTES - 1)), 'truncated-header', /header/)
    expectLightFailure(decodeLightVolumeResult(corrupt(0, 0)), 'invalid-magic', /magic/)
    expectLightFailure(decodeLightVolumeResult(corrupt(4, LIGHT_VOLUME_CODEC_VERSION + 1)), 'unsupported-version', /version/)
    expectLightFailure(decodeLightVolumeResult(corrupt(6, CHUNK_SIZE_XZ - 1)), 'invalid-dimensions', /dimensions/)
    expectLightFailure(decodeLightVolumeResult(corrupt(10, 0)), 'invalid-height', /height/)
    expectLightFailure(decodeLightVolumeResult(corrupt(12, 1)), 'invalid-payload-length', /payload length/)
    expectLightFailure(decodeLightVolumeResult(Uint8Array.from([...valid, 0])), 'invalid-payload-length', /encoded length/)
  })

  it('decodes a payload built directly from the wire format specification, not from encodeLightVolume', () => {
    // Built by hand from the spec (mirrors test/chunk.test.ts's v1-payload
    // test): a round trip through encodeLightVolume/decodeLightVolume alone
    // cannot prove the wire format, because a bug that swaps the block-light
    // and sky-light channel write order in the encoder and the matching read
    // order in the decoder cancels out and every round-trip assertion still
    // passes. This test's expected bytes come from the header/payload layout
    // documented above encodeLightVolume, never from calling it.
    const height = 1
    const cellCount = CHUNK_SIZE_XZ * CHUNK_SIZE_XZ
    const payloadLength = cellCount * 2
    const encoded = new Uint8Array(LIGHT_VOLUME_HEADER_BYTES + payloadLength)
    const view = new DataView(encoded.buffer)

    encoded.set([0x4d, 0x43, 0x4c, 0x54], 0) // magic 'MCLT'
    view.setUint16(4, LIGHT_VOLUME_CODEC_VERSION, true)
    view.setUint16(6, CHUNK_SIZE_XZ, true)
    view.setUint16(8, CHUNK_SIZE_XZ, true)
    view.setUint16(10, height, true)
    view.setUint32(12, payloadLength, true)

    // Cell (0,0,0) is index 0; cell (2,0,3) is index (2*16+3)*1+0 = 35.
    const cellZeroIndex = 0
    const cellOtherIndex = 35
    const blockLightOffset = LIGHT_VOLUME_HEADER_BYTES
    const skyLightOffset = LIGHT_VOLUME_HEADER_BYTES + cellCount
    view.setUint8(blockLightOffset + cellZeroIndex, 7)
    view.setUint8(skyLightOffset + cellZeroIndex, 9)
    view.setUint8(blockLightOffset + cellOtherIndex, 5)
    view.setUint8(skyLightOffset + cellOtherIndex, 12)

    const decoded = decodeLightVolume(encoded)

    expect(decoded.height).toBe(height)
    expect(blockLightAt(decoded, at(0, 0, 0))).toBe(7)
    expect(skyLightAt(decoded, at(0, 0, 0))).toBe(9)
    expect(blockLightAt(decoded, at(2, 0, 3))).toBe(5)
    expect(skyLightAt(decoded, at(2, 0, 3))).toBe(12)
  })
})

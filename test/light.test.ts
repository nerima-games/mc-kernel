/* eslint-disable no-magic-numbers -- Exercises the fixed binary wire format's byte offsets, mirroring test/chunk.test.ts. */
import { describe, expect, it } from 'vitest'
import { LightLevel } from '../src/domain/block-property-data'
import { MAX_CHUNK_HEIGHT } from '../src/domain/chunk'
import { BlockAxis, CHUNK_SIZE_XZ, LocalAxis } from '../src/domain/coordinate-primitives'
import type { LocalBlockCoord } from '../src/domain/coordinate-conversions'
import {
  LIGHT_VOLUME_CODEC_VERSION,
  LIGHT_VOLUME_HEADER_BYTES,
  LightVolumeHeight,
  blockLightAt,
  decodeLightVolume,
  encodeLightVolume,
  lightChannel,
  lightVolume,
  lightVolumeIndexOf,
  skyLightAt,
  updateLight,
  type LightVolumeSource,
} from '../src/domain/light'

const at = (lx: number, ly: number, lz: number): LocalBlockCoord => ({
  lx: LocalAxis(lx),
  ly: BlockAxis(ly),
  lz: LocalAxis(lz),
})

const sourceWithOpaqueAt = (blockers: ReadonlyArray<LocalBlockCoord>): LightVolumeSource => {
  const blocked = new Set(blockers.map((local) => `${local.lx},${local.ly},${local.lz}`))
  return (local) => ({
    lightEmission: local.lx === 0 && local.ly === 0 && local.lz === 0 ? LightLevel(15) : LightLevel(0),
    opacity: blocked.has(`${local.lx},${local.ly},${local.lz}`) ? 'opaque' : 'transparentSolid',
  })
}

describe('light volume propagation', () => {
  it('decreases by exactly one per cell of distance and reaches zero at the right radius', () => {
    const source = sourceWithOpaqueAt([])
    const volume = updateLight(1, source)

    for (let lz = 0; lz < CHUNK_SIZE_XZ; lz += 1) {
      const expected = Math.max(15 - lz, 0)
      expect(blockLightAt(volume, at(0, 0, lz))).toBe(expected)
    }
  })

  it('blocks propagation at an opaque cell, leaving the far side darker than a same-distance neighbour', () => {
    const source = sourceWithOpaqueAt([at(1, 0, 0)])
    const volume = updateLight(1, source)

    const behind = blockLightAt(volume, at(2, 0, 0))
    const beside = blockLightAt(volume, at(1, 0, 1))

    expect(behind).toBeLessThan(beside)
  })

  it('attenuates by an extra step when entering a fluid cell', () => {
    const source: LightVolumeSource = (local) => ({
      lightEmission: local.lx === 0 && local.ly === 0 && local.lz === 0 ? LightLevel(15) : LightLevel(0),
      opacity: local.lx === 1 && local.ly === 0 && local.lz === 0 ? 'fluid' : 'transparentSolid',
    })
    const volume = updateLight(1, source)

    expect(blockLightAt(volume, at(1, 0, 0))).toBe(13)
  })

  it('seeds sky light from chunk-boundary input and lets it decay inward', () => {
    const dark: LightVolumeSource = () => ({ lightEmission: LightLevel(0), opacity: 'transparentSolid' })
    const volume = updateLight(1, dark, {
      blockLight: [{ local: at(0, 0, 0), level: LightLevel(4) }],
      skyLight: [{ local: at(0, 0, 0), level: LightLevel(10) }],
    })

    expect(blockLightAt(volume, at(0, 0, 0))).toBe(4)
    expect(skyLightAt(volume, at(0, 0, 0))).toBe(10)
    expect(skyLightAt(volume, at(0, 0, 1))).toBe(9)
  })

  it('is deterministic across repeated runs of the same input', () => {
    const source = sourceWithOpaqueAt([at(1, 0, 0)])
    const first = updateLight(2, source)
    const second = updateLight(2, source)

    expect(Array.from(first.blockLight.toBytes())).toStrictEqual(Array.from(second.blockLight.toBytes()))
    expect(Array.from(first.skyLight.toBytes())).toStrictEqual(Array.from(second.skyLight.toBytes()))
  })
})

describe('light volume construction and bounds', () => {
  it('rejects an invalid volume height', () => {
    expect(() => LightVolumeHeight(0)).toThrow(RangeError)
    expect(() => LightVolumeHeight(1.5)).toThrow(RangeError)
    expect(() => LightVolumeHeight(0x10000)).toThrow(RangeError)
  })

  it('rejects a channel whose length does not match the declared height', () => {
    expect(() => lightVolume(1, new Uint8Array(10), new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ))).toThrow(
      RangeError,
    )
  })

  it('rejects an out-of-range light value in a channel', () => {
    expect(() => lightChannel(new Uint8Array([16]))).toThrow(RangeError)
  })

  it('rejects an out-of-range channel index', () => {
    const channel = lightChannel(new Uint8Array(4))
    expect(() => channel.at(-1)).toThrow(RangeError)
    expect(() => channel.at(1.5)).toThrow(RangeError)
    expect(() => channel.at(4)).toThrow(RangeError)
  })

  it('rejects a copy that does not fit the destination', () => {
    const channel = lightChannel(new Uint8Array(4))
    expect(() => channel.copyTo(new Uint8Array(2))).toThrow(RangeError)
    expect(() => channel.copyTo(new Uint8Array(10), -1)).toThrow(RangeError)
    expect(() => channel.copyTo(new Uint8Array(10), 1.5)).toThrow(RangeError)
  })

  it('rejects a chunk-local y outside the declared height', () => {
    const height = LightVolumeHeight(1)
    expect(() => lightVolumeIndexOf(height, at(0, 5, 0))).toThrow(RangeError)
  })

  it('accepts a light volume height up to the chunk column height bound and rejects one beyond it', () => {
    // A light volume describes exactly one chunk column's vertical extent, so
    // its upper bound must track Chunk's rather than an independently
    // maintained duplicate. This fails if the two bounds ever diverge.
    expect(() => LightVolumeHeight(MAX_CHUNK_HEIGHT)).not.toThrow()
    expect(() => LightVolumeHeight(MAX_CHUNK_HEIGHT + 1)).toThrow()
  })
})

describe('light volume binary codec', () => {
  it('round-trips a light volume exactly', () => {
    const source = sourceWithOpaqueAt([at(1, 0, 0)])
    const volume = updateLight(2, source, {
      skyLight: [{ local: at(15, 0, 15), level: LightLevel(12) }],
    })

    const decoded = decodeLightVolume(encodeLightVolume(volume))

    expect(decoded.height).toBe(volume.height)
    expect(Array.from(decoded.blockLight.toBytes())).toStrictEqual(Array.from(volume.blockLight.toBytes()))
    expect(Array.from(decoded.skyLight.toBytes())).toStrictEqual(Array.from(volume.skyLight.toBytes()))
  })

  it('writes the fixed header fields', () => {
    const volume = updateLight(1, sourceWithOpaqueAt([]))
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
    const valid = encodeLightVolume(updateLight(1, sourceWithOpaqueAt([])))
    const corrupt = (offset: number, value: number): Uint8Array => {
      const result = valid.slice()
      result[offset] = value
      return result
    }

    expect(() => decodeLightVolume(valid.slice(0, LIGHT_VOLUME_HEADER_BYTES - 1))).toThrow(/header/)
    expect(() => decodeLightVolume(corrupt(0, 0))).toThrow(/magic/)
    expect(() => decodeLightVolume(corrupt(4, LIGHT_VOLUME_CODEC_VERSION + 1))).toThrow(/version/)
    expect(() => decodeLightVolume(corrupt(6, CHUNK_SIZE_XZ - 1))).toThrow(/dimensions/)
    expect(() => decodeLightVolume(corrupt(10, 0))).toThrow(/height/)
    expect(() => decodeLightVolume(corrupt(12, 1))).toThrow(/payload length/)
    expect(() => decodeLightVolume(Uint8Array.from([...valid, 0]))).toThrow(/encoded length/)
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

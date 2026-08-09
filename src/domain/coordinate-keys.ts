import { Brand } from 'effect'

import {
  blockAxis,
  blockPositionFromAxes,
  chunkAxis,
  chunkCoordFromAxes,
  normalizeZero,
  type BlockAxis,
  type BlockPosition,
  type ChunkAxis,
  type ChunkCoord,
} from './coordinate-primitives.js'

const ZERO = 0
const UNIT_STEP = 1
const NO_INDEX = -1

const canonicalIntegerText = (value: number): string => String(normalizeZero(value))

const hasCanonicalIntegerText = (texts: ReadonlyArray<string>, values: ReadonlyArray<number>): boolean =>
  values.every((coordinate, index) => Number.isSafeInteger(coordinate) && texts[index] === canonicalIntegerText(coordinate))

/** The canonical wire/key representation of a block position: `x,y,z`. */
export type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>

type ParsedBlockPositionKey = readonly [x: BlockAxis, y: BlockAxis, z: BlockAxis]

const parseBlockPositionKey = (value: string): ParsedBlockPositionKey | undefined => {
  const firstComma = value.indexOf(',')
  const secondComma = value.indexOf(',', firstComma + UNIT_STEP)

  if (
    firstComma <= ZERO ||
    secondComma <= firstComma + UNIT_STEP ||
    secondComma === value.length - UNIT_STEP ||
    value.indexOf(',', secondComma + UNIT_STEP) !== NO_INDEX
  ) {
    return undefined
  }

  const texts = [
    value.slice(ZERO, firstComma),
    value.slice(firstComma + UNIT_STEP, secondComma),
    value.slice(secondComma + UNIT_STEP),
  ] as const
  const coordinates = [Number(texts[ZERO]), Number(texts[UNIT_STEP]), Number(texts[2])] as const

  if (!hasCanonicalIntegerText(texts, coordinates)) {
    return undefined
  }

  return [
    blockAxis(normalizeZero(coordinates[ZERO])),
    blockAxis(normalizeZero(coordinates[UNIT_STEP])),
    blockAxis(normalizeZero(coordinates[2])),
  ]
}

/** Serialize a block position into its canonical, allocation-minimal key. */
export const blockPositionKeyOf = (value: BlockPosition): BlockPositionKey =>
  `${String(value.x)},${String(value.y)},${String(value.z)}` as BlockPositionKey

/** Validate external text before it becomes a branded block-position key. */
export const BlockPositionKey = (value: string): BlockPositionKey => {
  if (parseBlockPositionKey(value) === undefined) {
    throw new TypeError(`Invalid BlockPositionKey: ${value}`)
  }

  return value as BlockPositionKey
}

/** Narrow an external string after validating its complete canonical format. */
export const isBlockPositionKey = (value: string): value is BlockPositionKey => parseBlockPositionKey(value) !== undefined

/** Recover a block position from a key that has already been validated. */
export const blockPositionOfKey = (value: BlockPositionKey): BlockPosition => {
  const parsed = parseBlockPositionKey(value)
  if (parsed === undefined) {
    throw new TypeError(`Invalid BlockPositionKey: ${value}`)
  }

  return blockPositionFromAxes(...parsed)
}

/** Decode untrusted storage or network input without allowing invalid axes in. */
export const decodeBlockPositionKey = (value: string): BlockPosition | undefined => {
  const parsed = parseBlockPositionKey(value)
  return parsed === undefined ? undefined : blockPositionFromAxes(...parsed)
}

/** The canonical wire/key representation of a chunk column: `cx,cz`. */
export type ChunkKey = string & Brand.Brand<'ChunkKey'>

type ParsedChunkKey = readonly [cx: ChunkAxis, cz: ChunkAxis]

const parseChunkKey = (value: string): ParsedChunkKey | undefined => {
  const comma = value.indexOf(',')

  if (comma <= ZERO || comma === value.length - UNIT_STEP || value.indexOf(',', comma + UNIT_STEP) !== NO_INDEX) {
    return undefined
  }

  const texts = [value.slice(ZERO, comma), value.slice(comma + UNIT_STEP)] as const
  const coordinates = [Number(texts[ZERO]), Number(texts[UNIT_STEP])] as const

  if (!hasCanonicalIntegerText(texts, coordinates)) {
    return undefined
  }

  return [chunkAxis(normalizeZero(coordinates[ZERO])), chunkAxis(normalizeZero(coordinates[UNIT_STEP]))]
}

/** Produces the canonical, allocation-minimal key for a chunk coordinate. */
export const chunkKeyOf = (value: ChunkCoord): ChunkKey => `${String(value.cx)},${String(value.cz)}` as ChunkKey

/** Validate external text before it becomes a branded chunk key. */
export const ChunkKey = (value: string): ChunkKey => {
  if (parseChunkKey(value) === undefined) {
    throw new TypeError(`Invalid ChunkKey: ${value}`)
  }

  return value as ChunkKey
}

/** True only for the single canonical spelling of a safe-integer chunk key. */
export const isChunkKey = (value: string): value is ChunkKey => parseChunkKey(value) !== undefined

/** Parses a trusted canonical chunk key, rejecting malformed forged values. */
export const chunkCoordOfKey = (value: ChunkKey): ChunkCoord => {
  const parsed = parseChunkKey(value)
  if (parsed === undefined) {
    throw new TypeError(`Invalid ChunkKey: ${value}`)
  }

  return chunkCoordFromAxes(...parsed)
}

/** Decodes an untrusted chunk key without throwing for malformed input. */
export const decodeChunkKey = (value: string): ChunkCoord | undefined => {
  const parsed = parseChunkKey(value)
  return parsed === undefined ? undefined : chunkCoordFromAxes(...parsed)
}

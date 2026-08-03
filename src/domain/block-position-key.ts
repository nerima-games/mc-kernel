import { Brand } from 'effect'
import type { BlockPosition } from './coordinates'
import { blockPosition } from './coordinates'

/** Canonical map/set key for an integral world-space block position. */
export type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>

const CANONICAL_KEY = /^(0|-?[1-9]\d*),(0|-?[1-9]\d*),(0|-?[1-9]\d*)$/

/** Encodes a block position without losing negative coordinates or precision. */
export const blockPositionKey = (position: BlockPosition): BlockPositionKey =>
  `${String(position.x)},${String(position.y)},${String(position.z)}` as BlockPositionKey

/** Decodes only canonical keys produced by `blockPositionKey`. */
export const blockPositionOfKey = (value: string): BlockPosition | undefined => {
  const match = CANONICAL_KEY.exec(value)
  if (match === null) return undefined

  const coordinates = match.slice(1).map(Number)
  if (!coordinates.every(Number.isSafeInteger)) return undefined
  return blockPosition(coordinates[0]!, coordinates[1]!, coordinates[2]!)
}

/** Runtime guard for untrusted map keys, save data, and network payloads. */
export const isBlockPositionKey = (value: string): value is BlockPositionKey =>
  blockPositionOfKey(value) !== undefined

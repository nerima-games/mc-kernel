import { Brand } from 'effect'
import { BlockId, isKnownBlockId, type BlockId as BlockIdType } from './block-registry.js'
import { CHUNK_SIZE_XZ, chunkCoord, type BlockPosition } from './coordinate-primitives.js'
import { type ChunkKey, chunkKeyOf } from './coordinate-keys.js'

const MIN_INDEX = 0

export type WorldEpoch = number & Brand.Brand<'WorldEpoch'>
export type ChunkRevision = number & Brand.Brand<'ChunkRevision'>
export type LightRevision = number & Brand.Brand<'LightRevision'>
export type ChunkLocalIndex = number & Brand.Brand<'ChunkLocalIndex'>
export type SectionIndex = number & Brand.Brand<'SectionIndex'>

const isNonNegativeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= MIN_INDEX

const worldEpochBrand = Brand.refined<WorldEpoch>(
  isNonNegativeInteger,
  (value) => Brand.error(`WorldEpoch must be a non-negative safe integer, received ${value}`),
)
const chunkRevisionBrand = Brand.refined<ChunkRevision>(
  isNonNegativeInteger,
  (value) => Brand.error(`ChunkRevision must be a non-negative safe integer, received ${value}`),
)
const lightRevisionBrand = Brand.refined<LightRevision>(
  isNonNegativeInteger,
  (value) => Brand.error(`LightRevision must be a non-negative safe integer, received ${value}`),
)
const chunkLocalIndexBrand = Brand.refined<ChunkLocalIndex>(
  isNonNegativeInteger,
  (value) => Brand.error(`ChunkLocalIndex must be a non-negative safe integer, received ${value}`),
)
const sectionIndexBrand = Brand.refined<SectionIndex>(
  isNonNegativeInteger,
  (value) => Brand.error(`SectionIndex must be a non-negative safe integer, received ${value}`),
)

export const WorldEpoch: Brand.Brand.Constructor<WorldEpoch> = worldEpochBrand
export const ChunkRevision: Brand.Brand.Constructor<ChunkRevision> = chunkRevisionBrand
export const LightRevision: Brand.Brand.Constructor<LightRevision> = lightRevisionBrand
export const ChunkLocalIndex: Brand.Brand.Constructor<ChunkLocalIndex> = chunkLocalIndexBrand
export const SectionIndex: Brand.Brand.Constructor<SectionIndex> = sectionIndexBrand

export type BlockRead =
  | { readonly _tag: 'Loaded'; readonly blockId: BlockIdType }
  | { readonly _tag: 'Unloaded'; readonly chunk: ChunkKey }
  | { readonly _tag: 'OutOfWorld'; readonly position: BlockPosition }

export const loadedBlock = (blockId: BlockIdType): BlockRead => Object.freeze({ _tag: 'Loaded', blockId })
export const unloadedChunk = (chunk: ChunkKey): BlockRead => Object.freeze({ _tag: 'Unloaded', chunk })
export const outOfWorld = (position: BlockPosition): BlockRead => Object.freeze({ _tag: 'OutOfWorld', position })

export type ReadonlyUint16Array = {
  readonly length: number
  readonly get: (index: number) => number
  readonly snapshot: () => Uint16Array
}

export type ReadView = {
  readonly epoch: WorldEpoch
  readonly chunk: ChunkKey
  readonly blockRevision: ChunkRevision
  readonly lightRevision: LightRevision
  readonly length: number
  readonly getBlock: (index: number) => BlockIdType
  readonly getLight: (index: number) => number
  readonly blocks: ReadonlyUint16Array
  readonly light: ReadonlyUint16Array
}

const checkedIndex = (index: number, length: number): number => {
  if (!Number.isSafeInteger(index) || index < MIN_INDEX || index >= length) {
    throw new RangeError(`Section index must be an integer in [0, ${length - 1}], received ${index}`)
  }
  return index
}

const readOnlySection = (values: Uint16Array): ReadonlyUint16Array => Object.freeze({
  length: values.length,
  get: (index: number): number => Number(values.at(checkedIndex(index, values.length))),
  snapshot: (): Uint16Array => values.slice(),
})

export type ReadViewInput = {
  readonly epoch: WorldEpoch
  readonly chunk: ChunkKey
  readonly blockRevision: ChunkRevision
  readonly lightRevision: LightRevision
  readonly blocks: Uint16Array
  readonly light: Uint16Array
}

export const readView = (input: ReadViewInput): ReadView => {
  if (input.blocks.length !== input.light.length) {
    throw new RangeError('ReadView block and light sections must have equal lengths')
  }
  const blockData = input.blocks.slice()
  const lightData = input.light.slice()
  for (const blockId of blockData) {
    if (!isKnownBlockId(blockId)) {
      throw new RangeError(`Section contains an unknown block id ${blockId}`)
    }
  }
  return Object.freeze({
    epoch: input.epoch,
    chunk: input.chunk,
    blockRevision: input.blockRevision,
    lightRevision: input.lightRevision,
    length: blockData.length,
    getBlock: (index) => {
      const checked = checkedIndex(index, blockData.length)
      return BlockId(Number(blockData.at(checked)))
    },
    getLight: (index) => {
      const checked = checkedIndex(index, lightData.length)
      return Number(lightData.at(checked))
    },
    blocks: readOnlySection(blockData),
    light: readOnlySection(lightData),
  })
}
export const ReadView: (input: ReadViewInput) => ReadView = readView

export type BlockEdit = {
  readonly position: BlockPosition
  readonly blockId: BlockIdType
}

export const blockEdit = (position: BlockPosition, blockId: BlockIdType): BlockEdit => {
  if (!isKnownBlockId(blockId)) {
    throw new RangeError(`Block edit contains an unknown block id ${blockId}`)
  }
  return Object.freeze({ position, blockId })
}
export const BlockEdit: (position: BlockPosition, blockId: BlockIdType) => BlockEdit = blockEdit

export type ExpectedChunk = {
  readonly epoch: WorldEpoch
  readonly revision: ChunkRevision
}

export const expectedChunk = (epoch: WorldEpoch, revision: ChunkRevision): ExpectedChunk =>
  Object.freeze({ epoch, revision })
export const ExpectedChunk: (epoch: WorldEpoch, revision: ChunkRevision) => ExpectedChunk = expectedChunk

export type BlockWriteBatch = {
  readonly expected: ExpectedChunk
  readonly edits: readonly BlockEdit[]
}

export const blockWriteBatch = (
  expected: ExpectedChunk,
  edits: readonly BlockEdit[],
): BlockWriteBatch => {
  const seen = new Set<string>()
  const validated = edits.map((edit) => {
    const checked = blockEdit(edit.position, edit.blockId)
    const key = `${checked.position.x},${checked.position.y},${checked.position.z}`
    if (seen.has(key)) throw new RangeError(`Block write batch contains duplicate position ${key}`)
    seen.add(key)
    return checked
  })
  return Object.freeze({ expected, edits: Object.freeze(validated) })
}
export const BlockWriteBatch: (
  expected: ExpectedChunk,
  edits: readonly BlockEdit[],
) => BlockWriteBatch = blockWriteBatch

export const chunkKeyOfPosition = (position: BlockPosition): ChunkKey =>
  chunkKeyOf(chunkCoord(Math.floor(position.x / CHUNK_SIZE_XZ), Math.floor(position.z / CHUNK_SIZE_XZ)))

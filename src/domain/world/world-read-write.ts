import { Brand, Result } from 'effect'
import { snapshotInputRecord } from '../../input-snapshot.js'
import {
  isKnownBlockId,
  type BlockId as BlockIdType,
  type BlockRegistryResolutionFailure,
} from '../block/block-registry.js'
import { LightLevel } from '../block/block-property-data.js'
import { CHUNK_SIZE_XZ, ChunkAxis, chunkCoord, type BlockPosition } from '../coordinates/coordinate-primitives.js'
import { isChunkKey, type ChunkKey, chunkKeyOf } from '../coordinates/coordinate-keys.js'

const MIN_INDEX = 0
const sectionBlockId = Brand.nominal<BlockIdType>()
export type WorldEpoch = number & Brand.Brand<'WorldEpoch'>
export type ChunkRevision = number & Brand.Brand<'ChunkRevision'>
export type LightRevision = number & Brand.Brand<'LightRevision'>
export type ChunkLocalIndex = number & Brand.Brand<'ChunkLocalIndex'>
export type SectionIndex = number & Brand.Brand<'SectionIndex'>
export type SectionLength = number & Brand.Brand<'SectionLength'>

type WorldReadWriteFailureReason = 'invalid-epoch' | 'invalid-revision' | 'invalid-index' | 'invalid-read-view' | 'unknown-block-id' | 'duplicate-position'

export type WorldReadWriteFailure = Readonly<{
  readonly _tag: 'WorldReadWriteFailure'
  readonly reason: WorldReadWriteFailureReason
  readonly message: string
}> | BlockRegistryResolutionFailure

const failureValue = (
  reason: WorldReadWriteFailureReason,
  message: string,
): WorldReadWriteFailure => ({ _tag: 'WorldReadWriteFailure', reason, message })

const failure = (
  reason: WorldReadWriteFailureReason,
  message: string,
): Result.Result<never, WorldReadWriteFailure> => Result.fail(failureValue(reason, message))

const isNonNegativeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= MIN_INDEX

const worldEpochBrand = Brand.make<WorldEpoch>(
  (value) =>
    isNonNegativeInteger(value)
      ? true
      : `WorldEpoch must be a non-negative safe integer, received ${value}`,
)
const chunkRevisionBrand = Brand.make<ChunkRevision>(
  (value) =>
    isNonNegativeInteger(value)
      ? true
      : `ChunkRevision must be a non-negative safe integer, received ${value}`,
)
const lightRevisionBrand = Brand.make<LightRevision>(
  (value) =>
    isNonNegativeInteger(value)
      ? true
      : `LightRevision must be a non-negative safe integer, received ${value}`,
)
const chunkLocalIndexBrand = Brand.make<ChunkLocalIndex>(
  (value) =>
    isNonNegativeInteger(value)
      ? true
      : `ChunkLocalIndex must be a non-negative safe integer, received ${value}`,
)
const sectionIndexBrand = Brand.make<SectionIndex>(
  (value) =>
    isNonNegativeInteger(value)
      ? true
      : `SectionIndex must be a non-negative safe integer, received ${value}`,
)
const sectionLengthBrand = Brand.make<SectionLength>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_INDEX
      ? true
      : `SectionLength must be a non-negative safe integer, received ${value}`,
)

export const WorldEpoch = (value: number): Result.Result<WorldEpoch, WorldReadWriteFailure> =>
  Result.mapError(
    worldEpochBrand.result(value),
    () => failureValue('invalid-epoch', `WorldEpoch must be a non-negative safe integer, received ${value}`),
  )
export const ChunkRevision = (value: number): Result.Result<ChunkRevision, WorldReadWriteFailure> =>
  Result.mapError(
    chunkRevisionBrand.result(value),
    () => failureValue('invalid-revision', `ChunkRevision must be a non-negative safe integer, received ${value}`),
  )
export const LightRevision = (value: number): Result.Result<LightRevision, WorldReadWriteFailure> =>
  Result.mapError(
    lightRevisionBrand.result(value),
    () => failureValue('invalid-revision', `LightRevision must be a non-negative safe integer, received ${value}`),
  )
export const ChunkLocalIndex = (value: number): Result.Result<ChunkLocalIndex, WorldReadWriteFailure> =>
  Result.mapError(
    chunkLocalIndexBrand.result(value),
    () => failureValue('invalid-index', `ChunkLocalIndex must be a non-negative safe integer, received ${value}`),
  )
export const SectionIndex = (value: number): Result.Result<SectionIndex, WorldReadWriteFailure> =>
  Result.mapError(
    sectionIndexBrand.result(value),
    () => failureValue('invalid-index', `SectionIndex must be a non-negative safe integer, received ${value}`),
  )
export const SectionLength = (value: number): Result.Result<SectionLength, WorldReadWriteFailure> =>
  Result.mapError(
    sectionLengthBrand.result(value),
    () => failureValue('invalid-read-view', `SectionLength must be a non-negative safe integer, received ${value}`),
  )

export type BlockRead =
  | { readonly _tag: 'Loaded'; readonly blockId: BlockIdType }
  | { readonly _tag: 'Unloaded'; readonly chunk: ChunkKey }
  | { readonly _tag: 'OutOfWorld'; readonly position: BlockPosition }

export const loadedBlock = (blockId: BlockIdType): BlockRead => Object.freeze({ _tag: 'Loaded', blockId })
export const unloadedChunk = (chunk: ChunkKey): BlockRead => Object.freeze({ _tag: 'Unloaded', chunk })
export const outOfWorld = (position: BlockPosition): BlockRead => Object.freeze({ _tag: 'OutOfWorld', position })

export type ReadonlyUint16Array<Value extends number = BlockIdType | LightLevel> = {
  readonly length: SectionLength
  readonly get: (index: SectionIndex) => Result.Result<Value, WorldReadWriteFailure>
  readonly snapshot: () => Uint16Array
}

export type ReadView = {
  readonly epoch: WorldEpoch
  readonly chunk: ChunkKey
  readonly blockRevision: ChunkRevision
  readonly lightRevision: LightRevision
  readonly length: SectionLength
  readonly getBlock: (index: SectionIndex) => Result.Result<BlockIdType, WorldReadWriteFailure>
  readonly getLight: (index: SectionIndex) => Result.Result<LightLevel, WorldReadWriteFailure>
  readonly blocks: ReadonlyUint16Array<BlockIdType>
  readonly light: ReadonlyUint16Array<LightLevel>
}

const checkedIndex = (index: SectionIndex, length: number): Result.Result<number, WorldReadWriteFailure> =>
  Result.flatMap(SectionIndex(index), (checked) =>
    checked < length
      ? Result.succeed(checked)
      : failure('invalid-index', `Section index must be an integer in [0, ${length - 1}], received ${index}`),
  )

const readOnlySection = <Value extends number>(
  values: Uint16Array,
  length: SectionLength,
  makeValue: (value: number) => Result.Result<Value, WorldReadWriteFailure>,
): ReadonlyUint16Array<Value> => Object.freeze({
  length,
  get: (index: SectionIndex): Result.Result<Value, WorldReadWriteFailure> =>
    Result.flatMap(checkedIndex(index, values.length), (checked) => makeValue(Number(values.at(checked)))),
  snapshot: (): Uint16Array => values.slice(),
})

const blockIdOfValue = (value: number): Result.Result<BlockIdType, WorldReadWriteFailure> =>
  Result.gen(function* () {
    // Uint16Array guarantees every stored value is within BlockId's range.
    const blockId = sectionBlockId(value)
    const known = yield* isKnownBlockId(blockId)
    if (!known) {
      return yield* failure('unknown-block-id', `Section contains an unknown block id ${value}`)
    }
    return blockId
  })

const lightLevelOfValue = (value: number): Result.Result<LightLevel, WorldReadWriteFailure> =>
  Result.mapError(
    LightLevel.result(value),
    () => failureValue('invalid-read-view', `Section contains an invalid light level ${value}`),
  )

export type ReadViewInput = {
  readonly epoch: WorldEpoch
  readonly chunk: ChunkKey
  readonly blockRevision: ChunkRevision
  readonly lightRevision: LightRevision
  readonly blocks: Uint16Array
  readonly light: Uint16Array
}

export const readView = (input: ReadViewInput): Result.Result<ReadView, WorldReadWriteFailure> => {
  const inputSnapshot = snapshotInputRecord(input, [
    'epoch', 'chunk', 'blockRevision', 'lightRevision', 'blocks', 'light',
  ])
  if (Result.isFailure(inputSnapshot)) {
    return failure('invalid-read-view', 'ReadView input fields must be readable')
  }
  const blocks = inputSnapshot.success['blocks']
  const light = inputSnapshot.success['light']
  if (!(blocks instanceof Uint16Array) || !(light instanceof Uint16Array)) {
    return failure('invalid-read-view', 'ReadView sections must be Uint16Array values')
  }
  let blockData: Uint16Array
  let lightData: Uint16Array
  try {
    blockData = Uint16Array.prototype.slice.call(blocks)
    lightData = Uint16Array.prototype.slice.call(light)
  } catch {
    return failure('invalid-read-view', 'ReadView sections could not be copied')
  }

  const epochValue = inputSnapshot.success['epoch']
  const chunkValue = inputSnapshot.success['chunk']
  const blockRevisionValue = inputSnapshot.success['blockRevision']
  const lightRevisionValue = inputSnapshot.success['lightRevision']
  return Result.gen(function* () {
    if (typeof epochValue !== 'number') {
      return yield* failure('invalid-read-view', 'ReadView epoch must be a valid world epoch')
    }
    const epoch = yield* WorldEpoch(epochValue)
    if (!isChunkKey(chunkValue)) {
      return yield* failure('invalid-read-view', 'ReadView chunk must be a valid chunk key')
    }
    const chunk = chunkValue
    if (typeof blockRevisionValue !== 'number' || typeof lightRevisionValue !== 'number') {
      return yield* failure('invalid-read-view', 'ReadView revisions must be non-negative safe integers')
    }
    const blockRevision = yield* ChunkRevision(blockRevisionValue)
    const lightRevision = yield* LightRevision(lightRevisionValue)
    if (blockData.length !== lightData.length) {
      return yield* failure('invalid-read-view', 'ReadView block and light sections must have equal lengths')
    }
    for (const blockId of blockData) {
      yield* blockIdOfValue(Number(blockId))
    }
    for (const lightLevel of lightData) {
      yield* lightLevelOfValue(Number(lightLevel))
    }
    const length = yield* SectionLength(blockData.length)
    return Object.freeze({
      epoch,
      chunk,
      blockRevision,
      lightRevision,
      length,
      getBlock: (index: SectionIndex) =>
        Result.flatMap(checkedIndex(index, blockData.length), (checked) => blockIdOfValue(Number(blockData.at(checked)))),
      getLight: (index: SectionIndex) =>
        Result.flatMap(checkedIndex(index, lightData.length), (checked) => lightLevelOfValue(Number(lightData.at(checked)))),
      blocks: readOnlySection(blockData, length, blockIdOfValue),
      light: readOnlySection(lightData, length, lightLevelOfValue),
    })
  })
}
export const ReadView: (input: ReadViewInput) => Result.Result<ReadView, WorldReadWriteFailure> = readView

export type BlockEdit = {
  readonly position: BlockPosition
  readonly blockId: BlockIdType
}

export const blockEdit = (
  position: BlockPosition,
  blockId: BlockIdType,
): Result.Result<BlockEdit, WorldReadWriteFailure> =>
  Result.gen(function* () {
    const known = yield* isKnownBlockId(blockId)
    if (!known) {
      return yield* failure('unknown-block-id', `Block edit contains an unknown block id ${blockId}`)
    }
    return Object.freeze({ position, blockId })
  })
export const BlockEdit: (
  position: BlockPosition,
  blockId: BlockIdType,
) => Result.Result<BlockEdit, WorldReadWriteFailure> = blockEdit

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
): Result.Result<BlockWriteBatch, WorldReadWriteFailure> =>
  Result.gen(function* () {
    const validated = yield* Result.all(edits.map((edit) => blockEdit(edit.position, edit.blockId)))
    const seen = new Map<number, Map<number, Set<number>>>()
    for (const edit of validated) {
      let seenY = seen.get(edit.position.x)
      if (seenY === undefined) {
        seenY = new Map()
        seen.set(edit.position.x, seenY)
      }
      let seenZ = seenY.get(edit.position.y)
      if (seenZ === undefined) {
        seenZ = new Set()
        seenY.set(edit.position.y, seenZ)
      }
      if (seenZ.has(edit.position.z)) {
        return yield* failure(
          'duplicate-position',
          `Block write batch contains duplicate position (${edit.position.x},${edit.position.y},${edit.position.z})`,
        )
      }
      seenZ.add(edit.position.z)
    }
    return Object.freeze({ expected, edits: Object.freeze(validated) })
  })
export const BlockWriteBatch: (
  expected: ExpectedChunk,
  edits: readonly BlockEdit[],
) => Result.Result<BlockWriteBatch, WorldReadWriteFailure> = blockWriteBatch

export const chunkKeyOfPosition = (position: BlockPosition): ChunkKey =>
  chunkKeyOf(
    chunkCoord(
      ChunkAxis(Math.floor(position.x / CHUNK_SIZE_XZ)),
      ChunkAxis(Math.floor(position.z / CHUNK_SIZE_XZ)),
    ),
  )

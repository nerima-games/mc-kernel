import type { Effect, Result } from 'effect'
import { expectTypeOf } from 'vitest'
import type {
  BlockEdit,
  WorldWriteBatch,
  WorldWriteCommit,
  WorldWriteChunkUnavailable,
  WorldWriteConflict,
  WorldWriteInvalidBatch,
  WorldWritePort,
  validateWorldWriteBatch,
} from '../src/domain/world/world-write-port.js'
import type { BlockStateValues } from '../src/domain/block/block-state-values.js'
import type { BlockPosition } from '../src/domain/coordinates/coordinate-primitives.js'

type ExpectedFailures = WorldWriteConflict | WorldWriteInvalidBatch | WorldWriteChunkUnavailable
type ExpectedService = {
  readonly applyBatch: (batch: WorldWriteBatch) => Effect.Effect<WorldWriteCommit, ExpectedFailures>
}

expectTypeOf<WorldWritePort['Service']>().toEqualTypeOf<ExpectedService>()
expectTypeOf<ReturnType<WorldWritePort['Service']['applyBatch']>>()
  .toEqualTypeOf<Effect.Effect<WorldWriteCommit, ExpectedFailures>>()
expectTypeOf<BlockEdit['state']>().toEqualTypeOf<BlockStateValues | undefined>()
expectTypeOf<{} extends Pick<BlockEdit, 'state'> ? true : false>().toEqualTypeOf<true>()
expectTypeOf<ReturnType<typeof validateWorldWriteBatch>>()
  .toEqualTypeOf<Result.Result<WorldWriteBatch, WorldWriteInvalidBatch>>()

type InvalidBlockStateFailure = Extract<WorldWriteInvalidBatch, { readonly reason: 'invalid-block-state' }>
type EmptyBatchFailure = Extract<WorldWriteInvalidBatch, { readonly reason: 'empty' }>
type DuplicatePositionFailure = Extract<WorldWriteInvalidBatch, { readonly reason: 'duplicate-position' }>
type InvalidBlockStateFailureFields = Pick<InvalidBlockStateFailure, 'reason' | 'position'>

expectTypeOf<InvalidBlockStateFailure['position']>().toEqualTypeOf<BlockPosition>()
expectTypeOf<'position' extends keyof EmptyBatchFailure ? true : false>().toEqualTypeOf<false>()
expectTypeOf<'position' extends keyof DuplicatePositionFailure ? true : false>().toEqualTypeOf<false>()

// @ts-expect-error A block-state failure requires its edit position.
const invalidBlockStateWithoutPosition: InvalidBlockStateFailureFields = { reason: 'invalid-block-state' }
expectTypeOf(invalidBlockStateWithoutPosition).toEqualTypeOf<InvalidBlockStateFailureFields>()

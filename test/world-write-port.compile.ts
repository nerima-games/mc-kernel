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

import type { Effect } from 'effect'
import { expectTypeOf } from 'vitest'
import type {
  WorldWriteBatch,
  WorldWriteCommit,
  WorldWriteChunkUnavailable,
  WorldWriteConflict,
  WorldWriteInvalidBatch,
  WorldWritePort,
} from '../src/domain/world/world-write-port.js'

type ExpectedFailures = WorldWriteConflict | WorldWriteInvalidBatch | WorldWriteChunkUnavailable
type ExpectedService = {
  readonly applyBatch: (batch: WorldWriteBatch) => Effect.Effect<WorldWriteCommit, ExpectedFailures>
}

expectTypeOf<WorldWritePort['Service']>().toEqualTypeOf<ExpectedService>()
expectTypeOf<ReturnType<WorldWritePort['Service']['applyBatch']>>()
  .toEqualTypeOf<Effect.Effect<WorldWriteCommit, ExpectedFailures>>()

import type { Effect } from 'effect'
import { expectTypeOf } from 'vitest'
import type {
  WorldWriteBatch,
  WorldWriteCommit,
  WorldWriteConflict,
  WorldWriteInvalidBatch,
  WorldWritePort,
} from '../src/domain/world/world-write-port.js'

type ExpectedFailures = WorldWriteConflict | WorldWriteInvalidBatch
type ExpectedService = {
  readonly applyBatch: (batch: WorldWriteBatch) => Effect.Effect<WorldWriteCommit, ExpectedFailures>
}

expectTypeOf<WorldWritePort['Service']>().toEqualTypeOf<ExpectedService>()
expectTypeOf<ReturnType<WorldWritePort['Service']['applyBatch']>>()
  .toEqualTypeOf<Effect.Effect<WorldWriteCommit, ExpectedFailures>>()

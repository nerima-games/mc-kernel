import { Context, Effect, Result, Schema, SchemaParser } from 'effect'
import type { Cause } from 'effect'
import { blockStateDefinitionOf, encodeBlockState } from '../block/block-state-codec.js'
import { BlockStateValuesSchema } from '../block/block-state-values.js'
import { ChunkKeySchema } from '../coordinates/coordinate-keys.js'
import { safeUnknownSchema } from '../safe-unknown-schema.js'
import {
  BlockIdSchema,
  BlockPositionSchema,
  DimensionIdSchema,
  DimensionRevisionSchema,
  WorldIdSchema,
  WorldRevisionSchema,
} from '../shared-vocabulary/shared-vocabulary.js'

export const BlockEditSchema: Schema.Codec<{
  readonly position: Schema.Schema.Type<typeof BlockPositionSchema>
  readonly block: Schema.Schema.Type<typeof BlockIdSchema>
  readonly state?: Schema.Schema.Type<typeof BlockStateValuesSchema>
}, {
  readonly position: Schema.Codec.Encoded<typeof BlockPositionSchema>
  readonly block: Schema.Codec.Encoded<typeof BlockIdSchema>
  readonly state?: Schema.Codec.Encoded<typeof BlockStateValuesSchema>
}> = safeUnknownSchema(Schema.Struct({
  position: BlockPositionSchema,
  block: BlockIdSchema,
  state: Schema.optionalKey(BlockStateValuesSchema),
}))
export type BlockEdit = Schema.Schema.Type<typeof BlockEditSchema>

export const WorldWriteBatchSchema: Schema.Codec<{
  readonly world: Schema.Schema.Type<typeof WorldIdSchema>
  readonly expectedWorldRevision: Schema.Schema.Type<typeof WorldRevisionSchema>
  readonly dimension: Schema.Schema.Type<typeof DimensionIdSchema>
  readonly expectedDimensionRevision: Schema.Schema.Type<typeof DimensionRevisionSchema>
  readonly edits: ReadonlyArray<BlockEdit>
}, {
  readonly world: Schema.Codec.Encoded<typeof WorldIdSchema>
  readonly expectedWorldRevision: Schema.Codec.Encoded<typeof WorldRevisionSchema>
  readonly dimension: Schema.Codec.Encoded<typeof DimensionIdSchema>
  readonly expectedDimensionRevision: Schema.Codec.Encoded<typeof DimensionRevisionSchema>
  readonly edits: ReadonlyArray<Schema.Codec.Encoded<typeof BlockEditSchema>>
}> = Schema.Struct({
  world: WorldIdSchema,
  expectedWorldRevision: WorldRevisionSchema,
  dimension: DimensionIdSchema,
  expectedDimensionRevision: DimensionRevisionSchema,
  edits: Schema.Array(BlockEditSchema),
})
export type WorldWriteBatch = Schema.Schema.Type<typeof WorldWriteBatchSchema>

export const WorldWriteCommitSchema: Schema.Codec<{
  readonly worldRevision: Schema.Schema.Type<typeof WorldRevisionSchema>
  readonly dimensionRevision: Schema.Schema.Type<typeof DimensionRevisionSchema>
}, {
  readonly worldRevision: Schema.Codec.Encoded<typeof WorldRevisionSchema>
  readonly dimensionRevision: Schema.Codec.Encoded<typeof DimensionRevisionSchema>
}> = Schema.Struct({
  worldRevision: WorldRevisionSchema,
  dimensionRevision: DimensionRevisionSchema,
})
export type WorldWriteCommit = Schema.Schema.Type<typeof WorldWriteCommitSchema>

const worldWriteConflictFields: {
  readonly expectedWorldRevision: typeof WorldRevisionSchema
  readonly currentWorldRevision: typeof WorldRevisionSchema
  readonly expectedDimensionRevision: typeof DimensionRevisionSchema
  readonly currentDimensionRevision: typeof DimensionRevisionSchema
} = {
  expectedWorldRevision: WorldRevisionSchema,
  currentWorldRevision: WorldRevisionSchema,
  expectedDimensionRevision: DimensionRevisionSchema,
  currentDimensionRevision: DimensionRevisionSchema,
}

const WorldWriteConflictBase: Schema.Class<
  WorldWriteConflict,
  Schema.TaggedStruct<'WorldWriteConflict', typeof worldWriteConflictFields>,
  Cause.YieldableError
> = Schema.TaggedError<WorldWriteConflict>()('WorldWriteConflict', worldWriteConflictFields)

export class WorldWriteConflict extends WorldWriteConflictBase {}

const worldWriteInvalidBatchFields: {
  readonly reason: Schema.Codec<'empty' | 'duplicate-position' | 'invalid-block-state'>
  readonly position: Schema.optionalKey<typeof BlockPositionSchema>
} = {
  reason: Schema.Literals(['empty', 'duplicate-position', 'invalid-block-state']),
  position: Schema.optionalKey(BlockPositionSchema),
}

const WorldWriteInvalidBatchBase: Schema.Class<
  WorldWriteInvalidBatch,
  Schema.TaggedStruct<'WorldWriteInvalidBatch', typeof worldWriteInvalidBatchFields>,
  Cause.YieldableError
> = Schema.TaggedError<WorldWriteInvalidBatch>()('WorldWriteInvalidBatch', worldWriteInvalidBatchFields)

export class WorldWriteInvalidBatch extends WorldWriteInvalidBatchBase {}

export const validateWorldWriteBatch = (
  batch: WorldWriteBatch,
): Result.Result<WorldWriteBatch, WorldWriteInvalidBatch> => {
  if (batch.edits.length === 0) {
    return Result.fail(new WorldWriteInvalidBatch({ reason: 'empty' }))
  }

  const seen = new Map<number, Map<number, Set<number>>>()
  for (const edit of batch.edits) {
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
      return Result.fail(new WorldWriteInvalidBatch({ reason: 'duplicate-position' }))
    }
    seenZ.add(edit.position.z)
  }

  for (const edit of batch.edits) {
    if (edit.state !== undefined) {
      const definition = blockStateDefinitionOf(edit.block)
      if (
        Result.isFailure(definition) ||
        definition.success.slots.length === 0 ||
        Result.isFailure(encodeBlockState(edit.block, edit.state))
      ) {
        return Result.fail(new WorldWriteInvalidBatch({
          reason: 'invalid-block-state',
          position: edit.position,
        }))
      }
    }
  }

  return Result.succeed(batch)
}

const worldWriteChunkUnavailableFields: {
  readonly dimension: typeof DimensionIdSchema
  readonly chunk: typeof ChunkKeySchema
} = {
  dimension: DimensionIdSchema,
  chunk: ChunkKeySchema,
}

const WorldWriteChunkUnavailableBase: Schema.Class<
  WorldWriteChunkUnavailable,
  Schema.TaggedStruct<'WorldWriteChunkUnavailable', typeof worldWriteChunkUnavailableFields>,
  Cause.YieldableError
> = Schema.TaggedError<WorldWriteChunkUnavailable>()(
  'WorldWriteChunkUnavailable',
  worldWriteChunkUnavailableFields,
)

export class WorldWriteChunkUnavailable extends WorldWriteChunkUnavailableBase {}

export const WorldWriteChunkUnavailableSchema: Schema.Codec<
  WorldWriteChunkUnavailable,
  Schema.Codec.Encoded<typeof WorldWriteChunkUnavailable>
> = Schema.declareConstructor<
  WorldWriteChunkUnavailable,
  Schema.Codec.Encoded<typeof WorldWriteChunkUnavailable>
>()(
  [WorldWriteChunkUnavailable],
  ([inner]) => (input, _ast, options) =>
    SchemaParser.decodeUnknownEffect(inner)(input, {
      ...options,
      onExcessProperty: 'error',
    }),
)

type WorldWriteService = {
  readonly applyBatch: (
    batch: WorldWriteBatch,
  ) => Effect.Effect<
    WorldWriteCommit,
    WorldWriteConflict | WorldWriteInvalidBatch | WorldWriteChunkUnavailable
  >
}

const WorldWritePortBase: Context.ServiceClass<
  WorldWritePort,
  'mc-kernel/domain/world/WorldWritePort',
  WorldWriteService
> = Context.Service<WorldWritePort, WorldWriteService>()('mc-kernel/domain/world/WorldWritePort')

export class WorldWritePort extends WorldWritePortBase {}

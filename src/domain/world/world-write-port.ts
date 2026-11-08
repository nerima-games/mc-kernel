import { Context, Effect, Result, Schema, SchemaIssue, SchemaParser } from 'effect'
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

const BlockEditSchemaBase: Schema.Codec<{
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

export const BlockEditSchema: typeof BlockEditSchemaBase = Schema.declareConstructor<
  Schema.Schema.Type<typeof BlockEditSchemaBase>,
  Schema.Codec.Encoded<typeof BlockEditSchemaBase>
>()(
  [BlockEditSchemaBase],
  ([inner]) => (input, ast, options) =>
    Effect.flatMap(
      SchemaParser.decodeUnknownEffect(inner)(input, options),
      (edit) => {
        if (edit.state === undefined) return Effect.succeed(edit)

        const definition = blockStateDefinitionOf(edit.block)
        if (Result.isFailure(definition) || definition.success.slots.length === 0) {
          return Effect.fail(new SchemaIssue.InvalidType(ast))
        }

        return Result.isFailure(encodeBlockState(edit.block, edit.state))
          ? Effect.fail(new SchemaIssue.InvalidType(ast))
          : Effect.succeed(edit)
      },
    ),
)
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
  readonly reason: Schema.Codec<'empty' | 'duplicate-position'>
} = {
  reason: Schema.Literals(['empty', 'duplicate-position']),
}

const WorldWriteInvalidBatchBase: Schema.Class<
  WorldWriteInvalidBatch,
  Schema.TaggedStruct<'WorldWriteInvalidBatch', typeof worldWriteInvalidBatchFields>,
  Cause.YieldableError
> = Schema.TaggedError<WorldWriteInvalidBatch>()('WorldWriteInvalidBatch', worldWriteInvalidBatchFields)

export class WorldWriteInvalidBatch extends WorldWriteInvalidBatchBase {}

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

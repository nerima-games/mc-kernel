import type { BlockPosition as ExistingBlockPosition } from '../coordinates/coordinate-primitives.js'
import type { PositionAxis as ExistingPositionAxis } from '../coordinates/coordinate-primitives.js'
import type { EntityId as ExistingEntityId } from '../entity/entity-types.js'
import type { ItemId as ExistingItemId } from '../item/item-registry.js'
import type { WorldId as ExistingWorldId } from '../text/identifiers.js'
import type { SimulationTick as ExistingSimulationTick } from '../time/quantities.js'
import type { BlockId as ExistingBlockId } from '../block/block-registry-types.js'
import { Brand, Schema } from 'effect'

type DimensionIdValue = Brand.Branded<'overworld' | 'nether' | 'end', 'DimensionId'>
type AngleRadiansValue = Brand.Branded<number, 'AngleRadians'>
type WorldPositionValue = Brand.Branded<Readonly<{
  dimension: DimensionIdValue
  x: ExistingPositionAxis
  y: ExistingPositionAxis
  z: ExistingPositionAxis
}>, 'WorldPosition'>
type WorldRevisionValue = Brand.Branded<number, 'WorldRevision'>
type DimensionRevisionValue = Brand.Branded<number, 'DimensionRevision'>

export const EntityIdSchema: Schema.Codec<ExistingEntityId, string> = Schema.NonEmptyString.pipe(
  Schema.brand('EntityId'),
)
export type EntityId = ExistingEntityId

export const DimensionIdSchema: Schema.Codec<DimensionIdValue, 'overworld' | 'nether' | 'end'> =
  Schema.Literals(['overworld', 'nether', 'end']).pipe(Schema.brand('DimensionId'))
export type DimensionId = Schema.Schema.Type<typeof DimensionIdSchema>

export type AngleRadians = AngleRadiansValue
export const AngleRadians: Brand.Constructor<AngleRadians> = Brand.make<AngleRadians>(
  (value) => Number.isFinite(value) || 'AngleRadians must be finite',
)

export const WorldIdSchema: Schema.Codec<ExistingWorldId, string> = Schema.NonEmptyString.pipe(
  Schema.brand('WorldId'),
)
export type WorldId = ExistingWorldId

export const BlockIdSchema: Schema.Codec<ExistingBlockId, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 0, maximum: 65535 }))
  .pipe(Schema.brand('BlockId'))
export type BlockId = ExistingBlockId

export const ItemIdSchema: Schema.Codec<ExistingItemId, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 0, maximum: 65535 }))
  .pipe(Schema.brand('ItemId'))
export type ItemId = ExistingItemId

type BlockPositionEncoded = Readonly<{ x: number; y: number; z: number }>
export const BlockPositionSchema: Schema.Codec<ExistingBlockPosition, BlockPositionEncoded> = Schema.Struct({
  x: Schema.Int.pipe(Schema.brand('BlockAxis')),
  y: Schema.Int.pipe(Schema.brand('BlockAxis')),
  z: Schema.Int.pipe(Schema.brand('BlockAxis')),
})
export type BlockPosition = ExistingBlockPosition

type BlockAddressValue = Readonly<{ dimension: DimensionId; position: BlockPosition }>
type BlockAddressEncoded = Readonly<{
  dimension: typeof DimensionIdSchema['Encoded']
  position: typeof BlockPositionSchema['Encoded']
}>
export const BlockAddressSchema: Schema.Codec<BlockAddressValue, BlockAddressEncoded> =
  Schema.Struct({
    dimension: DimensionIdSchema,
    position: BlockPositionSchema,
  })
export type BlockAddress = Schema.Schema.Type<typeof BlockAddressSchema>

type WorldPositionEncoded = Readonly<{
  dimension: typeof DimensionIdSchema['Encoded']
  x: number
  y: number
  z: number
}>
export const WorldPositionSchema: Schema.Codec<WorldPositionValue, WorldPositionEncoded> =
  Schema.Struct({
    dimension: DimensionIdSchema,
  x: Schema.Finite.pipe(Schema.brand('PositionAxis')),
  y: Schema.Finite.pipe(Schema.brand('PositionAxis')),
  z: Schema.Finite.pipe(Schema.brand('PositionAxis')),
  }).pipe(Schema.brand('WorldPosition'))
export type WorldPosition = Schema.Schema.Type<typeof WorldPositionSchema>

export const SimulationTickSchema: Schema.Codec<ExistingSimulationTick, number> = Schema.Int
  .check(Schema.isGreaterThanOrEqualTo(0))
  .pipe(Schema.brand('SimulationTick'))
export type SimulationTick = ExistingSimulationTick

export const WorldRevisionSchema: Schema.Codec<WorldRevisionValue, number> = Schema.Int
  .check(Schema.isGreaterThanOrEqualTo(0))
  .pipe(Schema.brand('WorldRevision'))
export type WorldRevision = Schema.Schema.Type<typeof WorldRevisionSchema>

export const DimensionRevisionSchema: Schema.Codec<DimensionRevisionValue, number> = Schema.Int
  .check(Schema.isGreaterThanOrEqualTo(0))
  .pipe(Schema.brand('DimensionRevision'))
export type DimensionRevision = Schema.Schema.Type<typeof DimensionRevisionSchema>

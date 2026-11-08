import { Schema, SchemaParser } from 'effect'

const strictSchema = <Value, Encoded>(schema: Schema.Codec<Value, Encoded>): Schema.Codec<Value, Encoded> =>
  Schema.declareConstructor<Value, Encoded>()(
    [schema],
    ([inner]) => (input, _ast, options) =>
      SchemaParser.decodeUnknownEffect(inner)(input, {
        ...options,
        onExcessProperty: 'error',
      }),
  )

const integerRange = (minimum: number, maximum: number): Schema.Codec<number, number> =>
  Schema.Int.check(Schema.isBetween({ minimum, maximum }))

export type BlockStateDirection = 'down' | 'north' | 'east' | 'south' | 'west' | 'up'
export const BlockStateDirectionSchema: Schema.Codec<BlockStateDirection, BlockStateDirection> = Schema.Literals([
  'down',
  'north',
  'east',
  'south',
  'west',
  'up',
])

export type BlockStateFacing = 'north' | 'east' | 'south' | 'west' | 'up' | 'down'
export const BlockStateFacingSchema: Schema.Codec<BlockStateFacing, BlockStateFacing> = Schema.Literals([
  'north',
  'east',
  'south',
  'west',
  'up',
  'down',
])

export type BlockStateAxis = 'x' | 'y' | 'z'
export const BlockStateAxisSchema: Schema.Codec<BlockStateAxis, BlockStateAxis> = Schema.Literals(['x', 'y', 'z'])

export type BlockStateHalf = 'upper' | 'lower' | 'top' | 'bottom'
export const BlockStateHalfSchema: Schema.Codec<BlockStateHalf, BlockStateHalf> =
  Schema.Literals(['upper', 'lower', 'top', 'bottom'])

export type BlockStateHinge = 'left' | 'right'
export const BlockStateHingeSchema: Schema.Codec<BlockStateHinge, BlockStateHinge> = Schema.Literals(['left', 'right'])

export type BlockStateFace = 'floor' | 'wall' | 'ceiling'
export const BlockStateFaceSchema: Schema.Codec<BlockStateFace, BlockStateFace> =
  Schema.Literals(['floor', 'wall', 'ceiling'])

export type BlockStateShape =
  | 'straight'
  | 'inner_left'
  | 'inner_right'
  | 'outer_left'
  | 'outer_right'
  | 'north_south'
  | 'east_west'
  | 'ascending_east'
  | 'ascending_west'
  | 'ascending_north'
  | 'ascending_south'
  | 'south_east'
  | 'south_west'
  | 'north_west'
  | 'north_east'
export const BlockStateShapeSchema: Schema.Codec<BlockStateShape, BlockStateShape> = Schema.Literals([
  'straight',
  'inner_left',
  'inner_right',
  'outer_left',
  'outer_right',
  'north_south',
  'east_west',
  'ascending_east',
  'ascending_west',
  'ascending_north',
  'ascending_south',
  'south_east',
  'south_west',
  'north_west',
  'north_east',
])

export type BlockStateMode = 'compare' | 'subtract'
export const BlockStateModeSchema: Schema.Codec<BlockStateMode, BlockStateMode> =
  Schema.Literals(['compare', 'subtract'])

export type BlockStatePart = 'head' | 'foot'
export const BlockStatePartSchema: Schema.Codec<BlockStatePart, BlockStatePart> = Schema.Literals(['head', 'foot'])

export type BlockStateType = 'single' | 'left' | 'right' | 'top' | 'bottom' | 'double' | 'normal' | 'sticky'
export const BlockStateTypeSchema: Schema.Codec<BlockStateType, BlockStateType> = Schema.Literals([
  'single',
  'left',
  'right',
  'top',
  'bottom',
  'double',
  'normal',
  'sticky',
])

export type BlockStateConnectionValue = boolean | 'none' | 'side' | 'up'
export const BlockStateConnectionValueSchema: Schema.Codec<
  BlockStateConnectionValue,
  BlockStateConnectionValue
> = Schema.Union([
  Schema.Boolean,
  Schema.Literals(['none', 'side', 'up']),
])

export type BlockStateConnections = Readonly<{
  down?: BlockStateConnectionValue
  north?: BlockStateConnectionValue
  east?: BlockStateConnectionValue
  south?: BlockStateConnectionValue
  west?: BlockStateConnectionValue
  up?: BlockStateConnectionValue
}>
const BlockStateConnectionsStructSchema = Schema.Struct({
  down: Schema.optionalKey(BlockStateConnectionValueSchema),
  north: Schema.optionalKey(BlockStateConnectionValueSchema),
  east: Schema.optionalKey(BlockStateConnectionValueSchema),
  south: Schema.optionalKey(BlockStateConnectionValueSchema),
  west: Schema.optionalKey(BlockStateConnectionValueSchema),
  up: Schema.optionalKey(BlockStateConnectionValueSchema),
})
export const BlockStateConnectionsSchema: Schema.Codec<
  BlockStateConnections,
  BlockStateConnections
> = strictSchema(BlockStateConnectionsStructSchema)

export type BlockStateValues = Readonly<{
  facing?: BlockStateFacing
  half?: BlockStateHalf
  hinge?: BlockStateHinge
  open?: boolean
  age?: number
  level?: number
  powered?: boolean
  delay?: number
  shape?: BlockStateShape
  connections?: BlockStateConnections
  axis?: BlockStateAxis
  distance?: number
  enabled?: boolean
  extended?: boolean
  face?: BlockStateFace
  has_bottle_0?: boolean
  has_bottle_1?: boolean
  has_bottle_2?: boolean
  layers?: number
  lit?: boolean
  locked?: boolean
  mode?: BlockStateMode
  moisture?: number
  occupied?: boolean
  part?: BlockStatePart
  persistent?: boolean
  power?: number
  rotation?: number
  short?: boolean
  snowy?: boolean
  stage?: number
  triggered?: boolean
  type?: BlockStateType
  unstable?: boolean
  waterlogged?: boolean
}>
const BlockStateValuesStructSchema = Schema.Struct({
  facing: Schema.optionalKey(BlockStateFacingSchema),
  half: Schema.optionalKey(BlockStateHalfSchema),
  hinge: Schema.optionalKey(BlockStateHingeSchema),
  open: Schema.optionalKey(Schema.Boolean),
  age: Schema.optionalKey(integerRange(0, 25)),
  level: Schema.optionalKey(integerRange(0, 15)),
  powered: Schema.optionalKey(Schema.Boolean),
  delay: Schema.optionalKey(integerRange(1, 4)),
  shape: Schema.optionalKey(BlockStateShapeSchema),
  connections: Schema.optionalKey(BlockStateConnectionsSchema),
  axis: Schema.optionalKey(BlockStateAxisSchema),
  distance: Schema.optionalKey(integerRange(1, 7)),
  enabled: Schema.optionalKey(Schema.Boolean),
  extended: Schema.optionalKey(Schema.Boolean),
  face: Schema.optionalKey(BlockStateFaceSchema),
  has_bottle_0: Schema.optionalKey(Schema.Boolean),
  has_bottle_1: Schema.optionalKey(Schema.Boolean),
  has_bottle_2: Schema.optionalKey(Schema.Boolean),
  layers: Schema.optionalKey(integerRange(1, 8)),
  lit: Schema.optionalKey(Schema.Boolean),
  locked: Schema.optionalKey(Schema.Boolean),
  mode: Schema.optionalKey(BlockStateModeSchema),
  moisture: Schema.optionalKey(integerRange(0, 7)),
  occupied: Schema.optionalKey(Schema.Boolean),
  part: Schema.optionalKey(BlockStatePartSchema),
  persistent: Schema.optionalKey(Schema.Boolean),
  power: Schema.optionalKey(integerRange(0, 15)),
  rotation: Schema.optionalKey(integerRange(0, 15)),
  short: Schema.optionalKey(Schema.Boolean),
  snowy: Schema.optionalKey(Schema.Boolean),
  stage: Schema.optionalKey(integerRange(0, 1)),
  triggered: Schema.optionalKey(Schema.Boolean),
  type: Schema.optionalKey(BlockStateTypeSchema),
  unstable: Schema.optionalKey(Schema.Boolean),
  waterlogged: Schema.optionalKey(Schema.Boolean),
})
export const BlockStateValuesSchema: Schema.Codec<BlockStateValues, BlockStateValues> =
  strictSchema(BlockStateValuesStructSchema)

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

const BLOCK_STATE_INTEGER_VALUES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
] as const
const BLOCK_STATE_LEVEL_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const
const BLOCK_STATE_DELAY_VALUES = [1, 2, 3, 4] as const
const BLOCK_STATE_DISTANCE_VALUES = [1, 2, 3, 4, 5, 6, 7] as const
const BLOCK_STATE_LAYERS_VALUES = [1, 2, 3, 4, 5, 6, 7, 8] as const
const BLOCK_STATE_MOISTURE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7] as const
const BLOCK_STATE_STAGE_VALUES = [0, 1] as const

export type BlockStateInteger = typeof BLOCK_STATE_INTEGER_VALUES[number]
export const BlockStateIntegerSchema: Schema.Codec<BlockStateInteger, BlockStateInteger> =
  Schema.Literals(BLOCK_STATE_INTEGER_VALUES)

export type BlockStateAge = BlockStateInteger
export const BlockStateAgeSchema: Schema.Codec<BlockStateAge, BlockStateAge> = BlockStateIntegerSchema

export type BlockStateLevel = typeof BLOCK_STATE_LEVEL_VALUES[number]
export const BlockStateLevelSchema: Schema.Codec<BlockStateLevel, BlockStateLevel> =
  Schema.Literals(BLOCK_STATE_LEVEL_VALUES)

export type BlockStateDelay = typeof BLOCK_STATE_DELAY_VALUES[number]
export const BlockStateDelaySchema: Schema.Codec<BlockStateDelay, BlockStateDelay> =
  Schema.Literals(BLOCK_STATE_DELAY_VALUES)

export type BlockStateDistance = typeof BLOCK_STATE_DISTANCE_VALUES[number]
export const BlockStateDistanceSchema: Schema.Codec<BlockStateDistance, BlockStateDistance> =
  Schema.Literals(BLOCK_STATE_DISTANCE_VALUES)

export type BlockStateLayers = typeof BLOCK_STATE_LAYERS_VALUES[number]
export const BlockStateLayersSchema: Schema.Codec<BlockStateLayers, BlockStateLayers> =
  Schema.Literals(BLOCK_STATE_LAYERS_VALUES)

export type BlockStateMoisture = typeof BLOCK_STATE_MOISTURE_VALUES[number]
export const BlockStateMoistureSchema: Schema.Codec<BlockStateMoisture, BlockStateMoisture> =
  Schema.Literals(BLOCK_STATE_MOISTURE_VALUES)

export type BlockStatePower = BlockStateLevel
export const BlockStatePowerSchema: Schema.Codec<BlockStatePower, BlockStatePower> = BlockStateLevelSchema

export type BlockStateRotation = BlockStateLevel
export const BlockStateRotationSchema: Schema.Codec<BlockStateRotation, BlockStateRotation> = BlockStateLevelSchema

export type BlockStateStage = typeof BLOCK_STATE_STAGE_VALUES[number]
export const BlockStateStageSchema: Schema.Codec<BlockStateStage, BlockStateStage> =
  Schema.Literals(BLOCK_STATE_STAGE_VALUES)

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
  age?: BlockStateAge
  level?: BlockStateLevel
  powered?: boolean
  delay?: BlockStateDelay
  shape?: BlockStateShape
  connections?: BlockStateConnections
  axis?: BlockStateAxis
  distance?: BlockStateDistance
  enabled?: boolean
  extended?: boolean
  face?: BlockStateFace
  has_bottle_0?: boolean
  has_bottle_1?: boolean
  has_bottle_2?: boolean
  layers?: BlockStateLayers
  lit?: boolean
  locked?: boolean
  mode?: BlockStateMode
  moisture?: BlockStateMoisture
  occupied?: boolean
  part?: BlockStatePart
  persistent?: boolean
  power?: BlockStatePower
  rotation?: BlockStateRotation
  short?: boolean
  snowy?: boolean
  stage?: BlockStateStage
  triggered?: boolean
  type?: BlockStateType
  unstable?: boolean
  waterlogged?: boolean
}>
export type EffectiveBlockStateValues = BlockStateValues & Readonly<{ eye?: boolean }>

const BLOCK_STATE_VALUES_FIELDS = {
  facing: Schema.optionalKey(BlockStateFacingSchema),
  half: Schema.optionalKey(BlockStateHalfSchema),
  hinge: Schema.optionalKey(BlockStateHingeSchema),
  open: Schema.optionalKey(Schema.Boolean),
  age: Schema.optionalKey(BlockStateAgeSchema),
  level: Schema.optionalKey(BlockStateLevelSchema),
  powered: Schema.optionalKey(Schema.Boolean),
  delay: Schema.optionalKey(BlockStateDelaySchema),
  shape: Schema.optionalKey(BlockStateShapeSchema),
  connections: Schema.optionalKey(BlockStateConnectionsSchema),
  axis: Schema.optionalKey(BlockStateAxisSchema),
  distance: Schema.optionalKey(BlockStateDistanceSchema),
  enabled: Schema.optionalKey(Schema.Boolean),
  extended: Schema.optionalKey(Schema.Boolean),
  face: Schema.optionalKey(BlockStateFaceSchema),
  has_bottle_0: Schema.optionalKey(Schema.Boolean),
  has_bottle_1: Schema.optionalKey(Schema.Boolean),
  has_bottle_2: Schema.optionalKey(Schema.Boolean),
  layers: Schema.optionalKey(BlockStateLayersSchema),
  lit: Schema.optionalKey(Schema.Boolean),
  locked: Schema.optionalKey(Schema.Boolean),
  mode: Schema.optionalKey(BlockStateModeSchema),
  moisture: Schema.optionalKey(BlockStateMoistureSchema),
  occupied: Schema.optionalKey(Schema.Boolean),
  part: Schema.optionalKey(BlockStatePartSchema),
  persistent: Schema.optionalKey(Schema.Boolean),
  power: Schema.optionalKey(BlockStatePowerSchema),
  rotation: Schema.optionalKey(BlockStateRotationSchema),
  short: Schema.optionalKey(Schema.Boolean),
  snowy: Schema.optionalKey(Schema.Boolean),
  stage: Schema.optionalKey(BlockStateStageSchema),
  triggered: Schema.optionalKey(Schema.Boolean),
  type: Schema.optionalKey(BlockStateTypeSchema),
  unstable: Schema.optionalKey(Schema.Boolean),
  waterlogged: Schema.optionalKey(Schema.Boolean),
} as const

const BlockStateValuesStructSchema = Schema.Struct(BLOCK_STATE_VALUES_FIELDS)
export const BlockStateValuesSchema: Schema.Codec<BlockStateValues, BlockStateValues> =
  strictSchema(BlockStateValuesStructSchema)

const EffectiveBlockStateValuesStructSchema = Schema.Struct({
  ...BLOCK_STATE_VALUES_FIELDS,
  eye: Schema.optionalKey(Schema.Boolean),
})
export const EffectiveBlockStateValuesSchema: Schema.Codec<
  EffectiveBlockStateValues,
  EffectiveBlockStateValues
> = strictSchema(EffectiveBlockStateValuesStructSchema)

import { DimensionIdSchema, WorldPositionSchema } from '../src/domain/shared-vocabulary/shared-vocabulary'
import type { WorldPosition } from '../src/domain/shared-vocabulary/shared-vocabulary'
import { Schema } from 'effect'

const worldPosition = Schema.decodeUnknownSync(WorldPositionSchema)({
  dimension: 'end',
  x: 0.5,
  y: 80,
  z: -2.25,
})
const dimension = Schema.decodeUnknownSync(DimensionIdSchema)('end')
export const validWorldPosition: WorldPosition = { ...worldPosition, dimension }

// @ts-expect-error World position axes require the continuous block-space brand.
export const rawWorldPositionAxis: WorldPosition['x'] = 0.5

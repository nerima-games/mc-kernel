import { propertyOfBlockId } from '../block/block-registry.js'
import type { BlockId } from '../block/block-registry-types.js'
import type { BlockBlastResistance } from '../block/block-property-data.js'

export { DEFAULT_EXPLOSION_LIMITS } from './explosion-data.js'
export {
  ExplosionBlockCount,
  ExplosionEntityCount,
  ExplosionExposure,
  ExplosionRadius,
  ExplosionRayStepCount,
} from './explosion-data.js'
export type {
  ExplosionBlock,
  ExplosionBlockPosition,
  ExplosionBlockReader,
  ExplosionCommit,
  ExplosionEntity,
  ExplosionEntityEffect,
  ExplosionLimits,
  ExplosionMutation,
  ExplosionPlan,
  ExplosionRequest,
} from './explosion-data.js'

export const resistsExplosion = (id: BlockId, power: BlockBlastResistance): boolean =>
  propertyOfBlockId(id, 'blastResistance') >= power

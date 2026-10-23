import { propertyOfBlockId } from '../block/block-registry.js'

export { DEFAULT_EXPLOSION_LIMITS } from './explosion-data.js'
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

export const resistsExplosion = (id: number, power: number): boolean =>
  propertyOfBlockId(id, 'blastResistance') >= power

import { Result } from 'effect'
import { BlockId, propertyOfBlockId } from '../block/block-registry.js'
import type { BlockRegistryResolutionFailure } from '../block/block-registry-indexes.js'
import type { BlockId as BlockIdValue } from '../block/block-registry-types.js'
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

export const resistsExplosion = (
  id: BlockIdValue,
  power: BlockBlastResistance,
): Result.Result<boolean, BlockRegistryResolutionFailure> =>
  Result.flatMap(BlockId.result(id), (blockId) =>
    Result.map(
      propertyOfBlockId(blockId, 'blastResistance'),
      (blastResistance) => blastResistance >= power,
    ),
  )

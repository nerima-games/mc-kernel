import { BlockBlastResistance } from '../src/domain/block/block-properties'
import { BlockId, blockIdOf } from '../src/domain/block/block-registry'
import { BlockAxis, PositionAxis, position } from '../src/domain/coordinates/coordinate-primitives'
import { EntityId, EntityHealthPoints, EntitySerial, mintEntityId, serialOfEntityId, type EntityState } from '../src/domain/entity/entity'
import type {
  EntityAttributeOptions,
  EntityAttributes,
  EntityAttributeDefinition,
  RosterRepair,
  EntityRoster,
  SpawnRequest,
} from '../src/domain/entity/entity'
import {
  ExplosionBlockCount,
  ExplosionEntityCount,
  ExplosionRadius,
  ExplosionRayStepCount,
  resistsExplosion,
  type ExplosionBlock,
  type ExplosionEntity,
  type ExplosionEntityEffect,
  type ExplosionLimits,
  type ExplosionPlan,
  type ExplosionRequest,
} from '../src/domain/entity/explosion'
import { PortalHeight, PortalWidth, type BlockAt, type PortalFrame } from '../src/domain/entity/portal'
import {
  type SulfurCubeArchetypeOptions,
  type SulfurCubeArchetype,
  type SulfurCubeAttributeModifierOptions,
  type SulfurCubeContactDamageOptions,
  type SulfurCubeExplosionOptions,
  type SulfurCubeKnockbackModifiersOptions,
  type SulfurCubeSoundSettingsOptions,
} from '../src/domain/entity/sulfur-cube'
import {
  VehicleVelocityComponent,
  type Vehicle,
  type VehicleSnapshot,
  type VehicleVelocity,
  type VehicleValidationError,
} from '../src/domain/entity/vehicle'
import { AngleRadians } from '../src/domain/shared-vocabulary/shared-vocabulary'
import type { StatusEffectDefinition } from '../src/domain/entity/status-effect'
import { EffectAmplifier, RgbColor } from '../src/domain/item/item-primitives'
import { Bounciness } from '../src/domain/time/quantities'
import { RandomSeed } from '../src/domain/world/random-source'

const entityId = EntityId('e:1')
const entityState: EntityState<undefined> = {
  feetPosition: position(PositionAxis(0), PositionAxis(0), PositionAxis(0)),
  healthPoints: EntityHealthPoints(20),
  behaviour: undefined,
}
export const validEntityState: EntityState<undefined> = entityState
const portalFrame: PortalFrame = {
  axis: 'x',
  width: PortalWidth(2),
  height: PortalHeight(3),
  interior: [],
}
const blockAt: BlockAt = (_x, _y, _z) => BlockId(0)
const explosionLimits: ExplosionLimits = {
  maxVisitedBlocks: ExplosionBlockCount(1),
  maxRaySteps: ExplosionRayStepCount(1),
  maxAffectedEntities: ExplosionEntityCount(1),
}
const explosionRequest: ExplosionRequest = {
  center: position(PositionAxis(0), PositionAxis(0), PositionAxis(0)),
  radius: ExplosionRadius(1),
  seed: RandomSeed(1),
  blocks: () => undefined,
  entities: [],
  limits: explosionLimits,
}
const explosionEntity: ExplosionEntity = {
  id: entityId,
  feetPosition: position(PositionAxis(0), PositionAxis(0), PositionAxis(0)),
}
const explosionBlock: ExplosionBlock = {
  resistance: BlockBlastResistance(1),
  destructible: true,
}
const vehicle: Pick<Vehicle, 'yawRadians' | 'velocity'> = {
  yawRadians: AngleRadians(0),
  velocity: {
    x: VehicleVelocityComponent(0),
    y: VehicleVelocityComponent(0),
    z: VehicleVelocityComponent(0),
  },
}
const statusAmplifier: StatusEffectDefinition['maxAmplifier'] = EffectAmplifier(1)
const statusColor: StatusEffectDefinition['particleColor'] = RgbColor(0xffffff)

export const validEntityId: EntityId = mintEntityId(EntitySerial(1))
export const validEntitySerial: EntitySerial = serialOfEntityId(entityId) ?? EntitySerial(0)
export const validBlockLookup: BlockId = blockAt(BlockAxis(0), BlockAxis(0), BlockAxis(0))
export const validExplosionResistance: boolean = resistsExplosion(blockIdOf('stone'), BlockBlastResistance(4))
export const validExplosionRequest: ExplosionRequest = explosionRequest
export const validExplosionEntity: ExplosionEntity = explosionEntity
export const validExplosionBlock: ExplosionBlock = explosionBlock
export const validPortalFrame: PortalFrame = portalFrame
export const validVehicleVelocity: VehicleVelocity = vehicle.velocity
export const validStatusAmplifier: StatusEffectDefinition['maxAmplifier'] = statusAmplifier
export const validStatusColor: StatusEffectDefinition['particleColor'] = statusColor
export const validAttributeOptions: EntityAttributeOptions = {
  bounciness: Bounciness(0.5),
}

// @ts-expect-error Entity serials require the non-negative safe-integer brand.
export const rawEntitySerial: EntitySerial = 1
// @ts-expect-error Entity ids require validation before parsing their serial.
export const rawEntityIdSerial: EntitySerial = serialOfEntityId('e:1')
// @ts-expect-error Entity state health is branded.
export const rawEntityHealth: EntityState<undefined>['healthPoints'] = 20
// @ts-expect-error Roster serials use EntitySerial.
export const rawNextEntitySerial: EntityRoster<undefined>['nextSerial'] = 1
// @ts-expect-error Roster repair counts are non-negative branded counts.
export const rawDiscardedCount: RosterRepair['discarded'] = 1
// @ts-expect-error Spawn health uses EntityHealthPoints.
export const rawSpawnHealth: SpawnRequest<undefined>['healthPoints'] = 20
// @ts-expect-error Entity IDs are branded values.
export const rawEntityId: EntityId = 'e:1'
// @ts-expect-error Attribute options retain their semantic quantity brands.
export const rawEntityAttribute: NonNullable<EntityAttributeOptions['bounciness']> = 0.5
// @ts-expect-error Attribute outputs retain their semantic quantity brands.
export const rawEntityAttributeOutput: EntityAttributes['bounciness'] = 0.5
// @ts-expect-error Attribute definition values use the attribute's quantity brand.
export const rawEntityAttributeDefault: EntityAttributeDefinition['defaultValue'] = 0
// @ts-expect-error BlockAt accepts block-coordinate brands and returns a BlockId.
export const rawBlockAt: BlockAt = (x: number, y: number, z: number): number => x + y + z
// @ts-expect-error Portal frame dimensions require range-checked brands.
export const rawPortalWidth: PortalFrame['width'] = 2
// @ts-expect-error Portal frame dimensions require range-checked brands.
export const rawPortalHeight: PortalFrame['height'] = 3
// @ts-expect-error Explosion resistance uses the block blast-resistance brand.
export const rawExplosionResistance: ExplosionBlock['resistance'] = 1
// @ts-expect-error Explosion entity ids use EntityId.
export const rawExplosionEntityId: ExplosionEntity['id'] = 'e:1'
// @ts-expect-error Explosion damage uses the event damage amount brand.
export const rawExplosionDamage: ExplosionEntityEffect['damage'] = 1
// @ts-expect-error Exposure is a normalized fraction brand.
export const rawExplosionExposure: ExplosionEntityEffect['exposure'] = 1
// @ts-expect-error Explosion limits use the brand matching their counted unit.
export const rawExplosionLimit: ExplosionLimits['maxRaySteps'] = 1
// @ts-expect-error Traversal counts retain the block-count brand.
export const rawVisitedBlocks: ExplosionPlan['visitedBlocks'] = 1
// @ts-expect-error Explosion radius is branded.
export const rawExplosionRadius: ExplosionRequest['radius'] = 1
// @ts-expect-error Explosion seed uses RandomSeed.
export const rawExplosionSeed: ExplosionRequest['seed'] = 1
// @ts-expect-error resistsExplosion requires validated block identifiers and power.
resistsExplosion(1, 4)
// @ts-expect-error Vehicle yaw uses AngleRadians.
export const rawVehicleYaw: Vehicle['yawRadians'] = 0
// @ts-expect-error Vehicle velocity components are finite branded scalars.
export const rawVehicleVelocity: Vehicle['velocity']['x'] = 0
// @ts-expect-error Vehicle snapshots use the entity serial brand.
export const rawVehicleNextSerial: VehicleSnapshot['nextSerial'] = 0
// @ts-expect-error Vehicle validation paths are branded diagnostic strings.
export const rawVehiclePath: VehicleValidationError['path'] = 'position.x'
// @ts-expect-error Vehicle diagnostic messages use their field brand.
export const rawVehicleReason: VehicleValidationError['reason'] = 'invalid position'
// @ts-expect-error Sulfur Cube fuse uses a positive tick-count brand.
export const rawSulfurCubeFuse: SulfurCubeExplosionOptions['fuse'] = 20
// @ts-expect-error Sulfur Cube explosion power is branded.
export const rawSulfurCubePower: SulfurCubeExplosionOptions['power'] = 4
// @ts-expect-error Contact damage amounts are branded.
export const rawSulfurCubeDamage: SulfurCubeContactDamageOptions['amount'] = 1
// @ts-expect-error Knockback powers are finite branded scalars.
export const rawSulfurCubeKnockback: SulfurCubeKnockbackModifiersOptions['horizontalPower'] = 1
// @ts-expect-error Sound cooldowns are finite branded scalars.
export const rawSulfurCubeCooldown: SulfurCubeSoundSettingsOptions['pushSoundCooldown'] = 1
// @ts-expect-error Normalized archetype fields retain the same brands as options.
export const rawSulfurCubeOutputPower: NonNullable<SulfurCubeArchetype['explosion']>['power'] = 4
// @ts-expect-error Normalized archetype sound locations use ResourceLocation.
export const rawSulfurCubeOutputSound: SulfurCubeArchetype['soundSettings']['hitSound'] = 'minecraft:entity.slime.squish'
// @ts-expect-error The amplifier ceiling keeps the existing effect-amplifier brand.
export const rawStatusAmplifier: StatusEffectDefinition['maxAmplifier'] = 1
// @ts-expect-error Status colors use the existing RGB color brand.
export const rawStatusColor: RgbColor = 0xffffff
// @ts-expect-error Sulfur Cube item tags use TagLocation.
export const rawSulfurCubeItems: SulfurCubeArchetypeOptions['items'] = '#sulfur_cube_food'
// @ts-expect-error Damage type strings use ResourceLocation.
export const rawSulfurCubeDamageType: SulfurCubeContactDamageOptions['damageType'] = 'minecraft:sulfur_cube_hot'
// @ts-expect-error Attribute identifiers require an explicit namespace brand.
export const rawSulfurCubeAttribute: SulfurCubeAttributeModifierOptions['attribute'] = 'minecraft:bounciness'
// @ts-expect-error Sound identifiers use ResourceLocation.
export const rawSulfurCubeSound: SulfurCubeSoundSettingsOptions['hitSound'] = 'minecraft:entity.slime.squish'

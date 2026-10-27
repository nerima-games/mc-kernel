import { type Brand, Schema } from 'effect'

import {
  BlockAddressSchema,
  BlockIdSchema,
  EntityIdSchema,
  SimulationTickSchema,
  WorldPositionSchema,
} from '../shared-vocabulary/shared-vocabulary.js'
import {
  BlockChangedByWorldEventSchema,
  BlockPlacedEventSchema,
} from './block-world-events.js'
import {
  EntityDiedEventSchema,
  EntityHealedEventSchema,
  EntitySpawnedEventSchema,
  EntityTeleportedEventSchema,
} from './entity-events.js'
import {
  DamageAmountSchema,
  DamageCauseSchema,
  ExplosionSourceSchema,
} from './event-primitives.js'
import {
  ItemConsumedEventSchema,
  ItemDroppedEventSchema,
  ItemPickedUpEventSchema,
} from './item-events.js'
import {
  ExperienceCollectedEventSchema,
  ProjectileImpactedEventSchema,
  ProjectileLaunchedEventSchema,
  ShieldBlockedEventSchema,
  VehicleTransitionEventSchema,
  WeatherGameplayEffectEventSchema,
} from './projectile-gameplay-events.js'

export {
  DamageAmountSchema,
  DamageCauseSchema,
  ExperienceAmountSchema,
  ExplosionSourceSchema,
  HealthAmountSchema,
  ProjectileIdSchema,
  Velocity3Schema,
} from './event-primitives.js'
export type {
  DamageAmount,
  DamageCause,
  ExperienceAmount,
  ExplosionSource,
  HealthAmount,
  ProjectileId,
  Velocity3,
} from './event-primitives.js'

type ExplosionPowerValue = Brand.Branded<number, 'ExplosionPower'>
export const ExplosionPowerSchema: Schema.Codec<ExplosionPowerValue, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 1, maximum: 6 }))
  .pipe(Schema.brand('ExplosionPower'))
export type ExplosionPower = Schema.Schema.Type<typeof ExplosionPowerSchema>

type ExperienceLevelValue = Brand.Branded<number, 'ExperienceLevel'>
export const ExperienceLevelSchema: Schema.Codec<ExperienceLevelValue, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }))
  .pipe(Schema.brand('ExperienceLevel'))
export type ExperienceLevel = Schema.Schema.Type<typeof ExperienceLevelSchema>

type LevelUpLevelValue = Brand.Branded<number, 'LevelUpLevel'>
export const LevelUpLevelSchema: Schema.Codec<LevelUpLevelValue, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }))
  .pipe(Schema.brand('LevelUpLevel'))
export type LevelUpLevel = Schema.Schema.Type<typeof LevelUpLevelSchema>

type AchievementIdValue = Brand.Branded<string, 'AchievementId'>
export const AchievementIdSchema: Schema.Codec<AchievementIdValue, string> =
  Schema.NonEmptyString.pipe(Schema.brand('AchievementId'))
export type AchievementId = Schema.Schema.Type<typeof AchievementIdSchema>

type ExistingDomainEventValue =
  | Readonly<{
      _tag: 'EntityDamaged'
      tick: Schema.Schema.Type<typeof SimulationTickSchema>
      entity: Schema.Schema.Type<typeof EntityIdSchema>
      position: Schema.Schema.Type<typeof WorldPositionSchema>
      amount: Schema.Schema.Type<typeof DamageAmountSchema>
      cause: Schema.Schema.Type<typeof DamageCauseSchema>
    }>
  | Readonly<{
      _tag: 'BlockBroken'
      tick: Schema.Schema.Type<typeof SimulationTickSchema>
      actor: Schema.Schema.Type<typeof EntityIdSchema>
      address: Schema.Schema.Type<typeof BlockAddressSchema>
      block: Schema.Schema.Type<typeof BlockIdSchema>
    }>
  | Readonly<{
      _tag: 'Explosion'
      tick: Schema.Schema.Type<typeof SimulationTickSchema>
      position: Schema.Schema.Type<typeof WorldPositionSchema>
      power: Schema.Schema.Type<typeof ExplosionPowerSchema>
      source: Schema.Schema.Type<typeof ExplosionSourceSchema>
    }>
  | Readonly<{
      _tag: 'LevelUp'
      tick: Schema.Schema.Type<typeof SimulationTickSchema>
      entity: Schema.Schema.Type<typeof EntityIdSchema>
      position: Schema.Schema.Type<typeof WorldPositionSchema>
      level: Schema.Schema.Type<typeof LevelUpLevelSchema>
    }>
  | Readonly<{
      _tag: 'AchievementUnlocked'
      tick: Schema.Schema.Type<typeof SimulationTickSchema>
      player: Schema.Schema.Type<typeof EntityIdSchema>
      achievement: Schema.Schema.Type<typeof AchievementIdSchema>
    }>

type ExistingDomainEventEncoded =
  | Readonly<{
      _tag: 'EntityDamaged'
      tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
      entity: Schema.Codec.Encoded<typeof EntityIdSchema>
      position: Schema.Codec.Encoded<typeof WorldPositionSchema>
      amount: Schema.Codec.Encoded<typeof DamageAmountSchema>
      cause: Schema.Codec.Encoded<typeof DamageCauseSchema>
    }>
  | Readonly<{
      _tag: 'BlockBroken'
      tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
      actor: Schema.Codec.Encoded<typeof EntityIdSchema>
      address: Schema.Codec.Encoded<typeof BlockAddressSchema>
      block: Schema.Codec.Encoded<typeof BlockIdSchema>
    }>
  | Readonly<{
      _tag: 'Explosion'
      tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
      position: Schema.Codec.Encoded<typeof WorldPositionSchema>
      power: Schema.Codec.Encoded<typeof ExplosionPowerSchema>
      source: Schema.Codec.Encoded<typeof ExplosionSourceSchema>
    }>
  | Readonly<{
      _tag: 'LevelUp'
      tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
      entity: Schema.Codec.Encoded<typeof EntityIdSchema>
      position: Schema.Codec.Encoded<typeof WorldPositionSchema>
      level: Schema.Codec.Encoded<typeof LevelUpLevelSchema>
    }>
  | Readonly<{
      _tag: 'AchievementUnlocked'
      tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
      player: Schema.Codec.Encoded<typeof EntityIdSchema>
      achievement: Schema.Codec.Encoded<typeof AchievementIdSchema>
    }>

type AddedDomainEventValue =
  | Schema.Schema.Type<typeof BlockPlacedEventSchema>
  | Schema.Schema.Type<typeof BlockChangedByWorldEventSchema>
  | Schema.Schema.Type<typeof EntityDiedEventSchema>
  | Schema.Schema.Type<typeof EntityHealedEventSchema>
  | Schema.Schema.Type<typeof EntitySpawnedEventSchema>
  | Schema.Schema.Type<typeof EntityTeleportedEventSchema>
  | Schema.Schema.Type<typeof ItemDroppedEventSchema>
  | Schema.Schema.Type<typeof ItemPickedUpEventSchema>
  | Schema.Schema.Type<typeof ItemConsumedEventSchema>
  | Schema.Schema.Type<typeof WeatherGameplayEffectEventSchema>
  | Schema.Schema.Type<typeof ProjectileLaunchedEventSchema>
  | Schema.Schema.Type<typeof ProjectileImpactedEventSchema>
  | Schema.Schema.Type<typeof ShieldBlockedEventSchema>
  | Schema.Schema.Type<typeof ExperienceCollectedEventSchema>
  | Schema.Schema.Type<typeof VehicleTransitionEventSchema>

type AddedDomainEventEncoded =
  | Schema.Codec.Encoded<typeof BlockPlacedEventSchema>
  | Schema.Codec.Encoded<typeof BlockChangedByWorldEventSchema>
  | Schema.Codec.Encoded<typeof EntityDiedEventSchema>
  | Schema.Codec.Encoded<typeof EntityHealedEventSchema>
  | Schema.Codec.Encoded<typeof EntitySpawnedEventSchema>
  | Schema.Codec.Encoded<typeof EntityTeleportedEventSchema>
  | Schema.Codec.Encoded<typeof ItemDroppedEventSchema>
  | Schema.Codec.Encoded<typeof ItemPickedUpEventSchema>
  | Schema.Codec.Encoded<typeof ItemConsumedEventSchema>
  | Schema.Codec.Encoded<typeof WeatherGameplayEffectEventSchema>
  | Schema.Codec.Encoded<typeof ProjectileLaunchedEventSchema>
  | Schema.Codec.Encoded<typeof ProjectileImpactedEventSchema>
  | Schema.Codec.Encoded<typeof ShieldBlockedEventSchema>
  | Schema.Codec.Encoded<typeof ExperienceCollectedEventSchema>
  | Schema.Codec.Encoded<typeof VehicleTransitionEventSchema>

type DomainEventValue = ExistingDomainEventValue | AddedDomainEventValue
type DomainEventEncoded = ExistingDomainEventEncoded | AddedDomainEventEncoded

// Positions use block units; damage and level-up events capture their creation-time position.
export const DomainEventSchema: Schema.Codec<DomainEventValue, DomainEventEncoded> = Schema.Union([
  Schema.TaggedStruct('EntityDamaged', {
    tick: SimulationTickSchema,
    entity: EntityIdSchema,
    position: WorldPositionSchema,
    amount: DamageAmountSchema,
    cause: DamageCauseSchema,
  }),
  Schema.TaggedStruct('BlockBroken', {
    tick: SimulationTickSchema,
    actor: EntityIdSchema,
    address: BlockAddressSchema,
    block: BlockIdSchema,
  }),
  Schema.TaggedStruct('Explosion', {
    tick: SimulationTickSchema,
    position: WorldPositionSchema,
    power: ExplosionPowerSchema,
    source: ExplosionSourceSchema,
  }),
  Schema.TaggedStruct('LevelUp', {
    tick: SimulationTickSchema,
    entity: EntityIdSchema,
    position: WorldPositionSchema,
    level: LevelUpLevelSchema,
  }),
  Schema.TaggedStruct('AchievementUnlocked', {
    tick: SimulationTickSchema,
    player: EntityIdSchema,
    achievement: AchievementIdSchema,
  }),
  BlockPlacedEventSchema,
  BlockChangedByWorldEventSchema,
  EntityDiedEventSchema,
  EntityHealedEventSchema,
  EntitySpawnedEventSchema,
  EntityTeleportedEventSchema,
  ItemDroppedEventSchema,
  ItemPickedUpEventSchema,
  ItemConsumedEventSchema,
  WeatherGameplayEffectEventSchema,
  ProjectileLaunchedEventSchema,
  ProjectileImpactedEventSchema,
  ShieldBlockedEventSchema,
  ExperienceCollectedEventSchema,
  VehicleTransitionEventSchema,
])
export type DomainEvent = Schema.Schema.Type<typeof DomainEventSchema>

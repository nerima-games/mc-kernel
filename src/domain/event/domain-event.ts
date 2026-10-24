import { type Brand, Schema } from 'effect'

import {
  BlockAddressSchema,
  BlockIdSchema,
  EntityIdSchema,
  SimulationTickSchema,
  WorldPositionSchema,
} from '../shared-vocabulary/shared-vocabulary.js'

type DamageAmountValue = Brand.Branded<number, 'DamageAmount'>
export const DamageAmountSchema: Schema.Codec<DamageAmountValue, number> = Schema.Finite
  .check(Schema.isGreaterThan(0))
  .pipe(Schema.brand('DamageAmount'))
export type DamageAmount = Schema.Schema.Type<typeof DamageAmountSchema>

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

// Positions use block units; damage and level-up events capture their creation-time position.
type DomainEventValue =
  | Readonly<{
      _tag: 'EntityDamaged'
      tick: typeof SimulationTickSchema['Type']
      entity: typeof EntityIdSchema['Type']
      position: typeof WorldPositionSchema['Type']
      amount: DamageAmount
    }>
  | Readonly<{
      _tag: 'BlockBroken'
      tick: typeof SimulationTickSchema['Type']
      actor: typeof EntityIdSchema['Type']
      address: typeof BlockAddressSchema['Type']
      block: typeof BlockIdSchema['Type']
    }>
  | Readonly<{
      _tag: 'Explosion'
      tick: typeof SimulationTickSchema['Type']
      position: typeof WorldPositionSchema['Type']
      power: ExplosionPower
    }>
  | Readonly<{
      _tag: 'LevelUp'
      tick: typeof SimulationTickSchema['Type']
      entity: typeof EntityIdSchema['Type']
      position: typeof WorldPositionSchema['Type']
      level: LevelUpLevel
    }>
  | Readonly<{
      _tag: 'AchievementUnlocked'
      tick: typeof SimulationTickSchema['Type']
      player: typeof EntityIdSchema['Type']
      achievement: AchievementId
    }>

type DomainEventEncoded =
  | Readonly<{
      _tag: 'EntityDamaged'
      tick: typeof SimulationTickSchema['Encoded']
      entity: typeof EntityIdSchema['Encoded']
      position: typeof WorldPositionSchema['Encoded']
      amount: typeof DamageAmountSchema['Encoded']
    }>
  | Readonly<{
      _tag: 'BlockBroken'
      tick: typeof SimulationTickSchema['Encoded']
      actor: typeof EntityIdSchema['Encoded']
      address: typeof BlockAddressSchema['Encoded']
      block: typeof BlockIdSchema['Encoded']
    }>
  | Readonly<{
      _tag: 'Explosion'
      tick: typeof SimulationTickSchema['Encoded']
      position: typeof WorldPositionSchema['Encoded']
      power: typeof ExplosionPowerSchema['Encoded']
    }>
  | Readonly<{
      _tag: 'LevelUp'
      tick: typeof SimulationTickSchema['Encoded']
      entity: typeof EntityIdSchema['Encoded']
      position: typeof WorldPositionSchema['Encoded']
      level: typeof LevelUpLevelSchema['Encoded']
    }>
  | Readonly<{
      _tag: 'AchievementUnlocked'
      tick: typeof SimulationTickSchema['Encoded']
      player: typeof EntityIdSchema['Encoded']
      achievement: typeof AchievementIdSchema['Encoded']
    }>

export const DomainEventSchema: Schema.Codec<DomainEventValue, DomainEventEncoded> = Schema.Union([
  Schema.TaggedStruct('EntityDamaged', {
    tick: SimulationTickSchema,
    entity: EntityIdSchema,
    position: WorldPositionSchema,
    amount: DamageAmountSchema,
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
])
export type DomainEvent = Schema.Schema.Type<typeof DomainEventSchema>

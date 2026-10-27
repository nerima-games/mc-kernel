import { type Brand, Schema } from 'effect'

import type { EntityKind } from '../entity/entity-types.js'
import type { VehicleId } from '../entity/vehicle.js'
import { MAX_STACK_COUNT, type StackCount } from '../time/quantities.js'

type DamageAmountValue = Brand.Branded<number, 'DamageAmount'>
export const DamageAmountSchema: Schema.Codec<DamageAmountValue, number> = Schema.Finite
  .check(Schema.isGreaterThan(0))
  .pipe(Schema.brand('DamageAmount'))
export type DamageAmount = Schema.Schema.Type<typeof DamageAmountSchema>

type DamageCauseLiteral =
  | 'fall'
  | 'lava'
  | 'cactus'
  | 'in_fire'
  | 'on_fire'
  | 'drowning'
  | 'suffocation'
  | 'starvation'
  | 'mob'
  | 'projectile'
  | 'explosion'
  | 'void'
  | 'ender_pearl'
  | 'poison'
  | 'generic'
  | 'lightning'
type DamageCauseValue = Brand.Branded<DamageCauseLiteral, 'DamageCause'>
/** Closed shared damage vocabulary, including lightning emitted by thunder weather gameplay. */
export const DamageCauseSchema: Schema.Codec<DamageCauseValue, DamageCauseLiteral> =
  Schema.Literals([
    'fall',
    'lava',
    'cactus',
    'in_fire',
    'on_fire',
    'drowning',
    'suffocation',
    'starvation',
    'mob',
    'projectile',
    'explosion',
    'void',
    'ender_pearl',
    'poison',
    'generic',
    'lightning',
  ]).pipe(Schema.brand('DamageCause'))
export type DamageCause = Schema.Schema.Type<typeof DamageCauseSchema>

type ExplosionSourceLiteral = 'creeper' | 'tnt'
type ExplosionSourceValue = Brand.Branded<ExplosionSourceLiteral, 'ExplosionSource'>
/** Closed to the source categories emitted by gameplay explosion rules. */
export const ExplosionSourceSchema: Schema.Codec<ExplosionSourceValue, ExplosionSourceLiteral> =
  Schema.Literals(['creeper', 'tnt']).pipe(Schema.brand('ExplosionSource'))
export type ExplosionSource = Schema.Schema.Type<typeof ExplosionSourceSchema>

type HealthAmountValue = Brand.Branded<number, 'HealthAmount'>
export const HealthAmountSchema: Schema.Codec<HealthAmountValue, number> = Schema.Finite
  .check(Schema.isGreaterThan(0))
  .pipe(Schema.brand('HealthAmount'))
export type HealthAmount = Schema.Schema.Type<typeof HealthAmountSchema>

type ExperienceAmountValue = Brand.Branded<number, 'ExperienceAmount'>
export const ExperienceAmountSchema: Schema.Codec<ExperienceAmountValue, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }))
  .pipe(Schema.brand('ExperienceAmount'))
export type ExperienceAmount = Schema.Schema.Type<typeof ExperienceAmountSchema>

type ProjectileIdValue = Brand.Branded<string, 'ProjectileId'>
export const ProjectileIdSchema: Schema.Codec<ProjectileIdValue, string> =
  Schema.NonEmptyString.pipe(Schema.brand('ProjectileId'))
export type ProjectileId = Schema.Schema.Type<typeof ProjectileIdSchema>

type Velocity3Value = Brand.Branded<Readonly<{ x: number; y: number; z: number }>, 'Velocity3'>
/** Signed blocks per second in mc-physics axes: +X east, +Y up, and +Z south. */
export const Velocity3Schema: Schema.Codec<Velocity3Value, Readonly<{ x: number; y: number; z: number }>> =
  Schema.Struct({
    x: Schema.Finite,
    y: Schema.Finite,
    z: Schema.Finite,
  }).pipe(Schema.brand('Velocity3'))
export type Velocity3 = Schema.Schema.Type<typeof Velocity3Schema>

export const EntityKindSchema: Schema.Codec<EntityKind, string> = Schema.String
  .check(Schema.isPattern(/\S/))
  .pipe(Schema.brand('EntityKind'))

export const StackCountSchema: Schema.Codec<StackCount, number> = Schema.Int
  .check(Schema.isBetween({ minimum: 1, maximum: MAX_STACK_COUNT }))
  .pipe(Schema.brand('StackCount'))

export const VehicleIdSchema: Schema.Codec<VehicleId, string> = Schema.String
  .check(Schema.isPattern(/\S/))
  .pipe(Schema.brand('VehicleId'))

import { Schema } from 'effect'
import {
  BlockAddressSchema,
  EntityIdSchema,
  SimulationTickSchema,
  WorldPositionSchema,
} from '../shared-vocabulary/shared-vocabulary.js'
import {
  DamageAmountSchema,
  EntityKindSchema,
  ExperienceAmountSchema,
  ProjectileIdSchema,
  VehicleIdSchema,
  Velocity3Schema,
} from './event-primitives.js'
import { strictEventSchema } from './strict-event-schema.js'

type EventValue<Tag extends string, Fields extends object> = Readonly<{
  _tag: Tag
  tick: Schema.Schema.Type<typeof SimulationTickSchema>
} & Fields>

type EventEncoded<Tag extends string, Fields extends object> = Readonly<{
  _tag: Tag
  tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
} & Fields>

type WeatherGameplayEffectValue =
  | Readonly<{
      _tag: 'LightningStrike'
      position: Schema.Schema.Type<typeof WorldPositionSchema>
    }>
  | Readonly<{
      _tag: 'CreeperCharged'
      entity: Schema.Schema.Type<typeof EntityIdSchema>
    }>
  | Readonly<{
      _tag: 'EntityTransformed'
      entity: Schema.Schema.Type<typeof EntityIdSchema>
      kind: Schema.Schema.Type<typeof EntityKindSchema>
    }>

type WeatherGameplayEffectEncoded =
  | Readonly<{
      _tag: 'LightningStrike'
      position: Schema.Codec.Encoded<typeof WorldPositionSchema>
    }>
  | Readonly<{
      _tag: 'CreeperCharged'
      entity: Schema.Codec.Encoded<typeof EntityIdSchema>
    }>
  | Readonly<{
      _tag: 'EntityTransformed'
      entity: Schema.Codec.Encoded<typeof EntityIdSchema>
      kind: Schema.Codec.Encoded<typeof EntityKindSchema>
    }>

const WeatherGameplayEffectPayloadSchema = Schema.Union([
  Schema.TaggedStruct('LightningStrike', {
    position: WorldPositionSchema,
  }),
  Schema.TaggedStruct('CreeperCharged', {
    entity: EntityIdSchema,
  }),
  Schema.TaggedStruct('EntityTransformed', {
    entity: EntityIdSchema,
    kind: EntityKindSchema,
  }),
])

export const WeatherGameplayEffectEventSchema: Schema.Codec<
  EventValue<'WeatherGameplayEffect', { effect: WeatherGameplayEffectValue }>,
  EventEncoded<'WeatherGameplayEffect', { effect: WeatherGameplayEffectEncoded }>
> = strictEventSchema(Schema.TaggedStruct('WeatherGameplayEffect', {
  tick: SimulationTickSchema,
  effect: WeatherGameplayEffectPayloadSchema,
}))

type ProjectileLaunchedFields = {
  projectile: Schema.Schema.Type<typeof ProjectileIdSchema>
  shooter: Schema.Schema.Type<typeof EntityIdSchema>
  origin: Schema.Schema.Type<typeof WorldPositionSchema>
  initialVelocity: Schema.Schema.Type<typeof Velocity3Schema>
}

type ProjectileLaunchedFieldsEncoded = {
  projectile: Schema.Codec.Encoded<typeof ProjectileIdSchema>
  shooter: Schema.Codec.Encoded<typeof EntityIdSchema>
  origin: Schema.Codec.Encoded<typeof WorldPositionSchema>
  initialVelocity: Schema.Codec.Encoded<typeof Velocity3Schema>
}

export const ProjectileLaunchedEventSchema: Schema.Codec<
  EventValue<'ProjectileLaunched', ProjectileLaunchedFields>,
  EventEncoded<'ProjectileLaunched', ProjectileLaunchedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('ProjectileLaunched', {
  tick: SimulationTickSchema,
  projectile: ProjectileIdSchema,
  shooter: EntityIdSchema,
  origin: WorldPositionSchema,
  initialVelocity: Velocity3Schema,
}))

const ProjectileImpactHitSchema = Schema.Union([
  Schema.TaggedStruct('Block', {
    address: BlockAddressSchema,
  }),
  Schema.TaggedStruct('Entity', {
    entity: EntityIdSchema,
  }),
])

type ProjectileImpactHitValue =
  | Readonly<{
      _tag: 'Block'
      address: Schema.Schema.Type<typeof BlockAddressSchema>
    }>
  | Readonly<{
      _tag: 'Entity'
      entity: Schema.Schema.Type<typeof EntityIdSchema>
    }>

type ProjectileImpactHitEncoded =
  | Readonly<{
      _tag: 'Block'
      address: Schema.Codec.Encoded<typeof BlockAddressSchema>
    }>
  | Readonly<{
      _tag: 'Entity'
      entity: Schema.Codec.Encoded<typeof EntityIdSchema>
    }>

type ProjectileImpactedFields = {
  projectile: Schema.Schema.Type<typeof ProjectileIdSchema>
  position: Schema.Schema.Type<typeof WorldPositionSchema>
  hit: ProjectileImpactHitValue
}

type ProjectileImpactedFieldsEncoded = {
  projectile: Schema.Codec.Encoded<typeof ProjectileIdSchema>
  position: Schema.Codec.Encoded<typeof WorldPositionSchema>
  hit: ProjectileImpactHitEncoded
}

export const ProjectileImpactedEventSchema: Schema.Codec<
  EventValue<'ProjectileImpacted', ProjectileImpactedFields>,
  EventEncoded<'ProjectileImpacted', ProjectileImpactedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('ProjectileImpacted', {
  tick: SimulationTickSchema,
  projectile: ProjectileIdSchema,
  position: WorldPositionSchema,
  hit: ProjectileImpactHitSchema,
}))

type ShieldBlockedFields = {
  attacker?: Schema.Schema.Type<typeof EntityIdSchema>
  defender: Schema.Schema.Type<typeof EntityIdSchema>
  position: Schema.Schema.Type<typeof WorldPositionSchema>
  blockedAmount: Schema.Schema.Type<typeof DamageAmountSchema>
}

type ShieldBlockedFieldsEncoded = {
  attacker?: Schema.Codec.Encoded<typeof EntityIdSchema>
  defender: Schema.Codec.Encoded<typeof EntityIdSchema>
  position: Schema.Codec.Encoded<typeof WorldPositionSchema>
  blockedAmount: Schema.Codec.Encoded<typeof DamageAmountSchema>
}

export const ShieldBlockedEventSchema: Schema.Codec<
  EventValue<'ShieldBlocked', ShieldBlockedFields>,
  EventEncoded<'ShieldBlocked', ShieldBlockedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('ShieldBlocked', {
  tick: SimulationTickSchema,
  attacker: Schema.optionalKey(EntityIdSchema),
  defender: EntityIdSchema,
  position: WorldPositionSchema,
  blockedAmount: DamageAmountSchema,
}))

type ExperienceCollectedFields = {
  player: Schema.Schema.Type<typeof EntityIdSchema>
  orb: Schema.Schema.Type<typeof EntityIdSchema>
  amount: Schema.Schema.Type<typeof ExperienceAmountSchema>
}

type ExperienceCollectedFieldsEncoded = {
  player: Schema.Codec.Encoded<typeof EntityIdSchema>
  orb: Schema.Codec.Encoded<typeof EntityIdSchema>
  amount: Schema.Codec.Encoded<typeof ExperienceAmountSchema>
}

export const ExperienceCollectedEventSchema: Schema.Codec<
  EventValue<'ExperienceCollected', ExperienceCollectedFields>,
  EventEncoded<'ExperienceCollected', ExperienceCollectedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('ExperienceCollected', {
  tick: SimulationTickSchema,
  player: EntityIdSchema,
  orb: EntityIdSchema,
  amount: ExperienceAmountSchema,
}))

type VehicleTransitionFields = {
  actor: Schema.Schema.Type<typeof EntityIdSchema>
  vehicle: Schema.Schema.Type<typeof VehicleIdSchema>
} & (
  | { transition: 'mounted'; exitReason?: never }
  | { transition: 'exited'; exitReason?: 'requested' | 'collision' | 'destroyed' }
)

type VehicleTransitionFieldsEncoded = {
  actor: Schema.Codec.Encoded<typeof EntityIdSchema>
  vehicle: Schema.Codec.Encoded<typeof VehicleIdSchema>
} & (
  | { transition: 'mounted'; exitReason?: never }
  | { transition: 'exited'; exitReason?: 'requested' | 'collision' | 'destroyed' }
)

export const VehicleTransitionEventSchema: Schema.Codec<
  EventValue<'VehicleTransition', VehicleTransitionFields>,
  EventEncoded<'VehicleTransition', VehicleTransitionFieldsEncoded>
> = strictEventSchema(Schema.Union([
  Schema.TaggedStruct('VehicleTransition', {
    tick: SimulationTickSchema,
    actor: EntityIdSchema,
    vehicle: VehicleIdSchema,
    transition: Schema.Literals(['mounted']),
    exitReason: Schema.optionalKey(Schema.Never),
  }),
  Schema.TaggedStruct('VehicleTransition', {
    tick: SimulationTickSchema,
    actor: EntityIdSchema,
    vehicle: VehicleIdSchema,
    transition: Schema.Literals(['exited']),
    exitReason: Schema.optionalKey(Schema.Literals(['requested', 'collision', 'destroyed'])),
  }),
]))

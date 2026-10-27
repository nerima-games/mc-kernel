import { Schema } from 'effect'

import {
  EntityIdSchema,
  SimulationTickSchema,
  WorldPositionSchema,
} from '../shared-vocabulary/shared-vocabulary.js'
import {
  DamageCauseSchema,
  EntityKindSchema,
  HealthAmountSchema,
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

type EntityDiedFields = {
  entity: Schema.Schema.Type<typeof EntityIdSchema>
  kind: Schema.Schema.Type<typeof EntityKindSchema>
  position: Schema.Schema.Type<typeof WorldPositionSchema>
  cause: Schema.Schema.Type<typeof DamageCauseSchema>
}

type EntityDiedFieldsEncoded = {
  entity: Schema.Codec.Encoded<typeof EntityIdSchema>
  kind: Schema.Codec.Encoded<typeof EntityKindSchema>
  position: Schema.Codec.Encoded<typeof WorldPositionSchema>
  cause: Schema.Codec.Encoded<typeof DamageCauseSchema>
}

export const EntityDiedEventSchema: Schema.Codec<
  EventValue<'EntityDied', EntityDiedFields>,
  EventEncoded<'EntityDied', EntityDiedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('EntityDied', {
  tick: SimulationTickSchema,
  entity: EntityIdSchema,
  kind: EntityKindSchema,
  position: WorldPositionSchema,
  cause: DamageCauseSchema,
}))

type EntityHealedFields = {
  entity: Schema.Schema.Type<typeof EntityIdSchema>
  amount: Schema.Schema.Type<typeof HealthAmountSchema>
  cause: 'regeneration'
}

type EntityHealedFieldsEncoded = {
  entity: Schema.Codec.Encoded<typeof EntityIdSchema>
  amount: Schema.Codec.Encoded<typeof HealthAmountSchema>
  cause: 'regeneration'
}

export const EntityHealedEventSchema: Schema.Codec<
  EventValue<'EntityHealed', EntityHealedFields>,
  EventEncoded<'EntityHealed', EntityHealedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('EntityHealed', {
  tick: SimulationTickSchema,
  entity: EntityIdSchema,
  amount: HealthAmountSchema,
  cause: Schema.Literals(['regeneration']),
}))

type EntitySpawnedFields = {
  entity: Schema.Schema.Type<typeof EntityIdSchema>
  kind: Schema.Schema.Type<typeof EntityKindSchema>
  position: Schema.Schema.Type<typeof WorldPositionSchema>
}

type EntitySpawnedFieldsEncoded = {
  entity: Schema.Codec.Encoded<typeof EntityIdSchema>
  kind: Schema.Codec.Encoded<typeof EntityKindSchema>
  position: Schema.Codec.Encoded<typeof WorldPositionSchema>
}

export const EntitySpawnedEventSchema: Schema.Codec<
  EventValue<'EntitySpawned', EntitySpawnedFields>,
  EventEncoded<'EntitySpawned', EntitySpawnedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('EntitySpawned', {
  tick: SimulationTickSchema,
  entity: EntityIdSchema,
  kind: EntityKindSchema,
  position: WorldPositionSchema,
}))

type EntityTeleportedFields = {
  entity: Schema.Schema.Type<typeof EntityIdSchema>
  from: Schema.Schema.Type<typeof WorldPositionSchema>
  to: Schema.Schema.Type<typeof WorldPositionSchema>
  cause: 'nether-portal' | 'end-portal' | 'ender-pearl' | 'enderman'
}

type EntityTeleportedFieldsEncoded = {
  entity: Schema.Codec.Encoded<typeof EntityIdSchema>
  from: Schema.Codec.Encoded<typeof WorldPositionSchema>
  to: Schema.Codec.Encoded<typeof WorldPositionSchema>
  cause: 'nether-portal' | 'end-portal' | 'ender-pearl' | 'enderman'
}

export const EntityTeleportedEventSchema: Schema.Codec<
  EventValue<'EntityTeleported', EntityTeleportedFields>,
  EventEncoded<'EntityTeleported', EntityTeleportedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('EntityTeleported', {
  tick: SimulationTickSchema,
  entity: EntityIdSchema,
  from: WorldPositionSchema,
  to: WorldPositionSchema,
  cause: Schema.Literals(['nether-portal', 'end-portal', 'ender-pearl', 'enderman']),
}))

import { Schema } from 'effect'

import {
  EntityIdSchema,
  ItemIdSchema,
  SimulationTickSchema,
  WorldPositionSchema,
} from '../shared-vocabulary/shared-vocabulary.js'
import { ProjectileIdSchema, StackCountSchema } from './event-primitives.js'

type EventValue<Tag extends string, Fields extends object> = Readonly<{
  _tag: Tag
  tick: Schema.Schema.Type<typeof SimulationTickSchema>
} & Fields>

type EventEncoded<Tag extends string, Fields extends object> = Readonly<{
  _tag: Tag
  tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
} & Fields>

type ItemPickupSourceValue =
  | Readonly<{ _tag: 'DroppedItem'; id: Schema.Schema.Type<typeof EntityIdSchema> }>
  | Readonly<{ _tag: 'Projectile'; id: Schema.Schema.Type<typeof ProjectileIdSchema> }>

type ItemPickupSourceEncoded =
  | Readonly<{ _tag: 'DroppedItem'; id: Schema.Codec.Encoded<typeof EntityIdSchema> }>
  | Readonly<{ _tag: 'Projectile'; id: Schema.Codec.Encoded<typeof ProjectileIdSchema> }>

const ItemPickupSourceSchema: Schema.Codec<ItemPickupSourceValue, ItemPickupSourceEncoded> =
  Schema.Union([
    Schema.TaggedStruct('DroppedItem', {
      id: EntityIdSchema,
    }),
    Schema.TaggedStruct('Projectile', {
      id: ProjectileIdSchema,
    }),
  ])

type ItemDroppedFields = {
  droppedItem: Schema.Schema.Type<typeof EntityIdSchema>
  item: Schema.Schema.Type<typeof ItemIdSchema>
  count: Schema.Schema.Type<typeof StackCountSchema>
  position: Schema.Schema.Type<typeof WorldPositionSchema>
}

type ItemDroppedFieldsEncoded = {
  droppedItem: Schema.Codec.Encoded<typeof EntityIdSchema>
  item: Schema.Codec.Encoded<typeof ItemIdSchema>
  count: Schema.Codec.Encoded<typeof StackCountSchema>
  position: Schema.Codec.Encoded<typeof WorldPositionSchema>
}

export const ItemDroppedEventSchema: Schema.Codec<
  EventValue<'ItemDropped', ItemDroppedFields>,
  EventEncoded<'ItemDropped', ItemDroppedFieldsEncoded>
> = Schema.TaggedStruct('ItemDropped', {
  tick: SimulationTickSchema,
  droppedItem: EntityIdSchema,
  item: ItemIdSchema,
  count: StackCountSchema,
  position: WorldPositionSchema,
})

type ItemPickedUpFields = {
  actor: Schema.Schema.Type<typeof EntityIdSchema>
  source: Schema.Schema.Type<typeof ItemPickupSourceSchema>
  item: Schema.Schema.Type<typeof ItemIdSchema>
  count: Schema.Schema.Type<typeof StackCountSchema>
}

type ItemPickedUpFieldsEncoded = {
  actor: Schema.Codec.Encoded<typeof EntityIdSchema>
  source: Schema.Codec.Encoded<typeof ItemPickupSourceSchema>
  item: Schema.Codec.Encoded<typeof ItemIdSchema>
  count: Schema.Codec.Encoded<typeof StackCountSchema>
}

export const ItemPickedUpEventSchema: Schema.Codec<
  EventValue<'ItemPickedUp', ItemPickedUpFields>,
  EventEncoded<'ItemPickedUp', ItemPickedUpFieldsEncoded>
> = Schema.TaggedStruct('ItemPickedUp', {
  tick: SimulationTickSchema,
  actor: EntityIdSchema,
  source: ItemPickupSourceSchema,
  item: ItemIdSchema,
  count: StackCountSchema,
})

type ItemConsumedFields = {
  actor: Schema.Schema.Type<typeof EntityIdSchema>
  item: Schema.Schema.Type<typeof ItemIdSchema>
  count: Schema.Schema.Type<typeof StackCountSchema>
  use: 'food' | 'potion' | 'bow-ammo' | 'ender-pearl'
}

type ItemConsumedFieldsEncoded = {
  actor: Schema.Codec.Encoded<typeof EntityIdSchema>
  item: Schema.Codec.Encoded<typeof ItemIdSchema>
  count: Schema.Codec.Encoded<typeof StackCountSchema>
  use: 'food' | 'potion' | 'bow-ammo' | 'ender-pearl'
}

export const ItemConsumedEventSchema: Schema.Codec<
  EventValue<'ItemConsumed', ItemConsumedFields>,
  EventEncoded<'ItemConsumed', ItemConsumedFieldsEncoded>
> = Schema.TaggedStruct('ItemConsumed', {
  tick: SimulationTickSchema,
  actor: EntityIdSchema,
  item: ItemIdSchema,
  count: StackCountSchema,
  use: Schema.Literals(['food', 'potion', 'bow-ammo', 'ender-pearl']),
})

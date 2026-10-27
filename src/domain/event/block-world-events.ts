import { Schema } from 'effect'

import {
  BlockAddressSchema,
  BlockIdSchema,
  EntityIdSchema,
  SimulationTickSchema,
} from '../shared-vocabulary/shared-vocabulary.js'
import { strictEventSchema } from './strict-event-schema.js'

type EventValue<Tag extends string, Fields extends object> = Readonly<{
  _tag: Tag
  tick: Schema.Schema.Type<typeof SimulationTickSchema>
} & Fields>

type EventEncoded<Tag extends string, Fields extends object> = Readonly<{
  _tag: Tag
  tick: Schema.Codec.Encoded<typeof SimulationTickSchema>
} & Fields>

type BlockPlacedFields = {
  actor: Schema.Schema.Type<typeof EntityIdSchema>
  address: Schema.Schema.Type<typeof BlockAddressSchema>
  block: Schema.Schema.Type<typeof BlockIdSchema>
}

type BlockPlacedFieldsEncoded = {
  actor: Schema.Codec.Encoded<typeof EntityIdSchema>
  address: Schema.Codec.Encoded<typeof BlockAddressSchema>
  block: Schema.Codec.Encoded<typeof BlockIdSchema>
}

export const BlockPlacedEventSchema: Schema.Codec<
  EventValue<'BlockPlaced', BlockPlacedFields>,
  EventEncoded<'BlockPlaced', BlockPlacedFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('BlockPlaced', {
  tick: SimulationTickSchema,
  actor: EntityIdSchema,
  address: BlockAddressSchema,
  block: BlockIdSchema,
}))

type BlockChangedByWorldFields = {
  address: Schema.Schema.Type<typeof BlockAddressSchema>
  cause: 'fire' | 'weather' | 'fluid' | 'support-cascade' | 'explosion'
}

type BlockChangedByWorldFieldsEncoded = {
  address: Schema.Codec.Encoded<typeof BlockAddressSchema>
  cause: 'fire' | 'weather' | 'fluid' | 'support-cascade' | 'explosion'
}

export const BlockChangedByWorldEventSchema: Schema.Codec<
  EventValue<'BlockChangedByWorld', BlockChangedByWorldFields>,
  EventEncoded<'BlockChangedByWorld', BlockChangedByWorldFieldsEncoded>
> = strictEventSchema(Schema.TaggedStruct('BlockChangedByWorld', {
  tick: SimulationTickSchema,
  address: BlockAddressSchema,
  cause: Schema.Literals(['fire', 'weather', 'fluid', 'support-cascade', 'explosion']),
}))

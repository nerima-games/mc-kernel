import { Schema } from 'effect'
import { safeUnknownSchema } from '../safe-unknown-schema.js'

export const strictEventSchema = <A, I>(
  schema: Schema.Codec<A, I>,
): Schema.Codec<A, I> => safeUnknownSchema(schema, { onExcessProperty: 'error' })

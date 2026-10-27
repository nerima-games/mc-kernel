import { Schema, SchemaParser } from 'effect'

export const strictEventSchema = <A, I>(
  schema: Schema.Codec<A, I>,
): Schema.Codec<A, I> =>
  Schema.declareConstructor<A, I>()(
    [schema],
    ([inner]) => (input, _ast, options) =>
      SchemaParser.decodeUnknownEffect(inner)(input, {
        ...options,
        onExcessProperty: 'error',
      }),
  )

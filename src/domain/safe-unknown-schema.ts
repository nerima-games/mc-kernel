import { Effect, Schema, SchemaAST, SchemaIssue, SchemaParser } from 'effect'

export const safeUnknownSchema = <A, I>(
  schema: Schema.Codec<A, I>,
  parseOptions: SchemaAST.ParseOptions = {},
): Schema.Codec<A, I> =>
  Schema.declareConstructor<A, I>()(
    [schema],
    ([inner]) => (input, ast, options) =>
      Effect.catchDefect(
        Effect.suspend(() =>
          SchemaParser.decodeUnknownEffect(inner)(input, {
            ...options,
            ...parseOptions,
          }),
        ),
        // Never inspect the input again after a parser defect from an untrusted trap.
        () => Effect.fail(new SchemaIssue.InvalidType(ast)),
      ),
  )

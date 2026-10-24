import { Effect, Schema } from 'effect'
import type { SaveSliceId, SaveVersion } from '../module-contracts/module-contracts.js'

export interface SaveMigration<To extends Schema.Codec<unknown> = Schema.Codec<unknown>> {
  readonly fromVersion: SaveVersion
  readonly toVersion: SaveVersion
  readonly run: (encoded: unknown) => Effect.Effect<To['Encoded'], Schema.SchemaError>
}

export const defineSaveMigration = <
  From extends Schema.Codec<unknown>,
  To extends Schema.Codec<unknown>
>(
  fromVersion: SaveVersion,
  toVersion: SaveVersion,
  fromSchema: From,
  toSchema: To,
  migrate: (value: From['Type']) => To['Type'],
): SaveMigration<To> => ({
  fromVersion,
  toVersion,
  run: (encoded) =>
    Schema.decodeUnknownEffect(fromSchema)(encoded).pipe(
      Effect.flatMap((value) => Schema.encodeUnknownEffect(toSchema)(migrate(value))),
    ),
})

export interface SaveSliceRegistration<
  Slice extends Schema.Codec<unknown> = Schema.Codec<unknown>,
  RestoreError = unknown,
  Requirements = unknown
> {
  readonly id: SaveSliceId
  readonly version: SaveVersion
  readonly schema: Slice
  readonly snapshot: Effect.Effect<Slice['Type'], never, Requirements>
  restore(state: Slice['Type']): Effect.Effect<void, RestoreError, Requirements>
  readonly migrations: ReadonlyArray<SaveMigration>
}

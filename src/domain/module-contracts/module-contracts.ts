import { BlockAddressSchema, BlockIdSchema } from '../shared-vocabulary/shared-vocabulary.js'
import type { BlockId } from '../shared-vocabulary/shared-vocabulary.js'
import { type Brand, type Effect, Schema } from 'effect'

type SaveSliceIdValue = Brand.Branded<string, 'SaveSliceId'>
type SaveVersionValue = Brand.Branded<number, 'SaveVersion'>
type QaNamespaceNameValue = Brand.Branded<string, 'QaNamespaceName'>
type QaOperationNameValue = Brand.Branded<string, 'QaOperationName'>
type ModuleContractIdValue = Brand.Branded<string, 'ModuleContractId'>
type ModuleContractKindValue = Brand.Branded<
  'qa-namespace' | 'qa-operation' | 'save-slice',
  'ModuleContractKind'
>

export const SaveSliceIdSchema: Schema.Codec<SaveSliceIdValue, string> = Schema.NonEmptyString.pipe(
  Schema.brand('SaveSliceId'),
)
export type SaveSliceId = Schema.Schema.Type<typeof SaveSliceIdSchema>

export const SaveVersionSchema: Schema.Codec<SaveVersionValue, number> = Schema.Int
  .check(Schema.isGreaterThan(0))
  .pipe(Schema.brand('SaveVersion'))
export type SaveVersion = Schema.Schema.Type<typeof SaveVersionSchema>

export const QaNamespaceNameSchema: Schema.Codec<QaNamespaceNameValue, string> =
  Schema.NonEmptyString.pipe(Schema.brand('QaNamespaceName'))
export type QaNamespaceName = Schema.Schema.Type<typeof QaNamespaceNameSchema>

export const QaOperationNameSchema: Schema.Codec<QaOperationNameValue, string> =
  Schema.NonEmptyString.pipe(Schema.brand('QaOperationName'))
export type QaOperationName = Schema.Schema.Type<typeof QaOperationNameSchema>

export const ModuleContractIdSchema: Schema.Codec<ModuleContractIdValue, string> =
  Schema.NonEmptyString.pipe(Schema.brand('ModuleContractId'))
export type ModuleContractId = Schema.Schema.Type<typeof ModuleContractIdSchema>

export const ModuleContractKindSchema: Schema.Codec<
  ModuleContractKindValue,
  'qa-namespace' | 'qa-operation' | 'save-slice'
> =
  Schema.Literals(['qa-namespace', 'qa-operation', 'save-slice']).pipe(
    Schema.brand('ModuleContractKind'),
  )
export type ModuleContractKind = Schema.Schema.Type<typeof ModuleContractKindSchema>

export interface QaOperation<
  Input extends Schema.Codec<unknown>,
  Output extends Schema.Codec<unknown>,
  Error = never,
  Requirements = never
> {
  readonly name: QaOperationName
  readonly input: Input
  readonly output: Output
  readonly run: (
    input: Input['Type'],
  ) => Effect.Effect<Output['Type'], Error, Requirements>
}

export interface QaNamespace<
  Observe extends object = object,
  Command extends object = object
> {
  readonly name: QaNamespaceName
  readonly observe: Observe
  readonly command: Command
}

type QaBlockPositionInputValue = Readonly<{
  address: Schema.Schema.Type<typeof BlockAddressSchema>
}>
type QaBlockPositionInputEncoded = Readonly<{ address: typeof BlockAddressSchema['Encoded'] }>
export const QaBlockPositionInput: Schema.Codec<
  QaBlockPositionInputValue,
  QaBlockPositionInputEncoded
> = Schema.Struct({ address: BlockAddressSchema })

type QaBlockIdOutputValue = Readonly<{ blockId: BlockId }>
type QaBlockIdOutputEncoded = Readonly<{ blockId: typeof BlockIdSchema['Encoded'] }>
export const QaBlockIdOutput: Schema.Codec<QaBlockIdOutputValue, QaBlockIdOutputEncoded> =
  Schema.Struct({ blockId: BlockIdSchema })

export type ObserveBlockAtQa = QaOperation<typeof QaBlockPositionInput, typeof QaBlockIdOutput>

export type ExampleQaNamespace = QaNamespace<{
  readonly blockAt: ObserveBlockAtQa
}>

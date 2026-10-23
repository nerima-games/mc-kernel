import { Effect, Layer, Schema } from 'effect'
import {
  QaBlockIdOutput,
  QaBlockPositionInput,
  QaNamespaceNameSchema,
  QaOperationNameSchema,
  type ExampleQaNamespace,
  type ObserveBlockAtQa,
} from '../src/domain/module-contracts/module-contracts.js'
import type { GameModule, KernelGameModule } from '../src/domain/time/frame.js'
import { BlockId } from '../src/domain/block/block-registry-types.js'

const namespaceName = Schema.decodeUnknownSync(QaNamespaceNameSchema)('example')
const operationName = Schema.decodeUnknownSync(QaOperationNameSchema)('blockAt')

const blockAt: ObserveBlockAtQa = {
  name: operationName,
  input: QaBlockPositionInput,
  output: QaBlockIdOutput,
  run: () => Effect.succeed({ blockId: BlockId(0) }),
}

const exampleQa: ExampleQaNamespace = {
  name: namespaceName,
  observe: { blockAt },
  command: {},
}

export const noQaModule: GameModule<never, never, never> = {
  frameStages: Effect.succeed([]),
  layers: Layer.empty,
}

export const validQaModule: GameModule<never, never, never> = {
  frameStages: Effect.succeed([]),
  layers: Layer.empty,
  qa: exampleQa,
  saveSlices: [],
}

export const baseModule: KernelGameModule<never, never, never> = {
  frameStages: Effect.succeed([]),
  layers: Layer.empty,
}

export const invalidQaModule: GameModule<never, never, never> = {
  frameStages: Effect.succeed([]),
  layers: Layer.empty,
  // @ts-expect-error The QA namespace name must be branded by its schema.
  qa: { name: 'example', observe: {}, command: {} },
}

export const invalidSaveSlicesModule: GameModule<never, never, never> = {
  frameStages: Effect.succeed([]),
  layers: Layer.empty,
  // @ts-expect-error Each save slice must satisfy SaveSliceRegistration.
  saveSlices: [{}],
}

import type { BlockType } from './block-type.js'
import type { BlockId } from './block-registry-types.js'
import type { BlockCapabilityOverrides } from './block-capability-data.js'
import type { BlockPropertyName } from './block-property-data.js'

export type BlockRegistryEntryInput = Readonly<{
  readonly id: BlockId
  readonly definition: Readonly<{
    readonly type: BlockType
    readonly capabilities?: BlockCapabilityOverrides
    readonly properties?: Readonly<Partial<Record<BlockPropertyName, unknown>>>
  }>
}>

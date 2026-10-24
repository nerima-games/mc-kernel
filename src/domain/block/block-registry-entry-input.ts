import type { BlockType } from './block-type.js'
import type { BlockId } from './block-registry-types.js'
import type { BlockCapabilityOverrides } from './block-capability-data.js'
import type { BlockProperties, BlockPropertyName } from './block-property-data.js'

export type BlockPropertyOverrideInput = {
  readonly [K in BlockPropertyName]?: BlockProperties[K] extends number ? number : BlockProperties[K]
}

export type BlockRegistryEntryInput = Readonly<{
  readonly id: BlockId
  readonly definition: Readonly<{
    readonly type: BlockType
    readonly capabilities?: BlockCapabilityOverrides
    readonly properties?: BlockPropertyOverrideInput
  }>
}>

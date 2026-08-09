/**
 * Stable public import path for block-id lookup and query APIs.
 *
 * The registry entries own declarative data, while the index module owns all
 * derived state and query logic. This facade preserves the stable public path.
 */
export { BLOCK_REGISTRY } from './block-registry-entries.js'
export {
  BLOCK_IDS,
  UNREGISTERED_BLOCK_TYPES,
  blockIdOf,
  blockIdsWithCapability,
  blockIdsWithOpacity,
  blockTypeOfId,
  canBlockStaySupported,
  capabilitiesOfBlockId,
  capabilityOfBlockId,
  dropOfBlockId,
  isKnownBlockId,
  isSupportSensitiveBlockId,
  lightEmissionOfBlockId,
  opacityOfBlockId,
  propertyOfBlockId,
  resolvedBlockOfId,
  supportRuleOfBlockId,
  transmitsLight,
} from './block-registry-indexes.js'
export { AIR_BLOCK_ID, BLOCK_ID_MAX, BlockId, isEmpty } from './block-registry-types.js'
export type { BlockRegistryEntry } from './block-registry-types.js'

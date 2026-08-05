/**
 * Stable public import path for block-id lookup and query APIs.
 *
 * The registry data owns the dense, chunk-buffer-oriented lookup tables. This
 * module intentionally contains no derived state so consumers have one
 * canonical implementation while retaining their existing import path.
 */
export {
  BLOCK_IDS,
  BLOCK_REGISTRY,
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
} from './block-registry-data.js'
export { AIR_BLOCK_ID, BLOCK_ID_MAX, BlockId } from './block-registry-types.js'
export type { BlockRegistryEntry } from './block-registry-types.js'

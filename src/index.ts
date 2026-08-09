/**
 * Public package boundary for platform-independent Minecraft domain contracts.
 *
 * Runtime data tables stay beside the logic that consumes them, while this
 * module exposes only the package's intentional public surface. Platform
 * integrations belong in their owning packages; the kernel contains no
 * platform adapter layer.
 */

export * from './domain/block-capabilities.js'
export * from './domain/anvil.js'
export * from './domain/block-definition.js'
export * from './domain/block-harvest.js'
export * from './domain/block-item.js'
export * from './domain/block-properties.js'
export * from './domain/block-registry.js'
export * from './domain/block-state.js'
export * from './domain/block-support.js'
export * from './domain/block-type.js'
export { blockPositionKeyOf } from './domain/block-position-key.js'
export * from './domain/camera.js'
export * from './domain/clock.js'
export * from './domain/chunk.js'
export * from './domain/coordinates.js'
export * from './domain/frame.js'
export * from './domain/identifiers.js'
export * from './domain/item-registry.js'
export * from './domain/item-type.js'
export * from './domain/quantities.js'

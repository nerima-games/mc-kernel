/**
 * The sole supported public entry point for mc-kernel.
 *
 * `domain/` contains platform-independent types, pure functions, and data
 * tables. Consumers import from this facade rather than deep-importing a
 * domain module, so internals can be reorganized without changing the package
 * contract.
 */

// Core vocabulary and runtime-neutral ports.
export * from './domain/identifiers.js'
export * from './domain/quantities.js'
export * from './domain/coordinates.js'
export * from './domain/camera.js'
export * from './domain/clock.js'
export * from './domain/frame.js'

// Block and item vocabulary, behavior, and canonical lookup data.
export * from './domain/block-type.js'
export * from './domain/item-type.js'
export * from './domain/block-item.js'
export * from './domain/block-capabilities.js'
export * from './domain/block-properties.js'
export * from './domain/block-support.js'
export * from './domain/block-harvest.js'
export * from './domain/block-definition.js'
export * from './domain/block-registry.js'

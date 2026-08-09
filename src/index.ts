/**
 * @nerima-games/mc-kernel — the vocabulary every other repository shares.
 *
 * Documentation index: docs/README.md. The block capability model is
 * reconciled with docs/capability-flag-audit.md (27 of its 28 capabilities
 * implemented, 1 pending with a recorded reason — see PENDING_CAPABILITIES).
 * `FrameServices` is SETTLED (`ClockPort`, and nothing else) — see
 * docs/freeze-checklist.md (b). The versioned Chunk codec lives in
 * `domain/chunk.ts`. See README.md 現状.
 *
 * It now carries BOTH vocabularies plan.md §3.1 asked for. `ItemType`
 * (`domain/item-type.ts`) was the missing half; while it was missing, mc-sim,
 * mc-playground-kit and mx-ui each grew a provisional `type ItemId = string`.
 * `domain/block-item.ts` bridges the two — by derivation, which is audit §6-8's
 * instruction — and `dropOfBlockId` joins a broken chunk-buffer byte to the
 * item that lands in the inventory, which is the seam mc-compose's cross-module
 * E2E suite could not express.
 *
 * Kernel sits at the bottom of the four-tier architecture. It depends on
 * `effect` and on nothing else, and every one of the other 15 repositories may
 * import it. It therefore contains only things that are true regardless of
 * platform, renderer or game rules: identifiers, quantities, coordinates, the
 * block capability mechanism, and the contracts by which modules compose.
 *
 * It contains no adapter, on purpose — anything with a platform in it belongs
 * to the repository that owns that platform.
 *
 * It DOES now contain a block table and the numeric-id registry
 * (`domain/block-registry.ts`). That reverses an earlier position, and the
 * argument is in that file's header: the three repositories that need to read a
 * capability off a chunk buffer byte (mc-meshing, mc-physics, mx-gameplay) sit
 * in disjoint parts of the dependency graph, so mc-kernel is the only place all
 * three can see. The mechanism/content separation is unchanged — the table
 * states overrides only, and adding a block is still one row.
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

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

export * from './domain/block-capabilities'
export * from './domain/anvil'
export * from './domain/block-definition'
export * from './domain/block-harvest'
export * from './domain/block-item'
export * from './domain/block-properties'
export * from './domain/block-registry'
export * from './domain/block-state'
export * from './domain/block-support'
export * from './domain/block-type'
export { blockPositionKey } from './domain/block-position-key'
export * from './domain/camera'
export * from './domain/clock'
export * from './domain/chunk'
export * from './domain/coordinates'
export * from './domain/frame'
export * from './domain/identifiers'
export * from './domain/item-registry'
export * from './domain/item-type'
export * from './domain/quantities'

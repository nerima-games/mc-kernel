/**
 * @nerima-games/mc-kernel — the vocabulary every other repository shares.
 *
 * Documentation index: docs/README.md. The block capability model is
 * reconciled with docs/capability-flag-audit.md (24 of its 28 capabilities
 * implemented, 4 pending with recorded reasons — see PENDING_CAPABILITIES).
 * Still outstanding: the Chunk codec, the full 120-literal block roster, and
 * FrameServices. See README.md 現状 and docs/freeze-checklist.md.
 *
 * Kernel sits at the bottom of the four-tier architecture. It depends on
 * `effect` and on nothing else, and every one of the other 15 repositories may
 * import it. It therefore contains only things that are true regardless of
 * platform, renderer or game rules: identifiers, quantities, coordinates, the
 * block capability mechanism, and the contracts by which modules compose.
 *
 * It contains no block table, no registry and no adapter, on purpose — anything
 * with a policy in it belongs to the repository that owns that policy.
 */

export * from './domain/block-capabilities'
export * from './domain/block-definition'
export * from './domain/block-harvest'
export * from './domain/block-properties'
export * from './domain/block-type'
export * from './domain/camera'
export * from './domain/clock'
export * from './domain/coordinates'
export * from './domain/frame'
export * from './domain/identifiers'
export * from './domain/quantities'

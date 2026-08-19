/**
 * `BlockDefinition` — one row of a block table, and the invariant that adding a
 * block must never be more than that.
 *
 * the design contract: *ブロック追加 = 定義テーブル1行 + フラグ設定、で完結すること.*
 * That sentence is the entire point of the capability model, and
 * `test/block-definition.test.ts` carries it as a named regression test
 * ("adding a block is one table row plus flag settings") so that the invariant
 * is checked rather than merely aspired to.
 *
 * A definition names a block and states only its DIFFERENCES from an ordinary
 * opaque solid cube — booleans in `capabilities`, typed values in `properties`.
 * Everything omitted resolves to the documented default. There is no place in
 * this type to put a hand-written behaviour branch, which is the structural
 * property the design contract asks for: the reference implementation scattered
 * `blockType === 'SAND'` checks across production code (measured on the
 * reference: 90 occurrences in 38 files, tests excluded — see
 * `historical design audit` for the exact command and why it differs from
 * the design contract quoted 51/229), which made engine/content separation impossible.
 *
 * ---------------------------------------------------------------------------
 * Where the table lives — this used to say "not here"
 * ---------------------------------------------------------------------------
 *
 * The previous text read: *which blocks exist and what their capabilities are
 * is content, and content belongs to whichever repository owns that content.
 * Kernel shipping a guessed table would make every downstream table a fork of a
 * guess.*
 *
 * That argument held while nothing consumed a table. It stopped holding when
 * the vertical-slice spike found three consumers — mc-meshing (`opacity` per
 * numeric id), mc-physics (`passable` per numeric id) and mx-gameplay
 * (`fallsWhenUnsupported` per numeric id) — sitting in three parts of the
 * dependency graph with no common repository except mc-kernel. Under the design contract
 * §2.3-5 dependencies do not transit, so "somewhere downstream" was not an
 * available location: it meant three tables.
 *
 * The table is therefore `./block-registry`, and the fear behind the old text
 * is answered by the mechanism rather than by the location — the table states
 * OVERRIDES only, so a wrong row is one wrong line rather than a fork.
 */
import {
  type BlockCapabilities,
  type BlockCapabilityOverrides,
  resolveBlockCapabilities,
} from './block-capabilities.js'
import {
  type BlockProperties,
  type BlockPropertyOverrides,
  resolveBlockProperties,
} from './block-properties.js'
import type { BlockType } from './block-type.js'

/**
 * One row of a block table.
 *
 * `capabilities` and `properties` are both optional, and every key inside them
 * is optional. `{ type: 'stone' }` is a complete, valid definition.
 */
export type BlockDefinition = {
  readonly type: BlockType
  readonly capabilities?: BlockCapabilityOverrides
  readonly properties?: BlockPropertyOverrides
}

/** A definition with every capability and property filled in. */
export type ResolvedBlock = {
  readonly type: BlockType
  readonly capabilities: BlockCapabilities
  readonly properties: BlockProperties
}

/** Resolve a definition's capability flags, defaulting an absent field to the defaults. */
export const blockCapabilitiesOf = (definition: BlockDefinition): BlockCapabilities =>
  resolveBlockCapabilities(definition.capabilities ?? {})

/** Resolve a definition's typed properties, defaulting an absent field to the defaults. */
export const blockPropertiesOf = (definition: BlockDefinition): BlockProperties =>
  resolveBlockProperties(definition.properties ?? {})

/** Resolve both halves at once. */
export const resolveBlock = (definition: BlockDefinition): ResolvedBlock => ({
  capabilities: blockCapabilitiesOf(definition),
  properties: blockPropertiesOf(definition),
  type: definition.type,
})

// ---------------------------------------------------------------------------
// Capability ledger: what the audit found and where its authoritative data lives
// ---------------------------------------------------------------------------

/**
 * The capability names `historical design audit` §3 enumerates, in the
 * order the audit's table lists them.
 *
 * The audit's §7 prose says "26 能力"; its §3 table has 28 rows. The table is
 * the more specific artefact and is what this constant mirrors. The
 * discrepancy is recorded rather than silently resolved.
 */
export const AUDITED_CAPABILITY_NAMES: ReadonlyArray<string> = [
  'passable',
  'collisionShape',
  'fluid',
  'fallsWhenUnsupported',
  'replaceable',
  'flammable',
  'fireSource',
  'opacity',
  'lightEmission',
  'pistonImmovable',
  'hardness',
  'friction',
  'harvestTool',
  'supportRule',
  'canSupportAttachments',
  'brokenByWaterFlow',
  'suffocates',
  'contactDamage',
  'climbable',
  'railKind',
  'movementDrag',
  'renderKind',
  'validSpawnSurface',
  'drops',
  'xpOnBreak',
  'footstepMaterial',
  'tillable',
  'textureTiles',
]

/**
 * Audited capabilities whose authoritative data or consumer belongs downstream.
 *
 * The kernel vocabulary and registry are now complete: both contain 123 rows.
 * The reference implementation still defines 120 block kinds; the kernel adds
 * the three explicit domain rows that the consuming API requires.
 *
 * Implemented columns:
 *
 *   `supportRule`       `./block-support` carries the column and the registry
 *     fills in all nineteen non-default rows. The default is `none`.
 *
 *   `footstepMaterial`  is a pure surface classification. Kernel deliberately
 *     does not own cue IDs or audio playback; mc-audio remains the owner.
 *
 *   `tillable`          is implemented in the kernel registry. Consumers use
 *     the kernel column directly rather than maintaining a mirror.
 *
 *   `textureTiles`      belongs to the renderer. A tile assignment is a
 *     face-role map into a renderer-owned atlas, not a block property that can
 *     be derived from the kernel registry. The renderer also has to supply
 *     assignments for its own asset set, so a numeric storage-index column
 *     here would create a second, positional source of truth.
 *
 * Adding a capability is deliberately separate from the registry change. It is
 * a semver-minor addition to a package fourteen repositories pin, so it should
 * arrive as its own reviewable diff rather than being buried in the data table.
 *
 * Separately rejected, and therefore absent from both this list and the tables:
 * `properties.solid` and `faces`, which the reference carries but which the
 * audit verified are never read in production. Porting unread fields would make
 * the public contract larger without adding behavior.
 */

export const DOWNSTREAM_CAPABILITIES: ReadonlyArray<{
  readonly name: string
  readonly kind: 'flag' | 'property'
  readonly owner: 'renderer'
  readonly why: string
}> = [
  {
    kind: 'property',
    name: 'textureTiles',
    owner: 'renderer',
    why:
      'audit §4.8 records a positional block-texture array, while the renderer ' +
      'owns the atlas layout, face-role tile assignments, and image assets. ' +
      'Moving that numeric table into the kernel would create a second source ' +
      'of truth and would not define assets for kernel-only block rows.',
  },
]

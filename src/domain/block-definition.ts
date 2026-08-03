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
import type { BlockCapabilities, BlockCapabilityOverrides } from './block-capabilities.js'
import { resolveBlockCapabilities } from './block-capabilities.js'
import type { BlockProperties, BlockPropertyOverrides } from './block-properties.js'
import { resolveBlockProperties } from './block-properties.js'
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
  type: definition.type,
  capabilities: blockCapabilitiesOf(definition),
  properties: blockPropertiesOf(definition),
})

// ---------------------------------------------------------------------------
// Honesty ledger: what the audit found vs what kernel implements today
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
 * Audited capabilities kernel does NOT implement yet, each with the reason and
 * the audit reference a future implementer needs.
 *
 * These are pending, not rejected. Every one of them can be added additively
 * (one row in the flag table or two lines in the property table) precisely
 * because the mechanism was built first.
 *
 * ---------------------------------------------------------------------------
 * THREE OF THE FOUR HAVE LANDED; ONE MORE REMAINS. The roster arrived.
 * ---------------------------------------------------------------------------
 *
 * Three of these entries said, in one form or another, that the capability
 * could not be given a meaningful default 「until the block roster exists」.
 * `./block-type` is now the reference's full 120 and `./block-registry` has a
 * row for every one, so that sentence has stopped being true. Recorded here
 * because a blocker that has silently expired is worse than a live one: it
 * keeps deterring work that nothing is actually preventing.
 *
 * What changed, capability by capability:
 *
 *   `supportRule`       IMPLEMENTED, and no longer on this list.
 *     `./block-support` carries the column and `./block-registry` fills in all
 *     nineteen non-default rows. Every block `block-support.ts:75-91` needs to
 *     name was in the roster — `farmland` (which all three crops require),
 *     `dirt`, `grass_block`, `sand`, `water`, `sugar_cane`, `cactus`,
 *     `lily_pad`. `farmland` was the last missing one, and its absence was what
 *     had made the rule unwritable.
 *
 *   `textureTiles`      UNBLOCKED as to the roster, but a design question
 *     survives it. Audit §4.8's objection — that the reference keeps a
 *     positional array indexed by storage index, double-managed against the
 *     definition table — is about the SHAPE and is untouched by the roster.
 *     "There is no block table yet" is no longer among the reasons to wait.
 *
 *   `footstepMaterial`  IMPLEMENTED as a pure surface classification. Kernel
 *     deliberately does not own cue IDs or audio playback; mc-audio remains
 *     the owner of those concerns.
 *
 *   `tillable`          IMPLEMENTED in the kernel registry. mx-gameplay keeps a
 *     compatibility mirror until it consumes the next published kernel API.
 *
 * Implementing the remaining entries is deliberately separate from the roster
 * change. A capability is a semver-MINOR addition to a package fourteen
 * repositories pin, and it should arrive as its own reviewable diff rather than
 * buried in an 84-row table. `supportRule` and `tillable` arrived that way.
 *
 * Separately REJECTED, and therefore absent from both this list and the tables:
 * `properties.solid` and `faces`, which the reference's `BlockPropertiesSchema`
 * carries but which audit §7 verified are never read in production (`rg
 * '\.solid\b'` / `rg '\.faces\b'` -> 0 hits). Porting a field nobody reads
 * would have been the cheapest possible way to make the freeze wrong.
 */
export const PENDING_CAPABILITIES: ReadonlyArray<{
  readonly name: string
  readonly kind: 'flag' | 'property'
  readonly why: string
}> = [
  {
    name: 'textureTiles',
    kind: 'property',
    why:
      'audit §4.8 (block-texture-map.config.ts:18). The audit records that this ' +
      'is currently a positional array indexed by storage index, double-managed ' +
      'against the definition table, and that it has no default at all. The ' +
      'roster half of that is UNBLOCKED — the real block roster exists now — but ' +
      'the double-management objection is about the shape and still stands.',
  },
]

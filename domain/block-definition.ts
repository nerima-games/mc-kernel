/**
 * `BlockDefinition` — one row of a block table, and the invariant that adding a
 * block must never be more than that.
 *
 * plan.md §3.1: *ブロック追加 = 定義テーブル1行 + フラグ設定、で完結すること.*
 * That sentence is the entire point of the capability model, and
 * `test/block-definition.test.ts` carries it as a named regression test
 * ("adding a block is one table row plus flag settings") so that the invariant
 * is checked rather than merely aspired to.
 *
 * A definition names a block and states only its DIFFERENCES from an ordinary
 * opaque solid cube — booleans in `capabilities`, typed values in `properties`.
 * Everything omitted resolves to the documented default. There is no place in
 * this type to put a hand-written behaviour branch, which is the structural
 * property plan.md §3.1 asks for: the reference implementation scattered
 * `blockType === 'SAND'` checks across production code (measured on the
 * reference: 90 occurrences in 38 files, tests excluded — see
 * `docs/design-notes.md` for the exact command and why it differs from
 * plan.md's quoted 51/229), which made engine/content separation impossible.
 *
 * ---------------------------------------------------------------------------
 * Kernel deliberately ships NO block table
 * ---------------------------------------------------------------------------
 *
 * Which blocks exist and what their capabilities are is content. Kernel owns
 * the vocabulary and the mechanism; the table itself belongs to whichever
 * repository owns that content. Kernel shipping a guessed table would make
 * every downstream repository's table a fork of a guess.
 */
import type { BlockCapabilities, BlockCapabilityOverrides } from './block-capabilities'
import { resolveBlockCapabilities } from './block-capabilities'
import type { BlockProperties, BlockPropertyOverrides } from './block-properties'
import { resolveBlockProperties } from './block-properties'
import type { BlockType } from './block-type'

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
 * The capability names `docs/capability-flag-audit.md` §3 enumerates, in the
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
    name: 'supportRule',
    kind: 'property',
    why:
      'audit §4.6 (block-support.ts:75-91). Its value is a per-block list of ' +
      'permitted blocks below (crops->FARMLAND, CACTUS->SAND|self, LILY_PAD->WATER), ' +
      'so it cannot be given a meaningful default until the block roster exists.',
  },
  {
    name: 'footstepMaterial',
    kind: 'property',
    why:
      'audit §4.8 (footstep-sound-data.ts:3-23). Pure audio classification; ' +
      'belongs to the same change as the mc-audio cue vocabulary.',
  },
  {
    name: 'tillable',
    kind: 'flag',
    why: 'audit §4.8 / §5-20 (block-service.config.ts:264-267). Two production hits; farming-only.',
  },
  {
    name: 'textureTiles',
    kind: 'property',
    why:
      'audit §4.8 (block-texture-map.config.ts:18). The audit records that this ' +
      'is currently a positional array indexed by storage index, double-managed ' +
      'against the definition table. Audit §4.8 says it has no default at all, so ' +
      'it must land together with the real block roster, not before it.',
  },
]

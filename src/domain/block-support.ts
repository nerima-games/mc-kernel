/**
 * `supportRule` — what a block requires in the cell directly BELOW it.
 *
 * Audit §4.6, whose source is `<reference-impl>/packages/world/domain/
 * block-support.ts`. That file answers one question, `canBlockStaySupported
 * (blockType, blockBelow)` (:96-101), out of THREE tables:
 *
 *   :22-32  `SUPPORT_SENSITIVE_BLOCK_TYPES`  — does this block care at all?
 *   :75-91  `SUPPORT_RULES`                  — a per-block list of what may hold it
 *   :47-61  `NON_SUPPORTING_BLOCK_TYPES`     — the fallback, for the ones with no list
 *
 * and composes them in that order: not sensitive is `true`, a per-block rule
 * wins if there is one, otherwise the negative list decides.
 *
 * ---------------------------------------------------------------------------
 * One column, not three, and the collapse is the design
 * ---------------------------------------------------------------------------
 *
 * Kernel already carries the third table: `canSupportAttachments`
 * (`./block-capabilities`) is `NON_SUPPORTING_BLOCK_TYPES` transcribed, stored
 * positively with a `true` default because that is what an ordinary cube is.
 * What was missing was the other two, and they are ONE column here rather than
 * a boolean plus a map:
 *
 *   `'none'`          the block requires nothing below. The default, and the
 *                     answer for 101 of the 120 rows.
 *   `'anySupporting'` it requires SOMETHING below, and any block that can hold
 *                     an attachment will do. This is the reference's fallback
 *                     arm, named.
 *   `'oneOf'`         it requires one of a NAMED list of blocks below.
 *
 * Membership of `SUPPORT_SENSITIVE_BLOCK_TYPES` is therefore `kind !== 'none'`
 * rather than a second set to keep in step, and that is the point. Audit §4.9's
 * central finding is that the reference enumerates the same concept in five
 * places and gets five different memberships; shipping a `supportSensitive`
 * flag BESIDE a `supportRule` map would have manufactured a sixth, with the
 * added charm that the two could contradict each other silently (a block
 * sensitive with no rule is a real state, a block with a rule but not sensitive
 * is a rule nothing reads).
 *
 * ---------------------------------------------------------------------------
 * Data, not a predicate
 * ---------------------------------------------------------------------------
 *
 * The reference's `SUPPORT_RULES` is a `Map<BlockType, (blockBelow) => boolean>`
 * — the value is a CLOSURE. A closure cannot be diffed in `api-lock.md`, cannot
 * be transcribed into a mirror and compared, and cannot be printed when a
 * placement is refused. `'oneOf'` carries the list instead and
 * `satisfiesSupportRule` is the only function, which keeps the table a table.
 *
 * That costs one expressiveness: the reference could in principle write a rule
 * that is not a membership test. It does not — all five of its entries are
 * `Set.has` or `===` — so nothing is lost, and the day one is not, the additive
 * fix is a fourth arm rather than a change to the three that exist.
 *
 * ---------------------------------------------------------------------------
 * Why this is its own file
 * ---------------------------------------------------------------------------
 *
 * The rule audit §7 states for `drops` and `harvestTool` (「struct のため最も
 * 揺れやすい […] 別ファイルに切り出して差分レビューを容易にすること」, and hence
 * `./block-harvest`) applies here for the same reason and rather harder:
 * `'oneOf'` carries a LIST OF BLOCK NAMES, so this is the only property whose
 * value can go stale when some other block's row changes. A diff to this file
 * is a diff to what may hold a plant up, and it should look like one.
 *
 * The change rule is `./block-harvest`'s, unchanged: a new arm or a new member
 * must be optional or must come with a default. Never both required and
 * defaultless.
 */
import type { BlockType } from './block-type'

/**
 * What a block needs underneath it.
 *
 * A discriminated union rather than three optional fields, so that "sensitive
 * with no list" and "has a list" are different VALUES rather than a pair of
 * fields whose combinations include two that mean nothing.
 */
export type SupportRule =
  /** Requires nothing below. An ordinary cube; also a torch's default before it is a torch. */
  | { readonly kind: 'none' }
  /**
   * Requires any block that can hold an attachment — i.e. the answer is
   * `capabilityOfBlockId(below, 'canSupportAttachments')`.
   *
   * The reference reaches this arm by having NO entry in `SUPPORT_RULES`, which
   * is why the six blocks that take it are listed in `./block-registry` with a
   * citation to their absence rather than to a line.
   */
  | { readonly kind: 'anySupporting' }
  /**
   * Requires the block below to be one of these.
   *
   * The list may name the block itself — `cactus` stacks on `cactus` and
   * `sugar_cane` on `sugar_cane` — and it is written out literally rather than
   * through a `'self'` sentinel, because that is the shape the reference has
   * (`CACTUS_SUPPORT_BLOCK_TYPES` is `['SAND', 'CACTUS']`, `block-support.ts:69`)
   * and a sentinel would be a second thing to explain for two rows.
   */
  | { readonly kind: 'oneOf'; readonly blocks: ReadonlyArray<BlockType> }

/**
 * Audit §4.6: 既定値 `supportRule='none'`.
 *
 * A named constant rather than a literal at the default site, because
 * `./block-registry` needs to spell the same value in its rows and two literals
 * of one concept is how a default drifts from the thing it defaults to.
 */
export const NEEDS_NO_SUPPORT: SupportRule = { kind: 'none' }

/** The reference's fallback arm, named. See the `'anySupporting'` member above. */
export const NEEDS_ANY_SUPPORT: SupportRule = { kind: 'anySupporting' }

/**
 * A per-block list, spelled as the reference spells it.
 *
 * Variadic so that a registry row reads as the reference's set literal does —
 * `needsOneOf('sand', 'cactus')` against `new Set(['SAND', 'CACTUS'])` — which
 * is the property that makes the table checkable against its source by eye.
 */
export const needsOneOf = (...blocks: ReadonlyArray<BlockType>): SupportRule => ({
  blocks,
  kind: 'oneOf',
})

/**
 * Does this block care what is under it?
 *
 * `SUPPORT_SENSITIVE_BLOCK_TYPES` (`block-support.ts:22-32`) as a derivation
 * rather than as a set. A caller uses it to decide whether to READ the cell
 * below at all, which for a placement rule is a second store call it can skip
 * on the stone a player spends a session stacking.
 */
export const isSupportSensitive = (rule: SupportRule): boolean => rule.kind !== 'none'

/**
 * `canBlockStaySupported` (`block-support.ts:96-101`), with the three tables it
 * reads passed in rather than looked up.
 *
 * PURE and TOTAL. `./block-registry`'s `canBlockStaySupported` is this function
 * wired to the id-keyed lookups; this one takes the facts so that it can be
 * tested over combinations the registry cannot produce, and so that a mirror can
 * reuse the composition without reusing the tables.
 *
 * `blockBelow` is OPTIONAL because the id below may name no block this build
 * knows. `undefined` fails the `'oneOf'` arm, which is the inert direction: a
 * lily pad is not floated on a byte nobody can name. Note that it does NOT fail
 * the `'anySupporting'` arm, and that asymmetry is deliberate rather than an
 * oversight — `capabilityOfBlockId` resolves an unknown id to an ordinary opaque
 * cube (`./block-registry`'s header), so an unknown block DOES hold up a torch,
 * exactly as an unknown block does not fall and does not burn. The two arms
 * disagree because the questions differ: "is it one of these five names" has a
 * defensible answer for an unnameable block and "is it solid enough" does not.
 */
export const satisfiesSupportRule = (
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): boolean => {
  switch (rule.kind) {
    case 'none':
      return true

    case 'anySupporting':
      return belowSupportsAttachments

    case 'oneOf':
      return blockBelow !== undefined && rule.blocks.includes(blockBelow)

    default:
      return rule satisfies never
  }
}

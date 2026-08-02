/**
 * The two struct-valued block capabilities, kept in their own file on purpose.
 *
 * `docs/capability-flag-audit.md` §7:
 *
 *   > `drops` / `harvestTool` は struct のため最も揺れやすい。`BlockDefinition`
 *   > にも API ロックを適用し、この 2 フィールドを別ファイルに切り出して差分
 *   > レビューを容易にすること。
 *
 * Everything else about a block is a scalar or an enum and changes rarely.
 * These two are the fields most likely to grow a member, and a kernel field
 * growing a REQUIRED member is a breaking change for 14 pinned consumers. This
 * file exists so that such a change shows up as a diff to a small, obviously
 * dangerous file rather than as three lines buried in a 300-line table.
 *
 * The rule for changing anything in this file: a new member must be optional,
 * or must come with a default in `BLOCK_PROPERTY_DEFAULTS`. Never both required
 * and defaultless.
 */
import { itemOfBlock } from './block-item'
import type { BlockType } from './block-type'
import type { ItemType } from './item-type'

// ---------------------------------------------------------------------------
// harvestTool (audit §4.5)
// ---------------------------------------------------------------------------

/**
 * Tool categories, from `block-utils.ts:32-63` (`isEffectiveTool`).
 *
 * The category decides the SPEED bonus. It is a different axis from `minTier`,
 * which decides whether anything drops at all — the reference keeps them in two
 * unrelated places (`harvestable-blocks.ts` for the tier gate,
 * `block-utils.ts` for the category), which is why they are one struct here.
 */
export const HARVEST_TOOL_CATEGORIES = ['none', 'pickaxe', 'axe', 'shovel', 'hoe', 'shears', 'sword'] as const
export type HarvestToolCategory = (typeof HARVEST_TOOL_CATEGORIES)[number]

/**
 * Material tiers, from the four-stage HashSet ladder at
 * `harvestable-blocks.ts:14-67` (wooden -> stone -> iron -> diamond).
 *
 * `'none'` means bare hands suffice, which is the default and the majority case.
 */
export const HARVEST_TIERS = ['none', 'wooden', 'stone', 'iron', 'diamond'] as const
export type HarvestTier = (typeof HARVEST_TIERS)[number]

export type HarvestToolRequirement = {
  /** Which tool family mines this fastest. Speed only; never gates the drop. */
  readonly category: HarvestToolCategory
  /** The minimum tier that makes this block drop anything at all. */
  readonly minTier: HarvestTier
}

/** Audit §4.5: 既定値 `harvestTool=undefined`(素手可) — spelled here as explicit "none/none". */
export const DEFAULT_HARVEST_TOOL: HarvestToolRequirement = {
  category: 'none',
  minTier: 'none',
}

/**
 * Ordering used by the tier gate. Higher index satisfies every lower one.
 *
 * A `Record` rather than a `Map` so that the lookup is TOTAL at the type level.
 * The `Map` spelling forced a `?? 0` on both reads, and that fallback was not a
 * safety net but a hazard pointing the wrong way: index 0 is `'none'`, so an
 * unrecognised HELD tier would have read as bare hands (drop denied, tolerable)
 * while an unrecognised REQUIRED `minTier` would have read as "no tool needed"
 * and OPENED the gate. A guard that fails open on the side that grants access
 * is worse than no guard — and neither arm was reachable in the first place,
 * because the keys of this table are exactly the members of `HarvestTier`.
 *
 * The cast is what the derivation cannot say: `Object.fromEntries` is typed
 * `Record<string, T>`. That every tier gets an entry, and that the values are
 * the declaration order, is asserted over all pairs by
 * `test/block-properties.test.ts`.
 */
const TIER_ORDER = Object.fromEntries(HARVEST_TIERS.map((tier, index) => [tier, index])) as Readonly<
  Record<HarvestTier, number>
>

/**
 * Does a held tool of `heldTier` satisfy `requirement.minTier`?
 *
 * The category is deliberately NOT consulted: in the reference, using the wrong
 * category is slow but still drops the block, and conflating the two axes is
 * precisely the bug this struct is shaped to prevent
 * (`block-service-break-helpers.ts:65,158` gates on tier alone).
 */
export const satisfiesHarvestTier = (requirement: HarvestToolRequirement, heldTier: HarvestTier): boolean =>
  TIER_ORDER[heldTier] >= TIER_ORDER[requirement.minTier]

// ---------------------------------------------------------------------------
// drops (audit §4.5)
// ---------------------------------------------------------------------------

/**
 * What a block yields when broken.
 *
 * `item: 'self'` is a sentinel meaning "an item of this same block type", which
 * is what the overwhelming majority of blocks do. Writing the block's own type
 * would make the default un-writable (the default cannot know which block it is
 * attached to), and the reference has exactly this shape:
 * `blockDropsBaseItem` (`block-service.config.ts:192-197`) is true for every
 * block except ICE, and `INVENTORY_DROP_OVERRIDES` (:151-187, 24 entries) names
 * the exceptions.
 *
 * NOT modelled here, on purpose: crop drops. `CROP_DROP_RULES`
 * (`interaction-break-handler.crop-drops.config.ts:9-`) branches on growth
 * stage and returns a random function. Audit §6-9 places that in mx-gameplay;
 * a `drops` field cannot express it and should not try.
 */
export type BlockDropRule = {
  /**
   * `'self'` = the item form of this block; otherwise the item actually
   * dropped.
   *
   * This was `BlockType | 'self'` until `ItemType` existed, which was wrong in
   * the direction that matters: `glowstone` yields `glowstone_dust`, and there
   * is no block called `glowstone_dust`. The old spelling could express
   * "different block", never "not a block".
   */
  readonly item: ItemType | 'self'
  /** Item yielded by Silk Touch instead of `item`; omitted when the normal drop is correct. */
  readonly silkTouchItem?: ItemType
  /** Base count before fortune. `0` = drops nothing (audit: ICE, `NEVER_DROPPED_BLOCK_TYPES`). */
  readonly count: number
  /** Only drops at all when mined with a silk-touch tool. */
  readonly requiresSilkTouch: boolean
  /** Fortune multiplies `count` (`FORTUNE_ORE_BLOCKS`, `block-service.config.ts:270-276`). */
  readonly affectedByFortune: boolean
}

/** Audit §4.5: 既定値 `drops={item: 自身, count: 1}`. */
export const DEFAULT_BLOCK_DROP: BlockDropRule = {
  item: 'self',
  count: 1,
  requiresSilkTouch: false,
  affectedByFortune: false,
}

/**
 * Resolve the `'self'` sentinel against the block that is actually being broken.
 *
 * PARTIAL, and this is the change `ItemType` forced. The old signature returned
 * `BlockType` and was total, because "the block itself" is always a block. Once
 * the answer is an ITEM, "the block itself" can fail to exist: `air` is a
 * sentinel rather than a thing (audit §6-6), and `water` / `lava` / `bedrock` /
 * `snow` have no item form in this build. `undefined` is that answer, and it
 * means the same thing as `count: 0` — nothing lands in the inventory.
 *
 * Note that this deliberately does NOT consult the tool gate or silk touch. It
 * answers "which item", not "does anything drop"; `resolveDrop` below is the
 * function that answers both, and is what mining should call.
 */
export const resolveDropItem = (
  rule: BlockDropRule,
  brokenBlock: BlockType,
  silkTouch = false,
): ItemType | undefined => {
  const item = silkTouch && rule.silkTouchItem !== undefined ? rule.silkTouchItem : rule.item
  return item === 'self' ? itemOfBlock(brokenBlock) : item
}

// ---------------------------------------------------------------------------
// The gate: harvestTool x drops -> what actually lands in the inventory
// ---------------------------------------------------------------------------

/**
 * What the player is swinging, as far as the drop is concerned.
 *
 * Every member is OPTIONAL, and the omission of one means the boring answer
 * ("bare hands", "no silk touch"). That is the same override-plus-default shape
 * as `BlockCapabilityOverrides` and for the same reason
 * (`docs/versioning.md` §5-2): this struct is a PARAMETER, so a new REQUIRED
 * member here would break every call site in 14 repositories, whereas a new
 * optional one breaks none. Enchantments are the obvious growth direction.
 */
export type HarvestContext = {
  /** Tier of the held tool. Gates the drop; see `satisfiesHarvestTier`. */
  readonly heldTier?: HarvestTier
  /** Whether the held tool carries silk touch. */
  readonly silkTouch?: boolean
}

/** The empty context, spelled. Bare hands, no enchantments. */
export const BARE_HANDED: HarvestContext = {}

/**
 * What breaking a block actually yields.
 *
 * `affectedByFortune` is carried OUT rather than applied here on purpose.
 * Fortune multiplies the count through a random function, and audit §6-9 puts
 * random drop rules in mx-gameplay ("`drops` では表現できない"). Kernel is
 * pure and deterministic — `StageRegistration.run` has error channel `never`
 * and no source of randomness — so it reports the base count and the fact that
 * fortune applies, and lets the rule that owns the RNG do the multiplication.
 */
export type BlockDrop = {
  readonly item: ItemType
  /** Base count, before fortune. Always >= 1; "nothing" is `undefined`, not zero. */
  readonly count: number
  readonly affectedByFortune: boolean
}

/**
 * The whole drop decision for one broken block. TOTAL, returning `undefined`
 * for "nothing drops".
 *
 * The three ways to get nothing, in the order checked:
 *
 *   1. `count <= 0` — the block yields nothing to anyone (audit §4.5 records
 *      `NEVER_DROPPED_BLOCK_TYPES` and `blockDropsBaseItem`).
 *   2. The tool tier is below `harvestTool.minTier` — mining stone bare-handed.
 *      Note that the CATEGORY is not consulted, per `satisfiesHarvestTier`:
 *      the wrong family of tool is slow, not fruitless.
 *   3. `requiresSilkTouch` and the tool has none — breaking glass.
 *
 * ...and a fourth that is not a denial but an absence: the rule says `'self'`
 * and the block has no item form.
 *
 * Silk Touch is both a gate and, where the registry supplies one, a
 * substitution. Rules without `silkTouchItem` keep their normal item, which
 * covers blocks such as glass whose regular drop is already the block itself.
 */
export const resolveDrop = (
  requirement: HarvestToolRequirement,
  rule: BlockDropRule,
  brokenBlock: BlockType,
  context: HarvestContext = BARE_HANDED,
): BlockDrop | undefined => {
  if (rule.count <= 0) {
    return undefined
  }
  if (!satisfiesHarvestTier(requirement, context.heldTier ?? 'none')) {
    return undefined
  }
  if (rule.requiresSilkTouch && context.silkTouch !== true) {
    return undefined
  }

  const item = resolveDropItem(rule, brokenBlock, context.silkTouch === true)

  return item === undefined ? undefined : { item, count: rule.count, affectedByFortune: rule.affectedByFortune }
}

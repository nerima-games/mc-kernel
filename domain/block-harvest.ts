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
import type { BlockType } from './block-type'

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

/** Ordering used by the tier gate. Higher index satisfies every lower one. */
const TIER_ORDER: ReadonlyMap<HarvestTier, number> = new Map(
  HARVEST_TIERS.map((tier, index) => [tier, index] as const),
)

/**
 * Does a held tool of `heldTier` satisfy `requirement.minTier`?
 *
 * The category is deliberately NOT consulted: in the reference, using the wrong
 * category is slow but still drops the block, and conflating the two axes is
 * precisely the bug this struct is shaped to prevent
 * (`block-service-break-helpers.ts:65,158` gates on tier alone).
 */
export const satisfiesHarvestTier = (requirement: HarvestToolRequirement, heldTier: HarvestTier): boolean =>
  (TIER_ORDER.get(heldTier) ?? 0) >= (TIER_ORDER.get(requirement.minTier) ?? 0)

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
  /** `'self'` = an item of this block; otherwise the block type actually dropped. */
  readonly item: BlockType | 'self'
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

/** Resolve the `'self'` sentinel against the block that is actually being broken. */
export const resolveDropItem = (rule: BlockDropRule, brokenBlock: BlockType): BlockType =>
  rule.item === 'self' ? brokenBlock : rule.item

/**
 * Block-id lookup and query APIs.
 *
 * Declarative block ids and registry rows live in the adjacent types and data
 * modules; this module deliberately remains the stable public import path for
 * registry consumers.
 */
import type { BlockCapabilities, BlockCapabilityFlag } from './block-capabilities.js'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from './block-capabilities.js'
import type { ResolvedBlock } from './block-definition.js'
import { resolveBlock } from './block-definition.js'
import type { BlockDrop, HarvestContext } from './block-harvest.js'
import { BARE_HANDED, resolveDrop } from './block-harvest.js'
import type { BlockOpacity, BlockProperties, BlockPropertyName } from './block-properties.js'
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS } from './block-properties.js'
import type { SupportRule } from './block-support.js'
import { isSupportSensitive, satisfiesSupportRule } from './block-support.js'
import type { BlockType } from './block-type.js'
import { BLOCK_TYPES } from './block-type.js'
import { BLOCK_REGISTRY } from './block-registry-data.js'
import { AIR_BLOCK_ID, BlockId } from './block-registry-types.js'

export { BLOCK_REGISTRY } from './block-registry-data.js'
export { AIR_BLOCK_ID, BLOCK_ID_MAX, BlockId } from './block-registry-types.js'
export type { BlockRegistryEntry } from './block-registry-types.js'

const REGISTRY_LENGTH = BLOCK_REGISTRY.reduce((highest, entry) => Math.max(highest, entry.id), 0) + 1

const buildResolvedById = (): ReadonlyArray<ResolvedBlock | undefined> => {
  const table: Array<ResolvedBlock | undefined> = Array.from({ length: REGISTRY_LENGTH }, () => undefined)

  for (const entry of BLOCK_REGISTRY) {
    table[entry.id] = resolveBlock(entry.definition)
  }

  return table
}

/** Dense, id-indexed. A plain array read, because this is on the meshing path. */
const RESOLVED_BY_ID = buildResolvedById()

const buildIdByType = (): Readonly<Record<BlockType, BlockId | undefined>> => {
  const table: Partial<Record<BlockType, BlockId>> = {}

  for (const entry of BLOCK_REGISTRY) {
    table[entry.definition.type] = entry.id
  }

  return table as Readonly<Record<BlockType, BlockId | undefined>>
}

const ID_BY_TYPE = buildIdByType()

/**
 * Every id currently assigned, ascending. Holes left by a removed block are
 * absent from this array but still consume their number forever.
 */
export const BLOCK_IDS: ReadonlyArray<BlockId> = BLOCK_REGISTRY.map((entry) => entry.id)

/**
 * Does this number name a block this build knows about?
 *
 * Delegates instead of repeating the range test. The two were spelled
 * separately, which made "this id is known" and "this id resolves to a row"
 * two independent claims that happened to agree; the case where they could
 * come apart is a HOLE — an id below `REGISTRY_LENGTH` with no entry, which
 * `BLOCK_IDS` above says a removed block leaves behind forever. Answering the
 * question by asking the resolver makes the agreement structural, so there is
 * no longer a version of this predicate that can drift from the table it
 * describes.
 */
export const isKnownBlockId = (id: number): boolean => resolvedBlockOfId(id) !== undefined

/**
 * `BlockType` -> id. Total over `BLOCK_TYPES`, which
 * `test/block-registry.test.ts` checks by sweeping the whole vocabulary — the
 * check that makes "the roster and the table cannot drift apart" mechanical
 * rather than aspirational.
 *
 * COVERAGE: the `?? AIR_BLOCK_ID` arm is excluded, and is the only exclusion in
 * this file. It fires only for a `BlockType` with no registry row, and two
 * independent assertions in `test/block-registry.test.ts` forbid that state
 * from ever landing: `UNREGISTERED_BLOCK_TYPES` must be empty, and every member
 * of `BLOCK_TYPES` must round-trip through `blockIdOf` -> `blockTypeOfId` (a
 * type that fell back to air would come back as `'air'` and fail). No input
 * reaches the arm in any tree that passes CI, so the only way to "cover" it is
 * to cast a bogus string past `isBlockType` — which would document the arm as
 * reachable and quietly bless bypassing the very guard `./block-type` provides
 * for untrusted strings.
 *
 * It is kept rather than deleted because deleting it means returning
 * `undefined` from a function typed `BlockId`. Note what it costs, though: an
 * unregistered type silently becomes AIR, so the block does not merely misread,
 * it VANISHES. That is why the state is fenced off by tests instead of being
 * handled here — this fallback is a last resort nobody should be relying on.
 */
/* v8 ignore next 2 -- see COVERAGE note above */
export const blockIdOf = (type: BlockType): BlockId => ID_BY_TYPE[type] ?? AIR_BLOCK_ID

/** id -> `BlockType`. `undefined` for a byte this build does not recognise. */
export const blockTypeOfId = (id: number): BlockType | undefined =>
  Number.isInteger(id) && id >= 0 && id < REGISTRY_LENGTH ? RESOLVED_BY_ID[id]?.type : undefined

/** id -> the fully resolved row. `undefined` for an unrecognised byte. */
export const resolvedBlockOfId = (id: number): ResolvedBlock | undefined =>
  Number.isInteger(id) && id >= 0 && id < REGISTRY_LENGTH ? RESOLVED_BY_ID[id] : undefined

/**
 * Read one capability straight off a chunk buffer byte. TOTAL — see the module
 * header on why an unknown id resolves to an ordinary opaque cube.
 *
 * This is THE function the vertical slice was missing: `fallsWhenUnsupported`
 * for the byte that came out of a `Uint8Array`, with no block name anywhere in
 * the caller.
 */
export const capabilityOfBlockId = (id: number, flag: BlockCapabilityFlag): boolean =>
  resolvedBlockOfId(id)?.capabilities[flag] ?? BLOCK_CAPABILITY_DEFAULTS[flag]

/** Read one property straight off a chunk buffer byte. TOTAL, same rule. */
export const propertyOfBlockId = <K extends BlockPropertyName>(id: number, name: K): BlockProperties[K] =>
  resolvedBlockOfId(id)?.properties[name] ?? BLOCK_PROPERTY_DEFAULTS[name]

/** Both halves at once, for a caller that needs several answers about one byte. */
export const capabilitiesOfBlockId = (id: number): BlockCapabilities =>
  resolvedBlockOfId(id)?.capabilities ?? BLOCK_CAPABILITY_DEFAULTS

/**
 * Chunk buffer byte -> the item that lands in the inventory. THE mining bridge.
 *
 * This is the function mc-compose's cross-module E2E suite could not write.
 * `breakBlock` yields a `BlockId` — a number out of a `Uint8Array` — and
 * `InventoryService.add` takes an item; nothing in kernel joined the two, so
 * "mining reflected in the inventory", the whole reason mc-compose exists,
 * could not be expressed. One call, no block name on the read side, exactly as
 * `capabilityOfBlockId` is for the falling-block rule.
 *
 * TOTAL, and `undefined` is a first-class answer meaning "nothing drops" — the
 * bare-handed swing at stone, the pane of glass without silk touch, the block
 * that yields nothing to anyone.
 *
 * An UNKNOWN id also yields `undefined`, which is a different rule from
 * `capabilityOfBlockId`'s (that one falls back to the defaults, i.e. to stone).
 * The two are consistent on the principle rather than on the mechanism: the
 * inert reading is the safe one. For a capability, inert means "an ordinary
 * cube that does nothing"; for a drop, an ordinary cube would mean MINTING AN
 * ITEM out of a byte this build cannot name — a corrupt chunk or a save from a
 * newer build would quietly print items into inventories. Nothing is the only
 * defensible answer.
 */
export const dropOfBlockId = (id: number, context: HarvestContext = BARE_HANDED): BlockDrop | undefined => {
  const resolved = resolvedBlockOfId(id)

  return resolved === undefined
    ? undefined
    : resolveDrop(resolved.properties.harvestTool, resolved.properties.drops, resolved.type, context)
}

/**
 * Keyed by a `Record` and not a `Map`, because the key set here IS
 * `BlockCapabilityFlag` — the loop below visits every flag, so every flag has a
 * bucket. Spelled as a `Map`, that totality was invisible to the type system
 * and `blockIdsWithCapability` had to end in `?? new Set()`, an arm no
 * well-typed caller could reach. A `Record` states the same fact where the
 * compiler can use it, and the empty bucket for a flag no block carries is
 * produced by the loop rather than conjured by a fallback.
 */
const buildIdsByCapability = (): Readonly<Record<BlockCapabilityFlag, ReadonlySet<number>>> => {
  const table: Partial<Record<BlockCapabilityFlag, ReadonlySet<number>>> = {}

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const members = new Set<number>()
    for (const entry of BLOCK_REGISTRY) {
      if (capabilityOfBlockId(entry.id, flag)) {
        members.add(entry.id)
      }
    }
    table[flag] = members
  }

  return table as Readonly<Record<BlockCapabilityFlag, ReadonlySet<number>>>
}

const IDS_BY_CAPABILITY = buildIdsByCapability()

/**
 * The set of ids carrying a capability, as a NATIVE `Set<number>`.
 *
 * Native and not `HashSet` on purpose: plan.md §5.2 records that mc-meshing's
 * `transparentBlockIds` membership test runs ~400k times per chunk and that
 * Effect's `HashSet` is too slow there because it compares structurally. This
 * is the sanctioned way for a hot path to get a membership test out of the
 * capability model without hard-coding ids.
 *
 * The returned set is shared and must not be mutated. It is typed
 * `ReadonlySet<number>` rather than `ReadonlySet<BlockId>` because the caller
 * holds raw buffer bytes, and forcing a brand at 400k calls per chunk would
 * mean either a cast or a validation on the hot path.
 */
export const blockIdsWithCapability = (flag: BlockCapabilityFlag): ReadonlySet<number> => IDS_BY_CAPABILITY[flag]

/**
 * Every bucket is SEEDED before the rows are walked, which is the difference
 * that matters and the reason this is not simply the shape above.
 *
 * Bucketing the registry rows alone gives a table whose keys are the opacities
 * some block happens to HAVE, not the opacities that exist. `BlockOpacity` has
 * three members and the roster is deliberately partial (`./block-type`), so an
 * opacity with no blocks in it is an ordinary state, not a corrupt one — and it
 * used to be served by a `?? new Set()` in the reader, i.e. by an arm that
 * could not run while all three were inhabited and would have started running
 * the day one was not. Seeding turns that into a guarantee: the empty bucket
 * exists because it was created, so `blockIdsWithOpacity` is total for reasons
 * a reader can see, and meshing cannot be handed an `undefined` where it
 * expects a set.
 */
const buildIdsByOpacity = (): Readonly<Record<BlockOpacity, ReadonlySet<number>>> => {
  const table = Object.fromEntries(BLOCK_OPACITIES.map((opacity) => [opacity, new Set<number>()])) as Record<
    BlockOpacity,
    Set<number>
  >

  for (const entry of BLOCK_REGISTRY) {
    table[propertyOfBlockId(entry.id, 'opacity')].add(entry.id)
  }

  return table
}

const IDS_BY_OPACITY = buildIdsByOpacity()

/**
 * The set of ids in one meshing bucket, as a native `Set<number>`.
 *
 * mc-meshing's `config.transparentBlockIds` is exactly
 * `blockIdsWithOpacity('transparentSolid')`, and its water set is
 * `blockIdsWithOpacity('fluid')`. plan.md §3.3 keeps the injection point — the
 * config — so meshing still receives the sets rather than importing this
 * module on its hot path.
 */
export const blockIdsWithOpacity = (opacity: BlockOpacity): ReadonlySet<number> => IDS_BY_OPACITY[opacity]

// ---------------------------------------------------------------------------
// The light pair, named. Not new capabilities — named readings of two existing
// property columns.
// ---------------------------------------------------------------------------
//
// `opacity` and `lightEmission` have been real kernel properties since
// `./block-properties` was written (audit §4.4 settles both: three classes, and
// a 0..15 level rather than the `emissive: boolean` plan.md §3.1 asked for).
// They were readable only through the GENERIC accessor, `propertyOfBlockId(id,
// 'opacity')`, and that is the whole of what was missing here.
//
// The generic accessor is the right shape for a caller that already knows the
// property model. It is the wrong shape for the one caller that cannot import
// the property model at all: mc-worldgen mirrors kernel rather than depending on
// it (plan.md §6 Step 3 publishes bottom-up, and nothing is published yet), so
// its `domain/kernel-vocabulary.ts` must restate whatever it uses. Restating
// `propertyOfBlockId` means restating `BlockPropertyName`, `BlockProperties` and
// the generic index that ties them together — the entire property mechanism —
// in order to ask two questions. It reasonably declined, declared the two
// readings it needed as named functions, and thereby ran ahead of its source.
//
// Kernel grants the names, for kernel's own reason rather than as a courtesy:
// a mirror that runs ahead of its source typechecks locally, ships a table the
// source rejects, and breaks on the one day the mirror discipline promises will
// be uneventful. `./item-type`'s header records the same argument at length for
// the seven `ItemType` literals mc-sim needed, and the answer there was the same
// — grant them, each with a reason of its own.
//
// These three are deliberately the ONLY named property readings kernel exports.
// A named accessor per property would be thirteen functions restating the table
// they read, which is the double-management `./block-properties` exists to
// avoid. The light pair earns the exception because it has an off-repository
// consumer that cannot express the generic form.

/**
 * The meshing bucket and light-attenuation class of a chunk buffer byte.
 *
 * TOTAL, by delegation: an id this build cannot name reads as `'opaque'`,
 * because that is `BLOCK_PROPERTY_DEFAULTS.opacity` and audit §7 settles every
 * default at 「普通の不透明立方体」.
 */
export const opacityOfBlockId = (id: number): BlockOpacity => propertyOfBlockId(id, 'opacity')

/**
 * The light a chunk buffer byte emits, 0..15.
 *
 * TOTAL, same rule: an unrecognised byte emits `LIGHT_LEVEL_MIN`. That is the
 * inert reading — an unknown block sitting in the dark, rather than an unknown
 * block lighting a cave it has no business lighting.
 */
export const lightEmissionOfBlockId = (id: number): number => propertyOfBlockId(id, 'lightEmission')

/**
 * May light cross this cell at all?
 *
 * DELIBERATELY BINARY, and the binary is a transcription rather than a
 * simplification. Vanilla attenuates sky light by more than one level through
 * water and through leaves; the REFERENCE does not. Audit §4.4 records that
 * `light.ts:14-17` builds its attenuation table from `properties.transparency`,
 * which is a BOOLEAN — so the reference's own attenuation is two-valued, and
 * `BlockOpacity` carries three CLASSES with no attenuation amount attached to
 * any of them.
 *
 * A per-class number invented here would therefore be content with no source,
 * which is the failure audit §4.9.1(c) names when it explains why
 * `validSpawnSurface` was transcribed rather than inferred: 「ここで推論すると、
 * それはコンテンツの捏造になる」. The same reasoning forbids deciding here that
 * water costs 3 and leaves cost 2.
 *
 * The additive fix is already identified on both sides. When the reference
 * yields a real per-class attenuation, it lands as a `lightAttenuation`
 * property — one line in `BlockProperties`, one in `BLOCK_PROPERTY_DEFAULTS` —
 * and this function becomes a lookup of it. mc-worldgen's
 * `docs/design-notes.md` DN-7 records the divergence and its visible
 * consequence from the consumer side: a canopy of oak leaves does not dim the
 * ground beneath it, so a hostile cannot spawn under a tree in daylight that
 * vanilla would allow. That is the BRIGHT direction, which is the conservative
 * one for the single rule reading that grid.
 *
 * Note what this is NOT: `!passable`, `!suffocates`, or any other solidity
 * flag. Audit §4.9 spends a section on the five "non-solid" concepts that
 * disagree row by row, and `opacity` disagrees with all of them — `glass` is
 * `transparentSolid` AND collides AND is not a spawn surface; `glowstone` is
 * `'opaque'` and emits 15. A capability that agreed with an existing flag on
 * every row would not be a capability.
 */
export const transmitsLight = (id: number): boolean => opacityOfBlockId(id) !== 'opaque'

// ---------------------------------------------------------------------------
// Support: one named property reading and the JOIN that reads two bytes
// ---------------------------------------------------------------------------
//
// `supportRuleOfBlockId` is a fourth named property reading, and the paragraph
// above says the light pair are deliberately the only ones — so this needs the
// same kind of reason rather than a shrug. It has one, and it is stronger than
// mc-worldgen's: the reading is not the point, `canBlockStaySupported` is, and
// that function needs the rule of ONE byte and a capability of ANOTHER. Naming
// the reading is what lets the join below be four lines that a reader can check
// against `block-support.ts:96-101` line for line.
//
// The other half is the caller's: a placement rule reads the cell BELOW only
// when the held block is support-sensitive, which is a store call it skips on
// the stone a player spends a session stacking. Deciding that needs the rule
// before the second read exists, so the join cannot answer it.

/**
 * The support rule of a chunk buffer byte.
 *
 * TOTAL, by delegation: an id this build cannot name requires nothing below,
 * because that is `BLOCK_PROPERTY_DEFAULTS.supportRule`. The inert reading
 * again — an unknown block sits where it was put rather than popping off.
 */
export const supportRuleOfBlockId = (id: number): SupportRule => propertyOfBlockId(id, 'supportRule')

/**
 * Does this byte care what is under it?
 *
 * `SUPPORT_SENSITIVE_BLOCK_TYPES` (`block-support.ts:22-32`) as a question about
 * a byte. `false` for an unknown id, which is the permissive direction and is
 * chosen: the alternative refuses to place an unnameable block for a reason
 * nobody can state, and `capabilityOfBlockId` has already settled that an
 * unknown byte reads as an ordinary cube.
 */
export const isSupportSensitiveBlockId = (id: number): boolean =>
  isSupportSensitive(supportRuleOfBlockId(id))

/**
 * `canBlockStaySupported` (`block-support.ts:96-101`), on two chunk buffer
 * bytes: the block being held up, and the block under it.
 *
 * THE function this column exists for, and the shape is `dropOfBlockId`'s — a
 * JOIN of two columns that no single accessor can express, offered so that a
 * consumer does not reassemble it and get the precedence backwards. The
 * precedence is the part that goes wrong: the per-block list wins over the
 * negative set, and a caller that checks `canSupportAttachments` FIRST refuses
 * a lily pad on water before the rule that permits it ever runs.
 *
 * TOTAL in both arguments. Note that this answers PLACEMENT and would equally
 * answer a maintenance sweep ("should this block pop off now?"); kernel has no
 * opinion about which, because it holds no world.
 */
export const canBlockStaySupported = (id: number, supportBelow: number): boolean =>
  satisfiesSupportRule(
    supportRuleOfBlockId(id),
    blockTypeOfId(supportBelow),
    capabilityOfBlockId(supportBelow, 'canSupportAttachments'),
  )

/**
 * Block types in the vocabulary that the table does not yet cover.
 *
 * `BLOCK_TYPES` is deliberately incomplete (36 of the reference's 120, a figure
 * re-derived in `./block-type`), and the table is allowed to lag it — but
 * silently is not allowed. This constant makes the gap data a test can assert
 * on, in the same spirit as `PENDING_CAPABILITIES` in `./block-definition`.
 *
 * In practice it is always empty, because `test/block-registry.test.ts` asserts
 * exactly that: a literal added to the vocabulary without a row here fails the
 * suite. That is the mechanism which keeps "adding a block is one row" honest in
 * the direction that actually goes wrong — a name with no capabilities behind
 * it, which every consumer would then read as an ordinary opaque cube.
 */
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (type) => ID_BY_TYPE[type] === undefined,
)

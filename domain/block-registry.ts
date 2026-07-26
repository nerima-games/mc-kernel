/**
 * The block REGISTRY: the numeric id ↔ `BlockType` bijection, the block table,
 * and the id-keyed capability/property lookups that make a chunk buffer
 * interpretable.
 *
 * ---------------------------------------------------------------------------
 * This file reverses "kernel ships no block table". Here is why.
 * ---------------------------------------------------------------------------
 *
 * `./block-definition` states the previous position: *which blocks exist and
 * what their capabilities are is content, and content belongs to the repository
 * that owns that content.* That was the right call while no consumer existed.
 * A consumer now exists, and it exists in three mutually unreachable places:
 *
 *   - mc-meshing needs `opacity` per numeric id (`transparentBlockIds`,
 *     plan.md §3.3). Its only dependency is mc-kernel.
 *   - mc-physics needs `passable` / `collisionShape` per numeric id
 *     (plan.md §3.4, which explicitly forbids naming block ids). Its only
 *     dependency is mc-kernel.
 *   - mx-gameplay needs `fallsWhenUnsupported` per numeric id — a chunk buffer
 *     byte — to run the falling-block rule (plan.md §3.11). It depends on
 *     mc-sim, mc-worldgen and mc-audio.
 *
 * Under plan.md §2.3-5 dependencies do not transit, so there is **no repository
 * other than mc-kernel that all three can see**. A table anywhere else is a
 * table two of the three cannot read, and the alternative — three tables — is
 * precisely the 51-file/229-site scatter plan.md §3.1 says made engine/content
 * separation impossible in the reference implementation.
 *
 * The narrower half of the argument is independent and also sufficient:
 * plan.md §3.1 assigns kernel "`Chunk` データ構造と**コーデック**". The numeric
 * id IS the chunk codec — it is how a `BlockType` is spelled inside a
 * `Uint8Array`. A codec whose two sides live in different repositories is not a
 * codec.
 *
 * What has NOT changed: the mechanism still comes first, the table only states
 * DIFFERENCES from an ordinary opaque cube, and adding a block is still one row
 * (see `./block-definition`). The table below is a table of overrides, not a
 * table of behaviour branches.
 *
 * ---------------------------------------------------------------------------
 * Ids are permanent
 * ---------------------------------------------------------------------------
 *
 * A save file stores block ids, so an id is a wire format, not an index. Two
 * consequences, both pinned by `test/block-registry.test.ts`:
 *
 *   1. Every id is written out literally below. Nothing is derived from array
 *      position, because reordering the array must not be able to rewrite every
 *      save file in existence.
 *   2. An id is never reused. Removing a block leaves a hole; the hole is
 *      cheaper than the migration.
 *
 * The first eleven ids are NOT freely chosen: `mc-worldgen/domain/biome.ts` and
 * `mc-meshing` already ship `BLOCK.SAND === 5`, `BLOCK.WATER === 6` and so on,
 * and those repositories have generated golden fixtures against them. Kernel
 * adopts their numbering rather than imposing a new one, so that adopting this
 * registry is an import change in both and not a fixture regeneration.
 *
 * ---------------------------------------------------------------------------
 * Unknown ids resolve to an ordinary opaque cube, and do not fail
 * ---------------------------------------------------------------------------
 *
 * `capabilityOfBlockId` and `propertyOfBlockId` are TOTAL. A byte that names no
 * known block — a save written by a newer build, a corrupt chunk, a modded id —
 * resolves to `BLOCK_CAPABILITY_DEFAULTS` / `BLOCK_PROPERTY_DEFAULTS`, i.e. to
 * stone. That reading is deliberately the inert one: an unknown block does not
 * fall, does not burn, is not replaceable, and is not passable. The failure mode
 * of guessing wrong is "a mystery block sits there", not "the player falls
 * through the world" or "the terrain silently deletes itself".
 *
 * Totality is also a hard requirement rather than a taste: `StageRegistration`'s
 * `run` has error channel `never` (`./frame`, and mc-kernel's
 * docs/freeze-checklist.md question 3), so a rule reading a capability out of a
 * chunk buffer has nowhere to put a failure.
 */
import { Brand } from 'effect'
import type { BlockCapabilities, BlockCapabilityFlag } from './block-capabilities'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from './block-capabilities'
import type { BlockDefinition, ResolvedBlock } from './block-definition'
import { resolveBlock } from './block-definition'
import type { BlockOpacity, BlockProperties, BlockPropertyName } from './block-properties'
import { BLOCK_PROPERTY_DEFAULTS } from './block-properties'
import type { BlockType } from './block-type'
import { BLOCK_TYPES } from './block-type'

/**
 * The storage encoding of a block inside a chunk buffer.
 *
 * One byte, because the chunk buffer is a `Uint8Array` (16 × 16 × 256 = 65,536
 * bytes per chunk in both the reference implementation and mc-worldgen). The
 * 256-value ceiling is therefore a fact about the chunk format and not a
 * pessimism about the block roster; widening it is a chunk-format migration and
 * belongs to mc-save, not here.
 */
export type BlockId = number & Brand.Brand<'BlockId'>

/** Largest representable id, from the `Uint8Array` chunk buffer. */
export const BLOCK_ID_MAX = 255

export const BlockId = Brand.refined<BlockId>(
  (value) => Number.isInteger(value) && value >= 0 && value <= BLOCK_ID_MAX,
  (value) => Brand.error(`BlockId must be an integer in [0, ${BLOCK_ID_MAX}], received ${value}`),
)

/**
 * Air is id 0, and this is load-bearing rather than conventional.
 *
 * `new Uint8Array(n)` is zero-filled, so a freshly allocated chunk is a chunk
 * full of air with no initialisation pass. mc-worldgen's `emptyBlocks()` and
 * mc-meshing's `emptyChunk()` both rely on it, as does mc-meshing's
 * out-of-bounds `AIR` sentinel (`domain/chunk-view.ts`: an unloaded neighbour
 * meshes as open sky rather than as a black wall).
 */
export const AIR_BLOCK_ID: BlockId = BlockId(0)

/** One row of the table: a permanent id and the definition it names. */
export type BlockRegistryEntry = {
  readonly id: BlockId
  readonly definition: BlockDefinition
}

/**
 * THE block table.
 *
 * Every row states only its differences from an ordinary opaque solid cube.
 * A row with no overrides (`stone`, `dirt`, `grass_block`) is not an omission —
 * it is the statement that the block IS an ordinary opaque solid cube.
 *
 * Ids 0-10 reproduce `mc-worldgen/domain/biome.ts`'s `BLOCK` constant exactly.
 * Ids 11+ are new and are appended in the order the blocks were needed.
 */
export const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry> = [
  {
    // Not a block so much as the absence of one. Everything about it is an
    // override, which is what you would expect of the one entry that is not a
    // cube at all.
    id: BlockId(0),
    definition: {
      type: 'air',
      capabilities: {
        passable: true,
        replaceable: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        // NOTE: `BLOCK_OPACITIES` has no 'invisible' member, so air is filed
        // under the nearest non-attenuating class. Consumers branch on
        // `id === AIR_BLOCK_ID` before consulting opacity (mc-meshing already
        // does), so nothing reads this today. Recorded rather than fixed,
        // because adding an opacity member is an audit change and audit §4.4
        // enumerates exactly three.
        opacity: 'transparentSolid',
        collisionShape: 'none',
        renderKind: 'cube',
        hardness: 0,
      },
    },
  },
  {
    // plan.md §3.12: the piston-immovable set is a kernel capability rather than
    // the reference's local constant.
    id: BlockId(1),
    definition: {
      type: 'bedrock',
      capabilities: { pistonImmovable: true },
      properties: { hardness: 100 },
    },
  },
  { id: BlockId(2), definition: { type: 'stone' } },
  { id: BlockId(3), definition: { type: 'dirt' } },
  { id: BlockId(4), definition: { type: 'grass_block' } },
  {
    // The block the vertical slice is about. `fallsWhenUnsupported` here is what
    // lets mx-gameplay's falling-block rule read a chunk buffer byte and decide,
    // instead of testing `blockType === 'SAND'` (plan.md §3.1).
    id: BlockId(5),
    definition: {
      type: 'sand',
      capabilities: { fallsWhenUnsupported: true },
      properties: { hardness: 0.5 },
    },
  },
  {
    id: BlockId(6),
    definition: {
      type: 'water',
      capabilities: {
        passable: true,
        replaceable: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: { opacity: 'fluid', fluid: 'water', collisionShape: 'none', renderKind: 'fluid', hardness: 0 },
    },
  },
  {
    // Audit §4.9: SNOW is non-supporting but NOT passable. It is the row that
    // proves `passable` and `canSupportAttachments` are two capabilities.
    id: BlockId(7),
    definition: {
      type: 'snow',
      capabilities: { canSupportAttachments: false },
      properties: { hardness: 0.1 },
    },
  },
  {
    id: BlockId(8),
    definition: {
      type: 'gravel',
      capabilities: { fallsWhenUnsupported: true },
      properties: { hardness: 0.6 },
    },
  },
  { id: BlockId(9), definition: { type: 'oak_log', capabilities: { flammable: true }, properties: { hardness: 2 } } },
  {
    // Audit §4.9: LEAVES is not a spawn surface and does not suffocate, but IS
    // solid for collision — `block-collision-predicates.ts:18-21` records the
    // canopy fall-through bug that listing it as passable caused.
    id: BlockId(10),
    definition: {
      type: 'oak_leaves',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 0.2 },
    },
  },
  {
    id: BlockId(11),
    definition: {
      type: 'lava',
      capabilities: {
        passable: true,
        replaceable: true,
        fireSource: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'fluid',
        fluid: 'lava',
        collisionShape: 'none',
        renderKind: 'fluid',
        lightEmission: 15,
        contactDamage: 4,
        hardness: 0,
      },
    },
  },
  {
    id: BlockId(12),
    definition: { type: 'oak_planks', capabilities: { flammable: true }, properties: { hardness: 2 } },
  },
  {
    // Audit §4.9: GLASS is non-suffocating and not a spawn surface but IS solid
    // for collision.
    id: BlockId(13),
    definition: {
      type: 'glass',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 0.3 },
    },
  },
  {
    id: BlockId(14),
    definition: {
      type: 'torch',
      capabilities: {
        passable: true,
        brokenByWaterFlow: true,
        canSupportAttachments: false,
        validSpawnSurface: false,
        suffocates: false,
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        renderKind: 'cross',
        // `light.ts:24-46` `EMISSIVE_LEVEL_OVERRIDES`: TORCH is 14, not 15. The
        // one-level gap from glowstone is the reason `lightEmission` is a number
        // and not the `emissive: boolean` plan.md §3.1 asked for.
        lightEmission: 14,
        hardness: 0,
      },
    },
  },
  { id: BlockId(15), definition: { type: 'glowstone', properties: { lightEmission: 15, hardness: 0.3 } } },
  { id: BlockId(16), definition: { type: 'piston' } },
]

// ---------------------------------------------------------------------------
// Derived lookups. Everything below is computed from BLOCK_REGISTRY once, at
// module load, so that no consumer is tempted to build its own index.
// ---------------------------------------------------------------------------

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

/** Does this number name a block this build knows about? */
export const isKnownBlockId = (id: number): boolean =>
  Number.isInteger(id) && id >= 0 && id < REGISTRY_LENGTH && RESOLVED_BY_ID[id] !== undefined

/**
 * `BlockType` -> id. Total over `BLOCK_TYPES`, which
 * `test/block-registry.test.ts` checks by sweeping the whole vocabulary — the
 * check that makes "the roster and the table cannot drift apart" mechanical
 * rather than aspirational.
 */
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

const buildIdsByCapability = (): ReadonlyMap<BlockCapabilityFlag, ReadonlySet<number>> => {
  const table = new Map<BlockCapabilityFlag, ReadonlySet<number>>()

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const members = new Set<number>()
    for (const entry of BLOCK_REGISTRY) {
      if (capabilityOfBlockId(entry.id, flag)) {
        members.add(entry.id)
      }
    }
    table.set(flag, members)
  }

  return table
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
export const blockIdsWithCapability = (flag: BlockCapabilityFlag): ReadonlySet<number> =>
  IDS_BY_CAPABILITY.get(flag) ?? new Set<number>()

const buildIdsByOpacity = (): ReadonlyMap<BlockOpacity, ReadonlySet<number>> => {
  const table = new Map<BlockOpacity, Set<number>>()

  for (const entry of BLOCK_REGISTRY) {
    const opacity = propertyOfBlockId(entry.id, 'opacity')
    const members = table.get(opacity) ?? new Set<number>()
    members.add(entry.id)
    table.set(opacity, members)
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
export const blockIdsWithOpacity = (opacity: BlockOpacity): ReadonlySet<number> =>
  IDS_BY_OPACITY.get(opacity) ?? new Set<number>()

/**
 * Block types in the vocabulary that the table does not yet cover.
 *
 * `BLOCK_TYPES` is deliberately incomplete (17 of the reference's 120, see
 * `./block-type`), and the table is allowed to lag it — but silently is not
 * allowed. This constant makes the gap data a test can assert on, in the same
 * spirit as `PENDING_CAPABILITIES` in `./block-definition`.
 */
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (type) => ID_BY_TYPE[type] === undefined,
)

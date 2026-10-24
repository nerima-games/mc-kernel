import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS } from '../src/domain/block/block-properties'
import { isSupportSensitive } from '../src/domain/block/block-support'
import { BLOCK_REGISTRY } from '../src/domain/block/block-registry'
import {
  BLOCK_IDS,
  blockPropertyColumnValueOrDefault,
  buildCapabilitiesById,
  buildIdByType as buildIdByTypeResult,
  buildIdsByOpacity,
  buildKnownById,
  buildPropertyColumns,
  buildSupportBlockIdsById as buildSupportBlockIdsByIdResult,
  blockIdsWithCapability as blockIdsWithCapabilityResult,
  blockIdsWithOpacity as blockIdsWithOpacityResult,
  blockTypeOfId as blockTypeOfIdResult,
  canBlockStaySupported as canBlockStaySupportedResult,
  capabilitiesOfBlockId as capabilitiesOfBlockIdResult,
  capabilityOfBlockId as capabilityOfBlockIdResult,
  dropOfBlockId as dropOfBlockIdResult,
  isKnownBlockId as isKnownBlockIdResult,
  isSupportSensitiveBlockId as isSupportSensitiveBlockIdResult,
  lightEmissionOfBlockId as lightEmissionOfBlockIdResult,
  opacityOfBlockId as opacityOfBlockIdResult,
  propertyOfBlockId as propertyOfBlockIdResult,
  RAW_COLUMN_DEFAULTS,
  resolvedBlockAt as resolvedBlockAtResult,
  resolvedBlockOfId as resolvedBlockOfIdResult,
  supportRuleOfBlockId as supportRuleOfBlockIdResult,
  supportBlockIdsOf,
  transmitsLight as transmitsLightResult,
} from '../src/domain/block/block-registry-indexes'
import * as blockRegistryIndexes from '../src/domain/block/block-registry-indexes'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../src/domain/block/block-capabilities'
import { BLOCK_PROPERTY_NAMES } from '../src/domain/block/block-properties'
import { BLOCK_ID_MAX, BlockId } from '../src/domain/block/block-registry-types'
import { optionValue, resultFailure, resultValue } from './block-result-helpers'

const canBlockStaySupported = (...args: Parameters<typeof canBlockStaySupportedResult>) =>
  resultValue(canBlockStaySupportedResult(...args))
const blockTypeOfId = (id: BlockId) => resultValue(blockTypeOfIdResult(id))
const capabilitiesOfBlockId = (id: BlockId) => resultValue(capabilitiesOfBlockIdResult(id))
const capabilityOfBlockId = (...args: Parameters<typeof capabilityOfBlockIdResult>) =>
  resultValue(capabilityOfBlockIdResult(...args))
const dropOfBlockId = (...args: Parameters<typeof dropOfBlockIdResult>) => resultValue(dropOfBlockIdResult(...args))
const isKnownBlockId = (id: BlockId) => resultValue(isKnownBlockIdResult(id))
const isSupportSensitiveBlockId = (id: BlockId) => resultValue(isSupportSensitiveBlockIdResult(id))
const lightEmissionOfBlockId = (id: BlockId) => resultValue(lightEmissionOfBlockIdResult(id))
const opacityOfBlockId = (id: BlockId) => resultValue(opacityOfBlockIdResult(id))
const propertyOfBlockId = <K extends Parameters<typeof propertyOfBlockIdResult>[1]>(id: BlockId, name: K) =>
  resultValue(propertyOfBlockIdResult(id, name))
const resolvedBlockAt = (id: BlockId) => optionValue(resultValue(resolvedBlockAtResult(id)))
const resolvedBlockOfId = (id: BlockId) => resultValue(resolvedBlockOfIdResult(id))
const supportRuleOfBlockId = (id: BlockId) => resultValue(supportRuleOfBlockIdResult(id))
const transmitsLight = (id: BlockId) => resultValue(transmitsLightResult(id))

// The complete, currently-reviewed set of value exports from
// `block-registry-indexes.ts`. A new zero-initialised typed-array column
// (mirroring `lightEmission`/`supportSensitive`) always ships as a new
// exported accessor on that module — there is no other way to call it. This
// list has to be extended by hand before such an accessor exists, which is
// what makes the export-surface-pin test below a structural guard rather
// than a documentation comment: a column added without updating this list
// fails immediately, before anyone gets to ask whether its default agrees
// with `BLOCK_PROPERTY_DEFAULTS`.
const EXPECTED_BLOCK_REGISTRY_INDEX_EXPORTS = [
  'BLOCK_IDS',
  'UNREGISTERED_BLOCK_TYPES',
  'blockIdOf',
  'blockIdsWithCapability',
  'blockIdsWithOpacity',
  'blockPropertyColumnValueOrDefault',
  'blockTypeOfId',
  'buildCapabilitiesById',
  'buildIdByType',
  'buildIdsByOpacity',
  'buildKnownById',
  'buildPropertyColumns',
  'buildSupportBlockIdsById',
  'canBlockStaySupported',
  'capabilitiesOfBlockId',
  'capabilityOfBlockId',
  'dropOfBlockId',
  'isKnownBlockId',
  'isSupportSensitiveBlockId',
  'lightEmissionOfBlockId',
  'opacityOfBlockId',
  'propertyOfBlockId',
  'RAW_COLUMN_DEFAULTS',
  'resolvedBlockAt',
  'resolvedBlockOfId',
  'supportRuleOfBlockId',
  'supportBlockIdsOf',
  'transmitsLight',
].sort()

describe('block registry indexes', () => {
  it('uses a block property default only when a dense column has no value', () => {
    expect(blockPropertyColumnValueOrDefault(undefined, BLOCK_PROPERTY_DEFAULTS.opacity))
      .toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
    expect(blockPropertyColumnValueOrDefault(BLOCK_OPACITIES[0], BLOCK_PROPERTY_DEFAULTS.opacity))
      .toBe(BLOCK_OPACITIES[0])
  })

  it('rejects a registry that omits a required vocabulary row', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(resultFailure(buildIdByTypeResult([], ['air']))).toMatchObject({
        _tag: 'BlockRegistryFailure',
        reason: 'missing-block-row',
        message: 'Block registry is missing a row for air',
      })
    })),
  )

  it('builds a vocabulary index from registered rows', () =>
    Effect.runPromise(Effect.sync(() => {
      const [entry] = BLOCK_REGISTRY
      expect(entry).toBeDefined()
      if (entry === undefined) return

      const index = resultValue(buildIdByTypeResult([entry], [entry.definition.type]))
      expect(index.get(entry.definition.type)).toBe(entry.id)
    })),
  )

  it('fills defaults when resolved rows are absent', () =>
    Effect.runPromise(Effect.sync(() => {
      const capabilities = buildCapabilitiesById([])
      expect(capabilities.size).toBe(BLOCK_CAPABILITY_FLAGS.length)
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(Array.from(capabilities.get(flag) ?? [])).toEqual(
          Array.from({ length: BLOCK_IDS.length }, () => BLOCK_CAPABILITY_DEFAULTS[flag] ? 1 : 0),
        )
      }

      const properties = buildPropertyColumns([])
      expect(properties.opacity.every((value) => value === BLOCK_PROPERTY_DEFAULTS.opacity)).toBe(true)
      expect(properties.lightEmission.every((value) => value === BLOCK_PROPERTY_DEFAULTS.lightEmission)).toBe(true)
      expect(properties.transmitsLight.every((value) => value === 0)).toBe(true)
      expect(properties.byName.opacity.every((value) => value === BLOCK_PROPERTY_DEFAULTS.opacity)).toBe(true)
    })),
  )

  it('returns missing-support failure for an incomplete support-id map', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(resultFailure(supportBlockIdsOf(new Map(), BlockId(1)))).toMatchObject({
        _tag: 'BlockRegistryFailure',
        reason: 'missing-support-ids',
      })
    })),
  )

  it('defaults missing opacity values and ignores values without a bucket', () =>
    Effect.runPromise(Effect.sync(() => {
      const defaulted = Reflect.apply(buildIdsByOpacity, undefined, [{ opacity: [] }])
      const defaultBuckets = new Map(BLOCK_OPACITIES.map((opacity) => [
        opacity,
        opacity === BLOCK_PROPERTY_DEFAULTS.opacity ? new Set(BLOCK_IDS) : new Set(),
      ]))
      expect(defaulted).toEqual(defaultBuckets)

      const invalidOpacity = Array.from({ length: BLOCK_IDS.length }, () => 'invalid')
      const ignored = Reflect.apply(buildIdsByOpacity, undefined, [{ opacity: invalidOpacity }])
      expect(ignored).toEqual(new Map(BLOCK_OPACITIES.map((opacity) => [opacity, new Set()])))
    })),
  )

  it('rejects missing derived registry rows', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(resultFailure(Reflect.apply(resolvedBlockAtResult, undefined, [-1]))).toEqual(
        resultFailure(BlockId.result(-1)),
      )
      expect(resultFailure(buildSupportBlockIdsByIdResult([]))).toMatchObject({
        _tag: 'BlockRegistryFailure',
        reason: 'missing-support-rule',
        message: expect.stringContaining('Block registry is missing a support rule for '),
      })

      const invalidSupportRule = { kind: 'oneOf', blocks: ['invalid'] }
      expect(resultFailure(Reflect.apply(buildSupportBlockIdsByIdResult, undefined, [[invalidSupportRule]]))).toMatchObject({
        _tag: 'BlockRegistryFailure',
        reason: 'missing-block-row',
        message: 'Block registry is missing a row for invalid',
      })
    })),
  )

  it('reads dense properties and defaults unknown ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(BLOCK_IDS).not.toHaveLength(0)
      const firstBlockId = BLOCK_IDS[0]
      expect(firstBlockId).toBeDefined()
      if (firstBlockId === undefined) return
      expect(propertyOfBlockId(firstBlockId, 'opacity')).toBeDefined()
      expect(resultFailure(Reflect.apply(propertyOfBlockIdResult, undefined, [-1, 'opacity']))).toEqual(
        resultFailure(BlockId.result(-1)),
      )
    })),
  )

  it('rejects missing capability and opacity indexes', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Reflect.apply(blockIdsWithCapabilityResult, undefined, ['invalid'])).toMatchObject({
        _tag: 'Success',
        success: { _tag: 'None' },
      })
      expect(Reflect.apply(blockIdsWithOpacityResult, undefined, ['invalid'])).toMatchObject({
        _tag: 'Success',
        success: { _tag: 'None' },
      })
    })),
  )

  // `lightEmissionOfBlockId` and `isSupportSensitiveBlockId` back their
  // columns with a raw `Uint8Array`, zero-initialised rather than explicitly
  // filled with `BLOCK_PROPERTY_DEFAULTS` — correct only because both
  // documented defaults happen to be the zero value (`0` / `false`).
  // `RAW_COLUMN_DEFAULTS`, exported by `block-registry-indexes.ts`, pairs
  // every column built this way with what its zero byte decodes to; this
  // test iterates it structurally instead of naming the two columns by
  // hand, so a third column added the same way — with a decoded zero that
  // disagrees with its own documented default — fails here directly rather
  // than silently reading `0` for every unregistered or out-of-range id.
  it('keeps every zero-initialised typed-array column aligned with its BLOCK_PROPERTY_DEFAULTS entry', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(RAW_COLUMN_DEFAULTS.length).toBeGreaterThan(0)

      for (const { zeroDecodesTo, documentedDefault } of RAW_COLUMN_DEFAULTS) {
        expect(zeroDecodesTo).toEqual(documentedDefault)
      }

      expect(BLOCK_PROPERTY_DEFAULTS.lightEmission).toBe(0)
      expect(isSupportSensitive(BLOCK_PROPERTY_DEFAULTS.supportRule)).toBe(false)
    })),
  )

  // Reflective enumeration, per test-integrity's "discover the subjects
  // rather than list them": rather than trusting a maintained prose comment
  // to name every exported accessor, this pins the module's entire exported
  // surface. A reviewer adding a new zero-initialised column has no way to
  // expose its accessor other than a new export, so this test cannot miss
  // it even if the reviewer forgets to add a matching `RAW_COLUMN_DEFAULTS`
  // entry — the two guards are complementary, not redundant: this one
  // forces the export list to be updated deliberately, the one above checks
  // whatever default value is actually registered there.
  it('pins the accessor export surface so a newly added column fails here until reviewed', () =>
    Effect.runPromise(Effect.sync(() => {
      const actualExportNames = Object.keys(blockRegistryIndexes).sort()

      expect(actualExportNames).toStrictEqual(EXPECTED_BLOCK_REGISTRY_INDEX_EXPORTS)
    })),
  )

  it('resolves an id above the resized table exactly as a known-unregistered id resolves', () =>
    Effect.runPromise(Effect.sync(() => {
      const highestRegisteredId = BLOCK_IDS.reduce((highest, id) => Math.max(highest, id), -1)
      const knownUnregisteredId = resultValue(BlockId.result(BLOCK_ID_MAX))
      const idsAboveTheResizedTable = [highestRegisteredId + 1, BLOCK_ID_MAX].map((id) => resultValue(BlockId.result(id)))

      for (const id of idsAboveTheResizedTable) {
        expect(isKnownBlockId(id)).toBe(isKnownBlockId(knownUnregisteredId))
        expect(isKnownBlockId(id)).toBe(false)

        expect(blockTypeOfId(id)).toBe(blockTypeOfId(knownUnregisteredId))
        expect(blockTypeOfId(id)).toBeUndefined()

        expect(resolvedBlockOfId(id)).toBe(resolvedBlockOfId(knownUnregisteredId))
        expect(resolvedBlockOfId(id)).toBeUndefined()

        expect(dropOfBlockId(id)).toBe(dropOfBlockId(knownUnregisteredId))
        expect(dropOfBlockId(id)).toBeUndefined()

        expect(opacityOfBlockId(id)).toBe(opacityOfBlockId(knownUnregisteredId))
        expect(opacityOfBlockId(id)).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)

        expect(lightEmissionOfBlockId(id)).toBe(lightEmissionOfBlockId(knownUnregisteredId))
        expect(lightEmissionOfBlockId(id)).toBe(BLOCK_PROPERTY_DEFAULTS.lightEmission)

        expect(transmitsLight(id)).toBe(transmitsLight(knownUnregisteredId))
        expect(transmitsLight(id)).toBe(false)

        expect(supportRuleOfBlockId(id)).toEqual(supportRuleOfBlockId(knownUnregisteredId))
        expect(supportRuleOfBlockId(id)).toEqual(BLOCK_PROPERTY_DEFAULTS.supportRule)

        expect(isSupportSensitiveBlockId(id)).toBe(isSupportSensitiveBlockId(knownUnregisteredId))
        expect(isSupportSensitiveBlockId(id)).toBe(false)

        expect(canBlockStaySupported(id, BlockId(0))).toBe(canBlockStaySupported(knownUnregisteredId, BlockId(0)))
        expect(canBlockStaySupported(id, BlockId(0))).toBe(true)

        expect(capabilitiesOfBlockId(id)).toEqual(capabilitiesOfBlockId(knownUnregisteredId))
        expect(capabilitiesOfBlockId(id)).toEqual(BLOCK_CAPABILITY_DEFAULTS)

        for (const flag of BLOCK_CAPABILITY_FLAGS) {
          expect(capabilityOfBlockId(id, flag)).toBe(capabilityOfBlockId(knownUnregisteredId, flag))
          expect(capabilityOfBlockId(id, flag)).toBe(BLOCK_CAPABILITY_DEFAULTS[flag])
        }

        for (const name of BLOCK_PROPERTY_NAMES) {
          expect(propertyOfBlockId(id, name)).toEqual(propertyOfBlockId(knownUnregisteredId, name))
          expect(propertyOfBlockId(id, name)).toEqual(BLOCK_PROPERTY_DEFAULTS[name])
        }
      }
    })),
  )

  // The current registry has no gap: ids run contiguously from 0 to the
  // highest registered id, so `RESOLVED_BY_ID` is never `undefined` within
  // the resized table. `buildKnownById` still has to answer correctly for a
  // future registry that reserves or removes an id in the middle of its
  // range, so this drives that arm directly through the injectable fixture
  // rather than through real (currently gap-free) registry data.
  it('marks a gap in the resolved table as unknown, not just an out-of-range id', () =>
    Effect.runPromise(Effect.sync(() => {
      const firstBlockId = BLOCK_IDS[0]
      expect(firstBlockId).toBeDefined()
      if (firstBlockId === undefined) return

      const sparseResolvedById = [undefined, resolvedBlockAt(firstBlockId)]
      const known = buildKnownById(sparseResolvedById)

      expect(Array.from(known)).toStrictEqual([0, 1])
    })),
  )

  // `PROPERTY_COLUMNS.byName[*]` and `PROPERTY_COLUMNS.opacity` are
  // exhaustively filled at every index up to `BLOCK_ID_TABLE_LENGTH`, so the
  // only way an in-range read still misses is a non-integer id: neither a
  // plain array nor a typed array recognises a fractional index as an
  // element, so the registry boundary rejects a fractional ID through the
  // BlockId brand constructor and returns its validation failure.
  it('returns the BlockId failure for fractional registry ids', () =>
    Effect.runPromise(Effect.sync(() => {
      const fractionalId = 0.5

      expect(resultFailure(Reflect.apply(propertyOfBlockIdResult, undefined, [fractionalId, 'opacity']))).toEqual(
        resultFailure(BlockId.result(fractionalId)),
      )
      expect(resultFailure(Reflect.apply(opacityOfBlockIdResult, undefined, [fractionalId]))).toEqual(
        resultFailure(BlockId.result(fractionalId)),
      )
    })),
  )

  // The dense tables are sized to `highest registered id + 1`. Shrinking that
  // to just `highest registered id` drops the last registered block out of
  // every table's in-range window without deleting its `BLOCK_REGISTRY`
  // entry: `resolvedBlockOfId` would then answer it exactly like an unknown
  // id (`undefined`) rather than resolving it. The highest id is derived from
  // `BLOCK_IDS`, not hardcoded, so this stays correct as the registry grows.
  // The second assertion — that at least one resolved property differs from
  // `BLOCK_PROPERTY_DEFAULTS` — rules out the degenerate case where the
  // highest-id block's own properties happen to equal the defaults, which
  // would otherwise let a defaulted (mis-sized-table) read and a genuinely
  // resolved read look identical by coincidence.
  it('resolves the highest registered id to its own definition, not to defaults', () =>
    Effect.runPromise(Effect.sync(() => {
      const highestRegisteredId = BLOCK_IDS.reduce((highest, id) => Math.max(highest, id), -1)

      const resolved = resolvedBlockOfId(BlockId(highestRegisteredId))
      expect(resolved).toBeDefined()
      if (resolved === undefined) return

      const propertiesThatDifferFromDefaults = BLOCK_PROPERTY_NAMES.filter(
        (name) => JSON.stringify(resolved.properties[name]) !== JSON.stringify(BLOCK_PROPERTY_DEFAULTS[name]),
      )

      expect(propertiesThatDifferFromDefaults.length).toBeGreaterThan(0)
    })),
  )
})

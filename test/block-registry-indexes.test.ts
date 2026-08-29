import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { BLOCK_PROPERTY_DEFAULTS } from '../src/domain/block-properties'
import { isSupportSensitive } from '../src/domain/block-support'
import {
  BLOCK_IDS,
  buildIdByType,
  buildKnownById,
  buildSupportBlockIdsById,
  blockIdsWithCapability,
  blockIdsWithOpacity,
  blockTypeOfId,
  canBlockStaySupported,
  capabilitiesOfBlockId,
  capabilityOfBlockId,
  dropOfBlockId,
  isKnownBlockId,
  isSupportSensitiveBlockId,
  lightEmissionOfBlockId,
  opacityOfBlockId,
  propertyOfBlockId,
  RAW_COLUMN_DEFAULTS,
  resolvedBlockAt,
  resolvedBlockOfId,
  supportRuleOfBlockId,
  transmitsLight,
} from '../src/domain/block-registry-indexes'
import * as blockRegistryIndexes from '../src/domain/block-registry-indexes'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../src/domain/block-capabilities'
import { BLOCK_PROPERTY_NAMES } from '../src/domain/block-properties'
import { BLOCK_ID_MAX } from '../src/domain/block-registry-types'

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
  'blockTypeOfId',
  'buildIdByType',
  'buildKnownById',
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
  'transmitsLight',
].sort()

describe('block registry indexes', () => {
  it('rejects a registry that omits a required vocabulary row', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => buildIdByType([], ['air'])).toThrow('Block registry is missing a row for air')
    })),
  )

  it('rejects missing derived registry rows', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => resolvedBlockAt(-1)).toThrow('Block registry is missing a resolved row for -1')
      expect(() => buildSupportBlockIdsById([])).toThrow('Block registry is missing a support rule')

      const invalidSupportRule = { kind: 'oneOf', blocks: ['invalid'] }
      expect(() => Reflect.apply(buildSupportBlockIdsById, undefined, [[invalidSupportRule]])).toThrow(
        'Block registry is missing a row for invalid',
      )
    })),
  )

  it('reads dense properties and defaults unknown ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(BLOCK_IDS).not.toHaveLength(0)
      const firstBlockId = BLOCK_IDS[0]
      if (firstBlockId === undefined) throw new Error('Block registry fixture must not be empty')
      expect(propertyOfBlockId(firstBlockId, 'opacity')).toBeDefined()
      expect(propertyOfBlockId(-1, 'opacity')).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
    })),
  )

  it('rejects missing capability and opacity indexes', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => Reflect.apply(blockIdsWithCapability, undefined, ['invalid'])).toThrow(
        'Block capability index is missing invalid',
      )
      expect(() => Reflect.apply(blockIdsWithOpacity, undefined, ['invalid'])).toThrow(
        'Block opacity index is missing invalid',
      )
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
      const knownUnregisteredId = -1
      const idsAboveTheResizedTable = [highestRegisteredId + 1, BLOCK_ID_MAX]

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

        expect(canBlockStaySupported(id, 0)).toBe(canBlockStaySupported(knownUnregisteredId, 0))
        expect(canBlockStaySupported(id, 0)).toBe(true)

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
  // The title deliberately avoids the phrase "as" followed by "unknown":
  // scripts/check-type-safety.mjs matches that textually, without excluding
  // string literals, so a test named for the behaviour would fail the gate.
  it('marks a gap in the resolved table unknown, not just an out-of-range id', () =>
    Effect.runPromise(Effect.sync(() => {
      const firstBlockId = BLOCK_IDS[0]
      if (firstBlockId === undefined) throw new Error('Block registry fixture must not be empty')

      const sparseResolvedById = [undefined, resolvedBlockAt(firstBlockId)]
      const known = buildKnownById(sparseResolvedById)

      expect(Array.from(known)).toStrictEqual([0, 1])
    })),
  )

  // `PROPERTY_COLUMNS.byName[*]` and `PROPERTY_COLUMNS.opacity` are
  // exhaustively filled at every index up to `BLOCK_ID_TABLE_LENGTH`, so the
  // only way an in-range read still misses is a non-integer id: neither a
  // plain array nor a typed array recognises a fractional index as an
  // element, so `column[1.5]` reads as a missing property and returns
  // `undefined`. A caller passes a raw `number`, not a validated `BlockId`,
  // so this is a real input this function must default correctly for.
  it('defaults a fractional in-range id the same as an out-of-range one', () =>
    Effect.runPromise(Effect.sync(() => {
      const fractionalId = 0.5

      expect(propertyOfBlockId(fractionalId, 'opacity')).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
      expect(opacityOfBlockId(fractionalId)).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
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

      const resolved = resolvedBlockOfId(highestRegisteredId)
      expect(resolved).toBeDefined()
      if (resolved === undefined) throw new Error('unreachable: asserted defined above')

      const propertiesThatDifferFromDefaults = BLOCK_PROPERTY_NAMES.filter(
        (name) => JSON.stringify(resolved.properties[name]) !== JSON.stringify(BLOCK_PROPERTY_DEFAULTS[name]),
      )

      expect(propertiesThatDifferFromDefaults.length).toBeGreaterThan(0)
    })),
  )
})

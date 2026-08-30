import {
  AUDITED_CAPABILITY_NAMES,
  DOWNSTREAM_CAPABILITIES,
  type BlockDefinition,
  blockCapabilitiesOf,
  blockPropertiesOf,
  resolveBlock,
} from '../src/domain/block-definition'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../src/domain/block-capabilities'
import { BLOCK_PROPERTY_DEFAULTS, BLOCK_PROPERTY_NAMES } from '../src/domain/block-properties'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { StackCount } from '../src/domain/quantities'

const AUDITED_CAPABILITY_COUNT = 29
const IMPLEMENTED_FLAG_COUNT = 12
const IMPLEMENTED_PROPERTY_COUNT = 16
const LAVA_CONTACT_DAMAGE = 4
const MAXIMUM_LIGHT_EMISSION = 15
const NO_DROPS = 0
const DOWNSTREAM_CAPABILITY_COUNT = 1
const DOWNSTREAM_CAPABILITY_MINIMUM_EXPLANATION_LENGTH = 20

describe('adding a block is one table row plus flag settings (the design contract invariant)', () => {
  // THE named regression test for the design contract's closing requirement:
  //   ブロック追加 = 定義テーブル1行 + フラグ設定、で完結すること
  //
  // The reference implementation failed this: behaviour was decided by
  // `blockType === 'SAND'` comparisons scattered through production code
  // (measured on the reference: 90 occurrences across 38 files, tests
  // Excluded — see historical design audit). Adding a block there meant hunting
  // Those sites. Here, a block is a value, and every consumer reads
  // Capabilities rather than names.

  it('a whole block is expressible as one literal and nothing else', () =>
    Effect.runPromise(Effect.sync(() => {
      // Lava: fluid, emits maximum light, passable, hurts on contact,
      // Replaceable, a fire source, no drops. Seven behaviours, one literal,
      // Zero code changes anywhere in kernel.
      const lava: BlockDefinition = {
        capabilities: {
          canSupportAttachments: false,
          fireSource: true,
          passable: true,
          replaceable: true,
          suffocates: false,
          validSpawnSurface: false,
        },
        properties: {
          collisionShape: 'none',
          contactDamage: LAVA_CONTACT_DAMAGE,
          drops: { affectedByFortune: false, count: StackCount(NO_DROPS), item: 'self', requiresSilkTouch: false },
          fluid: 'lava',
          lightEmission: MAXIMUM_LIGHT_EMISSION,
          opacity: 'fluid',
          renderKind: 'fluid',
        },
        type: 'lava',
      }

      const resolved = resolveBlock(lava)
      expect(resolved.type).toBe('lava')
      expect(resolved.capabilities.passable).toBe(true)
      expect(resolved.properties.fluid).toBe('lava')
      expect(resolved.properties.lightEmission).toBe(MAXIMUM_LIGHT_EMISSION)
      expect(resolved.properties.contactDamage).toBe(LAVA_CONTACT_DAMAGE)
      expect(resolved.properties.drops.count).toBe(NO_DROPS)
    })),
  )

  it('the minimal row is just a type, and it describes an ordinary opaque solid cube', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolved = resolveBlock({ type: 'stone' })
      expect(resolved.capabilities).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
      expect(resolved.properties).toStrictEqual({ ...BLOCK_PROPERTY_DEFAULTS })
    })),
  )

  it('a definition carries no behaviour — there is nowhere to put a name-based branch', () =>
    Effect.runPromise(Effect.sync(() => {
      const definition: BlockDefinition = { capabilities: { fallsWhenUnsupported: true }, type: 'sand' }
      // Every own key is data. If a future edit adds a function-valued field,
      // This fails, and it should: a callback on a block definition is the
      // Reference implementation's mistake re-entering through the front door.
      for (const value of Object.values(definition)) {
        expect(typeof value).not.toBe('function')
      }
      for (const value of Object.values(definition.capabilities ?? {})) {
        expect(typeof value).toBe('boolean')
      }
    })),
  )

  it('two blocks that differ only in flags share every other resolved value', () =>
    Effect.runPromise(Effect.sync(() => {
      const gravel = resolveBlock({ capabilities: { fallsWhenUnsupported: true }, type: 'gravel' })
      const dirt = resolveBlock({ type: 'dirt' })

      expect(gravel.capabilities.fallsWhenUnsupported).toBe(true)
      expect(dirt.capabilities.fallsWhenUnsupported).toBe(false)
      // The difference is exactly one flag, nothing else.
      expect(gravel.properties).toStrictEqual(dirt.properties)
    })),
  )
})

describe('resolveBlock', () => {
  it('resolves both halves and agrees with resolving each half separately', () =>
    Effect.runPromise(Effect.sync(() => {
      const glowstone: BlockDefinition = {
        properties: { lightEmission: MAXIMUM_LIGHT_EMISSION, opacity: 'transparentSolid' },
        type: 'glowstone',
      }
      const resolved = resolveBlock(glowstone)
      expect(resolved.capabilities).toStrictEqual(blockCapabilitiesOf(glowstone))
      expect(resolved.properties).toStrictEqual(blockPropertiesOf(glowstone))
    })),
  )

  it('rejects a block type that only satisfies the compile-time type', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => Reflect.apply(resolveBlock, undefined, [{ type: 'not-a-block' }])).toThrow(
        'BlockDefinition.type must be a registered BlockType',
      )
    })),
  )

  it('rejects malformed definition envelopes before resolving either half', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => Reflect.apply(resolveBlock, undefined, [null])).toThrow('block definition must be an object')
      expect(() => Reflect.apply(resolveBlock, undefined, [{ type: 'stone', futureField: true }])).toThrow(
        'unknown block definition field futureField',
      )
      expect(() => Reflect.apply(blockCapabilitiesOf, undefined, [{ type: 'stone', capabilities: [] }])).toThrow(
        'BlockDefinition.capabilities must be an object',
      )
      expect(() => Reflect.apply(blockPropertiesOf, undefined, [{ type: 'stone', properties: null }])).toThrow(
        'BlockDefinition.properties must be an object',
      )
    })),
  )
})

describe('the implemented / downstream capability ledger', () => {
  it('the audited roster is exactly the implemented capabilities plus downstream-owned ones', () =>
    Effect.runPromise(Effect.sync(() => {
      // Machine-checked honesty: nothing in the audit may be silently dropped,
      // And nothing may be invented that the audit did not find.
      const implemented = [...BLOCK_CAPABILITY_FLAGS, ...BLOCK_PROPERTY_NAMES]
      const downstream = DOWNSTREAM_CAPABILITIES.map((entry) => entry.name)

      expect([...implemented, ...downstream].sort()).toStrictEqual([...AUDITED_CAPABILITY_NAMES].sort())
      expect(new Set([...implemented, ...downstream]).size).toBe(AUDITED_CAPABILITY_NAMES.length)
    })),
  )

  it('the ledger has 29 rows, of which 28 are implemented and 1 is downstream-owned', () =>
    Effect.runPromise(Effect.sync(() => {
      // 24/4 until `supportRule` landed as `properties.supportRule`, then
      // `tillable` and `footstepMaterial` landed as additive properties.
      // (`domain/block-support.ts`). The property count moved and the
      // downstream boundary is kept explicit; the test ABOVE is the one that
      // catches a capability being dropped from both lists at once.
      //
      // `blastResistance` is the 29th row and the first NOT sourced from the
      // historical audit — see `AUDITED_CAPABILITY_NAMES`'s doc comment for
      // its provenance (the mx-gameplay `block-vocabulary.ts` mirror).
      expect(AUDITED_CAPABILITY_NAMES).toHaveLength(AUDITED_CAPABILITY_COUNT)
      expect(BLOCK_CAPABILITY_FLAGS).toHaveLength(IMPLEMENTED_FLAG_COUNT)
      expect(BLOCK_PROPERTY_NAMES).toHaveLength(IMPLEMENTED_PROPERTY_COUNT)
      expect(DOWNSTREAM_CAPABILITIES).toHaveLength(DOWNSTREAM_CAPABILITY_COUNT)
    })),
  )

  it('every downstream-owned capability states its owner and boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const entry of DOWNSTREAM_CAPABILITIES) {
        expect(entry.why.length).toBeGreaterThan(DOWNSTREAM_CAPABILITY_MINIMUM_EXPLANATION_LENGTH)
        expect(['flag', 'property']).toContain(entry.kind)
        expect(entry.owner).toBe('renderer')
        // Not in either kernel table — otherwise the boundary ledger is lying.
        expect(BLOCK_CAPABILITY_FLAGS).not.toContain(entry.name)
        expect(BLOCK_PROPERTY_NAMES).not.toContain(entry.name)
      }
    })),
  )

  it('`solid` and `faces` are absent from both tables, because the audit found 0 production reads', () =>
    Effect.runPromise(Effect.sync(() => {
      // Audit §7: rg '\.solid\b' / rg '\.faces\b' -> 0 hits in the reference's
      // Production code. Porting a dead field into a frozen API would be the
      // Cheapest possible way to make the freeze wrong.
      for (const dead of ['solid', 'faces']) {
        expect(BLOCK_CAPABILITY_FLAGS).not.toContain(dead)
        expect(BLOCK_PROPERTY_NAMES).not.toContain(dead)
        expect(AUDITED_CAPABILITY_NAMES).not.toContain(dead)
        expect(DOWNSTREAM_CAPABILITIES.map((entry) => entry.name)).not.toContain(dead)
      }
    })),
  )
})

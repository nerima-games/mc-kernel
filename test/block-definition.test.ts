import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from '../domain/block-capabilities'
import {
  AUDITED_CAPABILITY_NAMES,
  blockCapabilitiesOf,
  blockPropertiesOf,
  PENDING_CAPABILITIES,
  resolveBlock,
  type BlockDefinition,
} from '../domain/block-definition'
import { BLOCK_PROPERTY_DEFAULTS, BLOCK_PROPERTY_NAMES } from '../domain/block-properties'

describe('adding a block is one table row plus flag settings (plan.md §3.1 invariant)', () => {
  // THE named regression test for plan.md §3.1's closing requirement:
  //   ブロック追加 = 定義テーブル1行 + フラグ設定、で完結すること
  //
  // The reference implementation failed this: behaviour was decided by
  // `blockType === 'SAND'` comparisons scattered through production code
  // (measured on the reference: 90 occurrences across 38 files, tests
  // excluded — see docs/design-notes.md). Adding a block there meant hunting
  // those sites. Here, a block is a value, and every consumer reads
  // capabilities rather than names.

  it.effect('a whole block is expressible as one literal and nothing else', () =>
    Effect.sync(() => {
      // Lava: fluid, emits maximum light, passable, hurts on contact,
      // replaceable, a fire source, no drops. Seven behaviours, one literal,
      // zero code changes anywhere in kernel.
      const lava: BlockDefinition = {
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
          fluid: 'lava',
          opacity: 'fluid',
          renderKind: 'fluid',
          collisionShape: 'none',
          lightEmission: 15,
          contactDamage: 4,
          drops: { item: 'self', count: 0, requiresSilkTouch: false, affectedByFortune: false },
        },
      }

      const resolved = resolveBlock(lava)
      expect(resolved.type).toBe('lava')
      expect(resolved.capabilities.passable).toBe(true)
      expect(resolved.properties.fluid).toBe('lava')
      expect(resolved.properties.lightEmission).toBe(15)
      expect(resolved.properties.contactDamage).toBe(4)
      expect(resolved.properties.drops.count).toBe(0)
    }),
  )

  it.effect('the minimal row is just a type, and it describes an ordinary opaque solid cube', () =>
    Effect.sync(() => {
      const resolved = resolveBlock({ type: 'stone' })
      expect(resolved.capabilities).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
      expect(resolved.properties).toStrictEqual({ ...BLOCK_PROPERTY_DEFAULTS })
    }),
  )

  it.effect('a definition carries no behaviour — there is nowhere to put a name-based branch', () =>
    Effect.sync(() => {
      const definition: BlockDefinition = { type: 'sand', capabilities: { fallsWhenUnsupported: true } }
      // Every own key is data. If a future edit adds a function-valued field,
      // this fails, and it should: a callback on a block definition is the
      // reference implementation's mistake re-entering through the front door.
      for (const value of Object.values(definition)) {
        expect(typeof value).not.toBe('function')
      }
      for (const value of Object.values(definition.capabilities ?? {})) {
        expect(typeof value).toBe('boolean')
      }
    }),
  )

  it.effect('two blocks that differ only in flags share every other resolved value', () =>
    Effect.sync(() => {
      const gravel = resolveBlock({ type: 'gravel', capabilities: { fallsWhenUnsupported: true } })
      const dirt = resolveBlock({ type: 'dirt' })

      expect(gravel.capabilities.fallsWhenUnsupported).toBe(true)
      expect(dirt.capabilities.fallsWhenUnsupported).toBe(false)
      // The difference is exactly one flag, nothing else.
      expect(gravel.properties).toStrictEqual(dirt.properties)
    }),
  )
})

describe('resolveBlock', () => {
  it.effect('resolves both halves and agrees with resolving each half separately', () =>
    Effect.sync(() => {
      const glowstone: BlockDefinition = {
        type: 'glowstone',
        properties: { lightEmission: 15, opacity: 'transparentSolid' },
      }
      const resolved = resolveBlock(glowstone)
      expect(resolved.capabilities).toStrictEqual(blockCapabilitiesOf(glowstone))
      expect(resolved.properties).toStrictEqual(blockPropertiesOf(glowstone))
    }),
  )
})

describe('the implemented / pending ledger', () => {
  it.effect('the audited roster is exactly the implemented capabilities plus the pending ones', () =>
    Effect.sync(() => {
      // Machine-checked honesty: nothing in the audit may be silently dropped,
      // and nothing may be invented that the audit did not find.
      const implemented = [...BLOCK_CAPABILITY_FLAGS, ...BLOCK_PROPERTY_NAMES]
      const pending = PENDING_CAPABILITIES.map((entry) => entry.name)

      expect([...implemented, ...pending].sort()).toStrictEqual([...AUDITED_CAPABILITY_NAMES].sort())
      expect(new Set([...implemented, ...pending]).size).toBe(AUDITED_CAPABILITY_NAMES.length)
    }),
  )

  it.effect('the audit table has 28 rows, of which 24 are implemented and 4 are pending', () =>
    Effect.sync(() => {
      // docs/capability-flag-audit.md §7 prose says "26"; its §3 table has 28
      // rows. The table is what is implemented against, and the discrepancy is
      // recorded rather than quietly resolved.
      expect(AUDITED_CAPABILITY_NAMES).toHaveLength(28)
      expect(BLOCK_CAPABILITY_FLAGS).toHaveLength(11)
      expect(BLOCK_PROPERTY_NAMES).toHaveLength(13)
      expect(PENDING_CAPABILITIES).toHaveLength(4)
    }),
  )

  it.effect('every pending capability states why it is pending', () =>
    Effect.sync(() => {
      for (const entry of PENDING_CAPABILITIES) {
        expect(entry.why.length).toBeGreaterThan(20)
        expect(['flag', 'property']).toContain(entry.kind)
        // Not yet in either table — otherwise the ledger is lying.
        expect(BLOCK_CAPABILITY_FLAGS).not.toContain(entry.name)
        expect(BLOCK_PROPERTY_NAMES).not.toContain(entry.name)
      }
    }),
  )

  it.effect('`solid` and `faces` are absent from both tables, because the audit found 0 production reads', () =>
    Effect.sync(() => {
      // audit §7: rg '\.solid\b' / rg '\.faces\b' -> 0 hits in the reference's
      // production code. Porting a dead field into a frozen API would be the
      // cheapest possible way to make the freeze wrong.
      for (const dead of ['solid', 'faces']) {
        expect(BLOCK_CAPABILITY_FLAGS).not.toContain(dead)
        expect(BLOCK_PROPERTY_NAMES).not.toContain(dead)
        expect(AUDITED_CAPABILITY_NAMES).not.toContain(dead)
        expect(PENDING_CAPABILITIES.map((entry) => entry.name)).not.toContain(dead)
      }
    }),
  )
})

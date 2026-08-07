/* eslint-disable curly, max-statements, no-magic-numbers, sort-imports, sort-keys -- Minecraft costs, durability, and wire object shapes are the contract under test. */
import { Effect } from 'effect'
import {
  ANVIL_SNAPSHOT_VERSION,
  AnvilCustomName,
  AnvilEnchantmentId,
  AnvilSnapshotString,
  isAnvilCustomName,
  isAnvilEnchantmentId,
  isAnvilSnapshotString,
  type AnvilItemPayload,
  type AnvilRuleSet,
  type AnvilState,
  applyAnvil,
  decodeAnvilSnapshot,
  decodeAnvilSnapshotString,
  encodeAnvilSnapshot,
  nextAnvilRepairCost,
  planAnvil,
  snapshotAnvilState,
} from '../src/domain/anvil'
import type { StackCount } from '../src/domain/quantities'
import { describe, expect, it } from '@effect/vitest'
import { expectTypeOf } from 'vitest'

const RULES = {
  enchantments: [
    {
      id: AnvilEnchantmentId('efficiency'),
      maxLevel: 5,
      applicableItems: ['iron_pickaxe'],
      incompatibleWith: [],
      costPerLevel: 1,
    },
    {
      id: AnvilEnchantmentId('sharpness'),
      maxLevel: 5,
      applicableItems: ['iron_sword'],
      incompatibleWith: [AnvilEnchantmentId('smite')],
      costPerLevel: 1,
    },
    {
      id: AnvilEnchantmentId('smite'),
      maxLevel: 5,
      applicableItems: ['iron_sword'],
      incompatibleWith: [AnvilEnchantmentId('sharpness')],
      costPerLevel: 1,
    },
    {
      id: AnvilEnchantmentId('unbreaking'),
      maxLevel: 3,
      applicableItems: ['iron_pickaxe', 'iron_sword'],
      incompatibleWith: [],
      costPerLevel: 2,
    },
  ],
  repairMaterials: [
    { target: 'iron_sword', material: 'iron_ingot', durabilityPerUnit: 63 },
  ],
} as const satisfies AnvilRuleSet

const item = (
  overrides: Partial<AnvilItemPayload> = {},
): AnvilItemPayload => ({
  item: 'iron_sword',
  durability: { current: 100, max: 250 },
  enchantments: [],
  ...overrides,
})

const state = (overrides: Partial<AnvilState> = {}): AnvilState => ({
  left: item(),
  right: null,
  rename: null,
  experienceLevels: 30,
  ...overrides,
})

describe('anvil planning', () => {
  it.effect('repairs same-kind durable items with the deterministic twelve-percent bonus', () =>
    Effect.sync(() => {
      const planned = planAnvil(state({
        left: item({ durability: { current: 50, max: 250 } }),
        right: {
          payload: item({ durability: { current: 100, max: 250 } }),
          count: 1,
        },
      }), RULES)

      expect(planned).toStrictEqual({
        ok: true,
        output: {
          item: 'iron_sword',
          durability: { current: 180, max: 250 },
          enchantments: [],
          repairCost: 1,
          customName: null,
        },
        levelCost: 2,
        materialCost: 1,
      })
    }),
  )

  it.effect('repairs with configured material units and consumes only the required stack count', () =>
    Effect.sync(() => {
      const input = state({
        right: {
          payload: item({ item: 'iron_ingot', durability: null }),
          count: 4,
        },
        experienceLevels: 10,
      })
      const applied = applyAnvil(input, RULES)

      expect(applied.ok).toBe(true)
      if (!applied.ok) return
      expect(applied.output.durability).toStrictEqual({ current: 250, max: 250 })
      expect(applied.levelCost).toBe(3)
      expect(applied.materialCost).toBe(3)
      expectTypeOf(applied.materialCost).toEqualTypeOf<StackCount>()
      expectTypeOf(applied.state.right).not.toBeNull()
      if (applied.state.right !== null) {
        expectTypeOf(applied.state.right.count).toEqualTypeOf<StackCount>()
      }
      expect(applied.state).toStrictEqual({
        left: null,
        right: {
          payload: {
            item: 'iron_ingot',
            durability: null,
            enchantments: [],
            repairCost: 0,
            customName: null,
          },
          count: 1,
        },
        rename: null,
        experienceLevels: 7,
      })

      const statefulMaterial = planAnvil(state({
        right: {
          payload: item({ item: 'iron_ingot', durability: null, repairCost: 1 }),
          count: 1,
        },
      }), RULES)
      expect(statefulMaterial).toMatchObject({ ok: false, reason: 'incompatible-input' })
    }),
  )

  it.effect('merges enchanted books and same-kind items with caps and deterministic costs', () =>
    Effect.sync(() => {
      const bookPlan = planAnvil(state({
        left: item({ enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 4 }] }),
        right: {
          payload: item({
            item: 'enchanted_book',
            durability: null,
            enchantments: [
              { id: AnvilEnchantmentId('unbreaking'), level: 2 },
              { id: AnvilEnchantmentId('sharpness'), level: 4 },
            ],
          }),
          count: 1,
        },
      }), RULES)
      expect(bookPlan.ok).toBe(true)
      if (!bookPlan.ok) return
      expect(bookPlan.output.enchantments).toStrictEqual([
        { id: AnvilEnchantmentId('sharpness'), level: 5 },
        { id: AnvilEnchantmentId('unbreaking'), level: 2 },
      ])
      expect(bookPlan.levelCost).toBe(9)
      expectTypeOf(bookPlan.materialCost).toEqualTypeOf<StackCount>()

      const itemPlan = planAnvil(state({
        left: item({ enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 2 }] }),
        right: {
          payload: item({
            durability: { current: 1, max: 250 },
            enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 2 }],
          }),
          count: 1,
        },
      }), RULES)
      expect(itemPlan.ok).toBe(true)
      if (!itemPlan.ok) return
      expect(itemPlan.output.enchantments).toStrictEqual([{ id: AnvilEnchantmentId('sharpness'), level: 3 }])
      expect(itemPlan.output.durability).toStrictEqual({ current: 131, max: 250 })
      expect(itemPlan.levelCost).toBe(5)
    }),
  )

  it.effect('rejects target violations, conflicts, and unchanged right inputs', () =>
    Effect.sync(() => {
      const targetViolation = planAnvil(state({
        right: {
          payload: item({
            item: 'enchanted_book',
            durability: null,
            enchantments: [{ id: AnvilEnchantmentId('efficiency'), level: 1 }],
          }),
          count: 1,
        },
      }), RULES)
      expect(targetViolation).toMatchObject({ ok: false, reason: 'invalid-enchantment' })

      const conflict = planAnvil(state({
        left: item({ enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 2 }] }),
        right: {
          payload: item({
            item: 'enchanted_book',
            durability: null,
            enchantments: [{ id: AnvilEnchantmentId('smite'), level: 2 }],
          }),
          count: 1,
        },
      }), RULES)
      expect(conflict).toMatchObject({ ok: false, reason: 'enchantment-conflict' })

      const capped = planAnvil(state({
        left: item({ enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 5 }] }),
        right: {
          payload: item({
            item: 'enchanted_book',
            durability: null,
            enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 5 }],
          }),
          count: 1,
        },
      }), RULES)
      expect(capped).toMatchObject({ ok: false, reason: 'incompatible-input' })
    }),
  )

  it.effect('supports rename and applies prior-work and too-expensive rules deterministically', () =>
    Effect.sync(() => {
      const renamePlan = planAnvil(state({
        left: item({ repairCost: 3, customName: AnvilCustomName('Old name') }),
        rename: AnvilCustomName('New name'),
      }), RULES)
      expect(renamePlan).toStrictEqual({
        ok: true,
        output: {
          item: 'iron_sword',
          durability: { current: 100, max: 250 },
          enchantments: [],
          repairCost: 7,
          customName: AnvilCustomName('New name'),
        },
        levelCost: 4,
        materialCost: 0,
      })
      expect(nextAnvilRepairCost(3)).toBe(7)

      const tooExpensive = planAnvil(state({
        left: item({ repairCost: 39 }),
        rename: AnvilCustomName('Costs forty'),
      }), RULES)
      expect(tooExpensive).toMatchObject({ ok: false, reason: 'too-expensive' })
    }),
  )
})

describe('anvil application', () => {
  it.effect('consumes experience and inputs atomically only after a valid plan', () =>
    Effect.sync(() => {
      const input = state({ rename: AnvilCustomName('Named sword'), experienceLevels: 1 })
      const success = applyAnvil(input, RULES)
      expect(success).toMatchObject({
        ok: true,
        state: { left: null, right: null, rename: null, experienceLevels: 0 },
        output: { customName: AnvilCustomName('Named sword') },
      })

      const insufficientInput = state({
        left: item({ repairCost: 3 }),
        rename: AnvilCustomName('Too costly'),
        experienceLevels: 3,
      })
      const insufficient = applyAnvil(insufficientInput, RULES)
      expect(insufficient).toMatchObject({ ok: false, reason: 'insufficient-experience' })
      expect(insufficient.state).toBe(insufficientInput)

      const unchangedInput = state()
      const unchanged = applyAnvil(unchangedInput, RULES)
      expect(unchanged).toMatchObject({ ok: false, reason: 'nothing-to-do' })
      expect(unchanged.state).toBe(unchangedInput)
    }),
  )
})

describe('anvil snapshot codec', () => {
  it.effect('exposes non-throwing guards for branded anvil boundary strings', () =>
    Effect.sync(() => {
      expect(isAnvilEnchantmentId('sharpness')).toBe(true)
      expect(isAnvilEnchantmentId('Sharpness')).toBe(false)
      expect(isAnvilCustomName('Named sword')).toBe(true)
      expect(isAnvilCustomName('')).toBe(false)
      expect(isAnvilSnapshotString('{"version":1,"state":{"left":null,"right":null,"rename":null,"experienceLevels":0}}')).toBe(true)
      expect(isAnvilSnapshotString('{')).toBe(false)
    }),
  )

  it.effect('canonicalises optional fields and enchantment order before deterministic encoding', () =>
    Effect.sync(() => {
      const input = state({
        left: item({
          enchantments: [
            { id: AnvilEnchantmentId('unbreaking'), level: 2 },
            { id: AnvilEnchantmentId('sharpness'), level: 3 },
          ],
        }),
        experienceLevels: 12,
      })
      const encoded = encodeAnvilSnapshot(input)
      expect(encoded.ok).toBe(true)
      if (!encoded.ok) return
      expect(encoded.encoded).toBe(
        '{"version":1,"state":{"left":{"item":"iron_sword","durability":{"current":100,"max":250},"enchantments":[{"id":"sharpness","level":3},{"id":"unbreaking","level":2}],"repairCost":0,"customName":null},"right":null,"rename":null,"experienceLevels":12}}',
      )
      expect(AnvilSnapshotString(encoded.encoded)).toBe(encoded.encoded)
      expect(decodeAnvilSnapshotString(encoded.encoded)).toStrictEqual({
        ok: true,
        snapshot: encoded.snapshot,
      })
      expect(snapshotAnvilState(input)).toStrictEqual({ ok: true, snapshot: encoded.snapshot })
      expect(encoded.snapshot.version).toBe(ANVIL_SNAPSHOT_VERSION)
    }),
  )

  it.effect('rejects malformed JSON, versions, duplicate enchantments, and invalid stacks', () =>
    Effect.sync(() => {
      expect(decodeAnvilSnapshotString('{')).toMatchObject({ ok: false })
      expect(() => AnvilSnapshotString('{')).toThrowError(TypeError)
      expect(decodeAnvilSnapshot({ version: 2, state: state() })).toMatchObject({ ok: false })
      expect(snapshotAnvilState(state({
        left: item({
          enchantments: [
            { id: AnvilEnchantmentId('sharpness'), level: 1 },
            { id: AnvilEnchantmentId('sharpness'), level: 2 },
          ],
        }),
      }))).toMatchObject({ ok: false })
      expect(snapshotAnvilState(state({
        right: {
          payload: item({ item: 'enchanted_book', durability: null }),
          count: 2,
        },
      }))).toMatchObject({ ok: false })
    }),
  )
})

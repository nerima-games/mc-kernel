/* eslint-disable curly, max-statements, no-magic-numbers, sort-imports, sort-keys -- Minecraft costs, durability, and wire object shapes are the contract under test. */
import { Effect } from 'effect'
import {
  AnvilCustomName,
  AnvilEnchantmentId,
  type AnvilItemPayload,
  type AnvilRuleSet,
  type AnvilState,
  applyAnvil,
  compileAnvilRuleSet,
  decodeAnvilSnapshot,
  nextAnvilRepairCost,
  planAnvil,
  snapshotAnvilState,
} from '../src/domain/anvil'
import type { StackCount } from '../src/domain/quantities'
import { describe, expect, it } from 'vitest'
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

describe('anvil validation guards', () => {
  it('reuses compiled rule indexes without changing the plan', () =>
    Effect.runPromise(Effect.sync(() => {
      const compiled = compileAnvilRuleSet(RULES)
      expect(compiled.ok).toBe(true)
      if (!compiled.ok) return

      const repairInput: AnvilState = {
        ...state({ left: item({ durability: { current: 50, max: 250 } }) }),
        right: {
          payload: {
            item: 'iron_ingot',
            durability: null,
            enchantments: [],
            repairCost: 0,
            customName: null,
          },
          count: 2,
        },
      }

      expect(planAnvil(repairInput, compiled.rules)).toStrictEqual(planAnvil(repairInput, RULES))
    })),
  )

  it('rejects invalid or duplicate enchantment rules before planning', () =>
    Effect.runPromise(Effect.sync(() => {
      const invalidRules = planAnvil(state(), {
        ...RULES,
        enchantments: [
          ...RULES.enchantments,
          {
            id: AnvilEnchantmentId('sharpness'),
            maxLevel: 5,
            applicableItems: ['iron_sword'],
            incompatibleWith: [],
            costPerLevel: 1,
          },
        ],
      })

      expect(invalidRules).toStrictEqual({
        ok: false,
        reason: 'invalid-rules',
        issues: [{
          path: '$.rules.enchantments.4',
          reason: 'contains an invalid or duplicate rule',
        }],
      })
    })),
  )

  it('rejects non-positive repair material durability rules before planning', () =>
    Effect.runPromise(Effect.sync(() => {
      const invalidRules = planAnvil(state(), {
        ...RULES,
        repairMaterials: [
          ...RULES.repairMaterials,
          { target: 'iron_sword', material: 'iron_ingot', durabilityPerUnit: 0 },
        ],
      })

      expect(invalidRules).toStrictEqual({
        ok: false,
        reason: 'invalid-rules',
        issues: [{
          path: '$.rules.repairMaterials.1',
          reason: 'durabilityPerUnit must be positive',
        }],
      })
    })),
  )

  it('rejects left-side enchantments that exceed their configured level cap', () =>
    Effect.runPromise(Effect.sync(() => {
      const invalidLeft = planAnvil(state({
        left: item({
          enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 6 }],
        }),
      }), RULES)

      expect(invalidLeft).toStrictEqual({
        ok: false,
        reason: 'invalid-enchantment',
        issues: [{
          path: '$.enchantments.0',
          reason: 'is unregistered or exceeds its level cap',
        }],
      })
    })),
  )

  it('rejects left-side enchantments that do not apply to the item', () =>
    Effect.runPromise(Effect.sync(() => {
      const invalidLeft = planAnvil(state({
        left: item({
          enchantments: [{ id: AnvilEnchantmentId('efficiency'), level: 1 }],
        }),
      }), RULES)

      expect(invalidLeft).toMatchObject({ ok: false, reason: 'invalid-enchantment' })
    })),
  )

  it('rejects left-side enchantments that conflict with each other', () =>
    Effect.runPromise(Effect.sync(() => {
      const conflictingLeft = planAnvil(state({
        left: item({
          enchantments: [
            { id: AnvilEnchantmentId('sharpness'), level: 1 },
            { id: AnvilEnchantmentId('smite'), level: 1 },
          ],
        }),
      }), RULES)

      expect(conflictingLeft).toMatchObject({ ok: false, reason: 'enchantment-conflict' })
    })),
  )
})

describe('anvil planning', () => {
  it('repairs same-kind durable items with the deterministic twelve-percent bonus', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('rejects same-kind repair inputs when the left item is already fully durable', () =>
    Effect.runPromise(Effect.sync(() => {
      const planned = planAnvil(state({
        left: item({ durability: { current: 250, max: 250 } }),
        right: {
          payload: item({ durability: { current: 250, max: 250 } }),
          count: 1,
        },
      }), RULES)

      expect(planned).toStrictEqual({
        ok: false,
        reason: 'incompatible-input',
        issues: [{
          path: '$.state.right',
          reason: 'does not repair or enchant the left input',
        }],
      })
    })),
  )

  it('rejects same-kind repair inputs when the right durability does not match the left item', () =>
    Effect.runPromise(Effect.sync(() => {
      const mismatched = planAnvil(state({
        left: item({ durability: { current: 50, max: 250 } }),
        right: {
          payload: item({ durability: { current: 100, max: 300 } }),
          count: 1,
        },
      }), RULES)

      expect(mismatched).toStrictEqual({
        ok: false,
        reason: 'incompatible-input',
        issues: [{
          path: '$.state.right.payload.durability',
          reason: 'must match the left item durability',
        }],
      })
    })),
  )

  it('repairs with configured material units and consumes only the required stack count', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('rejects repair material when the left item is already fully durable', () =>
    Effect.runPromise(Effect.sync(() => {
      const planned = planAnvil(state({
        left: item({ durability: { current: 250, max: 250 } }),
        right: {
          payload: item({ item: 'iron_ingot', durability: null }),
          count: 1,
        },
      }), RULES)

      expect(planned).toStrictEqual({
        ok: false,
        reason: 'incompatible-input',
        issues: [{
          path: '$.state.right',
          reason: 'does not repair or enchant the left input',
        }],
      })
    })),
  )

  it('merges enchanted books and same-kind items with caps and deterministic costs', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('rejects target violations, conflicts, and unchanged right inputs', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('supports rename and applies prior-work and too-expensive rules deterministically', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )
})

describe('anvil application', () => {
  it('consumes experience and inputs atomically only after a valid plan', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('reports invalid input when the source state changes before post-plan canonicalization', () =>
    Effect.runPromise(Effect.sync(() => {
      let reads = 0
      const unstable = {
        ...state({ rename: AnvilCustomName('Named sword'), experienceLevels: 1 }),
        get experienceLevels() {
          reads += 1
          if (reads === 1) return 1
          return Number.NaN
        },
      }

      const applied = applyAnvil(unstable, RULES)
      expect(applied).toMatchObject({ ok: false, reason: 'invalid-input' })
      expect(applied.state).toBe(unstable)
      if (applied.ok) return
      expect(applied.issues).toContainEqual({
        path: '$.state.experienceLevels',
        reason: 'must be a non-negative safe integer',
      })
    })),
  )
})

describe('anvil item payload field validation', () => {
  /**
   * Same invariant on every row: one malformed `AnvilState` field, checked in
   * isolation, surfaces the one issue naming that field's JSON path — never a
   * different field, never more than one issue. `build` returns unknown so each
   * malformed value reaches the public snapshot validator without a type escape.
   */
  interface FieldValidationCase {
    readonly name: string
    readonly build: () => unknown
    readonly issue: { readonly path: string; readonly reason: string }
  }

  const FIELD_VALIDATION_CASES: ReadonlyArray<FieldValidationCase> = [
    {
      name: 'a non-object payload before inspecting any field',
      build: () => ({ ...state(), left: 'not-an-object' }),
      issue: { path: '$.state.left', reason: 'must be an object' },
    },
    {
      name: 'an item field that is not a known item type',
      build: () => ({ ...state(), left: { ...item(), item: 'not_a_real_item' } }),
      issue: { path: '$.state.left.item', reason: 'must be a known item type' },
    },
    {
      name: 'a durability object that fails the shape or range check',
      build: () => ({ ...state(), left: { ...item(), durability: { current: -1, max: 10 } } }),
      issue: { path: '$.state.left.durability', reason: 'must be null or valid remaining durability' },
    },
    {
      name: 'a negative repair cost',
      build: () => ({ ...state(), left: { ...item(), repairCost: -1 } }),
      issue: { path: '$.state.left.repairCost', reason: 'must be a non-negative safe integer' },
    },
    {
      name: 'a custom name carrying a control character',
      build: () => ({ ...state(), left: { ...item(), customName: `bad${String.fromCharCode(0)}name` } }),
      issue: { path: '$.state.left.customName', reason: 'must be null or a valid custom name' },
    },
    {
      name: 'an enchantments field that is not an array',
      build: () => ({ ...state(), left: { ...item(), enchantments: 'not-an-array' } }),
      issue: { path: '$.state.left.enchantments', reason: 'must be an array' },
    },
    {
      name: 'an enchantment array entry that is not an object',
      build: () => ({ ...state(), left: { ...item(), enchantments: [null] } }),
      issue: { path: '$.state.left.enchantments.0', reason: 'must be an object' },
    },
    {
      name: 'a durable right-hand item stacked at more than one, distinct from exceeding the stack limit',
      build: () => state({
        right: { payload: item({ item: 'iron_ingot', durability: { current: 5, max: 10 } }), count: 2 },
      }),
      issue: { path: '$.state.right.count', reason: 'durable item payloads cannot stack' },
    },
  ]

  for (const { name, build, issue } of FIELD_VALIDATION_CASES) {
    it(`rejects ${name}`, () =>
      Effect.runPromise(Effect.sync(() => {
        expect(Reflect.apply(snapshotAnvilState, undefined, [build()])).toStrictEqual({ ok: false, issues: [issue] })
      })),
    )
  }

  it('rejects a non-object value at the top of the snapshot decoder', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(decodeAnvilSnapshot(null)).toStrictEqual({
        ok: false,
        issues: [{ path: '$', reason: 'must be an object' }],
      })
    })),
  )
})

describe('anvil planning branch coverage', () => {
  it('rejects a missing left input distinctly from an invalid snapshot', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(planAnvil(state({ left: null }), RULES)).toStrictEqual({
        ok: false,
        reason: 'invalid-input',
        issues: [{ path: '$.state.left', reason: 'an anvil requires a left input' }],
      })

      const invalidSnapshot = Reflect.apply(planAnvil, undefined, [{ ...state(), rename: '' }, RULES])
      expect(invalidSnapshot).toMatchObject({ ok: false, reason: 'invalid-input' })
    })),
  )

  it('rejects a right-hand payload whose own enchantments are invalid, before any merge is attempted', () =>
    Effect.runPromise(Effect.sync(() => {
      const invalidRight = planAnvil(state({
        right: {
          payload: item({
            enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 99 }],
          }),
          count: 1,
        },
      }), RULES)

      expect(invalidRight).toMatchObject({ ok: false, reason: 'invalid-enchantment' })
    })),
  )

  it('renames a non-durable item, exercising the null-durability branch of planning', () =>
    Effect.runPromise(Effect.sync(() => {
      const planned = planAnvil(state({
        left: item({ item: 'iron_ingot', durability: null }),
        rename: AnvilCustomName('Renamed ingot'),
      }), RULES)

      expect(planned).toMatchObject({
        ok: true,
        output: { durability: null, customName: AnvilCustomName('Renamed ingot') },
      })
    })),
  )

  it('rejects a right input that neither repairs nor enchants because no repair rule targets the left item', () =>
    Effect.runPromise(Effect.sync(() => {
      const noRepairRule = planAnvil(state({
        left: item({ item: 'iron_pickaxe' }),
        right: {
          payload: item({ item: 'iron_ingot', durability: null }),
          count: 1,
        },
      }), RULES)

      expect(noRepairRule).toStrictEqual({
        ok: false,
        reason: 'incompatible-input',
        issues: [{
          path: '$.state.right',
          reason: 'does not repair or enchant the left input',
        }],
      })
    })),
  )

  it('merges an enchantment at a differing level via Math.max and leaves an unrelated enchantment untouched', () =>
    Effect.runPromise(Effect.sync(() => {
      const rulesWithoutCostPerLevel = {
        enchantments: [
          { id: AnvilEnchantmentId('sharpness'), maxLevel: 5, applicableItems: ['iron_sword'], incompatibleWith: [] },
          { id: AnvilEnchantmentId('unbreaking'), maxLevel: 3, applicableItems: ['iron_sword'], incompatibleWith: [] },
        ],
      } as const satisfies AnvilRuleSet

      const merged = planAnvil(state({
        left: item({
          enchantments: [
            { id: AnvilEnchantmentId('sharpness'), level: 1 },
            { id: AnvilEnchantmentId('unbreaking'), level: 1 },
          ],
        }),
        right: {
          payload: item({
            item: 'enchanted_book',
            durability: null,
            enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 3 }],
          }),
          count: 1,
        },
      }), rulesWithoutCostPerLevel)

      expect(merged.ok).toBe(true)
      if (!merged.ok) return
      expect(merged.output.enchantments).toStrictEqual([
        { id: AnvilEnchantmentId('sharpness'), level: 3 },
        { id: AnvilEnchantmentId('unbreaking'), level: 1 },
      ])
      // costPerLevel is absent from both rules above, so the merge falls back to 1 per level.
      expect(merged.levelCost).toBe(3)
    })),
  )
})

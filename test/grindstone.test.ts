import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  AnvilCustomName,
  AnvilEnchantmentId,
  type AnvilEnchantment,
  type CanonicalAnvilItemPayload,
} from '../src/domain/anvil'
import {
  GRINDSTONE_REPAIR_COST_MAX,
  grindstoneExperienceFor,
  planGrindstone,
  type GrindstoneInput,
} from '../src/domain/grindstone'

const enchantment = (id: string, level = 1): AnvilEnchantment => ({
  id: AnvilEnchantmentId(id),
  level,
})

const item = (overrides: Partial<CanonicalAnvilItemPayload> = {}): CanonicalAnvilItemPayload => ({
  item: 'iron_pickaxe',
  durability: { current: 80, max: 100 },
  enchantments: [],
  repairCost: 0,
  customName: null,
  ...overrides,
})

const stack = (payload: CanonicalAnvilItemPayload, count = 1): GrindstoneInput => ({ payload, count })

describe('grindstone experience costs', () => {
  it('normalizes counts and saturates at the anvil integer maximum', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(grindstoneExperienceFor(-1)).toBe(0)
      expect(grindstoneExperienceFor(2.9)).toBe(3)
      expect(grindstoneExperienceFor(31)).toBe(GRINDSTONE_REPAIR_COST_MAX)
      expect(grindstoneExperienceFor(32)).toBe(GRINDSTONE_REPAIR_COST_MAX)
    })),
  )
})

describe('grindstone planning', () => {
  it('rejects empty input and stacks larger than one', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(planGrindstone(null, null)).toStrictEqual({
        ok: false,
        reason: 'empty-input',
        issues: [{ path: '$.input', reason: 'requires at least one input' }],
      })
      expect(planGrindstone(null, stack(item({ enchantments: [enchantment('mending')] })))).toMatchObject({
        ok: true,
        output: { count: 1 },
      })
      expect(planGrindstone(stack(item(), 2), null)).toStrictEqual({
        ok: false,
        reason: 'invalid-stack',
        issues: [{ path: '$.left.count', reason: 'must contain exactly one item' }],
      })
      expect(planGrindstone(null, stack(item(), 2))).toStrictEqual({
        ok: false,
        reason: 'invalid-stack',
        issues: [{ path: '$.right.count', reason: 'must contain exactly one item' }],
      })
      expect(planGrindstone(stack(item({ enchantments: [enchantment('mending')] })), stack(item(), 2))).toStrictEqual({
        ok: false,
        reason: 'invalid-stack',
        issues: [{ path: '$.right.count', reason: 'must contain exactly one item' }],
      })
    })),
  )

  it('removes ordinary enchantments while preserving curses and custom names', () =>
    Effect.runPromise(Effect.sync(() => {
      const plan = planGrindstone(
        stack(
          item({
            enchantments: [enchantment('sharpness'), enchantment('vanishing_curse'), enchantment('binding_curse')],
            repairCost: 7,
            customName: AnvilCustomName('Kept'),
          }),
        ),
        null,
      )

      expect(plan).toStrictEqual({
        ok: true,
        output: {
          payload: {
            item: 'iron_pickaxe',
            durability: { current: 80, max: 100 },
            enchantments: [enchantment('binding_curse'), enchantment('vanishing_curse')],
            repairCost: 1,
            customName: AnvilCustomName('Kept'),
          },
          count: 1,
          experienceLevels: 1,
        },
      })
    })),
  )

  it('turns a curse-free enchanted book into a plain book', () =>
    Effect.runPromise(Effect.sync(() => {
      const plan = planGrindstone(
        stack(item({ item: 'enchanted_book', durability: null, enchantments: [enchantment('mending')] })),
        null,
      )

      expect(plan).toStrictEqual({
        ok: true,
        output: {
          payload: {
            item: 'book',
            durability: null,
            enchantments: [],
            repairCost: 1,
            customName: null,
          },
          count: 1,
          experienceLevels: 1,
        },
      })
    })),
  )

  it('keeps an enchanted book when only curses remain', () =>
    Effect.runPromise(Effect.sync(() => {
      const plan = planGrindstone(
        stack(item({ item: 'enchanted_book', durability: null, enchantments: [enchantment('binding_curse')] })),
        null,
      )

      expect(plan).toStrictEqual({
        ok: true,
        output: {
          payload: {
            item: 'enchanted_book',
            durability: null,
            enchantments: [enchantment('binding_curse')],
            repairCost: 0,
            customName: null,
          },
          count: 1,
          experienceLevels: 0,
        },
      })
    })),
  )

  it('rejects a single item with nothing to remove', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(planGrindstone(stack(item()), null)).toStrictEqual({
        ok: false,
        reason: 'nothing-to-do',
        issues: [{ path: '$.input.enchantments', reason: 'must contain at least one enchantment' }],
      })
    })),
  )

  it('rejects mismatched item kinds and mixed damageability', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(planGrindstone(stack(item()), stack(item({ item: 'iron_sword' })))).toMatchObject({
        ok: false,
        reason: 'incompatible-input',
      })
      expect(planGrindstone(stack(item({ item: 'book', durability: null })), stack(item({ item: 'book' })))).toMatchObject({
        ok: false,
        reason: 'incompatible-input',
      })
    })),
  )

  it('requires stackable matching components for non-damageable items', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(
        planGrindstone(
          stack(item({ item: 'enchanted_book', durability: null })),
          stack(item({ item: 'enchanted_book', durability: null })),
        ),
      ).toMatchObject({ ok: false, reason: 'incompatible-input' })

      expect(
        planGrindstone(
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('sharpness')] })),
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('sharpness'), enchantment('mending')] })),
        ),
      ).toMatchObject({ ok: false, reason: 'incompatible-input' })

      expect(
        planGrindstone(
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('sharpness')] })),
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('mending')] })),
        ),
      ).toMatchObject({ ok: false, reason: 'incompatible-input' })

      expect(
        planGrindstone(
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('mending', 1)] })),
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('mending', 2)] })),
        ),
      ).toMatchObject({ ok: false, reason: 'incompatible-input' })

      expect(
        planGrindstone(
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('mending')] })),
          stack(item({ item: 'book', durability: null, enchantments: [enchantment('mending')] })),
        ),
      ).toMatchObject({ ok: true, output: { count: 2 } })

      expect(
        planGrindstone(
          stack(item({ item: 'book', durability: null, repairCost: 1 })),
          stack(item({ item: 'book', durability: null })),
        ),
      ).toMatchObject({ ok: false, reason: 'incompatible-input' })

      expect(
        planGrindstone(
          stack(item({ item: 'book', durability: null, customName: AnvilCustomName('left') })),
          stack(item({ item: 'book', durability: null })),
        ),
      ).toMatchObject({ ok: false, reason: 'incompatible-input' })

      expect(planGrindstone(stack(item({ item: 'book', durability: null })), stack(item({ item: 'book', durability: null })))).toStrictEqual({
        ok: true,
        output: {
          payload: {
            item: 'book',
            durability: null,
            enchantments: [],
            repairCost: 0,
            customName: null,
          },
          count: 2,
          experienceLevels: 0,
        },
      })
    })),
  )

  it('repairs damageable items with five-percent bonus durability and merged curses', () =>
    Effect.runPromise(Effect.sync(() => {
      const plan = planGrindstone(
        stack(
          item({
            enchantments: [enchantment('sharpness'), enchantment('binding_curse')],
            customName: AnvilCustomName('Kept'),
          }),
        ),
        stack(
          item({
            durability: { current: 50, max: 120 },
            enchantments: [enchantment('mending'), enchantment('binding_curse', 3)],
          }),
        ),
      )

      expect(plan).toStrictEqual({
        ok: true,
        output: {
          payload: {
            item: 'iron_pickaxe',
            durability: { current: 24, max: 120 },
            enchantments: [enchantment('binding_curse')],
            repairCost: 3,
            customName: AnvilCustomName('Kept'),
          },
          count: 1,
          experienceLevels: 3,
        },
      })
    })),
  )

  it('clamps repaired damage at zero durability', () =>
    Effect.runPromise(Effect.sync(() => {
      const plan = planGrindstone(
        stack(item({ durability: { current: 0, max: 100 } })),
        stack(item({ durability: { current: 0, max: 100 } })),
      )

      expect(plan).toMatchObject({
        ok: true,
        output: { payload: { durability: { current: 0, max: 100 } } },
      })
    })),
  )
})

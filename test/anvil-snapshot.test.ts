/* eslint-disable curly, max-statements, no-magic-numbers, sort-imports, sort-keys -- The snapshot wire shape is the contract under test. */
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
  type AnvilState,
  decodeAnvilSnapshot,
  decodeAnvilSnapshotString,
  encodeAnvilSnapshot,
  snapshotAnvilState,
} from '../src/domain/anvil'
import { describe, expect, it } from 'vitest'

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

describe('anvil snapshot codec', () => {
  it('exposes non-throwing guards for branded anvil boundary strings', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(isAnvilEnchantmentId('sharpness')).toBe(true)
      expect(isAnvilEnchantmentId('Sharpness')).toBe(false)
      expect(isAnvilCustomName('Named sword')).toBe(true)
      expect(isAnvilCustomName('')).toBe(false)
      expect(isAnvilSnapshotString('{"version":1,"state":{"left":null,"right":null,"rename":null,"experienceLevels":0}}')).toBe(true)
      expect(isAnvilSnapshotString('{')).toBe(false)
    })),
  )

  it('canonicalises optional fields and enchantment order before deterministic encoding', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('rejects malformed JSON, versions, duplicate enchantments, and invalid stacks', () =>
    Effect.runPromise(Effect.sync(() => {
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
    })),
  )

  it('rejects malformed right stacks, rename values, and invalid state encoding inputs', () =>
    Effect.runPromise(Effect.sync(() => {
      // Same {ok: false, issues: [{path, reason}]} shape as the field-validation
      // table above, but each row here exercises a DIFFERENT entry point
      // (`snapshotAnvilState`, `encodeAnvilSnapshot`, `decodeAnvilSnapshot`)
      // rather than a different field of one — kept as one test, looped, rather
      // than split across the file's other describe blocks.
      const cases: ReadonlyArray<{
        readonly name: string
        readonly validate: () => unknown
        readonly issue: { readonly path: string; readonly reason: string }
      }> = [
        {
          name: 'a right field that is not null or an input stack',
          validate: () => Reflect.apply(snapshotAnvilState, undefined, [{ ...state(), right: 'invalid' }]),
          issue: { path: '$.state.right', reason: 'must be null or an input stack' },
        },
        {
          name: 'a right payload that is not an object',
          validate: () => Reflect.apply(snapshotAnvilState, undefined, [{ ...state(), right: { payload: 'invalid', count: 1 } }]),
          issue: { path: '$.state.right.payload', reason: 'must be an object' },
        },
        {
          name: 'a right count of zero',
          validate: () => snapshotAnvilState(state({
            right: { payload: item({ item: 'enchanted_book', durability: null }), count: 0 },
          })),
          issue: { path: '$.state.right.count', reason: 'must be a positive safe integer' },
        },
        {
          name: 'a right count exceeding the item stack limit',
          validate: () => snapshotAnvilState(state({ right: { payload: item(), count: 2 } })),
          issue: { path: '$.state.right.count', reason: 'exceeds the item stack limit' },
        },
        {
          name: 'an invalid rename via snapshotAnvilState',
          validate: () => Reflect.apply(snapshotAnvilState, undefined, [{ ...state(), rename: '' }]),
          issue: { path: '$.state.rename', reason: 'must be null or a valid custom name' },
        },
        {
          name: 'the same invalid rename via encodeAnvilSnapshot, so both entry points share one validator',
          validate: () => Reflect.apply(encodeAnvilSnapshot, undefined, [{ ...state(), rename: '' }]),
          issue: { path: '$.state.rename', reason: 'must be null or a valid custom name' },
        },
        {
          name: 'a left enchantment id that is not canonical',
          validate: () => Reflect.apply(snapshotAnvilState, undefined, [{ ...state(), left: { ...item(), enchantments: [{ id: 1, level: 1 }] } }]),
          issue: { path: '$.state.left.enchantments.0.id', reason: 'must be a canonical enchantment id' },
        },
        {
          name: 'a left enchantment level of zero',
          validate: () => snapshotAnvilState(state({
            left: item({ enchantments: [{ id: AnvilEnchantmentId('sharpness'), level: 0 }] }),
          })),
          issue: { path: '$.state.left.enchantments.0.level', reason: 'must be a positive safe integer' },
        },
        {
          name: 'a null state on decodeAnvilSnapshot',
          validate: () => decodeAnvilSnapshot({ version: ANVIL_SNAPSHOT_VERSION, state: null }),
          issue: { path: '$.state', reason: 'must be an object' },
        },
      ]

      for (const { name, validate, issue } of cases) {
        expect(validate(), name).toStrictEqual({ ok: false, issues: [issue] })
      }
    })),
  )
})

describe('anvil snapshot decoding is closed to fields the format does not define', () => {
  /**
   * The snapshot carries a version, so a field this decoder does not know is
   * never "a newer format" — that is what the version is for. It is corruption
   * or a producer that disagrees with this one, and accepting it would drop the
   * value silently instead of reporting it. Every level of the shape is checked
   * because the wire format freezes at 1.0.0 and a level left open stays open.
   */
  const validPayload = { item: 'iron_sword', durability: { current: 100, max: 250 }, enchantments: [] }
  const validState = { left: validPayload, right: null, rename: null, experienceLevels: 30 }
  const snapshotOf = (decoded: unknown): unknown => ({ version: ANVIL_SNAPSHOT_VERSION, state: decoded })

  it('names the offending path at every level of the shape rather than ignoring the key', () =>
    Effect.runPromise(Effect.sync(() => {
      const cases: ReadonlyArray<{ readonly name: string; readonly input: unknown; readonly path: string }> = [
        {
          name: 'an extra key beside version and state',
          input: { version: ANVIL_SNAPSHOT_VERSION, state: validState, bogus: 1 },
          path: '$.bogus',
        },
        {
          name: 'an extra key on the state',
          input: snapshotOf({ ...validState, bogus: 1 }),
          path: '$.state.bogus',
        },
        {
          name: 'an extra key on an item payload',
          input: snapshotOf({ ...validState, left: { ...validPayload, bogus: 1 } }),
          path: '$.state.left.bogus',
        },
        {
          name: 'an extra key on durability',
          input: snapshotOf({
            ...validState,
            left: { ...validPayload, durability: { current: 100, max: 250, bogus: 1 } },
          }),
          path: '$.state.left.durability.bogus',
        },
        {
          name: 'an extra key on an enchantment',
          input: snapshotOf({
            ...validState,
            left: { ...validPayload, enchantments: [{ id: 'efficiency', level: 1, bogus: 1 }] },
          }),
          path: '$.state.left.enchantments.0.bogus',
        },
        {
          name: 'an extra key on the right input stack',
          input: snapshotOf({ ...validState, right: { payload: validPayload, count: 1, bogus: 1 } }),
          path: '$.state.right.bogus',
        },
      ]

      for (const { name, input, path } of cases) {
        expect(decodeAnvilSnapshot(input), name).toStrictEqual({
          ok: false,
          issues: [{ path, reason: 'is not a field of this format' }],
        })
      }
    })),
  )

  it('still accepts the same payloads once the undefined field is removed, so the check is not rejecting valid shapes', () =>
    Effect.runPromise(Effect.sync(() => {
      const accepted = decodeAnvilSnapshot(
        snapshotOf({ ...validState, right: { payload: validPayload, count: 1 } }),
      )
      expect(accepted.ok).toBe(true)
    })),
  )
})

describe('anvil branded boundary throwing constructors', () => {
  it('throws instead of returning a branded value for text the guard rejects', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => AnvilEnchantmentId('Not Lowercase')).toThrowError(TypeError)
      expect(() => AnvilCustomName('')).toThrowError(TypeError)
    })),
  )
})

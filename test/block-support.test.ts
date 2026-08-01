/**
 * `supportRule` (audit §4.6), with the reference's own suite as the oracle.
 *
 * plan.md §6 Step 2: 各 Step で参照実装の対応テスト・fixture・E2E シナリオを
 * オラクルとして移植し、既知バグの再発を防ぐ. The reference's suite is
 * `<reference-impl>/packages/world/domain/block-support.test.ts`, and its
 * thirteen `supportRuleCases` rows are transcribed below UNCHANGED in meaning —
 * same blocks, same supports, same verdicts, spelled in this repository's
 * lower-case names.
 *
 * Two of its three tables are not here and the reason differs for each:
 *
 *   `isSupportSensitiveBlock`  IS here, as `isSupportSensitiveBlockId`. The
 *     reference keeps it as a separate SET; kernel derives it from the rule
 *     (`kind !== 'none'`), so the transcription of those rows is also the test
 *     that the derivation agrees with the set it replaced.
 *
 *   `isWaterBreakableBlockIndex`  is NOT this column. It is
 *     `brokenByWaterFlow`, a boolean capability kernel already carries, and
 *     `test/block-capabilities.test.ts` owns it. Noted because the reference
 *     puts all three in one file and a reader coming from there will look.
 */
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { BLOCK_PROPERTY_DEFAULTS, BLOCK_PROPERTY_NAMES } from '../src/domain/block-properties'
import {
  BLOCK_REGISTRY,
  blockIdOf,
  canBlockStaySupported,
  isSupportSensitiveBlockId,
  supportRuleOfBlockId,
} from '../src/domain/block-registry'
import {
  NEEDS_ANY_SUPPORT,
  NEEDS_NO_SUPPORT,
  isSupportSensitive,
  needsOneOf,
  satisfiesSupportRule,
} from '../src/domain/block-support'
import type { BlockType } from '../src/domain/block-type'
import { BLOCK_TYPES } from '../src/domain/block-type'

// ---------------------------------------------------------------------------
// The three arms, in isolation
// ---------------------------------------------------------------------------

describe('SupportRule — the three arms', () => {
  it.effect('"none" is satisfied by anything, including a byte that names nothing', () =>
    Effect.sync(() => {
      expect(satisfiesSupportRule(NEEDS_NO_SUPPORT, 'stone', true)).toBe(true)
      expect(satisfiesSupportRule(NEEDS_NO_SUPPORT, 'air', false)).toBe(true)
      expect(satisfiesSupportRule(NEEDS_NO_SUPPORT, undefined, false)).toBe(true)
    }),
  )

  it.effect('"anySupporting" defers entirely to canSupportAttachments and ignores the name', () =>
    Effect.sync(() => {
      expect(satisfiesSupportRule(NEEDS_ANY_SUPPORT, 'stone', true)).toBe(true)
      expect(satisfiesSupportRule(NEEDS_ANY_SUPPORT, 'stone', false)).toBe(false)
      // The name is not consulted, which is what makes this arm the reference's
      // fallback rather than a fourteenth list: `block-support.ts:100` asks
      // `NON_SUPPORTING_BLOCK_TYPES` and nothing else.
      expect(satisfiesSupportRule(NEEDS_ANY_SUPPORT, undefined, true)).toBe(true)
    }),
  )

  it.effect('"oneOf" consults the list and ignores canSupportAttachments', () =>
    Effect.sync(() => {
      const rule = needsOneOf('sand', 'cactus')
      expect(satisfiesSupportRule(rule, 'sand', false)).toBe(true)
      expect(satisfiesSupportRule(rule, 'cactus', false)).toBe(true)
      // `dirt` supports attachments and is still refused, which is the whole
      // point of the column: the per-block list WINS over the negative set.
      expect(satisfiesSupportRule(rule, 'dirt', true)).toBe(false)
    }),
  )

  /*
   * THE ASYMMETRY, ASSERTED RATHER THAN LEFT TO THE COMMENT. An unknown byte
   * fails `'oneOf'` and passes `'anySupporting'`, and a reader who thinks that
   * is a bug should find this test before they "fix" it: `capabilityOfBlockId`
   * resolves an unknown id to an ordinary opaque cube, so `canSupportAttachments`
   * is genuinely `true` for it, whereas no unnameable block can be a member of a
   * list of five names.
   */
  it.effect('an unnameable block below holds up a torch and does not float a lily pad', () =>
    Effect.sync(() => {
      expect(satisfiesSupportRule(NEEDS_ANY_SUPPORT, undefined, true)).toBe(true)
      expect(satisfiesSupportRule(needsOneOf('water'), undefined, true)).toBe(false)
    }),
  )

  it.effect('isSupportSensitive is exactly "has a rule other than none"', () =>
    Effect.sync(() => {
      expect(isSupportSensitive(NEEDS_NO_SUPPORT)).toBe(false)
      expect(isSupportSensitive(NEEDS_ANY_SUPPORT)).toBe(true)
      expect(isSupportSensitive(needsOneOf('farmland'))).toBe(true)
      // A list may be EMPTY without ceasing to be a rule — that is a block
      // nothing can hold up, which is a statable thing and not an absence.
      expect(isSupportSensitive(needsOneOf())).toBe(true)
      expect(satisfiesSupportRule(needsOneOf(), 'stone', true)).toBe(false)
    }),
  )

  it.effect('needsOneOf keeps the order it was given, so a row diffs against its source set', () =>
    Effect.sync(() => {
      expect(needsOneOf('dirt', 'grass_block', 'sand', 'sugar_cane')).toStrictEqual({
        kind: 'oneOf',
        blocks: ['dirt', 'grass_block', 'sand', 'sugar_cane'],
      })
    }),
  )

  it.effect('the default is "none", which is what makes adding this property semver-MINOR', () =>
    Effect.sync(() => {
      expect(BLOCK_PROPERTY_DEFAULTS.supportRule).toStrictEqual(NEEDS_NO_SUPPORT)
      expect(BLOCK_PROPERTY_NAMES).toContain('supportRule')
    }),
  )
})

// ---------------------------------------------------------------------------
// The reference's own cases, ported
// ---------------------------------------------------------------------------

/**
 * `block-support.test.ts:19-33` `supportRuleCases`, all thirteen rows.
 *
 * FOUR OF THESE ARE THE F7 ROWS. mx-gameplay pinned rows 11, 12 and 13 (and a
 * sapling on stone) as DISAGREEING with this table, because it answered them
 * with the fallback arm; they are here as agreement, which is the whole
 * transaction between the two repositories.
 */
const referenceCases: ReadonlyArray<readonly [BlockType, BlockType, boolean]> = [
  ['pressure_plate', 'stone', true],
  ['pressure_plate', 'air', false],
  ['rail', 'stone', true],
  ['rail', 'air', false],
  ['rail', 'water', false],
  ['rail', 'pressure_plate', false],
  ['wheat_crop', 'farmland', true],
  ['wheat_crop', 'dirt', false],
  ['potato_crop', 'farmland', true],
  ['potato_crop', 'dirt', false],
  ['sugar_cane', 'sand', true],
  ['cactus', 'dirt', false],
  ['lily_pad', 'water', true],
]

/** `block-support.test.ts:10-17` `supportSensitiveCases`, all six rows. */
const referenceSensitivity: ReadonlyArray<readonly [BlockType, boolean]> = [
  ['torch', true],
  ['pressure_plate', true],
  ['rail', true],
  ['wheat_crop', true],
  ['potato_crop', true],
  ['stone', false],
]

describe('the reference implementation’s block-support suite, ported as an oracle', () => {
  it.effect('answers all thirteen of its support-rule cases the same way', () =>
    Effect.sync(() => {
      for (const [held, support, expected] of referenceCases) {
        expect({
          held,
          support,
          stays: canBlockStaySupported(blockIdOf(held), blockIdOf(support)),
        }).toStrictEqual({ held, support, stays: expected })
      }
    }),
  )

  it.effect('answers all six of its sensitivity cases the same way', () =>
    Effect.sync(() => {
      for (const [held, expected] of referenceSensitivity) {
        expect({ held, sensitive: isSupportSensitiveBlockId(blockIdOf(held)) }).toStrictEqual({
          held,
          sensitive: expected,
        })
      }
    }),
  )

  /*
   * THE ROW THE COLUMN EXISTS FOR, split out of the thirteen because it is the
   * one the fallback arm gets wrong in BOTH directions.
   *
   * `water` is in `NON_SUPPORTING_BLOCK_TYPES` (`block-support.ts:49`), so a
   * rule that consulted only `canSupportAttachments` refuses a lily pad on the
   * one cell it belongs on — and, having no list to check, allows it on stone.
   * mx-gameplay's F7 pinned exactly this pair as the current wrong behaviour.
   */
  it.effect('a lily pad floats on water and does NOT sit on stone', () =>
    Effect.sync(() => {
      expect(canBlockStaySupported(blockIdOf('lily_pad'), blockIdOf('water'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('lily_pad'), blockIdOf('stone'))).toBe(false)
    }),
  )

  it.effect('a cactus stands on sand and on a cactus, and on nothing else', () =>
    Effect.sync(() => {
      expect(canBlockStaySupported(blockIdOf('cactus'), blockIdOf('sand'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('cactus'), blockIdOf('cactus'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('cactus'), blockIdOf('dirt'))).toBe(false)
      expect(canBlockStaySupported(blockIdOf('cactus'), blockIdOf('stone'))).toBe(false)
    }),
  )

  it.effect('a sapling takes dirt, grass and farmland, and refuses stone', () =>
    Effect.sync(() => {
      expect(canBlockStaySupported(blockIdOf('sapling'), blockIdOf('dirt'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('sapling'), blockIdOf('grass_block'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('sapling'), blockIdOf('farmland'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('sapling'), blockIdOf('stone'))).toBe(false)
    }),
  )

  it.effect('sugar cane stacks on itself, and so does a cactus — the two self-referencing rules', () =>
    Effect.sync(() => {
      expect(canBlockStaySupported(blockIdOf('sugar_cane'), blockIdOf('sugar_cane'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('sugar_cane'), blockIdOf('sand'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('sugar_cane'), blockIdOf('stone'))).toBe(false)
      // ...and they do not hold each other up, which is what a shared "plants
      // stack" rule would have got wrong.
      expect(canBlockStaySupported(blockIdOf('cactus'), blockIdOf('sugar_cane'))).toBe(false)
    }),
  )
})

// ---------------------------------------------------------------------------
// The column, over the whole registry
// ---------------------------------------------------------------------------

/**
 * The nineteen rows of `SUPPORT_SENSITIVE_BLOCK_TYPES` (`block-support.ts:22-32`),
 * intersected with this roster — which is all of them, since the roster is the
 * reference's full 120.
 *
 * Pinned as a LIST rather than a count. A count agrees with any nineteen blocks;
 * this is the membership, in registry order, and a row that gains or loses a
 * rule shows up here as the name it is.
 */
const SUPPORT_SENSITIVE: ReadonlyArray<BlockType> = [
  // No per-block entry at `block-support.ts:75-89` — the fallback arm.
  'torch',
  'sapling',
  'dandelion',
  'poppy',
  'brown_mushroom',
  'red_mushroom',
  'tall_grass',
  'fern',
  'sugar_cane',
  'lily_pad',
  'rail',
  'powered_rail',
  'cactus',
  'pressure_plate',
  'wheat_crop',
  'potato_crop',
  'nether_wart_crop',
  'redstone_wire',
  'redstone_torch',
]

/** The six with no per-block rule, named — the ones that FALL THROUGH. */
const FALLS_THROUGH_TO_THE_NEGATIVE_LIST: ReadonlyArray<BlockType> = [
  'torch',
  'rail',
  'powered_rail',
  'pressure_plate',
  'redstone_wire',
  'redstone_torch',
]

describe('the supportRule column across the whole registry', () => {
  it.effect('exactly nineteen blocks are support-sensitive, and these are they', () =>
    Effect.sync(() => {
      const sensitive = BLOCK_REGISTRY.filter((entry) => isSupportSensitiveBlockId(entry.id)).map(
        (entry) => entry.definition.type,
      )
      expect(sensitive).toStrictEqual(SUPPORT_SENSITIVE)
    }),
  )

  it.effect('the other 101 require nothing below, so an ordinary cube is unaffected', () =>
    Effect.sync(() => {
      const indifferent = BLOCK_TYPES.filter((type) => !isSupportSensitiveBlockId(blockIdOf(type)))
      expect(indifferent.length).toBe(BLOCK_TYPES.length - SUPPORT_SENSITIVE.length)
      expect(indifferent.length).toBe(101)
      for (const type of indifferent) {
        expect(supportRuleOfBlockId(blockIdOf(type))).toStrictEqual(NEEDS_NO_SUPPORT)
        // ...and "requires nothing" means it stays up over ANY support,
        // including air, which is what keeps a floating stone floating.
        expect(canBlockStaySupported(blockIdOf(type), blockIdOf('air'))).toBe(true)
      }
    }),
  )

  /*
   * THE SIX THE REFERENCE HAS NO RULE FOR. Their arm is an ABSENCE in the
   * source — no entry between `block-support.ts:75` and :89 — so this is the
   * test that kernel did not invent a list for them. Inventing one would have
   * been the easy mistake: five of the six are things that plausibly want
   * "dirt or stone", and the reference says only "anything that supports".
   */
  it.effect('the six with no reference rule take the fallback arm and nothing more', () =>
    Effect.sync(() => {
      const fallback = SUPPORT_SENSITIVE.filter(
        (type) => supportRuleOfBlockId(blockIdOf(type)).kind === 'anySupporting',
      )
      expect(fallback).toStrictEqual(FALLS_THROUGH_TO_THE_NEGATIVE_LIST)

      for (const type of FALLS_THROUGH_TO_THE_NEGATIVE_LIST) {
        expect(supportRuleOfBlockId(blockIdOf(type))).toStrictEqual(NEEDS_ANY_SUPPORT)
        // The defining property of the arm: it tracks `canSupportAttachments`
        // exactly. `stone` supports, `snow` does not (audit §4.9's own example).
        expect(canBlockStaySupported(blockIdOf(type), blockIdOf('stone'))).toBe(true)
        expect(canBlockStaySupported(blockIdOf(type), blockIdOf('snow'))).toBe(false)
      }
    }),
  )

  it.effect('the explicit support rules name only blocks that exist', () =>
    Effect.sync(() => {
      const named = BLOCK_TYPES.flatMap((type) => {
        const rule = supportRuleOfBlockId(blockIdOf(type))
        return rule.kind === 'oneOf' ? [...rule.blocks] : []
      })

      expect(named.length).toBeGreaterThan(0)
      for (const block of named) {
        // A rule naming a block with no registry row would be a rule that can
        // never be satisfied, and `blockIdOf` would silently answer AIR.
        expect(BLOCK_TYPES).toContain(block)
      }
      // Every named support must be part of the public block vocabulary.
      expect([...new Set(named)].sort()).toStrictEqual([
        'cactus',
        'dirt',
        'farmland',
        'grass_block',
        'sand',
        'soul_sand',
        'sugar_cane',
        'water',
      ])
    }),
  )

  it.effect('the seven surface plants share ONE rule, as the reference shares one set', () =>
    Effect.sync(() => {
      const plants: ReadonlyArray<BlockType> = [
        'sapling',
        'dandelion',
        'poppy',
        'brown_mushroom',
        'red_mushroom',
        'tall_grass',
        'fern',
      ]
      for (const plant of plants) {
        expect(supportRuleOfBlockId(blockIdOf(plant))).toStrictEqual(
          needsOneOf('dirt', 'grass_block', 'farmland'),
        )
      }
    }),
  )

  it.effect('keeps crop support aligned with vanilla farmland and soul sand rules', () =>
    Effect.sync(() => {
      for (const crop of ['wheat_crop', 'potato_crop'] as const) {
        expect(supportRuleOfBlockId(blockIdOf(crop))).toStrictEqual(needsOneOf('farmland'))
      }
      expect(supportRuleOfBlockId(blockIdOf('nether_wart_crop'))).toStrictEqual(needsOneOf('soul_sand'))
      expect(canBlockStaySupported(blockIdOf('nether_wart_crop'), blockIdOf('soul_sand'))).toBe(true)
      expect(canBlockStaySupported(blockIdOf('nether_wart_crop'), blockIdOf('farmland'))).toBe(false)
    }),
  )
})

// ---------------------------------------------------------------------------
// Totality
// ---------------------------------------------------------------------------

describe('the id-keyed readings are total', () => {
  it.effect('an unknown byte requires nothing, is not sensitive, and stays where it is put', () =>
    Effect.sync(() => {
      for (const id of [200, 255, -1, 1.5, Number.NaN]) {
        expect(supportRuleOfBlockId(id)).toStrictEqual(NEEDS_NO_SUPPORT)
        expect(isSupportSensitiveBlockId(id)).toBe(false)
        expect(canBlockStaySupported(id, blockIdOf('air'))).toBe(true)
      }
    }),
  )

  it.effect('an unknown byte BELOW reads as ordinary ground, matching capabilityOfBlockId', () =>
    Effect.sync(() => {
      // The fallback arm: an unknown byte resolves to an opaque cube, which
      // supports attachments, so a torch stands on it.
      expect(canBlockStaySupported(blockIdOf('torch'), 200)).toBe(true)
      // The list arm: no unnameable block is a member of a list of names.
      expect(canBlockStaySupported(blockIdOf('lily_pad'), 200)).toBe(false)
      expect(canBlockStaySupported(blockIdOf('wheat_crop'), 200)).toBe(false)
    }),
  )
})

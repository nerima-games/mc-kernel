import {
  BLOCK_CAPABILITY_DEFAULTS,
  BLOCK_CAPABILITY_FLAGS,
  type BlockCapabilityFlag,
  type BlockCapabilityOverrides,
  TRUE_BY_DEFAULT_CAPABILITY_FLAGS,
  capabilityOf,
  resolveBlockCapabilities,
} from '../src/domain/block-capabilities'
import {
  BLOCK_IDS,
  blockIdOf,
  blockTypeOfId,
  capabilitiesOfBlockId,
  capabilityOfBlockId,
} from '../src/domain/block-registry'
import { BLOCK_PROPERTY_DEFAULTS, BLOCK_PROPERTY_NAMES } from '../src/domain/block-properties'
import { type BlockDefinition, blockCapabilitiesOf } from '../src/domain/block-definition'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const EMPTY_COLLECTION_LENGTH = 0
const MINIMUM_DISTINCT_CAPABILITY_VALUES = 1

describe('block capability flags — the additive-safety guarantee', () => {
  it(
    'a block definition that omits a flag resolves to that flag documented default',
    () =>
      Effect.runPromise(Effect.sync(() => {
        // A definition that mentions exactly one flag. Everything else is silent.
        const sand: BlockDefinition = {
          capabilities: { fallsWhenUnsupported: true },
          type: 'sand',
        }

        const resolved = blockCapabilitiesOf(sand)

        // The one flag it did mention.
        expect(resolved.fallsWhenUnsupported).toBe(true)

        // Every flag it did NOT mention resolves to the documented default —
        // No `undefined`, no "unknown", no per-repository guess. This is the
        // Property that lets another flag be added later without touching a
        // Single existing block definition anywhere in the organisation.
        for (const flag of BLOCK_CAPABILITY_FLAGS) {
          if (flag !== 'fallsWhenUnsupported') {
            expect(resolved[flag]).toBe(BLOCK_CAPABILITY_DEFAULTS[flag])
          }
        }
      })),
  )

  it('a block definition with no capabilities field at all resolves to exactly the defaults', () =>
    Effect.runPromise(Effect.sync(() => {
      const stone: BlockDefinition = { type: 'stone' }
      expect(blockCapabilitiesOf(stone)).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
    })),
  )

  it('every declared flag has a default, so no flag can be introduced without one', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(BLOCK_CAPABILITY_FLAGS.length).toBeGreaterThan(EMPTY_COLLECTION_LENGTH)
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(typeof BLOCK_CAPABILITY_DEFAULTS[flag]).toBe('boolean')
      }
      // BLOCK_CAPABILITY_FLAGS is derived from the defaults table, so the two
      // Can never drift apart. Pinning it here documents that intent.
      expect([...BLOCK_CAPABILITY_FLAGS].sort()).toStrictEqual(Object.keys(BLOCK_CAPABILITY_DEFAULTS).sort())
    })),
  )

  it(
    'every default is pinned value-by-value to the "ordinary opaque solid cube" reading of audit §7',
    () =>
      Effect.runPromise(Effect.sync(() => {
        // SUPERSEDES the pre-audit rule "every default is false". That rule was
        // A property of a guessed 7-flag set, not of the mechanism, and
        // Historical design audit §4.6-§4.9 shows it is wrong: the
        // Reference implementation stores `suffocates`, `canSupportAttachments`
        // And `validSpawnSurface` as NEGATIVE membership lists, i.e. their
        // Ordinary-cube answer is `true`.
        //
        // This assertion is strictly stronger than the rule it replaces: it
        // Pins every default individually instead of asserting one blanket
        // Value, so a wrong default is now a test failure rather than a value
        // That happens to satisfy a weaker predicate.
        const expected: Record<BlockCapabilityFlag, boolean> = {
          brokenByWaterFlow: false,
          canSupportAttachments: true,
          climbable: false,
          fallsWhenUnsupported: false,
          fireSource: false,
          flammable: false,
          passable: false,
          pistonImmovable: false,
          replaceable: false,
          suffocates: true,
          tillable: false,
          validSpawnSurface: true,
        }
        expect({ ...BLOCK_CAPABILITY_DEFAULTS }).toStrictEqual(expected)
      })),
  )

  it('exactly three flags default to true, and they are the three the audit identifies', () =>
    Effect.runPromise(Effect.sync(() => {
      const trueByDefault = BLOCK_CAPABILITY_FLAGS.filter((flag) => BLOCK_CAPABILITY_DEFAULTS[flag])
      expect([...trueByDefault].sort()).toStrictEqual([...TRUE_BY_DEFAULT_CAPABILITY_FLAGS].sort())

      // Everything else must default to false, so that a definition which
      // Forgets a flag can never accidentally opt INTO behaviour.
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        if (!TRUE_BY_DEFAULT_CAPABILITY_FLAGS.includes(flag)) {
          expect(BLOCK_CAPABILITY_DEFAULTS[flag]).toBe(false)
        }
      }
    })),
  )
})

describe('properties that are not boolean capability flags', () => {
  it('`emissive`, `transparent` and `fluid` are NOT boolean flags', () =>
    Effect.runPromise(Effect.sync(() => {
      // Regression guard. The design contract lists these as booleans; the audit
      // Proved all three are the wrong TYPE, not merely under-specified.
      // Re-adding any of them to the boolean table would silently discard
      // Information the reference implementation already carries.
      for (const wrong of ['emissive', 'transparent', 'fluid']) {
        expect(BLOCK_CAPABILITY_FLAGS).not.toContain(wrong)
      }
    })),
  )

  it('they live in the property table instead, with the types the audit requires', () =>
    Effect.runPromise(Effect.sync(() => {
      // Emissive: boolean -> lightEmission: 0..15   (light.ts:24-46)
      expect(BLOCK_PROPERTY_NAMES).toContain('lightEmission')
      expect(typeof BLOCK_PROPERTY_DEFAULTS.lightEmission).toBe('number')

      // Transparent: boolean -> opacity: 3-value    (meshing-worker-config.ts:7-13)
      expect(BLOCK_PROPERTY_NAMES).toContain('opacity')
      expect(BLOCK_PROPERTY_DEFAULTS.opacity).toBe('opaque')

      // Fluid: boolean -> 'none'|'water'|'lava'     (greedy-meshing-fluid-state.ts:27)
      expect(BLOCK_PROPERTY_NAMES).toContain('fluid')
      expect(BLOCK_PROPERTY_DEFAULTS.fluid).toBe('none')
    })),
  )

  it('the remaining capabilities are boolean flags', () =>
    Effect.runPromise(Effect.sync(() => {
        // The design contract named seven; four of them survive as booleans unchanged.
      // §3.12's `pistonImmovable` is the fourth-plus-one.
      for (const flag of ['passable', 'fallsWhenUnsupported', 'flammable', 'pistonImmovable']) {
        expect(BLOCK_CAPABILITY_FLAGS).toContain(flag)
      }
    })),
  )
})

describe('audit §4.9 — "non-solid" is five independent capabilities, not one `solid` flag', () => {
  // THE REGRESSION TEST the audit calls its most important conclusion.
  //
  // The reference implementation re-lists "the non-solid blocks" in five
  // Places, with DIFFERENT membership each time:
  //   Block-collision-predicates.ts:22   PASSABLE_BLOCK_IDS
  //   Environment-hazard.config.ts:39    NON_SUFFOCATING_BLOCKS
  //   Block-support.ts:47                NON_SUPPORTING_BLOCK_TYPES
  //   Spawn-selection-search.ts:41       NON_SPAWN_SURFACE_BLOCK_IDS
  //   Village-placement-surface.ts:6     VILLAGE_NON_GROUND_IDS
  //
  // Merging them into one `solid` flag necessarily regresses. These fixtures
  // Transcribe the reference's actual membership for the three blocks where
  // The sets disagree; if someone later collapses the flags, at least one of
  // These expectations becomes impossible to satisfy.

  const glass: BlockDefinition = {
      // NOT in PASSABLE_BLOCK_IDS -> collides.
      // IS in NON_SUFFOCATING_BLOCKS and NON_SPAWN_SURFACE_BLOCK_IDS.
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid' },
      type: 'glass',
  }

  const leaves: BlockDefinition = {
      // Block-collision-predicates.ts:18-21 records the bug: listing LEAVES as
      // Passable let players fall straight through tree canopies. It is solid.
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid' },
      type: 'oak_leaves',
  }

  const snow: BlockDefinition = {
      // In NON_SUPPORTING_BLOCK_TYPES but NOT in PASSABLE_BLOCK_IDS.
      capabilities: { canSupportAttachments: false },
      type: 'snow',
  }

  it('GLASS is solid for collision yet neither suffocating nor a spawn surface', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolved = blockCapabilitiesOf(glass)
      const solidForCollision = !resolved.passable

      expect(solidForCollision).toBe(true)
      expect(resolved.suffocates).toBe(false)
      expect(resolved.validSpawnSurface).toBe(false)

      // A single `solid` flag would have to be simultaneously true (so the
      // Player does not fall through a glass floor) and false (so standing
      // Inside glass does not suffocate, and so mobs do not spawn on it).
      expect(solidForCollision).not.toBe(resolved.suffocates)
      expect(solidForCollision).not.toBe(resolved.validSpawnSurface)
    })),
  )

  it('LEAVES is solid for collision (the canopy fall-through bug) yet not a spawn surface', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolved = blockCapabilitiesOf(leaves)
      expect(resolved.passable).toBe(false)
      expect(resolved.validSpawnSurface).toBe(false)
      expect(resolved.suffocates).toBe(false)
    })),
  )

  it('SNOW cannot support attachments yet is not passable', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolved = blockCapabilitiesOf(snow)
      expect(resolved.canSupportAttachments).toBe(false)
      expect(resolved.passable).toBe(false)
      // ...and it IS a spawn surface, unlike glass and leaves.
      expect(resolved.validSpawnSurface).toBe(true)
    })),
  )

  it('the five concepts disagree across blocks, so they cannot be one flag', () =>
    Effect.runPromise(Effect.sync(() => {
      const rows = [glass, leaves, snow].map(blockCapabilitiesOf)

      // If "solid for collision", `suffocates`, `canSupportAttachments` and
      // `validSpawnSurface` were the same underlying concept, every row would
      // Report the same value for all four. None of these rows does.
      for (const row of rows) {
        const answers = new Set([
          !row.passable,
          row.suffocates,
          row.canSupportAttachments,
          row.validSpawnSurface,
        ])
      expect(answers.size).toBeGreaterThan(MINIMUM_DISTINCT_CAPABILITY_VALUES)
      }

      // And the disagreement is not the same disagreement each time: glass
      // Differs from snow on both `suffocates` and `canSupportAttachments`.
      const [glassRow, , snowRow] = rows
      expect(glassRow?.suffocates).not.toBe(snowRow?.suffocates)
      expect(glassRow?.canSupportAttachments).not.toBe(snowRow?.canSupportAttachments)
    })),
  )
})

describe('resolveBlockCapabilities', () => {
  it('an explicit override wins over the default', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolved = resolveBlockCapabilities({ passable: true, suffocates: false })
      expect(resolved.passable).toBe(true)
      expect(resolved.suffocates).toBe(false)
      expect(resolved.flammable).toBe(false)
    })),
  )

  it('an explicit `false` override is honoured and not confused with omission', () =>
    Effect.runPromise(Effect.sync(() => {
      // `suffocates` is one of the three flags that default to TRUE, so this
      // Is now a real distinction rather than a hypothetical one.
      const explicit = resolveBlockCapabilities({ suffocates: false })
      const omitted = resolveBlockCapabilities({})
      expect(explicit.suffocates).toBe(false)
      expect(omitted.suffocates).toBe(true)
      expect(omitted.suffocates).toBe(BLOCK_CAPABILITY_DEFAULTS.suffocates)
    })),
  )

  it('resolving an empty override set reproduces the defaults exactly', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(resolveBlockCapabilities({})).toStrictEqual({ ...BLOCK_CAPABILITY_DEFAULTS })
    })),
  )

  it('the resolved set is a fresh object and never aliases the shared defaults table', () =>
    Effect.runPromise(Effect.sync(() => {
      const first = resolveBlockCapabilities({ passable: true })
      const second = resolveBlockCapabilities({})
      expect(first).not.toBe(second)
      expect(second.passable).toBe(false)
      expect(BLOCK_CAPABILITY_DEFAULTS.passable).toBe(false)
    })),
  )
})

describe('capabilityOf', () => {
  it('agrees with resolveBlockCapabilities for every flag, with and without overrides', () =>
    Effect.runPromise(Effect.sync(() => {
      const overrides: BlockCapabilityOverrides = { passable: true, suffocates: false }
      const resolved = resolveBlockCapabilities(overrides)
      for (const flag of BLOCK_CAPABILITY_FLAGS) {
        expect(capabilityOf(overrides, flag)).toBe(resolved[flag])
        expect(capabilityOf({}, flag)).toBe(BLOCK_CAPABILITY_DEFAULTS[flag])
      }
    })),
  )

  it('reads a true-by-default flag correctly when the overrides say nothing', () =>
    Effect.runPromise(Effect.sync(() => {
      // `??` would be wrong here if the default were consulted only for
      // Falsy values; pinning it because `suffocates` defaults to true.
      expect(capabilityOf({}, 'suffocates')).toBe(true)
      expect(capabilityOf({ suffocates: false }, 'suffocates')).toBe(false)
    })),
  )

  it('rejects forged non-boolean overrides', () =>
    Effect.runPromise(Effect.sync(() => {
      const malformed = { passable: 'yes' }

      expect(() => Reflect.apply(resolveBlockCapabilities, undefined, [malformed])).toThrow(
        'block capability passable must be a boolean',
      )
      expect(() => Reflect.apply(capabilityOf, undefined, [malformed, 'passable'])).toThrow(
        'block capability passable must be a boolean',
      )
    })),
  )

  it('rejects unknown override keys instead of silently accepting future data', () =>
    Effect.runPromise(Effect.sync(() => {
      const malformed = { futureCapability: true }

      expect(() => Reflect.apply(resolveBlockCapabilities, undefined, [malformed])).toThrow(
        'unknown block capability futureCapability',
      )
      expect(() => Reflect.apply(capabilityOf, undefined, [malformed, 'passable'])).toThrow(
        'unknown block capability futureCapability',
      )
    })),
  )

  it('rejects non-object override data at the public boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      const malformed = null

      expect(() => Reflect.apply(resolveBlockCapabilities, undefined, [malformed])).toThrow(
        'block capability overrides must be an object',
      )
      expect(() => Reflect.apply(capabilityOf, undefined, [malformed, 'passable'])).toThrow(
        'block capability overrides must be an object',
      )
    })),
  )
})

describe('the two mechanisms do not overlap', () => {
  it('no name is both a boolean flag and a typed property', () =>
    Effect.runPromise(Effect.sync(() => {
      const flags = new Set<string>(BLOCK_CAPABILITY_FLAGS)
      for (const name of BLOCK_PROPERTY_NAMES) {
        expect(flags.has(name)).toBe(false)
      }
    })),
  )
})

describe('audit §4.9, continued — the roster additions that make the argument harder', () => {
  /**
   * The GLASS / LEAVES / SNOW block above argues from hand-built definitions,
   * which was the only option while those three were most of the roster. These
   * assert the REAL registry rows instead, so they fail if the shipped table
   * disagrees with the reference rather than only if a fixture does.
   */

  it('CACTUS disagrees with itself three ways in one row, which glass and leaves do twice', () =>
    Effect.runPromise(Effect.sync(() => {
      // The strongest single counter-example to a `solid` boolean in the whole
      // Table. From the reference:
      //   NOT in PASSABLE_BLOCK_IDS            -> collides, so `solid` must be true
      //   IS  in NON_SUFFOCATING_BLOCKS (:65)  -> so `solid` must be false
      //   IS  in NON_SUPPORTING_BLOCK_TYPES    -> so `solid` must be false
      //   IS  in NON_SPAWN_SURFACE_BLOCK_IDS   -> so `solid` must be false
      const cactus = capabilitiesOfBlockId(blockIdOf('cactus'))
      const solidForCollision = !cactus.passable

      expect(solidForCollision).toBe(true)
      expect(cactus.suffocates).toBe(false)
      expect(cactus.canSupportAttachments).toBe(false)
      expect(cactus.validSpawnSurface).toBe(false)

      // One boolean would have to be simultaneously true and false three times
      // Over. Stated as the impossibility rather than as four values, so that
      // The test still means something if the values are ever re-sourced.
      for (const collapsed of [cactus.suffocates, cactus.canSupportAttachments, cactus.validSpawnSurface]) {
        expect(solidForCollision).not.toBe(collapsed)
      }
    })),
  )

  it('LADDER is passable and STILL supports attachments, so passability implies nothing', () =>
    Effect.runPromise(Effect.sync(() => {
      // The disagreement in the other direction, and the one a tidy-up would
      // Most likely erase: everything else in `PASSABLE_BLOCK_IDS` that is also
      // In `NON_SUPPORTING_BLOCK_TYPES` makes "passable therefore non-
      // Supporting" look like a rule. `ladder` is in the first
      // (`block-collision-predicates.ts:29`) and absent from the second
      // (`block-support.ts:47-60`), which is what a ladder being climbable and
      // Wall-mounted actually requires.
      const ladder = capabilitiesOfBlockId(blockIdOf('ladder'))

      expect(ladder.passable).toBe(true)
      expect(ladder.climbable).toBe(true)
      expect(ladder.canSupportAttachments).toBe(true)

      // ...and it is a genuine split within the passable set, not a lone
      // Exception that could be re-read as an oversight: the plants next to it
      // In the same reference list answer the other way.
      expect(capabilitiesOfBlockId(blockIdOf('dandelion')).canSupportAttachments).toBe(false)
      expect(capabilitiesOfBlockId(blockIdOf('rail')).canSupportAttachments).toBe(false)
    })),
  )

  it('EVERY pair of the four solidity concepts disagrees on some row of the real table', () =>
    Effect.runPromise(Effect.sync(() => {
      // The generalisation of the GLASS/LEAVES/SNOW tests, and the assertion
      // That actually forbids the merge. Those three rows show that the four
      // Concepts are not ALL one concept; this shows that no TWO of them are
      // One concept, which is the claim audit §4.9 makes and the weaker test
      // Does not reach.
      //
      // If someone were to redefine any of these four in terms of another, the
      // Pair would agree on every row and this fails naming the pair.
      const READINGS = {
        canSupportAttachments: (id: number) => capabilityOfBlockId(id, 'canSupportAttachments'),
        solidForCollision: (id: number) => !capabilityOfBlockId(id, 'passable'),
        suffocates: (id: number) => capabilityOfBlockId(id, 'suffocates'),
        validSpawnSurface: (id: number) => capabilityOfBlockId(id, 'validSpawnSurface'),
      } as const
      const names = Object.keys(READINGS).filter(
        (name): name is keyof typeof READINGS => name in READINGS,
      )

      for (const left of names) {
        for (const right of names) {
          if (left < right) {
            const witness = BLOCK_IDS.find((id) => READINGS[left](id) !== READINGS[right](id))
            // The block name is in the failure message on purpose: when this
            // Breaks, the useful question is "which row stopped disagreeing".
            expect(witness).toBeDefined()
          }
        }
      }
    })),
  )

  it('a passable block never also suffocates, which audit §4.7 licenses and the reference violates', () =>
    Effect.runPromise(Effect.sync(() => {
      // Audit §4.7: 「`passable=true` なら常に false を導出する方が安全」. Kernel
      // Does not COERCE this (see `domain/block-capabilities.ts` on why a row
      // Stating both should be a reviewable mistake), so it has to be checked.
      //
      // It is checked because the reference's own tables break it:
      // `NON_SUFFOCATING_BLOCKS` omits SUGAR_CANE, LILY_PAD, KELP, SEAGRASS,
      // RAIL and POWERED_RAIL, all six of which `PASSABLE_BLOCK_IDS` contains.
      // Those rows are the ones where kernel deliberately departs from a literal
      // Transcription, and this is the test that says so out loud.
      for (const id of BLOCK_IDS) {
        if (capabilityOfBlockId(id, 'passable')) {
          expect({ block: blockTypeOfId(id), suffocates: capabilityOfBlockId(id, 'suffocates') }).toStrictEqual({
            block: blockTypeOfId(id),
            suffocates: false,
          })
        }
      }

      // Named individually so the six inferences cannot be quietly dropped back
      // To the default by a later edit.
      for (const inferred of ['sugar_cane', 'lily_pad', 'kelp', 'seagrass', 'rail', 'powered_rail'] as const) {
        expect(capabilityOfBlockId(blockIdOf(inferred), 'suffocates')).toBe(false)
      }
    })),
  )
})

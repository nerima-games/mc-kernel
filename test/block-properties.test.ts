import {
  BLOCK_OPACITIES,
  BLOCK_PROPERTY_DEFAULTS,
  BLOCK_PROPERTY_NAMES,
  LightLevel,
  type BlockProperties,
  type BlockPropertyOverrides,
  type LightLevel as LightLevelType,
  COLLISION_SHAPES,
  FLUID_KINDS,
  LIGHT_LEVEL_MAX,
  LIGHT_LEVEL_MIN,
  RAIL_KINDS,
  RENDER_KINDS,
  clampLightLevel,
  isLightLevel,
  propertyOf,
  resolveBlockProperties,
} from '../src/domain/block-properties'
import { type BlockDefinition, blockPropertiesOf, resolveBlock } from '../src/domain/block-definition'
import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { expectTypeOf } from 'vitest'
import {
  DEFAULT_BLOCK_DROP,
  DEFAULT_HARVEST_TOOL,
  HARVEST_TIERS,
  resolveDropItem,
  satisfiesHarvestTier,
} from '../src/domain/block-harvest'
import { StackCount } from '../src/domain/quantities'

const TORCH_LIGHT_LEVEL = 14
const DEFAULT_HARDNESS = 8
const NO_PROPERTIES = 0
const EXPECTED_LIGHT_LEVEL_MINIMUM = 0
const EXPECTED_LIGHT_LEVEL_MAXIMUM = 15
const LIGHT_LEVEL_INCREMENT = 1
const NETHER_PORTAL_LIGHT_LEVEL = 11
const REDSTONE_TORCH_LIGHT_LEVEL = 7
const END_PORTAL_FRAME_LIGHT_LEVEL = 1
const BELOW_MINIMUM_LIGHT_LEVEL = -1
const ABOVE_MAXIMUM_LIGHT_LEVEL = 16
const FRACTIONAL_LIGHT_LEVEL = 7.5
const FAR_BELOW_MINIMUM_LIGHT_LEVEL = -5
const FAR_ABOVE_MAXIMUM_LIGHT_LEVEL = 99
const FRACTIONAL_LIGHT_LEVEL_TO_TRUNCATE = 7.9
const TRUNCATED_LIGHT_LEVEL = 7

describe('block properties — the additive-safety guarantee, extended to non-booleans', () => {
  it(
    'a definition that omits a property resolves to that property documented default, so adding a property stays semver-MINOR for 14 pinned consumers',
    () =>
      Effect.runPromise(Effect.sync(() => {
        // The same guarantee the boolean flag table gives, now for typed
        // Values. This is the reason `lightEmission` is a number from day one:
        // Widening `emissive: boolean` to a number LATER would not be additive,
        // It would be a five-deep republish cascade.
        const torch: BlockDefinition = {
          properties: { lightEmission: TORCH_LIGHT_LEVEL },
          type: 'torch',
        }

        const resolved = blockPropertiesOf(torch)
        expect(resolved.lightEmission).toBe(TORCH_LIGHT_LEVEL)

        for (const name of BLOCK_PROPERTY_NAMES) {
          if (name !== 'lightEmission') {
            expect(resolved[name]).toStrictEqual(BLOCK_PROPERTY_DEFAULTS[name])
          }
        }
      })),
  )

  it('a definition with no properties field at all resolves to exactly the defaults', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(blockPropertiesOf({ type: 'stone' })).toStrictEqual({ ...BLOCK_PROPERTY_DEFAULTS })
    })),
  )

  it('every declared property has a default, so no property can be introduced without one', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(BLOCK_PROPERTY_NAMES.length).toBeGreaterThan(NO_PROPERTIES)
      for (const name of BLOCK_PROPERTY_NAMES) {
        expect(BLOCK_PROPERTY_DEFAULTS[name]).toBeDefined()
      }
      expect([...BLOCK_PROPERTY_NAMES].sort()).toStrictEqual(Object.keys(BLOCK_PROPERTY_DEFAULTS).sort())
    })),
  )

  it('every default is pinned to the "ordinary opaque solid cube" reading of audit §7', () =>
    Effect.runPromise(Effect.sync(() => {
      const expected: BlockProperties = {
        opacity: 'opaque',
        lightEmission: LightLevel(0),
        fluid: 'none',
        collisionShape: 'full',
        blastResistance: NO_PROPERTIES,
        contactDamage: NO_PROPERTIES,
        drops: { affectedByFortune: false, count: StackCount(1), item: 'self', requiresSilkTouch: false },
        footstepMaterial: 'default',
        friction: 0.6,
        hardness: DEFAULT_HARDNESS,
        harvestTool: { category: 'none', minTier: 'none' },
        movementDrag: NO_PROPERTIES,
        railKind: 'none',
        renderKind: 'cube',
        // Audit §4.6 states this default in as many words: `supportRule='none'`.
        // An ordinary cube requires nothing beneath it, so a block that says
        // Nothing about support is not "unsupported" — it is uninterested.
        supportRule: { kind: 'none' },
        xpOnBreak: NO_PROPERTIES,
      }
      expect({ ...BLOCK_PROPERTY_DEFAULTS }).toStrictEqual(expected)
    })),
  )

  it('the resolved set is a fresh object and never aliases the shared defaults table', () =>
    Effect.runPromise(Effect.sync(() => {
      const first = resolveBlockProperties({ hardness: 50 })
      const second = resolveBlockProperties({})
      expect(first).not.toBe(second)
      expect(second.hardness).toBe(BLOCK_PROPERTY_DEFAULTS.hardness)
      expect(BLOCK_PROPERTY_DEFAULTS.hardness).toBe(DEFAULT_HARDNESS)
    })),
  )
})

describe('the three corrected types (audit §5)', () => {
  it('lightEmission is a 0..15 level, not a boolean — light.ts:24-46 already had the numbers', () =>
    Effect.runPromise(Effect.sync(() => {
      // The reference's EMISSIVE_LEVEL_OVERRIDES, transcribed. A boolean
      // `emissive` cannot tell a torch from lava, and the reference had
      // Already given up on it.
      const cases: ReadonlyArray<readonly [string, number]> = [
        ['lava', EXPECTED_LIGHT_LEVEL_MAXIMUM],
        ['torch', TORCH_LIGHT_LEVEL],
        ['nether_portal', NETHER_PORTAL_LIGHT_LEVEL],
        ['redstone_torch', REDSTONE_TORCH_LIGHT_LEVEL],
        ['end_portal_frame', END_PORTAL_FRAME_LIGHT_LEVEL],
      ]
      for (const [, level] of cases) {
        expect(isLightLevel(level)).toBe(true)
        expect(resolveBlockProperties({ lightEmission: level }).lightEmission).toBe(level)
      }
      // ...and they are genuinely distinct, which is what a boolean destroys.
      expect(new Set(cases.map(([, level]) => level)).size).toBe(cases.length)
    })),
  )

  it('opacity has three values in the render priority order the design contract requires', () =>
    Effect.runPromise(Effect.sync(() => {
      // TransparentSolid (GLASS/LEAVES, atlas + alpha)
      //   > fluid (WATER, water shader)
      //   > opaque
      expect([...BLOCK_OPACITIES]).toStrictEqual(['transparentSolid', 'fluid', 'opaque'])
      expect(BLOCK_OPACITIES.indexOf('transparentSolid')).toBeLessThan(BLOCK_OPACITIES.indexOf('fluid'))
      expect(BLOCK_OPACITIES.indexOf('fluid')).toBeLessThan(BLOCK_OPACITIES.indexOf('opaque'))
    })),
  )

  it('fluid says WHICH fluid, because bucket / damage / material all branch on the kind', () =>
    Effect.runPromise(Effect.sync(() => {
      expect([...FLUID_KINDS]).toStrictEqual(['none', 'water', 'lava'])
      expect(resolveBlockProperties({ fluid: 'water' }).fluid).toBe('water')
      expect(resolveBlockProperties({ fluid: 'lava' }).fluid).toBe('lava')
      // A boolean could not distinguish these two rows at all.
      expect(resolveBlockProperties({ fluid: 'water' })).not.toStrictEqual(
        resolveBlockProperties({ fluid: 'lava' }),
      )
    })),
  )
})

describe('light level helpers', () => {
  it('accepts the whole 4-bit range and rejects everything outside it', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(LIGHT_LEVEL_MIN).toBe(EXPECTED_LIGHT_LEVEL_MINIMUM)
      expect(LIGHT_LEVEL_MAX).toBe(EXPECTED_LIGHT_LEVEL_MAXIMUM)
      for (let level = LIGHT_LEVEL_MIN; level <= LIGHT_LEVEL_MAX; level += LIGHT_LEVEL_INCREMENT) {
        expect(isLightLevel(level)).toBe(true)
      }
      expect(isLightLevel(BELOW_MINIMUM_LIGHT_LEVEL)).toBe(false)
      expect(isLightLevel(ABOVE_MAXIMUM_LIGHT_LEVEL)).toBe(false)
      expect(isLightLevel(FRACTIONAL_LIGHT_LEVEL)).toBe(false)
      expect(isLightLevel(Number.NaN)).toBe(false)
    })),
  )

  it('clamps into range and truncates toward zero', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(clampLightLevel(FAR_BELOW_MINIMUM_LIGHT_LEVEL)).toBe(EXPECTED_LIGHT_LEVEL_MINIMUM)
      expect(clampLightLevel(FAR_ABOVE_MAXIMUM_LIGHT_LEVEL)).toBe(EXPECTED_LIGHT_LEVEL_MAXIMUM)
      expect(clampLightLevel(FRACTIONAL_LIGHT_LEVEL_TO_TRUNCATE)).toBe(TRUNCATED_LIGHT_LEVEL)
      expect(clampLightLevel(EXPECTED_LIGHT_LEVEL_MAXIMUM)).toBe(EXPECTED_LIGHT_LEVEL_MAXIMUM)
      expectTypeOf(clampLightLevel(7.9)).toEqualTypeOf<LightLevelType>()
    })),
  )
})

describe('light level branding', () => {
  it('brands resolved light emission values while preserving numeric override ergonomics', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolved = resolveBlockProperties({ lightEmission: 14 })

      expect(resolved.lightEmission).toBe(14)
      expectTypeOf(resolved.lightEmission).toEqualTypeOf<LightLevelType>()
    })),
  )

  it('rejects invalid light emission overrides', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => resolveBlockProperties({ lightEmission: 16 })).toThrow(/LightLevel must be an integer/)
    })),
  )

  it('rejects unknown and malformed property data at the public boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolve = resolveBlockProperties

      expect(() => Reflect.apply(resolve, undefined, [{ futureProperty: true }])).toThrow(
        'unknown block property futureProperty',
      )
      expect(resolve({ hardness: -1 }).hardness).toBe(-1)
      expect(() => resolve({ hardness: -2 })).toThrow(
        'block property hardness must be a finite number greater than or equal to zero or -1',
      )
      expect(() => resolve({ friction: 2 })).toThrow('block property friction must be a finite number in [0, 1]')
      expect(() => resolve({ friction: -1 })).toThrow(
        'block property friction must be a finite number greater than or equal to zero',
      )
      expect(resolve({ blastResistance: Number.POSITIVE_INFINITY }).blastResistance).toBe(
        Number.POSITIVE_INFINITY,
      )
      expect(resolve({ blastResistance: NO_PROPERTIES }).blastResistance).toBe(NO_PROPERTIES)
      expect(() => resolve({ blastResistance: -1 })).toThrow(
        'block property blastResistance must be a non-negative number or Infinity',
      )
      expect(() => resolve({ blastResistance: Number.NaN })).toThrow(
        'block property blastResistance must be a non-negative number or Infinity',
      )
      expect(() =>
        Reflect.apply(resolve, undefined, [{ harvestTool: { category: 'pickaxe', minTier: 'diamond', futureField: true } }]),
      ).toThrow('unknown block property harvestTool field futureField')
      expect(() => Reflect.apply(resolve, undefined, [{ drops: { ...DEFAULT_BLOCK_DROP, item: 'not-an-item' } }])).toThrow(
        'block property drops item must be a registered ItemType or self',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ supportRule: { blocks: ['stone'] } }])).toThrow(
        'unknown block property supportRule kind undefined',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ supportRule: { kind: 'oneOf', blocks: ['not-a-block'] } }])).toThrow(
        'block property supportRule contains an unknown block type',
      )
      expect(() => Reflect.apply(propertyOf, undefined, [{ futureProperty: true }, 'hardness'])).toThrow(
        'unknown block property futureProperty',
      )
    })),
  )

  it('rejects malformed values for every public property vocabulary', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolve = resolveBlockProperties

      expect(() => Reflect.apply(resolve, undefined, [null])).toThrow('block property overrides must be an object')
      expect(() => Reflect.apply(resolve, undefined, [{ opacity: 'future' }])).toThrow('unknown block property opacity future')
      expect(() => Reflect.apply(resolve, undefined, [{ fluid: 'future' }])).toThrow('unknown block property fluid future')
      expect(() => Reflect.apply(resolve, undefined, [{ collisionShape: 'future' }])).toThrow(
        'unknown block property collisionShape future',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ renderKind: 'future' }])).toThrow('unknown block property renderKind future')
      expect(() => Reflect.apply(resolve, undefined, [{ footstepMaterial: 'future' }])).toThrow(
        'unknown block property footstepMaterial future',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ railKind: 'future' }])).toThrow('unknown block property railKind future')

      expect(() => Reflect.apply(resolve, undefined, [{ harvestTool: null }])).toThrow('block property harvestTool must be an object')
      expect(() => Reflect.apply(resolve, undefined, [{ harvestTool: { category: 'future', minTier: 'none' } }])).toThrow(
        'unknown block property harvestTool category future',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ harvestTool: { category: 'none', minTier: 'future' } }])).toThrow(
        'unknown block property harvestTool tier future',
      )

      expect(() => Reflect.apply(resolve, undefined, [{ drops: null }])).toThrow('block property drops must be an object')
      expect(() => Reflect.apply(resolve, undefined, [{ drops: { ...DEFAULT_BLOCK_DROP, silkTouchItem: 'future' } }])).toThrow(
        'block property drops silkTouchItem must be a registered ItemType',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ drops: { ...DEFAULT_BLOCK_DROP, count: 'many' } }])).toThrow(
        'block property drops count must be an integer',
      )
      expect(() => Reflect.apply(resolve, undefined, [{ drops: { ...DEFAULT_BLOCK_DROP, requiresSilkTouch: 'yes' } }])).toThrow(
        'block property drops requiresSilkTouch must be a boolean',
      )

      expect(() => Reflect.apply(resolve, undefined, [{ supportRule: null }])).toThrow('block property supportRule must be an object')
      expect(() => resolve({ supportRule: { kind: 'oneOf', blocks: [] } })).toThrow(
        'block property supportRule blocks must contain at least one block',
      )

      expect(() => Reflect.apply(propertyOf, undefined, [{}, 'future'])).toThrow('unknown block property future')
    })),
  )

  it('exposes the public light-level constructor', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(LightLevel(3)).toBe(3)
    })),
  )

  it('the public constructor throws its own branded error, distinct from resolveBlockProperties guard', () =>
    Effect.runPromise(Effect.sync(() => {
      // `resolveBlockProperties` never calls `LightLevel` with an out-of-range
      // value — it throws its own TypeError before the brand constructor is
      // reached (see `resolveLightEmission`). The brand's own refinement error
      // is only reachable by calling the exported constructor directly.
      expect(() => LightLevel(ABOVE_MAXIMUM_LIGHT_LEVEL)).toThrow()

      const result = LightLevel.either(ABOVE_MAXIMUM_LIGHT_LEVEL)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left[0]?.message).toBe(
          `LightLevel must be an integer in [${LIGHT_LEVEL_MIN}, ${LIGHT_LEVEL_MAX}], received ${ABOVE_MAXIMUM_LIGHT_LEVEL}`,
        )
      }
    })),
  )
})

describe('enum vocabularies match the audit', () => {
  it('collisionShape, renderKind and railKind carry the values the audit lists', () =>
    Effect.runPromise(Effect.sync(() => {
      // Audit §4.1 (block-collision-predicates.ts:136-139)
      expect([...COLLISION_SHAPES]).toStrictEqual(['full', 'slab', 'cactus', 'pressurePlate', 'none'])
      // Audit §4.8 (plant-mesh.ts:18-49)
      expect([...RENDER_KINDS]).toStrictEqual(['cube', 'cross', 'cactus', 'rail', 'lilyPad', 'fluid'])
      // Audit §4.1 (block-collision-predicates.ts:184-201)
      expect([...RAIL_KINDS]).toStrictEqual(['none', 'normal', 'powered'])
    })),
  )

  it('collisionShape is independent of passable — audit §4.9 needs both', () =>
    Effect.runPromise(Effect.sync(() => {
      // A cactus collides (not passable) but with a shrunken hull.
      const cactus: BlockDefinition = { properties: { collisionShape: 'cactus' }, type: 'stone' }
      const resolved = resolveBlock(cactus)
      expect(resolved.capabilities.passable).toBe(false)
      expect(resolved.properties.collisionShape).toBe('cactus')
    })),
  )
})

describe('harvestTool and drops (the two struct fields, audit §7)', () => {
  it('bare hands are the default, matching audit §4.5 harvestTool=undefined', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(DEFAULT_HARVEST_TOOL).toStrictEqual({ category: 'none', minTier: 'none' })
      // Every tier, including "no tool at all", satisfies a "none" requirement.
      for (const tier of HARVEST_TIERS) {
        expect(satisfiesHarvestTier(DEFAULT_HARVEST_TOOL, tier)).toBe(true)
      }
    })),
  )

  it('the tier gate is ordered wooden < stone < iron < diamond < netherite', () =>
    Effect.runPromise(Effect.sync(() => {
      const needsIron = { category: 'pickaxe', minTier: 'iron' } as const
      expect(satisfiesHarvestTier(needsIron, 'none')).toBe(false)
      expect(satisfiesHarvestTier(needsIron, 'wooden')).toBe(false)
      expect(satisfiesHarvestTier(needsIron, 'stone')).toBe(false)
      expect(satisfiesHarvestTier(needsIron, 'iron')).toBe(true)
      expect(satisfiesHarvestTier(needsIron, 'diamond')).toBe(true)
      expect(satisfiesHarvestTier(needsIron, 'netherite')).toBe(true)
    })),
  )

  it('the gate is exactly the material ladder, pinned literally, over every pair', () =>
    Effect.runPromise(Effect.sync(() => {
      // The ladder is written out rather than read from `HARVEST_TIERS`, and
      // That is the whole point of this test. Deriving the expectation from the
      // Array under test makes the assertion tautological: swapping `wooden`
      // And `stone` in the declaration moves the expectation with it and every
      // Sampled case above still passes, because those samples only ever ask
      // About `iron`. The order IS the contract — it comes from the five-stage
      // Ladder at `harvestable-blocks.ts:14-67` — so it is pinned as data here,
      // Exactly as `test/block-registry.test.ts` pins the block ids.
      const LADDER = ['none', 'wooden', 'stone', 'iron', 'diamond', 'netherite'] as const
      expect(HARVEST_TIERS).toStrictEqual(LADDER)

      // With the ladder pinned, the sweep closes the gate over all 6x6 pairs:
      // A tool satisfies a requirement precisely when it sits no lower on it.
      // This also covers what the `Record` cast in `./block-harvest` asserts
      // And the type system cannot — that every tier has an entry at all.
      LADDER.forEach((minTier, required) => {
        LADDER.forEach((heldTier, held) => {
          expect(satisfiesHarvestTier({ category: 'pickaxe', minTier }, heldTier)).toBe(held >= required)
        })
      })
    })),
  )

  it('the tier gate ignores the category, because the reference gates on tier alone', () =>
    Effect.runPromise(Effect.sync(() => {
      // Wrong category = slower, still drops. Conflating the two axes is the
      // Exact bug this struct is shaped to prevent.
      const needsStonePickaxe = { category: 'pickaxe', minTier: 'stone' } as const
      const needsStoneShovel = { category: 'shovel', minTier: 'stone' } as const
      expect(satisfiesHarvestTier(needsStonePickaxe, 'stone')).toBe(
        satisfiesHarvestTier(needsStoneShovel, 'stone'),
      )
    })),
  )

  it('the default drop is one of itself, resolved against the block actually broken', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(DEFAULT_BLOCK_DROP).toStrictEqual({
        affectedByFortune: false,
        count: END_PORTAL_FRAME_LIGHT_LEVEL,
        item: 'self',
        requiresSilkTouch: false,
      })
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'stone')).toBe('stone')
      expect(resolveDropItem(DEFAULT_BLOCK_DROP, 'sand')).toBe('sand')
      // An override names a different block (the grass_block -> dirt case).
      expect(resolveDropItem({ ...DEFAULT_BLOCK_DROP, item: 'dirt' }, 'grass_block')).toBe('dirt')
    })),
  )

  it('a silk-touch-only drop is expressible without any new mechanism', () =>
    Effect.runPromise(Effect.sync(() => {
      const glass: BlockDefinition = {
        properties: { drops: { ...DEFAULT_BLOCK_DROP, requiresSilkTouch: true } },
        type: 'glass',
      }
      expect(blockPropertiesOf(glass).drops.requiresSilkTouch).toBe(true)
      // ...and it did not disturb anything else.
      expect(blockPropertiesOf(glass).hardness).toBe(BLOCK_PROPERTY_DEFAULTS.hardness)
    })),
  )
})

describe('propertyOf', () => {
  it('agrees with resolveBlockProperties for every property, with and without overrides', () =>
    Effect.runPromise(Effect.sync(() => {
      const overrides: BlockPropertyOverrides = { fluid: 'water', lightEmission: NO_PROPERTIES, opacity: 'fluid' }
      const resolved = resolveBlockProperties(overrides)
      for (const name of BLOCK_PROPERTY_NAMES) {
        expect(propertyOf(overrides, name)).toStrictEqual(resolved[name])
        expect(propertyOf({}, name)).toStrictEqual(BLOCK_PROPERTY_DEFAULTS[name])
      }
    })),
  )

  it('an explicit 0 is honoured rather than falling back to the default', () =>
    Effect.runPromise(Effect.sync(() => {
      // `??` not `||`. lightEmission defaults to 0 so this looks like a
      // No-op; hardness does not, so it is the one that actually proves it.
      expect(propertyOf({ hardness: NO_PROPERTIES }, 'hardness')).toBe(NO_PROPERTIES)
      expect(propertyOf({}, 'hardness')).toBe(DEFAULT_HARDNESS)
    })),
  )
})

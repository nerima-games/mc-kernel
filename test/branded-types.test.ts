import { BlockAxis, CHUNK_SIZE_XZ, ChunkAxis, LocalAxis } from '../src/domain/coordinates/coordinates'
import {
  ConsumeSeconds,
  DeltaTimeSecs,
  EpochMillis,
  FixedDurationSecs,
  InterpolationFraction,
  MAX_STACK_COUNT,
  MonotonicTimeSecs,
  NonNegativeTickCount,
  PositiveTickCount,
  SessionEpoch,
  SimulationTick,
  StackCount,
  TransferQuantity,
  WeaponDisableBlockingSeconds,
} from '../src/domain/time/quantities'
import { Effect, Result } from 'effect'
import {
  ResourceLocation,
  StageId,
  TagLocation,
  UUID,
  VanillaResourcePath,
  WorldId,
  vanillaId,
} from '../src/domain/text/identifiers'
import { describe, expect, it } from 'vitest'

const SINGLE_ITEM_STACK_COUNT = 1
const FRACTIONAL_STACK_COUNT = 1.5
const NEGATIVE_STACK_COUNT = -1
const STACK_COUNT_OVER_MAXIMUM = 1
const INVALID_STACK_COUNT = 999
const ZERO_DELTA_SECONDS = 0
const NEGATIVE_DELTA_SECONDS = -0.001
const NEGATIVE_MONOTONIC_TIME_SECONDS = -1
const INITIAL_MONOTONIC_TIME_SECONDS = 0
const VALID_CONSUME_SECONDS = 1.6
const ZERO_CONSUME_SECONDS = 0
const NEGATIVE_CONSUME_SECONDS = -0.001
const VALID_WEAPON_DISABLE_BLOCKING_SECONDS = 0.25
const NEGATIVE_WEAPON_DISABLE_BLOCKING_SECONDS = -0.001
const FRACTIONAL_EPOCH_MILLIS = 1.5
const SAFE_INTEGER_OVERFLOW = 2
const EXPECTED_EPOCH_MILLIS = 1_700_000_000_000
const VALID_FIXED_DURATION_SECONDS = 0.025
const VALID_SIMULATION_TICK = 1
const VALID_INTERPOLATION_FRACTION = 0.5
const VALID_SESSION_EPOCH = 'session-a'
const CHUNK_ORIGIN = 0
const LAST_LOCAL_COORDINATE_OFFSET = 1
const NEGATIVE_LOCAL_COORDINATE = -1
const FRACTIONAL_BLOCK_COORDINATE = 0.5
const FRACTIONAL_CHUNK_COORDINATE = -0.5
const VALID_NEGATIVE_BLOCK_COORDINATE = -64
const VALID_NEGATIVE_CHUNK_COORDINATE = -4

describe('StackCount', () => {
  it('accepts the boundaries of its documented range', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(StackCount.result(SINGLE_ITEM_STACK_COUNT))).toBe(true)
      expect(Result.isSuccess(StackCount.result(MAX_STACK_COUNT))).toBe(true)
    })),
  )

  it('rejects a fractional count, because half an item does not exist', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(StackCount.result(FRACTIONAL_STACK_COUNT))).toBe(true)
      const makeStackCount = StackCount
      expect(() => makeStackCount(FRACTIONAL_STACK_COUNT)).toThrow()
    })),
  )

  it('rejects a negative count', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(StackCount.result(NEGATIVE_STACK_COUNT))).toBe(true)
    })),
  )

  it('rejects a count above the maximum stack size', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(StackCount.result(MAX_STACK_COUNT + STACK_COUNT_OVER_MAXIMUM))).toBe(true)
    })),
  )

  it('rejects NaN', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(StackCount.result(Number.NaN))).toBe(true)
    })),
  )

  it('reports what was wrong rather than failing silently', () =>
    Effect.runPromise(Effect.sync(() => {
      const result = StackCount.result(INVALID_STACK_COUNT)
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure.message).toContain(`${INVALID_STACK_COUNT}`)
      }
    })),
  )
})

describe('TransferQuantity', () => {
  it('accepts positive integer transfer quantities and rejects invalid values', () => {
    expect(Result.isSuccess(TransferQuantity.result(1))).toBe(true)
    expect(Result.isSuccess(TransferQuantity.result(99))).toBe(true)
    expect(Result.isFailure(TransferQuantity.result(0))).toBe(true)
    expect(Result.isFailure(TransferQuantity.result(100))).toBe(true)
    expect(Result.isFailure(TransferQuantity.result(1.5))).toBe(true)
  })
})

describe('DeltaTimeSecs', () => {
  it('accepts zero, because a frame may be scheduled twice within one clock tick', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(DeltaTimeSecs.result(ZERO_DELTA_SECONDS))).toBe(true)
    })),
  )

  it('rejects a negative delta, because time does not run backwards within a frame', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(DeltaTimeSecs.result(NEGATIVE_DELTA_SECONDS))).toBe(true)
    })),
  )

  it('rejects Infinity and NaN, which would silently poison every integrator downstream', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(DeltaTimeSecs.result(Number.POSITIVE_INFINITY))).toBe(true)
      expect(Result.isFailure(DeltaTimeSecs.result(Number.NaN))).toBe(true)
    })),
  )
})

describe('MonotonicTimeSecs and EpochMillis', () => {
  it('MonotonicTimeSecs rejects a negative reading', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(MonotonicTimeSecs.result(NEGATIVE_MONOTONIC_TIME_SECONDS))).toBe(true)
      expect(Result.isSuccess(MonotonicTimeSecs.result(INITIAL_MONOTONIC_TIME_SECONDS))).toBe(true)
    })),
  )

  it('EpochMillis rejects a fractional millisecond and values beyond safe-integer precision', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(EpochMillis.result(FRACTIONAL_EPOCH_MILLIS))).toBe(true)
      expect(Result.isFailure(EpochMillis.result(Number.MAX_SAFE_INTEGER + SAFE_INTEGER_OVERFLOW))).toBe(true)
      expect(Result.isSuccess(EpochMillis.result(EXPECTED_EPOCH_MILLIS))).toBe(true)
    })),
  )
})

describe('fixed simulation time brands', () => {
  it('accepts the K05 literal values', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(FixedDurationSecs.result(VALID_FIXED_DURATION_SECONDS))).toBe(true)
      expect(Result.isSuccess(SimulationTick.result(VALID_SIMULATION_TICK))).toBe(true)
      expect(Result.isSuccess(InterpolationFraction.result(VALID_INTERPOLATION_FRACTION))).toBe(true)
      expect(Result.isSuccess(NonNegativeTickCount.result(VALID_SIMULATION_TICK))).toBe(true)
      expect(Result.isSuccess(PositiveTickCount.result(VALID_SIMULATION_TICK))).toBe(true)
      expect(Result.isSuccess(SessionEpoch.result(VALID_SESSION_EPOCH))).toBe(true)
    })),
  )

  it('rejects invalid numeric values and empty session epochs', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const invalidValue of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(Result.isFailure(FixedDurationSecs.result(invalidValue))).toBe(true)
        expect(Result.isFailure(SimulationTick.result(invalidValue))).toBe(true)
        expect(Result.isFailure(NonNegativeTickCount.result(invalidValue))).toBe(true)
        expect(Result.isFailure(PositiveTickCount.result(invalidValue))).toBe(true)
      }
      expect(Result.isFailure(SimulationTick.result(1.5))).toBe(true)
      expect(Result.isFailure(NonNegativeTickCount.result(1.5))).toBe(true)
      expect(Result.isFailure(PositiveTickCount.result(1.5))).toBe(true)
      expect(Result.isFailure(SimulationTick.result(Number.MAX_SAFE_INTEGER + 1))).toBe(true)
      expect(Result.isFailure(NonNegativeTickCount.result(Number.MAX_SAFE_INTEGER + 1))).toBe(true)
      expect(Result.isFailure(PositiveTickCount.result(Number.MAX_SAFE_INTEGER + 1))).toBe(true)
      expect(Result.isFailure(InterpolationFraction.result(-1))).toBe(true)
      expect(Result.isFailure(InterpolationFraction.result(1))).toBe(true)
      expect(Result.isFailure(InterpolationFraction.result(Number.NaN))).toBe(true)
      expect(Result.isFailure(SessionEpoch.result(''))).toBe(true)
      expect(Result.isFailure(SessionEpoch.result('   '))).toBe(true)
    })),
  )

  it('returns Failure with a fixed message for hostile unknown values', () =>
    Effect.runPromise(Effect.sync(() => {
      const circular: { self?: unknown } = {}
      circular.self = circular
      const invalidValues: ReadonlyArray<readonly [unknown, string]> = [
        ['', 'SessionEpoch must be a non-empty string, received invalid value'],
        [1n, 'SessionEpoch must be a non-empty string, received invalid value'],
        [circular, 'SessionEpoch must be a non-empty string, received invalid value'],
        [Symbol('session'), 'SessionEpoch must be a non-empty string, received invalid value'],
      ]

      for (const [value, expectedMessage] of invalidValues) {
        const result = Reflect.apply(SessionEpoch.result, SessionEpoch, [value])
        expect(Result.isFailure(result)).toBe(true)
        expect(result).toMatchObject({ failure: { message: expectedMessage } })
      }
    })),
  )
})

describe('ConsumeSeconds', () => {
  it('accepts finite non-negative durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(ConsumeSeconds.result(ZERO_CONSUME_SECONDS))).toBe(true)
      expect(Result.isSuccess(ConsumeSeconds.result(VALID_CONSUME_SECONDS))).toBe(true)
    })),
  )

  it('rejects negative and non-finite durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(ConsumeSeconds.result(NEGATIVE_CONSUME_SECONDS))).toBe(true)
      expect(Result.isFailure(ConsumeSeconds.result(Number.NaN))).toBe(true)
      expect(Result.isFailure(ConsumeSeconds.result(Number.POSITIVE_INFINITY))).toBe(true)
    })),
  )
})

describe('WeaponDisableBlockingSeconds', () => {
  it('accepts zero and finite positive durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(WeaponDisableBlockingSeconds.result(0))).toBe(true)
      expect(
        Result.isSuccess(
          WeaponDisableBlockingSeconds.result(VALID_WEAPON_DISABLE_BLOCKING_SECONDS),
        ),
      ).toBe(true)
    })),
  )

  it('rejects negative and non-finite durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(
        Result.isFailure(
          WeaponDisableBlockingSeconds.result(NEGATIVE_WEAPON_DISABLE_BLOCKING_SECONDS),
        ),
      ).toBe(true)
      expect(Result.isFailure(WeaponDisableBlockingSeconds.result(Number.NaN))).toBe(true)
      expect(Result.isFailure(WeaponDisableBlockingSeconds.result(Number.POSITIVE_INFINITY))).toBe(true)
    })),
  )
})

describe('coordinate axes', () => {
  it('LocalAxis rejects a coordinate that has left its chunk', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(LocalAxis.result(CHUNK_ORIGIN))).toBe(true)
      expect(Result.isSuccess(LocalAxis.result(CHUNK_SIZE_XZ - LAST_LOCAL_COORDINATE_OFFSET))).toBe(true)
      expect(Result.isFailure(LocalAxis.result(CHUNK_SIZE_XZ))).toBe(true)
      expect(Result.isFailure(LocalAxis.result(NEGATIVE_LOCAL_COORDINATE))).toBe(true)
    })),
  )

  it('BlockAxis and ChunkAxis reject non-integers', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(BlockAxis.result(FRACTIONAL_BLOCK_COORDINATE))).toBe(true)
      expect(Result.isFailure(ChunkAxis.result(FRACTIONAL_CHUNK_COORDINATE))).toBe(true)
      expect(Result.isSuccess(BlockAxis.result(VALID_NEGATIVE_BLOCK_COORDINATE))).toBe(true)
      expect(Result.isSuccess(ChunkAxis.result(VALID_NEGATIVE_CHUNK_COORDINATE))).toBe(true)
    })),
  )
})

describe('identifiers', () => {
  it('WorldId rejects an empty or blank identifier', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(WorldId.result(''))).toBe(true)
      expect(Result.isFailure(WorldId.result('   '))).toBe(true)
      expect(Result.isSuccess(WorldId.result('overworld'))).toBe(true)
    })),
  )

  it('StageId rejects an empty or blank identifier', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isFailure(StageId.result(''))).toBe(true)
      expect(Result.isFailure(StageId.result('\t\n'))).toBe(true)
      expect(Result.isSuccess(StageId.result('sim:tick'))).toBe(true)
    })),
  )

  it('ResourceLocation accepts vanilla identifiers and rejects invalid syntax', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(ResourceLocation.result('minecraft:entity.generic.eat'))).toBe(true)
      expect(Result.isSuccess(ResourceLocation.result('entity.generic.eat'))).toBe(true)
      expect(Result.isSuccess(ResourceLocation.result('minecraft:block/water'))).toBe(true)
      expect(Result.isSuccess(ResourceLocation.result('sulfur_cube_archetype/regular'))).toBe(true)
      expect(Result.isFailure(ResourceLocation.result('Minecraft:entity.generic.eat'))).toBe(true)
      expect(Result.isFailure(ResourceLocation.result('minecraft:'))).toBe(true)
      expect(() => ResourceLocation('minecraft:')).toThrow()
    })),
  )

  it('TagLocation accepts short hierarchical tags and namespaced tags', () => {
    expect(Result.isSuccess(TagLocation.result('#sulfur_cube_archetype/regular'))).toBe(true)
    expect(Result.isSuccess(TagLocation.result('#minecraft:mineable/pickaxe'))).toBe(true)
    expect(Result.isFailure(TagLocation.result('sulfur_cube_archetype/regular'))).toBe(true)
  })

  it('VanillaResourcePath accepts unqualified resource paths only', () => {
    expect(Result.isSuccess(VanillaResourcePath.result('arrow'))).toBe(true)
    expect(Result.isSuccess(VanillaResourcePath.result('blocks/water'))).toBe(true)
    expect(Result.isFailure(VanillaResourcePath.result(''))).toBe(true)
    expect(Result.isFailure(VanillaResourcePath.result('minecraft:arrow'))).toBe(true)
    expect(Result.isFailure(VanillaResourcePath.result('Minecraft:arrow'))).toBe(true)
    expect(Result.isFailure(VanillaResourcePath.result('stone block'))).toBe(true)
  })

  it('UUID accepts canonical syntax and rejects malformed values', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Result.isSuccess(UUID.result('123e4567-e89b-12d3-a456-426614174000'))).toBe(true)
      expect(Result.isFailure(UUID.result('123e4567-e89b-12d3-a456-42661417400'))).toBe(true)
      expect(Result.isFailure(UUID.result('not-a-uuid'))).toBe(true)
      expect(() => UUID('not-a-uuid')).toThrow()
    })),
  )

  it('vanillaId namespaces a bare name under minecraft:, the one spelling damageTypeId, statusEffectId, and crafting-special share', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(vanillaId(VanillaResourcePath('arrow'))).toBe('minecraft:arrow')
      expect(vanillaId(VanillaResourcePath('speed'))).toBe('minecraft:speed')
      expect(Result.isSuccess(ResourceLocation.result(vanillaId(VanillaResourcePath('brick'))))).toBe(true)
    })),
  )
})

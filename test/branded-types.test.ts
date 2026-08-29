import { BlockAxis, CHUNK_SIZE_XZ, ChunkAxis, LocalAxis } from '../src/domain/coordinates'
import {
  ConsumeSeconds,
  DeltaTimeSecs,
  EpochMillis,
  MAX_STACK_COUNT,
  MonotonicTimeSecs,
  StackCount,
  WeaponDisableBlockingSeconds,
} from '../src/domain/quantities'
import { Effect, Either } from 'effect'
import { ResourceLocation, StageId, TagLocation, UUID, WorldId, vanillaId } from '../src/domain/identifiers'
import { describe, expect, it } from 'vitest'

const EMPTY_STACK_COUNT = 0
const SINGLE_ITEM_STACK_COUNT = 1
const FRACTIONAL_STACK_COUNT = 1.5
const NEGATIVE_STACK_COUNT = -1
const STACK_COUNT_OVER_MAXIMUM = 1
const INVALID_STACK_COUNT = 999
const FIRST_VALIDATION_ISSUE = 0
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
      expect(Either.isRight(StackCount.either(EMPTY_STACK_COUNT))).toBe(true)
      expect(Either.isRight(StackCount.either(SINGLE_ITEM_STACK_COUNT))).toBe(true)
      expect(Either.isRight(StackCount.either(MAX_STACK_COUNT))).toBe(true)
    })),
  )

  it('rejects a fractional count, because half an item does not exist', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(FRACTIONAL_STACK_COUNT))).toBe(true)
      const makeStackCount = StackCount
      expect(() => makeStackCount(FRACTIONAL_STACK_COUNT)).toThrow()
    })),
  )

  it('rejects a negative count', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(NEGATIVE_STACK_COUNT))).toBe(true)
    })),
  )

  it('rejects a count above the maximum stack size', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(MAX_STACK_COUNT + STACK_COUNT_OVER_MAXIMUM))).toBe(true)
    })),
  )

  it('rejects NaN', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(Number.NaN))).toBe(true)
    })),
  )

  it('reports what was wrong rather than failing silently', () =>
    Effect.runPromise(Effect.sync(() => {
      const result = StackCount.either(INVALID_STACK_COUNT)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left[FIRST_VALIDATION_ISSUE]?.message).toContain(`${INVALID_STACK_COUNT}`)
      }
    })),
  )
})

describe('DeltaTimeSecs', () => {
  it('accepts zero, because a frame may be scheduled twice within one clock tick', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isRight(DeltaTimeSecs.either(ZERO_DELTA_SECONDS))).toBe(true)
    })),
  )

  it('rejects a negative delta, because time does not run backwards within a frame', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(DeltaTimeSecs.either(NEGATIVE_DELTA_SECONDS))).toBe(true)
    })),
  )

  it('rejects Infinity and NaN, which would silently poison every integrator downstream', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(DeltaTimeSecs.either(Number.POSITIVE_INFINITY))).toBe(true)
      expect(Either.isLeft(DeltaTimeSecs.either(Number.NaN))).toBe(true)
    })),
  )
})

describe('MonotonicTimeSecs and EpochMillis', () => {
  it('MonotonicTimeSecs rejects a negative reading', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(MonotonicTimeSecs.either(NEGATIVE_MONOTONIC_TIME_SECONDS))).toBe(true)
      expect(Either.isRight(MonotonicTimeSecs.either(INITIAL_MONOTONIC_TIME_SECONDS))).toBe(true)
    })),
  )

  it('EpochMillis rejects a fractional millisecond and values beyond safe-integer precision', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(EpochMillis.either(FRACTIONAL_EPOCH_MILLIS))).toBe(true)
      expect(Either.isLeft(EpochMillis.either(Number.MAX_SAFE_INTEGER + SAFE_INTEGER_OVERFLOW))).toBe(true)
      expect(Either.isRight(EpochMillis.either(EXPECTED_EPOCH_MILLIS))).toBe(true)
    })),
  )
})

describe('ConsumeSeconds', () => {
  it('accepts finite non-negative durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isRight(ConsumeSeconds.either(ZERO_CONSUME_SECONDS))).toBe(true)
      expect(Either.isRight(ConsumeSeconds.either(VALID_CONSUME_SECONDS))).toBe(true)
    })),
  )

  it('rejects negative and non-finite durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(ConsumeSeconds.either(NEGATIVE_CONSUME_SECONDS))).toBe(true)
      expect(Either.isLeft(ConsumeSeconds.either(Number.NaN))).toBe(true)
      expect(Either.isLeft(ConsumeSeconds.either(Number.POSITIVE_INFINITY))).toBe(true)
    })),
  )
})

describe('WeaponDisableBlockingSeconds', () => {
  it('accepts zero and finite positive durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isRight(WeaponDisableBlockingSeconds.either(0))).toBe(true)
      expect(
        Either.isRight(
          WeaponDisableBlockingSeconds.either(VALID_WEAPON_DISABLE_BLOCKING_SECONDS),
        ),
      ).toBe(true)
    })),
  )

  it('rejects negative and non-finite durations', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(
        Either.isLeft(
          WeaponDisableBlockingSeconds.either(NEGATIVE_WEAPON_DISABLE_BLOCKING_SECONDS),
        ),
      ).toBe(true)
      expect(Either.isLeft(WeaponDisableBlockingSeconds.either(Number.NaN))).toBe(true)
      expect(Either.isLeft(WeaponDisableBlockingSeconds.either(Number.POSITIVE_INFINITY))).toBe(true)
    })),
  )
})

describe('coordinate axes', () => {
  it('LocalAxis rejects a coordinate that has left its chunk', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isRight(LocalAxis.either(CHUNK_ORIGIN))).toBe(true)
      expect(Either.isRight(LocalAxis.either(CHUNK_SIZE_XZ - LAST_LOCAL_COORDINATE_OFFSET))).toBe(true)
      expect(Either.isLeft(LocalAxis.either(CHUNK_SIZE_XZ))).toBe(true)
      expect(Either.isLeft(LocalAxis.either(NEGATIVE_LOCAL_COORDINATE))).toBe(true)
    })),
  )

  it('BlockAxis and ChunkAxis reject non-integers', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(BlockAxis.either(FRACTIONAL_BLOCK_COORDINATE))).toBe(true)
      expect(Either.isLeft(ChunkAxis.either(FRACTIONAL_CHUNK_COORDINATE))).toBe(true)
      expect(Either.isRight(BlockAxis.either(VALID_NEGATIVE_BLOCK_COORDINATE))).toBe(true)
      expect(Either.isRight(ChunkAxis.either(VALID_NEGATIVE_CHUNK_COORDINATE))).toBe(true)
    })),
  )
})

describe('identifiers', () => {
  it('WorldId rejects an empty or blank identifier', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(WorldId.either(''))).toBe(true)
      expect(Either.isLeft(WorldId.either('   '))).toBe(true)
      expect(Either.isRight(WorldId.either('overworld'))).toBe(true)
    })),
  )

  it('StageId rejects an empty or blank identifier', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isLeft(StageId.either(''))).toBe(true)
      expect(Either.isLeft(StageId.either('\t\n'))).toBe(true)
      expect(Either.isRight(StageId.either('sim:tick'))).toBe(true)
    })),
  )

  it('ResourceLocation accepts vanilla identifiers and rejects invalid syntax', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isRight(ResourceLocation.either('minecraft:entity.generic.eat'))).toBe(true)
      expect(Either.isRight(ResourceLocation.either('entity.generic.eat'))).toBe(true)
      expect(Either.isRight(ResourceLocation.either('minecraft:block/water'))).toBe(true)
      expect(Either.isRight(ResourceLocation.either('sulfur_cube_archetype/regular'))).toBe(true)
      expect(Either.isLeft(ResourceLocation.either('Minecraft:entity.generic.eat'))).toBe(true)
      expect(Either.isLeft(ResourceLocation.either('minecraft:'))).toBe(true)
      expect(() => ResourceLocation('minecraft:')).toThrow()
    })),
  )

  it('TagLocation accepts short hierarchical tags and namespaced tags', () => {
    expect(Either.isRight(TagLocation.either('#sulfur_cube_archetype/regular'))).toBe(true)
    expect(Either.isRight(TagLocation.either('#minecraft:mineable/pickaxe'))).toBe(true)
    expect(Either.isLeft(TagLocation.either('sulfur_cube_archetype/regular'))).toBe(true)
  })

  it('UUID accepts canonical syntax and rejects malformed values', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(Either.isRight(UUID.either('123e4567-e89b-12d3-a456-426614174000'))).toBe(true)
      expect(Either.isLeft(UUID.either('123e4567-e89b-12d3-a456-42661417400'))).toBe(true)
      expect(Either.isLeft(UUID.either('not-a-uuid'))).toBe(true)
      expect(() => UUID('not-a-uuid')).toThrow()
    })),
  )

  it('vanillaId namespaces a bare name under minecraft:, the one spelling damageTypeId, statusEffectId, and crafting-special share', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(vanillaId('arrow')).toBe('minecraft:arrow')
      expect(vanillaId('speed')).toBe('minecraft:speed')
      expect(Either.isRight(ResourceLocation.either(vanillaId('brick')))).toBe(true)
    })),
  )
})

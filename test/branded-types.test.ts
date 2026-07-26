import { describe, expect, it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import { BlockAxis, CHUNK_SIZE_XZ, ChunkAxis, LocalAxis } from '../domain/coordinates'
import { StageId, WorldId } from '../domain/identifiers'
import { DeltaTimeSecs, EpochMillis, MAX_STACK_COUNT, MonotonicTimeSecs, StackCount } from '../domain/quantities'

describe('StackCount', () => {
  it.effect('accepts the boundaries of its documented range', () =>
    Effect.sync(() => {
      expect(Either.isRight(StackCount.either(0))).toBe(true)
      expect(Either.isRight(StackCount.either(1))).toBe(true)
      expect(Either.isRight(StackCount.either(MAX_STACK_COUNT))).toBe(true)
    }),
  )

  it.effect('rejects a fractional count, because half an item does not exist', () =>
    Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(1.5))).toBe(true)
      expect(() => StackCount(1.5)).toThrow()
    }),
  )

  it.effect('rejects a negative count', () =>
    Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(-1))).toBe(true)
    }),
  )

  it.effect('rejects a count above the maximum stack size', () =>
    Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(MAX_STACK_COUNT + 1))).toBe(true)
    }),
  )

  it.effect('rejects NaN', () =>
    Effect.sync(() => {
      expect(Either.isLeft(StackCount.either(Number.NaN))).toBe(true)
    }),
  )

  it.effect('reports what was wrong rather than failing silently', () =>
    Effect.sync(() => {
      const result = StackCount.either(999)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left[0]?.message).toContain('999')
      }
    }),
  )
})

describe('DeltaTimeSecs', () => {
  it.effect('accepts zero, because a frame may be scheduled twice within one clock tick', () =>
    Effect.sync(() => {
      expect(Either.isRight(DeltaTimeSecs.either(0))).toBe(true)
    }),
  )

  it.effect('rejects a negative delta, because time does not run backwards within a frame', () =>
    Effect.sync(() => {
      expect(Either.isLeft(DeltaTimeSecs.either(-0.001))).toBe(true)
    }),
  )

  it.effect('rejects Infinity and NaN, which would silently poison every integrator downstream', () =>
    Effect.sync(() => {
      expect(Either.isLeft(DeltaTimeSecs.either(Number.POSITIVE_INFINITY))).toBe(true)
      expect(Either.isLeft(DeltaTimeSecs.either(Number.NaN))).toBe(true)
    }),
  )
})

describe('MonotonicTimeSecs and EpochMillis', () => {
  it.effect('MonotonicTimeSecs rejects a negative reading', () =>
    Effect.sync(() => {
      expect(Either.isLeft(MonotonicTimeSecs.either(-1))).toBe(true)
      expect(Either.isRight(MonotonicTimeSecs.either(0))).toBe(true)
    }),
  )

  it.effect('EpochMillis rejects a fractional millisecond and values beyond safe-integer precision', () =>
    Effect.sync(() => {
      expect(Either.isLeft(EpochMillis.either(1.5))).toBe(true)
      expect(Either.isLeft(EpochMillis.either(Number.MAX_SAFE_INTEGER + 2))).toBe(true)
      expect(Either.isRight(EpochMillis.either(1_700_000_000_000))).toBe(true)
    }),
  )
})

describe('coordinate axes', () => {
  it.effect('LocalAxis rejects a coordinate that has left its chunk', () =>
    Effect.sync(() => {
      expect(Either.isRight(LocalAxis.either(0))).toBe(true)
      expect(Either.isRight(LocalAxis.either(CHUNK_SIZE_XZ - 1))).toBe(true)
      expect(Either.isLeft(LocalAxis.either(CHUNK_SIZE_XZ))).toBe(true)
      expect(Either.isLeft(LocalAxis.either(-1))).toBe(true)
    }),
  )

  it.effect('BlockAxis and ChunkAxis reject non-integers', () =>
    Effect.sync(() => {
      expect(Either.isLeft(BlockAxis.either(0.5))).toBe(true)
      expect(Either.isLeft(ChunkAxis.either(-0.5))).toBe(true)
      expect(Either.isRight(BlockAxis.either(-64))).toBe(true)
      expect(Either.isRight(ChunkAxis.either(-4))).toBe(true)
    }),
  )
})

describe('identifiers', () => {
  it.effect('WorldId rejects an empty or blank identifier', () =>
    Effect.sync(() => {
      expect(Either.isLeft(WorldId.either(''))).toBe(true)
      expect(Either.isLeft(WorldId.either('   '))).toBe(true)
      expect(Either.isRight(WorldId.either('overworld'))).toBe(true)
    }),
  )

  it.effect('StageId rejects an empty or blank identifier', () =>
    Effect.sync(() => {
      expect(Either.isLeft(StageId.either(''))).toBe(true)
      expect(Either.isLeft(StageId.either('\t\n'))).toBe(true)
      expect(Either.isRight(StageId.either('sim:tick'))).toBe(true)
    }),
  )
})

import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  DamageCauseSchema,
  EntityKindSchema,
  ExperienceAmountSchema,
  ExplosionSourceSchema,
  HealthAmountSchema,
  ProjectileIdSchema,
  StackCountSchema,
  VehicleIdSchema,
  Velocity3Schema,
} from '../src/domain/event/event-primitives.js'

describe('C3 event primitive schemas', () => {
  it('accepts non-empty damage causes and explosion sources', () => {
    expect(Result.isSuccess(Schema.decodeUnknownResult(DamageCauseSchema)('fire'))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(ExplosionSourceSchema)('creeper'))).toBe(true)
  })

  it('rejects empty damage causes and explosion sources', () => {
    expect(Result.isSuccess(Schema.decodeUnknownResult(DamageCauseSchema)(''))).toBe(false)
    expect(Result.isSuccess(Schema.decodeUnknownResult(ExplosionSourceSchema)(''))).toBe(false)
  })

  it('accepts positive finite health amounts', () => {
    const decode = Schema.decodeUnknownResult(HealthAmountSchema)
    expect(Result.isSuccess(decode(0.5))).toBe(true)
    expect(Result.isSuccess(decode(Number.MAX_VALUE))).toBe(true)
  })

  it('rejects non-positive and non-finite health amounts', () => {
    const decode = Schema.decodeUnknownResult(HealthAmountSchema)
    for (const amount of [0, -0.5, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]) {
      expect(Result.isSuccess(decode(amount))).toBe(false)
    }
  })

  it('accepts positive safe integer experience amounts', () => {
    const decode = Schema.decodeUnknownResult(ExperienceAmountSchema)
    expect(Result.isSuccess(decode(1))).toBe(true)
    expect(Result.isSuccess(decode(Number.MAX_SAFE_INTEGER))).toBe(true)
  })

  it('rejects invalid experience amounts', () => {
    const decode = Schema.decodeUnknownResult(ExperienceAmountSchema)
    for (const amount of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(Result.isSuccess(decode(amount))).toBe(false)
    }
  })

  it('accepts non-empty projectile IDs and rejects an empty ID', () => {
    const decode = Schema.decodeUnknownResult(ProjectileIdSchema)
    expect(Result.isSuccess(decode('arrow-1'))).toBe(true)
    expect(Result.isSuccess(decode(''))).toBe(false)
  })

  it('accepts finite velocity components and rejects missing or invalid components', () => {
    const decode = Schema.decodeUnknownResult(Velocity3Schema)
    expect(Result.isSuccess(decode({ x: 1, y: -0.5, z: 0 }))).toBe(true)
    expect(Result.isSuccess(decode({ x: 1, y: Number.POSITIVE_INFINITY, z: 0 }))).toBe(false)
    expect(Result.isSuccess(decode({ x: 1, z: 0 }))).toBe(false)
  })

  it('uses the existing entity, stack, and vehicle brand constraints', () => {
    expect(Result.isSuccess(Schema.decodeUnknownResult(EntityKindSchema)('zombie'))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(EntityKindSchema)(''))).toBe(false)
    expect(Result.isSuccess(Schema.decodeUnknownResult(StackCountSchema)(99))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(StackCountSchema)(100))).toBe(false)
    expect(Result.isSuccess(Schema.decodeUnknownResult(VehicleIdSchema)('cart-1'))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(VehicleIdSchema)('   '))).toBe(false)
  })
})

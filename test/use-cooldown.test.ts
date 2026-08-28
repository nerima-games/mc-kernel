import { describe, expect, it } from 'vitest'
import { ResourceLocation } from '../src/domain/identifiers.js'
import { MonotonicTimeSecs } from '../src/domain/quantities.js'
import {
  cooldownExpiresAt,
  isCooldownActive,
  isUseCooldownComponent,
  useCooldownComponent,
} from '../src/domain/use-cooldown.js'

describe('use_cooldown component', () => {
  it('constructs a positive duration with an optional cooldown group', () => {
    const group = ResourceLocation('minecraft:ender_pearl')
    const component = useCooldownComponent(1.5, group)

    expect(component).toEqual({ seconds: 1.5, cooldownGroup: group })
    expect(Object.isFrozen(component)).toBe(true)
    expect(useCooldownComponent(0.5)).toEqual({ seconds: 0.5, cooldownGroup: undefined })
  })

  it('rejects zero, negative, non-finite, and infinite durations', () => {
    for (const seconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => useCooldownComponent(seconds)).toThrow()
    }
  })

  it('guards the official resolved component shape at runtime', () => {
    const valid = useCooldownComponent(1, ResourceLocation('minecraft:ender_pearl'))

    expect(isUseCooldownComponent(valid)).toBe(true)
    expect(isUseCooldownComponent({ seconds: 0, cooldownGroup: undefined })).toBe(false)
    expect(isUseCooldownComponent({ seconds: Number.NaN, cooldownGroup: undefined })).toBe(false)
    expect(isUseCooldownComponent({ seconds: 1, cooldownGroup: 'Minecraft:ender_pearl' })).toBe(false)
    expect(isUseCooldownComponent({ seconds: 1, cooldownGroup: 1 })).toBe(false)
    expect(isUseCooldownComponent({ ...valid, extra: true })).toBe(false)
    expect(isUseCooldownComponent({ seconds: 1 })).toBe(false)
    expect(isUseCooldownComponent([])).toBe(false)
  })

  it('calculates an exclusive expiration boundary from monotonic time', () => {
    const component = useCooldownComponent(2)
    const startedAt = MonotonicTimeSecs(10)

    expect(cooldownExpiresAt(startedAt, component)).toBe(12)
    expect(isCooldownActive(MonotonicTimeSecs(10), startedAt, component)).toBe(true)
    expect(isCooldownActive(MonotonicTimeSecs(11.999), startedAt, component)).toBe(true)
    expect(isCooldownActive(MonotonicTimeSecs(12), startedAt, component)).toBe(false)
  })
})

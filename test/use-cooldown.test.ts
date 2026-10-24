import { describe, expect, it } from 'vitest'
import * as useCooldownResult from '../src/domain/item/use-cooldown.js'
import { ResourceLocation } from '../src/domain/text/identifiers.js'
import { CooldownSeconds, MonotonicTimeSecs } from '../src/domain/time/quantities.js'
import {
  isUseCooldownComponent,
} from '../src/domain/item/use-cooldown.js'
import { expectItemFailure, itemResultValue } from './item-result-assertions.js'

const cooldownExpiresAt = (...args: Parameters<typeof useCooldownResult.cooldownExpiresAt>) =>
  itemResultValue(useCooldownResult.cooldownExpiresAt(...args))
const isCooldownActive = (...args: Parameters<typeof useCooldownResult.isCooldownActive>) =>
  itemResultValue(useCooldownResult.isCooldownActive(...args))
const useCooldownComponent = (...args: Parameters<typeof useCooldownResult.useCooldownComponent>) =>
  itemResultValue(useCooldownResult.useCooldownComponent(...args))

describe('use_cooldown component', () => {
  it('constructs a positive duration with an optional cooldown group', () => {
    const group = ResourceLocation('minecraft:ender_pearl')
    const component = useCooldownComponent(CooldownSeconds(1.5), group)

    expect(component).toEqual({ seconds: 1.5, cooldownGroup: group })
    expect(Object.isFrozen(component)).toBe(true)
    expect(useCooldownComponent(CooldownSeconds(0.5))).toEqual({ seconds: 0.5, cooldownGroup: undefined })
  })

  it('rejects zero, negative, non-finite, and infinite durations', () => {
    for (const seconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectItemFailure(Reflect.apply(useCooldownResult.useCooldownComponent, undefined, [seconds]), {
        _tag: 'ItemValidationFailure',
        kind: 'RangeError',
        reason: 'out-of-range',
        field: 'seconds',
        message: `CooldownSeconds must be a finite, positive number of seconds, received ${seconds}`,
        value: seconds,
      })
    }
  })

  it('guards the official resolved component shape at runtime', () => {
    const valid = useCooldownComponent(CooldownSeconds(1), ResourceLocation('minecraft:ender_pearl'))

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
    const component = useCooldownComponent(CooldownSeconds(2))
    const startedAt = MonotonicTimeSecs(10)

    expect(cooldownExpiresAt(startedAt, component)).toBe(12)
    expect(isCooldownActive(MonotonicTimeSecs(10), startedAt, component)).toBe(true)
    expect(isCooldownActive(MonotonicTimeSecs(11.999), startedAt, component)).toBe(true)
    expect(isCooldownActive(MonotonicTimeSecs(12), startedAt, component)).toBe(false)

    expectItemFailure(useCooldownResult.cooldownExpiresAt(
      MonotonicTimeSecs(Number.MAX_VALUE),
      useCooldownComponent(CooldownSeconds(1e308)),
    ), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'expiresAt',
      message: 'MonotonicTimeSecs must be a finite, non-negative number of seconds, received Infinity',
      value: Infinity,
    })
  })
})

import * as itemCombatResult from '../src/domain/item/item-combat'
import {
  isAttackRangeComponent,
  isDamageTypeComponent,
  isMinimumAttackChargeComponent,
  isSwingAnimationComponent,
  isUseEffectsComponent,
  SWING_ANIMATION_TYPES,
} from '../src/domain/item/item-combat'
import { expectItemFailure, itemResultValue } from './item-result-assertions'
import { describe, expect, it } from 'vitest'
import { ResourceLocation } from '../src/domain/text/identifiers'
import {
  AttackCharge,
  AttackHitboxMargin,
  AttackRangeDistance,
  MobAttackRangeFactor,
  SwingAnimationDuration,
  UseSpeedMultiplier,
} from '../src/domain/time/quantities'

const attackRangeComponent = (...args: Parameters<typeof itemCombatResult.attackRangeComponent>) =>
  itemResultValue(itemCombatResult.attackRangeComponent(...args))
const damageTypeComponent = (...args: Parameters<typeof itemCombatResult.damageTypeComponent>) =>
  itemResultValue(itemCombatResult.damageTypeComponent(...args))
const minimumAttackChargeComponent = (...args: Parameters<typeof itemCombatResult.minimumAttackChargeComponent>) =>
  itemResultValue(itemCombatResult.minimumAttackChargeComponent(...args))
const swingAnimationComponent = (...args: Parameters<typeof itemCombatResult.swingAnimationComponent>) =>
  itemResultValue(itemCombatResult.swingAnimationComponent(...args))
const useEffectsComponent = (...args: Parameters<typeof itemCombatResult.useEffectsComponent>) =>
  itemResultValue(itemCombatResult.useEffectsComponent(...args))
const validation = (field: string, message: string, value: unknown, reason: string, kind: string) => ({
  _tag: 'ItemValidationFailure', kind, reason, field, message, value,
})

describe('item combat components', () => {
  it('constructs immutable components with official defaults', () => {
    const useEffects = useEffectsComponent()
    const minimumAttackCharge = minimumAttackChargeComponent(AttackCharge(0.5))
    const damageType = damageTypeComponent(ResourceLocation('minecraft:player_attack'))
    const swingAnimation = swingAnimationComponent()
    const attackRange = attackRangeComponent()

    expect(useEffects).toEqual({ canSprint: false, speedMultiplier: 0.2 })
    expect(minimumAttackCharge).toBe(0.5)
    expect(damageType).toBe('minecraft:player_attack')
    expect(swingAnimation).toEqual({ type: 'whack', duration: 6 })
    expect(attackRange).toEqual({
      minReach: 0,
      maxReach: 3,
      minCreativeReach: 0,
      maxCreativeReach: 5,
      hitboxMargin: 0.3,
      mobFactor: 1,
    })
    expect(Object.isFrozen(useEffects)).toBe(true)
    expect(Object.isFrozen(swingAnimation)).toBe(true)
    expect(Object.isFrozen(attackRange)).toBe(true)
  })

  it('constructs every configurable value at its accepted boundaries', () => {
    expect(useEffectsComponent({ canSprint: true, speedMultiplier: UseSpeedMultiplier(0) })).toEqual({
      canSprint: true,
      speedMultiplier: 0,
    })
    expect(useEffectsComponent({ speedMultiplier: UseSpeedMultiplier(1) })).toEqual({
      canSprint: false,
      speedMultiplier: 1,
    })
    expect(minimumAttackChargeComponent(AttackCharge(0))).toBe(0)
    expect(minimumAttackChargeComponent(AttackCharge(1))).toBe(1)
    expect(damageTypeComponent(ResourceLocation('stone'))).toBe('stone')

    for (const type of SWING_ANIMATION_TYPES) {
      expect(swingAnimationComponent({ type, duration: SwingAnimationDuration(0) }).type).toBe(type)
    }
    expect(attackRangeComponent({
      minReach: AttackRangeDistance(64),
      maxReach: AttackRangeDistance(64),
      minCreativeReach: AttackRangeDistance(64),
      maxCreativeReach: AttackRangeDistance(64),
      hitboxMargin: AttackHitboxMargin(1),
      mobFactor: MobAttackRangeFactor(2),
    })).toEqual({
      minReach: 64,
      maxReach: 64,
      minCreativeReach: 64,
      maxCreativeReach: 64,
      hitboxMargin: 1,
      mobFactor: 2,
    })
  })

  it('rejects malformed constructor input at the runtime boundary', () => {
    for (const options of [null, [], 1]) {
      expectItemFailure(Reflect.apply(itemCombatResult.useEffectsComponent, undefined, [options]), validation(
        'options', 'Use effects options must be a non-null object', options, 'invalid-type', 'TypeError',
      ))
    }
    expectItemFailure(Reflect.apply(itemCombatResult.useEffectsComponent, undefined, [{ canSprint: 'yes' }]), validation(
      'canSprint', 'canSprint must be a boolean', 'yes', 'invalid-type', 'TypeError',
    ))
    expectItemFailure(Reflect.apply(itemCombatResult.useEffectsComponent, undefined, [{ speedMultiplier: 1.1 }]), validation(
      'speedMultiplier', 'speedMultiplier must be a finite number in [0, 1]', 1.1, 'out-of-range', 'RangeError',
    ))

    for (const value of [-0.1, 1.1, '0.5']) {
      expectItemFailure(Reflect.apply(itemCombatResult.minimumAttackChargeComponent, undefined, [value]), validation(
        'minimumAttackCharge', 'minimumAttackCharge must be a finite number in [0, 1]', value, 'out-of-range', 'RangeError',
      ))
    }
    expectItemFailure(itemCombatResult.damageTypeComponent('INVALID!'), validation(
      'damageType', 'damageType must be a valid resource location: INVALID!', 'INVALID!', 'invalid-value', 'TypeError',
    ))
    expectItemFailure(Reflect.apply(itemCombatResult.damageTypeComponent, undefined, [1]), validation(
      'damageType', 'damageType must be a valid resource location: 1', 1, 'invalid-value', 'TypeError',
    ))

    for (const options of [null, []]) {
      expectItemFailure(Reflect.apply(itemCombatResult.swingAnimationComponent, undefined, [options]), validation(
        'options', 'Swing animation options must be a non-null object', options, 'invalid-type', 'TypeError',
      ))
    }
    expectItemFailure(Reflect.apply(itemCombatResult.swingAnimationComponent, undefined, [{ type: 'slash' }]), validation(
      'type', 'Unknown swing animation type: slash', 'slash', 'invalid-value', 'TypeError',
    ))
    for (const duration of [1.5, -1]) {
      expectItemFailure(Reflect.apply(itemCombatResult.swingAnimationComponent, undefined, [{ duration }]), validation(
        'duration', 'duration must be a non-negative safe integer', duration, 'out-of-range', 'RangeError',
      ))
    }

    for (const options of [null, []]) {
      expectItemFailure(Reflect.apply(itemCombatResult.attackRangeComponent, undefined, [options]), validation(
        'options', 'Attack range options must be a non-null object', options, 'invalid-type', 'TypeError',
      ))
    }
    for (const [field, value, message] of [
      ['minReach', -1, 'minReach must be a finite number in [0, 64]'],
      ['maxReach', 65, 'maxReach must be a finite number in [0, 64]'],
      ['minCreativeReach', -1, 'minCreativeReach must be a finite number in [0, 64]'],
      ['maxCreativeReach', 65, 'maxCreativeReach must be a finite number in [0, 64]'],
      ['hitboxMargin', 1.1, 'hitboxMargin must be a finite number in [0, 1]'],
      ['mobFactor', -1, 'mobFactor must be a finite number in [0, 2]'],
    ] as const) {
      expectItemFailure(itemCombatResult.attackRangeComponent({ [field]: value }), validation(
        field, message, value, 'out-of-range', 'RangeError',
      ))
    }
  })

  it('validates and brands one snapshot of option values', () => {
    const changingNumber = (field: string, valid: number, invalid: number) => {
      let reads = 0
      const value = new Proxy({}, {
        get: (_target, key) => {
          if (key !== field) return undefined
          reads += 1
          return reads === 1 ? valid : invalid
        },
      })
      return { value, reads: () => reads }
    }

    const speed = changingNumber('speedMultiplier', 0.5, 2)
    expect(useEffectsComponent(speed.value)).toEqual({ canSprint: false, speedMultiplier: 0.5 })
    expect(speed.reads()).toBe(1)

    const duration = changingNumber('duration', 1, -1)
    expect(swingAnimationComponent(duration.value)).toEqual({ type: 'whack', duration: 1 })
    expect(duration.reads()).toBe(1)

    const cases: ReadonlyArray<Readonly<{ field: string; valid: number; invalid: number }>> = [
      { field: 'minReach', valid: 1, invalid: -1 },
      { field: 'maxReach', valid: 2, invalid: 65 },
      { field: 'minCreativeReach', valid: 1, invalid: -1 },
      { field: 'maxCreativeReach', valid: 3, invalid: 65 },
      { field: 'hitboxMargin', valid: 0.3, invalid: 1.1 },
      { field: 'mobFactor', valid: 1, invalid: -1 },
    ]
    for (const { field, valid, invalid } of cases) {
      const option = changingNumber(field, valid, invalid)
      const component = attackRangeComponent(option.value)
      expect(Object.getOwnPropertyDescriptor(component, field)?.value).toBe(valid)
      expect(option.reads()).toBe(1)
    }

    const hostileOptions = new Proxy({}, {
      get: (_target, key) => key === 'speedMultiplier' ? (() => { throw new Error('hostile') })() : undefined,
    })
    expectItemFailure(Reflect.apply(itemCombatResult.useEffectsComponent, undefined, [hostileOptions]), validation(
      'options', 'Unable to inspect Use effects options', hostileOptions, 'hostile-input', 'TypeError',
    ))

    const revokedOptions = Proxy.revocable({}, {})
    revokedOptions.revoke()
    expectItemFailure(Reflect.apply(itemCombatResult.useEffectsComponent, undefined, [revokedOptions.proxy]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'hostile-input',
      field: 'options',
      message: 'Unable to inspect Use effects options',
    })
  })

  it('guards exact component shapes and value ranges', () => {
    expect(isUseEffectsComponent(useEffectsComponent())).toBe(true)
    expect(isUseEffectsComponent({ canSprint: true, speedMultiplier: 0 })).toBe(true)
    expect(isUseEffectsComponent({ canSprint: 'yes', speedMultiplier: 0 })).toBe(false)
    expect(isUseEffectsComponent({ canSprint: true, speedMultiplier: 1.1 })).toBe(false)
    expect(isUseEffectsComponent({ canSprint: true })).toBe(false)
    expect(isUseEffectsComponent({ canSprint: true, speedMultiplier: 0, extra: true })).toBe(false)
    expect(isUseEffectsComponent(null)).toBe(false)
    expect(isUseEffectsComponent([])).toBe(false)

    expect(isMinimumAttackChargeComponent(0)).toBe(true)
    expect(isMinimumAttackChargeComponent(1)).toBe(true)
    expect(isMinimumAttackChargeComponent(-1)).toBe(false)
    expect(isMinimumAttackChargeComponent(2)).toBe(false)
    expect(isMinimumAttackChargeComponent(Infinity)).toBe(false)
    expect(isMinimumAttackChargeComponent('0')).toBe(false)

    expect(isDamageTypeComponent('minecraft:generic')).toBe(true)
    expect(isDamageTypeComponent('INVALID!')).toBe(false)
    expect(isDamageTypeComponent(1)).toBe(false)

    for (const type of SWING_ANIMATION_TYPES) {
      expect(isSwingAnimationComponent({ type, duration: 0 })).toBe(true)
    }
    expect(isSwingAnimationComponent({ type: 'slash', duration: 0 })).toBe(false)
    expect(isSwingAnimationComponent({ type: 'whack', duration: -1 })).toBe(false)
    expect(isSwingAnimationComponent({ type: 'whack' })).toBe(false)
    expect(isSwingAnimationComponent({ type: 'whack', duration: 0, extra: true })).toBe(false)
    expect(isSwingAnimationComponent(null)).toBe(false)
    expect(isSwingAnimationComponent([])).toBe(false)

    const validRange = {
      minReach: 0,
      maxReach: 3,
      minCreativeReach: 0,
      maxCreativeReach: 5,
      hitboxMargin: 0.3,
      mobFactor: 1,
    }
    expect(isAttackRangeComponent(validRange)).toBe(true)
    expect(isAttackRangeComponent({ ...validRange, minReach: -1 })).toBe(false)
    expect(isAttackRangeComponent({ ...validRange, maxReach: 65 })).toBe(false)
    expect(isAttackRangeComponent({ ...validRange, minCreativeReach: -1 })).toBe(false)
    expect(isAttackRangeComponent({ ...validRange, maxCreativeReach: 65 })).toBe(false)
    expect(isAttackRangeComponent({ ...validRange, hitboxMargin: 1.1 })).toBe(false)
    expect(isAttackRangeComponent({ ...validRange, mobFactor: 2.1 })).toBe(false)
    expect(isAttackRangeComponent({ minReach: 0, maxReach: 3, hitboxMargin: 0.3 })).toBe(false)
    expect(isAttackRangeComponent({ ...validRange, extra: true })).toBe(false)
    expect(isAttackRangeComponent(null)).toBe(false)
    expect(isAttackRangeComponent([])).toBe(false)
  })
})

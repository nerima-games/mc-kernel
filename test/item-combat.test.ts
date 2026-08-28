import {
  attackRangeComponent,
  damageTypeComponent,
  isAttackRangeComponent,
  isDamageTypeComponent,
  isMinimumAttackChargeComponent,
  isSwingAnimationComponent,
  isUseEffectsComponent,
  minimumAttackChargeComponent,
  SWING_ANIMATION_TYPES,
  swingAnimationComponent,
  useEffectsComponent,
} from '../src/domain/item-combat'
import { describe, expect, it } from 'vitest'

describe('item combat components', () => {
  it('constructs immutable components with official defaults', () => {
    const useEffects = useEffectsComponent()
    const minimumAttackCharge = minimumAttackChargeComponent(0.5)
    const damageType = damageTypeComponent('minecraft:player_attack')
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
    expect(useEffectsComponent({ canSprint: true, speedMultiplier: 0 })).toEqual({
      canSprint: true,
      speedMultiplier: 0,
    })
    expect(useEffectsComponent({ speedMultiplier: 1 })).toEqual({
      canSprint: false,
      speedMultiplier: 1,
    })
    expect(minimumAttackChargeComponent(0)).toBe(0)
    expect(minimumAttackChargeComponent(1)).toBe(1)
    expect(damageTypeComponent('stone')).toBe('stone')

    for (const type of SWING_ANIMATION_TYPES) {
      expect(swingAnimationComponent({ type, duration: 0 }).type).toBe(type)
    }
    expect(attackRangeComponent({
      minReach: 64,
      maxReach: 64,
      minCreativeReach: 64,
      maxCreativeReach: 64,
      hitboxMargin: 1,
      mobFactor: 2,
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
    expect(() => Reflect.apply(useEffectsComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(useEffectsComponent, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(useEffectsComponent, undefined, [1])).toThrow(TypeError)
    expect(() => Reflect.apply(useEffectsComponent, undefined, [{ canSprint: 'yes' }])).toThrow(TypeError)
    expect(() => Reflect.apply(useEffectsComponent, undefined, [{ speedMultiplier: 1.1 }])).toThrow(RangeError)

    expect(() => Reflect.apply(minimumAttackChargeComponent, undefined, [-0.1])).toThrow(RangeError)
    expect(() => Reflect.apply(minimumAttackChargeComponent, undefined, [1.1])).toThrow(RangeError)
    expect(() => Reflect.apply(minimumAttackChargeComponent, undefined, ['0.5'])).toThrow(RangeError)
    expect(() => Reflect.apply(damageTypeComponent, undefined, ['INVALID!'])).toThrow(TypeError)
    expect(() => Reflect.apply(damageTypeComponent, undefined, [1])).toThrow(TypeError)

    expect(() => Reflect.apply(swingAnimationComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(swingAnimationComponent, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(swingAnimationComponent, undefined, [{ type: 'slash' }])).toThrow(TypeError)
    expect(() => Reflect.apply(swingAnimationComponent, undefined, [{ duration: 1.5 }])).toThrow(RangeError)
    expect(() => Reflect.apply(swingAnimationComponent, undefined, [{ duration: -1 }])).toThrow(RangeError)

    expect(() => Reflect.apply(attackRangeComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [{ minReach: -1 }])).toThrow(RangeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [{ maxReach: 65 }])).toThrow(RangeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [{ minCreativeReach: -1 }])).toThrow(RangeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [{ maxCreativeReach: 65 }])).toThrow(RangeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [{ hitboxMargin: 1.1 }])).toThrow(RangeError)
    expect(() => Reflect.apply(attackRangeComponent, undefined, [{ mobFactor: -1 }])).toThrow(RangeError)
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

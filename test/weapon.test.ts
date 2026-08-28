import { describe, expect, it } from 'vitest'
import { isWeaponComponent, weaponComponent } from '../src/domain/weapon.js'

describe('weapon component', () => {
  it('uses the official defaults and freezes the resolved value', () => {
    const component = weaponComponent()

    expect(component).toEqual({
      itemDamagePerAttack: 1,
      disableBlockingForSeconds: 0,
    })
    expect(Object.isFrozen(component)).toBe(true)
  })

  it('accepts custom official values', () => {
    expect(
      weaponComponent({
        itemDamagePerAttack: 2,
        disableBlockingForSeconds: 0.25,
      }),
    ).toEqual({
      itemDamagePerAttack: 2,
      disableBlockingForSeconds: 0.25,
    })
  })

  it('rejects malformed options at the public boundary', () => {
    const invoke = (options: unknown) =>
      () => Reflect.apply(weaponComponent, undefined, [options])

    expect(invoke(null)).toThrow(TypeError)
    expect(invoke([])).toThrow(TypeError)
    expect(invoke({ itemDamagePerAttack: -1 })).toThrow(RangeError)
    expect(invoke({ itemDamagePerAttack: 1.5 })).toThrow(RangeError)
    expect(invoke({ itemDamagePerAttack: Number.POSITIVE_INFINITY })).toThrow(RangeError)
    expect(invoke({ disableBlockingForSeconds: -0.1 })).toThrow(RangeError)
    expect(invoke({ disableBlockingForSeconds: Number.NaN })).toThrow(RangeError)
    expect(invoke({ disableBlockingForSeconds: Number.POSITIVE_INFINITY })).toThrow(RangeError)
  })

  it('guards the exact resolved shape at runtime', () => {
    const valid = weaponComponent()

    expect(isWeaponComponent(valid)).toBe(true)
    expect(isWeaponComponent({ ...valid, itemDamagePerAttack: -1 })).toBe(false)
    expect(isWeaponComponent({ ...valid, itemDamagePerAttack: 1.5 })).toBe(false)
    expect(isWeaponComponent({ ...valid, disableBlockingForSeconds: -1 })).toBe(false)
    expect(isWeaponComponent({ ...valid, disableBlockingForSeconds: Number.NaN })).toBe(false)
    expect(isWeaponComponent({ ...valid, extra: true })).toBe(false)
    expect(isWeaponComponent({ itemDamagePerAttack: 1 })).toBe(false)
    expect(isWeaponComponent([])).toBe(false)
    expect(isWeaponComponent(null)).toBe(false)
    expect(isWeaponComponent({ itemDamagePerAttack: '1', disableBlockingForSeconds: 0 })).toBe(false)
    expect(isWeaponComponent({ itemDamagePerAttack: 1, disableBlockingForSeconds: '0' })).toBe(false)
  })
})

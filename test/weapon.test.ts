import { describe, expect, it } from 'vitest'
import * as weaponResult from '../src/domain/item/weapon.js'
import { ItemDamage, WeaponDisableBlockingSeconds } from '../src/domain/time/quantities.js'
import { expectItemFailure, itemResultValue } from './item-result-assertions'

const isWeaponComponent = weaponResult.isWeaponComponent
const weaponComponent = (...args: Parameters<typeof weaponResult.weaponComponent>) =>
  itemResultValue(weaponResult.weaponComponent(...args))
const invokeWeaponComponent = (options: unknown) =>
  Reflect.apply(weaponResult.weaponComponent, undefined, [options])

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
        itemDamagePerAttack: ItemDamage(2),
        disableBlockingForSeconds: WeaponDisableBlockingSeconds(0.25),
      }),
    ).toEqual({
      itemDamagePerAttack: 2,
      disableBlockingForSeconds: 0.25,
    })
  })

  it('rejects malformed options at the public boundary', () => {
    expectItemFailure(Reflect.apply(weaponResult.weaponComponent, undefined, [null]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'invalid-type',
      field: 'options',
      message: 'Weapon component options must be a non-null object',
      value: null,
    })
    expectItemFailure(Reflect.apply(weaponResult.weaponComponent, undefined, [[]]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'invalid-type',
      field: 'options',
      message: 'Weapon component options must be a non-null object',
      value: [],
    })
    expectItemFailure(invokeWeaponComponent({ itemDamagePerAttack: -1 }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'itemDamagePerAttack',
      message: 'itemDamagePerAttack must be a non-negative safe integer',
      value: -1,
    })
    expectItemFailure(invokeWeaponComponent({ itemDamagePerAttack: 1.5 }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'itemDamagePerAttack',
      message: 'itemDamagePerAttack must be a non-negative safe integer',
      value: 1.5,
    })
    expectItemFailure(invokeWeaponComponent({ itemDamagePerAttack: Number.POSITIVE_INFINITY }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'itemDamagePerAttack',
      message: 'itemDamagePerAttack must be a non-negative safe integer',
      value: Number.POSITIVE_INFINITY,
    })
    expectItemFailure(invokeWeaponComponent({ disableBlockingForSeconds: -0.1 }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'disableBlockingForSeconds',
      message: 'disableBlockingForSeconds must be a finite, non-negative number',
      value: -0.1,
    })
    expectItemFailure(invokeWeaponComponent({ disableBlockingForSeconds: Number.NaN }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'disableBlockingForSeconds',
      message: 'disableBlockingForSeconds must be a finite, non-negative number',
      value: Number.NaN,
    })
    expectItemFailure(invokeWeaponComponent({ disableBlockingForSeconds: Number.POSITIVE_INFINITY }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'disableBlockingForSeconds',
      message: 'disableBlockingForSeconds must be a finite, non-negative number',
      value: Number.POSITIVE_INFINITY,
    })
  })

  it('rejects null option values instead of replacing them with defaults', () => {
    expectItemFailure(invokeWeaponComponent({ itemDamagePerAttack: null }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'itemDamagePerAttack',
      message: 'itemDamagePerAttack must be a non-negative safe integer',
      value: null,
    })
    expectItemFailure(invokeWeaponComponent({ disableBlockingForSeconds: null }), {
      _tag: 'ItemValidationFailure',
      kind: 'RangeError',
      reason: 'out-of-range',
      field: 'disableBlockingForSeconds',
      message: 'disableBlockingForSeconds must be a finite, non-negative number',
      value: null,
    })
  })

  it('validates and brands one snapshot of option values', () => {
    let damageReads = 0
    const changingDamage = new Proxy({}, {
      get: (_target, key) => {
        if (key !== 'itemDamagePerAttack') return undefined
        damageReads += 1
        return damageReads === 1 ? 1 : -1
      },
    })
    expect(itemResultValue(invokeWeaponComponent(changingDamage))).toEqual({
      itemDamagePerAttack: 1,
      disableBlockingForSeconds: 0,
    })
    expect(damageReads).toBe(1)

    let durationReads = 0
    const changingDuration = new Proxy({}, {
      get: (_target, key) => {
        if (key !== 'disableBlockingForSeconds') return undefined
        durationReads += 1
        return durationReads === 1 ? 0 : -1
      },
    })
    expect(itemResultValue(invokeWeaponComponent(changingDuration))).toEqual({
      itemDamagePerAttack: 1,
      disableBlockingForSeconds: 0,
    })
    expect(durationReads).toBe(1)

    const hostileOptions = new Proxy({}, {
      get: (_target, key) => key === 'itemDamagePerAttack' ? (() => { throw new Error('hostile') })() : undefined,
    })
    expectItemFailure(invokeWeaponComponent(hostileOptions), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'hostile-input',
      field: 'options',
      message: 'Unable to inspect weapon component options',
      value: hostileOptions,
    })

    const revokedOptions = Proxy.revocable({}, {})
    revokedOptions.revoke()
    expectItemFailure(invokeWeaponComponent(revokedOptions.proxy), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'hostile-input',
      field: 'options',
      message: 'Unable to inspect weapon component options',
    })
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

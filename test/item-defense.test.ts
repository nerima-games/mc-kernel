import * as itemDefenseResult from '../src/domain/item/item-defense'
import {
  isBlocksAttacksComponent,
  isDamageReductionRule,
  isDamageResistantComponent,
  isItemDamageRule,
} from '../src/domain/item/item-defense'
import { isResourceLocationProvider } from '../src/domain/item/item-component-values'
import { ResourceLocation, TagLocation } from '../src/domain/text/identifiers'
import * as Quantities from '../src/domain/time/quantities'
import { expectItemFailure, itemResultValue } from './item-result-assertions'
import { describe, expect, it } from 'vitest'

const blocksAttacksComponent = (...args: Parameters<typeof itemDefenseResult.blocksAttacksComponent>) =>
  itemResultValue(itemDefenseResult.blocksAttacksComponent(...args))
const damageResistantComponent = (...args: Parameters<typeof itemDefenseResult.damageResistantComponent>) =>
  itemResultValue(itemDefenseResult.damageResistantComponent(...args))
const invokeBlocksAttacks = (options: unknown) =>
  Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [options])

const validation = (kind: string, reason: string, field: string, message: string, value: unknown) => ({
  _tag: 'ItemValidationFailure', kind, reason, field, message, value,
})

describe('item defense components', () => {
  it('constructs immutable components with official defaults and values', () => {
    const damageResistant = damageResistantComponent(TagLocation('#minecraft:is_fire'))
    const defaults = blocksAttacksComponent()
    const custom = blocksAttacksComponent({
      blockDelaySeconds: Quantities.BlockingDelaySeconds(0),
      disableCooldownScale: Quantities.DisableCooldownScale(0),
      damageReductions: [
        {
          type: ResourceLocation('minecraft:player_attack'),
          base: Quantities.DamageReductionBase(2),
          factor: Quantities.DamageReductionFactor(0.5),
          horizontalBlockingAngle: Quantities.HorizontalBlockingAngle(64),
        },
      ],
      itemDamage: {
        threshold: Quantities.ItemDamageThreshold(0.25),
        base: Quantities.ItemDamageBase(1),
        factor: Quantities.ItemDamageFactor(0.5),
      },
      blockSound: ResourceLocation('minecraft:item.shield.block'),
      disabledSound: ResourceLocation('minecraft:item.shield.break'),
      bypassedBy: [ResourceLocation('minecraft:arrow'), ResourceLocation('minecraft:trident')],
    })

    expect(damageResistant).toEqual({ types: '#minecraft:is_fire' })
    expect(defaults).toEqual({
      blockDelaySeconds: 0,
      disableCooldownScale: 1,
      damageReductions: [],
      itemDamage: undefined,
      blockSound: undefined,
      disabledSound: undefined,
      bypassedBy: undefined,
    })
    expect(custom).toEqual({
      blockDelaySeconds: 0,
      disableCooldownScale: 0,
      damageReductions: [
        {
          type: 'minecraft:player_attack',
          base: 2,
          factor: 0.5,
          horizontalBlockingAngle: 64,
        },
      ],
      itemDamage: { threshold: 0.25, base: 1, factor: 0.5 },
      blockSound: 'minecraft:item.shield.block',
      disabledSound: 'minecraft:item.shield.break',
      bypassedBy: ['minecraft:arrow', 'minecraft:trident'],
    })
    expect(Object.isFrozen(damageResistant)).toBe(true)
    expect(Object.isFrozen(defaults)).toBe(true)
    expect(Object.isFrozen(defaults.damageReductions)).toBe(true)
    expect(Object.isFrozen(custom)).toBe(true)
    expect(Object.isFrozen(custom.damageReductions)).toBe(true)
    expect(Object.isFrozen(custom.damageReductions[0])).toBe(true)
    expect(Object.isFrozen(custom.itemDamage)).toBe(true)
    expect(Object.isFrozen(custom.bypassedBy)).toBe(true)
  })

  it('normalizes each rule in a non-empty damage reduction array', () => {
    expect(blocksAttacksComponent({
      damageReductions: [
        {
          type: ResourceLocation('minecraft:player_attack'),
          base: Quantities.DamageReductionBase(2),
          factor: Quantities.DamageReductionFactor(0.5),
          horizontalBlockingAngle: Quantities.HorizontalBlockingAngle(64),
        },
        { base: Quantities.DamageReductionBase(1), factor: Quantities.DamageReductionFactor(0.25) },
      ],
    })).toStrictEqual({
      blockDelaySeconds: 0,
      disableCooldownScale: 1,
      damageReductions: [
        {
          type: 'minecraft:player_attack',
          base: 2,
          factor: 0.5,
          horizontalBlockingAngle: 64,
        },
        {
          type: undefined,
          base: 1,
          factor: 0.25,
          horizontalBlockingAngle: 90,
        },
      ],
      itemDamage: undefined,
      blockSound: undefined,
      disabledSound: undefined,
      bypassedBy: undefined,
    })
  })

  it('constructs every accepted resource provider shape', () => {
    expect(damageResistantComponent(ResourceLocation('minecraft:fire')).types).toBe('minecraft:fire')
    expect(damageResistantComponent(TagLocation('#minecraft:is_fire')).types).toBe('#minecraft:is_fire')
    expect(damageResistantComponent([ResourceLocation('minecraft:fire'), ResourceLocation('minecraft:lava')]).types).toEqual([
      'minecraft:fire',
      'minecraft:lava',
    ])
    expect(Object.isFrozen(damageResistantComponent([ResourceLocation('minecraft:fire')]).types)).toBe(true)

    expect(isResourceLocationProvider('minecraft:fire')).toBe(true)
    expect(isResourceLocationProvider('#minecraft:is_fire')).toBe(true)
    expect(isResourceLocationProvider(['minecraft:fire'])).toBe(true)
    expect(isResourceLocationProvider([])).toBe(true)
    expect(isResourceLocationProvider(['#minecraft:is_fire'])).toBe(false)
    expect(isResourceLocationProvider(['INVALID!'])).toBe(false)
    expect(isResourceLocationProvider(1)).toBe(false)
  })

  it('rejects malformed constructor input at the runtime boundary', () => {
    for (const types of [null, 1]) {
      expectItemFailure(Reflect.apply(itemDefenseResult.damageResistantComponent, undefined, [types]), validation(
        'TypeError', 'invalid-type', 'damage_resistant.types',
        'damage_resistant.types must be a string or an array of resource locations', types,
      ))
    }
    expectItemFailure(Reflect.apply(itemDefenseResult.damageResistantComponent, undefined, ['INVALID!']), validation(
      'TypeError', 'invalid-value', 'damage_resistant.types', 'ResourceLocation has invalid syntax, received "INVALID!"', 'INVALID!',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.damageResistantComponent, undefined, [['#minecraft:is_fire']]), validation(
      'TypeError', 'invalid-type', 'damage_resistant.types', 'damage_resistant.types lists must contain resource locations', '#minecraft:is_fire',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.damageResistantComponent, undefined, [['INVALID!']]), validation(
      'TypeError', 'invalid-value', 'damage_resistant.types', 'ResourceLocation has invalid syntax, received "INVALID!"', 'INVALID!',
    ))

    for (const options of [null, [], 1]) {
      expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [options]), validation(
        'TypeError', 'invalid-type', 'blocksAttacks options', 'blocksAttacks options must be a non-null object', options,
      ))
    }
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ blockDelaySeconds: '0' }]), validation(
      'TypeError', 'invalid-type', 'blockDelaySeconds', 'blockDelaySeconds must be a finite number', '0',
    ))
    expectItemFailure(invokeBlocksAttacks({ blockDelaySeconds: -1 }), validation(
      'RangeError', 'out-of-range', 'blockDelaySeconds', 'blockDelaySeconds must be a non-negative finite number', -1,
    ))
    expectItemFailure(invokeBlocksAttacks({ blockDelaySeconds: Infinity }), validation(
      'TypeError', 'invalid-type', 'blockDelaySeconds', 'blockDelaySeconds must be a finite number', Infinity,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ disableCooldownScale: '1' }]), validation(
      'TypeError', 'invalid-type', 'disableCooldownScale', 'disableCooldownScale must be a finite number', '1',
    ))
    expectItemFailure(invokeBlocksAttacks({ disableCooldownScale: -1 }), validation(
      'RangeError', 'out-of-range', 'disableCooldownScale', 'disableCooldownScale must be a non-negative finite number', -1,
    ))
    expectItemFailure(invokeBlocksAttacks({ disableCooldownScale: NaN }), validation(
      'TypeError', 'invalid-type', 'disableCooldownScale', 'disableCooldownScale must be a finite number', NaN,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: {} }]), validation(
      'TypeError', 'invalid-type', 'damageReductions', 'damageReductions must be an array', {},
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: 'invalid' }]), validation(
      'TypeError', 'invalid-type', 'damageReductions', 'damageReductions must be an array', 'invalid',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: [null] }]), validation(
      'TypeError', 'invalid-type', 'damageReductions[0]', 'damageReductions[0] must be a non-null object', null,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: [{ base: '1', factor: 0 }] }]), validation(
      'TypeError', 'invalid-type', 'damageReductions[0].base', 'damageReductions[0].base must be a finite number', '1',
    ))
    let laterDamageReductionReads = 0
    const laterDamageReduction = {
      get base() {
        laterDamageReductionReads += 1
        return 1
      },
      factor: 0,
    }
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{
      damageReductions: [{ base: '1', factor: 0 }, laterDamageReduction],
    }]), validation(
      'TypeError', 'invalid-type', 'damageReductions[0].base', 'damageReductions[0].base must be a finite number', '1',
    ))
    expect(laterDamageReductionReads).toBe(0)
    expectItemFailure(invokeBlocksAttacks({ damageReductions: [{ base: 0, factor: Infinity }] }), validation(
      'TypeError', 'invalid-type', 'damageReductions[0].factor', 'damageReductions[0].factor must be a finite number', Infinity,
    ))
    expectItemFailure(invokeBlocksAttacks({ damageReductions: [{ base: 0, factor: 0, horizontalBlockingAngle: 0 }] }), validation(
      'RangeError', 'out-of-range', 'damageReductions[0].horizontalBlockingAngle', 'damageReductions[0].horizontalBlockingAngle must be a positive finite number', 0,
    ))
    expectItemFailure(invokeBlocksAttacks({ damageReductions: [{ base: 0, factor: 0, type: 'INVALID!' }] }), validation(
      'TypeError', 'invalid-value', 'damageReductions[0].type', 'ResourceLocation has invalid syntax, received "INVALID!"', 'INVALID!',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: [{ base: 0, factor: 0, type: 1 }] }]), validation(
      'TypeError', 'invalid-type', 'damageReductions[0].type',
      'damageReductions[0].type must be a string or an array of resource locations', 1,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: [{ base: 0, factor: 0, type: null }] }]), validation(
      'TypeError', 'invalid-type', 'damageReductions[0].type',
      'damageReductions[0].type must be a string or an array of resource locations', null,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ damageReductions: [{ base: 0, factor: 0, type: ['#minecraft:is_fire'] }] }]), validation(
      'TypeError', 'invalid-type', 'damageReductions[0].type', 'damageReductions[0].type lists must contain resource locations', '#minecraft:is_fire',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ itemDamage: null }]), validation(
      'TypeError', 'invalid-type', 'itemDamage', 'itemDamage must be a non-null object', null,
    ))
    expectItemFailure(invokeBlocksAttacks({ itemDamage: { threshold: -1, base: 0, factor: 0 } }), validation(
      'RangeError', 'out-of-range', 'itemDamage.threshold', 'itemDamage.threshold must be a non-negative finite number', -1,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ itemDamage: { threshold: 0, base: '1', factor: 0 } }]), validation(
      'TypeError', 'invalid-type', 'itemDamage.base', 'itemDamage.base must be a finite number', '1',
    ))
    expectItemFailure(invokeBlocksAttacks({ itemDamage: { threshold: 0, base: 0, factor: Infinity } }), validation(
      'TypeError', 'invalid-type', 'itemDamage.factor', 'itemDamage.factor must be a finite number', Infinity,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ blockSound: 1 }]), validation(
      'TypeError', 'invalid-value', 'blockSound', 'ResourceLocation has invalid syntax, received 1', 1,
    ))
    expectItemFailure(invokeBlocksAttacks({ blockSound: 'INVALID!' }), validation(
      'TypeError', 'invalid-value', 'blockSound', 'ResourceLocation has invalid syntax, received "INVALID!"', 'INVALID!',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ disabledSound: 1 }]), validation(
      'TypeError', 'invalid-value', 'disabledSound', 'ResourceLocation has invalid syntax, received 1', 1,
    ))
    expectItemFailure(invokeBlocksAttacks({ disabledSound: 'INVALID!' }), validation(
      'TypeError', 'invalid-value', 'disabledSound', 'ResourceLocation has invalid syntax, received "INVALID!"', 'INVALID!',
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ bypassedBy: 1 }]), validation(
      'TypeError', 'invalid-type', 'bypassedBy',
      'bypassedBy must be a string or an array of resource locations', 1,
    ))
    expectItemFailure(Reflect.apply(itemDefenseResult.blocksAttacksComponent, undefined, [{ bypassedBy: null }]), validation(
      'TypeError', 'invalid-type', 'bypassedBy',
      'bypassedBy must be a string or an array of resource locations', null,
    ))
    expectItemFailure(invokeBlocksAttacks({ bypassedBy: ['#minecraft:is_fire'] }), validation(
      'TypeError', 'invalid-type', 'bypassedBy', 'bypassedBy lists must contain resource locations', '#minecraft:is_fire',
    ))

    const hostileTypes = new Proxy(['minecraft:fire'], {
      get: (target, key, receiver) => key === Symbol.iterator
        ? (() => { throw new Error('hostile') })()
        : Reflect.get(target, key, receiver),
    })
    expectItemFailure(Reflect.apply(itemDefenseResult.damageResistantComponent, undefined, [hostileTypes]), validation(
      'TypeError', 'hostile-input', 'damage_resistant.types',
      'Unable to inspect damage_resistant.types', hostileTypes,
    ))
  })

  it('guards exact component shapes and value ranges', () => {
    const valid = blocksAttacksComponent({
      damageReductions: [{
        base: Quantities.DamageReductionBase(0),
        factor: Quantities.DamageReductionFactor(0),
      }],
      itemDamage: {
        threshold: Quantities.ItemDamageThreshold(0),
        base: Quantities.ItemDamageBase(0),
        factor: Quantities.ItemDamageFactor(0),
      },
      blockSound: ResourceLocation('minecraft:item.shield.block'),
      disabledSound: ResourceLocation('minecraft:item.shield.break'),
      bypassedBy: TagLocation('#minecraft:axes'),
    })
    const validReduction = valid.damageReductions[0]
    const validItemDamage = valid.itemDamage
    if (validItemDamage === undefined) {
      throw new Error('expected item damage rule')
    }

    expect(isDamageResistantComponent(damageResistantComponent(ResourceLocation('minecraft:fire')))).toBe(true)
    expect(isDamageResistantComponent({ types: '#minecraft:is_fire' })).toBe(true)
    expect(isDamageResistantComponent({ types: 'INVALID!' })).toBe(false)
    expect(isDamageResistantComponent({ types: 1 })).toBe(false)
    expect(isDamageResistantComponent({})).toBe(false)
    expect(isDamageResistantComponent({ types: 'minecraft:fire', extra: true })).toBe(false)
    expect(isDamageResistantComponent(null)).toBe(false)
    expect(isDamageResistantComponent([])).toBe(false)

    expect(isDamageReductionRule(validReduction)).toBe(true)
    expect(isDamageReductionRule({ ...validReduction, type: undefined })).toBe(true)
    expect(isDamageReductionRule({ ...validReduction, type: 1 })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, type: 'INVALID!' })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, type: ['INVALID!'] })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, base: '0' })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, base: Infinity })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, factor: '0' })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, factor: NaN })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, horizontalBlockingAngle: '90' })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, horizontalBlockingAngle: 0 })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, extra: true })).toBe(false)
    expect(isDamageReductionRule({ ...validReduction, type: undefined, extra: true })).toBe(false)
    expect(isDamageReductionRule(null)).toBe(false)
    expect(isDamageReductionRule([])).toBe(false)

    expect(isItemDamageRule(validItemDamage)).toBe(true)
    expect(isItemDamageRule({ ...validItemDamage, threshold: '0' })).toBe(false)
    expect(isItemDamageRule({ ...validItemDamage, threshold: Infinity })).toBe(false)
    expect(isItemDamageRule({ ...validItemDamage, base: '0' })).toBe(false)
    expect(isItemDamageRule({ ...validItemDamage, base: NaN })).toBe(false)
    expect(isItemDamageRule({ ...validItemDamage, factor: '0' })).toBe(false)
    expect(isItemDamageRule({ ...validItemDamage, factor: NaN })).toBe(false)
    expect(isItemDamageRule({ threshold: 0, base: 0 })).toBe(false)
    expect(isItemDamageRule({ ...validItemDamage, extra: true })).toBe(false)
    expect(isItemDamageRule(null)).toBe(false)
    expect(isItemDamageRule([])).toBe(false)

    expect(isBlocksAttacksComponent(valid)).toBe(true)
    expect(isBlocksAttacksComponent({ ...valid, blockDelaySeconds: '0' })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, blockDelaySeconds: -1 })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, disableCooldownScale: '1' })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, disableCooldownScale: -1 })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, damageReductions: {} })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, damageReductions: [{}] })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, itemDamage: null })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, itemDamage: {} })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, blockSound: 1 })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, blockSound: 'INVALID!' })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, disabledSound: 1 })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, disabledSound: 'INVALID!' })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, bypassedBy: 1 })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, bypassedBy: 'INVALID!' })).toBe(false)
    expect(isBlocksAttacksComponent({ ...valid, extra: true })).toBe(false)
    expect(isBlocksAttacksComponent(null)).toBe(false)
    expect(isBlocksAttacksComponent([])).toBe(false)
  })
})

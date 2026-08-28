import {
  blocksAttacksComponent,
  damageResistantComponent,
  isBlocksAttacksComponent,
  isDamageReductionRule,
  isDamageResistantComponent,
  isItemDamageRule,
} from '../src/domain/item-defense'
import { isResourceLocationProvider } from '../src/domain/item-component-values'
import { describe, expect, it } from 'vitest'

describe('item defense components', () => {
  it('constructs immutable components with official defaults and values', () => {
    const damageResistant = damageResistantComponent('#minecraft:is_fire')
    const defaults = blocksAttacksComponent()
    const custom = blocksAttacksComponent({
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

  it('constructs every accepted resource provider shape', () => {
    expect(damageResistantComponent('minecraft:fire').types).toBe('minecraft:fire')
    expect(damageResistantComponent('#minecraft:is_fire').types).toBe('#minecraft:is_fire')
    expect(damageResistantComponent(['minecraft:fire', 'minecraft:lava']).types).toEqual([
      'minecraft:fire',
      'minecraft:lava',
    ])
    expect(Object.isFrozen(damageResistantComponent(['minecraft:fire']).types)).toBe(true)

    expect(isResourceLocationProvider('minecraft:fire')).toBe(true)
    expect(isResourceLocationProvider('#minecraft:is_fire')).toBe(true)
    expect(isResourceLocationProvider(['minecraft:fire'])).toBe(true)
    expect(isResourceLocationProvider([])).toBe(true)
    expect(isResourceLocationProvider(['#minecraft:is_fire'])).toBe(false)
    expect(isResourceLocationProvider(['INVALID!'])).toBe(false)
    expect(isResourceLocationProvider(1)).toBe(false)
  })

  it('rejects malformed constructor input at the runtime boundary', () => {
    expect(() => Reflect.apply(damageResistantComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(damageResistantComponent, undefined, [1])).toThrow(TypeError)
    expect(() => Reflect.apply(damageResistantComponent, undefined, ['INVALID!'])).toThrow()
    expect(() => Reflect.apply(damageResistantComponent, undefined, [['#minecraft:is_fire']])).toThrow(TypeError)
    expect(() => Reflect.apply(damageResistantComponent, undefined, [['INVALID!']])).toThrow()

    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [1])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ blockDelaySeconds: '0' }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ blockDelaySeconds: -1 })).toThrow(RangeError)
    expect(() => blocksAttacksComponent({ blockDelaySeconds: Infinity })).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ disableCooldownScale: '1' }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ disableCooldownScale: -1 })).toThrow(RangeError)
    expect(() => blocksAttacksComponent({ disableCooldownScale: NaN })).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ damageReductions: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ damageReductions: [null] }])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ damageReductions: [{ base: '1', factor: 0 }] }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ damageReductions: [{ base: 0, factor: Infinity }] })).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ damageReductions: [{ base: 0, factor: 0, horizontalBlockingAngle: 0 }] })).toThrow(RangeError)
    expect(() => blocksAttacksComponent({ damageReductions: [{ base: 0, factor: 0, type: 'INVALID!' }] })).toThrow()
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ damageReductions: [{ base: 0, factor: 0, type: 1 }] }])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ damageReductions: [{ base: 0, factor: 0, type: ['#minecraft:is_fire'] }] }])).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ itemDamage: null }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ itemDamage: { threshold: -1, base: 0, factor: 0 } })).toThrow(RangeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ itemDamage: { threshold: 0, base: '1', factor: 0 } }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ itemDamage: { threshold: 0, base: 0, factor: Infinity } })).toThrow(TypeError)
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ blockSound: 1 }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ blockSound: 'INVALID!' })).toThrow()
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ disabledSound: 1 }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ disabledSound: 'INVALID!' })).toThrow()
    expect(() => Reflect.apply(blocksAttacksComponent, undefined, [{ bypassedBy: 1 }])).toThrow(TypeError)
    expect(() => blocksAttacksComponent({ bypassedBy: ['#minecraft:is_fire'] })).toThrow(TypeError)
  })

  it('guards exact component shapes and value ranges', () => {
    const valid = blocksAttacksComponent({
      damageReductions: [{ base: 0, factor: 0 }],
      itemDamage: { threshold: 0, base: 0, factor: 0 },
      blockSound: 'minecraft:item.shield.block',
      disabledSound: 'minecraft:item.shield.break',
      bypassedBy: '#minecraft:axes',
    })
    const validReduction = valid.damageReductions[0]
    const validItemDamage = valid.itemDamage
    if (validItemDamage === undefined) {
      throw new Error('expected item damage rule')
    }

    expect(isDamageResistantComponent(damageResistantComponent('minecraft:fire'))).toBe(true)
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

import { describe, expect, it } from 'vitest'
import {
  CONSUMABLE_ANIMATIONS,
  DEFAULT_CONSUMABLE_COMPONENT,
  consumableApplyEffects,
  consumableClearAllEffects,
  consumableComponent,
  consumableComponentOf,
  consumablePlaySound,
  consumableRemoveEffects,
  consumableStatusEffect,
  consumableTeleportRandomly,
  foodComponentOf,
  isConsumableComponent,
  isConsumableEffect,
  isConsumableStatusEffect,
  isFoodComponent,
  isItemUseComponents,
  itemUseComponentsOf,
  isUseRemainderComponent,
  useRemainderComponentOf,
} from '../src/domain/consumable'
import { FOOD_DEFINITION_BY_ITEM } from '../src/domain/food'
import { ResourceLocation } from '../src/domain/identifiers'

describe('consumable item components', () => {
  it('publishes the official animation vocabulary and defaults', () => {
    expect(CONSUMABLE_ANIMATIONS).toEqual([
      'none',
      'eat',
      'drink',
      'block',
      'bow',
      'spear',
      'crossbow',
      'spyglass',
      'toot_horn',
      'brush',
    ])
    expect(DEFAULT_CONSUMABLE_COMPONENT).toEqual({
      consumeSeconds: 1.6,
      animation: 'eat',
      sound: 'entity.generic.eat',
      hasConsumeParticles: true,
      onConsumeEffects: [],
    })
  })

  it('projects food values and the default consumable component', () => {
    expect(foodComponentOf('golden_carrot')).toEqual({
      nutrition: 6,
      saturation: 14.4,
      canAlwaysEat: false,
    })
    expect(consumableComponentOf('golden_carrot')).toEqual(DEFAULT_CONSUMABLE_COMPONENT)
  })

  it('guards official component values without unsafe casts', () => {
    const statusEffect = consumableStatusEffect(ResourceLocation('minecraft:speed'), 30, 0)
    const applyEffects = consumableApplyEffects([statusEffect])
    const removeEffects = consumableRemoveEffects([ResourceLocation('minecraft:poison')])
    const clearAllEffects = consumableClearAllEffects()
    const teleportRandomly = consumableTeleportRandomly()
    const playSound = consumablePlaySound(ResourceLocation('entity.player.burp'))
    const food = foodComponentOf('golden_carrot')
    const useComponents = itemUseComponentsOf('honey_bottle')
    if (food === undefined || useComponents === undefined) {
      throw new Error('expected static food components')
    }

    expect(isFoodComponent(food)).toBe(true)
    expect(isFoodComponent(null)).toBe(false)
    expect(isFoodComponent([])).toBe(false)
    expect(isFoodComponent({ nutrition: -1, saturation: 1, canAlwaysEat: false })).toBe(false)
    expect(isFoodComponent({ nutrition: 1, saturation: Number.NaN, canAlwaysEat: false })).toBe(false)
    expect(isFoodComponent({ nutrition: 1, saturation: 1, canAlwaysEat: 'no' })).toBe(false)
    expect(isFoodComponent({ nutrition: 1, saturation: 1, canAlwaysEat: false, extra: true })).toBe(false)

    expect(isConsumableStatusEffect(statusEffect)).toBe(true)
    expect(isConsumableStatusEffect({ effectId: 'minecraft:', durationSecs: 30, amplifier: 0 })).toBe(false)
    expect(isConsumableStatusEffect({ effectId: 1, durationSecs: 30, amplifier: 0 })).toBe(false)
    expect(isConsumableStatusEffect({ effectId: 'minecraft:speed', durationSecs: '30', amplifier: 0 })).toBe(false)
    expect(isConsumableStatusEffect({ effectId: 'minecraft:speed', durationSecs: Number.NaN, amplifier: 0 })).toBe(false)
    expect(isConsumableStatusEffect({ effectId: 'minecraft:speed', durationSecs: 0, amplifier: 0 })).toBe(false)
    expect(isConsumableStatusEffect({ effectId: 'minecraft:speed', durationSecs: 30, amplifier: -1 })).toBe(false)
    expect(isConsumableStatusEffect({ effectId: 'minecraft:speed', durationSecs: 30, amplifier: 0.5 })).toBe(false)

    expect(isConsumableEffect(null)).toBe(false)
    expect(isConsumableEffect({ type: 1 })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:unknown' })).toBe(false)
    expect(isConsumableEffect(applyEffects)).toBe(true)
    expect(isConsumableEffect(removeEffects)).toBe(true)
    expect(isConsumableEffect(clearAllEffects)).toBe(true)
    expect(isConsumableEffect(teleportRandomly)).toBe(true)
    expect(isConsumableEffect(playSound)).toBe(true)
    expect(
      isConsumableEffect({ type: 'minecraft:apply_effects', effects: [], probability: 1, extra: true }),
    ).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:apply_effects', effects: 'bad', probability: 1 })).toBe(false)
    expect(
      isConsumableEffect({ type: 'minecraft:apply_effects', effects: [{}], probability: 1 }),
    ).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:apply_effects', effects: [], probability: '1' })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:apply_effects', effects: [], probability: Number.NaN })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:apply_effects', effects: [], probability: -0.1 })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:apply_effects', effects: [], probability: 1.1 })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:remove_effects' })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:remove_effects', effects: [1] })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:remove_effects', effects: ['minecraft:'] })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:remove_effects', effects: [], extra: true })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:clear_all_effects', extra: true })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:clear_all_effects', value: true })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:teleport_randomly' })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:teleport_randomly', diameter: '16' })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:teleport_randomly', diameter: Number.NaN })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:teleport_randomly', diameter: 0 })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:teleport_randomly', diameter: 16, extra: true })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:play_sound' })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:play_sound', sound: 'minecraft:' })).toBe(false)
    expect(isConsumableEffect({ type: 'minecraft:play_sound', sound: 'entity.player.burp', extra: true })).toBe(false)

    const consumable = useComponents.consumable
    expect(isConsumableComponent(consumable)).toBe(true)
    expect(isConsumableComponent(null)).toBe(false)
    expect(isConsumableComponent({ ...consumable, consumeSeconds: -1 })).toBe(false)
    expect(isConsumableComponent({ ...consumable, consumeSeconds: Number.NaN })).toBe(false)
    expect(isConsumableComponent({ ...consumable, animation: 'invalid' })).toBe(false)
    expect(isConsumableComponent({ ...consumable, sound: 'minecraft:' })).toBe(false)
    expect(isConsumableComponent({ ...consumable, hasConsumeParticles: 1 })).toBe(false)
    expect(isConsumableComponent({ ...consumable, onConsumeEffects: 'bad' })).toBe(false)
    expect(isConsumableComponent({ ...consumable, onConsumeEffects: [{}] })).toBe(false)
    expect(isConsumableComponent({ ...consumable, extra: true })).toBe(false)

    const remainder = useComponents.useRemainder
    if (remainder === undefined) {
      throw new Error('expected honey bottle remainder')
    }
    expect(isUseRemainderComponent(remainder)).toBe(true)
    expect(isUseRemainderComponent(null)).toBe(false)
    expect(isUseRemainderComponent({ item: 'unobtainium', count: 1 })).toBe(false)
    expect(isUseRemainderComponent({ item: 'glass_bottle', count: 2 })).toBe(false)
    expect(isUseRemainderComponent({ item: 'glass_bottle', count: 1, extra: true })).toBe(false)

    expect(isItemUseComponents(useComponents)).toBe(true)
    expect(isItemUseComponents(null)).toBe(false)
    expect(isItemUseComponents({ ...useComponents, food: {} })).toBe(false)
    expect(isItemUseComponents({ ...useComponents, consumable: {} })).toBe(false)
    expect(isItemUseComponents({ ...useComponents, useRemainder: {} })).toBe(false)
    expect(
      isItemUseComponents({ food, consumable, useRemainder: undefined }),
    ).toBe(true)
    expect(isItemUseComponents({ ...useComponents, extra: true })).toBe(false)
  })

  it('constructs every official consume effect and component variant', () => {
    const statusEffect = consumableStatusEffect(ResourceLocation('minecraft:speed'), 30, 1)
    expect(statusEffect).toEqual({
      effectId: 'minecraft:speed',
      durationSecs: 30,
      amplifier: 1,
    })
    expect(consumableApplyEffects([statusEffect])).toEqual({
      type: 'minecraft:apply_effects',
      effects: [statusEffect],
      probability: 1,
    })
    expect(consumableApplyEffects([statusEffect], 0.5)).toEqual({
      type: 'minecraft:apply_effects',
      effects: [statusEffect],
      probability: 0.5,
    })
    expect(consumableRemoveEffects([ResourceLocation('minecraft:poison')])).toEqual({
      type: 'minecraft:remove_effects',
      effects: ['minecraft:poison'],
    })
    expect(consumableClearAllEffects()).toEqual({ type: 'minecraft:clear_all_effects' })
    expect(consumableTeleportRandomly()).toEqual({ type: 'minecraft:teleport_randomly', diameter: 16 })
    expect(consumableTeleportRandomly(8)).toEqual({ type: 'minecraft:teleport_randomly', diameter: 8 })
    expect(consumablePlaySound(ResourceLocation('entity.player.burp'))).toEqual({
      type: 'minecraft:play_sound',
      sound: 'entity.player.burp',
    })
    expect(consumableComponent()).toEqual(DEFAULT_CONSUMABLE_COMPONENT)
    expect(
      consumableComponent({
        consumeSeconds: 2,
        animation: 'drink',
        sound: ResourceLocation('item.bottle.fill'),
        hasConsumeParticles: false,
        onConsumeEffects: [consumableClearAllEffects()],
      }),
    ).toEqual({
      consumeSeconds: 2,
      animation: 'drink',
      sound: 'item.bottle.fill',
      hasConsumeParticles: false,
      onConsumeEffects: [{ type: 'minecraft:clear_all_effects' }],
    })
  })

  it('rejects invalid numeric values at the component boundary', () => {
    const effectId = ResourceLocation('minecraft:speed')

    expect(() => consumableStatusEffect(effectId, 0, 0)).toThrow()
    expect(() => consumableStatusEffect(effectId, Number.NaN, 0)).toThrow()
    expect(() => consumableStatusEffect(effectId, 30, -1)).toThrow()
    expect(() => consumableStatusEffect(effectId, 30, 0.5)).toThrow()
    expect(() => consumableApplyEffects([], -0.1)).toThrow()
    expect(() => consumableApplyEffects([], 1.1)).toThrow()
    expect(() => consumableApplyEffects([], Number.NaN)).toThrow()
    expect(() => consumableTeleportRandomly(0)).toThrow()
    expect(() => consumableTeleportRandomly(Number.POSITIVE_INFINITY)).toThrow()
    expect(consumableComponent({ consumeSeconds: 0 }).consumeSeconds).toBe(0)
    expect(() => consumableComponent({ consumeSeconds: Number.NaN })).toThrow()
    expect(() => consumableComponent({ consumeSeconds: Number.POSITIVE_INFINITY })).toThrow()
  })

  it('projects status effects with namespaced ids and probabilities', () => {
    expect(consumableComponentOf('pufferfish')?.onConsumeEffects).toEqual([
      {
        type: 'minecraft:apply_effects',
        effects: [{ effectId: 'minecraft:poison', durationSecs: 60, amplifier: 1 }],
        probability: 1,
      },
      {
        type: 'minecraft:apply_effects',
        effects: [{ effectId: 'minecraft:nausea', durationSecs: 15, amplifier: 1 }],
        probability: 1,
      },
      {
        type: 'minecraft:apply_effects',
        effects: [{ effectId: 'minecraft:hunger', durationSecs: 15, amplifier: 2 }],
        probability: 1,
      },
    ])
  })

  it('projects teleport, removal, and remainder components', () => {
    expect(consumableComponentOf('chorus_fruit')?.onConsumeEffects).toEqual([
      { type: 'minecraft:teleport_randomly', diameter: 16 },
    ])
    expect(consumableComponentOf('honey_bottle')?.onConsumeEffects).toEqual([
      { type: 'minecraft:remove_effects', effects: ['minecraft:poison'] },
    ])
    expect(useRemainderComponentOf('honey_bottle')).toEqual({ item: 'glass_bottle', count: 1 })
    expect(useRemainderComponentOf('beetroot_soup')).toEqual({ item: 'bowl', count: 1 })
  })

  it('covers every static food definition and rejects non-food items', () => {
    for (const [item, definition] of FOOD_DEFINITION_BY_ITEM) {
      const components = itemUseComponentsOf(item)
      if (components === undefined) {
        throw new Error(`Missing item use components for ${item}`)
      }

      expect(components.food).toEqual({
        nutrition: definition.nutrition,
        saturation: definition.saturation,
        canAlwaysEat: definition.canAlwaysEat,
      })
      expect(components.consumable).toBeDefined()
      expect(useRemainderComponentOf(item)).toEqual(
        definition.useRemainder === undefined
          ? undefined
          : { item: definition.useRemainder, count: 1 },
      )
      expect(foodComponentOf(item)).toBe(components.food)
      expect(consumableComponentOf(item)).toBe(components.consumable)
    }

    expect(itemUseComponentsOf('stick')).toBeUndefined()
    expect(foodComponentOf('stick')).toBeUndefined()
    expect(consumableComponentOf('stick')).toBeUndefined()
    expect(useRemainderComponentOf('stick')).toBeUndefined()
  })
})

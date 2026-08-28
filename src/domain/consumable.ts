import {
  FOOD_DEFINITION_BY_ITEM,
  type FoodDefinition,
  type FoodEffect,
} from './food-data.js'
import {
  DEFAULT_CONSUMABLE_COMPONENT,
  type ConsumableApplyEffects,
  type ConsumableClearAllEffects,
  type ConsumableComponent,
  type ConsumableComponentOptions,
  type ConsumableEffect,
  type ConsumablePlaySound,
  type ConsumableRemoveEffects,
  type ConsumableStatusEffect,
  type ConsumableTeleportRandomly,
  type FoodComponent,
  type ItemUseComponents,
  type UseRemainderComponent,
} from './consumable-data.js'
import { ResourceLocation } from './identifiers.js'
import type { FoodStatusEffectName } from './food-data.js'
import type { ItemType } from './item-type.js'
import { ConsumeSeconds } from './quantities.js'

export {
  CONSUMABLE_ANIMATIONS,
  DEFAULT_CONSUMABLE_COMPONENT,
  type ConsumableAnimation,
  type ConsumableApplyEffects,
  type ConsumableClearAllEffects,
  type ConsumableComponent,
  type ConsumableComponentOptions,
  type ConsumableEffect,
  type ConsumablePlaySound,
  type ConsumableRemoveEffects,
  type ConsumableStatusEffect,
  type ConsumableTeleportRandomly,
  type FoodComponent,
  type ItemUseComponents,
  type UseRemainderComponent,
} from './consumable-data.js'
export {
  isConsumableComponent,
  isConsumableEffect,
  isConsumableStatusEffect,
  isFoodComponent,
  isItemUseComponents,
  isUseRemainderComponent,
} from './consumable-validation.js'

const namespacedEffectIdOf = (name: FoodStatusEffectName): ResourceLocation => ResourceLocation(`minecraft:${name}`)

const assertFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite, received ${value}`)
  }
}

const assertPositive = (name: string, value: number): void => {
  assertFinite(name, value)
  if (value <= 0) {
    throw new RangeError(`${name} must be positive, received ${value}`)
  }
}

const assertNonNegativeInteger = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer, received ${value}`)
  }
}

const assertProbability = (value: number): void => {
  assertFinite('probability', value)
  if (value < 0 || value > 1) {
    throw new RangeError(`probability must be in [0, 1], received ${value}`)
  }
}

export const consumableStatusEffect = (
  effectId: ResourceLocation,
  durationSecs: number,
  amplifier: number,
): ConsumableStatusEffect => {
  assertPositive('durationSecs', durationSecs)
  assertNonNegativeInteger('amplifier', amplifier)
  return { effectId, durationSecs, amplifier }
}

export const consumableApplyEffects = (
  effects: ReadonlyArray<ConsumableStatusEffect>,
  probability = 1,
): ConsumableApplyEffects => {
  assertProbability(probability)
  return { type: 'minecraft:apply_effects', effects, probability }
}

export const consumableRemoveEffects = (
  effects: ReadonlyArray<ResourceLocation>,
): ConsumableRemoveEffects => ({ type: 'minecraft:remove_effects', effects })

export const consumableClearAllEffects = (): ConsumableClearAllEffects => ({
  type: 'minecraft:clear_all_effects',
})

export const consumableTeleportRandomly = (diameter = 16): ConsumableTeleportRandomly => {
  assertPositive('diameter', diameter)
  return { type: 'minecraft:teleport_randomly', diameter }
}

export const consumablePlaySound = (sound: ResourceLocation): ConsumablePlaySound => ({
  type: 'minecraft:play_sound',
  sound,
})

export const consumableComponent = (
  options: ConsumableComponentOptions = {},
): ConsumableComponent => {
  const consumeSeconds =
    options.consumeSeconds === undefined
      ? DEFAULT_CONSUMABLE_COMPONENT.consumeSeconds
      : ConsumeSeconds(options.consumeSeconds)

  return {
    consumeSeconds,
    animation: options.animation ?? DEFAULT_CONSUMABLE_COMPONENT.animation,
    sound: options.sound ?? DEFAULT_CONSUMABLE_COMPONENT.sound,
    hasConsumeParticles: options.hasConsumeParticles ?? DEFAULT_CONSUMABLE_COMPONENT.hasConsumeParticles,
    onConsumeEffects: options.onConsumeEffects ?? DEFAULT_CONSUMABLE_COMPONENT.onConsumeEffects,
  }
}

const statusEffectOf = (effect: Extract<FoodEffect, { readonly kind: 'status' }>): ConsumableStatusEffect =>
  consumableStatusEffect(namespacedEffectIdOf(effect.name), effect.durationSecs, effect.amplifier)

const applyEffectsOf = (effect: Extract<FoodEffect, { readonly kind: 'status' }>): ConsumableApplyEffects =>
  consumableApplyEffects([statusEffectOf(effect)], effect.chance)

const removeEffectsOf = (effect: Extract<FoodEffect, { readonly kind: 'remove' }>): ConsumableRemoveEffects =>
  consumableRemoveEffects([namespacedEffectIdOf(effect.name)])

const teleportRandomlyOf = (
  _effect: Extract<FoodEffect, { readonly kind: 'teleport' }>,
): ConsumableTeleportRandomly => consumableTeleportRandomly()

const consumableEffectOf = (effect: FoodEffect): ConsumableEffect =>
  effect.kind === 'status'
    ? applyEffectsOf(effect)
    : effect.kind === 'remove'
      ? removeEffectsOf(effect)
      : teleportRandomlyOf(effect)

const foodComponentFrom = (definition: FoodDefinition): FoodComponent => ({
  nutrition: definition.nutrition,
  saturation: definition.saturation,
  canAlwaysEat: definition.canAlwaysEat,
})

const consumableComponentFrom = (definition: FoodDefinition): ConsumableComponent =>
  consumableComponent({ onConsumeEffects: definition.effects.map(consumableEffectOf) })

const useRemainderComponentFrom = (definition: FoodDefinition): UseRemainderComponent | undefined =>
  definition.useRemainder === undefined
    ? undefined
    : {
        item: definition.useRemainder,
        count: 1,
      }

const itemUseComponentsFrom = (definition: FoodDefinition): ItemUseComponents => ({
  food: foodComponentFrom(definition),
  consumable: consumableComponentFrom(definition),
  useRemainder: useRemainderComponentFrom(definition),
})

const itemUseComponentEntries: ReadonlyArray<readonly [ItemType, ItemUseComponents]> = [
  ...FOOD_DEFINITION_BY_ITEM,
].map(([item, definition]) => [item, itemUseComponentsFrom(definition)])

const ITEM_USE_COMPONENTS_BY_ITEM: ReadonlyMap<ItemType, ItemUseComponents> = new Map(itemUseComponentEntries)

export const foodComponentOf = (item: ItemType): FoodComponent | undefined =>
  ITEM_USE_COMPONENTS_BY_ITEM.get(item)?.food

export const consumableComponentOf = (item: ItemType): ConsumableComponent | undefined =>
  ITEM_USE_COMPONENTS_BY_ITEM.get(item)?.consumable

export const useRemainderComponentOf = (item: ItemType): UseRemainderComponent | undefined =>
  ITEM_USE_COMPONENTS_BY_ITEM.get(item)?.useRemainder

export const itemUseComponentsOf = (item: ItemType): ItemUseComponents | undefined =>
  ITEM_USE_COMPONENTS_BY_ITEM.get(item)

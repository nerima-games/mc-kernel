import { Result } from 'effect'
import {
  FOOD_DEFINITION_BY_ITEM,
  type FoodDefinition,
  type FoodEffect,
} from './food-data.js'
import {
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
import { isConsumableEffect } from './consumable-validation.js'
import { ResourceLocation, type ResourceLocation as ResourceLocationType } from '../text/identifiers.js'
import type { FoodStatusEffectName } from './food-data.js'
import type { ItemType } from './item-type.js'
import { ConsumeSeconds } from '../time/quantities.js'
import { statusEffectId } from '../entity/status-effect-data.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'
import { MAX_GENERIC_INPUT_ARRAY_LENGTH, snapshotInputRecord, snapshotInputValue } from '../../input-snapshot.js'
import {
  EffectAmplifier,
  EffectDurationSecs,
  FoodEffectProbability,
  RandomTeleportDiameter,
} from './item-primitives.js'

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

const namespacedEffectIdOf = (name: FoodStatusEffectName): ResourceLocation => statusEffectId(name)

const brandValue = <A, E extends Readonly<{ readonly message: string }>>(
  result: Result.Result<A, E>,
  name: string,
  message: string,
  value: unknown,
): Result.Result<A, ItemValidationFailure> =>
  Result.mapError(result, () => itemValidationFailure(name, message, 'out-of-range', value))

export const consumableStatusEffect = (
  effectId: ResourceLocation,
  durationSecs: EffectDurationSecs,
  amplifier: EffectAmplifier,
): Result.Result<ConsumableStatusEffect, ItemValidationFailure> => Result.gen(function* () {
  const checkedDuration = yield* brandValue(
    EffectDurationSecs.result(durationSecs),
    'durationSecs',
    'durationSecs must be positive',
    durationSecs,
  )
  const checkedAmplifier = yield* brandValue(
    EffectAmplifier.result(amplifier),
    'amplifier',
    `amplifier must be a non-negative integer, received ${amplifier}`,
    amplifier,
  )
  return { effectId, durationSecs: checkedDuration, amplifier: checkedAmplifier }
})

export const consumableApplyEffects = (
  effects: ReadonlyArray<ConsumableStatusEffect>,
  probability: FoodEffectProbability = FoodEffectProbability(1),
): Result.Result<ConsumableApplyEffects, ItemValidationFailure> =>
  Result.map(
    brandValue(
      FoodEffectProbability.result(probability),
      'probability',
      `probability must be in [0, 1], received ${probability}`,
      probability,
    ),
    (checkedProbability) => ({ type: 'minecraft:apply_effects', effects, probability: checkedProbability }),
  )

export const consumableRemoveEffects = (
  effects: ReadonlyArray<ResourceLocation>,
): ConsumableRemoveEffects => ({ type: 'minecraft:remove_effects', effects })

export const consumableClearAllEffects = (): ConsumableClearAllEffects => ({
  type: 'minecraft:clear_all_effects',
})

export const consumableTeleportRandomly = (
  diameter: RandomTeleportDiameter = RandomTeleportDiameter(16),
): Result.Result<ConsumableTeleportRandomly, ItemValidationFailure> =>
  Result.map(
    brandValue(
      RandomTeleportDiameter.result(diameter),
      'diameter',
      'diameter must be positive',
      diameter,
    ),
    (checkedDiameter) => ({ type: 'minecraft:teleport_randomly', diameter: checkedDiameter }),
  )

export const consumablePlaySound = (sound: ResourceLocation): ConsumablePlaySound => ({
  type: 'minecraft:play_sound',
  sound,
})

const snapshotConsumableOptions = (value: unknown): Result.Result<Readonly<Record<string, unknown>>, ItemValidationFailure> => {
  const snapshot = snapshotInputRecord(value, ['consumeSeconds', 'animation', 'sound', 'hasConsumeParticles', 'onConsumeEffects'])
  if (Result.isFailure(snapshot)) {
    const invalidType = snapshot.failure.reason === 'invalid-container' || snapshot.failure.reason === 'unsupported-prototype'
    return Result.fail(itemValidationFailure(
      'options',
      invalidType ? 'Consumable component options must be a non-null object' : 'Unable to inspect consumable component options',
      invalidType ? 'invalid-type' : 'hostile-input',
      value,
    ))
  }
  return Result.succeed(snapshot.success)
}

const isConsumableAnimation = (value: unknown): value is ConsumableAnimation =>
  typeof value === 'string' && CONSUMABLE_ANIMATIONS.some((animation) => animation === value)

export const consumableComponent = (
  options: ConsumableComponentOptions = {},
): Result.Result<ConsumableComponent, ItemValidationFailure> => {
  const snapshot = snapshotConsumableOptions(options)
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)
  const input = snapshot.success
  return Result.gen(function* () {
    const consumeSecondsValue = input['consumeSeconds'] === undefined
      ? DEFAULT_CONSUMABLE_COMPONENT.consumeSeconds
      : input['consumeSeconds']
    if (typeof consumeSecondsValue !== 'number') {
      return yield* Result.fail(itemValidationFailure(
        'consumeSeconds',
        'consumeSeconds must be finite and non-negative',
        'out-of-range',
        consumeSecondsValue,
      ))
    }
    const consumeSeconds = yield* Result.mapError(
      ConsumeSeconds.result(consumeSecondsValue),
      () => itemValidationFailure('consumeSeconds', 'consumeSeconds must be finite and non-negative', 'out-of-range', consumeSecondsValue),
    )

    const animationValue = input['animation'] === undefined
      ? DEFAULT_CONSUMABLE_COMPONENT.animation
      : input['animation']
    if (!isConsumableAnimation(animationValue)) {
      return yield* Result.fail(itemValidationFailure('animation', 'animation must be a valid consumable animation', 'invalid-value', animationValue))
    }
    const animation = animationValue

    const soundValue = input['sound'] === undefined ? DEFAULT_CONSUMABLE_COMPONENT.sound : input['sound']
    if (typeof soundValue !== 'string' || !ResourceLocation.is(soundValue)) {
      return yield* Result.fail(itemValidationFailure('sound', 'sound must be a valid resource location', 'invalid-value', soundValue))
    }
    const sound: ResourceLocationType = soundValue

    const hasConsumeParticlesValue = input['hasConsumeParticles'] === undefined
      ? DEFAULT_CONSUMABLE_COMPONENT.hasConsumeParticles
      : input['hasConsumeParticles']
    if (typeof hasConsumeParticlesValue !== 'boolean') {
      return yield* Result.fail(itemValidationFailure('hasConsumeParticles', 'hasConsumeParticles must be a boolean', 'invalid-type', hasConsumeParticlesValue))
    }

    const effectsValue = input['onConsumeEffects'] === undefined
      ? DEFAULT_CONSUMABLE_COMPONENT.onConsumeEffects
      : input['onConsumeEffects']
    const effectsSnapshot = snapshotInputValue(effectsValue, MAX_GENERIC_INPUT_ARRAY_LENGTH, 'onConsumeEffects')
    if (Result.isFailure(effectsSnapshot)) {
      const reason = effectsSnapshot.failure.reason === 'too-large' ? 'out-of-range' : 'hostile-input'
      // This snapshot call always supplies the root path prefix above.
      const errorPath = effectsSnapshot.failure.path
      return yield* Result.fail(itemValidationFailure(
        errorPath,
        `Unable to inspect ${errorPath}`,
        reason,
        effectsSnapshot.failure.value,
      ))
    }
    if (!Array.isArray(effectsSnapshot.success)) {
      return yield* Result.fail(itemValidationFailure('onConsumeEffects', 'onConsumeEffects must be an array of valid consumable effects', 'invalid-type', effectsSnapshot.success))
    }
    const onConsumeEffects: ConsumableEffect[] = []
    for (const effect of effectsSnapshot.success) {
      if (!isConsumableEffect(effect)) {
        return yield* Result.fail(itemValidationFailure('onConsumeEffects', 'onConsumeEffects must be an array of valid consumable effects', 'invalid-value', effect))
      }
      onConsumeEffects.push(effect)
    }
    return Object.freeze({
      consumeSeconds,
      animation,
      sound,
      hasConsumeParticles: hasConsumeParticlesValue,
      onConsumeEffects: Object.freeze(onConsumeEffects),
    })
  })
}

const statusEffectOf = (effect: Extract<FoodEffect, { readonly kind: 'status' }>): ConsumableStatusEffect => Object.freeze({
  effectId: namespacedEffectIdOf(effect.name),
  durationSecs: effect.durationSecs,
  amplifier: effect.amplifier,
})

const applyEffectsOf = (effect: Extract<FoodEffect, { readonly kind: 'status' }>): ConsumableApplyEffects => Object.freeze({
  type: 'minecraft:apply_effects',
  effects: Object.freeze([statusEffectOf(effect)]),
  probability: effect.chance,
})

const removeEffectsOf = (effect: Extract<FoodEffect, { readonly kind: 'remove' }>): ConsumableRemoveEffects =>
  Object.freeze(consumableRemoveEffects(Object.freeze([namespacedEffectIdOf(effect.name)])))

const teleportRandomlyOf = (
  _effect: Extract<FoodEffect, { readonly kind: 'teleport' }>,
): ConsumableTeleportRandomly => Object.freeze({ type: 'minecraft:teleport_randomly', diameter: RandomTeleportDiameter(16) })

const consumableEffectOf = (effect: FoodEffect): ConsumableEffect =>
  effect.kind === 'status'
    ? applyEffectsOf(effect)
    : effect.kind === 'remove'
      ? removeEffectsOf(effect)
      : teleportRandomlyOf(effect)

const foodComponentFrom = (definition: FoodDefinition): FoodComponent => Object.freeze({
  nutrition: definition.nutrition,
  saturation: definition.saturation,
  canAlwaysEat: definition.canAlwaysEat,
})

const consumableComponentFrom = (definition: FoodDefinition): ConsumableComponent =>
  Object.freeze({
    ...DEFAULT_CONSUMABLE_COMPONENT,
    onConsumeEffects: Object.freeze(definition.effects.map(consumableEffectOf)),
  })

const useRemainderComponentFrom = (definition: FoodDefinition): UseRemainderComponent | undefined =>
  definition.useRemainder === undefined
    ? undefined
    : Object.freeze({
        item: definition.useRemainder,
        count: 1,
      })

const itemUseComponentsFrom = (definition: FoodDefinition): ItemUseComponents => Object.freeze({
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

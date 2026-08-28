import type { ItemType } from './item-type.js'
import { ResourceLocation, type ResourceLocation as ResourceLocationType } from './identifiers.js'
import { ConsumeSeconds, type ConsumeSeconds as ConsumeSecondsType } from './quantities.js'

export const CONSUMABLE_ANIMATIONS = [
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
] as const

export type ConsumableAnimation = (typeof CONSUMABLE_ANIMATIONS)[number]

export type FoodComponent = Readonly<{
  readonly nutrition: number
  readonly saturation: number
  readonly canAlwaysEat: boolean
}>

export type ConsumableStatusEffect = Readonly<{
  readonly effectId: ResourceLocationType
  readonly durationSecs: number
  readonly amplifier: number
}>

export type ConsumableApplyEffects = Readonly<{
  readonly type: 'minecraft:apply_effects'
  readonly effects: ReadonlyArray<ConsumableStatusEffect>
  readonly probability: number
}>

export type ConsumableRemoveEffects = Readonly<{
  readonly type: 'minecraft:remove_effects'
  readonly effects: ReadonlyArray<ResourceLocationType>
}>

export type ConsumableClearAllEffects = Readonly<{
  readonly type: 'minecraft:clear_all_effects'
}>

export type ConsumableTeleportRandomly = Readonly<{
  readonly type: 'minecraft:teleport_randomly'
  readonly diameter: number
}>

export type ConsumablePlaySound = Readonly<{
  readonly type: 'minecraft:play_sound'
  readonly sound: ResourceLocationType
}>

export type ConsumableEffect =
  | ConsumableApplyEffects
  | ConsumableRemoveEffects
  | ConsumableClearAllEffects
  | ConsumableTeleportRandomly
  | ConsumablePlaySound

export type ConsumableComponent = Readonly<{
  readonly consumeSeconds: ConsumeSecondsType
  readonly animation: ConsumableAnimation
  readonly sound: ResourceLocationType
  readonly hasConsumeParticles: boolean
  readonly onConsumeEffects: ReadonlyArray<ConsumableEffect>
}>

export type ConsumableComponentOptions = Readonly<{
  readonly consumeSeconds?: number
  readonly animation?: ConsumableAnimation
  readonly sound?: ResourceLocationType
  readonly hasConsumeParticles?: boolean
  readonly onConsumeEffects?: ReadonlyArray<ConsumableEffect>
}>

export type UseRemainderComponent = Readonly<{
  readonly item: ItemType
  readonly count: 1
}>

export type ItemUseComponents = Readonly<{
  readonly food: FoodComponent
  readonly consumable: ConsumableComponent
  readonly useRemainder: UseRemainderComponent | undefined
}>

export const DEFAULT_CONSUMABLE_COMPONENT: ConsumableComponent = {
  consumeSeconds: ConsumeSeconds(1.6),
  animation: 'eat',
  sound: ResourceLocation('entity.generic.eat'),
  hasConsumeParticles: true,
  onConsumeEffects: [],
}

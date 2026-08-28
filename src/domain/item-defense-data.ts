/** Portable data contracts for Java item defense components. */
import type { ResourceLocation } from './identifiers.js'
import type { ResourceLocationProvider } from './item-component-values-data.js'
import type {
  BlockingDelaySeconds,
  DamageReductionBase,
  DamageReductionFactor,
  DisableCooldownScale,
  HorizontalBlockingAngle,
  ItemDamageBase,
  ItemDamageFactor,
  ItemDamageThreshold,
} from './quantities.js'

export type DamageResistantComponent = Readonly<{
  readonly types: ResourceLocationProvider
}>

export type DamageReductionRule = Readonly<{
  readonly type: ResourceLocationProvider | undefined
  readonly base: DamageReductionBase
  readonly factor: DamageReductionFactor
  readonly horizontalBlockingAngle: HorizontalBlockingAngle
}>

export type ItemDamageRule = Readonly<{
  readonly threshold: ItemDamageThreshold
  readonly base: ItemDamageBase
  readonly factor: ItemDamageFactor
}>

export type BlocksAttacksComponent = Readonly<{
  readonly blockDelaySeconds: BlockingDelaySeconds
  readonly disableCooldownScale: DisableCooldownScale
  readonly damageReductions: ReadonlyArray<DamageReductionRule>
  readonly itemDamage: ItemDamageRule | undefined
  readonly blockSound: ResourceLocation | undefined
  readonly disabledSound: ResourceLocation | undefined
  readonly bypassedBy: ResourceLocationProvider | undefined
}>

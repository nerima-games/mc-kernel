/** Portable data contracts for current Java item attribute modifiers. */
import type { ResourceLocation } from './identifiers.js'
import type { AttributeModifierAmount } from './quantities.js'
import type { TextComponent } from './text-component-data.js'

export type { TextComponent, TextComponentObject, TextComponentValue } from './text-component-data.js'

export const ATTRIBUTE_MODIFIER_OPERATIONS = [
  'add_value',
  'add_multiplied_base',
  'add_multiplied_total',
] as const

export type AttributeModifierOperation = (typeof ATTRIBUTE_MODIFIER_OPERATIONS)[number]

export const ATTRIBUTE_MODIFIER_SLOTS = [
  'any',
  'hand',
  'mainhand',
  'offhand',
  'feet',
  'legs',
  'chest',
  'head',
  'armor',
  'body',
] as const

export type AttributeModifierSlot = (typeof ATTRIBUTE_MODIFIER_SLOTS)[number]

export type AttributeModifierDisplay =
  | Readonly<{ readonly type: 'default' }>
  | Readonly<{ readonly type: 'hidden' }>
  | Readonly<{ readonly type: 'override'; readonly value: TextComponent }>

export type AttributeModifier = Readonly<{
  readonly type: ResourceLocation
  readonly id: ResourceLocation
  readonly amount: AttributeModifierAmount
  readonly operation: AttributeModifierOperation
  readonly slot: AttributeModifierSlot
  readonly display?: AttributeModifierDisplay
}>

export type AttributeModifiersComponent = ReadonlyArray<AttributeModifier>

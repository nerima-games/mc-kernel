import { ResourceLocation, TagLocation } from './identifiers.js'
import type {
  ResourceLocation as ResourceLocationValue,
  TagLocation as TagLocationValue,
} from './identifiers.js'
import type { AttributeModifierAmount } from './quantities.js'

export const SULFUR_CUBE_ARCHETYPE_REGISTRY: ResourceLocation = ResourceLocation(
  'minecraft:sulfur_cube_archetype',
)

export const SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS: readonly [
  'add_value',
  'add_multiplied_base',
  'add_multiplied_total',
] = Object.freeze(['add_value', 'add_multiplied_base', 'add_multiplied_total'])

export const SULFUR_CUBE_BLOCK_TAGS: Readonly<{
  suppressesBounce: TagLocation
  causesPeriodicGeyserEruptions: TagLocation
  causesContinuousGeyserEruptions: TagLocation
  speleothems: TagLocation
}> = Object.freeze({
  suppressesBounce: TagLocation('#suppresses_bounce'),
  causesPeriodicGeyserEruptions: TagLocation('#causes_periodic_geyser_eruptions'),
  causesContinuousGeyserEruptions: TagLocation('#causes_continuous_geyser_eruptions'),
  speleothems: TagLocation('#speleothems'),
})

export const SULFUR_CUBE_ITEM_TAGS: Readonly<{
  food: TagLocation
  swallowable: TagLocation
  archetype: Readonly<{
    regular: TagLocation
    bouncy: TagLocation
    slowFlat: TagLocation
    fastFlat: TagLocation
    light: TagLocation
    fastSliding: TagLocation
    slowSliding: TagLocation
    highResistance: TagLocation
    sticky: TagLocation
    hot: TagLocation
    slowBouncy: TagLocation
  }>
}> = Object.freeze({
  food: TagLocation('#sulfur_cube_food'),
  swallowable: TagLocation('#sulfur_cube_swallowable'),
  archetype: Object.freeze({
    regular: TagLocation('#sulfur_cube_archetype/regular'),
    bouncy: TagLocation('#sulfur_cube_archetype/bouncy'),
    slowFlat: TagLocation('#sulfur_cube_archetype/slow_flat'),
    fastFlat: TagLocation('#sulfur_cube_archetype/fast_flat'),
    light: TagLocation('#sulfur_cube_archetype/light'),
    fastSliding: TagLocation('#sulfur_cube_archetype/fast_sliding'),
    slowSliding: TagLocation('#sulfur_cube_archetype/slow_sliding'),
    highResistance: TagLocation('#sulfur_cube_archetype/high_resistance'),
    sticky: TagLocation('#sulfur_cube_archetype/sticky'),
    hot: TagLocation('#sulfur_cube_archetype/hot'),
    slowBouncy: TagLocation('#sulfur_cube_archetype/slow_bouncy'),
  }),
})

export const SULFUR_CUBE_DAMAGE_TYPE_TAGS: Readonly<{
  withBlockImmuneTo: ResourceLocation
}> = Object.freeze({
  withBlockImmuneTo: ResourceLocation('minecraft:sulfur_cube_with_block_immune_to'),
})

export const SULFUR_CUBE_ENTITY_TAGS: Readonly<{
  notAffectedByGeysers: TagLocation
}> = Object.freeze({
  notAffectedByGeysers: TagLocation('#not_affected_by_geysers'),
})

export const SULFUR_CUBE_GAME_EVENTS: Readonly<{
  bounce: ResourceLocation
}> = Object.freeze({
  bounce: ResourceLocation('minecraft:bounce'),
})

export const SULFUR_CUBE_COMPONENTS: Readonly<{
  content: ResourceLocation
}> = Object.freeze({
  content: ResourceLocation('minecraft:sulfur_cube_content'),
})

export const SULFUR_CUBE_DAMAGE_TYPES: Readonly<{
  hot: ResourceLocation
}> = Object.freeze({
  hot: ResourceLocation('minecraft:sulfur_cube_hot'),
})

export const SULFUR_CUBE_PARTICLES: Readonly<{
  goo: ResourceLocation
  geyserBase: ResourceLocation
  geyserPoof: ResourceLocation
  geyserPlume: ResourceLocation
  geyser: ResourceLocation
}> = Object.freeze({
  goo: ResourceLocation('minecraft:sulfur_cube_goo'),
  geyserBase: ResourceLocation('minecraft:geyser_base'),
  geyserPoof: ResourceLocation('minecraft:geyser_poof'),
  geyserPlume: ResourceLocation('minecraft:geyser_plume'),
  geyser: ResourceLocation('minecraft:geyser'),
})

export type SulfurCubeAttributeModifierOperation =
  (typeof SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS)[number]

export type SulfurCubeExplosion = Readonly<{
  readonly fuse: number
  readonly power: number
  readonly causesFire: boolean
}>

export type SulfurCubeContactDamage = Readonly<{
  readonly amount: number
  readonly damageType: ResourceLocationValue
  readonly attributeToSource: boolean
}>

export type SulfurCubeAttributeModifier = Readonly<{
  readonly attribute: ResourceLocationValue
  readonly id: ResourceLocationValue
  readonly amount: AttributeModifierAmount
  readonly operation: SulfurCubeAttributeModifierOperation
}>

export type SulfurCubeKnockbackModifiers = Readonly<{
  readonly horizontalPower: number
  readonly verticalPower: number
}>

export type SulfurCubeSoundSettings = Readonly<{
  readonly hitSound: ResourceLocationValue
  readonly pushSound: ResourceLocationValue
  readonly pushSoundImpulseThreshold: number
  readonly pushSoundCooldown: number
}>

export type SulfurCubeArchetype = Readonly<{
  readonly items: TagLocationValue
  readonly buoyant: boolean
  readonly explosion?: SulfurCubeExplosion
  readonly contactDamage?: SulfurCubeContactDamage
  readonly attributeModifiers: ReadonlyArray<SulfurCubeAttributeModifier>
  readonly knockbackModifiers: SulfurCubeKnockbackModifiers
  readonly soundSettings: SulfurCubeSoundSettings
}>

export type SulfurCubeExplosionOptions = Readonly<{
  readonly fuse: number
  readonly power: number
  readonly causesFire: boolean
}>

export type SulfurCubeContactDamageOptions = Readonly<{
  readonly amount: number
  readonly damageType: string
  readonly attributeToSource: boolean
}>

export type SulfurCubeAttributeModifierOptions = Readonly<{
  readonly attribute: string
  readonly id: string
  readonly amount: number
  readonly operation: SulfurCubeAttributeModifierOperation
}>

export type SulfurCubeKnockbackModifiersOptions = Readonly<{
  readonly horizontalPower: number
  readonly verticalPower: number
}>

export type SulfurCubeSoundSettingsOptions = Readonly<{
  readonly hitSound: string
  readonly pushSound: string
  readonly pushSoundImpulseThreshold: number
  readonly pushSoundCooldown: number
}>

export type SulfurCubeArchetypeOptions = Readonly<{
  readonly items: string
  readonly buoyant: boolean
  readonly explosion?: SulfurCubeExplosionOptions
  readonly contactDamage?: SulfurCubeContactDamageOptions
  readonly attributeModifiers: ReadonlyArray<SulfurCubeAttributeModifierOptions>
  readonly knockbackModifiers: SulfurCubeKnockbackModifiersOptions
  readonly soundSettings: SulfurCubeSoundSettingsOptions
}>

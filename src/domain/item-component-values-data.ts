/** Portable data contracts for simple Java item components. */
import type { ResourceLocation, TagLocation, UUID } from './identifiers.js'
import type { ConsumableEffect } from './consumable-data.js'
import type { ItemStack } from './item-stack.js'
import type { ItemType } from './item-type.js'
import type { MapId } from './quantities.js'
import { STATUS_EFFECT_NAMES, statusEffectId } from './status-effect-data.js'
import type { TextComponent } from './text-component-data.js'

export const DYE_COLORS = [
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black',
] as const

export type DyeColor = (typeof DYE_COLORS)[number]

export type ItemComponentNbtPrimitive = boolean | bigint | number | string

export interface ItemComponentNbtObject {
  readonly [key: string]: ItemComponentNbtValue
}

export interface ItemComponentNbtArray extends ReadonlyArray<ItemComponentNbtValue> {}

export type ItemComponentNbtValue = ItemComponentNbtPrimitive | ItemComponentNbtArray | ItemComponentNbtObject

export type CustomDataComponent = Readonly<ItemComponentNbtObject>

export type EntityDataComponent = Readonly<
  ItemComponentNbtObject & { readonly id: ResourceLocation }
>

export type EntityDataOptions = Readonly<ItemComponentNbtObject & { readonly id: string }>

export type BucketEntityDataComponent = Readonly<ItemComponentNbtObject>

export type BucketEntityDataOptions = Readonly<ItemComponentNbtObject>

export type BlockEntityDataComponent = Readonly<
  ItemComponentNbtObject & { readonly id: ResourceLocation }
>

export type BlockEntityDataOptions = Readonly<ItemComponentNbtObject & { readonly id: string }>

export type ProfilePropertyComponent = Readonly<{
  readonly name: string
  readonly value: string
  readonly signature?: string
}>

export type ProfilePropertyOptions = ProfilePropertyComponent

export type ProfileObjectComponent = Readonly<{
  readonly name?: string
  readonly id?: UUID
  readonly properties?: ReadonlyArray<ProfilePropertyComponent>
}>

export type ProfileObjectOptions = Readonly<{
  readonly name?: string
  readonly id?: string
  readonly properties?: ReadonlyArray<ProfilePropertyOptions>
}>

export type ProfileComponent = string | ProfileObjectComponent

export type ProfileOptions = string | ProfileObjectOptions

export type BeeEntryComponent = Readonly<{
  readonly entityData: Readonly<Record<string, string>>
  readonly ticksInHive: number
  readonly minTicksInHive: number
}>

export type BeeEntryOptions = Readonly<{
  readonly entityData: Readonly<Record<string, string>>
  readonly ticksInHive: number
  readonly minTicksInHive: number
}>

export type BeesComponent = ReadonlyArray<BeeEntryComponent>

export type BeesOptions = ReadonlyArray<BeeEntryOptions>

export type PotionEffectInstanceComponent = Readonly<{
  readonly id: ResourceLocation
  readonly amplifier: number
  readonly duration: number
  readonly ambient: boolean
  readonly showParticles: boolean
  readonly showIcon: boolean
  readonly hiddenEffect?: PotionEffectInstanceComponent
}>

export type PotionEffectInstanceOptions = Readonly<{
  readonly id: string
  readonly amplifier?: number
  readonly duration?: number
  readonly ambient?: boolean
  readonly showParticles?: boolean
  readonly showIcon?: boolean
  readonly hiddenEffect?: PotionEffectInstanceOptions
}>

/**
 * Vanilla (non-modded) status-effect ids, projected from the closed
 * vocabulary in `./status-effect-data.js`. `PotionEffectInstanceComponent.id`
 * and `PotionContentsComponent.potion` stay typed as the wider
 * `ResourceLocation` because a data pack may reference a custom effect; this
 * list exists so `./item-component-values-validation.js` can guard the
 * vanilla subset without rebuilding the vocabulary itself.
 */
export const VANILLA_STATUS_EFFECT_IDS: ReadonlyArray<ResourceLocation> =
  STATUS_EFFECT_NAMES.map(statusEffectId)

export type PotionContentsComponent = ResourceLocation | Readonly<{
  readonly potion?: ResourceLocation
  readonly customColor?: number
  readonly customEffects: ReadonlyArray<PotionEffectInstanceComponent>
}>

export type PotionContentsOptions = string | Readonly<{
  readonly potion?: string
  readonly customColor?: number
  readonly customEffects?: ReadonlyArray<PotionEffectInstanceOptions>
}>

export type ChargedProjectilesComponent = ReadonlyArray<ItemStack>

export type ChargedProjectilesOptions = ReadonlyArray<ItemStack>

export type BundleContentsComponent = ReadonlyArray<ItemStack>

export type BundleContentsOptions = ReadonlyArray<ItemStack>

export type ContainerEntryComponent = Readonly<{
  readonly slot: number
  readonly item: ItemStack
}>

export type ContainerEntryOptions = ContainerEntryComponent

export type ContainerComponent = ReadonlyArray<ContainerEntryComponent>

export type ContainerOptions = ReadonlyArray<ContainerEntryOptions>

export type SulfurCubeContentComponent = ResourceLocation

export type SulfurCubeContentOptions = string

export type MapColorComponent = number

export const MAP_DECORATION_TYPES = [
  'player',
  'frame',
  'red_marker',
  'blue_marker',
  'target_x',
  'target_point',
  'player_off_map',
  'player_off_limits',
  'mansion',
  'monument',
  'banner_white',
  'banner_orange',
  'banner_magenta',
  'banner_light_blue',
  'banner_yellow',
  'banner_lime',
  'banner_pink',
  'banner_gray',
  'banner_light_gray',
  'banner_cyan',
  'banner_purple',
  'banner_blue',
  'banner_brown',
  'banner_green',
  'banner_red',
  'banner_black',
  'red_x',
  'village_desert',
  'village_plains',
  'village_savanna',
  'village_snowy',
  'village_taiga',
  'jungle_temple',
  'swamp_hut',
  'trial_chambers',
] as const

export type MapDecorationType = (typeof MAP_DECORATION_TYPES)[number]

export type MapDecorationComponent = Readonly<{
  readonly type: MapDecorationType
  readonly x: number
  readonly z: number
  readonly rotation: number
}>

export type MapDecorationOptions = MapDecorationComponent

export type MapDecorationsComponent = Readonly<Record<string, MapDecorationComponent>>

export type MapDecorationsOptions = Readonly<Record<string, MapDecorationOptions>>

export type WritableBookPageComponent = string | Readonly<{
  readonly raw: string
  readonly filtered?: string
}>

export type WritableBookPageOptions = WritableBookPageComponent

export type WritableBookContentComponent = Readonly<{
  readonly pages: ReadonlyArray<WritableBookPageComponent>
}>

export type WritableBookContentOptions = Readonly<{
  readonly pages?: ReadonlyArray<WritableBookPageOptions>
}>

export type WrittenBookPageComponent = string | Readonly<{
  readonly raw: string
  readonly filtered?: string
}>

export type WrittenBookPageOptions = WrittenBookPageComponent

export type WrittenBookContentComponent = Readonly<{
  readonly pages: ReadonlyArray<WrittenBookPageComponent>
  readonly title: WrittenBookPageComponent
  readonly author: string
  readonly generation: number
  readonly resolved: boolean
}>

export type WrittenBookContentOptions = Readonly<{
  readonly pages: ReadonlyArray<WrittenBookPageOptions>
  readonly title: WrittenBookPageOptions
  readonly author: string
  readonly generation: number
  readonly resolved: boolean
}>

export type TrimPatternInlineComponent = Readonly<{
  readonly assetId: ResourceLocation
  readonly description: TextComponent
  readonly decal: boolean
}>

export type TrimPatternComponent = ResourceLocation | TrimPatternInlineComponent

export type TrimPatternInlineOptions = Readonly<{
  readonly assetId: string
  readonly description: TextComponent
  readonly decal: boolean
}>

export type TrimPatternOptions = string | TrimPatternInlineOptions

export type TrimMaterialInlineComponent = Readonly<{
  readonly assetName: string
  readonly ingredient: ItemType
  readonly itemModelIndex: number
  readonly overrideArmorMaterials?: Readonly<Record<string, string>>
  readonly description: TextComponent
}>

export type TrimMaterialComponent = ResourceLocation | TrimMaterialInlineComponent

export type TrimMaterialInlineOptions = Readonly<{
  readonly assetName: string
  readonly ingredient: ItemType
  readonly itemModelIndex: number
  readonly overrideArmorMaterials?: Readonly<Record<string, string>>
  readonly description: TextComponent
}>

export type TrimMaterialOptions = string | TrimMaterialInlineOptions

export type TrimComponent = Readonly<{
  readonly pattern: TrimPatternComponent
  readonly material: TrimMaterialComponent
}>

export type TrimOptions = Readonly<{
  readonly pattern: TrimPatternOptions
  readonly material: TrimMaterialOptions
}>

export type SuspiciousStewEntryComponent = Readonly<{
  readonly id: ResourceLocation
  readonly duration: number
}>

export type SuspiciousStewEntryOptions = Readonly<{
  readonly id: string
  readonly duration?: number
}>

export type SuspiciousStewComponent = ReadonlyArray<SuspiciousStewEntryComponent>

export type SuspiciousStewOptions = ReadonlyArray<SuspiciousStewEntryOptions>

export type HideAdditionalTooltipComponent = Readonly<Record<string, never>>

export type HideAdditionalTooltipOptions = true

export type BlockPredicateBlockComponent =
  | ResourceLocation
  | TagLocation
  | ReadonlyArray<ResourceLocation | TagLocation>

export type BlockPredicateBlockOptions = string | ReadonlyArray<string>

export type BlockPredicateComponent = Readonly<{
  readonly blocks?: BlockPredicateBlockComponent
  readonly nbt?: ItemComponentNbtObject
  readonly state?: BlockStateComponent
}>

export type BlockPredicateOptions = Readonly<{
  readonly blocks?: BlockPredicateBlockOptions
  readonly nbt?: ItemComponentNbtObject
  readonly state?: Readonly<Record<string, string>>
}>

export type CanBreakComponent = BlockPredicateComponent | ReadonlyArray<BlockPredicateComponent>

export type CanBreakOptions = BlockPredicateOptions | ReadonlyArray<BlockPredicateOptions>

export type CanPlaceOnComponent = CanBreakComponent

export type CanPlaceOnOptions = CanBreakOptions

export type DyedColorComponent = number | readonly [number, number, number]

export type BaseColorComponent = DyeColor

export type MapIdComponent = MapId

export type BlockStateComponent = Readonly<Record<string, string>>

export type InstrumentComponent = ResourceLocation

export type NoteBlockSoundComponent = ResourceLocation

export type RecipesComponent = ReadonlyArray<ResourceLocation>

export type LockComponent = string

export type TooltipStyleComponent = ResourceLocation

export type CustomModelDataComponent = Readonly<{
  readonly floats: ReadonlyArray<number>
  readonly flags: ReadonlyArray<boolean>
  readonly strings: ReadonlyArray<string>
  readonly colors: ReadonlyArray<DyedColorComponent>
}>

export type CustomModelDataOptions = Readonly<{
  readonly floats?: ReadonlyArray<number>
  readonly flags?: ReadonlyArray<boolean>
  readonly strings?: ReadonlyArray<string>
  readonly colors?: ReadonlyArray<DyedColorComponent>
}>

export type ResourceLocationProvider =
  | ResourceLocation
  | TagLocation
  | ReadonlyArray<ResourceLocation>

export type ResourceLocationProviderInput = string | ReadonlyArray<string>

export type BannerPatternProvider = ResourceLocationProvider

export const EQUIPPABLE_SLOTS = [
  'head',
  'chest',
  'legs',
  'feet',
  'body',
  'mainhand',
  'offhand',
  'saddle',
] as const

export type EquippableSlot = (typeof EQUIPPABLE_SLOTS)[number]

export type EquippableComponent = Readonly<{
  readonly slot: EquippableSlot
  readonly equipSound?: ResourceLocation
  readonly model?: ResourceLocation
  readonly cameraOverlay?: ResourceLocation
  readonly allowedEntities?: ResourceLocationProvider
  readonly canBeSheared: boolean
  readonly shearingSound: ResourceLocation
  readonly dispensable: boolean
  readonly swappable: boolean
  readonly damageOnHurt: boolean
  readonly equipOnInteract: boolean
}>

export type EquippableOptions = Readonly<{
  readonly slot: EquippableSlot
  readonly equipSound?: string
  readonly model?: string
  readonly cameraOverlay?: string
  readonly allowedEntities?: ResourceLocationProviderInput
  readonly canBeSheared?: boolean
  readonly shearingSound?: string
  readonly dispensable?: boolean
  readonly swappable?: boolean
  readonly damageOnHurt?: boolean
  readonly equipOnInteract?: boolean
}>

export type KineticWeaponCondition = Readonly<{
  readonly maxDurationTicks: number
  readonly minSpeed: number
  readonly minRelativeSpeed: number
}>

export type KineticWeaponConditionOptions = Readonly<{
  readonly maxDurationTicks: number
  readonly minSpeed?: number
  readonly minRelativeSpeed?: number
}>

export type KineticWeaponComponent = Readonly<{
  readonly contactCooldownTicks: number
  readonly delayTicks: number
  readonly dismountConditions?: KineticWeaponCondition
  readonly knockbackConditions?: KineticWeaponCondition
  readonly damageConditions?: KineticWeaponCondition
  readonly forwardMovement: number
  readonly damageMultiplier: number
  readonly sound?: ResourceLocation
  readonly hitSound?: ResourceLocation
}>

export type KineticWeaponOptions = Readonly<{
  readonly contactCooldownTicks?: number
  readonly delayTicks?: number
  readonly dismountConditions?: KineticWeaponConditionOptions
  readonly knockbackConditions?: KineticWeaponConditionOptions
  readonly damageConditions?: KineticWeaponConditionOptions
  readonly forwardMovement?: number
  readonly damageMultiplier?: number
  readonly sound?: string
  readonly hitSound?: string
}>

export type PiercingWeaponComponent = Readonly<{
  readonly dealsKnockback: boolean
  readonly dismounts: boolean
  readonly sound?: ResourceLocation
  readonly hitSound?: ResourceLocation
}>

export type PiercingWeaponOptions = Readonly<{
  readonly dealsKnockback?: boolean
  readonly dismounts?: boolean
  readonly sound?: string
  readonly hitSound?: string
}>

export type GliderComponent = Readonly<Record<string, never>>

export type DeathProtectionComponent = Readonly<{
  readonly deathEffects: ReadonlyArray<ConsumableEffect>
}>

export type DeathProtectionOptions = Readonly<{
  readonly deathEffects?: ReadonlyArray<ConsumableEffect>
}>

export type RepairableComponent = Readonly<{
  readonly items: ResourceLocationProvider
}>

export type EnchantableComponent = Readonly<{
  readonly value: number
}>

export type JukeboxPlayableComponent = Readonly<{
  readonly song: ResourceLocation
}>

export type OminousBottleAmplifierComponent = number

export type PaintingVariantComponent = ResourceLocation

export type TooltipDisplayComponent = Readonly<{
  readonly hideTooltip: boolean
  readonly hiddenComponents: ReadonlyArray<ResourceLocation>
}>

export const FIREWORK_EXPLOSION_SHAPES = [
  'small_ball',
  'large_ball',
  'star',
  'creeper',
  'burst',
] as const

export type FireworkExplosionShape = (typeof FIREWORK_EXPLOSION_SHAPES)[number]

export type LodestoneTrackerTarget = Readonly<{
  readonly pos: readonly [number, number, number]
  readonly dimension: ResourceLocation
}>

export type LodestoneTrackerTargetOptions = Readonly<{
  readonly pos: readonly [number, number, number]
  readonly dimension: string
}>

export type LodestoneTrackerComponent = Readonly<{
  readonly target?: LodestoneTrackerTarget
  readonly tracked: boolean
}>

export type LodestoneTrackerOptions = Readonly<{
  readonly target?: LodestoneTrackerTargetOptions
  readonly tracked?: boolean
}>

export type FireworkExplosionComponent = Readonly<{
  readonly shape: FireworkExplosionShape
  readonly colors: ReadonlyArray<number>
  readonly fadeColors: ReadonlyArray<number>
  readonly hasTrail: boolean
  readonly hasTwinkle: boolean
}>

export type FireworkExplosionOptions = Readonly<{
  readonly shape: FireworkExplosionShape
  readonly colors?: ReadonlyArray<number>
  readonly fadeColors?: ReadonlyArray<number>
  readonly hasTrail?: boolean
  readonly hasTwinkle?: boolean
}>

export type FireworksComponent = Readonly<{
  readonly explosions: ReadonlyArray<FireworkExplosionComponent>
  readonly flightDuration: number
}>

export type FireworksOptions = Readonly<{
  readonly explosions?: ReadonlyArray<FireworkExplosionOptions>
  readonly flightDuration?: number
}>

export type BannerPatternEntry = Readonly<{
  readonly pattern: ResourceLocation
  readonly color: DyeColor
}>

export type BannerPatternOptions = Readonly<{
  readonly pattern: string
  readonly color: DyeColor
}>

export type BannerPatternsComponent = ReadonlyArray<BannerPatternEntry>

export type PotDecorationsOptions = readonly [string, string, string, string]

export type PotDecorationsComponent = readonly [
  ResourceLocation,
  ResourceLocation,
  ResourceLocation,
  ResourceLocation,
]

export type ContainerLootComponent = Readonly<{
  readonly lootTable: ResourceLocation
  readonly seed?: bigint
}>

export type ContainerLootOptions = Readonly<{
  readonly lootTable: string
  readonly seed?: bigint
}>

export type DebugStickStateComponent = Readonly<Record<string, string>>

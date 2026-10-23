/** Portable data contracts for simple Java item components. */
import type { ResourceLocation, TagLocation, UUID } from '../text/identifiers.js'
import type { BlockAxis } from '../coordinates/coordinate-primitives.js'
import type { ConsumableEffect } from './consumable-data.js'
import type { ItemStack } from './item-stack.js'
import type { ItemType } from './item-type.js'
import type { MapId } from '../time/quantities.js'
import type {
  BeeHiveTicks,
  BlockStatePropertyValue,
  BookAuthor,
  BookGeneration,
  BookPageText,
  ContainerSlotIndex,
  CustomModelDataFloat,
  CustomModelDataString,
  DyeColorChannel,
  EffectAmplifier,
  Enchantability,
  FireworksFlightDuration,
  ItemComponentNbtKey,
  ItemComponentNbtLong,
  ItemComponentNbtNumber,
  ItemComponentNbtString,
  ItemLock,
  KineticDamageMultiplier,
  KineticDurationTicks,
  KineticMovement,
  KineticSpeed,
  LootTableSeed,
  MapDecorationCoordinate,
  MapDecorationRotation,
  OminousBottleAmplifier,
  PotionEffectDurationTicks,
  ProfileName,
  ProfilePropertyName,
  ProfilePropertySignature,
  ProfilePropertyValue,
  RgbColor,
  TrimAssetName,
  TrimArmorMaterialKey,
  TrimItemModelIndex,
} from './item-primitives.js'
import { STATUS_EFFECT_NAMES, statusEffectId } from '../entity/status-effect-data.js'
import type { TextComponent } from '../text/text-component-data.js'

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

export type ItemComponentNbtPrimitive =
  | boolean
  | ItemComponentNbtLong
  | ItemComponentNbtNumber
  | ItemComponentNbtString
  | ResourceLocation

export interface ItemComponentNbtObject {
  readonly [key: string]: ItemComponentNbtValue
}

export interface ItemComponentNbtArray extends ReadonlyArray<ItemComponentNbtValue> {}

export type ItemComponentNbtValue = ItemComponentNbtPrimitive | ItemComponentNbtArray | ItemComponentNbtObject

export type CustomDataComponent = Readonly<ItemComponentNbtObject>

export type EntityDataComponent = Readonly<
  ItemComponentNbtObject & { readonly id: ResourceLocation }
>

export type EntityDataOptions = Readonly<ItemComponentNbtObject & { readonly id: ResourceLocation }>

export type BucketEntityDataComponent = Readonly<ItemComponentNbtObject>

export type BucketEntityDataOptions = Readonly<ItemComponentNbtObject>

export type BlockEntityDataComponent = Readonly<
  ItemComponentNbtObject & { readonly id: ResourceLocation }
>

export type BlockEntityDataOptions = Readonly<ItemComponentNbtObject & { readonly id: ResourceLocation }>

export type ProfilePropertyComponent = Readonly<{
  readonly name: ProfilePropertyName
  readonly value: ProfilePropertyValue
  readonly signature?: ProfilePropertySignature
}>

export type ProfilePropertyOptions = ProfilePropertyComponent

export type ProfileObjectComponent = Readonly<{
  readonly name?: ProfileName
  readonly id?: UUID
  readonly properties?: ReadonlyArray<ProfilePropertyComponent>
}>

export type ProfileObjectOptions = Readonly<{
  readonly name?: ProfileName
  readonly id?: UUID
  readonly properties?: ReadonlyArray<ProfilePropertyOptions>
}>

export type ProfileComponent = ProfileName | ProfileObjectComponent

export type ProfileOptions = ProfileName | ProfileObjectOptions

export type BeeEntryComponent = Readonly<{
  readonly entityData: Readonly<Record<ItemComponentNbtKey, ItemComponentNbtString>>
  readonly ticksInHive: BeeHiveTicks
  readonly minTicksInHive: BeeHiveTicks
}>

export type BeeEntryOptions = Readonly<{
  readonly entityData: Readonly<Record<ItemComponentNbtKey, ItemComponentNbtString>>
  readonly ticksInHive: BeeHiveTicks
  readonly minTicksInHive: BeeHiveTicks
}>

export type BeesComponent = ReadonlyArray<BeeEntryComponent>

export type BeesOptions = ReadonlyArray<BeeEntryOptions>

export type PotionEffectInstanceComponent = Readonly<{
  readonly id: ResourceLocation
  readonly amplifier: EffectAmplifier
  readonly duration: PotionEffectDurationTicks
  readonly ambient: boolean
  readonly showParticles: boolean
  readonly showIcon: boolean
  readonly hiddenEffect?: PotionEffectInstanceComponent
}>

export type PotionEffectInstanceOptions = Readonly<{
  readonly id: ResourceLocation
  readonly amplifier?: EffectAmplifier
  readonly duration?: PotionEffectDurationTicks
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
  readonly customColor?: RgbColor
  readonly customEffects: ReadonlyArray<PotionEffectInstanceComponent>
}>

export type PotionContentsOptions = ResourceLocation | Readonly<{
  readonly potion?: ResourceLocation
  readonly customColor?: RgbColor
  readonly customEffects?: ReadonlyArray<PotionEffectInstanceOptions>
}>

export type ChargedProjectilesComponent = ReadonlyArray<ItemStack>

export type ChargedProjectilesOptions = ReadonlyArray<ItemStack>

export type BundleContentsComponent = ReadonlyArray<ItemStack>

export type BundleContentsOptions = ReadonlyArray<ItemStack>

export type ContainerEntryComponent = Readonly<{
  readonly slot: ContainerSlotIndex
  readonly item: ItemStack
}>

export type ContainerEntryOptions = ContainerEntryComponent

export type ContainerComponent = ReadonlyArray<ContainerEntryComponent>

export type ContainerOptions = ReadonlyArray<ContainerEntryOptions>

export type SulfurCubeContentComponent = ResourceLocation

export type SulfurCubeContentOptions = ResourceLocation

export type MapColorComponent = RgbColor

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
  readonly x: MapDecorationCoordinate
  readonly z: MapDecorationCoordinate
  readonly rotation: MapDecorationRotation
}>

export type MapDecorationOptions = MapDecorationComponent

export type MapDecorationsComponent = Readonly<Record<string, MapDecorationComponent>>

export type MapDecorationsOptions = Readonly<Record<string, MapDecorationOptions>>

export type WritableBookPageComponent = BookPageText | Readonly<{
  readonly raw: BookPageText
  readonly filtered?: BookPageText
}>

export type WritableBookPageOptions = WritableBookPageComponent

export type WritableBookContentComponent = Readonly<{
  readonly pages: ReadonlyArray<WritableBookPageComponent>
}>

export type WritableBookContentOptions = Readonly<{
  readonly pages?: ReadonlyArray<WritableBookPageOptions>
}>

export type WrittenBookPageComponent = BookPageText | Readonly<{
  readonly raw: BookPageText
  readonly filtered?: BookPageText
}>

export type WrittenBookPageOptions = WrittenBookPageComponent

export type WrittenBookContentComponent = Readonly<{
  readonly pages: ReadonlyArray<WrittenBookPageComponent>
  readonly title: WrittenBookPageComponent
  readonly author: BookAuthor
  readonly generation: BookGeneration
  readonly resolved: boolean
}>

export type WrittenBookContentOptions = Readonly<{
  readonly pages: ReadonlyArray<WrittenBookPageOptions>
  readonly title: WrittenBookPageOptions
  readonly author: BookAuthor
  readonly generation: BookGeneration
  readonly resolved: boolean
}>

export type TrimPatternInlineComponent = Readonly<{
  readonly assetId: ResourceLocation
  readonly description: TextComponent
  readonly decal: boolean
}>

export type TrimPatternComponent = ResourceLocation | TrimPatternInlineComponent

export type TrimPatternInlineOptions = Readonly<{
  readonly assetId: ResourceLocation
  readonly description: TextComponent
  readonly decal: boolean
}>

export type TrimPatternOptions = ResourceLocation | TrimPatternInlineOptions

export type TrimMaterialInlineComponent = Readonly<{
  readonly assetName: TrimAssetName
  readonly ingredient: ItemType
  readonly itemModelIndex: TrimItemModelIndex
  readonly overrideArmorMaterials?: Readonly<Record<TrimArmorMaterialKey, ResourceLocation>>
  readonly description: TextComponent
}>

export type TrimMaterialComponent = ResourceLocation | TrimMaterialInlineComponent

export type TrimMaterialInlineOptions = Readonly<{
  readonly assetName: TrimAssetName
  readonly ingredient: ItemType
  readonly itemModelIndex: TrimItemModelIndex
  readonly overrideArmorMaterials?: Readonly<Record<TrimArmorMaterialKey, ResourceLocation>>
  readonly description: TextComponent
}>

export type TrimMaterialOptions = ResourceLocation | TrimMaterialInlineOptions

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
  readonly duration: PotionEffectDurationTicks
}>

export type SuspiciousStewEntryOptions = Readonly<{
  readonly id: ResourceLocation
  readonly duration?: PotionEffectDurationTicks
}>

export type SuspiciousStewComponent = ReadonlyArray<SuspiciousStewEntryComponent>

export type SuspiciousStewOptions = ReadonlyArray<SuspiciousStewEntryOptions>

export type HideAdditionalTooltipComponent = Readonly<Record<string, never>>

export type HideAdditionalTooltipOptions = true

export type BlockPredicateBlockComponent =
  | ResourceLocation
  | TagLocation
  | ReadonlyArray<ResourceLocation | TagLocation>

export type BlockPredicateBlockOptions =
  | ResourceLocation
  | TagLocation
  | ReadonlyArray<ResourceLocation | TagLocation>

export type BlockPredicateComponent = Readonly<{
  readonly blocks?: BlockPredicateBlockComponent
  readonly nbt?: ItemComponentNbtObject
  readonly state?: BlockStateComponent
}>

export type BlockPredicateOptions = Readonly<{
  readonly blocks?: BlockPredicateBlockOptions
  readonly nbt?: ItemComponentNbtObject
  readonly state?: BlockStateComponent
}>

export type CanBreakComponent = BlockPredicateComponent | ReadonlyArray<BlockPredicateComponent>

export type CanBreakOptions = BlockPredicateOptions | ReadonlyArray<BlockPredicateOptions>

export type CanPlaceOnComponent = CanBreakComponent

export type CanPlaceOnOptions = CanBreakOptions

export type DyedColorComponent = RgbColor | readonly [DyeColorChannel, DyeColorChannel, DyeColorChannel]

export type BaseColorComponent = DyeColor

export type MapIdComponent = MapId

export type BlockStateComponent = Readonly<Record<string, BlockStatePropertyValue>>

export type InstrumentComponent = ResourceLocation

export type NoteBlockSoundComponent = ResourceLocation

export type RecipesComponent = ReadonlyArray<ResourceLocation>

export type LockComponent = ItemLock

export type TooltipStyleComponent = ResourceLocation

export type CustomModelDataComponent = Readonly<{
  readonly floats: ReadonlyArray<CustomModelDataFloat>
  readonly flags: ReadonlyArray<boolean>
  readonly strings: ReadonlyArray<CustomModelDataString>
  readonly colors: ReadonlyArray<DyedColorComponent>
}>

export type CustomModelDataOptions = Readonly<{
  readonly floats?: ReadonlyArray<CustomModelDataFloat>
  readonly flags?: ReadonlyArray<boolean>
  readonly strings?: ReadonlyArray<CustomModelDataString>
  readonly colors?: ReadonlyArray<DyedColorComponent>
}>

export type ResourceLocationProvider =
  | ResourceLocation
  | TagLocation
  | ReadonlyArray<ResourceLocation>

export type ResourceLocationProviderInput = ResourceLocation | TagLocation | ReadonlyArray<ResourceLocation>

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
  readonly equipSound?: ResourceLocation
  readonly model?: ResourceLocation
  readonly cameraOverlay?: ResourceLocation
  readonly allowedEntities?: ResourceLocationProviderInput
  readonly canBeSheared?: boolean
  readonly shearingSound?: ResourceLocation
  readonly dispensable?: boolean
  readonly swappable?: boolean
  readonly damageOnHurt?: boolean
  readonly equipOnInteract?: boolean
}>

export type KineticWeaponCondition = Readonly<{
  readonly maxDurationTicks: KineticDurationTicks
  readonly minSpeed: KineticSpeed
  readonly minRelativeSpeed: KineticSpeed
}>

export type KineticWeaponConditionOptions = Readonly<{
  readonly maxDurationTicks: KineticDurationTicks
  readonly minSpeed?: KineticSpeed
  readonly minRelativeSpeed?: KineticSpeed
}>

export type KineticWeaponComponent = Readonly<{
  readonly contactCooldownTicks: KineticDurationTicks
  readonly delayTicks: KineticDurationTicks
  readonly dismountConditions?: KineticWeaponCondition
  readonly knockbackConditions?: KineticWeaponCondition
  readonly damageConditions?: KineticWeaponCondition
  readonly forwardMovement: KineticMovement
  readonly damageMultiplier: KineticDamageMultiplier
  readonly sound?: ResourceLocation
  readonly hitSound?: ResourceLocation
}>

export type KineticWeaponOptions = Readonly<{
  readonly contactCooldownTicks?: KineticDurationTicks
  readonly delayTicks?: KineticDurationTicks
  readonly dismountConditions?: KineticWeaponConditionOptions
  readonly knockbackConditions?: KineticWeaponConditionOptions
  readonly damageConditions?: KineticWeaponConditionOptions
  readonly forwardMovement?: KineticMovement
  readonly damageMultiplier?: KineticDamageMultiplier
  readonly sound?: ResourceLocation
  readonly hitSound?: ResourceLocation
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
  readonly sound?: ResourceLocation
  readonly hitSound?: ResourceLocation
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
  readonly value: Enchantability
}>

export type JukeboxPlayableComponent = Readonly<{
  readonly song: ResourceLocation
}>

export type OminousBottleAmplifierComponent = OminousBottleAmplifier

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
  readonly pos: readonly [BlockAxis, BlockAxis, BlockAxis]
  readonly dimension: ResourceLocation
}>

export type LodestoneTrackerTargetOptions = Readonly<{
  readonly pos: readonly [BlockAxis, BlockAxis, BlockAxis]
  readonly dimension: ResourceLocation
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
  readonly colors: ReadonlyArray<RgbColor>
  readonly fadeColors: ReadonlyArray<RgbColor>
  readonly hasTrail: boolean
  readonly hasTwinkle: boolean
}>

export type FireworkExplosionOptions = Readonly<{
  readonly shape: FireworkExplosionShape
  readonly colors?: ReadonlyArray<RgbColor>
  readonly fadeColors?: ReadonlyArray<RgbColor>
  readonly hasTrail?: boolean
  readonly hasTwinkle?: boolean
}>

export type FireworksComponent = Readonly<{
  readonly explosions: ReadonlyArray<FireworkExplosionComponent>
  readonly flightDuration: FireworksFlightDuration
}>

export type FireworksOptions = Readonly<{
  readonly explosions?: ReadonlyArray<FireworkExplosionOptions>
  readonly flightDuration?: FireworksFlightDuration
}>

export type BannerPatternEntry = Readonly<{
  readonly pattern: ResourceLocation
  readonly color: DyeColor
}>

export type BannerPatternOptions = Readonly<{
  readonly pattern: ResourceLocation
  readonly color: DyeColor
}>

export type BannerPatternsComponent = ReadonlyArray<BannerPatternEntry>

export type PotDecorationsOptions = readonly [ResourceLocation, ResourceLocation, ResourceLocation, ResourceLocation]

export type PotDecorationsComponent = readonly [
  ResourceLocation,
  ResourceLocation,
  ResourceLocation,
  ResourceLocation,
]

export type ContainerLootComponent = Readonly<{
  readonly lootTable: ResourceLocation
  readonly seed?: LootTableSeed
}>

export type ContainerLootOptions = Readonly<{
  readonly lootTable: ResourceLocation
  readonly seed?: LootTableSeed
}>

export type DebugStickStateComponent = Readonly<Record<string, BlockStatePropertyValue>>

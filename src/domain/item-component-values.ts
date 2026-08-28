/** Constructors and guards for simple Java item-component values. */
import { ResourceLocation, TagLocation, UUID } from './identifiers.js'
import {
  type BlockEntityDataComponent,
  type BlockEntityDataOptions,
  type BlockPredicateBlockComponent,
  type BlockPredicateBlockOptions,
  type BlockPredicateComponent,
  type BlockPredicateOptions,
  type BucketEntityDataComponent,
  type BucketEntityDataOptions,
  type CanBreakComponent,
  type CanBreakOptions,
  type CanPlaceOnComponent,
  type CanPlaceOnOptions,
  DYE_COLORS,
  type EntityDataComponent,
  type EntityDataOptions,
  FIREWORK_EXPLOSION_SHAPES,
  type BannerPatternEntry,
  type BannerPatternProvider,
  type BannerPatternOptions,
  type BannerPatternsComponent,
  type BaseColorComponent,
  type BeeEntryComponent,
  type BundleContentsComponent,
  type BundleContentsOptions,
  type BeesComponent,
  type BeesOptions,
  type BlockStateComponent,
  type ContainerLootComponent,
  type ContainerLootOptions,
  type CustomDataComponent,
  type CustomModelDataComponent,
  type CustomModelDataOptions,
  type ChargedProjectilesComponent,
  type ChargedProjectilesOptions,
  type ContainerComponent,
  type ContainerEntryOptions,
  type ContainerOptions,
  type DebugStickStateComponent,
  EQUIPPABLE_SLOTS,
  type DeathProtectionComponent,
  type DeathProtectionOptions,
  type DyeColor,
  type DyedColorComponent,
  type EnchantableComponent,
  type EquippableComponent,
  type EquippableOptions,
  type FireworkExplosionComponent,
  type FireworkExplosionOptions,
  type FireworksComponent,
  type FireworksOptions,
  type GliderComponent,
  type HideAdditionalTooltipComponent,
  type InstrumentComponent,
  type ItemComponentNbtObject,
  type ItemComponentNbtValue,
  type JukeboxPlayableComponent,
  type KineticWeaponComponent,
  type KineticWeaponCondition,
  type KineticWeaponConditionOptions,
  type KineticWeaponOptions,
  type LockComponent,
  type LodestoneTrackerComponent,
  type LodestoneTrackerOptions,
  MAP_DECORATION_TYPES,
  type MapColorComponent,
  type MapDecorationComponent,
  type MapDecorationOptions,
  type MapDecorationsComponent,
  type MapDecorationsOptions,
  type MapIdComponent,
  type NoteBlockSoundComponent,
  type OminousBottleAmplifierComponent,
  type PaintingVariantComponent,
  type PiercingWeaponComponent,
  type PiercingWeaponOptions,
  type PotDecorationsComponent,
  type PotDecorationsOptions,
  type PotionContentsComponent,
  type PotionContentsOptions,
  type PotionEffectInstanceComponent,
  type PotionEffectInstanceOptions,
  type ProfileComponent,
  type ProfileObjectComponent,
  type ProfilePropertyComponent,
  type ProfileOptions,
  type RepairableComponent,
  type RecipesComponent,
  type ResourceLocationProvider,
  type ResourceLocationProviderInput,
  type SuspiciousStewComponent,
  type SuspiciousStewEntryComponent,
  type SuspiciousStewOptions,
  type SulfurCubeContentComponent,
  type SulfurCubeContentOptions,
  type TrimComponent,
  type TrimMaterialComponent,
  type TrimMaterialOptions,
  type TrimOptions,
  type TrimPatternComponent,
  type TrimPatternOptions,
  type TooltipDisplayComponent,
  type TooltipStyleComponent,
  type WritableBookContentComponent,
  type WritableBookContentOptions,
  type WritableBookPageComponent,
  type WritableBookPageOptions,
  type WrittenBookContentComponent,
  type WrittenBookContentOptions,
  type WrittenBookPageComponent,
  type WrittenBookPageOptions,
} from './item-component-values-data.js'
import { isItemStack, type ItemStack } from './item-stack.js'
import {
  isBaseColorComponent,
  isBannerPatternsOptions,
  isBeesOptions,
  isBlockEntityDataOptions,
  isCanBreakOptions,
  isCanPlaceOnOptions,
  isBlockStateComponent,
  isBucketEntityDataOptions,
  isContainerLootOptions,
  isCustomDataComponent,
  isCustomModelDataOptions,
  isDeathProtectionOptions,
  isDyeComponent,
  isDyedColorComponent,
  isDebugStickStateComponent,
  isEntityDataOptions,
  isEnchantableValue,
  isEquippableOptions,
  isFireworkExplosionOptions,
  isFireworksOptions,
  isInstrumentComponent,
  isItemComponentNbtObject,
  isKineticWeaponOptions,
  isLodestoneTrackerOptions,
  isLockComponent,
  isMapColorComponent,
  isMapDecorationsOptions,
  isMapIdComponent,
  isNoteBlockSoundComponent,
  isOminousBottleAmplifierComponent,
  isPaintingVariantComponent,
  isPiercingWeaponOptions,
  isPotDecorationsOptions,
  isPotionContentsOptions,
  isProfileOptions,
  isRecipesComponent,
  isResourceLocationProvider,
  isSulfurCubeContentOptions,
  isSuspiciousStewOptions,
  isTrimOptions,
  isTooltipStyleComponent,
  isWritableBookContentOptions,
  isWrittenBookContentOptions,
} from './item-component-values-validation.js'
import { AdditionalTradeCost, MapId, PotionDurationScale } from './quantities.js'
import { textComponent } from './text-component.js'

export { DYE_COLORS, EQUIPPABLE_SLOTS, FIREWORK_EXPLOSION_SHAPES, MAP_DECORATION_TYPES }
export type { MapDecorationType } from './item-component-values-data.js'
export type {
  BannerPatternEntry,
  BannerPatternProvider,
  BannerPatternOptions,
  BannerPatternsComponent,
  BaseColorComponent,
  BlockPredicateBlockComponent,
  BlockPredicateBlockOptions,
  BlockPredicateComponent,
  BlockPredicateOptions,
  BeeEntryComponent,
  BeesComponent,
  BeesOptions,
  BundleContentsComponent,
  BundleContentsOptions,
  CanBreakComponent,
  CanBreakOptions,
  CanPlaceOnComponent,
  CanPlaceOnOptions,
  ChargedProjectilesComponent,
  ChargedProjectilesOptions,
  BlockStateComponent,
  ContainerComponent,
  ContainerEntryOptions,
  ContainerOptions,
  ContainerLootComponent,
  ContainerLootOptions,
  CustomDataComponent,
  CustomModelDataComponent,
  CustomModelDataOptions,
  DebugStickStateComponent,
  BlockEntityDataComponent,
  BlockEntityDataOptions,
  BucketEntityDataComponent,
  BucketEntityDataOptions,
  DeathProtectionComponent,
  DeathProtectionOptions,
  DyeColor,
  DyedColorComponent,
  EntityDataComponent,
  EntityDataOptions,
  EnchantableComponent,
  EquippableComponent,
  EquippableOptions,
  FireworkExplosionComponent,
  FireworkExplosionOptions,
  FireworksComponent,
  FireworksOptions,
  GliderComponent,
  HideAdditionalTooltipComponent,
  HideAdditionalTooltipOptions,
  ItemComponentNbtArray,
  ItemComponentNbtObject,
  ItemComponentNbtPrimitive,
  ItemComponentNbtValue,
  InstrumentComponent,
  JukeboxPlayableComponent,
  KineticWeaponComponent,
  KineticWeaponCondition,
  KineticWeaponConditionOptions,
  KineticWeaponOptions,
  LockComponent,
  LodestoneTrackerComponent,
  LodestoneTrackerOptions,
  MapColorComponent,
  MapDecorationComponent,
  MapDecorationOptions,
  MapDecorationsComponent,
  MapDecorationsOptions,
  MapIdComponent,
  NoteBlockSoundComponent,
  OminousBottleAmplifierComponent,
  PaintingVariantComponent,
  PiercingWeaponComponent,
  PiercingWeaponOptions,
  PotDecorationsComponent,
  PotDecorationsOptions,
  PotionContentsComponent,
  PotionContentsOptions,
  PotionEffectInstanceComponent,
  PotionEffectInstanceOptions,
  ProfileComponent,
  ProfileObjectComponent,
  ProfilePropertyComponent,
  ProfileOptions,
  RepairableComponent,
  RecipesComponent,
  ResourceLocationProvider,
  ResourceLocationProviderInput,
  SuspiciousStewComponent,
  SuspiciousStewEntryComponent,
  SuspiciousStewEntryOptions,
  SuspiciousStewOptions,
  SulfurCubeContentComponent,
  SulfurCubeContentOptions,
  TrimComponent,
  TrimMaterialComponent,
  TrimMaterialInlineComponent,
  TrimMaterialInlineOptions,
  TrimMaterialOptions,
  TrimOptions,
  TrimPatternComponent,
  TrimPatternInlineComponent,
  TrimPatternInlineOptions,
  TrimPatternOptions,
  TooltipDisplayComponent,
  TooltipStyleComponent,
  WritableBookContentComponent,
  WritableBookContentOptions,
  WritableBookPageComponent,
  WritableBookPageOptions,
  WrittenBookContentComponent,
  WrittenBookContentOptions,
  WrittenBookPageComponent,
  WrittenBookPageOptions,
} from './item-component-values-data.js'
export {
  isAdditionalTradeCostComponent,
  isBaseColorComponent,
  isBannerPatternsComponent,
  isBannerPatternsOptions,
  isBeesComponent,
  isBeesOptions,
  isBlockStateComponent,
  isBlockEntityDataComponent,
  isBlockEntityDataOptions,
  isCanBreakComponent,
  isCanBreakOptions,
  isCanPlaceOnComponent,
  isCanPlaceOnOptions,
  isBucketEntityDataComponent,
  isBucketEntityDataOptions,
  isBreakSoundComponent,
  isContainerLootComponent,
  isContainerLootOptions,
  isCustomDataComponent,
  isCustomModelDataComponent,
  isCustomModelDataOptions,
  isDeathProtectionComponent,
  isDeathProtectionOptions,
  isDyeComponent,
  isDyedColorComponent,
  isDebugStickStateComponent,
  isEnchantableComponent,
  isEnchantableValue,
  isEquippableComponent,
  isEquippableOptions,
  isFireworkExplosionComponent,
  isFireworkExplosionOptions,
  isFireworksComponent,
  isFireworksOptions,
  isGliderComponent,
  isItemComponentNbtValue,
  isItemComponentNbtObject,
  isEntityDataComponent,
  isEntityDataOptions,
  isInstrumentComponent,
  isJukeboxPlayableComponent,
  isKineticWeaponOptions,
  isLodestoneTrackerComponent,
  isLodestoneTrackerOptions,
  isLockComponent,
  isHideAdditionalTooltipComponent,
  isHideAdditionalTooltipOptions,
  isMapColorComponent,
  isMapDecorationsComponent,
  isMapDecorationsOptions,
  isMapIdComponent,
  isNoteBlockSoundComponent,
  isOminousBottleAmplifierComponent,
  isPaintingVariantComponent,
  isPiercingWeaponOptions,
  isPotDecorationsComponent,
  isPotDecorationsOptions,
  isPotionContentsComponent,
  isPotionContentsOptions,
  isProfileComponent,
  isProfileOptions,
  isPotionDurationScaleComponent,
  isProvidesBannerPatternsComponent,
  isProvidesTrimMaterialComponent,
  isRecipesComponent,
  isRepairableComponent,
  isResourceLocationProvider,
  isSulfurCubeContentComponent,
  isSulfurCubeContentOptions,
  isSuspiciousStewComponent,
  isSuspiciousStewOptions,
  isTrimComponent,
  isTrimOptions,
  isTooltipDisplayComponent,
  isTooltipStyleComponent,
  isWritableBookContentComponent,
  isWritableBookContentOptions,
  isWrittenBookContentComponent,
  isWrittenBookContentOptions,
} from './item-component-values-validation.js'
export {
  isKineticWeaponComponent,
  isKineticWeaponCondition,
  isKineticWeaponConditionOptions,
  isPiercingWeaponComponent,
} from './item-component-values-validation.js'

export type { BeeEntryOptions } from './item-component-values-data.js'

export type TooltipDisplayOptions = Readonly<{
  readonly hideTooltip?: boolean
  readonly hiddenComponents?: ReadonlyArray<string>
}>

export const potionDurationScaleComponent = (value = 1): PotionDurationScale =>
  PotionDurationScale(value)

export const additionalTradeCostComponent = (value = 0): AdditionalTradeCost =>
  AdditionalTradeCost(value)

export const breakSoundComponent = (value: string): ResourceLocation => ResourceLocation(value)

export const providesTrimMaterialComponent = (value: string): ResourceLocation => ResourceLocation(value)

export const providesBannerPatternsComponent = (
  value: string | ReadonlyArray<string>,
): BannerPatternProvider => {
  if (typeof value === 'string') {
    return value.startsWith('#') ? TagLocation(value) : ResourceLocation(value)
  }
  if (!Array.isArray(value)) {
    throw new TypeError('provides_banner_patterns must be a resource location, tag, or list of resource locations')
  }
  if (!value.every((entry) => typeof entry === 'string' && !entry.startsWith('#'))) {
    throw new TypeError('provides_banner_patterns lists must contain resource locations')
  }
  return Object.freeze(value.map((entry) => ResourceLocation(entry)))
}

export const dyeComponent = (value: string): DyeColor => {
  if (!isDyeComponent(value)) {
    throw new RangeError(`Unknown dye color: ${value}`)
  }
  return value
}

function freezeItemComponentNbtValue(value: BlockEntityDataComponent): BlockEntityDataComponent
function freezeItemComponentNbtValue(value: BucketEntityDataComponent): BucketEntityDataComponent
function freezeItemComponentNbtValue(value: EntityDataComponent): EntityDataComponent
function freezeItemComponentNbtValue(value: ItemComponentNbtObject): CustomDataComponent
function freezeItemComponentNbtValue(value: ItemComponentNbtValue): ItemComponentNbtValue
function freezeItemComponentNbtValue(value: ItemComponentNbtValue): ItemComponentNbtValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeItemComponentNbtValue))
  }
  if (!isItemComponentNbtObject(value)) {
    return value
  }

  const frozen: Record<string, ItemComponentNbtValue> = {}
  for (const [key, entry] of Object.entries(value)) {
    Object.defineProperty(frozen, key, {
      configurable: false,
      enumerable: true,
      value: freezeItemComponentNbtValue(entry),
      writable: false,
    })
  }
  return Object.freeze(frozen)
}

export const customDataComponent = (value: CustomDataComponent): CustomDataComponent => {
  if (!isCustomDataComponent(value)) {
    throw new TypeError('custom_data must be a non-empty object containing NBT-compatible values')
  }
  return freezeItemComponentNbtValue(value)
}

export const dyedColorComponent = (value: DyedColorComponent): DyedColorComponent => {
  if (!isDyedColorComponent(value)) {
    throw new RangeError('dyed_color must be an RGB integer or three normalized color channels')
  }
  if (typeof value === 'number') {
    return value
  }
  const channels: [number, number, number] = [value[0], value[1], value[2]]
  return Object.freeze(channels)
}

const frozenStringRecord = (
  value: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> => {
  const copy: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    Object.defineProperty(copy, key, {
      configurable: false,
      enumerable: true,
      value: entry,
      writable: false,
    })
  }
  return Object.freeze(copy)
}

const frozenArray = <T>(value: ReadonlyArray<T>): ReadonlyArray<T> => Object.freeze([...value])

export const entityDataComponent = (value: EntityDataOptions): EntityDataComponent => {
  if (!isEntityDataOptions(value)) {
    throw new TypeError('Invalid entity_data component options')
  }
  const normalized: EntityDataComponent = {
    ...value,
    id: ResourceLocation(value.id),
  }
  return freezeItemComponentNbtValue(normalized)
}

export const bucketEntityDataComponent = (
  value: BucketEntityDataOptions = {},
): BucketEntityDataComponent => {
  if (!isBucketEntityDataOptions(value)) {
    throw new TypeError('Invalid bucket_entity_data component options')
  }
  return freezeItemComponentNbtValue(value)
}

export const blockEntityDataComponent = (value: BlockEntityDataOptions): BlockEntityDataComponent => {
  if (!isBlockEntityDataOptions(value)) {
    throw new TypeError('Invalid block_entity_data component options')
  }
  const normalized: BlockEntityDataComponent = {
    ...value,
    id: ResourceLocation(value.id),
  }
  return freezeItemComponentNbtValue(normalized)
}

export const profileComponent = (value: ProfileOptions): ProfileComponent => {
  if (!isProfileOptions(value)) {
    throw new TypeError('Invalid profile component options')
  }
  if (typeof value === 'string') {
    return value
  }

  const properties = value.properties === undefined
    ? undefined
    : frozenArray(
        value.properties.map(
          (property): ProfilePropertyComponent => Object.freeze({ ...property }),
        ),
      )
  const normalized: ProfileObjectComponent = {
    ...(value.name === undefined ? {} : { name: value.name }),
    ...(value.id === undefined ? {} : { id: UUID(value.id) }),
    ...(properties === undefined ? {} : { properties }),
  }
  return Object.freeze(normalized)
}

const potionEffectInstanceComponentOf = (
  value: PotionEffectInstanceOptions,
): PotionEffectInstanceComponent => {
  const hiddenEffect = value.hiddenEffect === undefined
    ? undefined
    : potionEffectInstanceComponentOf(value.hiddenEffect)
  return Object.freeze({
    id: ResourceLocation(value.id),
    amplifier: value.amplifier ?? 0,
    duration: value.duration ?? 0,
    ambient: value.ambient ?? false,
    showParticles: value.showParticles ?? true,
    showIcon: value.showIcon ?? true,
    ...(hiddenEffect === undefined ? {} : { hiddenEffect }),
  })
}

export const beesComponent = (value: BeesOptions = []): BeesComponent => {
  if (!isBeesOptions(value)) {
    throw new TypeError('Invalid bees component options')
  }
  return Object.freeze(
    value.map(
      (entry): BeeEntryComponent => Object.freeze({
        entityData: frozenStringRecord(entry.entityData),
        ticksInHive: entry.ticksInHive,
        minTicksInHive: entry.minTicksInHive,
      }),
    ),
  )
}

export const potionContentsComponent = (
  value: PotionContentsOptions = {},
): PotionContentsComponent => {
  if (!isPotionContentsOptions(value)) {
    throw new TypeError('Invalid potion_contents component options')
  }
  if (typeof value === 'string') {
    return ResourceLocation(value)
  }
  const potion = value.potion === undefined ? undefined : ResourceLocation(value.potion)
  return Object.freeze({
    ...(potion === undefined ? {} : { potion }),
    ...(value.customColor === undefined ? {} : { customColor: value.customColor }),
    customEffects: frozenArray((value.customEffects ?? []).map(potionEffectInstanceComponentOf)),
  })
}

type RecordValue = Readonly<Record<string, unknown>>

const isRecordValue = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isItemStackList = (value: unknown): value is ReadonlyArray<ItemStack> =>
  Array.isArray(value) && value.every(isItemStack)

export const isChargedProjectilesOptions = (value: unknown): value is ChargedProjectilesOptions =>
  isItemStackList(value)

export const isChargedProjectilesComponent = (value: unknown): value is ChargedProjectilesComponent =>
  isItemStackList(value)

export const chargedProjectilesComponent = (
  value: ChargedProjectilesOptions = [],
): ChargedProjectilesComponent => {
  if (!isChargedProjectilesOptions(value)) {
    throw new TypeError('Invalid charged_projectiles component options')
  }
  return frozenArray(value)
}

export const isBundleContentsOptions = (value: unknown): value is BundleContentsOptions =>
  isItemStackList(value)

export const isBundleContentsComponent = (value: unknown): value is BundleContentsComponent =>
  isItemStackList(value)

export const bundleContentsComponent = (
  value: BundleContentsOptions = [],
): BundleContentsComponent => {
  if (!isBundleContentsOptions(value)) {
    throw new TypeError('Invalid bundle_contents component options')
  }
  return frozenArray(value)
}

const isContainerEntryOptions = (value: unknown): value is ContainerEntryOptions => {
  if (!isRecordValue(value)) {
    return false
  }
  return (
    Object.keys(value).length === 2 &&
    Object.hasOwn(value, 'slot') &&
    Object.hasOwn(value, 'item') &&
    typeof value['slot'] === 'number' &&
    Number.isSafeInteger(value['slot']) &&
    value['slot'] >= 0 &&
    value['slot'] <= 255 &&
    isItemStack(value['item'])
  )
}

const isContainerEntry = isContainerEntryOptions

export const isContainerOptions = (value: unknown): value is ContainerOptions =>
  Array.isArray(value) && value.every(isContainerEntryOptions)

export const isContainerComponent = (value: unknown): value is ContainerComponent =>
  Array.isArray(value) && value.every(isContainerEntry)

export const containerComponent = (value: ContainerOptions = []): ContainerComponent => {
  if (!isContainerOptions(value)) {
    throw new TypeError('Invalid container component options')
  }
  return frozenArray(
    value.map((entry): ContainerEntryOptions =>
      Object.freeze({ slot: entry['slot'], item: entry['item'] }),
    ),
  )
}

const mapDecorationComponentOf = (
  value: MapDecorationOptions,
): MapDecorationComponent => Object.freeze({
  type: value.type,
  x: value.x,
  z: value.z,
  rotation: value.rotation,
})

export const mapColorComponent = (value = 4603950): MapColorComponent => {
  if (!isMapColorComponent(value)) {
    throw new RangeError(`Invalid map_color component value: ${String(value)}`)
  }
  return value
}

export const mapDecorationsComponent = (
  value: MapDecorationsOptions = {},
): MapDecorationsComponent => {
  if (!isMapDecorationsOptions(value)) {
    throw new TypeError('Invalid map_decorations component options')
  }
  const normalized: Record<string, MapDecorationComponent> = {}
  for (const [id, decoration] of Object.entries(value)) {
    Object.defineProperty(normalized, id, {
      configurable: false,
      enumerable: true,
      value: mapDecorationComponentOf(decoration),
      writable: false,
    })
  }
  return Object.freeze(normalized)
}

const writableBookPageComponentOf = (
  page: WritableBookPageOptions,
): WritableBookPageComponent => {
  if (typeof page === 'string') {
    return page
  }
  return Object.freeze({
    raw: page.raw,
    ...(page.filtered === undefined ? {} : { filtered: page.filtered }),
  })
}

export const writableBookContentComponent = (
  value: WritableBookContentOptions = {},
): WritableBookContentComponent => {
  if (!isWritableBookContentOptions(value)) {
    throw new TypeError('Invalid writable_book_content component options')
  }
  return Object.freeze({
    pages: frozenArray((value.pages ?? []).map(writableBookPageComponentOf)),
  })
}

const writtenBookPageComponentOf = (
  page: WrittenBookPageOptions,
): WrittenBookPageComponent => {
  if (typeof page === 'string') {
    return page
  }
  return Object.freeze({
    raw: page.raw,
    ...(page.filtered === undefined ? {} : { filtered: page.filtered }),
  })
}

export const writtenBookContentComponent = (
  value: WrittenBookContentOptions,
): WrittenBookContentComponent => {
  if (!isWrittenBookContentOptions(value)) {
    throw new TypeError('Invalid written_book_content component options')
  }
  return Object.freeze({
    pages: frozenArray(value.pages.map(writtenBookPageComponentOf)),
    title: writtenBookPageComponentOf(value.title),
    author: value.author,
    generation: value.generation,
    resolved: value.resolved,
  })
}

const trimPatternComponentOf = (
  value: TrimPatternOptions,
): TrimPatternComponent => {
  if (typeof value === 'string') {
    return ResourceLocation(value)
  }
  return Object.freeze({
    assetId: ResourceLocation(value.assetId),
    description: textComponent(value.description),
    decal: value.decal,
  })
}

const trimMaterialComponentOf = (
  value: TrimMaterialOptions,
): TrimMaterialComponent => {
  if (typeof value === 'string') {
    return ResourceLocation(value)
  }
  const overrideArmorMaterials = value.overrideArmorMaterials === undefined
    ? undefined
    : frozenStringRecord(value.overrideArmorMaterials)
  return Object.freeze({
    assetName: value.assetName,
    ingredient: value.ingredient,
    itemModelIndex: value.itemModelIndex,
    ...(overrideArmorMaterials === undefined ? {} : { overrideArmorMaterials }),
    description: textComponent(value.description),
  })
}

export const trimComponent = (value: TrimOptions): TrimComponent => {
  if (!isTrimOptions(value)) {
    throw new TypeError('Invalid trim component options')
  }
  return Object.freeze({
    pattern: trimPatternComponentOf(value.pattern),
    material: trimMaterialComponentOf(value.material),
  })
}

export const suspiciousStewComponent = (
  value: SuspiciousStewOptions = [],
): SuspiciousStewComponent => {
  if (!isSuspiciousStewOptions(value)) {
    throw new TypeError('Invalid suspicious_stew component options')
  }
  return frozenArray(
    value.map(
      (entry): SuspiciousStewEntryComponent => Object.freeze({
        id: ResourceLocation(entry.id),
        duration: entry.duration ?? 160,
      }),
    ),
  )
}

export const hideAdditionalTooltipComponent = (): HideAdditionalTooltipComponent =>
  Object.freeze({})

const blockPredicateBlockComponentOf = (
  value: BlockPredicateBlockOptions,
): BlockPredicateBlockComponent => {
  const resourceLocationOf = (entry: string): ResourceLocation | TagLocation =>
    entry.startsWith('#') ? TagLocation(entry) : ResourceLocation(entry)
  return typeof value === 'string'
    ? resourceLocationOf(value)
    : frozenArray(value.map(resourceLocationOf))
}

const blockPredicateComponentOf = (
  value: BlockPredicateOptions,
): BlockPredicateComponent => {
  const blocks = value.blocks === undefined
    ? undefined
    : blockPredicateBlockComponentOf(value.blocks)
  const nbt = value.nbt === undefined ? undefined : freezeItemComponentNbtValue(value.nbt)
  const state = value.state === undefined ? undefined : frozenStringRecord(value.state)
  return Object.freeze({
    ...(blocks === undefined ? {} : { blocks }),
    ...(nbt === undefined ? {} : { nbt }),
    ...(state === undefined ? {} : { state }),
  })
}

const isBlockPredicateOptionsArray = (
  value: CanBreakOptions,
): value is ReadonlyArray<BlockPredicateOptions> => Array.isArray(value)

const canBreakComponentOf = (value: CanBreakOptions): CanBreakComponent => {
  if (isBlockPredicateOptionsArray(value)) {
    return frozenArray(value.map(blockPredicateComponentOf))
  }
  return blockPredicateComponentOf(value)
}

export const canBreakComponent = (value: CanBreakOptions): CanBreakComponent => {
  if (!isCanBreakOptions(value)) {
    throw new TypeError('Invalid can_break component options')
  }
  return canBreakComponentOf(value)
}

export const canPlaceOnComponent = (value: CanPlaceOnOptions): CanPlaceOnComponent => {
  if (!isCanPlaceOnOptions(value)) {
    throw new TypeError('Invalid can_place_on component options')
  }
  return canBreakComponentOf(value)
}

const resourceLocationProviderOf = (
  value: ResourceLocationProviderInput,
): ResourceLocationProvider => {
  if (typeof value === 'string') {
    return value.startsWith('#') ? TagLocation(value) : ResourceLocation(value)
  }
  return frozenArray(value.map((entry) => ResourceLocation(entry)))
}

export const customModelDataComponent = (options: CustomModelDataOptions = {}): CustomModelDataComponent => {
  if (!isCustomModelDataOptions(options)) throw new TypeError('Invalid custom_model_data component options')
  return Object.freeze({
    floats: frozenArray(options.floats ?? []),
    flags: frozenArray(options.flags ?? []),
    strings: frozenArray(options.strings ?? []),
    colors: frozenArray(options.colors ?? []),
  })
}

export const mapIdComponent = (value: number): MapIdComponent => {
  if (!isMapIdComponent(value)) throw new RangeError(`Invalid map_id component value: ${String(value)}`)
  return MapId(value)
}

export const blockStateComponent = (value: Readonly<Record<string, string>>): BlockStateComponent => {
  if (!isBlockStateComponent(value)) throw new TypeError('Invalid block_state component value')
  return frozenStringRecord(value)
}

export const instrumentComponent = (value: string): InstrumentComponent => {
  if (!isInstrumentComponent(value)) throw new TypeError(`Invalid instrument component value: ${String(value)}`)
  return ResourceLocation(value)
}

export const noteBlockSoundComponent = (value: string): NoteBlockSoundComponent => {
  if (!isNoteBlockSoundComponent(value)) {
    throw new TypeError(`Invalid note_block_sound component value: ${String(value)}`)
  }
  return ResourceLocation(value)
}

export const recipesComponent = (value: ReadonlyArray<string>): RecipesComponent => {
  if (!isRecipesComponent(value)) throw new TypeError('Invalid recipes component value')
  return frozenArray(value.map((entry) => ResourceLocation(entry)))
}

export const lockComponent = (value: string): LockComponent => {
  if (!isLockComponent(value)) throw new TypeError(`Invalid lock component value: ${String(value)}`)
  return value
}

export const tooltipStyleComponent = (value: string): TooltipStyleComponent => {
  if (!isTooltipStyleComponent(value)) {
    throw new TypeError(`Invalid tooltip_style component value: ${String(value)}`)
  }
  return ResourceLocation(value)
}

export const baseColorComponent = (value: string): BaseColorComponent => {
  if (!isBaseColorComponent(value)) throw new TypeError(`Invalid base_color component value: ${String(value)}`)
  return value
}

export const equippableComponent = (options: EquippableOptions): EquippableComponent => {
  if (!isEquippableOptions(options)) throw new TypeError('Invalid equippable component options')
  const normalized = {
    slot: options.slot,
    ...(options.equipSound === undefined ? {} : { equipSound: ResourceLocation(options.equipSound) }),
    ...(options.model === undefined ? {} : { model: ResourceLocation(options.model) }),
    ...(options.cameraOverlay === undefined
      ? {}
      : { cameraOverlay: ResourceLocation(options.cameraOverlay) }),
    ...(options.allowedEntities === undefined
      ? {}
      : { allowedEntities: resourceLocationProviderOf(options.allowedEntities) }),
    canBeSheared: options.canBeSheared ?? false,
    shearingSound: ResourceLocation(options.shearingSound ?? 'minecraft:item.shears.snip'),
    dispensable: options.dispensable ?? true,
    swappable: options.swappable ?? true,
    damageOnHurt: options.damageOnHurt ?? true,
    equipOnInteract: options.equipOnInteract ?? false,
  }
  return Object.freeze(normalized)
}

const kineticWeaponConditionOf = (
  options: KineticWeaponConditionOptions,
): KineticWeaponCondition => {
  return Object.freeze({
    maxDurationTicks: options.maxDurationTicks,
    minSpeed: options.minSpeed ?? 0,
    minRelativeSpeed: options.minRelativeSpeed ?? 0,
  })
}

export const kineticWeaponComponent = (
  options: KineticWeaponOptions = {},
): KineticWeaponComponent => {
  if (!isKineticWeaponOptions(options)) throw new TypeError('Invalid kinetic_weapon component options')
  const normalized = {
    contactCooldownTicks: options.contactCooldownTicks ?? 10,
    delayTicks: options.delayTicks ?? 0,
    ...(options.dismountConditions === undefined
      ? {}
      : { dismountConditions: kineticWeaponConditionOf(options.dismountConditions) }),
    ...(options.knockbackConditions === undefined
      ? {}
      : { knockbackConditions: kineticWeaponConditionOf(options.knockbackConditions) }),
    ...(options.damageConditions === undefined
      ? {}
      : { damageConditions: kineticWeaponConditionOf(options.damageConditions) }),
    forwardMovement: options.forwardMovement ?? 0,
    damageMultiplier: options.damageMultiplier ?? 1,
    ...(options.sound === undefined ? {} : { sound: ResourceLocation(options.sound) }),
    ...(options.hitSound === undefined ? {} : { hitSound: ResourceLocation(options.hitSound) }),
  }
  return Object.freeze(normalized)
}

export const piercingWeaponComponent = (
  options: PiercingWeaponOptions = {},
): PiercingWeaponComponent => {
  if (!isPiercingWeaponOptions(options)) throw new TypeError('Invalid piercing_weapon component options')
  return Object.freeze({
    dealsKnockback: options.dealsKnockback ?? true,
    dismounts: options.dismounts ?? false,
    ...(options.sound === undefined ? {} : { sound: ResourceLocation(options.sound) }),
    ...(options.hitSound === undefined ? {} : { hitSound: ResourceLocation(options.hitSound) }),
  })
}

export const gliderComponent = (): GliderComponent => Object.freeze({})

export const deathProtectionComponent = (
  options: DeathProtectionOptions = {},
): DeathProtectionComponent => {
  if (!isDeathProtectionOptions(options)) throw new TypeError('Invalid death_protection component options')
  return Object.freeze({ deathEffects: frozenArray(options.deathEffects ?? []) })
}

export const repairableComponent = (value: ResourceLocationProviderInput): RepairableComponent => {
  if (!isResourceLocationProvider(value)) throw new TypeError('Invalid repairable component items')
  return Object.freeze({ items: resourceLocationProviderOf(value) })
}

export const enchantableComponent = (value: number): EnchantableComponent => {
  if (!isEnchantableValue(value)) throw new RangeError(`Invalid enchantable component value: ${String(value)}`)
  return Object.freeze({ value })
}

export const jukeboxPlayableComponent = (value: string): JukeboxPlayableComponent => {
  if (typeof value !== 'string' || !ResourceLocation.is(value)) {
    throw new TypeError(`Invalid jukebox_playable component value: ${String(value)}`)
  }
  return Object.freeze({ song: ResourceLocation(value) })
}

export const ominousBottleAmplifierComponent = (value: number): OminousBottleAmplifierComponent => {
  if (!isOminousBottleAmplifierComponent(value)) {
    throw new RangeError(`Invalid ominous_bottle_amplifier value: ${String(value)}`)
  }
  return value
}

export const paintingVariantComponent = (value: string): PaintingVariantComponent => {
  if (!isPaintingVariantComponent(value)) {
    throw new TypeError(`Invalid painting/variant component value: ${String(value)}`)
  }
  return ResourceLocation(value)
}

export const sulfurCubeContentComponent = (
  value: SulfurCubeContentOptions,
): SulfurCubeContentComponent => {
  if (!isSulfurCubeContentOptions(value)) {
    throw new TypeError(`Invalid sulfur_cube_content component value: ${String(value)}`)
  }
  return ResourceLocation(value)
}

const frozenPosition = (
  value: readonly [number, number, number],
): readonly [number, number, number] =>
  Object.freeze([value[0], value[1], value[2]])

export const lodestoneTrackerComponent = (
  options: LodestoneTrackerOptions = {},
): LodestoneTrackerComponent => {
  if (!isLodestoneTrackerOptions(options)) {
    throw new TypeError('Invalid lodestone_tracker component options')
  }
  const target = options.target === undefined
    ? undefined
    : Object.freeze({
        pos: frozenPosition(options.target.pos),
        dimension: ResourceLocation(options.target.dimension),
      })
  const normalized: LodestoneTrackerComponent = {
    ...(target === undefined ? {} : { target }),
    tracked: options.tracked ?? true,
  }
  return Object.freeze(normalized)
}

export const fireworkExplosionComponent = (
  options: FireworkExplosionOptions,
): FireworkExplosionComponent => {
  if (!isFireworkExplosionOptions(options)) {
    throw new TypeError('Invalid firework_explosion component options')
  }
  return Object.freeze({
    shape: options.shape,
    colors: frozenArray(options.colors ?? []),
    fadeColors: frozenArray(options.fadeColors ?? []),
    hasTrail: options.hasTrail ?? false,
    hasTwinkle: options.hasTwinkle ?? false,
  })
}

export const fireworksComponent = (options: FireworksOptions = {}): FireworksComponent => {
  if (!isFireworksOptions(options)) {
    throw new TypeError('Invalid fireworks component options')
  }
  return Object.freeze({
    explosions: frozenArray((options.explosions ?? []).map(fireworkExplosionComponent)),
    flightDuration: options.flightDuration ?? 1,
  })
}

export const bannerPatternsComponent = (
  value: ReadonlyArray<BannerPatternOptions> = [],
): BannerPatternsComponent => {
  if (!isBannerPatternsOptions(value)) {
    throw new TypeError('Invalid banner_patterns component value')
  }
  return Object.freeze(
    value.map((entry) => {
      const normalized: BannerPatternEntry = {
        pattern: ResourceLocation(entry.pattern),
        color: entry.color,
      }
      return Object.freeze(normalized)
    }),
  )
}

const DEFAULT_POT_DECORATIONS: PotDecorationsOptions = [
  'minecraft:brick',
  'minecraft:brick',
  'minecraft:brick',
  'minecraft:brick',
]

export const potDecorationsComponent = (
  value: PotDecorationsOptions = DEFAULT_POT_DECORATIONS,
): PotDecorationsComponent => {
  if (!isPotDecorationsOptions(value)) {
    throw new TypeError('Invalid pot_decorations component value')
  }
  const normalized: [ResourceLocation, ResourceLocation, ResourceLocation, ResourceLocation] = [
    ResourceLocation(value[0]),
    ResourceLocation(value[1]),
    ResourceLocation(value[2]),
    ResourceLocation(value[3]),
  ]
  return Object.freeze(normalized)
}

export const containerLootComponent = (options: ContainerLootOptions): ContainerLootComponent => {
  if (!isContainerLootOptions(options)) {
    throw new TypeError('Invalid container_loot component options')
  }
  return Object.freeze({
    lootTable: ResourceLocation(options.lootTable),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })
}

export const debugStickStateComponent = (
  value: Readonly<Record<string, string>> = {},
): DebugStickStateComponent => {
  if (!isDebugStickStateComponent(value)) {
    throw new TypeError('Invalid debug_stick_state component value')
  }
  const normalized: Record<string, string> = {}
  for (const [block, property] of Object.entries(value)) {
    Object.defineProperty(normalized, ResourceLocation(block), {
      configurable: false,
      enumerable: true,
      value: property,
      writable: false,
    })
  }
  return Object.freeze(normalized)
}

const validateTooltipDisplayOptions = (options: TooltipDisplayOptions): void => {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('Tooltip display options must be a non-null object')
  }
  if (options.hideTooltip !== undefined && typeof options.hideTooltip !== 'boolean') {
    throw new TypeError('hideTooltip must be a boolean')
  }
  if (options.hiddenComponents !== undefined) {
    if (!Array.isArray(options.hiddenComponents)) {
      throw new TypeError('hiddenComponents must be an array of resource locations')
    }
    if (!options.hiddenComponents.every((component) => ResourceLocation.is(component))) {
      throw new TypeError('hiddenComponents must contain valid resource locations')
    }
  }
}

export const tooltipDisplayComponent = (
  options: TooltipDisplayOptions = {},
): TooltipDisplayComponent => {
  validateTooltipDisplayOptions(options)
  return Object.freeze({
    hideTooltip: options.hideTooltip ?? false,
    hiddenComponents: Object.freeze(
      (options.hiddenComponents ?? []).map((component) => ResourceLocation(component)),
    ),
  })
}

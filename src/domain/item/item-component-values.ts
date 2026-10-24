/** Constructors and guards for simple Java item-component values. */
import { Effect, Result } from 'effect'
import {
  MAX_GENERIC_INPUT_ARRAY_LENGTH,
  snapshotInputValue as snapshotUnknownInputValue,
} from '../../input-snapshot.js'
import { ResourceLocation, TagLocation, UUID } from '../text/identifiers.js'
import { BlockAxis } from '../coordinates/coordinate-primitives.js'
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
import type { ItemStack } from './item-stack.js'
import { isItemComponents } from './item-components-validation.js'
import { itemComponentStackLimitOf } from './item-components-data.js'
import { isItemType } from './item-type.js'
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
import { AdditionalTradeCost, MapId, PotionDurationScale } from '../time/quantities.js'
import { textComponent, type TextComponentFailure } from '../text/text-component.js'
import {
  BeeHiveTicks,
  BlockStatePropertyValue,
  BookAuthor,
  BookGeneration,
  BookPageText,
  ContainerSlotIndex,
  DyeColorChannel,
  EffectAmplifier,
  Enchantability,
  FireworksFlightDuration,
  ItemComponentNbtKey,
  ItemComponentNbtString,
  ItemLock,
  KineticDamageMultiplier,
  KineticDurationTicks,
  KineticMovement,
  KineticSpeed,
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
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

type ItemComponentResult<A> = Result.Result<A, ItemValidationFailure | TextComponentFailure>

const componentFailure = (
  field: string,
  message: string,
  value?: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  kind: ItemValidationFailure['kind'] = 'TypeError',
): ItemValidationFailure => itemValidationFailure(field, message, reason, value, kind)

const reflectionResult = <A>(
  field: string,
  input: unknown,
  read: () => A,
): ItemComponentResult<A> => Effect.runSync(Effect.result(Effect.try({
  try: read,
  catch: () => componentFailure(field, `Unable to inspect ${field}`, input, 'hostile-input'),
})))

const snapshotComponentInput = (
  value: unknown,
  field: string,
  invalidPrototypeMessage = `Unable to inspect ${field}`,
): ItemComponentResult<unknown> => {
  const snapshot = snapshotUnknownInputValue(value, MAX_GENERIC_INPUT_ARRAY_LENGTH, field)
  if (Result.isSuccess(snapshot)) return Result.succeed(snapshot.success)
  if (snapshot.failure.reason === 'unsupported-prototype') {
    return Result.fail(componentFailure(field, invalidPrototypeMessage, value, 'invalid-value'))
  }
  // snapshotInputValue cannot return invalid-container, and the field is its path prefix.
  const reason = snapshot.failure.reason === 'cyclic' ? 'invalid-value' : 'hostile-input'
  const errorField = snapshot.failure.path
  const message = snapshot.failure.reason === 'cyclic'
    ? `Cyclic ${errorField} input is invalid`
    : `Unable to inspect ${errorField}`
  return Result.fail(componentFailure(errorField, message, snapshot.failure.value, reason))
}

type InputValidation<A> = Readonly<{ readonly valid: true; readonly value: A }> | Readonly<{ readonly valid: false }>

const validatedInput = <A>(
  value: A,
  field: string,
  message: string,
  isValid: (value: unknown) => value is A,
): ItemComponentResult<A> => {
  const snapshot = snapshotComponentInput(value, field, message)
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)
  const checked = reflectionResult(field, snapshot.success, (): InputValidation<A> => {
    if (isValid(snapshot.success)) return { valid: true, value: snapshot.success }
    return { valid: false }
  })
  if (Result.isFailure(checked)) return Result.fail(checked.failure)
  if (checked.success.valid) return Result.succeed(checked.success.value)
  return Result.fail(componentFailure(field, message, value))
}

const brandResult = <A, E extends Readonly<{ readonly message: string }>>(
  result: Result.Result<A, E>,
  field: string,
  value: unknown,
  kind: ItemValidationFailure['kind'] = 'TypeError',
  reason: ItemValidationFailure['reason'] = 'invalid-value',
): ItemComponentResult<A> => Result.mapError(
  result,
  (error) => componentFailure(field, error.message, value, reason, kind),
)

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
  readonly hiddenComponents?: ReadonlyArray<ResourceLocation>
}>

export const potionDurationScaleComponent = (value = 1): ItemComponentResult<PotionDurationScale> =>
  brandResult(PotionDurationScale.result(value), 'potion_duration_scale', value, 'RangeError', 'out-of-range')

export const additionalTradeCostComponent = (value = 0): ItemComponentResult<AdditionalTradeCost> =>
  brandResult(AdditionalTradeCost.result(value), 'additional_trade_cost', value, 'RangeError', 'out-of-range')

export const breakSoundComponent = (value: string): ItemComponentResult<ResourceLocation> =>
  brandResult(ResourceLocation.result(value), 'break_sound', value)

export const providesTrimMaterialComponent = (value: string): ItemComponentResult<ResourceLocation> =>
  brandResult(ResourceLocation.result(value), 'provides_trim_material', value)

export const providesBannerPatternsComponent = (
  value: string | ReadonlyArray<string>,
): ItemComponentResult<BannerPatternProvider> => {
  if (typeof value === 'string') {
    return value.startsWith('#')
      ? brandResult(TagLocation.result(value), 'provides_banner_patterns', value)
      : brandResult(ResourceLocation.result(value), 'provides_banner_patterns', value)
  }
  if (!Array.isArray(value)) {
    return Result.fail(componentFailure('provides_banner_patterns', 'provides_banner_patterns must be a resource location, tag, or list of resource locations', value, 'invalid-type'))
  }
  if (!value.every((entry) => typeof entry === 'string' && !entry.startsWith('#'))) {
    return Result.fail(componentFailure('provides_banner_patterns', 'provides_banner_patterns lists must contain resource locations', value, 'invalid-type'))
  }
  return Result.gen(function* () {
    const locations: ResourceLocation[] = []
    for (const entry of value) {
      locations.push(yield* brandResult(ResourceLocation.result(entry), 'provides_banner_patterns', entry))
    }
    return Object.freeze(locations)
  })
}

export const dyeComponent = (value: string): ItemComponentResult<DyeColor> => {
  if (!isDyeComponent(value)) {
    return Result.fail(componentFailure('dye', `Unknown dye color: ${value}`, value, 'out-of-range', 'RangeError'))
  }
  return Result.succeed(value)
}

function freezeItemComponentNbtValue(value: BlockEntityDataComponent): BlockEntityDataComponent
function freezeItemComponentNbtValue(value: BucketEntityDataComponent): BucketEntityDataComponent
function freezeItemComponentNbtValue(value: EntityDataComponent): EntityDataComponent
function freezeItemComponentNbtValue(value: ItemComponentNbtObject): CustomDataComponent
function freezeItemComponentNbtValue(value: ItemComponentNbtValue): ItemComponentNbtValue
function freezeItemComponentNbtValue<T extends ItemComponentNbtObject>(value: T): Readonly<T>
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

export const customDataComponent = (value: CustomDataComponent): ItemComponentResult<CustomDataComponent> => {
  return Result.gen(function* () {
    const input = yield* validatedInput(value, 'custom_data', 'custom_data must be a non-empty object containing NBT-compatible values', isCustomDataComponent)
    return freezeItemComponentNbtValue(input)
  })
}

export const dyedColorComponent = (value: DyedColorComponent): ItemComponentResult<DyedColorComponent> => {
  const snapshot = snapshotComponentInput(value, 'dyed_color')
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)
  const input = snapshot.success
  if (!isDyedColorComponent(input)) {
    return Result.fail(componentFailure('dyed_color', 'dyed_color must be an RGB integer or three normalized color channels', value, 'out-of-range', 'RangeError'))
  }
  if (typeof input === 'number') {
    return brandResult(RgbColor.result(input), 'dyed_color', input, 'RangeError', 'out-of-range')
  }
  return Result.gen(function* () {
    const channels: [DyeColorChannel, DyeColorChannel, DyeColorChannel] = [
      yield* brandResult(DyeColorChannel.result(input[0]), 'dyed_color[0]', input[0], 'RangeError', 'out-of-range'),
      yield* brandResult(DyeColorChannel.result(input[1]), 'dyed_color[1]', input[1], 'RangeError', 'out-of-range'),
      yield* brandResult(DyeColorChannel.result(input[2]), 'dyed_color[2]', input[2], 'RangeError', 'out-of-range'),
    ]
    return Object.freeze(channels)
  })
}

const frozenStringRecord = <Value extends string>(
  value: Readonly<Record<string, Value>>,
): Readonly<Record<string, Value>> => {
  const copy: Record<string, Value> = {}
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

const frozenBrandedStringRecord = <Key extends string, Value extends string>(
  value: Readonly<Record<Key, Value>>,
  keyOf: (value: string) => Result.Result<Key, Readonly<{ readonly message: string }>>,
  valueOf: (value: string) => Result.Result<Value, Readonly<{ readonly message: string }>>,
  field: string,
): ItemComponentResult<Readonly<Record<Key, Value>>> => Result.gen(function* () {
  const copy: Record<string, Value> = {}
  for (const key of Object.keys(value)) {
    const brandedKey = yield* brandResult(keyOf(key), field, key)
    const item = value[brandedKey]
    const entry = yield* brandResult(valueOf(item), field, item)
    Object.defineProperty(copy, brandedKey, {
      configurable: false,
      enumerable: true,
      value: entry,
      writable: false,
    })
  }
  return Object.freeze(copy)
})

const frozenArray = <T>(value: ReadonlyArray<T>): ReadonlyArray<T> => Object.freeze([...value])

export const entityDataComponent = (value: EntityDataOptions): ItemComponentResult<EntityDataComponent> => {
  const parsed = validatedInput(value, 'entity_data', 'Invalid entity_data component options', isEntityDataOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.map(brandResult(ResourceLocation.result(parsed.success.id), 'entity_data.id', parsed.success.id), (id) =>
    freezeItemComponentNbtValue({ ...parsed.success, id }))
}

export const bucketEntityDataComponent = (
  value: BucketEntityDataOptions = {},
): ItemComponentResult<BucketEntityDataComponent> => {
  return Result.gen(function* () {
    const input = yield* validatedInput(value, 'bucket_entity_data', 'Invalid bucket_entity_data component options', isBucketEntityDataOptions)
    return freezeItemComponentNbtValue(input)
  })
}

export const blockEntityDataComponent = (value: BlockEntityDataOptions): ItemComponentResult<BlockEntityDataComponent> => {
  const parsed = validatedInput(value, 'block_entity_data', 'Invalid block_entity_data component options', isBlockEntityDataOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.map(brandResult(ResourceLocation.result(parsed.success.id), 'block_entity_data.id', parsed.success.id), (id) =>
    freezeItemComponentNbtValue({ ...parsed.success, id }))
}

export const profileComponent = (value: ProfileOptions): ItemComponentResult<ProfileComponent> => {
  const parsed = validatedInput(value, 'profile', 'Invalid profile component options', isProfileOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const profile = parsed.success
  if (typeof profile === 'string') {
    return brandResult(ProfileName.result(profile), 'profile', profile)
  }

  return Result.gen(function* () {
    const name = profile.name === undefined
      ? undefined
      : yield* brandResult(ProfileName.result(profile.name), 'profile.name', profile.name)
    const id = profile.id === undefined
      ? undefined
      : yield* brandResult(UUID.result(profile.id), 'profile.id', profile.id)
    const properties: ProfilePropertyComponent[] = []
    for (const property of profile.properties ?? []) {
      const propertyName = yield* brandResult(ProfilePropertyName.result(property.name), 'profile.properties.name', property.name)
      const propertyValue = yield* brandResult(ProfilePropertyValue.result(property.value), 'profile.properties.value', property.value)
      const signature = property.signature === undefined
        ? undefined
        : yield* brandResult(ProfilePropertySignature.result(property.signature), 'profile.properties.signature', property.signature)
      properties.push(Object.freeze({
        name: propertyName,
        value: propertyValue,
        ...(signature === undefined ? {} : { signature }),
      }))
    }
    const normalized: ProfileObjectComponent = {
      ...(name === undefined ? {} : { name }),
      ...(id === undefined ? {} : { id }),
      ...(profile.properties === undefined ? {} : { properties: frozenArray(properties) }),
    }
    return Object.freeze(normalized)
  })
}

const potionEffectInstanceComponentOf = (
  value: PotionEffectInstanceOptions,
): ItemComponentResult<PotionEffectInstanceComponent> => {
  const hiddenEffect = value.hiddenEffect === undefined
    ? Result.succeed(undefined)
    : potionEffectInstanceComponentOf(value.hiddenEffect)
  return Result.gen(function* () {
    const innerEffect = yield* hiddenEffect
    const id = yield* brandResult(ResourceLocation.result(value.id), 'potion_contents.customEffects.id', value.id)
    const amplifier = yield* brandResult(EffectAmplifier.result(value.amplifier ?? 0), 'potion_contents.customEffects.amplifier', value.amplifier ?? 0, 'RangeError', 'out-of-range')
    const duration = yield* brandResult(PotionEffectDurationTicks.result(value.duration ?? 0), 'potion_contents.customEffects.duration', value.duration ?? 0, 'RangeError', 'out-of-range')
    return Object.freeze({
      id,
      amplifier,
      duration,
      ambient: value.ambient ?? false,
      showParticles: value.showParticles ?? true,
      showIcon: value.showIcon ?? true,
      ...(innerEffect === undefined ? {} : { hiddenEffect: innerEffect }),
    })
  })
}

export const beesComponent = (value: BeesOptions = []): ItemComponentResult<BeesComponent> => {
  const parsed = validatedInput(value, 'bees', 'Invalid bees component options', isBeesOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const entries: BeeEntryComponent[] = []
    for (const entry of parsed.success) {
      const entityData = yield* frozenBrandedStringRecord(
        entry.entityData,
        (key) => ItemComponentNbtKey.result(key),
        (item) => ItemComponentNbtString.result(item),
        'bees.entityData',
      )
      const ticksInHive = yield* brandResult(BeeHiveTicks.result(entry.ticksInHive), 'bees.ticksInHive', entry.ticksInHive, 'RangeError', 'out-of-range')
      const minTicksInHive = yield* brandResult(BeeHiveTicks.result(entry.minTicksInHive), 'bees.minTicksInHive', entry.minTicksInHive, 'RangeError', 'out-of-range')
      entries.push(Object.freeze({ entityData, ticksInHive, minTicksInHive }))
    }
    return Object.freeze(entries)
  })
}

export const potionContentsComponent = (
  value: PotionContentsOptions = {},
): ItemComponentResult<PotionContentsComponent> => {
  const parsed = validatedInput(value, 'potion_contents', 'Invalid potion_contents component options', isPotionContentsOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const input = parsed.success
  if (typeof input === 'string') {
    return brandResult(ResourceLocation.result(input), 'potion_contents', input)
  }
  return Result.gen(function* () {
    const potion = input.potion === undefined
      ? undefined
      : yield* brandResult(ResourceLocation.result(input.potion), 'potion_contents.potion', input.potion)
    const customEffects: PotionEffectInstanceComponent[] = []
    for (const effect of input.customEffects ?? []) {
      customEffects.push(yield* potionEffectInstanceComponentOf(effect))
    }
    return Object.freeze({
      ...(potion === undefined ? {} : { potion }),
      ...(input.customColor === undefined ? {} : { customColor: input.customColor }),
      customEffects: frozenArray(customEffects),
    })
  })
}

type RecordValue = Readonly<Record<string, unknown>>

const isRecordValue = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isItemStack = (value: unknown): value is ItemStack => {
  if (!isRecordValue(value)) return false
  const item = value['item']
  if (!isItemType(item) || !isItemComponents(value['components'])) return false
  const count = value['count']
  return Number.isSafeInteger(count) && Number(count) >= 1 && Number(count) <= itemComponentStackLimitOf(item)
}

const isItemStackList = (value: unknown): value is ReadonlyArray<ItemStack> =>
  Array.isArray(value) && value.every(isItemStack)

export const isChargedProjectilesOptions = (value: unknown): value is ChargedProjectilesOptions =>
  isItemStackList(value)

export const isChargedProjectilesComponent = (value: unknown): value is ChargedProjectilesComponent =>
  isItemStackList(value)

export const chargedProjectilesComponent = (
  value: ChargedProjectilesOptions = [],
): ItemComponentResult<ChargedProjectilesComponent> =>
  Result.map(validatedInput(value, 'charged_projectiles', 'Invalid charged_projectiles component options', isChargedProjectilesOptions), frozenArray)

export const isBundleContentsOptions = (value: unknown): value is BundleContentsOptions =>
  isItemStackList(value)

export const isBundleContentsComponent = (value: unknown): value is BundleContentsComponent =>
  isItemStackList(value)

export const bundleContentsComponent = (
  value: BundleContentsOptions = [],
): ItemComponentResult<BundleContentsComponent> =>
  Result.map(validatedInput(value, 'bundle_contents', 'Invalid bundle_contents component options', isBundleContentsOptions), frozenArray)

const isContainerEntryOptions = (value: unknown): value is ContainerEntryOptions => {
  if (!isRecordValue(value)) {
    return false
  }
  return (
    Object.keys(value).length === 2 &&
    Object.hasOwn(value, 'slot') &&
    Object.hasOwn(value, 'item') &&
    typeof value['slot'] === 'number' &&
    ContainerSlotIndex.is(value['slot']) &&
    isItemStack(value['item'])
  )
}

const isContainerEntry = isContainerEntryOptions

export const isContainerOptions = (value: unknown): value is ContainerOptions =>
  Array.isArray(value) && value.every(isContainerEntryOptions)

export const isContainerComponent = (value: unknown): value is ContainerComponent =>
  Array.isArray(value) && value.every(isContainerEntry)

export const containerComponent = (value: ContainerOptions = []): ItemComponentResult<ContainerComponent> =>
  Result.flatMap(
    validatedInput(value, 'container', 'Invalid container component options', isContainerOptions),
    (entries) => Result.gen(function* () {
      const normalized: ContainerEntryOptions[] = []
      for (const entry of entries) {
        const slot = yield* brandResult(ContainerSlotIndex.result(entry.slot), 'container.slot', entry.slot, 'RangeError', 'out-of-range')
        normalized.push(Object.freeze({ slot, item: entry.item }))
      }
      return frozenArray(normalized)
    }),
  )

const mapDecorationComponentOf = (
  value: MapDecorationOptions,
): ItemComponentResult<MapDecorationComponent> => Result.gen(function* () {
  const x = yield* brandResult(MapDecorationCoordinate.result(value.x), 'map_decorations.x', value.x, 'RangeError', 'out-of-range')
  const z = yield* brandResult(MapDecorationCoordinate.result(value.z), 'map_decorations.z', value.z, 'RangeError', 'out-of-range')
  const rotation = yield* brandResult(MapDecorationRotation.result(value.rotation), 'map_decorations.rotation', value.rotation, 'RangeError', 'out-of-range')
  return Object.freeze({ type: value.type, x, z, rotation })
})

export const mapColorComponent = (value = 4603950): ItemComponentResult<MapColorComponent> => {
  if (!isMapColorComponent(value)) {
    return Result.fail(componentFailure('map_color', `Invalid map_color component value: ${String(value)}`, value, 'out-of-range', 'RangeError'))
  }
  return brandResult(RgbColor.result(value), 'map_color', value, 'RangeError', 'out-of-range')
}

export const mapDecorationsComponent = (
  value: MapDecorationsOptions = {},
): ItemComponentResult<MapDecorationsComponent> => {
  const parsed = validatedInput(value, 'map_decorations', 'Invalid map_decorations component options', isMapDecorationsOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const normalized: Record<string, MapDecorationComponent> = {}
    for (const [id, decoration] of Object.entries(parsed.success)) {
      const component = yield* mapDecorationComponentOf(decoration)
      Object.defineProperty(normalized, id, {
        configurable: false,
        enumerable: true,
        value: component,
        writable: false,
      })
    }
    return Object.freeze(normalized)
  })
}

const writableBookPageComponentOf = (
  page: WritableBookPageOptions,
): ItemComponentResult<WritableBookPageComponent> => Result.gen(function* () {
  if (typeof page === 'string') {
    return yield* brandResult(BookPageText.result(page), 'writable_book_content.page', page)
  }
  const raw = yield* brandResult(BookPageText.result(page.raw), 'writable_book_content.page.raw', page.raw)
  const filtered = page.filtered === undefined
    ? undefined
    : yield* brandResult(BookPageText.result(page.filtered), 'writable_book_content.page.filtered', page.filtered)
  return Object.freeze({ raw, ...(filtered === undefined ? {} : { filtered }) })
})

export const writableBookContentComponent = (
  value: WritableBookContentOptions = {},
): ItemComponentResult<WritableBookContentComponent> => {
  const parsed = validatedInput(value, 'writable_book_content', 'Invalid writable_book_content component options', isWritableBookContentOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const pages: WritableBookPageComponent[] = []
    for (const page of parsed.success.pages ?? []) pages.push(yield* writableBookPageComponentOf(page))
    return Object.freeze({ pages: frozenArray(pages) })
  })
}

const writtenBookPageComponentOf = (
  page: WrittenBookPageOptions,
): ItemComponentResult<WrittenBookPageComponent> => Result.gen(function* () {
  if (typeof page === 'string') {
    return yield* brandResult(BookPageText.result(page), 'written_book_content.page', page)
  }
  const raw = yield* brandResult(BookPageText.result(page.raw), 'written_book_content.page.raw', page.raw)
  const filtered = page.filtered === undefined
    ? undefined
    : yield* brandResult(BookPageText.result(page.filtered), 'written_book_content.page.filtered', page.filtered)
  return Object.freeze({ raw, ...(filtered === undefined ? {} : { filtered }) })
})

export const writtenBookContentComponent = (
  value: WrittenBookContentOptions,
): ItemComponentResult<WrittenBookContentComponent> => {
  const parsed = validatedInput(value, 'written_book_content', 'Invalid written_book_content component options', isWrittenBookContentOptions)
  if (Result.isFailure(parsed)) return parsed
  return Result.gen(function* () {
    const pages: WrittenBookPageComponent[] = []
    for (const page of parsed.success.pages) pages.push(yield* writtenBookPageComponentOf(page))
    const title = yield* writtenBookPageComponentOf(parsed.success.title)
    const author = yield* brandResult(BookAuthor.result(parsed.success.author), 'written_book_content.author', parsed.success.author)
    const generation = yield* brandResult(BookGeneration.result(parsed.success.generation), 'written_book_content.generation', parsed.success.generation, 'RangeError', 'out-of-range')
    return Object.freeze({
      pages: frozenArray(pages),
      title,
      author,
      generation,
      resolved: parsed.success.resolved,
    })
  })
}

const trimPatternComponentOf = (
  value: TrimPatternOptions,
): ItemComponentResult<TrimPatternComponent> => {
  if (typeof value === 'string') {
    return brandResult(ResourceLocation.result(value), 'trim.pattern', value)
  }
  return Result.gen(function* () {
    const assetId = yield* brandResult(ResourceLocation.result(value.assetId), 'trim.pattern.assetId', value.assetId)
    const description = yield* textComponent(value.description)
    return Object.freeze({ assetId, description, decal: value.decal })
  })
}

const trimMaterialComponentOf = (
  value: TrimMaterialOptions,
): ItemComponentResult<TrimMaterialComponent> => {
  if (typeof value === 'string') {
    return brandResult(ResourceLocation.result(value), 'trim.material', value)
  }
  return Result.gen(function* () {
    const assetName = yield* brandResult(TrimAssetName.result(value.assetName), 'trim.material.assetName', value.assetName)
    const ingredient = value.ingredient
    const itemModelIndex = yield* brandResult(TrimItemModelIndex.result(value.itemModelIndex), 'trim.material.itemModelIndex', value.itemModelIndex, 'RangeError', 'out-of-range')
    const overrideArmorMaterialsInput = value.overrideArmorMaterials
    const overrideArmorMaterials = overrideArmorMaterialsInput === undefined
      ? undefined
      : yield* Result.gen(function* () {
        const normalized: Record<string, ResourceLocation> = {}
        for (const [key, location] of Object.entries(overrideArmorMaterialsInput)) {
          const brandedKey = yield* brandResult(TrimArmorMaterialKey.result(key), 'trim.material.overrideArmorMaterials.key', key)
          Object.defineProperty(normalized, brandedKey, {
            configurable: false,
            enumerable: true,
            value: location,
            writable: false,
          })
        }
        return Object.freeze(normalized)
      })
    const description = yield* textComponent(value.description)
    return Object.freeze({
      assetName,
      ingredient,
      itemModelIndex,
      ...(overrideArmorMaterials === undefined ? {} : { overrideArmorMaterials }),
      description,
    })
  })
}

export const trimComponent = (value: TrimOptions): ItemComponentResult<TrimComponent> => {
  const parsed = validatedInput(value, 'trim', 'Invalid trim component options', isTrimOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const pattern = yield* trimPatternComponentOf(parsed.success.pattern)
    const material = yield* trimMaterialComponentOf(parsed.success.material)
    return Object.freeze({ pattern, material })
  })
}

export const suspiciousStewComponent = (
  value: SuspiciousStewOptions = [],
): ItemComponentResult<SuspiciousStewComponent> => {
  const parsed = validatedInput(value, 'suspicious_stew', 'Invalid suspicious_stew component options', isSuspiciousStewOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const entries: SuspiciousStewEntryComponent[] = []
    for (const entry of parsed.success) {
      const id = yield* brandResult(ResourceLocation.result(entry.id), 'suspicious_stew.id', entry.id)
      const duration = yield* brandResult(PotionEffectDurationTicks.result(entry.duration ?? 160), 'suspicious_stew.duration', entry.duration ?? 160, 'RangeError', 'out-of-range')
      entries.push(Object.freeze({ id, duration }))
    }
    return frozenArray(entries)
  })
}

export const hideAdditionalTooltipComponent = (): ItemComponentResult<HideAdditionalTooltipComponent> =>
  Result.succeed(Object.freeze({}))

const blockPredicateBlockComponentOf = (
  value: BlockPredicateBlockOptions,
): ItemComponentResult<BlockPredicateBlockComponent> => {
  const resourceLocationOf = (entry: string): ItemComponentResult<ResourceLocation | TagLocation> =>
    entry.startsWith('#')
      ? brandResult(TagLocation.result(entry), 'block_predicate.blocks', entry)
      : brandResult(ResourceLocation.result(entry), 'block_predicate.blocks', entry)
  if (typeof value === 'string') return resourceLocationOf(value)
  return Result.gen(function* () {
    const entries: Array<ResourceLocation | TagLocation> = []
    for (const entry of value) entries.push(yield* resourceLocationOf(entry))
    return frozenArray(entries)
  })
}

const blockPredicateComponentOf = (
  value: BlockPredicateOptions,
): ItemComponentResult<BlockPredicateComponent> => Result.gen(function* () {
  const blocks = value.blocks === undefined ? undefined : yield* blockPredicateBlockComponentOf(value.blocks)
  const nbt = value.nbt === undefined ? undefined : freezeItemComponentNbtValue(value.nbt)
  const state = value.state === undefined ? undefined : frozenStringRecord(value.state)
  return Object.freeze({
    ...(blocks === undefined ? {} : { blocks }),
    ...(nbt === undefined ? {} : { nbt }),
    ...(state === undefined ? {} : { state }),
  })
})

const isBlockPredicateOptionsArray = (
  value: CanBreakOptions,
): value is ReadonlyArray<BlockPredicateOptions> => Array.isArray(value)

const canBreakComponentOf = (value: CanBreakOptions): ItemComponentResult<CanBreakComponent> => {
  if (isBlockPredicateOptionsArray(value)) {
    return Result.gen(function* () {
      const predicates: BlockPredicateComponent[] = []
      for (const entry of value) predicates.push(yield* blockPredicateComponentOf(entry))
      return frozenArray(predicates)
    })
  }
  return blockPredicateComponentOf(value)
}

export const canBreakComponent = (value: CanBreakOptions): ItemComponentResult<CanBreakComponent> => {
  const parsed = validatedInput(value, 'can_break', 'Invalid can_break component options', isCanBreakOptions)
  return Result.flatMap(parsed, canBreakComponentOf)
}

export const canPlaceOnComponent = (value: CanPlaceOnOptions): ItemComponentResult<CanPlaceOnComponent> => {
  const parsed = validatedInput(value, 'can_place_on', 'Invalid can_place_on component options', isCanPlaceOnOptions)
  return Result.flatMap(parsed, canBreakComponentOf)
}

const resourceLocationProviderOf = (
  value: ResourceLocationProviderInput,
): ItemComponentResult<ResourceLocationProvider> => {
  if (typeof value === 'string') {
    return value.startsWith('#')
      ? brandResult(TagLocation.result(value), 'resource_location_provider', value)
      : brandResult(ResourceLocation.result(value), 'resource_location_provider', value)
  }
  return Result.gen(function* () {
    const locations: ResourceLocation[] = []
    for (const entry of value) {
      locations.push(yield* brandResult(ResourceLocation.result(entry), 'resource_location_provider', entry))
    }
    return frozenArray(locations)
  })
}

export const customModelDataComponent = (options: CustomModelDataOptions = {}): ItemComponentResult<CustomModelDataComponent> => {
  const parsed = validatedInput(options, 'custom_model_data', 'Invalid custom_model_data component options', isCustomModelDataOptions)
  return Result.map(parsed, (input) => Object.freeze({
    floats: frozenArray(input.floats ?? []),
    flags: frozenArray(input.flags ?? []),
    strings: frozenArray(input.strings ?? []),
    colors: frozenArray(input.colors ?? []),
  }))
}

export const mapIdComponent = (value: number): ItemComponentResult<MapIdComponent> => {
  if (!isMapIdComponent(value)) return Result.fail(componentFailure('map_id', `Invalid map_id component value: ${String(value)}`, value, 'out-of-range', 'RangeError'))
  return brandResult(MapId.result(value), 'map_id', value, 'RangeError', 'out-of-range')
}

export const blockStateComponent = (value: Readonly<Record<string, string>>): ItemComponentResult<BlockStateComponent> => {
  const parsed = validatedInput(value, 'block_state', 'Invalid block_state component value', isBlockStateComponent)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const normalized: Record<string, BlockStateComponent[string]> = {}
    for (const [property, propertyValue] of Object.entries(parsed.success)) {
      const brandedValue = yield* brandResult(BlockStatePropertyValue.result(propertyValue), `block_state.${property}`, propertyValue)
      Object.defineProperty(normalized, property, {
        configurable: false,
        enumerable: true,
        value: brandedValue,
        writable: false,
      })
    }
    return Object.freeze(normalized)
  })
}

export const instrumentComponent = (value: string): ItemComponentResult<InstrumentComponent> => {
  if (!isInstrumentComponent(value)) return Result.fail(componentFailure('instrument', `Invalid instrument component value: ${String(value)}`, value))
  return brandResult(ResourceLocation.result(value), 'instrument', value)
}

export const noteBlockSoundComponent = (value: string): ItemComponentResult<NoteBlockSoundComponent> => {
  if (!isNoteBlockSoundComponent(value)) {
    return Result.fail(componentFailure('note_block_sound', `Invalid note_block_sound component value: ${String(value)}`, value))
  }
  return brandResult(ResourceLocation.result(value), 'note_block_sound', value)
}

export const recipesComponent = (value: ReadonlyArray<string>): ItemComponentResult<RecipesComponent> => {
  const parsed = validatedInput(value, 'recipes', 'Invalid recipes component value', isRecipesComponent)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const locations: ResourceLocation[] = []
    for (const entry of parsed.success) locations.push(yield* brandResult(ResourceLocation.result(entry), 'recipes', entry))
    return frozenArray(locations)
  })
}

export const lockComponent = (value: string): ItemComponentResult<LockComponent> => {
  if (!isLockComponent(value)) return Result.fail(componentFailure('lock', `Invalid lock component value: ${String(value)}`, value))
  return brandResult(ItemLock.result(value), 'lock', value)
}

export const tooltipStyleComponent = (value: string): ItemComponentResult<TooltipStyleComponent> => {
  if (!isTooltipStyleComponent(value)) {
    return Result.fail(componentFailure('tooltip_style', `Invalid tooltip_style component value: ${String(value)}`, value))
  }
  return brandResult(ResourceLocation.result(value), 'tooltip_style', value)
}

export const baseColorComponent = (value: string): ItemComponentResult<BaseColorComponent> => {
  if (!isBaseColorComponent(value)) return Result.fail(componentFailure('base_color', `Invalid base_color component value: ${String(value)}`, value))
  return Result.succeed(value)
}

export const equippableComponent = (options: EquippableOptions): ItemComponentResult<EquippableComponent> => {
  const parsed = validatedInput(options, 'equippable', 'Invalid equippable component options', isEquippableOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const input = parsed.success
  return Result.gen(function* () {
    const equipSound = input.equipSound === undefined ? undefined : yield* brandResult(ResourceLocation.result(input.equipSound), 'equippable.equipSound', input.equipSound)
    const model = input.model === undefined ? undefined : yield* brandResult(ResourceLocation.result(input.model), 'equippable.model', input.model)
    const cameraOverlay = input.cameraOverlay === undefined ? undefined : yield* brandResult(ResourceLocation.result(input.cameraOverlay), 'equippable.cameraOverlay', input.cameraOverlay)
    const allowedEntities = input.allowedEntities === undefined ? undefined : yield* resourceLocationProviderOf(input.allowedEntities)
    const shearingSound = yield* brandResult(ResourceLocation.result(input.shearingSound ?? 'minecraft:item.shears.snip'), 'equippable.shearingSound', input.shearingSound)
    return Object.freeze({
      slot: input.slot,
      ...(equipSound === undefined ? {} : { equipSound }),
      ...(model === undefined ? {} : { model }),
      ...(cameraOverlay === undefined ? {} : { cameraOverlay }),
      ...(allowedEntities === undefined ? {} : { allowedEntities }),
      canBeSheared: input.canBeSheared ?? false,
      shearingSound,
      dispensable: input.dispensable ?? true,
      swappable: input.swappable ?? true,
      damageOnHurt: input.damageOnHurt ?? true,
      equipOnInteract: input.equipOnInteract ?? false,
    })
  })
}

const kineticWeaponConditionOf = (
  options: KineticWeaponConditionOptions,
): ItemComponentResult<KineticWeaponCondition> => Result.gen(function* () {
  const maxDurationTicks = yield* brandResult(KineticDurationTicks.result(options.maxDurationTicks), 'kinetic_weapon.maxDurationTicks', options.maxDurationTicks, 'RangeError', 'out-of-range')
  const minSpeed = yield* brandResult(KineticSpeed.result(options.minSpeed ?? 0), 'kinetic_weapon.minSpeed', options.minSpeed ?? 0, 'RangeError', 'out-of-range')
  const minRelativeSpeed = yield* brandResult(KineticSpeed.result(options.minRelativeSpeed ?? 0), 'kinetic_weapon.minRelativeSpeed', options.minRelativeSpeed ?? 0, 'RangeError', 'out-of-range')
  return Object.freeze({ maxDurationTicks, minSpeed, minRelativeSpeed })
})

export const kineticWeaponComponent = (
  options: KineticWeaponOptions = {},
): ItemComponentResult<KineticWeaponComponent> => {
  const parsed = validatedInput(options, 'kinetic_weapon', 'Invalid kinetic_weapon component options', isKineticWeaponOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const input = parsed.success
  return Result.gen(function* () {
    const sound = input.sound === undefined ? undefined : yield* brandResult(ResourceLocation.result(input.sound), 'kinetic_weapon.sound', input.sound)
    const hitSound = input.hitSound === undefined ? undefined : yield* brandResult(ResourceLocation.result(input.hitSound), 'kinetic_weapon.hitSound', input.hitSound)
    const contactCooldownTicks = yield* brandResult(KineticDurationTicks.result(input.contactCooldownTicks ?? 10), 'kinetic_weapon.contactCooldownTicks', input.contactCooldownTicks ?? 10, 'RangeError', 'out-of-range')
    const delayTicks = yield* brandResult(KineticDurationTicks.result(input.delayTicks ?? 0), 'kinetic_weapon.delayTicks', input.delayTicks ?? 0, 'RangeError', 'out-of-range')
    const forwardMovement = yield* brandResult(KineticMovement.result(input.forwardMovement ?? 0), 'kinetic_weapon.forwardMovement', input.forwardMovement ?? 0, 'RangeError', 'out-of-range')
    const damageMultiplier = yield* brandResult(KineticDamageMultiplier.result(input.damageMultiplier ?? 1), 'kinetic_weapon.damageMultiplier', input.damageMultiplier ?? 1, 'RangeError', 'out-of-range')
    return Object.freeze({
    contactCooldownTicks,
    delayTicks,
    ...(input.dismountConditions === undefined
      ? {}
      : { dismountConditions: yield* kineticWeaponConditionOf(input.dismountConditions) }),
    ...(input.knockbackConditions === undefined
      ? {}
      : { knockbackConditions: yield* kineticWeaponConditionOf(input.knockbackConditions) }),
    ...(input.damageConditions === undefined
      ? {}
      : { damageConditions: yield* kineticWeaponConditionOf(input.damageConditions) }),
    forwardMovement,
    damageMultiplier,
    ...(sound === undefined ? {} : { sound }),
    ...(hitSound === undefined ? {} : { hitSound }),
    })
  })
}

export const piercingWeaponComponent = (
  options: PiercingWeaponOptions = {},
): ItemComponentResult<PiercingWeaponComponent> => {
  const parsed = validatedInput(options, 'piercing_weapon', 'Invalid piercing_weapon component options', isPiercingWeaponOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const sound = parsed.success.sound === undefined ? undefined : yield* brandResult(ResourceLocation.result(parsed.success.sound), 'piercing_weapon.sound', parsed.success.sound)
    const hitSound = parsed.success.hitSound === undefined ? undefined : yield* brandResult(ResourceLocation.result(parsed.success.hitSound), 'piercing_weapon.hitSound', parsed.success.hitSound)
    return Object.freeze({
      dealsKnockback: parsed.success.dealsKnockback ?? true,
      dismounts: parsed.success.dismounts ?? false,
      ...(sound === undefined ? {} : { sound }),
      ...(hitSound === undefined ? {} : { hitSound }),
    })
  })
}

export const gliderComponent = (): ItemComponentResult<GliderComponent> => Result.succeed(Object.freeze({}))

export const deathProtectionComponent = (
  options: DeathProtectionOptions = {},
): ItemComponentResult<DeathProtectionComponent> => Result.map(
  validatedInput(options, 'death_protection', 'Invalid death_protection component options', isDeathProtectionOptions),
  (input) => Object.freeze({ deathEffects: frozenArray(input.deathEffects ?? []) }),
)

export const repairableComponent = (value: ResourceLocationProviderInput): ItemComponentResult<RepairableComponent> => {
  const parsed = validatedInput(value, 'repairable', 'Invalid repairable component items', isResourceLocationProvider)
  return Result.flatMap(parsed, (input) => Result.map(resourceLocationProviderOf(input), (items) => Object.freeze({ items })))
}

export const enchantableComponent = (value: number): ItemComponentResult<EnchantableComponent> => {
  if (!isEnchantableValue(value)) return Result.fail(componentFailure('enchantable', `Invalid enchantable component value: ${String(value)}`, value, 'out-of-range', 'RangeError'))
  return Result.map(brandResult(Enchantability.result(value), 'enchantable', value, 'RangeError', 'out-of-range'), (enchantability) => Object.freeze({ value: enchantability }))
}

export const jukeboxPlayableComponent = (value: string): ItemComponentResult<JukeboxPlayableComponent> => {
  if (typeof value !== 'string' || !ResourceLocation.is(value)) {
    return Result.fail(componentFailure('jukebox_playable', `Invalid jukebox_playable component value: ${String(value)}`, value))
  }
  return Result.map(brandResult(ResourceLocation.result(value), 'jukebox_playable', value), (song) => Object.freeze({ song }))
}

export const ominousBottleAmplifierComponent = (value: number): ItemComponentResult<OminousBottleAmplifierComponent> => {
  if (!isOminousBottleAmplifierComponent(value)) {
    return Result.fail(componentFailure('ominous_bottle_amplifier', `Invalid ominous_bottle_amplifier value: ${String(value)}`, value, 'out-of-range', 'RangeError'))
  }
  return brandResult(OminousBottleAmplifier.result(value), 'ominous_bottle_amplifier', value, 'RangeError', 'out-of-range')
}

export const paintingVariantComponent = (value: string): ItemComponentResult<PaintingVariantComponent> => {
  if (!isPaintingVariantComponent(value)) {
    return Result.fail(componentFailure('painting_variant', `Invalid painting/variant component value: ${String(value)}`, value))
  }
  return brandResult(ResourceLocation.result(value), 'painting_variant', value)
}

export const sulfurCubeContentComponent = (
  value: SulfurCubeContentOptions,
): ItemComponentResult<SulfurCubeContentComponent> => {
  if (!isSulfurCubeContentOptions(value)) {
    return Result.fail(componentFailure('sulfur_cube_content', `Invalid sulfur_cube_content component value: ${String(value)}`, value))
  }
  return brandResult(ResourceLocation.result(value), 'sulfur_cube_content', value)
}

const frozenPosition = (
  value: readonly [ReturnType<typeof BlockAxis>, ReturnType<typeof BlockAxis>, ReturnType<typeof BlockAxis>],
): ItemComponentResult<readonly [ReturnType<typeof BlockAxis>, ReturnType<typeof BlockAxis>, ReturnType<typeof BlockAxis>]> =>
  Result.gen(function* () {
    const x = yield* brandResult(BlockAxis.result(value[0]), 'lodestone_tracker.target.pos[0]', value[0], 'RangeError', 'out-of-range')
    const y = yield* brandResult(BlockAxis.result(value[1]), 'lodestone_tracker.target.pos[1]', value[1], 'RangeError', 'out-of-range')
    const z = yield* brandResult(BlockAxis.result(value[2]), 'lodestone_tracker.target.pos[2]', value[2], 'RangeError', 'out-of-range')
    return Object.freeze([x, y, z])
  })

export const lodestoneTrackerComponent = (
  options: LodestoneTrackerOptions = {},
): ItemComponentResult<LodestoneTrackerComponent> => {
  const parsed = validatedInput(options, 'lodestone_tracker', 'Invalid lodestone_tracker component options', isLodestoneTrackerOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const target = parsed.success.target === undefined
      ? undefined
      : Object.freeze({
          pos: yield* frozenPosition(parsed.success.target.pos),
          dimension: yield* brandResult(ResourceLocation.result(parsed.success.target.dimension), 'lodestone_tracker.target.dimension', parsed.success.target.dimension),
        })
    return Object.freeze({
      ...(target === undefined ? {} : { target }),
      tracked: parsed.success.tracked ?? true,
    })
  })
}

export const fireworkExplosionComponent = (
  options: FireworkExplosionOptions,
): ItemComponentResult<FireworkExplosionComponent> => Result.map(
  validatedInput(options, 'firework_explosion', 'Invalid firework_explosion component options', isFireworkExplosionOptions),
  (input) => Object.freeze({
    shape: input.shape,
    colors: frozenArray(input.colors ?? []),
    fadeColors: frozenArray(input.fadeColors ?? []),
    hasTrail: input.hasTrail ?? false,
    hasTwinkle: input.hasTwinkle ?? false,
  }),
)

export const fireworksComponent = (options: FireworksOptions = {}): ItemComponentResult<FireworksComponent> => {
  const parsed = validatedInput(options, 'fireworks', 'Invalid fireworks component options', isFireworksOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const explosions: FireworkExplosionComponent[] = []
    for (const explosion of parsed.success.explosions ?? []) explosions.push(yield* fireworkExplosionComponent(explosion))
    const flightDuration = yield* brandResult(FireworksFlightDuration.result(parsed.success.flightDuration ?? 1), 'fireworks.flightDuration', parsed.success.flightDuration ?? 1, 'RangeError', 'out-of-range')
    return Object.freeze({
      explosions: frozenArray(explosions),
      flightDuration,
    })
  })
}

export const bannerPatternsComponent = (
  value: ReadonlyArray<BannerPatternOptions> = [],
): ItemComponentResult<BannerPatternsComponent> => {
  const parsed = validatedInput(value, 'banner_patterns', 'Invalid banner_patterns component value', isBannerPatternsOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const patterns: BannerPatternsComponent[number][] = []
    for (const entry of parsed.success) {
      const pattern = yield* brandResult(ResourceLocation.result(entry.pattern), 'banner_patterns.pattern', entry.pattern)
      const normalized: BannerPatternEntry = {
        pattern,
        color: entry.color,
      }
      patterns.push(Object.freeze(normalized))
    }
    return Object.freeze(patterns)
  })
}

const DEFAULT_POT_DECORATIONS: PotDecorationsOptions = [
  ResourceLocation('minecraft:brick'),
  ResourceLocation('minecraft:brick'),
  ResourceLocation('minecraft:brick'),
  ResourceLocation('minecraft:brick'),
]

export const potDecorationsComponent = (
  value: PotDecorationsOptions = DEFAULT_POT_DECORATIONS,
): ItemComponentResult<PotDecorationsComponent> => {
  const parsed = validatedInput(value, 'pot_decorations', 'Invalid pot_decorations component value', isPotDecorationsOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const normalized: [ResourceLocation, ResourceLocation, ResourceLocation, ResourceLocation] = [
      yield* brandResult(ResourceLocation.result(parsed.success[0]), 'pot_decorations[0]', parsed.success[0]),
      yield* brandResult(ResourceLocation.result(parsed.success[1]), 'pot_decorations[1]', parsed.success[1]),
      yield* brandResult(ResourceLocation.result(parsed.success[2]), 'pot_decorations[2]', parsed.success[2]),
      yield* brandResult(ResourceLocation.result(parsed.success[3]), 'pot_decorations[3]', parsed.success[3]),
    ]
    return Object.freeze(normalized)
  })
}

export const containerLootComponent = (options: ContainerLootOptions): ItemComponentResult<ContainerLootComponent> => {
  const parsed = validatedInput(options, 'container_loot', 'Invalid container_loot component options', isContainerLootOptions)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.map(brandResult(ResourceLocation.result(parsed.success.lootTable), 'container_loot.lootTable', parsed.success.lootTable), (lootTable) => Object.freeze({
    lootTable,
    ...(parsed.success.seed === undefined ? {} : { seed: parsed.success.seed }),
  }))
}

const isDebugStickStateShape = (value: unknown): value is DebugStickStateComponent => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every((property) => typeof property === 'string')
}

export const debugStickStateComponent = (
  value: Readonly<Record<string, string>> = {},
): ItemComponentResult<DebugStickStateComponent> => {
  const parsed = validatedInput(value, 'debug_stick_state', 'Invalid debug_stick_state component value', isDebugStickStateShape)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  return Result.gen(function* () {
    const normalized: Record<string, DebugStickStateComponent[string]> = {}
    for (const [block, property] of Object.entries(parsed.success)) {
      const location = yield* brandResult(ResourceLocation.result(block), 'debug_stick_state.block', block)
      const propertyValue = yield* brandResult(BlockStatePropertyValue.result(property), 'debug_stick_state.property', property)
      Object.defineProperty(normalized, location, {
        configurable: false,
        enumerable: true,
        value: propertyValue,
        writable: false,
      })
    }
    return Object.freeze(normalized)
  })
}

const validateTooltipDisplayOptions = (options: TooltipDisplayOptions): ItemComponentResult<TooltipDisplayOptions> => {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    return Result.fail(componentFailure('tooltipDisplay', 'Tooltip display options must be a non-null object', options, 'invalid-type'))
  }
  if (options.hideTooltip !== undefined && typeof options.hideTooltip !== 'boolean') {
    return Result.fail(componentFailure('hideTooltip', 'hideTooltip must be a boolean', options.hideTooltip, 'invalid-type'))
  }
  if (options.hiddenComponents !== undefined) {
    if (!Array.isArray(options.hiddenComponents)) {
      return Result.fail(componentFailure('hiddenComponents', 'hiddenComponents must be an array of resource locations', options.hiddenComponents, 'invalid-type'))
    }
    if (!options.hiddenComponents.every((component) => ResourceLocation.is(component))) {
      return Result.fail(componentFailure('hiddenComponents', 'hiddenComponents must contain valid resource locations', options.hiddenComponents, 'invalid-value'))
    }
  }
  return Result.succeed(options)
}

export const tooltipDisplayComponent = (
  options: TooltipDisplayOptions = {},
): ItemComponentResult<TooltipDisplayComponent> => {
  const parsed = validatedInput(options, 'tooltipDisplay', 'Invalid tooltip display options', (_value): _value is TooltipDisplayOptions => true)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const validated = validateTooltipDisplayOptions(parsed.success)
  if (Result.isFailure(validated)) return Result.fail(validated.failure)
  return Result.gen(function* () {
    const hiddenComponents: ResourceLocation[] = []
    for (const component of validated.success.hiddenComponents ?? []) {
      hiddenComponents.push(yield* brandResult(ResourceLocation.result(component), 'hiddenComponents', component))
    }
    return Object.freeze({
      hideTooltip: validated.success.hideTooltip ?? false,
      hiddenComponents: Object.freeze(hiddenComponents),
    })
  })
}

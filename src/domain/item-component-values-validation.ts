import { ResourceLocation, TagLocation, UUID } from './identifiers.js'
import { isItemType } from './item-type.js'
import { isConsumableEffect } from './consumable-validation.js'
import { isTextComponent } from './text-component-validation.js'
import {
  DYE_COLORS,
  FIREWORK_EXPLOSION_SHAPES,
  MAP_DECORATION_TYPES,
  type BannerPatternEntry,
  type BannerPatternOptions,
  type BannerPatternsComponent,
  type BaseColorComponent,
  type BeeEntryOptions,
  type BeesComponent,
  type BeesOptions,
  type BlockStateComponent,
  type BlockEntityDataComponent,
  type BannerPatternProvider,
  type BlockEntityDataOptions,
  type BucketEntityDataComponent,
  type BucketEntityDataOptions,
  type CanBreakComponent,
  type CanBreakOptions,
  type CanPlaceOnComponent,
  type CanPlaceOnOptions,
  type ContainerLootComponent,
  type ContainerLootOptions,
  type CustomDataComponent,
  type CustomModelDataComponent,
  type CustomModelDataOptions,
  type DebugStickStateComponent,
  type DeathProtectionComponent,
  type DeathProtectionOptions,
  type DyeColor,
  type DyedColorComponent,
  type EntityDataComponent,
  type EntityDataOptions,
  type EnchantableComponent,
  type EquippableComponent,
  type EquippableOptions,
  type FireworkExplosionComponent,
  type FireworkExplosionOptions,
  type FireworksComponent,
  type FireworksOptions,
  type GliderComponent,
  type HideAdditionalTooltipComponent,
  type HideAdditionalTooltipOptions,
  type InstrumentComponent,
  type ItemComponentNbtObject,
  type ItemComponentNbtValue,
  type JukeboxPlayableComponent,
  type KineticWeaponComponent,
  type KineticWeaponCondition,
  type KineticWeaponConditionOptions,
  type KineticWeaponOptions,
  type LodestoneTrackerComponent,
  type LodestoneTrackerOptions,
  type LockComponent,
  type MapColorComponent,
  type MapDecorationComponent,
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
  type ProfileOptions,
  type ProfilePropertyOptions,
  type RepairableComponent,
  type RecipesComponent,
  type ResourceLocationProvider,
  type SuspiciousStewComponent,
  type SuspiciousStewEntryComponent,
  type SuspiciousStewEntryOptions,
  type SuspiciousStewOptions,
  type SulfurCubeContentComponent,
  type SulfurCubeContentOptions,
  VANILLA_STATUS_EFFECT_IDS,
  type TrimComponent,
  type TrimMaterialInlineOptions,
  type TrimPatternInlineOptions,
  type TrimOptions,
  type TooltipStyleComponent,
  type TooltipDisplayComponent,
  type WritableBookContentComponent,
  type WritableBookContentOptions,
  type WritableBookPageOptions,
  type WrittenBookContentComponent,
  type WrittenBookContentOptions,
  type WrittenBookPageOptions,
  EQUIPPABLE_SLOTS,
} from './item-component-values-data.js'
import { AdditionalTradeCost, MapId, PotionDurationScale } from './quantities.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isResourceLocation = (value: unknown): value is ResourceLocation =>
  typeof value === 'string' && ResourceLocation.is(value)

const hasExactKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const hasOnlyKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean =>
  Object.keys(value).every((key) => keys.some((knownKey) => knownKey === key))

const hasAllKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean =>
  keys.every((key) => Object.hasOwn(value, key))

const DYE_COLOR_SET: ReadonlySet<string> = new Set(DYE_COLORS)
const FIREWORK_EXPLOSION_SHAPE_SET: ReadonlySet<string> = new Set(FIREWORK_EXPLOSION_SHAPES)

const LONG_MIN = -(2n ** 63n)
const LONG_MAX = (2n ** 63n) - 1n

const isPlainRecord = (value: unknown): value is RecordValue => {
  if (!isRecord(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const isBlockStateComponent = (value: unknown): value is BlockStateComponent =>
  isPlainRecord(value) && Object.values(value).every((entry) => typeof entry === 'string')

export const isDyeComponent = (value: unknown): value is DyeColor =>
  typeof value === 'string' && DYE_COLOR_SET.has(value)

const isItemComponentNbtValueInternal = (
  value: unknown,
  ancestors: WeakSet<object>,
): value is ItemComponentNbtValue => {
  if (typeof value === 'boolean' || typeof value === 'bigint' || typeof value === 'string') {
    return true
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value !== 'object' || value === null || ancestors.has(value)) {
    return false
  }
  if (!Array.isArray(value) && !isPlainRecord(value)) {
    return false
  }

  ancestors.add(value)
  const valid = Array.isArray(value)
    ? value.every((entry) => isItemComponentNbtValueInternal(entry, ancestors))
    : Object.values(value).every((entry) => isItemComponentNbtValueInternal(entry, ancestors))
  ancestors.delete(value)
  return valid
}

export const isItemComponentNbtValue = (value: unknown): value is ItemComponentNbtValue =>
  isItemComponentNbtValueInternal(value, new WeakSet<object>())

export const isItemComponentNbtObject = (value: unknown): value is ItemComponentNbtObject =>
  isItemComponentNbtValueInternal(value, new WeakSet<object>()) &&
  isPlainRecord(value)

export const isCustomDataComponent = (value: unknown): value is CustomDataComponent =>
  isItemComponentNbtObject(value) && Object.keys(value).length > 0

const isNbtObjectWithResourceLocationId = (value: unknown): boolean =>
  isItemComponentNbtObject(value) &&
  typeof value['id'] === 'string' &&
  ResourceLocation.is(value['id'])

export const isEntityDataOptions = (value: unknown): value is EntityDataOptions =>
  isNbtObjectWithResourceLocationId(value)

export const isEntityDataComponent = (value: unknown): value is EntityDataComponent =>
  isNbtObjectWithResourceLocationId(value)

export const isBucketEntityDataOptions = (value: unknown): value is BucketEntityDataOptions =>
  isItemComponentNbtObject(value)

export const isBucketEntityDataComponent = (
  value: unknown,
): value is BucketEntityDataComponent => isItemComponentNbtObject(value)

export const isBlockEntityDataOptions = (value: unknown): value is BlockEntityDataOptions =>
  isNbtObjectWithResourceLocationId(value)

export const isBlockEntityDataComponent = (value: unknown): value is BlockEntityDataComponent =>
  isNbtObjectWithResourceLocationId(value)

const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/
const PROFILE_KEYS = ['name', 'id', 'properties'] as const
const PROFILE_PROPERTY_KEYS = ['name', 'value', 'signature'] as const

const isProfileName = (value: unknown): value is string =>
  typeof value === 'string' && PROFILE_NAME_PATTERN.test(value)

const isProfileProperty = (value: unknown): value is ProfilePropertyOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, PROFILE_PROPERTY_KEYS) &&
  typeof value['name'] === 'string' &&
  typeof value['value'] === 'string' &&
  (value['signature'] === undefined || typeof value['signature'] === 'string')

const isProfileObject = (value: RecordValue): boolean =>
  hasOnlyKeys(value, PROFILE_KEYS) &&
  (value['name'] === undefined || isProfileName(value['name'])) &&
  (value['id'] === undefined ||
    (typeof value['id'] === 'string' && UUID.is(value['id']))) &&
  (value['properties'] === undefined ||
    (Array.isArray(value['properties']) && value['properties'].every(isProfileProperty)))

export const isProfileOptions = (value: unknown): value is ProfileOptions =>
  typeof value === 'string' ? isProfileName(value) : isPlainRecord(value) && isProfileObject(value)

export const isProfileComponent = (value: unknown): value is ProfileComponent =>
  typeof value === 'string' ? isProfileName(value) : isPlainRecord(value) && isProfileObject(value)

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isBeeEntityData = (value: unknown): value is Readonly<Record<string, string>> =>
  isPlainRecord(value) && Object.values(value).every((entry) => typeof entry === 'string')

const isBeeEntry = (value: unknown): value is BeeEntryOptions =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['entityData', 'ticksInHive', 'minTicksInHive']) &&
  isBeeEntityData(value['entityData']) &&
  isNonNegativeSafeInteger(value['ticksInHive']) &&
  isNonNegativeSafeInteger(value['minTicksInHive'])

export const isBeesOptions = (value: unknown): value is BeesOptions =>
  Array.isArray(value) && value.every(isBeeEntry)

export const isBeesComponent = (value: unknown): value is BeesComponent =>
  isBeesOptions(value)

const POTION_EFFECT_KEYS = [
  'id',
  'amplifier',
  'duration',
  'ambient',
  'showParticles',
  'showIcon',
  'hiddenEffect',
] as const
const POTION_EFFECT_REQUIRED_KEYS = ['id', 'amplifier', 'duration', 'ambient', 'showParticles', 'showIcon'] as const

const isPotionEffectInstanceFields = (
  value: RecordValue,
  requireDefaults: boolean,
  ancestors: WeakSet<object>,
): boolean => {
  if (ancestors.has(value) || !hasOnlyKeys(value, POTION_EFFECT_KEYS)) {
    return false
  }
  if (requireDefaults && !hasAllKeys(value, POTION_EFFECT_REQUIRED_KEYS)) {
    return false
  }

  ancestors.add(value)
  const hiddenEffect = value['hiddenEffect']
  const hiddenEffectIsValid = hiddenEffect === undefined ||
    (isPlainRecord(hiddenEffect) &&
      isPotionEffectInstanceFields(hiddenEffect, requireDefaults, ancestors))
  const valid =
    typeof value['id'] === 'string' &&
    ResourceLocation.is(value['id']) &&
    (value['amplifier'] === undefined
      ? !requireDefaults
      : isNonNegativeSafeInteger(value['amplifier'])) &&
    (value['duration'] === undefined
      ? !requireDefaults
      : isNonNegativeSafeInteger(value['duration'])) &&
    (value['ambient'] === undefined ? !requireDefaults : typeof value['ambient'] === 'boolean') &&
    (value['showParticles'] === undefined
      ? !requireDefaults
      : typeof value['showParticles'] === 'boolean') &&
    (value['showIcon'] === undefined
      ? !requireDefaults
      : typeof value['showIcon'] === 'boolean') &&
    hiddenEffectIsValid
  ancestors.delete(value)
  return valid
}

const isPotionEffectInstanceOptions = (
  value: unknown,
): value is PotionEffectInstanceOptions =>
  isPlainRecord(value) &&
  hasAllKeys(value, ['id']) &&
  isPotionEffectInstanceFields(value, false, new WeakSet<object>())

const isPotionEffectInstanceComponent = (
  value: unknown,
): value is PotionEffectInstanceComponent =>
  isPlainRecord(value) &&
  isPotionEffectInstanceFields(value, true, new WeakSet<object>())

const isCustomColor = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffff

const isPotionContentsObject = (
  value: unknown,
  requireDefaults: boolean,
): boolean => {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ['potion', 'customColor', 'customEffects'])) {
    return false
  }
  if (requireDefaults && !hasAllKeys(value, ['customEffects'])) {
    return false
  }
  return (
    (value['potion'] === undefined || isResourceLocation(value['potion'])) &&
    (value['customColor'] === undefined || isCustomColor(value['customColor'])) &&
    (value['customEffects'] === undefined
      ? !requireDefaults
      : Array.isArray(value['customEffects']) &&
        value['customEffects'].every((effect) =>
          requireDefaults
            ? isPotionEffectInstanceComponent(effect)
            : isPotionEffectInstanceOptions(effect),
        ))
  )
}

export const isPotionContentsOptions = (value: unknown): value is PotionContentsOptions =>
  typeof value === 'string'
    ? ResourceLocation.is(value)
    : isPotionContentsObject(value, false)

export const isPotionContentsComponent = (
  value: unknown,
): value is PotionContentsComponent =>
  typeof value === 'string'
    ? isResourceLocation(value)
    : isPotionContentsObject(value, true)

const VANILLA_STATUS_EFFECT_ID_SET: ReadonlySet<string> = new Set(VANILLA_STATUS_EFFECT_IDS)

/**
 * Narrows an effect id (e.g. `PotionEffectInstanceComponent.id`) to the
 * vanilla status-effect vocabulary. `isPotionEffectInstanceFields` above
 * accepts any well-formed `ResourceLocation` because a data pack may add
 * its own effect; this guard is the opt-in check for callers that need to
 * reject everything outside the closed vanilla roster
 * (docs/architecture.md §6: the guard lives here, the vocabulary in
 * `item-component-values-data.js`).
 */
export const isVanillaPotionEffectId = (value: unknown): value is ResourceLocation =>
  isResourceLocation(value) && VANILLA_STATUS_EFFECT_ID_SET.has(value)

const MAP_DECORATION_TYPE_SET: ReadonlySet<string> = new Set(MAP_DECORATION_TYPES)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isMapDecoration = (value: unknown): value is MapDecorationComponent =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['type', 'x', 'z', 'rotation']) &&
  typeof value['type'] === 'string' &&
  MAP_DECORATION_TYPE_SET.has(value['type']) &&
  isFiniteNumber(value['x']) &&
  isFiniteNumber(value['z']) &&
  isFiniteNumber(value['rotation'])

export const isMapColorComponent = (value: unknown): value is MapColorComponent =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 0xffffff

export const isMapDecorationsOptions = (value: unknown): value is MapDecorationsOptions =>
  isPlainRecord(value) && Object.values(value).every(isMapDecoration)

export const isMapDecorationsComponent = (
  value: unknown,
): value is MapDecorationsComponent => isMapDecorationsOptions(value)

const isJsonTextComponentString = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return isTextComponent(parsed)
  } catch {
    return false
  }
}

const isBookPageObject = (
  value: unknown,
  pageValueIsJson: boolean,
): boolean => {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ['raw', 'filtered']) || !hasAllKeys(value, ['raw'])) {
    return false
  }
  const rawIsValid = pageValueIsJson
    ? isJsonTextComponentString(value['raw'])
    : typeof value['raw'] === 'string'
  const filtered = value['filtered']
  const filteredIsValid = filtered === undefined ||
    (pageValueIsJson ? isJsonTextComponentString(filtered) : typeof filtered === 'string')
  return rawIsValid && filteredIsValid
}

const isWritableBookPage = (value: unknown): value is WritableBookPageOptions =>
  typeof value === 'string' || isBookPageObject(value, false)

const isWrittenBookPage = (value: unknown): value is WrittenBookPageOptions =>
  isJsonTextComponentString(value) || isBookPageObject(value, true)

const isBookPages = (
  value: unknown,
  pageGuard: (page: unknown) => boolean,
): boolean => Array.isArray(value) && value.length <= 100 && value.every(pageGuard)

export const isWritableBookContentOptions = (
  value: unknown,
): value is WritableBookContentOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['pages']) &&
  (value['pages'] === undefined || isBookPages(value['pages'], isWritableBookPage))

export const isWritableBookContentComponent = (
  value: unknown,
): value is WritableBookContentComponent =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['pages']) &&
  isBookPages(value['pages'], isWritableBookPage)

export const isWrittenBookContentOptions = (
  value: unknown,
): value is WrittenBookContentOptions =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['pages', 'title', 'author', 'generation', 'resolved']) &&
  isBookPages(value['pages'], isWrittenBookPage) &&
  isWrittenBookPage(value['title']) &&
  typeof value['author'] === 'string' &&
  typeof value['generation'] === 'number' &&
  Number.isInteger(value['generation']) &&
  value['generation'] >= 0 &&
  value['generation'] <= 3 &&
  typeof value['resolved'] === 'boolean'

export const isWrittenBookContentComponent = (
  value: unknown,
): value is WrittenBookContentComponent => isWrittenBookContentOptions(value)

const isTrimPatternInline = (value: unknown): value is TrimPatternInlineOptions =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['assetId', 'description', 'decal']) &&
  isResourceLocation(value['assetId']) &&
  isTextComponent(value['description']) &&
  typeof value['decal'] === 'boolean'

const isTrimMaterialInline = (value: unknown): value is TrimMaterialInlineOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['assetName', 'ingredient', 'itemModelIndex', 'overrideArmorMaterials', 'description']) &&
  hasAllKeys(value, ['assetName', 'ingredient', 'itemModelIndex', 'description']) &&
  typeof value['assetName'] === 'string' &&
  isItemType(value['ingredient']) &&
  isFiniteNumber(value['itemModelIndex']) &&
  (value['overrideArmorMaterials'] === undefined ||
    (isPlainRecord(value['overrideArmorMaterials']) &&
      Object.values(value['overrideArmorMaterials']).every((entry) => typeof entry === 'string'))) &&
  isTextComponent(value['description'])

const isTrimPattern = (value: unknown): boolean =>
  isResourceLocation(value) || isTrimPatternInline(value)

const isTrimMaterial = (value: unknown): boolean =>
  isResourceLocation(value) || isTrimMaterialInline(value)

const isTrimFields = (value: RecordValue): boolean =>
  hasExactKeys(value, ['pattern', 'material']) &&
  hasAllKeys(value, ['pattern', 'material']) &&
  isTrimPattern(value['pattern']) &&
  isTrimMaterial(value['material'])

export const isTrimOptions = (
  value: unknown,
): value is TrimOptions => isPlainRecord(value) && isTrimFields(value)

export const isTrimComponent = (value: unknown): value is TrimComponent =>
  isPlainRecord(value) && isTrimFields(value)

const isSuspiciousStewEntry = (value: unknown): value is SuspiciousStewEntryOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['id', 'duration']) &&
  hasAllKeys(value, ['id']) &&
  isResourceLocation(value['id']) &&
  (value['duration'] === undefined || isNonNegativeSafeInteger(value['duration']))

const isSuspiciousStewEntryComponent = (value: unknown): value is SuspiciousStewEntryComponent =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['id', 'duration']) &&
  isResourceLocation(value['id']) &&
  isNonNegativeSafeInteger(value['duration'])

export const isSuspiciousStewOptions = (
  value: unknown,
): value is SuspiciousStewOptions => Array.isArray(value) && value.every(isSuspiciousStewEntry)

export const isSuspiciousStewComponent = (
  value: unknown,
): value is SuspiciousStewComponent =>
  Array.isArray(value) && value.every(isSuspiciousStewEntryComponent)

export const isSulfurCubeContentOptions = (value: unknown): value is SulfurCubeContentOptions =>
  isResourceLocation(value)

export const isSulfurCubeContentComponent = (value: unknown): value is SulfurCubeContentComponent =>
  isResourceLocation(value)

export const isHideAdditionalTooltipOptions = (
  value: unknown,
): value is HideAdditionalTooltipOptions => value === true

export const isHideAdditionalTooltipComponent = (
  value: unknown,
): value is HideAdditionalTooltipComponent => isPlainRecord(value) && hasExactKeys(value, [])

const isBlockPredicateBlock = (value: unknown): boolean =>
  typeof value === 'string'
    ? ResourceLocation.is(value) || TagLocation.is(value)
    : Array.isArray(value) &&
      value.every((entry) =>
        typeof entry === 'string' && (ResourceLocation.is(entry) || TagLocation.is(entry)),
      )

const isBlockPredicate = (value: unknown): boolean =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['blocks', 'nbt', 'state']) &&
  (value['blocks'] === undefined || isBlockPredicateBlock(value['blocks'])) &&
  (value['nbt'] === undefined || isItemComponentNbtObject(value['nbt'])) &&
  (value['state'] === undefined || isBlockStateComponent(value['state']))

const isBlockPredicateList = (value: unknown): boolean =>
  Array.isArray(value) && value.every(isBlockPredicate)

export const isCanBreakOptions = (value: unknown): value is CanBreakOptions =>
  isBlockPredicate(value) || isBlockPredicateList(value)

export const isCanPlaceOnOptions = (value: unknown): value is CanPlaceOnOptions =>
  isCanBreakOptions(value)

export const isCanBreakComponent = (value: unknown): value is CanBreakComponent =>
  isBlockPredicate(value) || isBlockPredicateList(value)

export const isCanPlaceOnComponent = (value: unknown): value is CanPlaceOnComponent =>
  isCanBreakComponent(value)

const isPackedRgb = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= 0xffffff

const isNormalizedColorChannel = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

export const isDyedColorComponent = (value: unknown): value is DyedColorComponent =>
  (typeof value === 'number' && isPackedRgb(value)) ||
  (Array.isArray(value) && value.length === 3 && value.every(isNormalizedColorChannel))

const CUSTOM_MODEL_DATA_KEYS = ['floats', 'flags', 'strings', 'colors'] as const

const isFiniteNumberArray = (value: unknown): value is ReadonlyArray<number> =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))

const isBooleanArray = (value: unknown): value is ReadonlyArray<boolean> =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'boolean')

const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

const isDyedColorArray = (value: unknown): value is ReadonlyArray<DyedColorComponent> =>
  Array.isArray(value) && value.every((entry) => isDyedColorComponent(entry))

const hasOnlyCustomModelDataKeys = (value: RecordValue): boolean =>
  Object.keys(value).every((key) => CUSTOM_MODEL_DATA_KEYS.some((knownKey) => knownKey === key))

const isCustomModelDataFields = (value: RecordValue, requireAll: boolean): boolean => {
  if (!hasOnlyCustomModelDataKeys(value)) return false
  if (requireAll && !hasExactKeys(value, CUSTOM_MODEL_DATA_KEYS)) return false

  return (
    (value['floats'] === undefined ? !requireAll : isFiniteNumberArray(value['floats'])) &&
    (value['flags'] === undefined ? !requireAll : isBooleanArray(value['flags'])) &&
    (value['strings'] === undefined ? !requireAll : isStringArray(value['strings'])) &&
    (value['colors'] === undefined ? !requireAll : isDyedColorArray(value['colors']))
  )
}

export const isCustomModelDataOptions = (value: unknown): value is CustomModelDataOptions =>
  isPlainRecord(value) && isCustomModelDataFields(value, false)

export const isCustomModelDataComponent = (value: unknown): value is CustomModelDataComponent =>
  isPlainRecord(value) && isCustomModelDataFields(value, true)

export const isMapIdComponent = (value: unknown): value is MapIdComponent =>
  typeof value === 'number' && MapId.is(value)

export const isInstrumentComponent = (value: unknown): value is InstrumentComponent =>
  isResourceLocation(value)

export const isNoteBlockSoundComponent = (value: unknown): value is NoteBlockSoundComponent =>
  isResourceLocation(value)

export const isRecipesComponent = (value: unknown): value is RecipesComponent =>
  Array.isArray(value) && value.every((entry) => isResourceLocation(entry))

export const isLockComponent = (value: unknown): value is LockComponent => typeof value === 'string'

export const isTooltipStyleComponent = (value: unknown): value is TooltipStyleComponent =>
  isResourceLocation(value)

export const isResourceLocationProvider = (value: unknown): value is ResourceLocationProvider => {
  if (typeof value === 'string') {
    return ResourceLocation.is(value) || TagLocation.is(value)
  }
  return Array.isArray(value) && value.every((entry: unknown) =>
    typeof entry === 'string' && ResourceLocation.is(entry),
  )
}

const EQUIPPABLE_SLOT_SET: ReadonlySet<string> = new Set(EQUIPPABLE_SLOTS)
const EQUIPPABLE_KEYS = [
  'slot',
  'equipSound',
  'model',
  'cameraOverlay',
  'allowedEntities',
  'canBeSheared',
  'shearingSound',
  'dispensable',
  'swappable',
  'damageOnHurt',
  'equipOnInteract',
] as const
const EQUIPPABLE_REQUIRED_KEYS = [
  'canBeSheared',
  'shearingSound',
  'dispensable',
  'swappable',
  'damageOnHurt',
  'equipOnInteract',
] as const
const EQUIPPABLE_REQUIRED_BOOLEAN_KEYS = [
  'canBeSheared',
  'dispensable',
  'swappable',
  'damageOnHurt',
  'equipOnInteract',
] as const

const isEquippableSlot = (value: unknown): boolean =>
  typeof value === 'string' && EQUIPPABLE_SLOT_SET.has(value)

const isOptionalResourceLocation = (value: unknown): boolean =>
  value === undefined || isResourceLocation(value)

const isOptionalResourceLocationProvider = (value: unknown): boolean =>
  value === undefined || isResourceLocationProvider(value)

const isOptionalBoolean = (value: unknown): boolean => value === undefined || typeof value === 'boolean'

const hasRequiredBooleanFields = (value: RecordValue): boolean =>
  EQUIPPABLE_REQUIRED_BOOLEAN_KEYS.every((key) => typeof value[key] === 'boolean')

const isEquippableFields = (value: RecordValue, requireDefaults: boolean): boolean =>
  hasOnlyKeys(value, EQUIPPABLE_KEYS) &&
  isEquippableSlot(value['slot']) &&
  isOptionalResourceLocation(value['equipSound']) &&
  isOptionalResourceLocation(value['model']) &&
  isOptionalResourceLocation(value['cameraOverlay']) &&
  isOptionalResourceLocationProvider(value['allowedEntities']) &&
  isOptionalBoolean(value['canBeSheared']) &&
  isOptionalResourceLocation(value['shearingSound']) &&
  isOptionalBoolean(value['dispensable']) &&
  isOptionalBoolean(value['swappable']) &&
  isOptionalBoolean(value['damageOnHurt']) &&
  isOptionalBoolean(value['equipOnInteract']) &&
  (!requireDefaults ||
    (hasAllKeys(value, EQUIPPABLE_REQUIRED_KEYS) &&
      hasRequiredBooleanFields(value) &&
      isResourceLocation(value['shearingSound'])))

export const isEquippableOptions = (value: unknown): value is EquippableOptions =>
  isPlainRecord(value) && isEquippableFields(value, false)

export const isEquippableComponent = (value: unknown): value is EquippableComponent =>
  isPlainRecord(value) && isEquippableFields(value, true)

const KINETIC_WEAPON_CONDITION_KEYS = ['maxDurationTicks', 'minSpeed', 'minRelativeSpeed'] as const

const isNonNegativeFiniteNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0

const isKineticWeaponConditionFields = (
  value: RecordValue,
  requireDefaults: boolean,
): boolean =>
  hasOnlyKeys(value, KINETIC_WEAPON_CONDITION_KEYS) &&
  (value['maxDurationTicks'] === undefined
    ? !requireDefaults
    : isNonNegativeSafeInteger(value['maxDurationTicks'])) &&
  (value['minSpeed'] === undefined
    ? !requireDefaults
    : isNonNegativeFiniteNumber(value['minSpeed'])) &&
  (value['minRelativeSpeed'] === undefined
    ? !requireDefaults
    : isNonNegativeFiniteNumber(value['minRelativeSpeed']))

export const isKineticWeaponConditionOptions = (
  value: unknown,
): value is KineticWeaponConditionOptions =>
  isPlainRecord(value) && isKineticWeaponConditionFields(value, false) && hasAllKeys(value, ['maxDurationTicks'])

export const isKineticWeaponCondition = (value: unknown): value is KineticWeaponCondition =>
  isPlainRecord(value) &&
  isKineticWeaponConditionFields(value, true) &&
  hasExactKeys(value, KINETIC_WEAPON_CONDITION_KEYS)

const KINETIC_WEAPON_KEYS = [
  'contactCooldownTicks',
  'delayTicks',
  'dismountConditions',
  'knockbackConditions',
  'damageConditions',
  'forwardMovement',
  'damageMultiplier',
  'sound',
  'hitSound',
] as const
const KINETIC_WEAPON_REQUIRED_KEYS = [
  'contactCooldownTicks',
  'delayTicks',
  'forwardMovement',
  'damageMultiplier',
] as const

const isOptionalKineticWeaponCondition = (value: unknown): boolean =>
  value === undefined || (isPlainRecord(value) && isKineticWeaponConditionFields(value, false) && hasAllKeys(value, ['maxDurationTicks']))

const isKineticWeaponFields = (value: RecordValue, requireDefaults: boolean): boolean =>
  hasOnlyKeys(value, KINETIC_WEAPON_KEYS) &&
  (value['contactCooldownTicks'] === undefined
    ? !requireDefaults
    : isNonNegativeSafeInteger(value['contactCooldownTicks'])) &&
  (value['delayTicks'] === undefined
    ? !requireDefaults
    : isNonNegativeSafeInteger(value['delayTicks'])) &&
  isOptionalKineticWeaponCondition(value['dismountConditions']) &&
  isOptionalKineticWeaponCondition(value['knockbackConditions']) &&
  isOptionalKineticWeaponCondition(value['damageConditions']) &&
  (value['forwardMovement'] === undefined
    ? !requireDefaults
    : isFiniteNumber(value['forwardMovement'])) &&
  (value['damageMultiplier'] === undefined
    ? !requireDefaults
    : isFiniteNumber(value['damageMultiplier'])) &&
  isOptionalResourceLocation(value['sound']) &&
  isOptionalResourceLocation(value['hitSound']) &&
  (!requireDefaults || hasAllKeys(value, KINETIC_WEAPON_REQUIRED_KEYS))

export const isKineticWeaponOptions = (value: unknown): value is KineticWeaponOptions =>
  isPlainRecord(value) && isKineticWeaponFields(value, false)

export const isKineticWeaponComponent = (value: unknown): value is KineticWeaponComponent =>
  isPlainRecord(value) &&
  isKineticWeaponFields(value, true) &&
  KINETIC_WEAPON_REQUIRED_KEYS.every((key) => Object.hasOwn(value, key)) &&
  (value['dismountConditions'] === undefined || isKineticWeaponCondition(value['dismountConditions'])) &&
  (value['knockbackConditions'] === undefined || isKineticWeaponCondition(value['knockbackConditions'])) &&
  (value['damageConditions'] === undefined || isKineticWeaponCondition(value['damageConditions']))

const PIERCING_WEAPON_KEYS = ['dealsKnockback', 'dismounts', 'sound', 'hitSound'] as const
const PIERCING_WEAPON_REQUIRED_KEYS = ['dealsKnockback', 'dismounts'] as const

export const isPiercingWeaponOptions = (value: unknown): value is PiercingWeaponOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, PIERCING_WEAPON_KEYS) &&
  isOptionalBoolean(value['dealsKnockback']) &&
  isOptionalBoolean(value['dismounts']) &&
  isOptionalResourceLocation(value['sound']) &&
  isOptionalResourceLocation(value['hitSound'])

export const isPiercingWeaponComponent = (value: unknown): value is PiercingWeaponComponent =>
  isPiercingWeaponOptions(value) &&
  hasAllKeys(value, PIERCING_WEAPON_REQUIRED_KEYS) &&
  PIERCING_WEAPON_REQUIRED_KEYS.every((key) => typeof value[key] === 'boolean')

export const isGliderComponent = (value: unknown): value is GliderComponent =>
  isPlainRecord(value) && Object.keys(value).length === 0

export const isDeathProtectionOptions = (value: unknown): value is DeathProtectionOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['deathEffects']) &&
  (value['deathEffects'] === undefined ||
    (Array.isArray(value['deathEffects']) && value['deathEffects'].every(isConsumableEffect)))

export const isDeathProtectionComponent = (value: unknown): value is DeathProtectionComponent =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['deathEffects']) &&
  Array.isArray(value['deathEffects']) &&
  value['deathEffects'].every(isConsumableEffect)

export const isRepairableComponent = (value: unknown): value is RepairableComponent =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['items']) &&
  isResourceLocationProvider(value['items'])

export const isEnchantableValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

export const isEnchantableComponent = (value: unknown): value is EnchantableComponent =>
  isPlainRecord(value) && hasExactKeys(value, ['value']) && isEnchantableValue(value['value'])

export const isJukeboxPlayableComponent = (value: unknown): value is JukeboxPlayableComponent =>
  isPlainRecord(value) && hasExactKeys(value, ['song']) && isResourceLocation(value['song'])

export const isOminousBottleAmplifierComponent = (
  value: unknown,
): value is OminousBottleAmplifierComponent =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 4

export const isPaintingVariantComponent = (value: unknown): value is PaintingVariantComponent =>
  isResourceLocation(value)

const isBlockPosition = (value: unknown): value is readonly [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((entry) => typeof entry === 'number' && Number.isSafeInteger(entry))

const isLodestoneTrackerTargetOptions = (value: unknown): boolean =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['pos', 'dimension']) &&
  isBlockPosition(value['pos']) &&
  typeof value['dimension'] === 'string' &&
  ResourceLocation.is(value['dimension'])

const isLodestoneTrackerTarget = (value: unknown): boolean =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['pos', 'dimension']) &&
  isBlockPosition(value['pos']) &&
  isResourceLocation(value['dimension'])

export const isLodestoneTrackerOptions = (value: unknown): value is LodestoneTrackerOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['target', 'tracked']) &&
  (value['target'] === undefined || isLodestoneTrackerTargetOptions(value['target'])) &&
  (value['tracked'] === undefined || typeof value['tracked'] === 'boolean')

export const isLodestoneTrackerComponent = (
  value: unknown,
): value is LodestoneTrackerComponent =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['target', 'tracked']) &&
  hasAllKeys(value, ['tracked']) &&
  (value['target'] === undefined || isLodestoneTrackerTarget(value['target'])) &&
  typeof value['tracked'] === 'boolean'

const isFireworkExplosionShape = (value: unknown): boolean =>
  typeof value === 'string' && FIREWORK_EXPLOSION_SHAPE_SET.has(value)

const isPackedRgbArray = (value: unknown): value is ReadonlyArray<number> =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'number' && isPackedRgb(entry))

const isFireworkExplosionFields = (value: RecordValue, requireDefaults: boolean): boolean => {
  if (!hasOnlyKeys(value, ['shape', 'colors', 'fadeColors', 'hasTrail', 'hasTwinkle'])) {
    return false
  }
  if (requireDefaults && !hasExactKeys(value, ['shape', 'colors', 'fadeColors', 'hasTrail', 'hasTwinkle'])) {
    return false
  }
  return (
    isFireworkExplosionShape(value['shape']) &&
    (value['colors'] === undefined ? !requireDefaults : isPackedRgbArray(value['colors'])) &&
    (value['fadeColors'] === undefined ? !requireDefaults : isPackedRgbArray(value['fadeColors'])) &&
    (value['hasTrail'] === undefined ? !requireDefaults : typeof value['hasTrail'] === 'boolean') &&
    (value['hasTwinkle'] === undefined ? !requireDefaults : typeof value['hasTwinkle'] === 'boolean')
  )
}

export const isFireworkExplosionOptions = (
  value: unknown,
): value is FireworkExplosionOptions =>
  isPlainRecord(value) && isFireworkExplosionFields(value, false)

export const isFireworkExplosionComponent = (
  value: unknown,
): value is FireworkExplosionComponent =>
  isPlainRecord(value) && isFireworkExplosionFields(value, true)

const isUnsignedByte = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xff

const isFireworkExplosionOptionsArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every(isFireworkExplosionOptions)

const isFireworkExplosionComponentArray = (value: unknown): boolean =>
  Array.isArray(value) && value.length <= 256 && value.every(isFireworkExplosionComponent)

export const isFireworksOptions = (value: unknown): value is FireworksOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['explosions', 'flightDuration']) &&
  (value['explosions'] === undefined || isFireworkExplosionOptionsArray(value['explosions'])) &&
  (value['flightDuration'] === undefined || isUnsignedByte(value['flightDuration']))

export const isFireworksComponent = (value: unknown): value is FireworksComponent =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['explosions', 'flightDuration']) &&
  isFireworkExplosionComponentArray(value['explosions']) &&
  isUnsignedByte(value['flightDuration'])

const isBannerPatternEntryOptions = (value: unknown): value is BannerPatternOptions =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['pattern', 'color']) &&
  typeof value['pattern'] === 'string' &&
  ResourceLocation.is(value['pattern']) &&
  isDyeComponent(value['color'])

const isBannerPatternEntry = (value: unknown): value is BannerPatternEntry =>
  isPlainRecord(value) &&
  hasExactKeys(value, ['pattern', 'color']) &&
  isResourceLocation(value['pattern']) &&
  isDyeComponent(value['color'])

export const isBannerPatternsOptions = (value: unknown): value is ReadonlyArray<BannerPatternOptions> =>
  Array.isArray(value) && value.every(isBannerPatternEntryOptions)

export const isBannerPatternsComponent = (value: unknown): value is BannerPatternsComponent =>
  Array.isArray(value) && value.every(isBannerPatternEntry)

export const isPotDecorationsOptions = (value: unknown): value is PotDecorationsOptions =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every((entry) => typeof entry === 'string' && ResourceLocation.is(entry))

export const isPotDecorationsComponent = (value: unknown): value is PotDecorationsComponent =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(isResourceLocation)

const isLong = (value: unknown): value is bigint =>
  typeof value === 'bigint' && value >= LONG_MIN && value <= LONG_MAX

export const isContainerLootOptions = (value: unknown): value is ContainerLootOptions =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['lootTable', 'seed']) &&
  typeof value['lootTable'] === 'string' &&
  ResourceLocation.is(value['lootTable']) &&
  (value['seed'] === undefined || isLong(value['seed']))

export const isContainerLootComponent = (value: unknown): value is ContainerLootComponent =>
  isPlainRecord(value) &&
  hasOnlyKeys(value, ['lootTable', 'seed']) &&
  hasAllKeys(value, ['lootTable']) &&
  isResourceLocation(value['lootTable']) &&
  (value['seed'] === undefined || isLong(value['seed']))

export const isDebugStickStateComponent = (value: unknown): value is DebugStickStateComponent =>
  isPlainRecord(value) &&
  Object.entries(value).every(
    ([block, property]) => ResourceLocation.is(block) && typeof property === 'string',
  )

export const isPotionDurationScaleComponent = (value: unknown): value is PotionDurationScale =>
  typeof value === 'number' && PotionDurationScale.is(value)

export const isAdditionalTradeCostComponent = (value: unknown): value is AdditionalTradeCost =>
  typeof value === 'number' && AdditionalTradeCost.is(value)

export const isBreakSoundComponent = (value: unknown): value is ResourceLocation =>
  typeof value === 'string' && ResourceLocation.is(value)

export const isProvidesTrimMaterialComponent = (value: unknown): value is ResourceLocation =>
  typeof value === 'string' && ResourceLocation.is(value)

export const isProvidesBannerPatternsComponent = (value: unknown): value is BannerPatternProvider =>
  isResourceLocationProvider(value)

export const isBaseColorComponent = (value: unknown): value is BaseColorComponent =>
  isDyeComponent(value)

export const isTooltipDisplayComponent = (value: unknown): value is TooltipDisplayComponent => {
  if (!isRecord(value) || !hasExactKeys(value, ['hideTooltip', 'hiddenComponents'])) {
    return false
  }
  return (
    typeof value['hideTooltip'] === 'boolean' &&
    Array.isArray(value['hiddenComponents']) &&
    value['hiddenComponents'].every(
      (component: unknown) => typeof component === 'string' && ResourceLocation.is(component),
    )
  )
}

/** Strict Java item-component values and their item-aware defaults. */
import { Result } from 'effect'
import {
  MAX_GENERIC_INPUT_ARRAY_LENGTH,
  snapshotInputRecord,
  snapshotInputValue,
} from '../../input-snapshot.js'
import { itemUseComponentsOf } from './consumable.js'
import type {
  ConsumableComponent,
  FoodComponent,
  UseRemainderComponent,
} from './consumable-data.js'
import type { UseCooldownComponent } from './use-cooldown-data.js'
import {
  isAdditionalTradeCostComponent,
  bannerPatternsComponent,
  baseColorComponent,
  beesComponent,
  blockEntityDataComponent,
  blockStateComponent,
  bundleContentsComponent,
  bucketEntityDataComponent,
  canBreakComponent,
  canPlaceOnComponent,
  chargedProjectilesComponent,
  containerLootComponent,
  containerComponent,
  deathProtectionComponent,
  debugStickStateComponent,
  enchantableComponent,
  equippableComponent,
  gliderComponent,
  isBlockStateComponent,
  isBlockEntityDataOptions,
  isBucketEntityDataOptions,
  isBannerPatternsOptions,
  isBundleContentsOptions,
  isChargedProjectilesOptions,
  isBreakSoundComponent,
  isContainerLootOptions,
  isContainerOptions,
  isCanBreakOptions,
  isCanPlaceOnOptions,
  customDataComponent,
  entityDataComponent,
  isCustomDataComponent,
  customModelDataComponent,
  isCustomModelDataOptions,
  isBaseColorComponent,
  isBeesOptions,
  isDeathProtectionOptions,
  isDyeComponent,
  dyedColorComponent,
  isDebugStickStateComponent,
  isDyedColorComponent,
  isEntityDataOptions,
  isEnchantableValue,
  isEquippableOptions,
  isKineticWeaponOptions,
  isPiercingWeaponOptions,
  fireworkExplosionComponent,
  isFireworkExplosionOptions,
  fireworksComponent,
  isFireworksOptions,
  instrumentComponent,
  isInstrumentComponent,
  isOminousBottleAmplifierComponent,
  isLodestoneTrackerOptions,
  lodestoneTrackerComponent,
  isPaintingVariantComponent,
  kineticWeaponComponent,
  isPotDecorationsOptions,
  potDecorationsComponent,
  profileComponent,
  isPotionContentsOptions,
  potionContentsComponent,
  isResourceLocationProvider,
  lockComponent,
  isLockComponent,
  jukeboxPlayableComponent,
  hideAdditionalTooltipComponent,
  mapIdComponent,
  mapColorComponent,
  mapDecorationsComponent,
  isMapColorComponent,
  isMapDecorationsOptions,
  isMapIdComponent,
  noteBlockSoundComponent,
  ominousBottleAmplifierComponent,
  isNoteBlockSoundComponent,
  paintingVariantComponent,
  isPotionDurationScaleComponent,
  isProfileOptions,
  isProvidesBannerPatternsComponent,
  isProvidesTrimMaterialComponent,
  piercingWeaponComponent,
  repairableComponent,
  recipesComponent,
  isRecipesComponent,
  isSuspiciousStewOptions,
  suspiciousStewComponent,
  isSulfurCubeContentOptions,
  sulfurCubeContentComponent,
  isTrimOptions,
  trimComponent,
  isTooltipDisplayComponent,
  tooltipStyleComponent,
  isTooltipStyleComponent,
  isWritableBookContentOptions,
  writableBookContentComponent,
  isWrittenBookContentOptions,
  writtenBookContentComponent,
  type BannerPatternProvider,
  type BannerPatternOptions,
  type BaseColorComponent,
  type BeesOptions,
  type BlockEntityDataOptions,
  type BlockStateComponent,
  type BundleContentsOptions,
  type BucketEntityDataOptions,
  type CanBreakOptions,
  type CanPlaceOnOptions,
  type ChargedProjectilesOptions,
  type CustomDataComponent,
  type DebugStickStateComponent,
  type CustomModelDataOptions,
  type ContainerLootOptions,
  type ContainerOptions,
  type FireworkExplosionOptions,
  type FireworksOptions,
  type DeathProtectionOptions,
  type DyeColor,
  type DyedColorComponent,
  type EntityDataOptions,
  type EquippableOptions,
  type InstrumentComponent,
  type KineticWeaponOptions,
  type LodestoneTrackerOptions,
  type LockComponent,
  type MapColorComponent,
  type MapDecorationsOptions,
  type NoteBlockSoundComponent,
  type PotDecorationsOptions,
  type ProfileOptions,
  type PotionContentsOptions,
  type PiercingWeaponOptions,
  type RecipesComponent,
  type ResourceLocationProviderInput,
  type SuspiciousStewOptions,
  type SulfurCubeContentOptions,
  type TrimOptions,
  type TooltipDisplayComponent,
  type TooltipStyleComponent,
  type WritableBookContentOptions,
  type WrittenBookContentOptions,
} from './item-component-values.js'
import {
  isConsumableComponent,
  isFoodComponent,
  isUseRemainderComponent,
} from './consumable-validation.js'
import { itemDurabilityDefinitionFor } from './equipment-data.js'
import {
  validateItemComponentRelations,
  type ItemComponents,
} from './item-components-validation.js'
import { itemToolComponentOf } from './item-tool.js'
import { ITEM_RARITIES, itemComponentStackLimitOf, type ItemRarity } from './item-components-data.js'
import { isItemType, type ItemType } from './item-type.js'
import { isUseCooldownComponent } from './use-cooldown-validation.js'
import {
  isAttackRangeComponent,
  isDamageTypeComponent,
  isMinimumAttackChargeComponent,
  isSwingAnimationComponent,
  isUseEffectsComponent,
} from './item-combat-validation.js'
import {
  ItemDamage,
  MaxDamage,
  MaxStackSize,
  RepairCost,
} from '../time/quantities.js'
import { isToolComponent, type ToolComponent } from './tool-component.js'
import type { WeaponComponent } from './weapon-data.js'
import { isWeaponComponent } from './weapon-validation.js'
import type {
  AdditionalTradeCost,
  PotionDurationScale,
} from '../time/quantities.js'
import type {
  AttackRangeComponent,
  DamageTypeComponent,
  MinimumAttackChargeComponent,
  SwingAnimationComponent,
  UseEffectsComponent,
} from './item-combat-data.js'
import { isBlocksAttacksComponent, isDamageResistantComponent } from './item-defense-validation.js'
import type { BlocksAttacksComponent, DamageResistantComponent } from './item-defense-data.js'
import {
  isAttributeModifiersComponent,
} from './item-attribute-modifiers-validation.js'
import type { AttributeModifiersComponent } from './item-attribute-modifiers-data.js'
import {
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
} from './item-enchantments-validation.js'
import type {
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
import { ResourceLocation } from '../text/identifiers.js'
import { isTextComponent } from '../text/text-component-validation.js'
import { textComponent, type TextComponentFailure } from '../text/text-component.js'
import type { TextComponent } from '../text/text-component-data.js'
import type {
  MapId,
} from '../time/quantities.js'
import type {
  Enchantability,
  OminousBottleAmplifier,
} from './item-primitives.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

type ItemComponentFailure = ItemValidationFailure | TextComponentFailure

export {
  ITEM_COMPONENT_IDS,
  ITEM_RARITIES,
  ITEMS_WITH_SINGLE_STACK_LIMIT,
  ITEMS_WITH_SIXTEEN_STACK_LIMIT,
  itemComponentStackLimitOf,
} from './item-components-data.js'
export { ITEM_TOOL_COMPONENTS, itemToolComponentOf } from './item-tool.js'
export type { ItemComponentId, ItemRarity } from './item-components-data.js'
export { isItemComponents } from './item-components-validation.js'
export type { ItemComponents } from './item-components-validation.js'

export type ItemComponentOptions = Readonly<{
  readonly maxStackSize?: MaxStackSize
  readonly maxDamage?: MaxDamage
  readonly damage?: ItemDamage
  readonly repairCost?: RepairCost
  readonly unbreakable?: true
  readonly enchantmentGlintOverride?: boolean
  readonly tooltipDisplay?: TooltipDisplayComponent
  readonly customName?: TextComponent
  readonly itemName?: TextComponent
  readonly lore?: ReadonlyArray<TextComponent>
  readonly itemModel?: ResourceLocation
  readonly customData?: CustomDataComponent
  readonly entityData?: EntityDataOptions
  readonly bucketEntityData?: BucketEntityDataOptions
  readonly profile?: ProfileOptions
  readonly blockEntityData?: BlockEntityDataOptions
  readonly chargedProjectiles?: ChargedProjectilesOptions
  readonly bundleContents?: BundleContentsOptions
  readonly container?: ContainerOptions
  readonly mapColor?: MapColorComponent
  readonly mapDecorations?: MapDecorationsOptions
  readonly writableBookContent?: WritableBookContentOptions
  readonly writtenBookContent?: WrittenBookContentOptions
  readonly trim?: TrimOptions
  readonly suspiciousStew?: SuspiciousStewOptions
  readonly hideAdditionalTooltip?: true
  readonly canBreak?: CanBreakOptions
  readonly canPlaceOn?: CanPlaceOnOptions
  readonly bees?: BeesOptions
  readonly potionContents?: PotionContentsOptions
  readonly dyedColor?: DyedColorComponent
  readonly customModelData?: CustomModelDataOptions
  readonly mapId?: MapId
  readonly blockState?: BlockStateComponent
  readonly instrument?: InstrumentComponent
  readonly noteBlockSound?: NoteBlockSoundComponent
  readonly recipes?: RecipesComponent
  readonly lock?: LockComponent
  readonly tooltipStyle?: TooltipStyleComponent
  readonly baseColor?: BaseColorComponent
  readonly equippable?: EquippableOptions
  readonly glider?: true
  readonly deathProtection?: DeathProtectionOptions
  readonly repairable?: ResourceLocationProviderInput
  readonly enchantable?: Enchantability
  readonly jukeboxPlayable?: ResourceLocation
  readonly ominousBottleAmplifier?: OminousBottleAmplifier
  readonly paintingVariant?: ResourceLocation
  readonly lodestoneTracker?: LodestoneTrackerOptions
  readonly fireworkExplosion?: FireworkExplosionOptions
  readonly fireworks?: FireworksOptions
  readonly bannerPatterns?: ReadonlyArray<BannerPatternOptions>
  readonly potDecorations?: PotDecorationsOptions
  readonly containerLoot?: ContainerLootOptions
  readonly debugStickState?: DebugStickStateComponent
  readonly rarity?: ItemRarity
  readonly food?: FoodComponent
  readonly consumable?: ConsumableComponent
  readonly useRemainder?: UseRemainderComponent
  readonly useCooldown?: UseCooldownComponent
  readonly useEffects?: UseEffectsComponent
  readonly tool?: ToolComponent
  readonly weapon?: WeaponComponent
  readonly kineticWeapon?: KineticWeaponOptions
  readonly piercingWeapon?: PiercingWeaponOptions
  readonly attributeModifiers?: AttributeModifiersComponent
  readonly enchantments?: EnchantmentsComponent
  readonly storedEnchantments?: StoredEnchantmentsComponent
  readonly blocksAttacks?: BlocksAttacksComponent
  readonly damageResistant?: DamageResistantComponent
  readonly minimumAttackCharge?: MinimumAttackChargeComponent
  readonly damageType?: DamageTypeComponent
  readonly swingAnimation?: SwingAnimationComponent
  readonly attackRange?: AttackRangeComponent
  readonly potionDurationScale?: PotionDurationScale
  readonly breakSound?: ResourceLocation
  readonly providesBannerPatterns?: BannerPatternProvider
  readonly providesTrimMaterial?: ResourceLocation
  readonly dye?: DyeColor
  readonly additionalTradeCost?: AdditionalTradeCost
  readonly sulfurCubeContent?: SulfurCubeContentOptions
}>

const ITEM_RARITY_SET: ReadonlySet<string> = new Set(ITEM_RARITIES)

const isItemRarity = (value: unknown): value is ItemRarity =>
  typeof value === 'string' && ITEM_RARITY_SET.has(value)

type ItemComponentOptionValidator = Readonly<{
  readonly key: keyof ItemComponentOptions
  readonly isValid: (value: unknown) => boolean
  readonly message: string | ((value: unknown) => string)
}>

const isLore = (value: unknown): boolean =>
  Array.isArray(value) && value.length <= 256 && value.every(isTextComponent)

const isResourceLocation = (value: unknown): boolean =>
  typeof value === 'string' && ResourceLocation.is(value)

const ITEM_COMPONENT_OPTION_VALIDATORS = [
  {
    key: 'unbreakable',
    isValid: (value: unknown) => value === true,
    message: 'unbreakable is an empty component and can only be true',
  },
  {
    key: 'enchantmentGlintOverride',
    isValid: (value: unknown) => typeof value === 'boolean',
    message: 'enchantmentGlintOverride must be a boolean',
  },
  {
    key: 'tooltipDisplay',
    isValid: isTooltipDisplayComponent,
    message: 'tooltipDisplay must be a valid tooltip_display component',
  },
  {
    key: 'customName',
    isValid: isTextComponent,
    message: 'customName must be a valid text component',
  },
  {
    key: 'itemName',
    isValid: isTextComponent,
    message: 'itemName must be a valid text component',
  },
  {
    key: 'lore',
    isValid: isLore,
    message: 'lore must contain at most 256 valid text components',
  },
  {
    key: 'itemModel',
    isValid: isResourceLocation,
    message: 'itemModel must be a valid resource location',
  },
  {
    key: 'customData',
    isValid: isCustomDataComponent,
    message: 'customData must be a non-empty object containing NBT-compatible values',
  },
  {
    key: 'entityData',
    isValid: isEntityDataOptions,
    message: 'entityData must be NBT data containing a valid id',
  },
  {
    key: 'bucketEntityData',
    isValid: isBucketEntityDataOptions,
    message: 'bucketEntityData must contain NBT-compatible values',
  },
  {
    key: 'profile',
    isValid: isProfileOptions,
    message: 'profile must be a valid player name or profile object',
  },
  {
    key: 'blockEntityData',
    isValid: isBlockEntityDataOptions,
    message: 'blockEntityData must be NBT data containing a valid id',
  },
  {
    key: 'chargedProjectiles',
    isValid: isChargedProjectilesOptions,
    message: 'chargedProjectiles must contain valid item stacks',
  },
  {
    key: 'bundleContents',
    isValid: isBundleContentsOptions,
    message: 'bundleContents must contain valid item stacks',
  },
  {
    key: 'container',
    isValid: isContainerOptions,
    message: 'container must contain valid slot entries',
  },
  {
    key: 'mapColor',
    isValid: isMapColorComponent,
    message: 'mapColor must be an RGB integer',
  },
  {
    key: 'mapDecorations',
    isValid: isMapDecorationsOptions,
    message: 'mapDecorations must contain valid map decorations',
  },
  {
    key: 'writableBookContent',
    isValid: isWritableBookContentOptions,
    message: 'writableBookContent must contain at most 100 valid pages',
  },
  {
    key: 'writtenBookContent',
    isValid: isWrittenBookContentOptions,
    message: 'writtenBookContent must be a valid written book content value',
  },
  {
    key: 'trim',
    isValid: isTrimOptions,
    message: 'trim must be a valid trim component',
  },
  {
    key: 'suspiciousStew',
    isValid: isSuspiciousStewOptions,
    message: 'suspiciousStew must contain valid effects',
  },
  {
    key: 'hideAdditionalTooltip',
    isValid: (value: unknown) => value === true,
    message: 'hideAdditionalTooltip is an empty component and can only be true',
  },
  {
    key: 'canBreak',
    isValid: isCanBreakOptions,
    message: 'canBreak must contain valid block predicates',
  },
  {
    key: 'canPlaceOn',
    isValid: isCanPlaceOnOptions,
    message: 'canPlaceOn must contain valid block predicates',
  },
  {
    key: 'bees',
    isValid: isBeesOptions,
    message: 'bees must contain valid bee entries',
  },
  {
    key: 'potionContents',
    isValid: isPotionContentsOptions,
    message: 'potionContents must be a valid potion contents value',
  },
  {
    key: 'dyedColor',
    isValid: isDyedColorComponent,
    message: 'dyedColor must be an RGB integer or three normalized color channels',
  },
  {
    key: 'customModelData',
    isValid: isCustomModelDataOptions,
    message: 'customModelData must contain valid floats, flags, strings, or colors arrays',
  },
  {
    key: 'mapId',
    isValid: isMapIdComponent,
    message: 'mapId must be a non-negative safe integer',
  },
  {
    key: 'blockState',
    isValid: isBlockStateComponent,
    message: 'blockState must be a map of property names to strings',
  },
  {
    key: 'instrument',
    isValid: isInstrumentComponent,
    message: 'instrument must be a valid resource location',
  },
  {
    key: 'noteBlockSound',
    isValid: isNoteBlockSoundComponent,
    message: 'noteBlockSound must be a valid resource location',
  },
  {
    key: 'recipes',
    isValid: isRecipesComponent,
    message: 'recipes must be a list of valid resource locations',
  },
  {
    key: 'lock',
    isValid: isLockComponent,
    message: 'lock must be a string',
  },
  {
    key: 'tooltipStyle',
    isValid: isTooltipStyleComponent,
    message: 'tooltipStyle must be a valid resource location',
  },
  {
    key: 'baseColor',
    isValid: isBaseColorComponent,
    message: 'baseColor must be a valid dye color',
  },
  {
    key: 'equippable',
    isValid: isEquippableOptions,
    message: 'equippable must be a valid equippable component',
  },
  {
    key: 'glider',
    isValid: (value: unknown) => value === true,
    message: 'glider is an empty component and can only be true',
  },
  {
    key: 'deathProtection',
    isValid: isDeathProtectionOptions,
    message: 'deathProtection must be a valid death_protection component',
  },
  {
    key: 'repairable',
    isValid: isResourceLocationProvider,
    message: 'repairable must contain valid item ids or an item tag',
  },
  {
    key: 'enchantable',
    isValid: isEnchantableValue,
    message: 'enchantable must be a positive safe integer',
  },
  {
    key: 'jukeboxPlayable',
    isValid: isResourceLocation,
    message: 'jukeboxPlayable must be a valid resource location',
  },
  {
    key: 'ominousBottleAmplifier',
    isValid: isOminousBottleAmplifierComponent,
    message: 'ominousBottleAmplifier must be an integer from 0 through 4',
  },
  {
    key: 'paintingVariant',
    isValid: isPaintingVariantComponent,
    message: 'paintingVariant must be a valid resource location',
  },
  {
    key: 'lodestoneTracker',
    isValid: isLodestoneTrackerOptions,
    message: 'lodestoneTracker must be a valid lodestone_tracker component',
  },
  {
    key: 'fireworkExplosion',
    isValid: isFireworkExplosionOptions,
    message: 'fireworkExplosion must be a valid firework_explosion component',
  },
  {
    key: 'fireworks',
    isValid: isFireworksOptions,
    message: 'fireworks must be a valid fireworks component',
  },
  {
    key: 'bannerPatterns',
    isValid: isBannerPatternsOptions,
    message: 'bannerPatterns must be a valid banner_patterns component',
  },
  {
    key: 'potDecorations',
    isValid: isPotDecorationsOptions,
    message: 'potDecorations must contain four valid item ids',
  },
  {
    key: 'containerLoot',
    isValid: isContainerLootOptions,
    message: 'containerLoot must be a valid container_loot component',
  },
  {
    key: 'debugStickState',
    isValid: isDebugStickStateComponent,
    message: 'debugStickState must map block ids to property names',
  },
  {
    key: 'rarity',
    isValid: isItemRarity,
    message: (value: unknown) => `Unknown item rarity: ${String(value)}`,
  },
  {
    key: 'food',
    isValid: isFoodComponent,
    message: 'food must be a valid food component',
  },
  {
    key: 'consumable',
    isValid: isConsumableComponent,
    message: 'consumable must be a valid consumable component',
  },
  {
    key: 'useRemainder',
    isValid: isUseRemainderComponent,
    message: 'useRemainder must be a valid use_remainder component',
  },
  {
    key: 'useCooldown',
    isValid: isUseCooldownComponent,
    message: 'useCooldown must be a valid use_cooldown component',
  },
  {
    key: 'useEffects',
    isValid: isUseEffectsComponent,
    message: 'useEffects must be a valid use_effects component',
  },
  {
    key: 'tool',
    isValid: isToolComponent,
    message: 'tool must be a valid tool component',
  },
  {
    key: 'weapon',
    isValid: isWeaponComponent,
    message: 'weapon must be a valid weapon component',
  },
  {
    key: 'kineticWeapon',
    isValid: isKineticWeaponOptions,
    message: 'kineticWeapon must be a valid kinetic_weapon component',
  },
  {
    key: 'piercingWeapon',
    isValid: isPiercingWeaponOptions,
    message: 'piercingWeapon must be a valid piercing_weapon component',
  },
  {
    key: 'attributeModifiers',
    isValid: isAttributeModifiersComponent,
    message: 'attributeModifiers must be a valid attribute_modifiers component',
  },
  {
    key: 'enchantments',
    isValid: isEnchantmentsComponent,
    message: 'enchantments must be a valid enchantments component',
  },
  {
    key: 'storedEnchantments',
    isValid: isStoredEnchantmentsComponent,
    message: 'storedEnchantments must be a valid stored_enchantments component',
  },
  {
    key: 'blocksAttacks',
    isValid: isBlocksAttacksComponent,
    message: 'blocksAttacks must be a valid blocks_attacks component',
  },
  {
    key: 'damageResistant',
    isValid: isDamageResistantComponent,
    message: 'damageResistant must be a valid damage_resistant component',
  },
  {
    key: 'minimumAttackCharge',
    isValid: isMinimumAttackChargeComponent,
    message: 'minimumAttackCharge must be a valid minimum_attack_charge component',
  },
  {
    key: 'damageType',
    isValid: isDamageTypeComponent,
    message: 'damageType must be a valid damage_type component',
  },
  {
    key: 'swingAnimation',
    isValid: isSwingAnimationComponent,
    message: 'swingAnimation must be a valid swing_animation component',
  },
  {
    key: 'attackRange',
    isValid: isAttackRangeComponent,
    message: 'attackRange must be a valid attack_range component',
  },
  {
    key: 'potionDurationScale',
    isValid: isPotionDurationScaleComponent,
    message: 'potionDurationScale must be a valid potion_duration_scale component',
  },
  {
    key: 'breakSound',
    isValid: isBreakSoundComponent,
    message: 'breakSound must be a valid break_sound component',
  },
  {
    key: 'providesBannerPatterns',
    isValid: isProvidesBannerPatternsComponent,
    message: 'providesBannerPatterns must be a valid provides_banner_patterns component',
  },
  {
    key: 'providesTrimMaterial',
    isValid: isProvidesTrimMaterialComponent,
    message: 'providesTrimMaterial must be a valid provides_trim_material component',
  },
  {
    key: 'dye',
    isValid: isDyeComponent,
    message: 'dye must be a valid dye component',
  },
  {
    key: 'additionalTradeCost',
    isValid: isAdditionalTradeCostComponent,
    message: 'additionalTradeCost must be a valid additional_trade_cost component',
  },
  {
    key: 'sulfurCubeContent',
    isValid: isSulfurCubeContentOptions,
    message: 'sulfurCubeContent must be a valid sulfur_cube_content component',
  },
] as const satisfies ReadonlyArray<ItemComponentOptionValidator>

const optionsFailure = (
  field: string,
  message: string,
  value?: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  kind: ItemValidationFailure['kind'] = 'TypeError',
): ItemValidationFailure => itemValidationFailure(field, message, reason, value, kind)

const snapshotOptions = (value: ItemComponentOptions): Result.Result<ItemComponentOptions, ItemValidationFailure> => {
  const optionKeys: ReadonlyArray<keyof ItemComponentOptions> = [
    ...ITEM_COMPONENT_OPTION_VALIDATORS.map(({ key }) => key),
    'maxStackSize', 'maxDamage', 'damage', 'repairCost', 'tooltipDisplay', 'customName', 'itemName', 'lore',
    'rarity', 'food', 'consumable', 'useRemainder', 'useCooldown', 'useEffects', 'tool', 'weapon',
    'attributeModifiers', 'enchantments', 'storedEnchantments', 'blocksAttacks', 'damageResistant',
    'minimumAttackCharge', 'damageType', 'swingAnimation', 'attackRange', 'breakSound',
    'providesBannerPatterns', 'providesTrimMaterial', 'dye', 'additionalTradeCost',
  ]
  const record = snapshotInputRecord(value, optionKeys.map(String))
  if (Result.isFailure(record)) {
    const invalidType = record.failure.reason === 'invalid-container' || record.failure.reason === 'unsupported-prototype'
    return Result.fail(optionsFailure(
      'options',
      invalidType ? 'Item component options must be a non-null object' : 'Unable to inspect item component options',
      value,
      invalidType ? 'invalid-type' : 'hostile-input',
    ))
  }
  const copy: Record<string, unknown> = Object.create(null)
  for (const key of new Set(optionKeys)) {
    const entry = record.success[String(key)]
    if (entry === undefined) continue
    const snapshot = snapshotInputValue(entry, MAX_GENERIC_INPUT_ARRAY_LENGTH, String(key))
    if (Result.isFailure(snapshot)) {
      const field = snapshot.failure.path ?? String(key)
      const message = snapshot.failure.reason === 'hostile-input'
        ? `Unable to inspect item component option ${field}`
        : snapshot.failure.reason === 'cyclic'
          ? `Cyclic item component option ${field} is invalid`
          : `Unable to snapshot item component option ${field}`
      const reason = snapshot.failure.reason === 'unsupported-prototype'
        ? 'invalid-value'
        : snapshot.failure.reason === 'invalid-container'
          ? 'invalid-type'
          : snapshot.failure.reason === 'cyclic'
            ? 'invalid-value'
            : 'hostile-input'
      return Result.fail(optionsFailure(field, message, snapshot.failure.value, reason))
    }
    Object.defineProperty(copy, key, { enumerable: true, value: snapshot.success })
  }
  return Result.succeed(copy)
}

const validateOptions = (
  options: ItemComponentOptions,
): Result.Result<ItemComponentOptions, ItemValidationFailure> => {
  for (const { key, isValid, message } of ITEM_COMPONENT_OPTION_VALIDATORS) {
    const value = options[key]
    if (value === undefined) continue
    if (!isValid(value)) {
      return Result.fail(optionsFailure(
        String(key),
        typeof message === 'function' ? message(value) : message,
        value,
      ))
    }
  }
  return Result.succeed(options)
}

const brandValue = <A, E extends Readonly<{ readonly message: string }>>(
  result: Result.Result<A, E>,
  field: string,
  value: unknown,
): Result.Result<A, ItemValidationFailure> => Result.mapError(
  result,
  (error) => optionsFailure(field, error.message, value, 'out-of-range', 'RangeError'),
)

const itemDamageOf = (
  maxDamage: ReturnType<typeof MaxDamage> | undefined,
  damage: number | undefined,
): Result.Result<ReturnType<typeof ItemDamage> | undefined, ItemValidationFailure> => {
  if (maxDamage === undefined && damage === undefined) return Result.succeed(undefined)
  const value = damage ?? 0
  return Result.map(brandValue(ItemDamage.result(value), 'damage', value), (itemDamage) => itemDamage)
}

const optionalComponentOf = <T, U>(
  value: T | undefined,
  normalize: (value: T) => Result.Result<U, ItemComponentFailure>,
): Result.Result<U | undefined, ItemComponentFailure> =>
  value === undefined ? Result.succeed(undefined) : normalize(value)

const presentComponentOf = <T>(
  value: true | undefined,
  normalize: () => Result.Result<T, ItemComponentFailure>,
): Result.Result<T | undefined, ItemComponentFailure> =>
  value === undefined ? Result.succeed(undefined) : normalize()

const valueOr = <T>(value: T | undefined, fallback: T): T =>
  value === undefined ? fallback : value

const valueOrUndefined = <T>(value: T | undefined, fallback: T | undefined): T | undefined =>
  value === undefined ? fallback : value

function buildItemComponents(
  item: ItemType,
  options: ItemComponentOptions,
): Result.Result<ItemComponents, ItemComponentFailure> {
  const defaultMaxDamage = itemDurabilityDefinitionFor(item)?.maxDurability
  const useComponents = itemUseComponentsOf(item)
  return Result.gen(function* () {
  const maxStackSize = options.maxStackSize === undefined
    ? yield* brandValue(MaxStackSize.result(Number(itemComponentStackLimitOf(item))), 'maxStackSize', itemComponentStackLimitOf(item))
    : yield* brandValue(MaxStackSize.result(options.maxStackSize), 'maxStackSize', options.maxStackSize)
  const maxDamageValue = valueOrUndefined(options.maxDamage, defaultMaxDamage)
  const maxDamage = yield* optionalComponentOf(maxDamageValue, (value) => brandValue(MaxDamage.result(value), 'maxDamage', value))
  const damage = yield* itemDamageOf(maxDamage, options.damage)
  const repairCost = options.repairCost === undefined
    ? yield* brandValue(RepairCost.result(0), 'repairCost', 0)
    : yield* brandValue(RepairCost.result(options.repairCost), 'repairCost', options.repairCost)
  yield* validateItemComponentRelations(maxStackSize, maxDamage, damage)

  const customName = options.customName === undefined ? undefined : yield* textComponent(options.customName)
  const itemName = options.itemName === undefined ? undefined : yield* textComponent(options.itemName)
  const loreValues: TextComponent[] = []
  for (const entry of options.lore ?? []) loreValues.push(yield* textComponent(entry))
  const lore = options.lore === undefined ? undefined : Object.freeze(loreValues)
  const itemModel = options.itemModel
  const customData = yield* optionalComponentOf(options.customData, customDataComponent)
  const entityData = yield* optionalComponentOf(options.entityData, entityDataComponent)
  const bucketEntityData = yield* optionalComponentOf(options.bucketEntityData, bucketEntityDataComponent)
  const profile = yield* optionalComponentOf(options.profile, profileComponent)
  const blockEntityData = yield* optionalComponentOf(options.blockEntityData, blockEntityDataComponent)
  const chargedProjectiles = yield* optionalComponentOf(options.chargedProjectiles, chargedProjectilesComponent)
  const bundleContents = yield* optionalComponentOf(options.bundleContents, bundleContentsComponent)
  const container = yield* optionalComponentOf(options.container, containerComponent)
  const mapColor = yield* optionalComponentOf(options.mapColor, mapColorComponent)
  const mapDecorations = yield* optionalComponentOf(options.mapDecorations, mapDecorationsComponent)
  const writableBookContent = yield* optionalComponentOf(options.writableBookContent, writableBookContentComponent)
  const writtenBookContent = yield* optionalComponentOf(options.writtenBookContent, writtenBookContentComponent)
  const trim = yield* optionalComponentOf(options.trim, trimComponent)
  const suspiciousStew = yield* optionalComponentOf(options.suspiciousStew, suspiciousStewComponent)
  const hideAdditionalTooltip = yield* presentComponentOf(options.hideAdditionalTooltip, hideAdditionalTooltipComponent)
  const canBreak = yield* optionalComponentOf(options.canBreak, canBreakComponent)
  const canPlaceOn = yield* optionalComponentOf(options.canPlaceOn, canPlaceOnComponent)
  const bees = yield* optionalComponentOf(options.bees, beesComponent)
  const potionContents = yield* optionalComponentOf(options.potionContents, potionContentsComponent)
  const dyedColor = yield* optionalComponentOf(options.dyedColor, dyedColorComponent)
  const customModelData = yield* optionalComponentOf(options.customModelData, customModelDataComponent)
  const mapId = yield* optionalComponentOf(options.mapId, mapIdComponent)
  const blockState = yield* optionalComponentOf(options.blockState, blockStateComponent)
  const instrument = yield* optionalComponentOf(options.instrument, instrumentComponent)
  const noteBlockSound = yield* optionalComponentOf(options.noteBlockSound, noteBlockSoundComponent)
  const recipes = yield* optionalComponentOf(options.recipes, recipesComponent)
  const lock = yield* optionalComponentOf(options.lock, lockComponent)
  const tooltipStyle = yield* optionalComponentOf(options.tooltipStyle, tooltipStyleComponent)
  const baseColor = yield* optionalComponentOf(options.baseColor, baseColorComponent)
  const equippable = yield* optionalComponentOf(options.equippable, equippableComponent)
  const glider = yield* presentComponentOf(options.glider, gliderComponent)
  const deathProtection = yield* optionalComponentOf(options.deathProtection, deathProtectionComponent)
  const repairable = yield* optionalComponentOf(options.repairable, repairableComponent)
  const enchantable = yield* optionalComponentOf(options.enchantable, enchantableComponent)
  const jukeboxPlayable = yield* optionalComponentOf(options.jukeboxPlayable, jukeboxPlayableComponent)
  const ominousBottleAmplifier = yield* optionalComponentOf(options.ominousBottleAmplifier, ominousBottleAmplifierComponent)
  const paintingVariant = yield* optionalComponentOf(options.paintingVariant, paintingVariantComponent)
  const lodestoneTracker = yield* optionalComponentOf(options.lodestoneTracker, lodestoneTrackerComponent)
  const fireworkExplosion = yield* optionalComponentOf(options.fireworkExplosion, fireworkExplosionComponent)
  const fireworks = yield* optionalComponentOf(options.fireworks, fireworksComponent)
  const bannerPatterns = yield* optionalComponentOf(options.bannerPatterns, bannerPatternsComponent)
  const potDecorations = yield* optionalComponentOf(options.potDecorations, potDecorationsComponent)
  const containerLoot = yield* optionalComponentOf(options.containerLoot, containerLootComponent)
  const debugStickState = yield* optionalComponentOf(options.debugStickState, debugStickStateComponent)
  const kineticWeapon = yield* optionalComponentOf(options.kineticWeapon, kineticWeaponComponent)
  const piercingWeapon = yield* optionalComponentOf(options.piercingWeapon, piercingWeaponComponent)
  const sulfurCubeContent = yield* optionalComponentOf(options.sulfurCubeContent, sulfurCubeContentComponent)

  return Object.freeze({
    maxStackSize,
    maxDamage,
    damage,
    repairCost,
    unbreakable: options.unbreakable,
    enchantmentGlintOverride: options.enchantmentGlintOverride,
    tooltipDisplay: options.tooltipDisplay,
    customName,
    itemName,
    lore,
    itemModel,
    customData,
    entityData,
    bucketEntityData,
    profile,
    blockEntityData,
    chargedProjectiles,
    bundleContents,
    container,
    mapColor,
    mapDecorations,
    writableBookContent,
    writtenBookContent,
    trim,
    suspiciousStew,
    hideAdditionalTooltip,
    canBreak,
    canPlaceOn,
    bees,
    potionContents,
    dyedColor,
    customModelData,
    mapId,
    blockState,
    instrument,
    noteBlockSound,
    recipes,
    lock,
    tooltipStyle,
    baseColor,
    equippable,
    glider,
    deathProtection,
    repairable,
    enchantable,
    jukeboxPlayable,
    ominousBottleAmplifier,
    paintingVariant,
    lodestoneTracker,
    fireworkExplosion,
    fireworks,
    bannerPatterns,
    potDecorations,
    containerLoot,
    debugStickState,
    rarity: valueOr(options.rarity, 'common'),
    food: valueOrUndefined(options.food, useComponents?.food),
    consumable: valueOrUndefined(options.consumable, useComponents?.consumable),
    useRemainder: valueOrUndefined(options.useRemainder, useComponents?.useRemainder),
    useCooldown: options.useCooldown,
    useEffects: options.useEffects,
    tool: valueOrUndefined(options.tool, itemToolComponentOf(item)),
    weapon: options.weapon,
    kineticWeapon,
    piercingWeapon,
    attributeModifiers: options.attributeModifiers,
    enchantments: options.enchantments,
    storedEnchantments: options.storedEnchantments,
    blocksAttacks: options.blocksAttacks,
    damageResistant: options.damageResistant,
    minimumAttackCharge: options.minimumAttackCharge,
    damageType: options.damageType,
    swingAnimation: options.swingAnimation,
    attackRange: options.attackRange,
    potionDurationScale: options.potionDurationScale,
    breakSound: options.breakSound,
    providesBannerPatterns: options.providesBannerPatterns,
    providesTrimMaterial: options.providesTrimMaterial,
    dye: options.dye,
    additionalTradeCost: options.additionalTradeCost,
    sulfurCubeContent,
  })
  })
}

export const itemComponents = (item: ItemType, options: ItemComponentOptions = {}): Result.Result<ItemComponents, ItemComponentFailure> => {
  if (!isItemType(item)) {
    return Result.fail(optionsFailure('item', `Unknown item type: ${String(item)}`, item, 'invalid-value'))
  }
  const snapshotted = snapshotOptions(options)
  return Result.flatMap(snapshotted, (safeOptions) => {
    const checked = validateOptions(safeOptions)
    return Result.flatMap(checked, (input) => buildItemComponents(item, input))
  })
}

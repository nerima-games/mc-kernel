import { ITEM_RARITIES, type ItemRarity } from './item-components-data.js'
import {
  isConsumableComponent,
  isFoodComponent,
  isUseRemainderComponent,
} from './consumable-validation.js'
import { isUseCooldownComponent } from './use-cooldown-validation.js'
import {
  isAttackRangeComponent,
  isDamageTypeComponent,
  isMinimumAttackChargeComponent,
  isSwingAnimationComponent,
  isUseEffectsComponent,
} from './item-combat-validation.js'
import type {
  ConsumableComponent,
  FoodComponent,
  UseRemainderComponent,
} from './consumable-data.js'
import type { UseCooldownComponent } from './use-cooldown-data.js'
import { isToolComponent, type ToolComponent } from './tool-component.js'
import { isWeaponComponent } from './weapon-validation.js'
import type { WeaponComponent } from './weapon-data.js'
import { maxStackCountOfItem } from './item-registry.js'
import { isItemType, type ItemType } from './item-type.js'
import {
  isAdditionalTradeCostComponent,
  isBannerPatternsComponent,
  isBaseColorComponent,
  isBeesComponent,
  isBlockEntityDataComponent,
  isBlockStateComponent,
  isBucketEntityDataComponent,
  isCanBreakComponent,
  isCanPlaceOnComponent,
  isBreakSoundComponent,
  isContainerLootComponent,
  isCustomDataComponent,
  isCustomModelDataComponent,
  isDebugStickStateComponent,
  isDeathProtectionComponent,
  isDyeComponent,
  isDyedColorComponent,
  isEntityDataComponent,
  isEnchantableComponent,
  isEquippableComponent,
  isFireworkExplosionComponent,
  isFireworksComponent,
  isGliderComponent,
  isInstrumentComponent,
  isJukeboxPlayableComponent,
  isKineticWeaponComponent,
  isLockComponent,
  isLodestoneTrackerComponent,
  isMapColorComponent,
  isMapDecorationsComponent,
  isMapIdComponent,
  isNoteBlockSoundComponent,
  isOminousBottleAmplifierComponent,
  isPaintingVariantComponent,
  isPiercingWeaponComponent,
  isPotDecorationsComponent,
  isProfileComponent,
  isPotionContentsComponent,
  isPotionDurationScaleComponent,
  isProvidesBannerPatternsComponent,
  isProvidesTrimMaterialComponent,
  isRecipesComponent,
  isRepairableComponent,
  isSuspiciousStewComponent,
  isSulfurCubeContentComponent,
  isTrimComponent,
  isTooltipDisplayComponent,
  isTooltipStyleComponent,
  isHideAdditionalTooltipComponent,
  isWritableBookContentComponent,
  isWrittenBookContentComponent,
} from './item-component-values-validation.js'
import type {
  BannerPatternProvider,
  BannerPatternsComponent,
  BaseColorComponent,
  BeesComponent,
  BlockEntityDataComponent,
  BlockStateComponent,
  BundleContentsComponent,
  ChargedProjectilesComponent,
  BucketEntityDataComponent,
  CanBreakComponent,
  CanPlaceOnComponent,
  ContainerComponent,
  ContainerLootComponent,
  CustomDataComponent,
  CustomModelDataComponent,
  DebugStickStateComponent,
  DeathProtectionComponent,
  DyeColor,
  DyedColorComponent,
  EntityDataComponent,
  EnchantableComponent,
  EquippableComponent,
  FireworkExplosionComponent,
  FireworksComponent,
  GliderComponent,
  InstrumentComponent,
  KineticWeaponComponent,
  JukeboxPlayableComponent,
  LockComponent,
  LodestoneTrackerComponent,
  MapColorComponent,
  MapDecorationsComponent,
  MapIdComponent,
  NoteBlockSoundComponent,
  OminousBottleAmplifierComponent,
  PaintingVariantComponent,
  PiercingWeaponComponent,
  PotDecorationsComponent,
  ProfileComponent,
  PotionContentsComponent,
  RepairableComponent,
  RecipesComponent,
  SuspiciousStewComponent,
  SulfurCubeContentComponent,
  TrimComponent,
  TooltipDisplayComponent,
  TooltipStyleComponent,
  HideAdditionalTooltipComponent,
  WritableBookContentComponent,
  WrittenBookContentComponent,
} from './item-component-values-data.js'
import {
  type AdditionalTradeCost,
  type ItemDamage as ItemDamageValue,
  type MaxDamage as MaxDamageValue,
  type MaxStackSize as MaxStackSizeValue,
  type PotionDurationScale,
  type RepairCost as RepairCostValue,
} from './quantities.js'
import { ResourceLocation } from './identifiers.js'
import type {
  AttackRangeComponent,
  DamageTypeComponent,
  MinimumAttackChargeComponent,
  SwingAnimationComponent,
  UseEffectsComponent,
} from './item-combat-data.js'
import { isBlocksAttacksComponent, isDamageResistantComponent } from './item-defense-validation.js'
import type { BlocksAttacksComponent, DamageResistantComponent } from './item-defense-data.js'
import { isAttributeModifiersComponent } from './item-attribute-modifiers-validation.js'
import type { AttributeModifiersComponent } from './item-attribute-modifiers-data.js'
import {
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
} from './item-enchantments-validation.js'
import type {
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
import { isTextComponent } from './text-component-validation.js'
import type { TextComponent } from './text-component-data.js'

export type ItemComponents = Readonly<{
  readonly maxStackSize: MaxStackSizeValue
  readonly maxDamage: MaxDamageValue | undefined
  readonly damage: ItemDamageValue | undefined
  readonly repairCost: RepairCostValue
  readonly unbreakable: true | undefined
  readonly enchantmentGlintOverride: boolean | undefined
  readonly tooltipDisplay: TooltipDisplayComponent | undefined
  readonly customName: TextComponent | undefined
  readonly itemName: TextComponent | undefined
  readonly lore: ReadonlyArray<TextComponent> | undefined
  readonly itemModel: ResourceLocation | undefined
  readonly customData: CustomDataComponent | undefined
  readonly entityData: EntityDataComponent | undefined
  readonly bucketEntityData: BucketEntityDataComponent | undefined
  readonly profile: ProfileComponent | undefined
  readonly blockEntityData: BlockEntityDataComponent | undefined
  readonly chargedProjectiles: ChargedProjectilesComponent | undefined
  readonly bundleContents: BundleContentsComponent | undefined
  readonly container: ContainerComponent | undefined
  readonly mapColor: MapColorComponent | undefined
  readonly mapDecorations: MapDecorationsComponent | undefined
  readonly writableBookContent: WritableBookContentComponent | undefined
  readonly writtenBookContent: WrittenBookContentComponent | undefined
  readonly trim: TrimComponent | undefined
  readonly suspiciousStew: SuspiciousStewComponent | undefined
  readonly hideAdditionalTooltip: HideAdditionalTooltipComponent | undefined
  readonly canBreak: CanBreakComponent | undefined
  readonly canPlaceOn: CanPlaceOnComponent | undefined
  readonly bees: BeesComponent | undefined
  readonly potionContents: PotionContentsComponent | undefined
  readonly dyedColor: DyedColorComponent | undefined
  readonly customModelData: CustomModelDataComponent | undefined
  readonly mapId: MapIdComponent | undefined
  readonly blockState: BlockStateComponent | undefined
  readonly instrument: InstrumentComponent | undefined
  readonly noteBlockSound: NoteBlockSoundComponent | undefined
  readonly recipes: RecipesComponent | undefined
  readonly lock: LockComponent | undefined
  readonly tooltipStyle: TooltipStyleComponent | undefined
  readonly baseColor: BaseColorComponent | undefined
  readonly equippable: EquippableComponent | undefined
  readonly glider: GliderComponent | undefined
  readonly deathProtection: DeathProtectionComponent | undefined
  readonly repairable: RepairableComponent | undefined
  readonly enchantable: EnchantableComponent | undefined
  readonly jukeboxPlayable: JukeboxPlayableComponent | undefined
  readonly ominousBottleAmplifier: OminousBottleAmplifierComponent | undefined
  readonly paintingVariant: PaintingVariantComponent | undefined
  readonly lodestoneTracker: LodestoneTrackerComponent | undefined
  readonly fireworkExplosion: FireworkExplosionComponent | undefined
  readonly fireworks: FireworksComponent | undefined
  readonly bannerPatterns: BannerPatternsComponent | undefined
  readonly potDecorations: PotDecorationsComponent | undefined
  readonly containerLoot: ContainerLootComponent | undefined
  readonly debugStickState: DebugStickStateComponent | undefined
  readonly rarity: ItemRarity
  readonly food: FoodComponent | undefined
  readonly consumable: ConsumableComponent | undefined
  readonly useRemainder: UseRemainderComponent | undefined
  readonly useCooldown: UseCooldownComponent | undefined
  readonly useEffects: UseEffectsComponent | undefined
  readonly tool: ToolComponent | undefined
  readonly weapon: WeaponComponent | undefined
  readonly kineticWeapon: KineticWeaponComponent | undefined
  readonly piercingWeapon: PiercingWeaponComponent | undefined
  readonly attributeModifiers: AttributeModifiersComponent | undefined
  readonly enchantments: EnchantmentsComponent | undefined
  readonly storedEnchantments: StoredEnchantmentsComponent | undefined
  readonly blocksAttacks: BlocksAttacksComponent | undefined
  readonly damageResistant: DamageResistantComponent | undefined
  readonly minimumAttackCharge: MinimumAttackChargeComponent | undefined
  readonly damageType: DamageTypeComponent | undefined
  readonly swingAnimation: SwingAnimationComponent | undefined
  readonly attackRange: AttackRangeComponent | undefined
  readonly potionDurationScale: PotionDurationScale | undefined
  readonly breakSound: ResourceLocation | undefined
  readonly providesBannerPatterns: BannerPatternProvider | undefined
  readonly providesTrimMaterial: ResourceLocation | undefined
  readonly dye: DyeColor | undefined
  readonly additionalTradeCost: AdditionalTradeCost | undefined
  readonly sulfurCubeContent: SulfurCubeContentComponent | undefined
}>

const RESOLVED_COMPONENT_KEYS = [
  'maxStackSize',
  'maxDamage',
  'damage',
  'repairCost',
  'unbreakable',
  'enchantmentGlintOverride',
  'tooltipDisplay',
  'customName',
  'itemName',
  'lore',
  'itemModel',
  'customData',
  'entityData',
  'bucketEntityData',
  'profile',
  'blockEntityData',
  'chargedProjectiles',
  'bundleContents',
  'container',
  'mapColor',
  'mapDecorations',
  'writableBookContent',
  'writtenBookContent',
  'trim',
  'suspiciousStew',
  'hideAdditionalTooltip',
  'canBreak',
  'canPlaceOn',
  'bees',
  'potionContents',
  'dyedColor',
  'customModelData',
  'mapId',
  'blockState',
  'instrument',
  'noteBlockSound',
  'recipes',
  'lock',
  'tooltipStyle',
  'baseColor',
  'equippable',
  'glider',
  'deathProtection',
  'repairable',
  'enchantable',
  'jukeboxPlayable',
  'ominousBottleAmplifier',
  'paintingVariant',
  'lodestoneTracker',
  'fireworkExplosion',
  'fireworks',
  'bannerPatterns',
  'potDecorations',
  'containerLoot',
  'debugStickState',
  'rarity',
  'food',
  'consumable',
  'useRemainder',
  'useCooldown',
  'useEffects',
  'tool',
  'weapon',
  'kineticWeapon',
  'piercingWeapon',
  'attributeModifiers',
  'enchantments',
  'storedEnchantments',
  'blocksAttacks',
  'damageResistant',
  'minimumAttackCharge',
  'damageType',
  'swingAnimation',
  'attackRange',
  'potionDurationScale',
  'breakSound',
  'providesBannerPatterns',
  'providesTrimMaterial',
  'dye',
  'additionalTradeCost',
  'sulfurCubeContent',
] as const

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const ITEM_RARITY_SET: ReadonlySet<string> = new Set(ITEM_RARITIES)

const isItemRarity = (value: unknown): value is ItemRarity =>
  typeof value === 'string' && ITEM_RARITY_SET.has(value)

const isMaxStackSize = (value: unknown): value is MaxStackSizeValue =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 99

const isMaxDamage = (value: unknown): value is MaxDamageValue =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

const isItemDamage = (value: unknown): value is ItemDamageValue =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isRepairCost = (value: unknown): value is RepairCostValue =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export const validateItemComponentRelations = (
  maxStackSize: MaxStackSizeValue,
  maxDamage: MaxDamageValue | undefined,
  damage: ItemDamageValue | undefined,
): void => {
  if (maxStackSize > 1 && maxDamage !== undefined) {
    throw new RangeError('max_stack_size greater than 1 is incompatible with max_damage')
  }
  if ((maxDamage === undefined) !== (damage === undefined)) {
    throw new RangeError('damage and max_damage must be present together')
  }
  if (maxDamage !== undefined && damage !== undefined && damage > maxDamage) {
    throw new RangeError(`damage must be in [0, ${maxDamage}], received ${damage}`)
  }
}

type ValidatedItemComponentCore = RecordValue &
  Pick<ItemComponents, 'maxStackSize' | 'maxDamage' | 'damage' | 'repairCost' | 'rarity'>

const isValidItemComponentCore = (value: RecordValue): value is ValidatedItemComponentCore =>
  isMaxStackSize(value['maxStackSize']) &&
  (value['maxDamage'] === undefined || isMaxDamage(value['maxDamage'])) &&
  (value['damage'] === undefined || isItemDamage(value['damage'])) &&
  isRepairCost(value['repairCost']) &&
  isItemRarity(value['rarity'])

const isLore = (value: unknown): boolean =>
  Array.isArray(value) && value.length <= 256 && value.every(isTextComponent)

const isResourceLocation = (value: unknown): boolean =>
  typeof value === 'string' && ResourceLocation.is(value)

type ItemComponentValueValidator = Readonly<{
  readonly key: string
  readonly isValid: (value: unknown) => boolean
}>

const OPTIONAL_ITEM_COMPONENT_VALIDATORS = [
  { key: 'unbreakable', isValid: (value: unknown) => value === true },
  { key: 'enchantmentGlintOverride', isValid: (value: unknown) => typeof value === 'boolean' },
  { key: 'tooltipDisplay', isValid: isTooltipDisplayComponent },
  { key: 'customName', isValid: isTextComponent },
  { key: 'itemName', isValid: isTextComponent },
  { key: 'lore', isValid: isLore },
  { key: 'itemModel', isValid: isResourceLocation },
  { key: 'customData', isValid: isCustomDataComponent },
  { key: 'entityData', isValid: isEntityDataComponent },
  { key: 'bucketEntityData', isValid: isBucketEntityDataComponent },
  { key: 'profile', isValid: isProfileComponent },
  { key: 'blockEntityData', isValid: isBlockEntityDataComponent },
  { key: 'mapColor', isValid: isMapColorComponent },
  { key: 'mapDecorations', isValid: isMapDecorationsComponent },
  { key: 'writableBookContent', isValid: isWritableBookContentComponent },
  { key: 'writtenBookContent', isValid: isWrittenBookContentComponent },
  { key: 'trim', isValid: isTrimComponent },
  { key: 'suspiciousStew', isValid: isSuspiciousStewComponent },
  { key: 'hideAdditionalTooltip', isValid: isHideAdditionalTooltipComponent },
  { key: 'canBreak', isValid: isCanBreakComponent },
  { key: 'canPlaceOn', isValid: isCanPlaceOnComponent },
  { key: 'bees', isValid: isBeesComponent },
  { key: 'potionContents', isValid: isPotionContentsComponent },
  { key: 'dyedColor', isValid: isDyedColorComponent },
  { key: 'customModelData', isValid: isCustomModelDataComponent },
  { key: 'mapId', isValid: isMapIdComponent },
  { key: 'blockState', isValid: isBlockStateComponent },
  { key: 'instrument', isValid: isInstrumentComponent },
  { key: 'noteBlockSound', isValid: isNoteBlockSoundComponent },
  { key: 'recipes', isValid: isRecipesComponent },
  { key: 'lock', isValid: isLockComponent },
  { key: 'tooltipStyle', isValid: isTooltipStyleComponent },
  { key: 'baseColor', isValid: isBaseColorComponent },
  { key: 'equippable', isValid: isEquippableComponent },
  { key: 'glider', isValid: isGliderComponent },
  { key: 'deathProtection', isValid: isDeathProtectionComponent },
  { key: 'repairable', isValid: isRepairableComponent },
  { key: 'enchantable', isValid: isEnchantableComponent },
  { key: 'jukeboxPlayable', isValid: isJukeboxPlayableComponent },
  { key: 'ominousBottleAmplifier', isValid: isOminousBottleAmplifierComponent },
  { key: 'paintingVariant', isValid: isPaintingVariantComponent },
  { key: 'lodestoneTracker', isValid: isLodestoneTrackerComponent },
  { key: 'fireworkExplosion', isValid: isFireworkExplosionComponent },
  { key: 'fireworks', isValid: isFireworksComponent },
  { key: 'bannerPatterns', isValid: isBannerPatternsComponent },
  { key: 'potDecorations', isValid: isPotDecorationsComponent },
  { key: 'containerLoot', isValid: isContainerLootComponent },
  { key: 'debugStickState', isValid: isDebugStickStateComponent },
  { key: 'food', isValid: isFoodComponent },
  { key: 'consumable', isValid: isConsumableComponent },
  { key: 'useRemainder', isValid: isUseRemainderComponent },
  { key: 'useCooldown', isValid: isUseCooldownComponent },
  { key: 'useEffects', isValid: isUseEffectsComponent },
  { key: 'tool', isValid: isToolComponent },
  { key: 'weapon', isValid: isWeaponComponent },
  { key: 'kineticWeapon', isValid: isKineticWeaponComponent },
  { key: 'piercingWeapon', isValid: isPiercingWeaponComponent },
  { key: 'attributeModifiers', isValid: isAttributeModifiersComponent },
  { key: 'enchantments', isValid: isEnchantmentsComponent },
  { key: 'storedEnchantments', isValid: isStoredEnchantmentsComponent },
  { key: 'blocksAttacks', isValid: isBlocksAttacksComponent },
  { key: 'damageResistant', isValid: isDamageResistantComponent },
  { key: 'minimumAttackCharge', isValid: isMinimumAttackChargeComponent },
  { key: 'damageType', isValid: isDamageTypeComponent },
  { key: 'swingAnimation', isValid: isSwingAnimationComponent },
  { key: 'attackRange', isValid: isAttackRangeComponent },
  { key: 'potionDurationScale', isValid: isPotionDurationScaleComponent },
  { key: 'breakSound', isValid: isBreakSoundComponent },
  { key: 'providesBannerPatterns', isValid: isProvidesBannerPatternsComponent },
  { key: 'providesTrimMaterial', isValid: isProvidesTrimMaterialComponent },
  { key: 'dye', isValid: isDyeComponent },
  { key: 'additionalTradeCost', isValid: isAdditionalTradeCostComponent },
  { key: 'sulfurCubeContent', isValid: isSulfurCubeContentComponent },
] as const satisfies ReadonlyArray<ItemComponentValueValidator>

const hasValidOptionalItemComponents = (value: RecordValue): boolean =>
  OPTIONAL_ITEM_COMPONENT_VALIDATORS.every(
    ({ key, isValid }) => value[key] === undefined || isValid(value[key]),
  )

const hasOnlyKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean =>
  Object.keys(value).every((key) => keys.includes(key))

const hasAllKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean =>
  keys.every((key) => Object.hasOwn(value, key))

const isValidStackCount = (value: unknown, item: ItemType, components: unknown): boolean => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    return false
  }

  const maxStackSize =
    isRecord(components) && isMaxStackSize(components['maxStackSize'])
      ? components['maxStackSize']
      : maxStackCountOfItem(item)
  return value <= maxStackSize
}

type ResolvedNestedValueKind =
  | 'components'
  | 'stack'
  | 'stackArray'
  | 'container'
  | 'containerEntry'

type ResolvedNestedValueValidator = (
  value: unknown,
  ancestors: WeakSet<object>,
  kind: ResolvedNestedValueKind,
) => boolean

const isResolvedComponents = (
  value: unknown,
  ancestors: WeakSet<object>,
  validate: ResolvedNestedValueValidator,
): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, RESOLVED_COMPONENT_KEYS)) {
    return false
  }
  if (!isValidItemComponentCore(value) || ancestors.has(value)) {
    return false
  }

  ancestors.add(value)
  try {
    if (!hasValidOptionalItemComponents(value)) {
      return false
    }
    const nestedValuesAreValid =
      (value['chargedProjectiles'] === undefined ||
        validate(value['chargedProjectiles'], ancestors, 'stackArray')) &&
      (value['bundleContents'] === undefined ||
        validate(value['bundleContents'], ancestors, 'stackArray')) &&
      (value['container'] === undefined || validate(value['container'], ancestors, 'container'))
    if (!nestedValuesAreValid) {
      return false
    }

    try {
      validateItemComponentRelations(value['maxStackSize'], value['maxDamage'], value['damage'])
      return true
    } catch {
      return false
    }
  } finally {
    ancestors.delete(value)
  }
}

const isResolvedStack = (
  value: unknown,
  ancestors: WeakSet<object>,
  validate: ResolvedNestedValueValidator,
): boolean => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['item', 'count', 'components']) ||
    !hasAllKeys(value, ['item', 'count']) ||
    ancestors.has(value)
  ) {
    return false
  }

  const item = value['item']
  const components = value['components']
  if (!isItemType(item)) {
    return false
  }

  ancestors.add(value)
  try {
    return (
      (components === undefined || validate(components, ancestors, 'components')) &&
      isValidStackCount(value['count'], item, components)
    )
  } finally {
    ancestors.delete(value)
  }
}

const isResolvedStackArray = (
  value: unknown,
  ancestors: WeakSet<object>,
  validate: ResolvedNestedValueValidator,
): boolean => {
  if (!Array.isArray(value) || ancestors.has(value)) {
    return false
  }

  ancestors.add(value)
  try {
    return value.every((entry) => validate(entry, ancestors, 'stack'))
  } finally {
    ancestors.delete(value)
  }
}

const isResolvedContainerEntry = (
  value: unknown,
  ancestors: WeakSet<object>,
  validate: ResolvedNestedValueValidator,
): boolean => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['slot', 'item']) ||
    !hasAllKeys(value, ['slot', 'item']) ||
    typeof value['slot'] !== 'number' ||
    !Number.isSafeInteger(value['slot']) ||
    value['slot'] < 0 ||
    value['slot'] > 255 ||
    ancestors.has(value)
  ) {
    return false
  }

  ancestors.add(value)
  try {
    return validate(value['item'], ancestors, 'stack')
  } finally {
    ancestors.delete(value)
  }
}

const isResolvedContainer = (
  value: unknown,
  ancestors: WeakSet<object>,
  validate: ResolvedNestedValueValidator,
): boolean => {
  if (!Array.isArray(value) || ancestors.has(value)) {
    return false
  }

  ancestors.add(value)
  try {
    return value.every((entry) => validate(entry, ancestors, 'containerEntry'))
  } finally {
    ancestors.delete(value)
  }
}

type ResolvedNestedValueHandler = (
  value: unknown,
  ancestors: WeakSet<object>,
  validate: ResolvedNestedValueValidator,
) => boolean

const RESOLVED_NESTED_VALUE_HANDLERS: Record<ResolvedNestedValueKind, ResolvedNestedValueHandler> = {
  components: (value, ancestors, validate) => isResolvedComponents(value, ancestors, validate),
  stack: (value, ancestors, validate) => isResolvedStack(value, ancestors, validate),
  stackArray: (value, ancestors, validate) => isResolvedStackArray(value, ancestors, validate),
  container: (value, ancestors, validate) => isResolvedContainer(value, ancestors, validate),
  containerEntry: (value, ancestors, validate) => isResolvedContainerEntry(value, ancestors, validate),
}

const isResolvedNestedValue = (
  value: unknown,
  ancestors: WeakSet<object>,
  kind: ResolvedNestedValueKind,
): boolean => RESOLVED_NESTED_VALUE_HANDLERS[kind](value, ancestors, isResolvedNestedValue)

export const isItemComponents = (value: unknown): value is ItemComponents =>
  isResolvedNestedValue(value, new WeakSet<object>(), 'components')

const deepValueEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false
    }
    return left.every((value, index) => deepValueEqual(value, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.hasOwn(right, key) && deepValueEqual(left[key], right[key]))
  )
}

export const itemComponentsEqual = (
  left: ItemComponents | undefined,
  right: ItemComponents | undefined,
): boolean =>
  left === right || (left !== undefined && right !== undefined && deepValueEqual(left, right))

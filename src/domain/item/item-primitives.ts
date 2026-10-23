import { Brand } from 'effect'

export type EffectAmplifier = number & Brand.Brand<'EffectAmplifier'>
export const EffectAmplifier: Brand.Constructor<EffectAmplifier> = Brand.make<EffectAmplifier>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 255
    ? true
    : `EffectAmplifier must be an integer in [0, 255], received ${String(value)}`,
)

export type EffectDurationSecs = number & Brand.Brand<'EffectDurationSecs'>
export const EffectDurationSecs: Brand.Constructor<EffectDurationSecs> = Brand.make<EffectDurationSecs>(
  (value) => Number.isFinite(value) && value > 0
    ? true
    : `EffectDurationSecs must be a finite positive number of seconds, received ${String(value)}`,
)

export type FoodNutrition = number & Brand.Brand<'FoodNutrition'>
export const FoodNutrition: Brand.Constructor<FoodNutrition> = Brand.make<FoodNutrition>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `FoodNutrition must be a non-negative safe integer, received ${String(value)}`,
)

export type FoodSaturation = number & Brand.Brand<'FoodSaturation'>
export const FoodSaturation: Brand.Constructor<FoodSaturation> = Brand.make<FoodSaturation>(
  (value) => Number.isFinite(value) && value >= 0
    ? true
    : `FoodSaturation must be a finite non-negative number, received ${String(value)}`,
)

export type FoodEffectProbability = number & Brand.Brand<'FoodEffectProbability'>
export const FoodEffectProbability: Brand.Constructor<FoodEffectProbability> = Brand.make<FoodEffectProbability>(
  (value) => Number.isFinite(value) && value >= 0 && value <= 1
    ? true
    : `FoodEffectProbability must be a finite number in [0, 1], received ${String(value)}`,
)

export type RandomTeleportDiameter = number & Brand.Brand<'RandomTeleportDiameter'>
export const RandomTeleportDiameter: Brand.Constructor<RandomTeleportDiameter> = Brand.make<RandomTeleportDiameter>(
  (value) => Number.isFinite(value) && value > 0
    ? true
    : `RandomTeleportDiameter must be a finite positive number of blocks, received ${String(value)}`,
)

export type BeeHiveTicks = number & Brand.Brand<'BeeHiveTicks'>
export const BeeHiveTicks: Brand.Constructor<BeeHiveTicks> = Brand.make<BeeHiveTicks>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `BeeHiveTicks must be a non-negative safe integer, received ${String(value)}`,
)

export type PotionEffectDurationTicks = number & Brand.Brand<'PotionEffectDurationTicks'>
export const PotionEffectDurationTicks: Brand.Constructor<PotionEffectDurationTicks> = Brand.make<PotionEffectDurationTicks>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `PotionEffectDurationTicks must be a non-negative safe integer, received ${String(value)}`,
)

export type ContainerSlotIndex = number & Brand.Brand<'ContainerSlotIndex'>
export const ContainerSlotIndex: Brand.Constructor<ContainerSlotIndex> = Brand.make<ContainerSlotIndex>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 255
    ? true
    : `ContainerSlotIndex must be an integer in [0, 255], received ${String(value)}`,
)

export type RgbColor = number & Brand.Brand<'RgbColor'>
export const RgbColor: Brand.Constructor<RgbColor> = Brand.make<RgbColor>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffff
    ? true
    : `RgbColor must be an integer in [0, 16777215], received ${String(value)}`,
)

export type DyeColorChannel = number & Brand.Brand<'DyeColorChannel'>
export const DyeColorChannel: Brand.Constructor<DyeColorChannel> = Brand.make<DyeColorChannel>(
  (value) => Number.isFinite(value) && value >= 0 && value <= 1
    ? true
    : `DyeColorChannel must be a finite normalized value in [0, 1], received ${String(value)}`,
)

export type MapDecorationCoordinate = number & Brand.Brand<'MapDecorationCoordinate'>
export const MapDecorationCoordinate: Brand.Constructor<MapDecorationCoordinate> = Brand.make<MapDecorationCoordinate>(
  (value) => Number.isSafeInteger(value) && value >= -128 && value <= 127
    ? true
    : `MapDecorationCoordinate must be an integer in [-128, 127], received ${String(value)}`,
)

export type MapDecorationRotation = number & Brand.Brand<'MapDecorationRotation'>
export const MapDecorationRotation: Brand.Constructor<MapDecorationRotation> = Brand.make<MapDecorationRotation>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 15
    ? true
    : `MapDecorationRotation must be an integer in [0, 15], received ${String(value)}`,
)

export type BookGeneration = number & Brand.Brand<'BookGeneration'>
export const BookGeneration: Brand.Constructor<BookGeneration> = Brand.make<BookGeneration>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 3
    ? true
    : `BookGeneration must be an integer in [0, 3], received ${String(value)}`,
)

export type TrimItemModelIndex = number & Brand.Brand<'TrimItemModelIndex'>
export const TrimItemModelIndex: Brand.Constructor<TrimItemModelIndex> = Brand.make<TrimItemModelIndex>(
  (value) => Number.isFinite(value) && value >= 0
    ? true
    : `TrimItemModelIndex must be a finite non-negative number, received ${String(value)}`,
)

export type Enchantability = number & Brand.Brand<'Enchantability'>
export const Enchantability: Brand.Constructor<Enchantability> = Brand.make<Enchantability>(
  (value) => Number.isSafeInteger(value) && value > 0
    ? true
    : `Enchantability must be a positive safe integer, received ${String(value)}`,
)

export type ItemEnchantability = number & Brand.Brand<'ItemEnchantability'>
export const ItemEnchantability: Brand.Constructor<ItemEnchantability> = Brand.make<ItemEnchantability>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `ItemEnchantability must be a non-negative safe integer, received ${String(value)}`,
)

export type OminousBottleAmplifier = number & Brand.Brand<'OminousBottleAmplifier'>
export const OminousBottleAmplifier: Brand.Constructor<OminousBottleAmplifier> = Brand.make<OminousBottleAmplifier>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 4
    ? true
    : `OminousBottleAmplifier must be an integer in [0, 4], received ${String(value)}`,
)

export type FireworksFlightDuration = number & Brand.Brand<'FireworksFlightDuration'>
export const FireworksFlightDuration: Brand.Constructor<FireworksFlightDuration> = Brand.make<FireworksFlightDuration>(
  (value) => Number.isSafeInteger(value) && value >= 0 && value <= 255
    ? true
    : `FireworksFlightDuration must be an integer in [0, 255], received ${String(value)}`,
)

export type ItemComponentNbtLong = bigint & Brand.Brand<'ItemComponentNbtLong'>
const MIN_NBT_LONG = -9223372036854775808n
const MAX_NBT_LONG = 9223372036854775807n
export const ItemComponentNbtLong: Brand.Constructor<ItemComponentNbtLong> = Brand.make<ItemComponentNbtLong>(
  (value) => value >= MIN_NBT_LONG && value <= MAX_NBT_LONG
    ? true
    : `ItemComponentNbtLong must fit a signed 64-bit integer, received ${String(value)}`,
)

export type LootTableSeed = bigint & Brand.Brand<'LootTableSeed'>
export const LootTableSeed: Brand.Constructor<LootTableSeed> = Brand.make<LootTableSeed>(
  (value) => value >= MIN_NBT_LONG && value <= MAX_NBT_LONG
    ? true
    : `LootTableSeed must fit a signed 64-bit integer, received ${String(value)}`,
)

export type ItemComponentNbtString = string & Brand.Brand<'ItemComponentNbtString'>
export const ItemComponentNbtString: Brand.Constructor<ItemComponentNbtString> = Brand.make<ItemComponentNbtString>(
  (value) => typeof value === 'string' ? true : 'ItemComponentNbtString must be a string',
)

export type ItemComponentNbtNumber = number & Brand.Brand<'ItemComponentNbtNumber'>
export const ItemComponentNbtNumber: Brand.Constructor<ItemComponentNbtNumber> = Brand.make<ItemComponentNbtNumber>(
  (value) => Number.isFinite(value) ? true : `ItemComponentNbtNumber must be finite, received ${String(value)}`,
)

export type ItemComponentNbtKey = string & Brand.Brand<'ItemComponentNbtKey'>
export const ItemComponentNbtKey: Brand.Constructor<ItemComponentNbtKey> = Brand.make<ItemComponentNbtKey>(
  (value) => typeof value === 'string' ? true : 'ItemComponentNbtKey must be a string',
)

export type TrimArmorMaterialKey = string & Brand.Brand<'TrimArmorMaterialKey'>
export const TrimArmorMaterialKey: Brand.Constructor<TrimArmorMaterialKey> = Brand.make<TrimArmorMaterialKey>(
  (value) => typeof value === 'string' ? true : 'TrimArmorMaterialKey must be a string',
)

export type ProfileName = string & Brand.Brand<'ProfileName'>
export const ProfileName: Brand.Constructor<ProfileName> = Brand.make<ProfileName>(
  (value) => typeof value === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(value)
    ? true
    : 'ProfileName must contain 1 to 16 ASCII letters, digits, or underscores',
)

export type ProfilePropertyName = string & Brand.Brand<'ProfilePropertyName'>
export const ProfilePropertyName: Brand.Constructor<ProfilePropertyName> = Brand.make<ProfilePropertyName>(
  (value) => typeof value === 'string' ? true : 'ProfilePropertyName must be a string',
)

export type ProfilePropertyValue = string & Brand.Brand<'ProfilePropertyValue'>
export const ProfilePropertyValue: Brand.Constructor<ProfilePropertyValue> = Brand.make<ProfilePropertyValue>(
  (value) => typeof value === 'string' ? true : 'ProfilePropertyValue must be a string',
)

export type ProfilePropertySignature = string & Brand.Brand<'ProfilePropertySignature'>
export const ProfilePropertySignature: Brand.Constructor<ProfilePropertySignature> = Brand.make<ProfilePropertySignature>(
  (value) => typeof value === 'string' ? true : 'ProfilePropertySignature must be a string',
)

export type BookPageText = string & Brand.Brand<'BookPageText'>
export const BookPageText: Brand.Constructor<BookPageText> = Brand.make<BookPageText>(
  (value) => typeof value === 'string' ? true : 'BookPageText must be a string',
)

export type BookAuthor = string & Brand.Brand<'BookAuthor'>
export const BookAuthor: Brand.Constructor<BookAuthor> = Brand.make<BookAuthor>(
  (value) => typeof value === 'string' ? true : 'BookAuthor must be a string',
)

export type TrimAssetName = string & Brand.Brand<'TrimAssetName'>
export const TrimAssetName: Brand.Constructor<TrimAssetName> = Brand.make<TrimAssetName>(
  (value) => typeof value === 'string' && value.length > 0
    ? true
    : 'TrimAssetName must be a non-empty string',
)

export type BlockStatePropertyValue = string & Brand.Brand<'BlockStatePropertyValue'>
export const BlockStatePropertyValue: Brand.Constructor<BlockStatePropertyValue> = Brand.make<BlockStatePropertyValue>(
  (value) => typeof value === 'string' ? true : 'BlockStatePropertyValue must be a string',
)

export type ItemLock = string & Brand.Brand<'ItemLock'>
export const ItemLock: Brand.Constructor<ItemLock> = Brand.make<ItemLock>(
  (value) => typeof value === 'string' ? true : 'ItemLock must be a string',
)

export type CustomModelDataFloat = number & Brand.Brand<'CustomModelDataFloat'>
export const CustomModelDataFloat: Brand.Constructor<CustomModelDataFloat> = Brand.make<CustomModelDataFloat>(
  (value) => Number.isFinite(value) ? true : `CustomModelDataFloat must be finite, received ${String(value)}`,
)

export type CustomModelDataString = string & Brand.Brand<'CustomModelDataString'>
export const CustomModelDataString: Brand.Constructor<CustomModelDataString> = Brand.make<CustomModelDataString>(
  (value) => typeof value === 'string' ? true : 'CustomModelDataString must be a string',
)

export type KineticDurationTicks = number & Brand.Brand<'KineticDurationTicks'>
export const KineticDurationTicks: Brand.Constructor<KineticDurationTicks> = Brand.make<KineticDurationTicks>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `KineticDurationTicks must be a non-negative safe integer, received ${String(value)}`,
)

export type KineticSpeed = number & Brand.Brand<'KineticSpeed'>
export const KineticSpeed: Brand.Constructor<KineticSpeed> = Brand.make<KineticSpeed>(
  (value) => Number.isFinite(value) && value >= 0
    ? true
    : `KineticSpeed must be a finite non-negative number, received ${String(value)}`,
)

export type KineticMovement = number & Brand.Brand<'KineticMovement'>
export const KineticMovement: Brand.Constructor<KineticMovement> = Brand.make<KineticMovement>(
  (value) => Number.isFinite(value)
    ? true
    : `KineticMovement must be finite, received ${String(value)}`,
)

export type KineticDamageMultiplier = number & Brand.Brand<'KineticDamageMultiplier'>
export const KineticDamageMultiplier: Brand.Constructor<KineticDamageMultiplier> = Brand.make<KineticDamageMultiplier>(
  (value) => Number.isFinite(value) && value >= 0
    ? true
    : `KineticDamageMultiplier must be finite and non-negative, received ${String(value)}`,
)

export type EnchantmentWeight = number & Brand.Brand<'EnchantmentWeight'>
export const EnchantmentWeight: Brand.Constructor<EnchantmentWeight> = Brand.make<EnchantmentWeight>(
  (value) => Number.isSafeInteger(value) && value > 0
    ? true
    : `EnchantmentWeight must be a positive safe integer, received ${String(value)}`,
)

export type EnchantmentTableLevelCost = number & Brand.Brand<'EnchantmentTableLevelCost'>
export const EnchantmentTableLevelCost: Brand.Constructor<EnchantmentTableLevelCost> = Brand.make<EnchantmentTableLevelCost>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `EnchantmentTableLevelCost must be a non-negative safe integer, received ${String(value)}`,
)

export type ToolMiningSpeed = number & Brand.Brand<'ToolMiningSpeed'>
export const ToolMiningSpeed: Brand.Constructor<ToolMiningSpeed> = Brand.make<ToolMiningSpeed>(
  (value) => Number.isFinite(value) && value >= 0
    ? true
    : `ToolMiningSpeed must be a finite non-negative number, received ${String(value)}`,
)

export type ToolDurabilityDamage = number & Brand.Brand<'ToolDurabilityDamage'>
export const ToolDurabilityDamage: Brand.Constructor<ToolDurabilityDamage> = Brand.make<ToolDurabilityDamage>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `ToolDurabilityDamage must be a non-negative safe integer, received ${String(value)}`,
)

export type ToolRuleOrder = number & Brand.Brand<'ToolRuleOrder'>
export const ToolRuleOrder: Brand.Constructor<ToolRuleOrder> = Brand.make<ToolRuleOrder>(
  (value) => Number.isSafeInteger(value) && value >= 0
    ? true
    : `ToolRuleOrder must be a non-negative safe integer, received ${String(value)}`,
)

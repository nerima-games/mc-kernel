import { describe, expect, it } from 'vitest'
import * as ItemPrimitive from '../src/domain/item/item-primitives'

const MIN_SIGNED_LONG = -9223372036854775808n
const MAX_SIGNED_LONG = 9223372036854775807n

describe('item branded primitives', () => {
  it('validates effect, food, hive, and inventory bounds', () => {
    expect(ItemPrimitive.EffectAmplifier.is(0)).toBe(true)
    expect(ItemPrimitive.EffectAmplifier.is(255)).toBe(true)
    expect(ItemPrimitive.EffectAmplifier.is(-1)).toBe(false)
    expect(ItemPrimitive.EffectAmplifier.is(256)).toBe(false)
    expect(ItemPrimitive.EffectDurationSecs.is(Number.MIN_VALUE)).toBe(true)
    expect(ItemPrimitive.EffectDurationSecs.is(0)).toBe(false)
    expect(ItemPrimitive.EffectDurationSecs.is(Infinity)).toBe(false)
    expect(ItemPrimitive.FoodNutrition.is(0)).toBe(true)
    expect(ItemPrimitive.FoodNutrition.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.FoodNutrition.is(-1)).toBe(false)
    expect(ItemPrimitive.FoodNutrition.is(1.5)).toBe(false)
    expect(ItemPrimitive.FoodSaturation.is(0)).toBe(true)
    expect(ItemPrimitive.FoodSaturation.is(Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.FoodSaturation.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.FoodSaturation.is(NaN)).toBe(false)
    expect(ItemPrimitive.FoodEffectProbability.is(0)).toBe(true)
    expect(ItemPrimitive.FoodEffectProbability.is(1)).toBe(true)
    expect(ItemPrimitive.FoodEffectProbability.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.FoodEffectProbability.is(1 + Number.EPSILON)).toBe(false)
    expect(ItemPrimitive.RandomTeleportDiameter.is(Number.MIN_VALUE)).toBe(true)
    expect(ItemPrimitive.RandomTeleportDiameter.is(0)).toBe(false)
    expect(ItemPrimitive.RandomTeleportDiameter.is(Infinity)).toBe(false)
    expect(ItemPrimitive.BeeHiveTicks.is(0)).toBe(true)
    expect(ItemPrimitive.BeeHiveTicks.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.BeeHiveTicks.is(-1)).toBe(false)
    expect(ItemPrimitive.BeeHiveTicks.is(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
    expect(ItemPrimitive.PotionEffectDurationTicks.is(0)).toBe(true)
    expect(ItemPrimitive.PotionEffectDurationTicks.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.PotionEffectDurationTicks.is(-1)).toBe(false)
    expect(ItemPrimitive.ContainerSlotIndex.is(0)).toBe(true)
    expect(ItemPrimitive.ContainerSlotIndex.is(255)).toBe(true)
    expect(ItemPrimitive.ContainerSlotIndex.is(-1)).toBe(false)
    expect(ItemPrimitive.ContainerSlotIndex.is(256)).toBe(false)
  })

  it('validates colors, map coordinates, books, and trim values at their limits', () => {
    expect(ItemPrimitive.RgbColor.is(0)).toBe(true)
    expect(ItemPrimitive.RgbColor.is(0xffffff)).toBe(true)
    expect(ItemPrimitive.RgbColor.is(-1)).toBe(false)
    expect(ItemPrimitive.RgbColor.is(0x1000000)).toBe(false)
    expect(ItemPrimitive.RgbColor.is(1.5)).toBe(false)
    expect(ItemPrimitive.DyeColorChannel.is(0)).toBe(true)
    expect(ItemPrimitive.DyeColorChannel.is(1)).toBe(true)
    expect(ItemPrimitive.DyeColorChannel.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.DyeColorChannel.is(1 + Number.EPSILON)).toBe(false)
    expect(ItemPrimitive.MapDecorationCoordinate.is(-128)).toBe(true)
    expect(ItemPrimitive.MapDecorationCoordinate.is(127)).toBe(true)
    expect(ItemPrimitive.MapDecorationCoordinate.is(-129)).toBe(false)
    expect(ItemPrimitive.MapDecorationCoordinate.is(128)).toBe(false)
    expect(ItemPrimitive.MapDecorationCoordinate.is(0.5)).toBe(false)
    expect(ItemPrimitive.MapDecorationRotation.is(0)).toBe(true)
    expect(ItemPrimitive.MapDecorationRotation.is(15)).toBe(true)
    expect(ItemPrimitive.MapDecorationRotation.is(-1)).toBe(false)
    expect(ItemPrimitive.MapDecorationRotation.is(16)).toBe(false)
    expect(ItemPrimitive.BookGeneration.is(0)).toBe(true)
    expect(ItemPrimitive.BookGeneration.is(3)).toBe(true)
    expect(ItemPrimitive.BookGeneration.is(-1)).toBe(false)
    expect(ItemPrimitive.BookGeneration.is(4)).toBe(false)
    expect(ItemPrimitive.TrimItemModelIndex.is(0)).toBe(true)
    expect(ItemPrimitive.TrimItemModelIndex.is(Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.TrimItemModelIndex.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.TrimItemModelIndex.is(Infinity)).toBe(false)
  })

  it('validates enchantment, fireworks, and signed NBT long boundaries', () => {
    expect(ItemPrimitive.Enchantability.is(1)).toBe(true)
    expect(ItemPrimitive.Enchantability.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.Enchantability.is(0)).toBe(false)
    expect(ItemPrimitive.Enchantability.is(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
    expect(ItemPrimitive.ItemEnchantability.is(0)).toBe(true)
    expect(ItemPrimitive.ItemEnchantability.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.ItemEnchantability.is(-1)).toBe(false)
    expect(ItemPrimitive.ItemEnchantability.is(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
    expect(ItemPrimitive.OminousBottleAmplifier.is(0)).toBe(true)
    expect(ItemPrimitive.OminousBottleAmplifier.is(4)).toBe(true)
    expect(ItemPrimitive.OminousBottleAmplifier.is(-1)).toBe(false)
    expect(ItemPrimitive.OminousBottleAmplifier.is(5)).toBe(false)
    expect(ItemPrimitive.FireworksFlightDuration.is(0)).toBe(true)
    expect(ItemPrimitive.FireworksFlightDuration.is(255)).toBe(true)
    expect(ItemPrimitive.FireworksFlightDuration.is(-1)).toBe(false)
    expect(ItemPrimitive.FireworksFlightDuration.is(256)).toBe(false)
    expect(ItemPrimitive.ItemComponentNbtLong.is(MIN_SIGNED_LONG)).toBe(true)
    expect(ItemPrimitive.ItemComponentNbtLong.is(MAX_SIGNED_LONG)).toBe(true)
    expect(ItemPrimitive.ItemComponentNbtLong.is(MIN_SIGNED_LONG - 1n)).toBe(false)
    expect(ItemPrimitive.ItemComponentNbtLong.is(MAX_SIGNED_LONG + 1n)).toBe(false)
    expect(
      Reflect.apply(ItemPrimitive.ItemComponentNbtLong.is, ItemPrimitive.ItemComponentNbtLong, [1]),
    ).toBe(false)
    expect(
      Reflect.apply(ItemPrimitive.ItemComponentNbtLong.is, ItemPrimitive.ItemComponentNbtLong, ['1']),
    ).toBe(false)
    expect(ItemPrimitive.LootTableSeed.is(MIN_SIGNED_LONG)).toBe(true)
    expect(ItemPrimitive.LootTableSeed.is(MAX_SIGNED_LONG)).toBe(true)
    expect(ItemPrimitive.LootTableSeed.is(MIN_SIGNED_LONG - 1n)).toBe(false)
    expect(ItemPrimitive.LootTableSeed.is(MAX_SIGNED_LONG + 1n)).toBe(false)
    expect(
      Reflect.apply(ItemPrimitive.LootTableSeed.is, ItemPrimitive.LootTableSeed, [1]),
    ).toBe(false)
    expect(
      Reflect.apply(ItemPrimitive.LootTableSeed.is, ItemPrimitive.LootTableSeed, ['1']),
    ).toBe(false)
  })

  it('validates string semantics and custom model data', () => {
    expect(ItemPrimitive.ItemComponentNbtString.is('')).toBe(true)
    expect(
      Reflect.apply(ItemPrimitive.ItemComponentNbtString.is, ItemPrimitive.ItemComponentNbtString, [1]),
    ).toBe(false)
    expect(ItemPrimitive.ItemComponentNbtNumber.is(0)).toBe(true)
    expect(ItemPrimitive.ItemComponentNbtNumber.is(-1)).toBe(true)
    expect(ItemPrimitive.ItemComponentNbtNumber.is(NaN)).toBe(false)
    expect(ItemPrimitive.ItemComponentNbtNumber.is(Infinity)).toBe(false)
    expect(ItemPrimitive.ItemComponentNbtKey.is('')).toBe(true)
    expect(
      Reflect.apply(ItemPrimitive.ItemComponentNbtKey.is, ItemPrimitive.ItemComponentNbtKey, [1]),
    ).toBe(false)
    expect(ItemPrimitive.TrimArmorMaterialKey.is('')).toBe(true)
    expect(
      Reflect.apply(ItemPrimitive.TrimArmorMaterialKey.is, ItemPrimitive.TrimArmorMaterialKey, [1]),
    ).toBe(false)
    expect(ItemPrimitive.ProfileName.is('A'.repeat(16))).toBe(true)
    expect(ItemPrimitive.ProfileName.is('')).toBe(false)
    expect(ItemPrimitive.ProfileName.is('A'.repeat(17))).toBe(false)
    expect(ItemPrimitive.ProfileName.is('notch-name')).toBe(false)
    expect(ItemPrimitive.ProfilePropertyName.is('')).toBe(true)
    expect(ItemPrimitive.ProfilePropertyValue.is('')).toBe(true)
    expect(ItemPrimitive.ProfilePropertySignature.is('')).toBe(true)
    expect(ItemPrimitive.BookPageText.is('')).toBe(true)
    expect(ItemPrimitive.BookAuthor.is('')).toBe(true)
    expect(ItemPrimitive.TrimAssetName.is('iron')).toBe(true)
    expect(ItemPrimitive.TrimAssetName.is('')).toBe(false)
    expect(ItemPrimitive.BlockStatePropertyValue.is('')).toBe(true)
    expect(ItemPrimitive.ItemLock.is('')).toBe(true)
    expect(ItemPrimitive.CustomModelDataFloat.is(Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.CustomModelDataFloat.is(NaN)).toBe(false)
    expect(ItemPrimitive.CustomModelDataString.is('')).toBe(true)

    for (const constructor of [
      ItemPrimitive.ProfilePropertyName,
      ItemPrimitive.ProfilePropertyValue,
      ItemPrimitive.ProfilePropertySignature,
      ItemPrimitive.BookPageText,
      ItemPrimitive.BookAuthor,
      ItemPrimitive.BlockStatePropertyValue,
      ItemPrimitive.ItemLock,
      ItemPrimitive.CustomModelDataString,
    ]) {
      expect(() => Reflect.apply(constructor, undefined, [1])).toThrow()
    }
  })

  it('validates kinetic, enchantment-table, and tool quantities', () => {
    expect(ItemPrimitive.KineticDurationTicks.is(0)).toBe(true)
    expect(ItemPrimitive.KineticDurationTicks.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.KineticDurationTicks.is(-1)).toBe(false)
    expect(ItemPrimitive.KineticDurationTicks.is(1.5)).toBe(false)
    expect(ItemPrimitive.KineticSpeed.is(0)).toBe(true)
    expect(ItemPrimitive.KineticSpeed.is(Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.KineticSpeed.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.KineticMovement.is(-Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.KineticMovement.is(Infinity)).toBe(false)
    expect(ItemPrimitive.KineticDamageMultiplier.is(0)).toBe(true)
    expect(ItemPrimitive.KineticDamageMultiplier.is(Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.KineticDamageMultiplier.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.EnchantmentWeight.is(1)).toBe(true)
    expect(ItemPrimitive.EnchantmentWeight.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.EnchantmentWeight.is(0)).toBe(false)
    expect(ItemPrimitive.EnchantmentTableLevelCost.is(0)).toBe(true)
    expect(ItemPrimitive.EnchantmentTableLevelCost.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.EnchantmentTableLevelCost.is(-1)).toBe(false)
    expect(ItemPrimitive.ToolMiningSpeed.is(0)).toBe(true)
    expect(ItemPrimitive.ToolMiningSpeed.is(Number.MAX_VALUE)).toBe(true)
    expect(ItemPrimitive.ToolMiningSpeed.is(-Number.MIN_VALUE)).toBe(false)
    expect(ItemPrimitive.ToolDurabilityDamage.is(0)).toBe(true)
    expect(ItemPrimitive.ToolDurabilityDamage.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.ToolDurabilityDamage.is(-1)).toBe(false)
    expect(ItemPrimitive.ToolDurabilityDamage.is(1.5)).toBe(false)
    expect(ItemPrimitive.ToolRuleOrder.is(0)).toBe(true)
    expect(ItemPrimitive.ToolRuleOrder.is(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(ItemPrimitive.ToolRuleOrder.is(-1)).toBe(false)
    expect(ItemPrimitive.ToolRuleOrder.is(1.5)).toBe(false)
  })
})

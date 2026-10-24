# mc-kernel 0.8から0.9への移行

このガイドは0.9の公開面とEffect 4への移行を説明する。0.8と0.9は移行元・移行先のAPI面を示し、package versionはchangesetをリリース工程で適用した時点で更新する。表のソースパスは実装の所有元を示し、packageのimport pathではない。公開import例は、export mapとbarrelの両方で確認できたものだけを示す。

## 実行時処理の所有元を確認する

| 移動する実行時処理 | 実装の所有元（ソースパス） |
| --- | --- |
| クラフト、調理、醸造、製錬、鍛造、石切り、インベントリ、ホットバー | `mc-sim:src/domain/` |
| Equipment, anvil state, grindstone | `mc-sim:src/domain/` |
| Enchantment offer generation and state | `mc-sim:src/domain/` |
| Enchantment application | `mx-gameplay:src/domain/` |
| エンティティ操作、vitals、wither、爆発、TNT、BlockWorld、作物、ゲームルール、統計、時刻、天候状態、乗り物状態 | `mc-sim:src/domain/` |
| Java・Bedrockの採掘時間とブロック破壊速度 | `mx-gameplay:src/domain/interactions/` |
| 食料の摂取処理、流体状態の更新 | `mx-gameplay:src/domain/` |
| ポータルの検出・layout生成、光の更新 | `mc-worldgen:src/domain/` |
| レッドストーンの実行時処理 | `mx-redstone:src/domain/` |
| 飛翔体の実行時処理 | `mc-physics:src/domain/projectile.ts` |

確認できた公開importは `@nerima-games/mc-physics` のrootである。たとえば `launchProjectile` はこのroot exportから利用できる。

`mc-sim`、`mx-gameplay`、`mc-worldgen`、`mx-redstone`では、移動対象の各シンボルを利用する公開APIを確認できていない。これらの処理に依存するconsumerは、kernel 0.8のpinを保ち、owner packageが該当APIを公開してから切り替える。ソースディレクトリから直接importしたり、未確認の関数名を移行先として仮定したりしない。

## Removed exports and migration status

The declarations below were exported by 0.8 and are no longer available from their former kernel owners. Use the listed owner when its API is available. While that API is unpublished, keep `@nerima-games/mc-kernel` pinned to 0.8 if the consumer depends on the declaration. A name reused by a different 0.9 declaration is qualified by its former module.

| Removed 0.8 export or declaration | Migration owner | Keep 0.8 pin until owner API is public? |
| --- | --- | --- |
| `matchRecipe` | `mc-sim` | Yes. |
| `matchRecipeWithAssignments` | `mc-sim` | Yes. |
| `matchesRecipe` | `mc-sim` | Yes. |
| `matchesShaped` | `mc-sim` | Yes. |
| `matchesShapeless` | `mc-sim` | Yes. |
| `conflictsIn` | `mc-sim` | Yes. |
| `addBrewingFuel` | `mc-sim` | Yes. |
| `advanceBrewing` | `mc-sim` | Yes. |
| `advanceFurnace` | `mc-sim` | Yes. |
| `applyCooking` | `mc-sim` | Yes. |
| `applyCraftingDye` | `mc-sim` | Yes. |
| `applyCraftingImbue` | `mc-sim` | Yes. |
| `applyCraftingSpecial` | `mc-sim` | Yes. |
| `applySmithing` | `mc-sim` | Yes. |
| `applyStonecutting` | `mc-sim` | Yes. |
| `applyTransmute` | `mc-sim` | Yes. |
| `brewingState` | `mc-sim` | Yes. |
| `craftFromGrid` | `mc-sim` | Yes. |
| `emptyBrewingState` | `mc-sim` | Yes. |
| `emptyFurnaceState` | `mc-sim` | Yes. |
| `furnaceState` | `mc-sim` | Yes. |
| `cookingRecipe` | `mc-sim` | Yes. |
| `cookingRecipeForItem` | `mc-sim` | Yes. |
| `isCookingRecipe` | `mc-sim` | Yes. |
| `matchBrewingRecipe` | `mc-sim` | Yes. |
| `matchCookingRecipe` | `mc-sim` | Yes. |
| `matchCookingRecipes` | `mc-sim` | Yes. |
| `matchesCookingRecipe` | `mc-sim` | Yes. |
| `matchCraftingDyeRecipe` | `mc-sim` | Yes. |
| `matchCraftingDyeRecipes` | `mc-sim` | Yes. |
| `matchCraftingImbueRecipe` | `mc-sim` | Yes. |
| `matchCraftingImbueRecipes` | `mc-sim` | Yes. |
| `matchCraftingSpecialRecipe` | `mc-sim` | Yes. |
| `matchCraftingSpecialRecipes` | `mc-sim` | Yes. |
| `matchesCraftingDyeRecipe` | `mc-sim` | Yes. |
| `matchesCraftingImbueRecipe` | `mc-sim` | Yes. |
| `matchSmeltingRecipe` | `mc-sim` | Yes. |
| `matchSmithingRecipe` | `mc-sim` | Yes. |
| `matchesSmithingRecipe` | `mc-sim` | Yes. |
| `smithingInput` | `mc-sim` | Yes. |
| `SMITHING_STATION_TAG` | `mc-sim` | Yes. |
| `SMITHING_TRIM_MATERIAL_TAG` | `mc-sim` | Yes. |
| `SMITHING_TRIM_TEMPLATE_TAG` | `mc-sim` | Yes. |
| `SMITHING_TRIMMABLE_ARMOR_TAG` | `mc-sim` | Yes. |
| `VANILLA_SMITHING_RECIPES` | `mc-sim` | Yes. |
| `smithingTransformRecipe` | `mc-sim` | Yes. |
| `smithingTrimRecipe` | `mc-sim` | Yes. |
| `SmithingInput` | `mc-sim` | Yes. |
| `SmithingInputInput` | `mc-sim` | Yes. |
| `matchStonecuttingRecipe` | `mc-sim` | Yes. |
| `matchStonecuttingRecipes` | `mc-sim` | Yes. |
| `STONECUTTING_STATION_TAG` | `mc-sim` | Yes. |
| `stonecuttingRecipe` | `mc-sim` | Yes. |
| `VANILLA_STONECUTTING_RECIPES` | `mc-sim` | Yes. |
| `matchTransmuteRecipe` | `mc-sim` | Yes. |
| `matchTransmuteRecipes` | `mc-sim` | Yes. |
| `matchesTransmuteRecipe` | `mc-sim` | Yes. |
| `mixCraftingDyeColor` | `mc-sim` | Yes. |
| `isTransmuteMaterialCount` | `mc-sim` | Yes. |
| `isTransmuteRecipe` | `mc-sim` | Yes. |
| `transmuteRecipe` | `mc-sim` | Yes. |
| `transmuteRecipeForItem` | `mc-sim` | Yes. |
| `TRANSMUTE_MAX_MATERIAL_SLOTS` | `mc-sim` | Yes. |
| `applySettings` | `mc-sim` | Yes. |
| `isGraphicsQuality` | `mc-sim` | Yes. |
| `keyBindingFor` | `mc-sim` | Yes. |
| `isValidSettings` | `mc-sim` | Yes. |
| `counterOf` | `mc-sim` | Yes. |
| `isUnlocked` | `mc-sim` | Yes. |
| `isValidStatistics` | `mc-sim` | Yes. |
| `normaliseStatistics` | `mc-sim` | Yes. |
| `record` | `mc-sim` | Yes. |
| `unlock` | `mc-sim` | Yes. |
| `Statistics` | `mc-sim` | Yes. |
| `StatisticKey` | `mc-sim` | Yes. |
| `AchievementId` (statistics) | `mc-sim` | Yes. |
| `EMPTY_STATISTICS` | `mc-sim` | Yes. |
| `CookingApplyResult` | `mc-sim` | Yes. |
| `CookingMatch` | `mc-sim` | Yes. |
| `CookingRecipe` | `mc-sim` | Yes. |
| `CookingRecipeOptions` | `mc-sim` | Yes. |
| `CookingRecipeTable` | `mc-sim` | Yes. |
| `CraftOutcome` | `mc-sim` | Yes. |
| `CraftResult` | `mc-sim` | Yes. |
| `MissingIngredient` | `mc-sim` | Yes. |
| `RecipeConflict` | `mc-sim` | Yes. |
| `RecipeConflictReason` | `mc-sim` | Yes. |
| `RecipeIngredientAssignment` | `mc-sim` | Yes. |
| `RecipeMatch` | `mc-sim` | Yes. |
| `RecipeMatchWithAssignments` | `mc-sim` | Yes. |
| `CraftingDyeMatch` | `mc-sim` | Yes. |
| `CraftingImbueMatch` | `mc-sim` | Yes. |
| `CraftingBannerDuplicateMatch` | `mc-sim` | Yes. |
| `CraftingBookCloningMatch` | `mc-sim` | Yes. |
| `CraftingDecoratedPotMatch` | `mc-sim` | Yes. |
| `CraftingFireworkRocketMatch` | `mc-sim` | Yes. |
| `CraftingFireworkStarFadeMatch` | `mc-sim` | Yes. |
| `CraftingFireworkStarMatch` | `mc-sim` | Yes. |
| `CraftingMapExtendingMatch` | `mc-sim` | Yes. |
| `CraftingShieldDecorationMatch` | `mc-sim` | Yes. |
| `CraftingSpecialMatch` | `mc-sim` | Yes. |
| `CraftingDyeApplyResult` | `mc-sim` | Yes. |
| `CraftingImbueApplyResult` | `mc-sim` | Yes. |
| `CraftingBannerDuplicateApplyResult` | `mc-sim` | Yes. |
| `CraftingBookCloningApplyResult` | `mc-sim` | Yes. |
| `CraftingDecoratedPotApplyResult` | `mc-sim` | Yes. |
| `CraftingFireworkRocketApplyResult` | `mc-sim` | Yes. |
| `CraftingFireworkStarFadeApplyResult` | `mc-sim` | Yes. |
| `CraftingFireworkStarApplyResult` | `mc-sim` | Yes. |
| `CraftingMapExtendingApplyResult` | `mc-sim` | Yes. |
| `CraftingShieldDecorationApplyResult` | `mc-sim` | Yes. |
| `CraftingSpecialApplyResult` | `mc-sim` | Yes. |
| `SmithingOperation` | `mc-sim` | Yes. |
| `SmithingRecipe` | `mc-sim` | Yes. |
| `SmithingRecipeOptions` | `mc-sim` | Yes. |
| `SmithingRecipeTable` | `mc-sim` | Yes. |
| `SmithingTransformRecipe` | `mc-sim` | Yes. |
| `SmithingTrimRecipe` | `mc-sim` | Yes. |
| `StonecuttingApplyResult` | `mc-sim` | Yes. |
| `StonecuttingMatch` | `mc-sim` | Yes. |
| `StonecuttingRecipe` | `mc-sim` | Yes. |
| `StonecuttingRecipeOptions` | `mc-sim` | Yes. |
| `StonecuttingRecipeTable` | `mc-sim` | Yes. |
| `TransmuteApplyResult` | `mc-sim` | Yes. |
| `TransmuteInput` | `mc-sim` | Yes. |
| `TransmuteMatch` | `mc-sim` | Yes. |
| `TransmuteMaterialCount` | `mc-sim` | Yes. |
| `TransmuteRecipe` | `mc-sim` | Yes. |
| `TransmuteRecipeOptions` | `mc-sim` | Yes. |
| `TransmuteRecipeTable` | `mc-sim` | Yes. |
| `AnvilCustomName` | `mc-sim` | Yes, if using Anvil state or snapshot types. |
| `AnvilEnchantmentId` | `mc-sim` | Yes, if using Anvil state or snapshot types. |
| `AnvilMaterialCost` | `mc-sim` | Yes, if using Anvil state or snapshot types. |

`AchievementId` (statistics) refers to the 0.8 statistics identifier. The 0.9 root `AchievementId` from `domain-event` is a different declaration.

### Additional removed exports by destination

Each code name below is a separate removed 0.8 export. The owner and pin decision in its subsection apply to every name listed there.

#### `mc-sim`

Keep the 0.8 pin until the corresponding `mc-sim` API is public.

- Weather: `WeatherState`, `INITIAL_WEATHER_STATE`, `isValidWeatherState`, `normaliseWeatherState`.
- Block interaction and world access: `BlockBreakDecision`, `BlockPlacementDecision`, `PlaceableBlock`, `breakBlock`, `canReplaceBlock`, `placeBlock`, `placeableBlockFromItem`, `BlockWorld`, `BlockReader`, `BlockSource`, `emptyBlockWorld`, `blockAt`, `blockReaderOf`, `readBlockAt`, `setBlockAt`, `BlockEntities`, `emptyBlockEntities`, `blockEntityAt`, `setBlockEntity`, `clearBlockEntity`, `BEDROCK_HARDNESS`, `REFERENCE_UNBREAKABLE_HARDNESS`.
- Crops: `CropLocation`, `CropState`, `CropSnapshot`, `CropValidationError`, `CropValidationResult`, `isCropType`, `cropDefinitionFor`, `maturitySecsFor`, `canPlantCrop`, `isMatureCrop`, `matureYieldsFor`, `advanceCrop`, `advanceCropByBoneMeal`, `cropLocationKey`, `validateCropSnapshot`, `BONE_MEAL_GROWTH_SECS`, `CROP_REGISTRY`, `CROP_TYPES`, `NETHER_WART_MATURITY_SECS`, `POTATO_MATURITY_SECS`, `WHEAT_MATURITY_SECS`, `CropDefinition`, `CropType`.
- Anvil state, snapshots, plans, and compilation: `ANVIL_SNAPSHOT_VERSION`, `ANVIL_MAX_CUSTOM_NAME_LENGTH`, `AnvilDurability`, `AnvilEnchantment`, `AnvilItemPayload`, `CanonicalAnvilItemPayload`, `AnvilInputStack`, `AnvilState`, `CanonicalAnvilState`, `AnvilEnchantmentRule`, `AnvilRepairMaterialRule`, `AnvilRuleSet`, `AnvilRuleInput`, `AnvilValidationIssue`, `AnvilSnapshot`, `AnvilSnapshotString`, `AnvilSnapshotResult`, `AnvilSnapshotEncodingResult`, `AnvilRejectionReason`, `AnvilPlan`, `AnvilApplyResult`, `isAnvilEnchantmentId`, `isAnvilCustomName`, `decodeAnvilSnapshot`, `decodeAnvilSnapshotString`, `encodeAnvilSnapshot`, `isAnvilSnapshotString`, `snapshotAnvilState`, `compileAnvilRuleSet`, `nextAnvilRepairCost`, `AnvilRuleSetCompilation`, `CompiledAnvilEnchantmentRule`, `CompiledAnvilRuleSet`, `planAnvil`, `applyAnvil`.
- Equipment and durability: `isEquippableItemType`, `equipmentDefinitionFor`, `isDamageableItemType`, `Durability`, `EquipmentItem`, `ValidEquipmentItem`, `EquipmentSlots`, `Equipment`, `EquipmentValidationError`, `EquipmentValidationResult`, `EquipmentOutcome`, `DamageEquipmentResult`, `isEquipmentSlot`, `isDurability`, `isValidDurabilityForItem`, `isEquipmentItem`, `isEquipmentItemForSlot`, `durabilityForItem`, `durability`, `equipmentItem`, `emptyEquipment`, `equippedAt`, `equip`, `unequip`, `swapEquipment`, `damageEquipment`, `validateEquipmentSnapshot`.
- Enchantment state and offers: `isSupportedVanillaEnchantmentId`, `enchantmentRuleFor`, `enchantmentAppliesTo`, `enchantmentsConflict`, `planVanillaAnvil`, `applyVanillaAnvil`, `EnchantmentTableRandom`, `EnchantmentTableOffer`, `EnchantmentTableOffers`, `EnchantmentTableSlot`, `CalculateEnchantmentTableLevelCostInput`, `GenerateEnchantmentOffersInput`, `enchantmentTableCostAtLevel`, `calculateEnchantmentTableLevelCost`, `generateEnchantmentTableOffers`, `enchantmentTableOutputItemOf`, `ENCHANTMENT_TABLE_BOOK`, `ENCHANTMENT_TABLE_MAX_BOOKSHELVES`, `ENCHANTMENT_TABLE_SLOT_COUNT`, `EnchantmentTableItem`, `EnchantmentTableCost`, `VanillaEnchantmentTableRule`, `VANILLA_ENCHANTMENT_TABLE_RULES`, `ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY`, `EnchantmentTableRuleId`, `isEnchantmentTableRuleId`, `enchantmentTableRuleFor`, `itemEnchantabilityOf`.
- Grindstone: `GrindstoneInput`, `GrindstoneOutput`, `GrindstoneFailureReason`, `GrindstonePlan`, `grindstoneExperienceFor`, `planGrindstone`, `GRINDSTONE_CURSE_ENCHANTMENT_IDS`, `GRINDSTONE_DURABILITY_BONUS_PERCENT`, `GRINDSTONE_REPAIR_COST_MAX`.
- Inventory, hotbar, and entity roster: `emptyInventory`, `slotAt`, `countOf`, `isInventoryEmpty`, `AddOutcome`, `addItemStack`, `addItem`, `RemoveOutcome`, `RemoveAtResult`, `RemoveAtOutcome`, `removeItemAt`, `removeItem`, `NormaliseOutcome`, `normaliseInventory`, `isHotbarIndex`, `clampHotbarIndex`, `cycleHotbarIndex`, `hotbarSlotIndex`, `emptyRoster`, `spawnEntity`, `despawnEntity`, `findEntity`, `countOfKind`, `UNCHANGED`, `DESPAWNED`, `changed`, `sweepRoster`, `normaliseRoster`, `INVENTORY_SLOT_COUNT`, `Inventory`, `HOTBAR_SIZE`, `HOTBAR_START`.
- Explosions and primed TNT: `planExplosion`, `applyExplosionPlan`, `primeTnt`, `planPrimedTnt`, `applyPrimedTntPlan`, `DEFAULT_TNT_FUSE_SECS`, `MAX_TNT_FUSE_ADVANCE_SECS`, `PrimedTntCommit`, `PrimedTntMutation`, `PrimedTntPlan`, `PrimedTntRequest`, `PrimedTntState`.
- Experience, vitals, and hunger: `experienceCostOfLevel`, `totalExperienceAtLevel`, `levelForTotalExperience`, `experienceLevel`, `experienceProgress`, `addExperience`, `isDead`, `applyDamage`, `heal`, `FoodTickSignal`, `addExhaustion`, `eat`, `advanceFoodTimer`, `respawn`, `DEFAULT_MAX_HEALTH_POINTS`, `DEFAULT_MAX_HUNGER_POINTS`, `SPAWN_SATURATION`, `EXHAUSTION_PER_POINT`, `MAX_EXHAUSTION`, `FOOD_TICK_SECS`, `REGEN_HUNGER_THRESHOLD`, `EXHAUSTION_PER_REGEN`, `DamageCause`, `Damage`, `Vitals`, `VitalsView`, `SPAWN_VITALS`, `isValidVitals`, `normaliseVitals`, `vitalsView`.
- Vehicle and wither state: `validateVehicleSnapshot`, `emptyVehicleSnapshot`, `createWither`, `stepWither`, `damageWither`, `witherSkullProjectile`, `matchWitherSummon`, `serializeWither`, `restoreWither`, `WITHER_ARMOUR_THRESHOLD`, `WITHER_FOLLOW_ACCELERATION`, `WITHER_MAX_HEALTH`, `WITHER_MAX_SPEED`, `WITHER_REGEN_PER_SEC`, `WITHER_SPAWN_CHARGE_SECS`, `BlockCell`, `WitherDamageKind`, `WitherDamageResult`, `WitherDeathDescriptor`, `WitherPhase`, `WitherSkullProjectileDescriptor`, `WitherSkullVariant`, `WitherSnapshot`, `WitherState`, `WitherStep`, `WitherSummonMatch`, `WitherSummonMaterial`.
- Time, game rules, and camera pose: `TICKS_PER_SECOND`, `MIN_DAY_LENGTH_SECS`, `MAX_DAY_LENGTH_SECS`, `MAX_TIME_FRACTION`, `MOON_PHASE_COUNT`, `TimeState`, `INITIAL_TIME_STATE`, `DEFAULT_DAY_LENGTH_SECS`, `clampDayLengthSecs`, `clampFraction`, `isValidTimeState`, `normaliseTimeState`, `timeOfDay`, `dayLengthSecs`, `moonPhase`, `isNight`, `advance`, `setDayLength`, `setTimeOfDay`, `setDayLengthThenTimeOfDay`, `normaliseGameRules`, `applyGameRules`, `isValidGameRules`, `DEFAULT_GAME_RULES`, `GAME_RULE_BOOLEAN_NAMES`, `GAME_RULE_INTEGER_NAMES`, `MAX_ENTITY_CRAMMING_MAX`, `MAX_ENTITY_CRAMMING_MIN`, `PLAYERS_SLEEPING_PERCENTAGE_MAX`, `PLAYERS_SLEEPING_PERCENTAGE_MIN`, `RANDOM_TICK_SPEED_MAX`, `RANDOM_TICK_SPEED_MIN`, `SPAWN_RADIUS_MAX`, `SPAWN_RADIUS_MIN`, `GameRuleBooleanName`, `GameRuleIntegerName`, `GameRules`, `PITCH_EPSILON`, `PITCH_MAX_RADIANS`, `PITCH_MIN_RADIANS`, `EYE_LEVEL_OFFSET`, `INITIAL_PLAYER_POSE`, `clampPitch`, `applyLook`, `withFeetPosition`, `cameraPoseOf`, `CameraOrientation`, `forwardVector`, `PlayerPose`.

#### `mx-gameplay`

Keep the 0.8 pin until the corresponding `mx-gameplay` API is public.

- Mining and Bedrock item/block components: `BreakTicksInput`, `miningSpeedOf`, `computeBreakTicks`, `blockHardnessOf`, `validateBedrockDiggerComponent`, `validateBedrockDestructibleByMining`, `resolveBedrockDiggerSpeed`, `bedrockDiggerUsesEfficiency`, `resolveBedrockDestructionSeconds`, `resolveBedrockItemSpecificDestroySpeed`, `DEFAULT_MINING_SPEED`, `TOOL_BREAK_SPEED`, `BEDROCK_DIGGER_MIN_FORMAT_VERSION`, `BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION`, `DEFAULT_BEDROCK_SECONDS_TO_DESTROY`, `BedrockTagQueryOperator`, `BedrockBlockStateValue`, `BedrockBlockStates`, `BedrockBlockDescriptor`, `BedrockBlock`, `BedrockDiggerDestroySpeed`, `BedrockDiggerComponent`, `BedrockItemDescriptor`, `BedrockItem`, `BedrockItemSpecificSpeed`, `BedrockDestructibleByMining`, `ParsedBedrockTagQuery`, `parseBedrockTagQuery`, `validateBedrockBlockDescriptor`, `validateBedrockItemDescriptor`, `bedrockTagQueryMatches`, `bedrockBlockDescriptorMatches`, `bedrockItemDescriptorMatches`, `validateBedrockBlockStates`, `validateBedrockDiggerSpeed`, `validateBedrockDestroySpeed`.
- Fluid updates and food consumption: `FluidLevel`, `fluidLevel`, `FluidCell`, `FluidState`, `emptyFluidState`, `fluidCellAt`, `setFluidCell`, `clearFluidCell`, `scheduleFluidAt`, `unscheduleFluidAt`, `FluidChange`, `FluidUpdate`, `fluidStateFromWorld`, `canFluidReplace`, `updateFluids`, `FoodConsumeResult`, `canEatFood`, `foodRemainderOf`, `consumeFood`.

#### `mx-redstone`

Keep the 0.8 pin until the corresponding `mx-redstone` API is public.

`HorizontalRedstoneFace`, `REDSTONE_REPEATER_DELAY_MIN_TICKS`, `REDSTONE_REPEATER_DELAY_MAX_TICKS`, `RepeaterDelayTicks`, `repeaterDelayTicks`, `RedstoneRepeater`, `RedstoneComparatorMode`, `RedstoneComparator`, `RedstoneObserver`, `RedstoneDevice`, `redstoneRepeater`, `redstoneComparator`, `redstoneObserver`, `collectRedstoneLayout`, `sourcePowerAt`, `deviceOutputFace`, `deviceOutputAtTarget`, `poweredWiresFrom`, `signalPowerAt`, `wirePowerChanges`, `blockIsWire`, `RedstonePower`, `redstonePower`, `RedstoneRepeaterTimer`, `RedstoneDeviceStateUpdate`, `RedstoneState`, `emptyRedstoneState`, `redstoneInputAt`, `redstonePowerAt`, `redstoneDevicePowerAt`, `redstoneDeviceAt`, `setRedstoneInput`, `clearRedstoneInput`, `setRedstoneDevice`, `clearRedstoneDevice`, `withRedstoneWirePowers`, `withRedstoneDeviceState`, `RedstoneChange`, `RedstoneUpdate`, `updateRedstone`, `DevicePowerContext`, `PendingWire`, `RedstoneDevicePlacement`, `RedstoneLayout`, `WirePropagation`, `WireQueue`.

#### `mc-worldgen`

Keep the 0.8 pin until the corresponding `mc-worldgen` API is public.

`LightCellInput`, `LightVolumeSource`, `LightSeed`, `LightBoundarySeeds`, `updateLight`, `detectNetherPortal`, `generatePortalLayout`.

#### `mc-physics`

No 0.8 pin is needed when the consumer can use the current public `mc-physics` root API. `ProjectileEntity`, `ProjectileWorld`, `ProjectileHit`, and `ProjectileStep` keep their names. `Arrow` maps to `Projectile`, `ArrowLaunch` to `ProjectileLaunch`, `ARROW_GRAVITY`, `ARROW_AIR_DRAG`, `ARROW_WATER_DRAG`, `ARROW_MAX_LIFETIME_SECONDS`, and `ARROW_SHOOTER_GRACE_SECONDS` to `ARROW_PROFILE`, `launchArrow` to `launchProjectile`, and `stepArrow` to `stepProjectile`.

#### `mc-kernel`

No 0.8 pin is needed when the consumer uses the current 0.9 replacements: `itemComponentPatchFromUnknown` and `itemComponentPatchFromUnknownEither` map to `decodeItemComponentPatch`; `mergeItemComponentPatchesEither` maps to `mergeItemComponentPatches`.

The `GraphicsQuality`, `Settings`, settings normalization, and key-binding update APIs remain public. Static enchantment rule data also remains in the kernel; runtime offer generation and offer state belong to `mc-sim`, while applying enchantments belongs to `mx-gameplay`.

## kernelに残る型・静的データを使う

| kernelに残るもの | 公開importと境界 |
| --- | --- |
| 醸造・製錬のレシピ、燃料データ、定数と共有state/data型 | `@nerima-games/mc-kernel`のroot、または実在する`@nerima-games/mc-kernel/domain/recipe`から読み込む。`BrewingState`、`BrewingBottles`、`FurnaceState`、`CookingStation`などは共有する値の形であり、stateの生成・更新や処理結果ではない。 |
| `itemDurabilityDefinitionFor` | `@nerima-games/mc-kernel`のrootから読み込む。定義元の`src/domain/item/equipment-data.ts`はソースパスであり、import pathではない。 |
| エンチャントID、コスト表、ルール配列、3種の `SUPPORTED_VANILLA_*_ANVIL_RULE_SET` 定数 | `@nerima-games/mc-kernel`のrootまたは実在する`@nerima-games/mc-kernel/domain/enchantment`から静的データとして読み込む。金床state・計画・適用APIとは別の契約である。 |
| `BlockAt`、`PortalAxis`、`PortalFrame`、`PortalLayout`、ポータル寸法定数 | `@nerima-games/mc-kernel`のrootから共有型・寸法データを読み込む。生成・検出の実行時処理は上表のowner packageの公開APIが確認できてから移す。 |
| entity/vehicleの共有型、爆発データ、block entityのデータと検証、fluid/light/redstoneの静的データ、weather/settingsの共有語彙 | `@nerima-games/mc-kernel`のrootから読み込む。state更新やcollection操作はruntime ownerが提供する。 |

### Effect 4のResultへ移行する

`addTick`、`secondsForTicks`、`decodeItemComponentPatch`、`mergeItemComponentPatches`はEffect 4の`Result.Result`を返す。0.9ではitem component patch APIの名前が`itemComponentPatchFromUnknownEither`から`decodeItemComponentPatch`に、`mergeItemComponentPatchesEither`から`mergeItemComponentPatches`に変わった。

```typescript
import { Result } from "effect";
import {
  decodeItemComponentPatch,
  mergeItemComponentPatches,
} from "@nerima-games/mc-kernel";

const decoded = decodeItemComponentPatch(input);
if (Result.isFailure(decoded)) {
  const error = decoded.failure;
} else {
  const patch = decoded.success;
}

const merged = mergeItemComponentPatches(left, right);
if (Result.isFailure(merged)) {
  const error = merged.failure;
} else {
  const patch = merged.success;
}
```

`decodeItemComponentPatch`は`Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError>`を、`mergeItemComponentPatches`は`Result.Result<ItemComponentPatch | undefined, ItemComponentPatchDecodeError>`を返す。`Result.isFailure`で失敗を絞り込むと`.failure`を、成功側では`.success`を参照できる。両引数がともに`undefined`なら、成功値も`undefined`になる。`addTick`と`secondsForTicks`も同じResult分岐を使い、それぞれ成功値として`SimulationTick`と`FixedDurationSecs`を返す。

公開関数名と戻り値型は、`package.json`の`types`条件が指す公開entrypointの型宣言で確認してください。
`addTick`と`secondsForTicks`は`@nerima-games/mc-kernel/domain/frame-timing`からもimportできます。

## BrandのコンストラクタAPIを変更する

`Brand.Brand.Constructor<T>`の型注釈を`Brand.Constructor<T>`に置き換えてください。`Brand.refined<T>`の呼び出しを`Brand.make<T>`に置き換えてください。引数の形はEffect 4の型宣言で確認してください。

## 時間と座標のbrand型に移行する

0.9では時間と座標の値を用途ごとのbrand型で区別します。実行時表現は`number`ですが、生の`number`を`SimulationTick`や`BlockAxis`などのbrand型として直接使うことはできません。時間型と構築子は`@nerima-games/mc-kernel/domain/quantities`、時間計算は`@nerima-games/mc-kernel/domain/frame-timing`、座標APIは`@nerima-games/mc-kernel/domain/coordinates`から読み込んでください。

時間の主な構築子は`DeltaTimeSecs`、`FixedDurationSecs`、`SimulationTick`、`NonNegativeTickCount`、`MonotonicTimeSecs`、`EpochMillis`、`InterpolationFraction`です。`frameDeltaBetween`は`MonotonicTimeSecs | undefined`と`MonotonicTimeSecs`を受け取り、`DeltaTimeSecs`を返します。`addTick`は`SimulationTick`と`NonNegativeTickCount`を受け取り、成功値は`SimulationTick`です。`secondsForTicks`は`NonNegativeTickCount`を受け取り、成功値は`FixedDurationSecs`です。`interpolationFraction`は`FixedDurationSecs`を受け取り、`InterpolationFraction`を返します。`addTick`と`secondsForTicks`の`Result`の扱いは前節のとおりです。`ClockPort`の`monotonicSecs`の値は`MonotonicTimeSecs`、`wallClockEpochMillis`の値は`EpochMillis`です。

座標では`BlockAxis`、`ChunkAxis`、`LocalAxis`、`PositionAxis`を使います。`blockPosition`には3つの`BlockAxis`、`chunkCoord`には2つの`ChunkAxis`、`position`には3つの`PositionAxis`を渡してください。`BlockAxis`と`ChunkAxis`は安全な整数、`LocalAxis`は0〜15の整数、`PositionAxis`は有限値です。

各brand構築子は値域を検証します。無効な値で構築子を直接呼び出すと例外が投げられます。外部値の検証では、例外を投げない`SimulationTick.result(value)`（`@nerima-games/mc-kernel/domain/quantities`）または`BlockAxis.option(value)`（`@nerima-games/mc-kernel/domain/coordinates`）を使ってください。

## ClockPortのサービス宣言を変更する

`ClockPort`を宣言するコードでは、`Context.TagClass`を`Context.ServiceClass`に、`Context.Tag`を`Context.Service`に置き換えてください。クラスとサービスの型は、0.9の型宣言で確認してください。

## 下流リポジトリごとに移行を検証する

移行先の公開APIを確認してから読み込みを切り替えてください。重複する実行時処理やfacadeを削除し、各下流リポジトリで型検査、lint、テストを実行してください。

このガイドで公開APIを確認できていない`mc-sim`、`mx-gameplay`、`mc-worldgen`、`mx-redstone`への該当移行は、owner packageの公開APIが利用でき、下流のimportがそのAPIでコンパイルできるまで未完了として扱ってください。このガイドは下流リポジトリの移行完了を報告するものではありません。

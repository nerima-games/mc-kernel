# mc-kernel 0.8から0.9への移行

このガイドは0.9の公開面とEffect 4への移行を説明する。0.8と0.9は移行元・移行先のAPI面を示し、package versionはchangesetをリリース工程で適用した時点で更新する。表のソースパスは実装の所有元を示し、packageのimport pathではない。公開import例は、export mapとbarrelの両方で確認できたものだけを示す。

## 実行時処理の所有元を確認する

| 移動する実行時処理 | 実装の所有元（ソースパス） |
| --- | --- |
| クラフト、調理、醸造、製錬、鍛造、石切り、インベントリ、ホットバー | `mc-sim:src/domain/` |
| 装備、金床状態、砥石 | `mc-sim:src/domain/` |
| エンチャント候補の生成と状態 | `mc-sim:src/domain/` |
| Enchantment application | `mx-gameplay:src/domain/` |
| エンティティ操作、vitals、wither、爆発、TNT、BlockWorld、作物、ゲームルール、統計、時刻、天候状態、乗り物状態 | `mc-sim:src/domain/` |
| Java・Bedrockの採掘時間とブロック破壊速度 | `mx-gameplay:src/domain/interactions/` |
| 食料の摂取処理、流体状態の更新 | `mx-gameplay:src/domain/` |
| ポータルの検出・layout生成、光の更新 | `mc-worldgen:src/domain/` |
| レッドストーンの実行時処理 | `mx-redstone:src/domain/` |
| 飛翔体の実行時処理 | `mc-physics:src/domain/projectile.ts` |

確認できた公開importは `@nerima-games/mc-physics` のrootである。たとえば `launchProjectile` はこのroot exportから利用できる。

`mc-sim`、`mx-gameplay`、`mc-worldgen`、`mx-redstone`では、移動対象の各シンボルを利用する公開APIを確認できていない。これらの処理に依存するconsumerは、kernel 0.8のpinを保ち、owner packageが該当APIを公開してから切り替える。ソースディレクトリから直接importしたり、未確認の関数名を移行先として仮定したりしない。

## 移行先APIが守る境界規則

`game-rule`の保存値が数値でない場合や有限でない場合は、破損値として扱い、`mc-sim`の正規化処理で既定値に戻します。有限値は整数化して定義済み範囲にclampします。game-ruleは共有stateやworldが正となるstateを制御するため、保存値の破損処理をclient settingsの範囲補正と分けています。

Anvil snapshot v1.0.0 は閉じた wire format である。decode時は最上位と入れ子のすべてのobjectで未知のfieldを拒否し、無視して読み込まない。codecは `mc-sim` が所有する。

## 削除されたexportと移行状況

次の宣言は0.8で公開されていましたが、0.9では以前のkernel moduleから削除されています。移行先のAPIが公開されたら、そちらを使ってください。移行先が未公開で、その宣言に依存する場合は、`@nerima-games/mc-kernel`を0.8に固定してください。0.9で同じ名前の別宣言がある場合は、旧module名を併記します。

| 削除された0.8のexportまたは宣言 | 移行先 | 移行先APIが公開されるまで0.8に固定するか |
| --- | --- | --- |
| `matchRecipe` | `mc-sim` | はい。 |
| `matchRecipeWithAssignments` | `mc-sim` | はい。 |
| `matchesRecipe` | `mc-sim` | はい。 |
| `matchesShaped` | `mc-sim` | はい。 |
| `matchesShapeless` | `mc-sim` | はい。 |
| `conflictsIn` | `mc-sim` | はい。 |
| `addBrewingFuel` | `mc-sim` | はい。 |
| `advanceBrewing` | `mc-sim` | はい。 |
| `advanceFurnace` | `mc-sim` | はい。 |
| `applyCooking` | `mc-sim` | はい。 |
| `applyCraftingDye` | `mc-sim` | はい。 |
| `applyCraftingImbue` | `mc-sim` | はい。 |
| `applyCraftingSpecial` | `mc-sim` | はい。 |
| `applySmithing` | `mc-sim` | はい。 |
| `applyStonecutting` | `mc-sim` | はい。 |
| `applyTransmute` | `mc-sim` | はい。 |
| `brewingState` | `mc-sim` | はい。 |
| `craftFromGrid` | `mc-sim` | はい。 |
| `emptyBrewingState` | `mc-sim` | はい。 |
| `emptyFurnaceState` | `mc-sim` | はい。 |
| `furnaceState` | `mc-sim` | はい。 |
| `cookingRecipe` | `mc-sim` | はい。 |
| `cookingRecipeForItem` | `mc-sim` | はい。 |
| `isCookingRecipe` | `mc-sim` | はい。 |
| `matchBrewingRecipe` | `mc-sim` | はい。 |
| `matchCookingRecipe` | `mc-sim` | はい。 |
| `matchCookingRecipes` | `mc-sim` | はい。 |
| `matchesCookingRecipe` | `mc-sim` | はい。 |
| `matchCraftingDyeRecipe` | `mc-sim` | はい。 |
| `matchCraftingDyeRecipes` | `mc-sim` | はい。 |
| `matchCraftingImbueRecipe` | `mc-sim` | はい。 |
| `matchCraftingImbueRecipes` | `mc-sim` | はい。 |
| `matchCraftingSpecialRecipe` | `mc-sim` | はい。 |
| `matchCraftingSpecialRecipes` | `mc-sim` | はい。 |
| `matchesCraftingDyeRecipe` | `mc-sim` | はい。 |
| `matchesCraftingImbueRecipe` | `mc-sim` | はい。 |
| `matchSmeltingRecipe` | `mc-sim` | はい。 |
| `matchSmithingRecipe` | `mc-sim` | はい。 |
| `matchesSmithingRecipe` | `mc-sim` | はい。 |
| `smithingInput` | `mc-sim` | はい。 |
| `SMITHING_STATION_TAG` | `mc-sim` | はい。 |
| `SMITHING_TRIM_MATERIAL_TAG` | `mc-sim` | はい。 |
| `SMITHING_TRIM_TEMPLATE_TAG` | `mc-sim` | はい。 |
| `SMITHING_TRIMMABLE_ARMOR_TAG` | `mc-sim` | はい。 |
| `VANILLA_SMITHING_RECIPES` | `mc-sim` | はい。 |
| `smithingTransformRecipe` | `mc-sim` | はい。 |
| `smithingTrimRecipe` | `mc-sim` | はい。 |
| `SmithingInput` | `mc-sim` | はい。 |
| `SmithingInputInput` | `mc-sim` | はい。 |
| `matchStonecuttingRecipe` | `mc-sim` | はい。 |
| `matchStonecuttingRecipes` | `mc-sim` | はい。 |
| `STONECUTTING_STATION_TAG` | `mc-sim` | はい。 |
| `stonecuttingRecipe` | `mc-sim` | はい。 |
| `VANILLA_STONECUTTING_RECIPES` | `mc-sim` | はい。 |
| `matchTransmuteRecipe` | `mc-sim` | はい。 |
| `matchTransmuteRecipes` | `mc-sim` | はい。 |
| `matchesTransmuteRecipe` | `mc-sim` | はい。 |
| `mixCraftingDyeColor` | `mc-sim` | はい。 |
| `isTransmuteMaterialCount` | `mc-sim` | はい。 |
| `isTransmuteRecipe` | `mc-sim` | はい。 |
| `transmuteRecipe` | `mc-sim` | はい。 |
| `transmuteRecipeForItem` | `mc-sim` | はい。 |
| `TRANSMUTE_MAX_MATERIAL_SLOTS` | `mc-sim` | はい。 |
| `applySettings` | `mc-sim` | はい。 |
| `isGraphicsQuality` | `mc-sim` | はい。 |
| `keyBindingFor` | `mc-sim` | はい。 |
| `isValidSettings` | `mc-sim` | はい。 |
| `counterOf` | `mc-sim` | はい。 |
| `isUnlocked` | `mc-sim` | はい。 |
| `isValidStatistics` | `mc-sim` | はい。 |
| `normaliseStatistics` | `mc-sim` | はい。 |
| `record` | `mc-sim` | はい。 |
| `unlock` | `mc-sim` | はい。 |
| `Statistics` | `mc-sim` | はい。 |
| `StatisticKey` | `mc-sim` | はい。 |
| `AchievementId` (statistics) | `mc-sim` | はい。 |
| `EMPTY_STATISTICS` | `mc-sim` | はい。 |
| `CookingApplyResult` | `mc-sim` | はい。 |
| `CookingMatch` | `mc-sim` | はい。 |
| `CookingRecipe` | `mc-sim` | はい。 |
| `CookingRecipeOptions` | `mc-sim` | はい。 |
| `CookingRecipeTable` | `mc-sim` | はい。 |
| `CraftOutcome` | `mc-sim` | はい。 |
| `CraftResult` | `mc-sim` | はい。 |
| `MissingIngredient` | `mc-sim` | はい。 |
| `RecipeConflict` | `mc-sim` | はい。 |
| `RecipeConflictReason` | `mc-sim` | はい。 |
| `RecipeIngredientAssignment` | `mc-sim` | はい。 |
| `RecipeMatch` | `mc-sim` | はい。 |
| `RecipeMatchWithAssignments` | `mc-sim` | はい。 |
| `CraftingDyeMatch` | `mc-sim` | はい。 |
| `CraftingImbueMatch` | `mc-sim` | はい。 |
| `CraftingBannerDuplicateMatch` | `mc-sim` | はい。 |
| `CraftingBookCloningMatch` | `mc-sim` | はい。 |
| `CraftingDecoratedPotMatch` | `mc-sim` | はい。 |
| `CraftingFireworkRocketMatch` | `mc-sim` | はい。 |
| `CraftingFireworkStarFadeMatch` | `mc-sim` | はい。 |
| `CraftingFireworkStarMatch` | `mc-sim` | はい。 |
| `CraftingMapExtendingMatch` | `mc-sim` | はい。 |
| `CraftingShieldDecorationMatch` | `mc-sim` | はい。 |
| `CraftingSpecialMatch` | `mc-sim` | はい。 |
| `CraftingDyeApplyResult` | `mc-sim` | はい。 |
| `CraftingImbueApplyResult` | `mc-sim` | はい。 |
| `CraftingBannerDuplicateApplyResult` | `mc-sim` | はい。 |
| `CraftingBookCloningApplyResult` | `mc-sim` | はい。 |
| `CraftingDecoratedPotApplyResult` | `mc-sim` | はい。 |
| `CraftingFireworkRocketApplyResult` | `mc-sim` | はい。 |
| `CraftingFireworkStarFadeApplyResult` | `mc-sim` | はい。 |
| `CraftingFireworkStarApplyResult` | `mc-sim` | はい。 |
| `CraftingMapExtendingApplyResult` | `mc-sim` | はい。 |
| `CraftingShieldDecorationApplyResult` | `mc-sim` | はい。 |
| `CraftingSpecialApplyResult` | `mc-sim` | はい。 |
| `SmithingOperation` | `mc-sim` | はい。 |
| `SmithingRecipe` | `mc-sim` | はい。 |
| `SmithingRecipeOptions` | `mc-sim` | はい。 |
| `SmithingRecipeTable` | `mc-sim` | はい。 |
| `SmithingTransformRecipe` | `mc-sim` | はい。 |
| `SmithingTrimRecipe` | `mc-sim` | はい。 |
| `StonecuttingApplyResult` | `mc-sim` | はい。 |
| `StonecuttingMatch` | `mc-sim` | はい。 |
| `StonecuttingRecipe` | `mc-sim` | はい。 |
| `StonecuttingRecipeOptions` | `mc-sim` | はい。 |
| `StonecuttingRecipeTable` | `mc-sim` | はい。 |
| `TransmuteApplyResult` | `mc-sim` | はい。 |
| `TransmuteInput` | `mc-sim` | はい。 |
| `TransmuteMatch` | `mc-sim` | はい。 |
| `TransmuteMaterialCount` | `mc-sim` | はい。 |
| `TransmuteRecipe` | `mc-sim` | はい。 |
| `TransmuteRecipeOptions` | `mc-sim` | はい。 |
| `TransmuteRecipeTable` | `mc-sim` | はい。 |
| `AnvilCustomName` | `mc-sim` | はい（金床のstate型またはsnapshot型を使う場合）。 |
| `AnvilEnchantmentId` | `mc-sim` | はい（金床のstate型またはsnapshot型を使う場合）。 |
| `AnvilMaterialCost` | `mc-sim` | はい（金床のstate型またはsnapshot型を使う場合）。 |

表の`AchievementId`（statistics）は、0.8で統計に使われた識別子です。0.9のrootから公開される`domain-event`の`AchievementId`は別の宣言です。

### 移行先ごとの追加削除export一覧

次に挙げるコード名は、それぞれ0.8で削除された別個のexportです。各節の移行先と0.8に固定するかどうかは、その節に並ぶすべての名前に適用されます。

#### `mc-sim`

対応する`mc-sim`のAPIが公開されるまで、`mc-kernel`は0.8に固定してください。

- 天候： `WeatherState`, `INITIAL_WEATHER_STATE`, `isValidWeatherState`, `normaliseWeatherState`.
- ブロック操作とワールド参照： `BlockBreakDecision`, `BlockPlacementDecision`, `PlaceableBlock`, `breakBlock`, `canReplaceBlock`, `placeBlock`, `placeableBlockFromItem`, `BlockWorld`, `BlockReader`, `BlockSource`, `emptyBlockWorld`, `blockAt`, `blockReaderOf`, `readBlockAt`, `setBlockAt`, `BlockEntities`, `emptyBlockEntities`, `blockEntityAt`, `setBlockEntity`, `clearBlockEntity`, `BEDROCK_HARDNESS`, `REFERENCE_UNBREAKABLE_HARDNESS`.
- 作物： `CropLocation`, `CropState`, `CropSnapshot`, `CropValidationError`, `CropValidationResult`, `isCropType`, `cropDefinitionFor`, `maturitySecsFor`, `canPlantCrop`, `isMatureCrop`, `matureYieldsFor`, `advanceCrop`, `advanceCropByBoneMeal`, `cropLocationKey`, `validateCropSnapshot`, `BONE_MEAL_GROWTH_SECS`, `CROP_REGISTRY`, `CROP_TYPES`, `NETHER_WART_MATURITY_SECS`, `POTATO_MATURITY_SECS`, `WHEAT_MATURITY_SECS`, `CropDefinition`, `CropType`.
- 金床の状態、スナップショット、計画、ルールセットのコンパイル： `ANVIL_SNAPSHOT_VERSION`, `ANVIL_MAX_CUSTOM_NAME_LENGTH`, `AnvilDurability`, `AnvilEnchantment`, `AnvilItemPayload`, `CanonicalAnvilItemPayload`, `AnvilInputStack`, `AnvilState`, `CanonicalAnvilState`, `AnvilEnchantmentRule`, `AnvilRepairMaterialRule`, `AnvilRuleSet`, `AnvilRuleInput`, `AnvilValidationIssue`, `AnvilSnapshot`, `AnvilSnapshotString`, `AnvilSnapshotResult`, `AnvilSnapshotEncodingResult`, `AnvilRejectionReason`, `AnvilPlan`, `AnvilApplyResult`, `isAnvilEnchantmentId`, `isAnvilCustomName`, `decodeAnvilSnapshot`, `decodeAnvilSnapshotString`, `encodeAnvilSnapshot`, `isAnvilSnapshotString`, `snapshotAnvilState`, `compileAnvilRuleSet`, `nextAnvilRepairCost`, `AnvilRuleSetCompilation`, `CompiledAnvilEnchantmentRule`, `CompiledAnvilRuleSet`, `planAnvil`, `applyAnvil`.
- 装備と耐久値： `isEquippableItemType`, `equipmentDefinitionFor`, `isDamageableItemType`, `Durability`, `EquipmentItem`, `ValidEquipmentItem`, `EquipmentSlots`, `Equipment`, `EquipmentValidationError`, `EquipmentValidationResult`, `EquipmentOutcome`, `DamageEquipmentResult`, `isEquipmentSlot`, `isDurability`, `isValidDurabilityForItem`, `isEquipmentItem`, `isEquipmentItemForSlot`, `durabilityForItem`, `durability`, `equipmentItem`, `emptyEquipment`, `equippedAt`, `equip`, `unequip`, `swapEquipment`, `damageEquipment`, `validateEquipmentSnapshot`.
- エンチャントの状態と候補： `isSupportedVanillaEnchantmentId`, `enchantmentRuleFor`, `enchantmentAppliesTo`, `enchantmentsConflict`, `planVanillaAnvil`, `applyVanillaAnvil`, `EnchantmentTableRandom`, `EnchantmentTableOffer`, `EnchantmentTableOffers`, `EnchantmentTableSlot`, `CalculateEnchantmentTableLevelCostInput`, `GenerateEnchantmentOffersInput`, `enchantmentTableCostAtLevel`, `calculateEnchantmentTableLevelCost`, `generateEnchantmentTableOffers`, `enchantmentTableOutputItemOf`, `ENCHANTMENT_TABLE_BOOK`, `ENCHANTMENT_TABLE_MAX_BOOKSHELVES`, `ENCHANTMENT_TABLE_SLOT_COUNT`, `EnchantmentTableItem`, `EnchantmentTableCost`, `VanillaEnchantmentTableRule`, `VANILLA_ENCHANTMENT_TABLE_RULES`, `ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY`, `EnchantmentTableRuleId`, `isEnchantmentTableRuleId`, `enchantmentTableRuleFor`, `itemEnchantabilityOf`.
- 砥石： `GrindstoneInput`, `GrindstoneOutput`, `GrindstoneFailureReason`, `GrindstonePlan`, `grindstoneExperienceFor`, `planGrindstone`, `GRINDSTONE_CURSE_ENCHANTMENT_IDS`, `GRINDSTONE_DURABILITY_BONUS_PERCENT`, `GRINDSTONE_REPAIR_COST_MAX`.
- インベントリ、ホットバー、エンティティ一覧： `emptyInventory`, `slotAt`, `countOf`, `isInventoryEmpty`, `AddOutcome`, `addItemStack`, `addItem`, `RemoveOutcome`, `RemoveAtResult`, `RemoveAtOutcome`, `removeItemAt`, `removeItem`, `NormaliseOutcome`, `normaliseInventory`, `isHotbarIndex`, `clampHotbarIndex`, `cycleHotbarIndex`, `hotbarSlotIndex`, `emptyRoster`, `spawnEntity`, `despawnEntity`, `findEntity`, `countOfKind`, `UNCHANGED`, `DESPAWNED`, `changed`, `sweepRoster`, `normaliseRoster`, `INVENTORY_SLOT_COUNT`, `Inventory`, `HOTBAR_SIZE`, `HOTBAR_START`.
- 爆発と起爆済みTNT： `planExplosion`, `applyExplosionPlan`, `primeTnt`, `planPrimedTnt`, `applyPrimedTntPlan`, `DEFAULT_TNT_FUSE_SECS`, `MAX_TNT_FUSE_ADVANCE_SECS`, `PrimedTntCommit`, `PrimedTntMutation`, `PrimedTntPlan`, `PrimedTntRequest`, `PrimedTntState`.
- 経験値、体力、空腹度： `experienceCostOfLevel`, `totalExperienceAtLevel`, `levelForTotalExperience`, `experienceLevel`, `experienceProgress`, `addExperience`, `isDead`, `applyDamage`, `heal`, `FoodTickSignal`, `addExhaustion`, `eat`, `advanceFoodTimer`, `respawn`, `DEFAULT_MAX_HEALTH_POINTS`, `DEFAULT_MAX_HUNGER_POINTS`, `SPAWN_SATURATION`, `EXHAUSTION_PER_POINT`, `MAX_EXHAUSTION`, `FOOD_TICK_SECS`, `REGEN_HUNGER_THRESHOLD`, `EXHAUSTION_PER_REGEN`, `DamageCause`, `Damage`, `Vitals`, `VitalsView`, `SPAWN_VITALS`, `isValidVitals`, `normaliseVitals`, `vitalsView`.
- 乗り物とウィザーの状態： `validateVehicleSnapshot`, `emptyVehicleSnapshot`, `createWither`, `stepWither`, `damageWither`, `witherSkullProjectile`, `matchWitherSummon`, `serializeWither`, `restoreWither`, `WITHER_ARMOUR_THRESHOLD`, `WITHER_FOLLOW_ACCELERATION`, `WITHER_MAX_HEALTH`, `WITHER_MAX_SPEED`, `WITHER_REGEN_PER_SEC`, `WITHER_SPAWN_CHARGE_SECS`, `BlockCell`, `WitherDamageKind`, `WitherDamageResult`, `WitherDeathDescriptor`, `WitherPhase`, `WitherSkullProjectileDescriptor`, `WitherSkullVariant`, `WitherSnapshot`, `WitherState`, `WitherStep`, `WitherSummonMatch`, `WitherSummonMaterial`.
- 時刻、ゲームルール、カメラ姿勢： `TICKS_PER_SECOND`, `MIN_DAY_LENGTH_SECS`, `MAX_DAY_LENGTH_SECS`, `MAX_TIME_FRACTION`, `MOON_PHASE_COUNT`, `TimeState`, `INITIAL_TIME_STATE`, `DEFAULT_DAY_LENGTH_SECS`, `clampDayLengthSecs`, `clampFraction`, `isValidTimeState`, `normaliseTimeState`, `timeOfDay`, `dayLengthSecs`, `moonPhase`, `isNight`, `advance`, `setDayLength`, `setTimeOfDay`, `setDayLengthThenTimeOfDay`, `normaliseGameRules`, `applyGameRules`, `isValidGameRules`, `DEFAULT_GAME_RULES`, `GAME_RULE_BOOLEAN_NAMES`, `GAME_RULE_INTEGER_NAMES`, `MAX_ENTITY_CRAMMING_MAX`, `MAX_ENTITY_CRAMMING_MIN`, `PLAYERS_SLEEPING_PERCENTAGE_MAX`, `PLAYERS_SLEEPING_PERCENTAGE_MIN`, `RANDOM_TICK_SPEED_MAX`, `RANDOM_TICK_SPEED_MIN`, `SPAWN_RADIUS_MAX`, `SPAWN_RADIUS_MIN`, `GameRuleBooleanName`, `GameRuleIntegerName`, `GameRules`, `PITCH_EPSILON`, `PITCH_MAX_RADIANS`, `PITCH_MIN_RADIANS`, `EYE_LEVEL_OFFSET`, `INITIAL_PLAYER_POSE`, `clampPitch`, `applyLook`, `withFeetPosition`, `cameraPoseOf`, `CameraOrientation`, `forwardVector`, `PlayerPose`.

#### `mx-gameplay`

対応する`mx-gameplay`のAPIが公開されるまで、`mc-kernel`は0.8に固定してください。

- 採掘とBedrockのアイテム／ブロックcomponent： `BreakTicksInput`, `miningSpeedOf`, `computeBreakTicks`, `blockHardnessOf`, `validateBedrockDiggerComponent`, `validateBedrockDestructibleByMining`, `resolveBedrockDiggerSpeed`, `bedrockDiggerUsesEfficiency`, `resolveBedrockDestructionSeconds`, `resolveBedrockItemSpecificDestroySpeed`, `DEFAULT_MINING_SPEED`, `TOOL_BREAK_SPEED`, `BEDROCK_DIGGER_MIN_FORMAT_VERSION`, `BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION`, `DEFAULT_BEDROCK_SECONDS_TO_DESTROY`, `BedrockTagQueryOperator`, `BedrockBlockStateValue`, `BedrockBlockStates`, `BedrockBlockDescriptor`, `BedrockBlock`, `BedrockDiggerDestroySpeed`, `BedrockDiggerComponent`, `BedrockItemDescriptor`, `BedrockItem`, `BedrockItemSpecificSpeed`, `BedrockDestructibleByMining`, `ParsedBedrockTagQuery`, `parseBedrockTagQuery`, `validateBedrockBlockDescriptor`, `validateBedrockItemDescriptor`, `bedrockTagQueryMatches`, `bedrockBlockDescriptorMatches`, `bedrockItemDescriptorMatches`, `validateBedrockBlockStates`, `validateBedrockDiggerSpeed`, `validateBedrockDestroySpeed`.
- 流体更新と食料摂取： `FluidLevel`, `fluidLevel`, `FluidCell`, `FluidState`, `emptyFluidState`, `fluidCellAt`, `setFluidCell`, `clearFluidCell`, `scheduleFluidAt`, `unscheduleFluidAt`, `FluidChange`, `FluidUpdate`, `fluidStateFromWorld`, `canFluidReplace`, `updateFluids`, `FoodConsumeResult`, `canEatFood`, `foodRemainderOf`, `consumeFood`.

#### `mx-redstone`

対応する`mx-redstone`のAPIが公開されるまで、`mc-kernel`は0.8に固定してください。

`HorizontalRedstoneFace`, `REDSTONE_REPEATER_DELAY_MIN_TICKS`, `REDSTONE_REPEATER_DELAY_MAX_TICKS`, `RepeaterDelayTicks`, `repeaterDelayTicks`, `RedstoneRepeater`, `RedstoneComparatorMode`, `RedstoneComparator`, `RedstoneObserver`, `RedstoneDevice`, `redstoneRepeater`, `redstoneComparator`, `redstoneObserver`, `collectRedstoneLayout`, `sourcePowerAt`, `deviceOutputFace`, `deviceOutputAtTarget`, `poweredWiresFrom`, `signalPowerAt`, `wirePowerChanges`, `blockIsWire`, `RedstonePower`, `redstonePower`, `RedstoneRepeaterTimer`, `RedstoneDeviceStateUpdate`, `RedstoneState`, `emptyRedstoneState`, `redstoneInputAt`, `redstonePowerAt`, `redstoneDevicePowerAt`, `redstoneDeviceAt`, `setRedstoneInput`, `clearRedstoneInput`, `setRedstoneDevice`, `clearRedstoneDevice`, `withRedstoneWirePowers`, `withRedstoneDeviceState`, `RedstoneChange`, `RedstoneUpdate`, `updateRedstone`, `DevicePowerContext`, `PendingWire`, `RedstoneDevicePlacement`, `RedstoneLayout`, `WirePropagation`, `WireQueue`.

#### `mc-worldgen`

対応する`mc-worldgen`のAPIが公開されるまで、`mc-kernel`は0.8に固定してください。

`LightCellInput`, `LightVolumeSource`, `LightSeed`, `LightBoundarySeeds`, `updateLight`, `detectNetherPortal`, `generatePortalLayout`.

#### `mc-physics`

現行の`mc-physics`公開root APIを使える場合、0.8への固定は不要です。`ProjectileEntity`、`ProjectileWorld`、`ProjectileHit`、`ProjectileStep`の名前は変わりません。`Arrow`は`Projectile`に、`ArrowLaunch`は`ProjectileLaunch`に対応します。`ARROW_GRAVITY`、`ARROW_AIR_DRAG`、`ARROW_WATER_DRAG`、`ARROW_MAX_LIFETIME_SECONDS`、`ARROW_SHOOTER_GRACE_SECONDS`は`ARROW_PROFILE`にまとまり、`launchArrow`は`launchProjectile`に、`stepArrow`は`stepProjectile`に対応します。

#### `mc-kernel`

現行の0.9 APIで置き換えられる場合、0.8への固定は不要です。`itemComponentPatchFromUnknown`と`itemComponentPatchFromUnknownEither`は`decodeItemComponentPatch`に、`mergeItemComponentPatchesEither`は`mergeItemComponentPatches`に置き換えます。

`GraphicsQuality`、`Settings`、設定の正規化API、キー割り当ての更新APIは引き続き公開されています。静的なエンチャント規則データもkernelに残ります。候補の生成と状態管理は`mc-sim`が担当し、エンチャントの適用は`mx-gameplay`が担当します。

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

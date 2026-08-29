import * as kernel from "../src/index";
import * as blockRegistry from "../src/domain/block-registry";
import * as blockInteraction from "../src/domain/block-interaction";
import * as blockWorldModule from "../src/domain/block-world";
import { BLOCK_TYPES, isBlockType } from "../src/domain/block-type";
import { BLOCK_PROPERTY_DEFAULTS } from "../src/domain/block-properties";
import {
  blockHardnessOf,
  computeBreakTicks,
  DEFAULT_MINING_SPEED,
  miningSpeedOf,
  TOOL_BREAK_SPEED,
} from "../src/domain/block-break-speed";
import * as bedrockMining from "../src/domain/bedrock-mining";
import * as brewingModule from "../src/domain/brewing";
import * as cookingModule from "../src/domain/cooking";
import * as cameraPoseModule from "../src/domain/camera-pose";
import * as dataPackRegistryModule from "../src/domain/data-pack-registry";
import * as cropModule from "../src/domain/crop";
import * as dimensionModule from "../src/domain/dimension";
import * as entityModule from "../src/domain/entity";
import * as sulfurCubeModule from "../src/domain/sulfur-cube";
import * as sulfurCubeRegistryModule from "../src/domain/sulfur-cube-registry";
import * as enchantmentModule from "../src/domain/enchantment";
import * as enchantmentTableModule from "../src/domain/enchantment-table";
import * as fluidModule from "../src/domain/fluid";
import * as fluidUpdateModule from "../src/domain/fluid-update";
import * as foodModule from "../src/domain/food";
import * as consumableModule from "../src/domain/consumable";
import * as useCooldownModule from "../src/domain/use-cooldown";
import * as grindstoneModule from "../src/domain/grindstone";
import * as equipmentModule from "../src/domain/equipment";
import * as frameTimingModule from "../src/domain/frame-timing";
import * as timeOfDayModule from "../src/domain/time-of-day";
import * as vitalsModule from "../src/domain/vitals";
import * as vehicleModule from "../src/domain/vehicle";
import * as weatherModule from "../src/domain/weather";
import * as witherModule from "../src/domain/wither";
import * as identifiersModule from "../src/domain/identifiers";
import * as jsonValueModule from "../src/domain/json-value";
import { ITEM_REGISTRY, itemIdOf } from "../src/domain/item-registry";
import { ITEM_TYPES, type ItemType, isItemType } from "../src/domain/item-type";
import * as itemComponentsModule from "../src/domain/item-components";
import * as itemComponentPatchModule from "../src/domain/item-component-patch";
import * as itemComponentValuesModule from "../src/domain/item-component-values";
import * as textComponentModule from "../src/domain/text-component";
import * as itemAttributeModifiersModule from "../src/domain/item-attribute-modifiers";
import * as itemCombatModule from "../src/domain/item-combat";
import * as itemDefenseModule from "../src/domain/item-defense";
import * as itemEnchantmentsModule from "../src/domain/item-enchantments";
import * as itemStackModule from "../src/domain/item-stack";
import * as toolComponentModule from "../src/domain/tool-component";
import * as weaponModule from "../src/domain/weapon";
import * as inventoryModule from "../src/domain/inventory";
import * as hotbarModule from "../src/domain/hotbar";
import * as quantitiesModule from "../src/domain/quantities";
import * as recipeModule from "../src/domain/recipe";
import * as recipeJsonModule from "../src/domain/recipe-json";
import * as recipeRegistryModule from "../src/domain/recipe-registry";
import * as craftingModule from "../src/domain/crafting";
import * as explosionModule from "../src/domain/explosion";
import * as primedTntModule from "../src/domain/primed-tnt";
import * as projectileModule from "../src/domain/projectile";
import * as portalModule from "../src/domain/portal";
import * as smeltingModule from "../src/domain/smelting";
import * as redstoneModule from "../src/domain/redstone";
import * as redstoneNetworkModule from "../src/domain/redstone-network";
import * as redstoneUpdateModule from "../src/domain/redstone-update";
import * as smithingModule from "../src/domain/smithing";
import * as stonecuttingModule from "../src/domain/stonecutting";
import * as transmuteModule from "../src/domain/transmute";
import * as biomeModule from "../src/domain/biome";
import * as blockEntityModule from "../src/domain/block-entity";
import * as damageTypeModule from "../src/domain/damage-type";
import * as gameModeModule from "../src/domain/game-mode";
import * as gameRuleModule from "../src/domain/game-rule";
import * as entityTypeModule from "../src/domain/entity-type";
import * as heightmapModule from "../src/domain/heightmap";
import * as lightModule from "../src/domain/light";
import * as randomSourceModule from "../src/domain/random-source";
import * as statusEffectModule from "../src/domain/status-effect";
import * as tagMembershipModule from "../src/domain/tag-membership";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";

const ORIGIN_AXIS = 0;
const FIRST_BLOCK_TYPE_INDEX = 0;
const ENCHANTED_BOOK_ID = 136;
const BOOK_ID = 203;
const SINGLE_ITEM_STACK = 1;
const BUCKET_ID = 137;
const BUCKET_MAX_STACK = 16;
const FISHING_ROD_ID = 142;
const SADDLE_ID = 151;
const STANDARD_ITEM_STACK = 64;
const PUBLIC_ITEM_TYPES = [
  "bow",
  "arrow",
  "bone_meal",
  "lily_pad",
  "potion_of_regeneration",
  "enchanted_book",
  "book",
  "fishing_rod",
  "cod",
  "shears",
  "wool",
  "gold_ingot",
  "netherite_upgrade_smithing_template",
  "diamond_helmet",
  "netherite_helmet",
] as const;

/**
 * The shape shared by every "this item's barrel-exported metadata is what it
 * should be" assertion below: known, stackable by the pinned amount, and not
 * placeable. `id` is only checked where the test is pinning a stable numeric
 * item id rather than merely a stack-size class.
 */
const expectCanonicalItem = (
  item: ItemType,
  { id, maxStack }: { readonly id?: number; readonly maxStack: number },
) => {
  expect(kernel.isItemType(item), item).toBe(true);
  if (id !== undefined) {
    expect(kernel.itemIdOf(item), item).toBe(id);
  }
  expect(kernel.maxStackCountOfItem(item), item).toBe(maxStack);
  expect(kernel.isPlaceableItem(item), item).toBe(false);
};

describe("BlockType", () => {
  it("narrows a string that names a known block", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(isBlockType("stone")).toBe(true);
        expect(isBlockType("air")).toBe(true);
        expect(isBlockType(BLOCK_TYPES[FIRST_BLOCK_TYPE_INDEX])).toBe(true);
      }),
    ));

  it("rejects a string that does not, so save files and network frames cannot smuggle one in", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(isBlockType("unobtainium")).toBe(false);
        expect(isBlockType("")).toBe(false);
        expect(isBlockType("Stone")).toBe(false);
      }),
    ));

  it("accepts every block in the provisional roster", () =>
    Effect.runPromise(
      Effect.sync(() => {
        for (const blockType of BLOCK_TYPES) {
          expect(isBlockType(blockType)).toBe(true);
        }
        expect(new Set(BLOCK_TYPES).size).toBe(BLOCK_TYPES.length);
      }),
    ));
});

describe("public API surface", () => {
  // The barrel is what all 15 other repositories import. A re-export dropped
  // Here is invisible to every other test in this repository but breaks the
  // Whole organisation, so it is pinned explicitly.
  it("re-exports every value the other repositories are expected to import", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const expected = [
          // Identifiers
          "WorldId",
          "StageId",
          "ResourceLocation",
          "NamespacedResourceLocation",
          "TagLocation",
          "UUID",
          // Strict JSON and recipe data-pack boundaries
          "isJsonValue",
          "jsonValueFromUnknown",
          "jsonValuesEqual",
          "ItemComponentPatchKey",
          "isItemComponentPatch",
          "itemComponentPatchFromUnknown",
          "itemComponentPatch",
          "itemComponentPatchesEqual",
          // Quantities
          "StackCount",
          "MAX_STACK_COUNT",
          "DeltaTimeSecs",
          "MonotonicTimeSecs",
          "CooldownSeconds",
          "ConsumeSeconds",
          "EpochMillis",
          "MaxStackSize",
          "MaxDamage",
          "ItemDamage",
          "RepairCost",
          "WeaponDisableBlockingSeconds",
          "PotionDurationScale",
          "AdditionalTradeCost",
          "MapId",
          "BlockingDelaySeconds",
          "DisableCooldownScale",
          "DamageReductionBase",
          "DamageReductionFactor",
          "HorizontalBlockingAngle",
          "ItemDamageThreshold",
          "ItemDamageBase",
          "ItemDamageFactor",
          "EnchantmentLevel",
          "AttributeModifierAmount",
          "Bounciness",
          "EntityPhysicsModifier",
          "EntityVisibilityDistance",
          "KnockbackResistance",
          // Coordinates
          "CHUNK_SIZE_XZ",
          "BlockAxis",
          "ChunkAxis",
          "LocalAxis",
          "position",
          "blockPosition",
          "BlockPositionKey",
          "blockPositionKeyOf",
          "isBlockPositionKey",
          "blockPositionOfKey",
          "decodeBlockPositionKey",
          "BLOCK_FACES",
          "HORIZONTAL_BLOCK_FACES",
          "isBlockFace",
          "oppositeBlockFace",
          "adjacentBlockPosition",
          "horizontalBlockNeighbours",
          "blockNeighbours",
          "chunkCoord",
          "ChunkKey",
          "chunkKeyOf",
          "isChunkKey",
          "chunkCoordOfKey",
          "decodeChunkKey",
          "blockPositionOfPosition",
          "chunkCoordOfBlock",
          "localCoordOfBlock",
          "blockPositionOfChunkLocal",
          "aabb",
          "aabbOfBlock",
          "aabbIntersects",
          "aabbContainsPoint",
          // Data-pack registry
          "DataPackFormat",
          "DataPackPriority",
          "dataPackLayer",
          "dataPackLayerFromUnknown",
          "dataPackLayerFromUnknownWithId",
          "mapDataPackLayer",
          "selectDataPackRegistry",
          "dataPackResourcePath",
          // Versioned chunk storage boundary
          "CHUNK_CODEC_VERSION",
          "CHUNK_HEADER_BYTES",
          "ChunkBlocks",
          "EncodedChunk",
          "ChunkHeight",
          "MAX_CHUNK_HEIGHT",
          "chunk",
          "chunkBlockCount",
          "encodeChunk",
          "decodeChunk",
          "BlockState",
          "blockState",
          // Block types
          "BLOCK_TYPES",
          "isBlockType",
          // Item types — plan.md §3.1's other literal vocabulary
          "ITEM_TYPES",
          "isItemType",
          // Stable item ids, storage codec, and stack metadata
          "ItemId",
          "ItemIdBytes",
          "ITEM_ID_MAX",
          "ITEM_ID_BYTES",
          "ITEM_REGISTRY",
          "ITEM_IDS",
          "isKnownItemId",
          "itemDefinitionOf",
          "maxStackCountOfItem",
          "itemIdOf",
          "itemTypeOfId",
          "encodeItemId",
          "decodeItemId",
          // Generic item components and their portable defaults
          "ITEM_COMPONENT_IDS",
          "ITEM_RARITIES",
          "ITEMS_WITH_SINGLE_STACK_LIMIT",
          "ITEMS_WITH_SIXTEEN_STACK_LIMIT",
          "ITEM_TOOL_COMPONENTS",
          "itemComponentStackLimitOf",
          "itemComponents",
          "itemToolComponentOf",
          "isItemComponents",
          "textComponent",
          "isTextComponent",
          "DYE_COLORS",
          "EQUIPPABLE_SLOTS",
          "potionDurationScaleComponent",
          "additionalTradeCostComponent",
          "breakSoundComponent",
          "customDataComponent",
          "entityDataComponent",
          "bucketEntityDataComponent",
          "profileComponent",
          "blockEntityDataComponent",
          "beesComponent",
          "potionContentsComponent",
          "providesBannerPatternsComponent",
          "providesTrimMaterialComponent",
          "dyeComponent",
          "dyedColorComponent",
          "customModelDataComponent",
          "mapIdComponent",
          "blockStateComponent",
          "instrumentComponent",
          "noteBlockSoundComponent",
          "recipesComponent",
          "lockComponent",
          "tooltipStyleComponent",
          "baseColorComponent",
          "equippableComponent",
          "gliderComponent",
          "deathProtectionComponent",
          "repairableComponent",
          "enchantableComponent",
          "jukeboxPlayableComponent",
          "ominousBottleAmplifierComponent",
          "paintingVariantComponent",
          "sulfurCubeContentComponent",
          "tooltipDisplayComponent",
          "isPotionDurationScaleComponent",
          "isAdditionalTradeCostComponent",
          "isSulfurCubeContentOptions",
          "isSulfurCubeContentComponent",
          "isBreakSoundComponent",
          "isCustomDataComponent",
          "isProvidesBannerPatternsComponent",
          "isProvidesTrimMaterialComponent",
          "isDyeComponent",
          "isDyedColorComponent",
          "isCustomModelDataOptions",
          "isCustomModelDataComponent",
          "isMapIdComponent",
          "isBlockStateComponent",
          "isInstrumentComponent",
          "isNoteBlockSoundComponent",
          "isRecipesComponent",
          "isLockComponent",
          "isTooltipStyleComponent",
          "isBaseColorComponent",
          "isItemComponentNbtValue",
          "isItemComponentNbtObject",
          "isEntityDataOptions",
          "isEntityDataComponent",
          "isBucketEntityDataOptions",
          "isBucketEntityDataComponent",
          "isProfileOptions",
          "isProfileComponent",
          "isBlockEntityDataOptions",
          "isBlockEntityDataComponent",
          "isBeesOptions",
          "isBeesComponent",
          "isPotionContentsOptions",
          "isPotionContentsComponent",
          "isResourceLocationProvider",
          "isEquippableOptions",
          "isEquippableComponent",
          "isGliderComponent",
          "isDeathProtectionOptions",
          "isDeathProtectionComponent",
          "isRepairableComponent",
          "isEnchantableValue",
          "isEnchantableComponent",
          "isJukeboxPlayableComponent",
          "isOminousBottleAmplifierComponent",
          "isPaintingVariantComponent",
          "isTooltipDisplayComponent",
          "SWING_ANIMATION_TYPES",
          "useEffectsComponent",
          "minimumAttackChargeComponent",
          "damageTypeComponent",
          "swingAnimationComponent",
          "attackRangeComponent",
          "isUseEffectsComponent",
          "isMinimumAttackChargeComponent",
          "isDamageTypeComponent",
          "isSwingAnimationComponent",
          "isAttackRangeComponent",
          "blocksAttacksComponent",
          "damageResistantComponent",
          "isBlocksAttacksComponent",
          "isDamageReductionRule",
          "isDamageResistantComponent",
          "isItemDamageRule",
          "ATTRIBUTE_MODIFIER_OPERATIONS",
          "ATTRIBUTE_MODIFIER_SLOTS",
          "attributeModifierDisplay",
          "attributeModifier",
          "attributeModifiersComponent",
          "isAttributeModifierDisplay",
          "isAttributeModifier",
          "isAttributeModifiersComponent",
          "enchantmentsComponent",
          "storedEnchantmentsComponent",
          "isEnchantmentLevelMap",
          "isEnchantmentsComponent",
          "isStoredEnchantmentsComponent",
          // Item stacks and recipe matching
          "maxStackCountForItem",
          "itemStack",
          "itemStackFromUnknown",
          "isItemStack",
          // Fixed player inventory value operations
          "INVENTORY_SLOT_COUNT",
          "emptyInventory",
          "slotAt",
          "countOf",
          "isInventoryEmpty",
          "addItem",
          "removeItemAt",
          "removeItem",
          "normaliseInventory",
          // Hotbar selection projection
          "HOTBAR_SIZE",
          "HOTBAR_START",
          "isHotbarIndex",
          "clampHotbarIndex",
          "cycleHotbarIndex",
          "hotbarSlotIndex",
          // Equipment data, validation, and pure slot operations
          "EQUIPMENT_SLOTS",
          "EQUIPMENT_CATALOG",
          "ITEM_DURABILITY_CATALOG",
          "isEquippableItemType",
          "equipmentDefinitionFor",
          "isDamageableItemType",
          "itemDurabilityDefinitionFor",
          "isEquipmentSlot",
          "isDurability",
          "isValidDurabilityForItem",
          "isEquipmentItem",
          "isEquipmentItemForSlot",
          "durabilityForItem",
          "durability",
          "equipmentItem",
          "emptyEquipment",
          "equippedAt",
          "equip",
          "unequip",
          "swapEquipment",
          "damageEquipment",
          "validateEquipmentSnapshot",
          // Pure vanilla enchantment data and anvil composition.
          "SUPPORTED_VANILLA_ENCHANTMENT_IDS",
          "VANILLA_ENCHANTMENT_COSTS",
          "SUPPORTED_VANILLA_BOOK_ENCHANTMENT_RULES",
          "SUPPORTED_VANILLA_ITEM_ENCHANTMENT_RULES",
          "SUPPORTED_VANILLA_ENCHANTMENT_RULES",
          "SUPPORTED_VANILLA_BOOK_ANVIL_RULE_SET",
          "SUPPORTED_VANILLA_ITEM_ANVIL_RULE_SET",
          "SUPPORTED_VANILLA_ANVIL_RULE_SET",
          "isSupportedVanillaEnchantmentId",
          "enchantmentRuleFor",
          "enchantmentAppliesTo",
          "enchantmentsConflict",
          "planVanillaAnvil",
          "applyVanillaAnvil",
          // Pure vanilla enchanting-table data and offer generation.
          "ENCHANTMENT_TABLE_BOOK",
          "ENCHANTMENT_TABLE_MAX_BOOKSHELVES",
          "ENCHANTMENT_TABLE_SLOT_COUNT",
          "VANILLA_ENCHANTMENT_TABLE_RULES",
          "ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY",
          "isEnchantmentTableRuleId",
          "enchantmentTableRuleFor",
          "itemEnchantabilityOf",
          "enchantmentTableCostAtLevel",
          "calculateEnchantmentTableLevelCost",
          "generateEnchantmentTableOffers",
          "enchantmentTableOutputItemOf",
          // Pure vanilla grindstone composition and curse preservation.
          "GRINDSTONE_CURSE_ENCHANTMENT_IDS",
          "GRINDSTONE_DURABILITY_BONUS_PERCENT",
          "GRINDSTONE_REPAIR_COST_MAX",
          "grindstoneExperienceFor",
          "planGrindstone",
          "MAX_RECIPE_SIDE",
          "exactly",
          "tagged",
          "craftingRecipeFromUnknown",
          "craftingRecipeDataPath",
          "cookingRecipeFromUnknown",
          "stonecuttingRecipeFromUnknown",
          "smithingTransformRecipeFromUnknown",
          "smithingTrimRecipeFromUnknown",
          "smithingRecipeFromUnknown",
          "transmuteRecipeFromUnknown",
          "portableRecipeFromUnknown",
          "recipeFromUnknown",
          "recipeDataPath",
          "recipeDataPackLayer",
          "recipeDataPackLayerFromUnknown",
          "selectRecipes",
          "recipeDataPackPath",
          "shapedRecipe",
          "shapelessRecipe",
          "craftGrid",
          "cellAt",
          "ingredientMatches",
          "matchesShaped",
          "matchesShapeless",
          "matchesRecipe",
          "matchRecipe",
          "matchRecipeWithAssignments",
          "conflictsIn",
          "VANILLA_CRAFTING_RECIPES",
          "craftFromGrid",
          // Pure cooking data and logic
          "COOKING_STATIONS",
          "VANILLA_FUEL_RULES",
          "VANILLA_SMELTING_RECIPES",
          "furnaceState",
          "emptyFurnaceState",
          "matchSmeltingRecipe",
          "advanceFurnace",
          "cookingRecipe",
          "cookingRecipeForItem",
          "isCookingRecipe",
          "matchesCookingRecipe",
          "matchCookingRecipes",
          "matchCookingRecipe",
          "applyCooking",
          "TRANSMUTE_MAX_MATERIAL_SLOTS",
          "isTransmuteMaterialCount",
          "isTransmuteRecipe",
          "transmuteRecipe",
          "transmuteRecipeForItem",
          "matchesTransmuteRecipe",
          "matchTransmuteRecipes",
          "matchTransmuteRecipe",
          "applyTransmute",
          // Pure crop and dimension data and logic
          "DIMENSIONS",
          "isDimension",
          // Pure entity vocabulary, lifecycle operations, and roster repair
          "EntityId",
          "EntityKind",
          "isEntityId",
          "isEntityKind",
          "ENTITY_ID_PREFIX",
          "mintEntityId",
          "serialOfEntityId",
          "NO_ENTITIES",
          "repairState",
          "emptyRoster",
          "spawnEntity",
          "despawnEntity",
          "findEntity",
          "countOfKind",
          "UNCHANGED",
          "DESPAWNED",
          "changed",
          "sweepRoster",
          "normaliseRoster",
          "ENTITY_ATTRIBUTE_DEFINITIONS",
          "ENTITY_ATTRIBUTE_NAMES",
          "DEFAULT_ENTITY_ATTRIBUTES",
          "entityAttributes",
          "entityAttributeDefinitionOf",
          "effectiveBounciness",
          "isEntityAttributeOptions",
          "isEntityAttributes",
          "SULFUR_CUBE_ARCHETYPE_REGISTRY",
          "SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS",
          "SULFUR_CUBE_BLOCK_TAGS",
          "SULFUR_CUBE_COMPONENTS",
          "SULFUR_CUBE_DAMAGE_TYPES",
          "SULFUR_CUBE_DAMAGE_TYPE_TAGS",
          "SULFUR_CUBE_ENTITY_TAGS",
          "SULFUR_CUBE_GAME_EVENTS",
          "SULFUR_CUBE_ITEM_TAGS",
          "SULFUR_CUBE_PARTICLES",
          "sulfurCubeArchetype",
          "sulfurCubeArchetypeFromUnknown",
          "isSulfurCubeArchetype",
          "isSulfurCubeArchetypeOptions",
          "sulfurCubeArchetypeDataPackLayer",
          "sulfurCubeArchetypeDataPackLayerFromUnknown",
          "selectSulfurCubeArchetypes",
          "sulfurCubeArchetypeDataPath",
          "CROP_TYPES",
          "CROP_REGISTRY",
          "WHEAT_MATURITY_SECS",
          "POTATO_MATURITY_SECS",
          "NETHER_WART_MATURITY_SECS",
          "BONE_MEAL_GROWTH_SECS",
          "isCropType",
          "cropDefinitionFor",
          "maturitySecsFor",
          "canPlantCrop",
          "isMatureCrop",
          "matureYieldsFor",
          "advanceCrop",
          "advanceCropByBoneMeal",
          "cropLocationKey",
          // Pure brewing data and logic
          "BREWING_BOTTLE_SLOTS",
          "BREWING_FUEL_ITEM",
          "BREWING_MAX_FUEL_CHARGES",
          "BREWING_TIME_SECS",
          "VANILLA_BREWING_RECIPES",
          "brewingState",
          "emptyBrewingState",
          "matchBrewingRecipe",
          "addBrewingFuel",
          "advanceBrewing",
          // Pure fluid vocabulary and persistent fluid-cell state
          "FLUID_BLOCK_IDS",
          "FLUID_MIX_BLOCK_IDS",
          "FLUID_LEVEL_MIN",
          "FLUID_LEVEL_MAX",
          "FLUID_LEVEL_STEP",
          "SOURCE_FLUID_LEVEL",
          "FLOWING_FLUID_LEVEL",
          "blockIdOfFluidKind",
          "fluidKindOfBlockId",
          "fluidLevel",
          "emptyFluidState",
          "fluidCellAt",
          "setFluidCell",
          "clearFluidCell",
          "scheduleFluidAt",
          "unscheduleFluidAt",
          "fluidStateFromWorld",
          "canFluidReplace",
          "updateFluids",
          // Pure food data and consumption logic
          "FOOD_DEFINITION_BY_ITEM",
          "VANILLA_FOOD_DEFINITIONS",
          "foodDefinitionOf",
          "canEatFood",
          "foodRemainderOf",
          "consumeFood",
          "CONSUMABLE_ANIMATIONS",
          "DEFAULT_CONSUMABLE_COMPONENT",
          "consumableApplyEffects",
          "consumableClearAllEffects",
          "consumableComponent",
          "foodComponentOf",
          "consumableComponentOf",
          "consumablePlaySound",
          "consumableRemoveEffects",
          "consumableStatusEffect",
          "consumableTeleportRandomly",
          "useRemainderComponentOf",
          "itemUseComponentsOf",
          "isConsumableComponent",
          "isConsumableEffect",
          "isConsumableStatusEffect",
          "isFoodComponent",
          "isItemUseComponents",
          "isUseRemainderComponent",
          "useCooldownComponent",
          "cooldownExpiresAt",
          "isCooldownActive",
          "isUseCooldownComponent",
          "weaponComponent",
          "isWeaponComponent",
          // Pure block-world access and mutation
          "emptyBlockWorld",
          "blockAt",
          "blockReaderOf",
          "readBlockAt",
          "setBlockAt",
          // Pure redstone vocabulary, devices, and persistent signal state
          "REDSTONE_POWER_MIN",
          "REDSTONE_POWER_MAX",
          "REDSTONE_POWER_STEP",
          "REDSTONE_BLOCK_IDS",
          "REDSTONE_REPEATER_DELAY_MIN_TICKS",
          "REDSTONE_REPEATER_DELAY_MAX_TICKS",
          "repeaterDelayTicks",
          "redstoneRepeater",
          "redstoneComparator",
          "redstoneObserver",
          "redstonePower",
          "emptyRedstoneState",
          "redstoneInputAt",
          "redstonePowerAt",
          "redstoneDevicePowerAt",
          "redstoneDeviceAt",
          "setRedstoneInput",
          "clearRedstoneInput",
          "setRedstoneDevice",
          "clearRedstoneDevice",
          "withRedstoneWirePowers",
          "withRedstoneDeviceState",
          // Pure redstone network and update logic
          "collectRedstoneLayout",
          "sourcePowerAt",
          "deviceOutputFace",
          "deviceOutputAtTarget",
          "poweredWiresFrom",
          "signalPowerAt",
          "wirePowerChanges",
          "blockIsWire",
          "updateRedstone",
          // Pure smithing data and logic
          "SMITHING_STATION_TAG",
          "SMITHING_TRIM_TEMPLATE_TAG",
          "SMITHING_TRIMMABLE_ARMOR_TAG",
          "SMITHING_TRIM_MATERIAL_TAG",
          "VANILLA_SMITHING_RECIPES",
          "smithingTransformRecipe",
          "smithingTrimRecipe",
          "smithingInput",
          "matchesSmithingRecipe",
          "matchSmithingRecipe",
          "applySmithing",
          // Pure stonecutting data and logic
          "STONECUTTING_STATION_TAG",
          "VANILLA_STONECUTTING_RECIPES",
          "stonecuttingRecipe",
          "matchStonecuttingRecipes",
          "matchStonecuttingRecipe",
          "applyStonecutting",
          // Pure projectile data and logic
          "ARROW_GRAVITY",
          "ARROW_AIR_DRAG",
          "ARROW_WATER_DRAG",
          "ARROW_MAX_LIFETIME_SECONDS",
          "ARROW_SHOOTER_GRACE_SECONDS",
          "launchArrow",
          "stepArrow",
          // Pure Nether portal frame geometry
          "MIN_PORTAL_WIDTH",
          "MAX_PORTAL_WIDTH",
          "MIN_PORTAL_HEIGHT",
          "MAX_PORTAL_HEIGHT",
          "detectNetherPortal",
          "generatePortalLayout",
          // Pure explosion and primed-TNT data and logic
          "DEFAULT_EXPLOSION_LIMITS",
          "planExplosion",
          "applyExplosionPlan",
          "DEFAULT_TNT_FUSE_SECS",
          "MAX_TNT_FUSE_ADVANCE_SECS",
          "primeTnt",
          "planPrimedTnt",
          "applyPrimedTntPlan",
          // Pure block-break-speed data and logic
          "DEFAULT_MINING_SPEED",
          "TOOL_BREAK_SPEED",
          "blockHardnessOf",
          "computeBreakTicks",
          "miningSpeedOf",
          "compileToolComponent",
          "resolveToolMiningProperties",
          "isToolComponent",
          // Bedrock mining components remain separate from Java's minecraft:tool.
          "BEDROCK_DIGGER_MIN_FORMAT_VERSION",
          "BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION",
          "DEFAULT_BEDROCK_SECONDS_TO_DESTROY",
          "parseBedrockTagQuery",
          "validateBedrockBlockDescriptor",
          "validateBedrockItemDescriptor",
          "bedrockTagQueryMatches",
          "bedrockBlockDescriptorMatches",
          "bedrockItemDescriptorMatches",
          "validateBedrockBlockStates",
          "validateBedrockDiggerSpeed",
          "validateBedrockDestroySpeed",
          "validateBedrockDiggerComponent",
          "validateBedrockDestructibleByMining",
          "resolveBedrockDiggerSpeed",
          "bedrockDiggerUsesEfficiency",
          "resolveBedrockDestructionSeconds",
          "resolveBedrockItemSpecificDestroySpeed",
          // Deterministic anvil planning, application, and persistence boundary
          "ANVIL_SNAPSHOT_VERSION",
          "ANVIL_TOO_EXPENSIVE_LEVEL",
          "ANVIL_REPAIR_BONUS_RATIO",
          "ANVIL_MAX_CUSTOM_NAME_LENGTH",
          "AnvilEnchantmentId",
          "AnvilCustomName",
          "AnvilSnapshotString",
          "snapshotAnvilState",
          "decodeAnvilSnapshot",
          "encodeAnvilSnapshot",
          "decodeAnvilSnapshotString",
          "nextAnvilRepairCost",
          "planAnvil",
          "applyAnvil",
          // The block -> item bridge (audit §6-8's intersection, derived)
          "PLACEABLE_ITEM_TYPES",
          "NON_PLACEABLE_ITEM_TYPES",
          "UNITEMISED_BLOCK_TYPES",
          "isPlaceableItem",
          "itemOfBlock",
          "blockOfPlaceableItem",
          // Block capability flags (booleans)
          "BLOCK_CAPABILITY_DEFAULTS",
          "BLOCK_CAPABILITY_FLAGS",
          "TRUE_BY_DEFAULT_CAPABILITY_FLAGS",
          "resolveBlockCapabilities",
          "capabilityOf",
          // Block properties (typed values)
          "BLOCK_PROPERTY_DEFAULTS",
          "UNBREAKABLE_HARDNESS",
          "BLOCK_PROPERTY_NAMES",
          "BLOCK_OPACITIES",
          "FLUID_KINDS",
          "COLLISION_SHAPES",
          "RENDER_KINDS",
          "RAIL_KINDS",
          "LIGHT_LEVEL_MIN",
          "LIGHT_LEVEL_MAX",
          "LightLevel",
          "isLightLevel",
          "clampLightLevel",
          "resolveBlockProperties",
          "propertyOf",
          // The two struct properties, kept in their own module for API-lock review
          "HARVEST_TOOL_CATEGORIES",
          "HARVEST_TIERS",
          "DEFAULT_HARVEST_TOOL",
          "DEFAULT_BLOCK_DROP",
          "satisfiesHarvestTier",
          "resolveDropItem",
          "BARE_HANDED",
          "resolveDrop",
          // Block interaction decisions
          "BEDROCK_HARDNESS",
          "REFERENCE_UNBREAKABLE_HARDNESS",
          "breakBlock",
          "canReplaceBlock",
          "placeBlock",
          "placeableBlockFromItem",
          // SupportRule (audit §4.6), in its own module for the same reason: its
          // Value is a list of BLOCK NAMES, so it is the one property that can go
          // Stale when a different block's row changes.
          "NEEDS_NO_SUPPORT",
          "NEEDS_ANY_SUPPORT",
          "needsOneOf",
          "isSupportSensitive",
          "satisfiesSupportRule",
          // Block definitions
          "blockCapabilitiesOf",
          "blockPropertiesOf",
          "resolveBlock",
          "AUDITED_CAPABILITY_NAMES",
          "DOWNSTREAM_CAPABILITIES",
          // Block registry — the numeric-id codec and the table
          "BlockId",
          "BLOCK_ID_MAX",
          "AIR_BLOCK_ID",
          "isEmpty",
          "BLOCK_REGISTRY",
          "BLOCK_IDS",
          "isKnownBlockId",
          "blockIdOf",
          "blockTypeOfId",
          "resolvedBlockOfId",
          "capabilityOfBlockId",
          "propertyOfBlockId",
          "capabilitiesOfBlockId",
          "blockIdsWithCapability",
          "blockIdsWithOpacity",
          // The named light readings — mc-worldgen mirrors these three by name,
          // Because it cannot restate the generic property machinery to ask two
          // Questions. See `domain/block-registry.ts` on why they are the only
          // Named property readings kernel exports.
          "opacityOfBlockId",
          "lightEmissionOfBlockId",
          "transmitsLight",
          // The support readings and the two-byte join. `canBlockStaySupported` is
          // `dropOfBlockId`'s shape — a join no single accessor can express — and
          // Mx-gameplay is its consumer.
          "supportRuleOfBlockId",
          "isSupportSensitiveBlockId",
          "canBlockStaySupported",
          "dropOfBlockId",
          "UNREGISTERED_BLOCK_TYPES",
          // Camera
          "snapshotAgeSecs",
          "PITCH_EPSILON",
          "PITCH_MAX_RADIANS",
          "PITCH_MIN_RADIANS",
          "EYE_LEVEL_OFFSET",
          "INITIAL_PLAYER_POSE",
          "clampPitch",
          "applyLook",
          "withFeetPosition",
          "cameraPoseOf",
          "forwardVector",
          // Clock
          "ClockPort",
          "fixedClock",
          "FixedClockLayer",
          "monotonicSecs",
          "wallClockEpochMillis",
          // Frame timing
          "MIN_FRAME_DELTA_SECS",
          "MAX_FRAME_DELTA_SECS",
          "FIRST_FRAME_DELTA_SECS",
          "clampFrameDelta",
          "frameDeltaBetween",
          "frameDeltaLossSecs",
          "frameDeltaLossBetween",
          // Pure day/night policy and weather state validation
          "TICKS_PER_SECOND",
          "MIN_DAY_LENGTH_SECS",
          "MAX_DAY_LENGTH_SECS",
          "MAX_TIME_FRACTION",
          "MOON_PHASE_COUNT",
          "INITIAL_TIME_STATE",
          "DEFAULT_DAY_LENGTH_SECS",
          "clampDayLengthSecs",
          "clampFraction",
          "isValidTimeState",
          "normaliseTimeState",
          "timeOfDay",
          "dayLengthSecs",
          "moonPhase",
          "isNight",
          "advance",
          "setDayLength",
          "setTimeOfDay",
          "setDayLengthThenTimeOfDay",
          "WEATHERS",
          "DEFAULT_WEATHER_REMAINING_SECS",
          "INITIAL_WEATHER_STATE",
          "isWeather",
          "isValidWeatherState",
          "normaliseWeatherState",
          // Pure player vitals model and calculations
          "DEFAULT_MAX_HEALTH_POINTS",
          "DEFAULT_MAX_HUNGER_POINTS",
          "SPAWN_SATURATION",
          "EXHAUSTION_PER_POINT",
          "MAX_EXHAUSTION",
          "FOOD_TICK_SECS",
          "REGEN_HUNGER_THRESHOLD",
          "EXHAUSTION_PER_REGEN",
          "SPAWN_VITALS",
          "isDead",
          "applyDamage",
          "heal",
          "addExhaustion",
          "eat",
          "advanceFoodTimer",
          "experienceCostOfLevel",
          "totalExperienceAtLevel",
          "levelForTotalExperience",
          "experienceLevel",
          "experienceProgress",
          "addExperience",
          "respawn",
          "isValidVitals",
          "normaliseVitals",
          "vitalsView",
          // Pure vehicle vocabulary and snapshot validation
          "VEHICLE_TYPES",
          "isVehicleType",
          "VehicleId",
          "OccupantId",
          "validateVehicleSnapshot",
          "emptyVehicleSnapshot",
          "WITHER_MAX_HEALTH",
          "WITHER_SPAWN_CHARGE_SECS",
          "WITHER_ARMOUR_THRESHOLD",
          "WITHER_REGEN_PER_SEC",
          "WITHER_FOLLOW_ACCELERATION",
          "WITHER_MAX_SPEED",
          "createWither",
          "stepWither",
          "damageWither",
          "witherSkullProjectile",
          "matchWitherSummon",
          "serializeWither",
          "restoreWither",
        ];

        for (const name of expected) {
          expect(Object.keys(kernel)).toContain(name);
        }
      }),
    ));

  it("exposes the same implementations through the barrel as through the modules", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(kernel.isBlockType).toBe(isBlockType);
        expect(kernel.BLOCK_TYPES).toBe(BLOCK_TYPES);
        expect(kernel.isItemType).toBe(isItemType);
        expect(kernel.ITEM_TYPES).toBe(ITEM_TYPES);
        expect(kernel.ITEM_REGISTRY).toBe(ITEM_REGISTRY);
        expect(kernel.itemIdOf).toBe(itemIdOf);
        expect(kernel.DEFAULT_MINING_SPEED).toBe(DEFAULT_MINING_SPEED);
        expect(kernel.TOOL_BREAK_SPEED).toBe(TOOL_BREAK_SPEED);
        expect(kernel.blockHardnessOf).toBe(blockHardnessOf);
        expect(kernel.computeBreakTicks).toBe(computeBreakTicks);
        expect(kernel.miningSpeedOf).toBe(miningSpeedOf);
        expect(kernel.BEDROCK_DIGGER_MIN_FORMAT_VERSION).toBe(
          bedrockMining.BEDROCK_DIGGER_MIN_FORMAT_VERSION,
        );
        expect(kernel.parseBedrockTagQuery).toBe(
          bedrockMining.parseBedrockTagQuery,
        );
        expect(kernel.resolveBedrockDiggerSpeed).toBe(
          bedrockMining.resolveBedrockDiggerSpeed,
        );
        expect(kernel.itemStack).toBe(itemStackModule.itemStack);
        expect(kernel.itemStackFromUnknown).toBe(
          itemStackModule.itemStackFromUnknown,
        );
        expect(kernel.isItemStack).toBe(itemStackModule.isItemStack);
        expect(kernel.INVENTORY_SLOT_COUNT).toBe(
          inventoryModule.INVENTORY_SLOT_COUNT,
        );
        expect(kernel.emptyInventory).toBe(inventoryModule.emptyInventory);
        expect(kernel.slotAt).toBe(inventoryModule.slotAt);
        expect(kernel.countOf).toBe(inventoryModule.countOf);
        expect(kernel.isInventoryEmpty).toBe(inventoryModule.isInventoryEmpty);
        expect(kernel.addItem).toBe(inventoryModule.addItem);
        expect(kernel.removeItemAt).toBe(inventoryModule.removeItemAt);
        expect(kernel.removeItem).toBe(inventoryModule.removeItem);
        expect(kernel.normaliseInventory).toBe(
          inventoryModule.normaliseInventory,
        );
        expect(kernel.HOTBAR_SIZE).toBe(hotbarModule.HOTBAR_SIZE);
        expect(kernel.HOTBAR_START).toBe(hotbarModule.HOTBAR_START);
        expect(kernel.isHotbarIndex).toBe(hotbarModule.isHotbarIndex);
        expect(kernel.clampHotbarIndex).toBe(hotbarModule.clampHotbarIndex);
        expect(kernel.cycleHotbarIndex).toBe(hotbarModule.cycleHotbarIndex);
        expect(kernel.hotbarSlotIndex).toBe(hotbarModule.hotbarSlotIndex);
        expect(kernel.TagLocation).toBe(identifiersModule.TagLocation);
        expect(kernel.UUID).toBe(identifiersModule.UUID);
        expect(kernel.ResourceLocation).toBe(
          identifiersModule.ResourceLocation,
        );
        expect(kernel.NamespacedResourceLocation).toBe(
          identifiersModule.NamespacedResourceLocation,
        );
        expect(kernel.isJsonValue).toBe(jsonValueModule.isJsonValue);
        expect(kernel.jsonValueFromUnknown).toBe(
          jsonValueModule.jsonValueFromUnknown,
        );
        expect(kernel.jsonValuesEqual).toBe(jsonValueModule.jsonValuesEqual);
        expect(kernel.ItemComponentPatchKey).toBe(
          itemComponentPatchModule.ItemComponentPatchKey,
        );
        expect(kernel.isItemComponentPatch).toBe(
          itemComponentPatchModule.isItemComponentPatch,
        );
        expect(kernel.itemComponentPatchFromUnknown).toBe(
          itemComponentPatchModule.itemComponentPatchFromUnknown,
        );
        expect(kernel.itemComponentPatch).toBe(
          itemComponentPatchModule.itemComponentPatch,
        );
        expect(kernel.itemComponentPatchesEqual).toBe(
          itemComponentPatchModule.itemComponentPatchesEqual,
        );
        expect(kernel.DataPackFormat).toBe(
          dataPackRegistryModule.DataPackFormat,
        );
        expect(kernel.DataPackPriority).toBe(
          dataPackRegistryModule.DataPackPriority,
        );
        expect(kernel.dataPackLayer).toBe(dataPackRegistryModule.dataPackLayer);
        expect(kernel.dataPackLayerFromUnknown).toBe(
          dataPackRegistryModule.dataPackLayerFromUnknown,
        );
        expect(kernel.dataPackLayerFromUnknownWithId).toBe(
          dataPackRegistryModule.dataPackLayerFromUnknownWithId,
        );
        expect(kernel.mapDataPackLayer).toBe(
          dataPackRegistryModule.mapDataPackLayer,
        );
        expect(kernel.selectDataPackRegistry).toBe(
          dataPackRegistryModule.selectDataPackRegistry,
        );
        expect(kernel.dataPackResourcePath).toBe(
          dataPackRegistryModule.dataPackResourcePath,
        );
        expect(kernel.MAX_STACK_COUNT).toBe(quantitiesModule.MAX_STACK_COUNT);
        expect(kernel.StackCount).toBe(quantitiesModule.StackCount);
        expect(kernel.DeltaTimeSecs).toBe(quantitiesModule.DeltaTimeSecs);
        expect(kernel.MonotonicTimeSecs).toBe(
          quantitiesModule.MonotonicTimeSecs,
        );
        expect(kernel.CooldownSeconds).toBe(quantitiesModule.CooldownSeconds);
        expect(kernel.ConsumeSeconds).toBe(quantitiesModule.ConsumeSeconds);
        expect(kernel.EpochMillis).toBe(quantitiesModule.EpochMillis);
        expect(kernel.WeaponDisableBlockingSeconds).toBe(
          quantitiesModule.WeaponDisableBlockingSeconds,
        );
        expect(kernel.PotionDurationScale).toBe(
          quantitiesModule.PotionDurationScale,
        );
        expect(kernel.AdditionalTradeCost).toBe(
          quantitiesModule.AdditionalTradeCost,
        );
        expect(kernel.MapId).toBe(quantitiesModule.MapId);
        expect(kernel.BlockingDelaySeconds).toBe(
          quantitiesModule.BlockingDelaySeconds,
        );
        expect(kernel.DisableCooldownScale).toBe(
          quantitiesModule.DisableCooldownScale,
        );
        expect(kernel.DamageReductionBase).toBe(
          quantitiesModule.DamageReductionBase,
        );
        expect(kernel.DamageReductionFactor).toBe(
          quantitiesModule.DamageReductionFactor,
        );
        expect(kernel.HorizontalBlockingAngle).toBe(
          quantitiesModule.HorizontalBlockingAngle,
        );
        expect(kernel.ItemDamageThreshold).toBe(
          quantitiesModule.ItemDamageThreshold,
        );
        expect(kernel.ItemDamageBase).toBe(quantitiesModule.ItemDamageBase);
        expect(kernel.ItemDamageFactor).toBe(quantitiesModule.ItemDamageFactor);
        expect(kernel.EnchantmentLevel).toBe(quantitiesModule.EnchantmentLevel);
        expect(kernel.AttributeModifierAmount).toBe(
          quantitiesModule.AttributeModifierAmount,
        );
        expect(kernel.Bounciness).toBe(quantitiesModule.Bounciness);
        expect(kernel.EntityPhysicsModifier).toBe(
          quantitiesModule.EntityPhysicsModifier,
        );
        expect(kernel.EntityVisibilityDistance).toBe(
          quantitiesModule.EntityVisibilityDistance,
        );
        expect(kernel.KnockbackResistance).toBe(
          quantitiesModule.KnockbackResistance,
        );
        expect(kernel.ITEM_COMPONENT_IDS).toBe(
          itemComponentsModule.ITEM_COMPONENT_IDS,
        );
        expect(kernel.ITEM_RARITIES).toBe(itemComponentsModule.ITEM_RARITIES);
        expect(kernel.ITEMS_WITH_SINGLE_STACK_LIMIT).toBe(
          itemComponentsModule.ITEMS_WITH_SINGLE_STACK_LIMIT,
        );
        expect(kernel.ITEMS_WITH_SIXTEEN_STACK_LIMIT).toBe(
          itemComponentsModule.ITEMS_WITH_SIXTEEN_STACK_LIMIT,
        );
        expect(kernel.ITEM_TOOL_COMPONENTS).toBe(
          itemComponentsModule.ITEM_TOOL_COMPONENTS,
        );
        expect(kernel.itemComponentStackLimitOf).toBe(
          itemComponentsModule.itemComponentStackLimitOf,
        );
        expect(kernel.itemComponents).toBe(itemComponentsModule.itemComponents);
        expect(kernel.itemToolComponentOf).toBe(
          itemComponentsModule.itemToolComponentOf,
        );
        expect(kernel.isItemComponents).toBe(
          itemComponentsModule.isItemComponents,
        );
        expect(kernel.textComponent).toBe(textComponentModule.textComponent);
        expect(kernel.isTextComponent).toBe(
          textComponentModule.isTextComponent,
        );
        expect(kernel.DYE_COLORS).toBe(itemComponentValuesModule.DYE_COLORS);
        expect(kernel.EQUIPPABLE_SLOTS).toBe(
          itemComponentValuesModule.EQUIPPABLE_SLOTS,
        );
        expect(kernel.potionDurationScaleComponent).toBe(
          itemComponentValuesModule.potionDurationScaleComponent,
        );
        expect(kernel.additionalTradeCostComponent).toBe(
          itemComponentValuesModule.additionalTradeCostComponent,
        );
        expect(kernel.breakSoundComponent).toBe(
          itemComponentValuesModule.breakSoundComponent,
        );
        expect(kernel.customDataComponent).toBe(
          itemComponentValuesModule.customDataComponent,
        );
        expect(kernel.entityDataComponent).toBe(
          itemComponentValuesModule.entityDataComponent,
        );
        expect(kernel.bucketEntityDataComponent).toBe(
          itemComponentValuesModule.bucketEntityDataComponent,
        );
        expect(kernel.profileComponent).toBe(
          itemComponentValuesModule.profileComponent,
        );
        expect(kernel.blockEntityDataComponent).toBe(
          itemComponentValuesModule.blockEntityDataComponent,
        );
        expect(kernel.beesComponent).toBe(
          itemComponentValuesModule.beesComponent,
        );
        expect(kernel.potionContentsComponent).toBe(
          itemComponentValuesModule.potionContentsComponent,
        );
        expect(kernel.providesBannerPatternsComponent).toBe(
          itemComponentValuesModule.providesBannerPatternsComponent,
        );
        expect(kernel.providesTrimMaterialComponent).toBe(
          itemComponentValuesModule.providesTrimMaterialComponent,
        );
        expect(kernel.dyeComponent).toBe(
          itemComponentValuesModule.dyeComponent,
        );
        expect(kernel.dyedColorComponent).toBe(
          itemComponentValuesModule.dyedColorComponent,
        );
        expect(kernel.customModelDataComponent).toBe(
          itemComponentValuesModule.customModelDataComponent,
        );
        expect(kernel.mapIdComponent).toBe(
          itemComponentValuesModule.mapIdComponent,
        );
        expect(kernel.blockStateComponent).toBe(
          itemComponentValuesModule.blockStateComponent,
        );
        expect(kernel.instrumentComponent).toBe(
          itemComponentValuesModule.instrumentComponent,
        );
        expect(kernel.noteBlockSoundComponent).toBe(
          itemComponentValuesModule.noteBlockSoundComponent,
        );
        expect(kernel.recipesComponent).toBe(
          itemComponentValuesModule.recipesComponent,
        );
        expect(kernel.lockComponent).toBe(
          itemComponentValuesModule.lockComponent,
        );
        expect(kernel.tooltipStyleComponent).toBe(
          itemComponentValuesModule.tooltipStyleComponent,
        );
        expect(kernel.baseColorComponent).toBe(
          itemComponentValuesModule.baseColorComponent,
        );
        expect(kernel.equippableComponent).toBe(
          itemComponentValuesModule.equippableComponent,
        );
        expect(kernel.gliderComponent).toBe(
          itemComponentValuesModule.gliderComponent,
        );
        expect(kernel.deathProtectionComponent).toBe(
          itemComponentValuesModule.deathProtectionComponent,
        );
        expect(kernel.repairableComponent).toBe(
          itemComponentValuesModule.repairableComponent,
        );
        expect(kernel.enchantableComponent).toBe(
          itemComponentValuesModule.enchantableComponent,
        );
        expect(kernel.jukeboxPlayableComponent).toBe(
          itemComponentValuesModule.jukeboxPlayableComponent,
        );
        expect(kernel.ominousBottleAmplifierComponent).toBe(
          itemComponentValuesModule.ominousBottleAmplifierComponent,
        );
        expect(kernel.paintingVariantComponent).toBe(
          itemComponentValuesModule.paintingVariantComponent,
        );
        expect(kernel.sulfurCubeContentComponent).toBe(
          itemComponentValuesModule.sulfurCubeContentComponent,
        );
        expect(kernel.tooltipDisplayComponent).toBe(
          itemComponentValuesModule.tooltipDisplayComponent,
        );
        expect(kernel.isPotionDurationScaleComponent).toBe(
          itemComponentValuesModule.isPotionDurationScaleComponent,
        );
        expect(kernel.isAdditionalTradeCostComponent).toBe(
          itemComponentValuesModule.isAdditionalTradeCostComponent,
        );
        expect(kernel.isSulfurCubeContentOptions).toBe(
          itemComponentValuesModule.isSulfurCubeContentOptions,
        );
        expect(kernel.isSulfurCubeContentComponent).toBe(
          itemComponentValuesModule.isSulfurCubeContentComponent,
        );
        expect(kernel.isBreakSoundComponent).toBe(
          itemComponentValuesModule.isBreakSoundComponent,
        );
        expect(kernel.isProvidesBannerPatternsComponent).toBe(
          itemComponentValuesModule.isProvidesBannerPatternsComponent,
        );
        expect(kernel.isProvidesTrimMaterialComponent).toBe(
          itemComponentValuesModule.isProvidesTrimMaterialComponent,
        );
        expect(kernel.isDyeComponent).toBe(
          itemComponentValuesModule.isDyeComponent,
        );
        expect(kernel.isDyedColorComponent).toBe(
          itemComponentValuesModule.isDyedColorComponent,
        );
        expect(kernel.isCustomModelDataOptions).toBe(
          itemComponentValuesModule.isCustomModelDataOptions,
        );
        expect(kernel.isCustomModelDataComponent).toBe(
          itemComponentValuesModule.isCustomModelDataComponent,
        );
        expect(kernel.isMapIdComponent).toBe(
          itemComponentValuesModule.isMapIdComponent,
        );
        expect(kernel.isBlockStateComponent).toBe(
          itemComponentValuesModule.isBlockStateComponent,
        );
        expect(kernel.isInstrumentComponent).toBe(
          itemComponentValuesModule.isInstrumentComponent,
        );
        expect(kernel.isNoteBlockSoundComponent).toBe(
          itemComponentValuesModule.isNoteBlockSoundComponent,
        );
        expect(kernel.isRecipesComponent).toBe(
          itemComponentValuesModule.isRecipesComponent,
        );
        expect(kernel.isLockComponent).toBe(
          itemComponentValuesModule.isLockComponent,
        );
        expect(kernel.isTooltipStyleComponent).toBe(
          itemComponentValuesModule.isTooltipStyleComponent,
        );
        expect(kernel.isBaseColorComponent).toBe(
          itemComponentValuesModule.isBaseColorComponent,
        );
        expect(kernel.isItemComponentNbtValue).toBe(
          itemComponentValuesModule.isItemComponentNbtValue,
        );
        expect(kernel.isItemComponentNbtObject).toBe(
          itemComponentValuesModule.isItemComponentNbtObject,
        );
        expect(kernel.isEntityDataOptions).toBe(
          itemComponentValuesModule.isEntityDataOptions,
        );
        expect(kernel.isEntityDataComponent).toBe(
          itemComponentValuesModule.isEntityDataComponent,
        );
        expect(kernel.isBucketEntityDataOptions).toBe(
          itemComponentValuesModule.isBucketEntityDataOptions,
        );
        expect(kernel.isBucketEntityDataComponent).toBe(
          itemComponentValuesModule.isBucketEntityDataComponent,
        );
        expect(kernel.isProfileOptions).toBe(
          itemComponentValuesModule.isProfileOptions,
        );
        expect(kernel.isProfileComponent).toBe(
          itemComponentValuesModule.isProfileComponent,
        );
        expect(kernel.isBlockEntityDataOptions).toBe(
          itemComponentValuesModule.isBlockEntityDataOptions,
        );
        expect(kernel.isBlockEntityDataComponent).toBe(
          itemComponentValuesModule.isBlockEntityDataComponent,
        );
        expect(kernel.isBeesOptions).toBe(
          itemComponentValuesModule.isBeesOptions,
        );
        expect(kernel.isBeesComponent).toBe(
          itemComponentValuesModule.isBeesComponent,
        );
        expect(kernel.isPotionContentsOptions).toBe(
          itemComponentValuesModule.isPotionContentsOptions,
        );
        expect(kernel.isPotionContentsComponent).toBe(
          itemComponentValuesModule.isPotionContentsComponent,
        );
        expect(kernel.isResourceLocationProvider).toBe(
          itemComponentValuesModule.isResourceLocationProvider,
        );
        expect(kernel.isEquippableOptions).toBe(
          itemComponentValuesModule.isEquippableOptions,
        );
        expect(kernel.isEquippableComponent).toBe(
          itemComponentValuesModule.isEquippableComponent,
        );
        expect(kernel.isGliderComponent).toBe(
          itemComponentValuesModule.isGliderComponent,
        );
        expect(kernel.isDeathProtectionOptions).toBe(
          itemComponentValuesModule.isDeathProtectionOptions,
        );
        expect(kernel.isDeathProtectionComponent).toBe(
          itemComponentValuesModule.isDeathProtectionComponent,
        );
        expect(kernel.isRepairableComponent).toBe(
          itemComponentValuesModule.isRepairableComponent,
        );
        expect(kernel.isEnchantableValue).toBe(
          itemComponentValuesModule.isEnchantableValue,
        );
        expect(kernel.isEnchantableComponent).toBe(
          itemComponentValuesModule.isEnchantableComponent,
        );
        expect(kernel.isJukeboxPlayableComponent).toBe(
          itemComponentValuesModule.isJukeboxPlayableComponent,
        );
        expect(kernel.isOminousBottleAmplifierComponent).toBe(
          itemComponentValuesModule.isOminousBottleAmplifierComponent,
        );
        expect(kernel.isPaintingVariantComponent).toBe(
          itemComponentValuesModule.isPaintingVariantComponent,
        );
        expect(kernel.isTooltipDisplayComponent).toBe(
          itemComponentValuesModule.isTooltipDisplayComponent,
        );
        expect(kernel.ATTRIBUTE_MODIFIER_OPERATIONS).toBe(
          itemAttributeModifiersModule.ATTRIBUTE_MODIFIER_OPERATIONS,
        );
        expect(kernel.ATTRIBUTE_MODIFIER_SLOTS).toBe(
          itemAttributeModifiersModule.ATTRIBUTE_MODIFIER_SLOTS,
        );
        expect(kernel.attributeModifierDisplay).toBe(
          itemAttributeModifiersModule.attributeModifierDisplay,
        );
        expect(kernel.attributeModifier).toBe(
          itemAttributeModifiersModule.attributeModifier,
        );
        expect(kernel.attributeModifiersComponent).toBe(
          itemAttributeModifiersModule.attributeModifiersComponent,
        );
        expect(kernel.isAttributeModifierDisplay).toBe(
          itemAttributeModifiersModule.isAttributeModifierDisplay,
        );
        expect(kernel.isAttributeModifier).toBe(
          itemAttributeModifiersModule.isAttributeModifier,
        );
        expect(kernel.isAttributeModifiersComponent).toBe(
          itemAttributeModifiersModule.isAttributeModifiersComponent,
        );
        expect(kernel.SWING_ANIMATION_TYPES).toBe(
          itemCombatModule.SWING_ANIMATION_TYPES,
        );
        expect(kernel.useEffectsComponent).toBe(
          itemCombatModule.useEffectsComponent,
        );
        expect(kernel.minimumAttackChargeComponent).toBe(
          itemCombatModule.minimumAttackChargeComponent,
        );
        expect(kernel.damageTypeComponent).toBe(
          itemCombatModule.damageTypeComponent,
        );
        expect(kernel.swingAnimationComponent).toBe(
          itemCombatModule.swingAnimationComponent,
        );
        expect(kernel.attackRangeComponent).toBe(
          itemCombatModule.attackRangeComponent,
        );
        expect(kernel.isUseEffectsComponent).toBe(
          itemCombatModule.isUseEffectsComponent,
        );
        expect(kernel.isMinimumAttackChargeComponent).toBe(
          itemCombatModule.isMinimumAttackChargeComponent,
        );
        expect(kernel.isDamageTypeComponent).toBe(
          itemCombatModule.isDamageTypeComponent,
        );
        expect(kernel.isSwingAnimationComponent).toBe(
          itemCombatModule.isSwingAnimationComponent,
        );
        expect(kernel.isAttackRangeComponent).toBe(
          itemCombatModule.isAttackRangeComponent,
        );
        expect(kernel.blocksAttacksComponent).toBe(
          itemDefenseModule.blocksAttacksComponent,
        );
        expect(kernel.damageResistantComponent).toBe(
          itemDefenseModule.damageResistantComponent,
        );
        expect(kernel.isBlocksAttacksComponent).toBe(
          itemDefenseModule.isBlocksAttacksComponent,
        );
        expect(kernel.isDamageReductionRule).toBe(
          itemDefenseModule.isDamageReductionRule,
        );
        expect(kernel.isDamageResistantComponent).toBe(
          itemDefenseModule.isDamageResistantComponent,
        );
        expect(kernel.isItemDamageRule).toBe(
          itemDefenseModule.isItemDamageRule,
        );
        expect(kernel.enchantmentsComponent).toBe(
          itemEnchantmentsModule.enchantmentsComponent,
        );
        expect(kernel.storedEnchantmentsComponent).toBe(
          itemEnchantmentsModule.storedEnchantmentsComponent,
        );
        expect(kernel.isEnchantmentLevelMap).toBe(
          itemEnchantmentsModule.isEnchantmentLevelMap,
        );
        expect(kernel.isEnchantmentsComponent).toBe(
          itemEnchantmentsModule.isEnchantmentsComponent,
        );
        expect(kernel.isStoredEnchantmentsComponent).toBe(
          itemEnchantmentsModule.isStoredEnchantmentsComponent,
        );
        expect(kernel.isToolComponent).toBe(
          toolComponentModule.isToolComponent,
        );
        expect(kernel.weaponComponent).toBe(weaponModule.weaponComponent);
        expect(kernel.isWeaponComponent).toBe(weaponModule.isWeaponComponent);
        expect(kernel.EQUIPMENT_CATALOG).toBe(
          equipmentModule.EQUIPMENT_CATALOG,
        );
        expect(kernel.ITEM_DURABILITY_CATALOG).toBe(
          equipmentModule.ITEM_DURABILITY_CATALOG,
        );
        expect(kernel.equip).toBe(equipmentModule.equip);
        expect(kernel.damageEquipment).toBe(equipmentModule.damageEquipment);
        expect(kernel.SUPPORTED_VANILLA_ANVIL_RULE_SET).toBe(
          enchantmentModule.SUPPORTED_VANILLA_ANVIL_RULE_SET,
        );
        expect(kernel.planVanillaAnvil).toBe(
          enchantmentModule.planVanillaAnvil,
        );
        expect(kernel.generateEnchantmentTableOffers).toBe(
          enchantmentTableModule.generateEnchantmentTableOffers,
        );
        expect(kernel.VANILLA_ENCHANTMENT_TABLE_RULES).toBe(
          enchantmentTableModule.VANILLA_ENCHANTMENT_TABLE_RULES,
        );
        expect(kernel.GRINDSTONE_CURSE_ENCHANTMENT_IDS).toBe(
          grindstoneModule.GRINDSTONE_CURSE_ENCHANTMENT_IDS,
        );
        expect(kernel.GRINDSTONE_DURABILITY_BONUS_PERCENT).toBe(
          grindstoneModule.GRINDSTONE_DURABILITY_BONUS_PERCENT,
        );
        expect(kernel.GRINDSTONE_REPAIR_COST_MAX).toBe(
          grindstoneModule.GRINDSTONE_REPAIR_COST_MAX,
        );
        expect(kernel.grindstoneExperienceFor).toBe(
          grindstoneModule.grindstoneExperienceFor,
        );
        expect(kernel.planGrindstone).toBe(grindstoneModule.planGrindstone);
        expect(kernel.MIN_FRAME_DELTA_SECS).toBe(
          frameTimingModule.MIN_FRAME_DELTA_SECS,
        );
        expect(kernel.MAX_FRAME_DELTA_SECS).toBe(
          frameTimingModule.MAX_FRAME_DELTA_SECS,
        );
        expect(kernel.FIRST_FRAME_DELTA_SECS).toBe(
          frameTimingModule.FIRST_FRAME_DELTA_SECS,
        );
        expect(kernel.clampFrameDelta).toBe(frameTimingModule.clampFrameDelta);
        expect(kernel.frameDeltaBetween).toBe(
          frameTimingModule.frameDeltaBetween,
        );
        expect(kernel.frameDeltaLossSecs).toBe(
          frameTimingModule.frameDeltaLossSecs,
        );
        expect(kernel.frameDeltaLossBetween).toBe(
          frameTimingModule.frameDeltaLossBetween,
        );
        expect(kernel.PITCH_EPSILON).toBe(cameraPoseModule.PITCH_EPSILON);
        expect(kernel.PITCH_MAX_RADIANS).toBe(
          cameraPoseModule.PITCH_MAX_RADIANS,
        );
        expect(kernel.PITCH_MIN_RADIANS).toBe(
          cameraPoseModule.PITCH_MIN_RADIANS,
        );
        expect(kernel.EYE_LEVEL_OFFSET).toBe(cameraPoseModule.EYE_LEVEL_OFFSET);
        expect(kernel.INITIAL_PLAYER_POSE).toBe(
          cameraPoseModule.INITIAL_PLAYER_POSE,
        );
        expect(kernel.clampPitch).toBe(cameraPoseModule.clampPitch);
        expect(kernel.applyLook).toBe(cameraPoseModule.applyLook);
        expect(kernel.withFeetPosition).toBe(cameraPoseModule.withFeetPosition);
        expect(kernel.cameraPoseOf).toBe(cameraPoseModule.cameraPoseOf);
        expect(kernel.forwardVector).toBe(cameraPoseModule.forwardVector);
        expect(kernel.TICKS_PER_SECOND).toBe(timeOfDayModule.TICKS_PER_SECOND);
        expect(kernel.MIN_DAY_LENGTH_SECS).toBe(
          timeOfDayModule.MIN_DAY_LENGTH_SECS,
        );
        expect(kernel.MAX_DAY_LENGTH_SECS).toBe(
          timeOfDayModule.MAX_DAY_LENGTH_SECS,
        );
        expect(kernel.MAX_TIME_FRACTION).toBe(
          timeOfDayModule.MAX_TIME_FRACTION,
        );
        expect(kernel.MOON_PHASE_COUNT).toBe(timeOfDayModule.MOON_PHASE_COUNT);
        expect(kernel.INITIAL_TIME_STATE).toBe(
          timeOfDayModule.INITIAL_TIME_STATE,
        );
        expect(kernel.DEFAULT_DAY_LENGTH_SECS).toBe(
          timeOfDayModule.DEFAULT_DAY_LENGTH_SECS,
        );
        expect(kernel.clampDayLengthSecs).toBe(
          timeOfDayModule.clampDayLengthSecs,
        );
        expect(kernel.clampFraction).toBe(timeOfDayModule.clampFraction);
        expect(kernel.isValidTimeState).toBe(timeOfDayModule.isValidTimeState);
        expect(kernel.normaliseTimeState).toBe(
          timeOfDayModule.normaliseTimeState,
        );
        expect(kernel.timeOfDay).toBe(timeOfDayModule.timeOfDay);
        expect(kernel.dayLengthSecs).toBe(timeOfDayModule.dayLengthSecs);
        expect(kernel.moonPhase).toBe(timeOfDayModule.moonPhase);
        expect(kernel.isNight).toBe(timeOfDayModule.isNight);
        expect(kernel.advance).toBe(timeOfDayModule.advance);
        expect(kernel.setDayLength).toBe(timeOfDayModule.setDayLength);
        expect(kernel.setTimeOfDay).toBe(timeOfDayModule.setTimeOfDay);
        expect(kernel.setDayLengthThenTimeOfDay).toBe(
          timeOfDayModule.setDayLengthThenTimeOfDay,
        );
        expect(kernel.WEATHERS).toBe(weatherModule.WEATHERS);
        expect(kernel.DEFAULT_WEATHER_REMAINING_SECS).toBe(
          weatherModule.DEFAULT_WEATHER_REMAINING_SECS,
        );
        expect(kernel.INITIAL_WEATHER_STATE).toBe(
          weatherModule.INITIAL_WEATHER_STATE,
        );
        expect(kernel.isWeather).toBe(weatherModule.isWeather);
        expect(kernel.isValidWeatherState).toBe(
          weatherModule.isValidWeatherState,
        );
        expect(kernel.normaliseWeatherState).toBe(
          weatherModule.normaliseWeatherState,
        );
        expect(kernel.DEFAULT_MAX_HEALTH_POINTS).toBe(
          vitalsModule.DEFAULT_MAX_HEALTH_POINTS,
        );
        expect(kernel.DEFAULT_MAX_HUNGER_POINTS).toBe(
          vitalsModule.DEFAULT_MAX_HUNGER_POINTS,
        );
        expect(kernel.SPAWN_SATURATION).toBe(vitalsModule.SPAWN_SATURATION);
        expect(kernel.EXHAUSTION_PER_POINT).toBe(
          vitalsModule.EXHAUSTION_PER_POINT,
        );
        expect(kernel.MAX_EXHAUSTION).toBe(vitalsModule.MAX_EXHAUSTION);
        expect(kernel.FOOD_TICK_SECS).toBe(vitalsModule.FOOD_TICK_SECS);
        expect(kernel.REGEN_HUNGER_THRESHOLD).toBe(
          vitalsModule.REGEN_HUNGER_THRESHOLD,
        );
        expect(kernel.EXHAUSTION_PER_REGEN).toBe(
          vitalsModule.EXHAUSTION_PER_REGEN,
        );
        expect(kernel.SPAWN_VITALS).toBe(vitalsModule.SPAWN_VITALS);
        expect(kernel.isDead).toBe(vitalsModule.isDead);
        expect(kernel.applyDamage).toBe(vitalsModule.applyDamage);
        expect(kernel.heal).toBe(vitalsModule.heal);
        expect(kernel.addExhaustion).toBe(vitalsModule.addExhaustion);
        expect(kernel.eat).toBe(vitalsModule.eat);
        expect(kernel.advanceFoodTimer).toBe(vitalsModule.advanceFoodTimer);
        expect(kernel.experienceCostOfLevel).toBe(
          vitalsModule.experienceCostOfLevel,
        );
        expect(kernel.totalExperienceAtLevel).toBe(
          vitalsModule.totalExperienceAtLevel,
        );
        expect(kernel.levelForTotalExperience).toBe(
          vitalsModule.levelForTotalExperience,
        );
        expect(kernel.experienceLevel).toBe(vitalsModule.experienceLevel);
        expect(kernel.experienceProgress).toBe(vitalsModule.experienceProgress);
        expect(kernel.addExperience).toBe(vitalsModule.addExperience);
        expect(kernel.respawn).toBe(vitalsModule.respawn);
        expect(kernel.isValidVitals).toBe(vitalsModule.isValidVitals);
        expect(kernel.normaliseVitals).toBe(vitalsModule.normaliseVitals);
        expect(kernel.vitalsView).toBe(vitalsModule.vitalsView);
        expect(kernel.VEHICLE_TYPES).toBe(vehicleModule.VEHICLE_TYPES);
        expect(kernel.isVehicleType).toBe(vehicleModule.isVehicleType);
        expect(kernel.VehicleId).toBe(vehicleModule.VehicleId);
        expect(kernel.OccupantId).toBe(vehicleModule.OccupantId);
        expect(kernel.validateVehicleSnapshot).toBe(
          vehicleModule.validateVehicleSnapshot,
        );
        expect(kernel.emptyVehicleSnapshot).toBe(
          vehicleModule.emptyVehicleSnapshot,
        );
        expect(kernel.WITHER_MAX_HEALTH).toBe(witherModule.WITHER_MAX_HEALTH);
        expect(kernel.WITHER_SPAWN_CHARGE_SECS).toBe(
          witherModule.WITHER_SPAWN_CHARGE_SECS,
        );
        expect(kernel.WITHER_ARMOUR_THRESHOLD).toBe(
          witherModule.WITHER_ARMOUR_THRESHOLD,
        );
        expect(kernel.WITHER_REGEN_PER_SEC).toBe(
          witherModule.WITHER_REGEN_PER_SEC,
        );
        expect(kernel.WITHER_FOLLOW_ACCELERATION).toBe(
          witherModule.WITHER_FOLLOW_ACCELERATION,
        );
        expect(kernel.WITHER_MAX_SPEED).toBe(witherModule.WITHER_MAX_SPEED);
        expect(kernel.createWither).toBe(witherModule.createWither);
        expect(kernel.stepWither).toBe(witherModule.stepWither);
        expect(kernel.damageWither).toBe(witherModule.damageWither);
        expect(kernel.witherSkullProjectile).toBe(
          witherModule.witherSkullProjectile,
        );
        expect(kernel.matchWitherSummon).toBe(witherModule.matchWitherSummon);
        expect(kernel.serializeWither).toBe(witherModule.serializeWither);
        expect(kernel.restoreWither).toBe(witherModule.restoreWither);
        expect(kernel.matchRecipe).toBe(recipeModule.matchRecipe);
        expect(kernel.matchRecipeWithAssignments).toBe(
          recipeModule.matchRecipeWithAssignments,
        );
        expect(kernel.craftingRecipeFromUnknown).toBe(
          recipeJsonModule.craftingRecipeFromUnknown,
        );
        expect(kernel.craftingRecipeDataPath).toBe(
          recipeJsonModule.craftingRecipeDataPath,
        );
        expect(kernel.cookingRecipeFromUnknown).toBe(
          recipeJsonModule.cookingRecipeFromUnknown,
        );
        expect(kernel.stonecuttingRecipeFromUnknown).toBe(
          recipeJsonModule.stonecuttingRecipeFromUnknown,
        );
        expect(kernel.smithingTransformRecipeFromUnknown).toBe(
          recipeJsonModule.smithingTransformRecipeFromUnknown,
        );
        expect(kernel.smithingTrimRecipeFromUnknown).toBe(
          recipeJsonModule.smithingTrimRecipeFromUnknown,
        );
        expect(kernel.smithingRecipeFromUnknown).toBe(
          recipeJsonModule.smithingRecipeFromUnknown,
        );
        expect(kernel.transmuteRecipeFromUnknown).toBe(
          recipeJsonModule.transmuteRecipeFromUnknown,
        );
        expect(kernel.portableRecipeFromUnknown).toBe(
          recipeJsonModule.portableRecipeFromUnknown,
        );
        expect(kernel.recipeFromUnknown).toBe(
          recipeJsonModule.recipeFromUnknown,
        );
        expect(kernel.recipeDataPath).toBe(recipeJsonModule.recipeDataPath);
        expect(kernel.recipeDataPackLayer).toBe(
          recipeRegistryModule.recipeDataPackLayer,
        );
        expect(kernel.recipeDataPackLayerFromUnknown).toBe(
          recipeRegistryModule.recipeDataPackLayerFromUnknown,
        );
        expect(kernel.selectRecipes).toBe(recipeRegistryModule.selectRecipes);
        expect(kernel.recipeDataPackPath).toBe(
          recipeRegistryModule.recipeDataPackPath,
        );
        expect(kernel.VANILLA_CRAFTING_RECIPES).toBe(
          recipeModule.VANILLA_CRAFTING_RECIPES,
        );
        expect(kernel.craftFromGrid).toBe(craftingModule.craftFromGrid);
        expect(kernel.advanceFurnace).toBe(smeltingModule.advanceFurnace);
        expect(kernel.VANILLA_SMELTING_RECIPES).toBe(
          smeltingModule.VANILLA_SMELTING_RECIPES,
        );
        expect(kernel.cookingRecipe).toBe(cookingModule.cookingRecipe);
        expect(kernel.cookingRecipeForItem).toBe(
          cookingModule.cookingRecipeForItem,
        );
        expect(kernel.isCookingRecipe).toBe(cookingModule.isCookingRecipe);
        expect(kernel.matchesCookingRecipe).toBe(
          cookingModule.matchesCookingRecipe,
        );
        expect(kernel.matchCookingRecipes).toBe(
          cookingModule.matchCookingRecipes,
        );
        expect(kernel.matchCookingRecipe).toBe(
          cookingModule.matchCookingRecipe,
        );
        expect(kernel.applyCooking).toBe(cookingModule.applyCooking);
        expect(kernel.DIMENSIONS).toBe(dimensionModule.DIMENSIONS);
        expect(kernel.isDimension).toBe(dimensionModule.isDimension);
        expect(kernel.EntityId).toBe(entityModule.EntityId);
        expect(kernel.EntityKind).toBe(entityModule.EntityKind);
        expect(kernel.isEntityId).toBe(entityModule.isEntityId);
        expect(kernel.isEntityKind).toBe(entityModule.isEntityKind);
        expect(kernel.ENTITY_ID_PREFIX).toBe(entityModule.ENTITY_ID_PREFIX);
        expect(kernel.mintEntityId).toBe(entityModule.mintEntityId);
        expect(kernel.serialOfEntityId).toBe(entityModule.serialOfEntityId);
        expect(kernel.NO_ENTITIES).toBe(entityModule.NO_ENTITIES);
        expect(kernel.repairState).toBe(entityModule.repairState);
        expect(kernel.emptyRoster).toBe(entityModule.emptyRoster);
        expect(kernel.spawnEntity).toBe(entityModule.spawnEntity);
        expect(kernel.despawnEntity).toBe(entityModule.despawnEntity);
        expect(kernel.findEntity).toBe(entityModule.findEntity);
        expect(kernel.countOfKind).toBe(entityModule.countOfKind);
        expect(kernel.UNCHANGED).toBe(entityModule.UNCHANGED);
        expect(kernel.DESPAWNED).toBe(entityModule.DESPAWNED);
        expect(kernel.changed).toBe(entityModule.changed);
        expect(kernel.sweepRoster).toBe(entityModule.sweepRoster);
        expect(kernel.normaliseRoster).toBe(entityModule.normaliseRoster);
        expect(kernel.ENTITY_ATTRIBUTE_DEFINITIONS).toBe(
          entityModule.ENTITY_ATTRIBUTE_DEFINITIONS,
        );
        expect(kernel.ENTITY_ATTRIBUTE_NAMES).toBe(
          entityModule.ENTITY_ATTRIBUTE_NAMES,
        );
        expect(kernel.DEFAULT_ENTITY_ATTRIBUTES).toBe(
          entityModule.DEFAULT_ENTITY_ATTRIBUTES,
        );
        expect(kernel.entityAttributes).toBe(entityModule.entityAttributes);
        expect(kernel.entityAttributeDefinitionOf).toBe(
          entityModule.entityAttributeDefinitionOf,
        );
        expect(kernel.effectiveBounciness).toBe(
          entityModule.effectiveBounciness,
        );
        expect(kernel.isEntityAttributeOptions).toBe(
          entityModule.isEntityAttributeOptions,
        );
        expect(kernel.isEntityAttributes).toBe(entityModule.isEntityAttributes);
        expect(kernel.SULFUR_CUBE_ARCHETYPE_REGISTRY).toBe(
          sulfurCubeModule.SULFUR_CUBE_ARCHETYPE_REGISTRY,
        );
        expect(kernel.SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS).toBe(
          sulfurCubeModule.SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
        );
        expect(kernel.SULFUR_CUBE_BLOCK_TAGS).toBe(
          sulfurCubeModule.SULFUR_CUBE_BLOCK_TAGS,
        );
        expect(kernel.SULFUR_CUBE_COMPONENTS).toBe(
          sulfurCubeModule.SULFUR_CUBE_COMPONENTS,
        );
        expect(kernel.SULFUR_CUBE_DAMAGE_TYPES).toBe(
          sulfurCubeModule.SULFUR_CUBE_DAMAGE_TYPES,
        );
        expect(kernel.SULFUR_CUBE_DAMAGE_TYPE_TAGS).toBe(
          sulfurCubeModule.SULFUR_CUBE_DAMAGE_TYPE_TAGS,
        );
        expect(kernel.SULFUR_CUBE_ENTITY_TAGS).toBe(
          sulfurCubeModule.SULFUR_CUBE_ENTITY_TAGS,
        );
        expect(kernel.SULFUR_CUBE_GAME_EVENTS).toBe(
          sulfurCubeModule.SULFUR_CUBE_GAME_EVENTS,
        );
        expect(kernel.SULFUR_CUBE_ITEM_TAGS).toBe(
          sulfurCubeModule.SULFUR_CUBE_ITEM_TAGS,
        );
        expect(kernel.SULFUR_CUBE_PARTICLES).toBe(
          sulfurCubeModule.SULFUR_CUBE_PARTICLES,
        );
        expect(kernel.sulfurCubeArchetype).toBe(
          sulfurCubeModule.sulfurCubeArchetype,
        );
        expect(kernel.sulfurCubeArchetypeFromUnknown).toBe(
          sulfurCubeModule.sulfurCubeArchetypeFromUnknown,
        );
        expect(kernel.isSulfurCubeArchetype).toBe(
          sulfurCubeModule.isSulfurCubeArchetype,
        );
        expect(kernel.isSulfurCubeArchetypeOptions).toBe(
          sulfurCubeModule.isSulfurCubeArchetypeOptions,
        );
        expect(kernel.sulfurCubeArchetypeDataPackLayer).toBe(
          sulfurCubeRegistryModule.sulfurCubeArchetypeDataPackLayer,
        );
        expect(kernel.sulfurCubeArchetypeDataPackLayerFromUnknown).toBe(
          sulfurCubeRegistryModule.sulfurCubeArchetypeDataPackLayerFromUnknown,
        );
        expect(kernel.selectSulfurCubeArchetypes).toBe(
          sulfurCubeRegistryModule.selectSulfurCubeArchetypes,
        );
        expect(kernel.sulfurCubeArchetypeDataPath).toBe(
          sulfurCubeRegistryModule.sulfurCubeArchetypeDataPath,
        );
        expect(kernel.CROP_TYPES).toBe(cropModule.CROP_TYPES);
        expect(kernel.CROP_REGISTRY).toBe(cropModule.CROP_REGISTRY);
        expect(kernel.WHEAT_MATURITY_SECS).toBe(cropModule.WHEAT_MATURITY_SECS);
        expect(kernel.POTATO_MATURITY_SECS).toBe(
          cropModule.POTATO_MATURITY_SECS,
        );
        expect(kernel.NETHER_WART_MATURITY_SECS).toBe(
          cropModule.NETHER_WART_MATURITY_SECS,
        );
        expect(kernel.BONE_MEAL_GROWTH_SECS).toBe(
          cropModule.BONE_MEAL_GROWTH_SECS,
        );
        expect(kernel.isCropType).toBe(cropModule.isCropType);
        expect(kernel.cropDefinitionFor).toBe(cropModule.cropDefinitionFor);
        expect(kernel.maturitySecsFor).toBe(cropModule.maturitySecsFor);
        expect(kernel.canPlantCrop).toBe(cropModule.canPlantCrop);
        expect(kernel.isMatureCrop).toBe(cropModule.isMatureCrop);
        expect(kernel.matureYieldsFor).toBe(cropModule.matureYieldsFor);
        expect(kernel.advanceCrop).toBe(cropModule.advanceCrop);
        expect(kernel.advanceCropByBoneMeal).toBe(
          cropModule.advanceCropByBoneMeal,
        );
        expect(kernel.cropLocationKey).toBe(cropModule.cropLocationKey);
        expect(kernel.advanceBrewing).toBe(brewingModule.advanceBrewing);
        expect(kernel.VANILLA_BREWING_RECIPES).toBe(
          brewingModule.VANILLA_BREWING_RECIPES,
        );
        expect(kernel.FLUID_BLOCK_IDS).toBe(fluidModule.FLUID_BLOCK_IDS);
        expect(kernel.FLUID_MIX_BLOCK_IDS).toBe(
          fluidModule.FLUID_MIX_BLOCK_IDS,
        );
        expect(kernel.blockIdOfFluidKind).toBe(fluidModule.blockIdOfFluidKind);
        expect(kernel.fluidKindOfBlockId).toBe(fluidModule.fluidKindOfBlockId);
        expect(kernel.fluidLevel).toBe(fluidModule.fluidLevel);
        expect(kernel.emptyFluidState).toBe(fluidModule.emptyFluidState);
        expect(kernel.fluidCellAt).toBe(fluidModule.fluidCellAt);
        expect(kernel.setFluidCell).toBe(fluidModule.setFluidCell);
        expect(kernel.clearFluidCell).toBe(fluidModule.clearFluidCell);
        expect(kernel.scheduleFluidAt).toBe(fluidModule.scheduleFluidAt);
        expect(kernel.unscheduleFluidAt).toBe(fluidModule.unscheduleFluidAt);
        expect(kernel.emptyBlockWorld).toBe(blockWorldModule.emptyBlockWorld);
        expect(kernel.blockAt).toBe(blockWorldModule.blockAt);
        expect(kernel.blockReaderOf).toBe(blockWorldModule.blockReaderOf);
        expect(kernel.readBlockAt).toBe(blockWorldModule.readBlockAt);
        expect(kernel.setBlockAt).toBe(blockWorldModule.setBlockAt);
        expect(kernel.fluidStateFromWorld).toBe(
          fluidUpdateModule.fluidStateFromWorld,
        );
        expect(kernel.canFluidReplace).toBe(fluidUpdateModule.canFluidReplace);
        expect(kernel.updateFluids).toBe(fluidUpdateModule.updateFluids);
        expect(kernel.FOOD_DEFINITION_BY_ITEM).toBe(
          foodModule.FOOD_DEFINITION_BY_ITEM,
        );
        expect(kernel.VANILLA_FOOD_DEFINITIONS).toBe(
          foodModule.VANILLA_FOOD_DEFINITIONS,
        );
        expect(kernel.foodDefinitionOf).toBe(foodModule.foodDefinitionOf);
        expect(kernel.canEatFood).toBe(foodModule.canEatFood);
        expect(kernel.foodRemainderOf).toBe(foodModule.foodRemainderOf);
        expect(kernel.consumeFood).toBe(foodModule.consumeFood);
        expect(kernel.CONSUMABLE_ANIMATIONS).toBe(
          consumableModule.CONSUMABLE_ANIMATIONS,
        );
        expect(kernel.DEFAULT_CONSUMABLE_COMPONENT).toBe(
          consumableModule.DEFAULT_CONSUMABLE_COMPONENT,
        );
        expect(kernel.consumableApplyEffects).toBe(
          consumableModule.consumableApplyEffects,
        );
        expect(kernel.consumableClearAllEffects).toBe(
          consumableModule.consumableClearAllEffects,
        );
        expect(kernel.consumableComponent).toBe(
          consumableModule.consumableComponent,
        );
        expect(kernel.foodComponentOf).toBe(consumableModule.foodComponentOf);
        expect(kernel.consumableComponentOf).toBe(
          consumableModule.consumableComponentOf,
        );
        expect(kernel.consumablePlaySound).toBe(
          consumableModule.consumablePlaySound,
        );
        expect(kernel.consumableRemoveEffects).toBe(
          consumableModule.consumableRemoveEffects,
        );
        expect(kernel.consumableStatusEffect).toBe(
          consumableModule.consumableStatusEffect,
        );
        expect(kernel.consumableTeleportRandomly).toBe(
          consumableModule.consumableTeleportRandomly,
        );
        expect(kernel.useRemainderComponentOf).toBe(
          consumableModule.useRemainderComponentOf,
        );
        expect(kernel.itemUseComponentsOf).toBe(
          consumableModule.itemUseComponentsOf,
        );
        expect(kernel.isConsumableComponent).toBe(
          consumableModule.isConsumableComponent,
        );
        expect(kernel.isConsumableEffect).toBe(
          consumableModule.isConsumableEffect,
        );
        expect(kernel.isConsumableStatusEffect).toBe(
          consumableModule.isConsumableStatusEffect,
        );
        expect(kernel.isFoodComponent).toBe(consumableModule.isFoodComponent);
        expect(kernel.isItemUseComponents).toBe(
          consumableModule.isItemUseComponents,
        );
        expect(kernel.isUseRemainderComponent).toBe(
          consumableModule.isUseRemainderComponent,
        );
        expect(kernel.useCooldownComponent).toBe(
          useCooldownModule.useCooldownComponent,
        );
        expect(kernel.cooldownExpiresAt).toBe(
          useCooldownModule.cooldownExpiresAt,
        );
        expect(kernel.isCooldownActive).toBe(
          useCooldownModule.isCooldownActive,
        );
        expect(kernel.isUseCooldownComponent).toBe(
          useCooldownModule.isUseCooldownComponent,
        );
        expect(kernel.REDSTONE_BLOCK_IDS).toBe(
          redstoneModule.REDSTONE_BLOCK_IDS,
        );
        expect(kernel.repeaterDelayTicks).toBe(
          redstoneModule.repeaterDelayTicks,
        );
        expect(kernel.redstoneRepeater).toBe(redstoneModule.redstoneRepeater);
        expect(kernel.redstoneComparator).toBe(
          redstoneModule.redstoneComparator,
        );
        expect(kernel.redstoneObserver).toBe(redstoneModule.redstoneObserver);
        expect(kernel.redstonePower).toBe(redstoneModule.redstonePower);
        expect(kernel.emptyRedstoneState).toBe(
          redstoneModule.emptyRedstoneState,
        );
        expect(kernel.redstoneInputAt).toBe(redstoneModule.redstoneInputAt);
        expect(kernel.redstonePowerAt).toBe(redstoneModule.redstonePowerAt);
        expect(kernel.redstoneDevicePowerAt).toBe(
          redstoneModule.redstoneDevicePowerAt,
        );
        expect(kernel.redstoneDeviceAt).toBe(redstoneModule.redstoneDeviceAt);
        expect(kernel.setRedstoneInput).toBe(redstoneModule.setRedstoneInput);
        expect(kernel.clearRedstoneInput).toBe(
          redstoneModule.clearRedstoneInput,
        );
        expect(kernel.setRedstoneDevice).toBe(redstoneModule.setRedstoneDevice);
        expect(kernel.clearRedstoneDevice).toBe(
          redstoneModule.clearRedstoneDevice,
        );
        expect(kernel.withRedstoneWirePowers).toBe(
          redstoneModule.withRedstoneWirePowers,
        );
        expect(kernel.withRedstoneDeviceState).toBe(
          redstoneModule.withRedstoneDeviceState,
        );
        expect(kernel.collectRedstoneLayout).toBe(
          redstoneNetworkModule.collectRedstoneLayout,
        );
        expect(kernel.sourcePowerAt).toBe(redstoneNetworkModule.sourcePowerAt);
        expect(kernel.deviceOutputFace).toBe(
          redstoneNetworkModule.deviceOutputFace,
        );
        expect(kernel.deviceOutputAtTarget).toBe(
          redstoneNetworkModule.deviceOutputAtTarget,
        );
        expect(kernel.poweredWiresFrom).toBe(
          redstoneNetworkModule.poweredWiresFrom,
        );
        expect(kernel.signalPowerAt).toBe(redstoneNetworkModule.signalPowerAt);
        expect(kernel.wirePowerChanges).toBe(
          redstoneNetworkModule.wirePowerChanges,
        );
        expect(kernel.blockIsWire).toBe(redstoneNetworkModule.blockIsWire);
        expect(kernel.updateRedstone).toBe(redstoneUpdateModule.updateRedstone);
        expect(kernel.applySmithing).toBe(smithingModule.applySmithing);
        expect(kernel.VANILLA_SMITHING_RECIPES).toBe(
          smithingModule.VANILLA_SMITHING_RECIPES,
        );
        expect(kernel.matchStonecuttingRecipes).toBe(
          stonecuttingModule.matchStonecuttingRecipes,
        );
        expect(kernel.matchStonecuttingRecipe).toBe(
          stonecuttingModule.matchStonecuttingRecipe,
        );
        expect(kernel.applyStonecutting).toBe(
          stonecuttingModule.applyStonecutting,
        );
        expect(kernel.VANILLA_STONECUTTING_RECIPES).toBe(
          stonecuttingModule.VANILLA_STONECUTTING_RECIPES,
        );
        expect(kernel.TRANSMUTE_MAX_MATERIAL_SLOTS).toBe(
          transmuteModule.TRANSMUTE_MAX_MATERIAL_SLOTS,
        );
        expect(kernel.isTransmuteMaterialCount).toBe(
          transmuteModule.isTransmuteMaterialCount,
        );
        expect(kernel.isTransmuteRecipe).toBe(
          transmuteModule.isTransmuteRecipe,
        );
        expect(kernel.transmuteRecipe).toBe(transmuteModule.transmuteRecipe);
        expect(kernel.transmuteRecipeForItem).toBe(
          transmuteModule.transmuteRecipeForItem,
        );
        expect(kernel.matchesTransmuteRecipe).toBe(
          transmuteModule.matchesTransmuteRecipe,
        );
        expect(kernel.matchTransmuteRecipes).toBe(
          transmuteModule.matchTransmuteRecipes,
        );
        expect(kernel.matchTransmuteRecipe).toBe(
          transmuteModule.matchTransmuteRecipe,
        );
        expect(kernel.applyTransmute).toBe(transmuteModule.applyTransmute);
        expect(kernel.ARROW_GRAVITY).toBe(projectileModule.ARROW_GRAVITY);
        expect(kernel.ARROW_AIR_DRAG).toBe(projectileModule.ARROW_AIR_DRAG);
        expect(kernel.ARROW_WATER_DRAG).toBe(projectileModule.ARROW_WATER_DRAG);
        expect(kernel.ARROW_MAX_LIFETIME_SECONDS).toBe(
          projectileModule.ARROW_MAX_LIFETIME_SECONDS,
        );
        expect(kernel.ARROW_SHOOTER_GRACE_SECONDS).toBe(
          projectileModule.ARROW_SHOOTER_GRACE_SECONDS,
        );
        expect(kernel.launchArrow).toBe(projectileModule.launchArrow);
        expect(kernel.stepArrow).toBe(projectileModule.stepArrow);
        expect(kernel.detectNetherPortal).toBe(portalModule.detectNetherPortal);
        expect(kernel.generatePortalLayout).toBe(
          portalModule.generatePortalLayout,
        );
        expect(kernel.DEFAULT_EXPLOSION_LIMITS).toBe(
          explosionModule.DEFAULT_EXPLOSION_LIMITS,
        );
        expect(kernel.planExplosion).toBe(explosionModule.planExplosion);
        expect(kernel.applyExplosionPlan).toBe(
          explosionModule.applyExplosionPlan,
        );
        expect(kernel.DEFAULT_TNT_FUSE_SECS).toBe(
          primedTntModule.DEFAULT_TNT_FUSE_SECS,
        );
        expect(kernel.MAX_TNT_FUSE_ADVANCE_SECS).toBe(
          primedTntModule.MAX_TNT_FUSE_ADVANCE_SECS,
        );
        expect(kernel.primeTnt).toBe(primedTntModule.primeTnt);
        expect(kernel.planPrimedTnt).toBe(primedTntModule.planPrimedTnt);
        expect(kernel.applyPrimedTntPlan).toBe(
          primedTntModule.applyPrimedTntPlan,
        );
        for (const itemType of PUBLIC_ITEM_TYPES) {
          expect(kernel.isItemType(itemType)).toBe(true);
        }
      }),
    ));

  it("keeps the stable block-registry import path behaviorally identical to the barrel", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const blockRegistryEntry = blockRegistry.BLOCK_REGISTRY[0];
        if (blockRegistryEntry === undefined)
          throw new Error("Block registry fixture must not be empty");
        expect(blockRegistryEntry.id).toBe(blockRegistry.AIR_BLOCK_ID);
        expect(blockRegistryEntry.definition.type).toBe("air");
        const stoneId = blockRegistry.blockIdOf("stone");
        const stoneDefinition = blockRegistry.resolvedBlockOfId(stoneId);

        expect(kernel.blockIdOf("stone")).toBe(stoneId);
        expect(kernel.isEmpty).toBe(blockRegistry.isEmpty);
        expect(blockRegistry.isEmpty(blockRegistry.AIR_BLOCK_ID)).toBe(true);
        expect(blockRegistry.isEmpty(stoneId)).toBe(false);
        expect(blockRegistry.blockTypeOfId(stoneId)).toBe("stone");
        expect(stoneDefinition).toBeDefined();
        expect(stoneDefinition?.type).toBe("stone");
        expect(
          blockRegistry.capabilityOfBlockId(stoneId, "canSupportAttachments"),
        ).toBe(true);
        expect(blockRegistry.transmitsLight(stoneId)).toBe(false);
      }),
    ));

  it("keeps the stable block-interaction import path behaviorally identical to the barrel", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(blockInteraction.BEDROCK_HARDNESS).toBe(kernel.BEDROCK_HARDNESS);
        expect(blockInteraction.REFERENCE_UNBREAKABLE_HARDNESS).toBe(
          kernel.REFERENCE_UNBREAKABLE_HARDNESS,
        );
        expect(blockInteraction.breakBlock).toBe(kernel.breakBlock);
        expect(blockInteraction.canReplaceBlock).toBe(kernel.canReplaceBlock);
        expect(blockInteraction.placeBlock).toBe(kernel.placeBlock);
        expect(blockInteraction.placeableBlockFromItem).toBe(
          kernel.placeableBlockFromItem,
        );
      }),
    ));

  it("documents unknown block-id defaults on the stable block-registry import path", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const unknownId = blockRegistry.BLOCK_ID_MAX + 1;

        expect(blockRegistry.isKnownBlockId(unknownId)).toBe(false);
        expect(blockRegistry.dropOfBlockId(unknownId)).toBeUndefined();
        expect(blockRegistry.opacityOfBlockId(unknownId)).toBe(
          BLOCK_PROPERTY_DEFAULTS.opacity,
        );
        expect(blockRegistry.lightEmissionOfBlockId(unknownId)).toBe(
          BLOCK_PROPERTY_DEFAULTS.lightEmission,
        );
        expect(blockRegistry.supportRuleOfBlockId(unknownId)).toEqual(
          BLOCK_PROPERTY_DEFAULTS.supportRule,
        );
        expect(blockRegistry.isSupportSensitiveBlockId(unknownId)).toBe(false);
        expect(
          blockRegistry.canBlockStaySupported(
            unknownId,
            blockRegistry.AIR_BLOCK_ID,
          ),
        ).toBe(true);
      }),
    ));

  it("makes the coordinate key type available to TypeScript callers", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const key: kernel.BlockPositionKey = kernel.blockPositionKeyOf(
          kernel.blockPosition(ORIGIN_AXIS, ORIGIN_AXIS, ORIGIN_AXIS),
        );

        expect(key).toBe("0,0,0");
      }),
    ));

  it("re-exports the ChunkKey type", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const key: kernel.ChunkKey = kernel.chunkKeyOf(
          kernel.chunkCoord(ORIGIN_AXIS, ORIGIN_AXIS),
        );
        expect(key).toBe("0,0");
      }),
    ));
  it("re-exports the LightLevel type", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const level: kernel.LightLevel = kernel.clampLightLevel(ORIGIN_AXIS);
        expect(level).toBe(0);
      }),
    ));

  it("supports strict JSON package subpaths", () =>
    Effect.runPromise(
      Effect.promise(async () => {
        const packageRootPath = "@nerima-games/mc-kernel";
        const itemComponentPatchPath =
          "@nerima-games/mc-kernel/domain/item-component-patch";
        const jsonValuePath = "@nerima-games/mc-kernel/domain/json-value";
        const recipeJsonPath = "@nerima-games/mc-kernel/domain/recipe-json";
        const recipeRegistryPath =
          "@nerima-games/mc-kernel/domain/recipe-registry";
        const [
          packageRoot,
          itemComponentPatchSubpath,
          jsonValueSubpath,
          recipeJsonSubpath,
          recipeRegistrySubpath,
        ] = await Promise.all([
          import(packageRootPath),
          import(itemComponentPatchPath),
          import(jsonValuePath),
          import(recipeJsonPath),
          import(recipeRegistryPath),
        ]);

        expect(itemComponentPatchSubpath.ItemComponentPatchKey).toBe(
          packageRoot.ItemComponentPatchKey,
        );
        expect(itemComponentPatchSubpath.isItemComponentPatch).toBe(
          packageRoot.isItemComponentPatch,
        );
        expect(itemComponentPatchSubpath.itemComponentPatchFromUnknown).toBe(
          packageRoot.itemComponentPatchFromUnknown,
        );
        expect(itemComponentPatchSubpath.itemComponentPatch).toBe(
          packageRoot.itemComponentPatch,
        );
        expect(itemComponentPatchSubpath.itemComponentPatchesEqual).toBe(
          packageRoot.itemComponentPatchesEqual,
        );
        expect(jsonValueSubpath.isJsonValue).toBe(packageRoot.isJsonValue);
        expect(jsonValueSubpath.jsonValueFromUnknown).toBe(
          packageRoot.jsonValueFromUnknown,
        );
        expect(jsonValueSubpath.jsonValuesEqual).toBe(
          packageRoot.jsonValuesEqual,
        );
        expect(recipeJsonSubpath.craftingRecipeFromUnknown).toBe(
          packageRoot.craftingRecipeFromUnknown,
        );
        expect(recipeJsonSubpath.craftingRecipeDataPath).toBe(
          packageRoot.craftingRecipeDataPath,
        );
        expect(recipeJsonSubpath.stonecuttingRecipeFromUnknown).toBe(
          packageRoot.stonecuttingRecipeFromUnknown,
        );
        expect(recipeJsonSubpath.smithingRecipeFromUnknown).toBe(
          packageRoot.smithingRecipeFromUnknown,
        );
        expect(recipeRegistrySubpath.recipeDataPackLayer).toBe(
          packageRoot.recipeDataPackLayer,
        );
        expect(recipeRegistrySubpath.selectRecipes).toBe(
          packageRoot.selectRecipes,
        );
      }),
    ));

  it("supports documented package subpath exports", () =>
    Effect.runPromise(
      Effect.promise(async () => {
        const packageRootPath = "@nerima-games/mc-kernel";
        const anvilPath = "@nerima-games/mc-kernel/domain/anvil";
        const blockBreakSpeedPath =
          "@nerima-games/mc-kernel/domain/block-break-speed";
        const blockCapabilitiesPath =
          "@nerima-games/mc-kernel/domain/block-capabilities";
        const blockDefinitionPath =
          "@nerima-games/mc-kernel/domain/block-definition";
        const blockHarvestPath = "@nerima-games/mc-kernel/domain/block-harvest";
        const blockItemPath = "@nerima-games/mc-kernel/domain/block-item";
        const blockPropertiesPath =
          "@nerima-games/mc-kernel/domain/block-properties";
        const blockSupportPath = "@nerima-games/mc-kernel/domain/block-support";
        const blockRegistryPath =
          "@nerima-games/mc-kernel/domain/block-registry";
        const blockInteractionPath =
          "@nerima-games/mc-kernel/domain/block-interaction";
        const blockStatePath = "@nerima-games/mc-kernel/domain/block-state";
        const blockWorldPath = "@nerima-games/mc-kernel/domain/block-world";
        const blockTypePath = "@nerima-games/mc-kernel/domain/block-type";
        const bedrockMiningPath =
          "@nerima-games/mc-kernel/domain/bedrock-mining";
        const chunkPath = "@nerima-games/mc-kernel/domain/chunk";
        const cameraPath = "@nerima-games/mc-kernel/domain/camera";
        const coordinatesPath = "@nerima-games/mc-kernel/domain/coordinates";
        const dataPackRegistryPath =
          "@nerima-games/mc-kernel/domain/data-pack-registry";
        const clockPath = "@nerima-games/mc-kernel/domain/clock";
        const equipmentPath = "@nerima-games/mc-kernel/domain/equipment";
        const enchantmentPath = "@nerima-games/mc-kernel/domain/enchantment";
        const enchantmentTablePath =
          "@nerima-games/mc-kernel/domain/enchantment-table";
        const grindstonePath = "@nerima-games/mc-kernel/domain/grindstone";
        const identifiersPath = "@nerima-games/mc-kernel/domain/identifiers";
        const itemComponentsPath =
          "@nerima-games/mc-kernel/domain/item-components";
        const itemComponentValuesPath =
          "@nerima-games/mc-kernel/domain/item-component-values";
        const textComponentPath =
          "@nerima-games/mc-kernel/domain/text-component";
        const itemAttributeModifiersPath =
          "@nerima-games/mc-kernel/domain/item-attribute-modifiers";
        const itemCombatPath = "@nerima-games/mc-kernel/domain/item-combat";
        const itemDefensePath = "@nerima-games/mc-kernel/domain/item-defense";
        const itemEnchantmentsPath =
          "@nerima-games/mc-kernel/domain/item-enchantments";
        const itemStackPath = "@nerima-games/mc-kernel/domain/item-stack";
        const itemRegistryPath = "@nerima-games/mc-kernel/domain/item-registry";
        const itemTypePath = "@nerima-games/mc-kernel/domain/item-type";
        const inventoryPath = "@nerima-games/mc-kernel/domain/inventory";
        const hotbarPath = "@nerima-games/mc-kernel/domain/hotbar";
        const quantitiesPath = "@nerima-games/mc-kernel/domain/quantities";
        const recipePath = "@nerima-games/mc-kernel/domain/recipe";
        const craftingPath = "@nerima-games/mc-kernel/domain/crafting";
        const brewingPath = "@nerima-games/mc-kernel/domain/brewing";
        const cookingPath = "@nerima-games/mc-kernel/domain/cooking";
        const cameraPosePath = "@nerima-games/mc-kernel/domain/camera-pose";
        const smeltingPath = "@nerima-games/mc-kernel/domain/smelting";
        const smithingPath = "@nerima-games/mc-kernel/domain/smithing";
        const stonecuttingPath = "@nerima-games/mc-kernel/domain/stonecutting";
        const transmutePath = "@nerima-games/mc-kernel/domain/transmute";
        const cropPath = "@nerima-games/mc-kernel/domain/crop";
        const dimensionPath = "@nerima-games/mc-kernel/domain/dimension";
        const entityPath = "@nerima-games/mc-kernel/domain/entity";
        const sulfurCubePath = "@nerima-games/mc-kernel/domain/sulfur-cube";
        const sulfurCubeRegistryPath =
          "@nerima-games/mc-kernel/domain/sulfur-cube-registry";
        const fluidPath = "@nerima-games/mc-kernel/domain/fluid";
        const fluidUpdatePath = "@nerima-games/mc-kernel/domain/fluid-update";
        const foodPath = "@nerima-games/mc-kernel/domain/food";
        const consumablePath = "@nerima-games/mc-kernel/domain/consumable";
        const useCooldownPath = "@nerima-games/mc-kernel/domain/use-cooldown";
        const portalPath = "@nerima-games/mc-kernel/domain/portal";
        const redstonePath = "@nerima-games/mc-kernel/domain/redstone";
        const redstoneNetworkPath =
          "@nerima-games/mc-kernel/domain/redstone-network";
        const redstoneUpdatePath =
          "@nerima-games/mc-kernel/domain/redstone-update";
        const projectilePath = "@nerima-games/mc-kernel/domain/projectile";
        const explosionPath = "@nerima-games/mc-kernel/domain/explosion";
        const framePath = "@nerima-games/mc-kernel/domain/frame";
        const frameTimingPath = "@nerima-games/mc-kernel/domain/frame-timing";
        const primedTntPath = "@nerima-games/mc-kernel/domain/primed-tnt";
        const toolComponentPath =
          "@nerima-games/mc-kernel/domain/tool-component";
        const weaponPath = "@nerima-games/mc-kernel/domain/weapon";
        const timeOfDayPath = "@nerima-games/mc-kernel/domain/time-of-day";
        const vitalsPath = "@nerima-games/mc-kernel/domain/vitals";
        const vehiclePath = "@nerima-games/mc-kernel/domain/vehicle";
        const weatherPath = "@nerima-games/mc-kernel/domain/weather";
        const witherPath = "@nerima-games/mc-kernel/domain/wither";
        const [
          packageRoot,
          anvilSubpath,
          blockBreakSpeedSubpath,
          blockCapabilitiesSubpath,
          blockDefinitionSubpath,
          blockHarvestSubpath,
          blockItemSubpath,
          blockPropertiesSubpath,
          blockSupportSubpath,
          blockRegistryModule,
          blockInteractionModule,
          blockStateModule,
          blockWorldSubpath,
          blockTypeModule,
          bedrockMiningModule,
          chunkModule,
          cameraSubpath,
          coordinatesModule,
          dataPackRegistrySubpath,
          clockSubpath,
          equipmentSubpath,
          enchantmentSubpath,
          enchantmentTableSubpath,
          grindstoneSubpath,
          identifiersSubpath,
          itemComponentsSubpath,
          itemComponentValuesSubpath,
          itemCombatSubpath,
          itemDefenseSubpath,
          itemStackSubpath,
          itemRegistrySubpath,
          itemTypeSubpath,
          inventorySubpath,
          hotbarSubpath,
          quantitiesSubpath,
          recipeSubpath,
          craftingSubpath,
          brewingSubpath,
          cookingSubpath,
          cameraPoseSubpath,
          smeltingSubpath,
          smithingSubpath,
          stonecuttingSubpath,
          transmuteSubpath,
          cropSubpath,
          dimensionSubpath,
          entitySubpath,
          sulfurCubeSubpath,
          sulfurCubeRegistrySubpath,
          fluidSubpath,
          fluidUpdateSubpath,
          foodSubpath,
          consumableSubpath,
          useCooldownSubpath,
          portalSubpath,
          redstoneSubpath,
          redstoneNetworkSubpath,
          redstoneUpdateSubpath,
          projectileSubpath,
          explosionSubpath,
          frameSubpath,
          frameTimingSubpath,
          primedTntSubpath,
          toolComponentSubpath,
          weaponSubpath,
          timeOfDaySubpath,
          vitalsSubpath,
          vehicleSubpath,
          weatherSubpath,
          witherSubpath,
        ] = await Promise.all([
          import(packageRootPath),
          import(anvilPath),
          import(blockBreakSpeedPath),
          import(blockCapabilitiesPath),
          import(blockDefinitionPath),
          import(blockHarvestPath),
          import(blockItemPath),
          import(blockPropertiesPath),
          import(blockSupportPath),
          import(blockRegistryPath),
          import(blockInteractionPath),
          import(blockStatePath),
          import(blockWorldPath),
          import(blockTypePath),
          import(bedrockMiningPath),
          import(chunkPath),
          import(cameraPath),
          import(coordinatesPath),
          import(dataPackRegistryPath),
          import(clockPath),
          import(equipmentPath),
          import(enchantmentPath),
          import(enchantmentTablePath),
          import(grindstonePath),
          import(identifiersPath),
          import(itemComponentsPath),
          import(itemComponentValuesPath),
          import(itemCombatPath),
          import(itemDefensePath),
          import(itemStackPath),
          import(itemRegistryPath),
          import(itemTypePath),
          import(inventoryPath),
          import(hotbarPath),
          import(quantitiesPath),
          import(recipePath),
          import(craftingPath),
          import(brewingPath),
          import(cookingPath),
          import(cameraPosePath),
          import(smeltingPath),
          import(smithingPath),
          import(stonecuttingPath),
          import(transmutePath),
          import(cropPath),
          import(dimensionPath),
          import(entityPath),
          import(sulfurCubePath),
          import(sulfurCubeRegistryPath),
          import(fluidPath),
          import(fluidUpdatePath),
          import(foodPath),
          import(consumablePath),
          import(useCooldownPath),
          import(portalPath),
          import(redstonePath),
          import(redstoneNetworkPath),
          import(redstoneUpdatePath),
          import(projectilePath),
          import(explosionPath),
          import(framePath),
          import(frameTimingPath),
          import(primedTntPath),
          import(toolComponentPath),
          import(weaponPath),
          import(timeOfDayPath),
          import(vitalsPath),
          import(vehiclePath),
          import(weatherPath),
          import(witherPath),
        ]);
        const itemAttributeModifiersSubpath = await import(
          itemAttributeModifiersPath
        );
        const itemEnchantmentsSubpath = await import(itemEnchantmentsPath);
        const textComponentSubpath = await import(textComponentPath);

        expect(anvilSubpath.planAnvil).toBe(packageRoot.planAnvil);
        expect(anvilSubpath.applyAnvil).toBe(packageRoot.applyAnvil);
        expect(anvilSubpath.ANVIL_SNAPSHOT_VERSION).toBe(
          packageRoot.ANVIL_SNAPSHOT_VERSION,
        );
        expect(blockBreakSpeedSubpath.computeBreakTicks).toBe(
          packageRoot.computeBreakTicks,
        );
        expect(blockBreakSpeedSubpath.miningSpeedOf).toBe(
          packageRoot.miningSpeedOf,
        );
        expect(blockBreakSpeedSubpath.DEFAULT_MINING_SPEED).toBe(
          packageRoot.DEFAULT_MINING_SPEED,
        );
        expect(blockCapabilitiesSubpath.resolveBlockCapabilities).toBe(
          packageRoot.resolveBlockCapabilities,
        );
        expect(blockCapabilitiesSubpath.capabilityOf).toBe(
          packageRoot.capabilityOf,
        );
        expect(blockCapabilitiesSubpath.BLOCK_CAPABILITY_FLAGS).toBe(
          packageRoot.BLOCK_CAPABILITY_FLAGS,
        );
        expect(blockDefinitionSubpath.resolveBlock).toBe(
          packageRoot.resolveBlock,
        );
        expect(blockDefinitionSubpath.blockCapabilitiesOf).toBe(
          packageRoot.blockCapabilitiesOf,
        );
        expect(blockHarvestSubpath.resolveDrop).toBe(packageRoot.resolveDrop);
        expect(blockHarvestSubpath.satisfiesHarvestTier).toBe(
          packageRoot.satisfiesHarvestTier,
        );
        expect(blockHarvestSubpath.BARE_HANDED).toBe(packageRoot.BARE_HANDED);
        expect(blockItemSubpath.isPlaceableItem).toBe(
          packageRoot.isPlaceableItem,
        );
        expect(blockItemSubpath.itemOfBlock).toBe(packageRoot.itemOfBlock);
        expect(blockItemSubpath.PLACEABLE_ITEM_TYPES).toBe(
          packageRoot.PLACEABLE_ITEM_TYPES,
        );
        expect(blockPropertiesSubpath.resolveBlockProperties).toBe(
          packageRoot.resolveBlockProperties,
        );
        expect(blockPropertiesSubpath.propertyOf).toBe(packageRoot.propertyOf);
        expect(blockPropertiesSubpath.BLOCK_PROPERTY_DEFAULTS).toBe(
          packageRoot.BLOCK_PROPERTY_DEFAULTS,
        );
        expect(blockSupportSubpath.satisfiesSupportRule).toBe(
          packageRoot.satisfiesSupportRule,
        );
        expect(blockSupportSubpath.isSupportSensitive).toBe(
          packageRoot.isSupportSensitive,
        );
        expect(blockSupportSubpath.NEEDS_NO_SUPPORT).toBe(
          packageRoot.NEEDS_NO_SUPPORT,
        );
        expect(blockRegistryModule.blockIdOf).toBe(packageRoot.blockIdOf);
        expect(blockRegistryModule.BLOCK_REGISTRY).toBe(
          packageRoot.BLOCK_REGISTRY,
        );
        expect(blockInteractionModule.BEDROCK_HARDNESS).toBe(
          packageRoot.BEDROCK_HARDNESS,
        );
        expect(blockInteractionModule.REFERENCE_UNBREAKABLE_HARDNESS).toBe(
          packageRoot.REFERENCE_UNBREAKABLE_HARDNESS,
        );
        expect(blockInteractionModule.breakBlock).toBe(packageRoot.breakBlock);
        expect(blockInteractionModule.canReplaceBlock).toBe(
          packageRoot.canReplaceBlock,
        );
        expect(blockInteractionModule.placeBlock).toBe(packageRoot.placeBlock);
        expect(blockInteractionModule.placeableBlockFromItem).toBe(
          packageRoot.placeableBlockFromItem,
        );
        expect(blockStateModule.BlockState).toBe(packageRoot.BlockState);
        expect(blockStateModule.blockState).toBe(packageRoot.blockState);
        expect(blockTypeModule.BLOCK_TYPES).toBe(packageRoot.BLOCK_TYPES);
        expect(blockTypeModule.isBlockType).toBe(packageRoot.isBlockType);
        expect(bedrockMiningModule.resolveBedrockDiggerSpeed).toBe(
          packageRoot.resolveBedrockDiggerSpeed,
        );
        expect(bedrockMiningModule.resolveBedrockDestructionSeconds).toBe(
          packageRoot.resolveBedrockDestructionSeconds,
        );
        expect(bedrockMiningModule.BEDROCK_DIGGER_MIN_FORMAT_VERSION).toBe(
          packageRoot.BEDROCK_DIGGER_MIN_FORMAT_VERSION,
        );
        expect(bedrockMiningModule.parseBedrockTagQuery).toBe(
          packageRoot.parseBedrockTagQuery,
        );
        expect(chunkModule.encodeChunk).toBe(packageRoot.encodeChunk);
        expect(chunkModule.decodeChunk).toBe(packageRoot.decodeChunk);
        expect(chunkModule.EncodedChunk).toBe(packageRoot.EncodedChunk);
        expect(chunkModule.CHUNK_CODEC_VERSION).toBe(
          packageRoot.CHUNK_CODEC_VERSION,
        );
        expect(chunkModule.ChunkBlocks).toBe(packageRoot.ChunkBlocks);
        expect(chunkModule.MAX_CHUNK_HEIGHT).toBe(packageRoot.MAX_CHUNK_HEIGHT);
        expect(chunkModule.chunkBlockCount).toBe(packageRoot.chunkBlockCount);
        expect(cameraSubpath.snapshotAgeSecs).toBe(packageRoot.snapshotAgeSecs);
        expect(coordinatesModule.blockPosition).toBe(packageRoot.blockPosition);
        expect(coordinatesModule.chunkCoord).toBe(packageRoot.chunkCoord);
        expect(coordinatesModule.aabb).toBe(packageRoot.aabb);
        expect(dataPackRegistrySubpath.DataPackFormat).toBe(
          packageRoot.DataPackFormat,
        );
        expect(dataPackRegistrySubpath.DataPackPriority).toBe(
          packageRoot.DataPackPriority,
        );
        expect(dataPackRegistrySubpath.dataPackLayer).toBe(
          packageRoot.dataPackLayer,
        );
        expect(dataPackRegistrySubpath.dataPackLayerFromUnknown).toBe(
          packageRoot.dataPackLayerFromUnknown,
        );
        expect(dataPackRegistrySubpath.dataPackLayerFromUnknownWithId).toBe(
          packageRoot.dataPackLayerFromUnknownWithId,
        );
        expect(dataPackRegistrySubpath.mapDataPackLayer).toBe(
          packageRoot.mapDataPackLayer,
        );
        expect(dataPackRegistrySubpath.selectDataPackRegistry).toBe(
          packageRoot.selectDataPackRegistry,
        );
        expect(dataPackRegistrySubpath.dataPackResourcePath).toBe(
          packageRoot.dataPackResourcePath,
        );
        expect(clockSubpath.ClockPort).toBe(packageRoot.ClockPort);
        expect(clockSubpath.fixedClock).toBe(packageRoot.fixedClock);
        expect(clockSubpath.FixedClockLayer).toBe(packageRoot.FixedClockLayer);
        expect(equipmentSubpath.equip).toBe(packageRoot.equip);
        expect(equipmentSubpath.EQUIPMENT_CATALOG).toBe(
          packageRoot.EQUIPMENT_CATALOG,
        );
        expect(equipmentSubpath.ITEM_DURABILITY_CATALOG).toBe(
          packageRoot.ITEM_DURABILITY_CATALOG,
        );
        expect(enchantmentSubpath.planVanillaAnvil).toBe(
          packageRoot.planVanillaAnvil,
        );
        expect(enchantmentSubpath.SUPPORTED_VANILLA_ENCHANTMENT_IDS).toBe(
          packageRoot.SUPPORTED_VANILLA_ENCHANTMENT_IDS,
        );
        expect(enchantmentTableSubpath.generateEnchantmentTableOffers).toBe(
          packageRoot.generateEnchantmentTableOffers,
        );
        expect(enchantmentTableSubpath.VANILLA_ENCHANTMENT_TABLE_RULES).toBe(
          packageRoot.VANILLA_ENCHANTMENT_TABLE_RULES,
        );
        expect(grindstoneSubpath.grindstoneExperienceFor).toBe(
          packageRoot.grindstoneExperienceFor,
        );
        expect(grindstoneSubpath.planGrindstone).toBe(
          packageRoot.planGrindstone,
        );
        expect(grindstoneSubpath.GRINDSTONE_CURSE_ENCHANTMENT_IDS).toBe(
          packageRoot.GRINDSTONE_CURSE_ENCHANTMENT_IDS,
        );
        expect(identifiersSubpath.WorldId).toBe(packageRoot.WorldId);
        expect(identifiersSubpath.StageId).toBe(packageRoot.StageId);
        expect(identifiersSubpath.TagLocation).toBe(packageRoot.TagLocation);
        expect(itemComponentsSubpath.ITEM_COMPONENT_IDS).toBe(
          packageRoot.ITEM_COMPONENT_IDS,
        );
        expect(itemComponentsSubpath.ITEM_RARITIES).toBe(
          packageRoot.ITEM_RARITIES,
        );
        expect(itemComponentsSubpath.ITEMS_WITH_SINGLE_STACK_LIMIT).toBe(
          packageRoot.ITEMS_WITH_SINGLE_STACK_LIMIT,
        );
        expect(itemComponentsSubpath.ITEMS_WITH_SIXTEEN_STACK_LIMIT).toBe(
          packageRoot.ITEMS_WITH_SIXTEEN_STACK_LIMIT,
        );
        expect(itemComponentsSubpath.ITEM_TOOL_COMPONENTS).toBe(
          packageRoot.ITEM_TOOL_COMPONENTS,
        );
        expect(itemComponentsSubpath.itemComponentStackLimitOf).toBe(
          packageRoot.itemComponentStackLimitOf,
        );
        expect(itemComponentsSubpath.itemComponents).toBe(
          packageRoot.itemComponents,
        );
        expect(itemComponentsSubpath.itemToolComponentOf).toBe(
          packageRoot.itemToolComponentOf,
        );
        expect(itemComponentsSubpath.isItemComponents).toBe(
          packageRoot.isItemComponents,
        );
        expect(textComponentSubpath.textComponent).toBe(
          packageRoot.textComponent,
        );
        expect(textComponentSubpath.isTextComponent).toBe(
          packageRoot.isTextComponent,
        );
        expect(itemComponentValuesSubpath.DYE_COLORS).toBe(
          packageRoot.DYE_COLORS,
        );
        expect(itemComponentValuesSubpath.EQUIPPABLE_SLOTS).toBe(
          packageRoot.EQUIPPABLE_SLOTS,
        );
        expect(itemComponentValuesSubpath.potionDurationScaleComponent).toBe(
          packageRoot.potionDurationScaleComponent,
        );
        expect(itemComponentValuesSubpath.additionalTradeCostComponent).toBe(
          packageRoot.additionalTradeCostComponent,
        );
        expect(itemComponentValuesSubpath.breakSoundComponent).toBe(
          packageRoot.breakSoundComponent,
        );
        expect(itemComponentValuesSubpath.customDataComponent).toBe(
          packageRoot.customDataComponent,
        );
        expect(itemComponentValuesSubpath.providesBannerPatternsComponent).toBe(
          packageRoot.providesBannerPatternsComponent,
        );
        expect(itemComponentValuesSubpath.providesTrimMaterialComponent).toBe(
          packageRoot.providesTrimMaterialComponent,
        );
        expect(itemComponentValuesSubpath.dyeComponent).toBe(
          packageRoot.dyeComponent,
        );
        expect(itemComponentValuesSubpath.dyedColorComponent).toBe(
          packageRoot.dyedColorComponent,
        );
        expect(itemComponentValuesSubpath.customModelDataComponent).toBe(
          packageRoot.customModelDataComponent,
        );
        expect(itemComponentValuesSubpath.mapIdComponent).toBe(
          packageRoot.mapIdComponent,
        );
        expect(itemComponentValuesSubpath.blockStateComponent).toBe(
          packageRoot.blockStateComponent,
        );
        expect(itemComponentValuesSubpath.instrumentComponent).toBe(
          packageRoot.instrumentComponent,
        );
        expect(itemComponentValuesSubpath.noteBlockSoundComponent).toBe(
          packageRoot.noteBlockSoundComponent,
        );
        expect(itemComponentValuesSubpath.recipesComponent).toBe(
          packageRoot.recipesComponent,
        );
        expect(itemComponentValuesSubpath.lockComponent).toBe(
          packageRoot.lockComponent,
        );
        expect(itemComponentValuesSubpath.tooltipStyleComponent).toBe(
          packageRoot.tooltipStyleComponent,
        );
        expect(itemComponentValuesSubpath.baseColorComponent).toBe(
          packageRoot.baseColorComponent,
        );
        expect(itemComponentValuesSubpath.equippableComponent).toBe(
          packageRoot.equippableComponent,
        );
        expect(itemComponentValuesSubpath.gliderComponent).toBe(
          packageRoot.gliderComponent,
        );
        expect(itemComponentValuesSubpath.deathProtectionComponent).toBe(
          packageRoot.deathProtectionComponent,
        );
        expect(itemComponentValuesSubpath.repairableComponent).toBe(
          packageRoot.repairableComponent,
        );
        expect(itemComponentValuesSubpath.enchantableComponent).toBe(
          packageRoot.enchantableComponent,
        );
        expect(itemComponentValuesSubpath.jukeboxPlayableComponent).toBe(
          packageRoot.jukeboxPlayableComponent,
        );
        expect(itemComponentValuesSubpath.ominousBottleAmplifierComponent).toBe(
          packageRoot.ominousBottleAmplifierComponent,
        );
        expect(itemComponentValuesSubpath.paintingVariantComponent).toBe(
          packageRoot.paintingVariantComponent,
        );
        expect(itemComponentValuesSubpath.sulfurCubeContentComponent).toBe(
          packageRoot.sulfurCubeContentComponent,
        );
        expect(itemComponentValuesSubpath.tooltipDisplayComponent).toBe(
          packageRoot.tooltipDisplayComponent,
        );
        expect(itemComponentValuesSubpath.isPotionDurationScaleComponent).toBe(
          packageRoot.isPotionDurationScaleComponent,
        );
        expect(itemComponentValuesSubpath.isAdditionalTradeCostComponent).toBe(
          packageRoot.isAdditionalTradeCostComponent,
        );
        expect(itemComponentValuesSubpath.isBreakSoundComponent).toBe(
          packageRoot.isBreakSoundComponent,
        );
        expect(
          itemComponentValuesSubpath.isProvidesBannerPatternsComponent,
        ).toBe(packageRoot.isProvidesBannerPatternsComponent);
        expect(itemComponentValuesSubpath.isProvidesTrimMaterialComponent).toBe(
          packageRoot.isProvidesTrimMaterialComponent,
        );
        expect(itemComponentValuesSubpath.isDyeComponent).toBe(
          packageRoot.isDyeComponent,
        );
        expect(itemComponentValuesSubpath.isDyedColorComponent).toBe(
          packageRoot.isDyedColorComponent,
        );
        expect(itemComponentValuesSubpath.isCustomModelDataOptions).toBe(
          packageRoot.isCustomModelDataOptions,
        );
        expect(itemComponentValuesSubpath.isCustomModelDataComponent).toBe(
          packageRoot.isCustomModelDataComponent,
        );
        expect(itemComponentValuesSubpath.isMapIdComponent).toBe(
          packageRoot.isMapIdComponent,
        );
        expect(itemComponentValuesSubpath.isBlockStateComponent).toBe(
          packageRoot.isBlockStateComponent,
        );
        expect(itemComponentValuesSubpath.isInstrumentComponent).toBe(
          packageRoot.isInstrumentComponent,
        );
        expect(itemComponentValuesSubpath.isNoteBlockSoundComponent).toBe(
          packageRoot.isNoteBlockSoundComponent,
        );
        expect(itemComponentValuesSubpath.isRecipesComponent).toBe(
          packageRoot.isRecipesComponent,
        );
        expect(itemComponentValuesSubpath.isLockComponent).toBe(
          packageRoot.isLockComponent,
        );
        expect(itemComponentValuesSubpath.isTooltipStyleComponent).toBe(
          packageRoot.isTooltipStyleComponent,
        );
        expect(itemComponentValuesSubpath.isBaseColorComponent).toBe(
          packageRoot.isBaseColorComponent,
        );
        expect(itemComponentValuesSubpath.isResourceLocationProvider).toBe(
          packageRoot.isResourceLocationProvider,
        );
        expect(itemComponentValuesSubpath.isEquippableOptions).toBe(
          packageRoot.isEquippableOptions,
        );
        expect(itemComponentValuesSubpath.isEquippableComponent).toBe(
          packageRoot.isEquippableComponent,
        );
        expect(itemComponentValuesSubpath.isGliderComponent).toBe(
          packageRoot.isGliderComponent,
        );
        expect(itemComponentValuesSubpath.isDeathProtectionOptions).toBe(
          packageRoot.isDeathProtectionOptions,
        );
        expect(itemComponentValuesSubpath.isDeathProtectionComponent).toBe(
          packageRoot.isDeathProtectionComponent,
        );
        expect(itemComponentValuesSubpath.isRepairableComponent).toBe(
          packageRoot.isRepairableComponent,
        );
        expect(itemComponentValuesSubpath.isEnchantableValue).toBe(
          packageRoot.isEnchantableValue,
        );
        expect(itemComponentValuesSubpath.isEnchantableComponent).toBe(
          packageRoot.isEnchantableComponent,
        );
        expect(itemComponentValuesSubpath.isJukeboxPlayableComponent).toBe(
          packageRoot.isJukeboxPlayableComponent,
        );
        expect(
          itemComponentValuesSubpath.isOminousBottleAmplifierComponent,
        ).toBe(packageRoot.isOminousBottleAmplifierComponent);
        expect(itemComponentValuesSubpath.isPaintingVariantComponent).toBe(
          packageRoot.isPaintingVariantComponent,
        );
        expect(itemComponentValuesSubpath.isSulfurCubeContentOptions).toBe(
          packageRoot.isSulfurCubeContentOptions,
        );
        expect(itemComponentValuesSubpath.isSulfurCubeContentComponent).toBe(
          packageRoot.isSulfurCubeContentComponent,
        );
        expect(itemComponentValuesSubpath.isTooltipDisplayComponent).toBe(
          packageRoot.isTooltipDisplayComponent,
        );
        expect(
          itemAttributeModifiersSubpath.ATTRIBUTE_MODIFIER_OPERATIONS,
        ).toBe(packageRoot.ATTRIBUTE_MODIFIER_OPERATIONS);
        expect(itemAttributeModifiersSubpath.ATTRIBUTE_MODIFIER_SLOTS).toBe(
          packageRoot.ATTRIBUTE_MODIFIER_SLOTS,
        );
        expect(itemAttributeModifiersSubpath.attributeModifierDisplay).toBe(
          packageRoot.attributeModifierDisplay,
        );
        expect(itemAttributeModifiersSubpath.attributeModifier).toBe(
          packageRoot.attributeModifier,
        );
        expect(itemAttributeModifiersSubpath.attributeModifiersComponent).toBe(
          packageRoot.attributeModifiersComponent,
        );
        expect(itemAttributeModifiersSubpath.isAttributeModifierDisplay).toBe(
          packageRoot.isAttributeModifierDisplay,
        );
        expect(itemAttributeModifiersSubpath.isAttributeModifier).toBe(
          packageRoot.isAttributeModifier,
        );
        expect(
          itemAttributeModifiersSubpath.isAttributeModifiersComponent,
        ).toBe(packageRoot.isAttributeModifiersComponent);
        expect(itemCombatSubpath.SWING_ANIMATION_TYPES).toBe(
          packageRoot.SWING_ANIMATION_TYPES,
        );
        expect(itemCombatSubpath.useEffectsComponent).toBe(
          packageRoot.useEffectsComponent,
        );
        expect(itemCombatSubpath.minimumAttackChargeComponent).toBe(
          packageRoot.minimumAttackChargeComponent,
        );
        expect(itemCombatSubpath.damageTypeComponent).toBe(
          packageRoot.damageTypeComponent,
        );
        expect(itemCombatSubpath.swingAnimationComponent).toBe(
          packageRoot.swingAnimationComponent,
        );
        expect(itemCombatSubpath.attackRangeComponent).toBe(
          packageRoot.attackRangeComponent,
        );
        expect(itemCombatSubpath.isUseEffectsComponent).toBe(
          packageRoot.isUseEffectsComponent,
        );
        expect(itemCombatSubpath.isMinimumAttackChargeComponent).toBe(
          packageRoot.isMinimumAttackChargeComponent,
        );
        expect(itemCombatSubpath.isDamageTypeComponent).toBe(
          packageRoot.isDamageTypeComponent,
        );
        expect(itemCombatSubpath.isSwingAnimationComponent).toBe(
          packageRoot.isSwingAnimationComponent,
        );
        expect(itemCombatSubpath.isAttackRangeComponent).toBe(
          packageRoot.isAttackRangeComponent,
        );
        expect(itemDefenseSubpath.blocksAttacksComponent).toBe(
          packageRoot.blocksAttacksComponent,
        );
        expect(itemDefenseSubpath.damageResistantComponent).toBe(
          packageRoot.damageResistantComponent,
        );
        expect(itemDefenseSubpath.isBlocksAttacksComponent).toBe(
          packageRoot.isBlocksAttacksComponent,
        );
        expect(itemDefenseSubpath.isDamageReductionRule).toBe(
          packageRoot.isDamageReductionRule,
        );
        expect(itemDefenseSubpath.isDamageResistantComponent).toBe(
          packageRoot.isDamageResistantComponent,
        );
        expect(itemDefenseSubpath.isItemDamageRule).toBe(
          packageRoot.isItemDamageRule,
        );
        expect(itemEnchantmentsSubpath.enchantmentsComponent).toBe(
          packageRoot.enchantmentsComponent,
        );
        expect(itemEnchantmentsSubpath.storedEnchantmentsComponent).toBe(
          packageRoot.storedEnchantmentsComponent,
        );
        expect(itemEnchantmentsSubpath.isEnchantmentLevelMap).toBe(
          packageRoot.isEnchantmentLevelMap,
        );
        expect(itemEnchantmentsSubpath.isEnchantmentsComponent).toBe(
          packageRoot.isEnchantmentsComponent,
        );
        expect(itemEnchantmentsSubpath.isStoredEnchantmentsComponent).toBe(
          packageRoot.isStoredEnchantmentsComponent,
        );
        expect(itemStackSubpath.itemStack).toBe(packageRoot.itemStack);
        expect(itemStackSubpath.isItemStack).toBe(packageRoot.isItemStack);
        expect(itemRegistrySubpath.ITEM_REGISTRY).toBe(
          packageRoot.ITEM_REGISTRY,
        );
        expect(itemRegistrySubpath.itemIdOf).toBe(packageRoot.itemIdOf);
        expect(itemRegistrySubpath.encodeItemId).toBe(packageRoot.encodeItemId);
        expect(itemTypeSubpath.ITEM_TYPES).toBe(packageRoot.ITEM_TYPES);
        expect(itemTypeSubpath.isItemType).toBe(packageRoot.isItemType);
        expect(inventorySubpath.INVENTORY_SLOT_COUNT).toBe(
          packageRoot.INVENTORY_SLOT_COUNT,
        );
        expect(inventorySubpath.emptyInventory).toBe(
          packageRoot.emptyInventory,
        );
        expect(inventorySubpath.addItem).toBe(packageRoot.addItem);
        expect(inventorySubpath.removeItemAt).toBe(packageRoot.removeItemAt);
        expect(inventorySubpath.removeItem).toBe(packageRoot.removeItem);
        expect(inventorySubpath.normaliseInventory).toBe(
          packageRoot.normaliseInventory,
        );
        expect(hotbarSubpath.HOTBAR_SIZE).toBe(packageRoot.HOTBAR_SIZE);
        expect(hotbarSubpath.HOTBAR_START).toBe(packageRoot.HOTBAR_START);
        expect(hotbarSubpath.isHotbarIndex).toBe(packageRoot.isHotbarIndex);
        expect(hotbarSubpath.clampHotbarIndex).toBe(
          packageRoot.clampHotbarIndex,
        );
        expect(hotbarSubpath.cycleHotbarIndex).toBe(
          packageRoot.cycleHotbarIndex,
        );
        expect(hotbarSubpath.hotbarSlotIndex).toBe(packageRoot.hotbarSlotIndex);
        expect(quantitiesSubpath.MAX_STACK_COUNT).toBe(
          packageRoot.MAX_STACK_COUNT,
        );
        expect(quantitiesSubpath.StackCount).toBe(packageRoot.StackCount);
        expect(quantitiesSubpath.MaxStackSize).toBe(packageRoot.MaxStackSize);
        expect(quantitiesSubpath.MaxDamage).toBe(packageRoot.MaxDamage);
        expect(quantitiesSubpath.ItemDamage).toBe(packageRoot.ItemDamage);
        expect(quantitiesSubpath.RepairCost).toBe(packageRoot.RepairCost);
        expect(quantitiesSubpath.WeaponDisableBlockingSeconds).toBe(
          packageRoot.WeaponDisableBlockingSeconds,
        );
        expect(quantitiesSubpath.PotionDurationScale).toBe(
          packageRoot.PotionDurationScale,
        );
        expect(quantitiesSubpath.AdditionalTradeCost).toBe(
          packageRoot.AdditionalTradeCost,
        );
        expect(quantitiesSubpath.MapId).toBe(packageRoot.MapId);
        expect(quantitiesSubpath.EnchantmentLevel).toBe(
          packageRoot.EnchantmentLevel,
        );
        expect(quantitiesSubpath.AttributeModifierAmount).toBe(
          packageRoot.AttributeModifierAmount,
        );
        expect(quantitiesSubpath.Bounciness).toBe(packageRoot.Bounciness);
        expect(quantitiesSubpath.EntityPhysicsModifier).toBe(
          packageRoot.EntityPhysicsModifier,
        );
        expect(quantitiesSubpath.EntityVisibilityDistance).toBe(
          packageRoot.EntityVisibilityDistance,
        );
        expect(quantitiesSubpath.KnockbackResistance).toBe(
          packageRoot.KnockbackResistance,
        );
        expect(quantitiesSubpath.DeltaTimeSecs).toBe(packageRoot.DeltaTimeSecs);
        expect(quantitiesSubpath.CooldownSeconds).toBe(
          packageRoot.CooldownSeconds,
        );
        expect(quantitiesSubpath.ConsumeSeconds).toBe(
          packageRoot.ConsumeSeconds,
        );
        expect(recipeSubpath.matchRecipe).toBe(packageRoot.matchRecipe);
        expect(recipeSubpath.matchRecipeWithAssignments).toBe(
          packageRoot.matchRecipeWithAssignments,
        );
        expect(recipeSubpath.VANILLA_CRAFTING_RECIPES).toBe(
          packageRoot.VANILLA_CRAFTING_RECIPES,
        );
        expect(craftingSubpath.craftFromGrid).toBe(packageRoot.craftFromGrid);
        expect(brewingSubpath.advanceBrewing).toBe(packageRoot.advanceBrewing);
        expect(brewingSubpath.VANILLA_BREWING_RECIPES).toBe(
          packageRoot.VANILLA_BREWING_RECIPES,
        );
        expect(cookingSubpath.cookingRecipe).toBe(packageRoot.cookingRecipe);
        expect(cookingSubpath.matchCookingRecipes).toBe(
          packageRoot.matchCookingRecipes,
        );
        expect(cookingSubpath.applyCooking).toBe(packageRoot.applyCooking);
        expect(cameraPoseSubpath.applyLook).toBe(packageRoot.applyLook);
        expect(cameraPoseSubpath.cameraPoseOf).toBe(packageRoot.cameraPoseOf);
        expect(cameraPoseSubpath.forwardVector).toBe(packageRoot.forwardVector);
        expect(cameraPoseSubpath.INITIAL_PLAYER_POSE).toBe(
          packageRoot.INITIAL_PLAYER_POSE,
        );
        expect(smeltingSubpath.advanceFurnace).toBe(packageRoot.advanceFurnace);
        expect(smeltingSubpath.VANILLA_SMELTING_RECIPES).toBe(
          packageRoot.VANILLA_SMELTING_RECIPES,
        );
        expect(smithingSubpath.applySmithing).toBe(packageRoot.applySmithing);
        expect(smithingSubpath.VANILLA_SMITHING_RECIPES).toBe(
          packageRoot.VANILLA_SMITHING_RECIPES,
        );
        expect(stonecuttingSubpath.matchStonecuttingRecipes).toBe(
          packageRoot.matchStonecuttingRecipes,
        );
        expect(stonecuttingSubpath.matchStonecuttingRecipe).toBe(
          packageRoot.matchStonecuttingRecipe,
        );
        expect(stonecuttingSubpath.applyStonecutting).toBe(
          packageRoot.applyStonecutting,
        );
        expect(stonecuttingSubpath.VANILLA_STONECUTTING_RECIPES).toBe(
          packageRoot.VANILLA_STONECUTTING_RECIPES,
        );
        expect(transmuteSubpath.transmuteRecipe).toBe(
          packageRoot.transmuteRecipe,
        );
        expect(transmuteSubpath.matchTransmuteRecipes).toBe(
          packageRoot.matchTransmuteRecipes,
        );
        expect(transmuteSubpath.applyTransmute).toBe(
          packageRoot.applyTransmute,
        );
        expect(cropSubpath.CROP_TYPES).toBe(packageRoot.CROP_TYPES);
        expect(cropSubpath.CROP_REGISTRY).toBe(packageRoot.CROP_REGISTRY);
        expect(cropSubpath.advanceCrop).toBe(packageRoot.advanceCrop);
        expect(cropSubpath.advanceCropByBoneMeal).toBe(
          packageRoot.advanceCropByBoneMeal,
        );
        expect(dimensionSubpath.DIMENSIONS).toBe(packageRoot.DIMENSIONS);
        expect(dimensionSubpath.isDimension).toBe(packageRoot.isDimension);
        expect(entitySubpath.EntityId).toBe(packageRoot.EntityId);
        expect(entitySubpath.EntityKind).toBe(packageRoot.EntityKind);
        expect(entitySubpath.mintEntityId).toBe(packageRoot.mintEntityId);
        expect(entitySubpath.normaliseRoster).toBe(packageRoot.normaliseRoster);
        expect(entitySubpath.ENTITY_ATTRIBUTE_DEFINITIONS).toBe(
          packageRoot.ENTITY_ATTRIBUTE_DEFINITIONS,
        );
        expect(entitySubpath.ENTITY_ATTRIBUTE_NAMES).toBe(
          packageRoot.ENTITY_ATTRIBUTE_NAMES,
        );
        expect(entitySubpath.DEFAULT_ENTITY_ATTRIBUTES).toBe(
          packageRoot.DEFAULT_ENTITY_ATTRIBUTES,
        );
        expect(entitySubpath.entityAttributes).toBe(
          packageRoot.entityAttributes,
        );
        expect(entitySubpath.entityAttributeDefinitionOf).toBe(
          packageRoot.entityAttributeDefinitionOf,
        );
        expect(entitySubpath.effectiveBounciness).toBe(
          packageRoot.effectiveBounciness,
        );
        expect(entitySubpath.isEntityAttributeOptions).toBe(
          packageRoot.isEntityAttributeOptions,
        );
        expect(entitySubpath.isEntityAttributes).toBe(
          packageRoot.isEntityAttributes,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_ARCHETYPE_REGISTRY).toBe(
          packageRoot.SULFUR_CUBE_ARCHETYPE_REGISTRY,
        );
        expect(
          sulfurCubeSubpath.SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
        ).toBe(packageRoot.SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS);
        expect(sulfurCubeSubpath.SULFUR_CUBE_BLOCK_TAGS).toBe(
          packageRoot.SULFUR_CUBE_BLOCK_TAGS,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_COMPONENTS).toBe(
          packageRoot.SULFUR_CUBE_COMPONENTS,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_DAMAGE_TYPES).toBe(
          packageRoot.SULFUR_CUBE_DAMAGE_TYPES,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_DAMAGE_TYPE_TAGS).toBe(
          packageRoot.SULFUR_CUBE_DAMAGE_TYPE_TAGS,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_ENTITY_TAGS).toBe(
          packageRoot.SULFUR_CUBE_ENTITY_TAGS,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_GAME_EVENTS).toBe(
          packageRoot.SULFUR_CUBE_GAME_EVENTS,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_ITEM_TAGS).toBe(
          packageRoot.SULFUR_CUBE_ITEM_TAGS,
        );
        expect(sulfurCubeSubpath.SULFUR_CUBE_PARTICLES).toBe(
          packageRoot.SULFUR_CUBE_PARTICLES,
        );
        expect(sulfurCubeSubpath.sulfurCubeArchetype).toBe(
          packageRoot.sulfurCubeArchetype,
        );
        expect(sulfurCubeSubpath.sulfurCubeArchetypeFromUnknown).toBe(
          packageRoot.sulfurCubeArchetypeFromUnknown,
        );
        expect(sulfurCubeSubpath.isSulfurCubeArchetype).toBe(
          packageRoot.isSulfurCubeArchetype,
        );
        expect(sulfurCubeSubpath.isSulfurCubeArchetypeOptions).toBe(
          packageRoot.isSulfurCubeArchetypeOptions,
        );
        expect(sulfurCubeRegistrySubpath.sulfurCubeArchetypeDataPackLayer).toBe(
          packageRoot.sulfurCubeArchetypeDataPackLayer,
        );
        expect(
          sulfurCubeRegistrySubpath.sulfurCubeArchetypeDataPackLayerFromUnknown,
        ).toBe(packageRoot.sulfurCubeArchetypeDataPackLayerFromUnknown);
        expect(sulfurCubeRegistrySubpath.selectSulfurCubeArchetypes).toBe(
          packageRoot.selectSulfurCubeArchetypes,
        );
        expect(sulfurCubeRegistrySubpath.sulfurCubeArchetypeDataPath).toBe(
          packageRoot.sulfurCubeArchetypeDataPath,
        );
        expect(blockWorldSubpath.emptyBlockWorld).toBe(
          packageRoot.emptyBlockWorld,
        );
        expect(blockWorldSubpath.blockAt).toBe(packageRoot.blockAt);
        expect(blockWorldSubpath.blockReaderOf).toBe(packageRoot.blockReaderOf);
        expect(blockWorldSubpath.readBlockAt).toBe(packageRoot.readBlockAt);
        expect(blockWorldSubpath.setBlockAt).toBe(packageRoot.setBlockAt);
        expect(fluidSubpath.FLUID_BLOCK_IDS).toBe(packageRoot.FLUID_BLOCK_IDS);
        expect(fluidSubpath.fluidLevel).toBe(packageRoot.fluidLevel);
        expect(fluidSubpath.setFluidCell).toBe(packageRoot.setFluidCell);
        expect(fluidSubpath.scheduleFluidAt).toBe(packageRoot.scheduleFluidAt);
        expect(fluidUpdateSubpath.fluidStateFromWorld).toBe(
          packageRoot.fluidStateFromWorld,
        );
        expect(fluidUpdateSubpath.canFluidReplace).toBe(
          packageRoot.canFluidReplace,
        );
        expect(fluidUpdateSubpath.updateFluids).toBe(packageRoot.updateFluids);
        expect(foodSubpath.FOOD_DEFINITION_BY_ITEM).toBe(
          packageRoot.FOOD_DEFINITION_BY_ITEM,
        );
        expect(foodSubpath.VANILLA_FOOD_DEFINITIONS).toBe(
          packageRoot.VANILLA_FOOD_DEFINITIONS,
        );
        expect(foodSubpath.foodDefinitionOf).toBe(packageRoot.foodDefinitionOf);
        expect(foodSubpath.canEatFood).toBe(packageRoot.canEatFood);
        expect(foodSubpath.foodRemainderOf).toBe(packageRoot.foodRemainderOf);
        expect(foodSubpath.consumeFood).toBe(packageRoot.consumeFood);
        expect(consumableSubpath.CONSUMABLE_ANIMATIONS).toBe(
          packageRoot.CONSUMABLE_ANIMATIONS,
        );
        expect(consumableSubpath.DEFAULT_CONSUMABLE_COMPONENT).toBe(
          packageRoot.DEFAULT_CONSUMABLE_COMPONENT,
        );
        expect(consumableSubpath.consumableApplyEffects).toBe(
          packageRoot.consumableApplyEffects,
        );
        expect(consumableSubpath.consumableClearAllEffects).toBe(
          packageRoot.consumableClearAllEffects,
        );
        expect(consumableSubpath.consumableComponent).toBe(
          packageRoot.consumableComponent,
        );
        expect(consumableSubpath.foodComponentOf).toBe(
          packageRoot.foodComponentOf,
        );
        expect(consumableSubpath.consumableComponentOf).toBe(
          packageRoot.consumableComponentOf,
        );
        expect(consumableSubpath.consumablePlaySound).toBe(
          packageRoot.consumablePlaySound,
        );
        expect(consumableSubpath.consumableRemoveEffects).toBe(
          packageRoot.consumableRemoveEffects,
        );
        expect(consumableSubpath.consumableStatusEffect).toBe(
          packageRoot.consumableStatusEffect,
        );
        expect(consumableSubpath.consumableTeleportRandomly).toBe(
          packageRoot.consumableTeleportRandomly,
        );
        expect(consumableSubpath.useRemainderComponentOf).toBe(
          packageRoot.useRemainderComponentOf,
        );
        expect(consumableSubpath.itemUseComponentsOf).toBe(
          packageRoot.itemUseComponentsOf,
        );
        expect(consumableSubpath.isConsumableComponent).toBe(
          packageRoot.isConsumableComponent,
        );
        expect(consumableSubpath.isConsumableEffect).toBe(
          packageRoot.isConsumableEffect,
        );
        expect(consumableSubpath.isConsumableStatusEffect).toBe(
          packageRoot.isConsumableStatusEffect,
        );
        expect(consumableSubpath.isFoodComponent).toBe(
          packageRoot.isFoodComponent,
        );
        expect(consumableSubpath.isItemUseComponents).toBe(
          packageRoot.isItemUseComponents,
        );
        expect(consumableSubpath.isUseRemainderComponent).toBe(
          packageRoot.isUseRemainderComponent,
        );
        expect(useCooldownSubpath.useCooldownComponent).toBe(
          packageRoot.useCooldownComponent,
        );
        expect(useCooldownSubpath.cooldownExpiresAt).toBe(
          packageRoot.cooldownExpiresAt,
        );
        expect(useCooldownSubpath.isCooldownActive).toBe(
          packageRoot.isCooldownActive,
        );
        expect(useCooldownSubpath.isUseCooldownComponent).toBe(
          packageRoot.isUseCooldownComponent,
        );
        expect(portalSubpath.detectNetherPortal).toBe(
          packageRoot.detectNetherPortal,
        );
        expect(portalSubpath.generatePortalLayout).toBe(
          packageRoot.generatePortalLayout,
        );
        expect(redstoneSubpath.REDSTONE_BLOCK_IDS).toBe(
          packageRoot.REDSTONE_BLOCK_IDS,
        );
        expect(redstoneSubpath.redstonePower).toBe(packageRoot.redstonePower);
        expect(redstoneSubpath.setRedstoneDevice).toBe(
          packageRoot.setRedstoneDevice,
        );
        expect(redstoneNetworkSubpath.collectRedstoneLayout).toBe(
          packageRoot.collectRedstoneLayout,
        );
        expect(redstoneNetworkSubpath.sourcePowerAt).toBe(
          packageRoot.sourcePowerAt,
        );
        expect(redstoneNetworkSubpath.deviceOutputFace).toBe(
          packageRoot.deviceOutputFace,
        );
        expect(redstoneNetworkSubpath.deviceOutputAtTarget).toBe(
          packageRoot.deviceOutputAtTarget,
        );
        expect(redstoneNetworkSubpath.poweredWiresFrom).toBe(
          packageRoot.poweredWiresFrom,
        );
        expect(redstoneNetworkSubpath.signalPowerAt).toBe(
          packageRoot.signalPowerAt,
        );
        expect(redstoneNetworkSubpath.wirePowerChanges).toBe(
          packageRoot.wirePowerChanges,
        );
        expect(redstoneNetworkSubpath.blockIsWire).toBe(
          packageRoot.blockIsWire,
        );
        expect(redstoneUpdateSubpath.updateRedstone).toBe(
          packageRoot.updateRedstone,
        );
        expect(projectileSubpath.launchArrow).toBe(packageRoot.launchArrow);
        expect(projectileSubpath.stepArrow).toBe(packageRoot.stepArrow);
        expect(projectileSubpath.ARROW_GRAVITY).toBe(packageRoot.ARROW_GRAVITY);
        expect(explosionSubpath.planExplosion).toBe(packageRoot.planExplosion);
        expect(explosionSubpath.applyExplosionPlan).toBe(
          packageRoot.applyExplosionPlan,
        );
        expect(explosionSubpath.DEFAULT_EXPLOSION_LIMITS).toBe(
          packageRoot.DEFAULT_EXPLOSION_LIMITS,
        );
        expect(frameSubpath).toBeDefined();
        expect(frameTimingSubpath.clampFrameDelta).toBe(
          packageRoot.clampFrameDelta,
        );
        expect(frameTimingSubpath.frameDeltaBetween).toBe(
          packageRoot.frameDeltaBetween,
        );
        expect(primedTntSubpath.primeTnt).toBe(packageRoot.primeTnt);
        expect(primedTntSubpath.planPrimedTnt).toBe(packageRoot.planPrimedTnt);
        expect(primedTntSubpath.applyPrimedTntPlan).toBe(
          packageRoot.applyPrimedTntPlan,
        );
        expect(primedTntSubpath.DEFAULT_TNT_FUSE_SECS).toBe(
          packageRoot.DEFAULT_TNT_FUSE_SECS,
        );
        expect(toolComponentSubpath.compileToolComponent).toBe(
          packageRoot.compileToolComponent,
        );
        expect(toolComponentSubpath.resolveToolMiningProperties).toBe(
          packageRoot.resolveToolMiningProperties,
        );
        expect(toolComponentSubpath.isToolComponent).toBe(
          packageRoot.isToolComponent,
        );
        expect(weaponSubpath.weaponComponent).toBe(packageRoot.weaponComponent);
        expect(weaponSubpath.isWeaponComponent).toBe(
          packageRoot.isWeaponComponent,
        );
        expect(timeOfDaySubpath.timeOfDay).toBe(packageRoot.timeOfDay);
        expect(timeOfDaySubpath.setDayLengthThenTimeOfDay).toBe(
          packageRoot.setDayLengthThenTimeOfDay,
        );
        expect(timeOfDaySubpath.INITIAL_TIME_STATE).toBe(
          packageRoot.INITIAL_TIME_STATE,
        );
        expect(vitalsSubpath.isDead).toBe(packageRoot.isDead);
        expect(vitalsSubpath.normaliseVitals).toBe(packageRoot.normaliseVitals);
        expect(vitalsSubpath.SPAWN_VITALS).toBe(packageRoot.SPAWN_VITALS);
        expect(vehicleSubpath.VEHICLE_TYPES).toBe(packageRoot.VEHICLE_TYPES);
        expect(vehicleSubpath.isVehicleType).toBe(packageRoot.isVehicleType);
        expect(vehicleSubpath.VehicleId).toBe(packageRoot.VehicleId);
        expect(vehicleSubpath.OccupantId).toBe(packageRoot.OccupantId);
        expect(vehicleSubpath.validateVehicleSnapshot).toBe(
          packageRoot.validateVehicleSnapshot,
        );
        expect(vehicleSubpath.emptyVehicleSnapshot).toBe(
          packageRoot.emptyVehicleSnapshot,
        );
        expect(weatherSubpath.isWeather).toBe(packageRoot.isWeather);
        expect(weatherSubpath.normaliseWeatherState).toBe(
          packageRoot.normaliseWeatherState,
        );
        expect(weatherSubpath.INITIAL_WEATHER_STATE).toBe(
          packageRoot.INITIAL_WEATHER_STATE,
        );
        expect(witherSubpath.WITHER_MAX_HEALTH).toBe(
          packageRoot.WITHER_MAX_HEALTH,
        );
        expect(witherSubpath.WITHER_SPAWN_CHARGE_SECS).toBe(
          packageRoot.WITHER_SPAWN_CHARGE_SECS,
        );
        expect(witherSubpath.WITHER_ARMOUR_THRESHOLD).toBe(
          packageRoot.WITHER_ARMOUR_THRESHOLD,
        );
        expect(witherSubpath.WITHER_REGEN_PER_SEC).toBe(
          packageRoot.WITHER_REGEN_PER_SEC,
        );
        expect(witherSubpath.WITHER_FOLLOW_ACCELERATION).toBe(
          packageRoot.WITHER_FOLLOW_ACCELERATION,
        );
        expect(witherSubpath.WITHER_MAX_SPEED).toBe(
          packageRoot.WITHER_MAX_SPEED,
        );
        expect(witherSubpath.createWither).toBe(packageRoot.createWither);
        expect(witherSubpath.stepWither).toBe(packageRoot.stepWither);
        expect(witherSubpath.damageWither).toBe(packageRoot.damageWither);
        expect(witherSubpath.witherSkullProjectile).toBe(
          packageRoot.witherSkullProjectile,
        );
        expect(witherSubpath.matchWitherSummon).toBe(
          packageRoot.matchWitherSummon,
        );
        expect(witherSubpath.serializeWither).toBe(packageRoot.serializeWither);
        expect(witherSubpath.restoreWither).toBe(packageRoot.restoreWither);
      }),
    ));
  it("supports settings and statistics package subpath exports", () =>
    Effect.runPromise(
      Effect.promise(async () => {
        const packageRootPath = "@nerima-games/mc-kernel";
        const settingsPath = "@nerima-games/mc-kernel/domain/settings";
        const statisticsPath = "@nerima-games/mc-kernel/domain/statistics";
        const packageRoot = await import(packageRootPath);
        const settingsSubpath = await import(settingsPath);
        const statisticsSubpath = await import(statisticsPath);

        expect(settingsSubpath.DEFAULT_SETTINGS).toBe(
          packageRoot.DEFAULT_SETTINGS,
        );
        expect(settingsSubpath.normaliseSettings).toBe(
          packageRoot.normaliseSettings,
        );
        expect(settingsSubpath.isValidSettings).toBe(
          packageRoot.isValidSettings,
        );
        expect(statisticsSubpath.EMPTY_STATISTICS).toBe(
          packageRoot.EMPTY_STATISTICS,
        );
        expect(statisticsSubpath.normaliseStatistics).toBe(
          packageRoot.normaliseStatistics,
        );
        expect(statisticsSubpath.isValidStatistics).toBe(
          packageRoot.isValidStatistics,
        );
      }),
    ));
  it("exports the canonical Eye of Ender item identity", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(kernel.isItemType("eye_of_ender")).toBe(true);
        expect(kernel.itemIdOf("eye_of_ender")).toBe(
          kernel.itemDefinitionOf("eye_of_ender").id,
        );
        expect(kernel.isPlaceableItem("eye_of_ender")).toBe(false);
      }),
    ));

  it("exports the canonical redstone dust placement bridge", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(kernel.isPlaceableItem("redstone_dust")).toBe(true);
        expect(kernel.blockOfPlaceableItem("redstone_dust")).toBe(
          "redstone_wire",
        );
        expect(kernel.itemOfBlock("redstone_wire")).toBe("redstone_dust");
      }),
    ));

  it("exports the canonical enchanted-book item identity", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expectCanonicalItem("enchanted_book", {
          id: ENCHANTED_BOOK_ID,
          maxStack: SINGLE_ITEM_STACK,
        });
      }),
    ));

  it("exports the canonical plain-book item identity", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expectCanonicalItem("book", {
          id: BOOK_ID,
          maxStack: STANDARD_ITEM_STACK,
        });
      }),
    ));

  it("exports fluid and vehicle item identities with canonical metadata", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expectCanonicalItem("bucket", {
          id: BUCKET_ID,
          maxStack: BUCKET_MAX_STACK,
        });
        for (const type of [
          "water_bucket",
          "lava_bucket",
          "oak_boat",
          "minecart",
        ] as const) {
          expectCanonicalItem(type, { maxStack: SINGLE_ITEM_STACK });
        }
      }),
    ));

  it("exports fishing item identities with canonical metadata", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expectCanonicalItem("fishing_rod", {
          id: FISHING_ROD_ID,
          maxStack: SINGLE_ITEM_STACK,
        });
        expectCanonicalItem("saddle", {
          id: SADDLE_ID,
          maxStack: SINGLE_ITEM_STACK,
        });
        const stackableFishingItems = [
          "cod",
          "salmon",
          "tropical_fish",
          "pufferfish",
          "bowl",
          "leather",
          "bone",
          "name_tag",
        ] as const;
        for (const type of stackableFishingItems) {
          expectCanonicalItem(type, { maxStack: STANDARD_ITEM_STACK });
        }
      }),
    ));
});

// A star export silently drops a name that two modules both export, so the
// barrel can lose a binding without any tool reporting an error. Comparing the
// identity of every runtime export against its owning module is what catches it.
describe("shared vocabulary added for the downstream repositories", () => {
  const newModules = {
    biome: biomeModule,
    "block-entity": blockEntityModule,
    "damage-type": damageTypeModule,
    "entity-type": entityTypeModule,
    "game-mode": gameModeModule,
    "game-rule": gameRuleModule,
    heightmap: heightmapModule,
    light: lightModule,
    "random-source": randomSourceModule,
    "status-effect": statusEffectModule,
    "tag-membership": tagMembershipModule,
  };

  it("reaches every runtime export through the package barrel", () =>
    Effect.runPromise(
      Effect.sync(() => {
        const barrel: Readonly<Record<string, unknown>> = kernel;
        for (const [name, owner] of Object.entries(newModules)) {
          const owned: Readonly<Record<string, unknown>> = owner;
          const names = Object.keys(owned);
          expect(names.length, `${name} exports nothing at runtime`).toBeGreaterThan(0);
          for (const exported of names) {
            expect(barrel[exported], `${name}.${exported}`).toBe(owned[exported]);
          }
        }
      }),
    ));

  it("narrows the closed vocabularies and rejects values outside them", () =>
    Effect.runPromise(
      Effect.sync(() => {
        expect(entityTypeModule.isEntityType("creeper")).toBe(true);
        expect(entityTypeModule.isEntityType("not_an_entity")).toBe(false);
        expect(statusEffectModule.isStatusEffectName("poison")).toBe(true);
        expect(statusEffectModule.isStatusEffectName("not_an_effect")).toBe(false);
        expect(biomeModule.isBiomeType("plains")).toBe(true);
        expect(biomeModule.isBiomeType("not_a_biome")).toBe(false);
        expect(damageTypeModule.isDamageTypeName("lava")).toBe(true);
        expect(damageTypeModule.isDamageTypeName("not_a_damage_type")).toBe(false);
        expect(gameModeModule.isGameMode("creative")).toBe(true);
        expect(gameModeModule.isGameMode("not_a_mode")).toBe(false);
        expect(gameModeModule.isDifficulty("hard")).toBe(true);
        expect(gameModeModule.isDifficulty("not_a_difficulty")).toBe(false);
      }),
    ));
});

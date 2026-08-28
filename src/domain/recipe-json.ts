import { dataPackResourcePath } from "./data-pack-registry.js";
import {
  cookingRecipe,
  type CookingRecipe,
  type CookingStation,
} from "./cooking-data.js";
import {
  FIREWORK_EXPLOSION_SHAPES,
  type FireworkExplosionShape,
} from "./item-component-values-data.js";
import {
  craftingBannerDuplicateRecipe,
  craftingBookCloningRecipe,
  craftingDecoratedPotRecipe,
  craftingDyeRecipe,
  craftingFireworkRocketRecipe,
  craftingFireworkStarFadeRecipe,
  craftingFireworkStarRecipe,
  craftingImbueRecipe,
  craftingMapExtendingRecipe,
  craftingShieldDecorationRecipe,
  type CraftingBannerDuplicateRecipe,
  type CraftingBookCloningRecipe,
  type CraftingDecoratedPotRecipe,
  type CraftingDyeRecipe,
  type CraftingFireworkRocketRecipe,
  type CraftingFireworkStarFadeRecipe,
  type CraftingFireworkStarRecipe,
  type CraftingImbueRecipe,
  type CraftingMapExtendingRecipe,
  type CraftingShieldDecorationRecipe,
} from "./crafting-special-data.js";
import {
  ResourceLocation,
  NamespacedResourceLocation,
  type NamespacedResourceLocation as NamespacedResourceLocationValue,
} from "./identifiers.js";
import { itemComponentPatchFromUnknown } from "./item-component-patch.js";
import { isItemType, type ItemType } from "./item-type.js";
import { itemStack } from "./item-stack.js";
import {
  anyOf,
  shapelessRecipe,
  shapedRecipe,
  tagged,
  type CraftingIngredientInput,
  type Recipe,
  type RecipeCategory,
  type RecipeOptions,
} from "./recipe-data.js";
import {
  SMITHING_STATION_TAG,
  smithingTransformRecipe,
  smithingTrimRecipe,
  type SmithingRecipe,
  type SmithingTransformRecipe,
  type SmithingTrimRecipe,
} from "./smithing-data.js";
import {
  stonecuttingRecipe,
  type StonecuttingRecipe,
} from "./stonecutting-data.js";
import {
  transmuteRecipe,
  type TransmuteMaterialCount,
  type TransmuteRecipe,
} from "./transmute-data.js";

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: UnknownRecord,
  keys: ReadonlyArray<string>,
): boolean => Object.keys(value).every((key) => keys.includes(key));

const hasAllKeys = (
  value: UnknownRecord,
  keys: ReadonlyArray<string>,
): boolean => keys.every((key) => Object.hasOwn(value, key));

const minecraftItemOf = (value: unknown, allowAir: boolean): ItemType => {
  if (typeof value !== "string" || !NamespacedResourceLocation.is(value)) {
    throw new TypeError(
      `Recipe item must be a namespaced id, received ${String(value)}`,
    );
  }
  const separator = value.indexOf(":");
  if (value.slice(0, separator) !== "minecraft") {
    throw new TypeError(
      `Kernel recipe decoder only supports vanilla items, received ${value}`,
    );
  }
  const item = value.slice(separator + 1);
  if ((!allowAir && item === "air") || !isItemType(item)) {
    throw new TypeError(`Unknown recipe item, received ${value}`);
  }
  return item;
};

const itemTagOf = (value: string): `#${NamespacedResourceLocationValue}` => {
  const location = value.slice(1);
  if (!NamespacedResourceLocation.is(location)) {
    throw new TypeError(
      `Recipe item tag must be namespaced, received ${value}`,
    );
  }
  return `#${location}`;
};

const decodeIngredient = (value: unknown): CraftingIngredientInput => {
  if (typeof value === "string") {
    if (value.startsWith("#")) {
      return tagged(itemTagOf(value));
    }
    return minecraftItemOf(value, false);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new RangeError("Recipe ingredient alternatives must not be empty");
    }
    const items: Array<ItemType> = [];
    for (const alternative of value) {
      if (typeof alternative !== "string" || alternative.startsWith("#")) {
        throw new TypeError(
          "Recipe ingredient alternatives must contain item ids, not tags",
        );
      }
      items.push(minecraftItemOf(alternative, false));
    }
    return anyOf(items);
  }
  throw new TypeError(
    "Current recipe ingredients must be item/tag strings or item-id arrays",
  );
};

const decodePattern = (value: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(value)) {
    throw new TypeError("Shaped recipe pattern must be an array");
  }
  const pattern: Array<string> = [];
  for (const row of value) {
    if (typeof row !== "string") {
      throw new TypeError("Shaped recipe pattern rows must be strings");
    }
    pattern.push(row);
  }
  return pattern;
};

const decodeKey = (
  value: unknown,
): Readonly<Record<string, CraftingIngredientInput>> => {
  if (!isRecord(value)) {
    throw new TypeError("Shaped recipe key must be an object");
  }
  const key: Record<string, CraftingIngredientInput> = {};
  for (const [character, ingredient] of Object.entries(value)) {
    key[character] = decodeIngredient(ingredient);
  }
  return key;
};

const decodeIngredients = (
  value: unknown,
): ReadonlyArray<CraftingIngredientInput> => {
  if (!Array.isArray(value)) {
    throw new TypeError("Shapeless recipe ingredients must be an array");
  }
  return value.map(decodeIngredient);
};

const decodeResultItem = (value: string | UnknownRecord): ItemType => {
  if (typeof value === "string") {
    return minecraftItemOf(value, true);
  }
  return minecraftItemOf(value["id"], true);
};

const decodeResult = (value: unknown) => {
  if (typeof value === "string") {
    return itemStack(decodeResultItem(value), 1);
  }
  if (!isRecord(value)) {
    throw new TypeError(
      "Recipe result must be an item id or item stack object",
    );
  }
  if (
    !hasOnlyKeys(value, ["id", "count", "components"]) ||
    !hasAllKeys(value, ["id"])
  ) {
    throw new TypeError("Recipe result object has an invalid shape");
  }
  const item = decodeResultItem(value);
  const count = Object.hasOwn(value, "count") ? value["count"] : 1;
  if (typeof count !== "number") {
    throw new TypeError("Recipe result count must be a number");
  }
  if (!Object.hasOwn(value, "components")) {
    return itemStack(item, count);
  }
  return itemStack(item, count, {
    componentPatch: itemComponentPatchFromUnknown(value["components"]),
  });
};

const decodeCategory = (value: unknown): RecipeCategory => {
  if (
    value !== "building" &&
    value !== "equipment" &&
    value !== "misc" &&
    value !== "redstone"
  ) {
    throw new TypeError(
      `Recipe category is invalid, received ${String(value)}`,
    );
  }
  return value;
};

type CommonRecipeOptions = Readonly<{
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly showNotification?: boolean;
}>;

const decodeCommonOptions = (value: UnknownRecord): CommonRecipeOptions => {
  let category: RecipeCategory | undefined;
  let group: string | undefined;
  let showNotification: boolean | undefined;
  if (Object.hasOwn(value, "category")) {
    category = decodeCategory(value["category"]);
  }
  if (Object.hasOwn(value, "group")) {
    if (typeof value["group"] !== "string") {
      throw new TypeError("Recipe group must be a string");
    }
    group = value["group"];
  }
  if (Object.hasOwn(value, "show_notification")) {
    if (typeof value["show_notification"] !== "boolean") {
      throw new TypeError("Recipe show_notification must be a boolean");
    }
    showNotification = value["show_notification"];
  }
  return {
    ...(category === undefined ? {} : { category }),
    ...(group === undefined ? {} : { group }),
    ...(showNotification === undefined ? {} : { showNotification }),
  };
};

const decodeCraftingOptions = (value: UnknownRecord): RecipeOptions => ({
  tags: ["crafting_table"],
  ...decodeCommonOptions(value),
});

type NotificationRecipeOptions = Readonly<{
  readonly showNotification?: boolean;
}>;

const decodeNotificationOptions = (
  value: UnknownRecord,
): NotificationRecipeOptions => {
  const { showNotification } = decodeCommonOptions(value);
  return showNotification === undefined ? {} : { showNotification };
};

const cookingStationOf = (type: string): CookingStation | undefined => {
  switch (type) {
    case "minecraft:smelting":
      return "furnace";
    case "minecraft:blasting":
      return "blast_furnace";
    case "minecraft:smoking":
      return "smoker";
    case "minecraft:campfire_cooking":
      return "campfire";
    default:
      return undefined;
  }
};

const decodeCookingStation = (type: string): CookingStation => {
  const station = cookingStationOf(type);
  if (station === undefined) {
    throw new TypeError(`Unsupported cooking recipe type: ${type}`);
  }
  return station;
};

const decodeNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number") {
    throw new TypeError(`Recipe ${field} must be a number`);
  }
  return value;
};

const decodeMaterialCount = (value: unknown): TransmuteMaterialCount => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["min", "max"]) ||
    !hasAllKeys(value, ["min", "max"])
  ) {
    throw new TypeError(
      "Transmute material_count must be an object with min and max",
    );
  }
  const min = value["min"];
  const max = value["max"];
  if (
    typeof min !== "number" ||
    !Number.isSafeInteger(min) ||
    typeof max !== "number" ||
    !Number.isSafeInteger(max)
  ) {
    throw new TypeError("Transmute material_count bounds must be integers");
  }
  return { min, max };
};

const decodeIntegerRange = (
  value: unknown,
  field: string,
  maximum: number,
): readonly [number, number] => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["min", "max"]) ||
    !hasAllKeys(value, ["min", "max"])
  ) {
    throw new TypeError(`${field} must be an object with min and max`);
  }
  const min = value["min"];
  const max = value["max"];
  if (
    typeof min !== "number" ||
    !Number.isSafeInteger(min) ||
    typeof max !== "number" ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max < 0 ||
    min > maximum ||
    max > maximum ||
    min > max
  ) {
    throw new RangeError(
      `${field} must be an ordered integer range from 0 to ${maximum}`,
    );
  }
  return [min, max];
};

const decodeAllowedGenerations = (value: unknown): readonly [number, number] =>
  decodeIntegerRange(value, "Book cloning allowed_generations", 2);

const isFireworkExplosionShape = (
  value: string,
): value is FireworkExplosionShape =>
  FIREWORK_EXPLOSION_SHAPES.some((shape) => shape === value);

const decodeShapeIngredients = (
  value: unknown,
): Readonly<
  Partial<Record<FireworkExplosionShape, CraftingIngredientInput>>
> => {
  if (!isRecord(value)) {
    throw new TypeError("Firework star shapes must be an object");
  }
  const shapes: Partial<
    Record<FireworkExplosionShape, CraftingIngredientInput>
  > = {};
  for (const [shape, ingredient] of Object.entries(value)) {
    if (!isFireworkExplosionShape(shape)) {
      throw new TypeError(`Unsupported firework explosion shape: ${shape}`);
    }
    shapes[shape] = decodeIngredient(ingredient);
  }
  return shapes;
};

const decodeRecipeId = (value: string) => {
  if (!NamespacedResourceLocation.is(value)) {
    throw new TypeError(`Recipe id must be namespaced, received ${value}`);
  }
  return ResourceLocation(value);
};

/** Decodes a current Java crafting recipe document at the JSON boundary. */
export const craftingRecipeFromUnknown = (
  id: string,
  value: unknown,
): Recipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || typeof value["type"] !== "string") {
    throw new TypeError("Crafting recipe must contain a string type");
  }
  const type = value["type"];
  if (type === "minecraft:crafting_shaped") {
    if (
      !hasOnlyKeys(value, [
        "type",
        "category",
        "group",
        "show_notification",
        "pattern",
        "key",
        "result",
      ]) ||
      !hasAllKeys(value, ["type", "pattern", "key", "result"])
    ) {
      throw new TypeError("Shaped crafting recipe has an invalid shape");
    }
    const options = decodeCraftingOptions(value);
    return shapedRecipe(
      recipeId,
      decodePattern(value["pattern"]),
      decodeKey(value["key"]),
      decodeResult(value["result"]),
      options,
    );
  }
  if (type === "minecraft:crafting_shapeless") {
    if (
      !hasOnlyKeys(value, [
        "type",
        "category",
        "group",
        "show_notification",
        "ingredients",
        "result",
      ]) ||
      !hasAllKeys(value, ["type", "ingredients", "result"])
    ) {
      throw new TypeError("Shapeless crafting recipe has an invalid shape");
    }
    const options = decodeCraftingOptions(value);
    return shapelessRecipe(
      recipeId,
      decodeIngredients(value["ingredients"]),
      decodeResult(value["result"]),
      options,
    );
  }
  throw new TypeError(`Unsupported crafting recipe type: ${type}`);
};

/** Decodes one of the current Java furnace-family recipe documents. */
export const cookingRecipeFromUnknown = (
  id: string,
  value: unknown,
): CookingRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || typeof value["type"] !== "string") {
    throw new TypeError("Cooking recipe must contain a string type");
  }
  const type = value["type"];
  const station = decodeCookingStation(type);
  if (
    !hasOnlyKeys(value, [
      "type",
      "category",
      "group",
      "show_notification",
      "ingredient",
      "result",
      "experience",
      "cookingtime",
    ]) ||
    !hasAllKeys(value, [
      "type",
      "ingredient",
      "result",
      "experience",
      "cookingtime",
    ])
  ) {
    throw new TypeError("Cooking recipe has an invalid shape");
  }
  const options = decodeCommonOptions(value);
  return cookingRecipe(
    recipeId,
    station,
    decodeIngredient(value["ingredient"]),
    decodeResult(value["result"]),
    decodeNumber(value["cookingtime"], "cookingtime"),
    decodeNumber(value["experience"], "experience"),
    options,
  );
};

/** Decodes a current Java crafting transmute recipe document. */
export const transmuteRecipeFromUnknown = (
  id: string,
  value: unknown,
): TransmuteRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || typeof value["type"] !== "string") {
    throw new TypeError("Transmute recipe must contain a string type");
  }
  if (value["type"] !== "minecraft:crafting_transmute") {
    throw new TypeError(`Unsupported transmute recipe type: ${value["type"]}`);
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "category",
      "group",
      "show_notification",
      "source",
      "material",
      "result",
      "material_count",
      "add_material_count_to_result",
    ]) ||
    !hasAllKeys(value, ["type", "source", "material", "result"])
  ) {
    throw new TypeError("Transmute recipe has an invalid shape");
  }
  const options = decodeCommonOptions(value);
  const materialCount = Object.hasOwn(value, "material_count")
    ? decodeMaterialCount(value["material_count"])
    : undefined;
  const addMaterialCountToResult = value["add_material_count_to_result"];
  if (
    addMaterialCountToResult !== undefined &&
    typeof addMaterialCountToResult !== "boolean"
  ) {
    throw new TypeError(
      "Transmute add_material_count_to_result must be boolean",
    );
  }
  return transmuteRecipe(
    recipeId,
    decodeIngredient(value["source"]),
    decodeIngredient(value["material"]),
    decodeResult(value["result"]),
    {
      ...options,
      ...(materialCount === undefined ? {} : { materialCount }),
      ...(addMaterialCountToResult === undefined
        ? {}
        : { addMaterialCountToResult }),
    },
  );
};

/** Decodes the current Java crafting dye recipe document. */
export const craftingDyeRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingDyeRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || value["type"] !== "minecraft:crafting_dye") {
    throw new TypeError(
      "Crafting dye recipe must have type minecraft:crafting_dye",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "category",
      "group",
      "show_notification",
      "target",
      "dye",
      "result",
    ]) ||
    !hasAllKeys(value, ["type", "target", "dye", "result"])
  ) {
    throw new TypeError("Crafting dye recipe has an invalid shape");
  }
  const options = decodeCommonOptions(value);
  return craftingDyeRecipe(
    recipeId,
    decodeIngredient(value["target"]),
    decodeIngredient(value["dye"]),
    decodeResult(value["result"]),
    {
      category: options.category ?? "misc",
      group: options.group ?? "",
      showNotification: options.showNotification ?? true,
    },
  );
};

/** Decodes the current Java crafting imbue recipe document. */
export const craftingImbueRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingImbueRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || value["type"] !== "minecraft:crafting_imbue") {
    throw new TypeError(
      "Crafting imbue recipe must have type minecraft:crafting_imbue",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "category",
      "group",
      "show_notification",
      "source",
      "material",
      "result",
    ]) ||
    !hasAllKeys(value, ["type", "source", "material", "result"])
  ) {
    throw new TypeError("Crafting imbue recipe has an invalid shape");
  }
  const options = decodeCommonOptions(value);
  return craftingImbueRecipe(
    recipeId,
    decodeIngredient(value["source"]),
    decodeIngredient(value["material"]),
    decodeResult(value["result"]),
    {
      category: options.category ?? "misc",
      group: options.group ?? "",
      showNotification: options.showNotification ?? true,
    },
  );
};

/** Decodes the current Java banner duplication recipe document. */
export const craftingBannerDuplicateRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingBannerDuplicateRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_bannerduplicate"
  ) {
    throw new TypeError(
      "Crafting banner duplicate recipe must have type minecraft:crafting_special_bannerduplicate",
    );
  }
  if (
    !hasOnlyKeys(value, ["type", "banner", "result", "show_notification"]) ||
    !hasAllKeys(value, ["type", "banner", "result"])
  ) {
    throw new TypeError(
      "Crafting banner duplicate recipe has an invalid shape",
    );
  }
  return craftingBannerDuplicateRecipe(
    recipeId,
    decodeIngredient(value["banner"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java written-book cloning recipe document. */
export const craftingBookCloningRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingBookCloningRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_bookcloning"
  ) {
    throw new TypeError(
      "Crafting book cloning recipe must have type minecraft:crafting_special_bookcloning",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "source",
      "material",
      "allowed_generations",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "source", "material", "result"])
  ) {
    throw new TypeError("Crafting book cloning recipe has an invalid shape");
  }
  const allowedGenerations = Object.hasOwn(value, "allowed_generations")
    ? decodeAllowedGenerations(value["allowed_generations"])
    : undefined;
  return craftingBookCloningRecipe(
    recipeId,
    decodeIngredient(value["source"]),
    decodeIngredient(value["material"]),
    decodeResult(value["result"]),
    allowedGenerations,
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java decorated-pot recipe document. */
export const craftingDecoratedPotRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingDecoratedPotRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_decorated_pot"
  ) {
    throw new TypeError(
      "Crafting decorated pot recipe must have type minecraft:crafting_decorated_pot",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "back",
      "left",
      "right",
      "front",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "back", "left", "right", "front", "result"])
  ) {
    throw new TypeError("Crafting decorated pot recipe has an invalid shape");
  }
  return craftingDecoratedPotRecipe(
    recipeId,
    decodeIngredient(value["back"]),
    decodeIngredient(value["left"]),
    decodeIngredient(value["right"]),
    decodeIngredient(value["front"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java firework rocket recipe document. */
export const craftingFireworkRocketRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingFireworkRocketRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_firework_rocket"
  ) {
    throw new TypeError(
      "Crafting firework rocket recipe must have type minecraft:crafting_special_firework_rocket",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "shell",
      "fuel",
      "star",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "shell", "fuel", "star", "result"])
  ) {
    throw new TypeError("Crafting firework rocket recipe has an invalid shape");
  }
  return craftingFireworkRocketRecipe(
    recipeId,
    decodeIngredient(value["shell"]),
    decodeIngredient(value["fuel"]),
    decodeIngredient(value["star"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java firework star fade recipe document. */
export const craftingFireworkStarFadeRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingFireworkStarFadeRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_firework_star_fade"
  ) {
    throw new TypeError(
      "Crafting firework star fade recipe must have type minecraft:crafting_special_firework_star_fade",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "target",
      "dye",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "target", "dye", "result"])
  ) {
    throw new TypeError(
      "Crafting firework star fade recipe has an invalid shape",
    );
  }
  return craftingFireworkStarFadeRecipe(
    recipeId,
    decodeIngredient(value["target"]),
    decodeIngredient(value["dye"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java firework star recipe document. */
export const craftingFireworkStarRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingFireworkStarRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_firework_star"
  ) {
    throw new TypeError(
      "Crafting firework star recipe must have type minecraft:crafting_special_firework_star",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "trail",
      "twinkle",
      "fuel",
      "dye",
      "shapes",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, [
      "type",
      "trail",
      "twinkle",
      "fuel",
      "dye",
      "shapes",
      "result",
    ])
  ) {
    throw new TypeError("Crafting firework star recipe has an invalid shape");
  }
  return craftingFireworkStarRecipe(
    recipeId,
    decodeIngredient(value["trail"]),
    decodeIngredient(value["twinkle"]),
    decodeIngredient(value["fuel"]),
    decodeIngredient(value["dye"]),
    decodeShapeIngredients(value["shapes"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java map-extending recipe document. */
export const craftingMapExtendingRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingMapExtendingRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_mapextending"
  ) {
    throw new TypeError(
      "Crafting map extending recipe must have type minecraft:crafting_special_mapextending",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "map",
      "material",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "map", "material", "result"])
  ) {
    throw new TypeError("Crafting map extending recipe has an invalid shape");
  }
  return craftingMapExtendingRecipe(
    recipeId,
    decodeIngredient(value["map"]),
    decodeIngredient(value["material"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes the current Java shield-decoration recipe document. */
export const craftingShieldDecorationRecipeFromUnknown = (
  id: string,
  value: unknown,
): CraftingShieldDecorationRecipe => {
  const recipeId = decodeRecipeId(id);
  if (
    !isRecord(value) ||
    value["type"] !== "minecraft:crafting_special_shielddecoration"
  ) {
    throw new TypeError(
      "Crafting shield decoration recipe must have type minecraft:crafting_special_shielddecoration",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "banner",
      "target",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "banner", "target", "result"])
  ) {
    throw new TypeError(
      "Crafting shield decoration recipe has an invalid shape",
    );
  }
  return craftingShieldDecorationRecipe(
    recipeId,
    decodeIngredient(value["banner"]),
    decodeIngredient(value["target"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes a current Java stonecutting recipe document. */
export const stonecuttingRecipeFromUnknown = (
  id: string,
  value: unknown,
): StonecuttingRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || value["type"] !== "minecraft:stonecutting") {
    throw new TypeError(
      "Stonecutting recipe must have type minecraft:stonecutting",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "ingredient",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "ingredient", "result"])
  ) {
    throw new TypeError("Stonecutting recipe has an invalid shape");
  }
  return stonecuttingRecipe(
    recipeId,
    decodeIngredient(value["ingredient"]),
    decodeResult(value["result"]),
    decodeNotificationOptions(value),
  );
};

/** Decodes a current Java smithing transform recipe document. */
export const smithingTransformRecipeFromUnknown = (
  id: string,
  value: unknown,
): SmithingTransformRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || value["type"] !== "minecraft:smithing_transform") {
    throw new TypeError(
      "Smithing transform recipe must have type minecraft:smithing_transform",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "template",
      "base",
      "addition",
      "result",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "template", "base", "addition", "result"])
  ) {
    throw new TypeError("Smithing transform recipe has an invalid shape");
  }
  return smithingTransformRecipe(
    recipeId,
    decodeIngredient(value["template"]),
    decodeIngredient(value["base"]),
    decodeIngredient(value["addition"]),
    decodeResult(value["result"]),
    { tags: [SMITHING_STATION_TAG], ...decodeNotificationOptions(value) },
  );
};

/** Decodes a current Java smithing trim recipe document. */
export const smithingTrimRecipeFromUnknown = (
  id: string,
  value: unknown,
): SmithingTrimRecipe => {
  const recipeId = decodeRecipeId(id);
  if (!isRecord(value) || value["type"] !== "minecraft:smithing_trim") {
    throw new TypeError(
      "Smithing trim recipe must have type minecraft:smithing_trim",
    );
  }
  if (
    !hasOnlyKeys(value, [
      "type",
      "template",
      "base",
      "addition",
      "show_notification",
    ]) ||
    !hasAllKeys(value, ["type", "template", "base", "addition"])
  ) {
    throw new TypeError("Smithing trim recipe has an invalid shape");
  }
  return smithingTrimRecipe(
    recipeId,
    decodeIngredient(value["template"]),
    decodeIngredient(value["base"]),
    decodeIngredient(value["addition"]),
    { tags: [SMITHING_STATION_TAG], ...decodeNotificationOptions(value) },
  );
};

/** Decodes either current Java smithing recipe document. */
export const smithingRecipeFromUnknown = (
  id: string,
  value: unknown,
): SmithingRecipe => {
  if (!isRecord(value) || typeof value["type"] !== "string") {
    throw new TypeError("Smithing recipe must contain a string type");
  }
  if (value["type"] === "minecraft:smithing_transform") {
    return smithingTransformRecipeFromUnknown(id, value);
  }
  if (value["type"] === "minecraft:smithing_trim") {
    return smithingTrimRecipeFromUnknown(id, value);
  }
  throw new TypeError(`Unsupported smithing recipe type: ${value["type"]}`);
};

export type PortableRecipe =
  | Recipe
  | CookingRecipe
  | StonecuttingRecipe
  | SmithingRecipe
  | CraftingBannerDuplicateRecipe
  | CraftingBookCloningRecipe
  | CraftingDecoratedPotRecipe
  | CraftingDyeRecipe
  | CraftingFireworkRocketRecipe
  | CraftingFireworkStarFadeRecipe
  | CraftingFireworkStarRecipe
  | CraftingImbueRecipe
  | CraftingMapExtendingRecipe
  | CraftingShieldDecorationRecipe
  | TransmuteRecipe;

/** Decodes every portable Java recipe kind currently modeled by mc-kernel. */
export const portableRecipeFromUnknown = (
  id: string,
  value: unknown,
): PortableRecipe => {
  if (!isRecord(value) || typeof value["type"] !== "string") {
    throw new TypeError("Recipe must contain a string type");
  }
  const type = value["type"];
  if (
    type === "minecraft:crafting_shaped" ||
    type === "minecraft:crafting_shapeless"
  ) {
    return craftingRecipeFromUnknown(id, value);
  }
  if (cookingStationOf(type) !== undefined) {
    return cookingRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_transmute") {
    return transmuteRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_bannerduplicate") {
    return craftingBannerDuplicateRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_bookcloning") {
    return craftingBookCloningRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_decorated_pot") {
    return craftingDecoratedPotRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_dye") {
    return craftingDyeRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_firework_rocket") {
    return craftingFireworkRocketRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_firework_star_fade") {
    return craftingFireworkStarFadeRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_firework_star") {
    return craftingFireworkStarRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_imbue") {
    return craftingImbueRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_mapextending") {
    return craftingMapExtendingRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:crafting_special_shielddecoration") {
    return craftingShieldDecorationRecipeFromUnknown(id, value);
  }
  if (type === "minecraft:stonecutting") {
    return stonecuttingRecipeFromUnknown(id, value);
  }
  if (
    type === "minecraft:smithing_transform" ||
    type === "minecraft:smithing_trim"
  ) {
    return smithingRecipeFromUnknown(id, value);
  }
  throw new TypeError(`Unsupported portable recipe type: ${type}`);
};

export const recipeFromUnknown: typeof portableRecipeFromUnknown =
  portableRecipeFromUnknown;

/** Returns the canonical data-pack path for a namespaced recipe id. */
export const recipeDataPath = (id: string): string =>
  dataPackResourcePath(
    NamespacedResourceLocation("minecraft:recipe"),
    NamespacedResourceLocation(decodeRecipeId(id)),
  );

export const craftingRecipeDataPath: typeof recipeDataPath = recipeDataPath;

import {
  FIREWORK_EXPLOSION_SHAPES,
  type FireworkExplosionShape,
} from "../item/item-component-values-data.js";
import { isItemStack, type ItemStack } from "../item/item-stack.js";
import { BookGeneration } from "../item/item-primitives.js";
import {
  craftingIngredient,
  isCraftingIngredient,
  RecipeGroup,
  RecipePriority,
  type RecipeId,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeCategory,
  type RecipeGroup as RecipeGroupValue,
  type RecipePriority as RecipePriorityValue,
  type RecipeStationTag,
} from "./recipe-data.js";
import {
  ResourceLocation,
} from "../text/identifiers.js";

export const CRAFTING_SPECIAL_STATION_TAG: RecipeStationTag =
  ResourceLocation("crafting_table");

export interface CraftingSpecialRecipeOptions {
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroupValue;
  readonly priority?: RecipePriorityValue;
  readonly showNotification?: boolean;
  readonly tags?: readonly RecipeStationTag[];
}

type CraftingSpecialRecipeFields = {
  readonly id: RecipeId;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroupValue;
  readonly priority: RecipePriorityValue;
  readonly showNotification?: boolean;
  readonly tags: readonly RecipeStationTag[];
};

export type CraftingDyeRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingDye";
  readonly target: CraftingIngredient;
  readonly dye: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingImbueRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingImbue";
  readonly source: CraftingIngredient;
  readonly material: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingBannerDuplicateRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingBannerDuplicate";
  readonly banner: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingBookCloningRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingBookCloning";
  readonly source: CraftingIngredient;
  readonly material: CraftingIngredient;
  readonly allowedGenerations: readonly [BookGeneration, BookGeneration];
  readonly output: ItemStack;
};

export type CraftingDecoratedPotRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingDecoratedPot";
  readonly back: CraftingIngredient;
  readonly left: CraftingIngredient;
  readonly right: CraftingIngredient;
  readonly front: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingFireworkRocketRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingFireworkRocket";
  readonly shell: CraftingIngredient;
  readonly fuel: CraftingIngredient;
  readonly star: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingFireworkStarFadeRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingFireworkStarFade";
  readonly target: CraftingIngredient;
  readonly dye: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingFireworkStarRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingFireworkStar";
  readonly trail: CraftingIngredient;
  readonly twinkle: CraftingIngredient;
  readonly fuel: CraftingIngredient;
  readonly dye: CraftingIngredient;
  readonly shapes: Readonly<
    Partial<Record<FireworkExplosionShape, CraftingIngredient>>
  >;
  readonly output: ItemStack;
};

export type CraftingMapExtendingRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingMapExtending";
  readonly map: CraftingIngredient;
  readonly material: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingShieldDecorationRecipe = CraftingSpecialRecipeFields & {
  readonly _tag: "CraftingShieldDecoration";
  readonly banner: CraftingIngredient;
  readonly target: CraftingIngredient;
  readonly output: ItemStack;
};

export type CraftingSpecialRecipe =
  | CraftingDyeRecipe
  | CraftingImbueRecipe
  | CraftingBannerDuplicateRecipe
  | CraftingBookCloningRecipe
  | CraftingDecoratedPotRecipe
  | CraftingFireworkRocketRecipe
  | CraftingFireworkStarFadeRecipe
  | CraftingFireworkStarRecipe
  | CraftingMapExtendingRecipe
  | CraftingShieldDecorationRecipe;

export type CraftingSpecialRecipeTable = readonly CraftingSpecialRecipe[];

type RecordValue = {
  readonly _tag?: unknown;
  readonly id?: unknown;
  readonly category?: unknown;
  readonly group?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
  readonly tags?: unknown;
  readonly target?: unknown;
  readonly dye?: unknown;
  readonly source?: unknown;
  readonly material?: unknown;
  readonly banner?: unknown;
  readonly allowedGenerations?: unknown;
  readonly back?: unknown;
  readonly left?: unknown;
  readonly right?: unknown;
  readonly front?: unknown;
  readonly shell?: unknown;
  readonly fuel?: unknown;
  readonly star?: unknown;
  readonly trail?: unknown;
  readonly twinkle?: unknown;
  readonly shapes?: unknown;
  readonly map?: unknown;
  readonly output?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertRecipeId = (value: unknown): RecipeId => {
  if (typeof value !== "string" || !ResourceLocation.is(value)) {
    throw new TypeError(
      "Crafting special recipe id must be a resource location",
    );
  }
  return value;
};

const assertIngredient = (value: CraftingIngredientInput): CraftingIngredient =>
  craftingIngredient(value);

const assertOutput = (value: ItemStack): ItemStack => {
  if (!isItemStack(value)) {
    throw new TypeError("Crafting special recipe output must be an ItemStack");
  }
  return value;
};

const assertAllowedGenerations = (
  value: readonly [BookGeneration, BookGeneration] | undefined,
): readonly [BookGeneration, BookGeneration] => {
  const generations = value ?? [BookGeneration(0), BookGeneration(1)];
  if (
    generations.length !== 2 ||
    !Number.isInteger(generations[0]) ||
    !Number.isInteger(generations[1]) ||
    generations[0] < 0 ||
    generations[0] > 2 ||
    generations[1] < 0 ||
    generations[1] > 2 ||
    generations[0] > generations[1]
  ) {
    throw new RangeError(
      "Allowed book generations must be an ordered range from 0 to 2",
    );
  }
  return [BookGeneration(generations[0]), BookGeneration(generations[1])];
};

const isFireworkExplosionShape = (
  value: string,
): value is FireworkExplosionShape =>
  FIREWORK_EXPLOSION_SHAPES.some((shape) => shape === value);

const assertShapeIngredients = (
  value: Readonly<
    Partial<Record<FireworkExplosionShape, CraftingIngredientInput>>
  >,
): Readonly<Partial<Record<FireworkExplosionShape, CraftingIngredient>>> => {
  const shapes: Partial<Record<FireworkExplosionShape, CraftingIngredient>> =
    {};
  for (const [shape, ingredient] of Object.entries(value)) {
    if (!isFireworkExplosionShape(shape)) {
      throw new TypeError(`Unsupported firework shape ingredient: ${shape}`);
    }
    shapes[shape] = assertIngredient(ingredient);
  }
  return shapes;
};

const isTags = (value: unknown): value is readonly RecipeStationTag[] =>
  Array.isArray(value) &&
  value.every((tag) => typeof tag === "string" && ResourceLocation.is(tag));

const RECIPE_CATEGORIES: readonly RecipeCategory[] = [
  "building",
  "equipment",
  "misc",
  "redstone",
];

const isRecipeCategory = (value: unknown): value is RecipeCategory =>
  RECIPE_CATEGORIES.some((category) => category === value);

// A recipe's priority orders it against its rivals, so a negative value would
// sort a special recipe ahead of the shaped ones it is meant to lose to.
const isRecipePriority = (value: unknown): value is RecipePriorityValue =>
  typeof value === "number" && RecipePriority.is(value);

const assertCategory = (value: unknown): RecipeCategory | undefined => {
  if (value !== undefined && !isRecipeCategory(value)) {
    throw new TypeError(
      `Crafting special recipe category is invalid, received ${String(value)}`,
    );
  }
  return value;
};

const assertGroup = (value: unknown): RecipeGroupValue | undefined => {
  if (value !== undefined && typeof value !== "string") {
    throw new TypeError("Crafting special recipe group must be a string");
  }
  return value === undefined ? undefined : RecipeGroup(value);
};

// `?? default` would swallow an explicit null, so only an absent field
// defaults; anything else present has to survive the guard.
const assertPriority = (value: unknown): RecipePriorityValue => {
  const priority = value === undefined ? 0 : value;
  if (!isRecipePriority(priority)) {
    throw new RangeError(
      `Crafting special recipe priority must be a non-negative safe integer, received ${String(value)}`,
    );
  }
  return RecipePriority(priority);
};

const assertShowNotification = (value: unknown): boolean | undefined => {
  if (value !== undefined && typeof value !== "boolean") {
    throw new TypeError(
      "Crafting special recipe showNotification must be a boolean",
    );
  }
  return value;
};

const assertRecipeTags = (value: unknown): readonly RecipeStationTag[] => {
  const tags = value === undefined ? [CRAFTING_SPECIAL_STATION_TAG] : value;
  if (!isTags(tags)) {
    throw new TypeError(
      "Crafting special recipe tags must be resource locations",
    );
  }
  return tags;
};

const normalizeOptions = (
  options: CraftingSpecialRecipeOptions & {
    readonly id: RecipeId;
  },
): CraftingSpecialRecipeFields => {
  const category = assertCategory(options.category);
  const group = assertGroup(options.group);
  const showNotification = assertShowNotification(options.showNotification);
  return {
    id: assertRecipeId(options.id),
    ...(category === undefined ? {} : { category }),
    ...(group === undefined ? {} : { group }),
    priority: assertPriority(options.priority),
    ...(showNotification === undefined ? {} : { showNotification }),
    tags: assertRecipeTags(options.tags),
  };
};

type RecipeOptionsWithId = CraftingSpecialRecipeOptions & {
  readonly id: RecipeId;
};

// Spreading a non-object options argument yields `{}`, so an outright wrong
// value would silently become "no options" instead of an error.
const withRecipeId = (
  options: Omit<CraftingSpecialRecipeOptions, "id"> | undefined,
  id: RecipeId,
): RecipeOptionsWithId => {
  if (options !== undefined && !isRecord(options)) {
    throw new TypeError(
      "Crafting special recipe options must be an object when provided",
    );
  }
  return { ...options, id };
};

export function craftingDyeRecipe(
  id: RecipeId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingDyeRecipe;
export function craftingDyeRecipe(
  options: RecipeOptionsWithId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
): CraftingDyeRecipe;
export function craftingDyeRecipe(
  idOrOptions: RecipeId | RecipeOptionsWithId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingDyeRecipe {
  const recipeOptions =
    typeof idOrOptions === "string"
      ? withRecipeId(options, idOrOptions)
      : idOrOptions;
  return {
    _tag: "CraftingDye",
    ...normalizeOptions(recipeOptions),
    target: assertIngredient(target),
    dye: assertIngredient(dye),
    output: assertOutput(output),
  };
}

export function craftingImbueRecipe(
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingImbueRecipe;
export function craftingImbueRecipe(
  options: RecipeOptionsWithId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
): CraftingImbueRecipe;
export function craftingImbueRecipe(
  idOrOptions: RecipeId | RecipeOptionsWithId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingImbueRecipe {
  const recipeOptions =
    typeof idOrOptions === "string"
      ? withRecipeId(options, idOrOptions)
      : idOrOptions;
  return {
    _tag: "CraftingImbue",
    ...normalizeOptions(recipeOptions),
    source: assertIngredient(source),
    material: assertIngredient(material),
    output: assertOutput(output),
  };
}

export const craftingBannerDuplicateRecipe = (
  id: RecipeId,
  banner: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingBannerDuplicateRecipe => ({
  _tag: "CraftingBannerDuplicate",
  ...normalizeOptions(withRecipeId(options, id)),
  banner: assertIngredient(banner),
  output: assertOutput(output),
});

export const craftingBookCloningRecipe = (
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  allowedGenerations?: readonly [BookGeneration, BookGeneration],
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingBookCloningRecipe => ({
  _tag: "CraftingBookCloning",
  ...normalizeOptions(withRecipeId(options, id)),
  source: assertIngredient(source),
  material: assertIngredient(material),
  allowedGenerations: assertAllowedGenerations(allowedGenerations),
  output: assertOutput(output),
});

export const craftingDecoratedPotRecipe = (
  id: RecipeId,
  back: CraftingIngredientInput,
  left: CraftingIngredientInput,
  right: CraftingIngredientInput,
  front: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingDecoratedPotRecipe => ({
  _tag: "CraftingDecoratedPot",
  ...normalizeOptions(withRecipeId(options, id)),
  back: assertIngredient(back),
  left: assertIngredient(left),
  right: assertIngredient(right),
  front: assertIngredient(front),
  output: assertOutput(output),
});

export const craftingFireworkRocketRecipe = (
  id: RecipeId,
  shell: CraftingIngredientInput,
  fuel: CraftingIngredientInput,
  star: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingFireworkRocketRecipe => ({
  _tag: "CraftingFireworkRocket",
  ...normalizeOptions(withRecipeId(options, id)),
  shell: assertIngredient(shell),
  fuel: assertIngredient(fuel),
  star: assertIngredient(star),
  output: assertOutput(output),
});

export const craftingFireworkStarFadeRecipe = (
  id: RecipeId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingFireworkStarFadeRecipe => ({
  _tag: "CraftingFireworkStarFade",
  ...normalizeOptions(withRecipeId(options, id)),
  target: assertIngredient(target),
  dye: assertIngredient(dye),
  output: assertOutput(output),
});

export const craftingFireworkStarRecipe = (
  id: RecipeId,
  trail: CraftingIngredientInput,
  twinkle: CraftingIngredientInput,
  fuel: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  shapes: Readonly<
    Partial<Record<FireworkExplosionShape, CraftingIngredientInput>>
  >,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingFireworkStarRecipe => ({
  _tag: "CraftingFireworkStar",
  ...normalizeOptions(withRecipeId(options, id)),
  trail: assertIngredient(trail),
  twinkle: assertIngredient(twinkle),
  fuel: assertIngredient(fuel),
  dye: assertIngredient(dye),
  shapes: assertShapeIngredients(shapes),
  output: assertOutput(output),
});

export const craftingMapExtendingRecipe = (
  id: RecipeId,
  map: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingMapExtendingRecipe => ({
  _tag: "CraftingMapExtending",
  ...normalizeOptions(withRecipeId(options, id)),
  map: assertIngredient(map),
  material: assertIngredient(material),
  output: assertOutput(output),
});

export const craftingShieldDecorationRecipe = (
  id: RecipeId,
  banner: CraftingIngredientInput,
  target: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): CraftingShieldDecorationRecipe => ({
  _tag: "CraftingShieldDecoration",
  ...normalizeOptions(withRecipeId(options, id)),
  banner: assertIngredient(banner),
  target: assertIngredient(target),
  output: assertOutput(output),
});

const isAllowedGenerations = (
  value: unknown,
): value is readonly [BookGeneration, BookGeneration] => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  const min = value[0];
  const max = value[1];
  return (
    BookGeneration.is(min) &&
    BookGeneration.is(max) &&
    min <= max
  );
};

const isShapeIngredients = (
  value: unknown,
): value is Readonly<
  Partial<Record<FireworkExplosionShape, CraftingIngredient>>
> => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([shape, ingredient]) =>
      isFireworkExplosionShape(shape) && isCraftingIngredient(ingredient),
  );
};

const isBaseRecipe = (value: RecordValue, tag: string): boolean =>
  value._tag === tag &&
  typeof value.id === "string" &&
  ResourceLocation.is(value.id) &&
  (value.category === undefined || isRecipeCategory(value.category)) &&
  (value.group === undefined ||
    typeof value.group === "string") &&
  isRecipePriority(value.priority) &&
  (value.showNotification === undefined ||
    typeof value.showNotification === "boolean") &&
  isTags(value.tags);

export const isCraftingDyeRecipe = (
  value: unknown,
): value is CraftingDyeRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingDye") &&
  isCraftingIngredient(value.target) &&
  isCraftingIngredient(value.dye) &&
  isItemStack(value.output);

export const isCraftingImbueRecipe = (
  value: unknown,
): value is CraftingImbueRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingImbue") &&
  isCraftingIngredient(value.source) &&
  isCraftingIngredient(value.material) &&
  isItemStack(value.output);

export const isCraftingBannerDuplicateRecipe = (
  value: unknown,
): value is CraftingBannerDuplicateRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingBannerDuplicate") &&
  isCraftingIngredient(value.banner) &&
  isItemStack(value.output);

export const isCraftingBookCloningRecipe = (
  value: unknown,
): value is CraftingBookCloningRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingBookCloning") &&
  isCraftingIngredient(value.source) &&
  isCraftingIngredient(value.material) &&
  isAllowedGenerations(value.allowedGenerations) &&
  isItemStack(value.output);

export const isCraftingDecoratedPotRecipe = (
  value: unknown,
): value is CraftingDecoratedPotRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingDecoratedPot") &&
  isCraftingIngredient(value.back) &&
  isCraftingIngredient(value.left) &&
  isCraftingIngredient(value.right) &&
  isCraftingIngredient(value.front) &&
  isItemStack(value.output);

export const isCraftingFireworkRocketRecipe = (
  value: unknown,
): value is CraftingFireworkRocketRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingFireworkRocket") &&
  isCraftingIngredient(value.shell) &&
  isCraftingIngredient(value.fuel) &&
  isCraftingIngredient(value.star) &&
  isItemStack(value.output);

export const isCraftingFireworkStarFadeRecipe = (
  value: unknown,
): value is CraftingFireworkStarFadeRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingFireworkStarFade") &&
  isCraftingIngredient(value.target) &&
  isCraftingIngredient(value.dye) &&
  isItemStack(value.output);

export const isCraftingFireworkStarRecipe = (
  value: unknown,
): value is CraftingFireworkStarRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingFireworkStar") &&
  isCraftingIngredient(value.trail) &&
  isCraftingIngredient(value.twinkle) &&
  isCraftingIngredient(value.fuel) &&
  isCraftingIngredient(value.dye) &&
  isShapeIngredients(value.shapes) &&
  isItemStack(value.output);

export const isCraftingMapExtendingRecipe = (
  value: unknown,
): value is CraftingMapExtendingRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingMapExtending") &&
  isCraftingIngredient(value.map) &&
  isCraftingIngredient(value.material) &&
  isItemStack(value.output);

export const isCraftingShieldDecorationRecipe = (
  value: unknown,
): value is CraftingShieldDecorationRecipe =>
  isRecord(value) &&
  isBaseRecipe(value, "CraftingShieldDecoration") &&
  isCraftingIngredient(value.banner) &&
  isCraftingIngredient(value.target) &&
  isItemStack(value.output);

export const isCraftingSpecialRecipe = (
  value: unknown,
): value is CraftingSpecialRecipe =>
  isCraftingDyeRecipe(value) ||
  isCraftingImbueRecipe(value) ||
  isCraftingBannerDuplicateRecipe(value) ||
  isCraftingBookCloningRecipe(value) ||
  isCraftingDecoratedPotRecipe(value) ||
  isCraftingFireworkRocketRecipe(value) ||
  isCraftingFireworkStarFadeRecipe(value) ||
  isCraftingFireworkStarRecipe(value) ||
  isCraftingMapExtendingRecipe(value) ||
  isCraftingShieldDecorationRecipe(value);

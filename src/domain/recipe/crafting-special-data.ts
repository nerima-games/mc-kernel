import { Result } from "effect";
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
  RecipeId,
  RecipePriority,
  RecipeStationTag,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeCategory,
  type RecipeGroup as RecipeGroupValue,
  type RecipePriority as RecipePriorityValue,
} from "./recipe-data.js";
import { ResourceLocation } from "../text/identifiers.js";
import {
  recipeRangeFailure,
  recipeTypeFailure,
  type RecipeFailure,
} from "./recipe-error.js";

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

type RecipeOptionsInput = Readonly<{
  readonly id?: unknown;
  readonly category?: unknown;
  readonly group?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
  readonly tags?: unknown;
}>;

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

const recipeTypeFailureValue = (message: string): RecipeFailure => ({
  _tag: "RecipeTypeFailure",
  name: "TypeError",
  message,
});

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertRecipeId = (
  value: unknown,
): Result.Result<RecipeId, RecipeFailure> =>
  typeof value === "string"
    ? Result.mapError(
        RecipeId.result(value),
        () => recipeTypeFailureValue("Crafting special recipe id must be a resource location"),
      )
    : recipeTypeFailure("Crafting special recipe id must be a resource location");

const assertIngredient = (
  value: unknown,
): Result.Result<CraftingIngredient, RecipeFailure> =>
  craftingIngredient(value);

const assertOutput = (value: unknown): Result.Result<ItemStack, RecipeFailure> =>
  isItemStack(value)
    ? Result.succeed(value)
    : recipeTypeFailure("Crafting special recipe output must be an ItemStack");

const assertAllowedGenerations = (
  value: unknown,
): Result.Result<readonly [BookGeneration, BookGeneration], RecipeFailure> => {
  const generations = value ?? [0, 1];
  let snapshot: readonly [unknown, unknown] | undefined;
  try {
    if (Array.isArray(generations) && generations.length === 2) {
      snapshot = [generations[0], generations[1]];
    }
  } catch {
    return recipeTypeFailure(
      "Allowed book generations could not be read",
    );
  }
  if (snapshot === undefined) {
    return recipeRangeFailure(
      "Allowed book generations must be an ordered range from 0 to 2",
    );
  }
  const [minimum, maximum] = snapshot;
  if (
    typeof minimum !== "number" ||
    typeof maximum !== "number" ||
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum < 0 ||
    minimum > 2 ||
    maximum < 0 ||
    maximum > 2 ||
    minimum > maximum
  ) {
    return recipeRangeFailure(
      "Allowed book generations must be an ordered range from 0 to 2",
    );
  }
  const checkedMinimum = BookGeneration.result(minimum);
  const checkedMaximum = BookGeneration.result(maximum);
  if (
    Result.isFailure(checkedMinimum) ||
    Result.isFailure(checkedMaximum)
  ) {
    return recipeRangeFailure(
      "Allowed book generations must be an ordered range from 0 to 2",
    );
  }
  return Result.succeed([checkedMinimum.success, checkedMaximum.success]);
};

const isFireworkExplosionShape = (
  value: string,
): value is FireworkExplosionShape =>
  FIREWORK_EXPLOSION_SHAPES.some((shape) => shape === value);

const assertShapeIngredients = (
  value: unknown,
): Result.Result<
  Readonly<Partial<Record<FireworkExplosionShape, CraftingIngredient>>>,
  RecipeFailure
> => {
  if (!isRecord(value)) {
    return recipeTypeFailure("Firework star shapes must be an object");
  }
  const shapes: Partial<Record<FireworkExplosionShape, CraftingIngredient>> =
    {};
  for (const [shape, ingredient] of Object.entries(value)) {
    if (!isFireworkExplosionShape(shape)) {
      return recipeTypeFailure(`Unsupported firework shape ingredient: ${shape}`);
    }
    const normalized = assertIngredient(ingredient);
    if (Result.isFailure(normalized)) {
      return Result.fail(normalized.failure);
    }
    shapes[shape] = normalized.success;
  }
  return Result.succeed(shapes);
};

const snapshotTags = (
  value: unknown,
): Result.Result<readonly unknown[], RecipeFailure> => {
  try {
    if (!Array.isArray(value)) {
      return recipeTypeFailure(
        "Crafting special recipe tags must be resource locations",
      );
    }
    const length = value.length;
    const tags: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      tags.push(value[index]);
    }
    return Result.succeed(tags);
  } catch {
    return recipeTypeFailure(
      "Crafting special recipe tags could not be read",
    );
  }
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

const assertCategory = (
  value: unknown,
): Result.Result<RecipeCategory | undefined, RecipeFailure> =>
  value === undefined || isRecipeCategory(value)
    ? Result.succeed(value)
    : recipeTypeFailure(
        `Crafting special recipe category is invalid, received ${String(value)}`,
      );

const assertGroup = (
  value: unknown,
): Result.Result<RecipeGroupValue | undefined, RecipeFailure> => {
  if (value !== undefined && typeof value !== "string") {
    return recipeTypeFailure("Crafting special recipe group must be a string");
  }
  return value === undefined
    ? Result.succeed(undefined)
    : Result.succeed(RecipeGroup(value));
};

// `?? default` would swallow an explicit null, so only an absent field
// defaults; anything else present has to survive the guard.
const assertPriority = (
  value: unknown,
): Result.Result<RecipePriorityValue, RecipeFailure> => {
  const priority = value === undefined ? 0 : value;
  if (!isRecipePriority(priority)) {
    return recipeRangeFailure(
      `Crafting special recipe priority must be a non-negative safe integer, received ${String(value)}`,
    );
  }
  return Result.succeed(RecipePriority(priority));
};

const assertShowNotification = (
  value: unknown,
): Result.Result<boolean | undefined, RecipeFailure> => {
  if (value !== undefined && typeof value !== "boolean") {
    return recipeTypeFailure(
      "Crafting special recipe showNotification must be a boolean",
    );
  }
  return Result.succeed(value);
};

const assertRecipeTags = (
  value: unknown,
): Result.Result<readonly RecipeStationTag[], RecipeFailure> => {
  const tags = value === undefined ? [CRAFTING_SPECIAL_STATION_TAG] : value;
  const snapshot = snapshotTags(tags);
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure);
  if (!isTags(snapshot.success)) {
    return recipeTypeFailure(
      "Crafting special recipe tags must be resource locations",
    );
  }
  const checkedTags: RecipeStationTag[] = [];
  for (const tag of snapshot.success) {
    const checkedTag = RecipeStationTag.result(tag);
    if (Result.isFailure(checkedTag)) {
      return recipeTypeFailure(
        "Crafting special recipe tags must be resource locations",
      );
    }
    checkedTags.push(checkedTag.success);
  }
  return Result.succeed(checkedTags);
};

const normalizeOptions = (
  options: RecipeOptionsInput,
): Result.Result<CraftingSpecialRecipeFields, RecipeFailure> =>
  Result.gen(function* () {
    const category = yield* assertCategory(options.category);
    const group = yield* assertGroup(options.group);
    const showNotification = yield* assertShowNotification(
      options.showNotification,
    );
    return {
      id: yield* assertRecipeId(options.id),
      ...(category === undefined ? {} : { category }),
      ...(group === undefined ? {} : { group }),
      priority: yield* assertPriority(options.priority),
      ...(showNotification === undefined ? {} : { showNotification }),
      tags: yield* assertRecipeTags(options.tags),
    };
  });

type RecipeOptionsWithId = CraftingSpecialRecipeOptions & {
  readonly id: RecipeId;
};

// Spreading a non-object options argument yields `{}`, so an outright wrong
// value would silently become "no options" instead of an error.
const withRecipeId = (
  options: Omit<CraftingSpecialRecipeOptions, "id"> | undefined,
  id: RecipeId,
): Result.Result<RecipeOptionsInput, RecipeFailure> => {
  if (options !== undefined && !isRecord(options)) {
    return recipeTypeFailure(
      "Crafting special recipe options must be an object when provided",
    );
  }
  return Result.succeed({ ...options, id });
};

const normalizeRecipeOptions = (
  idOrOptions: RecipeId | RecipeOptionsWithId,
  options: Omit<CraftingSpecialRecipeOptions, "id"> | undefined,
): Result.Result<CraftingSpecialRecipeFields, RecipeFailure> => {
  const recipeOptions: Result.Result<RecipeOptionsInput, RecipeFailure> =
    typeof idOrOptions === "string"
      ? withRecipeId(options, idOrOptions)
      : isRecord(idOrOptions)
        ? Result.succeed(idOrOptions)
        : recipeTypeFailure(
            "Crafting special recipe options must be an object when provided",
          );
  return Result.flatMap(recipeOptions, normalizeOptions);
};

export function craftingDyeRecipe(
  id: RecipeId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingDyeRecipe, RecipeFailure>;
export function craftingDyeRecipe(
  options: RecipeOptionsWithId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
): Result.Result<CraftingDyeRecipe, RecipeFailure>;
export function craftingDyeRecipe(
  idOrOptions: RecipeId | RecipeOptionsWithId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingDyeRecipe, RecipeFailure> {
  return Result.gen(function* () {
    return {
      _tag: "CraftingDye",
      ...(yield* normalizeRecipeOptions(idOrOptions, options)),
      target: yield* assertIngredient(target),
      dye: yield* assertIngredient(dye),
      output: yield* assertOutput(output),
    };
  });
}

export function craftingImbueRecipe(
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingImbueRecipe, RecipeFailure>;
export function craftingImbueRecipe(
  options: RecipeOptionsWithId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
): Result.Result<CraftingImbueRecipe, RecipeFailure>;
export function craftingImbueRecipe(
  idOrOptions: RecipeId | RecipeOptionsWithId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingImbueRecipe, RecipeFailure> {
  return Result.gen(function* () {
    return {
      _tag: "CraftingImbue",
      ...(yield* normalizeRecipeOptions(idOrOptions, options)),
      source: yield* assertIngredient(source),
      material: yield* assertIngredient(material),
      output: yield* assertOutput(output),
    };
  });
}

export const craftingBannerDuplicateRecipe = (
  id: RecipeId,
  banner: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingBannerDuplicateRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingBannerDuplicate",
      ...(yield* normalizeRecipeOptions(id, options)),
      banner: yield* assertIngredient(banner),
      output: yield* assertOutput(output),
    };
  });

export const craftingBookCloningRecipe = (
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  allowedGenerations?: readonly [BookGeneration, BookGeneration],
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingBookCloningRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingBookCloning",
      ...(yield* normalizeRecipeOptions(id, options)),
      source: yield* assertIngredient(source),
      material: yield* assertIngredient(material),
      allowedGenerations: yield* assertAllowedGenerations(allowedGenerations),
      output: yield* assertOutput(output),
    };
  });

export const craftingDecoratedPotRecipe = (
  id: RecipeId,
  back: CraftingIngredientInput,
  left: CraftingIngredientInput,
  right: CraftingIngredientInput,
  front: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingDecoratedPotRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingDecoratedPot",
      ...(yield* normalizeRecipeOptions(id, options)),
      back: yield* assertIngredient(back),
      left: yield* assertIngredient(left),
      right: yield* assertIngredient(right),
      front: yield* assertIngredient(front),
      output: yield* assertOutput(output),
    };
  });

export const craftingFireworkRocketRecipe = (
  id: RecipeId,
  shell: CraftingIngredientInput,
  fuel: CraftingIngredientInput,
  star: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingFireworkRocketRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingFireworkRocket",
      ...(yield* normalizeRecipeOptions(id, options)),
      shell: yield* assertIngredient(shell),
      fuel: yield* assertIngredient(fuel),
      star: yield* assertIngredient(star),
      output: yield* assertOutput(output),
    };
  });

export const craftingFireworkStarFadeRecipe = (
  id: RecipeId,
  target: CraftingIngredientInput,
  dye: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingFireworkStarFadeRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingFireworkStarFade",
      ...(yield* normalizeRecipeOptions(id, options)),
      target: yield* assertIngredient(target),
      dye: yield* assertIngredient(dye),
      output: yield* assertOutput(output),
    };
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
): Result.Result<CraftingFireworkStarRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingFireworkStar",
      ...(yield* normalizeRecipeOptions(id, options)),
      trail: yield* assertIngredient(trail),
      twinkle: yield* assertIngredient(twinkle),
      fuel: yield* assertIngredient(fuel),
      dye: yield* assertIngredient(dye),
      shapes: yield* assertShapeIngredients(shapes),
      output: yield* assertOutput(output),
    };
  });

export const craftingMapExtendingRecipe = (
  id: RecipeId,
  map: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingMapExtendingRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingMapExtending",
      ...(yield* normalizeRecipeOptions(id, options)),
      map: yield* assertIngredient(map),
      material: yield* assertIngredient(material),
      output: yield* assertOutput(output),
    };
  });

export const craftingShieldDecorationRecipe = (
  id: RecipeId,
  banner: CraftingIngredientInput,
  target: CraftingIngredientInput,
  output: ItemStack,
  options?: Omit<CraftingSpecialRecipeOptions, "id">,
): Result.Result<CraftingShieldDecorationRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "CraftingShieldDecoration",
      ...(yield* normalizeRecipeOptions(id, options)),
      banner: yield* assertIngredient(banner),
      target: yield* assertIngredient(target),
      output: yield* assertOutput(output),
    };
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
    (typeof value.group === "string" && RecipeGroup.is(value.group))) &&
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

import {
  ItemComponentPatchKey,
  itemComponentPatchFromUnknown,
  mergeItemComponentPatches,
  type ItemComponentPatch,
} from "./item-component-patch.js";
import {
  isBannerPatternsComponent,
  isBaseColorComponent,
  isDyeComponent,
  isDyedColorComponent,
  isFireworkExplosionComponent,
  isMapIdComponent,
  isPotionContentsComponent,
  isWrittenBookContentComponent,
} from "./item-component-values-validation.js";
import {
  DYE_COLORS,
  FIREWORK_EXPLOSION_SHAPES,
  type BannerPatternsComponent,
  type BaseColorComponent,
  type DyeColor,
  type DyedColorComponent,
  type FireworkExplosionComponent,
  type FireworkExplosionShape,
  type MapIdComponent,
  type WrittenBookContentComponent,
  type WrittenBookPageComponent,
  type PotionContentsComponent,
  type PotionEffectInstanceComponent,
} from "./item-component-values-data.js";
import {
  isItemStack,
  itemStack,
  itemStackWithCount,
  maxStackCountForStack,
  transmuteItemStack,
  type ItemStack,
} from "./item-stack.js";
import {
  craftGrid,
  ingredientMatches,
  isRecipeItemTag,
  type CraftGrid,
  type CraftingIngredient,
  type ItemTagMemberships,
  type RecipeMatchContext,
} from "./recipe-data.js";
import { ResourceLocation } from "./identifiers.js";
import {
  CRAFTING_SPECIAL_STATION_TAG,
  isCraftingBannerDuplicateRecipe,
  isCraftingBookCloningRecipe,
  isCraftingDecoratedPotRecipe,
  isCraftingDyeRecipe,
  isCraftingFireworkRocketRecipe,
  isCraftingFireworkStarFadeRecipe,
  isCraftingFireworkStarRecipe,
  isCraftingImbueRecipe,
  isCraftingMapExtendingRecipe,
  isCraftingShieldDecorationRecipe,
  isCraftingSpecialRecipe,
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
  type CraftingSpecialRecipe,
  type CraftingSpecialRecipeTable,
} from "./crafting-special-data.js";
import { isItemType } from "./item-type.js";
import type { JsonValue } from "./json-value.js";

const DYE_RGB: Readonly<Record<DyeColor, readonly [number, number, number]>> = {
  white: [249, 255, 254],
  orange: [249, 128, 29],
  magenta: [199, 78, 189],
  light_blue: [58, 179, 218],
  yellow: [254, 216, 61],
  lime: [128, 199, 31],
  pink: [243, 139, 170],
  gray: [71, 79, 82],
  light_gray: [157, 157, 151],
  cyan: [22, 156, 156],
  purple: [137, 50, 184],
  blue: [60, 68, 170],
  brown: [131, 84, 50],
  green: [94, 124, 22],
  red: [176, 46, 38],
  black: [29, 29, 33],
};

const DEFAULT_DYED_COLOR: readonly [number, number, number] = [160, 101, 64];

const componentPatchValue = (
  stack: ItemStack,
  component: string,
): JsonValue | undefined => {
  if (stack.componentPatch === undefined) {
    return undefined;
  }
  const key = ItemComponentPatchKey(component);
  return Object.hasOwn(stack.componentPatch, key)
    ? stack.componentPatch[key]
    : undefined;
};

const dyedColorOf = (
  stack: ItemStack,
): DyedColorComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:dyed_color");
  if (patched !== undefined) {
    return isDyedColorComponent(patched) ? patched : null;
  }
  return stack.components?.dyedColor;
};

const dyeColorOf = (stack: ItemStack): DyeColor | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:dye");
  if (patched !== undefined) {
    return isDyeComponent(patched) ? patched : null;
  }
  return stack.components?.dye;
};

const potionContentsOf = (
  stack: ItemStack,
): PotionContentsComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:potion_contents");
  if (patched !== undefined) {
    return isPotionContentsComponent(patched) ? patched : null;
  }
  return stack.components?.potionContents;
};

const writtenBookContentOf = (
  stack: ItemStack,
): WrittenBookContentComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:written_book_content");
  if (patched !== undefined) {
    return isWrittenBookContentComponent(patched) ? patched : null;
  }
  return stack.components?.writtenBookContent;
};

const mapIdOf = (stack: ItemStack): MapIdComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:map_id");
  if (patched !== undefined) {
    return isMapIdComponent(patched) ? patched : null;
  }
  return stack.components?.mapId;
};

const fireworkExplosionOf = (
  stack: ItemStack,
): FireworkExplosionComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:firework_explosion");
  if (patched !== undefined) {
    return isFireworkExplosionComponent(patched) ? patched : null;
  }
  return stack.components?.fireworkExplosion;
};

const bannerPatternsOf = (
  stack: ItemStack,
): BannerPatternsComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:banner_patterns");
  if (patched !== undefined) {
    return isBannerPatternsComponent(patched) ? patched : null;
  }
  return stack.components?.bannerPatterns;
};

const baseColorOf = (
  stack: ItemStack,
): BaseColorComponent | null | undefined => {
  const patched = componentPatchValue(stack, "minecraft:base_color");
  if (patched !== undefined) {
    return isBaseColorComponent(patched) ? patched : null;
  }
  return stack.components?.baseColor;
};

// A packed colour is three bytes in one integer. Bit twiddling is banned across
// this repository, and plain arithmetic is exact here because every channel is
// clamped to 0-255 before it is packed.
const RED_PLACE = 0x10000;
const GREEN_PLACE = 0x100;
const CHANNEL_RANGE = 0x100;

const packColorChannels = (
  red: number,
  green: number,
  blue: number,
): number => red * RED_PLACE + green * GREEN_PLACE + blue;

const unpackColorChannel = (value: number, place: number): number =>
  Math.floor(value / place) % CHANNEL_RANGE;

const colorChannels = (
  value: DyedColorComponent | readonly [number, number, number],
): readonly [number, number, number] => {
  if (typeof value === "number") {
    return [
      unpackColorChannel(value, RED_PLACE),
      unpackColorChannel(value, GREEN_PLACE),
      value % CHANNEL_RANGE,
    ];
  }
  return [value[0] * 255, value[1] * 255, value[2] * 255];
};

const roundedChannel = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

/**
 * Mixes a target color with dye colors using Minecraft's brightness-preserving
 * leather-dye algorithm. A target without dyed_color uses the vanilla leather
 * default as the portable fallback.
 */
export const mixCraftingDyeColor = (
  current: DyedColorComponent | undefined,
  dyes: ReadonlyArray<DyeColor>,
): number => {
  if (current !== undefined && !isDyedColorComponent(current)) {
    throw new TypeError("Crafting dye target color is invalid");
  }
  if (dyes.length === 0) {
    throw new RangeError("Crafting dye requires at least one dye color");
  }
  if (!dyes.every(isDyeComponent)) {
    throw new TypeError("Crafting dye contains an invalid dye color");
  }
  const colors = [
    current === undefined ? DEFAULT_DYED_COLOR : colorChannels(current),
    ...dyes.map((dye) => DYE_RGB[dye]),
  ];
  const totals = colors.reduce(
    (total, color) => ({
      red: total.red + color[0],
      green: total.green + color[1],
      blue: total.blue + color[2],
      brightness: total.brightness + Math.max(...color),
    }),
    { red: 0, green: 0, blue: 0, brightness: 0 },
  );
  const count = colors.length;
  const red = roundedChannel(totals.red / count);
  const green = roundedChannel(totals.green / count);
  const blue = roundedChannel(totals.blue / count);
  const averageBrightness = totals.brightness / count;
  const maximumChannel = Math.max(red, green, blue);
  const brightnessScale = averageBrightness / maximumChannel;
  return packColorChannels(
    roundedChannel(red * brightnessScale),
    roundedChannel(green * brightnessScale),
    roundedChannel(blue * brightnessScale),
  );
};

const potionEffectToJson = (
  effect: PotionEffectInstanceComponent,
): JsonValue => {
  const result: Record<string, JsonValue> = {
    id: effect.id,
    amplifier: effect.amplifier,
    duration: effect.duration,
    ambient: effect.ambient,
    showParticles: effect.showParticles,
    showIcon: effect.showIcon,
  };
  if (effect.hiddenEffect !== undefined) {
    result["hiddenEffect"] = potionEffectToJson(effect.hiddenEffect);
  }
  return result;
};

const potionContentsToJson = (value: PotionContentsComponent): JsonValue => {
  if (typeof value === "string") {
    return value;
  }
  const result: Record<string, JsonValue> = {
    customEffects: value.customEffects.map(potionEffectToJson),
  };
  if (value["potion"] !== undefined) {
    result["potion"] = value["potion"];
  }
  if (value["customColor"] !== undefined) {
    result["customColor"] = value["customColor"];
  }
  return result;
};

const writtenBookPageToJson = (page: WrittenBookPageComponent): JsonValue => {
  if (typeof page === "string") {
    return page;
  }
  return {
    raw: page.raw,
    ...(page.filtered === undefined ? {} : { filtered: page.filtered }),
  };
};

const writtenBookContentToJson = (
  value: WrittenBookContentComponent,
): JsonValue => ({
  pages: value.pages.map(writtenBookPageToJson),
  title: writtenBookPageToJson(value.title),
  author: value.author,
  generation: value.generation,
  resolved: value.resolved,
});

const fireworkExplosionToJson = (
  value: FireworkExplosionComponent,
): JsonValue => ({
  shape: value.shape,
  colors: [...value.colors],
  fadeColors: [...value.fadeColors],
  hasTrail: value.hasTrail,
  hasTwinkle: value.hasTwinkle,
});

const bannerPatternsToJson = (value: BannerPatternsComponent): JsonValue =>
  value.map((entry) => ({
    pattern: entry.pattern,
    color: entry.color,
  }));

const packedDyeColor = (color: DyeColor): number => {
  const [red, green, blue] = DYE_RGB[color];
  return packColorChannels(red, green, blue);
};

const packedDyeColors = (
  colors: ReadonlyArray<DyeColor>,
): ReadonlyArray<number> => colors.map(packedDyeColor);

const componentPatch = (
  component: string,
  value: JsonValue,
): ItemComponentPatch => itemComponentPatchFromUnknown({ [component]: value });

const withComponentPatch = (
  stack: ItemStack,
  patch: ItemComponentPatch,
): ItemStack => {
  const merged = mergeItemComponentPatches(stack.componentPatch, patch);
  return itemStack(stack.item, stack.count, {
    ...(stack.components === undefined ? {} : { components: stack.components }),
    componentPatch: merged,
  });
};

export type CraftingDyeMatch =
  | {
      readonly _tag: "Match";
      readonly recipe: CraftingDyeRecipe;
      readonly targetSlotIndex: number;
      readonly dyeSlotIndexes: ReadonlyArray<number>;
      readonly output: ItemStack;
    }
  | { readonly _tag: "NoMatch" };

export type CraftingImbueMatch =
  | {
      readonly _tag: "Match";
      readonly recipe: CraftingImbueRecipe;
      readonly sourceSlotIndex: number;
      readonly materialSlotIndexes: ReadonlyArray<number>;
      readonly output: ItemStack;
    }
  | { readonly _tag: "NoMatch" };

type CraftingMatch<R, Fields extends object> =
  | ({
      readonly _tag: "Match";
      readonly recipe: R;
      readonly output: ItemStack;
    } & Fields)
  | { readonly _tag: "NoMatch" };

export type CraftingBannerDuplicateMatch = CraftingMatch<
  CraftingBannerDuplicateRecipe,
  {
    readonly bannerSlotIndex: number;
    readonly duplicateSlotIndex: number;
  }
>;

export type CraftingBookCloningMatch = CraftingMatch<
  CraftingBookCloningRecipe,
  {
    readonly sourceSlotIndex: number;
    readonly materialSlotIndexes: ReadonlyArray<number>;
  }
>;

export type CraftingDecoratedPotMatch = CraftingMatch<
  CraftingDecoratedPotRecipe,
  {
    readonly backSlotIndex: number;
    readonly leftSlotIndex: number;
    readonly rightSlotIndex: number;
    readonly frontSlotIndex: number;
  }
>;

export type CraftingFireworkRocketMatch = CraftingMatch<
  CraftingFireworkRocketRecipe,
  {
    readonly shellSlotIndex: number;
    readonly fuelSlotIndexes: ReadonlyArray<number>;
    readonly starSlotIndex: number;
  }
>;

export type CraftingFireworkStarFadeMatch = CraftingMatch<
  CraftingFireworkStarFadeRecipe,
  {
    readonly targetSlotIndex: number;
    readonly dyeSlotIndexes: ReadonlyArray<number>;
  }
>;

export type CraftingFireworkStarMatch = CraftingMatch<
  CraftingFireworkStarRecipe,
  {
    readonly fuelSlotIndex: number;
    readonly dyeSlotIndexes: ReadonlyArray<number>;
    readonly trailSlotIndexes: ReadonlyArray<number>;
    readonly twinkleSlotIndexes: ReadonlyArray<number>;
    readonly shapeSlotIndexes: ReadonlyArray<number>;
    readonly shape: FireworkExplosionShape;
  }
>;

export type CraftingMapExtendingMatch = CraftingMatch<
  CraftingMapExtendingRecipe,
  {
    readonly mapSlotIndex: number;
    readonly materialSlotIndexes: ReadonlyArray<number>;
  }
>;

export type CraftingShieldDecorationMatch = CraftingMatch<
  CraftingShieldDecorationRecipe,
  {
    readonly bannerSlotIndex: number;
    readonly targetSlotIndex: number;
  }
>;

export type CraftingSpecialMatch =
  | CraftingDyeMatch
  | CraftingImbueMatch
  | CraftingBannerDuplicateMatch
  | CraftingBookCloningMatch
  | CraftingDecoratedPotMatch
  | CraftingFireworkRocketMatch
  | CraftingFireworkStarFadeMatch
  | CraftingFireworkStarMatch
  | CraftingMapExtendingMatch
  | CraftingShieldDecorationMatch;

export type CraftingDyeApplyResult =
  | {
      readonly _tag: "Applied";
      readonly recipe: CraftingDyeRecipe;
      readonly targetSlotIndex: number;
      readonly dyeSlotIndexes: ReadonlyArray<number>;
      readonly output: ItemStack;
      readonly remainingGrid: CraftGrid;
    }
  | { readonly _tag: "NoMatch" };

export type CraftingImbueApplyResult =
  | {
      readonly _tag: "Applied";
      readonly recipe: CraftingImbueRecipe;
      readonly sourceSlotIndex: number;
      readonly materialSlotIndexes: ReadonlyArray<number>;
      readonly output: ItemStack;
      readonly remainingGrid: CraftGrid;
    }
  | { readonly _tag: "NoMatch" };

type CraftingApplyResult<R, Fields extends object> =
  | ({
      readonly _tag: "Applied";
      readonly recipe: R;
      readonly output: ItemStack;
      readonly remainingGrid: CraftGrid;
    } & Fields)
  | { readonly _tag: "NoMatch" };

export type CraftingBannerDuplicateApplyResult = CraftingApplyResult<
  CraftingBannerDuplicateRecipe,
  {
    readonly bannerSlotIndex: number;
    readonly duplicateSlotIndex: number;
  }
>;

export type CraftingBookCloningApplyResult = CraftingApplyResult<
  CraftingBookCloningRecipe,
  {
    readonly sourceSlotIndex: number;
    readonly materialSlotIndexes: ReadonlyArray<number>;
  }
>;

export type CraftingDecoratedPotApplyResult = CraftingApplyResult<
  CraftingDecoratedPotRecipe,
  {
    readonly backSlotIndex: number;
    readonly leftSlotIndex: number;
    readonly rightSlotIndex: number;
    readonly frontSlotIndex: number;
  }
>;

export type CraftingFireworkRocketApplyResult = CraftingApplyResult<
  CraftingFireworkRocketRecipe,
  {
    readonly shellSlotIndex: number;
    readonly fuelSlotIndexes: ReadonlyArray<number>;
    readonly starSlotIndex: number;
  }
>;

export type CraftingFireworkStarFadeApplyResult = CraftingApplyResult<
  CraftingFireworkStarFadeRecipe,
  {
    readonly targetSlotIndex: number;
    readonly dyeSlotIndexes: ReadonlyArray<number>;
  }
>;

export type CraftingFireworkStarApplyResult = CraftingApplyResult<
  CraftingFireworkStarRecipe,
  {
    readonly fuelSlotIndex: number;
    readonly dyeSlotIndexes: ReadonlyArray<number>;
    readonly trailSlotIndexes: ReadonlyArray<number>;
    readonly twinkleSlotIndexes: ReadonlyArray<number>;
    readonly shapeSlotIndexes: ReadonlyArray<number>;
    readonly shape: FireworkExplosionShape;
  }
>;

export type CraftingMapExtendingApplyResult = CraftingApplyResult<
  CraftingMapExtendingRecipe,
  {
    readonly mapSlotIndex: number;
    readonly materialSlotIndexes: ReadonlyArray<number>;
  }
>;

export type CraftingShieldDecorationApplyResult = CraftingApplyResult<
  CraftingShieldDecorationRecipe,
  {
    readonly bannerSlotIndex: number;
    readonly targetSlotIndex: number;
  }
>;

export type CraftingSpecialApplyResult =
  | CraftingDyeApplyResult
  | CraftingImbueApplyResult
  | CraftingBannerDuplicateApplyResult
  | CraftingBookCloningApplyResult
  | CraftingDecoratedPotApplyResult
  | CraftingFireworkRocketApplyResult
  | CraftingFireworkStarFadeApplyResult
  | CraftingFireworkStarApplyResult
  | CraftingMapExtendingApplyResult
  | CraftingShieldDecorationApplyResult;

type RecordValue = {
  readonly width?: unknown;
  readonly height?: unknown;
  readonly cells?: unknown;
  readonly station?: unknown;
  readonly itemTags?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isItemTagMemberships = (value: unknown): value is ItemTagMemberships => {
  if (!(value instanceof Map)) {
    return false;
  }
  return [...value.entries()].every(
    ([tag, items]) =>
      isRecipeItemTag(tag) &&
      items instanceof Set &&
      [...items].every((item) => isItemType(item)),
  );
};

function assertContext(value: unknown): asserts value is RecipeMatchContext {
  if (!isRecord(value)) {
    throw new TypeError("Crafting special match context must be an object");
  }
  if (
    value.station !== undefined &&
    (typeof value.station !== "string" || value.station.trim().length === 0)
  ) {
    throw new TypeError(
      "Crafting special match context station must be a non-empty string",
    );
  }
  if (value.itemTags !== undefined && !isItemTagMemberships(value.itemTags)) {
    throw new TypeError(
      "Crafting special match context itemTags must be a Map",
    );
  }
}

const isCraftGrid = (value: unknown): value is CraftGrid => {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.width !== "number" ||
    !Number.isSafeInteger(value.width) ||
    typeof value.height !== "number" ||
    !Number.isSafeInteger(value.height) ||
    value.width < 0 ||
    value.width > 3 ||
    value.height < 0 ||
    value.height > 3 ||
    !Array.isArray(value.cells) ||
    value.cells.length !== value.width * value.height
  ) {
    return false;
  }
  return value.cells.every((cell) => cell === undefined || isItemStack(cell));
};

function assertGrid(value: unknown): asserts value is CraftGrid {
  if (!isCraftGrid(value)) {
    throw new TypeError("Crafting special grid must be a valid craft grid");
  }
}

function assertDyeRecipe(value: unknown): asserts value is CraftingDyeRecipe {
  if (!isCraftingDyeRecipe(value)) {
    throw new TypeError("Crafting dye recipe has an invalid shape");
  }
}

function assertImbueRecipe(
  value: unknown,
): asserts value is CraftingImbueRecipe {
  if (!isCraftingImbueRecipe(value)) {
    throw new TypeError("Crafting imbue recipe has an invalid shape");
  }
}

function assertBannerDuplicateRecipe(
  value: unknown,
): asserts value is CraftingBannerDuplicateRecipe {
  if (!isCraftingBannerDuplicateRecipe(value)) {
    throw new TypeError(
      "Crafting banner duplicate recipe has an invalid shape",
    );
  }
}

function assertBookCloningRecipe(
  value: unknown,
): asserts value is CraftingBookCloningRecipe {
  if (!isCraftingBookCloningRecipe(value)) {
    throw new TypeError("Crafting book cloning recipe has an invalid shape");
  }
}

function assertDecoratedPotRecipe(
  value: unknown,
): asserts value is CraftingDecoratedPotRecipe {
  if (!isCraftingDecoratedPotRecipe(value)) {
    throw new TypeError("Crafting decorated pot recipe has an invalid shape");
  }
}

function assertFireworkRocketRecipe(
  value: unknown,
): asserts value is CraftingFireworkRocketRecipe {
  if (!isCraftingFireworkRocketRecipe(value)) {
    throw new TypeError("Crafting firework rocket recipe has an invalid shape");
  }
}

function assertFireworkStarFadeRecipe(
  value: unknown,
): asserts value is CraftingFireworkStarFadeRecipe {
  if (!isCraftingFireworkStarFadeRecipe(value)) {
    throw new TypeError(
      "Crafting firework star fade recipe has an invalid shape",
    );
  }
}

function assertFireworkStarRecipe(
  value: unknown,
): asserts value is CraftingFireworkStarRecipe {
  if (!isCraftingFireworkStarRecipe(value)) {
    throw new TypeError("Crafting firework star recipe has an invalid shape");
  }
}

function assertMapExtendingRecipe(
  value: unknown,
): asserts value is CraftingMapExtendingRecipe {
  if (!isCraftingMapExtendingRecipe(value)) {
    throw new TypeError("Crafting map extending recipe has an invalid shape");
  }
}

function assertShieldDecorationRecipe(
  value: unknown,
): asserts value is CraftingShieldDecorationRecipe {
  if (!isCraftingShieldDecorationRecipe(value)) {
    throw new TypeError(
      "Crafting shield decoration recipe has an invalid shape",
    );
  }
}

function assertRecipeTable(
  value: unknown,
): asserts value is CraftingSpecialRecipeTable {
  if (!Array.isArray(value)) {
    throw new TypeError("Crafting special recipes must be an array");
  }
  value.forEach((recipe) => {
    if (!isCraftingSpecialRecipe(recipe)) {
      throw new TypeError("Crafting special recipe has an invalid shape");
    }
  });
}

const stationMatches = (
  tags: ReadonlyArray<string>,
  context: RecipeMatchContext,
): boolean =>
  tags.length === 0 ||
  tags.includes(context.station ?? CRAFTING_SPECIAL_STATION_TAG);

const ingredientMatchesSlot = (
  ingredient: CraftingIngredient,
  slot: ItemStack,
  itemTags: ItemTagMemberships | undefined,
): boolean =>
  slot.count >= ingredient.count &&
  ingredientMatches(ingredient, slot.item, itemTags);

const noMatch = (): { readonly _tag: "NoMatch" } => ({ _tag: "NoMatch" });

const craftingDyeMatch = (
  recipe: CraftingDyeRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingDyeMatch => {
  if (
    grid.width !== 3 ||
    grid.height !== 3 ||
    !stationMatches(recipe.tags, context)
  ) {
    return noMatch();
  }
  for (const targetSlotIndex of grid.cells.keys()) {
    const target = grid.cells[targetSlotIndex];
    if (
      target === undefined ||
      !ingredientMatchesSlot(recipe.target, target, context.itemTags)
    ) {
      continue;
    }
    const dyeSlotIndexes: number[] = [];
    const dyeColors: DyeColor[] = [];
    let invalidDye = false;
    for (const [slotIndex, slot] of grid.cells.entries()) {
      if (slotIndex === targetSlotIndex || slot === undefined) {
        continue;
      }
      const dye = dyeColorOf(slot);
      if (
        dye === undefined ||
        dye === null ||
        !ingredientMatchesSlot(recipe.dye, slot, context.itemTags)
      ) {
        invalidDye = true;
        break;
      }
      dyeSlotIndexes.push(slotIndex);
      dyeColors.push(dye);
    }
    if (invalidDye || dyeColors.length === 0) {
      continue;
    }
    const targetColor = dyedColorOf(target);
    if (targetColor === null) {
      continue;
    }
    const mixedColor = mixCraftingDyeColor(targetColor, dyeColors);
    const output = withComponentPatch(
      transmuteItemStack(target, recipe.output),
      componentPatch("minecraft:dyed_color", mixedColor),
    );
    return {
      _tag: "Match",
      recipe,
      targetSlotIndex,
      dyeSlotIndexes,
      output,
    };
  }
  return noMatch();
};

const craftingImbueMatch = (
  recipe: CraftingImbueRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingImbueMatch => {
  if (
    grid.width !== 3 ||
    grid.height !== 3 ||
    !stationMatches(recipe.tags, context)
  ) {
    return noMatch();
  }
  const source = grid.cells[4];
  if (
    source === undefined ||
    !ingredientMatchesSlot(recipe.source, source, context.itemTags)
  ) {
    return noMatch();
  }
  const potionContents = potionContentsOf(source);
  if (potionContents === undefined || potionContents === null) {
    return noMatch();
  }
  const materialSlotIndexes: number[] = [];
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slotIndex === 4) {
      continue;
    }
    if (slot === undefined) {
      return noMatch();
    }
    if (!ingredientMatchesSlot(recipe.material, slot, context.itemTags)) {
      return noMatch();
    }
    materialSlotIndexes.push(slotIndex);
  }
  const output = withComponentPatch(
    transmuteItemStack(source, recipe.output),
    componentPatch(
      "minecraft:potion_contents",
      potionContentsToJson(potionContents),
    ),
  );
  return {
    _tag: "Match",
    recipe,
    sourceSlotIndex: 4,
    materialSlotIndexes,
    output,
  };
};

const craftingGridMatchesRecipe = (
  grid: CraftGrid,
  tags: ReadonlyArray<string>,
  context: RecipeMatchContext,
): boolean =>
  grid.width === 3 && grid.height === 3 && stationMatches(tags, context);

const isBannerItem = (stack: ItemStack): boolean =>
  stack.item.endsWith("_banner");

const craftingBannerDuplicateMatch = (
  recipe: CraftingBannerDuplicateRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingBannerDuplicateMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let bannerSlotIndex: number | undefined;
  let duplicateSlotIndex: number | undefined;
  let source: ItemStack | undefined;
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (
      !isBannerItem(slot) ||
      !ingredientMatchesSlot(recipe.banner, slot, context.itemTags)
    ) {
      return noMatch();
    }
    if (bannerSlotIndex === undefined) {
      bannerSlotIndex = slotIndex;
      source = slot;
    } else if (duplicateSlotIndex === undefined) {
      duplicateSlotIndex = slotIndex;
    } else {
      return noMatch();
    }
  }
  if (
    bannerSlotIndex === undefined ||
    duplicateSlotIndex === undefined ||
    source === undefined
  ) {
    return noMatch();
  }
  return {
    _tag: "Match",
    recipe,
    bannerSlotIndex,
    duplicateSlotIndex,
    output: transmuteItemStack(source, recipe.output),
  };
};

const craftingBookCloningMatch = (
  recipe: CraftingBookCloningRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingBookCloningMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let sourceSlotIndex: number | undefined;
  let source: ItemStack | undefined;
  let content: WrittenBookContentComponent | undefined;
  const materialSlotIndexes: number[] = [];
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (ingredientMatchesSlot(recipe.source, slot, context.itemTags)) {
      if (slot.item !== "written_book" || sourceSlotIndex !== undefined) {
        return noMatch();
      }
      const candidate = writtenBookContentOf(slot);
      if (
        candidate === undefined ||
        candidate === null ||
        candidate.generation < recipe.allowedGenerations[0] ||
        candidate.generation > recipe.allowedGenerations[1]
      ) {
        return noMatch();
      }
      sourceSlotIndex = slotIndex;
      source = slot;
      content = candidate;
      continue;
    }
    if (!ingredientMatchesSlot(recipe.material, slot, context.itemTags)) {
      return noMatch();
    }
    materialSlotIndexes.push(slotIndex);
  }
  if (
    sourceSlotIndex === undefined ||
    source === undefined ||
    content === undefined ||
    materialSlotIndexes.length === 0
  ) {
    return noMatch();
  }
  const outputCount =
    recipe.output.count + Math.max(0, materialSlotIndexes.length - 1);
  if (outputCount > maxStackCountForStack(recipe.output)) {
    return noMatch();
  }
  const outputContent: WrittenBookContentComponent = {
    ...content,
    generation: content.generation + 1,
  };
  const output = withComponentPatch(
    transmuteItemStack(source, recipe.output, outputCount),
    componentPatch(
      "minecraft:written_book_content",
      writtenBookContentToJson(outputContent),
    ),
  );
  return {
    _tag: "Match",
    recipe,
    sourceSlotIndex,
    materialSlotIndexes,
    output,
  };
};

const craftingDecoratedPotMatch = (
  recipe: CraftingDecoratedPotRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingDecoratedPotMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  const positions = [
    [1, recipe.back],
    [3, recipe.left],
    [5, recipe.right],
    [7, recipe.front],
  ] as const;
  const positionIndexes: ReadonlySet<number> = new Set(
    positions.map(([slotIndex]) => slotIndex),
  );
  const decorations: string[] = [];
  for (const [slotIndex, ingredient] of positions) {
    const slot = grid.cells[slotIndex];
    if (
      slot === undefined ||
      !ingredientMatchesSlot(ingredient, slot, context.itemTags)
    ) {
      return noMatch();
    }
    decorations.push(ResourceLocation(`minecraft:${slot.item}`));
  }
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (!positionIndexes.has(slotIndex) && slot !== undefined) {
      return noMatch();
    }
  }
  return {
    _tag: "Match",
    recipe,
    backSlotIndex: 1,
    leftSlotIndex: 3,
    rightSlotIndex: 5,
    frontSlotIndex: 7,
    output: withComponentPatch(
      recipe.output,
      componentPatch("minecraft:pot_decorations", decorations),
    ),
  };
};

const craftingFireworkRocketMatch = (
  recipe: CraftingFireworkRocketRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingFireworkRocketMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let shellSlotIndex: number | undefined;
  let shell: ItemStack | undefined;
  let starSlotIndex: number | undefined;
  let star: ItemStack | undefined;
  const fuelSlotIndexes: number[] = [];
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (ingredientMatchesSlot(recipe.shell, slot, context.itemTags)) {
      if (shellSlotIndex !== undefined) {
        return noMatch();
      }
      shellSlotIndex = slotIndex;
      shell = slot;
      continue;
    }
    if (ingredientMatchesSlot(recipe.star, slot, context.itemTags)) {
      if (starSlotIndex !== undefined) {
        return noMatch();
      }
      starSlotIndex = slotIndex;
      star = slot;
      continue;
    }
    if (ingredientMatchesSlot(recipe.fuel, slot, context.itemTags)) {
      fuelSlotIndexes.push(slotIndex);
      continue;
    }
    return noMatch();
  }
  if (
    shellSlotIndex === undefined ||
    shell === undefined ||
    starSlotIndex === undefined ||
    star === undefined ||
    fuelSlotIndexes.length === 0
  ) {
    return noMatch();
  }
  const explosion = fireworkExplosionOf(star);
  if (explosion === undefined || explosion === null) {
    return noMatch();
  }
  return {
    _tag: "Match",
    recipe,
    shellSlotIndex,
    fuelSlotIndexes,
    starSlotIndex,
    output: withComponentPatch(
      transmuteItemStack(shell, recipe.output),
      componentPatch("minecraft:fireworks", {
        explosions: [fireworkExplosionToJson(explosion)],
        flightDuration: fuelSlotIndexes.length,
      }),
    ),
  };
};

const craftingFireworkStarFadeMatch = (
  recipe: CraftingFireworkStarFadeRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingFireworkStarFadeMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let targetSlotIndex: number | undefined;
  let target: ItemStack | undefined;
  const dyeSlotIndexes: number[] = [];
  const dyeColors: DyeColor[] = [];
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (ingredientMatchesSlot(recipe.target, slot, context.itemTags)) {
      if (targetSlotIndex !== undefined) {
        return noMatch();
      }
      targetSlotIndex = slotIndex;
      target = slot;
      continue;
    }
    if (ingredientMatchesSlot(recipe.dye, slot, context.itemTags)) {
      const dye = dyeColorOf(slot);
      if (dye === undefined || dye === null) {
        return noMatch();
      }
      dyeSlotIndexes.push(slotIndex);
      dyeColors.push(dye);
      continue;
    }
    return noMatch();
  }
  if (
    targetSlotIndex === undefined ||
    target === undefined ||
    dyeSlotIndexes.length === 0
  ) {
    return noMatch();
  }
  const explosion = fireworkExplosionOf(target);
  if (explosion === undefined || explosion === null) {
    return noMatch();
  }
  const fadedExplosion: FireworkExplosionComponent = {
    ...explosion,
    fadeColors: dyeColors.map(packedDyeColor),
  };
  return {
    _tag: "Match",
    recipe,
    targetSlotIndex,
    dyeSlotIndexes,
    output: withComponentPatch(
      transmuteItemStack(target, recipe.output),
      componentPatch(
        "minecraft:firework_explosion",
        fireworkExplosionToJson(fadedExplosion),
      ),
    ),
  };
};

const matchingShapeForSlot = (
  recipe: CraftingFireworkStarRecipe,
  slot: ItemStack,
  itemTags: ItemTagMemberships | undefined,
): FireworkExplosionShape | undefined => {
  for (const shape of FIREWORK_EXPLOSION_SHAPES) {
    const ingredient = recipe.shapes[shape];
    if (
      ingredient !== undefined &&
      ingredientMatchesSlot(ingredient, slot, itemTags)
    ) {
      return shape;
    }
  }
  return undefined;
};

const craftingFireworkStarMatch = (
  recipe: CraftingFireworkStarRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingFireworkStarMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let fuelSlotIndex: number | undefined;
  const dyeSlotIndexes: number[] = [];
  const dyeColors: DyeColor[] = [];
  const trailSlotIndexes: number[] = [];
  const twinkleSlotIndexes: number[] = [];
  const shapeSlotIndexes: number[] = [];
  let shape: FireworkExplosionShape = "small_ball";
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (ingredientMatchesSlot(recipe.trail, slot, context.itemTags)) {
      if (trailSlotIndexes.length > 0) {
        return noMatch();
      }
      trailSlotIndexes.push(slotIndex);
      continue;
    }
    if (ingredientMatchesSlot(recipe.twinkle, slot, context.itemTags)) {
      if (twinkleSlotIndexes.length > 0) {
        return noMatch();
      }
      twinkleSlotIndexes.push(slotIndex);
      continue;
    }
    if (ingredientMatchesSlot(recipe.fuel, slot, context.itemTags)) {
      if (fuelSlotIndex !== undefined) {
        return noMatch();
      }
      fuelSlotIndex = slotIndex;
      continue;
    }
    if (ingredientMatchesSlot(recipe.dye, slot, context.itemTags)) {
      const dye = dyeColorOf(slot);
      if (dye === undefined || dye === null) {
        return noMatch();
      }
      dyeSlotIndexes.push(slotIndex);
      dyeColors.push(dye);
      continue;
    }
    const matchedShape = matchingShapeForSlot(recipe, slot, context.itemTags);
    if (matchedShape === undefined) {
      return noMatch();
    }
    if (shapeSlotIndexes.length > 0) {
      return noMatch();
    }
    shapeSlotIndexes.push(slotIndex);
    shape = matchedShape;
  }
  if (fuelSlotIndex === undefined || dyeSlotIndexes.length === 0) {
    return noMatch();
  }
  const explosion: FireworkExplosionComponent = {
    shape,
    colors: packedDyeColors(dyeColors),
    fadeColors: [],
    hasTrail: trailSlotIndexes.length > 0,
    hasTwinkle: twinkleSlotIndexes.length > 0,
  };
  return {
    _tag: "Match",
    recipe,
    fuelSlotIndex,
    dyeSlotIndexes,
    trailSlotIndexes,
    twinkleSlotIndexes,
    shapeSlotIndexes,
    shape,
    output: withComponentPatch(
      recipe.output,
      componentPatch(
        "minecraft:firework_explosion",
        fireworkExplosionToJson(explosion),
      ),
    ),
  };
};

const craftingMapExtendingMatch = (
  recipe: CraftingMapExtendingRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingMapExtendingMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let mapSlotIndex: number | undefined;
  let map: ItemStack | undefined;
  const materialSlotIndexes: number[] = [];
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (ingredientMatchesSlot(recipe.map, slot, context.itemTags)) {
      const mapId = mapIdOf(slot);
      if (
        mapSlotIndex !== undefined ||
        slot.item !== "filled_map" ||
        mapId === undefined ||
        mapId === null
      ) {
        return noMatch();
      }
      mapSlotIndex = slotIndex;
      map = slot;
      continue;
    }
    if (!ingredientMatchesSlot(recipe.material, slot, context.itemTags)) {
      return noMatch();
    }
    materialSlotIndexes.push(slotIndex);
  }
  if (
    mapSlotIndex === undefined ||
    map === undefined ||
    materialSlotIndexes.length === 0
  ) {
    return noMatch();
  }
  return {
    _tag: "Match",
    recipe,
    mapSlotIndex,
    materialSlotIndexes,
    output: withComponentPatch(
      transmuteItemStack(map, recipe.output),
      componentPatch("minecraft:map_post_processing", "scale"),
    ),
  };
};

// Only a plain shield can take a banner. An absent patterns component and an
// empty one both count as plain; a component that failed to parse does not.
const isUndecoratedShield = (slot: ItemStack): boolean => {
  if (slot.item !== "shield") {
    return false;
  }
  const patterns = bannerPatternsOf(slot);
  return patterns === undefined || (patterns !== null && patterns.length === 0);
};

const shieldDecorationPatch = (
  patterns: BannerPatternsComponent | undefined,
  baseColor: BaseColorComponent | undefined,
): ItemComponentPatch => {
  const patchValues: Record<string, JsonValue> = {
    "minecraft:banner_patterns": bannerPatternsToJson(patterns ?? []),
  };
  if (baseColor !== undefined) {
    patchValues["minecraft:base_color"] = baseColor;
  }
  return itemComponentPatchFromUnknown(patchValues);
};

const craftingShieldDecorationMatch = (
  recipe: CraftingShieldDecorationRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingShieldDecorationMatch => {
  if (!craftingGridMatchesRecipe(grid, recipe.tags, context)) {
    return noMatch();
  }
  let bannerSlotIndex: number | undefined;
  let banner: ItemStack | undefined;
  let targetSlotIndex: number | undefined;
  let target: ItemStack | undefined;
  for (const [slotIndex, slot] of grid.cells.entries()) {
    if (slot === undefined) {
      continue;
    }
    if (ingredientMatchesSlot(recipe.banner, slot, context.itemTags)) {
      if (bannerSlotIndex !== undefined || !isBannerItem(slot)) {
        return noMatch();
      }
      bannerSlotIndex = slotIndex;
      banner = slot;
      continue;
    }
    if (ingredientMatchesSlot(recipe.target, slot, context.itemTags)) {
      if (targetSlotIndex !== undefined || !isUndecoratedShield(slot)) {
        return noMatch();
      }
      targetSlotIndex = slotIndex;
      target = slot;
      continue;
    }
    return noMatch();
  }
  if (
    bannerSlotIndex === undefined ||
    banner === undefined ||
    targetSlotIndex === undefined ||
    target === undefined
  ) {
    return noMatch();
  }
  const patterns = bannerPatternsOf(banner);
  const baseColor = baseColorOf(banner);
  if (patterns === null || baseColor === null) {
    return noMatch();
  }
  return {
    _tag: "Match",
    recipe,
    bannerSlotIndex,
    targetSlotIndex,
    output: withComponentPatch(
      transmuteItemStack(target, recipe.output),
      shieldDecorationPatch(patterns, baseColor),
    ),
  };
};

const craftingSpecialMatch = (
  recipe: CraftingSpecialRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialMatch => {
  if (recipe._tag === "CraftingDye") {
    return craftingDyeMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingImbue") {
    return craftingImbueMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingBannerDuplicate") {
    return craftingBannerDuplicateMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingBookCloning") {
    return craftingBookCloningMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingDecoratedPot") {
    return craftingDecoratedPotMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingFireworkRocket") {
    return craftingFireworkRocketMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingFireworkStarFade") {
    return craftingFireworkStarFadeMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingFireworkStar") {
    return craftingFireworkStarMatch(recipe, grid, context);
  }
  if (recipe._tag === "CraftingMapExtending") {
    return craftingMapExtendingMatch(recipe, grid, context);
  }
  return craftingShieldDecorationMatch(recipe, grid, context);
};

const compareRecipes = (
  left: CraftingSpecialRecipe,
  right: CraftingSpecialRecipe,
): number => left.priority - right.priority || left.id.localeCompare(right.id);

const consume = (
  grid: CraftGrid,
  counts: ReadonlyMap<number, number>,
): CraftGrid =>
  craftGrid(
    grid.width,
    grid.height,
    grid.cells.map((slot, slotIndex) => {
      const count = counts.get(slotIndex);
      if (slot === undefined || count === undefined) {
        return slot;
      }
      const remainingCount = slot.count - count;
      return remainingCount === 0
        ? undefined
        : itemStackWithCount(slot, remainingCount);
    }),
  );

export function matchesCraftingDyeRecipe(
  recipe: CraftingDyeRecipe,
  grid: CraftGrid,
  context?: RecipeMatchContext,
): boolean;
export function matchesCraftingDyeRecipe(
  recipe: CraftingDyeRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = {},
): boolean {
  assertDyeRecipe(recipe);
  assertGrid(grid);
  assertContext(context);
  return craftingDyeMatch(recipe, grid, context)._tag === "Match";
}

export function matchCraftingDyeRecipes(
  grid: CraftGrid,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<CraftingDyeRecipe>,
): ReadonlyArray<Extract<CraftingDyeMatch, { readonly _tag: "Match" }>>;
export function matchCraftingDyeRecipes(
  grid: CraftGrid,
  context: RecipeMatchContext = {},
  recipes: ReadonlyArray<CraftingDyeRecipe> = [],
): ReadonlyArray<Extract<CraftingDyeMatch, { readonly _tag: "Match" }>> {
  assertGrid(grid);
  assertContext(context);
  recipes.forEach(assertDyeRecipe);
  return recipes
    .slice()
    .sort((left, right) => compareRecipes(left, right))
    .map((recipe) => craftingDyeMatch(recipe, grid, context))
    .filter(
      (match): match is Extract<CraftingDyeMatch, { readonly _tag: "Match" }> =>
        match._tag === "Match",
    );
}

export function matchCraftingDyeRecipe(
  grid: CraftGrid,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<CraftingDyeRecipe>,
): CraftingDyeMatch;
export function matchCraftingDyeRecipe(
  grid: CraftGrid,
  context: RecipeMatchContext = {},
  recipes: ReadonlyArray<CraftingDyeRecipe> = [],
): CraftingDyeMatch {
  return matchCraftingDyeRecipes(grid, context, recipes)[0] ?? noMatch();
}

export function applyCraftingDye(
  recipe: CraftingDyeRecipe,
  grid: CraftGrid,
  context?: RecipeMatchContext,
): CraftingDyeApplyResult;
export function applyCraftingDye(
  recipe: CraftingDyeRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = {},
): CraftingDyeApplyResult {
  assertDyeRecipe(recipe);
  assertGrid(grid);
  assertContext(context);
  const match = craftingDyeMatch(recipe, grid, context);
  if (match._tag === "NoMatch") {
    return match;
  }
  const counts = new Map<number, number>([
    [match.targetSlotIndex, recipe.target.count],
    ...match.dyeSlotIndexes.map(
      (slotIndex) => [slotIndex, recipe.dye.count] as const,
    ),
  ]);
  return {
    _tag: "Applied",
    recipe,
    targetSlotIndex: match.targetSlotIndex,
    dyeSlotIndexes: match.dyeSlotIndexes,
    output: match.output,
    remainingGrid: consume(grid, counts),
  };
}

export function matchesCraftingImbueRecipe(
  recipe: CraftingImbueRecipe,
  grid: CraftGrid,
  context?: RecipeMatchContext,
): boolean;
export function matchesCraftingImbueRecipe(
  recipe: CraftingImbueRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = {},
): boolean {
  assertImbueRecipe(recipe);
  assertGrid(grid);
  assertContext(context);
  return craftingImbueMatch(recipe, grid, context)._tag === "Match";
}

export function matchCraftingImbueRecipes(
  grid: CraftGrid,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<CraftingImbueRecipe>,
): ReadonlyArray<Extract<CraftingImbueMatch, { readonly _tag: "Match" }>>;
export function matchCraftingImbueRecipes(
  grid: CraftGrid,
  context: RecipeMatchContext = {},
  recipes: ReadonlyArray<CraftingImbueRecipe> = [],
): ReadonlyArray<Extract<CraftingImbueMatch, { readonly _tag: "Match" }>> {
  assertGrid(grid);
  assertContext(context);
  recipes.forEach(assertImbueRecipe);
  return recipes
    .slice()
    .sort((left, right) => compareRecipes(left, right))
    .map((recipe) => craftingImbueMatch(recipe, grid, context))
    .filter(
      (
        match,
      ): match is Extract<CraftingImbueMatch, { readonly _tag: "Match" }> =>
        match._tag === "Match",
    );
}

export function matchCraftingImbueRecipe(
  grid: CraftGrid,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<CraftingImbueRecipe>,
): CraftingImbueMatch;
export function matchCraftingImbueRecipe(
  grid: CraftGrid,
  context: RecipeMatchContext = {},
  recipes: ReadonlyArray<CraftingImbueRecipe> = [],
): CraftingImbueMatch {
  return matchCraftingImbueRecipes(grid, context, recipes)[0] ?? noMatch();
}

export function applyCraftingImbue(
  recipe: CraftingImbueRecipe,
  grid: CraftGrid,
  context?: RecipeMatchContext,
): CraftingImbueApplyResult;
export function applyCraftingImbue(
  recipe: CraftingImbueRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = {},
): CraftingImbueApplyResult {
  assertImbueRecipe(recipe);
  assertGrid(grid);
  assertContext(context);
  const match = craftingImbueMatch(recipe, grid, context);
  if (match._tag === "NoMatch") {
    return match;
  }
  const counts = new Map<number, number>([
    [match.sourceSlotIndex, recipe.source.count],
    ...match.materialSlotIndexes.map(
      (slotIndex) => [slotIndex, recipe.material.count] as const,
    ),
  ]);
  return {
    _tag: "Applied",
    recipe,
    sourceSlotIndex: match.sourceSlotIndex,
    materialSlotIndexes: match.materialSlotIndexes,
    output: match.output,
    remainingGrid: consume(grid, counts),
  };
}

export function matchCraftingSpecialRecipes(
  grid: CraftGrid,
  context?: RecipeMatchContext,
  recipes?: CraftingSpecialRecipeTable,
): ReadonlyArray<Extract<CraftingSpecialMatch, { readonly _tag: "Match" }>>;
export function matchCraftingSpecialRecipes(
  grid: CraftGrid,
  context: RecipeMatchContext = {},
  recipes: CraftingSpecialRecipeTable = [],
): ReadonlyArray<Extract<CraftingSpecialMatch, { readonly _tag: "Match" }>> {
  assertGrid(grid);
  assertContext(context);
  assertRecipeTable(recipes);
  return recipes
    .slice()
    .sort(compareRecipes)
    .flatMap((recipe) => {
      const match = craftingSpecialMatch(recipe, grid, context);
      return match._tag === "Match" ? [match] : [];
    });
}

export function matchCraftingSpecialRecipe(
  grid: CraftGrid,
  context?: RecipeMatchContext,
  recipes?: CraftingSpecialRecipeTable,
): CraftingSpecialMatch;
export function matchCraftingSpecialRecipe(
  grid: CraftGrid,
  context: RecipeMatchContext = {},
  recipes: CraftingSpecialRecipeTable = [],
): CraftingSpecialMatch {
  return matchCraftingSpecialRecipes(grid, context, recipes)[0] ?? noMatch();
}

const applyBannerDuplicate = (
  recipe: CraftingBannerDuplicateRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertBannerDuplicateRecipe(recipe);
  const match = craftingBannerDuplicateMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    bannerSlotIndex: match.bannerSlotIndex,
    duplicateSlotIndex: match.duplicateSlotIndex,
    output: match.output,
    // Only the blank duplicate is spent. The patterned banner is the thing
    // being copied and survives the craft, which is what separates this recipe
    // from every other two-input special recipe here.
    remainingGrid: consume(
      grid,
      new Map([[match.duplicateSlotIndex, recipe.banner.count]]),
    ),
  };
};

const applyBookCloning = (
  recipe: CraftingBookCloningRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertBookCloningRecipe(recipe);
  const match = craftingBookCloningMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    sourceSlotIndex: match.sourceSlotIndex,
    materialSlotIndexes: match.materialSlotIndexes,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.sourceSlotIndex, recipe.source.count],
        ...match.materialSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.material.count] as const,
        ),
      ]),
    ),
  };
};

const applyDecoratedPot = (
  recipe: CraftingDecoratedPotRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertDecoratedPotRecipe(recipe);
  const match = craftingDecoratedPotMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    backSlotIndex: match.backSlotIndex,
    leftSlotIndex: match.leftSlotIndex,
    rightSlotIndex: match.rightSlotIndex,
    frontSlotIndex: match.frontSlotIndex,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.backSlotIndex, recipe.back.count],
        [match.leftSlotIndex, recipe.left.count],
        [match.rightSlotIndex, recipe.right.count],
        [match.frontSlotIndex, recipe.front.count],
      ]),
    ),
  };
};

const applyFireworkRocket = (
  recipe: CraftingFireworkRocketRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertFireworkRocketRecipe(recipe);
  const match = craftingFireworkRocketMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    shellSlotIndex: match.shellSlotIndex,
    fuelSlotIndexes: match.fuelSlotIndexes,
    starSlotIndex: match.starSlotIndex,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.shellSlotIndex, recipe.shell.count],
        [match.starSlotIndex, recipe.star.count],
        ...match.fuelSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.fuel.count] as const,
        ),
      ]),
    ),
  };
};

const applyFireworkStarFade = (
  recipe: CraftingFireworkStarFadeRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertFireworkStarFadeRecipe(recipe);
  const match = craftingFireworkStarFadeMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    targetSlotIndex: match.targetSlotIndex,
    dyeSlotIndexes: match.dyeSlotIndexes,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.targetSlotIndex, recipe.target.count],
        ...match.dyeSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.dye.count] as const,
        ),
      ]),
    ),
  };
};

const applyFireworkStar = (
  recipe: CraftingFireworkStarRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertFireworkStarRecipe(recipe);
  const match = craftingFireworkStarMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  const shapeIngredient = recipe.shapes[match.shape];
  const shapeCounts =
    shapeIngredient === undefined
      ? []
      : match.shapeSlotIndexes.map(
          (slotIndex) => [slotIndex, shapeIngredient.count] as const,
        );
  return {
    _tag: "Applied",
    recipe,
    fuelSlotIndex: match.fuelSlotIndex,
    dyeSlotIndexes: match.dyeSlotIndexes,
    trailSlotIndexes: match.trailSlotIndexes,
    twinkleSlotIndexes: match.twinkleSlotIndexes,
    shapeSlotIndexes: match.shapeSlotIndexes,
    shape: match.shape,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.fuelSlotIndex, recipe.fuel.count],
        ...match.dyeSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.dye.count] as const,
        ),
        ...match.trailSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.trail.count] as const,
        ),
        ...match.twinkleSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.twinkle.count] as const,
        ),
        ...shapeCounts,
      ]),
    ),
  };
};

const applyMapExtending = (
  recipe: CraftingMapExtendingRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertMapExtendingRecipe(recipe);
  const match = craftingMapExtendingMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    mapSlotIndex: match.mapSlotIndex,
    materialSlotIndexes: match.materialSlotIndexes,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.mapSlotIndex, recipe.map.count],
        ...match.materialSlotIndexes.map(
          (slotIndex) => [slotIndex, recipe.material.count] as const,
        ),
      ]),
    ),
  };
};

const applyShieldDecoration = (
  recipe: CraftingShieldDecorationRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): CraftingSpecialApplyResult => {
  assertShieldDecorationRecipe(recipe);
  const match = craftingShieldDecorationMatch(recipe, grid, context);
  if (match._tag === "NoMatch") return match;
  return {
    _tag: "Applied",
    recipe,
    bannerSlotIndex: match.bannerSlotIndex,
    targetSlotIndex: match.targetSlotIndex,
    output: match.output,
    remainingGrid: consume(
      grid,
      new Map([
        [match.bannerSlotIndex, recipe.banner.count],
        [match.targetSlotIndex, recipe.target.count],
      ]),
    ),
  };
};

export function applyCraftingSpecial(
  recipe: CraftingSpecialRecipe,
  grid: CraftGrid,
  context?: RecipeMatchContext,
): CraftingSpecialApplyResult;
export function applyCraftingSpecial(
  recipe: CraftingSpecialRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = {},
): CraftingSpecialApplyResult {
  if (!isCraftingSpecialRecipe(recipe)) {
    throw new TypeError("Crafting special recipe has an invalid shape");
  }
  assertGrid(grid);
  assertContext(context);
  if (recipe._tag === "CraftingDye") {
    return applyCraftingDye(recipe, grid, context);
  }
  if (recipe._tag === "CraftingImbue") {
    return applyCraftingImbue(recipe, grid, context);
  }
  if (recipe._tag === "CraftingBannerDuplicate") {
    return applyBannerDuplicate(recipe, grid, context);
  }
  if (recipe._tag === "CraftingBookCloning") {
    return applyBookCloning(recipe, grid, context);
  }
  if (recipe._tag === "CraftingDecoratedPot") {
    return applyDecoratedPot(recipe, grid, context);
  }
  if (recipe._tag === "CraftingFireworkRocket") {
    return applyFireworkRocket(recipe, grid, context);
  }
  if (recipe._tag === "CraftingFireworkStarFade") {
    return applyFireworkStarFade(recipe, grid, context);
  }
  if (recipe._tag === "CraftingFireworkStar") {
    return applyFireworkStar(recipe, grid, context);
  }
  if (recipe._tag === "CraftingMapExtending") {
    return applyMapExtending(recipe, grid, context);
  }
  return applyShieldDecoration(recipe, grid, context);
}

export { DYE_COLORS };

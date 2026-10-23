import { Result } from "effect";
import type { ItemStackFailure } from "../item/item-stack.js";

export type RecipeFailure =
  | Readonly<{
      readonly _tag: "RecipeTypeFailure";
      readonly name: "TypeError";
      readonly message: string;
    }>
  | Readonly<{
      readonly _tag: "RecipeRangeFailure";
      readonly name: "RangeError";
      readonly message: string;
    }>
  | Readonly<{
      readonly _tag: "RecipeExternalFailure";
      readonly name: string;
      readonly message: string;
      readonly componentKey?: string;
    }>
  | Readonly<{
      readonly _tag: "RecipeItemFailure";
      readonly failure: ItemStackFailure;
    }>;

export const recipeTypeFailure = (message: string) =>
  Result.fail<RecipeFailure>({
    _tag: "RecipeTypeFailure",
    name: "TypeError",
    message,
  });

export const recipeRangeFailure = (message: string) =>
  Result.fail<RecipeFailure>({
    _tag: "RecipeRangeFailure",
    name: "RangeError",
    message,
  });

export const recipeExternalFailure = (
  name: string,
  message: string,
  componentKey?: string,
) =>
  Result.fail<RecipeFailure>({
    _tag: "RecipeExternalFailure",
    name,
    message,
    ...(componentKey === undefined ? {} : { componentKey }),
  });

export const recipeItemFailure = (failure: ItemStackFailure): RecipeFailure => ({
  _tag: "RecipeItemFailure",
  failure,
});

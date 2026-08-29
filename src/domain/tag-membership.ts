import {
  dataPackLayer,
  type DataPackFormat,
  type DataPackLayer,
  type DataPackLayerOptions,
} from "./data-pack-registry.js";
import type { ItemType } from "./item-type.js";
import type { ItemTagMemberships, RecipeItemTag } from "./recipe-data.js";
import { VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES } from "./tag-membership-data.js";

export type { ItemTagMemberships, RecipeItemTag } from "./recipe-data.js";
export type { DataPackFormat, DataPackLayer } from "./data-pack-registry.js";

/** The kernel's vanilla tag table; the default `ingredientMatches` resolves to when a caller omits `itemTags`. */
export const VANILLA_ITEM_TAG_MEMBERSHIPS: ItemTagMemberships = new Map<
  RecipeItemTag,
  ReadonlySet<ItemType>
>(
  VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES.map(
    (entry): readonly [RecipeItemTag, ReadonlySet<ItemType>] => [
      `#${entry.tag}`,
      new Set<ItemType>(entry.members),
    ],
  ),
);

export type ItemTagMembershipLayer = DataPackLayer<ReadonlySet<ItemType>>;
export type ItemTagMembershipLayerOptions =
  DataPackLayerOptions<ReadonlySet<ItemType>>;

/** Builds a data-pack layer of tag membership additions, reusing data-pack-registry's format/priority stacking. */
export const itemTagMembershipLayer = (
  options: ItemTagMembershipLayerOptions,
): ItemTagMembershipLayer => dataPackLayer(options);

/**
 * Extends a base tag table with data-pack layers.
 *
 * Vanilla tag files union their entries across every applicable pack rather
 * than replacing the base set, so unlike `selectDataPackRegistry`'s
 * last-priority-wins merge, a layer's members are added to a tag's existing
 * membership instead of discarding what the layers below it contributed.
 */
export const extendItemTagMemberships = (
  base: ItemTagMemberships,
  layers: ReadonlyArray<ItemTagMembershipLayer>,
  format: DataPackFormat,
): ItemTagMemberships => {
  const merged = new Map<RecipeItemTag, Set<ItemType>>();
  for (const [tag, members] of base) {
    merged.set(tag, new Set<ItemType>(members));
  }

  const orderedLayers = layers
    .filter((layer) => layer.format === format)
    .sort((left, right) => left.priority - right.priority);
  for (const layer of orderedLayers) {
    for (const entry of layer.entries) {
      const tag: RecipeItemTag = `#${entry.id}`;
      const existing = merged.get(tag);
      if (existing === undefined) {
        merged.set(tag, new Set<ItemType>(entry.value));
        continue;
      }
      for (const member of entry.value) {
        existing.add(member);
      }
    }
  }
  return merged;
};

export const itemTagMembers = (
  memberships: ItemTagMemberships,
  tag: RecipeItemTag,
): ReadonlySet<ItemType> => memberships.get(tag) ?? new Set<ItemType>();

export const isTaggedItem = (
  memberships: ItemTagMemberships,
  tag: RecipeItemTag,
  item: ItemType,
): boolean => memberships.get(tag)?.has(item) ?? false;

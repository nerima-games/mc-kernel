/**
 * Vanilla item-tag membership, restricted to the item vocabulary the kernel
 * ships in item-type-data.ts.
 *
 * Each `tag` is a bare resource location (no leading "#"), matching the id a
 * data-pack tag file is addressed by; tag-membership.ts is what turns it
 * into the "#"-prefixed RecipeItemTag ingredient matching uses.
 *
 * Coverage restricted to the tags the kernel's shipped recipes actually
 * reference: the smithing trim recipe in smithing-data.ts is the only vanilla
 * recipe in the closed item vocabulary that uses tag ingredients, and it
 * references exactly these three tags.
 */
import type { ItemType } from "../item/item-type.js";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import { VANILLA_26_3_TAG_IDS } from './vanilla-26-3-generated.js'

export type VanillaItemTagMembershipEntry = {
  readonly tag: NamespacedResourceLocation;
  readonly members: ReadonlyArray<ItemType>;
};

const REPRESENTED_TAGS: ReadonlySet<NamespacedResourceLocation> = new Set([
  NamespacedResourceLocation('minecraft:trim_templates'),
  NamespacedResourceLocation('minecraft:trimmable_armor'),
  NamespacedResourceLocation('minecraft:trim_materials'),
])

export const VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES: ReadonlyArray<VanillaItemTagMembershipEntry> =
  [
    {
      tag: NamespacedResourceLocation("minecraft:trimmable_armor"),
      members: [
        "iron_helmet",
        "iron_chestplate",
        "iron_leggings",
        "iron_boots",
        "diamond_helmet",
        "diamond_chestplate",
        "diamond_leggings",
        "diamond_boots",
        "netherite_helmet",
        "netherite_chestplate",
        "netherite_leggings",
        "netherite_boots",
      ],
    },
    {
      tag: NamespacedResourceLocation("minecraft:trim_materials"),
      members: [
        "iron_ingot",
        "gold_ingot",
        "lapis_lazuli",
        "emerald",
        "diamond",
        "redstone_dust",
        "amethyst_shard",
        "netherite_ingot",
      ],
    },
  ...VANILLA_26_3_TAG_IDS
    .map((tag): VanillaItemTagMembershipEntry => ({ tag: NamespacedResourceLocation(`minecraft:${tag}`), members: [] }))
    .filter((entry) => !REPRESENTED_TAGS.has(entry.tag)),
  ];

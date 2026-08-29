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
import type { ItemType } from "./item-type.js";

export type VanillaItemTagMembershipEntry = {
  readonly tag: string;
  readonly members: ReadonlyArray<ItemType>;
};

export const VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES: ReadonlyArray<VanillaItemTagMembershipEntry> =
  [
    {
      tag: "minecraft:trim_templates",
      members: ["netherite_upgrade_smithing_template"],
    },
    {
      tag: "minecraft:trimmable_armor",
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
      tag: "minecraft:trim_materials",
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
  ];

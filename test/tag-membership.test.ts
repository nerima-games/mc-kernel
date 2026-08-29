import { describe, expect, it } from "vitest";

import { ingredientMatches, tagged } from "../src/domain/recipe-data";
import { DataPackFormat } from "../src/domain/data-pack-registry";
import {
  extendItemTagMemberships,
  isTaggedItem,
  itemTagMembers,
  itemTagMembershipLayer,
  VANILLA_ITEM_TAG_MEMBERSHIPS,
} from "../src/domain/tag-membership";

describe("vanilla item-tag memberships", () => {
  it("covers the tags the kernel's shipped smithing trim recipe references", () => {
    expect(
      itemTagMembers(VANILLA_ITEM_TAG_MEMBERSHIPS, "#minecraft:trim_templates"),
    ).toEqual(new Set(["netherite_upgrade_smithing_template"]));
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        "#minecraft:trimmable_armor",
        "diamond_helmet",
      ),
    ).toBe(true);
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        "#minecraft:trim_materials",
        "gold_ingot",
      ),
    ).toBe(true);
  });

  it("matches a tag ingredient against the kernel's own item vocabulary without a caller-supplied table", () => {
    expect(
      ingredientMatches(
        tagged("#minecraft:trim_templates"),
        "netherite_upgrade_smithing_template",
      ),
    ).toBe(true);
    expect(
      ingredientMatches(tagged("#minecraft:trim_materials"), "gold_ingot"),
    ).toBe(true);
    expect(
      ingredientMatches(tagged("#minecraft:trim_materials"), "oak_planks"),
    ).toBe(false);
  });
});

describe("itemTagMembers", () => {
  it("returns the empty set for a tag the table does not know", () => {
    expect(
      itemTagMembers(VANILLA_ITEM_TAG_MEMBERSHIPS, "#minecraft:unknown_tag"),
    ).toEqual(new Set());
  });
});

describe("isTaggedItem", () => {
  it("distinguishes an unknown tag from a known tag missing the item", () => {
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        "#minecraft:unknown_tag",
        "gold_ingot",
      ),
    ).toBe(false);
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        "#minecraft:trim_materials",
        "oak_planks",
      ),
    ).toBe(false);
  });
});

describe("extendItemTagMemberships", () => {
  it("unions a data-pack layer's members into an existing base tag", () => {
    const layer = itemTagMembershipLayer({
      pack: "example:datapack",
      format: 41,
      priority: 0,
      entries: [
        { id: "minecraft:trim_materials", value: new Set(["netherite_scrap"]) },
      ],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [layer],
      DataPackFormat(41),
    );

    expect(itemTagMembers(extended, "#minecraft:trim_materials")).toEqual(
      new Set(["iron_ingot", "gold_ingot", "lapis_lazuli", "emerald", "diamond", "redstone_dust", "amethyst_shard", "netherite_ingot", "netherite_scrap"]),
    );
    expect(itemTagMembers(VANILLA_ITEM_TAG_MEMBERSHIPS, "#minecraft:trim_materials")).not.toContain(
      "netherite_scrap",
    );
  });

  it("adds a tag the base table does not have", () => {
    const layer = itemTagMembershipLayer({
      pack: "example:datapack",
      format: 41,
      priority: 0,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["wool"]) }],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [layer],
      DataPackFormat(41),
    );

    expect(itemTagMembers(extended, "#minecraft:custom_tag")).toEqual(
      new Set(["wool"]),
    );
  });

  it("ignores layers whose format does not match the requested format", () => {
    const matching = itemTagMembershipLayer({
      pack: "example:matching",
      format: 41,
      priority: 0,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["wool"]) }],
    });
    const nonMatching = itemTagMembershipLayer({
      pack: "example:stale",
      format: 6,
      priority: 1,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["string"]) }],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [nonMatching, matching],
      DataPackFormat(41),
    );

    expect(itemTagMembers(extended, "#minecraft:custom_tag")).toEqual(
      new Set(["wool"]),
    );
  });

  it("orders several matching-format layers by priority before merging", () => {
    const lowerPriority = itemTagMembershipLayer({
      pack: "example:lower",
      format: 41,
      priority: 0,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["wool"]) }],
    });
    const higherPriority = itemTagMembershipLayer({
      pack: "example:higher",
      format: 41,
      priority: 1,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["string"]) }],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [higherPriority, lowerPriority],
      DataPackFormat(41),
    );

    expect(itemTagMembers(extended, "#minecraft:custom_tag")).toEqual(
      new Set(["wool", "string"]),
    );
  });

  it("leaves the base table untouched when no layers are supplied", () => {
    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [],
      DataPackFormat(41),
    );

    expect(extended).toEqual(VANILLA_ITEM_TAG_MEMBERSHIPS);
    expect(extended).not.toBe(VANILLA_ITEM_TAG_MEMBERSHIPS);
  });
});

import { describe, expect, it } from "vitest";
import { resultValue } from "./block-result-helpers.js";

import { ingredientMatches, tagged } from "../src/domain/recipe/recipe-data";
import { DataPackFormat, DataPackPriority } from "../src/domain/world/data-pack-registry";
import { NamespacedResourceLocation, TagLocation } from "../src/domain/text/identifiers";
import type { ItemType } from "../src/domain/item/item-type";
import {
  extendItemTagMemberships,
  isTaggedItem,
  itemTagMembers,
  itemTagMembershipLayer,
  VANILLA_ITEM_TAG_MEMBERSHIPS,
} from "../src/domain/world/tag-membership";

const tagLayerFromRaw = (options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: ReadonlySet<ItemType> }>>;
}) => resultValue(itemTagMembershipLayer({
  pack: NamespacedResourceLocation(options.pack),
  format: resultValue(DataPackFormat(options.format)),
  priority: resultValue(DataPackPriority(options.priority)),
  entries: options.entries.map(({ id, value }) => ({ id: NamespacedResourceLocation(id), value })),
}));

describe("vanilla item-tag memberships", () => {
  it("covers the tags the kernel's shipped smithing trim recipe references", () => {
    expect(
      itemTagMembers(VANILLA_ITEM_TAG_MEMBERSHIPS, TagLocation("#minecraft:trim_templates")),
    ).toEqual(new Set(["netherite_upgrade_smithing_template"]));
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        TagLocation("#minecraft:trimmable_armor"),
        "diamond_helmet",
      ),
    ).toBe(true);
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        TagLocation("#minecraft:trim_materials"),
        "gold_ingot",
      ),
    ).toBe(true);
  });

  it("matches a tag ingredient against the kernel's own item vocabulary without a caller-supplied table", () => {
    expect(
      resultValue(ingredientMatches(
        resultValue(tagged(TagLocation("#minecraft:trim_templates"))),
        "netherite_upgrade_smithing_template",
      )),
    ).toBe(true);
    expect(
      resultValue(ingredientMatches(
        resultValue(tagged(TagLocation("#minecraft:trim_materials"))),
        "gold_ingot",
      )),
    ).toBe(true);
    expect(
      resultValue(ingredientMatches(
        resultValue(tagged(TagLocation("#minecraft:trim_materials"))),
        "oak_planks",
      )),
    ).toBe(false);
  });
});

describe("itemTagMembers", () => {
  it("returns the empty set for a tag the table does not know", () => {
    expect(
      itemTagMembers(VANILLA_ITEM_TAG_MEMBERSHIPS, TagLocation("#minecraft:unknown_tag")),
    ).toEqual(new Set());
  });
});

describe("isTaggedItem", () => {
  it("distinguishes an unknown tag from a known tag missing the item", () => {
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        TagLocation("#minecraft:unknown_tag"),
        "gold_ingot",
      ),
    ).toBe(false);
    expect(
      isTaggedItem(
        VANILLA_ITEM_TAG_MEMBERSHIPS,
        TagLocation("#minecraft:trim_materials"),
        "oak_planks",
      ),
    ).toBe(false);
  });
});

describe("extendItemTagMemberships", () => {
  it("unions a data-pack layer's members into an existing base tag", () => {
    const layer = tagLayerFromRaw({
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
      resultValue(DataPackFormat(41)),
    );

    expect(itemTagMembers(extended, TagLocation("#minecraft:trim_materials"))).toEqual(
      new Set(["iron_ingot", "gold_ingot", "lapis_lazuli", "emerald", "diamond", "redstone_dust", "amethyst_shard", "netherite_ingot", "netherite_scrap"]),
    );
    expect(itemTagMembers(VANILLA_ITEM_TAG_MEMBERSHIPS, TagLocation("#minecraft:trim_materials"))).not.toContain(
      "netherite_scrap",
    );
  });

  it("adds a tag the base table does not have", () => {
    const layer = tagLayerFromRaw({
      pack: "example:datapack",
      format: 41,
      priority: 0,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["wool"]) }],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [layer],
      resultValue(DataPackFormat(41)),
    );

    expect(itemTagMembers(extended, TagLocation("#minecraft:custom_tag"))).toEqual(
      new Set(["wool"]),
    );
  });

  it("ignores layers whose format does not match the requested format", () => {
    const matching = tagLayerFromRaw({
      pack: "example:matching",
      format: 41,
      priority: 0,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["wool"]) }],
    });
    const nonMatching = tagLayerFromRaw({
      pack: "example:stale",
      format: 6,
      priority: 1,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["string"]) }],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [nonMatching, matching],
      resultValue(DataPackFormat(41)),
    );

    expect(itemTagMembers(extended, TagLocation("#minecraft:custom_tag"))).toEqual(
      new Set(["wool"]),
    );
  });

  it("orders several matching-format layers by priority before merging", () => {
    const lowerPriority = tagLayerFromRaw({
      pack: "example:lower",
      format: 41,
      priority: 0,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["wool"]) }],
    });
    const higherPriority = tagLayerFromRaw({
      pack: "example:higher",
      format: 41,
      priority: 1,
      entries: [{ id: "minecraft:custom_tag", value: new Set(["string"]) }],
    });

    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [higherPriority, lowerPriority],
      resultValue(DataPackFormat(41)),
    );

    expect(itemTagMembers(extended, TagLocation("#minecraft:custom_tag"))).toEqual(
      new Set(["wool", "string"]),
    );
  });

  it("leaves the base table untouched when no layers are supplied", () => {
    const extended = extendItemTagMemberships(
      VANILLA_ITEM_TAG_MEMBERSHIPS,
      [],
      resultValue(DataPackFormat(41)),
    );

    expect(extended).toEqual(VANILLA_ITEM_TAG_MEMBERSHIPS);
    expect(extended).not.toBe(VANILLA_ITEM_TAG_MEMBERSHIPS);
  });
});

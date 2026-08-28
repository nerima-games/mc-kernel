import { describe, expect, it } from "vitest";
import {
  CRAFTING_SPECIAL_STATION_TAG,
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
  isCraftingDyeRecipe,
  isCraftingImbueRecipe,
  isCraftingSpecialRecipe,
} from "../src/domain/crafting-special-data";
import {
  DYE_COLORS,
  applyCraftingDye,
  applyCraftingImbue,
  applyCraftingSpecial,
  matchCraftingDyeRecipe,
  matchCraftingDyeRecipes,
  matchCraftingImbueRecipe,
  matchCraftingImbueRecipes,
  matchCraftingSpecialRecipe,
  matchCraftingSpecialRecipes,
  matchesCraftingDyeRecipe,
  matchesCraftingImbueRecipe,
  mixCraftingDyeColor,
} from "../src/domain/crafting-special";
import { itemComponents } from "../src/domain/item-components";
import { potionContentsComponent } from "../src/domain/item-component-values";
import {
  ItemComponentPatchKey,
  itemComponentPatch,
} from "../src/domain/item-component-patch";
import { itemStack, itemStackFromUnknown } from "../src/domain/item-stack";
import { ResourceLocation } from "../src/domain/identifiers";
import {
  craftGrid,
  anyOf,
  exactly,
  tagged,
  type ItemTagMemberships,
} from "../src/domain/recipe-data";
import type {
  DyeColor,
  DyedColorComponent,
} from "../src/domain/item-component-values-data";
import type { ItemType } from "../src/domain/item-type";
import type { JsonValue } from "../src/domain/json-value";

const DYE_ITEM: ItemType = "redstone_dust";

const patchFor = (component: string, value: JsonValue) =>
  itemComponentPatch({ [ItemComponentPatchKey(component)]: value });

const targetStack = (
  color?: DyedColorComponent,
  count: number = 1,
): ReturnType<typeof itemStack> =>
  itemStack(
    "leather",
    count,
    color === undefined
      ? {}
      : { componentPatch: patchFor("minecraft:dyed_color", color) },
  );

const dyeStack = (
  item: ItemType,
  color: DyeColor,
  count: number = 1,
): ReturnType<typeof itemStack> =>
  itemStack(item, count, { componentPatch: patchFor("minecraft:dye", color) });

const imbueGrid = (
  source: ReturnType<typeof itemStack>,
  material: ReturnType<typeof itemStack>,
) =>
  craftGrid(3, 3, [
    material,
    material,
    material,
    material,
    source,
    material,
    material,
    material,
    material,
  ]);

const dyeRecipe = craftingDyeRecipe(
  ResourceLocation("minecraft:leather_dye"),
  exactly("leather"),
  exactly(DYE_ITEM),
  itemStack("leather", 1, {
    componentPatch: patchFor("minecraft:custom_model_data", 7),
  }),
  { priority: 1 },
);

const imbueRecipe = craftingImbueRecipe(
  ResourceLocation("minecraft:arrow_imbue"),
  exactly("arrow"),
  exactly("glass_bottle"),
  itemStack("arrow", 1, {
    componentPatch: patchFor("minecraft:custom_model_data", 4),
  }),
  { priority: 1 },
);

describe("crafting special recipes", () => {
  it("mixes dye colors and validates the color inputs", () => {
    expect(DYE_COLORS).toHaveLength(16);
    expect(DYE_COLORS).toContain("red");
    expect(mixCraftingDyeColor(0x123456, ["red"])).toBe(0x834254);
    expect(mixCraftingDyeColor(undefined, ["red"])).toBe(0xa84a33);
    expect(
      mixCraftingDyeColor([0.1, 0.2, 0.3], ["blue", "white"]),
    ).toBeGreaterThan(0);
    expect(() => mixCraftingDyeColor(0x123456, [])).toThrow(RangeError);
    expect(() =>
      Reflect.apply(mixCraftingDyeColor, undefined, [[2, 0, 0], ["red"]]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(mixCraftingDyeColor, undefined, [0x123456, ["invalid"]]),
    ).toThrow(TypeError);
  });

  it("matches, applies, consumes, and preserves patch-based dye stacks", () => {
    const grid = craftGrid(3, 3, [
      targetStack(0x123456, 2),
      dyeStack("redstone_dust", "red", 2),
    ]);

    expect(matchesCraftingDyeRecipe(dyeRecipe, grid)).toBe(true);
    const match = matchCraftingDyeRecipe(grid, {}, [dyeRecipe]);
    expect(match._tag).toBe("Match");
    if (match._tag === "Match") {
      expect(match.targetSlotIndex).toBe(0);
      expect(match.dyeSlotIndexes).toEqual([1]);
      expect(match.output).toMatchObject({
        item: "leather",
        count: 1,
        componentPatch: {
          "minecraft:custom_model_data": 7,
          "minecraft:dyed_color": 0x834254,
        },
      });
    }

    const applied = applyCraftingDye(dyeRecipe, grid);
    expect(applied._tag).toBe("Applied");
    if (applied._tag === "Applied") {
      expect(applied.remainingGrid.cells[0]).toMatchObject({
        item: "leather",
        count: 1,
      });
      expect(applied.remainingGrid.cells[1]).toMatchObject({
        item: "redstone_dust",
        count: 1,
      });
      expect(
        applied.output.componentPatch?.[
          ItemComponentPatchKey("minecraft:dyed_color")
        ],
      ).toBe(0x834254);
    }
    expect(grid.cells[0]).toMatchObject({ item: "leather", count: 2 });
    expect(grid.cells[1]).toMatchObject({ item: "redstone_dust", count: 2 });

    const defaultColor = matchCraftingDyeRecipe(
      craftGrid(3, 3, [targetStack(), dyeStack("redstone_dust", "red")]),
      {},
      [dyeRecipe],
    );
    expect(defaultColor._tag).toBe("Match");
    if (defaultColor._tag === "Match") {
      expect(
        defaultColor.output.componentPatch?.[
          ItemComponentPatchKey("minecraft:dyed_color")
        ],
      ).toBe(0xa84a33);
    }
  });

  it("reads resolved dye components, tags, stations, and recipe priority", () => {
    const resolvedTarget = itemStack("leather", 1, {
      components: itemComponents("leather", { dyedColor: 0x123456 }),
    });
    const resolvedDye = itemStack("redstone_dust", 1, {
      components: itemComponents("redstone_dust", { dye: "red" }),
    });
    const resolvedGrid = craftGrid(3, 3, [resolvedTarget, resolvedDye]);
    expect(matchesCraftingDyeRecipe(dyeRecipe, resolvedGrid)).toBe(true);

    const taggedRecipe = craftingDyeRecipe(
      ResourceLocation("minecraft:tagged_dye"),
      exactly("leather"),
      tagged("#minecraft:dyes"),
      itemStack("leather", 1),
      { tags: [CRAFTING_SPECIAL_STATION_TAG], priority: 0 },
    );
    const itemTags: ItemTagMemberships = new Map([
      ["#minecraft:dyes", new Set<ItemType>(["redstone_dust"])],
    ]);
    expect(
      matchesCraftingDyeRecipe(taggedRecipe, resolvedGrid, {
        itemTags,
        station: "crafting_table",
      }),
    ).toBe(true);
    expect(
      matchesCraftingDyeRecipe(taggedRecipe, resolvedGrid, {
        station: "furnace",
      }),
    ).toBe(false);

    const unrestrictedRecipe = craftingDyeRecipe(
      ResourceLocation("minecraft:unrestricted_dye"),
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
      { tags: [], priority: 0 },
    );
    expect(
      matchesCraftingDyeRecipe(unrestrictedRecipe, resolvedGrid, {
        station: "furnace",
      }),
    ).toBe(true);

    const lower = craftingDyeRecipe(
      ResourceLocation("minecraft:a"),
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
      { priority: 0 },
    );
    const higher = craftingDyeRecipe(
      ResourceLocation("minecraft:z"),
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
      { priority: 2 },
    );
    expect(
      matchCraftingDyeRecipes(resolvedGrid, {}, [higher, lower]),
    ).toHaveLength(2);
    expect(
      matchCraftingDyeRecipes(resolvedGrid, {}, [higher, lower])[0]?.recipe.id,
    ).toBe("minecraft:a");
  });

  it("rejects invalid dye grids and returns a no-match result", () => {
    expect(
      matchesCraftingDyeRecipe(
        dyeRecipe,
        craftGrid(2, 2, [targetStack(), dyeStack("redstone_dust", "red")]),
      ),
    ).toBe(false);
    expect(
      matchesCraftingDyeRecipe(dyeRecipe, craftGrid(3, 3, [targetStack()])),
    ).toBe(false);
    expect(
      matchesCraftingDyeRecipe(
        dyeRecipe,
        craftGrid(3, 3, [
          itemStack("stone", 1),
          dyeStack("redstone_dust", "red"),
        ]),
      ),
    ).toBe(false);
    expect(
      matchesCraftingDyeRecipe(
        dyeRecipe,
        craftGrid(3, 3, [targetStack(), itemStack("redstone_dust", 1)]),
      ),
    ).toBe(false);
    expect(
      matchesCraftingDyeRecipe(
        dyeRecipe,
        craftGrid(3, 3, [
          targetStack(),
          itemStackFromUnknown("redstone_dust", 1, {
            componentPatch: { "minecraft:dye": "invalid" },
          }),
        ]),
      ),
    ).toBe(false);
    expect(
      matchesCraftingDyeRecipe(
        dyeRecipe,
        craftGrid(3, 3, [
          itemStackFromUnknown("leather", 1, {
            componentPatch: { "minecraft:dyed_color": "invalid" },
          }),
          dyeStack("redstone_dust", "red"),
        ]),
      ),
    ).toBe(false);
    expect(
      applyCraftingDye(dyeRecipe, craftGrid(3, 3, [targetStack()]))._tag,
    ).toBe("NoMatch");
    expect(
      matchCraftingDyeRecipe(craftGrid(3, 3, [targetStack()]), {}, [dyeRecipe]),
    ).toEqual({ _tag: "NoMatch" });
  });

  it("matches and applies imbue recipes with resolved potion components", () => {
    const potion = potionContentsComponent({
      potion: "minecraft:water",
      customColor: 0x336699,
      customEffects: [
        {
          id: "minecraft:speed",
          amplifier: 1,
          duration: 200,
          ambient: true,
          showParticles: false,
          showIcon: false,
          hiddenEffect: { id: "minecraft:haste", duration: 40 },
        },
      ],
    });
    const source = itemStack("arrow", 2, {
      components: itemComponents("arrow", { potionContents: potion }),
    });
    const material = itemStack("glass_bottle", 2);
    const grid = imbueGrid(source, material);

    expect(matchesCraftingImbueRecipe(imbueRecipe, grid)).toBe(true);
    const match = matchCraftingImbueRecipe(grid, {}, [imbueRecipe]);
    expect(match._tag).toBe("Match");
    if (match._tag === "Match") {
      expect(match.sourceSlotIndex).toBe(4);
      expect(match.materialSlotIndexes).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
      expect(match.output).toMatchObject({
        item: "arrow",
        count: 1,
        componentPatch: {
          "minecraft:custom_model_data": 4,
          "minecraft:potion_contents": {
            potion: "minecraft:water",
            customColor: 0x336699,
            customEffects: [
              {
                id: "minecraft:speed",
                amplifier: 1,
                duration: 200,
                ambient: true,
                showParticles: false,
                showIcon: false,
                hiddenEffect: {
                  id: "minecraft:haste",
                  amplifier: 0,
                  duration: 40,
                  ambient: false,
                  showParticles: true,
                  showIcon: true,
                },
              },
            ],
          },
        },
      });
    }

    const applied = applyCraftingImbue(imbueRecipe, grid);
    expect(applied._tag).toBe("Applied");
    if (applied._tag === "Applied") {
      expect(applied.remainingGrid.cells[4]).toMatchObject({
        item: "arrow",
        count: 1,
      });
      expect(applied.remainingGrid.cells[0]).toMatchObject({
        item: "glass_bottle",
        count: 1,
      });
    }
    expect(grid.cells[4]).toMatchObject({ item: "arrow", count: 2 });

    const stringPotionSource = itemStack("arrow", 1, {
      componentPatch: patchFor("minecraft:potion_contents", "minecraft:water"),
    });
    const stringPotionMatch = matchCraftingImbueRecipe(
      imbueGrid(stringPotionSource, itemStack("glass_bottle", 1)),
      {},
      [imbueRecipe],
    );
    expect(stringPotionMatch._tag).toBe("Match");
    if (stringPotionMatch._tag === "Match") {
      expect(
        stringPotionMatch.output.componentPatch?.[
          ItemComponentPatchKey("minecraft:potion_contents")
        ],
      ).toBe("minecraft:water");
    }
  });

  it("rejects invalid imbue grids and supports special recipe dispatch", () => {
    const source = itemStack("arrow", 1, {
      componentPatch: patchFor("minecraft:potion_contents", "minecraft:water"),
    });
    const material = itemStack("glass_bottle", 1);
    const grid = imbueGrid(source, material);

    expect(
      matchesCraftingImbueRecipe(
        imbueRecipe,
        craftGrid(2, 2, [source, material]),
      ),
    ).toBe(false);
    expect(
      matchesCraftingImbueRecipe(
        imbueRecipe,
        craftGrid(3, 3, [source, ...Array(8).fill(material)]),
      ),
    ).toBe(false);
    expect(
      matchesCraftingImbueRecipe(
        imbueRecipe,
        imbueGrid(itemStack("arrow", 1), material),
      ),
    ).toBe(false);
    expect(
      matchesCraftingImbueRecipe(
        imbueRecipe,
        imbueGrid(source, itemStack("stone", 1)),
      ),
    ).toBe(false);
    expect(
      matchesCraftingImbueRecipe(
        imbueRecipe,
        imbueGrid(
          itemStackFromUnknown("arrow", 1, {
            componentPatch: { "minecraft:potion_contents": 1 },
          }),
          material,
        ),
      ),
    ).toBe(false);
    expect(
      matchesCraftingImbueRecipe(imbueRecipe, grid, { station: "furnace" }),
    ).toBe(false);
    expect(
      applyCraftingImbue(imbueRecipe, craftGrid(3, 3, [source]))._tag,
    ).toBe("NoMatch");
    expect(
      matchCraftingImbueRecipe(craftGrid(3, 3, [source]), {}, [imbueRecipe]),
    ).toEqual({ _tag: "NoMatch" });

    const dyeMatch = matchCraftingSpecialRecipe(
      craftGrid(3, 3, [targetStack(), dyeStack("redstone_dust", "red")]),
      {},
      [imbueRecipe, dyeRecipe],
    );
    expect(dyeMatch._tag).toBe("Match");
    const imbueMatch = matchCraftingSpecialRecipe(grid, {}, [
      dyeRecipe,
      imbueRecipe,
    ]);
    expect(imbueMatch._tag).toBe("Match");
    expect(
      matchCraftingSpecialRecipes(grid, {}, [dyeRecipe, imbueRecipe]),
    ).toHaveLength(1);
    expect(
      applyCraftingSpecial(
        dyeRecipe,
        craftGrid(3, 3, [targetStack(), dyeStack("redstone_dust", "red")]),
      )._tag,
    ).toBe("Applied");
    expect(applyCraftingSpecial(imbueRecipe, grid)._tag).toBe("Applied");
  });

  it("matches and applies Java special recipe inputs", () => {
    const bannerRecipe = craftingBannerDuplicateRecipe(
      ResourceLocation("minecraft:banner_duplicate"),
      exactly("white_banner"),
      itemStack("white_banner", 1),
    );
    const bannerGrid = craftGrid(3, 3, [
      itemStack("white_banner", 1),
      itemStack("white_banner", 1),
    ]);
    const bannerMatch = matchCraftingSpecialRecipe(bannerGrid, {}, [
      bannerRecipe,
    ]);
    expect(bannerMatch).toMatchObject({
      _tag: "Match",
      bannerSlotIndex: 0,
      duplicateSlotIndex: 1,
      output: { item: "white_banner", count: 1 },
    });
    const bannerApplied = applyCraftingSpecial(bannerRecipe, bannerGrid);
    expect(bannerApplied).toMatchObject({
      _tag: "Applied",
      bannerSlotIndex: 0,
      duplicateSlotIndex: 1,
    });
    if (bannerApplied._tag === "Applied") {
      expect(bannerApplied.remainingGrid.cells[0]).toMatchObject({
        item: "white_banner",
        count: 1,
      });
      expect(bannerApplied.remainingGrid.cells[1]).toBeUndefined();
    }

    const writtenBook = itemStack("written_book", 2, {
      components: itemComponents("written_book", {
        // A written book's pages and title are JSON text components, not bare
        // strings; only a writable book takes plain text.
        writtenBookContent: {
          pages: ['"page"'],
          title: '"title"',
          author: "author",
          generation: 0,
          resolved: true,
        },
      }),
    });
    const bookRecipe = craftingBookCloningRecipe(
      ResourceLocation("minecraft:book_cloning"),
      exactly("written_book"),
      exactly("paper"),
      itemStack("written_book", 1),
      [0, 1],
    );
    const bookGrid = craftGrid(3, 3, [
      itemStack("paper", 2),
      itemStack("paper", 2),
      undefined,
      undefined,
      writtenBook,
    ]);
    const bookMatch = matchCraftingSpecialRecipe(bookGrid, {}, [bookRecipe]);
    expect(bookMatch).toMatchObject({
      _tag: "Match",
      sourceSlotIndex: 4,
      materialSlotIndexes: [0, 1],
      output: { item: "written_book", count: 2 },
    });
    const bookApplied = applyCraftingSpecial(bookRecipe, bookGrid);
    expect(bookApplied).toMatchObject({
      _tag: "Applied",
      sourceSlotIndex: 4,
      materialSlotIndexes: [0, 1],
    });
    if (bookApplied._tag === "Applied") {
      expect(bookApplied.output.componentPatch).toMatchObject({
        "minecraft:written_book_content": {
          pages: ['"page"'],
          title: '"title"',
          author: "author",
          generation: 1,
          resolved: true,
        },
      });
      expect(bookApplied.remainingGrid.cells[4]).toMatchObject({
        item: "written_book",
        count: 1,
      });
      expect(bookApplied.remainingGrid.cells[0]).toMatchObject({
        item: "paper",
        count: 1,
      });
    }

    const potRecipe = craftingDecoratedPotRecipe(
      ResourceLocation("minecraft:decorated_pot"),
      exactly("brick"),
      exactly("feather"),
      exactly("brick"),
      exactly("gold_nugget"),
      itemStack("decorated_pot", 1),
    );
    const potGrid = craftGrid(3, 3, [
      undefined,
      itemStack("brick", 1),
      undefined,
      itemStack("feather", 1),
      undefined,
      itemStack("brick", 1),
      undefined,
      itemStack("gold_nugget", 1),
      undefined,
    ]);
    const potApplied = applyCraftingSpecial(potRecipe, potGrid);
    expect(potApplied).toMatchObject({
      _tag: "Applied",
      backSlotIndex: 1,
      leftSlotIndex: 3,
      rightSlotIndex: 5,
      frontSlotIndex: 7,
      output: {
        item: "decorated_pot",
        componentPatch: {
          "minecraft:pot_decorations": [
            "minecraft:brick",
            "minecraft:feather",
            "minecraft:brick",
            "minecraft:gold_nugget",
          ],
        },
      },
    });

    const fireworkStar = itemStack("firework_star", 1, {
      components: itemComponents("firework_star", {
        fireworkExplosion: {
          shape: "star",
          colors: [0xff0000],
          hasTrail: true,
        },
      }),
    });
    const rocketRecipe = craftingFireworkRocketRecipe(
      ResourceLocation("minecraft:firework_rocket"),
      exactly("paper"),
      exactly("gunpowder"),
      exactly("firework_star"),
      itemStack("firework_rocket", 1),
    );
    const rocketGrid = craftGrid(3, 3, [
      itemStack("paper", 1),
      itemStack("gunpowder", 1),
      itemStack("gunpowder", 1),
      undefined,
      fireworkStar,
    ]);
    const rocketApplied = applyCraftingSpecial(rocketRecipe, rocketGrid);
    expect(rocketApplied).toMatchObject({
      _tag: "Applied",
      shellSlotIndex: 0,
      fuelSlotIndexes: [1, 2],
      starSlotIndex: 4,
      output: {
        item: "firework_rocket",
        componentPatch: {
          "minecraft:fireworks": {
            explosions: [
              {
                shape: "star",
                colors: [0xff0000],
                fadeColors: [],
                hasTrail: true,
                hasTwinkle: false,
              },
            ],
            flightDuration: 2,
          },
        },
      },
    });

    const fadeRecipe = craftingFireworkStarFadeRecipe(
      ResourceLocation("minecraft:firework_star_fade"),
      exactly("firework_star"),
      exactly("red_dye"),
      itemStack("firework_star", 1),
    );
    const fadeGrid = craftGrid(3, 3, [
      fireworkStar,
      dyeStack("red_dye", "red"),
      dyeStack("red_dye", "red"),
    ]);
    const fadeApplied = applyCraftingSpecial(fadeRecipe, fadeGrid);
    expect(fadeApplied).toMatchObject({
      _tag: "Applied",
      targetSlotIndex: 0,
      dyeSlotIndexes: [1, 2],
      output: {
        item: "firework_star",
        componentPatch: {
          "minecraft:firework_explosion": {
            shape: "star",
            colors: [0xff0000],
            fadeColors: [0xb02e26, 0xb02e26],
            hasTrail: true,
            hasTwinkle: false,
          },
        },
      },
    });

    const starRecipe = craftingFireworkStarRecipe(
      ResourceLocation("minecraft:firework_star"),
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      anyOf([exactly("red_dye"), exactly("blue_dye")]),
      { star: exactly("fire_charge") },
      itemStack("firework_star", 1),
    );
    const starGrid = craftGrid(3, 3, [
      itemStack("gunpowder", 1),
      dyeStack("red_dye", "red"),
      itemStack("diamond", 1),
      itemStack("glowstone_dust", 1),
      itemStack("fire_charge", 1),
      dyeStack("blue_dye", "blue"),
    ]);
    const starApplied = applyCraftingSpecial(starRecipe, starGrid);
    expect(starApplied).toMatchObject({
      _tag: "Applied",
      fuelSlotIndex: 0,
      dyeSlotIndexes: [1, 5],
      trailSlotIndexes: [2],
      twinkleSlotIndexes: [3],
      shapeSlotIndexes: [4],
      shape: "star",
      output: {
        item: "firework_star",
        componentPatch: {
          "minecraft:firework_explosion": {
            shape: "star",
            colors: [0xb02e26, 0x3c44aa],
            fadeColors: [],
            hasTrail: true,
            hasTwinkle: true,
          },
        },
      },
    });

    const defaultStarRecipe = craftingFireworkStarRecipe(
      ResourceLocation("minecraft:firework_star_default"),
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      exactly("red_dye"),
      {},
      itemStack("firework_star", 1),
    );
    const defaultStarGrid = craftGrid(3, 3, [
      itemStack("gunpowder", 1),
      dyeStack("red_dye", "red"),
    ]);
    expect(
      matchCraftingSpecialRecipe(defaultStarGrid, {}, [defaultStarRecipe]),
    ).toMatchObject({
      _tag: "Match",
      shape: "small_ball",
      shapeSlotIndexes: [],
    });
    expect(
      applyCraftingSpecial(defaultStarRecipe, defaultStarGrid),
    ).toMatchObject({
      _tag: "Applied",
      shape: "small_ball",
    });

    const mapRecipe = craftingMapExtendingRecipe(
      ResourceLocation("minecraft:map_extending"),
      exactly("filled_map"),
      exactly("paper"),
      itemStack("filled_map", 1),
    );
    const mapGrid = craftGrid(3, 3, [
      itemStack("filled_map", 1, {
        components: itemComponents("filled_map", { mapId: 12 }),
      }),
      itemStack("paper", 1),
      itemStack("paper", 1),
    ]);
    const mapApplied = applyCraftingSpecial(mapRecipe, mapGrid);
    expect(mapApplied).toMatchObject({
      _tag: "Applied",
      mapSlotIndex: 0,
      materialSlotIndexes: [1, 2],
      output: {
        item: "filled_map",
        componentPatch: { "minecraft:map_post_processing": "scale" },
      },
    });

    const banner = itemStack("white_banner", 1, {
      components: itemComponents("white_banner", {
        bannerPatterns: [{ pattern: "minecraft:stripe", color: "red" }],
        baseColor: "white",
      }),
    });
    const shieldRecipe = craftingShieldDecorationRecipe(
      ResourceLocation("minecraft:shield_decoration"),
      exactly("white_banner"),
      exactly("shield"),
      itemStack("shield", 1),
    );
    const shieldGrid = craftGrid(3, 3, [
      banner,
      itemStack("shield", 1, {
        components: itemComponents("shield", { bannerPatterns: [] }),
      }),
    ]);
    const shieldApplied = applyCraftingSpecial(shieldRecipe, shieldGrid);
    expect(shieldApplied).toMatchObject({
      _tag: "Applied",
      bannerSlotIndex: 0,
      targetSlotIndex: 1,
      output: {
        item: "shield",
        componentPatch: {
          "minecraft:banner_patterns": [
            { pattern: "minecraft:stripe", color: "red" },
          ],
          "minecraft:base_color": "white",
        },
      },
    });
  });

  it("validates special recipe constructors and runtime boundaries", () => {
    expect(CRAFTING_SPECIAL_STATION_TAG).toBe("crafting_table");
    expect(isCraftingDyeRecipe(dyeRecipe)).toBe(true);
    expect(isCraftingImbueRecipe(imbueRecipe)).toBe(true);
    expect(isCraftingSpecialRecipe(dyeRecipe)).toBe(true);
    expect(isCraftingSpecialRecipe(imbueRecipe)).toBe(true);
    expect(isCraftingSpecialRecipe({})).toBe(false);
    expect(isCraftingDyeRecipe(null)).toBe(false);
    expect(isCraftingImbueRecipe(null)).toBe(false);

    const invalidDyeValues: ReadonlyArray<unknown> = [
      { ...dyeRecipe, _tag: "Invalid" },
      { ...dyeRecipe, id: "" },
      { ...dyeRecipe, target: null },
      { ...dyeRecipe, dye: null },
      { ...dyeRecipe, output: null },
      { ...dyeRecipe, category: "invalid" },
      { ...dyeRecipe, group: 1 },
      { ...dyeRecipe, priority: -1 },
      { ...dyeRecipe, showNotification: 1 },
      { ...dyeRecipe, tags: null },
      { ...dyeRecipe, tags: [""] },
    ];
    for (const value of invalidDyeValues) {
      expect(isCraftingDyeRecipe(value)).toBe(false);
      expect(isCraftingSpecialRecipe(value)).toBe(false);
    }

    const invalidImbueValues: ReadonlyArray<unknown> = [
      { ...imbueRecipe, _tag: "Invalid" },
      { ...imbueRecipe, id: "" },
      { ...imbueRecipe, source: null },
      { ...imbueRecipe, material: null },
      { ...imbueRecipe, output: null },
      { ...imbueRecipe, category: "invalid" },
      { ...imbueRecipe, group: 1 },
      { ...imbueRecipe, priority: -1 },
      { ...imbueRecipe, showNotification: 1 },
      { ...imbueRecipe, tags: null },
      { ...imbueRecipe, tags: [""] },
    ];
    for (const value of invalidImbueValues) {
      expect(isCraftingImbueRecipe(value)).toBe(false);
      expect(isCraftingSpecialRecipe(value)).toBe(false);
    }

    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        "",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        "minecraft:bad",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", 1),
        null,
      ]),
    ).toThrow(TypeError);
    for (const options of [
      { category: "invalid" },
      { group: 1 },
      { priority: -1 },
      { showNotification: 1 },
      { tags: null },
      { tags: [""] },
    ]) {
      expect(() =>
        Reflect.apply(craftingDyeRecipe, undefined, [
          "minecraft:bad",
          exactly("leather"),
          exactly("redstone_dust"),
          itemStack("leather", 1),
          options,
        ]),
      ).toThrow();
    }
    expect(() =>
      Reflect.apply(craftingImbueRecipe, undefined, [
        "minecraft:bad",
        exactly("arrow"),
        exactly("glass_bottle"),
        itemStack("arrow", 1),
        { tags: "crafting_table" },
      ]),
    ).toThrow(TypeError);

    expect(() =>
      Reflect.apply(matchesCraftingDyeRecipe, undefined, [
        null,
        craftGrid(3, 3, []),
        {},
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchesCraftingDyeRecipe, undefined, [
        dyeRecipe,
        { width: 3, height: 3, cells: [] },
        {},
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchesCraftingDyeRecipe, undefined, [
        dyeRecipe,
        craftGrid(3, 3, []),
        { station: "" },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingDyeRecipes, undefined, [
        craftGrid(3, 3, []),
        {},
        [null],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingDyeRecipes, undefined, [
        craftGrid(3, 3, []),
        { itemTags: new Map([["bad", new Set<ItemType>(["stone"])]]) },
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingImbueRecipes, undefined, [
        craftGrid(3, 3, []),
        {},
        [null],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingSpecialRecipes, undefined, [
        craftGrid(3, 3, []),
        {},
        null,
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(applyCraftingSpecial, undefined, [
        null,
        craftGrid(3, 3, []),
        {},
      ]),
    ).toThrow(TypeError);
  });

  it("normalizes recipe metadata from either argument shape", () => {
    // The id-first and options-first overloads have to agree on every
    // normalized field, which is the only way the second form is reachable.
    const fromId = craftingDyeRecipe(
      ResourceLocation("minecraft:described_dye"),
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
      {
        category: "misc",
        group: "dyeing",
        priority: 3,
        showNotification: false,
      },
    );
    const fromOptions = craftingDyeRecipe(
      {
        id: ResourceLocation("minecraft:described_dye"),
        category: "misc",
        group: "dyeing",
        priority: 3,
        showNotification: false,
      },
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
    );
    expect(fromOptions).toEqual(fromId);
    expect(fromId).toMatchObject({
      category: "misc",
      group: "dyeing",
      priority: 3,
      showNotification: false,
    });

    const imbueFromOptions = craftingImbueRecipe(
      {
        id: ResourceLocation("minecraft:described_imbue"),
        group: "imbuing",
      },
      exactly("arrow"),
      exactly("glass_bottle"),
      itemStack("arrow", 1),
    );
    expect(imbueFromOptions.group).toBe("imbuing");

    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        ResourceLocation("minecraft:bad"),
        exactly("leather"),
        exactly("redstone_dust"),
        {},
      ]),
    ).toThrow(TypeError);

    // Book generations default to [0, 1] when the caller says nothing.
    expect(
      craftingBookCloningRecipe(
        ResourceLocation("minecraft:default_generations"),
        exactly("written_book"),
        exactly("paper"),
        itemStack("written_book", 1),
      ).allowedGenerations,
    ).toEqual([0, 1]);
    for (const generations of [
      [0],
      [0.5, 1],
      [0, 1.5],
      [-1, 1],
      [3, 3],
      [0, 3],
      [2, 1],
    ]) {
      expect(() =>
        Reflect.apply(craftingBookCloningRecipe, undefined, [
          ResourceLocation("minecraft:bad_generations"),
          exactly("written_book"),
          exactly("paper"),
          itemStack("written_book", 1),
          generations,
        ]),
      ).toThrow(RangeError);
    }

    expect(() =>
      Reflect.apply(craftingFireworkStarRecipe, undefined, [
        ResourceLocation("minecraft:bad_shape"),
        exactly("diamond"),
        exactly("glowstone_dust"),
        exactly("gunpowder"),
        exactly("red_dye"),
        { spiral: exactly("fire_charge") },
        itemStack("firework_star", 1),
      ]),
    ).toThrow(TypeError);
  });

  it("rejects recipe records whose shape fields are the wrong kind", () => {
    const cloning = craftingBookCloningRecipe(
      ResourceLocation("minecraft:guarded_cloning"),
      exactly("written_book"),
      exactly("paper"),
      itemStack("written_book", 1),
      [0, 1],
    );
    expect(isCraftingSpecialRecipe(cloning)).toBe(true);
    for (const allowedGenerations of ["0,1", [0], [0, 1, 2], ["0", 1], [0, "1"], [-1, 1], [0, 3], [2, 1]]) {
      expect(
        isCraftingSpecialRecipe({ ...cloning, allowedGenerations }),
      ).toBe(false);
    }

    const star = craftingFireworkStarRecipe(
      ResourceLocation("minecraft:guarded_star"),
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      exactly("red_dye"),
      { star: exactly("fire_charge") },
      itemStack("firework_star", 1),
    );
    expect(isCraftingSpecialRecipe(star)).toBe(true);
    for (const shapes of [null, { spiral: exactly("fire_charge") }, { star: null }]) {
      expect(isCraftingSpecialRecipe({ ...star, shapes })).toBe(false);
    }
  });
});

const NO_MATCH = { _tag: "NoMatch" } as const;

const bannerRecipe = craftingBannerDuplicateRecipe(
  ResourceLocation("minecraft:cover_banner_duplicate"),
  exactly("white_banner"),
  itemStack("white_banner", 1),
);

const bookRecipe = craftingBookCloningRecipe(
  ResourceLocation("minecraft:cover_book_cloning"),
  exactly("written_book"),
  exactly("paper"),
  itemStack("written_book", 1),
  [0, 1],
);

const potRecipe = craftingDecoratedPotRecipe(
  ResourceLocation("minecraft:cover_decorated_pot"),
  exactly("brick"),
  exactly("feather"),
  exactly("brick"),
  exactly("gold_nugget"),
  itemStack("decorated_pot", 1),
);

const rocketRecipe = craftingFireworkRocketRecipe(
  ResourceLocation("minecraft:cover_firework_rocket"),
  exactly("paper"),
  exactly("gunpowder"),
  exactly("firework_star"),
  itemStack("firework_rocket", 1),
);

const fadeRecipe = craftingFireworkStarFadeRecipe(
  ResourceLocation("minecraft:cover_firework_star_fade"),
  exactly("firework_star"),
  exactly("red_dye"),
  itemStack("firework_star", 1),
);

const starRecipe = craftingFireworkStarRecipe(
  ResourceLocation("minecraft:cover_firework_star"),
  exactly("diamond"),
  exactly("glowstone_dust"),
  exactly("gunpowder"),
  exactly("red_dye"),
  { star: exactly("fire_charge") },
  itemStack("firework_star", 1),
);

const mapRecipe = craftingMapExtendingRecipe(
  ResourceLocation("minecraft:cover_map_extending"),
  exactly("filled_map"),
  exactly("paper"),
  itemStack("filled_map", 1),
);

const shieldRecipe = craftingShieldDecorationRecipe(
  ResourceLocation("minecraft:cover_shield_decoration"),
  exactly("white_banner"),
  exactly("shield"),
  itemStack("shield", 1),
);

const EXPLOSION: JsonValue = {
  shape: "star",
  colors: [0xff0000],
  fadeColors: [],
  hasTrail: true,
  hasTwinkle: false,
};

const BOOK_CONTENT: Record<string, JsonValue> = {
  pages: ['"page"', { raw: '"raw"', filtered: '"filtered"' }, { raw: '"bare"' }],
  title: '"title"',
  author: "author",
  generation: 0,
  resolved: true,
};

const patchedBanner = itemStack("white_banner", 1, {
  componentPatch: itemComponentPatch({
    [ItemComponentPatchKey("minecraft:banner_patterns")]: [
      { pattern: "minecraft:stripe", color: "red" },
    ],
    [ItemComponentPatchKey("minecraft:base_color")]: "white",
  }),
});

const patchedBook = itemStack("written_book", 1, {
  componentPatch: patchFor("minecraft:written_book_content", BOOK_CONTENT),
});

const patchedMap = itemStack("filled_map", 1, {
  componentPatch: patchFor("minecraft:map_id", 12),
});

const patchedStar = itemStack("firework_star", 1, {
  componentPatch: patchFor("minecraft:firework_explosion", EXPLOSION),
});

// Every guard below reads its component twice: once while the recipe table is
// validated and once while the match is built. Poisoning the second read is the
// only way to reach the defensive re-check, and calibrating the budget against a
// real validation keeps the test honest when the guard order changes.
const poisonAfterValidation = (
  recipe: object,
  field: string,
  replacement: unknown,
): object => {
  const source: Record<string, unknown> = Object.fromEntries(
    Object.entries(recipe),
  );
  let probeReads = 0;
  const probe = Object.defineProperty({ ...source }, field, {
    enumerable: true,
    configurable: true,
    get: () => {
      probeReads += 1;
      return source[field];
    },
  });
  isCraftingSpecialRecipe(probe);
  const budget = probeReads;
  let reads = 0;
  return Object.defineProperty({ ...source }, field, {
    enumerable: true,
    configurable: true,
    get: () => {
      reads += 1;
      return reads <= budget ? source[field] : replacement;
    },
  });
};

describe("crafting special recipes across every Java variant", () => {
  it("reads components from a patch as readily as from a resolved component", () => {
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [patchedBook, itemStack("paper", 1)]),
        {},
        [bookRecipe],
      ),
    ).toMatchObject({
      _tag: "Match",
      output: {
        componentPatch: {
          "minecraft:written_book_content": {
            generation: 1,
            pages: ['"page"', { raw: '"raw"', filtered: '"filtered"' }, { raw: '"bare"' }],
          },
        },
      },
    });
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [patchedMap, itemStack("paper", 1)]),
        {},
        [mapRecipe],
      )._tag,
    ).toBe("Match");
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [itemStack("paper", 1), itemStack("gunpowder", 1), patchedStar]),
        {},
        [rocketRecipe],
      )._tag,
    ).toBe("Match");
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          patchedBanner,
          itemStack("shield", 1, {
            componentPatch: patchFor("minecraft:banner_patterns", []),
          }),
        ]),
        {},
        [shieldRecipe],
      )._tag,
    ).toBe("Match");

    // A patch that carries the wrong shape for the component reads as an
    // explicit "no value", which is not the same as an absent component.
    const brokenComponent = (component: string, item: ItemType) =>
      itemStack(item, 1, { componentPatch: patchFor(component, "nonsense") });
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          brokenComponent("minecraft:written_book_content", "written_book"),
          itemStack("paper", 1),
        ]),
        {},
        [bookRecipe],
      ),
    ).toEqual(NO_MATCH);
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          brokenComponent("minecraft:map_id", "filled_map"),
          itemStack("paper", 1),
        ]),
        {},
        [mapRecipe],
      ),
    ).toEqual(NO_MATCH);
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          itemStack("paper", 1),
          itemStack("gunpowder", 1),
          brokenComponent("minecraft:firework_explosion", "firework_star"),
        ]),
        {},
        [rocketRecipe],
      ),
    ).toEqual(NO_MATCH);
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          brokenComponent("minecraft:firework_explosion", "firework_star"),
          dyeStack("red_dye", "red"),
        ]),
        {},
        [fadeRecipe],
      ),
    ).toEqual(NO_MATCH);
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          brokenComponent("minecraft:banner_patterns", "white_banner"),
          itemStack("shield", 1),
        ]),
        {},
        [shieldRecipe],
      ),
    ).toEqual(NO_MATCH);
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          itemStack("white_banner", 1, {
            componentPatch: itemComponentPatch({
              [ItemComponentPatchKey("minecraft:banner_patterns")]: [],
              [ItemComponentPatchKey("minecraft:base_color")]: 7,
            }),
          }),
          itemStack("shield", 1),
        ]),
        {},
        [shieldRecipe],
      ),
    ).toEqual(NO_MATCH);
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          patchedBanner,
          brokenComponent("minecraft:banner_patterns", "shield"),
        ]),
        {},
        [shieldRecipe],
      ),
    ).toEqual(NO_MATCH);

    // A patch that names some other component leaves this one absent.
    expect(
      matchCraftingSpecialRecipe(
        craftGrid(3, 3, [
          itemStack("written_book", 1, {
            componentPatch: patchFor("minecraft:custom_model_data", 7),
          }),
          itemStack("paper", 1),
        ]),
        {},
        [bookRecipe],
      ),
    ).toEqual(NO_MATCH);
  });

  it("refuses every grid a Java special recipe would refuse", () => {
    const banner = itemStack("white_banner", 1);
    for (const grid of [
      craftGrid(2, 2, [banner, banner]),
      craftGrid(3, 3, [banner, itemStack("stone", 1)]),
      craftGrid(3, 3, [banner, banner, banner]),
      craftGrid(3, 3, [banner]),
    ]) {
      expect(applyCraftingSpecial(bannerRecipe, grid)).toEqual(NO_MATCH);
    }
    expect(
      applyCraftingSpecial(bannerRecipe, craftGrid(3, 3, [banner, banner]), {
        station: "furnace",
      }),
    ).toEqual(NO_MATCH);

    const book = itemStack("written_book", 1, {
      components: itemComponents("written_book", {
        writtenBookContent: {
          pages: ['"page"'],
          title: '"title"',
          author: "author",
          generation: 0,
          resolved: true,
        },
      }),
    });
    const agedBook = itemStack("written_book", 1, {
      componentPatch: patchFor("minecraft:written_book_content", {
        ...BOOK_CONTENT,
        generation: 2,
      }),
    });
    const paper = itemStack("paper", 1);
    for (const grid of [
      craftGrid(2, 2, [book, paper]),
      craftGrid(3, 3, [book, book, paper]),
      craftGrid(3, 3, [agedBook, paper]),
      craftGrid(3, 3, [book, itemStack("stone", 1)]),
      craftGrid(3, 3, [book]),
      craftGrid(3, 3, [paper]),
    ]) {
      expect(applyCraftingSpecial(bookRecipe, grid)).toEqual(NO_MATCH);
    }
    // A written book with no content at all cannot be cloned.
    expect(
      applyCraftingSpecial(
        bookRecipe,
        craftGrid(3, 3, [itemStack("written_book", 1), paper]),
      ),
    ).toEqual(NO_MATCH);
    // Cloning onto more paper than the output stack can hold.
    expect(
      applyCraftingSpecial(
        craftingBookCloningRecipe(
          ResourceLocation("minecraft:cover_book_cloning_capped"),
          exactly("written_book"),
          exactly("paper"),
          itemStack("written_book", 64),
          [0, 1],
        ),
        craftGrid(3, 3, [book, paper, paper, paper]),
      ),
    ).toEqual(NO_MATCH);

    const brick = itemStack("brick", 1);
    for (const grid of [
      craftGrid(2, 2, []),
      craftGrid(3, 3, []),
      craftGrid(3, 3, [
        brick,
        brick,
        undefined,
        itemStack("feather", 1),
        undefined,
        brick,
        undefined,
        itemStack("gold_nugget", 1),
      ]),
    ]) {
      expect(applyCraftingSpecial(potRecipe, grid)).toEqual(NO_MATCH);
    }

    const star = itemStack("firework_star", 1, {
      componentPatch: patchFor("minecraft:firework_explosion", EXPLOSION),
    });
    const gunpowder = itemStack("gunpowder", 1);
    for (const grid of [
      craftGrid(2, 2, []),
      craftGrid(3, 3, [paper, paper, gunpowder, star]),
      craftGrid(3, 3, [paper, gunpowder, star, star]),
      craftGrid(3, 3, [paper, gunpowder, star, itemStack("stone", 1)]),
      craftGrid(3, 3, [paper, star]),
    ]) {
      expect(applyCraftingSpecial(rocketRecipe, grid)).toEqual(NO_MATCH);
    }

    const redDye = dyeStack("red_dye", "red");
    for (const grid of [
      craftGrid(2, 2, []),
      craftGrid(3, 3, [star, star, redDye]),
      craftGrid(3, 3, [star, itemStack("red_dye", 1)]),
      craftGrid(3, 3, [star, itemStack("stone", 1)]),
      craftGrid(3, 3, [star]),
    ]) {
      expect(applyCraftingSpecial(fadeRecipe, grid)).toEqual(NO_MATCH);
    }

    const fireCharge = itemStack("fire_charge", 1);
    for (const grid of [
      craftGrid(2, 2, []),
      craftGrid(3, 3, [
        gunpowder,
        redDye,
        itemStack("diamond", 1),
        itemStack("diamond", 1),
      ]),
      craftGrid(3, 3, [
        gunpowder,
        redDye,
        itemStack("glowstone_dust", 1),
        itemStack("glowstone_dust", 1),
      ]),
      craftGrid(3, 3, [gunpowder, gunpowder, redDye]),
      craftGrid(3, 3, [gunpowder, itemStack("red_dye", 1)]),
      craftGrid(3, 3, [gunpowder, redDye, fireCharge, fireCharge]),
      craftGrid(3, 3, [gunpowder, redDye, itemStack("stone", 1)]),
      craftGrid(3, 3, [gunpowder]),
      craftGrid(3, 3, [redDye]),
    ]) {
      expect(applyCraftingSpecial(starRecipe, grid)).toEqual(NO_MATCH);
    }

    const filledMap = itemStack("filled_map", 1, {
      componentPatch: patchFor("minecraft:map_id", 12),
    });
    for (const grid of [
      craftGrid(2, 2, []),
      craftGrid(3, 3, [filledMap, filledMap, paper]),
      craftGrid(3, 3, [filledMap, itemStack("stone", 1)]),
      craftGrid(3, 3, [filledMap]),
      craftGrid(3, 3, [paper]),
    ]) {
      expect(applyCraftingSpecial(mapRecipe, grid)).toEqual(NO_MATCH);
    }

    const shield = itemStack("shield", 1);
    const decoratedShield = itemStack("shield", 1, {
      componentPatch: patchFor("minecraft:banner_patterns", [
        { pattern: "minecraft:stripe", color: "red" },
      ]),
    });
    for (const grid of [
      craftGrid(2, 2, []),
      craftGrid(3, 3, [patchedBanner, patchedBanner, shield]),
      craftGrid(3, 3, [patchedBanner, shield, shield]),
      craftGrid(3, 3, [patchedBanner, decoratedShield]),
      craftGrid(3, 3, [patchedBanner, itemStack("stone", 1)]),
      craftGrid(3, 3, [patchedBanner]),
      craftGrid(3, 3, [shield]),
    ]) {
      expect(applyCraftingSpecial(shieldRecipe, grid)).toEqual(NO_MATCH);
    }
    // A banner with no patterns at all still decorates the shield.
    expect(
      applyCraftingSpecial(
        shieldRecipe,
        craftGrid(3, 3, [itemStack("white_banner", 1), shield]),
      ),
    ).toMatchObject({ _tag: "Applied" });
    // A target ingredient wide enough to admit something that is not a shield
    // still only decorates a shield.
    expect(
      applyCraftingSpecial(
        craftingShieldDecorationRecipe(
          ResourceLocation("minecraft:cover_shield_decoration_wide"),
          exactly("white_banner"),
          anyOf([exactly("shield"), exactly("stone")]),
          itemStack("shield", 1),
        ),
        craftGrid(3, 3, [patchedBanner, itemStack("stone", 1)]),
      ),
    ).toEqual(NO_MATCH);
  });

  it("routes every recipe tag through the shared match entry point", () => {
    const grids = [
      [bannerRecipe, craftGrid(3, 3, [itemStack("white_banner", 1), itemStack("white_banner", 1)])],
      [bookRecipe, craftGrid(3, 3, [patchedBook, itemStack("paper", 1)])],
      [
        potRecipe,
        craftGrid(3, 3, [
          undefined,
          itemStack("brick", 1),
          undefined,
          itemStack("feather", 1),
          undefined,
          itemStack("brick", 1),
          undefined,
          itemStack("gold_nugget", 1),
        ]),
      ],
      [rocketRecipe, craftGrid(3, 3, [itemStack("paper", 1), itemStack("gunpowder", 1), patchedStar])],
      [fadeRecipe, craftGrid(3, 3, [patchedStar, dyeStack("red_dye", "red")])],
      [
        starRecipe,
        craftGrid(3, 3, [
          itemStack("gunpowder", 1),
          dyeStack("red_dye", "red"),
          itemStack("fire_charge", 1),
        ]),
      ],
      [mapRecipe, craftGrid(3, 3, [patchedMap, itemStack("paper", 1)])],
      [shieldRecipe, craftGrid(3, 3, [patchedBanner, itemStack("shield", 1)])],
    ] as const;
    for (const [recipe, grid] of grids) {
      expect(matchCraftingSpecialRecipe(grid, {}, [recipe])._tag).toBe("Match");
    }

    // An empty table has nothing to return, which is the other side of the
    // "first match wins" reduction.
    expect(matchCraftingSpecialRecipe(craftGrid(3, 3, []), {}, [])).toEqual(
      NO_MATCH,
    );
  });

  it("validates the grid, the context and the table before matching", () => {
    const grid = craftGrid(3, 3, []);
    expect(() =>
      Reflect.apply(matchCraftingSpecialRecipes, undefined, [null, {}, []]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingSpecialRecipes, undefined, [grid, null, []]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingSpecialRecipes, undefined, [
        grid,
        { itemTags: [] },
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingSpecialRecipes, undefined, [
        grid,
        { itemTags: new Map([["not-a-tag", new Set(["stone"])]]) },
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCraftingSpecialRecipes, undefined, [
        grid,
        {},
        [{ ...bannerRecipe, banner: null }],
      ]),
    ).toThrow(TypeError);
  });

  it("serializes a resolved potion component and orders imbue rivals", () => {
    // Neither a named potion nor a custom colour: only the effects survive, and
    // the serializer has to omit the two optional keys rather than emit nulls.
    const potion = potionContentsComponent({
      customEffects: [{ id: "minecraft:speed", amplifier: 1, duration: 200 }],
    });
    const source = itemStack("arrow", 2, {
      components: itemComponents("arrow", { potionContents: potion }),
    });
    const material = itemStack("glass_bottle", 2);
    const grid = imbueGrid(source, material);
    const applied = applyCraftingImbue(imbueRecipe, grid);
    expect(applied).toMatchObject({ _tag: "Applied" });
    if (applied._tag === "Applied") {
      const contents = applied.output.componentPatch?.[
        ItemComponentPatchKey("minecraft:potion_contents")
      ];
      expect(contents).toEqual({
        customEffects: [
          {
            id: "minecraft:speed",
            amplifier: 1,
            duration: 200,
            ambient: false,
            showParticles: true,
            showIcon: true,
          },
        ],
      });
    }

    // Two candidate imbue recipes is what puts the comparator to work.
    const rival = craftingImbueRecipe(
      ResourceLocation("minecraft:arrow_imbue_rival"),
      exactly("arrow"),
      exactly("glass_bottle"),
      itemStack("arrow", 1),
      { priority: 2 },
    );
    expect(
      matchCraftingImbueRecipes(grid, {}, [rival, imbueRecipe]).map(
        (match) => match.recipe.id,
      ),
    ).toEqual([imbueRecipe.id, rival.id]);

    // An imbue recipe fills every slot but the centre; one gap is a NoMatch.
    expect(
      applyCraftingImbue(
        imbueRecipe,
        craftGrid(3, 3, [
          material,
          material,
          material,
          material,
          source,
          material,
          material,
          material,
        ]),
      ),
    ).toEqual(NO_MATCH);
  });

  it("re-checks a recipe whose shape changes after the table was validated", () => {
    const cases: ReadonlyArray<
      readonly [object, string, unknown, ReturnType<typeof craftGrid>]
    > = [
      [bannerRecipe, "banner", null, craftGrid(3, 3, [])],
      [bookRecipe, "source", null, craftGrid(3, 3, [])],
      [potRecipe, "back", null, craftGrid(3, 3, [])],
      [rocketRecipe, "shell", null, craftGrid(3, 3, [])],
      [fadeRecipe, "target", null, craftGrid(3, 3, [])],
      [starRecipe, "trail", null, craftGrid(3, 3, [])],
      [mapRecipe, "map", null, craftGrid(3, 3, [])],
      [shieldRecipe, "banner", null, craftGrid(3, 3, [])],
    ];
    for (const [recipe, field, replacement, grid] of cases) {
      expect(() =>
        Reflect.apply(applyCraftingSpecial, undefined, [
          poisonAfterValidation(recipe, field, replacement),
          grid,
        ]),
      ).toThrow(TypeError);
    }
  });
});

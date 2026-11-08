# Minecraft Java Edition 26.3 conformance

mc-kernel pins Minecraft Java Edition 26.3 through the mc-dev-meta conformance
generator. Raw mcmeta data is not committed; only the generated golden files
used by the package tests are tracked.

## Pinned source revisions

| source | SHA |
| --- | --- |
| `26.3-data` | `538b2b167248c648b2198f2c0d56eced10dfc0cf` |
| `26.3-registries` | `2240df2376509bfaf12becbb36e156e29f8ecb4d` |
| `26.3-assets-json` | `4ea7e5424848e1bed4e8c059986950bdd0acfb22` |
| `26.3-summary` | `d96c75fec200c4580dd75e033a76341521165461` |

The pinned `mc-dev-meta` conformance workflow generates the checked-in golden files;
its generator is maintained outside this repository. To regenerate the derived
identifier and value constants from those goldens, run:

```sh
nix develop --command pnpm generate:vanilla
```

`scripts/generate-vanilla-tables.ts` reads five golden files and writes seven
identifier or value constants to `src/domain/vanilla-26-3-generated.ts`. To
write the generated module to a temporary path instead, run:

```sh
nix develop --command node --experimental-strip-types scripts/generate-vanilla-tables.ts --output /tmp/vanilla-26-3-generated.ts
```

Across generated and hand-maintained data, the package covers biome, block,
damage-type, enchantment, item, mob-effect, recipe, and item-tag categories.
`test/vanilla-26-3.test.ts` decodes each golden file with `effect/Schema` and
compares exposed ids with the 26.3 data, allowing the listed compatibility
extensions.

## Intentional coverage differences

The generated tables cover all 67 biomes, 51 damage types, 40 mob effects, 43
enchantments, and 236 tag ids. Block and item tables remain partial to avoid
expanding downstream block rendering and item/model contracts. Every exposed
block, item, and crafting recipe id is checked against the Minecraft 26.3 golden
data. `VANILLA_CRAFTING_RECIPES` counts only crafting recipes; smelting, brewing,
and fuel data live in separate tables.

The other recipe types in the 26.3 golden catalog include `stonecutting` 351,
`smelting` 73, `campfire_cooking` 9,
`smoking` 9, `crafting_special_bannerduplicate` 16, `crafting_transmute` 33,
`smithing_trim` 18, `crafting_special_bookcloning` 1, `brewing` 279,
`blasting` 25, `crafting_decorated_pot` 1, `crafting_special_firework_rocket`
1, `crafting_special_firework_star` 1, `crafting_special_firework_star_fade`
1, `crafting_dye` 6, `crafting_special_mapextending` 1,
`smithing_transform` 12, `crafting_special_repairitem` 1,
`crafting_special_shielddecoration` 1, and `crafting_imbue` 1. These rows fall
outside `VANILLA_CRAFTING_RECIPES`; separate tables represent subsets of
smelting and brewing rows, and fuel values live in their own table.

## Entries to add to the mc-dev-meta conformance catalog

These proposed rows are for the separately maintained `mc-dev-meta` conformance
catalog:

| id | owner | reason |
| --- | --- | --- |
| `mc-kernel:block-registry-26-3` | `mc-kernel` | Block table remains 123/1286 to avoid downstream meshing and render contract expansion. |
| `mc-kernel:item-registry-26-3` | `mc-kernel` | Item table remains 303/1658 vanilla item types; further additions expand downstream item/model contracts. |
| `mc-kernel:recipe-types-26-3` | `mc-kernel` | Crafting table contains 115/2042 rows from the vanilla recipe catalog: 115 of 1,202 shaped/shapeless rows are represented, while 1,087 shaped/shapeless and 840 other-type rows are outside this table. Separate smelting and brewing tables represent additional subsets. |

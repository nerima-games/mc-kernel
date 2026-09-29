# Minecraft Java Edition 26.3 conformance

mc-kernel pins Minecraft Java Edition 26.3 through the mc-dev-meta V-1
generator. Raw mcmeta data is not committed; only the generated golden files
used by the package tests are tracked.

## V-1 pins

| source | SHA |
| --- | --- |
| `26.3-data` | `538b2b167248c648b2198f2c0d56eced10dfc0cf` |
| `26.3-registries` | `2240df2376509bfaf12becbb36e156e29f8ecb4d` |
| `26.3-assets-json` | `4ea7e5424848e1bed4e8c059986950bdd0acfb22` |
| `26.3-summary` | `d96c75fec200c4580dd75e033a76341521165461` |

Generate the golden files from the pinned generator with:

```sh
nix develop --command pnpm install
nix develop --command pnpm tsx scripts/conformance/generate.ts --out test/golden
```

The five kernel-owned tables are rendered from those golden files with the
network-independent command below. The optional output path is used by the
freshness test; omitting it updates the committed generated module.

```sh
nix develop --command pnpm generate:vanilla
nix develop --command node --experimental-strip-types scripts/generate-vanilla-tables.ts --output /tmp/vanilla-26-3-generated.ts
```

The package owns the biome, block, damage-type, enchantment, item, mob-effect,
recipe, and item-tag categories. `test/vanilla-26-3.test.ts` decodes each file
with `effect/Schema` and checks the generated counts and represented table
values.

## Intentional V-4 divergences

The regenerated kernel tables now match all 67 biomes, 51 damage types, 40 mob
effects, 43 enchantments, and 236 tag ids. The intentionally divergent tables
remain capability-scoped: block is 123/1286, item is 280/1658, and recipe is
100/2042 (kernel/26.3). Their tests require every exposed id to exist in 26.3;
the remaining ids are deferred until the corresponding downstream contracts can
represent them.

Recipe support remains limited to 100 shaped/shapeless rows. The unsupported
26.3 rows are: `stonecutting` 351, `smelting` 73, `campfire_cooking` 9,
`smoking` 9, `crafting_special_bannerduplicate` 16, `crafting_transmute` 33,
`smithing_trim` 18, `crafting_special_bookcloning` 1, `brewing` 279,
`blasting` 25, `crafting_decorated_pot` 1, `crafting_special_firework_rocket`
1, `crafting_special_firework_star` 1, `crafting_special_firework_star_fade`
1, `crafting_dye` 6, `crafting_special_mapextending` 1,
`smithing_transform` 12, `crafting_special_repairitem` 1,
`crafting_special_shielddecoration` 1, and `crafting_imbue` 1. These rows are
intentionally not copied into `recipe-vanilla-data.ts`.

## mc-dev-meta V-3 divergent rows to register

The following rows should be added to the mc-dev-meta conformance catalog by
the catalog-owning stream:

| id | owner | reason |
| --- | --- | --- |
| `mc-kernel:block-registry-26-3` | `mc-kernel` | Block table remains 123/1286 to avoid downstream meshing and render contract expansion. |
| `mc-kernel:item-registry-26-3` | `mc-kernel` | Item table remains 280/1658 to avoid downstream item/model contract expansion. |
| `mc-kernel:recipe-types-26-3` | `mc-kernel` | Kernel schema represents 100/2042 shaped/shapeless rows; the listed 840 rows use unsupported recipe types. |

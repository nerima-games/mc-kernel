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

The package owns the biome, block, damage-type, enchantment, item, mob-effect,
recipe, and item-tag categories. `test/vanilla-26-3.test.ts` decodes each file
with `effect/Schema` and checks the generated counts and represented table
values.

## Intentional V-4 divergences

The current kernel tables are capability-scoped subsets, not complete Java
registries. The golden rosters contain 67 biomes, 1286 blocks, 1658 items, 51
damage types, 40 mob effects, 43 enchantments, 236 item tags, and 2042
recipes. The kernel currently exposes a smaller closed vocabulary for the
biome, damage type, mob effect, enchantment, item, block, tag-membership, and
recipe APIs. The tests therefore require every exposed id to exist in 26.3 and
record exact golden counts, while the remaining ids are intentionally deferred
until the corresponding capability contracts can represent them.

Recipe support remains limited to the existing shaped and shapeless crafting
schema. The 26.3 recipe golden contains 2042 rows across additional recipe
types, so the unsupported rows are intentionally not copied into
`recipe-vanilla-data.ts`.

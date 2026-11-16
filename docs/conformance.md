# Minecraft Java Edition 26.3 conformance

mc-kernel pins Minecraft Java Edition 26.3 through the mc-dev-meta conformance
generator. The golden JSON files under `test/golden/` that package tests read are
derived from Mojang data, so they are not committed and not published. They are
fetched from pinned [misode/mcmeta](https://github.com/misode/mcmeta) commits
and checked against SHA-256 values before tests run.

## Pinned source revisions

| source | SHA |
| --- | --- |
| `26.3-data` | `538b2b167248c648b2198f2c0d56eced10dfc0cf` |
| `26.3-registries` | `2240df2376509bfaf12becbb36e156e29f8ecb4d` |
| `26.3-assets-json` | `4ea7e5424848e1bed4e8c059986950bdd0acfb22` |
| `26.3-summary` | `d96c75fec200c4580dd75e033a76341521165461` |

mc-kernel fetches only the eight golden files it reads, so it does not use the
`26.3-assets-json` pin.

## Fetching the golden files

Fetch the golden files before running tests locally:

```sh
nix develop --command pnpm golden:fetch
```

`scripts/fetch-vanilla-golden.ts` downloads each source from
`https://raw.githubusercontent.com/misode/mcmeta/<SHA>/<file>`, and the biome
files through the GitHub tree API for the `26.3-data` commit. It writes each
file in the canonical form (object keys sorted, arrays kept in order, two-space
indentation, trailing newline). A file is written only when its SHA-256 matches
the table in the script. A file that already exists with a matching hash is not
fetched again; any other file is fetched again and verified. A failed request,
a truncated tree listing, or a hash mismatch makes the command exit non-zero
and names the file with the expected and actual hash. If `GITHUB_TOKEN` is set,
it is sent only to `api.github.com`.

CI runs the same command before `pnpm verify` in `.github/workflows/ci.yaml` and
before the release checks in `.github/workflows/release.yaml`. Without the
golden files, the tests that read them fail; they are never skipped.

The pins, source paths, canonical form, and SHA-256 table in the script mirror
mc-dev-meta's `scripts/conformance/generate.ts`, which produced the bytes these
tests were written against. To move to new pins, update mc-dev-meta's generator
first, then copy its pins and the SHA-256 of each regenerated file into
`scripts/fetch-vanilla-golden.ts`, run `pnpm golden:fetch`, and update the tests
and the counts in this document that change with the data.

## Derived constants

To regenerate the derived identifier and value constants from the golden files,
run:

```sh
nix develop --command pnpm generate:vanilla
```

`scripts/generate-vanilla-tables.ts` reads five golden files and writes seven
identifier or value constants to `src/domain/vanilla-26-3-generated.ts`. To
write the generated module to a temporary path instead, run:

```sh
nix develop --command node --experimental-strip-types scripts/generate-vanilla-tables.ts --output /tmp/vanilla-26-3-generated.ts
```

`test/vanilla-26-3.test.ts` decodes each golden file with `effect/Schema` and
compares exposed ids with the 26.3 data, allowing the compatibility extensions
listed in that test.

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
smelting and brewing rows.

## Entries to add to the mc-dev-meta conformance catalog

These proposed rows are for the separately maintained `mc-dev-meta` conformance
catalog:

| id | owner | reason |
| --- | --- | --- |
| `mc-kernel:block-registry-26-3` | `mc-kernel` | Block table contains 128/1286 entries; remaining entries are outside the shared block and rendering contract. |
| `mc-kernel:item-registry-26-3` | `mc-kernel` | Item table contains 310/1658 entries; remaining entries are outside the shared item and model contract. |
| `mc-kernel:recipe-types-26-3` | `mc-kernel` | Crafting table contains 118/2042 rows from the vanilla recipe catalog: 118 of 1,202 shaped/shapeless rows are represented, while 1,084 shaped/shapeless and 840 other-type rows are outside this table. Separate smelting and brewing tables represent additional subsets. |

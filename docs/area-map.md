# Domain area map

## Scope and inventory

Each area heading names a directory under `src/domain`.
The inventory shows file placement, not conceptual ownership.
An export such as `./domain/camera` maps to the leaf barrel
`src/domain/presentation/_camera.ts`. In the pattern
`src/domain/<area>/_<subpath>.ts`, `<subpath>` is the final segment of the
package export name; the leaf barrel re-exports that subpath's API.
`src/domain/<area>/index.ts` is an area index barrel. It selects that area's
exports for the package root, and `src/index.ts` re-exports the area indexes.
The inventory lists TypeScript source files under `src/domain`, excluding both
kinds of barrels. The test `test/area-map.test.ts` compares listed filenames
with current domain filenames, without checking their area headings, and checks
that each package subpath maps to a unique existing barrel.
Inventory filenames are relative to their area heading; paths in the
[Public subpath map](#public-subpath-map) are relative to `src/domain`.
The build script `scripts/restore-public-entrypoints.mjs` writes one `.js` and
`.d.ts` file under `dist/domain` for each compiled leaf barrel; each file
re-exports that barrel.

## Areas

### coordinates

`coordinate-conversions.ts`, `coordinate-geometry.ts`, `coordinate-keys.ts`,
`coordinate-neighbours.ts`, `coordinate-primitives.ts`, `coordinates.ts`

### block

`block-break-speed-data.ts`, `block-break-speed.ts`, `block-capabilities.ts`,
`block-capability-data.ts`, `block-definition.ts`, `block-entity-data.ts`,
`block-entity-validation.ts`, `block-entity.ts`, `block-harvest-data.ts`,
`block-harvest.ts`, `block-item.ts`, `block-properties.ts`, `block-property-data.ts`,
`block-property-validation.ts`, `block-registry-entries-collision-shapes.ts`,
`block-registry-entries-crops-and-redstone.ts`, `block-registry-entries-end.ts`,
`block-registry-entries-foundation.ts`, `block-registry-entries-ores-and-blocks.ts`,
`block-registry-entries-passable.ts`, `block-registry-entries-structures-and-nether.ts`,
`block-registry-entries-terrain.ts`, `block-registry-entries.ts`,
`block-registry-entry-input.ts`, `block-registry-indexes.ts`, `block-registry-rules.ts`, `block-registry-types.ts`,
`block-registry.ts`, `block-state.ts`, `block-support-data.ts`, `block-support.ts`,
`block-type-data.ts`, `block-type.ts`, `crop-data.ts`, `crop.ts`, `fluid-data.ts`,
`fluid.ts`, `light-data.ts`, `light.ts`, `redstone-data.ts`

### item

`anvil-constants.ts`, `consumable-data.ts`, `consumable-validation.ts`,
`consumable.ts`, `enchantment-data.ts`,
`enchantment-table-data.ts`, `enchantment.ts`, `equipment-data.ts`, `food-data.ts`,
`grindstone-data.ts`, `hotbar-data.ts`, `inventory-data.ts`,
`item-attribute-modifiers-data.ts`, `item-attribute-modifiers-validation.ts`,
`item-attribute-modifiers.ts`, `item-combat-data.ts`, `item-combat-validation.ts`,
`item-combat.ts`, `item-component-patch.ts`, `item-component-values-data.ts`,
`item-component-values-validation.ts`, `item-component-values.ts`,
`item-components-data.ts`, `item-components-validation.ts`, `item-components.ts`,
`item-defense-data.ts`, `item-defense-validation.ts`, `item-defense.ts`,
`item-enchantments-data.ts`, `item-enchantments-validation.ts`, `item-enchantments.ts`,
`item-failure.ts`, `item-primitives.ts`, `item-registry.ts`, `item-stack-canonical.ts`, `item-stack.ts`,
`item-tool-data.ts`, `item-tool.ts`,
`item-type-data.ts`, `item-type.ts`, `tool-component.ts`, `use-cooldown-data.ts`,
`use-cooldown-validation.ts`, `use-cooldown.ts`, `weapon-data.ts`,
`weapon-validation.ts`, `weapon.ts`

### recipe

`brewing-data.ts`, `brewing.ts`, `cooking-data.ts`, `cooking.ts`, `crafting-data.ts`,
`crafting-special-data.ts`, `crafting.ts`, `recipe-data.ts`, `recipe-json.ts`,
`recipe-error.ts`, `recipe-registry.ts`, `recipe-vanilla-data.ts`, `recipe.ts`, `smelting-data.ts`,
`smelting.ts`, `smithing-data.ts`, `smithing.ts`, `stonecutting-data.ts`,
`stonecutting.ts`, `transmute-data.ts`, `transmute.ts`

### entity

`damage-type-data.ts`, `damage-type-validation.ts`, `damage-type.ts`,
`entity-attributes-data.ts`, `entity-attributes-validation.ts`, `entity-attributes.ts`,
`entity-type-data.ts`, `entity-type.ts`, `entity-types.ts`, `entity.ts`,
`explosion-data.ts`, `explosion.ts`, `portal-frame.ts`, `portal.ts`,
`status-effect-data.ts`, `status-effect-validation.ts`, `status-effect.ts`,
`sulfur-cube-data.ts`, `sulfur-cube-registry.ts`, `sulfur-cube-validation.ts`,
`sulfur-cube.ts`, `vehicle.ts`, `wither-data.ts`

### world

`biome-data.ts`, `biome-validation.ts`, `biome.ts`, `chunk.ts`, `data-pack-registry.ts`,
`dimension.ts`, `heightmap.ts`, `random-source.ts`, `tag-membership-data.ts`,
`tag-membership.ts`, `vanilla-26-3-generated.ts`, `weather.ts`, `world-read-write.ts`,
`world-write-port.ts`

### time

`clock.ts`, `frame-timing.ts`, `frame.ts`, `quantities.ts`

### text

`game-mode-data.ts`, `game-mode-validation.ts`, `game-mode.ts`, `game-rule-data.ts`,
`identifiers.ts`, `json-value.ts`, `settings-data.ts`, `settings.ts`,
`statistics-data.ts`, `statistics.ts`, `text-component-data.ts`,
`text-component-validation.ts`, `text-component.ts`

### presentation

`camera.ts`

### event

`domain-event.ts`

### module-contracts

`module-contracts.ts`

### save-slices

`save-slices.ts`

### shared-vocabulary

`shared-vocabulary.ts`

## Public subpath map

**Recipe exports.** `src/index.ts` re-exports `src/domain/recipe/index.ts`, so
all exports from that index are available at the package root: recipe
constructors and types, vanilla crafting recipes, JSON and registry helpers,
and static brewing, smelting, and special-crafting data. The narrower
`./domain/recipe` subpath exposes crafting ingredient and grid helpers,
including `craftingIngredient` and `craftGrid`, and shaped and shapeless recipe
constructors (`shapedRecipe` and `shapelessRecipe`), their related types, and
vanilla crafting recipes; these exports are also available at the root. A
source file does not necessarily have its own package subpath; the table below
lists every non-root domain export.

Rows follow the order of the non-root keys in `package.json`'s `exports` map.

| package subpath | implemented barrel |
| --- | --- |
| `./domain/block-capabilities` | `block/_block-capabilities.ts` |
| `./domain/block-definition` | `block/_block-definition.ts` |
| `./domain/block-harvest` | `block/_block-harvest.ts` |
| `./domain/block-item` | `block/_block-item.ts` |
| `./domain/block-properties` | `block/_block-properties.ts` |
| `./domain/block-support` | `block/_block-support.ts` |
| `./domain/camera` | `presentation/_camera.ts` |
| `./domain/block-registry` | `block/_block-registry.ts` |
| `./domain/block-state` | `block/_block-state.ts` |
| `./domain/world-read-write` | `world/_world-read-write.ts` |
| `./domain/block-type` | `block/_block-type.ts` |
| `./domain/biome` | `world/_biome.ts` |
| `./domain/block-entity` | `block/_block-entity.ts` |
| `./domain/chunk` | `world/_chunk.ts` |
| `./domain/heightmap` | `world/_heightmap.ts` |
| `./domain/light` | `block/_light.ts` |
| `./domain/random-source` | `world/_random-source.ts` |
| `./domain/status-effect` | `entity/_status-effect.ts` |
| `./domain/tag-membership` | `world/_tag-membership.ts` |
| `./domain/clock` | `time/_clock.ts` |
| `./domain/coordinates` | `coordinates/_coordinates.ts` |
| `./domain/data-pack-registry` | `world/_data-pack-registry.ts` |
| `./domain/damage-type` | `entity/_damage-type.ts` |
| `./domain/game-mode` | `text/_game-mode.ts` |
| `./domain/dimension` | `world/_dimension.ts` |
| `./domain/entity` | `entity/_entity.ts` |
| `./domain/entity-type` | `entity/_entity-type.ts` |
| `./domain/sulfur-cube` | `entity/_sulfur-cube.ts` |
| `./domain/sulfur-cube-registry` | `entity/_sulfur-cube-registry.ts` |
| `./domain/equipment` | `item/_equipment.ts` |
| `./domain/enchantment` | `item/_enchantment.ts` |
| `./domain/identifiers` | `text/_identifiers.ts` |
| `./domain/explosion` | `entity/_explosion.ts` |
| `./domain/fluid` | `block/_fluid.ts` |
| `./domain/consumable` | `item/_consumable.ts` |
| `./domain/use-cooldown` | `item/_use-cooldown.ts` |
| `./domain/frame` | `time/_frame.ts` |
| `./domain/frame-timing` | `time/_frame-timing.ts` |
| `./domain/item-components` | `item/_item-components.ts` |
| `./domain/item-component-patch` | `item/_item-component-patch.ts` |
| `./domain/item-component-values` | `item/_item-component-values.ts` |
| `./domain/json-value` | `text/_json-value.ts` |
| `./domain/text-component` | `text/_text-component.ts` |
| `./domain/item-attribute-modifiers` | `item/_item-attribute-modifiers.ts` |
| `./domain/item-combat` | `item/_item-combat.ts` |
| `./domain/item-defense` | `item/_item-defense.ts` |
| `./domain/item-enchantments` | `item/_item-enchantments.ts` |
| `./domain/item-stack` | `item/_item-stack.ts` |
| `./domain/item-registry` | `item/_item-registry.ts` |
| `./domain/item-type` | `item/_item-type.ts` |
| `./domain/quantities` | `time/_quantities.ts` |
| `./domain/recipe` | `recipe/_recipe.ts` |
| `./domain/recipe-json` | `recipe/_recipe-json.ts` |
| `./domain/recipe-registry` | `recipe/_recipe-registry.ts` |
| `./domain/crafting-special-data` | `recipe/_crafting-special-data.ts` |
| `./domain/portal` | `entity/_portal.ts` |
| `./domain/settings` | `text/_settings.ts` |
| `./domain/tool-component` | `item/_tool-component.ts` |
| `./domain/weapon` | `item/_weapon.ts` |
| `./domain/vehicle` | `entity/_vehicle.ts` |
| `./domain/weather` | `world/_weather.ts` |
| `./domain/domain-event` | `event/_domain-event.ts` |
| `./domain/module-contracts` | `module-contracts/_module-contracts.ts` |
| `./domain/save-slices` | `save-slices/_save-slices.ts` |
| `./domain/shared-vocabulary` | `shared-vocabulary/_shared-vocabulary.ts` |
| `./domain/world-write-port` | `world/_world-write-port.ts` |

## Cross-area imports

These lists summarize direct TypeScript imports from each area to other areas.
They include relative imports, re-exports, dynamic imports, and import types;
same-area and external imports are omitted. This source snapshot may be stale
and is descriptive, not an allowlist. The tests do not verify this
section, so check current imports before relying on it. Areas without outgoing
cross-area imports are omitted.
To refresh this snapshot, inspect imports from files under `src/domain`, resolve
each target to its area, and record only imports whose source and target areas
differ.

- `block` imports `coordinates`, `item`, `recipe`, `world`, `time`, `text`.
- `item` imports `block`, `entity`, `world`, `time`, `text`.
- `recipe` imports `item`, `world`, `text`.
- `entity` imports `coordinates`, `block`, `world`, `time`, `text`.
- `world` imports `coordinates`, `block`, `item`, `recipe`, `text`, `shared-vocabulary`.
- `time` imports `text`, `module-contracts`, `save-slices`.
- `presentation` imports `coordinates`, `time`.
- `event` imports `shared-vocabulary`.
- `module-contracts` imports `shared-vocabulary`.
- `save-slices` imports `module-contracts`.
- `shared-vocabulary` imports `coordinates`, `block`, `item`, `entity`, `time`, `text`.

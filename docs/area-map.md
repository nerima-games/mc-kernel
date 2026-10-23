# Domain area map

This map documents the current `src/domain` layout. These eight recipe logic
subpaths are absent from `package.json`'s `exports` map: `./domain/brewing`,
`./domain/cooking`, `./domain/crafting`, `./domain/crafting-special`,
`./domain/smelting`, `./domain/smithing`, `./domain/stonecutting`, and
`./domain/transmute`. The package root `.` is exported through
`src/index.ts`, which re-exports `src/domain/recipe/index.ts`. That entry point
re-exports recipe types and helpers from `src/domain/recipe/recipe-data.ts` and
vanilla crafting data from `src/domain/recipe/recipe-vanilla-data.ts`; it does
not re-export the logic implementations for the eight subpaths listed above.

## Scope and invariant

A barrel is a TypeScript entry point that re-exports other modules.
Public subpaths are the non-root keys in `package.json`'s `exports` map.
The inventory lists 192 implementation and data files under `src/domain`,
excluding public leaf barrels (`<area>/_<subpath>.ts`) and area index barrels
(`src/domain/<area>/index.ts`). `test/area-map.test.ts` checks that each file
appears once and maps every public package subpath to a barrel. The public map
below covers the 81 non-root subpaths currently listed in `package.json`'s
`exports` map. The inventory lists files
present in this checkout regardless of package exports; it does not indicate
whether a listed file is imported.

## Areas

The implemented layout has thirteen area directories. Each public subpath has one
leaf barrel inside its area (`<area>/_<subpath>.ts`); internal data, validation,
and implementation files stay beside it. Each area has an index barrel at
`src/domain/<area>/index.ts`, and `src/index.ts` re-exports through those thirteen
barrels. The area directory itself is not an additional public export.

### coordinates (6)

`coordinate-conversions.ts`, `coordinate-geometry.ts`, `coordinate-keys.ts`,
`coordinate-neighbours.ts`, `coordinate-primitives.ts`, `coordinates.ts`

### block (55)

`bedrock-mining-data.ts`, `bedrock-mining-descriptors.ts`, `bedrock-mining.ts`,
`block-break-speed-data.ts`, `block-break-speed.ts`, `block-capabilities.ts`,
`block-capability-data.ts`, `block-definition.ts`, `block-entity-data.ts`,
`block-entity-validation.ts`, `block-entity.ts`, `block-harvest-data.ts`,
`block-harvest.ts`, `block-interaction-data.ts`, `block-interaction.ts`,
`block-item.ts`, `block-properties.ts`, `block-property-data.ts`,
`block-property-validation.ts`, `block-registry-entries-collision-shapes.ts`,
`block-registry-entries-crops-and-redstone.ts`, `block-registry-entries-end.ts`,
`block-registry-entries-foundation.ts`, `block-registry-entries-ores-and-blocks.ts`,
`block-registry-entries-passable.ts`, `block-registry-entries-structures-and-nether.ts`,
`block-registry-entries-terrain.ts`, `block-registry-entries.ts`,
`block-registry-indexes.ts`, `block-registry-rules.ts`, `block-registry-types.ts`,
`block-registry.ts`, `block-state.ts`, `block-support-data.ts`, `block-support.ts`,
`block-type-data.ts`, `block-type.ts`, `block-world.ts`, `crop-data.ts`, `crop.ts`,
`fluid-data.ts`, `fluid-state.ts`, `fluid-update.ts`, `fluid.ts`, `light-data.ts`,
`light-update.ts`, `light.ts`, `redstone-data.ts`, `redstone-device-update.ts`,
`redstone-devices.ts`, `redstone-network.ts`, `redstone-state.ts`,
`redstone-update-types.ts`, `redstone-update.ts`, `redstone.ts`

### item (45)

`anvil-constants.ts`, `anvil-primitives.ts`, `consumable-data.ts`,
`consumable-validation.ts`, `consumable.ts`, `enchantment-data.ts`,
`enchantment-table-data.ts`, `enchantment.ts`, `equipment-data.ts`,
`food-data.ts`, `grindstone-data.ts`, `hotbar-data.ts`, `inventory-data.ts`,
`item-attribute-modifiers-data.ts`, `item-attribute-modifiers-validation.ts`,
`item-attribute-modifiers.ts`, `item-combat-data.ts`,
`item-combat-validation.ts`, `item-combat.ts`, `item-component-patch.ts`,
`item-component-values-data.ts`, `item-component-values-validation.ts`,
`item-component-values.ts`, `item-components-data.ts`,
`item-components-validation.ts`, `item-components.ts`,
`item-defense-data.ts`, `item-defense-validation.ts`, `item-defense.ts`,
`item-enchantments-data.ts`, `item-enchantments-validation.ts`,
`item-enchantments.ts`, `item-registry.ts`, `item-stack.ts`,
`item-tool-data.ts`, `item-tool.ts`, `item-type-data.ts`, `item-type.ts`,
`tool-component.ts`, `use-cooldown-data.ts`, `use-cooldown-validation.ts`,
`use-cooldown.ts`, `weapon-data.ts`, `weapon-validation.ts`, `weapon.ts`

### recipe (20)

`brewing-data.ts`, `brewing.ts`, `cooking-data.ts`,
`cooking.ts`, `crafting-data.ts`, `crafting-special-data.ts`,
`crafting.ts`, `recipe-data.ts`, `recipe-json.ts`, `recipe-registry.ts`,
`recipe-vanilla-data.ts`, `recipe.ts`, `smelting-data.ts`, `smelting.ts`,
`smithing-data.ts`, `smithing.ts`, `stonecutting-data.ts`,
`stonecutting.ts`, `transmute-data.ts`, `transmute.ts`

### entity (27)

`damage-type-data.ts`, `damage-type-validation.ts`, `damage-type.ts`,
`entity-attributes-data.ts`, `entity-attributes-validation.ts`,
`entity-attributes.ts`, `entity-type-data.ts`, `entity-type.ts`,
`entity-types.ts`, `entity.ts`, `explosion-data.ts`, `explosion.ts`,
`portal-frame.ts`, `portal.ts`, `primed-tnt-data.ts`, `primed-tnt.ts`,
`projectile-collision.ts`, `projectile.ts`, `status-effect-data.ts`,
`status-effect-validation.ts`, `status-effect.ts`, `sulfur-cube-data.ts`,
`sulfur-cube-registry.ts`, `sulfur-cube-validation.ts`, `sulfur-cube.ts`,
`vehicle.ts`, `wither-data.ts`

### world (14)

`biome-data.ts`, `biome-validation.ts`, `biome.ts`, `chunk.ts`,
`data-pack-registry.ts`, `dimension.ts`, `heightmap.ts`, `random-source.ts`,
`tag-membership-data.ts`, `tag-membership.ts`, `vanilla-26-3-generated.ts`,
`weather.ts`, `world-read-write.ts`, `world-write-port.ts`

### time (5)

`clock.ts`, `frame-timing.ts`, `frame.ts`, `quantities.ts`, `time-of-day.ts`

### text (14)

`game-mode-data.ts`, `game-mode-validation.ts`, `game-mode.ts`,
`game-rule-data.ts`, `game-rule.ts`, `identifiers.ts`, `json-value.ts`,
`settings-data.ts`, `settings.ts`, `statistics-data.ts`, `statistics.ts`,
`text-component-data.ts`, `text-component-validation.ts`,
`text-component.ts`

### presentation (2)

`camera-pose.ts`, `camera.ts`

### event (1)

`domain-event.ts`

### module-contracts (1)

`module-contracts.ts`

### save-slices (1)

`save-slices.ts`

### shared-vocabulary (1)

`shared-vocabulary.ts`

## Public subpath to barrel map

Rows follow the order of package subpaths in `package.json`'s `exports` map.

| subpath | implemented barrel (relative to `src/domain/`) |
| --- | --- |
| `./domain/block-break-speed` | `block/_block-break-speed.ts` |
| `./domain/block-capabilities` | `block/_block-capabilities.ts` |
| `./domain/block-definition` | `block/_block-definition.ts` |
| `./domain/block-harvest` | `block/_block-harvest.ts` |
| `./domain/block-item` | `block/_block-item.ts` |
| `./domain/block-properties` | `block/_block-properties.ts` |
| `./domain/block-support` | `block/_block-support.ts` |
| `./domain/camera` | `presentation/_camera.ts` |
| `./domain/camera-pose` | `presentation/_camera-pose.ts` |
| `./domain/block-registry` | `block/_block-registry.ts` |
| `./domain/block-interaction` | `block/_block-interaction.ts` |
| `./domain/block-state` | `block/_block-state.ts` |
| `./domain/block-world` | `block/_block-world.ts` |
| `./domain/world-read-write` | `world/_world-read-write.ts` |
| `./domain/block-type` | `block/_block-type.ts` |
| `./domain/bedrock-mining` | `block/_bedrock-mining.ts` |
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
| `./domain/crop` | `block/_crop.ts` |
| `./domain/damage-type` | `entity/_damage-type.ts` |
| `./domain/game-mode` | `text/_game-mode.ts` |
| `./domain/game-rule` | `text/_game-rule.ts` |
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
| `./domain/fluid-update` | `block/_fluid-update.ts` |
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
| `./domain/projectile` | `entity/_projectile.ts` |
| `./domain/primed-tnt` | `entity/_primed-tnt.ts` |
| `./domain/portal` | `entity/_portal.ts` |
| `./domain/redstone` | `block/_redstone.ts` |
| `./domain/redstone-network` | `block/_redstone-network.ts` |
| `./domain/redstone-update` | `block/_redstone-update.ts` |
| `./domain/settings` | `text/_settings.ts` |
| `./domain/statistics` | `text/_statistics.ts` |
| `./domain/time-of-day` | `time/_time-of-day.ts` |
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

In these edge lists, `A <- B` means B imports A; `A -> B` means A imports B.
These are TypeScript module edges, not runtime package dependencies.

To produce this dependency snapshot, scan relative module specifiers in every
`.ts` file under `src/domain` (imports, re-exports, dynamic imports, and import
types), resolve each specifier to its source file, and group the importing and
imported files by area. Same-area edges and external dependencies are excluded.
The pairs below were observed in the current source. This snapshot is not
checked by `test/area-map.test.ts`; refresh it when relative module specifiers
change. Pairs are grouped by imported area:

- `block <- entity, item, shared-vocabulary, world`
- `coordinates <- block, entity, presentation, shared-vocabulary, world`
- `entity <- item, shared-vocabulary`
- `item <- block, recipe, shared-vocabulary, world`
- `module-contracts <- save-slices, time`
- `recipe <- block, world`
- `save-slices <- time`
- `shared-vocabulary <- event, module-contracts, world`
- `text <- block, entity, item, recipe, shared-vocabulary, time, world`
- `time <- block, entity, item, presentation, shared-vocabulary`
- `world <- block, entity, item, recipe`

`shared-vocabulary` imports existing domain brands and primitives by type.
`event`, `module-contracts`, and `world` import its runtime schemas; these
edges appear in the snapshot above.

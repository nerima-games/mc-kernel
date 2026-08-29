/**
 * Public package boundary for platform-independent Minecraft domain contracts.
 *
 * Runtime data tables stay beside the logic that consumes them, while this
 * module exposes only the package's intentional public surface. Platform
 * integrations belong in their owning packages; the kernel contains no
 * platform adapter layer.
 */

export * from "./domain/block-capabilities.js";
export * from "./domain/anvil.js";
export * from "./domain/bedrock-mining.js";
export * from "./domain/biome.js";
export * from "./domain/block-break-speed.js";
export * from "./domain/block-definition.js";
export * from "./domain/block-entity.js";
export * from "./domain/block-harvest.js";
export * from "./domain/block-interaction.js";
export * from "./domain/block-item.js";
export * from "./domain/block-properties.js";
export * from "./domain/block-registry.js";
export * from "./domain/block-state.js";
export * from "./domain/block-world.js";
export * from "./domain/block-support.js";
export * from "./domain/block-type.js";
export * from "./domain/brewing.js";
export {
  applyCooking,
  cookingRecipe,
  cookingRecipeForItem,
  isCookingRecipe,
  matchCookingRecipe,
  matchCookingRecipes,
  matchesCookingRecipe,
} from "./domain/cooking.js";
export type {
  CookingMatch,
  CookingApplyResult,
  CookingRecipe,
  CookingRecipeOptions,
  CookingRecipeTable,
} from "./domain/cooking.js";
export * from "./domain/camera.js";
export * from "./domain/camera-pose.js";
export * from "./domain/clock.js";
export * from "./domain/chunk.js";
export * from "./domain/coordinates.js";
export * from "./domain/data-pack-registry.js";
export * from "./domain/crop.js";
export * from "./domain/damage-type.js";
export * from "./domain/dimension.js";
export * from "./domain/entity.js";
export * from "./domain/entity-type.js";
export * from "./domain/sulfur-cube.js";
export * from "./domain/sulfur-cube-registry.js";
export * from "./domain/equipment.js";
export * from "./domain/enchantment.js";
export * from "./domain/enchantment-table.js";
export * from "./domain/explosion.js";
export * from "./domain/fluid.js";
export * from "./domain/fluid-update.js";
export * from "./domain/food.js";
export * from "./domain/consumable.js";
export * from "./domain/use-cooldown.js";
export * from "./domain/frame.js";
export * from "./domain/frame-timing.js";
export * from "./domain/game-mode.js";
export * from "./domain/game-rule.js";
export * from "./domain/grindstone.js";
export * from "./domain/heightmap.js";
export * from "./domain/identifiers.js";
export * from "./domain/light.js";
export * from "./domain/json-value.js";
export * from "./domain/item-component-values.js";
export * from "./domain/text-component.js";
export * from "./domain/item-attribute-modifiers.js";
export * from "./domain/item-combat.js";
export * from "./domain/item-defense.js";
export * from "./domain/item-enchantments.js";
export * from "./domain/item-components.js";
export * from "./domain/item-component-patch.js";
export * from "./domain/item-registry.js";
export * from "./domain/item-stack.js";
export * from "./domain/item-type.js";
export * from "./domain/inventory.js";
export * from "./domain/hotbar.js";
export * from "./domain/quantities.js";
export * from "./domain/random-source.js";
export * from "./domain/recipe.js";
export * from "./domain/recipe-json.js";
export * from "./domain/recipe-registry.js";
export * from "./domain/crafting.js";
export * from "./domain/crafting-special-data.js";
export * from "./domain/crafting-special.js";
export * from "./domain/projectile.js";
export * from "./domain/primed-tnt.js";
export * from "./domain/portal.js";
export * from "./domain/redstone.js";
export * from "./domain/redstone-network.js";
export * from "./domain/redstone-update.js";
export * from "./domain/smelting.js";
export * from "./domain/settings.js";
export * from "./domain/smithing.js";
export * from "./domain/status-effect.js";
export * from "./domain/stonecutting.js";
export * from "./domain/tag-membership.js";
export * from "./domain/transmute.js";
export * from "./domain/statistics.js";
export * from "./domain/time-of-day.js";
export * from "./domain/tool-component.js";
export * from "./domain/weapon.js";
export * from "./domain/vitals.js";
export * from "./domain/vehicle.js";
export * from "./domain/weather.js";
export * from "./domain/wither.js";

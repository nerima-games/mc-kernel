/**
 * Public game-mode boundary.
 *
 * The tables and their runtime guards are separate modules, while this file
 * keeps the established import path stable for the package API.
 *
 * `Difficulty` lives beside `GameMode` rather than in its own module because
 * both answer the same question — what rules of engagement a player is
 * under — one scoped to the player, one to the world, and every kernel
 * consumer resolves either the same way: a closed name against a fact table.
 */
export * from './game-mode-data.js'
export * from './game-mode-validation.js'

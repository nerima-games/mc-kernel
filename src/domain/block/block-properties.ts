/**
 * Public block-property boundary.
 *
 * The table and its runtime resolver are separate modules, while this file
 * keeps the established import path stable for the package API.
 */
export * from './block-property-data.js'
export { propertyOf, resolveBlockProperties } from './block-property-validation.js'

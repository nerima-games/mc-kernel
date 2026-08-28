/**
 * Runtime validation and default resolution for block properties.
 *
 * Keeping this module separate from the property table makes the accepted
 * external shape and the resolved domain data independently readable.
 */
import {
  BLOCK_OPACITIES,
  BLOCK_PROPERTY_DEFAULTS,
  BLOCK_PROPERTY_NAMES,
  COLLISION_SHAPES,
  FLUID_KINDS,
  FOOTSTEP_MATERIALS,
  LIGHT_LEVEL_MAX,
  LIGHT_LEVEL_MIN,
  RAIL_KINDS,
  RENDER_KINDS,
  UNBREAKABLE_HARDNESS,
  isLightLevel,
  type BlockProperties,
  type BlockPropertyName,
  type BlockPropertyOverrides,
  type LightLevel,
} from './block-property-data.js'
import { HARVEST_TIERS, HARVEST_TOOL_CATEGORIES } from './block-harvest-data.js'
import { isBlockType } from './block-type.js'
import { isItemType } from './item-type.js'
import { MAX_STACK_COUNT } from './quantities.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOneOf = <const T extends ReadonlyArray<string>>(
  values: T,
  value: unknown,
): value is T[number] => typeof value === 'string' && values.some((candidate) => candidate === value)

const assertKnownKeys = (
  value: Record<string, unknown>,
  keys: ReadonlyArray<string>,
  label: string,
): void => {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw new TypeError(`unknown ${label} ${key}`)
    }
  }
}

const assertFiniteNonNegative = (name: string, value: unknown): void => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to zero`)
  }
}

const assertHardness = (value: unknown): void => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (value < 0 && value !== UNBREAKABLE_HARDNESS)
  ) {
    throw new RangeError(
      'block property hardness must be a finite number greater than or equal to zero or -1',
    )
  }
}

const assertBoolean = (name: string, value: unknown): void => {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name} must be a boolean`)
  }
}

const validateHarvestToolRequirement = (value: unknown): void => {
  if (!isRecord(value)) {
    throw new TypeError('block property harvestTool must be an object')
  }
  assertKnownKeys(value, ['category', 'minTier'], 'block property harvestTool field')

  const category = value['category']
  if (!isOneOf(HARVEST_TOOL_CATEGORIES, category)) {
    throw new TypeError(`unknown block property harvestTool category ${String(category)}`)
  }
  const minTier = value['minTier']
  if (!isOneOf(HARVEST_TIERS, minTier)) {
    throw new TypeError(`unknown block property harvestTool tier ${String(minTier)}`)
  }
}

const validateDropRule = (value: unknown): void => {
  if (!isRecord(value)) {
    throw new TypeError('block property drops must be an object')
  }
  assertKnownKeys(
    value,
    ['item', 'silkTouchItem', 'count', 'requiresSilkTouch', 'affectedByFortune'],
    'block property drops field',
  )

  const item = value['item']
  if (item !== 'self' && !isItemType(item)) {
    throw new TypeError(`block property drops item must be a registered ItemType or self`)
  }
  const silkTouchItem = value['silkTouchItem']
  if (silkTouchItem !== undefined && !isItemType(silkTouchItem)) {
    throw new TypeError('block property drops silkTouchItem must be a registered ItemType')
  }
  const count = value['count']
  if (
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > MAX_STACK_COUNT
  ) {
    throw new RangeError(`block property drops count must be an integer in [0, ${MAX_STACK_COUNT}]`)
  }
  assertBoolean('block property drops requiresSilkTouch', value['requiresSilkTouch'])
  assertBoolean('block property drops affectedByFortune', value['affectedByFortune'])
}

const validateSupportRule = (value: unknown): void => {
  if (!isRecord(value)) {
    throw new TypeError('block property supportRule must be an object')
  }

  const kind = value['kind']
  if (kind === 'none' || kind === 'anySupporting') {
    assertKnownKeys(value, ['kind'], 'block property supportRule field')
    return
  }

  if (kind === 'oneOf') {
    assertKnownKeys(value, ['kind', 'blocks'], 'block property supportRule field')
    const blocks = value['blocks']
    if (!Array.isArray(blocks) || blocks.length === 0) {
      throw new RangeError('block property supportRule blocks must contain at least one block')
    }
    blocks.forEach((block: unknown) => {
      if (!isBlockType(block)) {
        throw new TypeError('block property supportRule contains an unknown block type')
      }
    })
    return
  }

  throw new TypeError(`unknown block property supportRule kind ${String(kind)}`)
}

const validateCategoricalProperties = (overrides: BlockPropertyOverrides): void => {
  if (overrides.opacity !== undefined && !isOneOf(BLOCK_OPACITIES, overrides.opacity)) {
    throw new TypeError(`unknown block property opacity ${String(overrides.opacity)}`)
  }
  if (overrides.lightEmission !== undefined && !isLightLevel(overrides.lightEmission)) {
    throw new TypeError(
      `LightLevel must be an integer in [${LIGHT_LEVEL_MIN}, ${LIGHT_LEVEL_MAX}], received ${overrides.lightEmission}`,
    )
  }
  if (overrides.fluid !== undefined && !isOneOf(FLUID_KINDS, overrides.fluid)) {
    throw new TypeError(`unknown block property fluid ${String(overrides.fluid)}`)
  }
  if (overrides.collisionShape !== undefined && !isOneOf(COLLISION_SHAPES, overrides.collisionShape)) {
    throw new TypeError(`unknown block property collisionShape ${String(overrides.collisionShape)}`)
  }
  if (overrides.renderKind !== undefined && !isOneOf(RENDER_KINDS, overrides.renderKind)) {
    throw new TypeError(`unknown block property renderKind ${String(overrides.renderKind)}`)
  }
  if (overrides.footstepMaterial !== undefined && !isOneOf(FOOTSTEP_MATERIALS, overrides.footstepMaterial)) {
    throw new TypeError(`unknown block property footstepMaterial ${String(overrides.footstepMaterial)}`)
  }
  if (overrides.railKind !== undefined && !isOneOf(RAIL_KINDS, overrides.railKind)) {
    throw new TypeError(`unknown block property railKind ${String(overrides.railKind)}`)
  }
}

const validateFriction = (value: number): void => {
  if (value < 0 || value > 1) {
    throw new RangeError('block property friction must be a finite number in [0, 1]')
  }
}

const validateNumericProperties = (overrides: BlockPropertyOverrides): void => {
  if (overrides.hardness !== undefined) {
    assertHardness(overrides.hardness)
  }
  if (overrides.friction !== undefined) {
    assertFiniteNonNegative('block property friction', overrides.friction)
    validateFriction(overrides.friction)
  }
  if (overrides.contactDamage !== undefined) {
    assertFiniteNonNegative('block property contactDamage', overrides.contactDamage)
  }
  if (overrides.movementDrag !== undefined) {
    assertFiniteNonNegative('block property movementDrag', overrides.movementDrag)
  }
  if (overrides.xpOnBreak !== undefined) {
    assertFiniteNonNegative('block property xpOnBreak', overrides.xpOnBreak)
  }
}

const validateStructuredProperties = (overrides: BlockPropertyOverrides): void => {
  if (overrides.harvestTool !== undefined) {
    validateHarvestToolRequirement(overrides.harvestTool)
  }
  if (overrides.drops !== undefined) {
    validateDropRule(overrides.drops)
  }
  if (overrides.supportRule !== undefined) {
    validateSupportRule(overrides.supportRule)
  }
}

type ValidatedBlockPropertyOverrides = Omit<BlockPropertyOverrides, 'lightEmission'> & {
  readonly lightEmission?: LightLevel
}

function validateBlockPropertyOverrides(
  overrides: unknown,
): asserts overrides is ValidatedBlockPropertyOverrides {
  if (!isRecord(overrides)) {
    throw new TypeError('block property overrides must be an object')
  }
  assertKnownKeys(overrides, BLOCK_PROPERTY_NAMES, 'block property')
  validateCategoricalProperties(overrides)
  validateNumericProperties(overrides)
  validateStructuredProperties(overrides)
}

const resolveLightEmission = (overrides: ValidatedBlockPropertyOverrides): LightLevel => {
  const lightEmission = overrides.lightEmission
  return lightEmission ?? BLOCK_PROPERTY_DEFAULTS.lightEmission
}

/** Fill in defaults for every property the overrides do not mention. */
export const resolveBlockProperties = (overrides: BlockPropertyOverrides): BlockProperties => {
  validateBlockPropertyOverrides(overrides)

  return {
    ...BLOCK_PROPERTY_DEFAULTS,
    ...overrides,
    lightEmission: resolveLightEmission(overrides),
  }
}

const isBlockPropertyName = (value: unknown): value is BlockPropertyName =>
  typeof value === 'string' && BLOCK_PROPERTY_NAMES.some((name) => name === value)

/** Read one property without materialising the whole resolved set. */
export function propertyOf<K extends BlockPropertyName>(
  overrides: BlockPropertyOverrides,
  name: K,
): BlockProperties[K]
export function propertyOf(
  overrides: BlockPropertyOverrides,
  name: BlockPropertyName,
): BlockProperties[BlockPropertyName]
export function propertyOf(
  overrides: BlockPropertyOverrides,
  name: BlockPropertyName,
): BlockProperties[BlockPropertyName] {
  validateBlockPropertyOverrides(overrides)
  if (!isBlockPropertyName(name)) {
    throw new TypeError(`unknown block property ${String(name)}`)
  }

  const resolved: BlockProperties = {
    ...BLOCK_PROPERTY_DEFAULTS,
    ...overrides,
    lightEmission: resolveLightEmission(overrides),
  }
  return resolved[name]
}

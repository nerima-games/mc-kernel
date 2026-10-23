/**
 * Runtime validation and default resolution for block properties.
 *
 * Keeping this module separate from the property table makes the accepted
 * external shape and the resolved domain data independently readable.
 */
import { Result } from 'effect'
import {
  BlockBlastResistance,
  BlockContactDamage,
  BlockExperiencePoints,
  BlockFriction,
  BlockHardness,
  BlockMovementDrag,
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
  LightLevel,
  isLightLevel,
  type BlockProperties,
  type BlockPropertyName,
  type BlockPropertyOverrides,
} from './block-property-data.js'
import { HARVEST_TIERS, HARVEST_TOOL_CATEGORIES } from './block-harvest-data.js'
import { isBlockType } from './block-type.js'
import { isItemType } from '../item/item-type.js'
import { MAX_STACK_COUNT } from '../time/quantities.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOneOf = <const T extends ReadonlyArray<string>>(
  values: T,
  value: unknown,
): value is T[number] => typeof value === 'string' && values.some((candidate) => candidate === value)

export type BlockPropertyFailure = {
  readonly _tag: 'BlockPropertyFailure'
  readonly reason: 'type' | 'range' | 'unknown-key'
  readonly message: string
}

const failure = (
  reason: BlockPropertyFailure['reason'],
  message: string,
): Result.Result<never, BlockPropertyFailure> =>
  Result.fail({ _tag: 'BlockPropertyFailure', reason, message })

const assertKnownKeys = (
  value: Record<string, unknown>,
  keys: ReadonlyArray<string>,
  label: string,
): Result.Result<void, BlockPropertyFailure> => {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      return failure('unknown-key', `unknown ${label} ${key}`)
    }
  }
  return Result.succeed(undefined)
}

const assertFiniteNonNegative = (name: string, value: unknown): Result.Result<void, BlockPropertyFailure> => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return failure('range', `${name} must be a finite number greater than or equal to zero`)
  }
  return Result.succeed(undefined)
}

const assertHardness = (value: unknown): Result.Result<void, BlockPropertyFailure> => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (value < 0 && value !== UNBREAKABLE_HARDNESS)
  ) {
    return failure(
      'range',
      'block property hardness must be a finite number greater than or equal to zero or -1',
    )
  }
  return Result.succeed(undefined)
}

const assertBlastResistance = (value: unknown): Result.Result<void, BlockPropertyFailure> => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return failure('range', 'block property blastResistance must be a non-negative number or Infinity')
  }
  return Result.succeed(undefined)
}

const assertBoolean = (name: string, value: unknown): Result.Result<void, BlockPropertyFailure> => {
  if (typeof value !== 'boolean') {
    return failure('type', `${name} must be a boolean`)
  }
  return Result.succeed(undefined)
}

const validateHarvestToolRequirement = (value: unknown): Result.Result<void, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* failure('type', 'block property harvestTool must be an object')
    }
    yield* assertKnownKeys(value, ['category', 'minTier'], 'block property harvestTool field')

    if (!isOneOf(HARVEST_TOOL_CATEGORIES, value['category'])) {
      return yield* failure(
        'type',
        `unknown block property harvestTool category ${String(value['category'])}`,
      )
    }
    if (!isOneOf(HARVEST_TIERS, value['minTier'])) {
      return yield* failure('type', `unknown block property harvestTool tier ${String(value['minTier'])}`)
    }
    return undefined
  })

const validateDropRule = (value: unknown): Result.Result<void, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* failure('type', 'block property drops must be an object')
    }
    yield* assertKnownKeys(
      value,
      ['item', 'silkTouchItem', 'count', 'requiresSilkTouch', 'affectedByFortune'],
      'block property drops field',
    )

    if (value['item'] !== 'self' && !isItemType(value['item'])) {
      return yield* failure('type', 'block property drops item must be a registered ItemType or self')
    }
    const silkTouchItem = value['silkTouchItem']
    if (silkTouchItem !== undefined && !isItemType(silkTouchItem)) {
      return yield* failure('type', 'block property drops silkTouchItem must be a registered ItemType')
    }
    const count = value['count']
    if (
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_STACK_COUNT
    ) {
      return yield* failure(
        'range',
        `block property drops count must be an integer in [1, ${MAX_STACK_COUNT}]`,
      )
    }
    yield* assertBoolean('block property drops requiresSilkTouch', value['requiresSilkTouch'])
    yield* assertBoolean('block property drops affectedByFortune', value['affectedByFortune'])
    return undefined
  })

const validateSupportRule = (value: unknown): Result.Result<void, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* failure('type', 'block property supportRule must be an object')
    }

    const kind = value['kind']
    if (kind === 'none' || kind === 'anySupporting') {
      yield* assertKnownKeys(value, ['kind'], 'block property supportRule field')
      return undefined
    }

    if (kind === 'oneOf') {
      yield* assertKnownKeys(value, ['kind', 'blocks'], 'block property supportRule field')
      const blocks = value['blocks']
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return yield* failure('range', 'block property supportRule blocks must contain at least one block')
      }
      if (!blocks.every(isBlockType)) {
        return yield* failure('type', 'block property supportRule contains an unknown block type')
      }
      return undefined
    }

    return yield* failure('type', `unknown block property supportRule kind ${String(kind)}`)
  })

const validateCategoricalProperties = (
  overrides: BlockPropertyOverrides,
): Result.Result<void, BlockPropertyFailure> => {
  if (overrides.opacity !== undefined && !isOneOf(BLOCK_OPACITIES, overrides.opacity)) {
    return failure('type', `unknown block property opacity ${String(overrides.opacity)}`)
  }
  if (overrides.lightEmission !== undefined && !isLightLevel(overrides.lightEmission)) {
    return failure(
      'range',
      `LightLevel must be an integer in [${LIGHT_LEVEL_MIN}, ${LIGHT_LEVEL_MAX}], received ${overrides.lightEmission}`,
    )
  }
  if (overrides.fluid !== undefined && !isOneOf(FLUID_KINDS, overrides.fluid)) {
    return failure('type', `unknown block property fluid ${String(overrides.fluid)}`)
  }
  if (overrides.collisionShape !== undefined && !isOneOf(COLLISION_SHAPES, overrides.collisionShape)) {
    return failure('type', `unknown block property collisionShape ${String(overrides.collisionShape)}`)
  }
  if (overrides.renderKind !== undefined && !isOneOf(RENDER_KINDS, overrides.renderKind)) {
    return failure('type', `unknown block property renderKind ${String(overrides.renderKind)}`)
  }
  if (overrides.footstepMaterial !== undefined && !isOneOf(FOOTSTEP_MATERIALS, overrides.footstepMaterial)) {
    return failure('type', `unknown block property footstepMaterial ${String(overrides.footstepMaterial)}`)
  }
  if (overrides.railKind !== undefined && !isOneOf(RAIL_KINDS, overrides.railKind)) {
    return failure('type', `unknown block property railKind ${String(overrides.railKind)}`)
  }
  return Result.succeed(undefined)
}

const validateFriction = (value: number): Result.Result<void, BlockPropertyFailure> => {
  if (value < 0 || value > 1) {
    return failure('range', 'block property friction must be a finite number in [0, 1]')
  }
  return Result.succeed(undefined)
}

const validateNumericProperties = (
  overrides: BlockPropertyOverrides,
): Result.Result<void, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (overrides.hardness !== undefined) yield* assertHardness(overrides.hardness)
    if (overrides.friction !== undefined) {
      yield* assertFiniteNonNegative('block property friction', overrides.friction)
      yield* validateFriction(overrides.friction)
    }
    if (overrides.contactDamage !== undefined) {
      yield* assertFiniteNonNegative('block property contactDamage', overrides.contactDamage)
    }
    if (overrides.movementDrag !== undefined) {
      yield* assertFiniteNonNegative('block property movementDrag', overrides.movementDrag)
    }
    if (overrides.xpOnBreak !== undefined) {
      yield* assertFiniteNonNegative('block property xpOnBreak', overrides.xpOnBreak)
    }
    if (overrides.blastResistance !== undefined) yield* assertBlastResistance(overrides.blastResistance)
    return undefined
  })

const validateStructuredProperties = (
  overrides: BlockPropertyOverrides,
): Result.Result<void, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (overrides.harvestTool !== undefined) yield* validateHarvestToolRequirement(overrides.harvestTool)
    if (overrides.drops !== undefined) yield* validateDropRule(overrides.drops)
    if (overrides.supportRule !== undefined) yield* validateSupportRule(overrides.supportRule)
    return undefined
  })

type RawNumericBlockPropertyOverrides =
  | 'lightEmission'
  | 'hardness'
  | 'friction'
  | 'blastResistance'
  | 'contactDamage'
  | 'movementDrag'
  | 'xpOnBreak'

type ValidatedBlockPropertyOverrides = Omit<BlockPropertyOverrides, RawNumericBlockPropertyOverrides> & {
  readonly lightEmission?: number
  readonly hardness?: number
  readonly friction?: number
  readonly blastResistance?: number
  readonly contactDamage?: number
  readonly movementDrag?: number
  readonly xpOnBreak?: number
}

function validateBlockPropertyOverrides(
  overrides: unknown,
): Result.Result<ValidatedBlockPropertyOverrides, BlockPropertyFailure> {
  if (!isRecord(overrides)) {
    return failure('type', 'block property overrides must be an object')
  }
  return Result.map(
    Result.gen(function* () {
      yield* assertKnownKeys(overrides, BLOCK_PROPERTY_NAMES, 'block property')
      yield* validateCategoricalProperties(overrides as BlockPropertyOverrides)
      yield* validateNumericProperties(overrides as BlockPropertyOverrides)
      yield* validateStructuredProperties(overrides as BlockPropertyOverrides)
      return undefined
    }),
    () => overrides as ValidatedBlockPropertyOverrides,
  )
}

/** Validate external or table data and brand its numeric property values. */
export const normalizeBlockPropertyOverrides = (
  overrides: unknown,
): Result.Result<BlockPropertyOverrides, BlockPropertyFailure> =>
  Result.map(validateBlockPropertyOverrides(overrides), (validated) => {
    const {
      lightEmission,
      hardness,
      friction,
      blastResistance,
      contactDamage,
      movementDrag,
      xpOnBreak,
      ...otherOverrides
    } = validated

    return {
      ...otherOverrides,
      ...(lightEmission === undefined ? {} : { lightEmission: LightLevel(lightEmission) }),
      ...(hardness === undefined ? {} : { hardness: BlockHardness(hardness) }),
      ...(friction === undefined ? {} : { friction: BlockFriction(friction) }),
      ...(blastResistance === undefined
        ? {}
        : { blastResistance: BlockBlastResistance(blastResistance) }),
      ...(contactDamage === undefined ? {} : { contactDamage: BlockContactDamage(contactDamage) }),
      ...(movementDrag === undefined ? {} : { movementDrag: BlockMovementDrag(movementDrag) }),
      ...(xpOnBreak === undefined ? {} : { xpOnBreak: BlockExperiencePoints(xpOnBreak) }),
    }
  })

const resolveLightEmission = (overrides: BlockPropertyOverrides): LightLevel => {
  const lightEmission = overrides.lightEmission
  return lightEmission ?? BLOCK_PROPERTY_DEFAULTS.lightEmission
}

/** Fill in defaults for every property the overrides do not mention. */
export const resolveBlockProperties = (
  overrides: BlockPropertyOverrides,
): Result.Result<BlockProperties, BlockPropertyFailure> =>
  Result.map(normalizeBlockPropertyOverrides(overrides), (validated) => ({
    ...BLOCK_PROPERTY_DEFAULTS,
    ...validated,
    lightEmission: resolveLightEmission(validated),
  }))

const isBlockPropertyName = (value: unknown): value is BlockPropertyName =>
  typeof value === 'string' && BLOCK_PROPERTY_NAMES.some((name) => name === value)

/** Read one property without materialising the whole resolved set. */
export function propertyOf<K extends BlockPropertyName>(
  overrides: BlockPropertyOverrides,
  name: K,
): Result.Result<BlockProperties[K], BlockPropertyFailure>
export function propertyOf(
  overrides: BlockPropertyOverrides,
  name: BlockPropertyName,
): Result.Result<BlockProperties[BlockPropertyName], BlockPropertyFailure>
export function propertyOf(
  overrides: BlockPropertyOverrides,
  name: BlockPropertyName,
): Result.Result<BlockProperties[BlockPropertyName], BlockPropertyFailure> {
  if (!isBlockPropertyName(name)) {
    return failure('type', `unknown block property ${String(name)}`)
  }

  return Result.map(normalizeBlockPropertyOverrides(overrides), (validated) => {
    const resolved: BlockProperties = {
      ...BLOCK_PROPERTY_DEFAULTS,
      ...validated,
      lightEmission: resolveLightEmission(validated),
    }
    return resolved[name]
  })
}

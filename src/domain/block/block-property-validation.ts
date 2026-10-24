/**
 * Runtime validation and default resolution for block properties.
 *
 * Keeping this module separate from the property table makes the accepted
 * external shape and the resolved domain data independently readable.
 */
import { Result } from 'effect'
import { MAX_GENERIC_INPUT_ARRAY_LENGTH, snapshotInputValue } from '../../input-snapshot.js'
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
import {
  HARVEST_TIERS,
  HARVEST_TOOL_CATEGORIES,
  type BlockDropRule,
  type HarvestToolRequirement,
} from './block-harvest-data.js'
import type { SupportRule } from './block-support-data.js'
import { isBlockType, type BlockType } from './block-type.js'
import { isItemType } from '../item/item-type.js'
import { MAX_STACK_COUNT, StackCount } from '../time/quantities.js'

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

const assertFiniteNonNegative = (name: string, value: unknown): Result.Result<number, BlockPropertyFailure> => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return failure('range', `${name} must be a finite number greater than or equal to zero`)
  }
  return Result.succeed(value)
}

const assertHardness = (value: unknown): Result.Result<number, BlockPropertyFailure> => {
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
  return Result.succeed(value)
}

const assertBlastResistance = (value: unknown): Result.Result<number, BlockPropertyFailure> => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return failure('range', 'block property blastResistance must be a non-negative number or Infinity')
  }
  return Result.succeed(value)
}

const assertBoolean = (name: string, value: unknown): Result.Result<boolean, BlockPropertyFailure> => {
  if (typeof value !== 'boolean') {
    return failure('type', `${name} must be a boolean`)
  }
  return Result.succeed(value)
}

const propertyBrandFailure = (name: string): BlockPropertyFailure => ({
  _tag: 'BlockPropertyFailure',
  reason: 'range',
  message: `block property ${name} is outside its allowed range`,
})

const brandedProperty = <A>(
  value: Result.Result<A, unknown>,
  name: string,
): Result.Result<A, BlockPropertyFailure> => Result.mapError(value, () => propertyBrandFailure(name))

const validateCategoricalValue = <const T extends ReadonlyArray<string>>(
  values: T,
  value: unknown,
  name: string,
): Result.Result<T[number] | undefined, BlockPropertyFailure> => {
  if (value === undefined) return Result.succeed(undefined)
  if (!isOneOf(values, value)) return failure('type', `unknown block property ${name} ${String(value)}`)
  return Result.succeed(value)
}

const validateHarvestToolRequirement = (
  value: unknown,
): Result.Result<HarvestToolRequirement, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* failure('type', 'block property harvestTool must be an object')
    }
    yield* assertKnownKeys(value, ['category', 'minTier'], 'block property harvestTool field')

    const category = value['category']
    if (!isOneOf(HARVEST_TOOL_CATEGORIES, category)) {
      return yield* failure(
        'type',
        `unknown block property harvestTool category ${String(category)}`,
      )
    }
    const minTier = value['minTier']
    if (!isOneOf(HARVEST_TIERS, minTier)) {
      return yield* failure('type', `unknown block property harvestTool tier ${String(minTier)}`)
    }
    return { category, minTier }
  })

const validateDropRule = (value: unknown): Result.Result<BlockDropRule, BlockPropertyFailure> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* failure('type', 'block property drops must be an object')
    }
    yield* assertKnownKeys(
      value,
      ['item', 'silkTouchItem', 'count', 'requiresSilkTouch', 'affectedByFortune'],
      'block property drops field',
    )

    const item = value['item']
    if (item !== 'self' && !isItemType(item)) {
      return yield* failure('type', 'block property drops item must be a registered ItemType or self')
    }
    const silkTouchItem = value['silkTouchItem']
    if (silkTouchItem !== undefined && !isItemType(silkTouchItem)) {
      return yield* failure('type', 'block property drops silkTouchItem must be a registered ItemType')
    }
    const count = value['count']
    if (typeof count !== 'number') {
      return yield* failure(
        'range',
        `block property drops count must be an integer in [1, ${MAX_STACK_COUNT}]`,
      )
    }
    const requiresSilkTouch = yield* assertBoolean(
      'block property drops requiresSilkTouch',
      value['requiresSilkTouch'],
    )
    const affectedByFortune = yield* assertBoolean(
      'block property drops affectedByFortune',
      value['affectedByFortune'],
    )
    const stackCount = yield* brandedProperty(StackCount.result(count), 'drops.count')
    return {
      item,
      ...(silkTouchItem === undefined ? {} : { silkTouchItem }),
      count: stackCount,
      requiresSilkTouch,
      affectedByFortune,
    }
  })

const validateSupportRule = (value: unknown): Result.Result<SupportRule, BlockPropertyFailure> => {
  try {
    return Result.gen(function* () {
      if (!isRecord(value)) {
        return yield* failure('type', 'block property supportRule must be an object')
      }

      const kind = value['kind']
      if (kind === 'none' || kind === 'anySupporting') {
        yield* assertKnownKeys(value, ['kind'], 'block property supportRule field')
        return { kind }
      }

      if (kind === 'oneOf') {
        yield* assertKnownKeys(value, ['kind', 'blocks'], 'block property supportRule field')
        const values = value['blocks']
        if (!Array.isArray(values)) {
          return yield* failure('range', 'block property supportRule blocks must contain at least one block')
        }
        const length = values.length
        if (!Number.isSafeInteger(length) || length === 0) {
          return yield* failure('range', 'block property supportRule blocks must contain at least one block')
        }
        const blocks: Array<BlockType> = []
        for (let index = 0; index < length; index += 1) {
          const block = values[index]
          if (!isBlockType(block)) {
            return yield* failure('type', 'block property supportRule contains an unknown block type')
          }
          blocks.push(block)
        }
        return { kind, blocks }
      }

      return yield* failure('type', `unknown block property supportRule kind ${String(kind)}`)
    })
  } catch {
    return failure('type', 'block property supportRule must be readable')
  }
}

type CategoricalBlockPropertyOverrides = Pick<
  BlockPropertyOverrides,
  'opacity' | 'fluid' | 'collisionShape' | 'renderKind' | 'footstepMaterial' | 'railKind'
> & { readonly lightEmission?: number }

type RawNumericBlockPropertyOverrides = {
  readonly lightEmission?: number
  readonly hardness?: number
  readonly friction?: number
  readonly blastResistance?: number
  readonly contactDamage?: number
  readonly movementDrag?: number
  readonly xpOnBreak?: number
}

type StructuredBlockPropertyOverrides = Pick<BlockPropertyOverrides, 'harvestTool' | 'drops' | 'supportRule'>

type ValidatedBlockPropertyOverrides = CategoricalBlockPropertyOverrides &
  RawNumericBlockPropertyOverrides &
  StructuredBlockPropertyOverrides

const validateCategoricalProperties = (
  overrides: Record<string, unknown>,
): Result.Result<CategoricalBlockPropertyOverrides, BlockPropertyFailure> =>
  Result.gen(function* () {
    const opacity = yield* validateCategoricalValue(BLOCK_OPACITIES, overrides['opacity'], 'opacity')
    const lightEmission = overrides['lightEmission']
    if (lightEmission !== undefined && !isLightLevel(lightEmission)) {
      return yield* failure(
        'range',
        `LightLevel must be an integer in [${LIGHT_LEVEL_MIN}, ${LIGHT_LEVEL_MAX}], received ${lightEmission}`,
      )
    }
    const fluid = yield* validateCategoricalValue(FLUID_KINDS, overrides['fluid'], 'fluid')
    const collisionShape = yield* validateCategoricalValue(
      COLLISION_SHAPES,
      overrides['collisionShape'],
      'collisionShape',
    )
    const renderKind = yield* validateCategoricalValue(RENDER_KINDS, overrides['renderKind'], 'renderKind')
    const footstepMaterial = yield* validateCategoricalValue(
      FOOTSTEP_MATERIALS,
      overrides['footstepMaterial'],
      'footstepMaterial',
    )
    const railKind = yield* validateCategoricalValue(RAIL_KINDS, overrides['railKind'], 'railKind')
    return {
      ...(opacity === undefined ? {} : { opacity }),
      ...(lightEmission === undefined ? {} : { lightEmission }),
      ...(fluid === undefined ? {} : { fluid }),
      ...(collisionShape === undefined ? {} : { collisionShape }),
      ...(renderKind === undefined ? {} : { renderKind }),
      ...(footstepMaterial === undefined ? {} : { footstepMaterial }),
      ...(railKind === undefined ? {} : { railKind }),
    }
  })

const validateFriction = (value: number): Result.Result<void, BlockPropertyFailure> => {
  if (value < 0 || value > 1) {
    return failure('range', 'block property friction must be a finite number in [0, 1]')
  }
  return Result.succeed(undefined)
}

const validateNumericProperties = (
  overrides: Record<string, unknown>,
): Result.Result<RawNumericBlockPropertyOverrides, BlockPropertyFailure> =>
  Result.gen(function* () {
    const hardnessInput = overrides['hardness']
    const hardness = hardnessInput === undefined ? undefined : yield* assertHardness(hardnessInput)
    const frictionInput = overrides['friction']
    const friction = frictionInput === undefined
      ? undefined
      : yield* assertFiniteNonNegative('block property friction', frictionInput)
    const frictionValidation = friction === undefined ? Result.succeed(undefined) : validateFriction(friction)
    yield* frictionValidation
    const blastResistanceInput = overrides['blastResistance']
    const blastResistance = blastResistanceInput === undefined
      ? undefined
      : yield* assertBlastResistance(blastResistanceInput)
    const contactDamageInput = overrides['contactDamage']
    const contactDamage = contactDamageInput === undefined
      ? undefined
      : yield* assertFiniteNonNegative('block property contactDamage', contactDamageInput)
    const movementDragInput = overrides['movementDrag']
    const movementDrag = movementDragInput === undefined
      ? undefined
      : yield* assertFiniteNonNegative('block property movementDrag', movementDragInput)
    const xpOnBreakInput = overrides['xpOnBreak']
    const xpOnBreak = xpOnBreakInput === undefined
      ? undefined
      : yield* assertFiniteNonNegative('block property xpOnBreak', xpOnBreakInput)
    return {
      ...(hardness === undefined ? {} : { hardness }),
      ...(friction === undefined ? {} : { friction }),
      ...(blastResistance === undefined ? {} : { blastResistance }),
      ...(contactDamage === undefined ? {} : { contactDamage }),
      ...(movementDrag === undefined ? {} : { movementDrag }),
      ...(xpOnBreak === undefined ? {} : { xpOnBreak }),
    }
  })

const validateStructuredProperties = (
  overrides: Record<string, unknown>,
): Result.Result<StructuredBlockPropertyOverrides, BlockPropertyFailure> =>
  Result.gen(function* () {
    const harvestToolInput = overrides['harvestTool']
    const harvestTool = harvestToolInput === undefined
      ? undefined
      : yield* validateHarvestToolRequirement(harvestToolInput)
    const hasDrops = Object.hasOwn(overrides, 'drops')
    const dropsInput = overrides['drops']
    const drops = dropsInput === undefined ? undefined : yield* validateDropRule(dropsInput)
    const supportRuleInput = overrides['supportRule']
    const supportRule = supportRuleInput === undefined
      ? undefined
      : yield* validateSupportRule(supportRuleInput)
    return {
      ...(harvestTool === undefined ? {} : { harvestTool }),
      ...(hasDrops ? { drops } : {}),
      ...(supportRule === undefined ? {} : { supportRule }),
    }
  })

function validateBlockPropertyOverrides(
  overrides: unknown,
): Result.Result<ValidatedBlockPropertyOverrides, BlockPropertyFailure> {
  const snapshot = snapshotInputValue(overrides, MAX_GENERIC_INPUT_ARRAY_LENGTH, 'block property overrides')
  if (Result.isFailure(snapshot)) {
    const reason = snapshot.failure.reason === 'too-large' ? 'range' : 'type'
    const message = snapshot.failure.reason === 'hostile-input'
      ? snapshot.failure.path?.startsWith('block property overrides.supportRule')
        ? 'block property supportRule must be readable'
        : 'block property overrides must be readable'
      : snapshot.failure.reason === 'too-large'
        ? 'block property overrides exceed input limits'
        : 'block property overrides must be an object'
    return failure(reason, message)
  }
  const copiedOverrides = snapshot.success
  try {
    if (!isRecord(copiedOverrides)) {
      return failure('type', 'block property overrides must be an object')
    }
    return Result.gen(function* () {
      yield* assertKnownKeys(copiedOverrides, BLOCK_PROPERTY_NAMES, 'block property')
      const categorical = yield* validateCategoricalProperties(copiedOverrides)
      const numeric = yield* validateNumericProperties(copiedOverrides)
      const structured = yield* validateStructuredProperties(copiedOverrides)
      return { ...categorical, ...numeric, ...structured }
    })
  } catch {
    return failure('type', 'block property overrides must be readable')
  }
}

/** Validate external or table data and brand its numeric property values. */
export const normalizeBlockPropertyOverrides = (
  overrides: unknown,
): Result.Result<BlockPropertyOverrides, BlockPropertyFailure> =>
  Result.flatMap(validateBlockPropertyOverrides(overrides), (validated) => Result.gen(function* () {
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

    const brandedLightEmission = lightEmission === undefined
      ? undefined
      : yield* brandedProperty(LightLevel.result(lightEmission), 'lightEmission')
    const brandedHardness = hardness === undefined
      ? undefined
      : yield* brandedProperty(BlockHardness.result(hardness), 'hardness')
    const brandedFriction = friction === undefined
      ? undefined
      : yield* brandedProperty(BlockFriction.result(friction), 'friction')
    const brandedBlastResistance = blastResistance === undefined
      ? undefined
      : yield* brandedProperty(BlockBlastResistance.result(blastResistance), 'blastResistance')
    const brandedContactDamage = contactDamage === undefined
      ? undefined
      : yield* brandedProperty(BlockContactDamage.result(contactDamage), 'contactDamage')
    const brandedMovementDrag = movementDrag === undefined
      ? undefined
      : yield* brandedProperty(BlockMovementDrag.result(movementDrag), 'movementDrag')
    const brandedXpOnBreak = xpOnBreak === undefined
      ? undefined
      : yield* brandedProperty(BlockExperiencePoints.result(xpOnBreak), 'xpOnBreak')

    return {
      ...otherOverrides,
      ...(brandedLightEmission === undefined ? {} : { lightEmission: brandedLightEmission }),
      ...(brandedHardness === undefined ? {} : { hardness: brandedHardness }),
      ...(brandedFriction === undefined ? {} : { friction: brandedFriction }),
      ...(brandedBlastResistance === undefined ? {} : { blastResistance: brandedBlastResistance }),
      ...(brandedContactDamage === undefined ? {} : { contactDamage: brandedContactDamage }),
      ...(brandedMovementDrag === undefined ? {} : { movementDrag: brandedMovementDrag }),
      ...(brandedXpOnBreak === undefined ? {} : { xpOnBreak: brandedXpOnBreak }),
    }
  }))

/** Fill in defaults for every property the overrides do not mention. */
export const resolveBlockProperties = (
  overrides: BlockPropertyOverrides,
): Result.Result<BlockProperties, BlockPropertyFailure> =>
  Result.map(normalizeBlockPropertyOverrides(overrides), (validated) => ({
    ...BLOCK_PROPERTY_DEFAULTS,
    ...validated,
    lightEmission: validated.lightEmission ?? BLOCK_PROPERTY_DEFAULTS.lightEmission,
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
      lightEmission: validated.lightEmission ?? BLOCK_PROPERTY_DEFAULTS.lightEmission,
    }
    return resolved[name]
  })
}

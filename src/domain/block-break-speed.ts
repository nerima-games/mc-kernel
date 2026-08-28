import { DEFAULT_MINING_SPEED, TOOL_BREAK_SPEED } from './block-break-speed-data.js'
import { UNBREAKABLE_HARDNESS } from './block-property-data.js'
import { blockIdOf, propertyOfBlockId } from './block-registry.js'
import type { BlockType } from './block-type.js'
import type { ItemType } from './item-type.js'

const EFFICIENCY_BONUS_BASE = 1
const HARDNESS_TO_BREAK_TICKS = 3

export { DEFAULT_MINING_SPEED, TOOL_BREAK_SPEED } from './block-break-speed-data.js'

export type BreakTicksInput = {
  /** Whether the resolved tool rule allows the block's normal drops. */
  readonly correctForDrops: boolean
  readonly efficiencyLevel?: number
  readonly hardness: number
  /** The speed already resolved from the applicable tool rule. */
  readonly miningSpeed: number
  /** The player's `block_break_speed` multiplier. */
  readonly playerBreakSpeed?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function assertFinite(name: string, value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite, received ${value}`)
  }
}

function assertPositive(name: string, value: unknown): asserts value is number {
  assertFinite(name, value)
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero, received ${value}`)
  }
}

function assertNonNegative(name: string, value: unknown): asserts value is number {
  assertFinite(name, value)
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative, received ${value}`)
  }
}

function assertBoolean(name: string, value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name} must be boolean, received ${String(value)}`)
  }
}

function assertHardness(value: unknown): asserts value is number {
  assertFinite('hardness', value)
  if (value < UNBREAKABLE_HARDNESS) {
    throw new RangeError(`hardness must be -1 or greater, received ${value}`)
  }
}

export const miningSpeedOf = (tool?: ItemType): number =>
  tool === undefined ? DEFAULT_MINING_SPEED : TOOL_BREAK_SPEED[tool] ?? DEFAULT_MINING_SPEED

export function computeBreakTicks(input: BreakTicksInput): number
export function computeBreakTicks(input: BreakTicksInput): number {
  if (!isRecord(input)) {
    throw new TypeError('break ticks input must be an object')
  }

  const correctForDrops = input['correctForDrops']
  const efficiencyValue = input['efficiencyLevel']
  const hardness = input['hardness']
  const miningSpeed = input['miningSpeed']
  const playerBreakSpeed =
    input['playerBreakSpeed'] === undefined ? 1 : input['playerBreakSpeed']

  assertBoolean('correctForDrops', correctForDrops)
  assertHardness(hardness)
  assertNonNegative('miningSpeed', miningSpeed)
  assertPositive('playerBreakSpeed', playerBreakSpeed)

  let efficiencyLevel: number | undefined
  if (efficiencyValue !== undefined) {
    if (
      typeof efficiencyValue !== 'number' ||
      !Number.isInteger(efficiencyValue) ||
      efficiencyValue < 0
    ) {
      throw new RangeError(`efficiencyLevel must be a non-negative integer, received ${efficiencyValue}`)
    }
    efficiencyLevel = efficiencyValue
  }

  if (hardness === UNBREAKABLE_HARDNESS) {
    return Number.POSITIVE_INFINITY
  }

  if (hardness === 0) {
    return 0
  }

  const efficiencyBonus =
    correctForDrops && efficiencyLevel !== undefined
      ? efficiencyLevel * efficiencyLevel + EFFICIENCY_BONUS_BASE
      : 0
  const effectiveSpeed = (miningSpeed + efficiencyBonus) * playerBreakSpeed
  assertNonNegative('effective mining speed', effectiveSpeed)
  if (effectiveSpeed === 0) {
    return Number.POSITIVE_INFINITY
  }

  return Math.ceil((hardness * HARDNESS_TO_BREAK_TICKS) / effectiveSpeed)
}

export const blockHardnessOf = (blockType: BlockType): number =>
  propertyOfBlockId(blockIdOf(blockType), 'hardness')

import { TOOL_BREAK_SPEED } from './block-break-speed-data.js'
import { blockIdOf, propertyOfBlockId } from './block-registry.js'
import type { BlockType } from './block-type.js'
import type { ItemType } from './item-type.js'

export const DEFAULT_MINING_SPEED = 1
const EFFICIENCY_BONUS_BASE = 1
const HARDNESS_TO_BREAK_TICKS = 3

export { TOOL_BREAK_SPEED } from './block-break-speed-data.js'

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

const assertFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite, received ${value}`)
  }
}

const assertPositive = (name: string, value: number): void => {
  assertFinite(name, value)
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero, received ${value}`)
  }
}

export const miningSpeedOf = (tool?: ItemType): number =>
  tool === undefined ? DEFAULT_MINING_SPEED : TOOL_BREAK_SPEED[tool] ?? DEFAULT_MINING_SPEED

export const computeBreakTicks = ({
  correctForDrops,
  efficiencyLevel,
  hardness,
  miningSpeed,
  playerBreakSpeed = 1,
}: BreakTicksInput): number => {
  assertFinite('hardness', hardness)
  assertPositive('miningSpeed', miningSpeed)
  assertPositive('playerBreakSpeed', playerBreakSpeed)

  if (efficiencyLevel !== undefined) {
    if (!Number.isInteger(efficiencyLevel) || efficiencyLevel < 0) {
      throw new RangeError(`efficiencyLevel must be a non-negative integer, received ${efficiencyLevel}`)
    }
  }

  if (hardness <= 0) {
    return 0
  }

  const efficiencyBonus =
    correctForDrops && efficiencyLevel !== undefined
      ? efficiencyLevel * efficiencyLevel + EFFICIENCY_BONUS_BASE
      : 0
  const effectiveSpeed = (miningSpeed + efficiencyBonus) * playerBreakSpeed
  assertPositive('effective mining speed', effectiveSpeed)

  return Math.ceil((hardness * HARDNESS_TO_BREAK_TICKS) / effectiveSpeed)
}

export const blockHardnessOf = (blockType: BlockType): number =>
  propertyOfBlockId(blockIdOf(blockType), 'hardness')

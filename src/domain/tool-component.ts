import { DEFAULT_MINING_SPEED } from './block-break-speed.js'
import { isBlockType, type BlockType } from './block-type.js'

export type ToolRule = {
  readonly blocks: ReadonlyArray<BlockType>
  readonly speed?: number
  readonly correctForDrops?: boolean
}

export type ToolComponent = {
  readonly rules: ReadonlyArray<ToolRule>
  readonly defaultMiningSpeed?: number
  readonly damagePerBlock: number
}

export type ResolvedToolMiningProperties = {
  readonly miningSpeed: number
  readonly correctForDrops: boolean
  readonly damagePerBlock: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertPositive = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero`)
  }
}

const assertNonNegativeInteger = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`)
  }
}

const validateToolComponent = (component: ToolComponent): void => {
  if (!isRecord(component)) {
    throw new TypeError('tool component must be an object')
  }

  if (!Array.isArray(component.rules)) {
    throw new TypeError('tool component rules must be an array')
  }

  if (component.defaultMiningSpeed !== undefined) {
    assertPositive('tool component defaultMiningSpeed', component.defaultMiningSpeed)
  }

  assertNonNegativeInteger('tool component damagePerBlock', component.damagePerBlock)

  component.rules.forEach((rule: ToolRule, index) => {
    if (!isRecord(rule)) {
      throw new TypeError(`tool rule ${index} must be an object`)
    }

    if (!Array.isArray(rule.blocks) || rule.blocks.length === 0) {
      throw new RangeError(`tool rule ${index} must contain at least one block`)
    }

    rule.blocks.forEach((block: unknown) => {
      if (!isBlockType(block)) {
        throw new RangeError(`tool rule ${index} contains an unknown block type`)
      }
    })

    if (rule.speed !== undefined) {
      assertPositive(`tool rule ${index} speed`, rule.speed)
    }

    if (rule.correctForDrops !== undefined && typeof rule.correctForDrops !== 'boolean') {
      throw new TypeError(`tool rule ${index} correctForDrops must be a boolean`)
    }
  })
}

export const resolveToolMiningProperties = (
  component: ToolComponent,
  block: BlockType,
): ResolvedToolMiningProperties => {
  if (!isBlockType(block)) {
    throw new RangeError('block must be a known block type')
  }

  validateToolComponent(component)

  const defaultMiningSpeed = component.defaultMiningSpeed ?? DEFAULT_MINING_SPEED
  const matchingRule = component.rules.find((rule) => rule.blocks.includes(block))

  return {
    miningSpeed: matchingRule?.speed ?? defaultMiningSpeed,
    correctForDrops: matchingRule?.correctForDrops ?? false,
    damagePerBlock: component.damagePerBlock,
  }
}

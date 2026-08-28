import { DEFAULT_MINING_SPEED } from './block-break-speed-data.js'
import { isBlockType, type BlockType } from './block-type.js'

export type ToolBlockTag = `#${string}`

export type ToolBlockMatcher = BlockType | ToolBlockTag

export type BlockTagMemberships = ReadonlyMap<ToolBlockTag, ReadonlySet<BlockType>>

export type ToolResolutionContext = {
  readonly blockTags: BlockTagMemberships
}

export type ToolBlockMembershipLike = {
  readonly has: (block: BlockType) => boolean
  readonly [Symbol.iterator]: () => Iterator<BlockType>
}

export type ToolBlockTagMembershipsLike = {
  readonly get: (tag: ToolBlockTag) => ToolBlockMembershipLike | undefined
  readonly [Symbol.iterator]: () => Iterator<readonly [ToolBlockTag, ToolBlockMembershipLike]>
}

export type ToolResolutionContextInput = {
  readonly blockTags: ToolBlockTagMembershipsLike
}

export type ToolRule = {
  readonly blocks: ToolBlockMatcher | ReadonlyArray<ToolBlockMatcher>
  readonly speed?: number
  readonly correctForDrops?: boolean
}

export type ToolComponent = {
  readonly rules: ReadonlyArray<ToolRule>
  readonly defaultMiningSpeed?: number
  readonly damagePerBlock: number
  readonly canDestroyBlocksInCreative?: boolean
}

const COMPILED_TOOL_COMPONENT: unique symbol = Symbol('CompiledToolComponent')
const COMPILED_TOOL_COMPONENT_INDEXES: unique symbol = Symbol('CompiledToolComponentIndexes')

type CompiledToolRule = {
  readonly blockTypes: ReadonlyArray<BlockType>
  readonly blockTags: ReadonlyArray<ToolBlockTag>
  readonly speed?: number
  readonly correctForDrops?: boolean
}

type IndexedCompiledToolRule = {
  readonly rule: CompiledToolRule
  readonly order: number
}

type CompiledToolIndexes = {
  readonly blockTypes: ReadonlyMap<BlockType, IndexedCompiledToolRule>
  readonly blockTags: ReadonlyMap<ToolBlockTag, IndexedCompiledToolRule>
}

export type CompiledToolComponent = {
  readonly [COMPILED_TOOL_COMPONENT]: true
  readonly [COMPILED_TOOL_COMPONENT_INDEXES]: CompiledToolIndexes
  readonly rules: ReadonlyArray<CompiledToolRule>
  readonly defaultMiningSpeed: number
  readonly damagePerBlock: number
  readonly canDestroyBlocksInCreative: boolean
  readonly hasTagRule: boolean
}

export type ResolvedToolMiningProperties = {
  readonly miningSpeed: number
  readonly correctForDrops: boolean
  readonly damagePerBlock: number
  readonly canDestroyBlocksInCreative: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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

const isIterable = (value: unknown): value is Iterable<unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return typeof Reflect.get(value, Symbol.iterator) === 'function'
}

const isReadonlySet = (value: unknown): value is ReadonlySet<unknown> => {
  if (!isIterable(value)) {
    return false
  }
  return typeof Reflect.get(value, 'has') === 'function'
}

const isReadonlyMap = (value: unknown): value is ReadonlyMap<unknown, unknown> => {
  if (!isIterable(value)) {
    return false
  }
  return typeof Reflect.get(value, 'get') === 'function'
}

const assertNonNegativeFinite = (name: string, value: unknown): void => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to zero`)
  }
}

const assertNonNegativeInteger = (name: string, value: unknown): void => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`)
  }
}

const isToolBlockTag = (value: unknown): value is ToolBlockTag =>
  typeof value === 'string' && value.startsWith('#') && value.length > 1 && !/\s/u.test(value)

const isToolBlockMatcher = (value: unknown): value is ToolBlockMatcher =>
  isBlockType(value) || isToolBlockTag(value)

const COMPILED_TOOL_COMPONENTS = new WeakSet<object>()

const isCompiledToolComponent = (value: unknown): value is CompiledToolComponent =>
  isRecord(value) && COMPILED_TOOL_COMPONENTS.has(value)

const isToolBlockMatcherArray = (
  value: ToolRule['blocks'],
): value is ReadonlyArray<ToolBlockMatcher> => Array.isArray(value)

const normalizeToolRuleBlocks = (
  blocks: ToolRule['blocks'],
): ReadonlyArray<ToolBlockMatcher> =>
  isToolBlockMatcherArray(blocks)
    ? blocks
    : [blocks]

const assertBlockTagMemberships = (value: unknown): void => {
  if (!isReadonlyMap(value)) {
    throw new TypeError('tool resolution blockTags must be a Map or Map-like iterable')
  }

  for (const [tag, blocks] of value) {
    if (!isToolBlockTag(tag)) {
      throw new RangeError(`tool resolution blockTags contains an invalid tag ${String(tag)}`)
    }
    if (!isReadonlySet(blocks)) {
      throw new TypeError(`tool resolution blockTags ${tag} must contain a Set or Set-like iterable`)
    }
    for (const block of blocks) {
      if (!isBlockType(block)) {
        throw new RangeError(`tool resolution blockTags ${tag} contains an unknown block type`)
      }
    }
  }
}

function validateToolResolutionContext(context: unknown): asserts context is ToolResolutionContextInput {
  if (!isRecord(context)) {
    throw new TypeError('tool resolution context must be an object')
  }

  assertKnownKeys(context, ['blockTags'], 'tool resolution context field')
  assertBlockTagMemberships(context['blockTags'])
}

function validateToolComponent(component: unknown): asserts component is ToolComponent {
  if (!isRecord(component)) {
    throw new TypeError('tool component must be an object')
  }

  assertKnownKeys(
    component,
    ['rules', 'defaultMiningSpeed', 'damagePerBlock', 'canDestroyBlocksInCreative'],
    'tool component field',
  )

  const rules = component['rules']
  if (!Array.isArray(rules)) {
    throw new TypeError('tool component rules must be an array')
  }

  const defaultMiningSpeed = component['defaultMiningSpeed']
  if (defaultMiningSpeed !== undefined) {
    assertNonNegativeFinite('tool component defaultMiningSpeed', defaultMiningSpeed)
  }

  assertNonNegativeInteger('tool component damagePerBlock', component['damagePerBlock'])

  const canDestroyBlocksInCreative = component['canDestroyBlocksInCreative']
  if (
    canDestroyBlocksInCreative !== undefined &&
    typeof canDestroyBlocksInCreative !== 'boolean'
  ) {
    throw new TypeError('tool component canDestroyBlocksInCreative must be a boolean')
  }

  rules.forEach((rule: unknown, index) => {
    if (!isRecord(rule)) {
      throw new TypeError(`tool rule ${index} must be an object`)
    }

    assertKnownKeys(rule, ['blocks', 'speed', 'correctForDrops'], `tool rule ${index} field`)

    const blocks = rule['blocks']
    if (blocks === undefined || (Array.isArray(blocks) && blocks.length === 0)) {
      throw new RangeError(`tool rule ${index} must contain at least one block`)
    }

    if (Array.isArray(blocks)) {
      blocks.forEach((block) => {
        if (!isToolBlockMatcher(block)) {
          throw new RangeError(`tool rule ${index} contains an unknown block or block tag`)
        }
      })
    } else if (!isToolBlockMatcher(blocks)) {
      throw new RangeError(`tool rule ${index} must contain a block or block tag`)
    }

    const speed = rule['speed']
    if (speed !== undefined) {
      assertNonNegativeFinite(`tool rule ${index} speed`, speed)
    }

    const correctForDrops = rule['correctForDrops']
    if (correctForDrops !== undefined && typeof correctForDrops !== 'boolean') {
      throw new TypeError(`tool rule ${index} correctForDrops must be a boolean`)
    }
  })
}

export const isToolComponent = (value: unknown): value is ToolComponent => {
  try {
    validateToolComponent(value)
    return true
  } catch {
    return false
  }
}

const compileToolRule = (rule: ToolRule): CompiledToolRule =>
  (() => {
    const blocks = normalizeToolRuleBlocks(rule.blocks)
    return Object.freeze({
      blockTypes: Object.freeze(blocks.filter(isBlockType)),
      blockTags: Object.freeze(blocks.filter(isToolBlockTag)),
      ...(rule.speed === undefined ? {} : { speed: rule.speed }),
      ...(rule.correctForDrops === undefined ? {} : { correctForDrops: rule.correctForDrops }),
    })
  })()

const indexCompiledToolRules = (
  rules: ReadonlyArray<CompiledToolRule>,
): CompiledToolIndexes => {
  const blockTypes = new Map<BlockType, IndexedCompiledToolRule>()
  const blockTags = new Map<ToolBlockTag, IndexedCompiledToolRule>()

  rules.forEach((rule, order) => {
    const indexedRule = Object.freeze({ rule, order })
    for (const blockType of rule.blockTypes) {
      if (!blockTypes.has(blockType)) {
        blockTypes.set(blockType, indexedRule)
      }
    }
    for (const blockTag of rule.blockTags) {
      if (!blockTags.has(blockTag)) {
        blockTags.set(blockTag, indexedRule)
      }
    }
  })

  return Object.freeze({ blockTypes, blockTags })
}

export function compileToolComponent(component: ToolComponent): CompiledToolComponent {
  validateToolComponent(component)

  const rules = Object.freeze(component.rules.map(compileToolRule))
  const indexes = indexCompiledToolRules(rules)
  const compiled: CompiledToolComponent = Object.freeze<CompiledToolComponent>({
    [COMPILED_TOOL_COMPONENT]: true,
    [COMPILED_TOOL_COMPONENT_INDEXES]: indexes,
    rules,
    defaultMiningSpeed: component.defaultMiningSpeed ?? DEFAULT_MINING_SPEED,
    damagePerBlock: component.damagePerBlock,
    canDestroyBlocksInCreative: component.canDestroyBlocksInCreative ?? true,
    hasTagRule: indexes.blockTags.size > 0,
  })

  COMPILED_TOOL_COMPONENTS.add(compiled)
  return compiled
}

const resolveCompiledToolMiningProperties = (
  component: CompiledToolComponent,
  block: BlockType,
  context?: ToolResolutionContextInput,
): ResolvedToolMiningProperties => {
  if (component.hasTagRule && context === undefined) {
    throw new TypeError('tool resolution context with blockTags is required for tag rules')
  }
  if (context !== undefined) {
    validateToolResolutionContext(context)
  }

  const indexes = component[COMPILED_TOOL_COMPONENT_INDEXES]

  let matchingRule = indexes.blockTypes.get(block)
  if (context !== undefined) {
    for (const [tag, candidate] of indexes.blockTags) {
      if (
        context.blockTags.get(tag)?.has(block) === true &&
        (matchingRule === undefined || candidate.order < matchingRule.order)
      ) {
        matchingRule = candidate
      }
    }
  }

  return {
    miningSpeed: matchingRule?.rule.speed ?? component.defaultMiningSpeed,
    correctForDrops: matchingRule?.rule.correctForDrops ?? false,
    damagePerBlock: component.damagePerBlock,
    canDestroyBlocksInCreative: component.canDestroyBlocksInCreative,
  }
}

export function resolveToolMiningProperties(
  component: ToolComponent | CompiledToolComponent,
  block: BlockType,
  context?: ToolResolutionContextInput,
): ResolvedToolMiningProperties {
  if (!isBlockType(block)) {
    throw new RangeError('block must be a known block type')
  }

  if (isCompiledToolComponent(component)) {
    if (context !== undefined) {
      validateToolResolutionContext(context)
    }
    return resolveCompiledToolMiningProperties(component, block, context)
  }

  validateToolComponent(component)

  const hasTagRule = component.rules.some((rule) =>
    normalizeToolRuleBlocks(rule.blocks).some((matcher) => isToolBlockTag(matcher)),
  )
  if (hasTagRule && context === undefined) {
    throw new TypeError('tool resolution context with blockTags is required for tag rules')
  }
  if (context !== undefined) {
    validateToolResolutionContext(context)
  }

  const defaultMiningSpeed = component.defaultMiningSpeed ?? DEFAULT_MINING_SPEED
  const matchingRule = component.rules.find((rule) =>
    normalizeToolRuleBlocks(rule.blocks).some((matcher) =>
      isBlockType(matcher)
        ? matcher === block
        : context?.blockTags.get(matcher)?.has(block) ?? false,
    ),
  )

  return {
    miningSpeed: matchingRule?.speed ?? defaultMiningSpeed,
    correctForDrops: matchingRule?.correctForDrops ?? false,
    damagePerBlock: component.damagePerBlock,
    canDestroyBlocksInCreative: component.canDestroyBlocksInCreative ?? true,
  }
}

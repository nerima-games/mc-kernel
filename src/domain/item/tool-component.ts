import { Effect, Result } from 'effect'
import { DEFAULT_MINING_SPEED } from '../block/block-break-speed-data.js'
import { isBlockType, type BlockType } from '../block/block-type.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'
import { ToolDurabilityDamage, ToolMiningSpeed, ToolRuleOrder } from './item-primitives.js'

export type ToolBlockTag = `#${string}`
export type ToolBlockMatcher = BlockType | ToolBlockTag
export type BlockTagMemberships = ReadonlyMap<ToolBlockTag, ReadonlySet<BlockType>>
export type ToolResolutionContext = { readonly blockTags: BlockTagMemberships }
export type ToolBlockMembershipLike = {
  readonly has: (block: BlockType) => boolean
  readonly [Symbol.iterator]: () => Iterator<BlockType>
}
export type ToolBlockTagMembershipsLike = {
  readonly get: (tag: ToolBlockTag) => ToolBlockMembershipLike | undefined
  readonly [Symbol.iterator]: () => Iterator<readonly [ToolBlockTag, ToolBlockMembershipLike]>
}
export type ToolResolutionContextInput = { readonly blockTags: ToolBlockTagMembershipsLike }
export type ToolRule = {
  readonly blocks: ToolBlockMatcher | ReadonlyArray<ToolBlockMatcher>
  readonly speed?: ToolMiningSpeed
  readonly correctForDrops?: boolean
}
export type ToolComponent = {
  readonly rules: ReadonlyArray<ToolRule>
  readonly defaultMiningSpeed?: ToolMiningSpeed
  readonly damagePerBlock: ToolDurabilityDamage
  readonly canDestroyBlocksInCreative?: boolean
}

const COMPILED_TOOL_COMPONENT: unique symbol = Symbol('CompiledToolComponent')
const COMPILED_TOOL_COMPONENT_INDEXES: unique symbol = Symbol('CompiledToolComponentIndexes')

type CompiledToolRule = {
  readonly blockTypes: ReadonlyArray<BlockType>
  readonly blockTags: ReadonlyArray<ToolBlockTag>
  readonly speed?: ToolMiningSpeed
  readonly correctForDrops?: boolean
}
type IndexedCompiledToolRule = {
  readonly rule: CompiledToolRule
  readonly order: ToolRuleOrder
}
type CompiledToolIndexes = {
  readonly blockTypes: ReadonlyMap<BlockType, IndexedCompiledToolRule>
  readonly blockTags: ReadonlyMap<ToolBlockTag, IndexedCompiledToolRule>
}

export type CompiledToolComponent = {
  readonly [COMPILED_TOOL_COMPONENT]: true
  readonly [COMPILED_TOOL_COMPONENT_INDEXES]: CompiledToolIndexes
  readonly rules: ReadonlyArray<CompiledToolRule>
  readonly defaultMiningSpeed: ToolMiningSpeed
  readonly damagePerBlock: ToolDurabilityDamage
  readonly canDestroyBlocksInCreative: boolean
  readonly hasTagRule: boolean
}
export type ResolvedToolMiningProperties = {
  readonly miningSpeed: ToolMiningSpeed
  readonly correctForDrops: boolean
  readonly damagePerBlock: ToolDurabilityDamage
  readonly canDestroyBlocksInCreative: boolean
}

type ToolResult<A> = Result.Result<A, ItemValidationFailure>

const failure = (
  field: string,
  message: string,
  value?: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  kind: ItemValidationFailure['kind'] = reason === 'out-of-range' ? 'RangeError' : 'TypeError',
): ItemValidationFailure => itemValidationFailure(field, message, reason, value, kind)

const capture = <A>(field: string, value: unknown, read: () => A): ToolResult<A> =>
  Effect.runSync(Effect.result(Effect.try({
    try: read,
    catch: () => failure(field, `Unable to inspect ${field}`, value, 'hostile-input'),
  })))

const isObject = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const isIterable = (value: unknown): value is Iterable<unknown> =>
  isObject(value) && Symbol.iterator in value

const readArray = (
  field: string,
  value: unknown,
): ToolResult<ReadonlyArray<unknown> | undefined> =>
  capture(field, value, () => Array.isArray(value) ? value : undefined)

const brandValue = <A, E extends Readonly<{ readonly message: string }>>(
  result: Result.Result<A, E>,
  field: string,
  message: string,
  value: unknown,
): ToolResult<A> => Result.mapError(result, () => failure(field, message, value, 'out-of-range'))

const isToolBlockTag = (value: unknown): value is ToolBlockTag =>
  typeof value === 'string' && value.startsWith('#') && value.length > 1 && !/\s/u.test(value)

const isToolBlockMatcher = (value: unknown): value is ToolBlockMatcher =>
  isBlockType(value) || isToolBlockTag(value)

const COMPILED_TOOL_COMPONENTS = new WeakSet<object>()

const isCompiledToolComponent = (value: unknown): value is CompiledToolComponent =>
  typeof value === 'object' && value !== null && COMPILED_TOOL_COMPONENTS.has(value)

const readRecord = (
  value: unknown,
  field: string,
  allowedKeys: ReadonlyArray<string>,
): ToolResult<Record<string, unknown>> => {
  if (typeof value !== 'object' || value === null) {
    return Result.fail(failure(field, `${field} must be an object`, value, 'invalid-type'))
  }
  const record = capture(field, value, () => {
    if (Array.isArray(value)) return undefined
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return undefined
    const keys = Object.keys(value)
    const copy: Record<string, unknown> = {}
    for (const key of keys) {
      if (!allowedKeys.includes(key)) return { invalidKey: key }
      Object.defineProperty(copy, key, { enumerable: true, value: Reflect.get(value, key) })
    }
    return copy
  })
  if (Result.isFailure(record)) return Result.fail(record.failure)
  if (record.success === undefined) {
    return Result.fail(failure(field, `${field} must be an object`, value, 'invalid-type'))
  }
  if ('invalidKey' in record.success) {
    const key = record.success['invalidKey']
    return Result.fail(failure(field, `unknown ${field} ${String(key)}`, key, 'invalid-value'))
  }
  return Result.succeed(record.success)
}

const readToolComponent = (value: unknown): ToolResult<ToolComponent> => Result.gen(function* () {
  const component = yield* readRecord(value, 'tool component', ['rules', 'defaultMiningSpeed', 'damagePerBlock', 'canDestroyBlocksInCreative'])
  const rulesValue = component['rules']
  const ruleEntries = yield* readArray('tool component rules', rulesValue)
  if (ruleEntries === undefined) return yield* Result.fail(failure('rules', 'tool component rules must be an array', rulesValue, 'invalid-type'))
  const rulesLength = yield* capture('tool component rules', rulesValue, () => ruleEntries.length)
  const rules: ToolRule[] = []
  for (let index = 0; index < rulesLength; index += 1) {
    const sourceRule = yield* capture(`tool rule ${index}`, rulesValue, () => ruleEntries[index])
    const rule = yield* readRecord(sourceRule, `tool rule ${index}`, ['blocks', 'speed', 'correctForDrops'])
    const blocks = rule['blocks']
    if (blocks === undefined) return yield* Result.fail(failure(`tool rule ${index}`, `tool rule ${index} must contain at least one block`, blocks, 'out-of-range'))
    const blockEntries = yield* readArray(`tool rule ${index} blocks`, blocks)
    let normalizedBlocks: ToolRule['blocks']
    if (blockEntries !== undefined) {
      const length = yield* capture(`tool rule ${index} blocks`, blocks, () => blockEntries.length)
      if (length === 0) return yield* Result.fail(failure(`tool rule ${index}`, `tool rule ${index} must contain at least one block`, blocks, 'out-of-range'))
      const entries: ToolBlockMatcher[] = []
      for (let blockIndex = 0; blockIndex < length; blockIndex += 1) {
        const block = yield* capture(`tool rule ${index} blocks[${blockIndex}]`, blocks, () => blockEntries[blockIndex])
        if (!isToolBlockMatcher(block)) return yield* Result.fail(failure(`tool rule ${index}`, `tool rule ${index} contains an unknown block or block tag`, block, 'out-of-range'))
        entries.push(block)
      }
      normalizedBlocks = Object.freeze(entries)
    } else {
      if (!isToolBlockMatcher(blocks)) return yield* Result.fail(failure(`tool rule ${index}`, `tool rule ${index} must contain a block or block tag`, blocks, 'out-of-range'))
      normalizedBlocks = blocks
    }
    const speed = rule['speed']
    if (speed !== undefined && typeof speed !== 'number') {
      return yield* Result.fail(failure(`tool rule ${index} speed`, `tool rule ${index} speed must be a finite number greater than or equal to zero`, speed, 'out-of-range'))
    }
    const checkedSpeed = speed === undefined
      ? undefined
      : yield* brandValue(
        ToolMiningSpeed.result(speed),
        `tool rule ${index} speed`,
        `tool rule ${index} speed must be a finite number greater than or equal to zero`,
        speed,
      )
    const correctForDrops = rule['correctForDrops']
    if (correctForDrops !== undefined && typeof correctForDrops !== 'boolean') {
      return yield* Result.fail(failure(`tool rule ${index}`, `tool rule ${index} correctForDrops must be a boolean`, correctForDrops, 'invalid-type'))
    }
    rules.push(Object.freeze({
      blocks: normalizedBlocks,
      ...(checkedSpeed === undefined ? {} : { speed: checkedSpeed }),
      ...(correctForDrops === undefined ? {} : { correctForDrops }),
    }))
  }
  const defaultMiningSpeed = component['defaultMiningSpeed']
  if (defaultMiningSpeed !== undefined && typeof defaultMiningSpeed !== 'number') {
    return yield* Result.fail(failure('defaultMiningSpeed', 'tool component defaultMiningSpeed must be a finite number greater than or equal to zero', defaultMiningSpeed, 'out-of-range'))
  }
  const checkedDefaultMiningSpeed = defaultMiningSpeed === undefined
    ? undefined
    : yield* brandValue(
      ToolMiningSpeed.result(defaultMiningSpeed),
      'defaultMiningSpeed',
      'tool component defaultMiningSpeed must be a finite number greater than or equal to zero',
      defaultMiningSpeed,
    )
  const damagePerBlock = component['damagePerBlock']
  if (typeof damagePerBlock !== 'number') {
    return yield* Result.fail(failure('damagePerBlock', 'tool component damagePerBlock must be a non-negative integer', damagePerBlock, 'out-of-range'))
  }
  const checkedDamagePerBlock = yield* brandValue(
    ToolDurabilityDamage.result(damagePerBlock),
    'damagePerBlock',
    'tool component damagePerBlock must be a non-negative integer',
    damagePerBlock,
  )
  const canDestroyBlocksInCreative = component['canDestroyBlocksInCreative']
  if (canDestroyBlocksInCreative !== undefined && typeof canDestroyBlocksInCreative !== 'boolean') {
    return yield* Result.fail(failure('canDestroyBlocksInCreative', 'tool component canDestroyBlocksInCreative must be a boolean', canDestroyBlocksInCreative, 'invalid-type'))
  }
  return Object.freeze({
    rules: Object.freeze(rules),
    ...(checkedDefaultMiningSpeed === undefined ? {} : { defaultMiningSpeed: checkedDefaultMiningSpeed }),
    damagePerBlock: checkedDamagePerBlock,
    ...(canDestroyBlocksInCreative === undefined ? {} : { canDestroyBlocksInCreative }),
  })
})

export const isToolComponent = (value: unknown): value is ToolComponent =>
  Result.isSuccess(readToolComponent(value))

const normalizeToolRuleBlocks = (blocks: ToolRule['blocks']): ReadonlyArray<ToolBlockMatcher> =>
  typeof blocks === 'string' ? [blocks] : blocks

const compileToolRule = (rule: ToolRule): CompiledToolRule => {
  const blocks = normalizeToolRuleBlocks(rule.blocks)
  return Object.freeze({
    blockTypes: Object.freeze(blocks.filter(isBlockType)),
    blockTags: Object.freeze(blocks.filter(isToolBlockTag)),
    ...(rule.speed === undefined ? {} : { speed: rule.speed }),
    ...(rule.correctForDrops === undefined ? {} : { correctForDrops: rule.correctForDrops }),
  })
}

const indexCompiledToolRules = (rules: ReadonlyArray<CompiledToolRule>): ToolResult<CompiledToolIndexes> => Result.gen(function* () {
  const blockTypes = new Map<BlockType, IndexedCompiledToolRule>()
  const blockTags = new Map<ToolBlockTag, IndexedCompiledToolRule>()
  for (const [index, rule] of rules.entries()) {
    const order = yield* brandValue(
      ToolRuleOrder.result(index),
      'rule order',
      `ToolRuleOrder must be a non-negative safe integer, received ${String(index)}`,
      index,
    )
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
  }
  return Object.freeze({ blockTypes, blockTags })
})

export const compileToolComponent = (component: ToolComponent): ToolResult<CompiledToolComponent> => Result.gen(function* () {
  const input = yield* readToolComponent(component)
  const rules = Object.freeze(input.rules.map(compileToolRule))
  const indexes = yield* indexCompiledToolRules(rules)
  const defaultMiningSpeed = input.defaultMiningSpeed ?? (yield* brandValue(
    ToolMiningSpeed.result(DEFAULT_MINING_SPEED),
    'defaultMiningSpeed',
    'tool component defaultMiningSpeed must be a finite number greater than or equal to zero',
    DEFAULT_MINING_SPEED,
  ))
  const compiled = Object.freeze<CompiledToolComponent>({
    [COMPILED_TOOL_COMPONENT]: true,
    [COMPILED_TOOL_COMPONENT_INDEXES]: indexes,
    rules,
    defaultMiningSpeed,
    damagePerBlock: input.damagePerBlock,
    canDestroyBlocksInCreative: input.canDestroyBlocksInCreative ?? true,
    hasTagRule: indexes.blockTags.size > 0,
  })
  COMPILED_TOOL_COMPONENTS.add(compiled)
  return compiled
})

const readResolutionContext = (context: unknown): ToolResult<ToolResolutionContext> => Result.gen(function* () {
  const record = yield* readRecord(context, 'tool resolution context', ['blockTags'])
  const blockTags = record['blockTags']
  const contextEntries = yield* capture('tool resolution blockTags', blockTags, () => {
    if (!isIterable(blockTags)) return undefined
    if (typeof Reflect.get(blockTags, 'get') !== 'function') return undefined
    return Array.from(blockTags)
  })
  if (contextEntries === undefined) return yield* Result.fail(failure('blockTags', 'tool resolution blockTags must be a Map or Map-like iterable', blockTags, 'invalid-type'))
  const memberships = new Map<ToolBlockTag, ReadonlySet<BlockType>>()
  for (const entry of contextEntries) {
    const pair = yield* capture('tool resolution blockTags entry', entry, () => {
      if (!isObject(entry)) return undefined
      return [Reflect.get(entry, '0'), Reflect.get(entry, '1')] as const
    })
    if (pair === undefined) return yield* Result.fail(failure('blockTags', 'tool resolution blockTags entries must be key/value pairs', entry, 'invalid-type'))
    const [tag, blocks] = pair
    if (!isToolBlockTag(tag)) return yield* Result.fail(failure('blockTags', `tool resolution blockTags contains an invalid tag ${String(tag)}`, tag, 'out-of-range'))
    const methods = yield* capture(`tool resolution blockTags ${tag}`, blocks, () => {
      if (!isObject(blocks)) return undefined
      return {
        iterator: Reflect.get(blocks, Symbol.iterator),
        has: Reflect.get(blocks, 'has'),
      }
    })
    if (methods === undefined) return yield* Result.fail(failure(`blockTags.${tag}`, `tool resolution blockTags ${tag} must contain a Set or Set-like iterable`, blocks, 'invalid-type'))
    if (typeof methods.iterator !== 'function' || typeof methods.has !== 'function') {
      return yield* Result.fail(failure(`blockTags.${tag}`, `tool resolution blockTags ${tag} must contain a Set or Set-like iterable`, blocks, 'invalid-type'))
    }
    const blockValues = yield* capture(`tool resolution blockTags ${tag}`, blocks, () => {
      if (!isIterable(blocks)) return undefined
      return Array.from(blocks)
    })
    if (blockValues === undefined) return yield* Result.fail(failure(`blockTags.${tag}`, `tool resolution blockTags ${tag} must contain a Set or Set-like iterable`, blocks, 'invalid-type'))
    const validBlocks = new Set<BlockType>()
    for (const block of blockValues) {
      if (!isBlockType(block)) return yield* Result.fail(failure(`blockTags.${tag}`, `tool resolution blockTags ${tag} contains an unknown block type`, block, 'out-of-range'))
      validBlocks.add(block)
    }
    memberships.set(tag, validBlocks)
  }
  return { blockTags: memberships }
})

const resultForBlock = (
  component: CompiledToolComponent,
  block: BlockType,
  context: ToolResolutionContext | undefined,
): ToolResult<ResolvedToolMiningProperties> => {
  if (component.hasTagRule && context === undefined) {
    return Result.fail(failure('context', 'tool resolution context with blockTags is required for tag rules', context, 'invalid-type'))
  }
  const indexes = component[COMPILED_TOOL_COMPONENT_INDEXES]
  let matchingRule = indexes.blockTypes.get(block)
  if (context !== undefined) {
    for (const [tag, candidate] of indexes.blockTags) {
      if (context.blockTags.get(tag)?.has(block) === true && (matchingRule === undefined || candidate.order < matchingRule.order)) {
        matchingRule = candidate
      }
    }
  }
  return Result.succeed({
    miningSpeed: matchingRule?.rule.speed ?? component.defaultMiningSpeed,
    correctForDrops: matchingRule?.rule.correctForDrops ?? false,
    damagePerBlock: component.damagePerBlock,
    canDestroyBlocksInCreative: component.canDestroyBlocksInCreative,
  })
}

export const resolveToolMiningProperties = (
  component: ToolComponent | CompiledToolComponent,
  block: BlockType,
  context?: ToolResolutionContextInput,
): ToolResult<ResolvedToolMiningProperties> => {
  if (!isBlockType(block)) return Result.fail(failure('block', 'block must be a known block type', block, 'out-of-range'))
  const parsedContext = context === undefined ? Result.succeed(undefined) : readResolutionContext(context)
  if (Result.isFailure(parsedContext)) return Result.fail(parsedContext.failure)
  if (isCompiledToolComponent(component)) return resultForBlock(component, block, parsedContext.success)
  return Result.flatMap(readToolComponent(component), (input) => {
    const compiled = compileToolComponent(input)
    return Result.flatMap(compiled, (value) => resultForBlock(value, block, parsedContext.success))
  })
}

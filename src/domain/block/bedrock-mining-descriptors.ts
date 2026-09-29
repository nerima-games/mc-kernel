import type {
  BedrockBlock,
  BedrockBlockDescriptor,
  BedrockBlockStateValue,
  BedrockBlockStates,
  BedrockItem,
  BedrockItemDescriptor,
  BedrockTagQueryOperator,
} from './bedrock-mining-data.js'

type RecordValue = Record<string, unknown>

const TAG_QUERY_PATTERN = /^\s*(?:query|q)\.(any_tag|all_tags)\s*\(\s*((?:'[^']+'|"[^"]+")(?:\s*,\s*(?:'[^']+'|"[^"]+"))*)\s*\)\s*$/

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertRecord = (value: unknown, name: string): RecordValue => {
  if (!isRecord(value)) {
    throw new TypeError(`${name} must be an object`)
  }
  return value
}

const assertKnownKeys = (value: RecordValue, keys: readonly string[], name: string): void => {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw new RangeError(`${name} contains unsupported property ${key}`)
    }
  }
}

const assertNonEmptyString = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`)
  }
  return value
}

function assertStateValue(value: unknown, name: string): asserts value is BedrockBlockStateValue {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new RangeError(`${name} must be an integer, string, or boolean`)
    }
    return
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return
  }
  throw new TypeError(`${name} must be an integer, string, or boolean`)
}

function assertNonNegativeFiniteNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to zero`)
  }
}

function assertNonNegativeInteger(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`)
  }
}

export type ParsedBedrockTagQuery = {
  readonly operator: BedrockTagQueryOperator
  readonly tags: readonly string[]
}

export const parseBedrockTagQuery = (query: unknown): ParsedBedrockTagQuery => {
  if (typeof query !== 'string') {
    throw new TypeError('Bedrock tag query must be a string')
  }

  const match = TAG_QUERY_PATTERN.exec(query)
  if (match === null) {
    throw new RangeError(`unsupported Bedrock tag query ${query}`)
  }

  const operatorText = match.slice(1, 2).join('')
  const argumentsText = match.slice(2, 3).join('')
  const operator: BedrockTagQueryOperator =
    operatorText === 'any_tag' ? 'any_tag' : 'all_tags'
  const tags = argumentsText.split(',').map((argument) => argument.trim().slice(1, -1))
  if (tags.some((tag) => tag.trim().length === 0 || tag !== tag.trim())) {
    throw new RangeError('Bedrock tag query arguments must be non-empty tag names')
  }
  return { operator, tags }
}

export function validateBedrockBlockDescriptor(value: unknown): asserts value is BedrockBlockDescriptor {
  if (typeof value === 'string') {
    assertNonEmptyString(value, 'Bedrock block descriptor')
    return
  }

  const descriptor = assertRecord(value, 'Bedrock block descriptor')
  assertKnownKeys(descriptor, ['name', 'states', 'tags'], 'Bedrock block descriptor')

  const name = descriptor['name']
  const states = descriptor['states']
  const tags = descriptor['tags']
  if (name === undefined && tags === undefined) {
    throw new RangeError('Bedrock block descriptor must define name or tags')
  }
  if (name !== undefined) {
    assertNonEmptyString(name, 'Bedrock block descriptor name')
  }
  if (tags !== undefined) {
    parseBedrockTagQuery(tags)
  }
  if (states !== undefined) {
    if (name === undefined) {
      throw new RangeError('Bedrock block descriptor states require a name')
    }
    const stateRecord = assertRecord(states, 'Bedrock block descriptor states')
    for (const [stateName, stateValue] of Object.entries(stateRecord)) {
      assertNonEmptyString(stateName, 'Bedrock block state name')
      assertStateValue(stateValue, `Bedrock block state ${stateName}`)
    }
  }
}

export function validateBedrockItemDescriptor(value: unknown): asserts value is BedrockItemDescriptor {
  if (typeof value === 'string') {
    assertNonEmptyString(value, 'Bedrock item descriptor')
    return
  }

  const descriptor = assertRecord(value, 'Bedrock item descriptor')
  assertKnownKeys(descriptor, ['tags'], 'Bedrock item descriptor')
  parseBedrockTagQuery(descriptor['tags'])
}

export const bedrockTagQueryMatches = (
  query: string,
  tags: ReadonlySet<string>,
): boolean => {
  const parsed = parseBedrockTagQuery(query)
  if (parsed.operator === 'any_tag') {
    return parsed.tags.some((tag) => tags.has(tag))
  }
  return parsed.tags.every((tag) => tags.has(tag))
}

export const bedrockBlockDescriptorMatches = (
  descriptor: BedrockBlockDescriptor,
  block: BedrockBlock,
): boolean => {
  validateBedrockBlockDescriptor(descriptor)
  if (typeof descriptor === 'string') {
    return descriptor === block.name
  }
  if (descriptor.name !== undefined && descriptor.name !== block.name) {
    return false
  }
  if (
    descriptor.states !== undefined &&
    !Object.entries(descriptor.states).every(([stateName, stateValue]) => block.states[stateName] === stateValue)
  ) {
    return false
  }
  return descriptor.tags === undefined || bedrockTagQueryMatches(descriptor.tags, block.tags)
}

export const bedrockItemDescriptorMatches = (
  descriptor: BedrockItemDescriptor,
  item: BedrockItem,
): boolean => {
  validateBedrockItemDescriptor(descriptor)
  if (typeof descriptor === 'string') {
    return descriptor === item.name
  }
  return bedrockTagQueryMatches(descriptor.tags, item.tags)
}

export function validateBedrockBlockStates(value: unknown): asserts value is BedrockBlockStates {
  const states = assertRecord(value, 'Bedrock block states')
  for (const [stateName, stateValue] of Object.entries(states)) {
    assertNonEmptyString(stateName, 'Bedrock block state name')
    assertStateValue(stateValue, `Bedrock block state ${stateName}`)
  }
}

export function validateBedrockDiggerSpeed(
  value: unknown,
  name = 'Bedrock digger speed',
): asserts value is number {
  assertNonNegativeInteger(value, name)
}

export function validateBedrockDestroySpeed(
  value: unknown,
  name = 'Bedrock destroy speed',
): asserts value is number {
  assertNonNegativeFiniteNumber(value, name)
}

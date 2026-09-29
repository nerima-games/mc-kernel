import type {
  BedrockBlock,
  BedrockDestructibleByMining,
  BedrockDiggerComponent,
  BedrockItem,
} from './bedrock-mining-data.js'
import {
  bedrockBlockDescriptorMatches,
  bedrockItemDescriptorMatches,
  validateBedrockBlockStates,
  validateBedrockDestroySpeed,
  validateBedrockDiggerSpeed,
  validateBedrockBlockDescriptor,
  validateBedrockItemDescriptor,
} from './bedrock-mining-descriptors.js'
import { DEFAULT_BEDROCK_SECONDS_TO_DESTROY } from './bedrock-mining-data.js'

export * from './bedrock-mining-data.js'
export * from './bedrock-mining-descriptors.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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

const assertArray = (value: unknown, name: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`)
  }
  return value
}

function assertBoolean(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name} must be a boolean`)
  }
}

function assertTagSet(value: unknown, name: string): asserts value is ReadonlySet<string> {
  if (!isReadonlySet(value)) {
    throw new TypeError(`${name} must be a Set or Set-like iterable`)
  }
  for (const tag of value) {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      throw new TypeError(`${name} must contain non-empty strings`)
    }
  }
}

function assertItem(value: unknown): asserts value is BedrockItem {
  const item = assertRecord(value, 'Bedrock item')
  assertKnownKeys(item, ['name', 'tags'], 'Bedrock item')
  if (typeof item['name'] !== 'string' || item['name'].trim().length === 0) {
    throw new TypeError('Bedrock item name must be a non-empty string')
  }
  assertTagSet(item['tags'], 'Bedrock item tags')
}

function assertBlock(value: unknown): asserts value is BedrockBlock {
  const block = assertRecord(value, 'Bedrock block')
  assertKnownKeys(block, ['name', 'states', 'tags'], 'Bedrock block')
  if (typeof block['name'] !== 'string' || block['name'].trim().length === 0) {
    throw new TypeError('Bedrock block name must be a non-empty string')
  }
  validateBedrockBlockStates(block['states'])
  assertTagSet(block['tags'], 'Bedrock block tags')
}

const validateDiggerRule = (value: unknown, index: number): void => {
  const rule = assertRecord(value, `Bedrock digger destroy_speeds[${index}]`)
  assertKnownKeys(rule, ['block', 'speed'], `Bedrock digger destroy_speeds[${index}]`)
  validateBedrockBlockDescriptor(rule['block'])
  validateBedrockDiggerSpeed(rule['speed'], `Bedrock digger destroy_speeds[${index}].speed`)
}

export function validateBedrockDiggerComponent(value: unknown): asserts value is BedrockDiggerComponent {
  const component = assertRecord(value, 'Bedrock digger component')
  assertKnownKeys(component, ['destroy_speeds', 'use_efficiency'], 'Bedrock digger component')

  const destroySpeeds = component['destroy_speeds']
  if (destroySpeeds !== undefined) {
    for (const [index, rule] of assertArray(destroySpeeds, 'Bedrock digger destroy_speeds').entries()) {
      validateDiggerRule(rule, index)
    }
  }

  const useEfficiency = component['use_efficiency']
  if (useEfficiency !== undefined) {
    assertBoolean(useEfficiency, 'Bedrock digger use_efficiency')
  }
}

const validateItemSpecificSpeed = (value: unknown, index: number): void => {
  const rule = assertRecord(value, `Bedrock item_specific_speeds[${index}]`)
  assertKnownKeys(rule, ['item', 'destroy_speed'], `Bedrock item_specific_speeds[${index}]`)
  validateBedrockItemDescriptor(rule['item'])
  validateBedrockDestroySpeed(rule['destroy_speed'], `Bedrock item_specific_speeds[${index}].destroy_speed`)
}

type BedrockDestructibleByMiningObject = Exclude<BedrockDestructibleByMining, boolean>

function validateBedrockDestructibleByMiningObject(
  value: unknown,
): asserts value is BedrockDestructibleByMiningObject {
  const component = assertRecord(value, 'Bedrock destructible_by_mining component')
  assertKnownKeys(component, ['seconds_to_destroy', 'item_specific_speeds'], 'Bedrock destructible_by_mining component')

  const secondsToDestroy = component['seconds_to_destroy']
  if (secondsToDestroy !== undefined) {
    validateBedrockDestroySpeed(secondsToDestroy, 'Bedrock seconds_to_destroy')
  }

  const itemSpecificSpeeds = component['item_specific_speeds']
  if (itemSpecificSpeeds !== undefined) {
    for (const [index, rule] of assertArray(itemSpecificSpeeds, 'Bedrock item_specific_speeds').entries()) {
      validateItemSpecificSpeed(rule, index)
    }
  }
}

export function validateBedrockDestructibleByMining(
  value: unknown,
): asserts value is BedrockDestructibleByMining {
  if (typeof value === 'boolean') {
    return
  }
  validateBedrockDestructibleByMiningObject(value)
}

export const resolveBedrockDiggerSpeed = (
  component: unknown,
  block: unknown,
): number | undefined => {
  if (component === undefined) {
    return undefined
  }
  validateBedrockDiggerComponent(component)
  assertBlock(block)
  const rule = component.destroy_speeds?.find((candidate) =>
    bedrockBlockDescriptorMatches(candidate.block, block),
  )
  return rule?.speed
}

export const bedrockDiggerUsesEfficiency = (component: unknown): boolean => {
  if (component === undefined) {
    return false
  }
  validateBedrockDiggerComponent(component)
  return component.use_efficiency ?? false
}

export const resolveBedrockDestructionSeconds = (
  component: unknown,
  defaultSeconds: number,
): number => {
  validateBedrockDestroySpeed(defaultSeconds, 'Bedrock default seconds_to_destroy')
  if (component === undefined) {
    return defaultSeconds
  }
  if (typeof component === 'boolean') {
    return component ? defaultSeconds : Number.POSITIVE_INFINITY
  }
  validateBedrockDestructibleByMiningObject(component)
  return component.seconds_to_destroy ?? DEFAULT_BEDROCK_SECONDS_TO_DESTROY
}

export const resolveBedrockItemSpecificDestroySpeed = (
  component: unknown,
  item: unknown,
): number | undefined => {
  if (component === undefined || typeof component === 'boolean') {
    return undefined
  }
  validateBedrockDestructibleByMiningObject(component)
  assertItem(item)
  const rule = component.item_specific_speeds?.find((candidate) =>
    bedrockItemDescriptorMatches(candidate.item, item),
  )
  return rule?.destroy_speed
}

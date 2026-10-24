import { Effect, Result } from 'effect'
import { itemComponentStackLimitOf, type ItemStackLimit } from './item-components-data.js'
import { itemComponents } from './item-components.js'
import { isItemComponents, itemComponentsEqual, itemComponentsSnapshot, type ItemComponents } from './item-components-validation.js'
import {
  applyItemComponentPatch,
  decodeItemComponentPatch,
  type ItemComponentPatch,
  type ItemComponentPatchDecodeError,
} from './item-component-patch.js'
import { isItemType, type ItemType } from './item-type.js'
import {
  StackCount,
  TransferQuantity,
  type MaxStackSize,
  type StackCount as StackCountValue,
  type TransferQuantity as TransferQuantityValue,
} from '../time/quantities.js'
import type { TextComponentFailure } from '../text/text-component.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type ItemStack = Readonly<{
  readonly item: ItemType
  readonly count: StackCountValue
  readonly components: ItemComponents
}>

type RecordValue = Readonly<{
  readonly item?: unknown
  readonly count?: unknown
  readonly components?: unknown
  readonly componentPatch?: unknown
}>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export type ItemSlot = ItemStack | undefined
export type Slot = ItemSlot

export type ItemStackOptions = Readonly<{
  readonly components?: ItemComponents | undefined
  readonly componentPatch?: ItemComponentPatch | undefined
}>

export type ItemStackFailure = ItemValidationFailure | ItemComponentPatchDecodeError | TextComponentFailure

type StackProperties = Readonly<{ readonly item: ItemType; readonly components?: ItemComponents }>

export const maxStackCountForItem = (item: ItemType): ItemStackLimit => itemComponentStackLimitOf(item)
export const maxStackCountForStack = (stack: StackProperties): ItemStackLimit | MaxStackSize =>
  stack.components?.maxStackSize ?? maxStackCountForItem(stack.item)

const failure = (
  field: string,
  message: string,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  value?: unknown,
): ItemValidationFailure => itemValidationFailure(field, message, reason, value)

const readRecordField = (
  value: object,
  field: string,
): Result.Result<unknown, ItemValidationFailure> =>
  Effect.runSync(Effect.result(Effect.try({
    try: () => Reflect.get(value, field),
    catch: () => failure(field, `Unable to inspect item stack ${field}`, 'hostile-input', value),
  })))

type ItemStackSnapshotState = Readonly<{
  readonly ancestors: WeakSet<object>
  readonly snapshots: WeakMap<object, unknown>
}>

const NON_PLAIN_STACK_VALUE_PROTOTYPE = Object.freeze(Object.create(null))

const snapshotStackValue = (
  value: unknown,
  field: string,
  state: ItemStackSnapshotState,
): Result.Result<unknown, ItemValidationFailure> => {
  if (value === null || typeof value !== 'object') return Result.succeed(value)
  const inspected = Effect.runSync(Effect.result(Effect.try({
    try: () => Array.isArray(value),
    catch: () => failure(field, `Unable to inspect item stack ${field}`, 'hostile-input', value),
  })))
  if (Result.isFailure(inspected)) return Result.fail(inspected.failure)
  if (state.ancestors.has(value)) {
    return Result.fail(failure(field, `Cyclic item stack ${field} is invalid`, 'invalid-value', value))
  }
  const existing = state.snapshots.get(value)
  if (existing !== undefined) return Result.succeed(existing)
  state.ancestors.add(value)

  if (inspected.success) {
    const length = Effect.runSync(Effect.result(Effect.try({
      try: () => Reflect.get(value, 'length'),
      catch: () => failure(field, `Unable to inspect item stack ${field}`, 'hostile-input', value),
    })))
    if (Result.isFailure(length)) {
      state.ancestors.delete(value)
      return Result.fail(length.failure)
    }
    const snapshot: unknown[] = []
    state.snapshots.set(value, snapshot)
    for (let index = 0; index < length.success; index += 1) {
      const currentField = `${field}[${index}]`
      const entry = Effect.runSync(Effect.result(Effect.try({
        try: () => Reflect.get(value, String(index)),
        catch: () => failure(currentField, `Unable to inspect item stack ${currentField}`, 'hostile-input', value),
      })))
      if (Result.isFailure(entry)) {
        state.ancestors.delete(value)
        return Result.fail(entry.failure)
      }
      const nested = snapshotStackValue(entry.success, currentField, state)
      if (Result.isFailure(nested)) {
        state.ancestors.delete(value)
        return Result.fail(nested.failure)
      }
      snapshot.push(nested.success)
    }
    state.ancestors.delete(value)
    return Result.succeed(Object.freeze(snapshot))
  }

  const prototype = Effect.runSync(Effect.result(Effect.try({
    try: () => Object.getPrototypeOf(value),
    catch: () => failure(field, `Unable to inspect item stack ${field}`, 'hostile-input', value),
  })))
  if (Result.isFailure(prototype)) {
    state.ancestors.delete(value)
    return Result.fail(prototype.failure)
  }
  const keys = Effect.runSync(Effect.result(Effect.try({
    try: () => Object.keys(value),
    catch: () => failure(field, `Unable to inspect item stack ${field}`, 'hostile-input', value),
  })))
  if (Result.isFailure(keys)) {
    state.ancestors.delete(value)
    return Result.fail(keys.failure)
  }
  const snapshotPrototype = prototype.success === Object.prototype || prototype.success === null
    ? prototype.success
    : NON_PLAIN_STACK_VALUE_PROTOTYPE
  const snapshot: Record<string, unknown> = Object.create(snapshotPrototype)
  state.snapshots.set(value, snapshot)
  for (const key of keys.success) {
    const currentField = `${field}.${key}`
    const entry = Effect.runSync(Effect.result(Effect.try({
      try: () => Reflect.get(value, key),
      catch: () => failure(currentField, `Unable to inspect item stack ${currentField}`, 'hostile-input', value),
    })))
    if (Result.isFailure(entry)) {
      state.ancestors.delete(value)
      return Result.fail(entry.failure)
    }
    const nested = snapshotStackValue(entry.success, currentField, state)
    if (Result.isFailure(nested)) {
      state.ancestors.delete(value)
      return Result.fail(nested.failure)
    }
    Object.defineProperty(snapshot, key, { enumerable: true, value: nested.success })
  }
  state.ancestors.delete(value)
  return Result.succeed(Object.freeze(snapshot))
}

const itemStackSnapshot = (
  value: unknown,
  invalidFailure: ItemValidationFailure,
): Result.Result<ItemStack, ItemStackFailure> => {
  if (typeof value !== 'object' || value === null) return Result.fail(invalidFailure)
  const shape = Effect.runSync(Effect.result(Effect.try({
    try: () => {
      if (Array.isArray(value)) return false
      const keys = Object.keys(value)
      return keys.every((key) => key === 'item' || key === 'count' || key === 'components') &&
        Object.hasOwn(value, 'item') && Object.hasOwn(value, 'count') && Object.hasOwn(value, 'components')
    },
    catch: () => failure('stack', 'Unable to inspect item stack', 'hostile-input', value),
  })))
  if (Result.isFailure(shape)) return Result.fail(shape.failure)
  if (!shape.success) return Result.fail(invalidFailure)
  const stack = value

  return Result.gen(function* () {
    const item = yield* readRecordField(stack, 'item')
    const count = yield* readRecordField(stack, 'count')
    const componentsValue = yield* readRecordField(stack, 'components')
    const components = yield* snapshotStackValue(componentsValue, 'components', {
      ancestors: new WeakSet<object>(),
      snapshots: new WeakMap<object, unknown>(),
    })
    if (!isItemType(item) || !isItemComponents(components) || typeof count !== 'number') {
      return yield* Result.fail(invalidFailure)
    }
    const stackCount = yield* Result.mapError(StackCount.result(count), () => invalidFailure)
    if (stackCount > components.maxStackSize) return yield* Result.fail(invalidFailure)
    return Object.freeze({ item, count: stackCount, components })
  })
}

const stackOptionsFromUnknown = (
  value: unknown,
): Result.Result<ItemStackOptions, ItemStackFailure> => {
  if (typeof value !== 'object' || value === null) {
    return Result.fail(failure('options', 'Item stack options must be a non-null object', 'invalid-type', value))
  }
  const array = Effect.runSync(Effect.result(Effect.try({
    try: () => Array.isArray(value),
    catch: () => failure('options', 'Unable to inspect item stack options', 'hostile-input', value),
  })))
  if (Result.isFailure(array)) return Result.fail(array.failure)
  if (array.success) {
    return Result.fail(failure('options', 'Item stack options must be a non-null object', 'invalid-type', value))
  }
  return Result.gen(function* () {
    const componentsValue = yield* readRecordField(value, 'components')
    const components = componentsValue === undefined
      ? undefined
      : yield* itemComponentsSnapshot(componentsValue)
    const patchValue = yield* readRecordField(value, 'componentPatch')
    const componentPatch = patchValue === undefined
      ? undefined
      : yield* decodeItemComponentPatch(patchValue)
    return {
      ...(components === undefined ? {} : { components }),
      ...(componentPatch === undefined ? {} : { componentPatch }),
    }
  })
}

const stackValueOf = (
  item: ItemType,
  count: number,
  components: ItemComponents,
): Result.Result<ItemStack, ItemStackFailure> => {
  const maxStackSize = components.maxStackSize
  return Result.gen(function* () {
    const stackCount = yield* Result.mapError(
      StackCount.result(count),
      () => failure('count', `Item stack count for ${item} must be an integer in [1, ${maxStackSize}], received ${String(count)}`, 'out-of-range', count),
    )
    if (stackCount > maxStackSize) {
      return yield* Result.fail(failure(
        'count',
        `Item stack count for ${item} must be an integer in [1, ${maxStackSize}], received ${String(count)}`,
        'out-of-range',
        count,
      ))
    }
    const snapshot = yield* itemComponentsSnapshot(components)
    return Object.freeze({ item, count: stackCount, components: snapshot })
  })
}

const itemStackFromValues = (
  item: ItemType,
  count: number,
  options: unknown,
): Result.Result<ItemStack, ItemStackFailure> => Result.gen(function* () {
  const parsedOptions = yield* stackOptionsFromUnknown(options)
  const base = parsedOptions.components === undefined
    ? yield* itemComponents(item)
    : parsedOptions.components
  const components = parsedOptions.componentPatch === undefined
    ? base
    : yield* applyItemComponentPatch(base, parsedOptions.componentPatch)
  return yield* stackValueOf(item, count, components)
})

export const itemStack = (
  item: ItemType,
  count: StackCountValue,
  options: ItemStackOptions = {},
): Result.Result<ItemStack, ItemStackFailure> => {
  if (!isItemType(item)) {
    return Result.fail(failure('item', `Unknown item type: ${String(item)}`, 'invalid-value', item))
  }
  return itemStackFromValues(item, Number(count), options)
}

export const itemStackFromUnknown = (
  item: unknown,
  count: unknown,
  options: unknown = {},
): Result.Result<ItemStack, ItemStackFailure> => {
  if (!isItemType(item)) {
    return Result.fail(failure('item', `Unknown item type: ${String(item)}`, 'invalid-value', item))
  }
  if (typeof count !== 'number') {
    return Result.fail(failure('count', `Item stack count must be a number, received ${String(count)}`, 'invalid-type', count))
  }
  return itemStackFromValues(item, count, options)
}

export const isItemStack = (value: unknown): value is ItemStack => {
  const checked = Effect.runSync(Effect.result(Effect.try({
    try: () => {
      if (!isRecord(value)) return false
      const keys = Object.keys(value)
      if (!keys.every((key) => key === 'item' || key === 'count' || key === 'components')) return false
      if (!Object.hasOwn(value, 'item') || !Object.hasOwn(value, 'count') || !Object.hasOwn(value, 'components')) return false
      const item = Reflect.get(value, 'item')
      const components = Reflect.get(value, 'components')
      const count = Reflect.get(value, 'count')
      return isItemType(item) && isItemComponents(components) &&
        typeof count === 'number' && Number.isSafeInteger(count) && count >= 1 && count <= components.maxStackSize
    },
    catch: () => failure('stack', 'Unable to inspect item stack', 'hostile-input', value),
  })))
  return Result.isSuccess(checked) && checked.success
}

export const itemStackWithCount = (
  stack: ItemStack,
  count: StackCountValue,
): Result.Result<ItemStack, ItemStackFailure> => {
  const snapshot = itemStackSnapshot(stack, failure('stack', 'Stack must be an ItemStack', 'invalid-type', stack))
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)
  return stackValueOf(snapshot.success.item, Number(count), snapshot.success.components)
}

export const transmuteItemStack = (
  source: ItemStack,
  result: ItemStack,
  count?: StackCountValue,
): Result.Result<ItemStack, ItemStackFailure> => {
  const invalid = failure('stack', 'Transmute source and result must be ItemStacks', 'invalid-type')
  const sourceSnapshot = itemStackSnapshot(source, invalid)
  if (Result.isFailure(sourceSnapshot)) return Result.fail(sourceSnapshot.failure)
  const resultSnapshot = itemStackSnapshot(result, invalid)
  if (Result.isFailure(resultSnapshot)) return Result.fail(resultSnapshot.failure)
  return stackValueOf(resultSnapshot.success.item, Number(count ?? resultSnapshot.success.count), resultSnapshot.success.components)
}

export const itemStackEqualsIgnoringCount = (left: ItemStack, right: ItemStack): boolean => {
  const invalid = failure('stack', 'Stacks must be ItemStacks', 'invalid-type')
  const leftSnapshot = itemStackSnapshot(left, invalid)
  if (Result.isFailure(leftSnapshot)) return false
  const rightSnapshot = itemStackSnapshot(right, invalid)
  if (Result.isFailure(rightSnapshot)) return false
  return leftSnapshot.success.item === rightSnapshot.success.item &&
    itemComponentsEqual(leftSnapshot.success.components, rightSnapshot.success.components)
}

export const itemStacksCanMerge = (left: ItemStack, right: ItemStack): boolean => itemStackEqualsIgnoringCount(left, right)

export const splitItemStack = (
  stack: ItemStack,
  amount: TransferQuantityValue,
): Result.Result<{ readonly taken: ItemStack; readonly remainder: ItemSlot }, ItemStackFailure> => {
  const snapshot = itemStackSnapshot(stack, failure('stack', 'Stack must be an ItemStack', 'invalid-type', stack))
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)
  const input = snapshot.success
  const checkedAmount = Result.mapError(
    TransferQuantity.result(Number(amount)),
    () => failure('amount', `Split amount must be an integer in [1, ${input.count}]`, 'out-of-range', amount),
  )
  if (Result.isFailure(checkedAmount)) return Result.fail(checkedAmount.failure)
  if (Number(checkedAmount.success) > Number(input.count)) {
    return Result.fail(failure('amount', `Split amount must be an integer in [1, ${input.count}]`, 'out-of-range', amount))
  }
  return Result.gen(function* () {
    const taken = yield* stackValueOf(input.item, Number(checkedAmount.success), input.components)
    const remainder = Number(checkedAmount.success) === Number(input.count)
      ? undefined
      : yield* stackValueOf(input.item, Number(input.count) - Number(checkedAmount.success), input.components)
    return { taken, remainder }
  })
}

export const mergeItemStacks = (
  left: ItemStack,
  right: ItemStack,
): Result.Result<{ readonly merged: ItemStack; readonly remainder: ItemSlot }, ItemStackFailure> => {
  const invalid = failure('stack', 'Stacks must be ItemStacks', 'invalid-type')
  const leftSnapshot = itemStackSnapshot(left, invalid)
  if (Result.isFailure(leftSnapshot)) return Result.fail(leftSnapshot.failure)
  const rightSnapshot = itemStackSnapshot(right, invalid)
  if (Result.isFailure(rightSnapshot)) return Result.fail(rightSnapshot.failure)
  const leftValue = leftSnapshot.success
  const rightValue = rightSnapshot.success
  if (!itemStackEqualsIgnoringCount(leftValue, rightValue)) {
    return Result.fail(failure('stack', 'IncompatibleStacks', 'invalid-value'))
  }
  const capacity = maxStackCountForStack(leftValue)
  const total = leftValue.count + rightValue.count
  return Result.gen(function* () {
    const merged = yield* stackValueOf(leftValue.item, Math.min(capacity, total), leftValue.components)
    const remainder = total > capacity
      ? yield* stackValueOf(rightValue.item, total - capacity, rightValue.components)
      : undefined
    return { merged, remainder }
  })
}

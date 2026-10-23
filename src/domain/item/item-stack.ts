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

export type ItemStackFailure = ItemValidationFailure | ItemComponentPatchDecodeError

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
  if (Result.isFailure(array)) return array
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
  if (!isItemStack(stack)) return Result.fail(failure('stack', 'Stack must be an ItemStack', 'invalid-type', stack))
  return stackValueOf(stack.item, Number(count), stack.components)
}

export const transmuteItemStack = (
  source: ItemStack,
  result: ItemStack,
  count: StackCountValue = result.count,
): Result.Result<ItemStack, ItemStackFailure> => {
  if (!isItemStack(source) || !isItemStack(result)) {
    return Result.fail(failure('stack', 'Transmute source and result must be ItemStacks', 'invalid-type'))
  }
  return stackValueOf(result.item, Number(count), result.components)
}

export const itemStackEqualsIgnoringCount = (left: ItemStack, right: ItemStack): boolean =>
  isItemStack(left) && isItemStack(right) && left.item === right.item && itemComponentsEqual(left.components, right.components)

export const itemStacksCanMerge = (left: ItemStack, right: ItemStack): boolean => itemStackEqualsIgnoringCount(left, right)

export const splitItemStack = (
  stack: ItemStack,
  amount: TransferQuantityValue,
): Result.Result<{ readonly taken: ItemStack; readonly remainder: ItemSlot }, ItemStackFailure> => {
  if (!isItemStack(stack)) return Result.fail(failure('stack', 'Stack must be an ItemStack', 'invalid-type', stack))
  const checkedAmount = Result.mapError(
    TransferQuantity.result(Number(amount)),
    () => failure('amount', `Split amount must be an integer in [1, ${stack.count}]`, 'out-of-range', amount),
  )
  if (Result.isFailure(checkedAmount)) return checkedAmount
  if (Number(checkedAmount.success) > Number(stack.count)) {
    return Result.fail(failure('amount', `Split amount must be an integer in [1, ${stack.count}]`, 'out-of-range', amount))
  }
  return Result.gen(function* () {
    const taken = yield* stackValueOf(stack.item, Number(checkedAmount.success), stack.components)
    const remainder = Number(checkedAmount.success) === Number(stack.count)
      ? undefined
      : yield* stackValueOf(stack.item, Number(stack.count) - Number(checkedAmount.success), stack.components)
    return { taken, remainder }
  })
}

export const mergeItemStacks = (
  left: ItemStack,
  right: ItemStack,
): Result.Result<{ readonly merged: ItemStack; readonly remainder: ItemSlot }, ItemStackFailure> => {
  if (!isItemStack(left) || !isItemStack(right)) {
    return Result.fail(failure('stack', 'Stacks must be ItemStacks', 'invalid-type'))
  }
  if (!itemStackEqualsIgnoringCount(left, right)) {
    return Result.fail(failure('stack', 'IncompatibleStacks', 'invalid-value'))
  }
  const capacity = maxStackCountForStack(left)
  const total = left.count + right.count
  return Result.gen(function* () {
    const merged = yield* stackValueOf(left.item, Math.min(capacity, total), left.components)
    const remainder = total > capacity
      ? yield* stackValueOf(right.item, total - capacity, right.components)
      : undefined
    return { merged, remainder }
  })
}

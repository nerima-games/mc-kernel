/* eslint-disable sort-imports -- Keep domain imports adjacent and external Brand last. */
/** Stable item ids, stack metadata, and their two-byte storage encoding. */
import { itemComponentStackLimitOf, type ItemStackLimit } from './item-components-data.js'
import { ITEM_TYPES, type ItemType } from './item-type.js'
import { Brand, Effect, Result } from 'effect'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type { ItemStackLimit } from './item-components-data.js'

export type ItemId = number & Brand.Brand<'ItemId'>
type ReadonlyByteArray = Omit<
  Uint8Array,
  | 'buffer'
  | 'byteLength'
  | 'byteOffset'
  | 'copyWithin'
  | 'fill'
  | 'reverse'
  | 'set'
  | 'sort'
  | 'subarray'
> & {
  readonly [index: number]: number
}
export type ItemIdBytes = ReadonlyByteArray & Brand.Brand<'ItemIdBytes'>
const brandItemIdBytes = Brand.nominal<ItemIdBytes>()
const brandTrustedItemId = Brand.nominal<ItemId>()

/** Item ids use an unsigned 16-bit wire representation. */
export const ITEM_ID_MAX = 0xffff
export const ITEM_ID_BYTES = 2
const ITEM_ID_MIN = 0
const ITEM_ID_BYTE_OFFSET = 0
const ITEM_ID_BYTE_BASE = 256
export const ItemId: Brand.Constructor<ItemId> = Brand.make<ItemId>(
  (value) =>
    Number.isInteger(value) && value >= ITEM_ID_MIN && value <= ITEM_ID_MAX
      ? true
      : `ItemId must be an integer in [${ITEM_ID_MIN}, ${ITEM_ID_MAX}], received ${value}`,
)

export type ItemDefinition = {
  readonly id: ItemId
  readonly type: ItemType
  readonly maxStackCount: ItemStackLimit
}

/**
 * Dense and append-only. The array index is the permanent item id, so new
 * items must be appended to `ITEM_TYPES`, never inserted or reordered.
 */
export const ITEM_REGISTRY: ReadonlyArray<ItemDefinition> = ITEM_TYPES.map((type, id) => ({
  id: brandTrustedItemId(id),
  maxStackCount: itemComponentStackLimitOf(type),
  type,
}))

export const ITEM_IDS: ReadonlyArray<ItemId> = ITEM_REGISTRY.map(({ id }) => id)

const DEFINITION_BY_TYPE = Object.fromEntries(
  ITEM_REGISTRY.map((definition) => [definition.type, definition]),
)

export const isKnownItemId = (id: unknown): id is ItemId =>
  typeof id === 'number' && Number.isInteger(id) && id >= ITEM_ID_MIN && id < ITEM_REGISTRY.length

export function itemDefinitionOf(type: ItemType): ItemDefinition
export function itemDefinitionOf(type: unknown): ItemDefinition | undefined
export function itemDefinitionOf(type: unknown): ItemDefinition | undefined {
  if (typeof type !== 'string') return undefined
  return DEFINITION_BY_TYPE[type]
}

export const maxStackCountOfItem = (type: ItemType): ItemStackLimit => itemDefinitionOf(type).maxStackCount

export const itemIdOf = (type: ItemType): ItemId => itemDefinitionOf(type).id

export function itemTypeOfId(id: ItemId): ItemType
export function itemTypeOfId(id: ItemId): ItemType | undefined {
  return ITEM_REGISTRY[id]?.type
}

type ItemIdBytesInput = Uint8Array | ItemIdBytes
export type ItemRegistryFailure = ItemValidationFailure

type ValidatedItemIdBytes = Readonly<{
  readonly id: ItemId
  readonly bytes: Uint8Array
}>

const itemIdOfBytes = (bytes: ItemIdBytesInput): Result.Result<ValidatedItemIdBytes, ItemRegistryFailure> => {
  const copied = Effect.runSync(Effect.result(Effect.try({
    try: () => bytes.slice(),
    catch: () => itemValidationFailure('bytes', 'Unable to read ItemIdBytes input', 'hostile-input', bytes),
  })))
  if (Result.isFailure(copied)) return Result.fail(copied.failure)

  const snapshot = Effect.runSync(Effect.result(Effect.try({
    try: () => {
      const length = copied.success.length
      return {
        length,
        highByte: length === ITEM_ID_BYTES ? copied.success[ITEM_ID_BYTE_OFFSET] : undefined,
        lowByte: length === ITEM_ID_BYTES ? copied.success[ITEM_ID_BYTE_OFFSET + 1] : undefined,
      }
    },
    catch: () => itemValidationFailure('bytes', 'Unable to read ItemIdBytes input', 'hostile-input', bytes),
  })))
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)

  if (snapshot.success.length !== ITEM_ID_BYTES) {
    return Result.fail(itemValidationFailure(
      'bytes',
      `ItemIdBytes must be exactly ${ITEM_ID_BYTES} bytes, received ${snapshot.success.length}`,
      'out-of-range',
      snapshot.success.length,
      'RangeError',
    ))
  }
  const { highByte, lowByte } = snapshot.success
  if (highByte === undefined || lowByte === undefined) {
    return Result.fail(itemValidationFailure('bytes', 'ItemIdBytes must contain exactly two bytes', 'out-of-range', snapshot.success.length, 'RangeError'))
  }
  if (
    !Number.isInteger(highByte) || highByte < 0 || highByte >= ITEM_ID_BYTE_BASE ||
    !Number.isInteger(lowByte) || lowByte < 0 || lowByte >= ITEM_ID_BYTE_BASE
  ) {
    return Result.fail(itemValidationFailure(
      'bytes',
      'ItemIdBytes entries must be unsigned 8-bit integers',
      'out-of-range',
      [highByte, lowByte],
      'RangeError',
    ))
  }
  const id = highByte * ITEM_ID_BYTE_BASE + lowByte
  if (!isKnownItemId(id)) {
    return Result.fail(itemValidationFailure(
      'id',
      `ItemIdBytes must encode a registered item id, received ${id}`,
      'out-of-range',
      id,
      'RangeError',
    ))
  }
  return Result.succeed({
    id,
    bytes: Uint8Array.of(highByte, lowByte),
  })
}

export const ItemIdBytes = (bytes: ItemIdBytesInput): Result.Result<ItemIdBytes, ItemRegistryFailure> => {
  const validated = itemIdOfBytes(bytes)
  if (Result.isFailure(validated)) return Result.fail(validated.failure)
  return Result.succeed(brandItemIdBytes(validated.success.bytes))
}

/** Encode an item's permanent id in network byte order. */
export const encodeItemId = (type: ItemType): ItemIdBytes => {
  const id = itemIdOf(type)
  const bytes = new Uint8Array(ITEM_ID_BYTES)
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(ITEM_ID_BYTE_OFFSET, id, false)
  return brandItemIdBytes(bytes)
}

/** Decode a validated item-id field from its two-byte wire representation. */
export const decodeItemId = (bytes: ItemIdBytes): Result.Result<ItemType, ItemRegistryFailure> =>
  Result.map(itemIdOfBytes(bytes), ({ id }) => itemTypeOfId(id))

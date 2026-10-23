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

const DEFINITION_BY_TYPE: Readonly<Record<ItemType, ItemDefinition>> = Object.fromEntries(
  ITEM_REGISTRY.map((definition) => [definition.type, definition]),
)

export const isKnownItemId = (id: unknown): id is ItemId =>
  typeof id === 'number' && Number.isInteger(id) && id >= ITEM_ID_MIN && id < ITEM_REGISTRY.length

export const itemDefinitionOf = (type: ItemType): ItemDefinition => DEFINITION_BY_TYPE[type]

export const maxStackCountOfItem = (type: ItemType): ItemStackLimit => itemDefinitionOf(type).maxStackCount

export const itemIdOf = (type: ItemType): ItemId => itemDefinitionOf(type).id

export function itemTypeOfId(id: ItemId): ItemType
export function itemTypeOfId(id: ItemId): ItemType | undefined {
  return ITEM_REGISTRY[id]?.type
}

type ItemIdBytesInput = Uint8Array | ItemIdBytes
export type ItemRegistryFailure = ItemValidationFailure

const itemIdOfBytes = (bytes: ItemIdBytesInput): Result.Result<ItemId, ItemRegistryFailure> => {
  const copied = Effect.runSync(Effect.result(Effect.try({
    try: () => bytes.slice(),
    catch: () => itemValidationFailure('bytes', 'Unable to read ItemIdBytes input', 'hostile-input', bytes),
  })))
  if (Result.isFailure(copied)) return copied
  if (copied.success.length !== ITEM_ID_BYTES) {
    return Result.fail(itemValidationFailure(
      'bytes',
      `ItemIdBytes must be exactly ${ITEM_ID_BYTES} bytes, received ${copied.success.length}`,
      'out-of-range',
      copied.success.length,
      'RangeError',
    ))
  }
  const id = copied.success[ITEM_ID_BYTE_OFFSET] * ITEM_ID_BYTE_BASE + copied.success[ITEM_ID_BYTE_OFFSET + 1]
  if (!isKnownItemId(id)) {
    return Result.fail(itemValidationFailure(
      'id',
      `ItemIdBytes must encode a registered item id, received ${id}`,
      'out-of-range',
      id,
      'RangeError',
    ))
  }
  return Result.mapError(ItemId.result(id), (error) =>
    itemValidationFailure('id', error.message, 'out-of-range', id, 'RangeError'))
}

export const ItemIdBytes = (bytes: ItemIdBytesInput): Result.Result<ItemIdBytes, ItemRegistryFailure> => {
  const validated = itemIdOfBytes(bytes)
  if (Result.isFailure(validated)) return validated
  const copied = Effect.runSync(Effect.result(Effect.try({
    try: () => bytes.slice(),
    catch: () => itemValidationFailure('bytes', 'Unable to read ItemIdBytes input', 'hostile-input', bytes),
  })))
  return Result.map(copied, brandItemIdBytes)
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
  Result.flatMap(itemIdOfBytes(bytes), (id) => {
    const item = ITEM_REGISTRY[Number(id)]?.type
    return item === undefined
      ? Result.fail(itemValidationFailure('id', `ItemIdBytes must encode a registered item id, received ${Number(id)}`, 'out-of-range', Number(id), 'RangeError'))
      : Result.succeed(item)
  })

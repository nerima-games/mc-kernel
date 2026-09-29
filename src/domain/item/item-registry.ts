/* eslint-disable sort-imports -- Keep domain imports adjacent and external Brand last. */
/** Stable item ids, stack metadata, and their two-byte storage encoding. */
import { itemComponentStackLimitOf, type ItemStackLimit } from './item-components-data.js'
import { ITEM_TYPES, type ItemType } from './item-type.js'
import { Brand } from 'effect'

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

/** Item ids use an unsigned 16-bit wire representation. */
export const ITEM_ID_MAX = 0xffff
export const ITEM_ID_BYTES = 2
const ITEM_ID_MIN = 0
const ITEM_ID_BYTE_OFFSET = 0
const ITEM_ID_BYTE_BASE = 256
export const ItemId: Brand.Brand.Constructor<ItemId> = Brand.refined<ItemId>(
  (value) => Number.isInteger(value) && value >= ITEM_ID_MIN && value <= ITEM_ID_MAX,
  (value) => Brand.error(`ItemId must be an integer in [${ITEM_ID_MIN}, ${ITEM_ID_MAX}], received ${value}`),
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
  // Effect Brand constructors are callable validation functions, not classes.
  // eslint-disable-next-line new-cap
  id: ItemId(id),
  maxStackCount: itemComponentStackLimitOf(type),
  type,
}))

export const ITEM_IDS: ReadonlyArray<ItemId> = ITEM_REGISTRY.map(({ id }) => id)

const DEFINITION_BY_TYPE = new Map<ItemType, ItemDefinition>(
  ITEM_REGISTRY.map((definition): [ItemType, ItemDefinition] => [definition.type, definition]),
)

export const isKnownItemId = (id: number): id is ItemId =>
  Number.isInteger(id) && id >= ITEM_ID_MIN && id < ITEM_REGISTRY.length

export const itemDefinitionOf = (type: ItemType): ItemDefinition => {
  const definition = DEFINITION_BY_TYPE.get(type)

  if (definition === undefined) {
    throw new Error(`Item registry is missing a row for ${type}`)
  }

  return definition
}

export const maxStackCountOfItem = (type: ItemType): ItemStackLimit => itemDefinitionOf(type).maxStackCount

export const itemIdOf = (type: ItemType): ItemId => itemDefinitionOf(type).id

export function itemTypeOfId(id: ItemId): ItemType
export function itemTypeOfId(id: number): ItemType | undefined
export function itemTypeOfId(id: number): ItemType | undefined {
  return ITEM_REGISTRY[id]?.type
}

type ItemIdBytesInput = Uint8Array | ItemIdBytes

const itemIdOfBytes = (bytes: ItemIdBytesInput): ItemId => {
  if (bytes.length !== ITEM_ID_BYTES) {
    throw new RangeError(`ItemIdBytes must be exactly ${ITEM_ID_BYTES} bytes, received ${bytes.length}`)
  }

  let id = ITEM_ID_MIN
  for (const byte of bytes) {
    id = id * ITEM_ID_BYTE_BASE + byte
  }

  if (!isKnownItemId(id)) {
    throw new RangeError(`ItemIdBytes must encode a registered item id, received ${id}`)
  }

  return ItemId(id)
}

export const ItemIdBytes = (bytes: ItemIdBytesInput): ItemIdBytes => {
  itemIdOfBytes(bytes)
  return brandItemIdBytes(bytes.slice())
}

/** Encode an item's permanent id in network byte order. */
export const encodeItemId = (type: ItemType): ItemIdBytes => {
  const id = itemIdOf(type)
  const bytes = new Uint8Array(ITEM_ID_BYTES)
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(ITEM_ID_BYTE_OFFSET, id, false)
  return brandItemIdBytes(bytes)
}

/** Decode a validated item-id field from its two-byte wire representation. */
export const decodeItemId = (bytes: ItemIdBytes): ItemType => {
  return itemTypeOfId(itemIdOfBytes(bytes))
}

import { isItemStack, type ItemStack } from './item-stack.js'
import { isItemComponents } from './item-components-validation.js'
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SLOTS,
  ITEM_DURABILITY_CATALOG,
  type DamageableItemType,
  type EquippableItemType,
  type EquipmentDefinition,
  type EquipmentSlot,
  type ItemDurabilityDefinition,
} from './equipment-data.js'
import type { ItemType } from './item-type.js'

export * from './equipment-data.js'

export const isEquippableItemType = (item: ItemType): item is EquippableItemType =>
  Object.hasOwn(EQUIPMENT_CATALOG, item)

export const equipmentDefinitionFor = (item: ItemType): EquipmentDefinition | undefined =>
  isEquippableItemType(item) ? EQUIPMENT_CATALOG[item] : undefined

export const isDamageableItemType = (item: ItemType): item is DamageableItemType =>
  Object.hasOwn(ITEM_DURABILITY_CATALOG, item)

export const itemDurabilityDefinitionFor = (
  item: ItemType,
): ItemDurabilityDefinition | undefined =>
  isDamageableItemType(item) ? ITEM_DURABILITY_CATALOG[item] : undefined

export type Durability = {
  readonly current: number
  readonly max: number
}

export type EquipmentItem = ItemStack & {
  readonly durability: Durability | null
}

export type ValidEquipmentItem = EquipmentItem & {
  readonly durability: Durability
}

export type EquipmentSlots = Readonly<Record<EquipmentSlot, EquipmentItem | null>>

export type Equipment = {
  readonly slots: EquipmentSlots
}

export type EquipmentValidationError = {
  readonly _tag: 'EquipmentValidationError'
  readonly path: string
  readonly reason: string
}

export type EquipmentValidationResult =
  | { readonly _tag: 'Valid'; readonly equipment: Equipment }
  | { readonly _tag: 'Invalid'; readonly error: EquipmentValidationError }

export type EquipmentOutcome<A> = {
  readonly equipment: Equipment
  readonly result: A
}

export type DamageEquipmentResult =
  | { readonly _tag: 'InvalidAmount'; readonly amount: number }
  | { readonly _tag: 'Empty' }
  | { readonly _tag: 'NotDamageable'; readonly item: EquipmentItem }
  | { readonly _tag: 'Damaged'; readonly item: EquipmentItem; readonly applied: number }
  | { readonly _tag: 'Broken'; readonly item: EquipmentItem; readonly applied: number }

type RecordValue = { readonly [key: string]: unknown }

type MutableEquipmentSlots = {
  [slot in EquipmentSlot]: EquipmentItem | null
}

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue, expected: ReadonlyArray<string>): boolean => {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

const validSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value)

const emptyEquipmentSlots = (): MutableEquipmentSlots => ({
  mainhand: null,
  head: null,
  chest: null,
  legs: null,
  feet: null,
  offhand: null,
})

export const isEquipmentSlot = (value: unknown): value is EquipmentSlot =>
  EQUIPMENT_SLOTS.some((slot) => slot === value)

export const isDurability = (value: unknown): value is Durability => {
  if (!isRecord(value) || !hasExactKeys(value, ['current', 'max'])) return false
  const current = value['current']
  const max = value['max']
  return validSafeInteger(current) && current >= 0 && validSafeInteger(max) && max > 0 && current <= max
}

const isEquipmentItemShape = (value: unknown): value is EquipmentItem => {
  if (!isRecord(value)) return false
  const hasComponents = Object.hasOwn(value, 'components')
  const expectedKeys = hasComponents
    ? ['item', 'count', 'components', 'durability']
    : ['item', 'count', 'durability']
  if (!hasExactKeys(value, expectedKeys)) return false
  const components = value['components']
  if (hasComponents && !isItemComponents(components)) return false
  const stack = hasComponents
    ? { item: value['item'], count: value['count'], components }
    : { item: value['item'], count: value['count'] }
  if (!isItemStack(stack)) return false
  const itemDurability = value['durability']
  return itemDurability === null || isDurability(itemDurability)
}

export const isValidDurabilityForItem = (
  item: ItemType,
  value: unknown,
): value is Durability => {
  const definition = itemDurabilityDefinitionFor(item)
  return definition !== undefined && isDurability(value) && value.max === definition.maxDurability
}

export const isEquipmentItem = (value: unknown): value is ValidEquipmentItem => {
  if (!isEquipmentItemShape(value)) return false
  return isEquippableItemType(value.item) && isValidDurabilityForItem(value.item, value.durability)
}

export const isEquipmentItemForSlot = (
  slot: EquipmentSlot,
  item: EquipmentItem,
): item is ValidEquipmentItem =>
  isEquipmentItem(item) && equipmentDefinitionFor(item.item)?.slots.includes(slot) === true

export function durabilityForItem(item: DamageableItemType): Durability
export function durabilityForItem(item: ItemType): Durability | null
export function durabilityForItem(item: ItemType): Durability | null {
  const definition = itemDurabilityDefinitionFor(item)
  return definition === undefined
    ? null
    : { current: definition.maxDurability, max: definition.maxDurability }
}

export const durability = (current: number, max: number): Durability => {
  const value = { current, max }
  if (!isDurability(value)) throw new RangeError('Invalid durability')
  return value
}

export const equipmentItem = (
  stack: ItemStack,
  itemDurability: Durability | null = durabilityForItem(stack.item),
): EquipmentItem => {
  const value: EquipmentItem = {
    ...stack,
    durability: itemDurability === null ? null : { ...itemDurability },
  }
  if (!isEquipmentItem(value)) throw new RangeError('Invalid equipment item')
  return value
}

const copyEquipmentItem = (item: ValidEquipmentItem): ValidEquipmentItem => ({
  ...item,
  durability: { ...item.durability },
})

export const emptyEquipment = (): Equipment => ({ slots: emptyEquipmentSlots() })

export const equippedAt = (equipment: Equipment, slot: EquipmentSlot): EquipmentItem | null =>
  equipment.slots[slot]

export const equip = (
  equipment: Equipment,
  slot: EquipmentSlot,
  item: EquipmentItem,
): EquipmentOutcome<EquipmentItem | null> => {
  if (!isEquipmentItemForSlot(slot, item)) return { equipment, result: item }
  return {
    equipment: {
      slots: { ...equipment.slots, [slot]: copyEquipmentItem(item) },
    },
    result: equipment.slots[slot],
  }
}

export const unequip = (
  equipment: Equipment,
  slot: EquipmentSlot,
): EquipmentOutcome<EquipmentItem | null> => {
  const item = equipment.slots[slot]
  if (item === null) return { equipment, result: null }
  return {
    equipment: {
      slots: { ...equipment.slots, [slot]: null },
    },
    result: item,
  }
}

export const swapEquipment = (
  equipment: Equipment,
  first: EquipmentSlot,
  second: EquipmentSlot,
): Equipment => {
  if (first === second) return equipment
  const firstItem = equipment.slots[first]
  const secondItem = equipment.slots[second]
  if (
    (secondItem !== null && !isEquipmentItemForSlot(first, secondItem)) ||
    (firstItem !== null && !isEquipmentItemForSlot(second, firstItem))
  ) return equipment
  return {
    slots: {
      ...equipment.slots,
      [first]: secondItem,
      [second]: firstItem,
    },
  }
}

export const damageEquipment = (
  equipment: Equipment,
  slot: EquipmentSlot,
  amount: number,
): EquipmentOutcome<DamageEquipmentResult> => {
  if (!validSafeInteger(amount) || amount <= 0) {
    return { equipment, result: { _tag: 'InvalidAmount', amount } }
  }
  const item = equipment.slots[slot]
  if (item === null) return { equipment, result: { _tag: 'Empty' } }
  if (item.durability === null) return { equipment, result: { _tag: 'NotDamageable', item } }

  const applied = Math.min(amount, item.durability.current)
  if (applied === item.durability.current) {
    return {
      equipment: { slots: { ...equipment.slots, [slot]: null } },
      result: { _tag: 'Broken', item, applied },
    }
  }
  const damaged: EquipmentItem = {
    ...item,
    durability: {
      current: item.durability.current - applied,
      max: item.durability.max,
    },
  }
  return {
    equipment: { slots: { ...equipment.slots, [slot]: damaged } },
    result: { _tag: 'Damaged', item: damaged, applied },
  }
}

const invalid = (path: string, reason: string): EquipmentValidationResult => ({
  _tag: 'Invalid',
  error: { _tag: 'EquipmentValidationError', path, reason },
})

export const validateEquipmentSnapshot = (value: unknown): EquipmentValidationResult => {
  if (!isRecord(value) || !hasExactKeys(value, ['slots'])) {
    return invalid('$', 'expected an object with exactly a slots key')
  }
  const slots = value['slots']
  if (!isRecord(slots) || !hasExactKeys(slots, EQUIPMENT_SLOTS)) {
    return invalid('$.slots', `expected exactly ${EQUIPMENT_SLOTS.join(', ')}`)
  }

  const validatedSlots = emptyEquipmentSlots()
  for (const slot of EQUIPMENT_SLOTS) {
    const item = slots[slot]
    if (item === null) continue
    if (!isEquipmentItem(item)) return invalid(`$.slots.${slot}`, 'expected a valid equipment item')
    if (!isEquipmentItemForSlot(slot, item)) {
      return invalid(`$.slots.${slot}`, 'item cannot occupy this equipment slot')
    }
    validatedSlots[slot] = copyEquipmentItem(item)
  }
  return { _tag: 'Valid', equipment: { slots: validatedSlots } }
}

/* eslint-disable max-statements, no-magic-numbers -- Equipment rules are a finite Minecraft contract matrix. */
import { describe, expect, it } from 'vitest'
import { itemComponents } from '../src/domain/item-components'
import { itemStack } from '../src/domain/item-stack'
import {
  damageEquipment,
  durability,
  durabilityForItem,
  emptyEquipment,
  equip,
  equippedAt,
  equipmentDefinitionFor,
  equipmentItem,
  isDamageableItemType,
  isDurability,
  isEquipmentItem,
  isEquipmentItemForSlot,
  isEquipmentSlot,
  isEquippableItemType,
  isValidDurabilityForItem,
  itemDurabilityDefinitionFor,
  swapEquipment,
  unequip,
  validateEquipmentSnapshot,
  type Equipment,
  type EquipmentItem,
} from '../src/domain/equipment'

const DIAMOND_SWORD_MAX = 1561
const SMALL_DAMAGE = 10
const LARGE_DAMAGE = 2000

const equipmentWith = (
  equipment: Equipment,
  slot: 'mainhand' | 'head' | 'chest' | 'legs' | 'feet' | 'offhand',
  item: EquipmentItem | null,
): Equipment => ({ slots: { ...equipment.slots, [slot]: item } })

describe('equipment data and validation', () => {
  it('exposes the supported slots and item catalogs', () => {
    expect(isEquipmentSlot('mainhand')).toBe(true)
    expect(isEquipmentSlot('offhand')).toBe(true)
    expect(isEquipmentSlot('invalid')).toBe(false)
    expect(isEquippableItemType('diamond_sword')).toBe(true)
    expect(isEquippableItemType('stone')).toBe(false)
    expect(equipmentDefinitionFor('diamond_helmet')).toEqual({ slots: ['head'] })
    expect(equipmentDefinitionFor('stone')).toBeUndefined()
    expect(isDamageableItemType('diamond_sword')).toBe(true)
    expect(isDamageableItemType('stone')).toBe(false)
    expect(itemDurabilityDefinitionFor('diamond_sword')).toEqual({ maxDurability: DIAMOND_SWORD_MAX })
    expect(itemDurabilityDefinitionFor('stone')).toBeUndefined()
  })

  it('validates durability values at the boundary', () => {
    expect(isDurability({ current: 0, max: DIAMOND_SWORD_MAX })).toBe(true)
    expect(isDurability({ current: SMALL_DAMAGE, max: DIAMOND_SWORD_MAX })).toBe(true)
    expect(isDurability(null)).toBe(false)
    expect(isDurability([])).toBe(false)
    expect(isDurability({ current: SMALL_DAMAGE })).toBe(false)
    expect(isDurability({ current: '10', max: DIAMOND_SWORD_MAX })).toBe(false)
    expect(isDurability({ current: -1, max: DIAMOND_SWORD_MAX })).toBe(false)
    expect(isDurability({ current: SMALL_DAMAGE, max: '1561' })).toBe(false)
    expect(isDurability({ current: SMALL_DAMAGE, max: 0 })).toBe(false)
    expect(isDurability({ current: DIAMOND_SWORD_MAX + 1, max: DIAMOND_SWORD_MAX })).toBe(false)
    expect(isDurability({ current: SMALL_DAMAGE, max: DIAMOND_SWORD_MAX, extra: true })).toBe(false)
    expect(durability(0, DIAMOND_SWORD_MAX)).toEqual({ current: 0, max: DIAMOND_SWORD_MAX })
    expect(() => durability(Number.NaN, DIAMOND_SWORD_MAX)).toThrow(RangeError)
    expect(() => durability(SMALL_DAMAGE, 0)).toThrow(RangeError)
    expect(() => durability(DIAMOND_SWORD_MAX + 1, DIAMOND_SWORD_MAX)).toThrow(RangeError)
    expect(durabilityForItem('diamond_sword')).toEqual({
      current: DIAMOND_SWORD_MAX,
      max: DIAMOND_SWORD_MAX,
    })
    expect(durabilityForItem('stone')).toBeNull()
    expect(isValidDurabilityForItem('diamond_sword', { current: 0, max: DIAMOND_SWORD_MAX })).toBe(true)
    expect(isValidDurabilityForItem('diamond_sword', { current: 0, max: 1 })).toBe(false)
    expect(isValidDurabilityForItem('diamond_sword', { current: 0 })).toBe(false)
    expect(isValidDurabilityForItem('stone', { current: 0, max: DIAMOND_SWORD_MAX })).toBe(false)
  })

  it('constructs and guards equipment items', () => {
    const stack = itemStack('diamond_sword', 1)
    const componentStack = itemStack('diamond_sword', 1, {
      components: itemComponents('diamond_sword', { rarity: 'rare' }),
    })
    const sword = equipmentItem(stack)
    const componentSword = equipmentItem(componentStack)
    const partiallyDamaged = equipmentItem(stack, durability(100, DIAMOND_SWORD_MAX))
    const helmet = equipmentItem(itemStack('diamond_helmet', 1))

    expect(sword).toEqual({ item: 'diamond_sword', count: 1, durability: { current: DIAMOND_SWORD_MAX, max: DIAMOND_SWORD_MAX } })
    expect(componentSword).toEqual({
      item: 'diamond_sword',
      count: 1,
      components: componentStack.components,
      durability: { current: DIAMOND_SWORD_MAX, max: DIAMOND_SWORD_MAX },
    })
    expect(partiallyDamaged.durability).toEqual({ current: 100, max: DIAMOND_SWORD_MAX })
    expect(isEquipmentItem(sword)).toBe(true)
    expect(isEquipmentItem('not an item')).toBe(false)
    expect(isEquipmentItem({ item: 'diamond_sword', count: 0, durability: null })).toBe(false)
    expect(isEquipmentItem({ item: 'diamond_sword', count: 1, durability: null, extra: true })).toBe(false)
    expect(isEquipmentItem({ item: 'diamond_sword', count: 1, durability: { current: 1, max: DIAMOND_SWORD_MAX, extra: true } })).toBe(false)
    expect(isEquipmentItem({ item: 'diamond_sword', count: 1, durability: { current: 1, max: 1 } })).toBe(false)
    expect(isEquipmentItem({ ...componentSword, components: {} })).toBe(false)
    expect(isEquipmentItem({ item: 'stone', count: 1, durability: null })).toBe(false)
    expect(() => equipmentItem(itemStack('stone', 1))).toThrow(RangeError)
    expect(() => equipmentItem(stack, null)).toThrow(RangeError)
    expect(isEquipmentItemForSlot('mainhand', sword)).toBe(true)
    expect(isEquipmentItemForSlot('head', sword)).toBe(false)
    expect(isEquipmentItemForSlot('head', helmet)).toBe(true)
  })
})

describe('equipment operations', () => {
  it('equips, reads, and unequips items without mutating the input', () => {
    const empty = emptyEquipment()
    const helmet = equipmentItem(itemStack('diamond_helmet', 1))
    const equipped = equip(empty, 'head', helmet)
    const rejected = equip(empty, 'feet', helmet)

    expect(equipped.result).toBeNull()
    expect(equippedAt(equipped.equipment, 'head')).toEqual(helmet)
    expect(equippedAt(equipped.equipment, 'head')).not.toBe(helmet)
    expect(equippedAt(empty, 'head')).toBeNull()
    expect(rejected.equipment).toBe(empty)
    expect(rejected.result).toBe(helmet)
    expect(unequip(empty, 'head')).toEqual({ equipment: empty, result: null })
    const removed = unequip(equipped.equipment, 'head')
    expect(removed.result).toEqual(helmet)
    expect(equippedAt(removed.equipment, 'head')).toBeNull()
  })

  it('swaps only items that fit their destination slots', () => {
    const empty = emptyEquipment()
    const sword = equipmentItem(itemStack('diamond_sword', 1))
    const fishingRod = equipmentItem(itemStack('fishing_rod', 1))
    const helmet = equipmentItem(itemStack('diamond_helmet', 1))
    const hands = equipmentWith(equipmentWith(empty, 'mainhand', sword), 'offhand', fishingRod)
    const swapped = swapEquipment(hands, 'mainhand', 'offhand')
    const malformed: EquipmentItem = {
      item: 'diamond_sword',
      count: itemStack('diamond_sword', 1).count,
      durability: null,
    }

    expect(swapEquipment(empty, 'head', 'head')).toBe(empty)
    expect(equippedAt(swapped, 'mainhand')).toEqual(fishingRod)
    expect(equippedAt(swapped, 'offhand')).toEqual(sword)
    expect(swapEquipment(empty, 'head', 'feet')).not.toBe(empty)
    const swordInHand = equipmentWith(empty, 'mainhand', sword)
    expect(swapEquipment(swordInHand, 'head', 'mainhand')).toBe(swordInHand)
    const helmetInHead = equipmentWith(empty, 'head', helmet)
    expect(swapEquipment(helmetInHead, 'head', 'feet')).toBe(helmetInHead)
    const malformedInHand = equipmentWith(empty, 'mainhand', malformed)
    expect(swapEquipment(malformedInHand, 'mainhand', 'head')).toBe(malformedInHand)
  })

  it('applies positive durability damage and reports all outcomes', () => {
    const sword = equipmentItem(itemStack('diamond_sword', 1))
    const equipped = equipmentWith(emptyEquipment(), 'mainhand', sword)
    const damaged = damageEquipment(equipped, 'mainhand', SMALL_DAMAGE)
    const broken = damageEquipment(equipped, 'mainhand', DIAMOND_SWORD_MAX)
    const overBroken = damageEquipment(equipped, 'mainhand', LARGE_DAMAGE)
    const notDamageable = equipmentWith(emptyEquipment(), 'mainhand', {
      item: 'stone',
      count: itemStack('stone', 1).count,
      durability: null,
    })

    expect(damageEquipment(equipped, 'mainhand', 0).result).toEqual({ _tag: 'InvalidAmount', amount: 0 })
    expect(damageEquipment(equipped, 'mainhand', -1).result).toEqual({ _tag: 'InvalidAmount', amount: -1 })
    expect(damageEquipment(equipped, 'mainhand', 1.5).result).toEqual({ _tag: 'InvalidAmount', amount: 1.5 })
    expect(damageEquipment(equipped, 'mainhand', Number.NaN).result._tag).toBe('InvalidAmount')
    expect(damageEquipment(emptyEquipment(), 'mainhand', SMALL_DAMAGE).result).toEqual({ _tag: 'Empty' })
    expect(damageEquipment(notDamageable, 'mainhand', SMALL_DAMAGE).result).toEqual({
      _tag: 'NotDamageable',
      item: notDamageable.slots.mainhand,
    })
    expect(damaged.result).toEqual({
      _tag: 'Damaged',
      item: { item: 'diamond_sword', count: 1, durability: { current: DIAMOND_SWORD_MAX - SMALL_DAMAGE, max: DIAMOND_SWORD_MAX } },
      applied: SMALL_DAMAGE,
    })
    expect(equippedAt(equipped, 'mainhand')).toEqual(sword)
    expect(broken.result).toEqual({ _tag: 'Broken', item: sword, applied: DIAMOND_SWORD_MAX })
    expect(equippedAt(broken.equipment, 'mainhand')).toBeNull()
    expect(overBroken.result).toEqual({ _tag: 'Broken', item: sword, applied: DIAMOND_SWORD_MAX })
  })
})

describe('equipment snapshot validation', () => {
  it('rejects malformed top-level and slot shapes', () => {
    const empty = emptyEquipment()

    expect(validateEquipmentSnapshot(null)).toMatchObject({ _tag: 'Invalid', error: { path: '$' } })
    expect(validateEquipmentSnapshot([])).toMatchObject({ _tag: 'Invalid', error: { path: '$' } })
    expect(validateEquipmentSnapshot({ slots: empty.slots, extra: true })).toMatchObject({
      _tag: 'Invalid',
      error: { path: '$' },
    })
    expect(validateEquipmentSnapshot({ slots: null })).toMatchObject({
      _tag: 'Invalid',
      error: { path: '$.slots' },
    })
    expect(validateEquipmentSnapshot({ slots: [] })).toMatchObject({
      _tag: 'Invalid',
      error: { path: '$.slots' },
    })
    expect(validateEquipmentSnapshot({ slots: {} })).toMatchObject({
      _tag: 'Invalid',
      error: { path: '$.slots' },
    })
    expect(validateEquipmentSnapshot({ slots: { ...empty.slots, extra: null } })).toMatchObject({
      _tag: 'Invalid',
      error: { path: '$.slots' },
    })
  })

  it('accepts valid snapshots and rejects invalid or misplaced items', () => {
    const empty = emptyEquipment()
    const helmet = equipmentItem(itemStack('diamond_helmet', 1))
    const validSnapshot = { slots: { ...empty.slots, head: helmet } }
    const validated = validateEquipmentSnapshot(validSnapshot)

    expect(validated._tag).toBe('Valid')
    if (validated._tag === 'Valid') {
      expect(validated.equipment).not.toBe(validSnapshot)
      expect(equippedAt(validated.equipment, 'head')).toEqual(helmet)
      expect(equippedAt(validated.equipment, 'head')).not.toBe(helmet)
    }
    expect(validateEquipmentSnapshot(empty)).toMatchObject({ _tag: 'Valid' })
    expect(validateEquipmentSnapshot({
      slots: {
        ...empty.slots,
        head: { item: 'diamond_helmet', count: 0, durability: null },
      },
    })).toMatchObject({ _tag: 'Invalid', error: { path: '$.slots.head' } })
    expect(validateEquipmentSnapshot({ slots: { ...empty.slots, feet: helmet } })).toMatchObject({
      _tag: 'Invalid',
      error: { path: '$.slots.feet' },
    })
  })
})

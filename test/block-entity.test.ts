import { describe, expect, it } from 'vitest'

import {
  BARREL_SLOT_COUNT,
  CHEST_SLOT_COUNT,
  DISPENSER_SLOT_COUNT,
  DROPPER_SLOT_COUNT,
  HOPPER_SLOT_COUNT,
  LARGE_CHEST_SLOT_COUNT,
  SHULKER_BOX_SLOT_COUNT,
  STORAGE_CONTAINER_CAPACITIES,
  STORAGE_CONTAINER_KINDS,
  type BlockEntity,
  type StorageContainer,
  type StorageContainerKind,
} from '../src/domain/block-entity-data'
import {
  isBlockEntity,
  isBlockEntityPosition,
  isBrewingState,
  isFurnaceState,
  isStorageContainer,
} from '../src/domain/block-entity-validation'
import {
  blockEntityAt,
  clearBlockEntity,
  emptyBlockEntities,
  setBlockEntity,
  type BlockEntities,
} from '../src/domain/block-entity'
import { blockPosition, type BlockPosition } from '../src/domain/coordinate-primitives'
import { itemStack, type Slot } from '../src/domain/item-stack'
import { emptyFurnaceState, furnaceState, type FurnaceState } from '../src/domain/smelting'
import {
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  brewingState,
  emptyBrewingState,
  type BrewingState,
} from '../src/domain/brewing'

const AT_ORIGIN: BlockPosition = blockPosition(0, 0, 0)
const AT_OTHER: BlockPosition = blockPosition(1, 2, 3)

const containerOf = (kind: StorageContainerKind, slots: ReadonlyArray<Slot>): StorageContainer => ({
  kind,
  capacity: STORAGE_CONTAINER_CAPACITIES[kind],
  slots,
})

describe('storage container capacities', () => {
  it('names every capacity and matches the declared table (cross-checked against Minecraft Wiki: Inventory, Shulker Box)', () => {
    expect(STORAGE_CONTAINER_CAPACITIES).toStrictEqual({
      chest: CHEST_SLOT_COUNT,
      largeChest: LARGE_CHEST_SLOT_COUNT,
      hopper: HOPPER_SLOT_COUNT,
      dispenser: DISPENSER_SLOT_COUNT,
      dropper: DROPPER_SLOT_COUNT,
      shulkerBox: SHULKER_BOX_SLOT_COUNT,
      barrel: BARREL_SLOT_COUNT,
    })
    expect(CHEST_SLOT_COUNT).toBe(27)
    expect(LARGE_CHEST_SLOT_COUNT).toBe(54)
    expect(HOPPER_SLOT_COUNT).toBe(5)
    expect(DISPENSER_SLOT_COUNT).toBe(9)
    expect(DROPPER_SLOT_COUNT).toBe(9)
    expect(SHULKER_BOX_SLOT_COUNT).toBe(27)
    expect(BARREL_SLOT_COUNT).toBe(27)
  })
})

describe('storage container guard', () => {
  it('accepts an empty container of every declared kind', () => {
    for (const kind of STORAGE_CONTAINER_KINDS) {
      expect(isStorageContainer(containerOf(kind, []))).toBe(true)
    }
  })

  it('accepts a container filled to exactly its capacity', () => {
    const stack = itemStack('cobblestone', 1)
    const full = Array.from({ length: HOPPER_SLOT_COUNT }, () => stack)
    expect(isStorageContainer(containerOf('hopper', full))).toBe(true)
  })

  it('rejects a non-object value', () => {
    expect(isStorageContainer(null)).toBe(false)
    expect(isStorageContainer('chest')).toBe(false)
  })

  it('rejects an unknown kind', () => {
    expect(isStorageContainer({ kind: 'trapChest', capacity: CHEST_SLOT_COUNT, slots: [] })).toBe(false)
  })

  it('rejects a capacity that does not match the declared table', () => {
    expect(isStorageContainer({ kind: 'chest', capacity: HOPPER_SLOT_COUNT, slots: [] })).toBe(false)
  })

  it('rejects non-array slots', () => {
    expect(isStorageContainer({ kind: 'chest', capacity: CHEST_SLOT_COUNT, slots: 'none' })).toBe(false)
  })

  it('rejects a slot count over the declared capacity', () => {
    const overflowing = Array.from({ length: HOPPER_SLOT_COUNT + 1 }, () => undefined)
    expect(isStorageContainer(containerOf('hopper', overflowing))).toBe(false)
  })

  it('rejects a container holding an invalid slot', () => {
    // The guard's whole job is to reject values the type system never saw, so
    // the malformed container cannot be built through the typed helper.
    const malformed: unknown = {
      kind: 'chest',
      capacity: CHEST_SLOT_COUNT,
      slots: [{ item: 'stone' }],
    }
    expect(isStorageContainer(malformed)).toBe(false)
  })
})

describe('furnace state guard', () => {
  const validFurnace: FurnaceState = furnaceState({
    station: 'blast_furnace',
    input: itemStack('cobblestone', 1),
    fuel: itemStack('coal', 1),
    output: itemStack('stone', 1),
    fuelTimeRemainingSecs: 5,
    fuelTimeTotalSecs: 10,
    cookProgressSecs: 2,
  })

  it('accepts an empty furnace and a furnace mid-cook', () => {
    expect(isFurnaceState(emptyFurnaceState())).toBe(true)
    expect(isFurnaceState(validFurnace)).toBe(true)
  })

  it('rejects a non-object value', () => {
    expect(isFurnaceState(null)).toBe(false)
    expect(isFurnaceState('furnace')).toBe(false)
  })

  it('rejects an unknown cooking station', () => {
    expect(isFurnaceState({ ...validFurnace, station: 'campfire' })).toBe(false)
  })

  it('rejects an invalid input slot', () => {
    expect(isFurnaceState({ ...validFurnace, input: { item: 'stone' } })).toBe(false)
  })

  it('rejects an invalid fuel slot', () => {
    expect(isFurnaceState({ ...validFurnace, fuel: { item: 'coal' } })).toBe(false)
  })

  it('rejects an invalid output slot', () => {
    expect(isFurnaceState({ ...validFurnace, output: { item: 'stone' } })).toBe(false)
  })

  it('rejects a negative fuelTimeRemainingSecs', () => {
    expect(isFurnaceState({ ...validFurnace, fuelTimeRemainingSecs: -1 })).toBe(false)
  })

  it('rejects a negative fuelTimeTotalSecs', () => {
    expect(isFurnaceState({ ...validFurnace, fuelTimeTotalSecs: -1 })).toBe(false)
  })

  it('rejects a negative cookProgressSecs', () => {
    expect(isFurnaceState({ ...validFurnace, cookProgressSecs: -1 })).toBe(false)
  })

  it('rejects fuelTimeRemainingSecs exceeding fuelTimeTotalSecs', () => {
    expect(
      isFurnaceState({ ...validFurnace, fuelTimeRemainingSecs: 100, fuelTimeTotalSecs: 10 }),
    ).toBe(false)
  })
})

describe('brewing state guard', () => {
  const validBrewing: BrewingState = brewingState({
    bottles: [itemStack('glass_bottle', 1), undefined, undefined],
    ingredient: itemStack('nether_wart', 1),
    fuel: itemStack('blaze_powder', 1),
    fuelCharges: 5,
    brewProgressSecs: 10,
  })

  it('accepts an empty brewing stand and one mid-brew', () => {
    expect(isBrewingState(emptyBrewingState())).toBe(true)
    expect(isBrewingState(validBrewing)).toBe(true)
  })

  it('rejects a non-object value', () => {
    expect(isBrewingState(null)).toBe(false)
    expect(isBrewingState('brewing')).toBe(false)
  })

  it('rejects a bottle array of the wrong length', () => {
    expect(isBrewingState({ ...validBrewing, bottles: [undefined, undefined] })).toBe(false)
  })

  it('rejects a bottle slot holding an invalid stack', () => {
    expect(
      isBrewingState({ ...validBrewing, bottles: [{ item: 'potion' }, undefined, undefined] }),
    ).toBe(false)
  })

  it('rejects an invalid ingredient slot', () => {
    expect(isBrewingState({ ...validBrewing, ingredient: { item: 'nether_wart' } })).toBe(false)
  })

  it('rejects an invalid fuel slot', () => {
    expect(isBrewingState({ ...validBrewing, fuel: { item: 'blaze_powder' } })).toBe(false)
  })

  it('rejects a negative fuelCharges', () => {
    expect(isBrewingState({ ...validBrewing, fuelCharges: -1 })).toBe(false)
  })

  it('rejects a fuelCharges above the maximum', () => {
    expect(isBrewingState({ ...validBrewing, fuelCharges: BREWING_MAX_FUEL_CHARGES + 1 })).toBe(false)
  })

  it('rejects a non-integer fuelCharges', () => {
    expect(isBrewingState({ ...validBrewing, fuelCharges: 1.5 })).toBe(false)
  })

  it('rejects a negative brewProgressSecs', () => {
    expect(isBrewingState({ ...validBrewing, brewProgressSecs: -1 })).toBe(false)
  })

  it('rejects a brewProgressSecs above the brew time', () => {
    expect(isBrewingState({ ...validBrewing, brewProgressSecs: BREWING_TIME_SECS + 1 })).toBe(false)
  })
})

describe('block entity position guard', () => {
  it('accepts a valid position', () => {
    expect(isBlockEntityPosition(AT_ORIGIN)).toBe(true)
  })

  it('rejects a non-object value', () => {
    expect(isBlockEntityPosition(null)).toBe(false)
    expect(isBlockEntityPosition('0,0,0')).toBe(false)
  })

  it('rejects a non-integer x', () => {
    expect(isBlockEntityPosition({ x: 1.5, y: 0, z: 0 })).toBe(false)
  })

  it('rejects a non-integer y', () => {
    expect(isBlockEntityPosition({ x: 0, y: 1.5, z: 0 })).toBe(false)
  })

  it('rejects a non-integer z', () => {
    expect(isBlockEntityPosition({ x: 0, y: 0, z: 1.5 })).toBe(false)
  })

  it('rejects a position missing a field', () => {
    expect(isBlockEntityPosition({ x: 0, y: 0 })).toBe(false)
  })
})

describe('block entity guard', () => {
  const storageEntity: BlockEntity = {
    _tag: 'StorageContainer',
    position: AT_ORIGIN,
    container: containerOf('chest', []),
  }
  const furnaceEntity: BlockEntity = {
    _tag: 'Furnace',
    position: AT_ORIGIN,
    state: emptyFurnaceState(),
  }
  const brewingEntity: BlockEntity = {
    _tag: 'BrewingStand',
    position: AT_ORIGIN,
    state: emptyBrewingState(),
  }
  const signEntity: BlockEntity = {
    _tag: 'Sign',
    position: AT_ORIGIN,
    text: 'Welcome',
  }

  it('accepts a valid entity of every tag', () => {
    expect(isBlockEntity(storageEntity)).toBe(true)
    expect(isBlockEntity(furnaceEntity)).toBe(true)
    expect(isBlockEntity(brewingEntity)).toBe(true)
    expect(isBlockEntity(signEntity)).toBe(true)
  })

  it('rejects a non-object value', () => {
    expect(isBlockEntity(null)).toBe(false)
    expect(isBlockEntity('sign')).toBe(false)
  })

  it('rejects an invalid position', () => {
    expect(isBlockEntity({ ...storageEntity, position: { x: 'a', y: 0, z: 0 } })).toBe(false)
  })

  it('rejects an unrecognised _tag (the default branch)', () => {
    expect(isBlockEntity({ ...storageEntity, _tag: 'Cauldron' })).toBe(false)
  })

  it('rejects a StorageContainer entity with an invalid container', () => {
    expect(isBlockEntity({ ...storageEntity, container: { kind: 'chest' } })).toBe(false)
  })

  it('rejects a Furnace entity with an invalid state', () => {
    expect(isBlockEntity({ ...furnaceEntity, state: {} })).toBe(false)
  })

  it('rejects a BrewingStand entity with an invalid state', () => {
    expect(isBlockEntity({ ...brewingEntity, state: {} })).toBe(false)
  })

  it('rejects a Sign entity with invalid text', () => {
    expect(isBlockEntity({ ...signEntity, text: 123 })).toBe(false)
  })
})

describe('block entities collection', () => {
  it('starts empty', () => {
    const state: BlockEntities = emptyBlockEntities()
    expect(state.entities.size).toBe(0)
    expect(blockEntityAt(state, AT_ORIGIN)).toBeUndefined()
  })

  it('sets and looks up an entity by position', () => {
    const entity: BlockEntity = { _tag: 'Sign', position: AT_ORIGIN, text: 'hi' }
    const state = setBlockEntity(emptyBlockEntities(), entity)
    expect(blockEntityAt(state, AT_ORIGIN)).toStrictEqual(entity)
    expect(blockEntityAt(state, AT_OTHER)).toBeUndefined()
  })

  it('does not mutate the source state', () => {
    const entity: BlockEntity = { _tag: 'Sign', position: AT_ORIGIN, text: 'hi' }
    const before = emptyBlockEntities()
    setBlockEntity(before, entity)
    expect(before.entities.size).toBe(0)
  })

  it('clears an entity at a position', () => {
    const entity: BlockEntity = { _tag: 'Sign', position: AT_ORIGIN, text: 'hi' }
    const withEntity = setBlockEntity(emptyBlockEntities(), entity)
    const cleared = clearBlockEntity(withEntity, AT_ORIGIN)
    expect(blockEntityAt(cleared, AT_ORIGIN)).toBeUndefined()
  })

  it('clearing a position with nothing there is a no-op', () => {
    const state = emptyBlockEntities()
    expect(clearBlockEntity(state, AT_ORIGIN)).toBe(state)
  })
})

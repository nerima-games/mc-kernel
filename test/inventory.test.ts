import { describe, expect, it } from 'vitest'
import { INVENTORY_SLOT_COUNT } from '../src/domain/item/inventory-data'

describe('inventory data', () => {
  it('keeps the fixed player inventory slot count', () => {
    expect(INVENTORY_SLOT_COUNT).toBe(36)
  })
})

import { describe, expect, it } from 'vitest'
import { HOTBAR_SIZE, HOTBAR_START } from '../src/domain/item/hotbar-data'

describe('hotbar data', () => {
  it('keeps the selectable slot count and first hotbar slot index', () => {
    expect(HOTBAR_SIZE).toBe(9)
    expect(HOTBAR_START).toBe(27)
  })
})

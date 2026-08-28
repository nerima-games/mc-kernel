import { HOTBAR_SIZE, HOTBAR_START } from './hotbar-data.js'

export { HOTBAR_SIZE, HOTBAR_START } from './hotbar-data.js'

export const isHotbarIndex = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value < HOTBAR_SIZE

export const clampHotbarIndex = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(HOTBAR_SIZE - 1, Math.max(0, Math.trunc(value)))
}

export const cycleHotbarIndex = (index: number, delta: number): number => {
  const current = clampHotbarIndex(index)
  if (!Number.isFinite(delta) || delta === 0) {
    return current
  }
  const steps = Math.trunc(delta)
  return ((current + steps) % HOTBAR_SIZE + HOTBAR_SIZE) % HOTBAR_SIZE
}

export const hotbarSlotIndex = (index: number): number => HOTBAR_START + clampHotbarIndex(index)

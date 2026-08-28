import { Brand } from 'effect'
import { blockPositionKeyOf, type BlockPositionKey } from './coordinate-keys.js'
import type { BlockPosition } from './coordinate-primitives.js'
import {
  FLUID_LEVEL_MAX,
  FLUID_LEVEL_MIN,
  type FlowingFluidKind,
} from './fluid-data.js'

export type FluidLevel = number & Brand.Brand<'FluidLevel'>

export const fluidLevel: Brand.Brand.Constructor<FluidLevel> = Brand.refined<FluidLevel>(
  (value): value is FluidLevel =>
    Number.isInteger(value) && value >= FLUID_LEVEL_MIN && value <= FLUID_LEVEL_MAX,
  (value) =>
    Brand.error(
      `Expected a fluid level from ${FLUID_LEVEL_MIN} to ${FLUID_LEVEL_MAX}, received ${value}`,
    ),
)

export type FluidCell = Readonly<{
  falling: boolean
  kind: FlowingFluidKind
  level: FluidLevel
}>

export type FluidState = Readonly<{
  cells: ReadonlyMap<BlockPositionKey, FluidCell>
  scheduled: ReadonlySet<BlockPositionKey>
}>

export const emptyFluidState = (): FluidState => ({
  cells: new Map(),
  scheduled: new Set(),
})

export const fluidCellAt = (state: FluidState, position: BlockPosition): FluidCell | undefined =>
  state.cells.get(blockPositionKeyOf(position))

export const setFluidCell = (
  state: FluidState,
  position: BlockPosition,
  cell: FluidCell,
): FluidState => {
  const key = blockPositionKeyOf(position)
  const cells = new Map(state.cells)
  cells.set(key, cell)
  return { ...state, cells }
}

export const clearFluidCell = (state: FluidState, position: BlockPosition): FluidState => {
  const key = blockPositionKeyOf(position)
  if (!state.cells.has(key) && !state.scheduled.has(key)) return state
  const cells = new Map(state.cells)
  cells.delete(key)
  const scheduled = new Set(state.scheduled)
  scheduled.delete(key)
  return { ...state, cells, scheduled }
}

export const scheduleFluidAt = (state: FluidState, position: BlockPosition): FluidState => {
  const key = blockPositionKeyOf(position)
  if (state.scheduled.has(key)) return state
  const scheduled = new Set(state.scheduled)
  scheduled.add(key)
  return { ...state, scheduled }
}

export const unscheduleFluidAt = (state: FluidState, position: BlockPosition): FluidState => {
  const key = blockPositionKeyOf(position)
  if (!state.scheduled.has(key)) return state
  const scheduled = new Set(state.scheduled)
  scheduled.delete(key)
  return { ...state, scheduled }
}

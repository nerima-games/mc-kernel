import { Brand } from 'effect'
import { blockPositionKeyOf, type BlockPositionKey } from './coordinate-keys.js'
import type { BlockPosition } from './coordinate-primitives.js'
import {
  REDSTONE_POWER_MAX,
  REDSTONE_POWER_MIN,
} from './redstone-data.js'
import type { RedstoneDevice } from './redstone-devices.js'

export type RedstonePower = number & Brand.Brand<'RedstonePower'>

export const redstonePower: Brand.Brand.Constructor<RedstonePower> = Brand.refined<RedstonePower>(
  (value): value is RedstonePower =>
    Number.isInteger(value) && value >= REDSTONE_POWER_MIN && value <= REDSTONE_POWER_MAX,
  (value) =>
    Brand.error(
      `Expected redstone power from ${REDSTONE_POWER_MIN} to ${REDSTONE_POWER_MAX}, received ${value}`,
    ),
)

export type RedstoneRepeaterTimer = Readonly<{
  power: RedstonePower
  remainingTicks: number
}>

export type RedstoneDeviceStateUpdate = Readonly<{
  deviceOutputs: ReadonlyMap<BlockPositionKey, RedstonePower>
  observerSnapshots: ReadonlyMap<BlockPositionKey, ReadonlyMap<BlockPositionKey, number>>
  repeaterTimers: ReadonlyMap<BlockPositionKey, RedstoneRepeaterTimer>
}>

export type RedstoneState = Readonly<{
  deviceOutputs: ReadonlyMap<BlockPositionKey, RedstonePower>
  devices: ReadonlyMap<BlockPositionKey, RedstoneDevice>
  inputs: ReadonlyMap<BlockPositionKey, RedstonePower>
  observerSnapshots: ReadonlyMap<BlockPositionKey, ReadonlyMap<BlockPositionKey, number>>
  repeaterTimers: ReadonlyMap<BlockPositionKey, RedstoneRepeaterTimer>
  wires: ReadonlyMap<BlockPositionKey, RedstonePower>
}>

export const emptyRedstoneState = (): RedstoneState => ({
  deviceOutputs: new Map(),
  devices: new Map(),
  inputs: new Map(),
  observerSnapshots: new Map(),
  repeaterTimers: new Map(),
  wires: new Map(),
})

export const redstoneInputAt = (
  state: RedstoneState,
  position: BlockPosition,
): RedstonePower | undefined => state.inputs.get(blockPositionKeyOf(position))

export const redstonePowerAt = (state: RedstoneState, position: BlockPosition): RedstonePower =>
  state.wires.get(blockPositionKeyOf(position)) ?? redstonePower(REDSTONE_POWER_MIN)

export const redstoneDevicePowerAt = (
  state: RedstoneState,
  position: BlockPosition,
): RedstonePower =>
  state.deviceOutputs.get(blockPositionKeyOf(position)) ?? redstonePower(REDSTONE_POWER_MIN)

export const redstoneDeviceAt = (
  state: RedstoneState,
  position: BlockPosition,
): RedstoneDevice | undefined => state.devices.get(blockPositionKeyOf(position))

export const setRedstoneInput = (
  state: RedstoneState,
  position: BlockPosition,
  power: RedstonePower,
): RedstoneState => {
  const inputs = new Map(state.inputs)
  inputs.set(blockPositionKeyOf(position), power)
  return { ...state, inputs }
}

export const clearRedstoneInput = (state: RedstoneState, position: BlockPosition): RedstoneState => {
  const key = blockPositionKeyOf(position)
  if (!state.inputs.has(key)) return state
  const inputs = new Map(state.inputs)
  inputs.delete(key)
  return { ...state, inputs }
}

export const setRedstoneDevice = (
  state: RedstoneState,
  position: BlockPosition,
  device: RedstoneDevice,
): RedstoneState => {
  const devices = new Map(state.devices)
  devices.set(blockPositionKeyOf(position), device)
  return { ...state, devices }
}

export const clearRedstoneDevice = (state: RedstoneState, position: BlockPosition): RedstoneState => {
  const key = blockPositionKeyOf(position)
  if (!state.devices.has(key)) return state
  const devices = new Map(state.devices)
  devices.delete(key)
  return { ...state, devices }
}

export const withRedstoneWirePowers = (
  state: RedstoneState,
  wires: ReadonlyMap<BlockPositionKey, RedstonePower>,
): RedstoneState => ({ ...state, wires: new Map(wires) })

export const withRedstoneDeviceState = (
  state: RedstoneState,
  update: RedstoneDeviceStateUpdate,
): RedstoneState => ({
  ...state,
  deviceOutputs: new Map(update.deviceOutputs),
  observerSnapshots: new Map(update.observerSnapshots),
  repeaterTimers: new Map(update.repeaterTimers),
})

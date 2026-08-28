import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block-registry'
import { blockPosition, type BlockPosition } from '../src/domain/coordinate-primitives'
import {
  REDSTONE_BLOCK_IDS,
  REDSTONE_POWER_MAX,
  REDSTONE_POWER_MIN,
  REDSTONE_POWER_STEP,
  redstoneComparator,
  redstoneObserver,
  redstonePower,
  redstoneRepeater,
  repeaterDelayTicks,
  REDSTONE_REPEATER_DELAY_MAX_TICKS,
  REDSTONE_REPEATER_DELAY_MIN_TICKS,
  clearRedstoneDevice,
  clearRedstoneInput,
  emptyRedstoneState,
  redstoneDeviceAt,
  redstoneDevicePowerAt,
  redstoneInputAt,
  redstonePowerAt,
  setRedstoneDevice,
  setRedstoneInput,
  withRedstoneDeviceState,
  withRedstoneWirePowers,
} from '../src/domain/redstone'
import { blockPositionKeyOf, type BlockPositionKey } from '../src/domain/coordinate-keys'
import type { RedstonePower } from '../src/domain/redstone'

describe('redstone', () => {
  it('exposes device block vocabulary and power ranges', () => {
    expect(REDSTONE_POWER_MIN).toBe(0)
    expect(REDSTONE_POWER_MAX).toBe(15)
    expect(REDSTONE_POWER_STEP).toBe(1)
    expect(REDSTONE_REPEATER_DELAY_MIN_TICKS).toBe(1)
    expect(REDSTONE_REPEATER_DELAY_MAX_TICKS).toBe(4)
    expect(REDSTONE_BLOCK_IDS.block).toBe(blockIdOf('redstone_block'))
    expect(REDSTONE_BLOCK_IDS.wire).toBe(blockIdOf('redstone_wire'))
    expect(REDSTONE_BLOCK_IDS.lampLit).toBe(blockIdOf('redstone_lamp_lit'))
  })

  it('brands power and device parameters at runtime', () => {
    expect(redstonePower(REDSTONE_POWER_MIN)).toBe(0)
    expect(redstonePower(REDSTONE_POWER_MAX)).toBe(15)
    expect(() => redstonePower(-1)).toThrow()
    expect(() => redstonePower(16)).toThrow()
    expect(() => redstonePower(1.5)).toThrow()
    expect(repeaterDelayTicks(1)).toBe(1)
    expect(repeaterDelayTicks(4)).toBe(4)
    expect(() => repeaterDelayTicks(0)).toThrow()
    expect(() => repeaterDelayTicks(5)).toThrow()
    expect(() => repeaterDelayTicks(1.5)).toThrow()

    expect(redstoneRepeater('north', 2, true)).toStrictEqual({
      kind: 'repeater',
      facing: 'north',
      delayTicks: 2,
      locked: true,
    })
    expect(redstoneComparator('south', 'subtract')).toStrictEqual({
      kind: 'comparator',
      facing: 'south',
      mode: 'subtract',
    })
    expect(() => redstoneComparator('south', 'invalid')).toThrow()
    expect(redstoneObserver('up')).toStrictEqual({ kind: 'observer', facing: 'up' })
    expect(() => redstoneRepeater('up', 1)).toThrow()
    expect(() => redstoneObserver('sideways')).toThrow()
  })

  it('stores inputs, wires, devices, outputs, snapshots, and timers immutably', () => {
    const positionA: BlockPosition = blockPosition(1, 2, 3)
    const positionB: BlockPosition = blockPosition(4, 5, 6)
    const keyA: BlockPositionKey = blockPositionKeyOf(positionA)
    const keyB: BlockPositionKey = blockPositionKeyOf(positionB)
    const power: RedstonePower = redstonePower(15)
    const empty = emptyRedstoneState()

    expect(redstoneInputAt(empty, positionA)).toBeUndefined()
    expect(redstonePowerAt(empty, positionA)).toBe(redstonePower(0))
    expect(redstoneDevicePowerAt(empty, positionA)).toBe(redstonePower(0))
    expect(redstoneDeviceAt(empty, positionA)).toBeUndefined()

    const withInput = setRedstoneInput(empty, positionA, power)
    expect(redstoneInputAt(withInput, positionA)).toBe(power)
    expect(clearRedstoneInput(withInput, positionB)).toBe(withInput)
    const withoutInput = clearRedstoneInput(withInput, positionA)
    expect(redstoneInputAt(withoutInput, positionA)).toBeUndefined()

    const repeater = redstoneRepeater('east', 2)
    const withDevice = setRedstoneDevice(withInput, positionA, repeater)
    expect(redstoneDeviceAt(withDevice, positionA)).toBe(repeater)
    expect(clearRedstoneDevice(withDevice, positionB)).toBe(withDevice)
    const withoutDevice = clearRedstoneDevice(withDevice, positionA)
    expect(redstoneDeviceAt(withoutDevice, positionA)).toBeUndefined()

    const wires = new Map<BlockPositionKey, RedstonePower>([[keyA, redstonePower(4)]])
    const withWires = withRedstoneWirePowers(withDevice, wires)
    wires.clear()
    expect(redstonePowerAt(withWires, positionA)).toBe(redstonePower(4))
    expect(redstonePowerAt(withWires, positionB)).toBe(redstonePower(0))

    const snapshots = new Map<BlockPositionKey, ReadonlyMap<BlockPositionKey, number>>([
      [keyA, new Map([[keyB, 42]])],
    ])
    const updated = withRedstoneDeviceState(withWires, {
      deviceOutputs: new Map([[keyA, power]]),
      observerSnapshots: snapshots,
      repeaterTimers: new Map([[keyA, { power, remainingTicks: 2 }]]),
    })
    snapshots.clear()
    expect(redstoneDevicePowerAt(updated, positionA)).toBe(power)
    expect(updated.observerSnapshots.get(keyA)?.get(keyB)).toBe(42)
    expect(updated.repeaterTimers.get(keyA)).toStrictEqual({ power, remainingTicks: 2 })
  })
})

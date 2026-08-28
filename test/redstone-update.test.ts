import { describe, expect, it } from 'vitest'
import { type BlockId, blockIdOf } from '../src/domain/block-registry'
import { blockPositionKeyOf } from '../src/domain/coordinate-keys'
import { blockPosition, type BlockPosition } from '../src/domain/coordinate-primitives'
import {
  emptyBlockWorld,
  setBlockAt,
  type BlockWorld,
} from '../src/domain/block-world'
import {
  collectRedstoneLayout,
  deviceOutputAtTarget,
} from '../src/domain/redstone-network'
import {
  emptyRedstoneState,
  redstoneComparator,
  redstoneDevicePowerAt,
  redstoneObserver,
  redstonePower,
  redstonePowerAt,
  redstoneRepeater,
  setRedstoneDevice,
  setRedstoneInput,
  withRedstoneDeviceState,
} from '../src/domain/redstone'
import { updateRedstone } from '../src/domain/redstone-update'

const at = (x: number, y = 0, z = 0): BlockPosition => blockPosition(x, y, z)

const place = (world: BlockWorld, position: BlockPosition, blockId: BlockId): BlockWorld =>
  setBlockAt(world, position, blockId)

describe('redstone update', () => {
  it('propagates a block source with distance attenuation and powers a lamp', () => {
    const source = at(0)
    const firstWire = at(1)
    const secondWire = at(2)
    const thirdWire = at(3)
    const target = at(4)
    let world = place(emptyBlockWorld(), source, blockIdOf('redstone_block'))
    world = place(world, firstWire, blockIdOf('redstone_wire'))
    world = place(world, secondWire, blockIdOf('redstone_wire'))
    world = place(world, thirdWire, blockIdOf('redstone_wire'))
    world = place(world, target, blockIdOf('redstone_lamp'))

    const result = updateRedstone(world)

    expect(redstonePowerAt(result.state, firstWire)).toBe(redstonePower(15))
    expect(redstonePowerAt(result.state, secondWire)).toBe(redstonePower(14))
    expect(redstonePowerAt(result.state, thirdWire)).toBe(redstonePower(13))
    expect(result.world.get(blockPositionKeyOf(target))).toBe(blockIdOf('redstone_lamp_lit'))
    expect(result.changes).toHaveLength(4)
    expect(result.changes).toContainEqual({
      after: redstonePower(15),
      before: redstonePower(0),
      kind: 'wire-power',
      position: firstWire,
    })
    expect(result.changes).toContainEqual({
      after: blockIdOf('redstone_lamp_lit'),
      before: blockIdOf('redstone_lamp'),
      kind: 'lamp-state',
      position: target,
    })

    const stable = updateRedstone(result.world, result.state)
    expect(stable.changes).toEqual([])
    expect(stable.world).toBe(result.world)
  })

  it('takes the strongest branch and turns a directly powered lamp on', () => {
    const source = at(0)
    const upperBranch = at(0, 0, 1)
    const lowerBranch = at(0, 0, -1)
    const merge = at(1)
    const directLamp = at(0, 1)
    let world = place(emptyBlockWorld(), source, blockIdOf('redstone_block'))
    world = place(world, upperBranch, blockIdOf('redstone_wire'))
    world = place(world, lowerBranch, blockIdOf('redstone_wire'))
    world = place(world, merge, blockIdOf('redstone_wire'))
    world = place(world, directLamp, blockIdOf('redstone_lamp'))

    const result = updateRedstone(world)

    expect(redstonePowerAt(result.state, upperBranch)).toBe(redstonePower(15))
    expect(redstonePowerAt(result.state, lowerBranch)).toBe(redstonePower(15))
    expect(redstonePowerAt(result.state, merge)).toBe(redstonePower(15))
    expect(result.world.get(blockPositionKeyOf(directLamp))).toBe(
      blockIdOf('redstone_lamp_lit'),
    )
  })

  it('powers a lamp directly from a comparator output', () => {
    const comparator = at(0)
    const back = at(-1)
    const lamp = at(1)
    let world = place(emptyBlockWorld(), comparator, blockIdOf('comparator'))
    world = place(world, back, blockIdOf('redstone_block'))
    world = place(world, lamp, blockIdOf('redstone_lamp'))
    const state = setRedstoneDevice(
      emptyRedstoneState(),
      comparator,
      redstoneComparator('east'),
    )

    const result = updateRedstone(world, state)

    expect(redstoneDevicePowerAt(result.state, comparator)).toBe(redstonePower(15))
    expect(result.world.get(blockPositionKeyOf(lamp))).toBe(blockIdOf('redstone_lamp_lit'))
  })

  it('treats a device output without a transient power as unpowered', () => {
    const comparator = at(0)
    const target = at(1)
    const world = place(
      place(emptyBlockWorld(), comparator, blockIdOf('comparator')),
      target,
      blockIdOf('stone'),
    )
    const state = setRedstoneDevice(
      emptyRedstoneState(),
      comparator,
      redstoneComparator('east'),
    )
    const layout = collectRedstoneLayout(world, state)

    expect(
      deviceOutputAtTarget(
        { deviceOutputs: emptyRedstoneState().deviceOutputs, devices: layout.devices },
        target,
      ),
    ).toBe(redstonePower(0))
  })

  it('uses switch inputs, and treats an unpowered torch as off', () => {
    const leverPosition = at(0)
    const buttonPosition = at(0, 2)
    const torchPosition = at(0, 4)
    const leverWire = at(1)
    const buttonWire = at(1, 2)
    const torchWire = at(1, 4)
    let world = place(emptyBlockWorld(), leverPosition, blockIdOf('lever'))
    world = place(world, buttonPosition, blockIdOf('stone_button'))
    world = place(world, torchPosition, blockIdOf('redstone_torch'))
    world = place(world, leverWire, blockIdOf('redstone_wire'))
    world = place(world, buttonWire, blockIdOf('redstone_wire'))
    world = place(world, torchWire, blockIdOf('redstone_wire'))
    world = place(world, at(2), blockIdOf('redstone_lamp'))
    world = place(world, at(2, 2), blockIdOf('redstone_lamp'))
    world = place(world, at(2, 4), blockIdOf('redstone_lamp'))

    const off = updateRedstone(world)
    expect(redstonePowerAt(off.state, leverWire)).toBe(redstonePower(0))
    expect(redstonePowerAt(off.state, buttonWire)).toBe(redstonePower(0))
    expect(redstonePowerAt(off.state, torchWire)).toBe(redstonePower(15))
    expect(off.world.get(blockPositionKeyOf(at(2)))).toBe(blockIdOf('redstone_lamp'))
    expect(off.world.get(blockPositionKeyOf(at(2, 2)))).toBe(blockIdOf('redstone_lamp'))
    expect(off.world.get(blockPositionKeyOf(at(2, 4)))).toBe(blockIdOf('redstone_lamp_lit'))

    const withInputs = setRedstoneInput(
      setRedstoneInput(off.state, leverPosition, redstonePower(15)),
      buttonPosition,
      redstonePower(15),
    )
    const on = updateRedstone(off.world, withInputs)
    expect(redstonePowerAt(on.state, leverWire)).toBe(redstonePower(15))
    expect(redstonePowerAt(on.state, buttonWire)).toBe(redstonePower(15))
    expect(on.world.get(blockPositionKeyOf(at(2)))).toBe(blockIdOf('redstone_lamp_lit'))
    expect(on.world.get(blockPositionKeyOf(at(2, 2)))).toBe(blockIdOf('redstone_lamp_lit'))

    const torchOff = updateRedstone(
      on.world,
      setRedstoneInput(on.state, torchPosition, redstonePower(0)),
    )
    expect(redstonePowerAt(torchOff.state, torchWire)).toBe(redstonePower(0))
    expect(torchOff.world.get(blockPositionKeyOf(at(2, 4)))).toBe(blockIdOf('redstone_lamp'))
  })

  it('uses a pressure plate input as a redstone source', () => {
    const plate = at(0)
    const lamp = at(1)
    const world = place(
      place(emptyBlockWorld(), plate, blockIdOf('pressure_plate')),
      lamp,
      blockIdOf('redstone_lamp'),
    )

    const off = updateRedstone(world)
    expect(off.world.get(blockPositionKeyOf(lamp))).toBe(blockIdOf('redstone_lamp'))
    expect(collectRedstoneLayout(world, off.state).sources).toContainEqual(plate)

    const on = updateRedstone(
      world,
      setRedstoneInput(emptyRedstoneState(), plate, redstonePower(15)),
    )
    expect(on.world.get(blockPositionKeyOf(lamp))).toBe(blockIdOf('redstone_lamp_lit'))

    const released = updateRedstone(
      on.world,
      setRedstoneInput(on.state, plate, redstonePower(0)),
    )
    expect(released.world.get(blockPositionKeyOf(lamp))).toBe(blockIdOf('redstone_lamp'))
  })

  it('removes stale wire power when a source is switched off', () => {
    const source = at(0)
    const wirePosition = at(1)
    const world = place(
      place(emptyBlockWorld(), source, blockIdOf('lever')),
      wirePosition,
      blockIdOf('redstone_wire'),
    )
    const on = updateRedstone(
      world,
      setRedstoneInput(emptyRedstoneState(), source, redstonePower(15)),
    )
    const off = updateRedstone(
      world,
      setRedstoneInput(on.state, source, redstonePower(0)),
    )

    expect(redstonePowerAt(on.state, wirePosition)).toBe(redstonePower(15))
    expect(redstonePowerAt(off.state, wirePosition)).toBe(redstonePower(0))
    expect(off.state.wires.has(blockPositionKeyOf(wirePosition))).toBe(false)
    expect(off.changes).toContainEqual({
      after: redstonePower(0),
      before: redstonePower(15),
      kind: 'wire-power',
      position: wirePosition,
    })
  })

  it('ignores unrelated blocks and normalizes a lit lamp without power', () => {
    const lampPosition = at(1)
    let world = place(emptyBlockWorld(), at(0), blockIdOf('stone'))
    world = place(world, lampPosition, blockIdOf('redstone_lamp_lit'))

    const result = updateRedstone(world, emptyRedstoneState())

    expect(result.world.get(blockPositionKeyOf(lampPosition))).toBe(blockIdOf('redstone_lamp'))
    expect(result.changes).toEqual([
      {
        after: blockIdOf('redstone_lamp'),
        before: blockIdOf('redstone_lamp_lit'),
        kind: 'lamp-state',
        position: lampPosition,
      },
    ])
    expect(updateRedstone(emptyBlockWorld(), result.state).changes).toEqual([])
  })

  it('delays repeater transitions and freezes a pending transition while locked', () => {
    const source = at(0)
    const repeater = at(1)
    const outputWire = at(2)
    const sideInput = at(1, 0, 1)
    let world = place(emptyBlockWorld(), source, blockIdOf('redstone_block'))
    world = place(world, repeater, blockIdOf('repeater'))
    world = place(world, outputWire, blockIdOf('redstone_wire'))
    world = place(world, sideInput, blockIdOf('lever'))
    let state = setRedstoneDevice(
      emptyRedstoneState(),
      repeater,
      redstoneRepeater('east', 2),
    )
    state = setRedstoneInput(state, source, redstonePower(15))

    const scheduled = updateRedstone(world, state)
    expect(redstoneDevicePowerAt(scheduled.state, repeater)).toBe(redstonePower(0))
    expect(scheduled.state.repeaterTimers.get(blockPositionKeyOf(repeater))).toEqual({
      power: redstonePower(15),
      remainingTicks: 2,
    })

    const locked = updateRedstone(
      world,
      setRedstoneInput(scheduled.state, sideInput, redstonePower(15)),
    )
    expect(redstoneDevicePowerAt(locked.state, repeater)).toBe(redstonePower(0))
    expect(locked.state.repeaterTimers.get(blockPositionKeyOf(repeater))).toEqual({
      power: redstonePower(15),
      remainingTicks: 2,
    })

    const unlocked = updateRedstone(
      world,
      setRedstoneInput(locked.state, sideInput, redstonePower(0)),
    )
    expect(unlocked.state.repeaterTimers.get(blockPositionKeyOf(repeater))).toEqual({
      power: redstonePower(15),
      remainingTicks: 1,
    })

    const powered = updateRedstone(world, unlocked.state)
    expect(redstoneDevicePowerAt(powered.state, repeater)).toBe(redstonePower(15))
    expect(redstonePowerAt(powered.state, outputWire)).toBe(redstonePower(15))
    expect(powered.state.repeaterTimers.has(blockPositionKeyOf(repeater))).toBe(false)
  })

  it('does not schedule a repeater that is permanently locked', () => {
    const source = at(0)
    const repeater = at(1)
    const world = place(
      place(emptyBlockWorld(), source, blockIdOf('redstone_block')),
      repeater,
      blockIdOf('repeater'),
    )
    const state = setRedstoneDevice(
      emptyRedstoneState(),
      repeater,
      redstoneRepeater('east', 2, true),
    )

    const result = updateRedstone(world, state)

    expect(result.state.repeaterTimers.has(blockPositionKeyOf(repeater))).toBe(false)
    expect(redstoneDevicePowerAt(result.state, repeater)).toBe(redstonePower(0))
  })

  it('restarts a pending repeater timer when its input changes', () => {
    const source = at(0)
    const repeater = at(1)
    const world = place(
      place(emptyBlockWorld(), source, blockIdOf('lever')),
      repeater,
      blockIdOf('repeater'),
    )
    let state = setRedstoneDevice(
      emptyRedstoneState(),
      repeater,
      redstoneRepeater('east', 2),
    )
    state = setRedstoneInput(state, source, redstonePower(15))

    const scheduled = updateRedstone(world, state)
    const reversed = updateRedstone(
      world,
      setRedstoneInput(scheduled.state, source, redstonePower(0)),
    )

    expect(reversed.state.repeaterTimers.get(blockPositionKeyOf(repeater))).toEqual({
      power: redstonePower(0),
      remainingTicks: 2,
    })
  })

  it('compares and subtracts back and side signals', () => {
    const comparator = at(0)
    const back = at(-1)
    const sideSource = at(0, 0, -3)
    const sideFirstWire = at(0, 0, -2)
    const sideSecondWire = at(0, 0, -1)
    const outputWire = at(1)
    let world = place(emptyBlockWorld(), comparator, blockIdOf('comparator'))
    world = place(world, back, blockIdOf('redstone_block'))
    world = place(world, sideSource, blockIdOf('redstone_block'))
    world = place(world, sideFirstWire, blockIdOf('redstone_wire'))
    world = place(world, sideSecondWire, blockIdOf('redstone_wire'))
    world = place(world, outputWire, blockIdOf('redstone_wire'))

    const compareState = setRedstoneDevice(
      emptyRedstoneState(),
      comparator,
      redstoneComparator('east'),
    )
    const compared = updateRedstone(world, compareState)
    expect(redstoneDevicePowerAt(compared.state, comparator)).toBe(redstonePower(15))
    expect(redstonePowerAt(compared.state, outputWire)).toBe(redstonePower(15))

    const subtractState = setRedstoneDevice(
      compared.state,
      comparator,
      redstoneComparator('east', 'subtract'),
    )
    const subtracted = updateRedstone(world, subtractState)
    expect(redstoneDevicePowerAt(subtracted.state, comparator)).toBe(redstonePower(1))
    expect(redstonePowerAt(subtracted.state, outputWire)).toBe(redstonePower(1))
  })

  it('suppresses comparator output when a side signal is stronger', () => {
    const comparator = at(0)
    const backSource = at(-4)
    const backWires = [at(-3), at(-2), at(-1)]
    const sideSource = at(0, 0, -1)
    let world = place(emptyBlockWorld(), comparator, blockIdOf('comparator'))
    world = place(world, backSource, blockIdOf('redstone_block'))
    for (const position of backWires) {
      world = place(world, position, blockIdOf('redstone_wire'))
    }
    world = place(world, sideSource, blockIdOf('redstone_block'))
    const state = setRedstoneDevice(
      emptyRedstoneState(),
      comparator,
      redstoneComparator('east'),
    )

    const result = updateRedstone(world, state)

    expect(redstoneDevicePowerAt(result.state, comparator)).toBe(redstonePower(0))
  })

  it('emits an observer pulse when the observed block changes', () => {
    const observer = at(0)
    const observed = at(1)
    const comparator = at(2)
    const outputWire = at(-1)
    let world = place(emptyBlockWorld(), observer, blockIdOf('observer'))
    world = place(world, observed, blockIdOf('stone'))
    world = place(world, comparator, blockIdOf('comparator'))
    world = place(world, at(3), blockIdOf('redstone_block'))
    world = place(world, outputWire, blockIdOf('redstone_wire'))
    let state = setRedstoneDevice(
      emptyRedstoneState(),
      observer,
      redstoneObserver('east'),
    )
    state = setRedstoneDevice(state, comparator, redstoneComparator('west'))
    state = setRedstoneInput(state, observed, redstonePower(0))

    const initial = updateRedstone(world, state)
    expect(redstoneDevicePowerAt(initial.state, observer)).toBe(redstonePower(0))
    expect(redstonePowerAt(initial.state, outputWire)).toBe(redstonePower(0))

    const inputPulse = updateRedstone(
      world,
      setRedstoneInput(initial.state, observed, redstonePower(15)),
    )
    expect(redstoneDevicePowerAt(inputPulse.state, observer)).toBe(redstonePower(15))
    expect(redstonePowerAt(inputPulse.state, outputWire)).toBe(redstonePower(15))

    world = place(world, observed, blockIdOf('dirt'))
    const pulse = updateRedstone(world, inputPulse.state)
    expect(redstoneDevicePowerAt(pulse.state, observer)).toBe(redstonePower(15))
    expect(redstonePowerAt(pulse.state, outputWire)).toBe(redstonePower(15))

    const finished = updateRedstone(world, pulse.state)
    expect(redstoneDevicePowerAt(finished.state, observer)).toBe(redstonePower(0))
    expect(redstonePowerAt(finished.state, outputWire)).toBe(redstonePower(0))
  })

  it('records an observer snapshot when its input was absent', () => {
    const observer = at(0)
    const observed = at(1)
    const world = place(
      place(emptyBlockWorld(), observer, blockIdOf('observer')),
      observed,
      blockIdOf('stone'),
    )
    const state = setRedstoneDevice(
      emptyRedstoneState(),
      observer,
      redstoneObserver('east'),
    )

    const result = updateRedstone(world, state)

    const snapshot = result.state.observerSnapshots.get(blockPositionKeyOf(observer))
    expect(snapshot?.get(blockPositionKeyOf(observed))).toBeTypeOf('number')
  })

  it('prunes device state for placements removed from the world', () => {
    const stale = blockPositionKeyOf(at(9))
    const state = withRedstoneDeviceState(emptyRedstoneState(), {
      deviceOutputs: new Map([[stale, redstonePower(15)]]),
      observerSnapshots: new Map([[stale, new Map([[stale, 1]])]]),
      repeaterTimers: new Map([[stale, { power: redstonePower(15), remainingTicks: 1 }]]),
    })

    const result = updateRedstone(emptyBlockWorld(), state)

    expect(result.state.deviceOutputs.size).toBe(0)
    expect(result.state.observerSnapshots.size).toBe(0)
    expect(result.state.repeaterTimers.size).toBe(0)
  })

  it('ignores device state whose block was removed', () => {
    const position = at(0)
    const state = setRedstoneDevice(
      emptyRedstoneState(),
      position,
      redstoneObserver('east'),
    )

    expect(collectRedstoneLayout(emptyBlockWorld(), state).devices).toEqual([])
  })

  it('pulses an observer when a retained snapshot changes size', () => {
    const observer = at(0)
    const observed = at(1)
    const observerKey = blockPositionKeyOf(observer)
    const observedKey = blockPositionKeyOf(observed)
    const world = place(
      place(emptyBlockWorld(), observer, blockIdOf('observer')),
      observed,
      blockIdOf('stone'),
    )
    let state = setRedstoneDevice(
      emptyRedstoneState(),
      observer,
      redstoneObserver('east'),
    )
    state = withRedstoneDeviceState(state, {
      deviceOutputs: new Map(),
      observerSnapshots: new Map([
        [observerKey, new Map([[observedKey, 1], [blockPositionKeyOf(at(2)), 2]])],
      ]),
      repeaterTimers: new Map(),
    })

    const result = updateRedstone(world, state)

    expect(redstoneDevicePowerAt(result.state, observer)).toBe(redstonePower(15))
  })
})

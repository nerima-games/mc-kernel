import {
  HORIZONTAL_BLOCK_FACES,
  adjacentBlockPosition,
  oppositeBlockFace,
} from './coordinate-neighbours.js'
import { blockPositionKeyOf, type BlockPositionKey } from './coordinate-keys.js'
import { blockAt } from './block-world.js'
import {
  type DevicePowerContext,
  type DeviceTransition,
  type RedstoneChange,
  type RedstoneDevicePlacement,
  type RedstoneLayout,
} from './redstone-update-types.js'
import { REDSTONE_POWER_MAX, REDSTONE_POWER_MIN } from './redstone-data.js'
import {
  type RedstoneComparator,
  type RedstoneObserver,
  type RedstoneRepeater,
} from './redstone-devices.js'
import {
  type RedstonePower,
  type RedstoneRepeaterTimer,
  type RedstoneState,
  redstoneInputAt,
  redstonePower,
} from './redstone-state.js'
import { deviceOutputAtTarget, signalPowerAt } from './redstone-network.js'

const REPEATER_TIMER_STEP = 1
const OBSERVER_SIGNATURE_BASE = REDSTONE_POWER_MAX + 2

type RepeaterPlacement = RedstoneDevicePlacement & { readonly device: RedstoneRepeater }
type ComparatorPlacement = RedstoneDevicePlacement & { readonly device: RedstoneComparator }
type ObserverPlacement = RedstoneDevicePlacement & { readonly device: RedstoneObserver }

const isRepeaterPlacement = (
  placement: RedstoneDevicePlacement,
): placement is RepeaterPlacement => placement.device.kind === 'repeater'

const isComparatorPlacement = (
  placement: RedstoneDevicePlacement,
): placement is ComparatorPlacement => placement.device.kind === 'comparator'

const isObserverPlacement = (
  placement: RedstoneDevicePlacement,
): placement is ObserverPlacement => placement.device.kind === 'observer'

const setDevicePower = (
  outputs: Map<BlockPositionKey, RedstonePower>,
  key: BlockPositionKey,
  power: RedstonePower,
): void => {
  if (power === redstonePower(REDSTONE_POWER_MIN)) {
    outputs.delete(key)
    return
  }
  outputs.set(key, power)
}

const powerInMap = (
  powers: ReadonlyMap<BlockPositionKey, RedstonePower>,
  key: BlockPositionKey,
): RedstonePower => powers.get(key) ?? redstonePower(REDSTONE_POWER_MIN)

const activeDeviceKeys = (layout: RedstoneLayout): ReadonlySet<BlockPositionKey> =>
  new Set(layout.devices.map((placement) => placement.key))

const pruneStaleState = <Value>(
  values: Map<BlockPositionKey, Value>,
  activeKeys: ReadonlySet<BlockPositionKey>,
): void => {
  for (const key of values.keys()) {
    if (!activeKeys.has(key)) {
      values.delete(key)
    }
  }
}

const horizontalSideFaces = (
  facing: RepeaterPlacement['device']['facing'],
): ReadonlyArray<RepeaterPlacement['device']['facing']> =>
  HORIZONTAL_BLOCK_FACES.filter(
    (candidate) => candidate !== facing && candidate !== oppositeBlockFace(facing),
  )

const repeaterInputPower = (
  context: DevicePowerContext,
  repeater: RepeaterPlacement,
): RedstonePower =>
  signalPowerAt(
    context,
    adjacentBlockPosition(
      repeater.position,
      oppositeBlockFace(repeater.device.facing),
    ),
  )

const repeaterIsLocked = (
  context: DevicePowerContext,
  repeater: RepeaterPlacement,
): boolean => {
  if (repeater.device.locked) {
    return true
  }
  return horizontalSideFaces(repeater.device.facing).some(
    (face) =>
      signalPowerAt(
        context,
        adjacentBlockPosition(repeater.position, face),
      ) > REDSTONE_POWER_MIN,
  )
}

export const makeDeviceTransition = (
  state: RedstoneState,
  layout: RedstoneLayout,
): DeviceTransition => {
  const activeKeys = activeDeviceKeys(layout)
  const deviceOutputs = new Map(state.deviceOutputs)
  const observerSnapshots = new Map(state.observerSnapshots)
  const repeaterTimers = new Map(state.repeaterTimers)
  pruneStaleState(deviceOutputs, activeKeys)
  pruneStaleState(observerSnapshots, activeKeys)
  pruneStaleState(repeaterTimers, activeKeys)
  return { deviceOutputs, observerSnapshots, repeaterTimers }
}

const advanceRepeaterTimer = (
  placement: RepeaterPlacement,
  transition: DeviceTransition,
): void => {
  const timer = transition.repeaterTimers.get(placement.key)
  if (timer === undefined) {
    return
  }
  if (timer.remainingTicks <= REPEATER_TIMER_STEP) {
    setDevicePower(transition.deviceOutputs, placement.key, timer.power)
    transition.repeaterTimers.delete(placement.key)
    return
  }
  transition.repeaterTimers.set(placement.key, {
    power: timer.power,
    remainingTicks: timer.remainingTicks - REPEATER_TIMER_STEP,
  })
}

const clearObserverPulse = (
  placement: ObserverPlacement,
  transition: DeviceTransition,
): void => {
  setDevicePower(
    transition.deviceOutputs,
    placement.key,
    redstonePower(REDSTONE_POWER_MIN),
  )
}

export const advanceDeviceTransientState = (
  context: DevicePowerContext,
  layout: RedstoneLayout,
  transition: DeviceTransition,
): void => {
  for (const placement of layout.devices) {
    if (isRepeaterPlacement(placement) && !repeaterIsLocked(context, placement)) {
      advanceRepeaterTimer(placement, transition)
    }
    if (isObserverPlacement(placement)) {
      clearObserverPulse(placement, transition)
    }
  }
}

const setRepeaterTimer = (
  repeater: RepeaterPlacement,
  transition: DeviceTransition,
  power: RedstonePower,
): void => {
  transition.repeaterTimers.set(repeater.key, {
    power,
    remainingTicks: repeater.device.delayTicks,
  })
}

type RepeaterTimerRefresh = {
  readonly input: RedstonePower
  readonly repeater: RepeaterPlacement
  readonly timer: RedstoneRepeaterTimer
  readonly transition: DeviceTransition
}

const refreshRepeaterTimer = ({
  input,
  repeater,
  timer,
  transition,
}: RepeaterTimerRefresh): void => {
  if (timer.power !== input) {
    setRepeaterTimer(repeater, transition, input)
  }
}

const scheduleNewRepeaterTimer = (
  repeater: RepeaterPlacement,
  transition: DeviceTransition,
  input: RedstonePower,
): void => {
  const current = powerInMap(transition.deviceOutputs, repeater.key)
  if (current !== input) {
    setRepeaterTimer(repeater, transition, input)
  }
}

const scheduleRepeater = (
  context: DevicePowerContext,
  repeater: RepeaterPlacement,
  transition: DeviceTransition,
): void => {
  const input = repeaterInputPower(context, repeater)
  if (repeaterIsLocked(context, repeater)) {
    return
  }
  const timer = transition.repeaterTimers.get(repeater.key)
  if (timer !== undefined) {
    refreshRepeaterTimer({ input, repeater, timer, transition })
    return
  }
  scheduleNewRepeaterTimer(repeater, transition, input)
}

export const scheduleRepeaters = (
  context: DevicePowerContext,
  layout: RedstoneLayout,
  transition: DeviceTransition,
): void => {
  for (const placement of layout.devices) {
    if (isRepeaterPlacement(placement)) {
      scheduleRepeater(context, placement, transition)
    }
  }
}

const comparatorSidePower = (
  context: DevicePowerContext,
  comparator: ComparatorPlacement,
): RedstonePower => {
  let side = redstonePower(REDSTONE_POWER_MIN)
  for (const face of horizontalSideFaces(comparator.device.facing)) {
    const candidate = signalPowerAt(
      context,
      adjacentBlockPosition(comparator.position, face),
    )
    if (candidate > side) {
      side = candidate
    }
  }
  return side
}

const comparatorPower = (
  context: DevicePowerContext,
  comparator: ComparatorPlacement,
): RedstonePower => {
  const back = signalPowerAt(
    context,
    adjacentBlockPosition(
      comparator.position,
      oppositeBlockFace(comparator.device.facing),
    ),
  )
  const side = comparatorSidePower(context, comparator)
  if (comparator.device.mode === 'compare') {
    if (side > back) {
      return redstonePower(REDSTONE_POWER_MIN)
    }
    return back
  }
  return redstonePower(Math.max(REDSTONE_POWER_MIN, back - side))
}

export const updateComparators = (
  context: DevicePowerContext,
  layout: RedstoneLayout,
  transition: DeviceTransition,
): void => {
  for (const placement of layout.devices) {
    if (isComparatorPlacement(placement)) {
      setDevicePower(
        transition.deviceOutputs,
        placement.key,
        comparatorPower(context, placement),
      )
    }
  }
}

const observerInputToken = (input: RedstonePower | undefined): number =>
  input === undefined ? 0 : input + 1

const observerSnapshotOf = (
  context: DevicePowerContext,
  observer: ObserverPlacement,
): ReadonlyMap<BlockPositionKey, number> => {
  const observed = adjacentBlockPosition(observer.position, observer.device.facing)
  const observedKey = blockPositionKeyOf(observed)
  const wire = powerInMap(context.powers, observedKey)
  const device = deviceOutputAtTarget(context, observed)
  const signature =
    (blockAt(context.world, observed) * OBSERVER_SIGNATURE_BASE +
      observerInputToken(redstoneInputAt(context.state, observed))) *
      OBSERVER_SIGNATURE_BASE *
      OBSERVER_SIGNATURE_BASE +
    wire * OBSERVER_SIGNATURE_BASE +
    device
  return new Map([[observedKey, signature]])
}

const observerSnapshotChanged = (
  previous: ReadonlyMap<BlockPositionKey, number> | undefined,
  next: ReadonlyMap<BlockPositionKey, number>,
): boolean => {
  if (previous === undefined || previous.size !== next.size) {
    return true
  }
  for (const [key, value] of next) {
    if (previous.get(key) !== value) {
      return true
    }
  }
  return false
}

export const updateObservers = (
  context: DevicePowerContext,
  layout: RedstoneLayout,
  transition: DeviceTransition,
): void => {
  for (const placement of layout.devices) {
    if (isObserverPlacement(placement)) {
      const snapshot = observerSnapshotOf(context, placement)
      const previous = transition.observerSnapshots.get(placement.key)
      if (
        transition.observerSnapshots.has(placement.key) &&
        observerSnapshotChanged(previous, snapshot)
      ) {
        setDevicePower(
          transition.deviceOutputs,
          placement.key,
          redstonePower(REDSTONE_POWER_MAX),
        )
      }
      transition.observerSnapshots.set(placement.key, snapshot)
    }
  }
}

export const devicePowerChanges = (
  state: RedstoneState,
  layout: RedstoneLayout,
  outputs: ReadonlyMap<BlockPositionKey, RedstonePower>,
): Array<RedstoneChange> => {
  const changes: Array<RedstoneChange> = []
  for (const placement of layout.devices) {
    const before = powerInMap(state.deviceOutputs, placement.key)
    const after = powerInMap(outputs, placement.key)
    if (before !== after) {
      changes.push({
        after,
        before,
        kind: 'device-power',
        position: placement.position,
      })
    }
  }
  return changes
}

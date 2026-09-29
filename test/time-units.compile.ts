import {
  DeltaTimeSecs,
  EpochMillis,
  FixedDurationSecs,
  InterpolationFraction,
  MonotonicTimeSecs,
  NonNegativeTickCount,
  PositiveTickCount,
  SessionEpoch,
  SimulationTick,
} from '../src/domain/quantities'
import { addTick, secondsForTicks } from '../src/domain/frame-timing'

export const epochMillis: EpochMillis = EpochMillis(1_700_000_000_000)
export const monotonicTimeSecs: MonotonicTimeSecs = MonotonicTimeSecs(1)
export const deltaTimeSecs: DeltaTimeSecs = DeltaTimeSecs(0.05)
export const fixedDuration: ReturnType<typeof FixedDurationSecs> = FixedDurationSecs(0.05)
export const simulationTick: ReturnType<typeof SimulationTick> = SimulationTick(0)
export const interpolationFraction: ReturnType<typeof InterpolationFraction> = InterpolationFraction(0.5)
export const sessionEpoch: ReturnType<typeof SessionEpoch> = SessionEpoch('session-1')
export const nonNegativeTickCount: ReturnType<typeof NonNegativeTickCount> = NonNegativeTickCount(0)
export const positiveTickCount: ReturnType<typeof PositiveTickCount> = PositiveTickCount(1)

// @ts-expect-error Branded time units must not be interchangeable.
export const invalidDuration: ReturnType<typeof FixedDurationSecs> = simulationTick

// @ts-expect-error EpochMillis and MonotonicTimeSecs are distinct brands.
export const epochAsMonotonic: MonotonicTimeSecs = epochMillis
// @ts-expect-error EpochMillis and DeltaTimeSecs are distinct brands.
export const epochAsDelta: DeltaTimeSecs = epochMillis
// @ts-expect-error EpochMillis and FixedDurationSecs are distinct brands.
export const epochAsFixedDuration: FixedDurationSecs = epochMillis
// @ts-expect-error EpochMillis and SimulationTick are distinct brands.
export const epochAsTick: SimulationTick = epochMillis
// @ts-expect-error MonotonicTimeSecs and DeltaTimeSecs are distinct brands.
export const monotonicAsDelta: DeltaTimeSecs = monotonicTimeSecs
// @ts-expect-error MonotonicTimeSecs and FixedDurationSecs are distinct brands.
export const monotonicAsFixedDuration: FixedDurationSecs = monotonicTimeSecs
// @ts-expect-error MonotonicTimeSecs and SimulationTick are distinct brands.
export const monotonicAsTick: SimulationTick = monotonicTimeSecs
// @ts-expect-error DeltaTimeSecs and FixedDurationSecs are distinct brands.
export const deltaAsFixedDuration: FixedDurationSecs = deltaTimeSecs
// @ts-expect-error DeltaTimeSecs and SimulationTick are distinct brands.
export const deltaAsTick: SimulationTick = deltaTimeSecs
// @ts-expect-error FixedDurationSecs and SimulationTick are distinct brands.
export const fixedDurationAsTick: SimulationTick = fixedDuration

// @ts-expect-error A tick index is not a tick count.
export const invalidCount: ReturnType<typeof NonNegativeTickCount> = simulationTick

// @ts-expect-error A non-negative count does not guarantee positivity.
export const invalidPositiveCount: ReturnType<typeof PositiveTickCount> = nonNegativeTickCount

// @ts-expect-error A raw number is not a checked simulation tick.
addTick(1, nonNegativeTickCount)
// @ts-expect-error A raw number is not a checked tick count.
addTick(simulationTick, 1)
// @ts-expect-error A raw number is not a checked tick count.
secondsForTicks(1)

// @ts-expect-error Session epochs are not arbitrary strings at the type boundary.
export const invalidEpoch: ReturnType<typeof SessionEpoch> = 'session-2'

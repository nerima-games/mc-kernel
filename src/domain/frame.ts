import type { Effect, Layer } from 'effect'
import type { ClockPort } from './clock.js'
import type { StageId } from './identifiers.js'
import type { DeltaTimeSecs } from './quantities.js'

/** Services resolved while a frame stage runs. */
export type FrameServices = ClockPort

/** A unit of per-frame work contributed by a module. */
export interface StageRegistration {
  readonly id: StageId
  readonly after?: ReadonlyArray<StageId>
  readonly run: (dt: DeltaTimeSecs) => Effect.Effect<void, never, FrameServices>
}

/**
 * A module's service layer and its frame-stage registration.
 *
 * `RRegister` is intentionally separate from `RIn`: a service needed to
 * construct stages is not necessarily a dependency of the module's layer.
 */
export interface GameModule<ROut, E, RIn, RRegister = never> {
  readonly layers: Layer.Layer<ROut, E, RIn>
  readonly frameStages: Effect.Effect<ReadonlyArray<StageRegistration>, never, RRegister>
}

/**
 * The frame / module composition contract (plan.md §4.1).
 *
 * `FrameServices` below is still a PLACEHOLDER pending the vertical-slice
 * spike; see docs/freeze-checklist.md (b), which records that as the one
 * outstanding prerequisite for freezing this API at 1.0.0.
 *
 * Every repository that contributes behaviour to a running game exports a
 * `GameModule`: its Layers (what services it provides, and what it needs to be
 * given) plus the per-frame stages it wants to run. The host repository merges
 * the Layers and topologically sorts the stages by their `after` edges. No
 * repository calls another repository's stage directly, and no repository knows
 * the global stage order.
 *
 * `StageRegistration` and `GameModule` are reproduced here verbatim from
 * plan.md §4.1, including their declaration as `interface` rather than `type`.
 * They are the written contract; keeping them character-identical to the plan
 * is worth more than local style consistency.
 */
import type { Effect, Layer } from 'effect'
import type { ClockPort } from './clock'
import type { StageId } from './identifiers'
import type { DeltaTimeSecs } from './quantities'

/**
 * PLACEHOLDER — the shape of this is NOT yet determined.
 *
 * `FrameServices` is the context every frame stage may assume is present. A
 * vertical-slice spike (one input -> sim -> render path, end to end) will settle
 * what actually belongs in it; guessing now would bake a wrong answer into all
 * 16 repositories at once.
 *
 * It is aliased to `ClockPort` rather than to `never` because that is the one
 * service we already know every stage needs — a stage cannot advance without
 * reading time, and it must not read time from a global. Starting from `never`
 * would typecheck today and then break every stage signature the moment the
 * first real service is added; starting from the known-correct minimum means
 * the first widening is the only widening we cannot foresee.
 *
 * WARNING: widening this alias is a breaking change for stage *providers*
 * (whoever builds the runtime must now supply more), though not for stage
 * *authors*. Widen it once, in the spike, and then freeze it.
 */
export type FrameServices = ClockPort

/**
 * One unit of per-frame work, contributed by a repository.
 *
 * `after` declares ordering edges only — it is not a dependency on the other
 * stage existing. A stage that names an absent stage is scheduled as if the
 * edge were absent, so a module can express "run me after input, if there is
 * input" without taking a dependency on the input repository. (Whether the host
 * should warn about dangling edges is an open question for the spike.)
 */
export interface StageRegistration {
  readonly id: StageId
  readonly after?: ReadonlyArray<StageId>
  readonly run: (dt: DeltaTimeSecs) => Effect.Effect<void, never, FrameServices>
}

/**
 * A repository's contribution to a running game.
 *
 * `ROut` — services this module provides.
 * `E`    — errors that can occur while *building* those services.
 * `RIn`  — services this module needs to be given in order to build.
 *
 * The error channel is on the Layer, not on `run`: a stage that can fail at
 * runtime must handle or defect its own failure, because there is no sensible
 * frame-level recovery for "physics failed on frame 12048".
 */
export interface GameModule<ROut, E, RIn> {
  readonly layers: Layer.Layer<ROut, E, RIn>
  readonly frameStages: ReadonlyArray<StageRegistration>
}

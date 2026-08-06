/**
 * The frame / module composition contract (plan.md §4.1).
 *
 * `FrameServices` below is SETTLED: the vertical-slice spike ran
 * `mc-kernel -> mc-physics -> mc-worldgen -> mc-sim -> mc-render -> mx-gameplay`
 * end to end and the only requirement that survived into `run` was `ClockPort`.
 * See docs/freeze-checklist.md (b).
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
import type { DeltaTimeSecs } from './quantities'
import type { StageId } from './identifiers'

/**
 * The context every frame stage may assume is present. SETTLED — `ClockPort`,
 * and nothing else.
 *
 * ---------------------------------------------------------------------------
 * What the spike measured
 * ---------------------------------------------------------------------------
 *
 * Naively, the union looked much bigger. Walking the stages a real slice wants
 * — input sampling, physics, interactions, camera mirroring, chunk sync, draw —
 * turns up `ClockPort | PlayerService | InventoryService | InputService |
 * FrameInput | BlockStore | RenderTarget`. Alias `FrameServices` to that and
 * mc-kernel has to import mc-sim and mc-render to name them, which the tier
 * model forbids outright (plan.md §2.2): kernel is tier 1 and depends on
 * `effect` alone.
 *
 * That union is an artefact of `frameStages` having been a VALUE. With no
 * context in which to *build* a stage, the only way a stage could reach a
 * service was to demand it at `run` time, so every service any stage touched
 * had to be here. Making `frameStages` an Effect (see `GameModule` below) moves
 * service ACQUISITION to registration time, and the union collapses.
 *
 * What is left is exactly the services a stage must resolve afresh on every
 * frame — and measured against a real consumer that is only the clock. The
 * decisive case is `mc-sim`'s `PlayerServiceApi.cameraPose`
 * (`mc-sim/application/player-service.ts:35`), typed
 * `Effect<CameraPoseSnapshot, never, ClockPort>`: the requirement sits on the
 * METHOD, not on acquiring `PlayerService`. A stage that captured the service
 * object at registration time still needs `ClockPort` when it calls the method
 * a frame later — and needs nothing else. Every other candidate above behaved
 * the opposite way: acquire once, call with no residual requirement.
 *
 * A stage cannot advance without reading time and must not read it from a
 * global (plan.md §5.1-3), so `never` was never a candidate either.
 *
 * WARNING: widening this alias remains a breaking change for stage *providers*
 * (whoever builds the runtime must now supply more), though not for stage
 * *authors*. It is frozen at 1.0.0; widening it is MAJOR.
 */
export type FrameServices = ClockPort

/**
 * One unit of per-frame work, contributed by a repository.
 *
 * `after` declares ordering edges only — it is not a dependency on the other
 * stage existing. A stage that names an absent stage is scheduled as if the
 * edge were absent, so a module can express "run me after input, if there is
 * input" without taking a dependency on the input repository.
 *
 * The spike settled the follow-on question: the host ENFORCES nothing and
 * REPORTS everything. A dangling edge is the sanctioned way to say "after
 * input, if input exists", so rejecting one would delete the idiom; but a
 * dropped edge and a stage the frame skeleton does not recognise are both
 * indistinguishable from a typo at the point of failure, so `mc-compose`'s
 * `StageOrderPlan` carries `dangling` and `unmatchedPhase` and a host surfaces
 * both.
 */
export interface StageRegistration {
  readonly id: StageId
  readonly after?: ReadonlyArray<StageId>
  readonly run: (dt: DeltaTimeSecs) => Effect.Effect<void, never, FrameServices>
}

/**
 * A repository's contribution to a running game.
 *
 * `ROut`      — services this module provides.
 * `Error`     — errors that can occur while *building* those services.
 * `RIn`       — services this module needs to be given in order to build.
 * `RRegister` — services this module needs in order to REGISTER its stages.
 *
 * The error channel is on the Layer, not on `run`: a stage that can fail at
 * runtime must handle or defect its own failure, because there is no sensible
 * frame-level recovery for "physics failed on frame 12048".
 *
 * ---------------------------------------------------------------------------
 * Why `frameStages` is an Effect
 * ---------------------------------------------------------------------------
 *
 * It was `ReadonlyArray<StageRegistration>` — a VALUE — until the vertical-slice
 * spike. A value has no context, so a module had no moment at which it could
 * acquire a service in order to BUILD a stage; the only remaining channel was
 * `run`, which forced every service any stage touched into `FrameServices`, and
 * that in turn forced kernel to name mc-sim's and mc-render's services. See the
 * note on `FrameServices` above.
 *
 * The symptom was already visible in the roster before the spike:
 * `mx-gameplay/stages/registration.ts` exported
 * `makeGameplayStages: Effect.Effect<ReadonlyArray<StageRegistration>>` with a
 * comment saying it "is NOT yet a `GameModule`" because the service set could
 * not be named. It was the right shape all along — this type now says so.
 *
 * Registration is also where a module allocates its frame-local state (a work
 * queue, a frontier, an accumulator), which is why every one of those modules
 * had reached for an Effect independently.
 *
 * ---------------------------------------------------------------------------
 * Why `RRegister` is its own parameter rather than a reuse of `RIn`
 * ---------------------------------------------------------------------------
 *
 * They are genuinely different sets, and the spike found a case in each
 * direction:
 *
 *   - mc-render's stages must acquire `InputService` to register `render:input`
 *     — but `InputService` is a service mc-render PROVIDES (it is in `ROut`),
 *     not one it needs to be given. Folding that into `RIn` would say the module
 *     cannot be built until something else supplies what it itself ships.
 *   - a module may need a platform handle purely to BUILD its Layer (a canvas,
 *     a save directory) that no stage ever touches. Folding that into the
 *     registration context would make every host supply it twice.
 *
 * Collapsing the two into one parameter is therefore not a simplification but a
 * false equation, and the direction it fails in is the dangerous one: it makes
 * self-provided services look like external dependencies, which is exactly the
 * inversion plan.md §3.8 records as the reference implementation's worst
 * structural bug.
 *
 * It defaults to `never` so that the common case — a module whose stages need
 * nothing to be constructed — still reads as three parameters.
 *
 * `frameStages`' ERROR channel stays `never`, unlike the Layer's. A module that
 * can fail to come up expresses that in `Error`, where a host already has to handle
 * it; a second failure channel that means the same thing ("this module is not
 * usable") would give the host two places to look and no way to tell them
 * apart.
 */
export interface GameModule<ROut, Error, RIn, RRegister = never> {
  readonly layers: Layer.Layer<ROut, Error, RIn>
  readonly frameStages: Effect.Effect<ReadonlyArray<StageRegistration>, never, RRegister>
}

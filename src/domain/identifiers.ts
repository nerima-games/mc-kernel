/**
 * Nominal identifiers shared by every repository.
 *
 * PRE-AUDIT FIRST CUT (叩き台). The set of identifiers here is the minimum the
 * plan.md §4 contracts need in order to typecheck; it is expected to grow.
 */
import { Brand } from 'effect'

/**
 * Identifies a single world (save). Kernel does not know how worlds are stored;
 * it only guarantees that a WorldId is a non-empty, non-blank string.
 */
export type WorldId = string & Brand.Brand<'WorldId'>

export const WorldId = Brand.refined<WorldId>(
  (value) => value.trim().length > 0,
  (value) => Brand.error(`WorldId must be a non-blank string, received ${JSON.stringify(value)}`),
)

/**
 * Identifies a frame stage (plan.md §4.1). Stage ids are the vertices of the
 * per-frame ordering graph, so they must be stable across repositories:
 * `mc-sim` may declare `after: [StageId('input')]` without importing
 * `mc-playground-kit`.
 *
 * Convention: `<owning-repo-suffix>:<stage>` — e.g. `sim:tick`, `render:draw`.
 * The convention is not enforced yet; the vertical-slice spike will decide
 * whether it should be.
 */
export type StageId = string & Brand.Brand<'StageId'>

export const StageId = Brand.refined<StageId>(
  (value) => value.trim().length > 0,
  (value) => Brand.error(`StageId must be a non-blank string, received ${JSON.stringify(value)}`),
)

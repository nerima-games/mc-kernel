/**
 * Nominal identifiers shared by every repository.
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
 * Identifies a stable vertex in a per-frame ordering graph.
 */
export type StageId = string & Brand.Brand<'StageId'>

export const StageId = Brand.refined<StageId>(
  (value) => value.trim().length > 0,
  (value) => Brand.error(`StageId must be a non-blank string, received ${JSON.stringify(value)}`),
)

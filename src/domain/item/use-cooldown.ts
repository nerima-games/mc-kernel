import { Result } from 'effect'
import {
  CooldownSeconds,
  MonotonicTimeSecs,
  type MonotonicTimeSecs as MonotonicTimeSecsType,
} from '../time/quantities.js'
import type { ResourceLocation } from '../text/identifiers.js'
import type { UseCooldownComponent } from './use-cooldown-data.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type { UseCooldownComponent } from './use-cooldown-data.js'
export { isUseCooldownComponent } from './use-cooldown-validation.js'

export type UseCooldownFailure = ItemValidationFailure

export const useCooldownComponent = (
  seconds: ReturnType<typeof CooldownSeconds>,
  cooldownGroup: ResourceLocation | undefined = undefined,
): Result.Result<UseCooldownComponent, UseCooldownFailure> =>
  Result.mapError(
    Result.map(CooldownSeconds.result(seconds), (validatedSeconds) => Object.freeze({
      seconds: validatedSeconds,
      cooldownGroup,
    })),
    (error) => itemValidationFailure(
      'seconds',
      error.message,
      'out-of-range',
      seconds,
      'RangeError',
    ),
  )

export const cooldownExpiresAt = (
  startedAt: MonotonicTimeSecsType,
  component: UseCooldownComponent,
): Result.Result<MonotonicTimeSecsType, UseCooldownFailure> => {
  const expiresAt = startedAt + component.seconds
  return Result.mapError(
    MonotonicTimeSecs.result(expiresAt),
    (error) => itemValidationFailure(
      'expiresAt',
      error.message,
      'out-of-range',
      expiresAt,
      'RangeError',
    ),
  )
}

export const isCooldownActive = (
  now: MonotonicTimeSecsType,
  startedAt: MonotonicTimeSecsType,
  component: UseCooldownComponent,
): Result.Result<boolean, UseCooldownFailure> =>
  Result.map(cooldownExpiresAt(startedAt, component), (expiresAt) => now < expiresAt)

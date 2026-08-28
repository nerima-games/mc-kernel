import {
  CooldownSeconds,
  MonotonicTimeSecs,
  type MonotonicTimeSecs as MonotonicTimeSecsType,
} from './quantities.js'
import type { ResourceLocation } from './identifiers.js'
import type { UseCooldownComponent } from './use-cooldown-data.js'

export type { UseCooldownComponent } from './use-cooldown-data.js'
export { isUseCooldownComponent } from './use-cooldown-validation.js'

export const useCooldownComponent = (
  seconds: number,
  cooldownGroup: ResourceLocation | undefined = undefined,
): UseCooldownComponent =>
  Object.freeze({
    seconds: CooldownSeconds(seconds),
    cooldownGroup,
  })

export const cooldownExpiresAt = (
  startedAt: MonotonicTimeSecsType,
  component: UseCooldownComponent,
): MonotonicTimeSecsType => MonotonicTimeSecs(startedAt + component.seconds)

export const isCooldownActive = (
  now: MonotonicTimeSecsType,
  startedAt: MonotonicTimeSecsType,
  component: UseCooldownComponent,
): boolean => now < cooldownExpiresAt(startedAt, component)

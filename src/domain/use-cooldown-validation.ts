import { ResourceLocation } from './identifiers.js'
import type { UseCooldownComponent } from './use-cooldown-data.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue): boolean => {
  const keys = Object.keys(value)
  return (
    keys.length === 2 &&
    Object.hasOwn(value, 'seconds') &&
    Object.hasOwn(value, 'cooldownGroup')
  )
}

const isCooldownSeconds = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const isCooldownGroup = (value: unknown): boolean =>
  value === undefined || (typeof value === 'string' && ResourceLocation.is(value))

export const isUseCooldownComponent = (value: unknown): value is UseCooldownComponent =>
  isRecord(value) &&
  hasExactKeys(value) &&
  isCooldownSeconds(value['seconds']) &&
  isCooldownGroup(value['cooldownGroup'])

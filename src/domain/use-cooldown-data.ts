import type { ResourceLocation } from './identifiers.js'
import type { CooldownSeconds } from './quantities.js'

/** The official `minecraft:use_cooldown` item component. */
export type UseCooldownComponent = Readonly<{
  readonly seconds: CooldownSeconds
  readonly cooldownGroup: ResourceLocation | undefined
}>

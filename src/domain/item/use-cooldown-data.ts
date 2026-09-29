import type { ResourceLocation } from '../text/identifiers.ts.js'
import type { CooldownSeconds } from '../time/quantities.ts.js'

/** The official `minecraft:use_cooldown` item component. */
export type UseCooldownComponent = Readonly<{
  readonly seconds: CooldownSeconds
  readonly cooldownGroup: ResourceLocation | undefined
}>

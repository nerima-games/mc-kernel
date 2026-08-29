/**
 * Closed Java Edition 1.21 mob-effect vocabulary.
 *
 * This module is deliberately data-only. Runtime validation lives in
 * `./status-effect-validation` so the table can be read without mixing it
 * with external-input handling (architecture.md §6, the same split as
 * `block-property-data.ts` / `block-property-validation.ts`).
 *
 * Applying an effect to `Vitals` (duration countdown, particle spawning,
 * stat mutation) is an upper-layer responsibility (docs/responsibility.md,
 * "食料" row); this table only carries what the kernel can own about an
 * effect as a name: its benefit/harm classification, its vanilla particle
 * colour, and its amplifier ceiling.
 *
 * Membership, `beneficial` and `particleColor` are read from the
 * `minecraft:effects` registry (verified against the `Effect colors` table
 * on minecraft.wiki, pageid 181520, and cross-checked against
 * PrismarineJS/minecraft-data's `pc/1.20.5/effects.json` `good`/`bad`
 * classification, which `dataPaths.json` maps 1.21 onto).
 * `Breath of the Nautilus` (added in the 1.21.11 "Mounts of Mayhem" update)
 * and the Bedrock-only `Fatal Poison` are excluded: the closed vocabulary
 * here is exactly Java Edition 1.21's effect roster, pinned by
 * `EXPECTED_STATUS_EFFECT_COUNT` in `test/status-effect.test.ts`.
 */
import { ResourceLocation, vanillaId } from './identifiers.js'

/**
 * The `/effect give <targets> <effect> [<seconds>] [<amplifier>]` argument
 * is a byte; a negative NBT amplifier is clamped to 255 rather than erroring
 * (minecraft.wiki, Commands/effect). Every effect shares this ceiling.
 */
export const STATUS_EFFECT_AMPLIFIER_MAX = 255

export const STATUS_EFFECT_NAMES = [
  'speed',
  'slowness',
  'haste',
  'mining_fatigue',
  'strength',
  'instant_health',
  'instant_damage',
  'jump_boost',
  'nausea',
  'regeneration',
  'resistance',
  'fire_resistance',
  'water_breathing',
  'invisibility',
  'blindness',
  'night_vision',
  'hunger',
  'weakness',
  'poison',
  'wither',
  'health_boost',
  'absorption',
  'saturation',
  'glowing',
  'levitation',
  'luck',
  'unluck',
  'slow_falling',
  'conduit_power',
  'dolphins_grace',
  'bad_omen',
  'hero_of_the_village',
  'darkness',
  'trial_omen',
  'raid_omen',
  'wind_charged',
  'weaving',
  'oozing',
  'infested',
] as const

export type StatusEffectName = (typeof STATUS_EFFECT_NAMES)[number]

export type StatusEffectDefinition = Readonly<{
  readonly name: StatusEffectName
  readonly beneficial: boolean
  readonly particleColor: number
  readonly maxAmplifier: number
}>

export const STATUS_EFFECT_DEFINITIONS: Readonly<Record<StatusEffectName, StatusEffectDefinition>> = Object.freeze({
  speed: Object.freeze({ name: 'speed', beneficial: true, particleColor: 0x33ebff, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  slowness: Object.freeze({ name: 'slowness', beneficial: false, particleColor: 0x8bafe0, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  haste: Object.freeze({ name: 'haste', beneficial: true, particleColor: 0xd9c043, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  mining_fatigue: Object.freeze({ name: 'mining_fatigue', beneficial: false, particleColor: 0x4a4217, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  strength: Object.freeze({ name: 'strength', beneficial: true, particleColor: 0xffc700, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  instant_health: Object.freeze({ name: 'instant_health', beneficial: true, particleColor: 0xf82423, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  instant_damage: Object.freeze({ name: 'instant_damage', beneficial: false, particleColor: 0xa9656a, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  jump_boost: Object.freeze({ name: 'jump_boost', beneficial: true, particleColor: 0xfdff84, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  nausea: Object.freeze({ name: 'nausea', beneficial: false, particleColor: 0x551d4a, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  regeneration: Object.freeze({ name: 'regeneration', beneficial: true, particleColor: 0xcd5cab, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  resistance: Object.freeze({ name: 'resistance', beneficial: true, particleColor: 0x9146f0, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  fire_resistance: Object.freeze({ name: 'fire_resistance', beneficial: true, particleColor: 0xff9900, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  water_breathing: Object.freeze({ name: 'water_breathing', beneficial: true, particleColor: 0x98dac0, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  invisibility: Object.freeze({ name: 'invisibility', beneficial: true, particleColor: 0xf6f6f6, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  blindness: Object.freeze({ name: 'blindness', beneficial: false, particleColor: 0x1f1f23, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  night_vision: Object.freeze({ name: 'night_vision', beneficial: true, particleColor: 0xc2ff66, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  hunger: Object.freeze({ name: 'hunger', beneficial: false, particleColor: 0x587653, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  weakness: Object.freeze({ name: 'weakness', beneficial: false, particleColor: 0x484d48, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  poison: Object.freeze({ name: 'poison', beneficial: false, particleColor: 0x87a363, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  wither: Object.freeze({ name: 'wither', beneficial: false, particleColor: 0x736156, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  health_boost: Object.freeze({ name: 'health_boost', beneficial: true, particleColor: 0xf87d23, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  absorption: Object.freeze({ name: 'absorption', beneficial: true, particleColor: 0x2552a5, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  saturation: Object.freeze({ name: 'saturation', beneficial: true, particleColor: 0xf82423, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  glowing: Object.freeze({ name: 'glowing', beneficial: false, particleColor: 0x94a061, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  levitation: Object.freeze({ name: 'levitation', beneficial: false, particleColor: 0xceffff, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  luck: Object.freeze({ name: 'luck', beneficial: true, particleColor: 0x59c106, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  unluck: Object.freeze({ name: 'unluck', beneficial: false, particleColor: 0xc0a44d, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  slow_falling: Object.freeze({ name: 'slow_falling', beneficial: true, particleColor: 0xf3cfb9, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  conduit_power: Object.freeze({ name: 'conduit_power', beneficial: true, particleColor: 0x1dc2d1, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  dolphins_grace: Object.freeze({ name: 'dolphins_grace', beneficial: true, particleColor: 0x88a3be, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  bad_omen: Object.freeze({ name: 'bad_omen', beneficial: false, particleColor: 0x0b6138, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  hero_of_the_village: Object.freeze({ name: 'hero_of_the_village', beneficial: true, particleColor: 0x44ff44, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  darkness: Object.freeze({ name: 'darkness', beneficial: false, particleColor: 0x292721, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  trial_omen: Object.freeze({ name: 'trial_omen', beneficial: false, particleColor: 0x16a6a6, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  raid_omen: Object.freeze({ name: 'raid_omen', beneficial: false, particleColor: 0xde4058, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  wind_charged: Object.freeze({ name: 'wind_charged', beneficial: false, particleColor: 0xbdc9ff, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  weaving: Object.freeze({ name: 'weaving', beneficial: false, particleColor: 0x78695a, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  oozing: Object.freeze({ name: 'oozing', beneficial: false, particleColor: 0x99ffa3, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
  infested: Object.freeze({ name: 'infested', beneficial: false, particleColor: 0x8c9b8c, maxAmplifier: STATUS_EFFECT_AMPLIFIER_MAX }),
})

/**
 * Namespaces a status effect name to its `minecraft:<name>` resource
 * location. Delegates to `identifiers.ts`'s `vanillaId`, the single place
 * that spells `minecraft:<name>`, so the concept does not drift back into
 * independent spellings (docs/design-notes.md §1); this wrapper exists to
 * give the result a `StatusEffectName`-typed signature.
 */
export const statusEffectId = (name: StatusEffectName): ResourceLocation =>
  vanillaId(name)

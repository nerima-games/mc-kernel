/**
 * Closed Java Edition 1.21 `DamageType` vocabulary.
 *
 * This module is deliberately data-only. Runtime validation lives in
 * `./damage-type-validation` so the table can be read without mixing it
 * with external-input handling (architecture.md §6, the same split as
 * `status-effect-data.ts` / `status-effect-validation.ts`).
 *
 * A placement review (docs/responsibility.md §3-2) found the vocabulary
 * itself has two independent consumers that cannot reach each other on the
 * dependency graph — `mc-audio` picks a hurt sound by damage type,
 * `mx-ui` renders a death message from the same type — so it belongs here.
 * Computing final damage from raw damage, armour, toughness, protection or
 * resistance does not pass that test (its only identified consumer reaches
 * the kernel through an ordinary dependency edge) and is deliberately not
 * implemented in this module or anywhere else in the kernel; that
 * arithmetic is `mx-gameplay`'s to own (docs/responsibility.md lines 44
 * and 336 assign damage sources to the upper layer).
 *
 * The roster, the `#minecraft:bypasses_armor` / `#minecraft:bypasses_invulnerability`
 * tag membership, and the `scaling` field of every entry were read from
 * `data/minecraft/damage_type/*.json` and `data/minecraft/tags/damage_type/*.json`
 * at the `1.21-data` tag of the misode/mcmeta registry mirror (which tracks
 * the generated vanilla data reports), not a later point release — so
 * additions such as `mace_smash` (1.21.2), `ender_pearl` (a later fall-damage
 * carve-out) and `spear` are excluded, mirroring how `status-effect-data.ts`
 * excludes `Breath of the Nautilus`. The closed vocabulary here is exactly
 * Java Edition 1.21's damage-type roster, pinned by
 * `EXPECTED_DAMAGE_TYPE_COUNT` in `test/damage-type.test.ts`.
 *
 * `kind` groups each type by its `is_fire` / `is_explosion` / `is_projectile`
 * / `is_fall` / `is_drowning` tag membership, with `magic` assigned to the
 * two `magic` / `indirect_magic` ids and `generic` as the fallback for every
 * id that carries none of those tags. `fireball` and `unattributed_fireball`
 * are tagged both `is_fire` and `is_projectile`; `fire` was chosen as the
 * more salient property for a hurt-sound or death-message consumer.
 *
 * `scalesWithDifficulty` reflects `scaling !== 'never'`. Every vanilla 1.21
 * damage type uses `always` or `when_caused_by_living_non_player`; none use
 * `never`, so this field is `true` for every entry — a verified fact about
 * the current roster, not a placeholder.
 */
import { ResourceLocation, vanillaId } from './identifiers.js'

export const DAMAGE_TYPE_NAMES = [
  'arrow',
  'bad_respawn_point',
  'cactus',
  'campfire',
  'cramming',
  'dragon_breath',
  'drown',
  'dry_out',
  'explosion',
  'fall',
  'falling_anvil',
  'falling_block',
  'falling_stalactite',
  'fireball',
  'fireworks',
  'fly_into_wall',
  'freeze',
  'generic',
  'generic_kill',
  'hot_floor',
  'in_fire',
  'in_wall',
  'indirect_magic',
  'lava',
  'lightning_bolt',
  'magic',
  'mob_attack',
  'mob_attack_no_aggro',
  'mob_projectile',
  'on_fire',
  'out_of_world',
  'outside_border',
  'player_attack',
  'player_explosion',
  'sonic_boom',
  'spit',
  'stalagmite',
  'starve',
  'sting',
  'sweet_berry_bush',
  'thorns',
  'thrown',
  'trident',
  'unattributed_fireball',
  'wind_charge',
  'wither',
  'wither_skull',
] as const

export type DamageTypeName = (typeof DAMAGE_TYPE_NAMES)[number]

export const DAMAGE_TYPE_KINDS = [
  'fire',
  'explosion',
  'projectile',
  'magic',
  'fall',
  'drowning',
  'generic',
] as const

export type DamageTypeKind = (typeof DAMAGE_TYPE_KINDS)[number]

export type DamageTypeDefinition = Readonly<{
  readonly name: DamageTypeName
  readonly armorReduces: boolean
  readonly bypassesInvulnerability: boolean
  readonly kind: DamageTypeKind
  readonly scalesWithDifficulty: boolean
}>

export const DAMAGE_TYPE_DEFINITIONS: Readonly<Record<DamageTypeName, DamageTypeDefinition>> = Object.freeze({
  arrow: Object.freeze({ name: 'arrow', armorReduces: true, bypassesInvulnerability: false, kind: 'projectile', scalesWithDifficulty: true }),
  bad_respawn_point: Object.freeze({ name: 'bad_respawn_point', armorReduces: true, bypassesInvulnerability: false, kind: 'explosion', scalesWithDifficulty: true }),
  cactus: Object.freeze({ name: 'cactus', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  campfire: Object.freeze({ name: 'campfire', armorReduces: true, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  cramming: Object.freeze({ name: 'cramming', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  dragon_breath: Object.freeze({ name: 'dragon_breath', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  drown: Object.freeze({ name: 'drown', armorReduces: false, bypassesInvulnerability: false, kind: 'drowning', scalesWithDifficulty: true }),
  dry_out: Object.freeze({ name: 'dry_out', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  explosion: Object.freeze({ name: 'explosion', armorReduces: true, bypassesInvulnerability: false, kind: 'explosion', scalesWithDifficulty: true }),
  fall: Object.freeze({ name: 'fall', armorReduces: false, bypassesInvulnerability: false, kind: 'fall', scalesWithDifficulty: true }),
  falling_anvil: Object.freeze({ name: 'falling_anvil', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  falling_block: Object.freeze({ name: 'falling_block', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  falling_stalactite: Object.freeze({ name: 'falling_stalactite', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  fireball: Object.freeze({ name: 'fireball', armorReduces: true, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  fireworks: Object.freeze({ name: 'fireworks', armorReduces: true, bypassesInvulnerability: false, kind: 'explosion', scalesWithDifficulty: true }),
  fly_into_wall: Object.freeze({ name: 'fly_into_wall', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  freeze: Object.freeze({ name: 'freeze', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  generic: Object.freeze({ name: 'generic', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  generic_kill: Object.freeze({ name: 'generic_kill', armorReduces: false, bypassesInvulnerability: true, kind: 'generic', scalesWithDifficulty: true }),
  hot_floor: Object.freeze({ name: 'hot_floor', armorReduces: true, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  in_fire: Object.freeze({ name: 'in_fire', armorReduces: true, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  in_wall: Object.freeze({ name: 'in_wall', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  indirect_magic: Object.freeze({ name: 'indirect_magic', armorReduces: false, bypassesInvulnerability: false, kind: 'magic', scalesWithDifficulty: true }),
  lava: Object.freeze({ name: 'lava', armorReduces: true, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  lightning_bolt: Object.freeze({ name: 'lightning_bolt', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  magic: Object.freeze({ name: 'magic', armorReduces: false, bypassesInvulnerability: false, kind: 'magic', scalesWithDifficulty: true }),
  mob_attack: Object.freeze({ name: 'mob_attack', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  mob_attack_no_aggro: Object.freeze({ name: 'mob_attack_no_aggro', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  mob_projectile: Object.freeze({ name: 'mob_projectile', armorReduces: true, bypassesInvulnerability: false, kind: 'projectile', scalesWithDifficulty: true }),
  on_fire: Object.freeze({ name: 'on_fire', armorReduces: false, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  out_of_world: Object.freeze({ name: 'out_of_world', armorReduces: false, bypassesInvulnerability: true, kind: 'generic', scalesWithDifficulty: true }),
  outside_border: Object.freeze({ name: 'outside_border', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  player_attack: Object.freeze({ name: 'player_attack', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  player_explosion: Object.freeze({ name: 'player_explosion', armorReduces: true, bypassesInvulnerability: false, kind: 'explosion', scalesWithDifficulty: true }),
  sonic_boom: Object.freeze({ name: 'sonic_boom', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  spit: Object.freeze({ name: 'spit', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  stalagmite: Object.freeze({ name: 'stalagmite', armorReduces: false, bypassesInvulnerability: false, kind: 'fall', scalesWithDifficulty: true }),
  starve: Object.freeze({ name: 'starve', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  sting: Object.freeze({ name: 'sting', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  sweet_berry_bush: Object.freeze({ name: 'sweet_berry_bush', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  thorns: Object.freeze({ name: 'thorns', armorReduces: true, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  thrown: Object.freeze({ name: 'thrown', armorReduces: true, bypassesInvulnerability: false, kind: 'projectile', scalesWithDifficulty: true }),
  trident: Object.freeze({ name: 'trident', armorReduces: true, bypassesInvulnerability: false, kind: 'projectile', scalesWithDifficulty: true }),
  unattributed_fireball: Object.freeze({ name: 'unattributed_fireball', armorReduces: true, bypassesInvulnerability: false, kind: 'fire', scalesWithDifficulty: true }),
  wind_charge: Object.freeze({ name: 'wind_charge', armorReduces: true, bypassesInvulnerability: false, kind: 'projectile', scalesWithDifficulty: true }),
  wither: Object.freeze({ name: 'wither', armorReduces: false, bypassesInvulnerability: false, kind: 'generic', scalesWithDifficulty: true }),
  wither_skull: Object.freeze({ name: 'wither_skull', armorReduces: true, bypassesInvulnerability: false, kind: 'projectile', scalesWithDifficulty: true }),
})

/**
 * Namespaces a damage type name to its `minecraft:<name>` resource location.
 * Delegates to `identifiers.ts`'s `vanillaId`, the single place that spells
 * `minecraft:<name>`, so the concept does not drift back into independent
 * spellings (docs/design-notes.md §1); this wrapper exists to give the
 * result a `DamageTypeName`-typed signature, the same discipline
 * `status-effect-data.ts`'s `statusEffectId` applies to effect ids.
 */
export const damageTypeId = (name: DamageTypeName): ResourceLocation =>
  vanillaId(name)

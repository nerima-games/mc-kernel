import { describe, expect, it } from 'vitest'
import {
  DAMAGE_TYPE_DEFINITIONS,
  DAMAGE_TYPE_KINDS,
  DAMAGE_TYPE_NAMES,
  damageTypeId,
  isDamageTypeId,
  isDamageTypeName,
  resolveDamageTypeDefinition,
} from '../src/domain/damage-type'
import type { DamageTypeKind, DamageTypeName } from '../src/domain/damage-type'
import { isVanillaDamageTypeComponent } from '../src/domain/item-combat-validation'

const EXPECTED_DAMAGE_TYPE_COUNT = 47

describe('DAMAGE_TYPE_NAMES', () => {
  it('has exactly the 47 closed Java Edition 1.21 damage types, each unique', () => {
    expect(DAMAGE_TYPE_NAMES.length).toBe(EXPECTED_DAMAGE_TYPE_COUNT)
    expect(new Set(DAMAGE_TYPE_NAMES).size).toBe(EXPECTED_DAMAGE_TYPE_COUNT)
  })

  it('lists exactly this roster (data/minecraft/damage_type/*.json at the 1.21-data tag)', () => {
    expect([...DAMAGE_TYPE_NAMES]).toEqual([
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
    ])
  })
})

describe('DAMAGE_TYPE_DEFINITIONS', () => {
  it('gives every name a row whose own name field matches the key, with a well-formed kind', () => {
    for (const name of DAMAGE_TYPE_NAMES) {
      const definition = DAMAGE_TYPE_DEFINITIONS[name]
      expect(definition.name).toBe(name)
      expect(typeof definition.armorReduces).toBe('boolean')
      expect(typeof definition.bypassesInvulnerability).toBe('boolean')
      expect(typeof definition.scalesWithDifficulty).toBe('boolean')
      expect(DAMAGE_TYPE_KINDS).toContain(definition.kind)
    }
  })

  it('marks the two #minecraft:bypasses_invulnerability members and no others', () => {
    expect(DAMAGE_TYPE_DEFINITIONS.out_of_world.bypassesInvulnerability).toBe(true)
    expect(DAMAGE_TYPE_DEFINITIONS.generic_kill.bypassesInvulnerability).toBe(true)
    const bypassers = DAMAGE_TYPE_NAMES.filter((name) => DAMAGE_TYPE_DEFINITIONS[name].bypassesInvulnerability)
    expect(bypassers.sort()).toEqual(['generic_kill', 'out_of_world'])
  })

  it('classifies armour reduction per #minecraft:bypasses_armor (sample)', () => {
    expect(DAMAGE_TYPE_DEFINITIONS.player_attack.armorReduces).toBe(true)
    expect(DAMAGE_TYPE_DEFINITIONS.arrow.armorReduces).toBe(true)
    expect(DAMAGE_TYPE_DEFINITIONS.starve.armorReduces).toBe(false)
    expect(DAMAGE_TYPE_DEFINITIONS.magic.armorReduces).toBe(false)
    expect(DAMAGE_TYPE_DEFINITIONS.out_of_world.armorReduces).toBe(false)
  })

  it('classifies kind per the is_fire / is_explosion / is_projectile / is_fall / is_drowning tags (sample)', () => {
    expect(DAMAGE_TYPE_DEFINITIONS.in_fire.kind).toBe('fire')
    expect(DAMAGE_TYPE_DEFINITIONS.lava.kind).toBe('fire')
    expect(DAMAGE_TYPE_DEFINITIONS.fireball.kind).toBe('fire')
    expect(DAMAGE_TYPE_DEFINITIONS.explosion.kind).toBe('explosion')
    expect(DAMAGE_TYPE_DEFINITIONS.player_explosion.kind).toBe('explosion')
    expect(DAMAGE_TYPE_DEFINITIONS.arrow.kind).toBe('projectile')
    expect(DAMAGE_TYPE_DEFINITIONS.trident.kind).toBe('projectile')
    expect(DAMAGE_TYPE_DEFINITIONS.magic.kind).toBe('magic')
    expect(DAMAGE_TYPE_DEFINITIONS.indirect_magic.kind).toBe('magic')
    expect(DAMAGE_TYPE_DEFINITIONS.fall.kind).toBe('fall')
    expect(DAMAGE_TYPE_DEFINITIONS.stalagmite.kind).toBe('fall')
    expect(DAMAGE_TYPE_DEFINITIONS.drown.kind).toBe('drowning')
    expect(DAMAGE_TYPE_DEFINITIONS.generic.kind).toBe('generic')
    expect(DAMAGE_TYPE_DEFINITIONS.player_attack.kind).toBe('generic')
  })

  it('scales with difficulty for every vanilla 1.21 damage type (none use scaling: never)', () => {
    for (const name of DAMAGE_TYPE_NAMES) {
      expect(DAMAGE_TYPE_DEFINITIONS[name].scalesWithDifficulty).toBe(true)
    }
  })

  describe('armorReduces (exhaustive, #minecraft:bypasses_armor at the 1.21-data tag)', () => {
    // The tag itself lists the 18 members that DO bypass armour (armorReduces:
    // false); every other name in the closed vocabulary reduces armour. Pinning
    // the bypassing set (rather than the reducing set) mirrors the tag file this
    // was read from, so a diff against a future data-tag re-pull stays direct.
    const bypassesArmor: ReadonlyArray<DamageTypeName> = [
      'cramming',
      'dragon_breath',
      'drown',
      'fall',
      'fly_into_wall',
      'freeze',
      'generic',
      'generic_kill',
      'in_wall',
      'indirect_magic',
      'magic',
      'on_fire',
      'out_of_world',
      'outside_border',
      'sonic_boom',
      'stalagmite',
      'starve',
      'wither',
    ]

    it('lists exactly 18 unique bypassing members', () => {
      expect(bypassesArmor.length).toBe(18)
      expect(new Set(bypassesArmor).size).toBe(18)
    })

    it('marks every name in DAMAGE_TYPE_NAMES as armour-reducing unless it is a bypasser, and nothing else', () => {
      const reducers = DAMAGE_TYPE_NAMES.filter((name) => DAMAGE_TYPE_DEFINITIONS[name].armorReduces)
      const expectedReducers = DAMAGE_TYPE_NAMES.filter((name) => !bypassesArmor.includes(name))
      expect([...reducers].sort()).toEqual([...expectedReducers].sort())

      const nonReducers = DAMAGE_TYPE_NAMES.filter((name) => !DAMAGE_TYPE_DEFINITIONS[name].armorReduces)
      expect([...nonReducers].sort()).toEqual([...bypassesArmor].sort())
    })
  })

  describe('kind (exhaustive, is_fire / is_explosion / is_projectile / is_fall / is_drowning tags at the 1.21-data tag)', () => {
    // magic has no tag of its own; it is the two hardcoded ids. generic is the
    // fallback for every id carrying none of the five tags. fireball and
    // unattributed_fireball are tagged both is_fire and is_projectile and are
    // listed under fire only, per the fire/projectile tie-break documented in
    // damage-type-data.ts.
    const fire: ReadonlyArray<DamageTypeName> = [
      'campfire',
      'fireball',
      'hot_floor',
      'in_fire',
      'lava',
      'on_fire',
      'unattributed_fireball',
    ]
    const explosion: ReadonlyArray<DamageTypeName> = ['bad_respawn_point', 'explosion', 'fireworks', 'player_explosion']
    const projectile: ReadonlyArray<DamageTypeName> = [
      'arrow',
      'mob_projectile',
      'thrown',
      'trident',
      'wind_charge',
      'wither_skull',
    ]
    const fall: ReadonlyArray<DamageTypeName> = ['fall', 'stalagmite']
    const drowning: ReadonlyArray<DamageTypeName> = ['drown']
    const magic: ReadonlyArray<DamageTypeName> = ['indirect_magic', 'magic']
    const generic: ReadonlyArray<DamageTypeName> = [
      'cactus',
      'cramming',
      'dragon_breath',
      'dry_out',
      'falling_anvil',
      'falling_block',
      'falling_stalactite',
      'fly_into_wall',
      'freeze',
      'generic',
      'generic_kill',
      'in_wall',
      'lightning_bolt',
      'mob_attack',
      'mob_attack_no_aggro',
      'out_of_world',
      'outside_border',
      'player_attack',
      'sonic_boom',
      'spit',
      'starve',
      'sting',
      'sweet_berry_bush',
      'thorns',
      'wither',
    ]

    const rosterByKind: ReadonlyArray<readonly [DamageTypeKind, ReadonlyArray<DamageTypeName>]> = [
      ['fire', fire],
      ['explosion', explosion],
      ['projectile', projectile],
      ['fall', fall],
      ['drowning', drowning],
      ['magic', magic],
      ['generic', generic],
    ]

    it('covers all 47 names across the seven kinds exactly once', () => {
      const combined = rosterByKind.flatMap(([, names]) => [...names])
      expect(combined.length).toBe(DAMAGE_TYPE_NAMES.length)
      expect(new Set(combined)).toEqual(new Set(DAMAGE_TYPE_NAMES))
    })

    it.each(rosterByKind)('assigns %s to exactly the listed names and no others', (kind, names) => {
      const actual = DAMAGE_TYPE_NAMES.filter((name) => DAMAGE_TYPE_DEFINITIONS[name].kind === kind)
      expect([...actual].sort()).toEqual([...names].sort())
    })
  })
})

describe('damageTypeId', () => {
  it('namespaces a damage type name under minecraft:', () => {
    expect(damageTypeId('arrow')).toBe('minecraft:arrow')
    expect(damageTypeId('player_attack')).toBe('minecraft:player_attack')
  })
})

describe('isDamageTypeName', () => {
  it('accepts every vocabulary member', () => {
    for (const name of DAMAGE_TYPE_NAMES) {
      expect(isDamageTypeName(name)).toBe(true)
    }
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isDamageTypeName('not_a_damage_type')).toBe(false)
    expect(isDamageTypeName('')).toBe(false)
    expect(isDamageTypeName(42)).toBe(false)
    expect(isDamageTypeName(undefined)).toBe(false)
    expect(isDamageTypeName(null)).toBe(false)
  })
})

describe('isDamageTypeId', () => {
  it('accepts every vocabulary member, namespaced', () => {
    for (const name of DAMAGE_TYPE_NAMES) {
      expect(isDamageTypeId(damageTypeId(name))).toBe(true)
    }
  })

  it('rejects ids outside the closed vocabulary and non-strings', () => {
    expect(isDamageTypeId('minecraft:not_a_damage_type')).toBe(false)
    expect(isDamageTypeId('mymod:custom_damage')).toBe(false)
    expect(isDamageTypeId(123)).toBe(false)
  })
})

describe('resolveDamageTypeDefinition', () => {
  it('resolves a valid name to its table row', () => {
    expect(resolveDamageTypeDefinition('arrow')).toBe(DAMAGE_TYPE_DEFINITIONS.arrow)
  })

  it('throws on an unrecognised value', () => {
    expect(() => resolveDamageTypeDefinition('not_a_damage_type')).toThrow(TypeError)
    expect(() => resolveDamageTypeDefinition(42)).toThrow(TypeError)
  })
})

describe('isVanillaDamageTypeComponent (item-combat-validation.ts projection)', () => {
  it('accepts a vanilla damage type id and rejects everything else', () => {
    expect(isVanillaDamageTypeComponent('minecraft:player_attack')).toBe(true)
    expect(isVanillaDamageTypeComponent('minecraft:custom_damage')).toBe(false)
    expect(isVanillaDamageTypeComponent('not a resource location')).toBe(false)
    expect(isVanillaDamageTypeComponent(123)).toBe(false)
  })
})

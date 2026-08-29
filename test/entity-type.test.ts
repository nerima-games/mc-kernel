import { describe, expect, it } from 'vitest'

import { ENTITY_TYPES, type EntityType, isEntityType } from '../src/domain/entity-type'

const FIRST_ENTITY_TYPE_INDEX = 0

// Pinned as a literal list rather than a count so every roster addition
// remains visible in review (README.md:143's convention for ItemType).
const EXPECTED_ENTITY_TYPES = [
  'player',

  'allay',
  'armadillo',
  'axolotl',
  'bat',
  'camel',
  'cat',
  'chicken',
  'cod',
  'cow',
  'dolphin',
  'donkey',
  'fox',
  'frog',
  'glow_squid',
  'horse',
  'mooshroom',
  'mule',
  'ocelot',
  'parrot',
  'pig',
  'pufferfish',
  'rabbit',
  'salmon',
  'sheep',
  'skeleton_horse',
  'sniffer',
  'squid',
  'strider',
  'tadpole',
  'tropical_fish',
  'turtle',
  'villager',
  'wandering_trader',
  'zombie_horse',

  'bee',
  'cave_spider',
  'enderman',
  'goat',
  'iron_golem',
  'llama',
  'trader_llama',
  'panda',
  'piglin',
  'polar_bear',
  'snow_golem',
  'spider',
  'wolf',
  'zombified_piglin',

  'blaze',
  'bogged',
  'breeze',
  'creeper',
  'drowned',
  'elder_guardian',
  'endermite',
  'evoker',
  'ghast',
  'giant',
  'guardian',
  'hoglin',
  'husk',
  'magma_cube',
  'phantom',
  'piglin_brute',
  'pillager',
  'ravager',
  'shulker',
  'silverfish',
  'skeleton',
  'slime',
  'stray',
  'vex',
  'vindicator',
  'warden',
  'witch',
  'wither_skeleton',
  'zoglin',
  'zombie',
  'zombie_villager',

  'ender_dragon',
  'wither',

  'arrow',
  'breeze_wind_charge',
  'dragon_fireball',
  'egg',
  'ender_pearl',
  'experience_bottle',
  'fireball',
  'firework_rocket',
  'fishing_bobber',
  'llama_spit',
  'potion',
  'shulker_bullet',
  'small_fireball',
  'snowball',
  'spectral_arrow',
  'trident',
  'wind_charge',
  'wither_skull',

  'boat',
  'chest_boat',
  'chest_minecart',
  'command_block_minecart',
  'furnace_minecart',
  'hopper_minecart',
  'minecart',
  'spawner_minecart',
  'tnt_minecart',

  'block_display',
  'interaction',
  'item_display',
  'marker',
  'text_display',

  'area_effect_cloud',
  'armor_stand',
  'end_crystal',
  'evoker_fangs',
  'experience_orb',
  'eye_of_ender',
  'falling_block',
  'glow_item_frame',
  'item',
  'item_frame',
  'leash_knot',
  'lightning_bolt',
  'painting',
  'tnt',
] as const satisfies ReadonlyArray<EntityType>

describe('EntityType is a closed literal union, mirroring BlockType and ItemType', () => {
  it('is exactly the reviewed roster, in order', () =>
    expect([...ENTITY_TYPES]).toStrictEqual([...EXPECTED_ENTITY_TYPES]))

  it('has no duplicate literal', () => expect(new Set(ENTITY_TYPES).size).toBe(ENTITY_TYPES.length))

  it('narrows a string that names a known entity', () => {
    for (const entity of ENTITY_TYPES) {
      expect(isEntityType(entity)).toBe(true)
    }
    expect(isEntityType(ENTITY_TYPES[FIRST_ENTITY_TYPE_INDEX])).toBe(true)
    expect(isEntityType('zombie')).toBe(true)
  })

  it('rejects a string that does not name a known entity', () => {
    expect(isEntityType('unobtainium')).toBe(false)
    expect(isEntityType('ZOMBIE')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isEntityType('')).toBe(false)
  })

  it('rejects a non-string value', () => {
    expect(isEntityType(0)).toBe(false)
    expect(isEntityType(null)).toBe(false)
    expect(isEntityType(undefined)).toBe(false)
    expect(isEntityType({ type: 'zombie' })).toBe(false)
  })
})

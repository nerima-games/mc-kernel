import { describe, expect, it } from 'vitest'
import {
  WITHER_ARMOUR_THRESHOLD,
  WITHER_MAX_HEALTH,
  WITHER_MAX_SPEED,
  WITHER_SPAWN_CHARGE_SECS,
  createWither,
  damageWither,
  matchWitherSummon,
  restoreWither,
  serializeWither,
  stepWither,
  witherSkullProjectile,
} from '../src/domain/wither'
import type {
  BlockCell,
  WitherSnapshot,
  WitherSummonMaterial,
} from '../src/domain/wither'

const summonMaterials: ReadonlyArray<'soul_sand' | 'soul_soil'> = ['soul_sand', 'soul_soil']

const keyOf = (value: BlockCell): string => [value.x, value.y, value.z].join(',')

const matchingPattern = (
  base: BlockCell,
  axis: 'x' | 'z',
  bodyMaterial: 'soul_sand' | 'soul_soil',
) => {
  const side = axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 }
  const body = [
    base,
    { x: base.x, y: base.y + 1, z: base.z },
    { x: base.x + side.x, y: base.y + 1, z: base.z + side.z },
    { x: base.x - side.x, y: base.y + 1, z: base.z - side.z },
  ]
  const skulls = [-1, 0, 1].map((offset) => ({
    x: base.x + side.x * offset,
    y: base.y + 2,
    z: base.z + side.z * offset,
  }))
  const blocks = new Map<string, WitherSummonMaterial>()
  for (const cell of body) blocks.set(keyOf(cell), bodyMaterial)
  for (const cell of skulls) blocks.set(keyOf(cell), 'wither_skeleton_skull')
  return {
    body,
    skulls,
    blockAt: (cell: BlockCell): WitherSummonMaterial | undefined => blocks.get(keyOf(cell)),
  }
}

describe('wither summon and lifecycle rules', () => {
  it('matches both body materials and both horizontal summon axes', () => {
    const base = { x: 4, y: 8, z: -2 }

    for (const material of summonMaterials) {
      const pattern = matchingPattern(base, 'x', material)
      expect(matchWitherSummon(base, pattern.blockAt)).toEqual({
        axis: 'x',
        spawnPosition: { x: 4.5, y: 9, z: -1.5 },
        consumedBlocks: [...pattern.body, ...pattern.skulls],
      })
    }

    const zPattern = matchingPattern(base, 'z', 'soul_sand')
    expect(matchWitherSummon(base, zPattern.blockAt)).toEqual({
      axis: 'z',
      spawnPosition: { x: 4.5, y: 9, z: -1.5 },
      consumedBlocks: [...zPattern.body, ...zPattern.skulls],
    })
  })

  it('rejects incomplete or non-soul summon patterns', () => {
    const base = { x: 0, y: 64, z: 0 }
    const pattern = matchingPattern(base, 'x', 'soul_sand')

    expect(matchWitherSummon(base, (cell) =>
      cell.y === base.y + 2 && cell.x === base.x + 1
        ? 'air'
        : pattern.blockAt(cell),
    )).toBeUndefined()
    expect(matchWitherSummon(base, (cell) =>
      cell.y === base.y + 1 && cell.x === base.x
        ? 'air'
        : pattern.blockAt(cell),
    )).toBeUndefined()
  })

  it('charges, explodes on spawn, and does not repeat the spawn explosion', () => {
    const charging = createWither({ x: 0, y: 64, z: 0 })
    expect(charging.chargeRemainingSecs).toBe(WITHER_SPAWN_CHARGE_SECS)

    const partial = stepWither(charging, 4)
    expect(partial.state.phase).toBe('charging')
    expect(partial.state.chargeRemainingSecs).toBe(6)
    expect(partial.spawnExplosion).toBeUndefined()

    const spawned = stepWither(partial.state, 6)
    expect(spawned.state.phase).toBe('airborne')
    expect(spawned.state.chargeRemainingSecs).toBe(0)
    expect(spawned.spawnExplosion).toEqual({
      power: 7,
      position: { x: 0, y: 64, z: 0 },
    })

    const continued = stepWither(spawned.state, 1)
    expect(continued.spawnExplosion).toBeUndefined()
    expect(continued.state.phase).toBe('airborne')
  })

  it('follows a three-dimensional target, clamps speed, regenerates, and handles stationary steps', () => {
    const airborne = stepWither(
      createWither({ x: 0, y: 0, z: 0 }),
      WITHER_SPAWN_CHARGE_SECS,
    ).state
    const moved = stepWither(
      { ...airborne, feetPosition: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
      1,
      { x: 3, y: 4, z: 0 },
    )
    expect(moved.state.velocity.x).toBeCloseTo(3)
    expect(moved.state.velocity.y).toBeCloseTo(4)
    expect(moved.state.velocity.z).toBe(0)
    expect(moved.state.feetPosition.x).toBeCloseTo(3)
    expect(moved.state.feetPosition.y).toBeCloseTo(4)
    expect(moved.state.feetPosition.z).toBe(0)
    expect(Math.hypot(moved.state.velocity.x, moved.state.velocity.y, moved.state.velocity.z)).toBeCloseTo(WITHER_MAX_SPEED)
    expect(moved.state.healthPoints).toBe(WITHER_MAX_HEALTH)

    const alreadyWithinLimit = stepWither(
      { ...airborne, velocity: { x: 1, y: 0, z: 0 } },
      1,
      { x: 0, y: 0, z: 0 },
    )
    expect(alreadyWithinLimit.state.velocity).toEqual({ x: 1, y: 0, z: 0 })

    const stationary = stepWither(
      { ...airborne, healthPoints: WITHER_MAX_HEALTH - 1, feetPosition: { x: 1, y: 2, z: 3 } },
      Number.NaN,
      { x: 1, y: 2, z: 3 },
    )
    expect(stationary.state.feetPosition).toEqual({ x: 1, y: 2, z: 3 })
    expect(stationary.state.velocity).toEqual({ x: 0, y: 0, z: 0 })
    expect(stationary.state.healthPoints).toBe(WITHER_MAX_HEALTH - 1)

    const negativeDelta = stepWither(airborne, -1, { x: 4, y: 5, z: 6 })
    expect(negativeDelta.state).toEqual(airborne)
  })

  it('applies armour, damage filtering, regeneration, and death drops', () => {
    const airborne = stepWither(
      createWither({ x: 1, y: 2, z: 3 }),
      WITHER_SPAWN_CHARGE_SECS,
    ).state
    const chargingDamage = damageWither(createWither({ x: 1, y: 2, z: 3 }), 10, 'melee')
    expect(chargingDamage.ignored).toBe(true)
    expect(chargingDamage.state.phase).toBe('charging')

    const armoured = damageWither(airborne, WITHER_ARMOUR_THRESHOLD, 'melee').state
    expect(armoured.phase).toBe('armoured')
    expect(armoured.healthPoints).toBe(WITHER_ARMOUR_THRESHOLD)
    expect(damageWither(armoured, 5, 'ranged')).toMatchObject({
      appliedDamage: 0,
      ignored: true,
      death: undefined,
    })
    expect(damageWither(armoured, 0, 'melee')).toMatchObject({
      appliedDamage: 0,
      ignored: false,
      death: undefined,
    })
    expect(damageWither(armoured, -5, 'melee')).toMatchObject({
      appliedDamage: 0,
      ignored: false,
      death: undefined,
    })

    const wounded = damageWither(armoured, 25, 'melee')
    expect(wounded.appliedDamage).toBe(25)
    expect(wounded.state.phase).toBe('armoured')
    expect(stepWither(wounded.state, 2).state.healthPoints).toBe(127)
    expect(damageWither(airborne, 1, 'ranged').state.phase).toBe('airborne')

    const dead = damageWither(armoured, WITHER_ARMOUR_THRESHOLD, 'void')
    expect(dead.state.phase).toBe('dead')
    expect(dead.state.healthPoints).toBe(0)
    expect(dead.death).toEqual({
      despawn: { kind: 'wither', reason: 'killed' },
      drop: { item: 'nether_star', count: 1, position: { x: 1, y: 2, z: 3 } },
    })
    expect(stepWither(dead.state, 1)).toEqual({ state: dead.state, spawnExplosion: undefined })
    expect(damageWither(dead.state, 1, 'magic')).toMatchObject({
      appliedDamage: 0,
      ignored: true,
      death: undefined,
    })
  })

  it('repairs snapshots and normalises phase from health and charge', () => {
    const airborne = stepWither(
      createWither({ x: 1, y: 2, z: 3 }),
      WITHER_SPAWN_CHARGE_SECS,
    ).state
    const charging = createWither({ x: 4, y: 5, z: 6 })
    expect(restoreWither(serializeWither(charging))).toEqual(charging)
    expect(restoreWither({ ...serializeWither(charging), state: { ...charging, chargeRemainingSecs: 0 } }).phase).toBe('airborne')
    expect(restoreWither({ ...serializeWither(airborne), state: { ...airborne, phase: 'armoured', healthPoints: WITHER_MAX_HEALTH } }).phase).toBe('armoured')
    expect(restoreWither({ ...serializeWither(airborne), state: { ...airborne, healthPoints: WITHER_ARMOUR_THRESHOLD } }).phase).toBe('armoured')
    expect(restoreWither({ ...serializeWither(airborne), state: { ...airborne, healthPoints: WITHER_ARMOUR_THRESHOLD + 1 } }).phase).toBe('airborne')
    expect(restoreWither({ ...serializeWither(airborne), state: { ...airborne, healthPoints: -1 } }).phase).toBe('dead')

    const malformed: WitherSnapshot = {
      kind: 'wither',
      version: 1,
      state: {
        ...airborne,
        phase: 'airborne',
        healthPoints: Number.NaN,
        chargeRemainingSecs: Number.POSITIVE_INFINITY,
        feetPosition: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: Number.NEGATIVE_INFINITY },
        velocity: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: Number.NEGATIVE_INFINITY },
      },
    }
    expect(restoreWither(malformed)).toEqual({
      phase: 'dead',
      healthPoints: 0,
      chargeRemainingSecs: 0,
      feetPosition: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    })
  })

  it('describes normal and blue skull projectiles', () => {
    expect(witherSkullProjectile(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      'normal',
    )).toEqual({
      kind: 'wither_skull',
      variant: 'normal',
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 0 },
      speed: 10,
      explosivePower: 1,
      destroysResistantBlocks: false,
    })
    expect(witherSkullProjectile(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 2 },
      'blue',
    )).toMatchObject({
      variant: 'blue',
      direction: { x: 1 / 3, y: 2 / 3, z: 2 / 3 },
      speed: 12,
      destroysResistantBlocks: true,
    })
  })
})

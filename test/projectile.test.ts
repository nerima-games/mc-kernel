import { aabb, type AABB } from '../src/domain/coordinate-geometry'
import { position } from '../src/domain/coordinate-primitives'
import {
  ARROW_MAX_LIFETIME_SECONDS,
  type Arrow,
  type ProjectileWorld,
  launchArrow,
  stepArrow,
} from '../src/domain/projectile'
import { describe, expect, it } from 'vitest'

const bounds = aabb(position(-100, -100, -100), position(100, 100, 100))

const box = (minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): AABB =>
  aabb(position(minX, minY, minZ), position(maxX, maxY, maxZ))

const world = (overrides: Partial<ProjectileWorld> = {}): ProjectileWorld => ({
  blockBounds: () => [],
  entities: [],
  isInWater: () => false,
  bounds,
  ...overrides,
})

describe('arrow projectiles', () => {
  it('launches in the expected direction and applies air and water drag', () => {
    const arrow = launchArrow({ position: position(0, 5, 0), yawRadians: 0, pitchRadians: 0, speed: 10 })
    expect(arrow).toMatchObject({ state: 'flying' })
    if (arrow.state !== 'flying') {
      throw new Error('expected a flying arrow')
    }
    expect(arrow.velocity.x).toBeCloseTo(0)
    expect(arrow.velocity.y).toBeCloseTo(0)
    expect(arrow.velocity.z).toBeCloseTo(-10)

    const airStep = stepArrow(arrow, 0.1, world())
    const waterStep = stepArrow(
      arrow,
      0.1,
      world({ isInWater: () => true }),
    )

    expect(airStep.arrow).toMatchObject({ state: 'flying' })
    expect(waterStep.arrow).toMatchObject({ state: 'flying' })
    if (airStep.arrow.state !== 'flying' || waterStep.arrow.state !== 'flying') {
      throw new Error('expected both arrows to remain in flight')
    }
    expect(Math.abs(waterStep.arrow.velocity.z)).toBeLessThan(Math.abs(airStep.arrow.velocity.z))
    expect(airStep.arrow.position.y).toBeLessThan(5)
  })

  it('sticks to the first block face and reports its normal', () => {
    const arrow = launchArrow({ position: position(0, 0.5, 0.5), yawRadians: -Math.PI / 2, pitchRadians: 0, speed: 100 })
    const result = stepArrow(
      arrow,
      0.05,
      world({ blockBounds: () => [box(2, 0, 0, 3, 1, 1)] }),
    )

    expect(result.hit).toMatchObject({ kind: 'block', normal: position(-1, 0, 0) })
    if (result.hit === undefined) {
      throw new Error('expected a block hit')
    }
    expect(result.hit.point.x).toBeCloseTo(2)
    expect(result.arrow).toMatchObject({ state: 'stuck', recoverable: true, velocity: position(0, 0, 0) })
    if (result.arrow.state !== 'stuck') {
      throw new Error('expected a stuck arrow')
    }
    expect(result.arrow.hit.flightTimeSeconds).toBeGreaterThan(0)
    expect(result.arrow.hit.flightTimeSeconds).toBeLessThan(0.05)
  })

  it('handles every directional face and ignores parallel misses', () => {
    const negativeX = stepArrow(
      launchArrow({ position: position(4, 0.5, 0.5), yawRadians: Math.PI / 2, pitchRadians: 0, speed: 100 }),
      0.05,
      world({ blockBounds: () => [box(1, 0, 0, 2, 1, 1)] }),
    )
    const top = stepArrow(
      launchArrow({ position: position(0.5, 5, 0.5), yawRadians: 0, pitchRadians: 1.4, speed: 200 }),
      0.05,
      world({ blockBounds: () => [box(-100, -1, -100, 100, 1, 100)] }),
    )
    const underside = stepArrow(
      launchArrow({ position: position(0.5, -5, 0.5), yawRadians: 0, pitchRadians: -1.4, speed: 200 }),
      0.05,
      world({ blockBounds: () => [box(-100, -1, -100, 100, 0, 100)] }),
    )
    const negativeZ = stepArrow(
      launchArrow({ position: position(0.5, 0.5, 0.5), yawRadians: 0, pitchRadians: 0, speed: 50 }),
      0.05,
      world({ blockBounds: () => [box(-100, -100, -2, 100, 100, -1)] }),
    )
    const positiveZ = stepArrow(
      launchArrow({ position: position(0.5, 0.5, 0.5), yawRadians: Math.PI, pitchRadians: 0, speed: 50 }),
      0.05,
      world({ blockBounds: () => [box(-100, -100, 1, 100, 100, 2)] }),
    )
    const parallelMiss = stepArrow(
      launchArrow({ position: position(0.5, 5, 0.5), yawRadians: 0, pitchRadians: 1.4, speed: 200 }),
      0.05,
      world({ blockBounds: () => [box(5, 0, 0, 6, 1, 1)] }),
    )
    const entityMiss = stepArrow(
      launchArrow({ position: position(0.5, 0.5, 0.5), yawRadians: 0, pitchRadians: 0, speed: 50 }),
      0.05,
      world({ entities: [{ id: 'far', bounds: box(5, 0, 0, 6, 1, 1) }] }),
    )

    expect(negativeX.hit).toMatchObject({ normal: position(1, 0, 0) })
    expect(top.hit).toMatchObject({ normal: position(0, 1, 0) })
    expect(underside.hit).toMatchObject({ normal: position(0, -1, 0) })
    expect(negativeZ.hit).toMatchObject({ normal: position(0, 0, 1) })
    expect(positiveZ.hit).toMatchObject({ normal: position(0, 0, -1) })
    expect(parallelMiss.arrow.state).toBe('flying')
    expect(entityMiss.arrow.state).toBe('flying')
  })

  it('selects the closest block or entity independently of iteration order', () => {
    const blockFirst = stepArrow(
      launchArrow({ position: position(0, 0.5, 0.5), yawRadians: -Math.PI / 2, pitchRadians: 0, speed: 100 }),
      0.05,
      world({
        blockBounds: () => [box(2, 0, 0, 3, 1, 1), box(1, 0, 0, 1.5, 1, 1)],
      }),
    )
    const entityFirst = stepArrow(
      launchArrow({ position: position(0, 0.5, 0.5), yawRadians: -Math.PI / 2, pitchRadians: 0, speed: 100 }),
      0.05,
      world({
        blockBounds: () => [box(2, 0, 0, 3, 1, 1)],
        entities: [{ id: 'zombie', bounds: box(1, 0, 0, 1.5, 1, 1) }],
      }),
    )
    const entityCloser = stepArrow(
      launchArrow({ position: position(0, 0.5, 0.5), yawRadians: -Math.PI / 2, pitchRadians: 0, speed: 100 }),
      0.05,
      world({
        blockBounds: () => [box(1, 0, 0, 1.5, 1, 1)],
        entities: [{ id: 'zombie', bounds: box(2, 0, 0, 3, 1, 1) }],
      }),
    )

    expect(blockFirst).toMatchObject({ hit: { kind: 'block' } })
    expect(blockFirst.hit?.point.x).toBeCloseTo(1)
    expect(entityFirst).toMatchObject({ hit: { kind: 'entity', entityId: 'zombie' } })
    expect(entityFirst.hit?.point.x).toBeCloseTo(1)
    expect(entityCloser).toMatchObject({ hit: { kind: 'block' } })
    expect(entityCloser.hit?.point.x).toBeCloseTo(1)
  })

  it('ignores the shooter only during the grace period', () => {
    const shooter = { id: 'player', bounds: box(-0.5, -0.5, -1, 0.5, 0.5, 1) }
    const fresh = stepArrow(
      launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10, shooterId: shooter.id }),
      0.01,
      world({ entities: [shooter] }),
    )
    const oldArrow = launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10, shooterId: shooter.id })
    const old = stepArrow({ ...oldArrow, ageSeconds: 0.3 }, 0.01, world({ entities: [shooter] }))

    expect(fresh.arrow.state).toBe('flying')
    expect(old.hit).toMatchObject({ kind: 'entity', entityId: 'player' })
    expect(old.arrow).toMatchObject({ state: 'despawned', reason: 'entity-hit' })
  })

  it('leaves non-flying arrows untouched', () => {
    const arrow = launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10 })
    const result = stepArrow({ ...arrow, state: 'despawned', reason: 'world' }, 1, world())

    expect(result).toEqual({ arrow: { ...arrow, state: 'despawned', reason: 'world' } })
  })

  it('despawns invalid launches and invalid steps', () => {
    expect(launchArrow({ position: position(Number.NaN, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10 })).toMatchObject({
      state: 'despawned',
      reason: 'invalid',
    })
    expect(launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: -1 })).toMatchObject({
      state: 'despawned',
      reason: 'invalid',
    })
    expect(launchArrow({ position: position(0, 0, 0), yawRadians: Number.NaN, pitchRadians: 0, speed: 0 })).toMatchObject({
      state: 'despawned',
      reason: 'invalid',
    })

    const arrow = launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10 })
    const cases: readonly [Arrow, number, ProjectileWorld][] = [
      [{ ...arrow, position: position(Number.NaN, 0, 0) }, 0.1, world()],
      [{ ...arrow, velocity: position(Number.NaN, 0, 0) }, 0.1, world()],
      [{ ...arrow, ageSeconds: -1 }, 0.1, world()],
      [arrow, 0, world()],
      [arrow, -1, world()],
      [arrow, Number.NaN, world()],
      [arrow, 0.1, world({ bounds: box(Number.NaN, -1, -1, 1, 1, 1) })],
    ]

    for (const [candidate, deltaSeconds, candidateWorld] of cases) {
      expect(stepArrow(candidate, deltaSeconds, candidateWorld).arrow).toMatchObject({
        state: 'despawned',
        reason: 'invalid',
      })
    }
  })

  it('rejects non-finite age overflow and displacement', () => {
    const arrow = launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10 })
    expect(stepArrow({ ...arrow, ageSeconds: Number.MAX_VALUE }, Number.MAX_VALUE, world()).arrow).toMatchObject({
      state: 'despawned',
      reason: 'invalid',
    })
    expect(
      stepArrow(
        { ...arrow, velocity: position(Number.MAX_VALUE, 0, 0) },
        2,
        world(),
      ).arrow,
    ).toMatchObject({ state: 'despawned', reason: 'invalid' })
  })

  it('despawns at lifetime and world boundaries', () => {
    const arrow = launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10 })
    expect(stepArrow({ ...arrow, ageSeconds: ARROW_MAX_LIFETIME_SECONDS - 0.01 }, 0.01, world()).arrow).toMatchObject({
      state: 'despawned',
      reason: 'lifetime',
    })
    expect(
      stepArrow(
        launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 10 }),
        1,
        world({ bounds: box(-1, -1, -1, 1, 1, 1) }),
      ).arrow,
    ).toMatchObject({ state: 'despawned', reason: 'world' })
  })

  it('accepts finite boundary deltas', () => {
    const arrow = launchArrow({ position: position(0, 0, 0), yawRadians: 0, pitchRadians: 0, speed: 1 })

    for (const deltaSeconds of [Number.MIN_VALUE, 0.001, 0.05, 1]) {
      expect(stepArrow(arrow, deltaSeconds, world()).arrow.state).toBe('flying')
    }
  })
})

import type { AABB } from './coordinate-geometry.js'
import { position, type Position } from './coordinate-primitives.js'
import { segmentAABB, type SegmentHit } from './projectile-collision.js'

export const ARROW_GRAVITY = 9.81
export const ARROW_AIR_DRAG = 0.99
export const ARROW_WATER_DRAG = 0.6
export const ARROW_MAX_LIFETIME_SECONDS = 60
export const ARROW_SHOOTER_GRACE_SECONDS = 0.25

export type ProjectileEntity = Readonly<{
  id: string
  bounds: AABB
}>

export type ProjectileWorld = Readonly<{
  blockBounds: (start: Position, end: Position) => readonly AABB[]
  entities: readonly ProjectileEntity[]
  isInWater: (position: Position) => boolean
  bounds: AABB
}>

export type ProjectileHit =
  | Readonly<{
      kind: 'block'
      point: Position
      normal: Position
      flightTimeSeconds: number
    }>
  | Readonly<{
      kind: 'entity'
      entityId: string
      point: Position
      normal: Position
      flightTimeSeconds: number
    }>

type ArrowBase = Readonly<{
  position: Position
  velocity: Position
  ageSeconds: number
  shooterId?: string
}>

export type Arrow =
  | (ArrowBase &
      Readonly<{
        state: 'flying'
      }>)
  | (ArrowBase &
      Readonly<{
        state: 'stuck'
        hit: ProjectileHit
        recoverable: boolean
      }>)
  | (ArrowBase &
      Readonly<{
        state: 'despawned'
        reason: 'invalid' | 'lifetime' | 'world' | 'entity-hit'
      }>)

export type ArrowLaunch = Readonly<{
  position: Position
  yawRadians: number
  pitchRadians: number
  speed: number
  shooterId?: string
}>

export type ProjectileStep = Readonly<{
  arrow: Arrow
  hit?: ProjectileHit
}>

type CandidateHit =
  | (SegmentHit &
      Readonly<{
        kind: 'block'
      }>)
  | (SegmentHit &
      Readonly<{
        kind: 'entity'
        entityId: string
      }>)

const ZERO_POSITION = position(0, 0, 0)

const finitePosition = (value: Position): boolean =>
  Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)

const validBox = (box: AABB): boolean =>
  finitePosition(box.min) &&
  finitePosition(box.max) &&
  box.min.x <= box.max.x &&
  box.min.y <= box.max.y &&
  box.min.z <= box.max.z

const inside = (value: Position, bounds: AABB): boolean =>
  value.x >= bounds.min.x &&
  value.x <= bounds.max.x &&
  value.y >= bounds.min.y &&
  value.y <= bounds.max.y &&
  value.z >= bounds.min.z &&
  value.z <= bounds.max.z

const despawn = (arrow: ArrowBase, reason: 'invalid' | 'lifetime' | 'world' | 'entity-hit'): Arrow => ({
  ...arrow,
  state: 'despawned',
  reason,
})

const earlierHit = (first: CandidateHit | undefined, candidate: CandidateHit): CandidateHit =>
  first === undefined || candidate.fraction < first.fraction ? candidate : first

const firstBlockHit = (arrow: Arrow, end: Position, world: ProjectileWorld): CandidateHit | undefined => {
  let first: CandidateHit | undefined
  for (const block of world.blockBounds(arrow.position, end)) {
    const hit = segmentAABB(arrow.position, end, block)
    if (hit !== null) {
      first = earlierHit(first, { ...hit, kind: 'block' })
    }
  }
  return first
}

const firstEntityHit = (arrow: Arrow, end: Position, world: ProjectileWorld): CandidateHit | undefined => {
  let first: CandidateHit | undefined
  for (const entity of world.entities) {
    const shooterWithinGrace = entity.id === arrow.shooterId && arrow.ageSeconds < ARROW_SHOOTER_GRACE_SECONDS
    if (!shooterWithinGrace) {
      const hit = segmentAABB(arrow.position, end, entity.bounds)
      if (hit !== null) {
        first = earlierHit(first, { ...hit, kind: 'entity', entityId: entity.id })
      }
    }
  }
  return first
}

const firstHit = (arrow: Arrow, end: Position, world: ProjectileWorld): CandidateHit | undefined => {
  const blockHit = firstBlockHit(arrow, end, world)
  const entityHit = firstEntityHit(arrow, end, world)
  if (blockHit === undefined) {
    return entityHit
  }
  if (entityHit === undefined) {
    return blockHit
  }
  return earlierHit(blockHit, entityHit)
}

export const launchArrow = (launch: ArrowLaunch): Arrow => {
  const horizontalSpeed = Math.cos(launch.pitchRadians) * launch.speed
  const velocity = position(
    -Math.sin(launch.yawRadians) * horizontalSpeed,
    -Math.sin(launch.pitchRadians) * launch.speed,
    -Math.cos(launch.yawRadians) * horizontalSpeed,
  )
  const base: ArrowBase = {
    position: launch.position,
    velocity,
    ageSeconds: 0,
    ...(launch.shooterId === undefined ? {} : { shooterId: launch.shooterId }),
  }

  if (
    Number.isFinite(launch.speed) &&
    launch.speed >= 0 &&
    finitePosition(launch.position) &&
    finitePosition(velocity)
  ) {
    return { ...base, state: 'flying' }
  }

  return despawn(base, 'invalid')
}

export const stepArrow = (arrow: Arrow, deltaSeconds: number, world: ProjectileWorld): ProjectileStep => {
  if (arrow.state !== 'flying') {
    return { arrow }
  }

  if (
    !finitePosition(arrow.position) ||
    !finitePosition(arrow.velocity) ||
    !Number.isFinite(arrow.ageSeconds) ||
    arrow.ageSeconds < 0 ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0 ||
    !validBox(world.bounds)
  ) {
    return { arrow: despawn(arrow, 'invalid') }
  }

  const ageSeconds = arrow.ageSeconds + deltaSeconds
  if (!Number.isFinite(ageSeconds)) {
    return { arrow: despawn({ ...arrow, ageSeconds }, 'invalid') }
  }

  if (ageSeconds >= ARROW_MAX_LIFETIME_SECONDS) {
    return { arrow: despawn({ ...arrow, ageSeconds }, 'lifetime') }
  }

  const drag = world.isInWater(arrow.position) ? ARROW_WATER_DRAG : ARROW_AIR_DRAG
  const dragFactor = Math.pow(drag, deltaSeconds * 20)
  const velocity = position(
    arrow.velocity.x * dragFactor,
    (arrow.velocity.y - ARROW_GRAVITY * deltaSeconds) * dragFactor,
    arrow.velocity.z * dragFactor,
  )
  const end = position(
    arrow.position.x + velocity.x * deltaSeconds,
    arrow.position.y + velocity.y * deltaSeconds,
    arrow.position.z + velocity.z * deltaSeconds,
  )

  if (!finitePosition(end)) {
    return { arrow: despawn({ ...arrow, ageSeconds, velocity }, 'invalid') }
  }

  const first = firstHit(arrow, end, world)

  if (first !== undefined) {
    const flightTimeSeconds = arrow.ageSeconds + deltaSeconds * first.fraction
    const base: ArrowBase = {
      ...arrow,
      position: first.point,
      velocity: ZERO_POSITION,
      ageSeconds: flightTimeSeconds,
    }

    if (first.kind === 'block') {
      const hit: ProjectileHit = {
        kind: 'block',
        point: first.point,
        normal: first.normal,
        flightTimeSeconds,
      }
      return {
        arrow: { ...base, state: 'stuck', hit, recoverable: true },
        hit,
      }
    }

    const hit: ProjectileHit = {
      kind: 'entity',
      entityId: first.entityId,
      point: first.point,
      normal: first.normal,
      flightTimeSeconds,
    }
    return {
      arrow: despawn(base, 'entity-hit'),
      hit,
    }
  }

  if (!inside(end, world.bounds)) {
    return { arrow: despawn({ ...arrow, position: end, velocity, ageSeconds }, 'world') }
  }

  return {
    arrow: {
      ...arrow,
      position: end,
      velocity,
      ageSeconds,
      state: 'flying',
    },
  }
}

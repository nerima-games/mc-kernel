import {
  WITHER_ARMOUR_THRESHOLD,
  WITHER_FOLLOW_ACCELERATION,
  WITHER_MAX_HEALTH,
  WITHER_MAX_SPEED,
  WITHER_REGEN_PER_SEC,
  WITHER_SPAWN_CHARGE_SECS,
} from './wither-data.js'
import type {
  BlockCell,
  WitherDamageKind,
  WitherDamageResult,
  WitherDeathDescriptor,
  WitherPhase,
  WitherSkullProjectileDescriptor,
  WitherSkullVariant,
  WitherSnapshot,
  WitherState,
  WitherStep,
  WitherSummonMatch,
  WitherSummonMaterial,
} from './wither-data.js'
import type { Position } from './coordinate-primitives.js'

export {
  WITHER_ARMOUR_THRESHOLD,
  WITHER_FOLLOW_ACCELERATION,
  WITHER_MAX_HEALTH,
  WITHER_MAX_SPEED,
  WITHER_REGEN_PER_SEC,
  WITHER_SPAWN_CHARGE_SECS,
}
export type {
  BlockCell,
  WitherDamageKind,
  WitherDamageResult,
  WitherDeathDescriptor,
  WitherPhase,
  WitherSkullProjectileDescriptor,
  WitherSkullVariant,
  WitherSnapshot,
  WitherState,
  WitherStep,
  WitherSummonMatch,
  WitherSummonMaterial,
} from './wither-data.js'

const finite = (value: number, fallback = 0): number => (Number.isFinite(value) ? value : fallback)
const nonNegative = (value: number): number => Math.max(0, finite(value))
const repairPosition = (value: Position): Position => ({
  x: finite(value.x),
  y: finite(value.y),
  z: finite(value.z),
})

const phaseForHealth = (healthPoints: number): Exclude<WitherPhase, 'charging'> =>
  healthPoints <= 0 ? 'dead' : healthPoints <= WITHER_ARMOUR_THRESHOLD ? 'armoured' : 'airborne'

export const createWither = (feetPosition: Position): WitherState => ({
  phase: 'charging',
  healthPoints: WITHER_MAX_HEALTH,
  chargeRemainingSecs: WITHER_SPAWN_CHARGE_SECS,
  feetPosition: repairPosition(feetPosition),
  velocity: { x: 0, y: 0, z: 0 },
})

const scaledDirection = (from: Position, to: Position, magnitude: number): Position => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  const length = Math.hypot(dx, dy, dz)
  return length === 0
    ? { x: 0, y: 0, z: 0 }
    : { x: (dx / length) * magnitude, y: (dy / length) * magnitude, z: (dz / length) * magnitude }
}

const clampVelocity = (velocity: Position): Position => {
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
  if (speed <= WITHER_MAX_SPEED) return velocity
  const scale = WITHER_MAX_SPEED / speed
  return { x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale }
}

export const stepWither = (
  state: WitherState,
  deltaTimeSecs: number,
  targetPosition?: Position,
): WitherStep => {
  if (state.phase === 'dead') return { state, spawnExplosion: undefined }
  const delta = nonNegative(deltaTimeSecs)

  if (state.phase === 'charging') {
    const chargeRemainingSecs = Math.max(0, state.chargeRemainingSecs - delta)
    if (chargeRemainingSecs > 0) {
      return { state: { ...state, chargeRemainingSecs }, spawnExplosion: undefined }
    }
    const next: WitherState = { ...state, phase: 'airborne', chargeRemainingSecs: 0 }
    return { state: next, spawnExplosion: { power: 7, position: next.feetPosition } }
  }

  const healthPoints = Math.min(WITHER_MAX_HEALTH, state.healthPoints + WITHER_REGEN_PER_SEC * delta)
  const phase = state.phase === 'armoured' ? 'armoured' : phaseForHealth(healthPoints)
  if (targetPosition === undefined || delta === 0) {
    return { state: { ...state, healthPoints, phase }, spawnExplosion: undefined }
  }
  const acceleration = scaledDirection(state.feetPosition, repairPosition(targetPosition), WITHER_FOLLOW_ACCELERATION)
  const velocity = clampVelocity({
    x: state.velocity.x + acceleration.x * delta,
    y: state.velocity.y + acceleration.y * delta,
    z: state.velocity.z + acceleration.z * delta,
  })
  return {
    state: {
      ...state,
      phase,
      healthPoints,
      velocity,
      feetPosition: {
        x: state.feetPosition.x + velocity.x * delta,
        y: state.feetPosition.y + velocity.y * delta,
        z: state.feetPosition.z + velocity.z * delta,
      },
    },
    spawnExplosion: undefined,
  }
}

export const damageWither = (
  state: WitherState,
  amount: number,
  kind: WitherDamageKind,
): WitherDamageResult => {
  const damage = nonNegative(amount)
  const ignored = state.phase === 'dead'
    || state.phase === 'charging'
    || (state.phase === 'armoured' && kind === 'ranged')
  if (ignored || damage === 0) return { state, appliedDamage: 0, ignored, death: undefined }

  const healthPoints = Math.max(0, state.healthPoints - damage)
  const phase = phaseForHealth(healthPoints)
  const next: WitherState = { ...state, healthPoints, phase }
  const death: WitherDeathDescriptor | undefined = phase === 'dead'
    ? {
        despawn: { kind: 'wither', reason: 'killed' },
        drop: { item: 'nether_star', count: 1, position: next.feetPosition },
      }
    : undefined
  return { state: next, appliedDamage: state.healthPoints - healthPoints, ignored: false, death }
}

export const witherSkullProjectile = (
  origin: Position,
  target: Position,
  variant: WitherSkullVariant,
): WitherSkullProjectileDescriptor => ({
  kind: 'wither_skull',
  variant,
  origin: repairPosition(origin),
  direction: scaledDirection(repairPosition(origin), repairPosition(target), 1),
  speed: variant === 'blue' ? 12 : 10,
  explosivePower: 1,
  destroysResistantBlocks: variant === 'blue',
})

type SideVector = readonly [number, number, number]

const sideForAxis = (axis: 'x' | 'z'): SideVector => (axis === 'x' ? [1, 0, 0] : [0, 0, 1])
const summonAxes: ReadonlyArray<'x' | 'z'> = ['x', 'z']
const add = (cell: BlockCell, dx: number, dy: number, dz: number): BlockCell => ({
  x: cell.x + dx,
  y: cell.y + dy,
  z: cell.z + dz,
})

export const matchWitherSummon = (
  base: BlockCell,
  blockAt: (cell: BlockCell) => WitherSummonMaterial | undefined,
): WitherSummonMatch | undefined => {
  for (const axis of summonAxes) {
    const side = sideForAxis(axis)
    const body = [
      base,
      add(base, 0, 1, 0),
      add(base, side[0], 1, side[2]),
      add(base, -side[0], 1, -side[2]),
    ]
    const skulls = [-1, 0, 1].map((offset) => add(base, side[0] * offset, 2, side[2] * offset))
    const bodyMatches = body.every((cell) => blockAt(cell) === 'soul_sand' || blockAt(cell) === 'soul_soil')
    const skullsMatch = skulls.every((cell) => blockAt(cell) === 'wither_skeleton_skull')
    if (bodyMatches && skullsMatch) {
      return {
        axis,
        spawnPosition: { x: base.x + 0.5, y: base.y + 1, z: base.z + 0.5 },
        consumedBlocks: [...body, ...skulls],
      }
    }
  }
  return undefined
}

export const serializeWither = (state: WitherState): WitherSnapshot => ({ kind: 'wither', version: 1, state })

export const restoreWither = (snapshot: WitherSnapshot): WitherState => {
  const healthPoints = Math.min(WITHER_MAX_HEALTH, nonNegative(snapshot.state.healthPoints))
  const chargeRemainingSecs = Math.min(WITHER_SPAWN_CHARGE_SECS, nonNegative(snapshot.state.chargeRemainingSecs))
  const phase = healthPoints <= 0
    ? 'dead'
    : snapshot.state.phase === 'charging' && chargeRemainingSecs > 0
      ? 'charging'
      : snapshot.state.phase === 'armoured' || healthPoints <= WITHER_ARMOUR_THRESHOLD
        ? 'armoured'
        : 'airborne'
  return {
    phase,
    healthPoints,
    chargeRemainingSecs: phase === 'charging' ? chargeRemainingSecs : 0,
    feetPosition: repairPosition(snapshot.state.feetPosition),
    velocity: repairPosition(snapshot.state.velocity),
  }
}

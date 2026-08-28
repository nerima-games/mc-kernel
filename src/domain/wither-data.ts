import type { Position } from './coordinate-primitives.js'

export const WITHER_MAX_HEALTH = 300
export const WITHER_SPAWN_CHARGE_SECS = 10
export const WITHER_ARMOUR_THRESHOLD: number = WITHER_MAX_HEALTH / 2
export const WITHER_REGEN_PER_SEC = 1
export const WITHER_FOLLOW_ACCELERATION = 6
export const WITHER_MAX_SPEED = 5

export type WitherPhase = 'charging' | 'airborne' | 'armoured' | 'dead'
export type WitherSkullVariant = 'normal' | 'blue'
export type WitherDamageKind = 'melee' | 'ranged' | 'magic' | 'explosion' | 'void'

export type WitherState = Readonly<{
  readonly phase: WitherPhase
  readonly healthPoints: number
  readonly chargeRemainingSecs: number
  readonly feetPosition: Position
  readonly velocity: Position
}>

export type WitherSnapshot = Readonly<{
  readonly kind: 'wither'
  readonly version: 1
  readonly state: WitherState
}>

export type WitherSkullProjectileDescriptor = Readonly<{
  readonly kind: 'wither_skull'
  readonly variant: WitherSkullVariant
  readonly origin: Position
  readonly direction: Position
  readonly speed: number
  readonly explosivePower: number
  readonly destroysResistantBlocks: boolean
}>

export type WitherDeathDescriptor = Readonly<{
  readonly despawn: Readonly<{
    readonly kind: 'wither'
    readonly reason: 'killed'
  }>
  readonly drop: Readonly<{
    readonly item: 'nether_star'
    readonly count: 1
    readonly position: Position
  }>
}>

export type WitherSpawnExplosion = Readonly<{
  readonly power: 7
  readonly position: Position
}>

export type WitherStep = Readonly<{
  readonly state: WitherState
  readonly spawnExplosion: WitherSpawnExplosion | undefined
}>

export type WitherDamageResult = Readonly<{
  readonly state: WitherState
  readonly appliedDamage: number
  readonly ignored: boolean
  readonly death: WitherDeathDescriptor | undefined
}>

export type BlockCell = Readonly<{
  readonly x: number
  readonly y: number
  readonly z: number
}>

export type WitherSummonMaterial =
  | 'air'
  | 'soul_sand'
  | 'soul_soil'
  | 'wither_skeleton_skull'
  | string

export type WitherSummonMatch = Readonly<{
  readonly axis: 'x' | 'z'
  readonly spawnPosition: Position
  readonly consumedBlocks: ReadonlyArray<BlockCell>
}>

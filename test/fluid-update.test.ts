import { describe, expect, it } from 'vitest'
import { AIR_BLOCK_ID, type BlockId, blockIdOf } from '../src/domain/block-registry'
import { blockPositionKeyOf } from '../src/domain/coordinate-keys'
import { blockPosition, type BlockPosition } from '../src/domain/coordinate-primitives'
import {
  blockAt,
  emptyBlockWorld,
  setBlockAt,
  type BlockWorld,
} from '../src/domain/block-world'
import {
  FLUID_LEVEL_MIN,
  FLUID_MIX_BLOCK_IDS,
  FLOWING_FLUID_LEVEL,
  SOURCE_FLUID_LEVEL,
  type FlowingFluidKind,
} from '../src/domain/fluid-data'
import {
  type FluidCell,
  emptyFluidState,
  fluidCellAt,
  fluidLevel,
  scheduleFluidAt,
  setFluidCell,
} from '../src/domain/fluid-state'
import {
  canFluidReplace,
  fluidStateFromWorld,
  updateFluids,
} from '../src/domain/fluid-update'

const at = (x: number, y = 0, z = 0): BlockPosition => blockPosition(x, y, z)

const place = (world: BlockWorld, position: BlockPosition, blockId: BlockId): BlockWorld =>
  setBlockAt(world, position, blockId)

const blockedAround = (
  world: BlockWorld,
  source: BlockPosition,
  blockId: BlockId,
): BlockWorld => {
  let next = place(world, at(source.x - 1, source.y, source.z), blockId)
  next = place(next, at(source.x + 1, source.y, source.z), blockId)
  next = place(next, at(source.x, source.y, source.z - 1), blockId)
  next = place(next, at(source.x, source.y, source.z + 1), blockId)
  return next
}

const sourceCell = (kind: FlowingFluidKind): FluidCell => ({
  falling: false,
  kind,
  level: fluidLevel(SOURCE_FLUID_LEVEL),
})

describe('fluid update', () => {
  it('derives scheduled source cells from fluid blocks only', () => {
    const source = at(0)
    const stonePosition = at(1)
    const world = place(
      place(emptyBlockWorld(), source, blockIdOf('water')),
      stonePosition,
      blockIdOf('stone'),
    )

    const state = fluidStateFromWorld(world)

    expect(fluidCellAt(state, source)).toEqual(sourceCell('water'))
    expect(state.scheduled.has(blockPositionKeyOf(source))).toBe(true)
    expect(fluidCellAt(state, stonePosition)).toBeUndefined()
    expect(state.scheduled.has(blockPositionKeyOf(stonePosition))).toBe(false)
  })

  it('flows downward first and records a falling change', () => {
    const source = at(0)
    const below = at(0, -1)
    const water = blockIdOf('water')
    const result = updateFluids(place(emptyBlockWorld(), source, water))

    expect(blockAt(result.world, below)).toBe(water)
    expect(result.changes).toEqual([
      {
        after: water,
        before: AIR_BLOCK_ID,
        falling: true,
        fluid: 'water',
        kind: 'flow',
        level: fluidLevel(SOURCE_FLUID_LEVEL),
        position: below,
      },
    ])
    expect(fluidCellAt(result.state, below)).toEqual({
      falling: true,
      kind: 'water',
      level: fluidLevel(SOURCE_FLUID_LEVEL),
    })
    expect(result.state.scheduled.has(blockPositionKeyOf(below))).toBe(true)
    expect(result.state.scheduled.has(blockPositionKeyOf(source))).toBe(false)
  })

  it('flows horizontally with an attenuated level when downward flow is blocked', () => {
    const source = at(0)
    const stone = blockIdOf('stone')
    const water = blockIdOf('water')
    const world = place(
      place(emptyBlockWorld(), source, water),
      at(0, -1),
      stone,
    )
    const result = updateFluids(world)
    const neighbours = [at(-1), at(1), at(0, 0, -1), at(0, 0, 1)]

    expect(result.changes).toHaveLength(neighbours.length)
    for (const neighbour of neighbours) {
      expect(blockAt(result.world, neighbour)).toBe(water)
      expect(fluidCellAt(result.state, neighbour)).toEqual({
        falling: false,
        kind: 'water',
        level: fluidLevel(FLOWING_FLUID_LEVEL),
      })
      expect(result.state.scheduled.has(blockPositionKeyOf(neighbour))).toBe(true)
    }
  })

  it('stops horizontal flow at the minimum level', () => {
    const source = at(0)
    const stone = blockIdOf('stone')
    let world = place(emptyBlockWorld(), source, blockIdOf('water'))
    world = place(world, at(0, -1), stone)
    world = blockedAround(world, source, stone)
    let state = setFluidCell(emptyFluidState(), source, {
      falling: false,
      kind: 'water',
      level: fluidLevel(FLUID_LEVEL_MIN),
    })
    state = scheduleFluidAt(state, source)

    const result = updateFluids(world, state)

    expect(result.changes).toEqual([])
    expect(result.state.scheduled.size).toBe(0)
    expect(fluidCellAt(result.state, source)?.level).toBe(fluidLevel(FLUID_LEVEL_MIN))
  })

  it('respects replacement capabilities and water-only destruction', () => {
    const air = AIR_BLOCK_ID
    const stone = blockIdOf('stone')
    const torch = blockIdOf('torch')
    const water = blockIdOf('water')
    expect(canFluidReplace(air, 'lava')).toBe(true)
    expect(canFluidReplace(water, 'lava')).toBe(true)
    expect(canFluidReplace(torch, 'water')).toBe(true)
    expect(canFluidReplace(torch, 'lava')).toBe(false)
    expect(canFluidReplace(stone, 'water')).toBe(false)

    const source = at(0)
    const torchPosition = at(1)
    let world = place(emptyBlockWorld(), source, water)
    world = place(world, at(0, -1), stone)
    world = blockedAround(world, source, stone)
    world = place(world, torchPosition, torch)
    const result = updateFluids(world)

    expect(blockAt(result.world, torchPosition)).toBe(water)
    expect(result.changes).toContainEqual({
      after: water,
      before: torch,
      falling: false,
      fluid: 'water',
      kind: 'flow',
      level: fluidLevel(FLOWING_FLUID_LEVEL),
      position: torchPosition,
    })

    let lavaWorld = place(emptyBlockWorld(), source, blockIdOf('lava'))
    lavaWorld = place(lavaWorld, at(0, -1), stone)
    lavaWorld = blockedAround(lavaWorld, source, stone)
    lavaWorld = place(lavaWorld, torchPosition, torch)
    expect(updateFluids(lavaWorld).changes).toEqual([])
  })

  it('mixes source fluids into obsidian and flowing fluids into cobblestone', () => {
    const source = at(0)
    const target = at(1)
    const stone = blockIdOf('stone')
    let world = place(emptyBlockWorld(), source, blockIdOf('water'))
    world = place(world, at(0, -1), stone)
    world = blockedAround(world, source, stone)
    world = place(world, target, blockIdOf('lava'))
    const sourceMix = updateFluids(world)

    expect(blockAt(sourceMix.world, target)).toBe(FLUID_MIX_BLOCK_IDS.obsidian)
    expect(sourceMix.changes).toContainEqual({
      after: FLUID_MIX_BLOCK_IDS.obsidian,
      before: blockIdOf('lava'),
      falling: false,
      fluid: 'water',
      kind: 'mix',
      level: fluidLevel(SOURCE_FLUID_LEVEL),
      position: target,
    })

    let flowingState = setFluidCell(emptyFluidState(), source, sourceCell('water'))
    flowingState = scheduleFluidAt(flowingState, source)
    flowingState = setFluidCell(flowingState, target, {
      falling: true,
      kind: 'lava',
      level: fluidLevel(FLOWING_FLUID_LEVEL),
    })
    let flowingWorld = place(emptyBlockWorld(), source, blockIdOf('water'))
    flowingWorld = place(flowingWorld, at(0, -1), stone)
    flowingWorld = blockedAround(flowingWorld, source, stone)
    flowingWorld = place(flowingWorld, target, blockIdOf('lava'))
    const flowingMix = updateFluids(flowingWorld, flowingState)

    expect(blockAt(flowingMix.world, target)).toBe(FLUID_MIX_BLOCK_IDS.cobblestone)
    expect(fluidCellAt(flowingMix.state, target)).toBeUndefined()
  })

  it('mixes a fluid below the source and ignores same-kind neighbours', () => {
    const source = at(0)
    const below = at(0, -1)
    const right = at(1)
    let world = place(emptyBlockWorld(), source, blockIdOf('water'))
    world = place(world, below, blockIdOf('lava'))
    world = place(world, right, blockIdOf('water'))
    const result = updateFluids(world)

    expect(blockAt(result.world, below)).toBe(FLUID_MIX_BLOCK_IDS.obsidian)
    expect(blockAt(result.world, right)).toBe(blockIdOf('water'))
    expect(result.changes.filter(({ kind }) => kind === 'mix')).toHaveLength(1)
  })

  it('derives an absent target fluid cell while mixing', () => {
    const source = at(0)
    const below = at(0, -1)
    const world = place(
      place(emptyBlockWorld(), source, blockIdOf('water')),
      below,
      blockIdOf('lava'),
    )
    let state = setFluidCell(emptyFluidState(), source, sourceCell('water'))
    state = scheduleFluidAt(state, source)

    const result = updateFluids(world, state)

    expect(blockAt(result.world, below)).toBe(FLUID_MIX_BLOCK_IDS.obsidian)
  })

  it('clears stale schedules and does not replace a stronger existing flow', () => {
    const stalePosition = at(-3)
    let staleState = setFluidCell(emptyFluidState(), stalePosition, sourceCell('water'))
    staleState = scheduleFluidAt(staleState, stalePosition)
    const stale = updateFluids(
      place(emptyBlockWorld(), stalePosition, blockIdOf('stone')),
      staleState,
    )
    expect(fluidCellAt(stale.state, stalePosition)).toBeUndefined()
    expect(stale.state.scheduled.has(blockPositionKeyOf(stalePosition))).toBe(false)

    const source = at(0)
    const target = at(1)
    const stone = blockIdOf('stone')
    let world = place(emptyBlockWorld(), source, blockIdOf('water'))
    world = place(world, at(0, -1), stone)
    world = blockedAround(world, source, stone)
    let state = setFluidCell(emptyFluidState(), source, sourceCell('water'))
    state = setFluidCell(state, target, {
      falling: false,
      kind: 'water',
      level: fluidLevel(SOURCE_FLUID_LEVEL),
    })
    state = scheduleFluidAt(state, source)

    const result = updateFluids(world, state)

    expect(result.changes).toEqual([])
    expect(blockAt(result.world, target)).toBe(stone)
    expect(fluidCellAt(result.state, target)?.level).toBe(fluidLevel(SOURCE_FLUID_LEVEL))

    const weakTarget = target
    let weakWorld = place(emptyBlockWorld(), source, blockIdOf('water'))
    weakWorld = place(weakWorld, at(0, -1), stone)
    weakWorld = blockedAround(weakWorld, source, stone)
    weakWorld = place(weakWorld, weakTarget, blockIdOf('torch'))
    let weakState = setFluidCell(emptyFluidState(), source, sourceCell('water'))
    weakState = setFluidCell(weakState, weakTarget, {
      falling: false,
      kind: 'water',
      level: fluidLevel(FLUID_LEVEL_MIN),
    })
    weakState = scheduleFluidAt(weakState, source)

    const weakened = updateFluids(weakWorld, weakState)

    expect(blockAt(weakened.world, weakTarget)).toBe(blockIdOf('water'))
    expect(fluidCellAt(weakened.state, weakTarget)?.level).toBe(
      fluidLevel(FLOWING_FLUID_LEVEL),
    )
  })
})

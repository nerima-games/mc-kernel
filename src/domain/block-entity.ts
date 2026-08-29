/**
 * Public block-entity boundary: the value vocabulary, its runtime
 * validation, and a position-keyed collection with pure lookup/update
 * helpers.
 *
 * The collection matches the shape `./fluid-state` and `./redstone-state`
 * already use for per-cell state: an object wrapping a `ReadonlyMap` keyed
 * by `BlockPositionKey`, with `empty*` / `*At` / `set*` / `clear*` helpers.
 */
export * from './block-entity-data.js'
export * from './block-entity-validation.js'

import type { BlockEntity } from './block-entity-data.js'
import { blockPositionKeyOf, type BlockPosition, type BlockPositionKey } from './coordinates.js'

/** Every block entity in a world, keyed by its position. */
export type BlockEntities = Readonly<{
  entities: ReadonlyMap<BlockPositionKey, BlockEntity>
}>

export const emptyBlockEntities = (): BlockEntities => ({ entities: new Map() })

export const blockEntityAt = (state: BlockEntities, position: BlockPosition): BlockEntity | undefined =>
  state.entities.get(blockPositionKeyOf(position))

export const setBlockEntity = (state: BlockEntities, entity: BlockEntity): BlockEntities => {
  const entities = new Map(state.entities)
  entities.set(blockPositionKeyOf(entity.position), entity)
  return { ...state, entities }
}

export const clearBlockEntity = (state: BlockEntities, position: BlockPosition): BlockEntities => {
  const key = blockPositionKeyOf(position)
  if (!state.entities.has(key)) {
    return state
  }
  const entities = new Map(state.entities)
  entities.delete(key)
  return { ...state, entities }
}

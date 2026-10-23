import { Option } from 'effect'
import { blockIdOf, type BlockId } from './block-registry.js'

export const REDSTONE_POWER_MIN = 0
export const REDSTONE_POWER_MAX = 15
export const REDSTONE_POWER_STEP = 1

export const REDSTONE_BLOCK_IDS: Readonly<{
  readonly block: Option.Option<BlockId>
  readonly comparator: Option.Option<BlockId>
  readonly lamp: Option.Option<BlockId>
  readonly lampLit: Option.Option<BlockId>
  readonly lever: Option.Option<BlockId>
  readonly observer: Option.Option<BlockId>
  readonly pressurePlate: Option.Option<BlockId>
  readonly repeater: Option.Option<BlockId>
  readonly stoneButton: Option.Option<BlockId>
  readonly torch: Option.Option<BlockId>
  readonly wire: Option.Option<BlockId>
}> = {
  block: blockIdOf('redstone_block'),
  comparator: blockIdOf('comparator'),
  lamp: blockIdOf('redstone_lamp'),
  lampLit: blockIdOf('redstone_lamp_lit'),
  lever: blockIdOf('lever'),
  observer: blockIdOf('observer'),
  pressurePlate: blockIdOf('pressure_plate'),
  repeater: blockIdOf('repeater'),
  stoneButton: blockIdOf('stone_button'),
  torch: blockIdOf('redstone_torch'),
  wire: blockIdOf('redstone_wire'),
}

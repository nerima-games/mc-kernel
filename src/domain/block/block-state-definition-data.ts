import type { BlockType } from './block-type.js'
import type {
  BlockStateAxis,
  BlockStateConnectionValue,
  BlockStateDirection,
  BlockStateFace,
  BlockStateFacing,
  BlockStateHalf,
  BlockStateHinge,
  BlockStateMode,
  BlockStatePart,
  BlockStateShape,
  BlockStateType,
} from './block-state-values.js'

export type BlockStateSlotDefinition =
  | { readonly property: 'facing'; readonly values: readonly BlockStateFacing[] }
  | { readonly property: 'half'; readonly values: readonly BlockStateHalf[] }
  | { readonly property: 'hinge'; readonly values: readonly BlockStateHinge[] }
  | { readonly property: 'axis'; readonly values: readonly BlockStateAxis[] }
  | { readonly property: 'face'; readonly values: readonly BlockStateFace[] }
  | { readonly property: 'shape'; readonly values: readonly BlockStateShape[] }
  | { readonly property: 'mode'; readonly values: readonly BlockStateMode[] }
  | { readonly property: 'part'; readonly values: readonly BlockStatePart[] }
  | { readonly property: 'type'; readonly values: readonly BlockStateType[] }
  | { readonly property: 'open' | 'powered' | 'enabled' | 'extended' | 'lit' | 'locked' | 'occupied' | 'persistent' | 'short' | 'snowy' | 'triggered' | 'unstable' | 'waterlogged' | 'has_bottle_0' | 'has_bottle_1' | 'has_bottle_2'; readonly values: readonly boolean[] }
  | { readonly property: 'age' | 'level' | 'delay' | 'distance' | 'layers' | 'moisture' | 'power' | 'rotation' | 'stage'; readonly values: readonly number[] }
  | { readonly property: 'connections'; readonly direction: BlockStateDirection; readonly values: readonly BlockStateConnectionValue[] }

export type BlockStateDefinitionData = {
  readonly blockType: BlockType
  readonly slots: readonly BlockStateSlotDefinition[]
}

const immutableValues = <Value>(values: readonly Value[]): readonly Value[] => Object.freeze([...values])

const facing = (values: readonly BlockStateFacing[]): BlockStateSlotDefinition => ({
  property: 'facing',
  values: immutableValues(values),
})
const half = (values: readonly BlockStateHalf[]): BlockStateSlotDefinition => ({
  property: 'half',
  values: immutableValues(values),
})
const hinge = (values: readonly BlockStateHinge[]): BlockStateSlotDefinition => ({
  property: 'hinge',
  values: immutableValues(values),
})
const axis = (values: readonly BlockStateAxis[]): BlockStateSlotDefinition => ({
  property: 'axis',
  values: immutableValues(values),
})
const face = (values: readonly BlockStateFace[]): BlockStateSlotDefinition => ({
  property: 'face',
  values: immutableValues(values),
})
const shape = (values: readonly BlockStateShape[]): BlockStateSlotDefinition => ({
  property: 'shape',
  values: immutableValues(values),
})
const mode = (values: readonly BlockStateMode[]): BlockStateSlotDefinition => ({
  property: 'mode',
  values: immutableValues(values),
})
const part = (values: readonly BlockStatePart[]): BlockStateSlotDefinition => ({
  property: 'part',
  values: immutableValues(values),
})
const type = (values: readonly BlockStateType[]): BlockStateSlotDefinition => ({
  property: 'type',
  values: immutableValues(values),
})

type BooleanProperty = BlockStateSlotDefinition & { readonly values: readonly boolean[] }
const booleanProperty = (
  property: Extract<BlockStateSlotDefinition, { readonly values: readonly boolean[] }>['property'],
  defaultValue = false,
): BooleanProperty => ({
  property,
  values: immutableValues(defaultValue ? [true, false] : [false, true]),
})

type IntegerProperty = BlockStateSlotDefinition & { readonly values: readonly number[] }
const integerProperty = (
  property: Extract<BlockStateSlotDefinition, { readonly values: readonly number[] }>['property'],
  minimum: number,
  maximum: number,
  defaultValue: number,
): IntegerProperty => ({
  property,
  values: immutableValues([defaultValue, ...Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index).filter((value) => value !== defaultValue)]),
})

const connection = (
  direction: BlockStateDirection,
  values: readonly BlockStateConnectionValue[],
): BlockStateSlotDefinition => ({
  property: 'connections',
  direction,
  values: immutableValues(values),
})

export const BLOCK_STATE_DEFINITION_DATA: readonly BlockStateDefinitionData[] = [
  { blockType: 'grass_block', slots: [
    booleanProperty('snowy', false),
  ] },
  { blockType: 'water', slots: [
    integerProperty('level', 0, 15, 0),
  ] },
  { blockType: 'lava', slots: [
    integerProperty('level', 0, 15, 0),
  ] },
  { blockType: 'oak_log', slots: [
    axis(["y", "x", "z"]),
  ] },
  { blockType: 'oak_leaves', slots: [
    integerProperty('distance', 1, 7, 7),
    booleanProperty('persistent', false),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'piston', slots: [
    facing(["north", "east", "south", "west", "up", "down"]),
    booleanProperty('extended', false),
  ] },
  { blockType: 'snow', slots: [
    integerProperty('layers', 1, 8, 1),
  ] },
  { blockType: 'ladder', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'sapling', slots: [
    integerProperty('stage', 0, 1, 0),
  ] },
  { blockType: 'tall_grass', slots: [
    half(["lower", "upper"]),
  ] },
  { blockType: 'sugar_cane', slots: [
    integerProperty('age', 0, 15, 0),
  ] },
  { blockType: 'kelp', slots: [
    integerProperty('age', 0, 25, 0),
  ] },
  { blockType: 'rail', slots: [
    shape(["north_south", "east_west", "ascending_east", "ascending_west", "ascending_north", "ascending_south", "south_east", "south_west", "north_west", "north_east"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'powered_rail', slots: [
    booleanProperty('powered', false),
    shape(["north_south", "east_west", "ascending_east", "ascending_west", "ascending_north", "ascending_south"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'cactus', slots: [
    integerProperty('age', 0, 15, 0),
  ] },
  { blockType: 'pressure_plate', slots: [
    booleanProperty('powered', false),
  ] },
  { blockType: 'stone_slab', slots: [
    type(["bottom", "top", "double"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'deepslate', slots: [
    axis(["y", "x", "z"]),
  ] },
  { blockType: 'amethyst_cluster', slots: [
    facing(["up", "north", "east", "south", "west", "down"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'farmland', slots: [
    integerProperty('moisture', 0, 7, 0),
  ] },
  { blockType: 'redstone_ore', slots: [
    booleanProperty('lit', false),
  ] },
  { blockType: 'deepslate_redstone_ore', slots: [
    booleanProperty('lit', false),
  ] },
  { blockType: 'wheat_crop', slots: [
    integerProperty('age', 0, 7, 0),
  ] },
  { blockType: 'potato_crop', slots: [
    integerProperty('age', 0, 7, 0),
  ] },
  { blockType: 'nether_wart_crop', slots: [
    integerProperty('age', 0, 3, 0),
  ] },
  { blockType: 'redstone_wire', slots: [
    connection('north', ["none", "up", "side"]),
    connection('east', ["none", "up", "side"]),
    connection('south', ["none", "up", "side"]),
    connection('west', ["none", "up", "side"]),
    integerProperty('power', 0, 15, 0),
  ] },
  { blockType: 'redstone_torch', slots: [
    booleanProperty('lit', true),
  ] },
  { blockType: 'lever', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('powered', false),
    face(["wall", "floor", "ceiling"]),
  ] },
  { blockType: 'stone_button', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('powered', false),
    face(["wall", "floor", "ceiling"]),
  ] },
  { blockType: 'repeater', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('powered', false),
    integerProperty('delay', 1, 4, 1),
    booleanProperty('locked', false),
  ] },
  { blockType: 'observer', slots: [
    facing(["south", "north", "east", "west", "up", "down"]),
    booleanProperty('powered', false),
  ] },
  { blockType: 'comparator', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('powered', false),
    mode(["compare", "subtract"]),
  ] },
  { blockType: 'dispenser', slots: [
    facing(["north", "east", "south", "west", "up", "down"]),
    booleanProperty('triggered', false),
  ] },
  { blockType: 'dropper', slots: [
    facing(["north", "east", "south", "west", "up", "down"]),
    booleanProperty('triggered', false),
  ] },
  { blockType: 'hopper', slots: [
    facing(["down", "north", "south", "west", "east"]),
    booleanProperty('enabled', true),
  ] },
  { blockType: 'piston_head', slots: [
    facing(["north", "east", "south", "west", "up", "down"]),
    booleanProperty('short', false),
    type(["normal", "sticky"]),
  ] },
  { blockType: 'end_portal_frame', slots: [
    facing(["north", "south", "west", "east"]),
  ] },
  { blockType: 'end_portal_frame_filled', slots: [
    facing(["north", "south", "west", "east"]),
  ] },
  { blockType: 'chorus_flower', slots: [
    integerProperty('age', 0, 5, 0),
  ] },
  { blockType: 'chorus_plant', slots: [
    connection('down', [false, true]),
    connection('north', [false, true]),
    connection('east', [false, true]),
    connection('south', [false, true]),
    connection('west', [false, true]),
    connection('up', [false, true]),
  ] },
  { blockType: 'end_rod', slots: [
    facing(["up", "north", "east", "south", "west", "down"]),
  ] },
  { blockType: 'ender_chest', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'purpur_pillar', slots: [
    axis(["y", "x", "z"]),
  ] },
  { blockType: 'purpur_slab', slots: [
    type(["bottom", "top", "double"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'purpur_stairs', slots: [
    facing(["north", "south", "west", "east"]),
    half(["bottom", "top"]),
    shape(["straight", "inner_left", "inner_right", "outer_left", "outer_right"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'shulker_box', slots: [
    facing(["up", "north", "east", "south", "west", "down"]),
  ] },
  { blockType: 'furnace', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('lit', false),
  ] },
  { blockType: 'chest', slots: [
    facing(["north", "south", "west", "east"]),
    type(["single", "left", "right"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'door', slots: [
    facing(["north", "south", "west", "east"]),
    half(["lower", "upper"]),
    hinge(["left", "right"]),
    booleanProperty('open', false),
    booleanProperty('powered', false),
  ] },
  { blockType: 'door_open', slots: [
    facing(["north", "south", "west", "east"]),
    half(["lower", "upper"]),
    hinge(["left", "right"]),
    booleanProperty('powered', false),
  ] },
  { blockType: 'oak_stairs', slots: [
    facing(["north", "south", "west", "east"]),
    half(["bottom", "top"]),
    shape(["straight", "inner_left", "inner_right", "outer_left", "outer_right"]),
    booleanProperty('waterlogged', false),
  ] },
  { blockType: 'anvil', slots: [
    facing(["north", "south", "west", "east"]),
  ] },
  { blockType: 'water_cauldron', slots: [
    integerProperty('level', 1, 3, 1),
  ] },
  { blockType: 'bed', slots: [
    facing(["north", "south", "west", "east"]),
    booleanProperty('occupied', false),
    part(["foot", "head"]),
  ] },
  { blockType: 'brewing_stand', slots: [
    booleanProperty('has_bottle_0', false),
    booleanProperty('has_bottle_1', false),
    booleanProperty('has_bottle_2', false),
  ] },
  { blockType: 'tnt', slots: [
    booleanProperty('unstable', false),
  ] },
  { blockType: 'nether_portal', slots: [
    axis(["x", "z"]),
  ] },
  { blockType: 'fire', slots: [
    integerProperty('age', 0, 15, 0),
    connection('north', [false, true]),
    connection('east', [false, true]),
    connection('south', [false, true]),
    connection('west', [false, true]),
    connection('up', [false, true]),
  ] },
  { blockType: 'wither_skeleton_skull', slots: [
    booleanProperty('powered', false),
    integerProperty('rotation', 0, 15, 0),
  ] },
]

import type { ItemType } from './item-type.js'

export type FoodStatusEffectName =
  | 'absorption'
  | 'fire_resistance'
  | 'hunger'
  | 'nausea'
  | 'poison'
  | 'regeneration'
  | 'resistance'

export type FoodStatusEffect = Readonly<{
  readonly kind: 'status'
  readonly name: FoodStatusEffectName
  readonly chance: number
  readonly durationSecs: number
  readonly amplifier: number
}>

export type FoodRemoveEffect = Readonly<{
  readonly kind: 'remove'
  readonly name: 'poison'
  readonly chance: number
}>

export type FoodTeleportEffect = Readonly<{
  readonly kind: 'teleport'
  readonly chance: number
}>

export type FoodEffect = FoodStatusEffect | FoodRemoveEffect | FoodTeleportEffect

export type FoodDefinition = Readonly<{
  readonly item: ItemType
  readonly nutrition: number
  readonly saturation: number
  readonly canAlwaysEat: boolean
  readonly useRemainder: ItemType | undefined
  readonly effects: ReadonlyArray<FoodEffect>
}>

export const VANILLA_FOOD_DEFINITIONS: ReadonlyArray<FoodDefinition> = [
  {
    item: 'cod',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'salmon',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'tropical_fish',
    nutrition: 1,
    saturation: 0.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'pufferfish',
    nutrition: 1,
    saturation: 0.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [
      { kind: 'status', name: 'poison', chance: 1, durationSecs: 60, amplifier: 1 },
      { kind: 'status', name: 'nausea', chance: 1, durationSecs: 15, amplifier: 1 },
      { kind: 'status', name: 'hunger', chance: 1, durationSecs: 15, amplifier: 2 },
    ],
  },
  {
    item: 'potato',
    nutrition: 1,
    saturation: 0.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'rotten_flesh',
    nutrition: 4,
    saturation: 0.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'hunger', chance: 0.8, durationSecs: 30, amplifier: 0 }],
  },
  {
    item: 'spider_eye',
    nutrition: 2,
    saturation: 3.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'poison', chance: 1, durationSecs: 5, amplifier: 0 }],
  },
  {
    item: 'apple',
    nutrition: 4,
    saturation: 2.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'baked_potato',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'beef',
    nutrition: 3,
    saturation: 1.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'beetroot',
    nutrition: 1,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'beetroot_soup',
    nutrition: 6,
    saturation: 7.2,
    canAlwaysEat: false,
    useRemainder: 'bowl',
    effects: [],
  },
  {
    item: 'bread',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'carrot',
    nutrition: 3,
    saturation: 3.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'chicken',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'hunger', chance: 0.3, durationSecs: 30, amplifier: 0 }],
  },
  {
    item: 'chorus_fruit',
    nutrition: 4,
    saturation: 2.4,
    canAlwaysEat: true,
    useRemainder: undefined,
    effects: [{ kind: 'teleport', chance: 1 }],
  },
  {
    item: 'cooked_beef',
    nutrition: 8,
    saturation: 12.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_chicken',
    nutrition: 6,
    saturation: 7.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_cod',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_mutton',
    nutrition: 6,
    saturation: 9.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_porkchop',
    nutrition: 8,
    saturation: 12.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_rabbit',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_salmon',
    nutrition: 6,
    saturation: 9.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cookie',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'dried_kelp',
    nutrition: 1,
    saturation: 0.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'enchanted_golden_apple',
    nutrition: 4,
    saturation: 9.6,
    canAlwaysEat: true,
    useRemainder: undefined,
    effects: [
      { kind: 'status', name: 'regeneration', chance: 1, durationSecs: 20, amplifier: 1 },
      { kind: 'status', name: 'absorption', chance: 1, durationSecs: 120, amplifier: 3 },
      { kind: 'status', name: 'fire_resistance', chance: 1, durationSecs: 300, amplifier: 0 },
      { kind: 'status', name: 'resistance', chance: 1, durationSecs: 300, amplifier: 0 },
    ],
  },
  {
    item: 'glow_berries',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'golden_apple',
    nutrition: 4,
    saturation: 9.6,
    canAlwaysEat: true,
    useRemainder: undefined,
    effects: [
      { kind: 'status', name: 'regeneration', chance: 1, durationSecs: 5, amplifier: 1 },
      { kind: 'status', name: 'absorption', chance: 1, durationSecs: 120, amplifier: 0 },
    ],
  },
  {
    item: 'golden_carrot',
    nutrition: 6,
    saturation: 14.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'honey_bottle',
    nutrition: 6,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: 'glass_bottle',
    effects: [{ kind: 'remove', name: 'poison', chance: 1 }],
  },
  {
    item: 'melon_slice',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'mushroom_stew',
    nutrition: 6,
    saturation: 7.2,
    canAlwaysEat: false,
    useRemainder: 'bowl',
    effects: [],
  },
  {
    item: 'mutton',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'poisonous_potato',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'poison', chance: 0.6, durationSecs: 5, amplifier: 0 }],
  },
  {
    item: 'porkchop',
    nutrition: 3,
    saturation: 1.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'pumpkin_pie',
    nutrition: 8,
    saturation: 4.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'rabbit',
    nutrition: 3,
    saturation: 1.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'rabbit_stew',
    nutrition: 10,
    saturation: 12,
    canAlwaysEat: false,
    useRemainder: 'bowl',
    effects: [],
  },
  {
    item: 'sweet_berries',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
] as const satisfies ReadonlyArray<FoodDefinition>

export const FOOD_DEFINITION_BY_ITEM: ReadonlyMap<ItemType, FoodDefinition> = new Map(
  VANILLA_FOOD_DEFINITIONS.map(
    (definition): [ItemType, FoodDefinition] => [definition.item, definition],
  ),
)

export const foodDefinitionOf = (item: ItemType): FoodDefinition | undefined =>
  FOOD_DEFINITION_BY_ITEM.get(item)

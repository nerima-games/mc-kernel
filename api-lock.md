# API lock — @nerima-games/mc-kernel

<!-- ------------------------------------------------------------------------- -->
<!-- GENERATED FILE. Do not edit by hand.                                      -->
<!--                                                                           -->
<!-- Regenerate with `pnpm api:update`. `pnpm api:check`, which `pnpm verify`  -->
<!-- runs, fails when this file is stale.                                      -->
<!--                                                                           -->
<!-- Every line below is part of the published surface of this package. A diff -->
<!-- here is a diff in what consumers can see, and is the thing plan.md §6     -->
<!-- Step 0-3 asks to be reviewed as a diff. See scripts/api-lock.ts for how   -->
<!-- it is produced and why it is produced this way.                           -->
<!-- ------------------------------------------------------------------------- -->

format: 1
exported declarations: 140
supporting declarations: 1

## Exported

### AABB  `type`

```ts
type AABB = {
    readonly min: Position;
    readonly max: Position;
};
```

### AIR_BLOCK_ID  `const`

```ts
const AIR_BLOCK_ID: BlockId;
```

### AUDITED_CAPABILITY_NAMES  `const`

```ts
const AUDITED_CAPABILITY_NAMES: ReadonlyArray<string>;
```

### BARE_HANDED  `const`

```ts
const BARE_HANDED: HarvestContext;
```

### BLOCK_CAPABILITY_DEFAULTS  `const`

```ts
const BLOCK_CAPABILITY_DEFAULTS: {
    readonly passable: false;
    readonly fallsWhenUnsupported: false;
    readonly replaceable: false;
    readonly flammable: false;
    readonly fireSource: false;
    readonly pistonImmovable: false;
    readonly brokenByWaterFlow: false;
    readonly climbable: false;
    readonly suffocates: true;
    readonly canSupportAttachments: true;
    readonly validSpawnSurface: true;
};
```

### BLOCK_CAPABILITY_FLAGS  `const`

```ts
const BLOCK_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag>;
```

### BLOCK_IDS  `const`

```ts
const BLOCK_IDS: ReadonlyArray<BlockId>;
```

### BLOCK_ID_MAX  `const`

```ts
const BLOCK_ID_MAX = 255;
```

### BLOCK_OPACITIES  `const`

```ts
const BLOCK_OPACITIES: readonly ["transparentSolid", "fluid", "opaque"];
```

### BLOCK_PROPERTY_DEFAULTS  `const`

```ts
const BLOCK_PROPERTY_DEFAULTS: BlockProperties;
```

### BLOCK_PROPERTY_NAMES  `const`

```ts
const BLOCK_PROPERTY_NAMES: ReadonlyArray<BlockPropertyName>;
```

### BLOCK_REGISTRY  `const`

```ts
const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry>;
```

### BLOCK_TYPES  `const`

```ts
const BLOCK_TYPES: readonly ["air", "stone", "cobblestone", "dirt", "grass_block", "sand", "gravel", "water", "lava", "oak_log", "oak_planks", "oak_leaves", "glass", "torch", "glowstone", "bedrock", "piston", "snow", "ladder", "cobweb", "sapling", "dandelion", "poppy", "brown_mushroom", "red_mushroom", "tall_grass", "fern", "sugar_cane", "lily_pad", "kelp", "seagrass", "rail", "powered_rail", "cactus", "pressure_plate", "stone_slab", "granite", "diorite", "andesite", "deepslate", "obsidian", "smooth_basalt", "calcite", "amethyst_block", "amethyst_cluster", "sandstone", "prismarine", "soul_sand", "ice", "farmland", "coal_ore", "iron_ore", "gold_ore", "diamond_ore", "redstone_ore", "lapis_ore", "emerald_ore", "deepslate_coal_ore", "deepslate_iron_ore", "deepslate_gold_ore", "deepslate_diamond_ore", "deepslate_redstone_ore", "deepslate_lapis_ore", "deepslate_emerald_ore", "coal_block", "iron_block", "gold_block", "diamond_block", "redstone_block", "lapis_block", "emerald_block", "wheat_crop", "potato_crop", "nether_wart_crop", "redstone_wire", "redstone_torch", "lever", "stone_button", "repeater", "redstone_lamp", "redstone_lamp_lit", "observer", "comparator", "dispenser", "hopper", "piston_head", "end_stone", "end_portal_frame", "end_portal_frame_filled", "end_portal", "chorus_flower", "chorus_plant", "dragon_egg", "end_crystal", "end_gateway", "end_rod", "end_stone_bricks", "ender_chest", "purpur_block", "purpur_pillar", "purpur_slab", "purpur_stairs", "shulker_box", "crafting_table", "furnace", "chest", "door", "door_open", "oak_stairs", "anvil", "cauldron", "water_cauldron", "bed", "enchanting_table", "brewing_stand", "tnt", "nether_brick", "netherrack", "nether_portal", "fire"];
```

### BlockAxis  `const`

```ts
const BlockAxis: Brand.Brand.Constructor<BlockAxis>;
```

### BlockAxis  `type`

```ts
type BlockAxis = number & Brand.Brand<'BlockAxis'>;
```

### BlockCapabilities  `type`

```ts
type BlockCapabilities = {
    readonly [K in BlockCapabilityFlag]: boolean;
};
```

### BlockCapabilityFlag  `type`

```ts
type BlockCapabilityFlag = keyof typeof BLOCK_CAPABILITY_DEFAULTS;
```

### BlockCapabilityOverrides  `type`

```ts
type BlockCapabilityOverrides = {
    readonly [K in BlockCapabilityFlag]?: boolean;
};
```

### BlockDefinition  `type`

```ts
type BlockDefinition = {
    readonly type: BlockType;
    readonly capabilities?: BlockCapabilityOverrides;
    readonly properties?: BlockPropertyOverrides;
};
```

### BlockDrop  `type`

```ts
type BlockDrop = {
    readonly item: ItemType;
    readonly count: number;
    readonly affectedByFortune: boolean;
};
```

### BlockDropRule  `type`

```ts
type BlockDropRule = {
    readonly item: ItemType | 'self';
    readonly count: number;
    readonly requiresSilkTouch: boolean;
    readonly affectedByFortune: boolean;
};
```

### BlockId  `const`

```ts
const BlockId: Brand.Brand.Constructor<BlockId>;
```

### BlockId  `type`

```ts
type BlockId = number & Brand.Brand<'BlockId'>;
```

### BlockOpacity  `type`

```ts
type BlockOpacity = (typeof BLOCK_OPACITIES)[number];
```

### BlockPosition  `type`

```ts
type BlockPosition = {
    readonly x: BlockAxis;
    readonly y: BlockAxis;
    readonly z: BlockAxis;
};
```

### BlockProperties  `type`

```ts
type BlockProperties = {
    readonly opacity: BlockOpacity;
    readonly lightEmission: number;
    readonly fluid: FluidKind;
    readonly collisionShape: CollisionShape;
    readonly renderKind: RenderKind;
    readonly hardness: number;
    readonly friction: number;
    readonly contactDamage: number;
    readonly movementDrag: number;
    readonly xpOnBreak: number;
    readonly railKind: RailKind;
    readonly harvestTool: HarvestToolRequirement;
    readonly drops: BlockDropRule;
    readonly supportRule: SupportRule;
};
```

### BlockPropertyName  `type`

```ts
type BlockPropertyName = keyof BlockProperties;
```

### BlockPropertyOverrides  `type`

```ts
type BlockPropertyOverrides = {
    readonly [K in BlockPropertyName]?: BlockProperties[K];
};
```

### BlockRegistryEntry  `type`

```ts
type BlockRegistryEntry = {
    readonly id: BlockId;
    readonly definition: BlockDefinition;
};
```

### BlockType  `type`

```ts
type BlockType = (typeof BLOCK_TYPES)[number];
```

### CHUNK_SIZE_XZ  `const`

```ts
const CHUNK_SIZE_XZ = 16;
```

### COLLISION_SHAPES  `const`

```ts
const COLLISION_SHAPES: readonly ["full", "slab", "cactus", "pressurePlate", "none"];
```

### CameraPoseSnapshot  `type`

```ts
type CameraPoseSnapshot = {
    readonly position: Position;
    readonly yawRadians: number;
    readonly pitchRadians: number;
    readonly capturedAtSecs: MonotonicTimeSecs;
};
```

### ChunkAxis  `const`

```ts
const ChunkAxis: Brand.Brand.Constructor<ChunkAxis>;
```

### ChunkAxis  `type`

```ts
type ChunkAxis = number & Brand.Brand<'ChunkAxis'>;
```

### ChunkCoord  `type`

```ts
type ChunkCoord = {
    readonly cx: ChunkAxis;
    readonly cz: ChunkAxis;
};
```

### ClockPort  `class`

```ts
class ClockPort extends ClockPort_base {
}
```

### ClockService  `type`

```ts
type ClockService = {
    readonly monotonicSecs: Effect.Effect<MonotonicTimeSecs>;
    readonly wallClockEpochMillis: Effect.Effect<EpochMillis>;
};
```

### CollisionShape  `type`

```ts
type CollisionShape = (typeof COLLISION_SHAPES)[number];
```

### DEFAULT_BLOCK_DROP  `const`

```ts
const DEFAULT_BLOCK_DROP: BlockDropRule;
```

### DEFAULT_HARVEST_TOOL  `const`

```ts
const DEFAULT_HARVEST_TOOL: HarvestToolRequirement;
```

### DeltaTimeSecs  `const`

```ts
const DeltaTimeSecs: Brand.Brand.Constructor<DeltaTimeSecs>;
```

### DeltaTimeSecs  `type`

```ts
type DeltaTimeSecs = number & Brand.Brand<'DeltaTimeSecs'>;
```

### EpochMillis  `const`

```ts
const EpochMillis: Brand.Brand.Constructor<EpochMillis>;
```

### EpochMillis  `type`

```ts
type EpochMillis = number & Brand.Brand<'EpochMillis'>;
```

### FLUID_KINDS  `const`

```ts
const FLUID_KINDS: readonly ["none", "water", "lava"];
```

### FixedClockLayer  `const`

```ts
const FixedClockLayer: (at: {
    readonly monotonicSecs: MonotonicTimeSecs;
    readonly wallClockEpochMillis: EpochMillis;
}) => Layer.Layer<ClockPort>;
```

### FluidKind  `type`

```ts
type FluidKind = (typeof FLUID_KINDS)[number];
```

### FrameServices  `type`

```ts
type FrameServices = ClockPort;
```

### GameModule  `interface`

```ts
interface GameModule<ROut, E, RIn, RRegister = never> {
    readonly layers: Layer.Layer<ROut, E, RIn>;
    readonly frameStages: Effect.Effect<ReadonlyArray<StageRegistration>, never, RRegister>;
}
```

### HARVEST_TIERS  `const`

```ts
const HARVEST_TIERS: readonly ["none", "wooden", "stone", "iron", "diamond"];
```

### HARVEST_TOOL_CATEGORIES  `const`

```ts
const HARVEST_TOOL_CATEGORIES: readonly ["none", "pickaxe", "axe", "shovel", "hoe", "shears", "sword"];
```

### HarvestContext  `type`

```ts
type HarvestContext = {
    readonly heldTier?: HarvestTier;
    readonly silkTouch?: boolean;
};
```

### HarvestTier  `type`

```ts
type HarvestTier = (typeof HARVEST_TIERS)[number];
```

### HarvestToolCategory  `type`

```ts
type HarvestToolCategory = (typeof HARVEST_TOOL_CATEGORIES)[number];
```

### HarvestToolRequirement  `type`

```ts
type HarvestToolRequirement = {
    readonly category: HarvestToolCategory;
    readonly minTier: HarvestTier;
};
```

### ITEM_TYPES  `const`

```ts
const ITEM_TYPES: readonly ["stone", "cobblestone", "dirt", "grass_block", "sand", "gravel", "oak_log", "oak_planks", "oak_leaves", "glass", "torch", "glowstone", "piston", "stick", "bow", "arrow", "glowstone_dust", "wooden_pickaxe", "stone_pickaxe", "iron_pickaxe", "diamond_pickaxe", "wooden_hoe", "stone_hoe", "iron_hoe", "diamond_hoe", "wooden_sword", "stone_sword", "iron_sword", "diamond_sword", "coal", "iron_ingot", "flint", "gunpowder", "blaze_powder", "rotten_flesh", "ender_pearl", "flint_and_steel", "fire_charge", "iron_helmet", "iron_chestplate", "iron_leggings", "iron_boots", "granite", "diorite", "andesite", "deepslate", "obsidian", "smooth_basalt", "calcite", "amethyst_block", "sandstone", "prismarine", "soul_sand", "coal_block", "iron_block", "gold_block", "diamond_block", "redstone_block", "lapis_block", "emerald_block", "redstone_torch", "lever", "stone_button", "repeater", "redstone_lamp", "observer", "comparator", "dispenser", "hopper", "end_stone", "end_portal_frame", "end_portal_frame_filled", "chorus_flower", "chorus_plant", "dragon_egg", "end_crystal", "end_rod", "end_stone_bricks", "ender_chest", "purpur_block", "purpur_pillar", "purpur_slab", "purpur_stairs", "shulker_box", "crafting_table", "furnace", "chest", "door", "oak_stairs", "anvil", "cauldron", "bed", "enchanting_table", "brewing_stand", "tnt", "nether_brick", "netherrack", "raw_iron", "raw_gold", "diamond", "emerald", "lapis_lazuli", "redstone_dust", "amethyst_shard", "wheat_seeds", "wheat", "potato", "nether_wart", "ladder", "kelp", "seagrass", "rail", "powered_rail", "pressure_plate", "stone_slab", "string", "snowball", "sapling", "dandelion", "poppy", "brown_mushroom", "red_mushroom", "tall_grass", "fern", "sugar_cane", "cactus", "lily_pad"];
```

### ItemType  `type`

```ts
type ItemType = (typeof ITEM_TYPES)[number];
```

### LIGHT_LEVEL_MAX  `const`

```ts
const LIGHT_LEVEL_MAX = 15;
```

### LIGHT_LEVEL_MIN  `const`

```ts
const LIGHT_LEVEL_MIN = 0;
```

### LocalAxis  `const`

```ts
const LocalAxis: Brand.Brand.Constructor<LocalAxis>;
```

### LocalAxis  `type`

```ts
type LocalAxis = number & Brand.Brand<'LocalAxis'>;
```

### LocalBlockCoord  `type`

```ts
type LocalBlockCoord = {
    readonly lx: LocalAxis;
    readonly ly: BlockAxis;
    readonly lz: LocalAxis;
};
```

### MAX_STACK_COUNT  `const`

```ts
const MAX_STACK_COUNT = 64;
```

### MonotonicTimeSecs  `const`

```ts
const MonotonicTimeSecs: Brand.Brand.Constructor<MonotonicTimeSecs>;
```

### MonotonicTimeSecs  `type`

```ts
type MonotonicTimeSecs = number & Brand.Brand<'MonotonicTimeSecs'>;
```

### NEEDS_ANY_SUPPORT  `const`

```ts
const NEEDS_ANY_SUPPORT: SupportRule;
```

### NEEDS_NO_SUPPORT  `const`

```ts
const NEEDS_NO_SUPPORT: SupportRule;
```

### NON_PLACEABLE_ITEM_TYPES  `const`

```ts
const NON_PLACEABLE_ITEM_TYPES: ReadonlyArray<ItemType>;
```

### PENDING_CAPABILITIES  `const`

```ts
const PENDING_CAPABILITIES: ReadonlyArray<{
    readonly name: string;
    readonly kind: 'flag' | 'property';
    readonly why: string;
}>;
```

### PLACEABLE_ITEM_TYPES  `const`

```ts
const PLACEABLE_ITEM_TYPES: ReadonlyArray<PlaceableItemType>;
```

### PlaceableItemType  `type`

```ts
type PlaceableItemType = ItemType & BlockType;
```

### Position  `type`

```ts
type Position = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
};
```

### RAIL_KINDS  `const`

```ts
const RAIL_KINDS: readonly ["none", "normal", "powered"];
```

### RENDER_KINDS  `const`

```ts
const RENDER_KINDS: readonly ["cube", "cross", "cactus", "rail", "lilyPad", "fluid"];
```

### RailKind  `type`

```ts
type RailKind = (typeof RAIL_KINDS)[number];
```

### RenderKind  `type`

```ts
type RenderKind = (typeof RENDER_KINDS)[number];
```

### ResolvedBlock  `type`

```ts
type ResolvedBlock = {
    readonly type: BlockType;
    readonly capabilities: BlockCapabilities;
    readonly properties: BlockProperties;
};
```

### StackCount  `const`

```ts
const StackCount: Brand.Brand.Constructor<StackCount>;
```

### StackCount  `type`

```ts
type StackCount = number & Brand.Brand<'StackCount'>;
```

### StageId  `const`

```ts
const StageId: Brand.Brand.Constructor<StageId>;
```

### StageId  `type`

```ts
type StageId = string & Brand.Brand<'StageId'>;
```

### StageRegistration  `interface`

```ts
interface StageRegistration {
    readonly id: StageId;
    readonly after?: ReadonlyArray<StageId>;
    readonly run: (dt: DeltaTimeSecs) => Effect.Effect<void, never, FrameServices>;
}
```

### SupportRule  `type`

```ts
type SupportRule = {
    readonly kind: 'none';
} | {
    readonly kind: 'anySupporting';
} | {
    readonly kind: 'oneOf';
    readonly blocks: ReadonlyArray<BlockType>;
};
```

### TRUE_BY_DEFAULT_CAPABILITY_FLAGS  `const`

```ts
const TRUE_BY_DEFAULT_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag>;
```

### UNITEMISED_BLOCK_TYPES  `const`

```ts
const UNITEMISED_BLOCK_TYPES: ReadonlyArray<BlockType>;
```

### UNREGISTERED_BLOCK_TYPES  `const`

```ts
const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType>;
```

### WorldId  `const`

```ts
const WorldId: Brand.Brand.Constructor<WorldId>;
```

### WorldId  `type`

```ts
type WorldId = string & Brand.Brand<'WorldId'>;
```

### aabb  `const`

```ts
const aabb: (a: Position, b: Position) => AABB;
```

### aabbContainsPoint  `const`

```ts
const aabbContainsPoint: (box: AABB, point: Position) => boolean;
```

### aabbIntersects  `const`

```ts
const aabbIntersects: (a: AABB, b: AABB) => boolean;
```

### aabbOfBlock  `const`

```ts
const aabbOfBlock: (value: BlockPosition) => AABB;
```

### blockCapabilitiesOf  `const`

```ts
const blockCapabilitiesOf: (definition: BlockDefinition) => BlockCapabilities;
```

### blockIdOf  `const`

```ts
const blockIdOf: (type: BlockType) => BlockId;
```

### blockIdsWithCapability  `const`

```ts
const blockIdsWithCapability: (flag: BlockCapabilityFlag) => ReadonlySet<number>;
```

### blockIdsWithOpacity  `const`

```ts
const blockIdsWithOpacity: (opacity: BlockOpacity) => ReadonlySet<number>;
```

### blockOfPlaceableItem  `const`

```ts
const blockOfPlaceableItem: (item: PlaceableItemType) => BlockType;
```

### blockPosition  `const`

```ts
const blockPosition: (x: number, y: number, z: number) => BlockPosition;
```

### blockPositionOfChunkLocal  `const`

```ts
const blockPositionOfChunkLocal: (chunk: ChunkCoord, local: LocalBlockCoord) => BlockPosition;
```

### blockPositionOfPosition  `const`

```ts
const blockPositionOfPosition: (value: Position) => BlockPosition;
```

### blockPropertiesOf  `const`

```ts
const blockPropertiesOf: (definition: BlockDefinition) => BlockProperties;
```

### blockTypeOfId  `const`

```ts
const blockTypeOfId: (id: number) => BlockType | undefined;
```

### canBlockStaySupported  `const`

```ts
const canBlockStaySupported: (id: number, supportBelow: number) => boolean;
```

### capabilitiesOfBlockId  `const`

```ts
const capabilitiesOfBlockId: (id: number) => BlockCapabilities;
```

### capabilityOf  `const`

```ts
const capabilityOf: (overrides: BlockCapabilityOverrides, flag: BlockCapabilityFlag) => boolean;
```

### capabilityOfBlockId  `const`

```ts
const capabilityOfBlockId: (id: number, flag: BlockCapabilityFlag) => boolean;
```

### chunkCoord  `const`

```ts
const chunkCoord: (cx: number, cz: number) => ChunkCoord;
```

### chunkCoordOfBlock  `const`

```ts
const chunkCoordOfBlock: (value: BlockPosition) => ChunkCoord;
```

### clampLightLevel  `const`

```ts
const clampLightLevel: (value: number) => number;
```

### dropOfBlockId  `const`

```ts
const dropOfBlockId: (id: number, context?: HarvestContext) => BlockDrop | undefined;
```

### fixedClock  `const`

```ts
const fixedClock: (at: {
    readonly monotonicSecs: MonotonicTimeSecs;
    readonly wallClockEpochMillis: EpochMillis;
}) => ClockService;
```

### isBlockType  `const`

```ts
const isBlockType: (value: string) => value is BlockType;
```

### isItemType  `const`

```ts
const isItemType: (value: string) => value is ItemType;
```

### isKnownBlockId  `const`

```ts
const isKnownBlockId: (id: number) => boolean;
```

### isLightLevel  `const`

```ts
const isLightLevel: (value: number) => boolean;
```

### isPlaceableItem  `const`

```ts
const isPlaceableItem: (item: ItemType) => item is PlaceableItemType;
```

### isSupportSensitive  `const`

```ts
const isSupportSensitive: (rule: SupportRule) => boolean;
```

### isSupportSensitiveBlockId  `const`

```ts
const isSupportSensitiveBlockId: (id: number) => boolean;
```

### itemOfBlock  `const`

```ts
const itemOfBlock: (block: BlockType) => PlaceableItemType | undefined;
```

### lightEmissionOfBlockId  `const`

```ts
const lightEmissionOfBlockId: (id: number) => number;
```

### localCoordOfBlock  `const`

```ts
const localCoordOfBlock: (value: BlockPosition) => LocalBlockCoord;
```

### monotonicSecs  `const`

```ts
const monotonicSecs: Effect.Effect<MonotonicTimeSecs, never, ClockPort>;
```

### needsOneOf  `const`

```ts
const needsOneOf: (...blocks: ReadonlyArray<BlockType>) => SupportRule;
```

### opacityOfBlockId  `const`

```ts
const opacityOfBlockId: (id: number) => BlockOpacity;
```

### position  `const`

```ts
const position: (x: number, y: number, z: number) => Position;
```

### propertyOf  `const`

```ts
const propertyOf: <K extends BlockPropertyName>(overrides: BlockPropertyOverrides, name: K) => BlockProperties[K];
```

### propertyOfBlockId  `const`

```ts
const propertyOfBlockId: <K extends BlockPropertyName>(id: number, name: K) => BlockProperties[K];
```

### resolveBlock  `const`

```ts
const resolveBlock: (definition: BlockDefinition) => ResolvedBlock;
```

### resolveBlockCapabilities  `const`

```ts
const resolveBlockCapabilities: (overrides: BlockCapabilityOverrides) => BlockCapabilities;
```

### resolveBlockProperties  `const`

```ts
const resolveBlockProperties: (overrides: BlockPropertyOverrides) => BlockProperties;
```

### resolveDrop  `const`

```ts
const resolveDrop: (requirement: HarvestToolRequirement, rule: BlockDropRule, brokenBlock: BlockType, context?: HarvestContext) => BlockDrop | undefined;
```

### resolveDropItem  `const`

```ts
const resolveDropItem: (rule: BlockDropRule, brokenBlock: BlockType) => ItemType | undefined;
```

### resolvedBlockOfId  `const`

```ts
const resolvedBlockOfId: (id: number) => ResolvedBlock | undefined;
```

### satisfiesHarvestTier  `const`

```ts
const satisfiesHarvestTier: (requirement: HarvestToolRequirement, heldTier: HarvestTier) => boolean;
```

### satisfiesSupportRule  `const`

```ts
const satisfiesSupportRule: (rule: SupportRule, blockBelow: BlockType | undefined, belowSupportsAttachments: boolean) => boolean;
```

### snapshotAgeSecs  `const`

```ts
const snapshotAgeSecs: (snapshot: CameraPoseSnapshot, now: MonotonicTimeSecs) => number;
```

### supportRuleOfBlockId  `const`

```ts
const supportRuleOfBlockId: (id: number) => SupportRule;
```

### transmitsLight  `const`

```ts
const transmitsLight: (id: number) => boolean;
```

### wallClockEpochMillis  `const`

```ts
const wallClockEpochMillis: Effect.Effect<EpochMillis, never, ClockPort>;
```

## Supporting declarations

Not exported from the barrel, but named by the signatures above, so a
consumer is exposed to them. `Context.Tag` service classes emit their real
type onto one of these.

### ClockPort_base  `const`

```ts
const ClockPort_base: Context.TagClass<ClockPort, "@nerima-games/mc-kernel/ClockPort", ClockService>;
```

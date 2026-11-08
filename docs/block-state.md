# Block-state vocabulary and codec

## Scope

`mc-kernel` implements the per-cell state codec for all 126 current block types without changing existing `BlockId` values. Consumers can pair each ID cell with one `EncodedBlockState` value in a parallel buffer at the same cell index. The encoded value contains state only, not a block ID; this target storage pairing leaves the current chunk `BlockState` ID buffer unchanged. The vanilla reference is Java Edition 26.3: the checked-in crosswalk source is `test/golden/vanilla-block.json`, generated from the Java block-state roster and pinned by `test/vanilla-26-3.test.ts`. The [Minecraft Wiki Block states table](https://minecraft.wiki/w/Block_state) is the readable cross-check. Kernel-only names are mapped to a representative vanilla block in the table below.

The vocabulary includes a property when it changes gameplay, rendering, redstone behavior, or world generation for one of the 126 kernel block types. It contains 40 vanilla property names after the ID-backed exclusions below. The six directional boolean/connection properties (`down`, `east`, `north`, `south`, `up`, `west`) share the API field `connections`; redstone wire uses `none`, `side`, or `up` for its four horizontal directions, while fire and chorus plant use booleans. The `power` property is a numeric signal level from 0 through 15 and remains distinct from boolean `powered`.

All properties in the vanilla-state column are represented by codec state or by the exact ID-backed cases listed in “Excluded properties”. After those exclusions, 59 kernel types have encoded state and 67 accept only the empty state. `—` means the vanilla block has no block-state properties. The kernel `end_crystal` type is an extension for a vanilla entity and has no vanilla block-state row. Other vanilla blocks are outside this crosswalk because the kernel has no corresponding block type.

## Complete 126-type crosswalk

Each state is shown as `property=allowed-values (default value)`. ID-fixed properties instead show `property=fixed-value (ID-fixed; vanilla default value)`. Numeric ranges are inclusive. For aliased types, the vanilla name is the representative whose shared block-state schema is used.

| Kernel block type | Vanilla Java block | Vanilla properties and defaults |
| --- | --- | --- |
| `air` | `air` | — |
| `stone` | `stone` | — |
| `cobblestone` | `cobblestone` | — |
| `dirt` | `dirt` | — |
| `grass_block` | `grass_block` | snowy=true/false (default false) |
| `sand` | `sand` | — |
| `gravel` | `gravel` | — |
| `water` | `water` | level=0..15 (default 0) |
| `lava` | `lava` | level=0..15 (default 0) |
| `oak_log` | `oak_log` | axis=x/y/z (default y) |
| `oak_planks` | `oak_planks` | — |
| `oak_leaves` | `oak_leaves` | distance=1..7 (default 7); persistent=true/false (default false); waterlogged=true/false (default false) |
| `glass` | `glass` | — |
| `torch` | `torch` | — |
| `glowstone` | `glowstone` | — |
| `bedrock` | `bedrock` | — |
| `piston` | `piston` | extended=true/false (default false); facing=north/east/south/west/up/down (default north) |
| `snow` | `snow` | layers=1..8 (default 1) |
| `ladder` | `ladder` | facing=north/south/west/east (default north); waterlogged=true/false (default false) |
| `cobweb` | `cobweb` | — |
| `sapling` | `oak_sapling` | stage=0..1 (default 0) |
| `dandelion` | `dandelion` | — |
| `poppy` | `poppy` | — |
| `brown_mushroom` | `brown_mushroom` | — |
| `red_mushroom` | `red_mushroom` | — |
| `tall_grass` | `tall_grass` | half=upper/lower (default lower) |
| `fern` | `fern` | — |
| `sugar_cane` | `sugar_cane` | age=0..15 (default 0) |
| `lily_pad` | `lily_pad` | — |
| `kelp` | `kelp` | age=0..25 (default 0) |
| `seagrass` | `seagrass` | — |
| `rail` | `rail` | shape=north_south/east_west/ascending_east/ascending_west/ascending_north/ascending_south/south_east/south_west/north_west/north_east (default north_south); waterlogged=true/false (default false) |
| `powered_rail` | `powered_rail` | powered=true/false (default false); shape=north_south/east_west/ascending_east/ascending_west/ascending_north/ascending_south (default north_south); waterlogged=true/false (default false) |
| `cactus` | `cactus` | age=0..15 (default 0) |
| `pressure_plate` | `stone_pressure_plate` | powered=true/false (default false) |
| `stone_slab` | `stone_slab` | type=top/bottom/double (default bottom); waterlogged=true/false (default false) |
| `granite` | `granite` | — |
| `diorite` | `diorite` | — |
| `andesite` | `andesite` | — |
| `deepslate` | `deepslate` | axis=x/y/z (default y) |
| `obsidian` | `obsidian` | — |
| `smooth_basalt` | `smooth_basalt` | — |
| `calcite` | `calcite` | — |
| `amethyst_block` | `amethyst_block` | — |
| `amethyst_cluster` | `amethyst_cluster` | facing=north/east/south/west/up/down (default up); waterlogged=true/false (default false) |
| `sandstone` | `sandstone` | — |
| `prismarine` | `prismarine` | — |
| `soul_sand` | `soul_sand` | — |
| `ice` | `ice` | — |
| `farmland` | `farmland` | moisture=0..7 (default 0) |
| `coal_ore` | `coal_ore` | — |
| `iron_ore` | `iron_ore` | — |
| `gold_ore` | `gold_ore` | — |
| `diamond_ore` | `diamond_ore` | — |
| `redstone_ore` | `redstone_ore` | lit=true/false (default false) |
| `lapis_ore` | `lapis_ore` | — |
| `emerald_ore` | `emerald_ore` | — |
| `deepslate_coal_ore` | `deepslate_coal_ore` | — |
| `deepslate_iron_ore` | `deepslate_iron_ore` | — |
| `deepslate_gold_ore` | `deepslate_gold_ore` | — |
| `deepslate_diamond_ore` | `deepslate_diamond_ore` | — |
| `deepslate_redstone_ore` | `deepslate_redstone_ore` | lit=true/false (default false) |
| `deepslate_lapis_ore` | `deepslate_lapis_ore` | — |
| `deepslate_emerald_ore` | `deepslate_emerald_ore` | — |
| `coal_block` | `coal_block` | — |
| `iron_block` | `iron_block` | — |
| `gold_block` | `gold_block` | — |
| `diamond_block` | `diamond_block` | — |
| `redstone_block` | `redstone_block` | — |
| `lapis_block` | `lapis_block` | — |
| `emerald_block` | `emerald_block` | — |
| `wheat_crop` | `wheat` | age=0..7 (default 0) |
| `potato_crop` | `potatoes` | age=0..7 (default 0) |
| `nether_wart_crop` | `nether_wart` | age=0..3 (default 0) |
| `redstone_wire` | `redstone_wire` | east=up/side/none (default none); north=up/side/none (default none); power=0..15 (default 0); south=up/side/none (default none); west=up/side/none (default none) |
| `redstone_torch` | `redstone_torch` | lit=true/false (default true) |
| `lever` | `lever` | face=floor/wall/ceiling (default wall); facing=north/south/west/east (default north); powered=true/false (default false) |
| `stone_button` | `stone_button` | face=floor/wall/ceiling (default wall); facing=north/south/west/east (default north); powered=true/false (default false) |
| `repeater` | `repeater` | delay=1..4 (default 1); facing=north/south/west/east (default north); locked=true/false (default false); powered=true/false (default false) |
| `redstone_lamp` | `redstone_lamp` | lit=false (ID-fixed; vanilla default false) |
| `redstone_lamp_lit` | `redstone_lamp` | lit=true (ID-fixed; vanilla default false) |
| `observer` | `observer` | facing=north/east/south/west/up/down (default south); powered=true/false (default false) |
| `comparator` | `comparator` | facing=north/south/west/east (default north); mode=compare/subtract (default compare); powered=true/false (default false) |
| `dispenser` | `dispenser` | facing=north/east/south/west/up/down (default north); triggered=true/false (default false) |
| `dropper` | `dropper` | facing=north/east/south/west/up/down (default north); triggered=true/false (default false) |
| `hopper` | `hopper` | enabled=true/false (default true); facing=down/north/south/west/east (default down) |
| `piston_head` | `piston_head` | facing=north/east/south/west/up/down (default north); short=true/false (default false); type=normal/sticky (default normal) |
| `end_stone` | `end_stone` | — |
| `end_portal_frame` | `end_portal_frame` | eye=false (ID-fixed; vanilla default false); facing=north/south/west/east (default north) |
| `end_portal_frame_filled` | `end_portal_frame` | eye=true (ID-fixed; vanilla default false); facing=north/south/west/east (default north) |
| `end_portal` | `end_portal` | — |
| `chorus_flower` | `chorus_flower` | age=0..5 (default 0) |
| `chorus_plant` | `chorus_plant` | down=true/false (default false); east=true/false (default false); north=true/false (default false); south=true/false (default false); up=true/false (default false); west=true/false (default false) |
| `dragon_egg` | `dragon_egg` | — |
| `end_crystal` | `— (entity)` | Java entity, not a block |
| `end_gateway` | `end_gateway` | — |
| `end_rod` | `end_rod` | facing=north/east/south/west/up/down (default up) |
| `end_stone_bricks` | `end_stone_bricks` | — |
| `ender_chest` | `ender_chest` | facing=north/south/west/east (default north); waterlogged=true/false (default false) |
| `purpur_block` | `purpur_block` | — |
| `purpur_pillar` | `purpur_pillar` | axis=x/y/z (default y) |
| `purpur_slab` | `purpur_slab` | type=top/bottom/double (default bottom); waterlogged=true/false (default false) |
| `purpur_stairs` | `purpur_stairs` | facing=north/south/west/east (default north); half=top/bottom (default bottom); shape=straight/inner_left/inner_right/outer_left/outer_right (default straight); waterlogged=true/false (default false) |
| `shulker_box` | `shulker_box` | facing=north/east/south/west/up/down (default up) |
| `crafting_table` | `crafting_table` | — |
| `furnace` | `furnace` | facing=north/south/west/east (default north); lit=true/false (default false) |
| `chest` | `chest` | facing=north/south/west/east (default north); type=single/left/right (default single); waterlogged=true/false (default false) |
| `door` | `oak_door` | facing=north/south/west/east (default north); half=upper/lower (default lower); hinge=left/right (default left); open=true/false (default false); powered=true/false (default false) |
| `door_open` | `oak_door` | facing=north/south/west/east (default north); half=upper/lower (default lower); hinge=left/right (default left); open=true (ID-fixed; vanilla default false); powered=true/false (default false) |
| `oak_stairs` | `oak_stairs` | facing=north/south/west/east (default north); half=top/bottom (default bottom); shape=straight/inner_left/inner_right/outer_left/outer_right (default straight); waterlogged=true/false (default false) |
| `anvil` | `anvil` | facing=north/south/west/east (default north) |
| `cauldron` | `cauldron` | — |
| `water_cauldron` | `water_cauldron` | level=1..3 (default 1) |
| `bed` | `white_bed` | facing=north/south/west/east (default north); occupied=true/false (default false); part=head/foot (default foot) |
| `enchanting_table` | `enchanting_table` | — |
| `brewing_stand` | `brewing_stand` | has_bottle_0=true/false (default false); has_bottle_1=true/false (default false); has_bottle_2=true/false (default false) |
| `tnt` | `tnt` | unstable=true/false (default false) |
| `nether_brick` | `nether_bricks` | — |
| `netherrack` | `netherrack` | — |
| `nether_portal` | `nether_portal` | axis=x/z (default x) |
| `fire` | `fire` | age=0..15 (default 0); east=true/false (default false); north=true/false (default false); south=true/false (default false); up=true/false (default false); west=true/false (default false) |
| `soul_soil` | `soul_soil` | — |
| `wither_skeleton_skull` | `wither_skeleton_skull` | powered=true/false (default false); rotation=0..15 (default 0) |
| `copper_ore` | `copper_ore` | — |
| `deepslate_copper_ore` | `deepslate_copper_ore` | — |
| `bookshelf` | `bookshelf` | — |

## Included property vocabulary

The state schema accepts these scalar properties when supported by the selected block type:

- `facing`, `half`, `hinge`, `open`, `age`, `level`, `powered`, `delay`, `shape`, `axis`, `distance`, `enabled`, `extended`, `face`, `has_bottle_0`, `has_bottle_1`, `has_bottle_2`, `layers`, `lit`, `locked`, `mode`, `moisture`, `occupied`, `part`, `persistent`, `power`, `rotation`, `short`, `snowy`, `stage`, `triggered`, `type`, `unstable`, and `waterlogged`.

Directional connections use the `connections` object. Its supported directions and values are listed in the crosswalk for each block type.

## Excluded properties and reasons

| Vanilla block and property | Kernel block type(s) | Reason |
| --- | --- | --- |
| `oak_door.open` | `door_open` | `door_open` means `open=true` and has its own ID, `BlockId(107)`, at `src/domain/block/block-registry-entries-structures-and-nether.ts:68-70`. `open` remains encoded for `door` (`BlockId(106)` at `src/domain/block/block-registry-entries-structures-and-nether.ts:60-62`), where open and closed states share that ID. |
| `end_portal_frame.eye` | `end_portal_frame`, `end_portal_frame_filled` | Empty (`eye=false`) and eye-filled (`eye=true`) variants have distinct IDs, `BlockId(87)` and `BlockId(88)`, at `src/domain/block/block-registry-entries-end.ts:49-60`. `facing` remains stateful for both. |
| `redstone_lamp.lit` | `redstone_lamp`, `redstone_lamp_lit` | Off (`lit=false`) and lit (`lit=true`) variants have distinct IDs, `BlockId(79)` and `BlockId(80)`, at `src/domain/block/block-registry-entries-crops-and-redstone.ts:184-188`. |
| `heavy_weighted_pressure_plate.power`, `light_weighted_pressure_plate.power` | none | Neither weighted plate has a kernel block type. For the single generic kernel `pressure_plate`, this design selects vanilla `stone_pressure_plate` (`src/domain/block/block-registry-entries-collision-shapes.ts:51-53`) as the representative; weighted-plate types must be added before their `power` state can be represented. |
| Block-state properties for `end_crystal` | `end_crystal` | Java Edition End Crystal is an entity, not a block. The kernel entry is an extension at `src/domain/block/block-registry-entries-end.ts:105-109`, so no vanilla Block states property is applicable. |

Java fluid-state entries are separate from the Block states table. This codec covers the block `level` properties shown for water and lava.

## Effective state resolution

`effectiveBlockStateOf(blockId, encodedState)` decodes the codec value and overlays any property fixed by the selected `BlockId`. Downstream shape selection, gameplay, and redstone code should use this function rather than reproduce the ID rules. For the paired IDs, the effective values are:

The exported signature is `effectiveBlockStateOf(blockId: BlockId, encodedState: EncodedBlockState): Result.Result<EffectiveBlockStateValues, BlockStateCodecFailure>`. A successful result contains the frozen `EffectiveBlockStateValues` object: all decoded per-block values, including defaults, with ID-fixed properties overlaid. A failure contains the same typed `BlockStateCodecFailure` returned by `decodeBlockState`; callers must handle the failed `Result` before reading properties. `EffectiveBlockStateValuesSchema` validates this output and includes `eye`; `eye` is not accepted by the codec input schema. These APIs are exported from the block barrel and package root.

| Kernel block type | `BlockId` | Effective property |
| --- | ---: | --- |
| `door` | 106 | `open` comes from decoded codec state |
| `door_open` | 107 | `open=true` |
| `end_portal_frame` | 87 | `eye=false` |
| `end_portal_frame_filled` | 88 | `eye=true` |
| `redstone_lamp` | 79 | `lit=false` |
| `redstone_lamp_lit` | 80 | `lit=true` |

All other effective properties come from the decoded codec state. The returned object includes decoded defaults, so `door.open` is false when its encoded value is zero or omitted before encoding.

## Values and encoding

The `BlockStateValues` schema is a strict object with optional properties. A per-block definition lists supported fields, their allowed values, and the default from the crosswalk. Omitted values resolve to that block default. Unknown fields, unsupported properties, invalid values, unknown block IDs, reserved encodings, and malformed integers return typed failures; invalid input is never coerced to a default, null, or success.

Codec version 1 encodes each cell's state in one unsigned 32-bit integer. It packs only the selected block's declared slots from least significant bit upward, following this fixed property order: `facing`, `half`, `hinge`, `open`, `age`, `level`, `powered`, `delay`, `shape`, `connections` in `down`, `north`, `east`, `south`, `west`, `up` order, then `axis`, `distance`, `enabled`, `extended`, `face`, `has_bottle_0`, `has_bottle_1`, `has_bottle_2`, `layers`, `lit`, `locked`, `mode`, `moisture`, `occupied`, `part`, `persistent`, `power`, `rotation`, `short`, `snowy`, `stage`, `triggered`, `type`, `unstable`, and `waterlogged`. A block's unsupported properties consume no bits. Each property default has code zero; legal non-default values follow the crosswalk order. Each slot uses the minimum number of bits for its legal values.

The widest block layout is `redstone_wire`: its north/east/south/west connections each use 2 bits for `none`/`side`/`up` (8 bits total), and its `power` uses 4 bits for 0–15, for 12 bits total. Codec version 1 reserves the high 20 bits. Reserved codes and nonzero unused bits are invalid.

The integer codec does not define byte order. Save and network formats own serialization of `EncodedBlockState` and their versioning. `BlockId` remains the selector for each block-state layout.

## C7 integration proposal

C7 is the shared atomic, dual-revision-checked world-write contract in [mc-compose's execution contracts](https://github.com/nerima-games/mc-compose/blob/main/docs/execution/contracts.md#c7-generic-world-write-port). Its world-session coordinator validates the complete batch before checking world and dimension revisions or writing. `BlockStateValuesSchema` and `encodeBlockState` are current mc-kernel exports. The `BlockEditSchema.state` field and `invalid-block-state` reason below are proposals for extending C7, not current mc-compose exports.

Apply these changes to C7’s contract:

```ts
import { BlockStateValuesSchema, encodeBlockState } from "@nerima-games/mc-kernel/domain/block-state";

export const BlockEditSchema = Schema.Struct({
  position: BlockPositionSchema,
  block: BlockIdSchema,
  state: Schema.optionalKey(BlockStateValuesSchema),
});

export class WorldWriteInvalidBatch extends Schema.TaggedError<WorldWriteInvalidBatch>()("WorldWriteInvalidBatch", {
  reason: Schema.Literals(["empty", "duplicate-position", "invalid-block-state"]),
}) {}
```

Omitting `state` means the selected block’s default state. After decoding the batch and validating the existing empty-batch and duplicate-position rules, validate every present `state` against its edit’s `block` with `encodeBlockState(edit.block, edit.state)`. Do this for the whole batch before checking revisions or writing. If validation fails, return `WorldWriteInvalidBatch` with reason `invalid-block-state`; this means the schema-decoded state has an unsupported property or a value outside the selected block’s legal domain. A malformed value rejected while decoding `BlockStateValuesSchema` remains a schema-decode failure. Only after the complete batch passes these checks should the adapter check world revision and then dimension revision, and the coordinator recheck both in the same transaction as the writes. Batch atomicity and revision rules remain unchanged. Replicated and saved representations may carry the encoded value under their own versioned schemas.

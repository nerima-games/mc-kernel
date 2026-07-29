# 公開 API

consumer が利用できる入口は `@nerima-games/mc-kernel` だけです。公開面の正本は
[`src/index.ts`](https://github.com/nerima-games/mc-kernel/blob/main/src/index.ts) であり、以下はその再 export を用途別に整理した一覧です。

## 基本の値型

- **識別子**: `WorldId`、`StageId`。
- **数量と時間**: `MAX_STACK_COUNT`、`StackCount`、`DeltaTimeSecs`、`MonotonicTimeSecs`、`EpochMillis`。
- **カメラ**: `CameraPoseSnapshot`、`snapshotAgeSecs`。

これらの branded type は境界での値検証にも使えます。`WorldId` や `StackCount` のように同名の値がある型は、その値を constructor/refinement として使います。

## 座標と空間

- **軸と座標**: `CHUNK_SIZE_XZ`、`BlockAxis`、`ChunkAxis`、`LocalAxis`、`Position`、`BlockPosition`、`ChunkCoord`、`LocalBlockCoord`。
- **変換**: `position`、`blockPosition`、`chunkCoord`、`blockPositionOfPosition`、`chunkCoordOfBlock`、`localCoordOfBlock`、`blockPositionOfChunkLocal`。
- **座標キー**: `BlockPositionKey`、`blockPositionKeyOf`、`isBlockPositionKey`、`blockPositionOfKey`、`decodeBlockPositionKey`。
- **範囲**: `AABB`、`aabb`、`aabbOfBlock`、`aabbIntersects`、`aabbContainsPoint`。

`BlockPositionKey` は canonical な `"x,y,z"` 表現です。consumer との共有化判断は[座標キー共有化](block-position-key-migration.md)を参照してください。

## ブロックとアイテム

- **種別**: `BLOCK_TYPES`、`BlockType`、`isBlockType`、`ITEM_TYPES`、`ItemType`、`isItemType`。
- **配置可能なアイテム**: `PlaceableItemType`、`isPlaceableItem`、`PLACEABLE_ITEM_TYPES`、`NON_PLACEABLE_ITEM_TYPES`、`UNITEMISED_BLOCK_TYPES`、`itemOfBlock`、`blockOfPlaceableItem`。
- **能力**: `BLOCK_CAPABILITY_DEFAULTS`、`BLOCK_CAPABILITY_FLAGS`、`TRUE_BY_DEFAULT_CAPABILITY_FLAGS`、`BlockCapabilityFlag`、`BlockCapabilities`、`BlockCapabilityOverrides`、`resolveBlockCapabilities`、`capabilityOf`。
- **性質**: `BLOCK_OPACITIES`、`FLUID_KINDS`、`COLLISION_SHAPES`、`RENDER_KINDS`、`RAIL_KINDS`、`LIGHT_LEVEL_MIN`、`LIGHT_LEVEL_MAX`、`BLOCK_PROPERTY_DEFAULTS`、`BLOCK_PROPERTY_NAMES`、`BlockOpacity`、`FluidKind`、`CollisionShape`、`RenderKind`、`RailKind`、`BlockProperties`、`BlockPropertyName`、`BlockPropertyOverrides`、`resolveBlockProperties`、`propertyOf`、`isLightLevel`、`clampLightLevel`。
- **支持**: `SupportRule`、`NEEDS_NO_SUPPORT`、`NEEDS_ANY_SUPPORT`、`needsOneOf`、`isSupportSensitive`、`satisfiesSupportRule`。
- **採掘と drop**: `HARVEST_TOOL_CATEGORIES`、`HARVEST_TIERS`、`HarvestToolRequirement`、`DEFAULT_HARVEST_TOOL`、`satisfiesHarvestTier`、`BlockDropRule`、`DEFAULT_BLOCK_DROP`、`resolveDropItem`、`HarvestContext`、`BARE_HANDED`、`BlockDrop`、`resolveDrop`。
- **定義と registry**: `BlockDefinition`、`ResolvedBlock`、`blockCapabilitiesOf`、`blockPropertiesOf`、`resolveBlock`、`AUDITED_CAPABILITY_NAMES`、`PENDING_CAPABILITIES`、`BLOCK_ID_MAX`、`BlockId`、`BlockRegistryEntry`、`AIR_BLOCK_ID`、`BLOCK_REGISTRY`、`BLOCK_IDS`、`UNREGISTERED_BLOCK_TYPES`、`isKnownBlockId`、`blockIdOf`、`blockTypeOfId`、`resolvedBlockOfId`、`dropOfBlockId`。

registry には、ID ごとの能力・性質・支持規則を読む `capabilityOfBlockId`、`propertyOfBlockId`、`capabilitiesOfBlockId`、`opacityOfBlockId`、`lightEmissionOfBlockId`、`transmitsLight`、`supportRuleOfBlockId`、`isSupportSensitiveBlockId`、`canBlockStaySupported` と、条件に一致する ID を得る `blockIdsWithCapability`、`blockIdsWithOpacity` もあります。

## 実行境界

- **時計**: `ClockService`、`ClockPort`、`fixedClock`、`FixedClockLayer`、`monotonicSecs`、`wallClockEpochMillis`。
- **frame**: `FrameServices`、`StageRegistration`、`GameModule`。

時計が必要な処理には `ClockPort` を Layer として提供します。wall clock を直接読む代わりに、`wallClockEpochMillis` を使って依存を明示します。

## 契約の確認

公開 API の変更後は、意図した差分を確認してから `pnpm api:update` を実行します。CI と `pnpm verify` は `pnpm api:check` で `api-lock.md` が現在の公開面と一致することを検査します。

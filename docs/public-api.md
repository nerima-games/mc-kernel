# 公開 API

`src/index.ts` が公開バレルであり、利用リポジトリは root package または公開済み subpath を import する。
`test/public-api.test.ts` が root と公開済み subpath の import surface を検査する。
公開 subpath と対応する barrel の一覧は [area map](./area-map.md) にある。

配布物では公開バレルに加えて、`package.json` に列挙された `domain/*.ts` entrypoint を
`@nerima-games/mc-kernel/domain/*` から個別に import できる。型宣言と実装は同じ `dist` の公開境界から
提供する。`*-data` モジュールは通常は内部扱いだが、`crafting-special-data` は public subpath として公開されている。

複数リポジトリが共有し、どれか一つの所有リポジトリに置くと依存方向が崩れる型は kernel に置く。それ以外の型はその所有者のリポジトリに置く。

TypeScript のコードブロックは公開宣言や使用例の抜粋であり、完全なソースファイルではない。単独の `...` は省略、引数名に付く `...` は可変長引数を示す。本文や見出しで名前を並べる際の `/` は併記を示す。
`domain/<name>` は公開 subpath を示す文脈で使う略記であり、完全な import path は `@nerima-games/mc-kernel/domain/<name>` である。import path を明記した例だけが package entrypoint を示す。
`package.json` の `types` 条件は root entrypoint を `dist/index.d.ts`、各 `./domain/<name>` subpath を `dist/domain/<name>.d.ts` に対応づける。各公開 import entrypoint の完全な型宣言は package に含まれるそのファイルから確認できる。

## 数値・文字列・bigint の意味型

公開 API で意味のある数値・文字列・bigint を引数や戻り値として渡す場合と、公開データ型でフィールドとして保持する場合は、その意味に対応するブランド型を使う。`Brand.Constructor` 型のブランドコンストラクタは未検証のプリミティブを受け取る。通常の呼び出しは検証済みのブランド値を返し、検証に失敗すると `BrandError` を投げる。失敗を値として扱う場合は `.result(value)` を使うと `Result` を、理由が不要な場合は `.option(value)` を使うと `Option` を受け取れる。外部データの decoder は `unknown` を受け取る。次の表はブランド型を使う主な公開 API 群を示す。

| 領域 | 主な公開契約 |
| --- | --- |
| 座標・カメラ | `Position` と `WorldPosition` の x/y/z は有限な `PositionAxis`。`position` は 3 軸を受け取る。`CameraPoseSnapshot` の yaw/pitch は有限な `AngleRadians`。`snapshotAgeSecs` は `SnapshotAgeSecs` を返す。 |
| フレーム時間 | `clampFrameDelta` と `frameDeltaLossSecs` は `DeltaTimeSecs`、時刻差分関数は `MonotonicTimeSecs` を受け取り、`DeltaTimeSecs` を返す。 |
| ブロック・chunk | block property 値は固有の数値ブランドを使う。`BlockState` の index、length、byte offset は `BlockStateIndex`、`BlockStateLength`、`BlockStateByteOffset`。light channel は対応する `LightChannel*` ブランドを使う。chunk height、Y、要素数は `ChunkHeight`、`ChunkLocalY`、`ChunkBlockCount`。 |
| world | heightmap 列は `HeightmapColumnIndex`、read view section index/length は `SectionIndex` / `SectionLength`。biome の気温・降水量・tint は `BiomeTemperature` / `BiomeDownfall` / `BiomeTint`。random source は `RandomSeed`、`RandomIntBound`、`RandomInt`、`RandomFraction`。data pack layer は `DataPackFormat`、`DataPackPriority`、`DataPackResourcePath` と namespaced resource location を使う。 |
| item | stack 数には既存の `StackCount` を使う。component の数値・文字列・bigint 値、effect、food、map、profile、book、trim、firework、kinetic、tool の公開フィールドは下表の意味ブランドを使う。 |
| recipe | ingredient count、priority、grid 寸法/index、pattern row/symbol、free-form group、experience、completion count、brewing fuel、transmute material slot 数は専用ブランドを使う。recipe ID/tag は既存の resource-location ブランドを使う。 |
| text | vanilla path は `VanillaResourcePath`。Settings の距離、視野角、音量、感度、action、key code と difficulty multiplier は専用ブランドを使う。 |
| entity | serial、health、roster repair count、explosion の半径/count/exposure、portal の幅/高さ、vehicle velocity/診断文字列、Sulfur Cube の数値値は専用ブランドを使う。yaw は `AngleRadians`。 |

ブランド型と validator の受理域は次のとおり。各 `Brand.Constructor` は値の型と同名で公開される。

| 領域 | ブランドと受理域 |
| --- | --- |
| coordinates / shared vocabulary | `PositionAxis`: 有限値。`AngleRadians`: 有限値。`SnapshotAgeSecs`: 有限値で、clock skew を表す負値も受理する。 |
| block | `LightLevelCandidate`: NaN 以外。`BlockHardness`: 有限値で 0 以上、または -1。`BlockFriction`: [0, 1]。`BlockBlastResistance`: 非負値または正の Infinity。`BlockContactDamage` / `BlockMovementDrag` / `BlockExperiencePoints`: 有限非負値。`ContainerSlotCount`: 正の safe integer。`LightChannelLength`、`LightChannelIndex`、`LightChannelByteOffset`、`BlockStateLength`、`BlockStateIndex`、`BlockStateByteOffset`: 非負 safe integer。`LightVolumeHeight`: 整数 [1, `MAX_CHUNK_HEIGHT`]。 |
| world | `ChunkLocalY`: 整数 [0, `MAX_CHUNK_HEIGHT` - 1]。`ChunkBlockCount`: 256 の倍数 [256, 256 × `MAX_CHUNK_HEIGHT`]。`SectionIndex` / `SectionLength` / `HeightmapColumnIndex`: 非負 safe integer、heightmap index は 0..255。`BiomeTemperature`: 有限 [-0.7, 2]。`BiomeDownfall`: [0, 1]。`BiomeTint`: packed RGB 整数 [0, 0xFFFFFF]。`RandomSeed`: safe integer。`RandomIntBound`: 正の safe integer。`RandomInt`: 非負 safe integer。`RandomFraction`: [0, 1)。`DataPackFormat`: 有限非負値。`DataPackPriority`: 非負 safe integer。`DataPackResourcePath`: `data/` 下の安全な相対 `.json` path。 |
| text | `VanillaResourcePath`: 小文字英数字と `/._-` の vanilla path。`RenderDistanceChunks`: 整数 [2, 16]。`FieldOfViewDegrees`: 有限 [30, 110]。`VolumeLevel`: [0, 1]。`MouseSensitivity`: [0.1, 3]。`InputAction` / `KeyCode`: 空白だけではない文字列。`DifficultyDamageMultiplier`: [0, 1.5]。`DifficultyHungerMultiplier`: [0, 1]。 |
| entity | `EntitySerial` / `EntityRosterRepairCount` / `ExplosionBlockCount` / `ExplosionRayStepCount` / `ExplosionEntityCount`: 非負 safe integer。`EntityHealthPoints` / `ExplosionRadius` / `SulfurCubeContactDamageAmount`: 有限非負値。`ExplosionExposure`: [0, 1]。`PortalWidth`: 整数 [2, 21]。`PortalHeight`: 整数 [3, 21]。`VehicleVelocityComponent` と Sulfur Cube の knockback/sound 値: 有限値。`VehicleValidationPath` / `VehicleValidationReason`: 文字列。`SulfurCubeExplosionPower`: 非負 safe integer。 |
| item, numeric | `EffectAmplifier`: 整数 [0, 255]。`EffectDurationSecs`: 有限正値。`FoodNutrition`: 非負 safe integer。`FoodSaturation`: 有限非負値。`FoodEffectProbability`: [0, 1]。`RandomTeleportDiameter`: 有限正値。`BeeHiveTicks` / `PotionEffectDurationTicks`: 非負 safe integer。`ContainerSlotIndex`: 整数 [0, 255]。`RgbColor`: 整数 [0, 0xFFFFFF]。`DyeColorChannel`: [0, 1]。`MapDecorationCoordinate`: 整数 [-128, 127]。`MapDecorationRotation`: 整数 [0, 15]。`BookGeneration`: 整数 [0, 3]。`TrimItemModelIndex`: 有限非負値。`Enchantability` / `EnchantmentWeight`: 正の safe integer。`ItemEnchantability` / `EnchantmentTableLevelCost`: 非負 safe integer。`OminousBottleAmplifier`: 整数 [0, 4]。`FireworksFlightDuration`: 整数 [0, 255]。`CustomModelDataFloat`: 有限値。`KineticDurationTicks`: 非負 safe integer。`KineticSpeed` / `KineticDamageMultiplier` / `ToolMiningSpeed`: 有限非負値。`KineticMovement`: 有限値。`ToolDurabilityDamage` / `ToolRuleOrder`: 非負 safe integer。`ItemComponentNbtNumber`: 有限値。 |
| item, bigint | `ItemComponentNbtLong` / `LootTableSeed`: signed 64-bit 整数。 |
| item, string | `ItemComponentNbtString` / `ItemComponentNbtKey` / `TrimArmorMaterialKey` / `ProfilePropertyName` / `ProfilePropertyValue` / `ProfilePropertySignature` / `BookPageText` / `BookAuthor` / `BlockStatePropertyValue` / `ItemLock` / `CustomModelDataString`: 文字列。`ProfileName`: ASCII 英数字と `_` の 1..16 文字。`TrimAssetName`: 空でない文字列。 |
| recipe | `RecipeIngredientCount`: 整数 [1, 64]。`RecipePriority`: 非負 safe integer。`RecipeGridDimension`: 整数 [0, 3]。`RecipeGridIndex`: 整数 [0, 2]。`RecipePatternRow`: 長さ 0..3。`RecipePatternSymbol`: 空白でない 1 文字。`RecipeGroup`: 任意の文字列。`RecipeExperience`: 有限非負値。`RecipeCompletionCount`: 非負 safe integer。`TransmuteMaterialSlotCount`: 整数 [1, 8]。`BrewingFuelCharges`: 整数 [0, 20]。 |

## 1. ブランデッド型（identifiers / quantities）

```typescript
type WorldId = string & Brand.Brand<"WorldId">;
type StageId = string & Brand.Brand<"StageId">;
type ResourceLocation = string & Brand.Brand<"ResourceLocation">;
type TagLocation = string & Brand.Brand<"TagLocation">;
type VanillaResourcePath = string & Brand.Brand<"VanillaResourcePath">;
type StackCount = number & Brand.Brand<"StackCount">; // 1..MAX_STACK_COUNT (99)
type DeltaTimeSecs = number & Brand.Brand<"DeltaTimeSecs">;
type MonotonicTimeSecs = number & Brand.Brand<"MonotonicTimeSecs">;
type FixedDurationSecs = number & Brand.Brand<"FixedDurationSecs">;
type SimulationTick = number & Brand.Brand<"SimulationTick">;
type InterpolationFraction = number & Brand.Brand<"InterpolationFraction">;
type SessionEpoch = string & Brand.Brand<"SessionEpoch">;
type NonNegativeTickCount = number & Brand.Brand<"NonNegativeTickCount">;
type PositiveTickCount = number & Brand.Brand<"PositiveTickCount">;
type CooldownSeconds = number & Brand.Brand<"CooldownSeconds">; // finite, > 0
type ConsumeSeconds = number & Brand.Brand<"ConsumeSeconds">; // finite, >= 0
type EpochMillis = number & Brand.Brand<"EpochMillis">;

const VanillaResourcePath(value: string): VanillaResourcePath;
const vanillaId: (name: VanillaResourcePath) => ResourceLocation;

const MAX_STACK_COUNT = 99;
```

いずれも `Brand.make` によるコンストラクタを同名で公開する（値と型の両方）。`ResourceLocation` は namespace を省略でき、検証後も入力文字列をそのまま保持する（`minecraft:entity.generic.eat`、`entity.generic.eat`、`sulfur_cube_archetype/regular` など）。`VanillaResourcePath` は namespace と `minecraft:` を含まない vanilla path を検証し、`vanillaId` は検証済み path に `minecraft:` を付ける。
`TagLocation` は同じ resource location の前に必須の `#` を付けた形式（`#minecraft:mineable/pickaxe`、
`#sulfur_cube_archetype/regular` など）を受け付ける。

**なぜ kernel か**: `WorldId` は `mc-save` が保存キーに使い、`mc-sim` がセッション管理に使い、`mc-compose` がワールド選択に使う。
どこか 1 つに置けば他の 2 つがそのリポジトリに依存することになり、依存グラフが壊れる。
`StackCount` も同様に `mc-sim`（インベントリ状態）と `mx-ui`（表示）と `mx-gameplay`（ドロップ）が同じ制約を共有する必要がある。

**時間・持続時間の型を分けている理由**: `DeltaTimeSecs`（フレーム差分）/ `MonotonicTimeSecs`（単調時計）/ `FixedDurationSecs`（固定 tick の長さ）/ `SimulationTick`（論理 tick 番号）/ `InterpolationFraction`（`[0, 1)` の補間率）/ `CooldownSeconds`（正の使用間隔）/ `ConsumeSeconds`（非負のアイテム使用時間）/ `EpochMillis`（壁時計）は数値を表す。`SessionEpoch` は文字列を表すセッション世代である。これらを混同するとバグになる。特に `MonotonicTimeSecs` と `EpochMillis` の混同は
「セーブのタイムスタンプがプロセス起動からの経過秒になる」類の事故を生む。

## 2. 座標系と AABB（coordinates）

```typescript
const CHUNK_SIZE_XZ = 16

type PositionAxis = number & Brand.Brand<'PositionAxis'> // 有限な連続座標
type BlockAxis = number & Brand.Brand<'BlockAxis'>       // 格子座標の 1 軸（safe integer）
type ChunkAxis = number & Brand.Brand<'ChunkAxis'>       // チャンク座標の 1 軸（safe integer）
type LocalAxis = number & Brand.Brand<'LocalAxis'>       // チャンク内ローカル（0..15）

const PositionAxis: Brand.Constructor<PositionAxis>
const BlockAxis: Brand.Constructor<BlockAxis>
const ChunkAxis: Brand.Constructor<ChunkAxis>
const LocalAxis: Brand.Constructor<LocalAxis>

type Position      = { readonly x: PositionAxis; readonly y: PositionAxis; readonly z: PositionAxis } // 連続座標
type BlockPosition = { readonly x: BlockAxis; readonly y: BlockAxis; readonly z: BlockAxis }
type BlockFace = 'down' | 'up' | 'north' | 'south' | 'west' | 'east'
type ChunkCoord    = { readonly cx: ChunkAxis; readonly cz: ChunkAxis }
type LocalBlockCoord = { readonly lx: LocalAxis; readonly ly: BlockAxis; readonly lz: LocalAxis }
type AABB          = { readonly min: Position; readonly max: Position }
type CoordinateConversionFailure = { readonly _tag: 'CoordinateConversionFailure'; readonly reason: 'block-axis-out-of-range'; readonly axis: 'x' | 'y' | 'z'; readonly kind: 'RangeError' }
type BlockNeighbourFailure = { readonly _tag: 'BlockNeighbourFailure'; readonly kind: 'TypeError' | 'RangeError'; readonly reason: 'unknown-face' | 'coordinate-overflow'; readonly message: string }

const position: (x: PositionAxis, y: PositionAxis, z: PositionAxis) => Position
const blockPosition: (x: BlockAxis, y: BlockAxis, z: BlockAxis) => BlockPosition
const chunkCoord: (cx: ChunkAxis, cz: ChunkAxis) => ChunkCoord
const BLOCK_FACES: readonly ['down', 'up', 'north', 'south', 'west', 'east']
const HORIZONTAL_BLOCK_FACES: readonly ['west', 'east', 'north', 'south']
const isBlockFace: (value: unknown) => value is BlockFace
const oppositeBlockFace: (face: unknown) => Result.Result<BlockFace, BlockNeighbourFailure>
const adjacentBlockPosition: (source: BlockPosition, face: unknown) => Result.Result<BlockPosition, BlockNeighbourFailure>
const horizontalBlockNeighbours: (source: BlockPosition) => Result.Result<readonly [
  west: BlockPosition,
  east: BlockPosition,
  north: BlockPosition,
  south: BlockPosition,
], BlockNeighbourFailure>
const blockNeighbours: (source: BlockPosition) => Result.Result<readonly [
  down: BlockPosition,
  up: BlockPosition,
  north: BlockPosition,
  south: BlockPosition,
  west: BlockPosition,
  east: BlockPosition,
], BlockNeighbourFailure>
const blockPositionOfPosition: (value: Position) => Result.Result<BlockPosition, CoordinateConversionFailure>
const chunkCoordOfBlock: (value: BlockPosition) => ChunkCoord
const localCoordOfBlock: (value: BlockPosition) => LocalBlockCoord
const blockPositionOfChunkLocal: (chunk: ChunkCoord, local: LocalBlockCoord) => Result.Result<BlockPosition, CoordinateConversionFailure>
const aabb: (firstCorner: Position, secondCorner: Position) => AABB
const aabbOfBlock: (value: BlockPosition) => AABB
const aabbIntersects: (firstBox: AABB, secondBox: AABB) => boolean
const aabbContainsPoint: (box: AABB, point: Position) => boolean
```

`BLOCK_FACES` は `down, up, north, south, west, east` の順を契約として固定する。
`HORIZONTAL_BLOCK_FACES` は既存 gameplay 規則と互換な `west, east, north, south` の順を固定する。
北は -Z、西は -X であり、近傍探索を実行ごとに同じ順序に保つ。

`Position` は連続座標、`BlockPosition` はブロック格子上の座標を表す。両方を `{x,y,z}` で表すと、足元原点と AABB 中心の Y 規約を取り違えても型検査で検出できず、位置ずれが実行時まで残る。各軸は専用ブランドで分かれ、数値をそのまま `position`、`blockPosition`、`chunkCoord` に渡すことはできない。`BlockAxis` / `ChunkAxis` は safe integer、`LocalAxis` は 0..15 の整数、`PositionAxis` は有限数を受け付ける。
`blockPositionOfPosition` は各軸に `Math.floor` を適用するため、`-0.2` は `-1` のセルになる。整数軸が safe integer の範囲を外れると `CoordinateConversionFailure` を返す。`aabbIntersects` は面が触れるだけなら `false`、`aabbContainsPoint` は境界上の点を含めて `true` を返す。

### 2-bis. 座標のキー化（coordinate-keys）

`Map` のキーや保存フォーマットに座標を使うリポジトリ（チャンクストア、dirty 集合、ネットワーク差分）向けの
正準文字列表現。

```typescript
type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>   // 正準形式 "x,y,z"
type ChunkKey         = string & Brand.Brand<'ChunkKey'>           // 正準形式 "cx,cz"
type CoordinateKeyFailure = { readonly _tag: 'CoordinateKeyFailure'; readonly kind: 'TypeError'; readonly reason: 'invalid-block-position-key' | 'invalid-chunk-key'; readonly message: string; readonly value?: unknown }

const blockPositionKeyOf(value: BlockPosition): BlockPositionKey
const BlockPositionKey(value: unknown): Result.Result<BlockPositionKey, CoordinateKeyFailure>
const isBlockPositionKey(value: unknown): value is BlockPositionKey
const blockPositionOfKey(value: BlockPositionKey): Result.Result<BlockPosition, CoordinateKeyFailure>
const decodeBlockPositionKey(value: unknown): BlockPosition | undefined  // 未検証の外部入力専用

const chunkKeyOf(value: ChunkCoord): ChunkKey
const ChunkKey(value: unknown): Result.Result<ChunkKey, CoordinateKeyFailure>
const isChunkKey(value: unknown): value is ChunkKey
const chunkCoordOfKey(value: ChunkKey): Result.Result<ChunkCoord, CoordinateKeyFailure>
const decodeChunkKey(value: unknown): ChunkCoord | undefined
```

**正準形は 1 つだけ。** `"1,2,3"` は valid だが `"01,2,3"` や `" 1,2,3"` は invalid である。
整数の再文字列化と入力テキストが一致することを要求する（`hasCanonicalIntegerText`）。
これにより同じ座標は常に同じキー文字列になり、キーの文字列比較がそのまま座標の等価性比較になる。
数値からキーを作るときは負の 0 を `normalizeZero` で `0` に畳む。文字列キーの `-0` 表記は正準形ではないため拒否し、`0` と `-0` が別のキーになることを防ぐ。

## 3. ブロック語彙（block-type）

```typescript
const BLOCK_TYPES = ['air', 'stone', ..., 'snow'] as const
type BlockType = (typeof BLOCK_TYPES)[number]
const isBlockType = (value: unknown): value is BlockType
```

このリポジトリの現行 `BLOCK_TYPES` roster は 123 種である。

ブロックの追加は語彙だけの変更ではない。挙動は名前ではなく能力から読むため、消費側のコードは通常変えずに済む。一方、新しいリテラルごとに安定した ID と、能力・属性を持つレジストリ行が必要である。

`BlockType` は網羅性チェックのための語彙であり、セーブ形式（`mc-save`）・メッシュ（`mc-meshing`）・物理（`mc-physics`）・ルール（`mx-gameplay`）が同じ集合を必要とする。語彙と能力モデルを同じリポジトリに置くことで、追加した block を各 consumer が同じ型として使える。

### 3-1. 数値ブロック ID と空気判定（block-registry）

```typescript
type BlockId = number & Brand.Brand<"BlockId">;
const BLOCK_ID_MAX = 0xffff; // レジストリが割り当てる ID の上限。BlockState は 2 バイト要素で最大 0xffff まで保存できる
const AIR_BLOCK_ID: BlockId = 0;
const isEmpty: (id: BlockId) => boolean;
```

`BlockId` はレジストリ行に割り当てる安定した数値 ID である。`BLOCK_ID_MAX` は
`BlockState` が格納できる unsigned 16-bit の上限（65535）であり、現在の registry で
割り当て済みの最大 ID とは異なる。能力・プロパティの lookup table は登録済み ID の範囲で
構築されるため、まだ登録されていないが `BlockId` の範囲内にある値は既定値へ解決する。
65535 を超える ID を使うには chunk format の幅を変える必要がある。

`isEmpty` は `BlockId` を受け取る。空気は ID 0 だけであり、判定はレジストリ lookup ではなく定数比較で行う。

### 3-1-bis. 数値 ID ↔ 語彙の変換とホットパス lookup（block-registry / block-registry-indexes）

```typescript
type BlockRegistryEntry = { readonly id: BlockId; readonly definition: BlockDefinition }
const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry>   // 123 行、id 昇順
const BLOCK_IDS: ReadonlyArray<BlockId>                    // BLOCK_REGISTRY から取り出した id 列
const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType>   // レジストリに行が無い語彙（現状は空）

type BlockRegistryResolutionFailure = BlockDefinitionFailure | BlockCapabilityFailure | BlockPropertyFailure | Brand.BrandError
type BlockRegistryIndexFailure = BlockRegistryFailure | BlockRegistryResolutionFailure
const blockIdOf(type: BlockType): Option.Option<BlockId>
const blockTypeOfId(id: BlockId): Result.Result<BlockType | undefined, BlockRegistryResolutionFailure>
const isKnownBlockId(id: BlockId): Result.Result<boolean, BlockRegistryResolutionFailure>
const resolvedBlockOfId(id: BlockId): Result.Result<ResolvedBlock | undefined, BlockRegistryResolutionFailure>
```

`blockTypeOfId` はブロック名だけを返し、`resolvedBlockOfId` は解決済み定義全体を返す。どちらも未登録の ID には成功値 `undefined` を返す。

ブロックレジストリの安定した公開 import path は `@nerima-games/mc-kernel/domain/block-registry` である。Fluid の lookup は `@nerima-games/mc-kernel/domain/fluid` から利用できる（§5-sexies）。

**チャンクバイトから直接読む関数群。** いずれも `resolveBlock` で定義を都度組み立てるのではなく、
`BLOCK_REGISTRY` から起動時に一度だけ構築した `Uint8Array` / `ReadonlySet` の列を引く。
チャンク全体のメッシュ生成・光伝播・落下判定など、ブロックあたり 1 回以上呼ばれるホットパス向け。

```typescript
const capabilityOfBlockId(id: BlockId, flag: BlockCapabilityFlag): Result.Result<boolean, BlockRegistryResolutionFailure>
const capabilitiesOfBlockId(id: BlockId): Result.Result<BlockCapabilities, BlockRegistryResolutionFailure>
const propertyOfBlockId<K extends BlockPropertyName>(id: BlockId, name: K): Result.Result<BlockProperties[K], BlockRegistryResolutionFailure>
const opacityOfBlockId(id: BlockId): Result.Result<BlockOpacity, BlockRegistryResolutionFailure>
const lightEmissionOfBlockId(id: BlockId): Result.Result<LightLevel, BlockRegistryResolutionFailure>
const transmitsLight(id: BlockId): Result.Result<boolean, BlockRegistryResolutionFailure>
const supportRuleOfBlockId(id: BlockId): Result.Result<SupportRule, BlockRegistryResolutionFailure>
const isSupportSensitiveBlockId(id: BlockId): Result.Result<boolean, BlockRegistryResolutionFailure>
const canBlockStaySupported(id: BlockId, supportBelow: BlockId): Result.Result<boolean, BlockRegistryIndexFailure>
const blockIdsWithCapability(flag: BlockCapabilityFlag): Result.Result<Option.Option<ReadonlySet<BlockId>>, BlockRegistryResolutionFailure>
const blockIdsWithOpacity(opacity: BlockOpacity): Result.Result<Option.Option<ReadonlySet<BlockId>>, BlockRegistryResolutionFailure>
```

未知の `id`（登録済み範囲外、または範囲内でも空き番）に対する既定の答えは一貫して
「普通の不透明立方体」である。`capabilitiesOfBlockId` / `propertyOfBlockId` 系は
`BLOCK_CAPABILITY_DEFAULTS` / `BLOCK_PROPERTY_DEFAULTS` にフォールバックし、
`isKnownBlockId` / `isSupportSensitiveBlockId` は `false` を成功値として返す。これらの lookup は
`Result` を返し、組み込み registry 定義の解決に失敗した場合は `BlockRegistryResolutionFailure` になる。
§4-3-bis の `dropOfBlockId` は未知の `id` に対して成功値 `undefined` を返す（理由はそちらに書いてある）。

`blockIdsWithCapability` / `blockIdsWithOpacity` は `Set` を毎回組み立てず、起動時に構築した
同一インスタンスを `Result<Option<ReadonlySet<BlockId>>, BlockRegistryResolutionFailure>` で返す。
呼び出し側が変更してはならない共有オブジェクトである。

## 3-bis. アイテム語彙とブロック↔アイテムの橋（item-type / block-item）

```typescript
const ITEM_TYPES = ['stone', 'cobblestone', ..., 'snowball', 'sapling', ..., 'lily_pad'] as const
type ItemType = (typeof ITEM_TYPES)[number]
const isItemType = (value: unknown): value is ItemType

type PlaceableItemType = (ItemType & BlockType) | 'redstone_dust' // 交差 + 名前付き設置例外
const PLACEABLE_ITEM_TYPES / NON_PLACEABLE_ITEM_TYPES / UNITEMISED_BLOCK_TYPES
const isPlaceableItem(item: ItemType): item is PlaceableItemType
const itemOfBlock(block: BlockType): PlaceableItemType | undefined   // 部分関数
const blockOfPlaceableItem(item: PlaceableItemType): BlockType       // 全域、証明済みの設置 item 上だけ
```

`ItemType` をブランデッド文字列でなくリテラル union にする理由は `BlockType` と同じである。**挙動は名前比較ではなく能力から読む**ため、閉じたリテラル集合でそれを機械検査できる。外部文字列の綴り間違いは `isItemType` で拒否する（`isItemType('stik')` は `false`）。このガードは `domain/block-type.ts` と同じ形にしてある。

**`ItemType` は `BlockType` の部分集合ではない。両方向で。**

| 向き                     | 落ちる例                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `ItemType` → `BlockType` | `stick` / `wooden_pickaxe` / `stone_pickaxe` / `iron_helmet` |
| `BlockType` → `ItemType` | `air` / `water` / `lava` / `bedrock` / `snow`                |

`air` が入らないのは[ブロック能力フラグ監査](./capability-flag-audit.md) §6-6（「`AIR` は『ブロックが無い』ことを表す番兵であり能力ではない」）の帰結である。
2 つの union は**交差**するのであって入れ子ではない。`PlaceableItemType` はその交差に
`redstone_dust`（`redstone_wire` を設置する名前付き例外）を加えた型である。
**橋は名前一致を既定とし、設置名の例外は橋自身に置く。** ブロックのアイテム形はブロックと同じ名前を持つ
（`dirt` ブロック → `dirt` アイテム）。同名でないブロックは自分の行でそう言う
（`redstone_wire` ブロック → `redstone_dust` アイテム）。一方、採掘時の文脈依存ドロップ
（`stone` → `cobblestone`、`grass_block` → `dirt`、`glowstone` → `glowstone_dust`）は
引き続きレジストリ行の `drops` が所有する。設置形と破壊ドロップを同じ規則として扱わない。

**`ITEM_TYPES` は現行 205 個。** `ITEM_TYPES` が名前の roster、`ITEM_REGISTRY` がその append-only の数値 identity、`ITEM_IDS` が identity 列である。`itemIdOf` / `itemTypeOfId` は両者の変換を担い、途中挿入や並べ替えで既存 ID を変更してはならない。ブロック形・ドロップ形、つるはし・シャベル・斧・クワ・剣の木/石/鉄/ダイヤ/金/ネザライト tier、鍛造素材・テンプレート、装備境界が必要とする
鉄・ダイヤ・ネザライト防具を語彙として持つ。
kernel は現在の `ItemType` roster に対応する純粋な装備スロット規則・装備スナップショット・耐久遷移を `equipment-data.ts` / `equipment.ts` で所有する。
ただし、このカタログは現在 kernel に表現されているアイテムの範囲であり、全エディション・全バージョンの防具、道具、プレイヤーインベントリを網羅する完全な公式レジストリではない。
プレイヤーインベントリの搬送、所有権、サーバー権威、装備変更のゲームプレイ統合は上位パッケージが所有する。
埋めるのは `BLOCK_TYPES` と同じく加算的である。
綴りは `BLOCK_TYPES` に合わせた `lower_snake_case`。旧呼び出し側の暫定値にあった `UPPER_SNAKE`
（`'OAK_PLANKS'` / `'STICK'`）は、現行の `'oak_planks'` などの `ItemType` 値に置き換える。

### 3-bis-1. アイテムの数値 wire ID（item-registry）

`BlockId` と対になる、アイテム側の永続数値 ID とその 2 バイト wire 表現。

以下の `ReadonlyByteArray` は item registry と chunk codec の内部型であり、公開 export ではない。型の構造を示す。

```typescript
type ReadonlyByteArray = Omit<
  Uint8Array,
  'buffer' | 'byteLength' | 'byteOffset' | 'copyWithin' | 'fill' | 'reverse' | 'set' | 'sort' | 'subarray'
> & { readonly [index: number]: number }
type ItemId = number & Brand.Brand<'ItemId'>
type ItemIdBytes = ReadonlyByteArray & Brand.Brand<'ItemIdBytes'>
type ItemDefinition = { readonly id: ItemId; readonly type: ItemType; readonly maxStackCount: ItemStackLimit }

const ITEM_ID_MAX = 0xffff   // unsigned 16-bit
const ITEM_ID_BYTES = 2

const ITEM_REGISTRY: ReadonlyArray<ItemDefinition>   // ITEM_TYPES と同じ並び、配列添字が id
const ITEM_IDS: ReadonlyArray<ItemId>

const isKnownItemId(id: number): id is ItemId
function itemDefinitionOf(type: ItemType): ItemDefinition
function itemDefinitionOf(type: unknown): ItemDefinition | undefined
const maxStackCountOfItem(type: ItemType): ItemStackLimit
const itemIdOf(type: ItemType): ItemId
const itemTypeOfId(id: ItemId): ItemType

const encodeItemId(type: ItemType): ItemIdBytes         // network byte order（big-endian）で書き出す
type ItemRegistryFailure = ItemValidationFailure
const decodeItemId(bytes: ItemIdBytes): Result.Result<ItemType, ItemRegistryFailure>
const ItemIdBytes(bytes: Uint8Array | ItemIdBytes): Result.Result<ItemIdBytes, ItemRegistryFailure> // 長さと既知 id を検証し、入力を所有する constructor
```

`ItemIdBytes` は読み出し専用の branded byte view であり、`buffer` / `byteLength` / `byteOffset` や
書き込みメソッドを公開しない。可変な `Uint8Array` を渡した場合も constructor が検証済みの内容をコピーするため、
呼び出し側の後続変更は保存値に波及しない。可変なバイト列が必要なら `slice()` で明示的にコピーを取り出す。

**id は `ITEM_TYPES` の配列添字であり、密かつ追加専用（append-only）。** 新しいアイテムは必ず
`ITEM_TYPES` の末尾に足す。途中挿入や並べ替えは既存の全 id を付け替える破壊的変更になる。
`BlockId` の許容範囲は `BLOCK_ID_MAX` が定める 0..65535 であり、chunk では各要素を 2 バイトで保存する。`ItemId` は
`unsigned 16-bit`（0..65535）を確保してあり、205 種の現行語彙に対して十分な余裕を持つ。

`maxStackCountOfItem` は vanilla の上限に従い、通常は 64、雪玉・エンダーパール・バケツ等は 16、
道具・防具・薬品・ボート等は 1 を返す。
`maxStackCountForItem` は item-stack subpath の同じ item 上限 lookup で、両関数は `itemComponents` が解決する item component の既定値を返す。stack ごとの `max_stack_size` がある場合は `maxStackCountForStack` がそちらを優先する。

### 3-bis-2. Java の `minecraft:tool` component

`ToolComponent`はJava Editionのtool componentを値として表す。kernelはruleを検証・コンパイルし、ブロックとtag membershipに対する道具の採掘プロパティを解決する。採掘時間の計算やプレイヤー操作の進行は含まない。

採掘速度と耐久消費には意味ごとのブランド型を使う。

契約の一次資料は[Java 24w12aの`minecraft:tool`](https://www.minecraft.net/en-us/article/minecraft-snapshot-24w12a)と、`can_destroy_blocks_in_creative`を追加した[Java 25w02a](https://www.minecraft.net/en-us/article/minecraft-snapshot-25w02a)である。

```typescript
type ToolBlockTag = `#${string}`;
type ToolBlockMatcher = BlockType | ToolBlockTag;
type BlockTagMemberships = ReadonlyMap<ToolBlockTag, ReadonlySet<BlockType>>;
type ToolResolutionContext = {
  readonly blockTags: BlockTagMemberships;
};
type ToolBlockMembershipLike = {
  readonly has: (block: BlockType) => boolean;
  readonly [Symbol.iterator]: () => Iterator<BlockType>;
};
type ToolBlockTagMembershipsLike = {
  readonly get: (tag: ToolBlockTag) => ToolBlockMembershipLike | undefined;
  readonly [Symbol.iterator]: () => Iterator<
    readonly [ToolBlockTag, ToolBlockMembershipLike]
  >;
};
type ToolResolutionContextInput = {
  readonly blockTags: ToolBlockTagMembershipsLike;
};
type ToolRule = {
  readonly blocks: ToolBlockMatcher | ReadonlyArray<ToolBlockMatcher>;
  readonly speed?: ToolMiningSpeed;
  readonly correctForDrops?: boolean;
};
type ToolComponent = {
  readonly rules: ReadonlyArray<ToolRule>;
  readonly defaultMiningSpeed?: ToolMiningSpeed;
  readonly damagePerBlock: ToolDurabilityDamage;
  readonly canDestroyBlocksInCreative?: boolean;
};
type CompiledToolComponent = {
  readonly rules: ReadonlyArray<{
    readonly blockTypes: ReadonlyArray<BlockType>;
    readonly blockTags: ReadonlyArray<ToolBlockTag>;
    readonly speed?: ToolMiningSpeed;
    readonly correctForDrops?: boolean;
  }>;
  readonly defaultMiningSpeed: ToolMiningSpeed;
  readonly damagePerBlock: ToolDurabilityDamage;
  readonly canDestroyBlocksInCreative: boolean;
  readonly hasTagRule: boolean;
};
type ResolvedToolMiningProperties = {
  readonly miningSpeed: ToolMiningSpeed;
  readonly correctForDrops: boolean;
  readonly damagePerBlock: ToolDurabilityDamage;
  readonly canDestroyBlocksInCreative: boolean;
};
const isToolComponent: (value: unknown) => value is ToolComponent;
const compileToolComponent: (component: ToolComponent) => Result.Result<CompiledToolComponent, ItemValidationFailure>;
const resolveToolMiningProperties: (
  component: ToolComponent | CompiledToolComponent,
  block: BlockType,
  context?: ToolResolutionContextInput,
) => Result.Result<ResolvedToolMiningProperties, ItemValidationFailure>;
```

`resolveToolMiningProperties` が受け取る公開引数は `ToolResolutionContextInput` である。`ToolResolutionContext` はその入力を検証し、`ReadonlyMap` と `ReadonlySet` に正規化した内部表現を表す。

`rules` は配列順に評価し、最初に対象ブロックを含む rule の各指定値を採用する。未指定の `speed` は
`defaultMiningSpeed`（既定値 1）へ、未指定の `correctForDrops` は `false` へフォールバックする。
未指定の `canDestroyBlocksInCreative` は公式既定値 `true` へフォールバックする。
`speed` と `defaultMiningSpeed` は有限の 0 以上の数として検証し、`damagePerBlock` は 0 以上の整数として検証する。
公式データの `blocks` は単一の `BlockType`、`BlockType`/`ToolBlockTag` の配列、または `#` 付きタグを受理する。
同じ tool component を繰り返し解決する場合は `compileToolComponent` で一度検証・正規化した `CompiledToolComponent` を作成できる。
コンパイル結果は入力配列から独立した不変スナップショットであり、`resolveToolMiningProperties` にそのまま渡せる。
タグ rule を解決するときは `resolveToolMiningProperties` の第 3 引数に `ToolResolutionContextInput` を渡す。
`blockTags` は `ReadonlyMap<ToolBlockTag, ReadonlySet<BlockType>>` として表現し、実行時には同じ反復可能な Map-like / Set-like 契約も受理する。タグ rule で context を省略すると `ItemValidationFailure` を返し、未登録タグは一致しない。
kernel はタグ名のレジストリやサービスアダプタを仮定せず、タグ membership の純粋な値を解決入力として受け取る。
プレイヤー操作の進行状態、採掘への耐久適用、ドロップ生成、サーバー権威判定は上位 gameplay が統合する。装備スナップショット内の耐久値検証と純粋な減少・破損遷移は kernel の `equipment.ts` が所有する。

### 3-bis-3. Entity 語彙（entity-type）

`entity-type.ts` は `BlockType` / `ItemType` と同じ「閉じたリテラル union + runtime guard」の形で `EntityType` を公開する。
`entity-attributes*.ts` は属性の値域、既定値、modifier適用を提供する。
`EntityState<S>` は位置、体力、`behaviour` を持つ。`Entity<S>` はそこに `id` と `kind` を加える。
spawn/despawn、AI、networkは上位層が扱う。担当する実行時処理は[責務と移行先](./responsibility.md)を参照する。

```typescript
const ENTITY_TYPES: ReadonlyArray<EntityType>; // Minecraft Java Edition 26.3 の entity registry id と同一の閉じた集合
type EntityType = (typeof ENTITY_TYPES)[number];
const isEntityType: (value: unknown) => value is EntityType;
```

Entityの識別と状態には `EntitySerial`、`EntityHealthPoints`、`EntityRosterRepairCount` を使う。`mintEntityId` はブランド付きserialを受け取り、`serialOfEntityId` は `e:<serial>` 形式として有効なIDからブランド付きserialを返す。

```typescript
type EntitySerial = number & Brand.Brand<'EntitySerial'>;
type EntityHealthPoints = number & Brand.Brand<'EntityHealthPoints'>;
type EntityRosterRepairCount = number & Brand.Brand<'EntityRosterRepairCount'>;
const mintEntityId: (serial: EntitySerial) => EntityId;
const serialOfEntityId: (id: EntityId) => EntitySerial | undefined;
type EntityState<S> = Readonly<{
  feetPosition: Position;
  healthPoints: EntityHealthPoints;
  behaviour: S;
}>;
type Entity<S> = EntityState<S> & Readonly<{ id: EntityId; kind: EntityKind }>;
```

**既存の `entity-types.ts`（複数形）が持つ `EntityKind` は、この語彙とは別物として残る。** `EntityKind` は網羅性チェックの効かない開いた branded string で、modding が持ち込む未知の entity 名を受け取るために使う。`EntityType` はその上に載る閉じた語彙であり、`isEntityType` はセーブファイル・ネットワークフレーム・開発者コンソールからの値を検証する。`isBlockType` / `isItemType` と同じ shape で意図的に揃えてある。エンティティ名もブロック・アイテム名と同じ形式で保存するためである。

entity attribute は現在の Java attribute vocabulary、既定値、pure な effective bounciness 計算を公開する。options の検証失敗と brand 構築失敗は `Result` failure として返す。

```typescript
type EntityAttributesFailure = Readonly<{ readonly _tag: 'InvalidEntityAttributeOptions'; readonly value: unknown }> | Brand.BrandError;
type EffectiveBouncinessFailure = Readonly<{ readonly _tag: 'InvalidBounciness'; readonly block: number; readonly entity: number }>;
const entityAttributes: (options?: EntityAttributeOptions) => Result.Result<EntityAttributes, EntityAttributesFailure>;
const DEFAULT_ENTITY_ATTRIBUTES: EntityAttributes;
const entityAttributeDefinitionOf: (name: EntityAttributeName) => EntityAttributeDefinition;
const effectiveBounciness: (block: number, entity: number) => Result.Result<Bounciness, EffectiveBouncinessFailure>;
```

`isEntityAttributeOptions` と `isEntityAttributes` は unknown 入力の guard である。属性の適用、tick 更新、entity lifecycle は上位層の責務とする。

### 3-ter-1. ItemStack とレシピ

`ItemStack` は `item` / `count` / 解決済み `components` の3フィールドだけを持つ不変値であり、`itemStack` がアイテムごとの最大スタック数と数量 `1..max` を検証する。数量 0 は `ItemStack` に格納せず、空の `ItemSlot`（`undefined`）で表す。`itemStack` は item の既定 component または `options.components` を基底にし、`options.componentPatch` があれば適用してから解決済み `components` として格納する。patch や未解決の payload を `ItemStack` のフィールドや sidecar として保持しない。
耐久値やエンチャントは component に含め、`ItemStack` の独立したトップレベルフィールドにはしない。インベントリの搬送、所有権、装備状態はこの型に含めない。

```typescript
type ItemStack = {
  readonly item: ItemType;
  readonly count: StackCount;
  readonly components: ItemComponents;
};
type ItemSlot = ItemStack | undefined;
type Slot = ItemSlot;

type ItemStackOptions = Readonly<{
  readonly components?: ItemComponents;
  readonly componentPatch?: ItemComponentPatch;
}>;
type ItemValidationFailure = Readonly<{ readonly _tag: 'ItemValidationFailure'; readonly kind: 'TypeError' | 'RangeError' | 'InputError'; readonly reason: 'invalid-type' | 'out-of-range' | 'invalid-value' | 'hostile-input'; readonly field: string; readonly message: string; readonly value?: unknown }>;
type ItemStackFailure = ItemValidationFailure | ItemComponentPatchDecodeError | TextComponentFailure;
const itemStack: (item: ItemType, count: StackCount, options?: ItemStackOptions) => Result.Result<ItemStack, ItemStackFailure>;
const itemStackFromUnknown: (item: unknown, count: unknown, options?: unknown) => Result.Result<ItemStack, ItemStackFailure>;
const isItemStack: (value: unknown) => value is ItemStack;
const maxStackCountForItem: (item: ItemType) => ItemStackLimit;
const itemStackEqualsIgnoringCount: (left: ItemStack, right: ItemStack) => boolean;
const itemStacksCanMerge: (left: ItemStack, right: ItemStack) => boolean;
const itemStackWithCount: (stack: ItemStack, count: StackCount) => Result.Result<ItemStack, ItemStackFailure>;
const transmuteItemStack: (source: ItemStack, result: ItemStack, count?: StackCount) => Result.Result<ItemStack, ItemStackFailure>;
const splitItemStack: (stack: ItemStack, amount: TransferQuantity) => Result.Result<{ readonly taken: ItemStack; readonly remainder: ItemSlot }, ItemStackFailure>;
const mergeItemStacks: (left: ItemStack, right: ItemStack) => Result.Result<{ readonly merged: ItemStack; readonly remainder: ItemSlot }, ItemStackFailure>;
const TransferQuantity: Brand.Constructor<TransferQuantity>; // split/merge の移送量 1..99
type ItemComponentPatchConflict = Readonly<{ readonly _tag: 'ItemComponentPatchConflictError'; readonly componentKey: NamespacedResourceLocation }>;
const ItemComponentPatchConflictError: (args: Readonly<{ readonly componentKey: string }>) => Result.Result<ItemComponentPatchConflict, ItemComponentPatchDecodeError>;
```

`itemStack` accepts the branded `StackCount`; `itemStackFromUnknown` validates untrusted item, count, and options values.
Both return `ItemStackFailure` for invalid data. `decodeItemComponentPatch` and `mergeItemComponentPatches`
return `ItemComponentPatchDecodeError` values for invalid patches or set/remove conflicts. `ItemComponentPatchConflictError` is a
Result-returning factory whose success value contains a branded `NamespacedResourceLocation`.



### 3-ter-2. アイテム耐久値データ

`itemDurabilityDefinitionFor`は、`ItemType`から静的な最大耐久値定義を引くAPIである。耐久値定義がないアイテムには`undefined`を返す。装備stateや装備の状態遷移はこのAPIには含まれない。

```typescript
const itemDurabilityDefinitionFor: (
  item: ItemType,
) => ItemDurabilityDefinition | undefined;
```

この関数は`@nerima-games/mc-kernel`のrootからimportする。定義元の`src/domain/item/equipment-data.ts`はソースパスであり、公開import pathではない。

レシピ型は `shaped` と `shapeless` の 3×3 グリッド、ステーション tag、材料 item または tag、優先度を値で表す。
`shapedRecipe` と `shapelessRecipe` はレシピ値を作り、`ingredientMatches` は材料を照合する。
通常クラフトの実行時照合と適用は `mc-sim` の責務である（[実行時処理の所有元](./responsibility.md)）。

```typescript
const VANILLA_CRAFTING_RECIPES: ReadonlyArray<Recipe>;
type RecipePatternKeyMap = Readonly<Record<RecipePatternSymbol, CraftingIngredientInput>>;
type RecipeOptions = {
  readonly assumeSymmetry?: boolean;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroup;
  readonly priority?: RecipePriority;
  readonly showNotification?: boolean;
  readonly tags?: ReadonlyArray<RecipeStationTag>;
};
const exactly: (item: ItemType, count?: RecipeIngredientCount) => Result.Result<ExactIngredient, RecipeFailure>;
const tagged: (tag: RecipeItemTag, count?: RecipeIngredientCount) => Result.Result<ItemTagIngredient, RecipeFailure>;
const anyOf: (options: ReadonlyArray<IngredientInput>, count?: RecipeIngredientCount) => Result.Result<AnyOfIngredient, RecipeFailure>;
const craftingIngredient: (value: unknown) => Result.Result<CraftingIngredient, RecipeFailure>;
const ingredientMatches: (ingredient: CraftingIngredient, item: ItemType, itemTags?: ItemTagMemberships) => Result.Result<boolean, RecipeFailure>;
const shapedRecipe: (id: RecipeId, rows: ReadonlyArray<RecipePatternRow>, key: RecipePatternKeyMap, output: ItemStack, options?: RecipeOptions) => Result.Result<ShapedRecipe, RecipeFailure>;
const shapelessRecipe: (id: RecipeId, ingredients: ReadonlyArray<CraftingIngredientInput>, output: ItemStack, options?: RecipeOptions) => Result.Result<ShapelessRecipe, RecipeFailure>;
const craftGrid: (width: RecipeGridDimension, height: RecipeGridDimension, items: ReadonlyArray<CraftGridInput>) => Result.Result<CraftGrid, RecipeFailure>;
const cellAt: (grid: CraftGrid, x: RecipeGridIndex, y: RecipeGridIndex) => Slot;
const brewingOutput: (recipe: BrewingRecipe) => Result.Result<ItemStack, RecipeFailure>;
```

`VANILLA_CRAFTING_RECIPES` は Minecraft Java Edition 26.3 向けの検証済みデータである。
対応範囲は `test/golden/` と `test/vanilla-26-3.test.ts` に記録した範囲に限る。

入力を検証する recipe builder と recipe value の評価は `RecipeFailure` を返す。失敗は type/range、外部 component、item stack validation に分かれる。

```typescript
type RecipeFailure =
  | { readonly _tag: 'RecipeTypeFailure'; readonly name: 'TypeError'; readonly message: string }
  | { readonly _tag: 'RecipeRangeFailure'; readonly name: 'RangeError'; readonly message: string }
  | { readonly _tag: 'RecipeExternalFailure'; readonly name: string; readonly message: string; readonly componentKey?: string }
  | { readonly _tag: 'RecipeItemFailure'; readonly failure: ItemStackFailure };
```

`craftingDyeRecipe`、`craftingImbueRecipe`、`craftingBannerDuplicateRecipe`、`craftingBookCloningRecipe`、`craftingDecoratedPotRecipe`、`craftingFireworkRocketRecipe`、`craftingFireworkStarFadeRecipe`、`craftingFireworkStarRecipe`、`craftingMapExtendingRecipe`、`craftingShieldDecorationRecipe` はいずれも `Result` と `RecipeFailure` を返す。`staticShapedRecipe` と `staticShapelessRecipe` は型付き静的データ向けで、検証を必要としない入力から直接値を返す。

### 3-ter-3. JSON 値・item component patch・Java recipe JSON

JSON を受け取る境界は `JsonValue`、item component の差分は `ItemComponentPatch`、Java の crafting recipe document は `craftingRecipeFromUnknown` に分離する。
型付きコードでは `unknown` を持ち回らず、decoder の一箇所で有限性・非循環性・plain object・厳格なキー集合を検証する。
`jsonValueFromUnknown` と `decodeItemComponentPatch` は入力を clone/freeze して `Result` で返すため、
呼び出し側の mutable な JSON object を kernel の値として共有しない。

```typescript
type JsonPrimitive = null | boolean | number | string;
type JsonObject = Readonly<{ readonly [key: string]: JsonValue }>;
type JsonValue = JsonPrimitive | ReadonlyArray<JsonValue> | JsonObject;

const isJsonValue: (value: unknown) => value is JsonValue;
type JsonValueFailure = { readonly _tag: 'JsonValueFailure'; readonly kind: 'TypeError'; readonly reason: 'invalid-value' | 'hostile-input'; readonly message: string; readonly value?: unknown };
const jsonValueFromUnknown: (value: unknown) => Result.Result<JsonValue, JsonValueFailure>;
const jsonValuesEqual: (left: JsonValue, right: JsonValue) => boolean;

type ItemComponentPatchKey = string & Brand.Brand<"ItemComponentPatchKey">;
type ItemComponentPatch = Readonly<Record<ItemComponentPatchKey, JsonValue>>;
const ItemComponentPatchKey: Brand.Constructor<ItemComponentPatchKey>;
const isItemComponentPatch: (value: unknown) => value is ItemComponentPatch;
type ItemComponentPatchConflict = Readonly<{ readonly _tag: 'ItemComponentPatchConflictError'; readonly componentKey: NamespacedResourceLocation }>;
type ItemComponentPatchDecodeError = ItemValidationFailure | ItemComponentPatchConflict;
const ItemComponentPatchConflictError: (args: Readonly<{ readonly componentKey: string }>) => Result.Result<ItemComponentPatchConflict, ItemComponentPatchDecodeError>;
const decodeItemComponentPatch: (value: unknown) => Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError>;
const itemComponentPatch: (
  options: Readonly<Record<string, JsonValue>>,
) => Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError>;
const applyItemComponentPatch: (base: ItemComponents, patch: ItemComponentPatch) => Result.Result<ItemComponents, ApplyItemComponentPatchFailure>;
const mergeItemComponentPatches: (left: ItemComponentPatch | undefined, right: ItemComponentPatch | undefined) => Result.Result<ItemComponentPatch | undefined, ItemComponentPatchDecodeError>;
const itemComponentPatchesEqual: (
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
) => boolean;
```

`ItemComponentPatchKey` は namespaced component id に任意の `!` を付けた値で、`!minecraft:foo` はその component の除去を表せる。patch の値は任意の JSON ではなく、
有限・非循環な JSON に限定する。patch は境界でのみ解決し、`ItemStack` は解決済み payload を保持する。stack の merge は解決済み payload を count 無視で比較してから成立し、`splitItemStack` と `mergeItemStacks` は payload を保ったまま新しい snapshot を返す。

`craftingRecipeFromUnknown(id, value)` は現在の Java の `minecraft:crafting_shaped` と `minecraft:crafting_shapeless` を対象に、namespaced な vanilla item id、item tag、item-id の alternative、
pattern/key/ingredients、result の `id` / `count` / `components`、category/group/notification を `Recipe` と `ItemStack` へ変換する。`cookingRecipeFromUnknown` は smelting / blasting /
smoking / campfire cooking、`stonecuttingRecipeFromUnknown` は stonecutting、`smithingRecipeFromUnknown` は smithing transform / trim、`transmuteRecipeFromUnknown` は
crafting transmute を同じ境界で厳格に decode する。これらの結果は `PortableRecipe` として統合できる。

result の `components` は `ItemComponentPatch` になる。`recipeDataPath(id)` は namespaced recipe id を data-pack の canonical path へ変換し、
`recipeDataPackLayer` / `recipeDataPackLayerFromUnknown` / `selectRecipes` は recipe id 付きの data-pack layer と format・priority による選択を提供する。
旧 object-form ingredient、tag を含む alternative array、未知の recipe type、非 vanilla item、各 recipe type の未知キーは decoder で拒否する。
`crafting_dye` / `crafting_imbue` と個別の special recipe type も decode できる（§3-ter-4）。
全 recipe type・全 edition/version の完全な registry、JSON ファイルの読み出し、pack の適用順序は data-pack layer と上位層が所有する。

```typescript
const craftingRecipeFromUnknown: (id: NamespacedResourceLocation, value: unknown) => Result.Result<Recipe, RecipeFailure>;
const cookingRecipeFromUnknown: (id: NamespacedResourceLocation, value: unknown) => Result.Result<PortableRecipe, RecipeFailure>;
const stonecuttingRecipeFromUnknown: (
  id: NamespacedResourceLocation,
  value: unknown,
) => Result.Result<PortableRecipe, RecipeFailure>;
const smithingRecipeFromUnknown: (id: NamespacedResourceLocation, value: unknown) => Result.Result<PortableRecipe, RecipeFailure>;
const transmuteRecipeFromUnknown: (
  id: NamespacedResourceLocation,
  value: unknown,
) => Result.Result<PortableRecipe, RecipeFailure>;
const portableRecipeFromUnknown: (id: NamespacedResourceLocation, value: unknown) => Result.Result<PortableRecipe, RecipeFailure>;
const recipeFromUnknown: typeof portableRecipeFromUnknown;
const recipeDataPath: (id: NamespacedResourceLocation) => Result.Result<DataPackResourcePath, RecipeFailure | DataPackRegistryFailure>;
const craftingRecipeDataPath: typeof recipeDataPath;
const recipeDataPackLayer: (
  options: RecipeDataPackLayerOptions,
) => Result.Result<RecipeDataPackLayer, DataPackRegistryFailure | RecipeFailure>;
const recipeDataPackLayerFromUnknown: (value: unknown) => Result.Result<RecipeDataPackLayer, DataPackRegistryFailure | RecipeFailure>;
const selectRecipes: (
  layers: ReadonlyArray<RecipeDataPackLayer>,
  format: DataPackFormat,
) => ReadonlyMap<NamespacedResourceLocation, PortableRecipe>;
```

root のほか `@nerima-games/mc-kernel/domain/json-value`、`domain/item-component-patch`、`domain/recipe-json`、`domain/recipe-registry` subpath から利用できる。recipe result の item
stack/components は [Minecraft Snapshot 24w10a](https://www.minecraft.net/pt-pt/article/minecraft-snapshot-24w10a) の item stack component 変更を、stonecutting / smithing /
transmute の現在の JSON schema は [Minecraft Java Edition 26.1](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-1) を参照する。

`mergeItemComponentPatches` validates both patches at the boundary and returns `ItemComponentPatchDecodeError`
for invalid input, hostile input, or set/remove conflicts. Its success value is `undefined` only when both inputs
are `undefined`.

### 3-ter-4. special recipe（crafting-special）

特殊クラフトは 10 種の `CraftingSpecialRecipe` で表す。kernel は各型のコンストラクタと Java 版 recipe JSON decoder を公開する。
実行時の照合と適用は `mc-sim` の責務である（[実行時処理の所有元](./responsibility.md)）。

```typescript
type CraftingSpecialRecipe =
  | CraftingDyeRecipe
  | CraftingImbueRecipe
  | CraftingBannerDuplicateRecipe
  | CraftingBookCloningRecipe
  | CraftingDecoratedPotRecipe
  | CraftingFireworkRocketRecipe
  | CraftingFireworkStarFadeRecipe
  | CraftingFireworkStarRecipe
  | CraftingMapExtendingRecipe
  | CraftingShieldDecorationRecipe;
```

レシピ値は `craftingDyeRecipe`、`craftingBannerDuplicateRecipe` などのコンストラクタで作る。
`id`、`category`、`priority`、`tags` を構築時に検証し、`options` に object 以外を渡すと拒否する。

- **バナー複製は元のバナーを消費しない。** 消えるのは無地の複製先だけで、模様を持つ側は grid に残る。
  ここが他の 2 入力 special recipe と違う唯一の点である。
- **本の複製は generation を 1 つ進め、recipe の `allowedGenerations` の外にある本を拒否する。**
  出力数は紙の枚数で決まり、出力スタック上限を超える組み合わせは一致しない。
- **花火の色は染料テーブルから引く。** 赤は `#ff0000` ではなく vanilla の `#b02e26` である。

書き込まれた本のページとタイトルは JSON text component であり、素の文字列を受け付けるのは
writable book の側だけである。

`craftingDyeRecipeFromUnknown`、`craftingImbueRecipeFromUnknown`、
`craftingBannerDuplicateRecipeFromUnknown`、`craftingBookCloningRecipeFromUnknown`、
`craftingDecoratedPotRecipeFromUnknown`、`craftingFireworkRocketRecipeFromUnknown`、
`craftingFireworkStarFadeRecipeFromUnknown`、`craftingFireworkStarRecipeFromUnknown`、
`craftingMapExtendingRecipeFromUnknown`、`craftingShieldDecorationRecipeFromUnknown` は、
それぞれの Java document を厳格に読み、`Result` の失敗を `RecipeFailure` で返す。どれも type 不一致・必須キー欠落・未知キーを拒否する。
`portableRecipeFromUnknown` はこれらも含めて dispatch する。

root と `@nerima-games/mc-kernel/domain/recipe`、`@nerima-games/mc-kernel/domain/crafting-special-data` の subpath から利用できる。GUI、スロット搬送、経験値、サーバー権威は上位層の責務である。

### 3-ter-5. vanilla item tag membership（tag-membership）

`tag-membership.ts` は同梱の item roster 範囲での vanilla item tag membership と、data pack layer による拡張を公開する。JSON の読み出しと pack filesystem の所有は上位層の責務である。

```typescript
type VanillaItemTagMembershipEntry = {
  readonly tag: NamespacedResourceLocation;
  readonly members: ReadonlyArray<ItemType>;
};
const VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES: ReadonlyArray<VanillaItemTagMembershipEntry>;
const VANILLA_ITEM_TAG_MEMBERSHIPS: ItemTagMemberships;

type RecipeItemTag = TagLocation;
type ItemTagMembershipLayer = DataPackLayer<ReadonlySet<ItemType>>;
const itemTagMembershipLayer: (
  options: ItemTagMembershipLayerOptions,
) => Result.Result<ItemTagMembershipLayer, DataPackRegistryFailure>;
const extendItemTagMemberships: (
  base: ItemTagMemberships,
  layers: ReadonlyArray<ItemTagMembershipLayer>,
  format: DataPackFormat,
) => ItemTagMemberships;
const itemTagMembers: (
  memberships: ItemTagMemberships,
  tag: RecipeItemTag,
) => ReadonlySet<ItemType>;
const isTaggedItem: (
  memberships: ItemTagMemberships,
  tag: RecipeItemTag,
  item: ItemType,
) => boolean;
```

**`ingredientMatches`（`recipe-data.ts`）は `itemTags` を省略したときに `VANILLA_ITEM_TAG_MEMBERSHIPS` を使う。** 従来の既定は空の `Map` で tag ingredient は常に不一致だったため、既存呼び出しの一致結果が変わりうる（`docs/versioning.md` の分類では既定値の変更は MAJOR）。収録範囲は同梱 recipe が実際に参照する tag（smithing trim recipe が使う 3 つ）に限られ、全 recipe・全エディションの完全な tag registry ではない。`extendItemTagMemberships` は vanilla のタグファイルの挙動に合わせてレイヤーの追加分を既存メンバーシップへ union する。`domain/data-pack-registry.ts` の `selectDataPackRegistry`（§5-sexies-ter）は最終 priority 勝ちで上書きするため、両者の合成規則は異なる。

### 3-quater. 調理・醸造の静的データと共有state型

kernelは調理・醸造の共有state型、レシピと燃料の静的データ、調理ステーションと醸造の定数を公開する。これらは保存・共有する値の形と参照データであり、stateの構築・遷移、処理結果を計算するAPIではない。

```typescript
type BrewingBottles = readonly [Slot, Slot, Slot];
type BrewingState = {
  readonly bottles: BrewingBottles;
  readonly ingredient: Slot;
  readonly fuel: Slot;
  readonly fuelCharges: BrewingFuelCharges;
  readonly brewProgressSecs: FixedDurationSecs;
};
type BrewingRecipe = {
  readonly _tag: "Brewing";
  readonly id: RecipeId;
  readonly input: ItemType;
  readonly ingredient: ItemType;
  readonly output: ItemType;
};
type BrewingRecipeTable = ReadonlyArray<BrewingRecipe>;

const BREWING_BOTTLE_SLOTS: number;
const BREWING_TIME_SECS: number;
const BREWING_MAX_FUEL_CHARGES: number;
const BREWING_FUEL_ITEM: ItemType;
const VANILLA_BREWING_RECIPES: BrewingRecipeTable;

const COOKING_STATIONS: readonly ["furnace", "blast_furnace", "smoker"];
type CookingStation = (typeof COOKING_STATIONS)[number];
type FurnaceState = {
  readonly station: CookingStation;
  readonly input: Slot;
  readonly fuel: Slot;
  readonly output: Slot;
  readonly fuelTimeRemainingSecs: FixedDurationSecs;
  readonly fuelTimeTotalSecs: FixedDurationSecs;
  readonly cookProgressSecs: FixedDurationSecs;
};
type SmeltingRecipe = {
  readonly _tag: "Smelting";
  readonly id: RecipeId;
  readonly input: ItemType;
  readonly output: ItemStack;
  readonly cookTimeSecs: FixedDurationSecs;
  readonly experience: RecipeExperience;
  readonly stations: ReadonlyArray<CookingStation>;
};
type FuelRule = {
  readonly fuel: ItemType;
  readonly burnTimeSecs: FixedDurationSecs;
};
const VANILLA_SMELTING_RECIPES: ReadonlyArray<SmeltingRecipe>;
const VANILLA_FUEL_RULES: ReadonlyArray<FuelRule>;
```

`BrewingState`と`FurnaceState`はblock entityの共有データ型でもある。静的データはrootまたは実在する`@nerima-games/mc-kernel/domain/recipe` subpathからimportできる。

### Dimension

`Dimension` は vanilla の Overworld・Nether・End に限定した共有語彙で、`isDimension` は保存データやネットワーク入力の runtime guard である。

```typescript
const DIMENSIONS: readonly ["overworld", "nether", "end"];
type Dimension = "overworld" | "nether" | "end";
const isDimension: (value: unknown) => value is Dimension;
```

### 石切台と鍛造

石切台と鍛造の実行時照合と適用は `mc-sim` の責務である（[実行時処理の所有元](./responsibility.md)）。
recipe JSON decoder は §3-ter-3 を参照する。

### 3-quater-bis. 食料の静的定義（food-data）

`FoodDefinition`と`FoodEffect`は食料の栄養値、saturation、食用条件、効果、`use_remainder`を記述する静的データ型である。`VANILLA_FOOD_DEFINITIONS`は現在の`ItemType` rosterで表現できる定義表を提供する。全edition・versionを網羅するregistryではない。食料の摂取処理やvitalsの更新はkernelの公開APIに含まれない（[実行時処理の所有元](./responsibility.md)）。

```typescript
type FoodDefinition = Readonly<{
  readonly item: ItemType;
  readonly nutrition: FoodNutrition;
  readonly saturation: FoodSaturation;
  readonly canAlwaysEat: boolean;
  readonly useRemainder: ItemType | undefined;
  readonly effects: ReadonlyArray<FoodEffect>;
}>;
type FoodEffect = FoodStatusEffect | FoodRemoveEffect | FoodTeleportEffect;
const VANILLA_FOOD_DEFINITIONS: ReadonlyArray<FoodDefinition>;
```

このデータはroot exportから利用する。

### 3-quater-ter. アイテムコンポーネント（food / consumable / use_remainder / use_cooldown）

Minecraft Java Edition 26.3 の item component 境界に合わせ、`food` は栄養値・saturation・`can_always_eat` を持つデータコンテナ、`consumable` は使用時間・アニメーション・音・粒子・使用後効果を持つ使用動作、`use_remainder` は使用後に残るスタック、`use_cooldown` は使用間隔として分離する。`FoodDefinition` は同梱の静的な食料表をこの 4 コンポーネントへ投影する。

```typescript
const DEFAULT_CONSUMABLE_COMPONENT: ConsumableComponent;
const consumableStatusEffect: (
  effectId: ResourceLocation,
  durationSecs: EffectDurationSecs,
  amplifier: EffectAmplifier,
) => Result.Result<ConsumableStatusEffect, ItemValidationFailure>;
const consumableApplyEffects: (
  effects: ReadonlyArray<ConsumableStatusEffect>,
  probability?: FoodEffectProbability,
) => Result.Result<ConsumableApplyEffects, ItemValidationFailure>;
const consumableRemoveEffects: (
  effects: ReadonlyArray<ResourceLocation>,
) => Result.Result<ConsumableRemoveEffects, ItemValidationFailure>;
const consumableClearAllEffects: () => Result.Result<ConsumableClearAllEffects, ItemValidationFailure>;
const consumableTeleportRandomly: (
  diameter?: RandomTeleportDiameter,
) => Result.Result<ConsumableTeleportRandomly, ItemValidationFailure>;
const consumablePlaySound: (sound: ResourceLocation) => ConsumablePlaySound;
const consumableComponent: (
  options?: ConsumableComponentOptions,
) => Result.Result<ConsumableComponent, ItemValidationFailure>;
const foodComponentOf: (item: ItemType) => FoodComponent | undefined;
const consumableComponentOf: (
  item: ItemType,
) => ConsumableComponent | undefined;
const useRemainderComponentOf: (
  item: ItemType,
) => UseRemainderComponent | undefined;
const itemUseComponentsOf: (item: ItemType) => ItemUseComponents | undefined;
const useCooldownComponent: (
  seconds: CooldownSeconds,
  cooldownGroup?: ResourceLocation,
) => Result.Result<UseCooldownComponent, UseCooldownFailure>;
type UseCooldownFailure = ItemValidationFailure;
const isUseCooldownComponent: (value: unknown) => value is UseCooldownComponent;
const cooldownExpiresAt: (
  startedAt: MonotonicTimeSecs,
  component: UseCooldownComponent,
) => Result.Result<MonotonicTimeSecs, UseCooldownFailure>;
const isCooldownActive: (
  now: MonotonicTimeSecs,
  startedAt: MonotonicTimeSecs,
  component: UseCooldownComponent,
) => Result.Result<boolean, UseCooldownFailure>;
```

`ConsumableEffect` は apply / remove / clear-all / teleport / play-sound の判別可能 union として公開し、各 variant と `consumableComponent` で動的な item stack component も型安全に構築できる。`ConsumableComponent.consumeSeconds` は公式 schema に合わせた非負・有限の `ConsumeSeconds` であり、builder はこの値を実行時にも検証して返す。root のほか `domain/consumable` subpath から利用できる。`useCooldownComponent` は `CooldownSeconds` で正・有限の秒数だけを受け付け、`cooldownGroup` には任意の namespaced ID を指定でき、返却値を immutable にする。公式仕様どおり、グループを省略した場合は base item type ID がグループになり、同じグループの item は cooldown を共有する。`isUseCooldownComponent` は保存データなどの unknown 境界を実行時に検証し、期限は `MonotonicTimeSecs` で計算し、境界時刻を非アクティブとして扱う。root と `domain/use-cooldown` subpath から利用できる。仕様の境界は [Minecraft Java Edition 1.21.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-2) を参照する。resolver が同梱するのは `ItemType` に表現された静的な食料定義であり、potion・ominous bottle・suspicious stew などの動的な stack への具体的な値の供給と、使用イベントの実行は上位層の責務である。

### 3-quater-quater. 汎用 item component（テキスト / max_stack_size / max_damage / damage / repair_cost / use_cooldown / tool / weapon / kinetic_weapon / piercing_weapon / attack_range / sulfur_cube_content）

Java Edition 1.20.5 で導入された item component model に基づき、item stack の共有計算に必要な値を kernel の厳格な型で公開する。この節には後続 version で追加された component も含み、各 version は個別に記す。`max_stack_size` は 1..99 の整数、`max_damage` は正の整数、`damage` と `repair_cost` は非負整数で、`max_stack_size` と damageable item の相互制約も builder と guard の両方で検証する。`unbreakable`、`enchantment_glint_override`、`tooltip_display`、`rarity` も同じ resolved value に含める。`custom_name`、`item_name`、`lore` は strict な JSON text component、`lore` は最大 256 行、`item_model` は namespaced resource location として検証する。仕様上の component は item type の既定値を持ち、stack 単位で上書きできるため、`itemComponents` は item-aware な既定値の解決、stack ごとの override の所有は上位の `ItemStack` / persistence 層とする。`tool` は既存の採掘速度表に対応する axe・pickaxe・shovel の item-aware な既定値を `ITEM_TOOL_COMPONENTS` から解決する。詳細な component model は [Minecraft Java Edition 1.20.5](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-20-5) と [Minecraft Java Edition 1.21.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-2) を参照する。

```typescript
const ITEM_COMPONENT_IDS: readonly ItemComponentId[];
const ITEM_RARITIES: readonly ItemRarity[];
const ITEM_TOOL_COMPONENTS: Readonly<Partial<Record<ItemType, ToolComponent>>>;
type TextComponentFailure = { readonly _tag: 'TextComponentFailure'; readonly kind: 'TypeError'; readonly reason: 'invalid-value' | 'hostile-input'; readonly message: string; readonly value?: unknown };
const textComponent: (value: unknown) => Result.Result<TextComponent, TextComponentFailure>;
const isTextComponent: (value: unknown) => value is TextComponent;
const itemComponentStackLimitOf: (item: ItemType) => ItemStackLimit;
const itemToolComponentOf: (item: ItemType) => ToolComponent | undefined;
const weaponComponent: (options?: WeaponComponentOptions) => Result.Result<WeaponComponent, ItemValidationFailure>;
const isWeaponComponent: (value: unknown) => value is WeaponComponent;
const itemComponents: (
  item: ItemType,
  options?: ItemComponentOptions,
) => Result.Result<ItemComponents, ItemValidationFailure | TextComponentFailure>;
const isItemComponents: (value: unknown) => value is ItemComponents;
const sulfurCubeContentComponent: (value: SulfurCubeContentOptions) => Result.Result<SulfurCubeContentComponent, ItemValidationFailure | TextComponentFailure>;
const isSulfurCubeContentOptions: (
  value: unknown,
) => value is SulfurCubeContentOptions;
const isSulfurCubeContentComponent: (
  value: unknown,
) => value is SulfurCubeContentComponent;
```

`itemComponents` は item registry の stack limit と equipment の耐久既定値を統合する。検証失敗を `ItemValidationFailure` または `TextComponentFailure` として返し、成功値は immutable である。`ItemComponentOptions.customName` / `itemName` / `lore` / `itemModel`、`useCooldown`、`weapon` で stack ごとの component を検証済みの値として解決結果へ含められ、`ItemStack` と inventory の merge 判定でも保持される。`MaxStackSize`、`MaxDamage`、`ItemDamage`、`RepairCost`、`WeaponDisableBlockingSeconds` は root と `domain/quantities` から、component の data と resolver は root と `domain/item-components` から利用できる。`TextComponent`、`textComponent`、`isTextComponent` は root と `domain/text-component` から利用できる。`tool` の一般的な rule 解決は `domain/tool-component` の `compileToolComponent` / `resolveToolMiningProperties`、item-aware な既定値は `ITEM_TOOL_COMPONENTS` / `itemToolComponentOf` が所有する。実際の使用・保存イベントは上位層の責務である。

`weaponComponent` は Java Edition 1.21.5 の `minecraft:weapon` を表し、`itemDamagePerAttack` は非負の安全な整数（既定値 1）、`disableBlockingForSeconds` は非負の有限秒数（既定値 0）として検証する。検証失敗を `ItemValidationFailure` として返し、成功値を immutable にする。`isWeaponComponent` は保存データなどの unknown 境界を正確なキー集合と型で検証する。root のほか `domain/weapon` subpath から利用できる。公式仕様は [Minecraft Java Edition 1.21.5](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-5) を参照する。

`attackRangeComponent` は Java Edition 1.21.11 の `minecraft:attack_range` を表し、公式 schema の `min_reach` / `max_reach` / `min_creative_reach` / `max_creative_reach` をそれぞれ `minReach` / `maxReach` / `minCreativeReach` / `maxCreativeReach` として公開する。既定値は順に 0 / 3 / 0 / 5、値域は 0..64 で、`hitboxMargin` は 0..1、`mobFactor` は 0..2 で検証する。`kineticWeaponComponent` と `piercingWeaponComponent` も同じ combat component model として root から利用できる。公式仕様は [Minecraft Java Edition 1.21.11](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-11) と [Minecraft Java Edition 26.1](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-1) を参照する。

`sulfurCubeContentComponent` は Java Edition 26.2 で追加された `minecraft:sulfur_cube_content` を表し、Sulfur Cube に吸収される item の resource location を検証して `ResourceLocation` に正規化する。検証失敗を `Result` で返す。`isSulfurCubeContentOptions` と `isSulfurCubeContentComponent` は保存データなどの `unknown` 境界を同じ条件で検証する。公式仕様は [Minecraft Java Edition 26.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2) を参照する。

### 3-quater-quater-ter. component 値そのもの（item-component-values）と属性・戦闘・防御・エンチャント

`itemComponents` が解決するのは item ごとの component 集合で、個々の component が取りうる値の形は
`domain/item-component-values` が所有する。dye、dyed_color、profile、bees、potion_contents、
charged_projectiles、bundle_contents、container、written/writable book content、firework explosion、
banner patterns、base color、map id、trim、tooltip display など、vanilla が定義する component 値ごとに
コンストラクタと `unknown` 境界の guard を対にして公開する。

以下のコードは代表例であり、全 constructor と guard の export は root と `domain/item-component-values` subpath から利用できる。

対にしているのは境界の位置を 1 箇所に固定するためである。component 値はほぼ必ず外部（保存データ、
data pack、ネットワーク）から来るので、guard を値の形の隣に置かないと検証が使用箇所ごとに散る。

```typescript
const DYE_COLORS: readonly DyeColor[]; // 16 色
const FIREWORK_EXPLOSION_SHAPES: readonly FireworkExplosionShape[];
const EQUIPPABLE_SLOTS: readonly EquippableSlot[];
const MAP_DECORATION_TYPES: readonly MapDecorationType[];

type ItemComponentResult<A> = Result.Result<A, ItemValidationFailure | TextComponentFailure>; // module 内の builder に使う型
const dyeComponent: (value: string) => ItemComponentResult<DyeColor>;
const dyedColorComponent: (value: DyedColorComponent) => ItemComponentResult<DyedColorComponent>;
const potionContentsComponent: (
  value?: PotionContentsOptions,
) => ItemComponentResult<PotionContentsComponent>;
const containerComponent: (value?: ContainerOptions) => ItemComponentResult<ContainerComponent>;
```

この module の値 constructor はすべて `Result` を返す。入力の shape・数値範囲・resource location、また text component を含む値を検証し、失敗を `ItemValidationFailure` または `TextComponentFailure` にする。

対象 builder は `potionDurationScaleComponent`、`additionalTradeCostComponent`、`breakSoundComponent`、`providesTrimMaterialComponent`、`providesBannerPatternsComponent`、`dyeComponent`、`customDataComponent`、`dyedColorComponent`、`entityDataComponent`、`bucketEntityDataComponent`、`blockEntityDataComponent`、`profileComponent`、`beesComponent`、`potionContentsComponent`、`chargedProjectilesComponent`、`bundleContentsComponent`、`containerComponent`、`mapColorComponent`、`mapDecorationsComponent`、`writableBookContentComponent`、`writtenBookContentComponent`、`trimComponent`、`suspiciousStewComponent`、`hideAdditionalTooltipComponent`、`canBreakComponent`、`canPlaceOnComponent`、`customModelDataComponent`、`mapIdComponent`、`blockStateComponent`、`instrumentComponent`、`noteBlockSoundComponent`、`recipesComponent`、`lockComponent`、`tooltipStyleComponent`、`baseColorComponent`、`equippableComponent`、`kineticWeaponComponent`、`piercingWeaponComponent`、`gliderComponent`、`deathProtectionComponent`、`repairableComponent`、`enchantableComponent`、`jukeboxPlayableComponent`、`ominousBottleAmplifierComponent`、`paintingVariantComponent`、`sulfurCubeContentComponent`、`lodestoneTrackerComponent`、`fireworkExplosionComponent`、`fireworksComponent`、`bannerPatternsComponent`、`potDecorationsComponent`、`containerLootComponent`、`debugStickStateComponent`、`tooltipDisplayComponent` である。`ItemComponentResult` はここで共通の戻り値を示すために使った module 内の型名で、export はされない。

属性・戦闘・防御・エンチャントは、component 値の中でも下流が個別に触るため subpath を分けている。

- `domain/item-attribute-modifiers`: `attributeModifier` / `attributeModifierDisplay` /
  `attributeModifiersComponent`。modifier の slot、operation、表示名を検証済みの値として扱う。
- `domain/item-combat`: `useEffectsComponent`、`minimumAttackChargeComponent`、
  `damageTypeComponent`、`swingAnimationComponent`、`attackRangeComponent`。
- `domain/item-defense`: `damageResistantComponent` と `blocksAttacksComponent`。
  盾の受け値、無効化秒数、ダメージ低減表を扱う。
- `domain/item-enchantments`: `enchantmentsComponent` と `storedEnchantmentsComponent`。
  付与済みと保管済み（エンチャント本）を別 component として区別する。

これらの builder は `Result` を返し、失敗値は `ItemValidationFailure` または `TextComponentFailure` である。値の検証だけを持ち、効果の適用、GUI、サーバー権威は上位層の責務である。

### 3-quater-quater-quater. ステータス効果（status-effect）

`status-effect.ts` は Minecraft Java Edition 26.3 の mob effect golden に照合した、kernel が現在表現する閉じた語彙と、効果ごとの beneficial/harmful・粒子色・amplifier 上限を公開する。効果の適用、tick 進行、粒子の実際の描画、`Vitals` への反映は上位層の責務である。

```typescript
const STATUS_EFFECT_AMPLIFIER_MAX = 255;
const STATUS_EFFECT_NAMES: ReadonlyArray<StatusEffectName>;
type StatusEffectName = (typeof STATUS_EFFECT_NAMES)[number];
type StatusEffectDefinition = Readonly<{
  readonly name: StatusEffectName;
  readonly beneficial: boolean;
  readonly particleColor: RgbColor;
  readonly maxAmplifier: EffectAmplifier;
}>;
const STATUS_EFFECT_DEFINITIONS: Readonly<Record<StatusEffectName, StatusEffectDefinition>>;
const statusEffectId: (name: StatusEffectName) => ResourceLocation;
const isStatusEffectName: (value: unknown) => value is StatusEffectName;
const isStatusEffectId: (value: unknown) => value is ResourceLocation;
type StatusEffectDefinitionFailure = { readonly _tag: 'UnknownStatusEffect'; readonly value: unknown };
const resolveStatusEffectDefinition: (value: unknown) => Result.Result<StatusEffectDefinition, StatusEffectDefinitionFailure>;
```

`isStatusEffectId` は閉じた `StatusEffectName` 表にある vanilla ID だけを受理する。data pack が独自の effect ID を持ち込める `PotionEffectInstanceComponent.id` は、これより広い `ResourceLocation` のままである。item component 側の vanilla ID roster を検査する `isVanillaPotionEffectId` と `VANILLA_STATUS_EFFECT_IDS` は `domain/item-component-values` subpath から利用できる。

**なぜ kernel か**: 同じ効果名の集合を `mc-sim`（`Vitals` への適用）と `mx-gameplay`（食料・スープ・ポーション効果）が同一のメンバーシップで参照する必要があり、どちらか一方に置くと依存の向きが壊れる。

### 3-quater-quater-bis. Sulfur Cube archetype registry

`sulfurCubeArchetypeFromUnknown` は、保存 JSON などの外部値を一度だけ snapshot に取り込み、`minecraft:sulfur_cube_archetype` の入力境界で検証してから、branded な定義を `Result` で返す。型付き options を受ける `sulfurCubeArchetype` は、`TagLocation`、resource location、`AttributeModifierAmount` へ正規化した immutable な `SulfurCubeArchetype` を構築する。必須の item tag、浮力、attribute modifier、knockback modifier、sound settings に加え、任意の explosion と contact damage を表現できる。`isSulfurCubeArchetypeOptions` は保存データなどの `unknown` 境界、`isSulfurCubeArchetype` は正規化後の値の境界を検証する。

```typescript
const SULFUR_CUBE_ARCHETYPE_REGISTRY: ResourceLocation;
const SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS: readonly [
  "add_value",
  "add_multiplied_base",
  "add_multiplied_total",
];
const SULFUR_CUBE_BLOCK_TAGS: Readonly<{
  suppressesBounce: TagLocation;
  causesPeriodicGeyserEruptions: TagLocation;
  causesContinuousGeyserEruptions: TagLocation;
  speleothems: TagLocation;
}>;
const SULFUR_CUBE_ITEM_TAGS: Readonly<{
  food: TagLocation;
  swallowable: TagLocation;
  archetype: Readonly<{
    regular: TagLocation;
    bouncy: TagLocation;
    slowFlat: TagLocation;
    fastFlat: TagLocation;
    light: TagLocation;
    fastSliding: TagLocation;
    slowSliding: TagLocation;
    highResistance: TagLocation;
    sticky: TagLocation;
    hot: TagLocation;
    slowBouncy: TagLocation;
  }>;
}>;
const SULFUR_CUBE_DAMAGE_TYPE_TAGS: Readonly<{
  withBlockImmuneTo: ResourceLocation;
}>;
const SULFUR_CUBE_ENTITY_TAGS: Readonly<{ notAffectedByGeysers: TagLocation }>;
const SULFUR_CUBE_GAME_EVENTS: Readonly<{ bounce: ResourceLocation }>;
const SULFUR_CUBE_COMPONENTS: Readonly<{ content: ResourceLocation }>;
const SULFUR_CUBE_DAMAGE_TYPES: Readonly<{ hot: ResourceLocation }>;
const SULFUR_CUBE_PARTICLES: Readonly<{
  goo: ResourceLocation;
  geyserBase: ResourceLocation;
  geyserPoof: ResourceLocation;
  geyserPlume: ResourceLocation;
  geyser: ResourceLocation;
}>;
const sulfurCubeArchetype: (
  options: SulfurCubeArchetypeOptions,
) => SulfurCubeArchetype;
type SulfurCubeArchetypeFailure = { readonly _tag: 'InvalidSulfurCubeArchetypeOptions'; readonly value: unknown } | Brand.BrandError;
const sulfurCubeArchetypeFromUnknown: (value: unknown) => Result.Result<SulfurCubeArchetype, SulfurCubeArchetypeFailure>;
const isSulfurCubeArchetypeOptions: (
  value: unknown,
) => value is SulfurCubeArchetypeOptions;
const isSulfurCubeArchetype: (value: unknown) => value is SulfurCubeArchetype;
const sulfurCubeArchetypeDataPackLayer: (
  options: SulfurCubeArchetypeDataPackLayerOptions,
) => Result.Result<SulfurCubeArchetypeDataPackLayer, DataPackRegistryFailure | SulfurCubeArchetypeFailure>;
const sulfurCubeArchetypeDataPackLayerFromUnknown: (
  value: unknown,
) => Result.Result<SulfurCubeArchetypeDataPackLayer, DataPackRegistryFailure | SulfurCubeArchetypeFailure>;
const selectSulfurCubeArchetypes: (
  layers: ReadonlyArray<SulfurCubeArchetypeDataPackLayer>,
  format: DataPackFormat,
) => ReadonlyMap<NamespacedResourceLocation, SulfurCubeArchetype>;
const sulfurCubeArchetypeDataPath: (
  entry: NamespacedResourceLocation,
) => Result.Result<DataPackResourcePath, DataPackRegistryFailure>;
```

公式 26.2 が列挙する archetype の挙動名、block/item/entity tag、`minecraft:bounce` game event、`minecraft:sulfur_cube_content` component、`minecraft:sulfur_cube_hot` damage type、Sulfur Cube particle の識別子を branded な portable data として公開する。`#` 付きの block/item/entity tag は `TagLocation`、registry・component・game event・damage type・particle は `ResourceLocation` で区別する。`sulfurCubeArchetypeDataPackLayer` は JSON の外部値を decoder 境界で検証し、`selectSulfurCubeArchetypes` は対象 format の layer を priority 順に重ねて registry を解決する。公式ページが個別 archetype JSON の数値を掲載していないため、kernel は vanilla の数値を推測して固定しない。JSON・pack filesystem の読み出しと、Sulfur Cube の物理・爆発・接触イベントの実行は上位層の責務である。仕様は [Minecraft Java Edition 26.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2) を参照する。

`SulfurCubeArchetype` と options は `PositiveTickCount`、`AttributeModifierAmount`、resource location、tag location の既存ブランドに加え、`SulfurCubeExplosionPower`（非負 safe integer）、`SulfurCubeContactDamageAmount`（有限非負値）、`SulfurCubeKnockbackPower`、`SulfurCubePushSoundImpulseThreshold`、`SulfurCubePushSoundCooldown`（有限値）を使う。

### 3-quinquies. 金床用の静的エンチャントルール

kernelはエンチャントID、金床コスト、ルール配列、3種のanvil rule setを静的データとして公開する。これらはrootと実在する`@nerima-games/mc-kernel/domain/enchantment` subpathからimportできる。

- `SUPPORTED_VANILLA_ENCHANTMENT_IDS`と`SupportedVanillaEnchantmentId`
- `VanillaAnvilCost`と`VANILLA_ENCHANTMENT_COSTS`
- `SUPPORTED_VANILLA_BOOK_ENCHANTMENT_RULES`、`SUPPORTED_VANILLA_ITEM_ENCHANTMENT_RULES`、`SUPPORTED_VANILLA_ENCHANTMENT_RULES`
- `SUPPORTED_VANILLA_ANVIL_RULE_SET`、`SUPPORTED_VANILLA_BOOK_ANVIL_RULE_SET`、`SUPPORTED_VANILLA_ITEM_ANVIL_RULE_SET`

各ルール配列のレコードはエンチャントID、最大レベル、適用可能なアイテム、競合するエンチャントID、コストを持つ。ルール配列のレコード型は名前付きの公開exportではない。金床state、計画・適用、snapshot codec、エンチャント照合処理はkernelの公開APIに含まれない。

### 3-quinquies-bis. 設定値と統計

設定値の既定値、外部入力の正規化、key binding の更新関数は kernel に残る。統計の値と更新 API は `mc-sim` が所有し、kernel では公開しない（[実行時処理の所有元](./responsibility.md)）。

```typescript
const GRAPHICS_QUALITIES: readonly ["low", "medium", "high", "ultra"];
const MIN_RENDER_DISTANCE: number;
const MAX_RENDER_DISTANCE: number;
const MIN_FOV_DEGREES: number;
const MAX_FOV_DEGREES: number;
const MIN_MOUSE_SENSITIVITY: number;
const MAX_MOUSE_SENSITIVITY: number;
const MIN_VOLUME: number;
const MAX_VOLUME: number;
const DEFAULT_SETTINGS: Settings;
const normaliseSettings: (input: unknown) => Settings;
type Settings = Readonly<{
  renderDistance: RenderDistanceChunks;
  fovDegrees: FieldOfViewDegrees;
  graphicsQuality: GraphicsQuality;
  audioEnabled: boolean;
  masterVolume: VolumeLevel;
  musicVolume: VolumeLevel;
  sfxVolume: VolumeLevel;
  mouseSensitivity: MouseSensitivity;
  captionsEnabled: boolean;
  keyBindings: Readonly<Record<InputAction, KeyCode>>;
}>;
const normaliseKeyBindings: (bindings: unknown) => Readonly<Record<InputAction, KeyCode>>;
const rebindKey: (settings: Settings, action: InputAction, code: KeyCode) => Settings;
const unbindKey: (settings: Settings, action: InputAction) => Settings;

```

これらの Settings API は root と `domain/settings` から利用できる。画面・renderer preset・入力デバイスへの適用、統計の記録と achievement registry、player state の所有、永続化は下流の責務である。



### 3-sexies. 飛翔体（projectile）

kernelは飛翔体のruntime APIを公開しない。移設先は[責務と移行先](./responsibility.md)を参照する。

### 3-septies. 爆発データ（explosion）

```typescript
type ExplosionBlockPosition = Position;
type ExplosionBlock = Readonly<{
  readonly resistance: BlockBlastResistance;
  readonly destructible: boolean;
}>;
type ExplosionBlockReader = (position: ExplosionBlockPosition) => ExplosionBlock | undefined;
type ExplosionEntity = Readonly<{
  readonly id: EntityId;
  readonly feetPosition: Position;
}>;
type ExplosionEntityEffect = Readonly<{
  readonly id: EntityId;
  readonly damage: DamageAmount;
  readonly knockback: Position;
  readonly exposure: ExplosionExposure;
}>;
type ExplosionLimits = Readonly<{
  readonly maxVisitedBlocks: ExplosionBlockCount;
  readonly maxRaySteps: ExplosionRayStepCount;
  readonly maxAffectedEntities: ExplosionEntityCount;
}>;
type ExplosionRequest = Readonly<{
  readonly center: Position;
  readonly radius: ExplosionRadius;
  readonly seed: RandomSeed;
  readonly blocks: ExplosionBlockReader;
  readonly entities: ReadonlyArray<ExplosionEntity>;
  readonly limits?: Partial<ExplosionLimits>;
}>;
type ExplosionPlan = Readonly<{
  readonly center: Position;
  readonly radius: ExplosionRadius;
  readonly seed: RandomSeed;
  readonly destroyedBlocks: ReadonlyArray<ExplosionBlockPosition>;
  readonly entityEffects: ReadonlyArray<ExplosionEntityEffect>;
  readonly visitedBlocks: ExplosionBlockCount;
  readonly limits: ExplosionLimits;
  readonly truncated: boolean;
}>;
type ExplosionMutation = Pick<ExplosionPlan, "destroyedBlocks" | "entityEffects">;
type ExplosionCommit = (mutation: ExplosionMutation) => void;

type ExplosionRadius = number & Brand.Brand<"ExplosionRadius">;
type ExplosionBlockCount = number & Brand.Brand<"ExplosionBlockCount">;
type ExplosionRayStepCount = number & Brand.Brand<"ExplosionRayStepCount">;
type ExplosionEntityCount = number & Brand.Brand<"ExplosionEntityCount">;
type ExplosionExposure = number & Brand.Brand<"ExplosionExposure">;

const DEFAULT_EXPLOSION_LIMITS: ExplosionLimits;
const resistsExplosion: (id: BlockId, power: BlockBlastResistance) => Result.Result<boolean, BlockRegistryResolutionFailure>;
```

爆発計画と適用、および着火済みTNTのruntimeは`mc-sim`が所有する。移設先は[責務と移行先](./responsibility.md)を参照する。

root と `@nerima-games/mc-kernel/domain/explosion` subpath から利用できる。

## 4. ブロック能力モデル

**権威は `docs/capability-flag-audit.md`。** 監査 §3 の表は 28 行であり、この表を採用している。

根拠欄のファイル名は、[能力フラグ監査](./capability-flag-audit.md)で調べた参照実装内のパスを示す。kernel の import path ではない。

2 つの仕組みに分かれる。boolean は能力フラグ表、それ以外は型付きプロパティ表。
### 4-1. 能力フラグ（boolean）：`domain/block-capabilities.ts` / `domain/block-capability-data.ts`

`block-capability-data.ts` が能力の型・既定値・反復順を持ち、`block-capabilities.ts` が外部入力の検証と既定値解決を担当する。
安定した公開 import path は `@nerima-games/mc-kernel/domain/block-capabilities` である。

```typescript
const BLOCK_CAPABILITY_DEFAULTS = { passable: false, ..., validSpawnSurface: true }
type BlockCapabilityFlag  = keyof typeof BLOCK_CAPABILITY_DEFAULTS   // 表から導出
type BlockCapabilities    = { readonly [K in BlockCapabilityFlag]: boolean }
type BlockCapabilityOverrides = { readonly [K in BlockCapabilityFlag]?: boolean }

const BLOCK_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag>
const TRUE_BY_DEFAULT_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag>
type BlockCapabilityFailure = { readonly _tag: 'BlockCapabilityFailure'; readonly reason: 'not-object' | 'unknown-key' | 'not-boolean'; readonly message: string }
const resolveBlockCapabilities(overrides): Result.Result<BlockCapabilities, BlockCapabilityFailure>
const capabilityOf(overrides, flag): Result.Result<boolean, BlockCapabilityFailure>
```

実装済みのフラグは 12 個である。

| フラグ                  | 既定       | 根拠                                                                          |
| ----------------------- | ---------- | ----------------------------------------------------------------------------- |
| `passable`              | `false`    | 監査 §4.1 `block-collision-predicates.ts:22-44`                               |
| `fallsWhenUnsupported`  | `false`    | 監査 §3 `falling-block.ts`                                                    |
| `replaceable`           | `false`    | 監査 §4.2 `block-service-place-load.ts:50`                                    |
| `flammable`             | `false`    | 監査 §4.3 `fire-lifecycle.ts:18-30`                                           |
| `fireSource`            | `false`    | 監査 §4.3 `fire-lifecycle.ts:77-78`                                           |
| `pistonImmovable`       | `false`    | `src/domain/block/block-capability-data.ts`                                   |
| `brokenByWaterFlow`     | `false`    | 監査 §4.6 `block-support.ts:34-45`                                            |
| `climbable`             | `false`    | 監査 §4.1 `block-collision-predicates.ts:177-182`                             |
| `tillable`              | `false`    | 監査 §4.8 / §5-20 `block-service.config.ts:264-267`。クワで耕地に変換できるか |
| `suffocates`            | **`true`** | 監査 §4.7 `environment-hazard.config.ts:39-85`                                |
| `canSupportAttachments` | **`true`** | 監査 §4.6 `block-support.ts:47-61`                                            |
| `validSpawnSurface`     | **`true`** | 監査 §4.8 `spawn-selection-search.ts:41-60`                                   |

既定値の方針は監査 §7 の「既定値は『普通の不透明立方体』に倒す」。
大半のフラグはそれが `false` になり、`false` が「何もしない安全側」になるよう命名してある（`solid` ではなく `passable`）。
上記 3 つだけ `true` なのは、参照実装がその 3 つを**否定リスト**（`NON_SUFFOCATING_BLOCKS` 等）で持っているから、
つまり普通の立方体の答えが `true` だからである。

### 4-2. プロパティ（型付き値）：`domain/block-properties.ts`

このパスは公開バレルとして維持し、値 vocabulary・型・既定値は `domain/block-property-data.ts`、
外部入力の検証と既定値解決は `domain/block-property-validation.ts` に分離している。

```typescript
type BlockProperties = { readonly opacity: BlockOpacity; readonly lightEmission: LightLevel; ... }
const BLOCK_PROPERTY_DEFAULTS: BlockProperties
type BlockPropertyName = keyof BlockProperties
type BlockPropertyOverrides = { readonly [K in BlockPropertyName]?: BlockProperties[K] }

const BLOCK_PROPERTY_NAMES: ReadonlyArray<BlockPropertyName>
type BlockPropertyFailure = { readonly _tag: 'BlockPropertyFailure'; readonly reason: 'type' | 'range' | 'unknown-key'; readonly message: string }
const resolveBlockProperties(overrides): Result.Result<BlockProperties, BlockPropertyFailure>
const propertyOf<K>(overrides, name: K): Result.Result<BlockProperties[K], BlockPropertyFailure>
```

実装済みのプロパティは 16 個である。

| プロパティ         | 型                                                      | 既定                                  | 根拠                                                                |
| ------------------ | ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `opacity`          | `'transparentSolid' \| 'fluid' \| 'opaque'`             | `'opaque'`                            | 監査 §4.4                                                           |
| `lightEmission`    | `LightLevel` (0..15)                                    | `0`                                   | 監査 §4.4 `light.ts:24-46`                                          |
| `fluid`            | `'none' \| 'water' \| 'lava'`                           | `'none'`                              | 監査 §4.2                                                           |
| `collisionShape`   | `'full'\|'slab'\|'cactus'\|'pressurePlate'\|'none'`     | `'full'`                              | 監査 §4.1                                                           |
| `renderKind`       | `'cube'\|'cross'\|'cactus'\|'rail'\|'lilyPad'\|'fluid'` | `'cube'`                              | 監査 §4.8                                                           |
| `footstepMaterial` | `'default'\|'grass'\|'wood'\|'stone'`                   | `'default'`                           | 監査 §4.8。純粋な表面分類で、効果音 ID や再生は mc-audio が所有する |
| `hardness`         | `BlockHardness`                                         | `8`                                   | 監査 §4.5。`-1` は不破壊、`0` は即時破壊、それ以外の負値は不正      |
| `friction`         | `BlockFriction` (`[0, 1]`)                              | `0.6`                                 | 監査 §4.5 `DEFAULT_BLOCK_FRICTION`                                  |
| `blastResistance`  | `BlockBlastResistance`                                  | `0`                                   | 爆発耐性。正の Infinity は破壊不能を表す                            |
| `contactDamage`    | `BlockContactDamage`                                    | `0`                                   | 監査 §4.7（LAVA=4 / CACTUS=1）                                      |
| `movementDrag`     | `BlockMovementDrag`                                     | `0`                                   | 監査 §4.1 `:203-208`                                                |
| `xpOnBreak`        | `BlockExperiencePoints`                                 | `0`                                   | 監査 §4.5 `blocks.config.ores.ts:8-45`                              |
| `railKind`         | `'none'\|'normal'\|'powered'`                           | `'none'`                              | 監査 §4.1 `:184-201`                                                |
| `harvestTool`      | `HarvestToolRequirement`                                | `{category:'none', minTier:'none'}`   | 監査 §4.5                                                           |
| `drops`            | `BlockDropRule \| undefined`                            | `{item:'self', count:1, ...}`         | 監査 §4.5。未ドロップは `undefined`                                 |
| `supportRule`      | `SupportRule`                                           | `NEEDS_NO_SUPPORT`（`{kind:'none'}`） | 監査 §4.6。§4-2-bis 参照                                            |

補助 API: `BLOCK_OPACITIES` / `FLUID_KINDS` / `COLLISION_SHAPES` / `RENDER_KINDS` / `FOOTSTEP_MATERIALS` /
`RAIL_KINDS` / `LIGHT_LEVEL_MIN` / `LIGHT_LEVEL_MAX` / `isLightLevel` / `clampLightLevel`。

### 4-2-bis. `SupportRule` の値：`domain/block-support.ts` / `domain/block-support-data.ts`

`supportRule` は配置に必要な支持条件を値として表す判別共用体である。

```typescript
type SupportRule =
  | { readonly kind: 'none' }                                    // 直下に何も要求しない（既定）
  | { readonly kind: 'anySupporting' }                           // canSupportAttachments な任意のブロックでよい
  | { readonly kind: 'oneOf'; readonly blocks: ReadonlyArray<BlockType> }  // 直下が名指しリストのどれかである必要がある

const NEEDS_NO_SUPPORT: SupportRule       // { kind: 'none' } の名前付き定数。プロパティの既定値そのもの
const NEEDS_ANY_SUPPORT: SupportRule      // { kind: 'anySupporting' } の名前付き定数
const needsOneOf(...blocks: ReadonlyArray<BlockType>): SupportRule

type SupportRuleFailure = { readonly _tag: 'SupportRuleFailure'; readonly message: string }
const isSupportSensitive(rule: SupportRule): boolean   // rule.kind !== 'none'
const satisfiesSupportRule(
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): Result.Result<boolean, SupportRuleFailure>
```

`isSupportSensitive` は `rule.kind !== 'none'` から導出する。
`satisfiesSupportRule` は rule と下のブロックの `canSupportAttachments` 能力を組み合わせて判定する。
下の ID が未知の場合は通常の不透明ブロックとして支え能力を持つものと扱う。
`supportRule` が配置条件を所有するため、条件依存の草花・キノコ・サトウキビ・サボテン・睡蓮 10 種も既定 self-drop と同じ根拠でアイテム形を持つ。

`domain/block-registry.ts` の `canBlockStaySupported(id, supportBelow)` はこの純関数を
id ベースの lookup に配線したものである（§3-1-bis）。

### 4-3. struct 2 種を隔離した理由：`domain/block-harvest.ts` / `domain/block-harvest-data.ts`

```typescript
const HARVEST_TOOL_CATEGORIES = ['none', 'pickaxe', 'axe', 'shovel', 'hoe', 'shears', 'sword'] as const
type HarvestToolCategory = (typeof HARVEST_TOOL_CATEGORIES)[number]

const HARVEST_TIERS = ['none', 'wooden', 'stone', 'iron', 'diamond', 'netherite'] as const
type HarvestTier = (typeof HARVEST_TIERS)[number]   // 宣言順が採掘力の順（none が最弱）

type HarvestToolRequirement = { readonly category: HarvestToolCategory; readonly minTier: HarvestTier }
type BlockDropRule = { readonly item: ItemType | 'self'; readonly count: StackCount // 1..MAX_STACK_COUNT (99)
                       readonly requiresSilkTouch: boolean; readonly affectedByFortune: boolean }

type HarvestContext = { readonly heldTier?: HarvestTier; readonly silkTouch?: boolean }
type BlockDrop      = { readonly item: ItemType; readonly count: StackCount; readonly affectedByFortune: boolean }

const DEFAULT_HARVEST_TOOL / DEFAULT_BLOCK_DROP / BARE_HANDED
const satisfiesHarvestTier(requirement, heldTier): boolean
const resolveDropItem(rule, brokenBlock): ItemType | undefined
const resolveDrop(requirement, rule, brokenBlock, context?): BlockDrop | undefined
```

`category`（速度ボーナス）と `minTier`（ドロップ可否）は**別軸**である。参照実装ではこの 2 つが無関係な場所に散っており
（`harvestable-blocks.ts` と `block-utils.ts`）、`satisfiesHarvestTier` が category を一切見ないのはそのためである。
間違った道具は遅いだけでドロップはする。

`item: 'self'` は「自分自身のアイテム」を表す番兵。既定値は自分が何のブロックかを知り得ないため、
リテラルではなく番兵でなければならない。

同じ理由で `resolveDropItem` は**部分関数になった**。旧版は `BlockType` を返して全域だった
（「自分自身」は必ずブロックだから）。答えがアイテムになると「自分自身」は存在しないことがありうる
（`air` / `water` / `lava` / `bedrock` / `snow`）。`undefined` がその答えで、count 0 の drop rule は存在しないため、インベントリに何も入らない。

**`resolveDrop` は採掘時のドロップ判定に使う。** `resolveDropItem` は「どのアイテムか」だけを答え、道具もシルクタッチも見ない。
「そもそも落ちるか」まで含めて答えるのは `resolveDrop` のほうで、落ちない経路は次の 4 つである。

1. drop rule が `undefined`：誰に対しても何も落とさない（監査 §4.5 の `NEVER_DROPPED_BLOCK_TYPES`）。rule が存在する場合の `count` は `1..MAX_STACK_COUNT`。
2. 道具のティアが `harvestTool.minTier` に届かない：素手で石を殴る。**カテゴリは見ない**
3. `requiresSilkTouch` なのにシルクタッチが無い：ガラスを割る
4. （拒否ではなく不在）`'self'` なのにそのブロックにアイテム形が無い

**幸運は kernel で適用しない。** `BlockDrop.affectedByFortune` を**運び出す**だけで、倍率は掛けない。
幸運は乱数関数である。kernel は `RandomSource` の契約を持つが、`resolveDrop` は乱数源を受け取らない。
この API は基準個数と「幸運が効く」という事実を決定的に返し、乱数を使う規則に倍率適用を委ねる。

### 4-3-bis. `dropOfBlockId`：採掘がインベントリに届く1本の線

```typescript
const dropOfBlockId(id: BlockId, context?: HarvestContext): Result.Result<BlockDrop | undefined, BlockRegistryResolutionFailure>
```

`mx-gameplay` の `breakBlock` は数値の `BlockId` を返し、`mc-sim` の `InventoryService.add` は item を受け取る。
`dropOfBlockId` はこの両者をつなぐ `BlockDrop` を `Result` で返す。

呼び出しは1回で、読み出し側にブロック名は現れない。落下ブロック規則に対する
`capabilityOfBlockId` と同じ形である。

**未知の id は成功値 `undefined` を返す。** これは `capabilityOfBlockId`（既定値=石に落とす）と**違う規則**であり、
違ってよい。共通しているのは仕組みではなく原則で、「不活性な読み」が安全側だという点である。
能力にとっての不活性は「何もしない普通の立方体」だが、ドロップにとっての「普通の立方体」は
**このビルドが名前を知らないバイトからアイテムを鋳造すること**を意味する。
壊れたチャンクや新しいビルドのセーブが、静かにインベントリへアイテムを刷る。
何も落とさないのが唯一まともな答えである。

### 4-3-ter. ブロック相互作用

ブロック相互作用のruntimeは`mc-sim`が所有し、kernelは対応するAPIを公開しない。移設先は[責務と移行先](./responsibility.md)を参照する。

### 4-4. `BlockDefinition`：`domain/block-definition.ts`

```typescript
type BlockDefinition = {
  readonly type: BlockType
  readonly capabilities?: BlockCapabilityOverrides
  readonly properties?: BlockPropertyOverrides
}
type BlockDefinitionFailure = { readonly _tag: 'BlockDefinitionFailure'; readonly reason: 'unknown-field' | 'invalid-shape'; readonly message: string }
type ResolvedBlock = { readonly type: BlockType
                       readonly capabilities: BlockCapabilities
                       readonly properties: BlockProperties }

const blockCapabilitiesOf: (definition: BlockDefinition) => Result.Result<BlockCapabilities, BlockDefinitionFailure | BlockCapabilityFailure>
const blockPropertiesOf: (definition: BlockDefinition) => Result.Result<BlockProperties, BlockDefinitionFailure | BlockPropertyFailure>
const resolveBlock: (definition: BlockDefinition) => Result.Result<ResolvedBlock, BlockDefinitionFailure | BlockCapabilityFailure | BlockPropertyFailure>
const AUDITED_CAPABILITY_NAMES: ReadonlyArray<string>          // 監査 §3 の 28 行
const DOWNSTREAM_CAPABILITIES: ReadonlyArray<{ name, kind, owner, why }> // 下流所有 1 件と境界理由
```

**加算安全性（additive safety）が全体の要**。定義は差分だけを書き、書かなかったものは文書化された既定に解決される。
`{ type: 'stone' }` は完全に有効な定義であり、「普通の不透明立方体」を意味する。

`BlockCapabilityFlag` は既定表から**導出**されている。デフォルトを決めずにフラグを追加することが型レベルで不可能。
プロパティ側は値型が推論できないため 2 行（型宣言 + 既定値）必要だが、`BLOCK_PROPERTY_DEFAULTS: BlockProperties` の
型注釈により「既定値のないプロパティ」はコンパイルエラーになる。

消費側では次の操作を避ける。

1. `BlockCapabilities` / `BlockProperties` のリテラルを手書きしない。オーバーライドを書いて解決関数に渡す。
   完全なレコードは能力が増えるたびに必須キーが増え、まさにこの設計が避けようとしている破壊が起きる。
2. `BlockCapabilityFlag` に対する `default` 節なしの網羅 `switch` を書かない。`BLOCK_CAPABILITY_FLAGS` を回す。

### 4-5. 能力境界（`DOWNSTREAM_CAPABILITIES`）

`textureTiles` は renderer が所有し、kernel の `BlockProperties` には含めない。

| 能力           | 種別     | 所有者   | 境界理由                                                  |
| -------------- | -------- | -------- | --------------------------------------------------------- |
| `textureTiles` | property | renderer | アトラス・面別 tile 割当・画像 asset は renderer の責務。 |

## 5. `CameraPoseSnapshot`（camera）

```typescript
type CameraPoseSnapshot = {
  readonly position: Position
  readonly yawRadians: AngleRadians
  readonly pitchRadians: AngleRadians
  readonly capturedAtSecs: MonotonicTimeSecs
}
type SnapshotAgeSecs = number & Brand.Brand<'SnapshotAgeSecs'>;
const SnapshotAgeSecs(value: number): SnapshotAgeSecs;
const snapshotAgeSecs: (snapshot: CameraPoseSnapshot, now: MonotonicTimeSecs) => SnapshotAgeSecs;
```

`CameraPoseSnapshot` の値は `mc-sim` が管理し、`mc-render` の THREE カメラはその値を反映する。`mc-playground-kit` やリプレイ機構も同じ型を使うため、型を kernel に置いて consumer 間の依存を避ける。

この型の `readonly` は TypeScript 上の書き込み制約であり、実行時にオブジェクトを freeze する契約ではない。

プレイヤー姿勢からカメラポーズを計算するAPIはkernelで公開せず、runtimeは`mc-sim`が所有する。移設先は[責務と移行先](./responsibility.md)を参照する。

`capturedAtSecs` があるのは、ミラー側が `snapshotAgeSecs` で現在時刻からの経過秒数を調べられるようにするため。記録時刻が `now` より未来なら、結果は負になる。

## 5-bis. フレーム時間（frame-timing）

フレームループが受け取った経過時間を、シミュレーションへ渡せる範囲に制限し、捨てた時間を別に記録する純粋関数を公開する。
状態・時計・ゲームループそのものは上位層が所有する。

```typescript
const MIN_FRAME_DELTA_SECS = 0.001;
const MAX_FRAME_DELTA_SECS = 0.05;
const FIRST_FRAME_DELTA_SECS: DeltaTimeSecs = DeltaTimeSecs(0.016);

const clampFrameDelta: (rawDeltaSecs: DeltaTimeSecs) => DeltaTimeSecs;
const frameDeltaBetween: (
  previousSecs: MonotonicTimeSecs | undefined,
  nowSecs: MonotonicTimeSecs,
) => DeltaTimeSecs;
const frameDeltaLossSecs: (rawDeltaSecs: DeltaTimeSecs) => DeltaTimeSecs;
const frameDeltaLossBetween: (
  previousSecs: MonotonicTimeSecs | undefined,
  nowSecs: MonotonicTimeSecs,
) => DeltaTimeSecs;
```

単調時刻の前回値が無い場合は最初のフレーム値 `0.016` を使う。差分は `0.001` 以上
`0.05` 以下に clamp し、上限を超えた経過時間は `frameDeltaLossSecs` / `frameDeltaLossBetween` で返す。
これは `mc-sim` の状態・累積器を移植したものではなく、`DeltaTimeSecs` を消費する共有された時間ポリシーだけを kernel が所有する境界である。

### 固定 tick の時間契約

```typescript
type NonNegativeTickCount = number & Brand.Brand<'NonNegativeTickCount'>;
type PositiveTickCount = number & Brand.Brand<'PositiveTickCount'>;
type TimeOverflow = { readonly _tag: 'TimeOverflow' };

const tickDuration: FixedDurationSecs = FixedDurationSecs(0.05);
const physicsSubstepDuration: FixedDurationSecs = FixedDurationSecs(0.025);
const addTick: (tick: SimulationTick, count: NonNegativeTickCount) => Result.Result<SimulationTick, TimeOverflow>;
const secondsForTicks: (ticks: NonNegativeTickCount) => Result.Result<FixedDurationSecs, TimeOverflow>;
const interpolationFraction: (accumulator: FixedDurationSecs) => InterpolationFraction;
```

これらの value export と tick 演算 API は root (`@nerima-games/mc-kernel`) と、数量は
`domain/quantities`、演算は `domain/frame-timing` の各 subpath から同一の値として利用できる。

`addTick` と `secondsForTicks` は safe integer または有限秒数の範囲を超える場合に
`Result.fail({ _tag: 'TimeOverflow' })` を返す。`interpolationFraction` は whole tick 消費後の
`[0, 0.05)` の accumulator にだけ適用する。`0.05` 以上を渡すと clamp や wrap はせず、
`InterpolationFraction` の `[0, 1)` 制約により例外になる。したがって呼び出し側は、fraction を
求める前に whole tick を消費し、accumulator をこの境界未満へ戻さなければならない。固定 tick の
accumulator、catch-up 上限、pause/overload、simulation loop は `mc-sim` が所有する。

## 5-ter. 天候語彙（weather）

kernel は `Weather` 型、`WEATHERS`、`isWeather`、`DEFAULT_WEATHER_REMAINING_SECS` を公開する。天候状態とその更新は `mc-sim` が所有する（[実行時処理の所有元](./responsibility.md)）。

```typescript
type Weather = "clear" | "rain" | "thunder";
const WEATHERS: readonly Weather[];
const isWeather: (value: unknown) => value is Weather;
const DEFAULT_WEATHER_REMAINING_SECS: number;
```

## 5-quater. プレイヤー vitals（vitals）

プレイヤーvitalsのruntimeは`mc-sim`が所有し、kernelでは公開しない。移設先は[責務と移行先](./responsibility.md)を参照する。

## 5-quinquies. 乗り物の共有型（vehicle）

kernelは乗り物の語彙と共有snapshotの値型を公開する。位置・速度・搭乗者などの値を運ぶ契約であり、snapshotの生成・検証や物理的な移動、レール接続、衝突、搭乗・降車、ワールド変更は実行時処理の所有元に属する。

```typescript
const VEHICLE_TYPES: readonly ["boat", "minecart"];
type VehicleType = (typeof VEHICLE_TYPES)[number];
const isVehicleType: (value: unknown) => value is VehicleType;
type VehicleId = string & Brand.Brand<"VehicleId">;
type OccupantId = string & Brand.Brand<"VehicleOccupantId">;
const VehicleId: Brand.Constructor<VehicleId>;
const OccupantId: Brand.Constructor<OccupantId>;
type VehicleVelocity = Readonly<{
  x: VehicleVelocityComponent;
  y: VehicleVelocityComponent;
  z: VehicleVelocityComponent;
}>;
type Vehicle = Readonly<{
  id: VehicleId;
  type: VehicleType;
  dimension: Dimension;
  position: Position;
  velocity: VehicleVelocity;
  yawRadians: AngleRadians;
  occupant?: OccupantId;
}>;
type VehicleSnapshot = Readonly<{
  vehicles: ReadonlyArray<Vehicle>;
  nextSerial: EntitySerial;
}>;
```

`VehicleId`と`OccupantId`のconstructorは空文字列と空白だけの文字列を受け付けない。

## 5-quinquies-bis. Chunk read/edit vocabulary

`BlockRead` は loaded air、unloaded chunk、out-of-world position を判別可能なまま表現する。`ReadView` は epoch、chunk、block/light revision と section accessor を持ち、構築時に block ID と section 長を検証して入力配列をコピーする。後から呼び出し側が入力配列を変更しても view には反映されない。section accessor は mutable typed-array API を公開せず、`snapshot()` を呼んだ場合だけさらに別の `Uint16Array` を作るため、meshing の per-cell read では配列コピーを発生させない。
この節の `BlockEdit`、`blockEdit`、`BlockWriteBatch` は `domain/world-read-write` subpath の `{ position, blockId }` 契約であり、root からも利用できる。

```ts
type BlockRead =
  | { readonly _tag: "Loaded"; readonly blockId: BlockId }
  | { readonly _tag: "Unloaded"; readonly chunk: ChunkKey }
  | { readonly _tag: "OutOfWorld"; readonly position: BlockPosition };

const loadedBlock: (blockId: BlockId) => BlockRead;
const unloadedChunk: (chunk: ChunkKey) => BlockRead;
const outOfWorld: (position: BlockPosition) => BlockRead;

type SectionIndex = number & Brand.Brand<'SectionIndex'>; // 0 起点の要素 index、安全整数
type SectionLength = number & Brand.Brand<'SectionLength'>; // 要素数、非負 safe integer
const SectionLength(value: number): Result.Result<SectionLength, WorldReadWriteFailure>;
type ReadonlyUint16Array<Value extends number = BlockId | LightLevel> = {
  readonly length: SectionLength;
  readonly get: (index: SectionIndex) => Result.Result<Value, WorldReadWriteFailure>;
  readonly snapshot: () => Uint16Array;
};
type WorldEpoch = number & Brand.Brand<'WorldEpoch'>;
type ChunkRevision = number & Brand.Brand<'ChunkRevision'>;
type LightRevision = number & Brand.Brand<'LightRevision'>;
type ChunkLocalIndex = number & Brand.Brand<'ChunkLocalIndex'>;
type WorldReadWriteFailure = Readonly<{
  readonly _tag: 'WorldReadWriteFailure';
  readonly reason: 'invalid-epoch' | 'invalid-revision' | 'invalid-index' | 'invalid-read-view' | 'unknown-block-id' | 'duplicate-position';
  readonly message: string;
}> | BlockRegistryResolutionFailure;
const WorldEpoch: (value: number) => Result.Result<WorldEpoch, WorldReadWriteFailure>;
const ChunkRevision: (value: number) => Result.Result<ChunkRevision, WorldReadWriteFailure>;
const LightRevision: (value: number) => Result.Result<LightRevision, WorldReadWriteFailure>;
const ChunkLocalIndex: (value: number) => Result.Result<ChunkLocalIndex, WorldReadWriteFailure>;
const SectionIndex: (value: number) => Result.Result<SectionIndex, WorldReadWriteFailure>;

type ReadViewInput = {
  readonly epoch: WorldEpoch;
  readonly chunk: ChunkKey;
  readonly blockRevision: ChunkRevision;
  readonly lightRevision: LightRevision;
  readonly blocks: Uint16Array;
  readonly light: Uint16Array;
};

type ReadView = {
  readonly epoch: WorldEpoch;
  readonly chunk: ChunkKey;
  readonly blockRevision: ChunkRevision;
  readonly lightRevision: LightRevision;
  readonly length: SectionLength;
  readonly getBlock: (index: SectionIndex) => Result.Result<BlockId, WorldReadWriteFailure>;
  readonly getLight: (index: SectionIndex) => Result.Result<LightLevel, WorldReadWriteFailure>;
  readonly blocks: ReadonlyUint16Array<BlockId>;
  readonly light: ReadonlyUint16Array<LightLevel>;
};
const readView: (input: ReadViewInput) => Result.Result<ReadView, WorldReadWriteFailure>;
const ReadView: (input: ReadViewInput) => Result.Result<ReadView, WorldReadWriteFailure>;

type BlockEdit = { readonly position: BlockPosition; readonly blockId: BlockId };
const blockEdit: (position: BlockPosition, blockId: BlockId) => Result.Result<BlockEdit, WorldReadWriteFailure>;
const BlockEdit: (position: BlockPosition, blockId: BlockId) => Result.Result<BlockEdit, WorldReadWriteFailure>;
type ExpectedChunk = { readonly epoch: WorldEpoch; readonly revision: ChunkRevision };
const expectedChunk: (epoch: WorldEpoch, revision: ChunkRevision) => ExpectedChunk;
const ExpectedChunk: (epoch: WorldEpoch, revision: ChunkRevision) => ExpectedChunk;
type BlockWriteBatch = {
  readonly expected: ExpectedChunk;
  readonly edits: readonly BlockEdit[];
};
const blockWriteBatch: (
  expected: ExpectedChunk,
  edits: readonly BlockEdit[],
) => Result.Result<BlockWriteBatch, WorldReadWriteFailure>;
const BlockWriteBatch: typeof blockWriteBatch;
```

`WorldEpoch`、`ChunkRevision`、`LightRevision`、`ChunkLocalIndex`、`SectionIndex` はいずれも `WorldReadWriteFailure` を返す検証済み branded constructor である。`ReadView` は block ID・section 長・配列範囲を検証し、各 accessor は無効 index を `WorldReadWriteFailure` で返す。`unknown-block-id` は未登録 ID を表し、registry lookup の検証失敗は `BlockRegistryResolutionFailure` として union に保持される。`BlockWriteBatch` は `BlockAxis` の safe integer 全域を受け付け、座標比較で重複 position を検証する。live chunk の mutation、STM/COW、load/unload、dirty event は所有しない。

## 5-sexies. Fluid と redstone の静的データ

Fluid の block ID と level 定数・変換関数、redstone block ID と power 範囲の定数は kernel に残る。fluid state/update と redstone state/network/update は、それぞれの移行先が所有する（[実行時処理の所有元](./responsibility.md)）。

```typescript
type FlowingFluidKind = "water" | "lava";
const FLUID_BLOCK_IDS: Readonly<{ readonly lava: Option.Option<BlockId>; readonly water: Option.Option<BlockId> }>;
const FLUID_MIX_BLOCK_IDS: Readonly<{ readonly cobblestone: Option.Option<BlockId>; readonly obsidian: Option.Option<BlockId> }>;
const FLUID_LEVEL_MIN: number;
const FLUID_LEVEL_MAX: number;
const FLUID_LEVEL_STEP: number;
const SOURCE_FLUID_LEVEL: number;
const FLOWING_FLUID_LEVEL: number;
const blockIdOfFluidKind: (kind: FlowingFluidKind) => Option.Option<BlockId>;
const fluidKindOfBlockId: (blockId: BlockId) => Result.Result<FlowingFluidKind | null, BlockRegistryResolutionFailure>;

const REDSTONE_BLOCK_IDS: Readonly<{
  readonly block: Option.Option<BlockId>;
  readonly comparator: Option.Option<BlockId>;
  readonly lamp: Option.Option<BlockId>;
  readonly lampLit: Option.Option<BlockId>;
  readonly lever: Option.Option<BlockId>;
  readonly observer: Option.Option<BlockId>;
  readonly pressurePlate: Option.Option<BlockId>;
  readonly repeater: Option.Option<BlockId>;
  readonly stoneButton: Option.Option<BlockId>;
  readonly torch: Option.Option<BlockId>;
  readonly wire: Option.Option<BlockId>;
}>;
const REDSTONE_POWER_MIN: number;
const REDSTONE_POWER_MAX: number;
const REDSTONE_POWER_STEP: number;
```

Fluid data は root と `domain/fluid`、redstone data は root から利用できる。BlockWorld と fluid/redstone の実行時更新 API は kernel の公開 API ではない。

### 5-sexies-bis. ネザーポータルの枠（portal）

Portal の寸法定数、軸、枠と layout の型は kernel が公開する。`mc-worldgen` が枠の検出と layout 生成を実装する（[実行時処理の所有元](./responsibility.md)）。

```typescript
type BlockAt = (x: BlockAxis, y: BlockAxis, z: BlockAxis) => BlockId;
type PortalAxis = "x" | "z";
type PortalFrame = Readonly<{
  axis: PortalAxis;
  width: PortalWidth;
  height: PortalHeight;
  interior: ReadonlyArray<BlockPosition>;
}>;
type PortalLayout = Readonly<{
  frame: ReadonlyArray<BlockPosition>;
  interior: ReadonlyArray<BlockPosition>;
}>;

const MIN_PORTAL_WIDTH: number; // 2
const MAX_PORTAL_WIDTH: number; // 21
const MIN_PORTAL_HEIGHT: number; // 3
const MAX_PORTAL_HEIGHT: number; // 21

```

`BlockAt` は軸に `BlockAxis`、戻り値に `BlockId` を使う。寸法は vanilla の検証済み範囲を持つ `PortalWidth` と `PortalHeight` で渡す。

枠の成立判定、ワールドへの書き込み、ポータル間の紐付け、移動、チャンク読み込みは上位層の責務である。

### 5-sexies-ter. data pack layer の共通機構（data-pack-registry）

recipe registry と Sulfur Cube archetype registry が同じ形の「複数 pack を format と priority で
重ねて 1 つの registry に解決する」機構を必要とするため、その共通機構をここで提供する。
どちらか一方の registry に置くと他方がそれに依存することになり、依存の向きが壊れる。

```typescript
type DataPackFormat = number & Brand.Brand<"DataPackFormat">;
type DataPackPriority = number & Brand.Brand<"DataPackPriority">;
type DataPackResourcePath = string & Brand.Brand<"DataPackResourcePath">; // safe relative JSON path below data/
type DataPackRegistryFailure = Readonly<{ readonly _tag: 'DataPackRegistryFailure'; readonly reason: 'invalid-layer' | 'invalid-entry' | 'invalid-format' | 'invalid-priority' | 'invalid-resource-location' | 'invalid-resource-path' | 'duplicate-entry'; readonly message: string }>;
const DataPackFormat(value: number): Result.Result<DataPackFormat, DataPackRegistryFailure>;
const DataPackPriority(value: number): Result.Result<DataPackPriority, DataPackRegistryFailure>;
const DataPackResourcePath(value: string): DataPackResourcePath;

type DataPackRegistryEntry<T> = Readonly<{
  readonly id: NamespacedResourceLocation;
  readonly value: T;
}>;
type DataPackLayer<T> = Readonly<{
  readonly pack: NamespacedResourceLocation;
  readonly format: DataPackFormat;
  readonly priority: DataPackPriority;
  readonly entries: ReadonlyArray<DataPackRegistryEntry<T>>;
}>;

const dataPackLayer: <T>(options: DataPackLayerOptions<T>) => Result.Result<DataPackLayer<T>, DataPackRegistryFailure>;
const dataPackLayerFromUnknown: <T, E>(
  value: unknown,
  decodeValue: (value: unknown) => Result.Result<T, E>,
) => Result.Result<DataPackLayer<T>, DataPackRegistryFailure | E>;
const dataPackLayerFromUnknownWithId: <T, E>(
  value: unknown,
  decodeValue: (id: NamespacedResourceLocation, value: unknown) => Result.Result<T, E>,
) => Result.Result<DataPackLayer<T>, DataPackRegistryFailure | E>;
const mapDataPackLayer: <Input, Output, E>(
  layer: DataPackLayer<Input>,
  mapValue: (value: Input) => Result.Result<Output, E>,
) => Result.Result<DataPackLayer<Output>, E>;
const selectDataPackRegistry: <T>(
  layers: ReadonlyArray<DataPackLayer<T>>,
  format: DataPackFormat,
) => ReadonlyMap<NamespacedResourceLocation, T>;
const dataPackResourcePath: (
  registry: NamespacedResourceLocation,
  id: NamespacedResourceLocation,
) => Result.Result<DataPackResourcePath, DataPackRegistryFailure>;
```

format が完全一致しない layer は選択から落ち、同じ id は priority の高い layer が勝つ。
priority が同値のときは呼び出し側が渡した layer 順を保つ。同じ layer 内の id 重複は構築時に拒否する。
`DataPackFormat` は有限の非負値、`DataPackPriority` は非負 safe integer である。resource path は `data/` 下の相対 `.json` path で、各 segment は小文字英数字、`.`、`_`、`-` のみを許し、空 segment と `.` / `..` segment は拒否する。pack の探索、JSON ファイルの読み出し、pack のインストール順は上位層の責務である。

## 5-septies. Biome（biome）

biome は Java Edition の閉じた biome 語彙と、気温・降水量・降水種別・草/葉/水の tint、対応ディメンションを biome ごとに解決する値表を公開する。地形生成、biome の空間分布、noise パラメータは `mc-worldgen` が、tint の実際の描画は `mc-render` が所有する。

```typescript
const BIOME_TYPES: ReadonlyArray<BiomeType>;
type BiomeType = (typeof BIOME_TYPES)[number];
const PRECIPITATION_KINDS: readonly ['none', 'rain', 'snow'];
type PrecipitationKind = (typeof PRECIPITATION_KINDS)[number];
type BiomeTemperature = number & Brand.Brand<"BiomeTemperature">; // 有限値 [-0.7, 2]
type BiomeDownfall = number & Brand.Brand<"BiomeDownfall">; // 有限値 [0, 1]
type BiomeTint = number & Brand.Brand<"BiomeTint">; // packed RGB 整数 [0, 0xFFFFFF]
const BiomeTemperature(value: number): BiomeTemperature;
const BiomeDownfall(value: number): BiomeDownfall;
const BiomeTint(value: number): BiomeTint;
const SNOW_TEMPERATURE_THRESHOLD = 0.15;
const derivePrecipitationKind: (temperature: BiomeTemperature) => 'rain' | 'snow';

type BiomeProperties = {
  readonly temperature: BiomeTemperature;
  readonly downfall: BiomeDownfall;
  readonly precipitation: PrecipitationKind;
  readonly grassTint: BiomeTint;
  readonly foliageTint: BiomeTint;
  readonly waterTint: BiomeTint;
  readonly dimension: Dimension;
};
const BIOME_PROPERTY_DEFAULTS: BiomeProperties;
type BiomePropertyOverrides = {
  readonly temperature?: BiomeTemperature;
  readonly downfall?: BiomeDownfall;
  readonly precipitation?: 'none';
  readonly grassTint?: BiomeTint;
  readonly foliageTint?: BiomeTint;
  readonly waterTint?: BiomeTint;
  readonly dimension?: Dimension;
};

const isBiomeType: (value: unknown) => value is BiomeType;
const propertiesOfBiomeType: (biome: BiomeType) => BiomeProperties;
type BiomeValidationFailure = Readonly<{ readonly _tag: 'BiomeValidationFailure'; readonly reason: 'unknown-biome'; readonly message: string }>;
const propertiesOfBiome: (biome: unknown) => Result.Result<BiomeProperties, BiomeValidationFailure>;
```

各行は `BIOME_PROPERTY_DEFAULTS`（温帯の平地気候）からの差分だけを書く。これは `BLOCK_REGISTRY` と同じ「差分のみ記述」の規約である。`precipitation` は `'none'` にしか override できない型になっており、雨と雪の切り替えは常に `temperature` から `derivePrecipitationKind` で導出するため、矛盾する override はコンパイルできない。
気温と降水量のブランド値域は同梱 roster の境界に合わせ、tint は packed RGB の整数に限る。

**なぜ kernel か**: biome の気候値と tint は `mc-worldgen`（地形生成）と `mc-render`（tint 描画）の両方が同じ値を必要とし、どちらか一方に置くと依存の向きが壊れる。生成アルゴリズムそのもの、noise パラメータ、biome の空間分布は含まない。

## 5-octies. 光量データ（light）

kernel は block light と sky light の2チャンネルからなる1チャンク分の light volume と、その versioned codec を公開する。light propagation と更新は `mc-worldgen` が所有する（[実行時処理の所有元](./responsibility.md)）。
高さとセル位置、配列長、コピー先の byte offset は `LightVolumeHeight`、`LightChannelIndex`、`LightChannelLength`、`LightChannelByteOffset` で表す。

```typescript
const LIGHT_VOLUME_CODEC_VERSION = 1;
const LIGHT_VOLUME_HEADER_BYTES = 16;

type LightVolumeHeight = number & Brand.Brand<'LightVolumeHeight'>; // 整数 [1, MAX_CHUNK_HEIGHT]
type LightChannelLength = number & Brand.Brand<'LightChannelLength'>;
type LightChannelIndex = number & Brand.Brand<'LightChannelIndex'>;
type LightChannelByteOffset = number & Brand.Brand<'LightChannelByteOffset'>;
const LightVolumeHeight: (value: number) => Result.Result<LightVolumeHeight, LightVolumeFailure>;
const LightChannelLength: Brand.Constructor<LightChannelLength>;
const LightChannelIndex: Brand.Constructor<LightChannelIndex>;
const LightChannelByteOffset: Brand.Constructor<LightChannelByteOffset>;
const lightVolumeCellCount: (height: LightVolumeHeight) => LightChannelLength;
type LightVolumeFailure = { readonly _tag: 'LightVolumeFailure'; readonly reason: 'invalid-height' | 'invalid-index' | 'invalid-channel-value' | 'invalid-copy-range' | 'invalid-channel-length' | 'truncated-header' | 'invalid-magic' | 'unsupported-version' | 'invalid-dimensions' | 'invalid-payload-length'; readonly message: string };
const lightVolumeIndexOf: (height: LightVolumeHeight, local: LocalBlockCoord) => Result.Result<LightChannelIndex, LightVolumeFailure>;

class LightChannel {
  get length(): LightChannelLength;
  at(index: LightChannelIndex): Result.Result<LightLevel, LightVolumeFailure>;
  static fromBytes(bytes: Uint8Array): Result.Result<LightChannel, LightVolumeFailure>;
  toBytes(): Uint8Array;
  copyTo(target: Uint8Array, offset?: LightChannelByteOffset): Result.Result<void, LightVolumeFailure>;
}
const lightChannel: (bytes: Uint8Array) => Result.Result<LightChannel, LightVolumeFailure>;

type LightVolume = {
  readonly height: LightVolumeHeight;
  readonly blockLight: LightChannel;
  readonly skyLight: LightChannel;
};
const lightVolume: (height: LightVolumeHeight, blockLight: Uint8Array, skyLight: Uint8Array) => Result.Result<LightVolume, LightVolumeFailure>;
const blockLightAt: (volume: LightVolume, local: LocalBlockCoord) => Result.Result<LightLevel, LightVolumeFailure>;
const skyLightAt: (volume: LightVolume, local: LocalBlockCoord) => Result.Result<LightLevel, LightVolumeFailure>;
const encodeLightVolume: (volume: LightVolume) => Result.Result<Uint8Array, LightVolumeFailure>;
const decodeLightVolume: (encoded: Uint8Array) => Result.Result<LightVolume, LightVolumeFailure>;
```

**The light volume has a separate codec and `MCLT` magic; `chunk.ts` does not encode it.**

## 5-nonies. Heightmap（heightmap）

heightmap は `Chunk` の block データから導出する、列ごとの不透明面（sky-light の遮蔽用）と移動阻害面（設置・spawn 判定用）の 2 種類を公開する。キャッシュ・無効化・再計算スケジューリングは持たない。呼び出し側が Chunk のブロックが変わるたびに再計算する。

```typescript
type HeightmapColumnIndex = number & Brand.Brand<'HeightmapColumnIndex'>; // flat index、[0, CHUNK_SIZE_XZ² - 1]
const HeightmapColumnIndex(value: number): HeightmapColumnIndex;
type ColumnHeight = ChunkLocalY | undefined;
type Heightmap = ReadonlyArray<ColumnHeight>;
const heightmapColumnIndex: (lx: LocalAxis, lz: LocalAxis) => HeightmapColumnIndex;
type HeightmapFailure = BlockStateFailure | BlockRegistryResolutionFailure;
const opaqueHeightmapOf: (chunk: Chunk) => Result.Result<Heightmap, HeightmapFailure>;
const motionBlockingHeightmapOf: (chunk: Chunk) => Result.Result<Heightmap, HeightmapFailure>;
```

移動阻害面は `passable` ではなく `collisionShape` を読む。感圧板のような「乗れるが通り抜けられる薄い箱」を `collisionShape` は表現できるが、boolean の `passable` だけでは区別できない。設置・spawn 判定にはこの区別が必要である。列の中に条件を満たすブロックが無ければ、その列の答えは `undefined` になる。

## 5-decies. Block entityの共有データと検証（block-entity）

block entityは位置に紐づく付帯データを判別可能unionとして表す。kernelは容量定数、データ型、外部値を検査するtype guardを公開する。位置key付きcollectionの生成・参照・更新は実行時処理の所有元に属する。

```typescript
type ContainerSlotCount = number & Brand.Brand<'ContainerSlotCount'>;
const ContainerSlotCount: Brand.Constructor<ContainerSlotCount>; // positive safe integer
const CHEST_SLOT_COUNT: ContainerSlotCount;
const LARGE_CHEST_SLOT_COUNT: ContainerSlotCount;
const HOPPER_SLOT_COUNT: ContainerSlotCount;
const DISPENSER_SLOT_COUNT: ContainerSlotCount;
const DROPPER_SLOT_COUNT: ContainerSlotCount;
const SHULKER_BOX_SLOT_COUNT: ContainerSlotCount;
const BARREL_SLOT_COUNT: ContainerSlotCount;
const STORAGE_CONTAINER_KINDS: ReadonlyArray<StorageContainerKind>;
type StorageContainerKind = (typeof STORAGE_CONTAINER_KINDS)[number];
const STORAGE_CONTAINER_CAPACITIES: Readonly<Record<StorageContainerKind, ContainerSlotCount>>;
type StorageContainer = Readonly<{
  kind: StorageContainerKind;
  capacity: ContainerSlotCount;
  slots: ReadonlyArray<Slot>;
}>;
type BlockEntity =
  | Readonly<{ _tag: "StorageContainer"; position: BlockPosition; container: StorageContainer }>
  | Readonly<{ _tag: "Furnace"; position: BlockPosition; state: FurnaceState }>
  | Readonly<{ _tag: "BrewingStand"; position: BlockPosition; state: BrewingState }>
  | Readonly<{ _tag: "Sign"; position: BlockPosition; text: TextComponent }>;
type BlockEntityTag = BlockEntity["_tag"];

const isBlockEntityPosition: (value: unknown) => value is BlockPosition;
const isStorageContainer: (value: unknown) => value is StorageContainer;
const isFurnaceState: (value: unknown) => value is FurnaceState;
const isBrewingState: (value: unknown) => value is BrewingState;
const isBlockEntity: (value: unknown) => value is BlockEntity;
```

## 5-undecies. ゲームモードと難易度（game-mode）

`GameMode` と `Difficulty` の閉じた語彙と、メンバーごとの値表（`GameModeProperties` / `DifficultyProperties`）を公開する。値表が答えるのは「そのモード・難易度で何が許可され何が起きるか」だけであり、プレイヤーのモードを実際に切り替えてよいかという権限判定は上位層の責務である。

```typescript
const GAME_MODES: readonly ['survival', 'creative', 'adventure', 'spectator'];
type GameMode = (typeof GAME_MODES)[number];
type GameModeProperties = Readonly<{
  readonly mode: GameMode;
  readonly mayBreakBlocks: boolean;
  readonly mayPlaceBlocks: boolean;
  readonly mayFly: boolean;
  readonly hasBlockCollision: boolean;
  readonly takesDamage: boolean;
  readonly consumesHunger: boolean;
}>;
const GAME_MODE_PROPERTIES: Readonly<Record<GameMode, GameModeProperties>>;

const DIFFICULTIES: readonly ['peaceful', 'easy', 'normal', 'hard'];
type Difficulty = (typeof DIFFICULTIES)[number];
type DifficultyDamageMultiplier = number & Brand.Brand<'DifficultyDamageMultiplier'>;
type DifficultyHungerMultiplier = number & Brand.Brand<'DifficultyHungerMultiplier'>;
const DifficultyDamageMultiplier: Brand.Constructor<DifficultyDamageMultiplier>;
const DifficultyHungerMultiplier: Brand.Constructor<DifficultyHungerMultiplier>;
type DifficultyProperties = Readonly<{
  readonly difficulty: Difficulty;
  readonly hostileMobsMaySpawn: boolean;
  readonly damageMultiplier: DifficultyDamageMultiplier;
  readonly hungerMultiplier: DifficultyHungerMultiplier;
}>;
const DIFFICULTY_PROPERTIES: Readonly<Record<Difficulty, DifficultyProperties>>;

const isGameMode: (value: unknown) => value is GameMode;
const isDifficulty: (value: unknown) => value is Difficulty;
type GameModeValidationFailure = { readonly _tag: 'GameModeValidationFailure'; readonly kind: 'TypeError'; readonly reason: 'unknown-game-mode' | 'unknown-difficulty'; readonly field: 'gameMode' | 'difficulty'; readonly message: string; readonly value?: unknown };
const resolveGameModeProperties: (value: unknown) => Result.Result<GameModeProperties, GameModeValidationFailure>;
const resolveDifficultyProperties: (value: unknown) => Result.Result<DifficultyProperties, GameModeValidationFailure>;
```

`mayFly` は**モードが無条件に与える飛行**だけを指す。Survival/Adventure でエリトラ装備時に飛べることはアイテムの装備状態に依存する事実であり、Adventure モードの `can_break` / `can_place_on` によるブロック相互作用の制限はアイテムの data tag に依存する事実であって、どちらもモード自身の値ではないため値表に含めない。

**なぜ kernel か**: `mode` と `difficulty` はシミュレーション権威側（`mx-gameplay`）と表示側（`mx-ui`）の両方が同じ値表を同じメンバーシップで参照する必要があり、どちらか一方に置くと依存の向きが壊れる。root のほか `domain/game-mode` subpath から利用できる。

## 5-duodecies. GameRules の所有元

GameRules の値・検証・更新 API は `mc-sim` が所有し、kernel では公開しない（[実行時処理の所有元](./responsibility.md)）。

## 5-terdecies. ダメージ種別（damage-type）

`DamageType` は Minecraft Java Edition 26.3 golden に照合した、kernel が現在表現する閉じたダメージ種別語彙と、種別ごとの `armorReduces`（防具軽減の可否）・`bypassesInvulnerability`（無敵時間貫通の可否）・`kind`（fire/explosion/projectile/magic/fall/drowning/generic の分類）・`scalesWithDifficulty` を公開する。**生ダメージ・防具値・靭性・保護・耐性から最終ダメージを求める軽減計算は公開しない。** この語彙と値は2つの独立した消費者が使うためkernelに残る。軽減計算の消費者は現時点で`mx-gameplay`だけであり、その処理はkernelのAPIに含まれない。

```typescript
const DAMAGE_TYPE_NAMES: ReadonlyArray<DamageTypeName>;
type DamageTypeName = (typeof DAMAGE_TYPE_NAMES)[number];
const DAMAGE_TYPE_KINDS: readonly ['fire', 'explosion', 'projectile', 'magic', 'fall', 'drowning', 'generic'];
type DamageTypeKind = (typeof DAMAGE_TYPE_KINDS)[number];
type DamageTypeDefinition = Readonly<{
  readonly name: DamageTypeName;
  readonly armorReduces: boolean;
  readonly bypassesInvulnerability: boolean;
  readonly kind: DamageTypeKind;
  readonly scalesWithDifficulty: boolean;
}>;
const DAMAGE_TYPE_DEFINITIONS: Readonly<Record<DamageTypeName, DamageTypeDefinition>>;
const damageTypeId: (name: DamageTypeName) => ResourceLocation;

const isDamageTypeName: (value: unknown) => value is DamageTypeName;
const isDamageTypeId: (value: unknown) => value is ResourceLocation;
type DamageTypeDefinitionFailure = { readonly _tag: 'UnknownDamageType'; readonly value: unknown };
const resolveDamageTypeDefinition: (value: unknown) => Result.Result<DamageTypeDefinition, DamageTypeDefinitionFailure>;
```

`isDamageTypeId` は戻り値の型を `ResourceLocation` に絞り込むと同時に、閉じた vanilla roster への所属を検証する。任意の well-formed `ResourceLocation` を許容する item component の検証には `isDamageTypeComponent` を使う。

roster と各フィールドは `test/golden/vanilla-damage-type.json` として固定した misode/mcmeta の Java Edition 26.3 pin に照合する。`kind` は `is_fire` / `is_explosion` / `is_projectile` / `is_fall` / `is_drowning` タグの帰属から導出し、どのタグも持たない id は `generic` になる。pin と縮約表の範囲は [conformance.md](./conformance.md) に記録する。

`isDamageTypeComponent` は root と `@nerima-games/mc-kernel/domain/item-combat` subpath から利用できる。任意の well-formed `ResourceLocation` を受け付けるため、data pack が独自に登録するダメージ種別も扱える。

`mc-audio` は damage type ごとの hurt sound を選び、`mx-ui` は同じ type から死亡メッセージを組み立てる。両者は依存グラフ上で互いに届かないため、共通型を kernel に置く。型は root と `domain/damage-type` subpath から利用できる。

## 6. クロック Port（clock）

```typescript
type ClockService = {
  readonly monotonicSecs: Effect.Effect<MonotonicTimeSecs>
  readonly wallClockEpochMillis: Effect.Effect<EpochMillis>
}
class ClockPort extends Context.Service<ClockPort, ClockService>()('@nerima-games/mc-kernel/ClockPort') {}

const fixedClock(at): ClockService
const FixedClockLayer(at): Layer
const monotonicSecs: Effect.Effect<MonotonicTimeSecs, never, ClockPort>
const wallClockEpochMillis: Effect.Effect<EpochMillis, never, ClockPort>
```

ClockPort は決定論と fast-forward の要である。`mc-sim` のシナリオテスト、`mc-worldgen` のチャンク寿命、`mc-save` の自動保存、`mx-gameplay` の昼夜はすべて同じ時計を見る必要がある。

kernel はテスト用の固定実装だけを持ち、**実クロックを読むアダプタは持たない**。
実装は利用側（ブラウザなら `performance` / Node なら `process.hrtime`）が注入する。

kernel のシミュレーションコードでは、`Date.now()`、`new Date()`、`performance.now()` を直接呼ばない。
`.ast-grep/rules/no-wall-clock-read.yml` と `pnpm lint` が `src/` の直接参照を検出し、違反を失敗にする。
Port を実装するプラットフォームアダプタだけが実クロックを読み、kernel の利用側には `ClockPort` を注入する。

## 6-bis. 乱数契約（random-source）

random-source は `RandomSource` の契約、seed から決定的に導出する生成器、そしてテスト用の scripted 実装を公開する。乱数を実引数として受け取る消費側の純粋関数は kernel に置いてよいが、乱数の**源**（`Math.random` や platform CSPRNG への直接アクセス）は上位層が注入する。この境界は `ClockPort` と同じ形である。

```typescript
type RandomSource = Readonly<{
  readonly nextInt: (bound: number) => Result.Result<RandomInt, RandomSourceFailure>;
  readonly nextFloat: () => Result.Result<RandomFraction, RandomSourceFailure>;
}>;
type RandomSeed = number & Brand.Brand<'RandomSeed'>; // safe integer
type RandomIntBound = number & Brand.Brand<'RandomIntBound'>; // positive safe integer
type RandomInt = number & Brand.Brand<'RandomInt'>; // non-negative safe integer
type RandomFraction = number & Brand.Brand<'RandomFraction'>; // [0, 1)
const RandomSeed(value: number): RandomSeed;
const RandomIntBound(value: number): RandomIntBound;
const RandomInt(value: number): RandomInt;
const RandomFraction(value: number): RandomFraction;
type RandomSourceFailure = Readonly<{ readonly _tag: 'RandomSourceFailure'; readonly reason: 'invalid-seed' | 'invalid-bound' | 'sequence-exhausted' | 'invalid-script'; readonly message: string }>;
const seededRandomSource: (seed: number) => Result.Result<RandomSource, RandomSourceFailure>;

type RandomSourceScript = Readonly<{
  readonly nextInts?: ReadonlyArray<RandomInt>;
  readonly nextFloats?: ReadonlyArray<RandomFraction>;
}>;
const fixedRandomSource: (script: RandomSourceScript) => Result.Result<RandomSource, RandomSourceFailure>;
```

`RandomSeed` と `RandomIntBound` は数値制約を検証するブランドコンストラクタである。`seededRandomSource` と `RandomSource.nextInt` は通常の `number` を受け取り、境界で検証したうえで不正値には `RandomSourceFailure` を返す。`seededRandomSource` は Park–Miller の「minimal standard」Lehmer 生成器を実装する。seed は safe integer に限り、modulus で剰余化した後、状態が 0 なら 1 に正規化するため、seed `0` と seed `2^31 - 1` は seed `1` と同じ列を返す。同じ seed と同じ呼び出し順は常に同じ値の列を返し、リプレイと早送りの前提になる。`fixedRandomSource` は `fixedClock` と対の scripted 実装で、指定した値を使い切ると、黙って折り返したり既定値へフォールバックしたりせず、`sequence-exhausted` の `RandomSourceFailure` を返す。

## 6-ter. 共通ドメイン語彙（shared-vocabulary）

`domain/shared-vocabulary` は branded ID、座標、tick、revision の Schema を公開する。`EntityIdSchema` と `WorldIdSchema` は非空文字列、`DimensionIdSchema` は `overworld` / `nether` / `end`、`ItemIdSchema` と `BlockIdSchema` は 0..65535 の整数を受け付ける。`BlockPositionSchema` は整数の `BlockAxis` 3 軸、`BlockAddressSchema` は dimension と block position、`WorldPositionSchema` は dimension と有限座標を検証する。tick と world/dimension revision は非負整数である。

型として直接公開する名前は `AngleRadians`、`BlockAddress`、`WorldPosition`、`WorldRevision`、`DimensionRevision` である。`EntityId`、`WorldId`、`DimensionId`、`BlockId`、`ItemId`、`BlockPosition`、`SimulationTick` は Schema の decode 結果に含まれるが、この subpath から型名では import できない。Schema の出力型を注釈に使う場合は、たとえば `Schema.Schema.Type<typeof BlockPositionSchema>` と書ける。

`BlockIdSchema` の出力は 0..65535 の数値ブランドである。公開型の形は次のとおり。

```typescript
type BlockAddress = Schema.Schema.Type<typeof BlockAddressSchema>;
type WorldPosition = Schema.Schema.Type<typeof WorldPositionSchema>;
```

`BlockPositionSchema` は整数軸、`WorldPositionSchema` は有限座標を検証する。`AngleRadians` は有限なラジアン値で、camera pose と vehicle heading が共有する。

## 7. `GameModule` / `StageRegistration`（frame）

```typescript
type FrameServices = ClockPort

interface StageRegistration {
  readonly id: StageId;
  readonly after?: ReadonlyArray<StageId>;
  readonly run: (
    dt: DeltaTimeSecs,
  ) => Effect.Effect<void, never, FrameServices>;
}

interface KernelGameModule<ROut, E, RIn, RRegister = never> {
  readonly layers: Layer.Layer<ROut, E, RIn>;
  readonly frameStages: Effect.Effect<
    ReadonlyArray<StageRegistration>,
    never,
    RRegister
  >;
}

interface GameModule<ROut, E, RIn, RRegister = never>
  extends KernelGameModule<ROut, E, RIn, RRegister> {
  readonly qa?: QaNamespace;
  readonly saveSlices?: ReadonlyArray<SaveSliceRegistration>;
}
```

各モジュールは共通の `GameModule` 契約を実装する。これを `mc-compose` に置くと、全モジュールが `mc-compose` に依存するため、依存グラフが反転する。

`run` での失敗に対するフレーム単位の回復策はない。実行時に失敗しうる stage は自分で処理するか defect にする。

### 未解決の `after` 依存

`mc-compose` の `StageOrderPlan` は存在しない stage への依存を `dangling` として返す。また、フレームの標準phaseに割り当てられないstageは実行順の末尾に置き、`unmatchedPhase` として返す。ホストは両方の warning を表示する。存在しない入力 stage の後に実行する拡張 stage を宣言できるため、未解決の依存は拒否しない。

`frameStages` は Effect なので、stage 登録時に必要な service を取得できる。その環境 `RRegister` は Layer 構築時の `RIn` と stage 実行時の `FrameServices` とは異なる。

### `RRegister` と `RIn` は別の環境である

登録時と Layer 構築時に必要な依存は異なる。例を挙げる。

- `mc-render` は `render:input` を登録するために `InputService` を取得する。
  しかし `InputService` は mc-render が**提供する**側（`ROut`）であって、与えられる側ではない。
  `RIn` に畳むと「自分が出荷するものを他人が供給するまでこのモジュールは組み立てられない」と言うことになる。
- 逆に、Layer を組むためだけに必要でどの stage も触らないプラットフォームハンドル（キャンバス、保存ディレクトリ）がある。
  登録文脈に畳むと、ホストが同じものを 2 回供給することになる。

既定値 `never` を置いてあるので、「stage の構築に何も要らない」通常のモジュールは今までどおり 3 パラメータで書ける。

`frameStages` の**エラーチャネルは `never`** のままである（Layer 側とは違う）。
起動に失敗しうるモジュールは `E` で表明すればよく、ホストはそこを既に見ている。
「このモジュールは使えない」を意味するチャネルが 2 本あると、ホストは見る場所が 2 つになり、区別する手段が無い。

### `FrameServices`

stage の実行環境は `ClockPort` だけを要求する。

判断の根拠となるのは `mc-sim` の `PlayerServiceApi.cameraPose`（`mc-sim/application/player-service.ts:35`）である。

```typescript
readonly cameraPose: Effect.Effect<CameraPoseSnapshot, never, ClockPort>
```

要求は**メソッド側**に付いていて、`PlayerService` の取得時には付かない。登録時に `PlayerService` を取得した stage は、1 フレーム後に `cameraPose` を呼ぶ時点で `ClockPort` を必要とする。

stage は時間を読まずに進めず、かつグローバルから読んではならないので、`never` も候補ではなかった。

`FrameServices` に新しい service を加えるのは、stage 実行時の環境を用意する _提供者_（ランタイムを組む人）にとって破壊的変更である。stage の _著者_ は既存の `run` 実装をそのまま使える。
1.0.0 で凍結され、広げるのは MAJOR である。

### QA namespace と save slice

`QaOperation` は入出力 codec と型付きの失敗・要求サービスを持つ Effect handler、`QaNamespace` は非空の branded name と `observe` / `command` の operation map を持つ。`SaveSliceRegistration` は安定した ID、正の整数 version、codec、snapshot/restore Effect、migration list を表す。`defineSaveMigration` は保存済み値を移行元 codec で decode し、同期の全域変換を適用して移行先 codec で encode する。これらは kernel の型と helper であり、namespace の重複検査、dispatcher、save bundle の読込は compose/save 側の責務である。

ID/name schema は空でない文字列、`SaveVersionSchema` は正の整数、`ModuleContractKindSchema` は `qa-namespace` / `qa-operation` / `save-slice` を検証する。例示用の `QaBlockPositionInput` / `QaBlockIdOutput` codec と `ObserveBlockAtQa` / `ExampleQaNamespace` 型も `domain/module-contracts` subpath から利用できる。

## 7-bis. DomainEvent（domain-event）

`DomainEventSchema` はイベント発生時点の値を持つ tagged union であり、`domain/domain-event` subpath から import できる。`position` の座標単位は block である。

| `_tag` | payload | 制約 |
| --- | --- | --- |
| `EntityDamaged` | `tick`, `entity`, `position`, `amount` | damage は有限の正数 |
| `BlockBroken` | `tick`, `actor`, `address`, `block` | `block` は数値 `BlockId` |
| `Explosion` | `tick`, `position`, `power` | power は整数 1..6 |
| `LevelUp` | `tick`, `entity`, `position`, `level` | level は 1 以上の safe integer |
| `AchievementUnlocked` | `tick`, `player`, `achievement` | achievement ID は非空文字列 |

`ExperienceLevelSchema` は event payload には含まれない、0 以上の safe integer の `ExperienceLevel` を検証する。`LevelUpLevelSchema` は `LevelUp.level` に使う 1 以上の safe integer を検証する。event bus と subscriber capacity は `mc-sim` 側である。
event subpath は branded type `AchievementId` を、package root は同じ型を `DomainEventAchievementId` として公開する。

## 7-ter. WorldWritePort（world-write-port）

`domain/world-write-port` subpath は kernel の書込 port とデータ型を公開する。`BlockEditSchema` は `{ position, block }` を検証し、同じ shape を `BlockEdit` 型で表す。`WorldWriteBatchSchema` は world/dimension の期待 revision と edits、`WorldWriteCommitSchema` は確定後の両 revision を表す。batch schema は空の `edits` も構造上 decode する。`WorldWriteInvalidBatch.reason` は `empty` または `duplicate-position` を示す。

```typescript
class WorldWritePort extends Context.Service<WorldWritePort, {
  readonly applyBatch: (
    batch: WorldWriteBatch,
  ) => Effect.Effect<
    WorldWriteCommit,
    WorldWriteConflict | WorldWriteInvalidBatch
  >;
}>()("mc-kernel/domain/world/WorldWritePort") {}
```

`Context.Service` に渡す文字列は service の識別子で、package の import path ではない。型と value は `domain/world-write-port` subpath から import する。

既存の `domain/world-read-write` subpath は `{ position, blockId }` の `BlockEdit` を公開する。root barrel はこの型を保ち、port subpath の `{ position, block }` 型を `WorldWriteBlockEdit` として公開する。port 固有の `BlockEdit` 型を使う場合は `domain/world-write-port` subpath から import する。adapter と mutation 実装はこの契約には含まれない。



## Chunk バイナリ形式

```typescript
const CHUNK_CODEC_VERSION = 2
const CHUNK_HEADER_BYTES = 24
const MAX_CHUNK_HEIGHT = 0xffff

type ChunkFailure = { readonly _tag: 'ChunkFailure'; readonly reason: 'invalid-height' | 'invalid-coordinate' | 'invalid-block-state' | 'invalid-block-count' | 'truncated-header' | 'invalid-magic' | 'unsupported-version' | 'invalid-dimensions' | 'invalid-payload-length' | 'invalid-chunk-shape'; readonly message: string }
type BlockStateFailure = { readonly _tag: 'BlockStateFailure'; readonly reason: 'invalid-index' | 'unknown-block-id' | 'invalid-copy-range' | 'invalid-element-count'; readonly message: string }
type ChunkHeight = number & Brand.Brand<'ChunkHeight'>   // 整数、1..MAX_CHUNK_HEIGHT
type ChunkLocalY = number & Brand.Brand<'ChunkLocalY'> // chunk 内の整数 Y、0..MAX_CHUNK_HEIGHT-1
type ChunkBlockCount = number & Brand.Brand<'ChunkBlockCount'> // 256 の倍数、256..256*MAX_CHUNK_HEIGHT
type EncodedChunk = ReadonlyByteArray & Brand.Brand<'EncodedChunk'>
type BlockStateIndex = number & Brand.Brand<'BlockStateIndex'>;
type BlockStateLength = number & Brand.Brand<'BlockStateLength'>;
type BlockStateByteOffset = number & Brand.Brand<'BlockStateByteOffset'>;

const ChunkHeight(value: number): Result.Result<ChunkHeight, ChunkFailure>
const ChunkLocalY: Brand.Constructor<ChunkLocalY>
const ChunkBlockCount: Brand.Constructor<ChunkBlockCount>
const BlockStateIndex: Brand.Constructor<BlockStateIndex>
const BlockStateLength: Brand.Constructor<BlockStateLength>
const BlockStateByteOffset: Brand.Constructor<BlockStateByteOffset>
const EncodedChunk(encoded: Uint8Array | EncodedChunk): Result.Result<EncodedChunk, ChunkFailure> // ヘッダー・寸法・長さを検証し、入力を所有する constructor
const chunkBlockCount(height: ChunkHeight): ChunkBlockCount // CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height
const ChunkBlocks(height: ChunkHeight, blocks: Uint8Array): Result.Result<ChunkBlocks, ChunkFailure | BlockStateFailure>
const chunk: (coord: ChunkCoord, height: ChunkHeight, blocks: Uint8Array) => Result.Result<Chunk, ChunkFailure | BlockStateFailure>
```

`chunk(coord, height, blocks)` は 16×16 の縦列 Chunk を構築する。`blocks` 引数は
`16 * 16 * height` バイトの生 `Uint8Array` を取り、各バイトは登録済みの `BlockId` でなければならない。
各バイトを1つの ID（0..255）として扱い、`BlockState` の2バイト要素へ広げる。`chunk()` と `blockState()` は
16ビット幅の入力を受け取らない。構築時にバッファをコピーするため、呼び出し側の後続変更は Chunk に波及しない。

**`Chunk.blocks` は生の `Uint8Array` ではなく `ChunkBlocks` を保持する。**

```typescript
type ChunkBlocks = BlockState & Brand.Brand<'ChunkBlocks'>

class BlockState {
  static fromBytes(bytes: Uint8Array): Result.Result<BlockState, BlockStateFailure>;
  static fromElementBytes(payload: Uint8Array, elementCount: BlockStateLength): Result.Result<BlockState, BlockStateFailure>;
  get length(): BlockStateLength
  get(index: BlockStateIndex): Result.Result<BlockId, BlockStateFailure>
  set(index: BlockStateIndex, blockId: BlockId): Result.Result<void, BlockStateFailure>
  toBytes(): Uint8Array
  copyTo(target: Uint8Array, offset?: BlockStateByteOffset): Result.Result<void, BlockStateFailure>
}
const blockState(bytes: Uint8Array): Result.Result<BlockState, BlockStateFailure>   // BlockState.fromBytes のラッパー。全バイトを登録済み BlockId として検証する
const chunk(coord: ChunkCoord, height: ChunkHeight, blocks: Uint8Array): Result.Result<Chunk, ChunkFailure | BlockStateFailure>
const encodeChunk(value: Chunk): Result.Result<EncodedChunk, ChunkFailure | BlockStateFailure>
const decodeChunk(encoded: Uint8Array | EncodedChunk): Result.Result<Chunk, ChunkFailure | BlockStateFailure>
```

`chunk()` / `decodeChunk()` は入力バイト列を構築時に一度だけ検証し、以後は `ChunkBlocks` 経由でのみ
読み書きさせる。**添字演算子（`blocks[i]`）は意図的に公開していない。** `get` / `set` は範囲と registry membership を検証し、失敗を `BlockStateFailure` で返して
バッファの不変条件（長さの範囲内であること・登録済み ID のみが書けること）を強制する。生バイト列が
必要な消費者（ワイヤ送信、コピー）は `toBytes()`（新規コピーを返す）または `copyTo(target, offset?)`
（呼び出し側バッファへ範囲チェック付きで書き込み、割り当てを増やさない）を使う。

`BlockState.fromElementBytes` は要素数と little-endian の 16-bit payload を受け取り、登録済み ID を検証する。`chunk()` / `blockState()` は 1 バイトに 1 要素を置く入力 API である。

**ワイヤは v1 と v2 に分かれ、v1 は decode 専用である。** `CHUNK_CODEC_VERSION`（現在 `2`）はブロック
要素を 16-bit little-endian で書く現行フォーマットを指す。8-bit 1 要素だった v1 のバイト列は互換パスで
引き続き decode できるが、`encodeChunk` は常に v2 を書き出す。v1 として再 encode されることはない。
`BlockId` の数値自体は変えていない（`BLOCK.SAND === 5` は 5 のまま）ので、v1 が保存していた id と v2 が
書く id は同じ意味を持つ。両フォーマットの切り替えはヘッダーの `CHUNK_CODEC_VERSION` フィールドで判定する。

`decodeChunk` は v2 の 16-bit 値を全幅のまま `isKnownBlockId` に渡し、`BlockState` に 2 バイト要素として保持する。下位 1 バイトに切り詰めてから検証すると、256 以上の未知 ID が有効な `BlockId` に化ける可能性があるため、全幅での検証が必要である。v2 は16ビットの登録済み ID を保持できるが、`chunk()` と `blockState()` の入力は1バイト形式である。

`encodeChunk` / `decodeChunk` は固定 `CHUNK_HEADER_BYTES`（24）バイトヘッダーとブロック列を用いる。
ヘッダーの整数はすべて little-endian で、各フィールドは次の byte offset と幅を持つ。

| offset | 幅 | フィールド |
| --- | --- | --- |
| 0 | 4 bytes | magic (`MCHK`) |
| 4 | unsigned 16-bit | codec version |
| 6 | unsigned 16-bit | width |
| 8 | unsigned 16-bit | depth |
| 10 | unsigned 16-bit | height |
| 12 | signed 32-bit | chunk x (`cx`) |
| 16 | signed 32-bit | chunk z (`cz`) |
| 20 | unsigned 32-bit | payload length in bytes |

decoder は magic、version、寸法、長さ、未知の BlockId、
末尾の余剰データを破損として拒否する。`EncodedChunk` は書き込み API を公開しない read-only branded byte view で、
`encodeChunk` の戻り値と `decodeChunk` への入力の両方に使われる。constructor は検証済みの入力をコピーするため、
入力側の `Uint8Array` を後から変更しても `EncodedChunk` の内容は変わらない。可変なコピーが必要なら `slice()` を使う。

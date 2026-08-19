# 公開 API

`index.ts` が公開バレルであり、他 15 リポジトリはここだけを import する。
`test/public-api.test.ts` がバレルの再エクスポート漏れを固定している
（バレルから 1 つ落ちても kernel 内の他のテストは全部通るが、組織全体が壊れるため）。

**なぜこれらの型が kernel にあるのか** は plan.md §4.3「横断の型（kernel に置く共有界面）」が答えである。
判定基準は 1 つ: **2 つ以上のリポジトリが同じものを指す必要があり、かつ片方に置くと依存の向きが壊れるか？**
壊れるなら kernel、壊れないなら所有者のリポジトリ。

## 1. ブランデッド型（identifiers / quantities）

```typescript
type WorldId          = string & Brand.Brand<'WorldId'>
type StageId          = string & Brand.Brand<'StageId'>
type StackCount       = number & Brand.Brand<'StackCount'>   // 0..MAX_STACK_COUNT (64)
type DeltaTimeSecs    = number & Brand.Brand<'DeltaTimeSecs'>
type MonotonicTimeSecs = number & Brand.Brand<'MonotonicTimeSecs'>
type EpochMillis      = number & Brand.Brand<'EpochMillis'>

const MAX_STACK_COUNT = 64
```

いずれも `Brand.refined` によるコンストラクタを同名で公開する（値と型の両方）。

**なぜ kernel か**: `WorldId` は `mc-save` が保存キーに使い、`mc-sim` がセッション管理に使い、`mc-compose` がワールド選択に使う。
どこか 1 つに置けば他の 2 つがそのリポジトリに依存することになり、依存グラフが壊れる。
`StackCount` も同様に `mc-sim`（インベントリ状態）と `mx-ui`（表示）と `mx-gameplay`（ドロップ）が同じ制約を共有する必要がある。

**時間の 3 型を分けている理由**: `DeltaTimeSecs`（フレーム差分）/ `MonotonicTimeSecs`（単調時計）/ `EpochMillis`（壁時計）は
数値としては全部 number だが混同すると即バグになる。特に `MonotonicTimeSecs` と `EpochMillis` の混同は
「セーブのタイムスタンプがプロセス起動からの経過秒になる」類の事故を生む。

## 2. 座標系と AABB（coordinates）

```typescript
const CHUNK_SIZE_XZ = 16

type BlockAxis = number & Brand.Brand<'BlockAxis'>   // 格子座標の 1 軸（整数）
type ChunkAxis = number & Brand.Brand<'ChunkAxis'>   // チャンク座標の 1 軸（整数）
type LocalAxis = number & Brand.Brand<'LocalAxis'>   // チャンク内ローカル（0..15）

type Position      = { readonly x: number; readonly y: number; readonly z: number }      // 連続座標
type BlockPosition = { readonly x: BlockAxis; readonly y: BlockAxis; readonly z: BlockAxis }
type BlockFace = 'down' | 'up' | 'north' | 'south' | 'west' | 'east'
type ChunkCoord    = { readonly cx: ChunkAxis; readonly cz: ChunkAxis }
type LocalBlockCoord = { readonly lx: LocalAxis; readonly y: BlockAxis; readonly lz: LocalAxis }
type AABB          = { readonly min: Position; readonly max: Position }

const position / blockPosition / chunkCoord
const BLOCK_FACES / HORIZONTAL_BLOCK_FACES / isBlockFace / oppositeBlockFace
const adjacentBlockPosition / horizontalBlockNeighbours / blockNeighbours
const blockPositionOfPosition / chunkCoordOfBlock / localCoordOfBlock / blockPositionOfChunkLocal
const aabb / aabbOfBlock / aabbIntersects / aabbContainsPoint
```

**なぜ kernel か**: 座標変換は `mc-worldgen`（生成）・`mc-meshing`（メッシュ）・`mc-physics`（衝突）・`mc-sim`（エンティティ）・`mc-render`（描画）が
全員必要とする。どれか 1 つに置けば残り 4 つがそこに依存し、階層構造が崩壊する。
`BLOCK_FACES` は `down, up, north, south, west, east` の順を契約として固定する。
`HORIZONTAL_BLOCK_FACES` は既存 gameplay 規則と互換な `west, east, north, south` の順を固定する。
北は -Z、西は -X であり、近傍探索を実行ごとに同じ順序に保つ。

**`Position` と `BlockPosition` を型で区別している理由**は plan.md §3.4 の実測知見に直結する。

> 「物が浮く」バグ類は例外なく**足元原点 vs AABB 中心の Y 規約不一致**が原因。座標規約を型で区別する

連続座標と格子座標を同じ `{x,y,z}` にしていると、この不一致は型検査を通り抜けて実行時に「浮く」として現れる。

### 2-bis. 座標のキー化（coordinate-keys）

`Map` のキーや保存フォーマットに座標を使うリポジトリ（チャンクストア、dirty 集合、ネットワーク差分）向けの
正準文字列表現。`0.2.19` で出荷済み。

```typescript
type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>   // 正準形式 "x,y,z"
type ChunkKey         = string & Brand.Brand<'ChunkKey'>           // 正準形式 "cx,cz"

const blockPositionKeyOf(value: BlockPosition): BlockPositionKey
const BlockPositionKey(value: string): BlockPositionKey            // 検証して throw する constructor
const isBlockPositionKey(value: string): value is BlockPositionKey
const blockPositionOfKey(value: BlockPositionKey): BlockPosition   // 検証済み値専用、不正なら throw
const decodeBlockPositionKey(value: string): BlockPosition | undefined  // 未検証の外部入力専用

const chunkKeyOf(value: ChunkCoord): ChunkKey
const ChunkKey(value: string): ChunkKey
const isChunkKey(value: string): value is ChunkKey
const chunkCoordOfKey(value: ChunkKey): ChunkCoord
const decodeChunkKey(value: string): ChunkCoord | undefined
```

**正準形は 1 つだけ。** `"1,2,3"` は valid だが `"01,2,3"` や `" 1,2,3"` は invalid ——
整数の再文字列化と入力テキストが一致することを要求する（`hasCanonicalIntegerText`）。
これにより同じ座標は常に同じキー文字列になり、キーの文字列比較がそのまま座標の等価性比較になる。
負の 0 は `normalizeZero` で正の 0 に畳んでおり、`-0` と `0` が異なるキーになる事故を防ぐ。

**「検証して例外」と「未検証入力を安全に読む」を関数を分けて表現している。**
`blockPositionOfKey` / `chunkCoordOfKey` はすでに `BlockPositionKey` / `ChunkKey` 型を持つ
（＝どこかで検証済みの）値を受け取る前提の全域関数に近い形をしており、
`decodeBlockPositionKey` / `decodeChunkKey` は生の `string`（ネットワークやセーブファイルからの
未検証入力）を受け取り、失敗を `undefined` で表す部分関数である。呼び出し側が
どちらの信頼境界にいるかを型シグネチャで区別できる。

## 3. ブロック語彙（block-type）

```typescript
const BLOCK_TYPES = ['air', 'stone', ..., 'snow'] as const
type BlockType = (typeof BLOCK_TYPES)[number]
const isBlockType = (value: string): value is BlockType
```

**現行の `BlockType` は 123 種である。** 監査時点の参照実装は 120 リテラルであり、kernel はそれを基礎に
`soul_soil`、`wither_skeleton_skull`、`dropper` を追加している。plan.md の「約 119」は監査時点の概数である。

**ブロックの追加は加算的だが、語彙だけの追加ではない。** 挙動は名前ではなく能力から読むので、消費側のコードは
通常変えずに済む。一方で追加する各リテラルには、安定した ID と能力・属性を持つレジストリ行が必要である。
これが plan.md §3.1 の要求「ブロック追加 = 定義テーブル 1 行 + フラグ設定」の意味である。

**なぜ kernel か**: `BlockType` は網羅性チェックのための語彙であり、セーブフォーマット（`mc-save`）・
メッシュ（`mc-meshing`）・物理（`mc-physics`）・ルール（`mx-gameplay`）が同じ集合を指す必要がある。
plan.md §5.3 は「core と block の分離」を「ブロック追加が必ず両方を共変更する」という理由で棄却しており、
語彙と能力モデルが同じリポジトリにあることは意図的である。

### 3-1. 数値ブロック ID と空気判定（block-registry）

```typescript
type BlockId = number & Brand.Brand<'BlockId'>
const BLOCK_ID_MAX = 255   // Uint8Array の 1 バイトに収まる上限
const AIR_BLOCK_ID: BlockId = 0
const isEmpty: (id: number) => boolean
```

`BlockId` はチャンクの `Uint8Array` に格納する安定した密な数値 ID である。`isEmpty` の引数は
意図的に `number` とし、チャンクバッファから読み出した未ブランドの値を直接受け取る。
空気は ID 0 だけであり、判定はレジストリ lookup ではなく定数比較で行う。

### 3-1-bis. 数値 ID ↔ 語彙の変換とホットパス lookup（block-registry / block-registry-indexes）

```typescript
type BlockRegistryEntry = { readonly id: BlockId; readonly definition: BlockDefinition }
const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry>   // 123 行、id 昇順
const BLOCK_IDS: ReadonlyArray<BlockId>                    // BLOCK_REGISTRY から取り出した id 列
const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType>   // レジストリに行が無い語彙（現状は空）

const blockIdOf(type: BlockType): BlockId                       // 行が無ければ throw
const blockTypeOfId(id: number): BlockType | undefined
const isKnownBlockId(id: number): id is BlockId
const resolvedBlockOfId(id: number): ResolvedBlock | undefined
```

`block-registry.ts` は安定した公開 import path であり、実データは `block-registry-entries*.ts`
（地形・鉱石・作物とレッドストーン・構造物とネザー・エンドの 5 ファイルに分割）に、
派生インデックスと lookup ロジックは `block-registry-indexes.ts` に分離している。
データ行を見るのにインデックス実装を読む必要をなくすための分割であり、公開 API は変わらない。

**チャンクバイトから直接読む関数群。** いずれも `resolveBlock` で定義を都度組み立てるのではなく、
`BLOCK_REGISTRY` から起動時に一度だけ構築した `Uint8Array` / `ReadonlySet` の列を引く。
チャンク全体のメッシュ生成・光伝播・落下判定など、ブロックあたり 1 回以上呼ばれるホットパス向け。

```typescript
const capabilitiesOfBlockId(id: number): BlockCapabilities
const propertyOfBlockId<K extends BlockPropertyName>(id: number, name: K): BlockProperties[K]
const opacityOfBlockId(id: number): BlockOpacity
const lightEmissionOfBlockId(id: number): LightLevel
const transmitsLight(id: number): boolean                       // opacityOfBlockId(id) !== 'opaque'
const supportRuleOfBlockId(id: number): SupportRule
const isSupportSensitiveBlockId(id: number): boolean
const canBlockStaySupported(id: number, supportBelow: number): boolean
const blockIdsWithCapability(flag: BlockCapabilityFlag): ReadonlySet<number>
const blockIdsWithOpacity(opacity: BlockOpacity): ReadonlySet<number>
```

未知の `id`（登録済み範囲外、または範囲内でも空き番）に対する既定の答えは一貫して
「普通の不透明立方体」である —— `capabilitiesOfBlockId` / `propertyOfBlockId` 系は
`BLOCK_CAPABILITY_DEFAULTS` / `BLOCK_PROPERTY_DEFAULTS` にフォールバックし、
`isKnownBlockId` / `isSupportSensitiveBlockId` は `false` を返す。§4-3-bis の `dropOfBlockId` だけが
この既定から外れて `undefined` を返す（理由はそちらに書いてある）。

`blockIdsWithCapability` / `blockIdsWithOpacity` は `Set` を毎回組み立てず、起動時に構築した
同一インスタンスを返す。呼び出し側が変更してはならない共有オブジェクトである。

## 3-bis. アイテム語彙とブロック↔アイテムの橋（item-type / block-item）

```typescript
const ITEM_TYPES = ['stone', 'cobblestone', ..., 'snowball', 'sapling', ..., 'lily_pad'] as const
type ItemType = (typeof ITEM_TYPES)[number]
const isItemType = (value: string): value is ItemType

type PlaceableItemType = (ItemType & BlockType) | 'redstone_dust' // 交差 + 名前付き設置例外
const PLACEABLE_ITEM_TYPES / NON_PLACEABLE_ITEM_TYPES / UNITEMISED_BLOCK_TYPES
const isPlaceableItem(item: ItemType): item is PlaceableItemType
const itemOfBlock(block: BlockType): PlaceableItemType | undefined   // 部分関数
const blockOfPlaceableItem(item: PlaceableItemType): BlockType       // 全域、証明済みの設置 item 上だけ
```

plan.md §3.1 は kernel の公開 API に 「`BlockType` / `ItemType`（リテラル型）」 を挙げていたが、
**アイテム側は書かれていなかった。** その結果、必要になったリポジトリがそれぞれ暫定の
`type ItemId = string` を置いた（`mc-sim/domain/inventory.ts`、`mc-playground-kit/domain/launch-options.ts`、
`mx-ui/domain/inventory-view-model.ts`）。同じ欠落型の暫定エイリアスが 3 つある状態である。

**なぜリテラル union か（ブランデッド文字列ではなく）**: `BlockType` と同じ理由。
plan.md §3.1 の主張は「挙動は名前比較ではなく能力から読む」であり、それを機械検査可能にしているのは
**閉じたリテラル集合**である。ブランドは外部からの侵入は塞ぐが綴り間違いは塞がない（`ItemId('stik')` は通る）。
だから `domain/item-type.ts` は `domain/block-type.ts` を差分で読めるように、ガードの形まで揃えてある。

**`ItemType` は `BlockType` の部分集合ではない。両方向で。**

| 向き | 落ちる例 |
| --- | --- |
| `ItemType` → `BlockType` | `stick` / `wooden_pickaxe` / `stone_pickaxe` / `iron_helmet` |
| `BlockType` → `ItemType` | `air` / `water` / `lava` / `bedrock` / `snow` |

`air` が入らないのは監査 §6-6（「`AIR` は『ブロックが無い』ことを表す番兵であり能力ではない」）の帰結である。
2 つの union は**交差**するのであって入れ子ではない。`PlaceableItemType` はその交差に
`redstone_dust`（`redstone_wire` を設置する名前付き例外）を加えた型である。
`test/item-drops.test.ts` が `Exclude` で両方向をピン留めしている
（`test/clock-and-frame.test.ts` の `FrameServices` と同じ手法）。片方の roster がもう片方を
飲み込んだ瞬間に区別が飾りになるので、等式としてではなく**両方が空でないこと**として固定してある。

**交差そのものが有用な型である。** 監査 §6-8 は参照実装の手書きリスト `BLOCK_ITEMS`
（`first-person-held-item.ts:58-76`、監査時点で KELP / SEAGRASS / AMETHYST_* / RAIL が既に漏れていた）を見て
「これは `ItemType ∩ BlockType` の導出であり、フラグではなく型レベルで解決すべき」と結論している。
`PLACEABLE_ITEM_TYPES` は item roster と block roster の交差に、明示した設置例外だけを加えて**計算**される。
例外は `SPECIAL_BLOCK_BY_ITEM` / `SPECIAL_ITEM_BY_BLOCK` の対応表に限定されるため、別の手書き名簿としては増殖しない。

**橋は名前一致を既定とし、設置名の例外は橋自身に置く。** ブロックのアイテム形はブロックと同じ名前を持つ
（`dirt` ブロック → `dirt` アイテム）。同名でないブロックは自分の行でそう言う
（`redstone_wire` ブロック → `redstone_dust` アイテム）。一方、採掘時の文脈依存ドロップ
（`stone` → `cobblestone`、`grass_block` → `dirt`、`glowstone` → `glowstone_dust`）は
引き続きレジストリ行の `drops` が所有する。設置形と破壊ドロップを同じ規則として扱わない。

**`ITEM_TYPES` は 186 個。** ブロック形・ドロップ形、つるはし・シャベル・斧・クワ・剣の木/石/鉄/ダイヤ/金 tier に加え、装備境界が必要とする
`iron_helmet` / `iron_chestplate` / `iron_leggings` / `iron_boots` を語彙として持つ。
スロット規則や装備挙動は上位パッケージが所有し、kernel はアイテム同一性だけを所有する。
`supportRule` が配置条件を所有するようになったため、条件依存の草花・キノコ・サトウキビ・サボテン・睡蓮 10 種も
既定 self-drop と同じ根拠でアイテム形を持つ。
埋めるのは `BLOCK_TYPES` と同じく加算的である。
綴りは `BLOCK_TYPES` に合わせた `lower_snake_case`。**mc-sim の暫定文字列は `UPPER_SNAKE`**
（`'OAK_PLANKS'` / `'STICK'`）なので、repoint は型の付け替えであると同時に**大小文字の付け替え**でもある。

### 3-bis-2. アイテムの数値 wire ID（item-registry）

`BlockId` と対になる、アイテム側の永続数値 ID とその 2 バイト wire 表現。

```typescript
type ItemId = number & Brand.Brand<'ItemId'>
type ItemIdBytes = Uint8Array & Brand.Brand<'ItemIdBytes'>
type ItemDefinition = { readonly id: ItemId; readonly type: ItemType; readonly maxStackCount: ItemStackLimit }

const ITEM_ID_MAX = 0xffff   // unsigned 16-bit
const ITEM_ID_BYTES = 2

const ITEM_REGISTRY: ReadonlyArray<ItemDefinition>   // ITEM_TYPES と同じ並び、配列添字が id
const ITEM_IDS: ReadonlyArray<ItemId>

const isKnownItemId(id: number): id is ItemId
const itemDefinitionOf(type: ItemType): ItemDefinition
const maxStackCountOfItem(type: ItemType): ItemStackLimit
const itemIdOf(type: ItemType): ItemId
const itemTypeOfId(id: ItemId): ItemType
const itemTypeOfId(id: number): ItemType | undefined   // オーバーロード：未検証の数値には部分関数

const encodeItemId(type: ItemType): ItemIdBytes         // network byte order（big-endian）で書き出す
const decodeItemId(bytes: ItemIdBytes): ItemType
const ItemIdBytes(bytes: Uint8Array): ItemIdBytes       // 長さと既知 id を検証する branded constructor
```

**id は `ITEM_TYPES` の配列添字であり、密かつ追加専用（append-only）。** 新しいアイテムは必ず
`ITEM_TYPES` の末尾に足す。途中挿入や並べ替えは既存の全 id を付け替える破壊的変更になる。
`BlockId` が `Uint8Array` の 1 バイトに収まる 256 通りに縛られるのに対し、`ItemId` は
`unsigned 16-bit`（0..65535）を確保してあり、186 種の現行語彙に対して十分な余裕を持つ。

`maxStackCountOfItem` の答えは 3 段階（`MAX_STACK_COUNT`=64 / 16 / 1）で、道具・防具・薬品・ボート等
1 個までしか重ならないアイテムの集合と、雪玉・エンダーパール・バケツの 16 個上限を
`item-registry.ts` 内の 2 つの `Set` で持つ。それ以外は既定の 64。

### 3-bis-3. ブロック採掘時間（block-break-speed）

ブロック硬度と道具倍率から、破壊に必要な game tick 数を求める副作用のない計算を公開する。

```typescript
const TOOL_BREAK_SPEED: Readonly<Partial<Record<ItemType, number>>>
const DEFAULT_MINING_SPEED: number  // 1
type BreakTicksInput = {
  /** 適用する道具ルールが通常ドロップを許すか */
  readonly correctForDrops: boolean
  readonly efficiencyLevel?: number
  readonly hardness: number
  /** 適用する道具ルールから解決済みの採掘速度 */
  readonly miningSpeed: number
  /** プレイヤーの `block_break_speed` 属性。既定値は 1 */
  readonly playerBreakSpeed?: number
}
const computeBreakTicks: (input: BreakTicksInput) => number
const blockHardnessOf: (blockType: BlockType) => number
const miningSpeedOf: (tool?: ItemType) => number
```

`computeBreakTicks` は hardness が 0 以下なら 0 を返し、それ以外では次を切り上げる。

`ceil(hardness × 3 / ((miningSpeed + efficiencyBonus) × playerBreakSpeed))`

`efficiencyBonus` は `correctForDrops` が true で、かつ `efficiencyLevel` が指定されている場合だけ
`efficiencyLevel² + 1` になる。`miningSpeed` は `resolveToolMiningProperties` で道具ルールから解決した値であり、
`correctForDrops`（ドロップ可否）とは独立している。`miningSpeedOf` はこの kernel に収録された
木/石/鉄/ダイヤ/金のつるはし・シャベル・斧の速度表を引く補助関数で、未指定または表にない道具は
`DEFAULT_MINING_SPEED` (= 1) になる。

`hardness` はこのプロジェクトの参照実装から転記した採掘時間の基数であり、Java Edition の vanilla
hardness float をそのまま表す API ではない。The End の一部には出典側の尺度混在も残るため、境界と扱いは
[capability audit §4.5](./capability-flag-audit.md#45-hardness-friction-harvesttool-drops-xponbreak) に固定する。

公式 `minecraft:tool` の順序付き rule は `ToolComponent` と `resolveToolMiningProperties` で解決する。

```typescript
type ToolRule = {
  readonly blocks: ReadonlyArray<BlockType>
  readonly speed?: number
  readonly correctForDrops?: boolean
}
type ToolComponent = {
  readonly rules: ReadonlyArray<ToolRule>
  readonly defaultMiningSpeed?: number
  readonly damagePerBlock: number
}
type ResolvedToolMiningProperties = {
  readonly miningSpeed: number
  readonly correctForDrops: boolean
  readonly damagePerBlock: number
}
const resolveToolMiningProperties: (
  component: ToolComponent,
  block: BlockType,
) => ResolvedToolMiningProperties
```

`rules` は配列順に評価し、最初に対象ブロックを含む rule の各指定値を採用する。未指定の `speed` は
`defaultMiningSpeed`（既定値 1）へ、未指定の `correctForDrops` は `false` へフォールバックする。
`speed` と `defaultMiningSpeed` は有限の正数として検証し、`damagePerBlock` は 0 以上の整数として検証する。
公式データの単一ブロック・ブロック一覧・タグは、データ取り込み側で既知の `BlockType` 配列へ展開して渡す。
kernel はタグ名のレジストリやサービスアダプタを仮定しない。
プレイヤー操作の進行状態、耐久の消費適用、ドロップ生成、サーバー権威判定は上位 gameplay が統合する。

配布パッケージではこの API を `@nerima-games/mc-kernel` の root から公開する。`block-break-speed-data.ts` は実装用データであり、個別 subpath は公開しない。`pnpm package:verify` は pack 後の root import、型付き declaration consumer、hardness・break-tick・tool rule resolution の実値を検査する。

## 4. ブロック能力モデル

**権威は `docs/capability-flag-audit.md`。** 監査 §3 の表は 28 行（§7 の本文は「26 能力」と書いており、これは監査内部の不整合。表を採用している）。

2 つの仕組みに分かれる。boolean は能力フラグ表、それ以外は型付きプロパティ表。
plan.md §3.1 が boolean として挙げた 7 つのうち 4 つはそのまま boolean、**3 つは型が誤っていた**。

### 4-1. 能力フラグ（boolean）— `domain/block-capabilities.ts`

```typescript
const BLOCK_CAPABILITY_DEFAULTS = { passable: false, ..., validSpawnSurface: true }
type BlockCapabilityFlag  = keyof typeof BLOCK_CAPABILITY_DEFAULTS   // 表から導出
type BlockCapabilities    = { readonly [K in BlockCapabilityFlag]: boolean }
type BlockCapabilityOverrides = { readonly [K in BlockCapabilityFlag]?: boolean }

const BLOCK_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag>
const TRUE_BY_DEFAULT_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag>
const resolveBlockCapabilities(overrides): BlockCapabilities
const capabilityOf(overrides, flag): boolean
```

実装済み 12 フラグ:

| フラグ | 既定 | 根拠 |
| --- | --- | --- |
| `passable` | `false` | 監査 §4.1 `block-collision-predicates.ts:22-44` |
| `fallsWhenUnsupported` | `false` | 監査 §3 `falling-block.ts` |
| `replaceable` | `false` | 監査 §4.2 `block-service-place-load.ts:50` |
| `flammable` | `false` | 監査 §4.3 `fire-lifecycle.ts:18-30` |
| `fireSource` | `false` | 監査 §4.3 `fire-lifecycle.ts:77-78` |
| `pistonImmovable` | `false` | plan.md §3.12 |
| `brokenByWaterFlow` | `false` | 監査 §4.6 `block-support.ts:34-45` |
| `climbable` | `false` | 監査 §4.1 `block-collision-predicates.ts:177-182` |
| `tillable` | `false` | 監査 §4.8 / §5-20 `block-service.config.ts:264-267`。クワで耕地に変換できるか |
| `suffocates` | **`true`** | 監査 §4.7 `environment-hazard.config.ts:39-85` |
| `canSupportAttachments` | **`true`** | 監査 §4.6 `block-support.ts:47-61` |
| `validSpawnSurface` | **`true`** | 監査 §4.8 `spawn-selection-search.ts:41-60` |

既定値の方針は監査 §7 の「既定値は『普通の不透明立方体』に倒す」。
大半のフラグはそれが `false` になり、`false` が「何もしない安全側」になるよう命名してある（`solid` ではなく `passable`）。
上記 3 つだけ `true` なのは、参照実装がその 3 つを**否定リスト**（`NON_SUFFOCATING_BLOCKS` 等）で持っているから、
つまり普通の立方体の答えが `true` だからである。

### 4-2. プロパティ（型付き値）— `domain/block-properties.ts`

```typescript
type BlockProperties = { readonly opacity: BlockOpacity; readonly lightEmission: number; ... }
const BLOCK_PROPERTY_DEFAULTS: BlockProperties
type BlockPropertyName = keyof BlockProperties
type BlockPropertyOverrides = { readonly [K in BlockPropertyName]?: BlockProperties[K] }

const BLOCK_PROPERTY_NAMES: ReadonlyArray<BlockPropertyName>
const resolveBlockProperties(overrides): BlockProperties
const propertyOf<K>(overrides, name: K): BlockProperties[K]
```

実装済み 15 プロパティ:

| プロパティ | 型 | 既定 | 根拠 |
| --- | --- | --- | --- |
| `opacity` | `'transparentSolid' \| 'fluid' \| 'opaque'` | `'opaque'` | 監査 §4.4 |
| `lightEmission` | `number` (0..15) | `0` | 監査 §4.4 `light.ts:24-46` |
| `fluid` | `'none' \| 'water' \| 'lava'` | `'none'` | 監査 §4.2 |
| `collisionShape` | `'full'\|'slab'\|'cactus'\|'pressurePlate'\|'none'` | `'full'` | 監査 §4.1 |
| `renderKind` | `'cube'\|'cross'\|'cactus'\|'rail'\|'lilyPad'\|'fluid'` | `'cube'` | 監査 §4.8 |
| `footstepMaterial` | `'default'\|'grass'\|'wood'\|'stone'` | `'default'` | 監査 §4.8。純粋な表面分類で、効果音 ID や再生は mc-audio が所有する |
| `hardness` | `number` | `8` | 監査 §4.5 `blocks.config.terrain.ts:9-14` |
| `friction` | `number` | `0.6` | 監査 §4.5 `DEFAULT_BLOCK_FRICTION` |
| `contactDamage` | `number` | `0` | 監査 §4.7（LAVA=4 / CACTUS=1） |
| `movementDrag` | `number` | `0` | 監査 §4.1 `:203-208` |
| `xpOnBreak` | `number` | `0` | 監査 §4.5 `blocks.config.ores.ts:8-45` |
| `railKind` | `'none'\|'normal'\|'powered'` | `'none'` | 監査 §4.1 `:184-201` |
| `harvestTool` | `HarvestToolRequirement` | `{category:'none', minTier:'none'}` | 監査 §4.5 |
| `drops` | `BlockDropRule` | `{item:'self', count:1, ...}` | 監査 §4.5 |
| `supportRule` | `SupportRule` | `NEEDS_NO_SUPPORT`（`{kind:'none'}`） | 監査 §4.6。§4-2-bis 参照 |

補助 API: `BLOCK_OPACITIES` / `FLUID_KINDS` / `COLLISION_SHAPES` / `RENDER_KINDS` / `FOOTSTEP_MATERIALS` /
`RAIL_KINDS` / `LIGHT_LEVEL_MIN` / `LIGHT_LEVEL_MAX` / `isLightLevel` / `clampLightLevel`。

### 4-2-bis. `SupportRule` の値 — `domain/block-support.ts`

`supportRule` プロパティの値型そのものは、能力監査 §4.6 が挙げる 3 つのテーブル
（sensitive か / per-block の許可リスト / それ以外の既定）を 1 列に畳んだ判別共用体である。

```typescript
type SupportRule =
  | { readonly kind: 'none' }                                    // 直下に何も要求しない（既定）
  | { readonly kind: 'anySupporting' }                           // canSupportAttachments な任意のブロックでよい
  | { readonly kind: 'oneOf'; readonly blocks: ReadonlyArray<BlockType> }  // 直下が名指しリストのどれかである必要がある

const NEEDS_NO_SUPPORT: SupportRule       // { kind: 'none' } の名前付き定数。プロパティの既定値そのもの
const NEEDS_ANY_SUPPORT: SupportRule      // { kind: 'anySupporting' } の名前付き定数
const needsOneOf(...blocks: ReadonlyArray<BlockType>): SupportRule

const isSupportSensitive(rule: SupportRule): boolean   // rule.kind !== 'none'
const satisfiesSupportRule(
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): boolean
```

**`isSupportSensitive` は独立したフラグではなく `SupportRule` からの導出。** 「sensitive だがリストが無い」
「リストはあるが sensitive でない」という、2 つの真偽値を独立に持てば作れてしまう無意味な組み合わせを
型で作れなくしている。3 つ目のテーブルである `canSupportAttachments` 能力フラグ（§4-1）とは別のファイルに
分けてあり、`satisfiesSupportRule` が両方を引数として受け取って合成する（`blockBelow` が `undefined` の
ときは `'oneOf'` アームだけが偽になり、`'anySupporting'` アームは偽にならない —— 未知のブロックは
「普通の不透明立方体」として扱われ、それは支え能力を持つため）。

`domain/block-registry.ts` の `canBlockStaySupported(id, supportBelow)` はこの純関数を
id ベースの lookup に配線したものである（§3-1-bis）。

### 4-3. struct 2 種を隔離した理由 — `domain/block-harvest.ts`

```typescript
const HARVEST_TOOL_CATEGORIES = ['none', 'pickaxe', 'axe', 'shovel', 'hoe', 'shears', 'sword'] as const
type HarvestToolCategory = (typeof HARVEST_TOOL_CATEGORIES)[number]

const HARVEST_TIERS = ['none', 'wooden', 'stone', 'iron', 'diamond'] as const
type HarvestTier = (typeof HARVEST_TIERS)[number]   // 宣言順が採掘力の順（none が最弱）

type HarvestToolRequirement = { readonly category: HarvestToolCategory; readonly minTier: HarvestTier }
type BlockDropRule = { readonly item: ItemType | 'self'; readonly count: number
                       readonly requiresSilkTouch: boolean; readonly affectedByFortune: boolean }

type HarvestContext = { readonly heldTier?: HarvestTier; readonly silkTouch?: boolean }
type BlockDrop      = { readonly item: ItemType; readonly count: number; readonly affectedByFortune: boolean }

const DEFAULT_HARVEST_TOOL / DEFAULT_BLOCK_DROP / BARE_HANDED
const satisfiesHarvestTier(requirement, heldTier): boolean
const resolveDropItem(rule, brokenBlock): ItemType | undefined
const resolveDrop(requirement, rule, brokenBlock, context?): BlockDrop | undefined
```

監査 §7 の指示に従い**別ファイルに切り出してある**。

> `drops` / `harvestTool` は struct のため最も揺れやすい。`BlockDefinition` にも API ロックを適用し、
> この 2 フィールドを別ファイルに切り出して差分レビューを容易にすること

`category`（速度ボーナス）と `minTier`（ドロップ可否）は**別軸**である。参照実装ではこの 2 つが無関係な場所に散っており
（`harvestable-blocks.ts` と `block-utils.ts`）、`satisfiesHarvestTier` が category を一切見ないのはそのためである。
間違った道具は遅いだけでドロップはする。

`item: 'self'` は「自分自身のアイテム」を表す番兵。既定値は自分が何のブロックかを知り得ないため、
リテラルではなく番兵でなければならない。

**`item` の型が `BlockType | 'self'` から `ItemType | 'self'` になった。**
効く向きは「別のブロックを落とす」ではなく「**ブロックでないものを落とす**」である。
`glowstone` は `glowstone_dust` を落とすが、`glowstone_dust` というブロックは存在しない。
旧綴りではこの行が書けなかった。

同じ理由で `resolveDropItem` は**部分関数になった**。旧版は `BlockType` を返して全域だった
（「自分自身」は必ずブロックだから）。答えがアイテムになると「自分自身」は存在しないことがありうる
（`air` / `water` / `lava` / `bedrock` / `snow`）。`undefined` がその答えで、意味は `count: 0` と同じ
——インベントリに何も入らない。

**`resolveDrop` が採掘の入口。** `resolveDropItem` は「どのアイテムか」だけを答え、道具もシルクタッチも見ない。
「そもそも落ちるか」まで含めて答えるのは `resolveDrop` のほうで、落ちない経路は 3 つ + 1 つある:

1. `count <= 0` —— 誰に対しても何も落とさない（監査 §4.5 の `NEVER_DROPPED_BLOCK_TYPES`）
2. 道具のティアが `harvestTool.minTier` に届かない —— 素手で石を殴る。**カテゴリは見ない**
3. `requiresSilkTouch` なのにシルクタッチが無い —— ガラスを割る
4. （拒否ではなく不在）`'self'` なのにそのブロックにアイテム形が無い

`HarvestContext` の**全メンバが optional** なのは、これが**引数**の struct だからである。
`BlockCapabilityOverrides` と同じ形にしてある: 必須メンバを後から足すと 14 リポジトリの
全呼び出し側が壊れるが、optional なら 1 つも壊れない（[versioning.md](./versioning.md) §5-2）。
エンチャントが成長方向として明らかにある。

**幸運は kernel で適用しない。** `BlockDrop.affectedByFortune` を**運び出す**だけで、倍率は掛けない。
幸運は乱数関数であり、監査 §6-9 が乱数を伴うドロップ規則を `mx-gameplay` に置いている。
kernel は純粋で決定的（`StageRegistration.run` のエラーチャネルは `never`、乱数源も持たない）なので、
基準個数と「幸運が効く」という事実を返し、RNG を所有するルールに掛け算をさせる。

### 4-3-bis. `dropOfBlockId` —— 採掘がインベントリに届く 1 本の線

```typescript
const dropOfBlockId(id: number, context?: HarvestContext): BlockDrop | undefined
```

**mc-compose の横断 E2E が書けなかった関数がこれである。**
`mx-gameplay` の `breakBlock` は `BlockId`（`Uint8Array` から出てきた**数値**）を返し、
`mc-sim` の `InventoryService.add` は**アイテム**を取る。kernel はこの 2 つを繋いでいなかったので、
plan.md §3.15 が mc-compose の存在理由として挙げる「採掘がインベントリに反映される」が表現できなかった。

呼び出しは 1 回、読み出し側にブロック名は現れない —— 落下ブロック規則に対する
`capabilityOfBlockId` と同じ形である。

**未知の id は `undefined` を返す。** これは `capabilityOfBlockId`（既定値=石に落とす）と**違う規則**であり、
違ってよい。共通しているのは仕組みではなく原則で、「不活性な読み」が安全側だという点である。
能力にとっての不活性は「何もしない普通の立方体」だが、ドロップにとっての「普通の立方体」は
**このビルドが名前を知らないバイトからアイテムを鋳造すること**を意味する。
壊れたチャンクや新しいビルドのセーブが、静かにインベントリへアイテムを刷る。
何も落とさないのが唯一まともな答えである。

### 4-4. `BlockDefinition` — `domain/block-definition.ts`

```typescript
type BlockDefinition = {
  readonly type: BlockType
  readonly capabilities?: BlockCapabilityOverrides
  readonly properties?: BlockPropertyOverrides
}
type ResolvedBlock = { readonly type: BlockType
                       readonly capabilities: BlockCapabilities
                       readonly properties: BlockProperties }

const blockCapabilitiesOf / blockPropertiesOf / resolveBlock
const AUDITED_CAPABILITY_NAMES: ReadonlyArray<string>          // 監査 §3 の 28 行
const DOWNSTREAM_CAPABILITIES: ReadonlyArray<{ name, kind, owner, why }> // 下流所有 1 件と境界理由
```

**加算安全性（additive safety）が全体の要**。定義は差分だけを書き、書かなかったものは文書化された既定に解決される。
`{ type: 'stone' }` は完全に有効な定義であり、「普通の不透明立方体」を意味する。

`BlockCapabilityFlag` は既定表から**導出**されている。デフォルトを決めずにフラグを追加することが型レベルで不可能。
プロパティ側は値型が推論できないため 2 行（型宣言 + 既定値）必要だが、`BLOCK_PROPERTY_DEFAULTS: BlockProperties` の
型注釈により「既定値のないプロパティ」はコンパイルエラーになる。

消費側がやってはいけないこと:

1. `BlockCapabilities` / `BlockProperties` のリテラルを手書きしない。オーバーライドを書いて解決関数に渡す。
   完全なレコードは能力が増えるたびに必須キーが増え、まさにこの設計が避けようとしている破壊が起きる。
2. `BlockCapabilityFlag` に対する `default` 節なしの網羅 `switch` を書かない。`BLOCK_CAPABILITY_FLAGS` を回す。

### 4-5. 能力境界（`DOWNSTREAM_CAPABILITIES`）

`supportRule` は実装済みになった（`domain/block-support.ts`、監査 §4.6.1）。
監査 §4.8 の `textureTiles` は kernel が担当する未定義 property ではなく、renderer が所有する境界として
分類する。renderer 側の tile assignment は面の役割から renderer 所有のアトラスへ対応づける構造で、
画像 asset とレイアウトも renderer に属する。kernel の registry 順序と renderer の map 順序が異なるため、
storage-index の数値列を kernel に複製すると第二の source of truth になる。

| 能力 | 種別 | 所有者 | 境界理由 |
| --- | --- | --- |
| `textureTiles` | property | renderer | アトラス・面別 tile 割当・画像 asset は renderer の責務。 |

`test/block-definition.test.ts` が「実装済み 27 + 下流所有 1 = 監査の 28」を機械的に検査している。
監査にあるものを黙って落とすことも、監査にないものを勝手に足すこともできない。

## 5. `CameraPoseSnapshot`（camera）

```typescript
type CameraPoseSnapshot = {
  readonly position: Position
  readonly yawRadians: number
  readonly pitchRadians: number
  readonly capturedAtSecs: MonotonicTimeSecs
}
const snapshotAgeSecs(snapshot, now: MonotonicTimeSecs): number
```

**なぜ kernel か**: plan.md §4.3 が明示する横断界面。**正は `mc-sim` が所有し、`mc-render` の THREE カメラはミラー**である。
型を `mc-sim` に置くと `mc-render` が `mc-sim` に依存する……のは実際そうなのだが、
`mc-playground-kit` や将来のリプレイ機構も同じ型を必要とし、方向が増えるたびに依存が濃くなる。
型そのものは語彙なので kernel に置く。

plan.md §3.8 の実測知見:

> 参照実装は THREE カメラが正でシミュレーションが描画から視線を読む**逆転構造**だった
> （「camera.position を読むな matrixWorld を使え」という慢性 gotcha の根源）

`capturedAtSecs` があるのは、ミラー側が「今見ているスナップショットが何フレーム前のものか」を判定できるようにするため。

## 6. クロック Port（clock）

```typescript
type ClockService = {
  readonly monotonicSecs: Effect.Effect<MonotonicTimeSecs>
  readonly wallClockEpochMillis: Effect.Effect<EpochMillis>
}
class ClockPort extends Context.Tag('@nerima-games/mc-kernel/ClockPort')<ClockPort, ClockService>() {}

const fixedClock(at): ClockService
const FixedClockLayer(at): Layer
const monotonicSecs: Effect.Effect<MonotonicTimeSecs, never, ClockPort>
const wallClockEpochMillis: Effect.Effect<EpochMillis, never, ClockPort>
```

**なぜ kernel か**: plan.md §4.3 / §5.1-3。**決定論と fast-forward の要**であり、
`mc-sim` のシナリオテスト・`mc-worldgen` のチャンク寿命・`mc-save` の自動保存・`mx-gameplay` の昼夜が全部同じ時計を見る必要がある。

kernel はテスト用の固定実装だけを持ち、**実クロックを読むアダプタは持たない**。
実装は利用側（ブラウザなら `performance` / Node なら `process.hrtime`）が注入する。

壁時計の直接参照（`Date.now()` / `new Date()` / `performance.now()`）は kernel のシミュレーションコードに置かない。
現行の自動 import 境界は `.oxlintrc.json` の `no-restricted-imports` と `pnpm lint` が担う一方、
oxlint 0.12 はこの wall-clock の構文・プロパティ禁止を表現できないため、時刻ソースの禁止は設計規約として扱う。
Port を実装するプラットフォームアダプタだけが実クロックを読み、kernel の利用側には `ClockPort` を注入する。

## 7. `GameModule` / `StageRegistration`（frame）

```typescript
type FrameServices = ClockPort   // ← 確定（縦切りスパイク済み）

interface StageRegistration {
  readonly id: StageId
  readonly after?: ReadonlyArray<StageId>
  readonly run: (dt: DeltaTimeSecs) => Effect.Effect<void, never, FrameServices>
}

interface GameModule<ROut, E, RIn, RRegister = never> {
  readonly layers: Layer.Layer<ROut, E, RIn>
  readonly frameStages: Effect.Effect<ReadonlyArray<StageRegistration>, never, RRegister>
}
```

`StageRegistration` は plan.md §4.1 から**逐語的に**転記してある（`type` ではなく `interface` である点も含む）。
このリポジトリの lint 設定は `type` を推奨しているが、契約は仕様と文字単位で一致しているほうが価値が高いので例外扱いにしてある。

`GameModule` は §4.1 から **2 点だけ意図的に離れている**。どちらもスパイクの結果である（下記）。

**なぜ kernel か**: `mc-compose` が全モジュールを束ねるためには、各モジュールが同じ契約型を実装している必要がある。
契約型を `mc-compose` に置くと全モジュールが `mc-compose` に依存し、依存グラフが完全に反転する。

エラーチャネルが `run` ではなく Layer 側にあるのは、「physics がフレーム 12048 で失敗した」に対するフレームレベルの回復策が存在しないから。
実行時に失敗しうる stage は自分で握るか defect にする。

### `frameStages` は Effect である（§4.1 との差分 1）

§4.1 は `ReadonlyArray<StageRegistration>` — **値** — と書いていた。値には文脈が無いので、
モジュールが stage を**組み立てる**ためにサービスを取得できる瞬間が存在しない。
残る唯一の経路は `run` であり、結果として「どれか 1 つの stage が触るサービス」は全部
`FrameServices` に入らざるを得なくなる。スパイクで実測したその和は

```
ClockPort | PlayerService | InventoryService | InputService | FrameInput | BlockStore | RenderTarget
```

であり、これを別名にすると kernel が `mc-sim` と `mc-render` を import しなければ名前を書けない。
tier モデル（plan.md §2.2）が明確に禁じている。**配列そのものが原因だった。**

> **後日談**: この和に現れる `BlockStore` はスパイクが使い捨てコードで発明した仮の名前で、
> 当時どのリポジトリも所有していなかった。現在は `mc-worldgen` の `ChunkStore`
> （`@nerima-games/mc-worldgen/ChunkStore`）として実在する。所有者を §3.7 と §3.8 の間で
> 決めた根拠は `mc-worldgen/docs/public-api.md` §6-0。
> `FrameServices` の結論はこれに影響されない — 上の和が崩れたのは `frameStages` が
> Effect になったからであって、`BlockStore` の置き場によってではない。

徴候はスパイク以前からロスターに出ていた。`mx-gameplay/stages/registration.ts` は
`makeGameplayStages: Effect.Effect<ReadonlyArray<StageRegistration>>` を公開し、
「サービス集合 `RIn` に名前が付けられないので、これはまだ `GameModule` ではない」とコメントしていた。
形は最初から正しく、契約の型のほうが追いついていなかった。

### `RRegister` は `RIn` とは別のパラメータである（§4.1 との差分 2）

登録時に必要な文脈と Layer 構築時に必要な文脈は、実測すると別の集合だった。両方向に例がある:

- `mc-render` は `render:input` を登録するために `InputService` を取得する。
  しかし `InputService` は mc-render が**提供する**側（`ROut`）であって、与えられる側ではない。
  `RIn` に畳むと「自分が出荷するものを他人が供給するまでこのモジュールは組み立てられない」と言うことになる。
- 逆に、Layer を組むためだけに必要でどの stage も触らないプラットフォームハンドル（キャンバス、保存ディレクトリ）がある。
  登録文脈に畳むと、ホストが同じものを 2 回供給することになる。

1 つに潰すのは簡略化ではなく**誤った等式**であり、しかも壊れる向きが悪い。
自前提供のサービスが外部依存に見える — plan.md §3.8 が参照実装の最悪の構造バグとして記録している逆転そのものである。

既定値 `never` を置いてあるので、「stage の構築に何も要らない」通常のモジュールは今までどおり 3 パラメータで書ける。

`frameStages` の**エラーチャネルは `never`** のままである（Layer 側とは違う）。
起動に失敗しうるモジュールは `E` で表明すればよく、ホストはそこを既に見ている。
「このモジュールは使えない」を意味するチャネルが 2 本あると、ホストは見る場所が 2 つになり、区別する手段が無い。

### `FrameServices` は確定した — `ClockPort` だけ

**プレースホルダではなくなった。** 縦切りスパイク
（kernel → physics → worldgen → sim → render → gameplay を 1 本通す使い捨て実装）を通した結果、
`run` まで生き残った要求は `ClockPort` だけだった。

決め手は `mc-sim` の `PlayerServiceApi.cameraPose`（`mc-sim/application/player-service.ts:35`）である:

```typescript
readonly cameraPose: Effect.Effect<CameraPoseSnapshot, never, ClockPort>
```

要求は**メソッド側**に付いていて、`PlayerService` の取得側には付いていない。
登録時にサービスを掴んだ stage は、1 フレーム後にそのメソッドを呼ぶ時点で `ClockPort` を必要とし、
そしてそれ以外は必要としない。上に挙げた他の候補はすべて逆の性質だった — 一度取得すれば残余要求は無い。

stage は時間を読まずに進めず、かつグローバルから読んではならない（plan.md §5.1-3）ので、`never` も候補ではなかった。

**この別名を広げるのは stage の *提供者*（ランタイムを組む人）にとって破壊的変更である**（stage の *著者* にとってはそうではない）。
1.0.0 で凍結され、広げるのは MAJOR である。

## Anvil 変換と snapshot codec

Anvil API は `src/index.ts` から `@nerima-games/mc-kernel` のルート barrel を通じて公開される。
公開境界は `anvil.ts` に残し、計画、入力境界の primitive、正規化、versioned snapshot の codec は
内部モジュールへ分離している。消費者は内部ファイルを直接 import しない。

```typescript
const ANVIL_TOO_EXPENSIVE_LEVEL = 40      // これ以上のコストは "Too Expensive" として拒否
const ANVIL_REPAIR_BONUS_RATIO = 0.12     // 素材修理 1 個あたりの回復割合
const ANVIL_SNAPSHOT_VERSION = 1 as const
const ANVIL_MAX_CUSTOM_NAME_LENGTH = 50

const isAnvilEnchantmentId(value: string): value is AnvilEnchantmentId
const isAnvilCustomName(value: string): value is AnvilCustomName
const nextAnvilRepairCost(repairCost: number): number   // "prior work penalty": repairCost * 2 + 1

type AnvilState = {
  readonly left: AnvilItemPayload | null
  readonly right: AnvilInputStack | null
  readonly rename: AnvilCustomName | null
  readonly experienceLevels: number
}

type AnvilPlan =
  | {
      readonly ok: true
      readonly output: CanonicalAnvilItemPayload
      readonly levelCost: number
      readonly materialCost: StackCount
    }
  | {
      readonly ok: false
      readonly reason: Exclude<AnvilRejectionReason, 'insufficient-experience'>
      readonly issues: ReadonlyArray<AnvilValidationIssue>
    }

planAnvil(state, rules): AnvilPlan
applyAnvil(state, rules): AnvilApplyResult
snapshotAnvilState(state): AnvilSnapshotResult
decodeAnvilSnapshot(value): AnvilSnapshotResult
decodeAnvilSnapshotString(encoded): AnvilSnapshotResult
encodeAnvilSnapshot(state): AnvilSnapshotEncodingResult
```

`planAnvil` は入力とルールを検証したうえで、出力、経験値コスト、材料消費数を決定する。
`applyAnvil` は計画を再利用し、経験値不足も含めた適用結果を返す。どちらも入力を変更せず、
拒否時は `reason` と `issues` を返す。

snapshot は version `1` の canonical state として encode / decode される。`decodeAnvilSnapshot` は
外部値を `unknown` として受け取り、JSON の形、数値の安全性、item、enchantment、custom name、
余分なフィールドを検証してから canonical state を返す。`decodeAnvilSnapshotString` は JSON 文字列の
境界、`encodeAnvilSnapshot` は canonical snapshot の生成と JSON 化を担当する。
`AnvilEnchantmentId`、`AnvilCustomName`、`AnvilSnapshotString` は境界で検証する branded constructor、
`isAnvilSnapshotString` / `isAnvilEnchantmentId` / `isAnvilCustomName` はそれぞれの非 throw な型ガードである
（不正な値を例外ではなく `false` で扱いたい呼び出し側向け）。

`nextAnvilRepairCost` は素材修理・エンチャント本合成の双方で経験値レベルコストが加算されていく
"prior work penalty" を進める関数（`cost * 2 + 1`、`Number.MAX_SAFE_INTEGER` で飽和）。
結合先が `ANVIL_TOO_EXPENSIVE_LEVEL` を超えると `planAnvil` が `'too-expensive'` として拒否する。

## Chunk バイナリ形式

```typescript
const CHUNK_CODEC_VERSION = 1
const CHUNK_HEADER_BYTES = 24
const MAX_CHUNK_HEIGHT = 0xffff

type ChunkHeight = number & Brand.Brand<'ChunkHeight'>   // 整数、1..MAX_CHUNK_HEIGHT
type EncodedChunk = Uint8Array & Brand.Brand<'EncodedChunk'>

const ChunkHeight(value: number): ChunkHeight             // 範囲外なら RangeError
const EncodedChunk(encoded: Uint8Array): EncodedChunk      // ヘッダー・寸法・長さを検証する constructor
const chunkBlockCount(height: ChunkHeight): number          // CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height
```

`chunk(coord, height, blocks)` は 16×16 の縦列 Chunk を構築する。`blocks` 引数は
`16 * 16 * height` バイトの生 `Uint8Array` を取り、各バイトは登録済みの `BlockId` でなければならない。
構築時にバッファをコピーするため、呼び出し側の後続変更は Chunk に波及しない。

**`Chunk.blocks` は生の `Uint8Array` ではなく `ChunkBlocks` を保持する（0.3.0、破壊的変更）。**

```typescript
type ChunkBlocks = BlockState & Brand.Brand<'ChunkBlocks'>

class BlockState {
  get length(): number
  get(index: number): BlockId
  set(index: number, blockId: BlockId): void
  toBytes(): Uint8Array
  copyTo(target: Uint8Array, offset?: number): void
}
const blockState(bytes: Uint8Array): BlockState   // BlockState.fromBytes のラッパー。全バイトを登録済み BlockId として検証する
```

`chunk()` / `decodeChunk()` は入力バイト列を構築時に一度だけ検証し、以後は `ChunkBlocks` 経由でのみ
読み書きさせる。**添字演算子（`blocks[i]`）は意図的に公開していない** —— 範囲外の読み出しも未登録
`BlockId` の書き込みもコンパイルは通ってしまうため、`get` / `set` がその場で `RangeError` を投げることで
バッファの不変条件（長さの範囲内であること・登録済み ID のみが書けること）を境界で強制する。生バイト列が
必要な消費者（ワイヤ送信、コピー）は `toBytes()`（新規コピーを返す）または `copyTo(target, offset?)`
（呼び出し側バッファへ範囲チェック付きで書き込み、割り当てを増やさない）を使う。

`encodeChunk` / `decodeChunk` は固定 `CHUNK_HEADER_BYTES`（24）バイトヘッダーとブロック列を用いる。
ヘッダーは magic (`MCHK`)、`CHUNK_CODEC_VERSION`、幅・奥行き、height、符号付き 32-bit の `cx` / `cz`、
payload 長を little-endian で保持する。decoder は magic、version、寸法、長さ、未知の BlockId、
末尾の余剰データを破損として拒否する。`EncodedChunk` はこの検証を通過した生バイト列に対する
branded 型で、`encodeChunk` の戻り値と `decodeChunk` への入力の両方に使われる。

### `after` が存在しない stage を指したとき

スパイクの判断: **何も強制せず、両方を報告する。**
ダングリングエッジは「input があるなら input の後」を表明する正規の手段なので、拒否するとその語法が消える。
一方で、落ちたエッジも、フレーム骨格が知らない stage も、失敗地点では誤字と区別がつかない。
そこで `mc-compose` の `StageOrderPlan` が `dangling` と `unmatchedPhase` の両方を運び、ホストがそれを表示する。

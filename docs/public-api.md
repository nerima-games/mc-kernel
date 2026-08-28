# 公開 API

`index.ts` が公開バレルであり、利用リポジトリはここだけを import する。
`test/public-api.test.ts` がバレルの再エクスポート漏れを固定している
（バレルから 1 つ落ちても kernel 内の他のテストは全部通るが、組織全体が壊れるため）。

配布物では、公開バレルに加えて、`src/index.ts` が公開する各 `domain/*.ts` entrypoint を
同名の `@nerima-games/mc-kernel/domain/*` subpath から個別に import できる。いずれも `dist` の
型宣言と実装を同じ公開境界から提供する。`*-data` 内部モジュールは公開サブパスにせず、registry の
構築方法を利用側へ固定しない。

**なぜこれらの型が kernel にあるのか** は plan.md §4.3「横断の型（kernel に置く共有界面）」が答えである。
判定基準は 1 つ: **2 つ以上のリポジトリが同じものを指す必要があり、かつ片方に置くと依存の向きが壊れるか？**
壊れるなら kernel、壊れないなら所有者のリポジトリ。

## 1. ブランデッド型（identifiers / quantities）

```typescript
type WorldId = string & Brand.Brand<"WorldId">;
type StageId = string & Brand.Brand<"StageId">;
type ResourceLocation = string & Brand.Brand<"ResourceLocation">;
type TagLocation = string & Brand.Brand<"TagLocation">;
type StackCount = number & Brand.Brand<"StackCount">; // 0..MAX_STACK_COUNT (64)
type DeltaTimeSecs = number & Brand.Brand<"DeltaTimeSecs">;
type MonotonicTimeSecs = number & Brand.Brand<"MonotonicTimeSecs">;
type CooldownSeconds = number & Brand.Brand<"CooldownSeconds">; // finite, > 0
type ConsumeSeconds = number & Brand.Brand<"ConsumeSeconds">; // finite, >= 0
type EpochMillis = number & Brand.Brand<"EpochMillis">;

const MAX_STACK_COUNT = 64;
```

いずれも `Brand.refined` によるコンストラクタを同名で公開する（値と型の両方）。`ResourceLocation` は vanilla の
namespace/path 形式（`minecraft:entity.generic.eat`、`entity.generic.eat`、`sulfur_cube_archetype/regular` など）だけを受け付ける。
`TagLocation` は同じ resource location の前に必須の `#` を付けた形式（`#minecraft:mineable/pickaxe`、
`#sulfur_cube_archetype/regular` など）を受け付ける。

**なぜ kernel か**: `WorldId` は `mc-save` が保存キーに使い、`mc-sim` がセッション管理に使い、`mc-compose` がワールド選択に使う。
どこか 1 つに置けば他の 2 つがそのリポジトリに依存することになり、依存グラフが壊れる。
`StackCount` も同様に `mc-sim`（インベントリ状態）と `mx-ui`（表示）と `mx-gameplay`（ドロップ）が同じ制約を共有する必要がある。

**時間・持続時間の型を分けている理由**: `DeltaTimeSecs`（フレーム差分）/ `MonotonicTimeSecs`（単調時計）/ `CooldownSeconds`（正の使用間隔）/ `ConsumeSeconds`（非負のアイテム使用時間）/ `EpochMillis`（壁時計）は
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
type BlockId = number & Brand.Brand<"BlockId">;
const BLOCK_ID_MAX = 255; // Uint8Array の 1 バイトに収まる上限
const AIR_BLOCK_ID: BlockId = 0;
const isEmpty: (id: number) => boolean;
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
**アイテム側は書かれていなかった。** その結果、以前の下流リポジトリには暫定の
`type ItemId = string` が置かれていた。kernel は現在 `ItemType` を公開し、`mc-sim/domain/inventory.ts` は
この型を直接使って暫定エイリアスを削除済みである。ほかの下流コードを移行する際も、文字列エイリアスを
再導入せず `ItemType` を直接利用する。

**なぜリテラル union か（ブランデッド文字列ではなく）**: `BlockType` と同じ理由。
plan.md §3.1 の主張は「挙動は名前比較ではなく能力から読む」であり、それを機械検査可能にしているのは
**閉じたリテラル集合**である。ブランドは外部からの侵入は塞ぐが綴り間違いは塞がない（`ItemId('stik')` は通る）。
だから `domain/item-type.ts` は `domain/block-type.ts` を差分で読めるように、ガードの形まで揃えてある。

**`ItemType` は `BlockType` の部分集合ではない。両方向で。**

| 向き                     | 落ちる例                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `ItemType` → `BlockType` | `stick` / `wooden_pickaxe` / `stone_pickaxe` / `iron_helmet` |
| `BlockType` → `ItemType` | `air` / `water` / `lava` / `bedrock` / `snow`                |

`air` が入らないのは監査 §6-6（「`AIR` は『ブロックが無い』ことを表す番兵であり能力ではない」）の帰結である。
2 つの union は**交差**するのであって入れ子ではない。`PlaceableItemType` はその交差に
`redstone_dust`（`redstone_wire` を設置する名前付き例外）を加えた型である。
`test/item-drops.test.ts` が `Exclude` で両方向をピン留めしている
（`test/clock-and-frame.test.ts` の `FrameServices` と同じ手法）。片方の roster がもう片方を
飲み込んだ瞬間に区別が飾りになるので、等式としてではなく**両方が空でないこと**として固定してある。

**交差そのものが有用な型である。** 監査 §6-8 は参照実装の手書きリスト `BLOCK_ITEMS`
（`first-person-held-item.ts:58-76`、監査時点で KELP / SEAGRASS / AMETHYST\_\* / RAIL が既に漏れていた）を見て
「これは `ItemType ∩ BlockType` の導出であり、フラグではなく型レベルで解決すべき」と結論している。
`PLACEABLE_ITEM_TYPES` は item roster と block roster の交差に、明示した設置例外だけを加えて**計算**される。
例外は `SPECIAL_BLOCK_BY_ITEM` / `SPECIAL_ITEM_BY_BLOCK` の対応表に限定されるため、別の手書き名簿としては増殖しない。

**橋は名前一致を既定とし、設置名の例外は橋自身に置く。** ブロックのアイテム形はブロックと同じ名前を持つ
（`dirt` ブロック → `dirt` アイテム）。同名でないブロックは自分の行でそう言う
（`redstone_wire` ブロック → `redstone_dust` アイテム）。一方、採掘時の文脈依存ドロップ
（`stone` → `cobblestone`、`grass_block` → `dirt`、`glowstone` → `glowstone_dust`）は
引き続きレジストリ行の `drops` が所有する。設置形と破壊ドロップを同じ規則として扱わない。

**`ITEM_TYPES` は 205 個。** ブロック形・ドロップ形、つるはし・シャベル・斧・クワ・剣の木/石/鉄/ダイヤ/金/ネザライト tier、鍛造素材・テンプレート、装備境界が必要とする
鉄・ダイヤ・ネザライト防具を語彙として持つ。
kernel は現在の `ItemType` roster に対応する純粋な装備スロット規則・装備スナップショット・耐久遷移を `equipment-data.ts` / `equipment.ts` で所有する。
ただし、このカタログは現在 kernel に表現されているアイテムの範囲であり、全エディション・全バージョンの防具、道具、プレイヤーインベントリを網羅する完全な公式レジストリではない。
プレイヤーインベントリの搬送、所有権、サーバー権威、装備変更のゲームプレイ統合は上位パッケージが所有する。
`supportRule` が配置条件を所有するようになったため、条件依存の草花・キノコ・サトウキビ・サボテン・睡蓮 10 種も
既定 self-drop と同じ根拠でアイテム形を持つ。
埋めるのは `BLOCK_TYPES` と同じく加算的である。
綴りは `BLOCK_TYPES` に合わせた `lower_snake_case`。**mc-sim の暫定文字列は `UPPER_SNAKE`**
（`'OAK_PLANKS'` / `'STICK'`）なので、repoint は型の付け替えであると同時に**大小文字の付け替え**でもある。

### 3-bis-2. アイテムの数値 wire ID（item-registry）

`BlockId` と対になる、アイテム側の永続数値 ID とその 2 バイト wire 表現。

以下でいう `ReadonlyByteArray` は、`Uint8Array` の読み取り API と数値インデックスだけを残し、
`buffer`、長さ・offset の可変ビュー情報、書き込みメソッドを除いた構造型である。

```typescript
type ItemId = number & Brand.Brand<'ItemId'>
type ItemIdBytes = ReadonlyByteArray & Brand.Brand<'ItemIdBytes'>
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
const ItemIdBytes(bytes: Uint8Array | ItemIdBytes): ItemIdBytes // 長さと既知 id を検証し、入力を所有する constructor
```

`ItemIdBytes` は読み出し専用の branded byte view であり、`buffer` / `byteLength` / `byteOffset` や
書き込みメソッドを公開しない。可変な `Uint8Array` を渡した場合も constructor が検証済みの内容をコピーするため、
呼び出し側の後続変更は保存値に波及しない。可変なバイト列が必要なら `slice()` で明示的にコピーを取り出す。

**id は `ITEM_TYPES` の配列添字であり、密かつ追加専用（append-only）。** 新しいアイテムは必ず
`ITEM_TYPES` の末尾に足す。途中挿入や並べ替えは既存の全 id を付け替える破壊的変更になる。
`BlockId` が `Uint8Array` の 1 バイトに収まる 256 通りに縛られるのに対し、`ItemId` は
`unsigned 16-bit`（0..65535）を確保してあり、205 種の現行語彙に対して十分な余裕を持つ。

`maxStackCountOfItem` の答えは 3 段階（`MAX_STACK_COUNT`=64 / 16 / 1）で、道具・防具・薬品・ボート等
1 個までしか重ならないアイテムの集合と、雪玉・エンダーパール・バケツの 16 個上限を
`item-registry.ts` 内の 2 つの `Set` で持つ。それ以外は既定の 64。

### 3-bis-3. ブロック採掘時間（block-break-speed）

ブロック硬度と道具倍率から、破壊に必要な game tick 数を求める副作用のない計算を公開する。

```typescript
const TOOL_BREAK_SPEED: Readonly<Partial<Record<ItemType, number>>>;
const DEFAULT_MINING_SPEED: number; // 1
type BreakTicksInput = {
  /** 適用する道具ルールが通常ドロップを許すか */
  readonly correctForDrops: boolean;
  readonly efficiencyLevel?: number;
  readonly hardness: number;
  /** 適用する道具ルールから解決済みの採掘速度 */
  readonly miningSpeed: number;
  /** プレイヤーの `block_break_speed` 属性。既定値は 1 */
  readonly playerBreakSpeed?: number;
};
const computeBreakTicks: (input: BreakTicksInput) => number;
const blockHardnessOf: (blockType: BlockType) => number;
const miningSpeedOf: (tool?: ItemType) => number;
```

`computeBreakTicks` は `hardness === -1` なら `Infinity`（不破壊）、
`hardness === 0` なら 0（即時破壊）を返し、それ以外では次を切り上げる。

`ceil(hardness × 3 / ((miningSpeed + efficiencyBonus) × playerBreakSpeed))`

`efficiencyBonus` は `correctForDrops` が true で、かつ `efficiencyLevel` が指定されている場合だけ
`efficiencyLevel² + 1` になる。`miningSpeed` は `resolveToolMiningProperties` で道具ルールから解決した値であり、
`correctForDrops`（ドロップ可否）とは独立している。`miningSpeedOf` はこの kernel に収録された
木/石/鉄/ダイヤ/金/ネザライトのつるはし・シャベル・斧の速度表を引く補助関数で、未指定または表にない道具は
`DEFAULT_MINING_SPEED` (= 1) になる。
`miningSpeed` は 0 も許可され、効率補正後の速度が 0 の場合は、硬度 0 以外では `Infinity`（実質的に不破壊）を返す。

`hardness` はこのプロジェクトの参照実装から転記した採掘時間の基数であり、Java Edition の vanilla
hardness float をそのまま表す API ではない。The End の一部には出典側の尺度混在も残るため、境界と扱いは
[capability audit §4.5](./capability-flag-audit.md#45-hardness-friction-harvesttool-drops-xponbreak) に固定する。

公式 `minecraft:tool` の順序付き rule は `ToolComponent` と `resolveToolMiningProperties` で解決する。
この契約は Java Edition の data component を対象にする。Bedrock Edition の component は別契約として、同じ型へ変換しない。

契約の一次資料は [Java 24w12a の `minecraft:tool`](https://www.minecraft.net/en-us/article/minecraft-snapshot-24w12a) と、
`can_destroy_blocks_in_creative` を追加した [Java 25w02a](https://www.minecraft.net/en-us/article/minecraft-snapshot-25w02a) である。

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
  readonly speed?: number;
  readonly correctForDrops?: boolean;
};
type ToolComponent = {
  readonly rules: ReadonlyArray<ToolRule>;
  readonly defaultMiningSpeed?: number;
  readonly damagePerBlock: number;
  readonly canDestroyBlocksInCreative?: boolean;
};
type CompiledToolComponent = {
  readonly rules: ReadonlyArray<{
    readonly blockTypes: ReadonlyArray<BlockType>;
    readonly blockTags: ReadonlyArray<ToolBlockTag>;
    readonly speed?: number;
    readonly correctForDrops?: boolean;
  }>;
  readonly defaultMiningSpeed: number;
  readonly damagePerBlock: number;
  readonly canDestroyBlocksInCreative: boolean;
  readonly hasTagRule: boolean;
};
type ResolvedToolMiningProperties = {
  readonly miningSpeed: number;
  readonly correctForDrops: boolean;
  readonly damagePerBlock: number;
  readonly canDestroyBlocksInCreative: boolean;
};
const compileToolComponent: (component: ToolComponent) => CompiledToolComponent;
const resolveToolMiningProperties: (
  component: ToolComponent | CompiledToolComponent,
  block: BlockType,
  context?: ToolResolutionContextInput,
) => ResolvedToolMiningProperties;
```

`rules` は配列順に評価し、最初に対象ブロックを含む rule の各指定値を採用する。未指定の `speed` は
`defaultMiningSpeed`（既定値 1）へ、未指定の `correctForDrops` は `false` へフォールバックする。
未指定の `canDestroyBlocksInCreative` は公式既定値 `true` へフォールバックする。
`speed` と `defaultMiningSpeed` は有限の 0 以上の数として検証し、`damagePerBlock` は 0 以上の整数として検証する。
公式データの `blocks` は単一の `BlockType`、`BlockType`/`ToolBlockTag` の配列、または `#` 付きタグを受理する。
同じ tool component を繰り返し解決する場合は `compileToolComponent` で一度検証・正規化した `CompiledToolComponent` を作成できる。
コンパイル結果は入力配列から独立した不変スナップショットであり、`resolveToolMiningProperties` にそのまま渡せる。
タグ rule を解決するときは `resolveToolMiningProperties` の第 3 引数に `ToolResolutionContextInput` を渡す。
`blockTags` は `ReadonlyMap<ToolBlockTag, ReadonlySet<BlockType>>` として表現し、実行時には同じ反復可能な Map-like / Set-like 契約も受理する。タグ rule で context を省略すると例外になり、未登録タグは一致しない。
kernel はタグ名のレジストリやサービスアダプタを仮定せず、タグ membership の純粋な値を解決入力として受け取る。
プレイヤー操作の進行状態、採掘への耐久適用、ドロップ生成、サーバー権威判定は上位 gameplay が統合する。装備スナップショット内の耐久値検証と純粋な減少・破損遷移は kernel の `equipment.ts` が所有する。

### 3-bis-4. Bedrock の採掘 component

Bedrock Edition の `minecraft:digger` と `minecraft:destructible_by_mining` は Java の `minecraft:tool` と混ぜず、JSON の descriptor を検証して実行時の対象へ解決する。

一次資料は [Bedrock `minecraft:digger`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_digger?view=minecraft-bedrock-stable) と
[Bedrock `minecraft:destructible_by_mining`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_destructible_by_mining?view=minecraft-bedrock-stable) である。

```typescript
const BEDROCK_DIGGER_MIN_FORMAT_VERSION: "1.20.30";
const BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION: "1.21.50";
const DEFAULT_BEDROCK_SECONDS_TO_DESTROY: 0;

type BedrockBlockDescriptor =
  | string
  | {
      readonly name?: string;
      readonly states?: Readonly<Record<string, string | number | boolean>>;
      readonly tags?: string;
    };
type BedrockBlock = {
  readonly name: string;
  readonly states: Readonly<Record<string, string | number | boolean>>;
  readonly tags: ReadonlySet<string>;
};
type BedrockDiggerComponent = {
  readonly destroy_speeds?: ReadonlyArray<{
    readonly block: BedrockBlockDescriptor;
    readonly speed: number;
  }>;
  readonly use_efficiency?: boolean;
};
type BedrockDestructibleByMining =
  | boolean
  | {
      readonly seconds_to_destroy?: number;
      readonly item_specific_speeds?: ReadonlyArray<{
        readonly item: string | { readonly tags: string };
        readonly destroy_speed: number;
      }>;
    };

const resolveBedrockDiggerSpeed: (
  component: unknown,
  block: unknown,
) => number | undefined;
const bedrockDiggerUsesEfficiency: (component: unknown) => boolean;
const resolveBedrockDestructionSeconds: (
  component: unknown,
  defaultSeconds: number,
) => number;
const resolveBedrockItemSpecificDestroySpeed: (
  component: unknown,
  item: unknown,
) => number | undefined;
```

ブロック descriptor はブロック ID、状態値、`query.any_tag` / `query.all_tags`（`q.` も許可）の tag query を組み合わせられる。
ルールは配列順に評価し、最初に一致した `destroy_speeds` または `item_specific_speeds` の値を返す。
`use_efficiency` の既定値は `false`。`destructible_by_mining` の `true` と省略時は呼び出し側の既定秒数、`false` は `Infinity`、オブジェクトの
`seconds_to_destroy` 省略時は 0 になる。item-specific speed は公式の実験的 component field をそのまま検証・公開し、Java の採掘 tick 式へ自動合成しない。

`validateBedrockDiggerComponent`、`validateBedrockDestructibleByMining`、descriptor の各 validator は、未知のキー、空の識別子、状態値、有限性を境界で検査する。
観測済みの `BedrockBlock` / `BedrockItem` はタグを `ReadonlySet` として受け取り、kernel は外部のタグ registry を仮定しない。

配布パッケージではこの API を `@nerima-games/mc-kernel` の root と `@nerima-games/mc-kernel/domain/bedrock-mining` subpath から公開する。
`block-break-speed-data.ts` は実装用データであり個別 subpath を公開しない。`pnpm package:verify` は pack 後の root / subpath import、型付き declaration consumer、
Java の hardness・break-tick・tool rule resolution と Bedrock の digger・indestructible・item-specific resolution の実値を検査する。

### 3-ter. ItemStack とレシピ

`ItemStack` はアイテム種別と数量だけを持つ値であり、`itemStack` がアイテムごとの最大スタック数と数量の境界を検証する。
空きスロットは `undefined` として表す。インベントリの搬送、所有権、装備状態、耐久値、エンチャントはこの型へ埋め込まない。

```typescript
type ItemStack = { readonly item: ItemType; readonly count: StackCount };
type Slot = ItemStack | undefined;

const itemStack: (item: ItemType, count: number) => ItemStack;
const itemStackFromUnknown: (item: unknown, count: unknown) => ItemStack;
const isItemStack: (value: unknown) => value is ItemStack;
const maxStackCountForItem: (item: ItemType) => ItemStackLimit;
```

`itemStack` は型付きコード用の厳格なコンストラクタであり、保存データや外部入力の境界では
`itemStackFromUnknown` を使って item と count を検証する。

### 3-ter-1. プレイヤーインベントリ

`Inventory` はプレイヤー用の 36 スロットを持つ不変の値である。各スロットは既存の `Slot` を再利用し、追加・除去・集計は入力を変更せず新しい値を返す。
kernel はインベントリの搬送サービス、所有権、コンテナのサイズ、装備との接続を持たない。

```typescript
const INVENTORY_SLOT_COUNT = 36;
type Inventory = { readonly slots: ReadonlyArray<Slot> };

const emptyInventory: () => Inventory;
const slotAt: (inventory: Inventory, index: number) => Slot;
const countOf: (inventory: Inventory, item: ItemType) => number;
const isInventoryEmpty: (inventory: Inventory) => boolean;
const addItem: (
  inventory: Inventory,
  item: ItemType,
  count: number,
) => AddOutcome;
const removeItemAt: (
  inventory: Inventory,
  slotIndex: number,
  expectedItem: ItemType,
  count: number,
) => RemoveAtOutcome;
const removeItem: (
  inventory: Inventory,
  item: ItemType,
  count: number,
) => RemoveOutcome;
const normaliseInventory: (value: unknown) => NormaliseOutcome;
```

`addItem` は既存スタックの空きを優先してから空きスロットへ積み、収まりきらない数量を `leftover` として返す。
`normaliseInventory` は保存値などの `unknown` 境界で無効なスロットを除外し、過剰スタックと 36 スロットを超える tail を正規化する。未知の item の数量は `discarded`、収容できない数量は `leftover` として明示する。
状態サービスは `mc-sim` の `InventoryService` が所有し、kernel の値 API と接続するのは gameplay／基盤側の責務である。

root のほか `@nerima-games/mc-kernel/domain/inventory` subpath から利用できる。

### 3-ter-1-bis. ホットバーの純粋な投影

`HOTBAR_SIZE` と `HOTBAR_START` は、プレイヤーインベントリの末尾 9 スロットを選択可能なホットバーとして表す。選択状態そのもの、入力デバイス、スクロールや UI の解釈は上位層が所有し、kernel は数値の範囲・循環・スロット対応だけを計算する。

```typescript
const HOTBAR_SIZE = 9;
const HOTBAR_START = 27;

const isHotbarIndex: (value: number) => boolean;
const clampHotbarIndex: (value: number) => number;
const cycleHotbarIndex: (index: number, delta: number) => number;
const hotbarSlotIndex: (index: number) => number;
```

`clampHotbarIndex` は有限な入力を整数化して `0..8` に収め、有限でない入力を 0 にする。`cycleHotbarIndex` は整数ステップで両端を循環し、`hotbarSlotIndex` は選択値をクランプして `27..35` のインベントリスロットへ変換する。

root のほか `@nerima-games/mc-kernel/domain/hotbar` subpath から利用できる。

### 3-ter-2. 装備と耐久

装備は `mainhand` / `head` / `chest` / `legs` / `feet` / `offhand` の 6 スロットを持つ不変スナップショットである。
`EQUIPMENT_CATALOG` がアイテムと装備可能スロットの対応を、`ITEM_DURABILITY_CATALOG` が現在の roster の最大耐久値を表す。
カタログにないアイテムやスロット不一致は `equip` と `validateEquipmentSnapshot` の境界で拒否する。

```typescript
const equipmentItem: (
  stack: ItemStack,
  itemDurability?: Durability,
) => EquipmentItem;
const emptyEquipment: () => Equipment;
const equip: (
  equipment: Equipment,
  slot: EquipmentSlot,
  item: EquipmentItem,
) => Equipment;
const unequip: (equipment: Equipment, slot: EquipmentSlot) => Equipment;
const swapEquipment: (
  equipment: Equipment,
  first: EquipmentSlot,
  second: EquipmentSlot,
) => Equipment;
const damageEquipment: (
  equipment: Equipment,
  slot: EquipmentSlot,
  amount: number,
) => DamageEquipmentResult;
const validateEquipmentSnapshot: (value: unknown) => EquipmentValidationResult;
```

これらは入力スナップショットを変更せず、`damageEquipment` は耐久減少・破損によるスロット消失・空スロットを判別可能な結果として返す。
耐久 API は装備の純粋な値遷移だけを扱い、プレイヤーインベントリへの搬送、エンチャント効果、採掘イベントへの接続は上位の責務である。
root のほか `@nerima-games/mc-kernel/domain/equipment` subpath から利用できる。

レシピは shaped / shapeless の 3×3 グリッドと、ステーション tag、材料 item/tag、priority を値として表す。
`matchRecipe` は入力を変更せず、ステーションに適合する候補を priority、shaped を shapeless より優先、recipe id の辞書順で選ぶ。
shaped は必要なら対称形を許可し、shapeless はグリッドの全スロットを材料として照合する。

```typescript
const VANILLA_CRAFTING_RECIPES: ReadonlyArray<Recipe>;
const matchRecipe: (
  table: RecipeTable,
  input: CraftGrid,
  context?: RecipeMatchContext,
) => RecipeMatch;
```

`VANILLA_CRAFTING_RECIPES` は kernel が同梱する検証済みの公式 recipe data の集合である。Minecraft の全バージョン・全エディションの
完全な recipe registry ではなく、対応範囲はデータ表とテストで固定する。Bedrock の shaped / shapeless recipe の仕様は
[Recipe introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/recipeintroduction?view=minecraft-bedrock-stable)、
[recipe_shaped](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/recipereference/examples/recipedefinitions/recipe_shaped?view=minecraft-bedrock-stable)、
[minecraft:recipe_shapeless](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/recipereference/examples/recipedefinitions/minecraftrecipe_shapeless?view=minecraft-bedrock-stable) を根拠にする。

### 3-ter-3. JSON 値・item component patch・Java recipe JSON

JSON を受け取る境界は `JsonValue`、item component の差分は `ItemComponentPatch`、Java の crafting recipe document は `craftingRecipeFromUnknown` に分離する。
型付きコードでは `unknown` を持ち回らず、decoder の一箇所で有限性・非循環性・plain object・厳格なキー集合を検証する。`jsonValueFromUnknown` と
`itemComponentPatchFromUnknown` は入力を clone/freeze して返すため、呼び出し側の mutable な JSON object を kernel の値として共有しない。

```typescript
type JsonPrimitive = null | boolean | number | string;
type JsonObject = Readonly<{ readonly [key: string]: JsonValue }>;
type JsonValue = JsonPrimitive | ReadonlyArray<JsonValue> | JsonObject;

const isJsonValue: (value: unknown) => value is JsonValue;
const jsonValueFromUnknown: (value: unknown) => JsonValue;
const jsonValuesEqual: (left: JsonValue, right: JsonValue) => boolean;

type ItemComponentPatchKey = string & Brand.Brand<"ItemComponentPatchKey">;
type ItemComponentPatch = Readonly<Record<ItemComponentPatchKey, JsonValue>>;

const ItemComponentPatchKey: Brand.Brand.Constructor<ItemComponentPatchKey>;
const isItemComponentPatch: (value: unknown) => value is ItemComponentPatch;
const itemComponentPatchFromUnknown: (value: unknown) => ItemComponentPatch;
const itemComponentPatch: (
  options: Readonly<Record<string, JsonValue>>,
) => ItemComponentPatch;
const itemComponentPatchesEqual: (
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
) => boolean;
```

`ItemComponentPatchKey` は namespaced component id に任意の `!` を付けた値で、`!minecraft:foo` はその component の除去を表せる。patch の値は任意の JSON ではなく、
有限・非循環な JSON に限定する。`ItemStack.componentPatch` はこの patch を保持し、stack の merge は patch を構造比較してから成立する。

`craftingRecipeFromUnknown(id, value)` は現在の Java の `minecraft:crafting_shaped` と `minecraft:crafting_shapeless` を対象に、namespaced な vanilla item id、item tag、item-id の alternative、
pattern/key/ingredients、result の `id` / `count` / `components`、category/group/notification を `Recipe` と `ItemStack` へ変換する。`cookingRecipeFromUnknown` は smelting / blasting /
smoking / campfire cooking、`stonecuttingRecipeFromUnknown` は stonecutting、`smithingRecipeFromUnknown` は smithing transform / trim、`transmuteRecipeFromUnknown` は
crafting transmute を同じ境界で厳格に decode する。これらの結果は `PortableRecipe` として統合できる。

result の `components` は `ItemComponentPatch` になる。`recipeDataPath(id)` は namespaced recipe id を data-pack の canonical path へ変換し、
`recipeDataPackLayer` / `recipeDataPackLayerFromUnknown` / `selectRecipes` は recipe id 付きの data-pack layer と format・priority による選択を提供する。
旧 object-form ingredient、tag を含む alternative array、未知の recipe type、非 vanilla item、各 recipe type の未知キーは decoder で拒否する。
`crafting_dye`、`crafting_imbue`、および個別の special recipe type は、専用の実行 semantics を追加できるまでこの decoder の対象外である。
全 recipe type・全 edition/version の完全な registry、JSON ファイルの読み出し、pack の適用順序は data-pack layer と上位層が所有する。

```typescript
const craftingRecipeFromUnknown: (id: string, value: unknown) => Recipe;
const cookingRecipeFromUnknown: (id: string, value: unknown) => CookingRecipe;
const stonecuttingRecipeFromUnknown: (
  id: string,
  value: unknown,
) => StonecuttingRecipe;
const smithingRecipeFromUnknown: (id: string, value: unknown) => SmithingRecipe;
const transmuteRecipeFromUnknown: (
  id: string,
  value: unknown,
) => TransmuteRecipe;
const portableRecipeFromUnknown: (id: string, value: unknown) => PortableRecipe;
const recipeFromUnknown: typeof portableRecipeFromUnknown;
const recipeDataPath: (id: string) => string;
const craftingRecipeDataPath: (id: string) => string;
const recipeDataPackLayer: (
  options: RecipeDataPackLayerOptions,
) => RecipeDataPackLayer;
const recipeDataPackLayerFromUnknown: (value: unknown) => RecipeDataPackLayer;
const selectRecipes: (
  layers: ReadonlyArray<RecipeDataPackLayer>,
  format: DataPackFormat,
) => ReadonlyMap<NamespacedResourceLocation, PortableRecipe>;
```

root のほか `@nerima-games/mc-kernel/domain/json-value`、`domain/item-component-patch`、`domain/recipe-json`、`domain/recipe-registry` subpath から利用できる。recipe result の item
stack/components は [Minecraft Snapshot 24w10a](https://www.minecraft.net/pt-pt/article/minecraft-snapshot-24w10a) の item stack component 変更を、stonecutting / smithing /
transmute の現在の JSON schema は [Minecraft Java Edition 26.1](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-1) を参照する。decoder の対応範囲を全 recipe
registry と誤認しないよう、未対応 special recipe は明示的に拒否する。

### 3-quater. 調理と醸造

調理は `FurnaceState` を入力と出力にする純粋な状態遷移で、furnace / blast furnace / smoker ごとのレシピ・燃料・出力容量を扱う。
醸造は 3 本の bottle slot、ingredient、blaze powder の fuel charge、20 秒の brew progress を値として扱う。
どちらも時間経過を受け取るだけで、tick scheduler、インベントリ搬送、UI は所有しない。

```typescript
const VANILLA_SMELTING_RECIPES: ReadonlyArray<SmeltingRecipe>;
const VANILLA_FUEL_RULES: ReadonlyArray<FuelRule>;
const furnaceState: (input: FurnaceInput) => FurnaceState;
const advanceFurnace: (
  state: FurnaceState,
  elapsedSecs: number,
) => FurnaceAdvanceResult;

const VANILLA_BREWING_RECIPES: ReadonlyArray<BrewingRecipe>;
const brewingState: (input: BrewingInput) => BrewingState;
const addBrewingFuel: (state: BrewingState, charges: number) => BrewingState;
const advanceBrewing: (
  state: BrewingState,
  elapsedSecs: number,
) => BrewingAdvanceResult;
```

`Dimension` は vanilla の Overworld・Nether・End に限定した共有語彙で、`isDimension` は保存データやネットワーク入力の runtime guard である。
作物 API は現在の kernel が同梱する wheat・potato・nether wart の定義を、ワールド更新から分離した純粋なライフサイクルとして扱う。
`canPlantCrop` は土壌とディメンション、`advanceCrop` / `advanceCropByBoneMeal` は経過時間、`matureYieldsFor` は成熟時の保証ドロップを扱う。
実際の random tick、ブロック state の書き換え、収穫・アイテム生成イベントは上位層が所有する。

```typescript
const DIMENSIONS: readonly ["overworld", "nether", "end"];
const CROP_TYPES: ReadonlyArray<CropType>;
const CROP_REGISTRY: Readonly<Record<CropType, CropDefinition>>;
const canPlantCrop: (
  crop: CropType,
  soil: BlockType,
  dimension: Dimension,
) => boolean;
const advanceCrop: (crop: CropState, deltaSecs: number) => CropState;
const advanceCropByBoneMeal: (crop: CropState) => CropState;
const matureYieldsFor: (crop: CropState) => ReadonlyArray<ItemStack> | null;
const validateCropSnapshot: (value: unknown) => CropValidationResult;
```

`validateCropSnapshot` は保存データなどの unknown 境界を検査し、未知キー、無効なディメンション・作物、座標、熟度範囲、重複位置を `Invalid` として返す。
検証済みの値だけを `Valid` の `CropSnapshot` として返し、入力オブジェクトは変更しない。

石切台は `Slot` と `RecipeMatchContext` を入力にする純粋な recipe 照合である。exact ingredient と item tag ingredient、priority、station tag、入力数量を境界で検証し、`applyStonecutting` は出力と残入力を返す。

```typescript
const VANILLA_STONECUTTING_RECIPES: ReadonlyArray<StonecuttingRecipe>;
const matchStonecuttingRecipes: (
  input: Slot,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<StonecuttingRecipe>,
) => ReadonlyArray<StonecuttingRecipe>;
const matchStonecuttingRecipe: (
  input: Slot,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<StonecuttingRecipe>,
) => StonecuttingMatch;
const applyStonecutting: (
  recipe: StonecuttingRecipe,
  input: Slot,
  context?: RecipeMatchContext,
) => StonecuttingApplyResult;
```

`VANILLA_STONECUTTING_RECIPES` は現在の `ItemType` roster と登録済み recipe 語彙で実証できる公式データ表であり、全エディション・全バージョンの完全な registry を意味しない。

鍛造は `SmithingInput` と `SmithingOperation` を入力・出力にする純粋な変換で、netherite transform と trim recipe を扱う。
transform は template・base・addition の組み合わせから新しい item stack を作り、trim は armor と template・material の組み合わせから同じ base item を返す。
recipe の station と公式 tag、入力数量、単一スタック制限を境界で検証する。

```typescript
const VANILLA_SMITHING_RECIPES: ReadonlyArray<SmithingRecipe>;
const smithingInput: (input: SmithingInputInput) => SmithingInput;
const matchSmithingRecipe: (
  input: SmithingInput,
  context?: RecipeMatchContext,
  recipes?: ReadonlyArray<SmithingRecipe>,
) => SmithingRecipe | undefined;
const applySmithing: (input: SmithingInput) => SmithingOperation;
```

これらは root に加えて `domain/item-stack`、`domain/inventory`、`domain/recipe`、`domain/smelting`、`domain/brewing`、`domain/food`、`domain/consumable`、`domain/use-cooldown`、`domain/crop`、`domain/dimension`、`domain/stonecutting`、`domain/smithing`、`domain/grindstone`、`domain/settings`、`domain/statistics`、`domain/vehicle` の subpath から公開する。
Smithing の transform / trim の recipe schema は
[recipe_smithing_transform](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/recipereference/examples/recipedefinitions/recipe_smithing_transform?view=minecraft-bedrock-stable) と
[recipe_smithing_trim](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/recipereference/examples/recipe_smithing_trim?view=minecraft-bedrock-stable) を根拠にする。

`BlockWorld`、fluid の純粋更新、redstone のネットワーク評価・更新は root と `domain/block-world`、`domain/fluid-update`、`domain/redstone-network`、`domain/redstone-update` の subpath から公開する。既存の `domain/fluid` と `domain/redstone` は、それぞれの data・state・update API をまとめた barrel である。

### 3-quater-bis. 食料（food）

食料は `FoodDefinition` と判別可能な `FoodEffect` union に food component の栄養値、最終 saturation、食用条件、食後効果、`use_remainder` を保持し、`consumeFood` が `ItemStack` と `Vitals` から摂取可否、残りスタック、使用後の remainder、更新後の体力、適用対象の効果を返す。実際の効果付与、使用時間、アニメーション、イベント発火は上位層の責務である。

```typescript
const VANILLA_FOOD_DEFINITIONS: ReadonlyArray<FoodDefinition>;
const foodDefinitionOf: (item: ItemType) => FoodDefinition | undefined;
const canEatFood: (vitals: Vitals, definition: FoodDefinition) => boolean;
const foodRemainderOf: (definition: FoodDefinition) => ItemStack | undefined;
const consumeFood: (stack: ItemStack, vitals: Vitals) => FoodConsumeResult;
```

root のほか `domain/food` subpath から利用できる。食料データは現行 `ItemType` roster で表現できる範囲を同梱する定義表であり、全エディション・全バージョンの完全な food registry を意味しない。

### 3-quater-ter. アイテムコンポーネント（food / consumable / use_remainder / use_cooldown）

Java Edition 1.21.2 以降の item component の境界に合わせ、`food` は栄養値・saturation・`can_always_eat` を持つデータコンテナ、`consumable` は使用時間・アニメーション・音・粒子・使用後効果を持つ使用動作、`use_remainder` は使用後に残るスタック、`use_cooldown` は使用間隔として分離する。`FoodDefinition` は同梱の静的な食料表をこの 4 コンポーネントへ投影する。

```typescript
const DEFAULT_CONSUMABLE_COMPONENT: ConsumableComponent;
const consumableStatusEffect: (
  effectId: ResourceLocation,
  durationSecs: number,
  amplifier: number,
) => ConsumableStatusEffect;
const consumableApplyEffects: (
  effects: ReadonlyArray<ConsumableStatusEffect>,
  probability?: number,
) => ConsumableApplyEffects;
const consumableRemoveEffects: (
  effects: ReadonlyArray<ResourceLocation>,
) => ConsumableRemoveEffects;
const consumableClearAllEffects: () => ConsumableClearAllEffects;
const consumableTeleportRandomly: (
  diameter?: number,
) => ConsumableTeleportRandomly;
const consumablePlaySound: (sound: ResourceLocation) => ConsumablePlaySound;
const consumableComponent: (
  options?: ConsumableComponentOptions,
) => ConsumableComponent;
const foodComponentOf: (item: ItemType) => FoodComponent | undefined;
const consumableComponentOf: (
  item: ItemType,
) => ConsumableComponent | undefined;
const useRemainderComponentOf: (
  item: ItemType,
) => UseRemainderComponent | undefined;
const itemUseComponentsOf: (item: ItemType) => ItemUseComponents | undefined;
const useCooldownComponent: (
  seconds: number,
  cooldownGroup?: ResourceLocation,
) => UseCooldownComponent;
const isUseCooldownComponent: (value: unknown) => value is UseCooldownComponent;
const cooldownExpiresAt: (
  startedAt: MonotonicTimeSecs,
  component: UseCooldownComponent,
) => MonotonicTimeSecs;
const isCooldownActive: (
  now: MonotonicTimeSecs,
  startedAt: MonotonicTimeSecs,
  component: UseCooldownComponent,
) => boolean;
```

`ConsumableEffect` は apply / remove / clear-all / teleport / play-sound の判別可能 union として公開し、各 variant と `consumableComponent` で動的な item stack component も型安全に構築できる。`ConsumableComponent.consumeSeconds` は公式 schema に合わせた非負・有限の `ConsumeSeconds` であり、builder は number 入力を実行時検証してから返す。root のほか `domain/consumable` subpath から利用できる。`useCooldownComponent` は `CooldownSeconds` で正・有限の秒数だけを受け付け、`cooldownGroup` には任意の namespaced ID を指定でき、返却値を immutable にする。公式仕様どおり、グループを省略した場合は base item type ID がグループになり、同じグループの item は cooldown を共有する。`isUseCooldownComponent` は保存データなどの unknown 境界を実行時に検証し、期限は `MonotonicTimeSecs` で計算し、境界時刻を非アクティブとして扱う。root と `domain/use-cooldown` subpath から利用できる。仕様の境界は [Minecraft Java Edition 1.21.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-2) を参照する。resolver が同梱するのは `ItemType` に表現された静的な食料定義であり、potion・ominous bottle・suspicious stew などの動的な stack への具体的な値の供給と、使用イベントの実行は上位層の責務である。

### 3-quater-quater. 汎用 item component（テキスト / max_stack_size / max_damage / damage / repair_cost / use_cooldown / tool / weapon / kinetic_weapon / piercing_weapon / attack_range / sulfur_cube_content）

Java Edition 1.20.5 で導入された item component のうち、item stack の共有計算に必要な値を kernel の厳格な型で公開する。`max_stack_size` は 1..99 の整数、`max_damage` は正の整数、`damage` と `repair_cost` は非負整数で、`max_stack_size` と damageable item の相互制約も builder と guard の両方で検証する。`unbreakable`、`enchantment_glint_override`、`tooltip_display`、`rarity` も同じ resolved value に含める。`custom_name`、`item_name`、`lore` は strict な JSON text component、`lore` は最大 256 行、`item_model` は namespaced resource location として検証する。仕様上の component は item type の既定値を持ち、stack 単位で上書きできるため、`itemComponents` は item-aware な既定値の解決、stack ごとの override の所有は上位の `ItemStack` / persistence 層とする。`tool` は既存の採掘速度表に対応する axe・pickaxe・shovel の item-aware な既定値を `ITEM_TOOL_COMPONENTS` から解決する。詳細な component model は [Minecraft Java Edition 1.20.5](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-20-5) と [Minecraft Java Edition 1.21.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-2) を参照する。

```typescript
const ITEM_COMPONENT_IDS: readonly ItemComponentId[];
const ITEM_RARITIES: readonly ItemRarity[];
const ITEM_TOOL_COMPONENTS: Readonly<Partial<Record<ItemType, ToolComponent>>>;
const textComponent: (value: TextComponent) => TextComponent;
const isTextComponent: (value: unknown) => value is TextComponent;
const itemComponentStackLimitOf: (item: ItemType) => ItemStackLimit;
const itemToolComponentOf: (item: ItemType) => ToolComponent | undefined;
const weaponComponent: (options?: WeaponComponentOptions) => WeaponComponent;
const isWeaponComponent: (value: unknown) => value is WeaponComponent;
const itemComponents: (
  item: ItemType,
  options?: ItemComponentOptions,
) => ItemComponents;
const isItemComponents: (value: unknown) => value is ItemComponents;
const sulfurCubeContentComponent: (value: string) => SulfurCubeContentComponent;
const isSulfurCubeContentOptions: (
  value: unknown,
) => value is SulfurCubeContentOptions;
const isSulfurCubeContentComponent: (
  value: unknown,
) => value is SulfurCubeContentComponent;
```

`itemComponents` は item registry の stack limit と equipment の耐久既定値を統合し、返却値を immutable にする。`ItemComponentOptions.customName` / `itemName` / `lore` / `itemModel`、`useCooldown`、`weapon` で stack ごとの component を検証済みの値として解決結果へ含められ、`ItemStack` と inventory の merge 判定でも保持される。`MaxStackSize`、`MaxDamage`、`ItemDamage`、`RepairCost`、`WeaponDisableBlockingSeconds` は root と `domain/quantities` から、component の data と resolver は root と `domain/item-components` から利用できる。`TextComponent`、`textComponent`、`isTextComponent` は root と `domain/text-component` から利用できる。`tool` の一般的な rule 解決は `domain/tool-component` の `compileToolComponent` / `resolveToolMiningProperties`、item-aware な既定値は `ITEM_TOOL_COMPONENTS` / `itemToolComponentOf` が所有する。実際の使用・保存イベントは上位層の責務である。

`weaponComponent` は Java Edition 1.21.5 の `minecraft:weapon` を表し、`itemDamagePerAttack` は非負の安全な整数（既定値 1）、`disableBlockingForSeconds` は非負の有限秒数（既定値 0）として検証する。返却値は immutable で、`isWeaponComponent` は保存データなどの unknown 境界を正確なキー集合と型で検証する。root のほか `domain/weapon` subpath から利用できる。公式仕様は [Minecraft Java Edition 1.21.5](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-5) を参照する。

`attackRangeComponent` は Java Edition 1.21.11 の `minecraft:attack_range` を表し、公式 schema の `min_reach` / `max_reach` / `min_creative_reach` / `max_creative_reach` をそれぞれ `minReach` / `maxReach` / `minCreativeReach` / `maxCreativeReach` として公開する。既定値は順に 0 / 3 / 0 / 5、値域は 0..64 で、`hitboxMargin` は 0..1、`mobFactor` は 0..2 で検証する。`kineticWeaponComponent` と `piercingWeaponComponent` も同じ combat component model として root から利用できる。公式仕様は [Minecraft Java Edition 1.21.11](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-11) と [Minecraft Java Edition 26.1](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-1) を参照する。

`sulfurCubeContentComponent` は Java Edition 26.2 で追加された `minecraft:sulfur_cube_content` を表し、Sulfur Cube に吸収される item の resource location を検証して `ResourceLocation` に正規化する。`isSulfurCubeContentOptions` と `isSulfurCubeContentComponent` は保存データなどの `unknown` 境界を同じ条件で検証する。公式仕様は [Minecraft Java Edition 26.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2) を参照する。

### 3-quater-quater-bis. Sulfur Cube archetype registry

`minecraft:sulfur_cube_archetype` の JSON を `unknown` の入力境界で検証し、`sulfurCubeArchetype` が `TagLocation`、resource location、`AttributeModifierAmount` へ正規化した immutable な定義を返す。成功後の戻り値は `SulfurCubeArchetype` として厳密に型付けされる。必須の item tag、浮力、attribute modifier、knockback modifier、sound settings に加え、任意の explosion と contact damage を表現できる。内部の builder は `SulfurCubeArchetypeOptions` を受け、保存 JSON などの外部値は `sulfurCubeArchetypeFromUnknown` で一度だけ検証してから builder に渡す。`isSulfurCubeArchetypeOptions` は保存データなどの `unknown` 境界、`isSulfurCubeArchetype` は正規化後の値の境界を検証する。

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
const sulfurCubeArchetypeFromUnknown: (value: unknown) => SulfurCubeArchetype;
const isSulfurCubeArchetypeOptions: (
  value: unknown,
) => value is SulfurCubeArchetypeOptions;
const isSulfurCubeArchetype: (value: unknown) => value is SulfurCubeArchetype;
const sulfurCubeArchetypeDataPackLayer: (
  options: SulfurCubeArchetypeDataPackLayerOptions,
) => SulfurCubeArchetypeDataPackLayer;
const sulfurCubeArchetypeDataPackLayerFromUnknown: (
  value: unknown,
) => SulfurCubeArchetypeDataPackLayer;
const selectSulfurCubeArchetypes: (
  layers: ReadonlyArray<SulfurCubeArchetypeDataPackLayer>,
  format: DataPackFormat,
) => ReadonlyMap<NamespacedResourceLocation, SulfurCubeArchetype>;
const sulfurCubeArchetypeDataPath: (
  entry: NamespacedResourceLocation,
) => string;
```

公式 26.2 が列挙する archetype の挙動名、block/item/entity tag、`minecraft:bounce` game event、`minecraft:sulfur_cube_content` component、`minecraft:sulfur_cube_hot` damage type、Sulfur Cube particle の識別子を branded な portable data として公開する。`#` 付きの block/item/entity tag は `TagLocation`、registry・component・game event・damage type・particle は `ResourceLocation` で区別する。`sulfurCubeArchetypeDataPackLayer` は JSON の外部値を decoder 境界で検証し、`selectSulfurCubeArchetypes` は対象 format の layer を priority 順に重ねて registry を解決する。公式ページが個別 archetype JSON の数値を掲載していないため、kernel は vanilla の数値を推測して固定しない。JSON・pack filesystem の読み出しと、Sulfur Cube の物理・爆発・接触イベントの実行は上位層の責務である。仕様は [Minecraft Java Edition 26.2](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2) を参照する。

### 3-quinquies-bis. 設定値と統計

設定と統計は、下流の UI・状態所有・保存形式から独立した値モデルとして公開する。`Settings` は描画距離、視野角、品質、音量、感度、key binding の既定値・境界・正規化・更新を、`Statistics` は counter の記録、achievement の解放、重複除去、正規化を扱う。

```typescript
const DEFAULT_SETTINGS: Settings;
const normaliseSettings: (input: unknown) => Settings;
const applySettings: (settings: Settings, patch: Partial<Settings>) => Settings;
const bindKey: (settings: Settings, action: string, code: string) => Settings;
const unbindKey: (settings: Settings, action: string) => Settings;

const EMPTY_STATISTICS: Statistics;
const normaliseStatistics: (input: unknown) => Statistics;
const record: (
  statistics: Statistics,
  key: StatisticKey,
  amount?: number,
) => Statistics;
const unlock: (
  statistics: Statistics,
  achievement: AchievementId,
) => Statistics;
```

root のほか `domain/settings` と `domain/statistics` から利用できる。画面・renderer preset・入力デバイスへの適用、ゲームイベントの意味付け、achievement registry、player state の所有、永続化は下流の責務である。

### 3-quinquies. エンチャントとエンチャントテーブル

エンチャントは `ItemStack` に直接埋め込まず、既存の Anvil の入力・計画・適用プリミティブへ接続する独立したデータ／ロジック境界である。
`SUPPORTED_VANILLA_ENCHANTMENT_IDS` は現在の `ItemType` roster で扱う 32 種の ID、`VANILLA_ENCHANTMENT_COSTS` と rule set は本の合成とアイテム合成の対象、最大レベル、適用対象、競合関係を表す。

```typescript
const SUPPORTED_VANILLA_ENCHANTMENT_IDS: ReadonlyArray<SupportedVanillaEnchantmentId>;
const VANILLA_ENCHANTMENT_COSTS: Readonly<
  Record<SupportedVanillaEnchantmentId, VanillaAnvilCost>
>;
const SUPPORTED_VANILLA_ANVIL_RULE_SET: AnvilRuleSet;

const enchantmentRuleFor: (
  id: SupportedVanillaEnchantmentId | AnvilEnchantmentId,
) => AnvilEnchantmentRule | undefined;
const enchantmentAppliesTo: (
  id: SupportedVanillaEnchantmentId | AnvilEnchantmentId,
  item: ItemType,
) => boolean;
const enchantmentsConflict: (
  first: SupportedVanillaEnchantmentId | AnvilEnchantmentId,
  second: SupportedVanillaEnchantmentId | AnvilEnchantmentId,
) => boolean;
const planVanillaAnvil: (state: AnvilState) => AnvilPlan;
const applyVanillaAnvil: (state: AnvilState) => AnvilApplyResult;
```

`planVanillaAnvil` / `applyVanillaAnvil` は既存の `planAnvil` / `applyAnvil` を直接呼び出し、右入力が `enchanted_book` の場合だけ本用 rule set を選ぶ。
サーバーの経験値・インベントリ消費、耐久値への効果適用、付与結果の保存は上位の責務である。

エンチャントテーブルは乱数を注入する純粋な関数で、15 段階までの本棚、入力アイテム、slot（3 offers）から Java 形式の level cost と候補を生成する。
`EnchantmentTableRandom` を上位から渡すため、kernel は乱数 seed、GUI、経験値・ラピスラズリ消費、サーバー権威を所有しない。

```typescript
const ENCHANTMENT_TABLE_BOOK: "book";
const ENCHANTMENT_TABLE_MAX_BOOKSHELVES: 15;
const ENCHANTMENT_TABLE_SLOT_COUNT: 3;
const VANILLA_ENCHANTMENT_TABLE_RULES: Readonly<
  Record<SupportedVanillaEnchantmentId, VanillaEnchantmentTableRule>
>;
const ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY: Readonly<
  Partial<Record<EnchantmentTableItem, number>>
>;

const calculateEnchantmentTableLevelCost: (
  input: EnchantmentTableCostInput,
) => EnchantmentTableLevelCost;
const generateEnchantmentTableOffers: (
  input: GenerateEnchantmentTableOffersInput,
) => EnchantmentTableOffers;
const enchantmentTableOutputItemOf: (input: EnchantmentTableItem) => ItemType;
```

このデータは全バージョン・全エディションの完全な registry ではなく、現在の kernel の item roster とテストで固定した対応範囲である。
未収録の item、edition 差分、将来の enchantment は、明示的なデータとテストを追加してから公開範囲へ加える。
root のほか `domain/enchantment` と `domain/enchantment-table` subpath から利用できる。

### 3-quinquies-2. 砥石（grindstone）

砥石は、入力を変更せずに結果と経験値コストを返す純粋な計画である。単体入力では通常エンチャントを除去し、呪いを保持する。呪いが残らないエンチャント本は通常の本へ変換する。二入力では同一アイテムのダメージ値を合成し、耐久アイテムは最大耐久の 5% を加算した回復量、非耐久アイテムは同一コンポーネントのスタック条件を検証する。

```typescript
const GRINDSTONE_CURSE_ENCHANTMENT_IDS: ReadonlyArray<string>;
const GRINDSTONE_DURABILITY_BONUS_PERCENT: 5;
const GRINDSTONE_REPAIR_COST_MAX: 2_147_483_647;

const grindstoneExperienceFor: (nonCurseEnchantmentCount: number) => number;
const planGrindstone: (
  left: GrindstoneInput | null,
  right: GrindstoneInput | null,
) => GrindstonePlan;
```

`planGrindstone` は root と `domain/grindstone` subpath から利用できる。搬送、GUI、プレイヤーの経験値消費、ワールド更新は上位層の責務である。

### 3-sexies. 飛翔体（projectile）

矢の弾道を、ワールドや Entity の所有から分離した純粋な値遷移として公開する。`stepArrow` は前フレーム位置から次位置までを連続区間として評価し、ブロック/Entity の AABB への最初の衝突、重力、空気・水中 drag、射手への短い grace period、寿命、ワールド境界を同じ遷移に反映する。

```typescript
const ARROW_GRAVITY = 9.81;
const ARROW_AIR_DRAG = 0.99;
const ARROW_WATER_DRAG = 0.6;
const ARROW_MAX_LIFETIME_SECONDS = 60;
const ARROW_SHOOTER_GRACE_SECONDS = 0.25;

type ProjectileEntity = Readonly<{ id: string; bounds: AABB }>;
type ProjectileWorld = Readonly<{
  blockBounds: (start: Position, end: Position) => readonly AABB[];
  entities: readonly ProjectileEntity[];
  isInWater: (position: Position) => boolean;
  bounds: AABB;
}>;
type Arrow = /* state: 'flying' | 'stuck' | 'despawned' */ object;
type ArrowLaunch = Readonly<{
  position: Position;
  yawRadians: number;
  pitchRadians: number;
  speed: number;
  shooterId?: string;
}>;
type ProjectileStep = Readonly<{ arrow: Arrow; hit?: ProjectileHit }>;

const launchArrow: (launch: ArrowLaunch) => Arrow;
const stepArrow: (
  arrow: Arrow,
  deltaSeconds: number,
  world: ProjectileWorld,
) => ProjectileStep;
```

`ProjectileWorld` は上位層から衝突候補と水中判定を受け取るだけで、Entity の生成・削除、ブロック変更、イベント dispatch、ダメージ適用は行わない。これにより `mc-physics`・`mc-sim`・gameplay が同じ遷移と衝突契約を共有できる。現在の実装対象は Arrow である。

root と `@nerima-games/mc-kernel/domain/projectile` subpath から利用できる。

### 3-septies. 爆発と着火済み TNT（explosion / primed-tnt）

爆発は、中心・半径・seed と上位層が提供するブロック／Entity の読み取りから、破壊対象・Entity 効果・ノックバックを決定論的に計画する。抵抗値、遮蔽、有限の ray step・visited block・affected entity 上限を同じ計画に含めるため、ワールド更新やダメージ適用を行わない。

```typescript
const DEFAULT_EXPLOSION_LIMITS: ExplosionLimits;
const planExplosion: (request: ExplosionRequest) => ExplosionPlan;
const applyExplosionPlan: (
  plan: ExplosionPlan,
  commit: ExplosionCommit,
) => void;
```

着火済み TNT は fuse の正規化、経過時間の上限、detonated への遷移と爆発計画を一つの純粋な値遷移として扱う。`applyPrimedTntPlan` は fuse 状態と爆発 mutation を上位層の一回の commit に渡すだけである。

```typescript
const DEFAULT_TNT_FUSE_SECS = 4;
const MAX_TNT_FUSE_ADVANCE_SECS = 10;
const primeTnt: (fuseSecs?: number) => PrimedTntState;
const planPrimedTnt: (request: PrimedTntRequest) => PrimedTntPlan;
const applyPrimedTntPlan: (
  plan: PrimedTntPlan,
  commit: PrimedTntCommit,
) => void;
```

root と `@nerima-games/mc-kernel/domain/explosion`、`@nerima-games/mc-kernel/domain/primed-tnt` subpath から利用できる。

## 4. ブロック能力モデル

**権威は `docs/capability-flag-audit.md`。** 監査 §3 の表は 28 行であり、この表を採用している。

2 つの仕組みに分かれる。boolean は能力フラグ表、それ以外は型付きプロパティ表。
plan.md §3.1 が boolean として挙げた 7 つのうち 4 つはそのまま boolean、**3 つは型が誤っていた**。

### 4-1. 能力フラグ（boolean）— `domain/block-capabilities.ts` / `domain/block-capability-data.ts`

`block-capability-data.ts` が能力の型・既定値・反復順を持ち、`block-capabilities.ts` が外部入力の検証と既定値解決を担当する。
公開 import path は `block-capabilities.ts` のまま維持する。

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

| フラグ                  | 既定       | 根拠                                                                          |
| ----------------------- | ---------- | ----------------------------------------------------------------------------- |
| `passable`              | `false`    | 監査 §4.1 `block-collision-predicates.ts:22-44`                               |
| `fallsWhenUnsupported`  | `false`    | 監査 §3 `falling-block.ts`                                                    |
| `replaceable`           | `false`    | 監査 §4.2 `block-service-place-load.ts:50`                                    |
| `flammable`             | `false`    | 監査 §4.3 `fire-lifecycle.ts:18-30`                                           |
| `fireSource`            | `false`    | 監査 §4.3 `fire-lifecycle.ts:77-78`                                           |
| `pistonImmovable`       | `false`    | plan.md §3.12                                                                 |
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

### 4-2. プロパティ（型付き値）— `domain/block-properties.ts`

このパスは公開バレルとして維持し、値 vocabulary・型・既定値は `domain/block-property-data.ts`、
外部入力の検証と既定値解決は `domain/block-property-validation.ts` に分離している。

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

| プロパティ         | 型                                                      | 既定                                  | 根拠                                                                |
| ------------------ | ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `opacity`          | `'transparentSolid' \| 'fluid' \| 'opaque'`             | `'opaque'`                            | 監査 §4.4                                                           |
| `lightEmission`    | `number` (0..15)                                        | `0`                                   | 監査 §4.4 `light.ts:24-46`                                          |
| `fluid`            | `'none' \| 'water' \| 'lava'`                           | `'none'`                              | 監査 §4.2                                                           |
| `collisionShape`   | `'full'\|'slab'\|'cactus'\|'pressurePlate'\|'none'`     | `'full'`                              | 監査 §4.1                                                           |
| `renderKind`       | `'cube'\|'cross'\|'cactus'\|'rail'\|'lilyPad'\|'fluid'` | `'cube'`                              | 監査 §4.8                                                           |
| `footstepMaterial` | `'default'\|'grass'\|'wood'\|'stone'`                   | `'default'`                           | 監査 §4.8。純粋な表面分類で、効果音 ID や再生は mc-audio が所有する |
| `hardness`         | `number`                                                | `8`                                   | 監査 §4.5。`-1` は不破壊、`0` は即時破壊、それ以外の負値は不正      |
| `friction`         | `number`                                                | `0.6`                                 | 監査 §4.5 `DEFAULT_BLOCK_FRICTION`                                  |
| `contactDamage`    | `number`                                                | `0`                                   | 監査 §4.7（LAVA=4 / CACTUS=1）                                      |
| `movementDrag`     | `number`                                                | `0`                                   | 監査 §4.1 `:203-208`                                                |
| `xpOnBreak`        | `number`                                                | `0`                                   | 監査 §4.5 `blocks.config.ores.ts:8-45`                              |
| `railKind`         | `'none'\|'normal'\|'powered'`                           | `'none'`                              | 監査 §4.1 `:184-201`                                                |
| `harvestTool`      | `HarvestToolRequirement`                                | `{category:'none', minTier:'none'}`   | 監査 §4.5                                                           |
| `drops`            | `BlockDropRule`                                         | `{item:'self', count:1, ...}`         | 監査 §4.5                                                           |
| `supportRule`      | `SupportRule`                                           | `NEEDS_NO_SUPPORT`（`{kind:'none'}`） | 監査 §4.6。§4-2-bis 参照                                            |

補助 API: `BLOCK_OPACITIES` / `FLUID_KINDS` / `COLLISION_SHAPES` / `RENDER_KINDS` / `FOOTSTEP_MATERIALS` /
`RAIL_KINDS` / `LIGHT_LEVEL_MIN` / `LIGHT_LEVEL_MAX` / `isLightLevel` / `clampLightLevel`。

### 4-2-bis. `SupportRule` の値 — `domain/block-support.ts` / `domain/block-support-data.ts`

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

### 4-3. struct 2 種を隔離した理由 — `domain/block-harvest.ts` / `domain/block-harvest-data.ts`

```typescript
const HARVEST_TOOL_CATEGORIES = ['none', 'pickaxe', 'axe', 'shovel', 'hoe', 'shears', 'sword'] as const
type HarvestToolCategory = (typeof HARVEST_TOOL_CATEGORIES)[number]

const HARVEST_TIERS = ['none', 'wooden', 'stone', 'iron', 'diamond', 'netherite'] as const
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

### 4-3-ter. ブロック相互作用 — `domain/block-interaction.ts` / `domain/block-interaction-data.ts`

ブロック ID、registry の解決結果、harvest/drop、support rule、block↔item bridge を束ねる、状態を変更しない判定を公開する。

```typescript
type BlockBreakDecision =
  | {
      readonly kind: "blocked";
      readonly reason: "unknown" | "air" | "unbreakable";
    }
  | {
      readonly kind: "broken";
      readonly id: BlockId;
      readonly type: BlockType;
      readonly drop?: BlockDrop;
      readonly experience: number;
    };

type BlockPlacementDecision =
  | {
      readonly kind: "rejected";
      readonly reason: "unknown-block" | "air" | "unsupported";
    }
  | { readonly kind: "placed"; readonly id: BlockId; readonly type: BlockType };

const breakBlock: (id: number, context?: HarvestContext) => BlockBreakDecision;
const canReplaceBlock: (id: number) => boolean;
const placeBlock: (id: number, supportBelow: number) => BlockPlacementDecision;
const placeableBlockFromItem: (item: ItemType) => PlaceableBlock | undefined;
```

`breakBlock` の不破壊判定は canonical `UNBREAKABLE_HARDNESS`（`-1`）を取りこぼさず、参照レジストリにある
`9000` 以上の hardness と、`pistonImmovable` かつ hardness `100` 以上の bedrock-class もまとめて扱う。
閾値は data module が所有する。破壊成功時は registry の `xpOnBreak` と deterministic な base drop を返し、
Fortune の乱数や採掘時間は適用しない。

`placeBlock` は設置先直下の support rule だけを評価し、world mutation、衝突、隣接ブロック更新、液体流動、
イベント発火は行わない。`placeableBlockFromItem` は placeable item と block type の canonical bridge を使う。
`canReplaceBlock` は既存セルの `replaceable` capability と air を判定する。
成功結果をワールドへ適用し、採掘時間・アニメーション・インベントリ消費を管理するのは上位層である。

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

| 能力           | 種別     | 所有者   | 境界理由                                                  |
| -------------- | -------- | -------- | --------------------------------------------------------- |
| `textureTiles` | property | renderer | アトラス・面別 tile 割当・画像 asset は renderer の責務。 |

`test/block-definition.test.ts` が「実装済み 27 + 下流所有 1 = 監査の 28」を機械的に検査している。
監査にあるものを黙って落とすことも、監査にないものを勝手に足すこともできない。

## 5-bis. フレーム時間（frame-timing）

フレームループが受け取った経過時間を、シミュレーションへ渡せる範囲に制限し、捨てた時間を別に記録する純粋関数を公開する。
状態・時計・ゲームループそのものは上位層が所有する。

```typescript
const MIN_FRAME_DELTA_SECS = 0.001;
const MAX_FRAME_DELTA_SECS = 0.05;
const FIRST_FRAME_DELTA_SECS: DeltaTimeSecs = DeltaTimeSecs(0.016);

const clampFrameDelta: (rawDeltaSecs: number) => DeltaTimeSecs;
const frameDeltaBetween: (
  previousSecs: number | undefined,
  nowSecs: number,
) => DeltaTimeSecs;
const frameDeltaLossSecs: (rawDeltaSecs: number) => number;
const frameDeltaLossBetween: (
  previousSecs: number | undefined,
  nowSecs: number,
) => number;
```

`NaN` または前回時刻が無い場合は最初のフレーム値 `0.016` を使う。通常の値は `0.001` 以上
`0.05` 以下に clamp し、上限を超えた経過時間は `frameDeltaLossSecs` / `frameDeltaLossBetween` で返す。
これは `mc-sim` の状態・累積器を移植したものではなく、`DeltaTimeSecs` を消費する共有された時間ポリシーだけを kernel が所有する境界である。

## 5-ter. 昼夜と天候（time-of-day / weather）

昼夜と天候の**純粋な状態モデル**を公開する。シミュレーションの状態サービス、保存、カウントダウン、ゲームループは上位層が所有する。

```typescript
type TimeState = {
  readonly ticks: number;
  readonly dayLengthTicks: number;
};

const INITIAL_TIME_STATE: TimeState;
const TICKS_PER_SECOND = 60;
const MIN_DAY_LENGTH_SECS = 120;
const MAX_DAY_LENGTH_SECS = 1200;
const MAX_TIME_FRACTION = 0.9999;
const MOON_PHASE_COUNT = 8;
const DEFAULT_DAY_LENGTH_SECS = 400;

const isValidTimeState: (value: unknown) => value is TimeState;
const normaliseTimeState: (value: unknown) => TimeState;
const timeOfDay: (state: TimeState) => number;
const dayLengthSecs: (state: TimeState) => number;
const moonPhase: (state: TimeState) => number;
const isNight: (state: TimeState) => boolean;
const advance: (state: TimeState, deltaSecs: DeltaTimeSecs) => TimeState;
const setDayLength: (state: TimeState, seconds: number) => TimeState;
const setTimeOfDay: (state: TimeState, fraction: number) => TimeState;
const setDayLengthThenTimeOfDay: (state, seconds, fraction) => TimeState;

type Weather = "clear" | "rain" | "thunder";
type WeatherState = {
  readonly weather: Weather;
  readonly remainingSecs: number;
};

const INITIAL_WEATHER_STATE: WeatherState;
const isWeather: (value: unknown) => value is Weather;
const isValidWeatherState: (value: unknown) => value is WeatherState;
const normaliseWeatherState: (value: unknown) => WeatherState;
```

`TimeState` の tick は `DeltaTimeSecs` から決定的に進み、day length と時刻 fraction は定数の範囲に正規化する。天候は有限な正の残り時間だけを有効とする。どちらも外部入力や保存データを kernel 境界で検証できるが、永続化形式やサービスのライフサイクルは定義しない。

## 5-quater. プレイヤー vitals（vitals）

プレイヤーの状態サービスや食料タイマーを持ち込まず、体力・飢餓・飽和・経験値の値ベース計算と外部入力の境界検証を公開する。

```typescript
type DamageCause = string;
type Damage = Readonly<{ amount: number; cause: DamageCause }>;
type Vitals = Readonly<{
  healthPoints: number;
  maxHealthPoints: number;
  hungerPoints: number;
  maxHungerPoints: number;
  saturation: number;
  exhaustion: number;
  foodTimerSecs: number;
  totalExperience: number;
  lastDamageCause: DamageCause | undefined;
}>;
type VitalsView = Readonly<{
  healthPoints: number;
  maxHealthPoints: number;
  hungerPoints: number;
  maxHungerPoints: number;
  experienceLevel: number;
  experienceProgress: number;
}>;

const DEFAULT_MAX_HEALTH_POINTS = 20;
const DEFAULT_MAX_HUNGER_POINTS = 20;
const SPAWN_SATURATION = 5;
const EXHAUSTION_PER_POINT = 4;
const MAX_EXHAUSTION = 40;
const FOOD_TICK_SECS = 4;
const REGEN_HUNGER_THRESHOLD = 18;
const EXHAUSTION_PER_REGEN = 6;
const SPAWN_VITALS: Vitals;

const isDead: (vitals: Vitals) => boolean;
const applyDamage: (vitals: Vitals, damage: Damage) => Vitals;
const heal: (vitals: Vitals, amount: number) => Vitals;
const addExhaustion: (vitals: Vitals, amount: number) => Vitals;
const eat: (vitals: Vitals, foodPoints: number, saturation: number) => Vitals;
const advanceFoodTimer: (
  vitals: Vitals,
  deltaSecs: DeltaTimeSecs,
) => readonly ["none" | "regen" | "starve", Vitals];

const experienceCostOfLevel: (level: number) => number;
const totalExperienceAtLevel: (level: number) => number;
const levelForTotalExperience: (totalExperience: number) => number;
const experienceLevel: (vitals: Vitals) => number;
const experienceProgress: (vitals: Vitals) => number;
const addExperience: (vitals: Vitals, amount: number) => Vitals;
const respawn: (vitals: Vitals) => Vitals;
const isValidVitals: (value: unknown) => value is Vitals;
const normaliseVitals: (value: unknown) => Vitals;
const vitalsView: (vitals: Vitals) => VitalsView;
```

`applyDamage`、`heal`、`addExhaustion`、`eat`、`advanceFoodTimer`、`addExperience`、`respawn` は入力値を変更せず、次の `Vitals` を返す。
経験値のレベル曲線、食料 tick の `regen` / `starve` 判定、死亡時のダメージ原因はこの値計算に含まれる。
`normaliseVitals` と `isValidVitals` は保存やネットワークなどの外部入力を受ける境界で使う。
プレイヤーサービスによる権限判定、タイマーの所有、インベントリとの接続、保存形式、実際の UI は上位層が所有する。

## 5-quinquies. 乗り物 snapshot 契約（vehicle）

乗り物は boat / minecart の語彙、位置・速度・向き、搭乗者の一意性、snapshot の serial 採番を表す純粋なデータ契約である。
保存・ネットワーク入力は `validateVehicleSnapshot` で検証し、検証済みの `VehicleSnapshot` だけを下流のシミュレーションへ渡す。
物理的な移動、レール接続、衝突、搭乗・降車、ワールド mutation は上位層が所有する。

```typescript
const VEHICLE_TYPES: readonly ["boat", "minecart"];
const isVehicleType: (value: unknown) => value is VehicleType;
const VehicleId: Brand.Constructor<VehicleId>;
const OccupantId: Brand.Constructor<OccupantId>;
const validateVehicleSnapshot: (value: unknown) => VehicleValidationResult;
const emptyVehicleSnapshot: () => VehicleSnapshot;
```

`validateVehicleSnapshot` は未知入力の配列形状、有限座標・速度・向き、dimension、ID と搭乗者の重複、`v:<serial>` の安全整数、`nextSerial` の先行性を検証する。

## 5-sexies. BlockWorld、fluid、redstone の純粋更新

`BlockWorld` は block position key から block ID への不変な読み取り境界である。`setBlockAt` は元の map を変更せず、空気 block を設定した場合は key を削除する。関数型の `BlockReader` と map のどちらも `BlockSource` として読み取れる。

```typescript
type BlockWorld = ReadonlyMap<BlockPositionKey, BlockId>;
type BlockReader = (position: BlockPosition) => BlockId;
type BlockSource = BlockWorld | BlockReader;

const emptyBlockWorld: () => BlockWorld;
const blockAt: (world: BlockWorld, position: BlockPosition) => BlockId;
const blockReaderOf: (world: BlockWorld) => BlockReader;
const readBlockAt: (source: BlockSource, position: BlockPosition) => BlockId;
const setBlockAt: (
  world: BlockWorld,
  position: BlockPosition,
  blockId: BlockId,
) => BlockWorld;
```

fluid 更新は `FluidState` の scheduled cell を入力し、block world と状態を変更した新しい値、変更一覧を返す。空のセルは空気として扱い、置換可能 block、水流で壊れる block、水と溶岩の source 混合、下向き優先・水平減衰を同じルールで評価する。

```typescript
type FluidChange = {
  readonly after: BlockId;
  readonly before: BlockId;
  readonly falling: boolean;
  readonly fluid: FlowingFluidKind;
  readonly kind: "flow" | "mix";
  readonly level: FluidLevel;
  readonly position: BlockPosition;
};
type FluidUpdate = {
  readonly changes: ReadonlyArray<FluidChange>;
  readonly state: FluidState;
  readonly world: BlockWorld;
};

const fluidStateFromWorld: (world: BlockWorld) => FluidState;
const canFluidReplace: (blockId: BlockId, kind: FlowingFluidKind) => boolean;
const updateFluids: (world: BlockWorld, state?: FluidState) => FluidUpdate;
```

redstone 更新は `RedstoneState` と block world から source、device、wire、lamp の状態を評価する。`updateRedstone` は repeater の遅延・lock、comparator の比較、observer の pulse、wire propagation、lamp state をまとめて扱い、world/state/change list を返す。ネットワーク評価だけが必要な場合は次の純粋関数を使う。

```typescript
const collectRedstoneLayout: (
  world: BlockWorld,
  state: RedstoneState,
) => RedstoneLayout;
const sourcePowerAt: (
  world: BlockWorld,
  state: RedstoneState,
  position: BlockPosition,
) => RedstonePower;
const deviceOutputFace: (device: RedstoneDevice) => BlockFace;
const deviceOutputAtTarget: (
  context: Pick<DevicePowerContext, "deviceOutputs" | "devices">,
  target: BlockPosition,
) => RedstonePower;
const poweredWiresFrom: (
  context: Omit<WirePropagation, "queue">,
) => Map<BlockPositionKey, RedstonePower>;
const signalPowerAt: (
  context: DevicePowerContext,
  position: BlockPosition,
) => RedstonePower;
const wirePowerChanges: (
  state: RedstoneState,
  wires: ReadonlyArray<BlockPosition>,
  powers: ReadonlyMap<BlockPositionKey, RedstonePower>,
) => Array<RedstoneChange>;
const blockIsWire: (world: BlockWorld, position: BlockPosition) => boolean;
const updateRedstone: (
  world: BlockWorld,
  state?: RedstoneState,
) => RedstoneUpdate;
```

これらは world interface、tick queue、イベント bus、永続化形式を所有しない。下流は更新結果を自分の chunk・entity・network 境界へ適用する。

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

### 5-1. プレイヤー姿勢の純粋計算（camera-pose）

```typescript
type PlayerPose = {
  readonly feetPosition: Position;
  readonly yawRadians: number;
  readonly pitchRadians: number;
};
const INITIAL_PLAYER_POSE: PlayerPose;
const clampPitch: (pitchRadians: number) => number;
const applyLook: (
  pose: PlayerPose,
  deltaYawRadians: number,
  deltaPitchRadians: number,
) => PlayerPose;
const withFeetPosition: (
  pose: PlayerPose,
  feetPosition: Position,
) => PlayerPose;
const cameraPoseOf: (
  pose: PlayerPose,
  capturedAtSecs: MonotonicTimeSecs,
) => CameraPoseSnapshot;
const forwardVector: (
  orientation: Pick<CameraPoseSnapshot, "yawRadians" | "pitchRadians">,
) => Position;
```

`camera-pose` はプレイヤーの足元位置・視線角度から、目の高さを加えた `CameraPoseSnapshot` と視線方向を決定論的に計算する。
pitch は上下反転を防ぐため `±(π / 2 - 0.01)` に収め、入力姿勢を変更せず次の値を返す。
姿勢の所有、入力デバイス、マウス感度、カメラの描画反映は上位層が所有する。

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
type FrameServices = ClockPort; // ← 確定（縦切りスパイク済み）

interface StageRegistration {
  readonly id: StageId;
  readonly after?: ReadonlyArray<StageId>;
  readonly run: (
    dt: DeltaTimeSecs,
  ) => Effect.Effect<void, never, FrameServices>;
}

interface GameModule<ROut, E, RIn, RRegister = never> {
  readonly layers: Layer.Layer<ROut, E, RIn>;
  readonly frameStages: Effect.Effect<
    ReadonlyArray<StageRegistration>,
    never,
    RRegister
  >;
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

**この別名を広げるのは stage の _提供者_（ランタイムを組む人）にとって破壊的変更である**（stage の _著者_ にとってはそうではない）。
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
type EncodedChunk = ReadonlyByteArray & Brand.Brand<'EncodedChunk'>

const ChunkHeight(value: number): ChunkHeight             // 範囲外なら RangeError
const EncodedChunk(encoded: Uint8Array | EncodedChunk): EncodedChunk // ヘッダー・寸法・長さを検証し、入力を所有する constructor
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
末尾の余剰データを破損として拒否する。`EncodedChunk` は書き込み API を公開しない read-only branded byte view で、
`encodeChunk` の戻り値と `decodeChunk` への入力の両方に使われる。constructor は検証済みの入力をコピーするため、
入力側の `Uint8Array` を後から変更しても `EncodedChunk` の内容は変わらない。可変なコピーが必要なら `slice()` を使う。

### `after` が存在しない stage を指したとき

スパイクの判断: **何も強制せず、両方を報告する。**
ダングリングエッジは「input があるなら input の後」を表明する正規の手段なので、拒否するとその語法が消える。
一方で、落ちたエッジも、フレーム骨格が知らない stage も、失敗地点では誤字と区別がつかない。
そこで `mc-compose` の `StageOrderPlan` が `dangling` と `unmatchedPhase` の両方を運び、ホストがそれを表示する。

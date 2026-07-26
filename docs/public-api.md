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
type ChunkCoord    = { readonly cx: ChunkAxis; readonly cz: ChunkAxis }
type LocalBlockCoord = { readonly lx: LocalAxis; readonly y: BlockAxis; readonly lz: LocalAxis }
type AABB          = { readonly min: Position; readonly max: Position }

const position / blockPosition / chunkCoord
const blockPositionOfPosition / chunkCoordOfBlock / localCoordOfBlock / blockPositionOfChunkLocal
const aabb / aabbOfBlock / aabbIntersects / aabbContainsPoint
```

**なぜ kernel か**: 座標変換は `mc-worldgen`（生成）・`mc-meshing`（メッシュ）・`mc-physics`（衝突）・`mc-sim`（エンティティ）・`mc-render`（描画）が
全員必要とする。どれか 1 つに置けば残り 4 つがそこに依存し、階層構造が崩壊する。

**`Position` と `BlockPosition` を型で区別している理由**は plan.md §3.4 の実測知見に直結する。

> 「物が浮く」バグ類は例外なく**足元原点 vs AABB 中心の Y 規約不一致**が原因。座標規約を型で区別する

連続座標と格子座標を同じ `{x,y,z}` にしていると、この不一致は型検査を通り抜けて実行時に「浮く」として現れる。

## 3. ブロック語彙（block-type）

```typescript
const BLOCK_TYPES = ['air', 'stone', ..., 'snow'] as const
type BlockType = (typeof BLOCK_TYPES)[number]
const isBlockType = (value: string): value is BlockType
```

**現状は暫定で 18 種。** 参照実装は監査 §2 の実測で **120 リテラル**（`packages/core/domain/block-type.ts:3-132`）。
plan.md の「約 119」は同じ数の概数。

現在の subset は「監査 §4.9 が『非固体は 5 つの独立概念だ』を証明するのに使ったブロック（`glass` / `oak_leaves` / `snow`）を含むこと」を基準に選んである。

**語彙を 120 まで埋めるのは加算的な作業である。** 挙動は名前ではなく能力から読むので、リテラルが増えても消費側のコードは変わらない。
これが plan.md §3.1 の要求「ブロック追加 = 定義テーブル 1 行 + フラグ設定」の意味である。

**なぜ kernel か**: `BlockType` は網羅性チェックのための語彙であり、セーブフォーマット（`mc-save`）・
メッシュ（`mc-meshing`）・物理（`mc-physics`）・ルール（`mx-gameplay`）が同じ集合を指す必要がある。
plan.md §5.3 は「core と block の分離」を「ブロック追加が必ず両方を共変更する」という理由で棄却しており、
語彙と能力モデルが同じリポジトリにあることは意図的である。

## 3-bis. アイテム語彙とブロック↔アイテムの橋（item-type / block-item）

```typescript
const ITEM_TYPES = ['stone', 'cobblestone', ..., 'wooden_pickaxe'] as const
type ItemType = (typeof ITEM_TYPES)[number]
const isItemType = (value: string): value is ItemType

type PlaceableItemType = ItemType & BlockType          // 監査 §6-8 の交差を型で解く
const PLACEABLE_ITEM_TYPES / NON_PLACEABLE_ITEM_TYPES / UNITEMISED_BLOCK_TYPES
const isPlaceableItem(item: ItemType): item is PlaceableItemType
const itemOfBlock(block: BlockType): PlaceableItemType | undefined   // 部分関数
const blockOfPlaceableItem(item: PlaceableItemType): BlockType       // 全域、ただし交差の上でだけ
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
| `ItemType` → `BlockType` | `stick` / `glowstone_dust` / `wooden_pickaxe` |
| `BlockType` → `ItemType` | `air` / `water` / `lava` / `bedrock` / `snow` |

`air` が入らないのは監査 §6-6（「`AIR` は『ブロックが無い』ことを表す番兵であり能力ではない」）の帰結である。
2 つの union は**交差**するのであって入れ子ではない。
`test/item-drops.test.ts` が `Exclude` で両方向をピン留めしている
（`test/clock-and-frame.test.ts` の `FrameServices` と同じ手法）。片方の roster がもう片方を
飲み込んだ瞬間に区別が飾りになるので、等式としてではなく**両方が空でないこと**として固定してある。

**交差そのものが有用な型である。** 監査 §6-8 は参照実装の手書きリスト `BLOCK_ITEMS`
（`first-person-held-item.ts:58-76`、監査時点で KELP / SEAGRASS / AMETHYST_* / RAIL が既に漏れていた）を見て
「これは `ItemType ∩ BlockType` の導出であり、フラグではなく型レベルで解決すべき」と結論している。
`PLACEABLE_ITEM_TYPES` は 2 つの roster から**計算**されるので、第 3 の名簿が存在せず、陳腐化しようがない。

**橋は名前一致で、例外は `drops` に置く。** ブロックのアイテム形はブロックと同じ名前を持つ
（`dirt` ブロック → `dirt` アイテム）。同名でないブロックは自分の行でそう言う
（`stone` → `cobblestone`、`grass_block` → `dirt`、`glowstone` → `glowstone_dust`）。
つまりブロック個別の例外は、他のブロック個別の例外が既にいる場所（レジストリの行）にいる。
第 2 の block→item 対応表は作らない。

**`ITEM_TYPES` は 16 個。**「自分自身を落とす / 別のものを落とす / 何も落とさない / 道具で門番される」の
4 形すべてに実データを与えるのに必要な最小限であり、埋めるのは `BLOCK_TYPES` と同じく加算的である。
綴りは `BLOCK_TYPES` に合わせた `lower_snake_case`。**mc-sim の暫定文字列は `UPPER_SNAKE`**
（`'OAK_PLANKS'` / `'STICK'`）なので、repoint は型の付け替えであると同時に**大小文字の付け替え**でもある。

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

実装済み 11 フラグ:

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

実装済み 13 プロパティ:

| プロパティ | 型 | 既定 | 根拠 |
| --- | --- | --- | --- |
| `opacity` | `'transparentSolid' \| 'fluid' \| 'opaque'` | `'opaque'` | 監査 §4.4 |
| `lightEmission` | `number` (0..15) | `0` | 監査 §4.4 `light.ts:24-46` |
| `fluid` | `'none' \| 'water' \| 'lava'` | `'none'` | 監査 §4.2 |
| `collisionShape` | `'full'\|'slab'\|'cactus'\|'pressurePlate'\|'none'` | `'full'` | 監査 §4.1 |
| `renderKind` | `'cube'\|'cross'\|'cactus'\|'rail'\|'lilyPad'\|'fluid'` | `'cube'` | 監査 §4.8 |
| `hardness` | `number` | `8` | 監査 §4.5 `blocks.config.terrain.ts:9-14` |
| `friction` | `number` | `0.6` | 監査 §4.5 `DEFAULT_BLOCK_FRICTION` |
| `contactDamage` | `number` | `0` | 監査 §4.7（LAVA=4 / CACTUS=1） |
| `movementDrag` | `number` | `0` | 監査 §4.1 `:203-208` |
| `xpOnBreak` | `number` | `0` | 監査 §4.5 `blocks.config.ores.ts:8-45` |
| `railKind` | `'none'\|'normal'\|'powered'` | `'none'` | 監査 §4.1 `:184-201` |
| `harvestTool` | `HarvestToolRequirement` | `{category:'none', minTier:'none'}` | 監査 §4.5 |
| `drops` | `BlockDropRule` | `{item:'self', count:1, ...}` | 監査 §4.5 |

補助 API: `BLOCK_OPACITIES` / `FLUID_KINDS` / `COLLISION_SHAPES` / `RENDER_KINDS` / `RAIL_KINDS` /
`LIGHT_LEVEL_MIN` / `LIGHT_LEVEL_MAX` / `isLightLevel` / `clampLightLevel`。

### 4-3. struct 2 種を隔離した理由 — `domain/block-harvest.ts`

```typescript
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
const PENDING_CAPABILITIES: ReadonlyArray<{ name, kind, why }> // 未実装 4 件と理由
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

### 4-5. 未実装 4 件（`PENDING_CAPABILITIES`）

| 能力 | 種別 | 保留理由 |
| --- | --- | --- |
| `supportRule` | property | 値が「直下に許される block のリスト」であり、block roster が無いと既定値を決められない（監査 §4.6） |
| `footstepMaterial` | property | 純粋に音響分類。`mc-audio` のキュー語彙と同時に入れる（監査 §4.8） |
| `tillable` | flag | production 2 ヒットの農業専用（監査 §4.8） |
| `textureTiles` | property | 監査 §4.8 が「既定なし」と明記。実 block roster と同時にしか入れられない |

`test/block-definition.test.ts` が「実装済み 24 + 保留 4 = 監査の 28」を機械的に検査している。
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

壁時計の直接参照（`Date.now()` / `new Date()` / `performance.now()`）は
`scripts/check-dependency-whitelist.ts` が全リポジトリで禁止している。
Port を実装するアダプタだけは実クロックを読む必要があるため、その行に `mc-kernel-allow-time-source` を書くと除外される。

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

### `after` が存在しない stage を指したとき

スパイクの判断: **何も強制せず、両方を報告する。**
ダングリングエッジは「input があるなら input の後」を表明する正規の手段なので、拒否するとその語法が消える。
一方で、落ちたエッジも、フレーム骨格が知らない stage も、失敗地点では誤字と区別がつかない。
そこで `mc-compose` の `StageOrderPlan` が `dangling` と `unmatchedPhase` の両方を運び、ホストがそれを表示する。

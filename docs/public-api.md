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

**現状は暫定で 17 種。** 参照実装は監査 §2 の実測で **120 リテラル**（`packages/core/domain/block-type.ts:3-132`）。
plan.md の「約 119」は同じ数の概数。

現在の subset は「監査 §4.9 が『非固体は 5 つの独立概念だ』を証明するのに使ったブロック（`glass` / `oak_leaves` / `snow`）を含むこと」を基準に選んである。

**語彙を 120 まで埋めるのは加算的な作業である。** 挙動は名前ではなく能力から読むので、リテラルが増えても消費側のコードは変わらない。
これが plan.md §3.1 の要求「ブロック追加 = 定義テーブル 1 行 + フラグ設定」の意味である。

**なぜ kernel か**: `BlockType` は網羅性チェックのための語彙であり、セーブフォーマット（`mc-save`）・
メッシュ（`mc-meshing`）・物理（`mc-physics`）・ルール（`mx-gameplay`）が同じ集合を指す必要がある。
plan.md §5.3 は「core と block の分離」を「ブロック追加が必ず両方を共変更する」という理由で棄却しており、
語彙と能力モデルが同じリポジトリにあることは意図的である。

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
type BlockDropRule = { readonly item: BlockType | 'self'; readonly count: number
                       readonly requiresSilkTouch: boolean; readonly affectedByFortune: boolean }

const DEFAULT_HARVEST_TOOL / DEFAULT_BLOCK_DROP
const satisfiesHarvestTier(requirement, heldTier): boolean
const resolveDropItem(rule, brokenBlock): BlockType
```

監査 §7 の指示に従い**別ファイルに切り出してある**。

> `drops` / `harvestTool` は struct のため最も揺れやすい。`BlockDefinition` にも API ロックを適用し、
> この 2 フィールドを別ファイルに切り出して差分レビューを容易にすること

`category`（速度ボーナス）と `minTier`（ドロップ可否）は**別軸**である。参照実装ではこの 2 つが無関係な場所に散っており
（`harvestable-blocks.ts` と `block-utils.ts`）、`satisfiesHarvestTier` が category を一切見ないのはそのためである。
間違った道具は遅いだけでドロップはする。

`item: 'self'` は「自分自身のアイテム」を表す番兵。既定値は自分が何のブロックかを知り得ないため、
リテラルではなく番兵でなければならない。

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
type FrameServices = ClockPort   // ← PLACEHOLDER

interface StageRegistration {
  readonly id: StageId
  readonly after?: ReadonlyArray<StageId>
  readonly run: (dt: DeltaTimeSecs) => Effect.Effect<void, never, FrameServices>
}

interface GameModule<ROut, E, RIn> {
  readonly layers: Layer.Layer<ROut, E, RIn>
  readonly frameStages: ReadonlyArray<StageRegistration>
}
```

plan.md §4.1 から**逐語的に**転記してある（`type` ではなく `interface` である点も含む）。
このリポジトリの lint 設定は `type` を推奨しているが、契約は仕様と文字単位で一致しているほうが価値が高いので例外扱いにしてある。

**なぜ kernel か**: `mc-compose` が全モジュールを束ねるためには、各モジュールが同じ契約型を実装している必要がある。
契約型を `mc-compose` に置くと全モジュールが `mc-compose` に依存し、依存グラフが完全に反転する。

エラーチャネルが `run` ではなく Layer 側にあるのは、「physics がフレーム 12048 で失敗した」に対するフレームレベルの回復策が存在しないから。
実行時に失敗しうる stage は自分で握るか defect にする。

### `FrameServices` はプレースホルダである

**現在 `ClockPort` の別名にすぎない。中身は未決。**
縦切りスパイク（kernel → physics → worldgen → sim → render → gameplay を 1 本通す使い捨て実装）で決める。
詳細は [freeze-checklist.md](./freeze-checklist.md)。

`never` ではなく `ClockPort` から始めている理由: 「全 stage が必ず必要とするサービス」として時計だけは既に分かっており、
`never` から始めると今日は型が通るが最初の実サービス追加で全 stage のシグネチャが壊れる。
既知の最小から始めれば、広げる回数を「予見できなかった 1 回」に減らせる。

**この別名を広げるのは stage の *提供者*（ランタイムを組む人）にとって破壊的変更である**（stage の *著者* にとってはそうではない）。
スパイクで 1 度だけ広げ、そこで凍結する。

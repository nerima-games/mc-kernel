# 責務と非スコープ

出典: plan.md §3.1。

## 1. 責務

> 全リポジトリが共有する語彙。ブランデッド型・数学・ブロック/アイテム定義・Chunk データ構造・共有 Port

具体的には以下を所有する。

| 領域 | 内容 |
| --- | --- |
| 識別子 | `WorldId` / `StageId` などのブランデッド型 |
| 数量 | `StackCount` / `DeltaTimeSecs` / `MonotonicTimeSecs` / `EpochMillis` |
| 座標系 | `Position`（連続）/ `BlockPosition`（格子）/ `ChunkCoord` / `LocalBlockCoord`、およびそれらの変換 |
| 幾何 | `AABB` と交差判定 |
| ブロック語彙 | `BlockType` リテラル型と網羅性チェック |
| ブロック能力モデル | 能力フラグ表（boolean）+ プロパティ表（型付き値）+ `BlockDefinition` |
| 横断 Port | `ClockPort` |
| 横断スナップショット | `CameraPoseSnapshot` |
| モジュール契約 | `GameModule` / `StageRegistration` / `FrameServices` |

## 2. 内部構成

**`domain/` のみ。型・純粋関数・データテーブルだけを置く。**

現在の構成:

```
index.ts                      # 公開バレル。他 15 リポジトリはここを import する
domain/
  identifiers.ts              # WorldId / StageId
  quantities.ts               # StackCount / DeltaTimeSecs / MonotonicTimeSecs / EpochMillis
  coordinates.ts              # Position / BlockPosition / ChunkCoord / LocalBlockCoord / AABB
  block-type.ts               # BlockType 語彙
  block-capabilities.ts       # boolean 能力フラグ表
  block-properties.ts         # 型付きプロパティ表
  block-harvest.ts            # harvestTool / drops（struct 2 種を隔離）
  block-definition.ts         # BlockDefinition と解決関数、実装/保留の台帳
  camera.ts                   # CameraPoseSnapshot
  clock.ts                    # ClockPort
  frame.ts                    # GameModule / StageRegistration / FrameServices
scripts/
  check-dependency-whitelist.ts   # 16 リポジトリ共通の境界ゲート（テンプレート）
```

## 3. 非スコープ（明示）

kernel に**置いてはならない**もの。ここを守らないと「共有語彙」が「共有モノリス」に変わる。

### 3-1. サービス実装を持たない

`domain/` しか無いのは省略ではなく制約である。
`InventoryService`（`mc-sim`）/ `ChunkStore`（`mc-worldgen`）/ `WorldRenderer`（`mc-render`）のような**状態を持つサービス**は基盤層の資産であり、
kernel に置くと全リポジトリがそのサービスの都合に巻き込まれる。

kernel が持ってよい「サービスらしきもの」は **Port（インターフェース）だけ**である。
`ClockPort` は Context.Tag と型と、テスト用の固定実装（`fixedClock` / `FixedClockLayer`）を持つが、
実クロックを読むアダプタは持たない。実装は利用側が注入する。

### 3-2. ~~ブロックテーブルを持たない~~ → **持つことになった**（`domain/block-registry.ts`）

この節はもともとこう書かれていた:

> **どのブロックが存在し、どの能力を持つかは kernel の管轄外。** kernel が持つのは
> 「ブロックとはどういう属性の集合か」という**仕組み**と、`BlockType` という**語彙**だけである。
>
> 理由は 2 つ。
>
> 1. どのブロックがどう振る舞うかは**コンテンツ**であり、そのコンテンツを所有するリポジトリが持つべきもの。
>    kernel が推測でテーブルを置くと、下流の各テーブルが「推測のフォーク」になる。
> 2. `docs/capability-flag-audit.md` はまさにその答えを出すための調査であり、
>    先に当て推量の表を置くと監査がそれに引きずられる。

理由 2 は満たされた（監査は完了している。[freeze-checklist.md](./freeze-checklist.md) (a)）。
理由 1 は**消費者が現れた時点で成立しなくなった。**

チャンクバッファの 1 バイトから能力を引きたいリポジトリは 3 つあり、
依存グラフ上で互いに届かない:

| リポジトリ | 何を引くか | 依存 |
| --- | --- | --- |
| `mc-meshing` | 数値 id ごとの `opacity`（`transparentBlockIds`、plan.md §3.3） | kernel のみ |
| `mc-physics` | 数値 id ごとの `passable` / `collisionShape`（plan.md §3.4 は id 名指しを禁じている） | kernel のみ |
| `mx-gameplay` | 数値 id ごとの `fallsWhenUnsupported`（plan.md §3.11） | sim / worldgen / audio |

plan.md §2.3-5 により**依存は推移しない**ので、「下流のどこか」は選択肢ではない。
3 者から見えるリポジトリは mc-kernel しかなく、他に置けば表は 3 つになる。
表が 3 つあるのは、plan.md §3.1 が参照実装の失敗として記録している
「挙動判定が 51 ファイル 229 箇所に散った」状態そのものである。

**理由 1 の懸念（推測のフォーク）は、場所ではなく仕組みが答えている。**
表の各行は「普通の不透明立方体との差分」しか書けないので
（`domain/block-definition.ts`）、間違った行は 1 行の間違いであってフォークではない。

もう半分の議論は独立に成立し、それだけで十分でもある。plan.md §3.1 は kernel に
「`Chunk` データ構造と**コーデック**」を与えている。数値 id は
`BlockType` が `Uint8Array` の中でどう綴られるかそのものであり、
**両端が別リポジトリにあるコーデックはコーデックではない。**

#### id は永久である

セーブファイルは id を保存するので、id はワイヤフォーマットであって配列添字ではない。
`BLOCK_REGISTRY` は全 id を**リテラルで**書き、`test/block-registry.test.ts` が
1 つずつピン留めしている。id 0-10 は mc-worldgen / mc-meshing が既に出荷している番号
（`BLOCK.SAND === 5`）を kernel が**採用した**ものである。逆にしなかったのは、
あちらの golden fixture がその番号で生成済みだからである。

#### 依然として持たないもの

`drops` / `harvestTool` の実データ、`textureTiles`、`supportRule`。
どれもアイテム名簿かテクスチャアトラスと同時に決まるもので、
`PENDING_CAPABILITIES`（`domain/block-definition.ts`）に理由つきで記録されている。

### 3-3. stage 全順序表を持たない

`StageId` / `StageRegistration` という型は kernel に置くが、**標準 stage 順序表は `mc-compose` の資産**（plan.md §2.3-3）。
kernel に置けば順序変更のたびに全リポジトリが bump される。

### 3-4. 「1 ブロック固有のルール」を持たない

監査 §6 が「フラグに還元できない残余」として 10 項目挙げている。これらは kernel に置かない。

| 残余 | 置き場所 | 理由 |
| --- | --- | --- |
| 右クリック UI ルーティング（CRAFTING_TABLE→作業台画面 等） | `mx-ui` | `interactable: boolean` に潰すと画面選択の情報が消える |
| ドア状態遷移（`DOOR ⇄ DOOR_OPEN`） | `mx-gameplay` | ペア関係でありフラグではない |
| 流体接触の生成規則（lava + water → OBSIDIAN / COBBLESTONE） | `mx-gameplay` | **2 セルの組み合わせ結果**であり単一ブロックの属性に落ちない |
| ポータル枠の幾何検証 | `mc-worldgen` | 構造パターン照合 |
| 道具 × ブロックの個別作用（エンダーアイ・火打石） | `mx-gameplay` | アイテム側のルール |
| レッドストーン部品の後片付け集合 | `mx-redstone` | 当該モジュールのコンポーネント名簿 |
| 作物のドロップ規則（熟度分岐 + 乱数） | `mx-gameplay` | `drops` では表現できない |

将来これらが能力フラグへ流れ込まないよう、監査 §7 は「フラグではない拡張点」として
`interactionId?: string` と `stateVariants?: { open?, lit?, filled? }` を明示的に分離しておくことを推奨している。
**未実装**（`domain/block-definition.ts` には無い）。導入する際は能力フラグ表ではなく `BlockDefinition` の独立フィールドとして足すこと。

### 3-5. 参照実装から**移植しない**と決めたもの

`BlockPropertiesSchema` の `properties.solid` と `faces` は移植しない。
監査 §7 が production での参照を実測し、**ヒット 0** を確認している（`rg '\.solid\b'` / `rg '\.faces\b'`）。
誰も読まないフィールドを凍結対象 API に入れるのは、凍結を最も安く間違える方法である。

`test/block-definition.test.ts` がこの 2 つの不在を固定している。

### 3-6. `AIR` を能力で表現しない

監査 §6-6: `AIR` は「ブロックが無い」ことを表す番兵であり能力ではない。参照実装では 71 箇所で同一性比較されており、
うち 24 箇所は AO 計算のホットパス（`greedy-meshing-ao.ts:20-85`）。
kernel は `isEmpty(blockId)` を **index 0 の定数比較**として公開すべきで、フラグ表を引かせてはならない。
**未実装**（現在の kernel は blockId の index 表現をまだ持たない）。

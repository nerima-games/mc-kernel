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
| アイテム語彙 | `ItemType` リテラル型と網羅性チェック |
| ブロック↔アイテム橋渡し | `PlaceableItemType`（`ItemType ∩ BlockType` + 名前付き設置例外、監査 §6-8）と `drops` の解決 |
| ブロック能力モデル | 能力フラグ表（boolean）+ プロパティ表（型付き値）+ `BlockDefinition` |
| 掘削ルールと採掘時間 | 公式 `minecraft:tool` の順序付きルール解決、ブロック硬度と道具速度から tick 数を求める純粋関数（操作状態・権威判定は上位） |
| 横断 Port | `ClockPort` |
| 横断スナップショット | `CameraPoseSnapshot` |
| Anvil 変換 | 決定的な変換計画・適用、および versioned state snapshot codec |
| モジュール契約 | `GameModule` / `StageRegistration` / `FrameServices` |

## 2. 内部構成

**`domain/` のみ。型・純粋関数・データテーブルだけを置く。** ファイル分割の方針（data と logic を分ける、
struct は別ファイルに隔離する、公開境界と派生インデックスを分ける）は
[architecture.md](./architecture.md) §6 が正で、ここはその結果としての一覧を保守する。
現在のファイル数は `find src/domain -name '*.ts' | wc -l` で確認できる（この一覧の行数と一致するはず）。

```
index.ts                      # 公開バレル。他 15 リポジトリはここを import する
domain/
  identifiers.ts              # WorldId / StageId
  quantities.ts               # StackCount / DeltaTimeSecs / MonotonicTimeSecs / EpochMillis

  # 座標系: primitive・key・変換・幾何・近傍を責務ごとに分離（architecture.md §6）
  coordinates.ts               # 公開語彙（Position / BlockPosition / ChunkCoord / LocalBlockCoord / AABB）
  coordinate-primitives.ts     # CHUNK_SIZE_XZ 等の定数とブランド型
  coordinate-keys.ts           # BlockPositionKey / ChunkKey の正準文字列キー化
  coordinate-conversions.ts    # チャンクローカル座標などの変換
  coordinate-geometry.ts       # AABB と交差判定
  coordinate-neighbours.ts     # 隣接ブロックの走査順

  # ブロック/アイテム語彙: データと型・guard を分離（architecture.md §6）
  block-type-data.ts           # BLOCK_TYPES の閉じたデータテーブル
  block-type.ts                # BlockType 型と外部入力用 runtime guard
  item-type-data.ts            # ITEM_TYPES の閉じたデータテーブル
  item-type.ts                 # ItemType 型と外部入力用 runtime guard
  block-item.ts                # ブロック↔アイテムの橋（交差を導出し、設置名の例外を明示）
  item-registry.ts             # ItemId の数値 wire ID とスタック上限
  block-break-speed-data.ts    # 公式の道具倍率テーブル
  block-break-speed.ts         # 硬度 lookup と採掘時間計算
  tool-component.ts            # minecraft:tool の順序付き rule 解決

  # ブロック能力モデル
  block-capabilities.ts        # boolean 能力フラグ表
  block-properties.ts          # 型付きプロパティ表
  block-support.ts             # supportRule の値と判定（監査 §4.6）
  block-harvest.ts             # harvestTool / drops（struct 2 種を隔離）+ ドロップ解決
  block-definition.ts          # BlockDefinition と解決関数、実装/下流境界の台帳

  # ブロックレジストリ: 宣言的データと派生インデックスを分離（architecture.md §6）
  block-registry.ts            # 公開境界。数値 id ↔ BlockType と accessor
  block-registry-types.ts      # BlockId 型と AIR_BLOCK_ID
  block-registry-entries.ts    # 宣言的なブロックレジストリの組み立て
  block-registry-entries-foundation.ts            # 基礎ブロック
  block-registry-entries-passable.ts              # passable な非 full 衝突形状のブロック群
  block-registry-entries-collision-shapes.ts      # その他の非 full 衝突形状のブロック群
  block-registry-entries-terrain.ts               # 地形ブロック
  block-registry-entries-ores-and-blocks.ts       # 鉱石・基本ブロック
  block-registry-entries-crops-and-redstone.ts    # 作物・レッドストーン
  block-registry-entries-end.ts                   # エンド・特殊ブロック
  block-registry-entries-structures-and-nether.ts # 構造物・ネザー
  block-registry-rules.ts      # レジストリ行が共有する既定値
  block-registry-indexes.ts    # レジストリ行から導出する id-indexed lookup
  block-state.ts               # 登録済み BlockId のみを許す owned バッファ（BlockState）

  # Chunk データ構造とコーデック
  chunk.ts                     # Chunk / ChunkHeight / EncodedChunk と versioned codec

  # Anvil: validation・transformation・orchestration を分離（architecture.md §6）
  anvil.ts                     # Anvil の公開境界（計画・適用・snapshot codec）
  anvil-constants.ts           # 境界定数（ANVIL_TOO_EXPENSIVE_LEVEL 等）
  anvil-primitives.ts          # Anvil の branded primitive と境界定数
  anvil-normalization.ts       # エンチャントの正規化
  anvil-validation.ts          # 入力検証と拒否理由
  anvil-transformation.ts      # 修理・統合・repair cost の計算
  anvil-planning.ts            # 検証と計算を束ねた最終計画
  anvil-snapshot-codec.ts      # versioned snapshot の encode / decode

  camera.ts                    # CameraPoseSnapshot
  clock.ts                     # ClockPort
  frame.ts                     # GameModule / StageRegistration / FrameServices
scripts/
  verify-package.mjs              # pack 済み成果物の exports / install / runtime ゲート
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

### 3-2. ブロックテーブルを持つ（公開境界は `domain/block-registry.ts`）

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

#### ~~依然として持たないもの~~ → `drops` / `harvestTool` は**埋まった**

この節で残っている下流境界は `textureTiles` だけである。`drops` / `harvestTool` は
**アイテム名簿が来た**（`domain/item-type.ts`）ことで kernel に実装でき、
`BLOCK_REGISTRY` の各行が自分のドロップと道具要件を宣言している。

**なぜ別テーブルにしなかったか。** 監査 §3 は `drops` / `harvestTool` を
`opacity` / `hardness` と同じ 28 行の表に**能力として**並べている。能力表の外にある能力は能力ではない。
加えて監査 §7 の「定義テーブルは差分のみ記述する」が効いていて、既定が「自分自身 1 個」である以上
大半の行は drops について何も書かない —— `BlockType` をキーにした別表はその性質を持てず、
「退屈な答え」を書くためだけに全ブロック分の行が要る。
そして監査 §4.9 の一般形（同じ集合が 5 箇所で別メンバーシップになる）がそのまま当てはまる。
何より、別表にすると plan.md §3.1 の「ブロック追加 = 定義テーブル 1 行」が
**2 ファイル 2 行**になる。不変条件が壊れる。

**`supportRule` も埋まった** —— 参照実装の 120 リテラルに対応し、kernel 独自の 3 行を加えた
123 行の block roster が揃ったことで書けるようになり、`domain/block-support.ts` として入った。
`canBlockStaySupported(id, below)` が
その消費口で、mx-gameplay がフォールバックで代用していた per-block 規則をこれで置き換えた。

`textureTiles` は kernel が担当する未定義 property ではなく renderer 所有の境界である。renderer の
`block-texture-map` はアトラスのレイアウト、面ごとの tile 割当、画像 asset をまとめて扱い、
kernel の数値 id ではなく renderer の名前 lookup を入口にする。kernel の registry 順序と
renderer の map 順序は同一ではなく、renderer 固有の asset 集合もあるため、kernel に storage-index
の数値列を追加すると第二の source of truth になる。この判断と所有者は
`DOWNSTREAM_CAPABILITIES`（`domain/block-definition.ts`）に記録している。

**`drops` が表現しないと決めたもの**（いずれも監査が置き場所を決めている）:

| 事象 | 置き場所 | 理由 |
| --- | --- | --- |
| 乱数ドロップ（gravel → flint 10%、oak_leaves → sapling） | `mx-gameplay` | 監査 §6-9。kernel は純粋で RNG を持たない |
| 幸運の倍率適用 | `mx-gameplay` | 同上。kernel は `affectedByFortune` を**運ぶ**だけ |
| シルクタッチの**置換**（stone → stone、鉱石 → 鉱石） | **実装済み** | `BlockDropRule.silkTouchItem?: ItemType` を `domain/block-harvest.ts` で解決し、stone / grass_block / 14 種の鉱石を registry に登録。`requiresSilkTouch` の gate と置換を分離している。 |

#### 3-2-1. シルクタッチ置換の実装記録

**これは設計上の未決ではない。** 直し方は決まっており、`domain/block-harvest.ts` の
`resolveDrop` のヘッダに書いてある通り**加算的**である:

```
readonly silkTouchItem?: ItemType   // BlockDropRule に 1 メンバ
```

そして同ファイルの変更規則（「新メンバは optional であるか、`BLOCK_PROPERTY_DEFAULTS` に
既定値を持つこと」）を**満たしている**。14 の固定済み消費者のどれも壊さない。

**以下は旧 API ロック運用の歴史的記録である。**
実装当時は公開面の凍結クロックも更新対象になり、
[versioning.md](./versioning.md) の 4 週間ロックの起点を `git log -1 -- api-lock.md` で管理していた。
`BlockDropRule` は当時の `api-lock.md` に型本体が丸ごと転記されていた（141 エントリ中の 1 つ）:

```ts
type BlockDropRule = {
    readonly item: ItemType | 'self';
    readonly count: number;
    readonly requiresSilkTouch: boolean;
    readonly silkTouchItem?: ItemType;
    readonly affectedByFortune: boolean;
};
```

optional メンバを追加したため、この公開型と下流のテストを同時に更新した。既存の item ID は変更せず、新規鉱石 item は名簿末尾に追加している。

現在の消費者は `resolveDrop` の `silkTouch` コンテキストを渡し、通常ドロップと置換ドロップを同じ純粋関数で解決する。通常の gate（glass など）は従来どおり `requiresSilkTouch` で制御される。

### 3-3. stage 全順序表を持たない

`StageId` / `StageRegistration` という型は kernel に置くが、**標準 stage 順序表は `mc-compose` の資産**（plan.md §2.3-3）。
kernel に置けば順序変更のたびに全リポジトリが bump される。

### 3-4. 「1 ブロック固有のルール」を持たない

監査 §6 が「フラグに還元できない残余」として 10 項目挙げている。これらは kernel に置かない。

ただし、公式 `minecraft:tool` のデータ形を既知の `BlockType` 配列へ正規化した後の順序付き rule 解決と、ブロック硬度・道具速度から tick 数を求める副作用のない計算は例外である。複数 consumer が同じ式を必要とする共有ドメインロジックとして `tool-component.ts` と `block-break-speed.ts` に置く。タグ文字列の展開、プレイヤー操作の進行状態、耐久の消費適用、ドロップ生成、サーバー権威判定は上位が所有する。

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
kernel の能力フラグとしては定義しない（`domain/block-definition.ts` にも置かない）。導入する際は
能力フラグ表ではなく `BlockDefinition` の独立フィールドとして足すこと。

### 3-5. 参照実装から**移植しない**と決めたもの

`BlockPropertiesSchema` の `properties.solid` と `faces` は移植しない。
監査 §7 が production での参照を実測し、**ヒット 0** を確認している（`rg '\.solid\b'` / `rg '\.faces\b'`）。
誰も読まないフィールドを凍結対象 API に入れるのは、凍結を最も安く間違える方法である。

`test/block-definition.test.ts` がこの 2 つの不在を固定している。

### 3-6. `AIR` を能力で表現しない

`AIR` は「ブロックが無い」ことを表す番兵であり、能力フラグではない。`BlockId` は
`Uint8Array` の添字として使える安定した密な数値 ID なので、kernel は
`isEmpty(blockId)` を **id 0 の直接比較**として公開する。

`isEmpty` の引数は `number` とする。下流はチャンクバッファから読み出した未ブランドの byte を
そのまま渡せる必要があり、0 以外（範囲外・小数・`NaN` を含む）は空気ではない。
この predicate はレジストリ lookup や能力表を引かず、公開された `AIR_BLOCK_ID` と同じ契約を共有する。
`BlockIndex` 型や公開 mutable 配列を別に増やすものではない。

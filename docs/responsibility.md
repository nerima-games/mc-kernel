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
| ブロック↔アイテム橋渡し | `PlaceableItemType`（= `ItemType ∩ BlockType`、監査 §6-8）と `drops` の解決 |
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
  item-type.ts                # ItemType 語彙（block-type.ts と同形）
  block-item.ts               # ブロック↔アイテムの橋（監査 §6-8 の交差を導出で解く）
  block-capabilities.ts       # boolean 能力フラグ表
  block-properties.ts         # 型付きプロパティ表
  block-harvest.ts            # harvestTool / drops（struct 2 種を隔離）+ ドロップ解決
  block-definition.ts         # BlockDefinition と解決関数、実装/保留の台帳
  block-registry.ts           # 数値 id ↔ BlockType、ブロック表、id キーの引き
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

#### ~~依然として持たないもの~~ → `drops` / `harvestTool` は**埋まった**

この節はもともとこう書かれていた:

> `drops` / `harvestTool` の実データ、`textureTiles`、`supportRule`。
> どれもアイテム名簿かテクスチャアトラスと同時に決まるもので、
> `PENDING_CAPABILITIES`（`domain/block-definition.ts`）に理由つきで記録されている。

**アイテム名簿が来た**（`domain/item-type.ts`）ので、前半 2 つの保留理由は消えた。
`BLOCK_REGISTRY` の各行が自分のドロップと道具要件を宣言している。

**なぜ別テーブルにしなかったか。** 監査 §3 は `drops` / `harvestTool` を
`opacity` / `hardness` と同じ 28 行の表に**能力として**並べている。能力表の外にある能力は能力ではない。
加えて監査 §7 の「定義テーブルは差分のみ記述する」が効いていて、既定が「自分自身 1 個」である以上
大半の行は drops について何も書かない —— `BlockType` をキーにした別表はその性質を持てず、
「退屈な答え」を書くためだけに全ブロック分の行が要る。
そして監査 §4.9 の一般形（同じ集合が 5 箇所で別メンバーシップになる）がそのまま当てはまる。
何より、別表にすると plan.md §3.1 の「ブロック追加 = 定義テーブル 1 行」が
**2 ファイル 2 行**になる。不変条件が壊れる。

**`supportRule` も埋まった** —— block roster の完成が条件だったので、120 リテラルが揃った時点で
書けるようになり、`domain/block-support.ts` として入った。`canBlockStaySupported(id, below)` が
その消費口で、mx-gameplay がフォールバックで代用していた per-block 規則をこれで置き換えた。

`textureTiles` は保留のまま（`PENDING_CAPABILITIES`）。テクスチャアトラスの完成が条件で、
アイテム名簿でも block roster でも解けない —— 残っているのは監査 §4.8 の「二重管理」という形の問題である。

**`drops` が表現しないと決めたもの**（いずれも監査が置き場所を決めている）:

| 事象 | 置き場所 | 理由 |
| --- | --- | --- |
| 乱数ドロップ（gravel → flint 10%、oak_leaves → sapling） | `mx-gameplay` | 監査 §6-9。kernel は純粋で RNG を持たない |
| 幸運の倍率適用 | `mx-gameplay` | 同上。kernel は `affectedByFortune` を**運ぶ**だけ |
| シルクタッチの**置換**（stone → stone） | **未実装（保留。決定待ち）** | 現状の `requiresSilkTouch` は gate であって substitution ではない。加算的な直し方（`silkTouchItem?: ItemType`）を `domain/block-harvest.ts` に記録済み。**保留の理由は設計ではなく凍結クロックである** — §3-2-1 |

#### 3-2-1. シルクタッチ置換が「保留」である理由（2026-07-28 実測）

**これは設計上の未決ではない。** 直し方は決まっており、`domain/block-harvest.ts` の
`resolveDrop` のヘッダに書いてある通り**加算的**である:

```
readonly silkTouchItem?: ItemType   // BlockDropRule に 1 メンバ
```

そして同ファイルの変更規則（「新メンバは optional であるか、`BLOCK_PROPERTY_DEFAULTS` に
既定値を持つこと」）を**満たしている**。14 の固定済み消費者のどれも壊さない。

**保留しているのは公開面の凍結クロックのほうである。**
[versioning.md](./versioning.md) の 4 週間ロックの起点は `git log -1 -- api-lock.md` であり、
`BlockDropRule` はその `api-lock.md` に**型本体が丸ごと転記されている**（現在 141 エントリ中の 1 つ）:

```ts
type BlockDropRule = {
    readonly item: ItemType | 'self';
    readonly count: number;
    readonly requiresSilkTouch: boolean;
    readonly affectedByFortune: boolean;
};
```

optional メンバを足せばこのブロックが変わり、**クロックが振り出しに戻る。**

**そのうえで、コストは今もっとも安い。** 2026-07-28 時点で `api-lock.md` が最後に動いたのは
**2026-07-27**、つまりクロックはまだ 1 日しか進んでいない。
振り出しに戻す費用は「28 日ぶんの進捗」ではなく**実際には 1 日**である。
逆に言えば、**入れるならクロックが進む前の今**であり、
20 日目に思い出すのが最も高くつく。

したがってこれは技術判断ではなく**タイミングの決定**であり、
本文書は決定できる立場に無い。決めるべき問いは 1 つ:

> `silkTouchItem` を入れて 4 週間を引き直すか、
> 最初の消費者（mx-gameplay の採掘ルール）が要求するまで待つか。

待つ側の根拠は `resolveDrop` のヘッダが既に述べている ——
「メンバは誰も読まないうちに入れるのが、凍結を最も安く間違える方法である」。
入れる側の根拠は上のクロック実測である。**両方を見た上で決めること。**

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
**未実装（保留。決定待ち）** —— 現在の kernel は blockId の index 表現をまだ持たない。

**保留の理由は §3-2-1 と同じ**（凍結クロック）だが、**規模が違う**ので分けて書く。
シルクタッチが `api-lock.md` の 1 エントリを書き換えるだけなのに対し、こちらは:

- `isEmpty` という**新しい export** が 1 つ増える
- index 表現そのもの（`BlockIndex` なり `blockIndexOf` なり）が**さらに増える**
- `BlockId` の現行表現（`Brand.Brand.Constructor<BlockId>`）との関係を決める必要があり、
  これは既存エントリの**書き換え**になりうる

つまり「optional メンバ 1 つ」ではなく**公開語彙の追加**であり、
4 週間の引き直しに加えて 14 リポジトリのミラー
（各所の `domain/kernel-vocabulary.ts`）に波及する。

**そして、これは性能のための表現である。** 監査 §6-6 の根拠は
参照実装での 71 箇所の同一性比較、うち 24 箇所が AO のホットパス
（`greedy-meshing-ao.ts:20-85`）というものだった。
**本リポジトリ群にはまだそのホットパスが無い** —— mc-meshing の AO は
`domain/ambient-occlusion.ts` にあるが、`isEmpty` が律速だという測定はどこにも無い。

したがって入れる順序は「先に表現、あとで測定」ではなく**その逆**である。
mc-meshing か mc-worldgen が「フラグ表引きが実際に効いている」と**測ってから**、
その測定を根拠に語彙を足すこと。測定なしに入れると、
`properties.solid` / `faces` を移植しなかった §3-5 の判断
（**誰も読まないフィールドを凍結対象 API に入れるのは、凍結を最も安く間違える方法**）を
自分で破ることになる。

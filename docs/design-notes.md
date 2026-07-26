# 設計ノート

## 1. 参照実装の失敗 — 名指し判定の散乱

plan.md §3.1 の設計注意:

> 参照実装では挙動判定が `blockTypeToIndex('SAND')` 式の名指しで **51 ファイル 229 箇所**に散らばり、
> エンジンとコンテンツの分離を不可能にした。

### 1-1. 実測しなおした結果

plan.md の 51/229 は再現できなかった。計数条件が書かれていないため、本リポジトリでは条件を明示して測り直している。

**実測（2026-07-26、対象 `takeokunn/ts-minecraft`）**

BlockType 名リテラルが**比較文脈**（`=== 'X'` / `!== 'X'` / `case 'X'`）に現れる箇所。
`'X'` は `packages/core/domain/block-type.ts` の 120 リテラルに実際に含まれるものだけを数える。テストは除外。

```console
$ cd <ts-minecraft>
$ rg -o "'[A-Z][A-Z_0-9]+'" packages/core/domain/block-type.ts | tr -d "'" | sort -u > /tmp/blocktypes.txt
$ wc -l /tmp/blocktypes.txt
120

$ ALT=$(paste -sd'|' /tmp/blocktypes.txt)
$ rg -n --no-heading \
    -g '!node_modules' -g '!*.test.ts' -g '!*.spec.ts' -g '!**/test/**' -g '!dist*' -g '!coverage' \
    -o "(===|!==)[[:space:]]*'($ALT)'|case[[:space:]]+'($ALT)'" packages src > /tmp/hits.txt
$ wc -l < /tmp/hits.txt          # 出現数
90
$ cut -d: -f1 /tmp/hits.txt | sort -u | wc -l   # ファイル数
38
```

**結果: 90 箇所 / 38 ファイル**（production のみ、テスト除外）。

`blockTypeToIndex('X')` 形式の名指し（Set 定義への列挙を含む）まで足すと **307 箇所 / 77 ファイル**まで増える。
`docs/capability-flag-audit.md` §2 は別の条件で **335 箇所 / 80 ファイル**（生出現）および **192 箇所 / 61 ファイル**（比較文脈、
ただしリテラルが実在の BlockType かは検証していない）と測っている。

**どれかが誤りというより、計数条件の定義の差である。** plan.md の 51/229 も同様に、
条件不明のまま引用するのではなく、数字を使うときは条件を書く。本リポジトリでは上記 **90/38** を採用する。

上位ファイル:

| 箇所数 | ファイル |
| --- | --- |
| 9 | `packages/app/application/frame/stages/interaction-bucket-handler/bucket-handler.ts` |
| 8 | `packages/world/application/block-service-break-helpers.ts` |
| 7 | `packages/app/application/frame/stages/interaction-right-click-target-routing.ts` |
| 5 | `packages/block/domain/chorus-plant.ts` |
| 5 | `packages/app/application/frame/stages/physics-stage-survival/environment.ts` |

### 1-2. なぜこれが致命的だったのか

数の多さそのものではない。**挙動がコンテンツの名前に紐づいていると、エンジンとコンテンツを分離できない**ことが問題である。

- ブロックを 1 つ足すたびに、38 ファイルのどれを触る必要があるか**を調べる作業**が発生する。
  調べ漏れは実行時にしか現れない（「新しいブロックだけ水流で壊れない」等）。
- 同じ概念が複数箇所で独立に列挙され、**メンバーシップがずれる**。監査 §4.9 が発見した「非固体」の 5 重定義がその実例で、
  GLASS は窒息せずスポーン面にもならないが衝突は固体、LEAVES はスポーン面にならないが衝突は固体
  （`block-collision-predicates.ts:18-21` に「LEAVES を passable に入れたら樹冠をすり抜けた」というバグ記録が残っている）。
- コンテンツ追加を「エンジンを知らない人」に開放できない。Modding 入口の前提が崩れる。

### 1-3. 新実装での対処

リテラル型を**語彙**（網羅性チェックのため）として維持しつつ、**挙動判定はすべて能力フラグ参照に統一**する。

- `BlockType` は名前の集合であって挙動の集合ではない。
- 挙動は `BlockCapabilities`（boolean）と `BlockProperties`（型付き値）から読む。
- **`BlockDefinition` には関数を置く場所がない。** コールバックを持てるフィールドが存在しないので、
  参照実装の失敗が正面から再入することは型で防がれている
  （`test/block-definition.test.ts` の「a definition carries no behaviour」）。

## 2. 不変条件: 「ブロック追加 = 定義テーブル 1 行 + フラグ設定」

plan.md §3.1 の締めの一文:

> ブロック追加 = 定義テーブル 1 行 + フラグ設定、で完結すること

これは願望ではなく**回帰テスト**として固定してある。

**テスト名**: `adding a block is one table row plus flag settings (plan.md §3.1 invariant)`
（`test/block-definition.test.ts`）

内容:

| ケース | 主張 |
| --- | --- |
| `a whole block is expressible as one literal and nothing else` | LAVA（流体・最大発光・通過可能・接触ダメージ・置換可能・火源・ドロップなし = 7 挙動）が 1 つのリテラルで表現でき、kernel のコードは 1 行も変わらない |
| `the minimal row is just a type, and it describes an ordinary opaque solid cube` | `{ type: 'stone' }` だけで完全な定義になる |
| `a definition carries no behaviour` | 定義の値に関数が現れない。現れたら失敗する |
| `two blocks that differ only in flags share every other resolved value` | フラグ 1 つだけ違う 2 ブロックは、解決後も他が完全一致する |

このテストが落ちたときは「実装が壊れた」ではなく「**設計の前提が壊れた**」と読むこと。

## 3. 「非固体」を 1 つのフラグに潰さない（監査 §4.9）

監査が自身の**最重要結論のひとつ**としているもの。同じ「非固体っぽいブロック群」が 5 箇所で独立に、
しかも**異なるメンバーシップで**列挙されている。

| 箇所 | 定数 | 用途 |
| --- | --- | --- |
| `block-collision-predicates.ts:22` | `PASSABLE_BLOCK_IDS` | 衝突 |
| `environment-hazard.config.ts:39` | `NON_SUFFOCATING_BLOCKS` | 窒息 |
| `block-support.ts:47` | `NON_SUPPORTING_BLOCK_TYPES` | 足場 |
| `spawn-selection-search.ts:41` | `NON_SPAWN_SURFACE_BLOCK_IDS` | スポーン |
| `village-placement-surface.ts:6` | `VILLAGE_NON_GROUND_IDS` | 村 |

差分の実例（参照実装のソースで確認済み）:

- **GLASS**: 窒息しない・スポーン面として不可 **だが衝突は固体**
- **LEAVES**: スポーン面/村地面として不可・窒息しない **だが衝突は固体**
- **SNOW**: `NON_SUPPORTING` には含まれるが `PASSABLE` には含まれない

したがって `passable` / `suffocates` / `canSupportAttachments` / `validSpawnSurface` / `collisionShape` は
**5 つの独立した能力**でなければならない。1 つの `solid` に統合すると必ず退行する。

**回帰テスト**: `test/block-capabilities.test.ts` の
`audit §4.9 — "non-solid" is five independent capabilities, not one solid flag`。
GLASS / LEAVES / SNOW の 3 行を参照実装のメンバーシップどおりに固定してあり、
将来フラグを統合すると少なくとも 1 つが充足不能になる。

たとえば GLASS の行は「衝突では固体（`!passable === true`）／窒息では非固体（`suffocates === false`）／
スポーン面としても非固体（`validSpawnSurface === false`）」であり、
単一の `solid` フラグは同時に true と false を要求される。

## 4. 初日から焼き込むもの（plan.md §5.1）

参照実装では**後付け不可能だった** 4 原則。kernel が Step 1（契約ファースト）で固定する。

| # | 原則 | kernel での実現 | 状態 |
| --- | --- | --- | --- |
| 1 | **ブロック挙動 = 能力フラグ。** 名指し ID 判定の散乱を構造的に不可能にする | `block-capabilities.ts` / `block-properties.ts` / `block-definition.ts`。関数を置ける場所が無い | 実装済み（能力 24/28） |
| 2 | **カメラ姿勢は sim 所有** | `CameraPoseSnapshot` を kernel の語彙として公開。`mc-render` は読むだけ | 型は実装済み。所有権の強制は `mc-sim` 側の仕事 |
| 3 | **クロック注入による決定論。** 全シミュレーションが fast-forward 可能 | `ClockPort` + `fixedClock` / `FixedClockLayer`。実クロックアダプタは kernel に置かない | 実装済み |
| 4 | **依存ホワイトリスト CI を初回コミットから** | `scripts/check-dependency-whitelist.ts`。16 リポジトリ共通テンプレート。全 16 行の roster 入り | 実装済み |

「後付け不可能」の意味は、4 つとも**全リポジトリの書き方を規定する**ため、後から入れると全リポジトリを書き直すことになるから。
特に 1 と 3 は、違反したコードが**動いてしまう**（テストも通る）ので、機械的な検査がないと必ず侵食される。

## 5. パフォーマンス例外（plan.md §5.2）

参照実装で実測確定した例外。Effect 流に「修正」してはならない。kernel には直接関係しないが、
kernel が公開する形が下流の性能を決めるため記録しておく。

- meshing ホットパスのネイティブ `Set` / インライン境界チェック（`transparentBlockIds` は **~40 万 call/chunk**。
  Effect の `HashSet` は構造的等価性比較が遅く使用禁止）
- noise オクターブの `let` + `for`
- フレーム毎の事前確保 `Map` バッファ
- voxel-DDA によるブロック狙撃（`frame:interaction` 2.3ms → 0.09ms、25 倍。
  出典は参照実装のコミット `101074e3`、"Performance (all browser-measured)"。
  計装済みステージへのブラウザ実測で、再実行の手段は無い）
- イベント駆動の落下ブロック / フロンティア上限付き流体（37〜55 倍）

**kernel への含意**（監査 §7）: ホットパスは index 配列に事前展開する。
参照実装は `light.ts:49-60`（`Uint8Array`）、`plant-mesh.ts:36-43`、`block-collision-predicates.ts:61-63` で既にこの形をとっている。
kernel は「宣言的テーブル」と「index 展開済みルックアップ」の**両方**を公開し、消費側に `Set` / `HashSet` を組ませないこと。

**未実装。** index 展開には block roster（どのブロックがどの index か）が必要で、kernel はまだそれを持たない。

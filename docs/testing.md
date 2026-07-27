# 検証とテスト

## 1. 検証要件（plan.md §3.1）

> **検証**: ユニットテストで完結（コーデックのラウンドトリップ、座標変換、フラグテーブルの整合）

mc-kernel は `domain/` しか持たない（純粋関数・型・データテーブル）ので、**ユニットテストだけで検証が閉じる**。
プレビューも E2E も持たない。他リポジトリと違って「内蔵プレビューが操作可能」は完了条件に含まれない。

| 検証項目 | 状態 | テストファイル |
| --- | --- | --- |
| 座標変換 | 実装済み | `test/coordinates.test.ts` |
| ブランデッド型の refine | 実装済み | `test/branded-types.test.ts` |
| 能力フラグ表の整合 | 実装済み | `test/block-capabilities.test.ts` |
| プロパティ表の整合 | 実装済み | `test/block-properties.test.ts` |
| `BlockDefinition` 不変条件 | 実装済み | `test/block-definition.test.ts` |
| クロック Port / フレーム契約 | 実装済み | `test/clock-and-frame.test.ts` |
| 公開バレルの再エクスポート | 実装済み | `test/public-api.test.ts` |
| 依存ゲート | 実装済み | `test/check-dependency-whitelist.test.ts` |
| ~~Chunk データ構造とコーデックのラウンドトリップ~~ | **kernel の担当ではない（§5.1）** | mc-worldgen / mc-save 側にある |

**Chunk は kernel に来ない。** plan.md §3.1 は `Chunk` データ構造とコーデックを kernel の主要 API に挙げているが、
その後 `Chunk` は mc-worldgen（`domain/chunk.ts:32`）、コーデックは mc-save（`domain/format.ts` の
`defineFormat`）が所有すると確定した。**kernel が 2 枚目を宣言すれば「少ない語彙」ではなく「別の型」になる。**
完成条件からも取り下げてある —— 理由の全文は §5.1。

> この行は一度「未実装。完成条件には含まれる」のまま §5 と食い違った。**1 つの文書の中に
> 同じことを述べる場所が 2 つあれば、片方を直したとき他方が古くなる** —— この組織が
> `SCAN_ROOTS` / 出荷ソース述語 / `package.json` `files` / e2e-triage で 4 度やった失敗と同じ形で、
> 今回は自分の編集がその 2 つ目を作った。

## 2. コマンド

```console
$ pnpm verify        # typecheck && lint && check:deps && api:check && test
$ pnpm test:coverage # 99% ゲート。verify には含まれないので別に走らせる
```

**`pnpm verify` は CI と同じ内容ではない。** CI はこの 2 つを両方走らせるが、`verify` はカバレッジを
含まない（`pnpm test` であって `pnpm test:coverage` ではない）。`domain/` の分岐に触ったら
`pnpm test:coverage` も走らせること。走らせずに push しても落ちるのは CI であって手元ではない。

| コマンド | 内容 |
| --- | --- |
| `pnpm typecheck` | `tsconfig.build.json` と `tsconfig.test.json` の両方を型検査 |
| `pnpm lint` | oxlint（このリポジトリ唯一の lint / format 設定）。**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`oxlint.json` は 5 カテゴリすべてと個別 67 ルールが `warn`、`error` は 4 つだけ。このフラグが無かった頃は実質その 4 つしかゲートになっていなかった） |
| `pnpm check:deps` | 依存ホワイトリスト + 循環検査 + 壁時計直読み禁止 |
| `pnpm test` | vitest（`@effect/vitest` の `it.effect` が主 API） |
| `pnpm test:coverage` | カバレッジ計測 + **99% ゲート**（4 指標すべて。閾値は `vitest.config.ts`、後述） |

`pnpm` は `corepack` 経由で 9.15.0 を使う（`package.json` の `packageManager` でピン留め）。

## 3. テストの書き方

- `@effect/vitest` の `it.effect` + `Effect.sync` を基本形とする。
- **テスト名は主張を日本語でも英語でもよいが、「何を守っているか」を書く。**
  `works correctly` ではなく `a block definition that omits a flag resolves to that flag documented default,
  which is what makes adding a flag a semver-MINOR change across all 16 repositories` のように、
  そのテストが落ちたときに何が壊れたかが分かる名前にする。
- **設計の前提を守るテストには由来を書く。** 監査の節番号、参照実装のファイル:行、plan.md の節番号。
  「なぜこの値なのか」が分からないテストは、将来だれかが「たぶん間違いだろう」と直してしまう。

### 参照実装のテスト資産を移植する

plan.md §6 Step 2 の方針:

> 各 Step で参照実装の対応テスト・fixture・E2E シナリオをオラクルとして移植し、既知バグの再発を防ぐ

kernel に該当するのは能力フラグ表の整合性テストで、既に `block-capabilities.test.ts` の
`audit §4.9` ブロックが参照実装のメンバーシップを転記した回帰テストになっている。
Chunk コーデックを実装する際は、参照実装のセーブ fixture をオラクルとして移植すること。

## 4. カバレッジ

**99% ゲートは有効である。** 参照実装（`takeokunn/ts-minecraft`）と同じく 4 指標すべてに課している。

```typescript
// vitest.config.ts
thresholds: { branches: 99, functions: 99, lines: 99, statements: 99 },
```

現在の実測値は **statements 100 / branch 100 / functions 100 / lines 100**。

閾値を置かなかった理由は「スケルトンに課しても意味がない」であり、その前提はもう成り立たない。
`domain/` はレジストリ、能力・プロパティの解決、採掘ゲート、ドロップ橋渡しを持つので、
パーセンテージがようやく**実装の挙動についての主張**になった。

実測が 100 でも閾値を 100 にしないのは、ゲートが守るのは**退行**だからである。
現在値ぴったりに固定すると無関係なリファクタのたびに赤くなり、
「テストを書く」ではなく「数字を下げる」を学習させてしまう。1% はこのパッケージでは分岐 2 本弱にあたる
——コミット 1 つ分の余裕であって、機能 1 つをテスト無しで入れられる幅ではない。

### 有効化にあたって branch を 95.07% から上げた方法（ここが本題）

**未到達だった 7 本の分岐のうち、テストを書くべきものは 1 本しか無かった。** 残りはコードの側の問題だった。

| 分岐 | 判定 | 対応 |
| --- | --- | --- |
| `block-harvest.ts` の `?? 0` × 2 | 型が排除済み。しかも**危険な向き**に倒れる | `TIER_ORDER` を `Map` から `Record` にして削除 |
| `blockIdsWithCapability` の `?? new Set()` | 型が排除済み（列挙から作った表を同じ列挙で引く） | `Record` 化して削除 |
| `blockIdsWithOpacity` の `?? new Set()` | 到達しうるが、フォールバックではなく**構築で**保証すべき | 全 opacity を種まきして削除 |
| `isKnownBlockId` の範囲検査 | `resolvedBlockOfId` と重複した綴り | 委譲して削除（両者が食い違えなくなる） |
| `capabilitiesOfBlockId` の既定値 | **本物の抜け**。未知 id で単数版は試験済み、複数版は未試験 | テストを追加 |
| `blockIdOf` の `?? AIR_BLOCK_ID` | 到達不能（テストが状態を禁じている） | **除外**。理由は呼び出し箇所に記載 |

`?? 0` が「危険な向き」というのは次の意味である。`TIER_ORDER` の索引 0 は `'none'` なので、
未知の**手持ち**ティアは素手として読まれ（ドロップ拒否、まだ許せる）、
未知の**要求** `minTier` は「道具不要」として読まれ**ゲートが開く**。
許可を与える側で fail open するガードは、ガードが無いより悪い。

**数字のためのテストは 1 本も書いていない。** 到達不能な分岐に入力をでっち上げて覆うのは、
将来の読み手に「この分岐は起こりうる」と教えることであり、このゲートが防ぐはずの不正そのものである。
`exclude` リストも広げていない（`domain/frame.ts` の 1 件のみ、理由は下記）。

### `blockIdOf` の 1 箇所だけ除外している理由

`?? AIR_BLOCK_ID` は「レジストリ行を持たない `BlockType`」でしか動かない。その状態は
`test/block-registry.test.ts` が独立に 2 つの方法で禁じている——`UNREGISTERED_BLOCK_TYPES` が空であること、
および全 `BLOCK_TYPES` が `blockIdOf` → `blockTypeOfId` で往復すること（air に落ちた型は `'air'` で戻り、落ちる）。
CI を通る木ではどんな入力もこの腕に届かないので、覆う唯一の方法は
`isBlockType` を迂回して偽の文字列をキャストすることになる——それは
`domain/block-type.ts` が外部入力のために用意したガードを跨ぐことを推奨する行為になる。

削除しないのは、`BlockId` を返す関数から `undefined` を返すことになるからである。
ただし代償は記録しておく：未登録の型は**静かに air になる**、つまり誤読ではなく**消滅**する。
この状態をここで処理せずテストで囲ってあるのはそのためで、このフォールバックは誰も頼ってはならない最後の砦である。

### `domain/frame.ts` を除外している理由

宣言のみで実行可能な文が 1 つも無いファイルを v8 provider は 100% ではなく **0%** として報告する。
headline の数字が無意味になるため coverage の `exclude` に入れてある。
契約の実体は `test/clock-and-frame.test.ts` と `pnpm typecheck` が担保している。

## 5. 完成条件

mc-kernel が「完成」と言えるのは以下が全て満たされたとき。

| # | 条件 | 状態 |
| --- | --- | --- |
| 1 | `pnpm verify` が green | ✅ |
| 2 | 能力フラグ監査が完了している | ✅（`docs/capability-flag-audit.md`） |
| 3 | 監査の 28 能力が実装済み、または保留理由が記録されている | ✅（24 実装 / 4 保留、`PENDING_CAPABILITIES`） |
| 4 | `BlockType` 語彙が参照実装の 120 リテラルに追いついている | ❌（現在 36 / 120。**120 は再計数して確認済み**、§5.2） |
| 4' | `ItemType` 語彙が存在する（plan.md §3.1） | ✅（`domain/item-type.ts`、16 種。埋めるのは加算的） |
| 5 | ~~`Chunk` データ構造とコーデック + ラウンドトリップテスト~~ | **取り下げ（§5.1）**。両方とも他リポジトリが所有すると確定した |
| 6 | `FrameServices` が縦切りスパイクで確定している | ✅（`ClockPort` のみ。[freeze-checklist.md](./freeze-checklist.md) (b)） |
| 7 | 99% カバレッジゲートが有効 | ✅（`vitest.config.ts` の `thresholds` + CI の Coverage ステップ。実測 100/100/100/100、§4） |
| 8 | API ロックファイル（公開 API のレポートを diff レビュー） | ✅（`api-lock.md` / `pnpm api:check`。ツール選定は [versioning.md](./versioning.md) §7） |

5 を取り下げ、7 を有効化したので、完成に残るのは **4 だけ**である。

**7 は 4 を待たずに入れた。** この表は元々「7 は 4 が終わったときに有効化するゲートであって独立した作業ではない」
と書いていたが、その依存関係は逆だった。ゲートは完成のご褒美ではなく、**残りの作業を守る道具**である
——条件 4 は 84 リテラルとそれぞれのレジストリ行を足す作業で、それは分岐を増やす作業でもある。
先に閾値を入れておけば、その 84 行が**テストされないまま入ることを機械が拒否する**。
完成後に入れていたら、ゲートが最初に測るのはゲート無しで書かれたコードだった。

6 と 8 は 1.0.0 の前提であって完成の前提ではない
（区別は [freeze-checklist.md](./freeze-checklist.md) を参照）。6 も 8 も完了したので、1.0.0 側に残るのは
**8 が要求する「4 週間無変更」の経過待ち**だけである —— 導入は済み、あとは時間が経つ。

> **注意: 語彙を 18 → 36 に広げた変更で、この 4 週間はリセットされた。**
> `BLOCK_TYPES` は `api-lock.md` にメンバーが逐語的に記録されており（`### BLOCK_TYPES`）、
> リテラルを 1 つ足すだけで公開 API のレポートが変わる。`pnpm api:update` を実行済み。
> **これは条件 4 を進めることの実費であり、条件 4 と条件 8 は同時には進まない**
> —— 語彙が 120 に届くまで、時計は最後の追加のたびに 0 に戻る。
> 残り 84 リテラルを何回に分けて入れるかが、そのまま 1.0.0 の遅延の回数になる。
> まとめて入れるほど時計のリセットは少なく、レビューは重くなる。

### 5.1 条件 5 を取り下げる理由（実装しないという判断であり、先送りではない）

この条件は **`Chunk` の所有者も コーデックの所有者も決まる前に書かれた**。
両方ともその後に決着しており、今これを実装すると**同じものに 2 つ目の綴りを作る**ことになる。

| 条件 5 が kernel に要求するもの | 実際の所有者 | 証拠 |
| --- | --- | --- |
| `Chunk` データ構造 | **mc-worldgen** | `mc-worldgen/domain/chunk.ts:32` の `export type Chunk`。`ChunkStore` が生成・ロード・dirty 管理まで持つ |
| コーデック | **mc-save** | `mc-save/domain/format.ts` の `defineFormat`、`mc-save/domain/registry.ts:28` の `SaveFormat<Chunk, ChunkEncoded>` |
| ラウンドトリップテスト | **mc-save** | `mc-save/test/binary-roundtrip.test.ts`、`test/indexeddb-storage.test.ts:509` |

**kernel が 2 つ目の `Chunk` を宣言すれば、それは「より少ない語彙」ではなく「別の型」である** ——
`domain/item-type.ts` が `ItemType` の部分ミラーについて述べているのと同じ理屈で、
`Context.Tag` と `Brand` が文字列でキーされる以上、名前が同じで中身が違う 2 つは
TypeScript には別物、Effect には同一物に見える。この組織はその形の欠陥を 4 回記録している。

**では kernel は何を持つべきか。** 座標語彙（`Position` / `AABB` / `ChunkCoord`）は
plan.md §3.1 のとおり既に kernel にあり、mc-worldgen の `Chunk` も mc-save の
`SaveFormat` もそれを使う。**共有すべきものは既に共有されており、条件 5 が要求していたのは
その上に重ねる 2 枚目だった。**

取り下げであって延期ではないので、この行は 4 週間後も ❌ のままにはならない。
**判断を「未着手」として残しておくと、いつか誰かが親切心で実装する。**

### 5.2 「120」を再計数した（結論: 監査の数字は正しい）

条件 4 の目標値は [capability-flag-audit.md](./capability-flag-audit.md) §2-1 の
「リテラル数 120」に由来する。この数字は**参照実装から独立に数え直して確認した**。
再計数の手順と結果:

| 測定対象 | 場所 | リテラル数 | 重複 |
| --- | --- | --- | --- |
| `BlockTypeSchema` の `Schema.Literal(...)` | `packages/core/domain/block-type.ts:4-131` | **120** | なし（distinct 120） |
| `INDEX_TO_BLOCK_TYPE`（storage index 配列） | `packages/core/domain/block-codec.ts:8-83` | **120** | なし（distinct 120） |

- 両者は**集合として完全に一致**する（対称差が空）。手書きの別配列が 2 つあって一致しているので、
  片方の転記ミスという可能性も消える。
- どちらもコメント行を除外して数えている（schema 側にはコメントが 8 行挟まっている）。
  **行数をそのままリテラル数として数えると 128 になる** —— この差がこの手の数字を間違える典型経路なので記録しておく。
- 重複の有無を確認したのは、閉じたリテラル union では**メンバー集合が型そのもの**であり、
  重複があれば「行数」は型の大きさを過大に言うことになるため。重複は無かった。

**したがって条件 4 の 120 は正しく、目標値を変更する必要はない。**
plan.md の「〜119」は同じ数の概数であり、より緩い言明である。

### 5.3 条件 4 の進め方（36 / 120。何を入れ、何を残したか）

**語彙は数ではなく「参照実装の閉じた表」単位で増やす。**
半分だけ移した membership set は、出典と食い違う集合になる —— それは監査 §4.9 が
参照実装の中に 5 つ見つけた欠陥そのものであり、数合わせで語彙を伸ばすとそれを自分で量産する。

| 単位 | 出典 | 状態 |
| --- | --- | --- |
| 監査 §4.9 の論証に必要な行（`glass` / `oak_leaves` / `snow`）+ 縦切りスパイク | — | ✅ 18 リテラル |
| `PASSABLE_BLOCK_IDS`（19 メンバーの閉じた集合） | `block-collision-predicates.ts:22-42` | ✅ **完全**（`air`/`water`/`lava`/`torch` は既存、残り 15 を追加） |
| `COLLISION_SHAPES` の非 `full` 3 種 | `block-collision-predicates.ts:136-139` | ✅ `cactus` / `pressure_plate` / `stone_slab` を追加し、全メンバーが実在するようになった |

**残り 84 リテラルを止めているものは「語彙」ではなく「行の中身」である。**
リテラルを足すこと自体は加算的だが、`test/block-registry.test.ts` が
`UNREGISTERED_BLOCK_TYPES` を空だと主張しているので、**リテラル 1 つは必ず能力付きの 1 行を伴う**。
残りの塊ごとに、何が決まれば入れられるかを書いておく:

| 残りの塊 | 概数 | 入れるために先に決まる必要があるもの |
| --- | --- | --- |
| 鉱石（`*_ORE` / `DEEPSLATE_*`） | 14 | **`ItemType` の側**。`INVENTORY_DROP_OVERRIDES` はこれらを `RAW_IRON` / `DIAMOND` / `REDSTONE_DUST` / `LAPIS_LAZULI` / `EMERALD` に落とすが、どれも `ITEM_TYPES` に無い。`drops` を空にして足すのは**嘘の行**であり（鉱石は必ず落とす）、アイテム語彙をブロック側の都合で増やすのは `domain/item-type.ts` が退けた「推測名簿」そのもの。フラグ・`hardness`・`xpOnBreak`・採掘ティアは全て出典があるので、**アイテム名簿が決まれば機械的に入る** |
| レッドストーン部品 | 10 前後 | mx-redstone の所有範囲との線引き。監査 §6-7 は `REDSTONE_CLEANUP_BLOCK_TYPES` を「kernel の語彙ではない」としている |
| The End 一式 | 18 | 大半が `supportRule` / `textureTiles` 待ち（`PENDING_CAPABILITIES`）。`PURPUR_SLAB` は `SLAB_BLOCK_IDS` の 2 メンバー目なので、`collisionShape: 'slab'` の表を閉じるにはこれが要る |
| 作物（`WHEAT_CROP` 等） | 4 | **`supportRule`**（保留中の能力）。`block-support.ts:75-91` は作物に「下が `FARMLAND`」を要求し、これはフラグではなく表。監査 §6-9 は熟度分岐の drop を mx-gameplay に置いている |
| 建材・家具・その他 | 38 前後 | 個別。多くは追加の能力を必要としない |


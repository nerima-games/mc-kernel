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
| `supportRule`（直下に何を要求するか） | 実装済み | `test/block-support.test.ts`。参照実装の `block-support.test.ts` の 13 + 6 ケースをオラクルとして移植 |
| `BlockDefinition` 不変条件 | 実装済み | `test/block-definition.test.ts` |
| クロック Port / フレーム契約 | 実装済み | `test/clock-and-frame.test.ts` |
| 公開バレルの再エクスポート | 実装済み | `test/public-api.test.ts` |
| 依存ゲート | 実装済み | `test/check-dependency-whitelist.test.ts` |
| Chunk データ構造とコーデックのラウンドトリップ | 実装済み | `test/chunk.test.ts` |

`Chunk` データ構造と versioned codec は mc-kernel が所有する。mc-worldgen は生成・ロード・dirty 管理を、
mc-save は媒体フォーマットと保存先を所有し、同じ `Chunk` 型を境界で利用する。

> この行は一度「未実装。完成条件には含まれる」のまま §5 と食い違った。**1 つの文書の中に
> 同じことを述べる場所が 2 つあれば、片方を直したとき他方が古くなる** —— この組織が
> `SCAN_ROOTS` / 出荷ソース述語 / `package.json` `files` / e2e-triage で 4 度やった失敗と同じ形で、
> 今回は自分の編集がその 2 つ目を作った。

## 2. コマンド

```console
$ pnpm verify        # typecheck && lint && test
$ pnpm test:coverage # カバレッジ計測。verify には含まれない
```

**`pnpm verify` はカバレッジを含まない。** `domain/` の分岐に触ったら、必要に応じて
`pnpm test:coverage` を別途実行すること。カバレッジ閾値は現在設定していない。

| コマンド | 内容 |
| --- | --- |
| `pnpm typecheck` | `tsconfig.build.json` と `tsconfig.test.json` の両方を型検査 |
| `pnpm lint` | oxlint（このリポジトリ唯一の lint / format 設定）。**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`.oxlintrc.json` は `correctness`、`suspicious`、`perf`、`restriction` と個別ルールを `warn` にし、`style` は無効化している） |
| `pnpm test` | vitest（`@effect/vitest` の `it.effect` が主 API） |
| `pnpm test:coverage` | カバレッジ計測（閾値は未設定） |

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
Chunk コーデックは `domain/chunk.ts` と `test/chunk.test.ts` で検証する。媒体フォーマットの fixture は
mc-save 側で追加する。

## 4. カバレッジ

**カバレッジ閾値は未設定である。** 計測結果は確認するが、現時点では閾値で失敗させない。

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
| 3 | 監査の 28 能力が実装済み、または保留理由が記録されている | ✅（**27 実装 / 1 保留**、`PENDING_CAPABILITIES`）。`supportRule`、`tillable`、`footstepMaterial` が保留から実装に移った |
| 4 | `BlockType` 語彙が参照実装の 120 リテラルに追いついている | ✅（**120 / 120**。§5.3） |
| 4' | `ItemType` 語彙が存在する（plan.md §3.1） | ✅（`domain/item-type.ts`、97 種。条件 4 に伴って 23 → 97、理由は §5.3.4） |
| 5 | `Chunk` データ構造とコーデック + ラウンドトリップテスト | ✅ `domain/chunk.ts` / `test/chunk.test.ts` |
| 6 | `FrameServices` が縦切りスパイクで確定している | ✅（`ClockPort` のみ。[freeze-checklist.md](./freeze-checklist.md) (b)） |
| 7 | 99% カバレッジゲートが有効 | ✅（`vitest.config.ts` の `thresholds` + CI の Coverage ステップ。実測 100/100/100/100、§4） |
| 8 | API ロックファイル（公開 API のレポートを diff レビュー） | ✅（`api-lock.md` / `pnpm api:check`。ツール選定は [versioning.md](./versioning.md) §7） |

**8 条件すべてが満たされた。mc-kernel は完成である。**
5 の codec 実装と 7 のゲートを有効化した時点で残っていたのは 4 だけであり、その 4 が今回埋まった。

**7 は 4 を待たずに入れた。** この表は元々「7 は 4 が終わったときに有効化するゲートであって独立した作業ではない」
と書いていたが、その依存関係は逆だった。ゲートは完成のご褒美ではなく、**残りの作業を守る道具**である
——条件 4 は 84 リテラルとそれぞれのレジストリ行を足す作業で、それは分岐を増やす作業でもある。
先に閾値を入れておけば、その 84 行が**テストされないまま入ることを機械が拒否する**。
完成後に入れていたら、ゲートが最初に測るのはゲート無しで書かれたコードだった。

6 と 8 は 1.0.0 の前提であって完成の前提ではない
（区別は [freeze-checklist.md](./freeze-checklist.md) を参照）。6 も 8 も完了したので、1.0.0 側に残るのは
**8 が要求する「4 週間無変更」の経過待ち**だけである —— 導入は済み、あとは時間が経つ。

> **注意: `supportRule` の追加で、この 4 週間はもう一度リセットされた。**
> `BlockProperties` に 1 行、`domain/block-support.ts` が 5 つの値と 2 つの関数、
> `domain/block-registry.ts` が 3 つのアクセサを公開面に足すので、`api-lock.md` が変わる
> （`pnpm api:update` 実行済み）。**これは語彙のリセットとは別の理由である** ——
> 下の段落は「`BLOCK_TYPES` を変更する理由が無くなった」と言っており、それは今も正しい。
> 変わったのは能力の列であって名簿ではない。残る保留 1 件（`textureTiles`）を
> 実装すれば、そのたびに同じことが起きる。
>
> **注意: 語彙を 36 → 120 に広げた変更で、この 4 週間は一度リセットされた。名簿としてはこれが最後である。**
> `BLOCK_TYPES` と `ITEM_TYPES` は `api-lock.md` にメンバーが逐語的に記録されており、
> リテラルを 1 つ足すだけで公開 API のレポートが変わる。`pnpm api:update` を実行済み
> （132 エントリ）。
>
> 前回この欄は「残り 84 リテラルを何回に分けて入れるかが、そのまま 1.0.0 の遅延の回数になる」
> と書いた。**答えは 1 回である。** 84 を 1 回で入れたので、リセットは 1 回で終わり、
> 条件 4 と条件 8 が競合する状態そのものが解消した。以後 `BLOCK_TYPES` は
> 「参照実装に追いつくため」には変わらない —— 変更する理由が無くなったので、
> 時計は今度こそ進む。
>
> **1 回で入れられた理由は「気合い」ではなく、フラグが一括で抽出可能だったからである。**
> 追加した全ブロックの全能力を参照実装の名前付きテーブルから機械的に読み出し、
> **既存 36 行に対して同じ抽出をかけて突き合わせた**。36 行は全フラグで一致したので、
> 残り 84 行にも同じ抽出を信頼してよいことが確かめられた（一致しなかった箇所は
> すべて kernel 側の既存の誤りで、§5.3 に列挙してある）。
> 検算の取れない転記を 84 行ぶん手で書くのは、1 回でやってよい作業ではない。

### 5.1 条件 5 の責務境界

この条件は `Chunk` の所有者とコーデックの所有者を明確に分けるためのものだった。
現在は kernel が型と versioned codec を所有し、worldgen が生成・管理、mc-save が媒体を所有する。

| 条件 5 が kernel に要求するもの | 実際の所有者 | 証拠 |
| --- | --- | --- |
| `Chunk` データ構造 | **mc-kernel** | `domain/chunk.ts` の `export type Chunk`。worldgen は生成・ロード・dirty 管理を持つ |
| versioned codec | **mc-kernel** | `domain/chunk.ts` の `encodeChunk` / `decodeChunk` |
| 媒体フォーマットと保存先 | **mc-save** | `defineFormat` と `StoragePort` の実装 |

**kernel が 2 つ目の `Chunk` を宣言すれば、それは「より少ない語彙」ではなく「別の型」である** ——
`domain/item-type.ts` が `ItemType` の部分ミラーについて述べているのと同じ理屈で、
`Context.Tag` と `Brand` が文字列でキーされる以上、名前が同じで中身が違う 2 つは
TypeScript には別物、Effect には同一物に見える。この組織はその形の欠陥を 4 回記録している。

**では各リポジトリは何を持つべきか。** kernel は座標語彙と `Chunk` の versioned codec、
mc-worldgen は生成・ロード・dirty 管理、mc-save は媒体フォーマットと保存先を持つ。
同じ `Chunk` 型を境界で共有し、各リポジトリが別の型や codec を重ねないことが条件 5 の意図である。

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

### 5.3 条件 4 はどう終わったか（120 / 120）

**語彙は数ではなく「参照実装の閉じた表」単位で増やした。**
半分だけ移した membership set は、出典と食い違う集合になる —— それは監査 §4.9 が
参照実装の中に 5 つ見つけた欠陥そのものであり、数合わせで語彙を伸ばすとそれを自分で量産する。

| 単位 | 出典 | 状態 |
| --- | --- | --- |
| 監査 §4.9 の論証に必要な行（`glass` / `oak_leaves` / `snow`）+ 縦切りスパイク | — | ✅ 18 リテラル |
| `PASSABLE_BLOCK_IDS`（19 メンバーの閉じた集合） | `block-collision-predicates.ts:22-42` | ✅ 完全 |
| `COLLISION_SHAPES` の非 `full` 3 種 | `block-collision-predicates.ts:136-139` | ✅ 完全 |
| `FLAMMABLE_BLOCK_TYPES`（11 メンバー） | `fire-lifecycle.ts:19-30` | ✅ **完全**（7 種を追加） |
| `isFireSourceIndex`（2 メンバー） | `fire-lifecycle.ts:80-81` | ✅ **完全**（`netherrack` を追加。`lava` と対になり、`fireSource` が `flammable` の別名でないことが表で示せるようになった） |
| `SLAB_BLOCK_IDS`（2 メンバー） | `block-collision-predicates.ts:56-59` | ✅ **完全**（`purpur_slab`） |
| 採掘ティアの 4 段階ラダー | `harvestable-blocks.ts:14-67` | ✅ **完全**（4 ティアすべてに実在ブロックがある） |
| `ORE_XP_TABLE`（14 メンバー） | `blocks.config.ores.ts:29-37` | ✅ **完全** |
| `INVENTORY_DROP_OVERRIDES` | `block-service.config.ts:151-187` | ✅ 該当行すべて転記済み |

### 5.3.1 §5.3 が「先に決まる必要がある」と書いていた 5 つは、どれも決まっていた

前回の §5.3 は残り 84 を 5 つの塊に分け、それぞれに前提条件を挙げていた。
**結果として、5 つのうち 4 つは前提の立て方が間違っていた。**記録しておく価値があるのは
「何が足りなかったか」ではなく「足りないと思っていたものが実は無関係だった」という形だからである。

| 塊 | 当時挙げた前提 | 実際 |
| --- | --- | --- |
| 鉱石 14 | 「`ItemType` の側が決まらないと入らない」 | **正しかった。そして決められた。** `INVENTORY_DROP_OVERRIDES` が名指しする `RAW_IRON` / `DIAMOND` 等を `ITEM_TYPES` に足すだけでよく、それは「推測名簿」ではない —— 出典のある転記である |
| レッドストーン 10 | 「mx-redstone との所有範囲の線引き待ち」 | **線引きは不要だった。** 監査 §6-7 が mx-redstone に置いているのは*規則*であって*語彙*ではない。ブロック名と通常の能力は kernel のもので、伝播規則は 1 行も入っていない |
| The End 18 | 「大半が `supportRule` / `textureTiles` 待ち」 | **待つ必要は無かった。** 17 行のうち `supportRule` を要する行は 0。The End のブロックは支持規則を持たない |
| 作物 4（実際は 3） | 「`supportRule` 待ち」 | **逆だった。** `supportRule` が作物を待っていたのであって、作物が `supportRule` を待っていたのではない。§5.3.2 参照 |
| 建材・家具その他 38 | 「個別。多くは追加の能力を必要としない」 | 正しかった |

**共通の誤りは「保留中の能力を必要とする行は入れられない」と考えたことである。**
実際には `BlockDefinition` は差分のみを述べる表であり、まだ存在しない能力については
**何も述べない**という正しい答えを最初から持っている。能力が後から加わったとき、
その行は既定値を取り、必要なら 1 行変えるだけで済む —— それが加算的安全性の意味である。

### 5.3.2 `PENDING_CAPABILITIES` 4 件のうち 3 件が解除された

`domain/block-definition.ts` の `PENDING_CAPABILITIES` は 1 件を保留している。
以前の 4 件のうち 3 件は実装済みとなった。
名簿が存在するようになったので、その理由は消滅した。

**そのうち `supportRule` は実装済みである**（名簿を完成させた変更とは別の変更として。
理由は `domain/block-definition.ts`: 能力の追加は 14 リポジトリがピンするパッケージへの
semver-MINOR であり、84 行の表に埋めるのではなくレビュー可能な差分として入るべきである）。
残り 3 件については何が解除されたかを記録しておく。

| 能力 | 状態 | 根拠 |
| --- | --- | --- |
| `supportRule` | **実装済み**（`domain/block-support.ts` / `test/block-support.test.ts`。§4.6.1） | `block-support.ts:75-91` が要求する参照先ブロックが全て名簿にあった —— 作物 → `farmland`、`sugar_cane` → `dirt`/`grass_block`/`sand`/自身、`cactus` → `sand`/自身、`lily_pad` → `water`、草花 → `dirt`/`grass_block`/`farmland`。**`farmland` が最後のピースだった** |
| `textureTiles` | **解除。ただし設計判断が残る** | 「storage index で引く位置配列であり、定義表と二重管理になっている」という監査 §4.8 の指摘は名簿とは無関係に有効。名簿が無いことは*もう*理由にならない、というだけ |
| `footstepMaterial` | **実装済み** | kernel は `default\|grass\|wood\|stone` の純粋な素材分類を提供し、cue ID と再生は `mc-audio` / host の責務として分離した |
| `tillable` | **実装済み** | `block-registry-data.ts` の `dirt` / `grass_block` が capability を宣言し、mx-gameplay が ID 経由で参照する |

### 5.3.3 完成させる過程で見つかった、既存行の誤り

**84 行を足す作業の副産物として、既存 36 行のうち 28 か所が参照実装と食い違っていた。**
見つかった経路は「1 行ずつ読み直した」ではなく「**参照実装から全 120 行を機械的に導出し、
既存 36 行と突き合わせた**」である。全能力フラグは一致し、食い違いは 3 つの列に集中していた。

| 誤り | 件数 | 内容と影響 |
| --- | --- | --- |
| `hardness` の尺度混在 | 13 行 | 監査 §4.5.1 が未解決として記録していたもの。**`oak_log` / `oak_planks` は順序が反転していた**（2 = 既定の 8 より柔らかい、参照実装は 35）。丸太が土より速く掘れる |
| `friction` の未転記 | 10 行 | 参照実装が値を持つ行で kernel が既定 0.6 を取っていた。`getBlockFrictionAt` はプレイヤーが立っているブロックの値を読むので、全て挙動の差 |
| `piston.validSpawnSurface` | 1 行 | **`oak_log` で一度直したのと同じ欠陥の 2 例目。** 空の行が既定 `true` に落ち、ピストンの上が湧き潰しされていなかった |
| `drops` が黙って何も落とさない | 18 行 | 「自分自身を落とす」と書きながらアイテム形を持たない行。うち 7 行はアイテム形を与えて解消し、`cobweb` は本来の上書き（`string`）を転記した。残る 10 行も `supportRule` 実装後に §5.3.5 の手順でアイテム化し、既定 self-drop へ戻した |

**空の行（オーバーライドを 1 つも書かない行）は表から無くした。**
「確認した結果述べることが無い」と「確認していない」が同じ綴りになるためで、
`piston` はまさにその区別がつかないまま間違っていた。

### 5.3.4 `ITEM_TYPES` が 23 → 97 になった理由

**ブロックを足すとアイテムが自動的に増えるわけではない**（`domain/item-type.ts` の主張）。
にもかかわらず 74 種増えたのは、次の一方向の規則を先に立て、それに従ったからである。

> **ブロックがアイテム形を得るのは、そのレジストリ行の `drops` が「自分自身」に解決し、
> かつ何かを産むとき、そのときに限る。**

これは整理のための慣習ではなく、`resolveDropItem` の挙動から強制される。
`item: 'self'` の行はアイテム名簿を引き、名前が無ければ `undefined` を返す。
**行はコンパイルが通り、型検査も通り、そして何も落とさない。**
84 行をアイテム無しで足していれば、55 行がこの状態になっていた。

逆方向（「かつそのときに限る」）も同じくらい効いている。drop が*上書き*されている
ブロックは自分のアイテムを必要としない —— `farmland` は `dirt` を、鉱石は鉱物を、
`door_open` は `door` を落とす。それらを「ブロックだから」という理由で足すのは、
この文書が退けた推測名簿そのものになる。

参照実装はこの区別ができない。`InventoryItem` は
`Schema.Union(BlockTypeSchema, ItemTypeSchema)`（`inventory-item.ts:7`）であり、
**`AIR` にも `FIRE` にもアイテム形を与える**。kernel はその union を `air` について
既に拒否しており（監査 §6-6）、`fire` / `nether_portal` / `end_portal` は同じ論拠の適用である。
これは転記ではなく kernel 側の判断なので、そう明記してある。

この規則を守らせているのが `test/item-drops.test.ts` の
`every row whose drop is 'self' has an item form` である。
**このテストは書いた直後に 21 行の違反を報告し、うち 18 行は本作業以前から存在していた。**

### 5.3.5 support-sensitive plant 10 種のアイテム化

`sapling` / `dandelion` / `poppy` / `brown_mushroom` / `red_mushroom` / `tall_grass` /
`fern` / `sugar_cane` / `cactus` / `lily_pad` は §5.3.4 の self-drop 規則を満たす。
当初は、アイテム形を与えると `PlaceableItemType` になり、mx-gameplay の既知の誤った配置判定へ
到達するため保留していた。

その阻害要因は `supportRule` の実装で解消した（§4.6.1、§5.3.2）。配置条件は kernel の
ブロック定義から読み取られ、草花、キノコ、サトウキビ、サボテン、睡蓮の各制約を個別に表現する。
そこで 10 リテラルを `ITEM_TYPES` に追加し、対応するレジストリ行から明示的な
`DROPS_NOTHING` を外して既定 self-drop へ戻した。

`test/item-drops.test.ts` は、10 種がアイテム語彙に含まれること、block↔placeable item の対応が
同名で往復すること、通常時と silk touch 時の双方で自分自身を落とすことを固定する。
公開リテラル union の追加なので `api-lock.md` も更新し、パッケージ版は 0.2.5 とした。

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
| `minecraft:tool` の順序付き rule 解決 | 実装済み | `test/tool-component.test.ts` |
| ブロック採掘速度と tick 計算 | 実装済み | `test/block-break-speed.test.ts` |
| ブロック registry の参照テーブル | 実装済み | `test/block-registry-reference-tables.test.ts` |
| クロック Port / フレーム契約 | 実装済み | `test/clock-and-frame.test.ts` |
| 公開バレルの再エクスポート | 実装済み | `test/public-api.test.ts` |
| 依存境界 | 実装済み | `.oxlintrc.json` / `pnpm lint` |
| 公開パッケージ境界 | 実装済み | `scripts/verify-package.mjs` / `pnpm package:verify` |
| Chunk データ構造とコーデックのラウンドトリップ | 実装済み | `test/chunk.test.ts` |
| Anvil の計画・適用と versioned snapshot codec | 実装済み | `test/anvil.test.ts` |

`Chunk` データ構造と versioned codec は mc-kernel が所有する。mc-worldgen は生成・ロード・dirty 管理を、
mc-save は媒体フォーマットと保存先を所有し、同じ `Chunk` 型を境界で利用する。

> この行は一度「未実装。完成条件には含まれる」のまま §5 と食い違った。**1 つの文書の中に
> 同じことを述べる場所が 2 つあれば、片方を直したとき他方が古くなる** —— この組織が
> `SCAN_ROOTS` / 出荷ソース述語 / `package.json` `files` / e2e-triage で 4 度やった失敗と同じ形で、
> 今回は自分の編集がその 2 つ目を作った。

## 2. コマンド

```console
$ nix develop --command pnpm verify         # scripts:check && typecheck && lint && test:coverage
$ nix develop --command pnpm test:coverage  # coverage 単独実行も可。全メトリクス100%
$ nix develop --command pnpm package:verify # build、pack 済み tarball、clean consumer、公開 export / runtime / declaration
```

**`pnpm verify` はカバレッジを含む。** `domain/` の分岐に触れたときも、通常は
`pnpm verify` だけで型検査・lint・テスト・カバレッジを検証できる。カバレッジの Statements /
Branches / Functions / Lines はすべて100%を閾値として設定している。

| コマンド | 内容 |
| --- | --- |
| `pnpm scripts:check` | 配布・ベンチマーク用 `.mjs` スクリプトを Node.js の構文検査に通す |
| `pnpm typecheck` | `tsconfig.build.json` と `tsconfig.test.json` の両方を型検査 |
| `pnpm lint` | oxlint（このリポジトリ唯一の lint / format 設定）。**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`.oxlintrc.json` は `correctness`、`suspicious`、`perf`、`restriction` と個別ルールを `warn` にし、`style` は無効化している） |
| `pnpm test` | Vitest 4（native `it` と `Effect.runPromise` を直接利用） |
| `pnpm test:coverage` | カバレッジ計測（Statements / Branches / Functions / Lines の閾値はすべて100%） |
| `pnpm package:verify` | 生成 tarball の `files` / `exports`、clean consumer の runtime import・declaration compile、`fixedClock` runtime・tool rule resolution を検証 |
| `pnpm audit` | CI のゲート。**意図的に `--prod` を付けない** |

**`pnpm audit` は `--prod` なしで CI に配線している。** ランタイム依存は `effect` 1 つだけなので、
`pnpm audit --prod` は "No known vulnerabilities" と出やすく、それは devDependencies 側の脆弱性に
ついて何も言っていない合格である。木全体を対象にすることで devDependencies の advisory も拾い、
見つかった場合は `pnpm-workspace.yaml` の `overrides` で該当の transitive package を固定する
（ゲートを黙らせるために対象を絞ることはしない）。

`pnpm` は `corepack` 経由で `package.json` の `packageManager` に記載したバージョンを使う。
コマンド実行には、テスト 10 秒、hook 10 秒、package 検証の各 subprocess 30〜180 秒という
用途別 timeout を設定している。無期限に待つ検証コマンドは追加しない。

## 性能ベンチマーク

性能変更の比較には `scripts/benchmark.mjs` を使う。ビルド済みの成果物を同じ実行環境で計測し、変更前後で同じコマンドを実行する。

```console
$ nix develop --command pnpm build
$ nix develop --command node scripts/benchmark.mjs
```

レジストリ参照、BlockState 構築、Chunk codec、Anvil snapshot codec、Anvil planning を対象に、各ケースの
`min` / `median` / `max` を JSON で出力する。各サンプルでは決定的なチェックサムも検証するため、チェックサムが一致しない計測結果は速度比較に使わない。
マシンや Node.js の条件が異なる計測値は直接比較せず、同一条件で複数回実行して中央値を見る。

このスクリプトは再現可能な開発用計測器であり、公開 API や npm package の実行経路には含めない。

## 3. テストの書き方

- `vitest` の native `it` に Effect をそのまま渡し、`Effect.runPromise` で実行する。
  `@effect/vitest` や独自 Adapter は使用しない。
  ```ts
  it('preserves the invariant', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(actual).toStrictEqual(expected)
    })),
  )
  ```
- 同じ不変条件を複数の値で確認するときは、型付き fixture と `for...of` / `map` でケースを表にし、
  テスト本体を一つの主張に保つ。テスト対象の実装詳細をテストごとに複製しない。
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

**カバレッジの4メトリクスすべてに100%の閾値を設定している。** 計測結果がどれか1つでも
下回れば `pnpm test:coverage` は失敗する。

実行対象は `src/index.ts` と `src/domain/**/*.ts` で、`src/domain/frame.ts` は型宣言だけの
実行文を持たないため計測対象から除外している。その契約は `test/clock-and-frame.test.ts` と
`pnpm typecheck` で検証する。これは未計測コードを隠す除外ではなく、V8 の 0% 表示による
見かけ上の分母を避けるための明示的な型専用境界である。

- `pnpm verify` は `scripts:check && typecheck && lint && test:coverage` を実行する
- CI は `pnpm verify` と `pnpm package:verify` を実行する
- カバレッジだけを再確認するときは `pnpm test:coverage` を単独で使える

カバレッジは完成判定の一部であり、空のテスト選択や生成物を読まないチェックを合格扱いにしない。
測定時は Vitest が実際にテストファイルとソースを読み込んだこと、4メトリクスの結果が閾値を満たすことを
確認する。`verify` がこのゲートを必ず通過するため、ローカルと CI の判定を分離しない。

## 5. 現時点の到達状況

実装済み:

- `pnpm verify` を基準に typecheck / lint / test / coverage を回す運用
- 能力フラグ監査と、それに対応する registry / property / support rule の実装
- `BlockType` 123 種の公開
- `ItemType` 186 種の公開
- `block-break-speed.test.ts` による硬度 lookup、道具倍率、効率、既定速度の公式式検証
- `Chunk` データ構造と codec、および round-trip test
- Anvil の決定的な計画・適用、および versioned snapshot codec
- Vitest 4 への移行（`@effect/vitest` 依存と `it.effect` API を削除）
- 座標・Anvil・語彙表の data / logic 分離と TypeScript の厳格な型検査
- `FrameServices` を `ClockPort` に固定した公開契約
- `pnpm build` による型付き ESM と declaration の生成
- Statements / Branches / Functions / Lines の100%カバレッジゲート
- `pnpm package:verify` による、実際に生成した tarball の `files` / `exports`、clean consumer の runtime import・declaration compile、`fixedClock` runtime の検証

現時点の残課題（公開運用・外部判断）:

- `0.4.0` が現在の公開版であり、`0.3.0` は version 検出方式の穴による履歴上のスキップである
  （経緯は [versioning.md](./versioning.md) §4）。
- 公開レジストリから取得した `0.4.0` tarball の install / import / runtime 検証は実施済みである。
  `pnpm package:verify` は引き続きローカル `pnpm pack` の tarball 境界を検証する。
- 1.0.0 へ昇格する maintainer 判断（下流の実消費後に行う）

したがって、内部品質ゲートと `0.4.0` の公開物検証は完了しているが、1.0.0 昇格はまだ宣言しない。

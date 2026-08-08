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

- `pnpm verify` は `typecheck && lint && test` のみを実行する
- カバレッジ確認が必要な変更では `pnpm test:coverage` を別途実行する
- 現在の運用は「計測はするが、Coverage threshold では fail させない」

カバレッジの扱いは完成判定ではなく運用ルールとして管理する。この文書では
「coverage をいつ gate にするか」ではなく、「いま何が自動で検証され、何が別実行か」を正として記録する。

## 5. 現時点の到達状況

実装済み:

- `pnpm verify` を基準に typecheck / lint / test を回す運用
- 能力フラグ監査と、それに対応する registry / property / support rule の実装
- `BlockType` 123 種の公開
- `ItemType` 173 種の公開
- `Chunk` データ構造と codec、および round-trip test
- `FrameServices` を `ClockPort` に固定した公開契約

未完了:

- カバレッジ threshold の導入
- build / publish パイプラインの整備

したがって、この文書は「完成済み」を宣言する場所ではなく、**現行の検証運用と未完了項目**を記録する場所として扱う。

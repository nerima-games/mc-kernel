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
| **Chunk データ構造とコーデックのラウンドトリップ** | **未実装** | — |

**Chunk はまだ存在しない。** plan.md §3.1 は `Chunk` データ構造とコーデックを kernel の主要 API に挙げているが、
現時点では未着手であり、したがってラウンドトリップテストも無い。完成条件には含まれる。

## 2. コマンド

```console
$ pnpm verify        # typecheck && lint && check:deps && test。CI と同じ内容
```

| コマンド | 内容 |
| --- | --- |
| `pnpm typecheck` | `tsconfig.build.json` と `tsconfig.test.json` の両方を型検査 |
| `pnpm lint` | oxlint（このリポジトリ唯一の lint / format 設定）。**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`oxlint.json` は 5 カテゴリすべてと個別 67 ルールが `warn`、`error` は 4 つだけ。このフラグが無かった頃は実質その 4 つしかゲートになっていなかった） |
| `pnpm check:deps` | 依存ホワイトリスト + 循環検査 + 壁時計直読み禁止 |
| `pnpm test` | vitest（`@effect/vitest` の `it.effect` が主 API） |
| `pnpm test:coverage` | カバレッジ計測（**閾値は未設定**、後述） |

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

**現在、閾値は設定していない。これは意図的である。**

- 参照実装（`takeokunn/ts-minecraft`）は branches / functions / lines / statements の全てに **99%** を強制している。
- しかし**スケルトンに閾値を課しても意味がない**。型定義だけのモジュールがいくつかあれば簡単に満たせてしまい、
  実装の品質について何も語らない数字になる。
- 計測とレポートは常に動かしている（`pnpm test:coverage`）ので、数字はいつでも見える。

**99% ゲートは完成条件に到達した時点で、`vitest.config.ts` と CI ワークフローの両方で有効化する。**
`vitest.config.ts` には有効化する行がコメントとして既に置いてある。

```typescript
// thresholds: { branches: 99, functions: 99, lines: 99, statements: 99 },
```

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
| 4 | `BlockType` 語彙が参照実装の 120 リテラルに追いついている | ❌（現在 18） |
| 4' | `ItemType` 語彙が存在する（plan.md §3.1） | ✅（`domain/item-type.ts`、16 種。埋めるのは加算的） |
| 5 | `Chunk` データ構造とコーデック + ラウンドトリップテスト | ❌（未着手） |
| 6 | `FrameServices` が縦切りスパイクで確定している | ✅（`ClockPort` のみ。[freeze-checklist.md](./freeze-checklist.md) (b)） |
| 7 | 99% カバレッジゲートが有効 | ❌（完成時に有効化） |
| 8 | API ロックファイル（公開 API のレポートを diff レビュー） | ✅（`api-lock.md` / `pnpm api:check`。ツール選定は [versioning.md](./versioning.md) §7） |

4 と 5 が終われば「下流が実際に使える kernel」になる。6 と 8 は 1.0.0 の前提であって完成の前提ではない
（区別は [freeze-checklist.md](./freeze-checklist.md) を参照）。6 も 8 も完了したので、1.0.0 側に残るのは
**8 が要求する「4 週間無変更」の経過待ち**だけである —— 導入は済み、あとは時間が経つ。

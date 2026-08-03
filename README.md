# @nerima-games/mc-kernel

## 責務

全リポジトリが共有する語彙（ブランデッド型・座標・ブロック能力モデル・フレーム契約・Clock Port）を定義する。

## 依存

なし。`effect` のみに依存し、`@nerima-games/*` のどのリポジトリにも依存しない。

これは設計上の制約であり、`pnpm check:deps` で機械的に強制されている
（`scripts/check-dependency-whitelist.ts` の `REPOSITORY_POLICY` が kernel の行を空集合として宣言している）。

## このリポジトリの位置づけ

4 階層アーキテクチャの最下層。**他の 15 リポジトリはすべて mc-kernel を import してよく、そういうリポジトリは kernel だけである。**
kernel は共有語彙そのものなので、どのリポジトリの依存許可リストにも書かずに import できる
（ただし `package.json` の `dependencies` への記載は必要）。

逆に kernel は他のどのリポジトリも import できない。すべてのリポジトリが kernel に依存する以上、
kernel が誰かに依存した時点で構造的に循環が生じるためである。

詳細は **[docs/architecture.md](./docs/architecture.md)**（全 16 リポジトリの依存グラフ、推移閉包禁止、
名詞/動詞ルール、kit の devDependency 専用ルール、stage 全順序の所有者）。

## ドキュメント

**[docs/README.md](./docs/README.md) が索引。**

| ドキュメント | 内容 |
| --- | --- |
| [docs/architecture.md](./docs/architecture.md) | 4 階層、全 16 リポジトリの依存グラフ、kernel が唯一の例外である理由 |
| [docs/responsibility.md](./docs/responsibility.md) | 責務と、**明示的な非スコープ**（サービス実装を持たない / ブロックテーブルを持たない 等） |
| [docs/public-api.md](./docs/public-api.md) | 公開 API 全体と、各横断型が**なぜ kernel にあるのか** |
| [docs/capability-flag-audit.md](./docs/capability-flag-audit.md) | **能力フラグ監査（一次資料・能力モデルの権威）** |
| [docs/design-notes.md](./docs/design-notes.md) | 参照実装の名指し判定散乱の実測、初日原則、「ブロック追加 = 1 行」不変条件 |
| [docs/testing.md](./docs/testing.md) | 検証要件・完成条件・99% カバレッジゲートの投入時期 |
| [docs/versioning.md](./docs/versioning.md) | 0.x → 1.0.0 方針、GitHub Packages、**加算的な能力追加がなぜ死活問題か** |
| [docs/freeze-checklist.md](./docs/freeze-checklist.md) | 1.0.0 凍結の前提条件（監査 ✅ / 縦切りスパイク ❌） |

## 依存ルール（16 リポジトリ共通）

| ルール | 内容 |
| --- | --- |
| ハード失敗 | 違反があれば CI は必ず非ゼロ終了する。警告で済ませない |
| 循環禁止 | 循環依存は一切許可しない。「co-evolution ペア」のような例外リストは設けない |
| 推移閉包の禁止 | A→B、B→C のとき A は C を import できない。依存は直接依存のみが import 許可を意味する |
| kernel は例外 | mc-kernel はどこからでも import 可。**これが唯一の例外** |
| 宣言と実体の一致 | import する `@nerima-games/*` は `package.json` に記載されていなければならない |
| mc-playground-kit は devDependency 専用 | `dependencies` に入れてはならない。実行時依存になると、出荷ビルドから入力処理が消える |
| 壁時計の直読み禁止 | 時刻はすべて注入された Clock Port から取得する |

`scripts/check-dependency-whitelist.ts` は 16 リポジトリ共通のテンプレートである。
姉妹リポジトリへ移植する際は、ファイル冒頭で囲ってある `REPOSITORY_POLICY` 定数だけを書き換えればよい。
それ以外の部分はそのままコピーする。

`REPOSITORY_POLICY.dependencyGraph` には **plan.md §2.1 の全 16 リポジトリ**が転記されている。
これにより、このリポジトリのコピーだけで組織全体の循環を検出でき、
推移閉包違反にも「なぜ違反なのか」の経路つきで説明できる。
`test/check-dependency-whitelist.test.ts` が roster の非循環性と各ルールを検査している。

### 壁時計直読み禁止の実装方法

oxlint 0.12 は `no-restricted-syntax` も `no-restricted-properties` も実装しておらず、
`no-restricted-globals` は `oxlint --rules` の一覧に出るものの実装されていない
（0.12.0 で実測確認済み。3 ルールすべてを設定した状態でも診断が 0 件）。

そのため禁止は **`scripts/check-dependency-whitelist.ts` 側で実装**している。
コメント・文字列リテラル・正規表現リテラルの中身はマスクされるので誤検知しない。

Clock Port の実装アダプタ自身だけは実クロックを読む必要があるため、
その行に `mc-kernel-allow-time-source` コメントを付けると除外される。

oxlint が該当ルールを実装したら .oxlintrc.json 側へ移す。

## 開発

### セットアップ

```console
$ direnv allow          # flake.nix の devShell で nodejs_24 + corepack が入る
$ pnpm install
```

Nix を使わない場合は Node.js 24 以上と pnpm 11（`corepack` 推奨）を用意する。

> **注意**: ツールチェーンは `devenv.nix` から `flake.nix` + `flake.lock` に移行済みである。
> `flake.lock` はコミットされているので、`nix develop`（`.envrc` は `use flake`）は
> 誰の手元でも同じ nixpkgs に解決される。`devenv.nix` / `devenv.lock` はもう存在しない。

### コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm typecheck` | `tsconfig.build.json` と `tsconfig.test.json` の両方を型検査 |
| `pnpm lint` | oxlint（このリポジトリ唯一の lint / format 設定。prettier も biome も .editorconfig も置かない）。**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`.oxlintrc.json` は 5 カテゴリすべてと個別 67 ルールが `warn`、`error` は 4 つだけ。このフラグが無かった頃は実質その 4 つしかゲートになっていなかった） |
| `pnpm lint:fix` | oxlint の自動修正 |
| `pnpm test` | vitest（`@effect/vitest` の `it.effect` が主 API） |
| `pnpm test:watch` | vitest watch |
| `pnpm test:coverage` | カバレッジ計測（閾値は未設定。[docs/testing.md](./docs/testing.md) §4） |
| `pnpm check:deps` | 依存ホワイトリスト + 循環検査 + 壁時計直読み禁止の検査 |
| `pnpm verify` | `typecheck && lint && check:deps && test`。CI と同じ内容 |

## 現状

- **ブロック能力モデルは監査に整合済み。** `docs/capability-flag-audit.md` の 28 能力のうち **24 実装 / 4 保留**。
  保留分は `PENDING_CAPABILITIES` に理由つきで記録され、テストが「実装済み + 保留 = 監査の 28」を検査している。
  plan.md §3.1 が boolean としていた 3 つ（`emissive` / `transparent` / `fluid`）は監査に従って
  `lightEmission: 0..15` / `opacity: 3 値` / `fluid: 'none'|'water'|'lava'` に修正済み。
  詳細は [docs/public-api.md](./docs/public-api.md) §4。
- **ブロックテーブルは同梱している**（`domain/block-registry.ts`）。もともとは「コンテンツなので持たない」方針だったが、
  チャンクバッファの 1 バイトから能力を引きたいリポジトリが依存グラフ上で互いに届かない 3 箇所に現れた時点で成立しなくなった。
  経緯と論拠は [docs/responsibility.md](./docs/responsibility.md) §3-2 と当該ファイルのヘッダにある。
- **`BlockType` は代表的な少数のみ**（18 / 参照実装は 120）。埋めるのは加算的な作業。
- **`ItemType` を公開した**（`domain/item-type.ts`、108 種。鉄防具 4 種とつるはし・クワ各 4 tier を含む）。plan.md §3.1 が挙げていながら
  書かれていなかった語彙で、欠落のあいだに mc-sim / mc-playground-kit / mx-ui がそれぞれ暫定の
  `type ItemId = string` を置いていた。`domain/block-item.ts` がブロック↔アイテムの橋
  （監査 §6-8 の `ItemType ∩ BlockType` を導出で解く）を、`dropOfBlockId` が
  「壊したブロックのバイト → インベントリに入るアイテム」を担う。
  詳細は [docs/public-api.md](./docs/public-api.md) §3-bis と §4-3。
- **`Chunk` データ構造と versioned codec は実装済み。** `domain/chunk.ts` の
  `Chunk` / `encodeChunk` / `decodeChunk` とラウンドトリップテストが所有する。
- **`FrameServices` は確定した — `ClockPort` だけ。** 縦切りスパイクを通した結果であり、プレースホルダではない。
  同じスパイクで `GameModule.frameStages` が配列から Effect になり、`RRegister` パラメータが増えた。
  [docs/freeze-checklist.md](./docs/freeze-checklist.md) (b) と
  [docs/public-api.md](./docs/public-api.md) §7 を参照。
- **ビルド／publish はまだない。** `exports` は TypeScript ソースを直接指している。
  GitHub Packages への publish パイプラインは完成条件到達時に追加し、それまで `version` は `0.x` に留める
  （[docs/versioning.md](./docs/versioning.md)）。
- **カバレッジ閾値は未設定。** 計測とレポートは常に動かしており、99% ゲートは完成条件到達時に有効化する。

## License

MIT

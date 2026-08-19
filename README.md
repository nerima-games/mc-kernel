# @nerima-games/mc-kernel

## 責務

全リポジトリが共有する語彙（ブランデッド型・座標・ブロック能力モデル・フレーム契約・Clock Port）を定義する。

## 依存

なし。`effect` のみに `peerDependencies` として依存し（理由は「現状」節参照）、
`@nerima-games/*` のどのリポジトリにも依存しない。

これは設計上の制約であり、`.oxlintrc.json` の `no-restricted-imports` と
`pnpm lint` の `--deny-warnings` で機械的に強制されている。

## このリポジトリの位置づけ

4 階層アーキテクチャの最下層。**他の 15 リポジトリはすべて mc-kernel を import してよく、そういうリポジトリは kernel だけである。**
kernel は共有語彙そのものなので、どのリポジトリの依存許可リストにも書かずに import できる
（ただし `package.json` の `dependencies` への記載は必要）。

逆に kernel は他のどのリポジトリも import できない。すべてのリポジトリが kernel に依存する以上、
kernel が誰かに依存した時点で構造的に循環が生じるためである。

実装は TypeScript の型と Effect のドメインロジックを中心に構成する。大きな語彙表は
`*-data.ts` に不変データとして置き、guard・変換・検証などの処理は別モジュールに分ける。
座標と Anvil の計画も責務ごとに分割し、公開 API は `src/index.ts` から明示的に再公開する。
プラットフォーム固有の Adapter 層は kernel に置かない。

詳細は **[docs/architecture.md](./docs/architecture.md)**（全 16 リポジトリの依存グラフ、推移閉包禁止、
名詞/動詞ルール、kit の devDependency 専用ルール、stage 全順序の所有者）。

## ドキュメント

**[docs/README.md](./docs/README.md) が索引。**

| ドキュメント | 内容 |
| --- | --- |
| [docs/architecture.md](./docs/architecture.md) | 4 階層、全 16 リポジトリの依存グラフ、kernel が唯一の例外である理由 |
| [docs/responsibility.md](./docs/responsibility.md) | 責務と、**明示的な非スコープ**（状態を持つサービス実装を置かない / renderer 固有資産を置かない 等） |
| [docs/public-api.md](./docs/public-api.md) | 公開 API 全体と、各横断型が**なぜ kernel にあるのか** |
| [docs/capability-flag-audit.md](./docs/capability-flag-audit.md) | **能力フラグ監査（一次資料・能力モデルの権威）** |
| [docs/design-notes.md](./docs/design-notes.md) | 参照実装の名指し判定散乱の実測、初日原則、「ブロック追加 = 1 行」不変条件 |
| [docs/testing.md](./docs/testing.md) | 検証要件・完成条件・100% カバレッジゲート |
| [docs/versioning.md](./docs/versioning.md) | 0.x → 1.0.0 方針、GitHub Packages、**加算的な能力追加がなぜ死活問題か** |
| [docs/freeze-checklist.md](./docs/freeze-checklist.md) | 1.0.0 凍結の前提条件と、公開前に残る項目 |

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

全 16 リポジトリの依存グラフは組織アーキテクチャの記録として
[docs/architecture.md](./docs/architecture.md) に残している。一方、各リポジトリに同じ
roster をコピーする旧来の実行スクリプトは廃止した。現在このリポジトリで機械的に検査する
境界は、`.oxlintrc.json` の `no-restricted-imports` と `package.json` の直接依存宣言である。
`pnpm lint` は `effect` と `@nerima-games/*` の内部実装への不正な import を拒否する。

組織全体の循環・推移閉包は組織側の依存グラフ管理で扱い、このリポジトリの lint は
ローカルな import 境界に集中させる。こうして、実際のソースと同じ場所にある検査だけが
現在の CI の品質ゲートになる。

### 壁時計直読み禁止の実装方法

devShell の oxlint（`nix develop --command oxlint --version` で確認できる）は
`no-restricted-syntax` も `no-restricted-properties` も `no-restricted-globals` も実装していない
（`oxlint --rules | grep no-restricted` が空を返すことで確認できる）。したがって
`Date.now()` / `new Date()` / `performance.now()` の禁止を oxlint の設定だけで
機械的に表現することはできない。

**そのぶんを ast-grep が担っている。** `sgconfig.yml` と `.ast-grep/rules/no-wall-clock-read.yml` が
`src/**/*.ts` に対する構造マッチのルールを定義し、`pnpm lint` は
`oxlint --deny-warnings src test && ast-grep scan` として両方を実行する。
**壁時計の直読みは oxlint の穴を埋める形で `pnpm lint` の一部として機械的にハード失敗するようになった。**
`flake.nix` の devShell は oxlint と同じ理由で `pkgs.ast-grep` も提供する
（実行可能ファイルのバージョンを再現可能な devShell 側に置く）。

**grep ではなく構造マッチである理由**: このリポジトリは壁時計禁止の理由をコード内コメントで
説明している（`src/domain/clock.ts` のヘッダなど）。テキスト検索はそのコメント自身を
違反として拾ってしまうが、ast-grep の AST パターンは実際の呼び出し式だけにマッチし、
コメントや文字列リテラル中の同じ文字列には反応しない。

Clock Port を実装するプラットフォーム・アダプタだけが実クロックを読んでよいが、
kernel はそのアダプタ自体を持たない。したがって `src/` 内の正しい壁時計直読み件数は常に 0 であり、
レビューではなくこのゲートがそれを保証する。ベンチマーク計測器（`scripts/benchmark.mjs`）は
`src/` の外にあり出荷経路に含まれないため対象外（[docs/testing.md](./docs/testing.md) 性能ベンチマーク節）。

oxlint が該当ルールを実装したときは、実測したバージョンと CI の出力を確認したうえで
`.oxlintrc.json` 側へ移し、`.ast-grep/rules/no-wall-clock-read.yml` を退役させる。

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
| `pnpm scripts:check` | 配布・ベンチマーク用 `.mjs` スクリプトを Node.js の構文検査に通す |
| `pnpm typecheck` | `tsconfig.build.json` と `tsconfig.test.json` の両方を型検査 |
| `pnpm lint` | oxlint と ast-grep（このリポジトリ唯一の lint / format 設定。prettier も biome も .editorconfig も置かない）。`oxlint --deny-warnings src test && ast-grep scan` として両方を実行する。oxlint は**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`.oxlintrc.json` は `correctness` / `suspicious` / `perf` / `restriction` の 4 カテゴリと個別ルールの大半を `warn` にし、`style` は無効化、`error` は少数だけ。このフラグが無かった頃は実質その `error` のルールしかゲートになっていなかった。`.oxlintrc.json` は JSONC なのでコメント行を除いてから数える必要がある。正確な内訳はそうやって `.oxlintrc.json` を参照）。ast-grep は oxlint が実装していない壁時計禁止を補う（下記） |
| `pnpm lint:fix` | oxlint の自動修正 |
| `pnpm test` | Vitest 4（Effect のテストは native `it` と `Effect.runPromise` を直接利用） |
| `pnpm test:watch` | vitest watch |
| `pnpm test:coverage` | カバレッジ計測（全メトリクス100%。[docs/testing.md](./docs/testing.md) §4） |
| `pnpm verify` | `scripts:check && typecheck && lint && test:coverage` |
| `pnpm package:verify` | `pnpm pack` の実体を clean consumer に install し、全 export、runtime、型付き declaration consumer を検査 |

## 現状

- **ブロック能力モデルは監査に整合済み。** `docs/capability-flag-audit.md` の 28 能力のうち **27 は kernel 実装 / 1 は下流所有**。
  下流所有の境界は `DOWNSTREAM_CAPABILITIES` に所有者と理由つきで記録され、テストが「実装済み + 下流所有 = 監査の 28」を検査している。
  plan.md §3.1 が boolean としていた 3 つ（`emissive` / `transparent` / `fluid`）は監査に従って
  `lightEmission: 0..15` / `opacity: 3 値` / `fluid: 'none'|'water'|'lava'` に修正済み。
  詳細は [docs/public-api.md](./docs/public-api.md) §4。
- **ブロックテーブルは同梱している**（`domain/block-registry.ts`）。もともとは「コンテンツなので持たない」方針だったが、
  チャンクバッファの 1 バイトから能力を引きたいリポジトリが依存グラフ上で互いに届かない 3 箇所に現れた時点で成立しなくなった。
  経緯と論拠は [docs/responsibility.md](./docs/responsibility.md) §3-2 と当該ファイルのヘッダにある。
- **`BlockType` とレジストリは 123 種を収録している。** 参照実装の 120 リテラルを基礎に、kernel が必要とする
  `soul_soil`、`wither_skeleton_skull`、`dropper` を加えた。追加時はリテラルだけでなくレジストリ行と能力を同時に定義する。
- **`ItemType` を公開した**（`domain/item-type.ts`、186 種。鉄防具 4 種とつるはし・シャベル・斧・クワ・剣の木/石/鉄/ダイヤ/金 tier を含む）。plan.md §3.1 が挙げていながら
  書かれていなかった語彙で、欠落のあいだに mc-sim / mc-playground-kit / mx-ui がそれぞれ暫定の
  `type ItemId = string` を置いていた。`domain/block-item.ts` がブロック↔アイテムの橋
  （監査 §6-8 の `ItemType ∩ BlockType` を導出で解く）を、`dropOfBlockId` が
  「壊したブロックのバイト → インベントリに入るアイテム」を担う。
  詳細は [docs/public-api.md](./docs/public-api.md) §3-bis と §4-3。
- **公式 `minecraft:tool` の順序付きルール解決と採掘時間計算を公開した**（`domain/tool-component.ts` / `domain/block-break-speed.ts`）。
  `speed`、`correct_for_drops`、`default_mining_speed`、`damage_per_block` を型付きの純粋 API で扱う。
  プレイヤー操作の進行状態、耐久の消費適用、ドロップ生成、サーバー権威判定は上位 gameplay の責務である。
- **`Chunk` データ構造と versioned codec は実装済み。** `domain/chunk.ts` の
  `Chunk` / `encodeChunk` / `decodeChunk` とラウンドトリップテストが所有する。
- **`FrameServices` は確定した — `ClockPort` だけ。** 縦切りスパイクを通した結果であり、プレースホルダではない。
  同じスパイクで `GameModule.frameStages` が配列から Effect になり、`RRegister` パラメータが増えた。
  [docs/freeze-checklist.md](./docs/freeze-checklist.md) (b) と
  [docs/public-api.md](./docs/public-api.md) §7 を参照。
- **型付き ESM ビルドは実装済み。** `pnpm build` が `dist/` に JavaScript と declaration を生成し、
  `main` / `types` / `exports` はビルド成果物を指す。`files` には `dist/` とリリースに必要なメタデータだけを含める。
- **データとロジックは分離している。** `block-type-data.ts` / `item-type-data.ts` は閉じた語彙表を保持し、
  `block-type.ts` / `item-type.ts` は型と外部入力用の runtime guard を提供する。座標は primitive・key・変換・幾何・近傍、
  Anvil は validation・transformation・orchestration に分割している。
- **実行環境は Nix flake を正本とする。** `flake.nix` / `flake.lock` と `package.json` の `engines` / `packageManager` が
  Node.js 24・pnpm 11・TypeScript 7 の境界を定義する。ASDF/asd や devenv の設定は置かず、環境定義を二重管理しない。
- **配布境界のローカル検証は実装済み。** `pnpm package:verify` は実際に生成した tarball の
  `exports` 対象・`files` 内容・clean consumer からの import・`fixedClock` runtime・型付き declaration consumer を検査し、
  CI でも実行する。`.github/workflows/release.yaml` は `main` で package version が変わったときだけ、
  verify・package boundary 検証後に GitHub Packages へ publish する。
- **GitHub Packages への実公開は行われており、現在の `version` は `0.4.0` である。**
  `0.3.0` は release workflow の version 検出方式の穴により公開されなかった履歴上の中間版であり、
  `0.4.0` は Node.js からロード可能な修正版として公開されている。公開レジストリから取得した
  `0.4.0` tarball の install / import / runtime 検証も [freeze-checklist.md](./docs/freeze-checklist.md) に記録済みである。
  `version` は下流の実消費とリリース判断が完了するまで `0.x` に留める
  （[docs/versioning.md](./docs/versioning.md)）。
- **`effect` は `peerDependencies` に置く。** kernel は `Context.Tag`（`ClockPort`）と Effect 値を
  export するため、消費側と同じ `effect` インスタンスでなければならない。これは消費側にとって
  破壊的変更である（`effect` を自前で宣言していない消費コードは壊れる）。詳細は
  [docs/versioning.md](./docs/versioning.md) §1-1。
- **カバレッジは全メトリクス100%を閾値にする。** `pnpm verify`（内部で `pnpm test:coverage` を実行）と CI のカバレッジゲートが
  Statements / Branches / Functions / Lines を検査する（[docs/testing.md](./docs/testing.md) §4）。

## License

MIT

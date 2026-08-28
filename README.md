# @nerima-games/mc-kernel

## 責務

全リポジトリが共有する語彙と純粋なドメインロジック（ブランデッド型・座標・ブロック能力モデル・ItemStack・プレイヤーインベントリ・レシピ・食料・調理・醸造・作物・ディメンション・石切台・鍛造・砥石・昼夜・天候・飛翔体・フレーム契約・Clock Port）を定義する。

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

実装は TypeScript の型と Effect のドメインロジックを中心に構成する。ItemStack、レシピ、食料、調理、醸造、石切台、鍛造、砥石も入力値から出力値を求める純粋関数として公開する。大きな語彙表は
`*-data.ts` に不変データとして置き、guard・変換・検証などの処理は別モジュールに分ける。
座標、Anvil、砥石の計画も責務ごとに分割し、公開 API は `src/index.ts` から明示的に再公開する。
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

**そのぶんを ast-grep が担っている。** `sgconfig.yml` と `.ast-grep/rules/` 以下のルールが
`src/**/*.ts` / `test/**/*.ts` に対する構造マッチを定義し、`pnpm lint` は
`oxlint --deny-warnings src test && ast-grep scan` として両方を実行する。
**壁時計の直読みは oxlint の穴を埋める形で `pnpm lint` の一部として機械的にハード失敗するようになった。**
`flake.nix` の devShell は oxlint と同じ理由で `pkgs.ast-grep` も提供する
（実行可能ファイルのバージョンを再現可能な devShell 側に置く）。

型安全性も同じ構造ゲートで検査する。`.ast-grep/rules/no-type-assertion.yml` は
`src/` と `test/` の `as const` 以外の型アサーション、`<型>値` 形式の型アサーション、
non-null assertion を拒否する。外部値は `unknown` のまま guard または検証済みコンストラクタを
通し、型をアサーションで偽装しない。

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
| `pnpm lint` | oxlint と ast-grep（このリポジトリ唯一の lint / format 設定。prettier も biome も .editorconfig も置かない）。`oxlint --deny-warnings src test && ast-grep scan` として両方を実行する。oxlint は**`--deny-warnings` 付きで走る**ため、`warn` のルールもビルドを落とす（`.oxlintrc.json` は `correctness` / `suspicious` / `perf` / `restriction` の 4 カテゴリと個別ルールの大半を `warn` にし、`style` は無効化、`error` は少数だけ。このフラグが無かった頃は実質その `error` のルールしかゲートになっていなかった。`.oxlintrc.json` は JSONC なのでコメント行を除いてから数える必要がある。正確な内訳はそうやって `.oxlintrc.json` を参照）。ast-grep は oxlint が実装していない壁時計禁止と型アサーション禁止を補う（下記） |
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
- **`ItemType` を公開した**（`domain/item-type.ts`、205 種。鉄防具 4 種とつるはし・シャベル・斧・クワ・剣の木/石/鉄/ダイヤ/金/ネザライト tier、鍛造素材・テンプレート・防具、紙を含む）。plan.md §3.1 が挙げていながら
  書かれていなかった語彙で、欠落のあいだに mc-sim / mc-playground-kit / mx-ui がそれぞれ暫定の
  `type ItemId = string` を置いていた。`domain/block-item.ts` がブロック↔アイテムの橋
  （監査 §6-8 の `ItemType ∩ BlockType` を導出で解く）を、`dropOfBlockId` が
  「壊したブロックのバイト → インベントリに入るアイテム」を担う。
  詳細は [docs/public-api.md](./docs/public-api.md) §3-bis と §4-3。
- **`ItemStack` と shaped / shapeless レシピを公開した**（`domain/item-stack.ts` / `domain/recipe.ts`）。数量・スタック上限、3×3 grid、item/tag 材料、station tag、priority、対称形を純粋な値検証と照合で扱う。`VANILLA_CRAFTING_RECIPES` は kernel が同梱する対応済み公式データ表であり、全エディション・全バージョンの完全な registry を意味しない。
- **ブロック相互作用の純粋な判定を公開した**（`domain/block-interaction.ts`）。破壊の不破壊判定と deterministic drop、置換可能セル、support rule に基づく設置判定、placeable item から block への canonical bridge をまとめる。ワールド変更、採掘時間、衝突、インベントリ消費、イベント発火は上位層の責務である。
- **プレイヤーインベントリの純粋な値操作を公開した**（`domain/inventory.ts`）。36 スロットの `Inventory` に対する追加、指定スロット／指定アイテムの除去、集計、空判定と、`unknown` の保存値を検証する `normaliseInventory` を扱う。搬送サービス、所有権、コンテナ状態、ゲームプレイ統合は上位層の責務である。
- **プレイヤーインベントリのホットバー投影を公開した**（`domain/hotbar.ts`）。9 スロットの選択範囲、インベントリ上の開始位置、外部選択値の clamp、循環移動、インベントリスロットへの投影を純粋な計算として扱う。選択状態、入力デバイス、UI、サービスの所有は上位層の責務である。
- **調理と醸造を公開した**（`domain/smelting.ts` / `domain/brewing.ts`）。furnace 系 3 station の燃料・出力容量・調理時間と、3 本の bottle slot・blaze powder・20 秒の醸造時間を、搬送や UI を含まない値ベースの状態遷移として扱う。
- **食料のデータと摂取ロジックを公開した**（`domain/food-data.ts` / `domain/food.ts`）。栄養値、満腹度、食用条件、食後効果、食器への変換を、プレイヤー状態と ItemStack から返す純粋な結果として扱う。
- **ディメンションと作物の純粋モデルを公開した**（`domain/dimension.ts` / `domain/crop.ts`）。Overworld・Nether・End の閉じた語彙、作物の土壌・ディメンション適合、成熟、経過時間による成長、骨粉による成長、成熟時の保証ドロップ、保存用 crop snapshot の厳格な検証を扱う。ワールド更新、ランダム tick、ブロック変更、収穫イベントは上位層の責務である。
- **石切台を公開した**（`domain/stonecutting.ts`）。現行の ItemType roster で実証できる石切台レシピを、exact/tag ingredient、priority、入力消費、station 境界付きの純粋な照合・適用として扱う。対応済み公式データ表は全エディション・全バージョンの完全な registry を意味しない。
- **鍛造を公開した**（`domain/smithing.ts`）。公式の netherite transform と trim recipe の型・tag・入力検証・結果適用を、搬送や UI を含まない値ベースの変換として扱う。
- **砥石を公開した**（`domain/grindstone.ts` / `domain/grindstone-data.ts`）。単体除去、二入力修理、通常エンチャント除去、呪い保持、エンチャント本の本変換、耐久回復、スタック制約、経験値コストを純粋な計画として扱う。
- **昼夜と天候の純粋モデルを公開した**（`domain/time-of-day.ts` / `domain/weather.ts`）。`TimeState` / `WeatherState` の境界検証・正規化と、昼夜の進行・時刻設定・月齢・昼夜判定を kernel が所有する。状態サービス、カウントダウン、ゲームループは上位層の責務である。
- **プレイヤー vitals の純粋モデルを公開した**（`domain/vitals.ts`）。体力・飢餓・飽和・経験値・リスポーン・外部入力の検証と UI 向け表示変換を、状態サービスやタイマーから分離して kernel が所有する。
- **カメラ姿勢の純粋モデルを公開した**（`domain/camera-pose.ts`）。`PlayerPose` の pitch clamp、look 更新、eye-level snapshot、forward vector を `CameraPoseSnapshot` と分離し、姿勢の所有と renderer mirror は上位層に残す。
- **Arrow の純粋な弾道モデルを公開した**（`domain/projectile.ts` / `domain/projectile-collision.ts`）。重力、空気・水中 drag、寿命、射手 grace、ワールド境界、ブロック/Entity の連続 AABB 衝突を値遷移として扱う。Entity 更新、ブロック変更、ダメージ適用、イベント dispatch は上位層の責務である。
- **爆発と着火済み TNT の純粋モデルを公開した**（`domain/explosion.ts` / `domain/primed-tnt.ts`）。抵抗・遮蔽・Entity exposure・ノックバックを有限上限付きの決定論的な爆発計画へまとめ、TNT の fuse 進行と detonation を同じ計画境界で扱う。ブロック変更、ダメージ適用、Entity の生成・削除、イベント dispatch は上位層の責務である。
- **Java Edition の公式 `minecraft:tool` と Bedrock Edition の採掘 component を公開した**（`domain/tool-component.ts` / `domain/block-break-speed.ts` / `domain/bedrock-mining.ts`）。
  Java の `speed`、`correct_for_drops`、`default_mining_speed`、`damage_per_block`、`can_destroy_blocks_in_creative` と、Bedrock の
  `minecraft:digger` / `minecraft:destructible_by_mining` を、それぞれの仕様に沿った型付きの純粋 API で扱う。
  Java と Bedrock の契約は同じ型へ暗黙変換せず、Bedrock API は root と `domain/bedrock-mining` subpath から公開する。
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
  Anvil は validation・transformation・orchestration、砥石は data・pure plan に分割している。
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

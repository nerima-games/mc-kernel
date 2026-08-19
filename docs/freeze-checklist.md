# API 凍結チェックリスト（1.0.0 の前提条件）

mc-kernel の公開 API を `1.0.0` として凍結する前に満たすべき条件。
**(a) (b) (b') は現行の内部品質ゲートで満たしている。** (c) の下流実消費は、
`mc-dev-meta` workspace で過去に実行した `pnpm check:repoint` の結果を下記に記録している。
このリポジトリ単独で現在再実行できる検査ではないため、公開物の現在の境界は
`pnpm package:verify` として別途検証する（clean consumer の runtime import と declaration compile を含む）。
型検査・lint・test・release build・4メトリクスの100%カバレッジという内部品質ゲートも満たしている。
**GitHub Packages への実 publish は行われており、現在の最新は `0.4.0` である。**
`0.3.0` は release workflow の version 検出方式の穴により publish されないまま飛ばされた。
経緯は [versioning.md](./versioning.md) §1 / §4 を参照。

### 公開レジストリからの install 検証を実施した結果 —— `0.4.0` 未満の公開物は壊れている

本書は長らくこの検証を「未実施」として残していた。実施したところ、**当時公開されていた
パッケージはいずれも Node から import できない**ことが判明した。
**`0.4.0` がこれを直した最初の版である**（下記チェックリスト）。以下はその経緯の記録である。

空のプロジェクトに `npm install @nerima-games/mc-kernel@0.2.18` して import すると、Node は
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` で失敗する。公開されている `package.json` は

```json
{ "main": "./src/index.ts", "types": "./src/index.ts", "exports": { ".": "./src/index.ts" },
  "files": ["src", "tsconfig.base.json", "LICENSE", "README.md"] }
```

であり、**生の TypeScript を出荷していて `dist` を含まず、subpath export も存在しない**。
`@nerima-games/mc-kernel/domain/chunk` は `exports` に定義が無いと報告される。

19 バージョンすべてが、型付き ESM ビルドを導入したコミットより前のものである。つまり
**修正は既にこのリポジトリにあるが、一度も公開されていない** —— publish できたはずの
バージョン変更が、上記の version 検出の穴によって publish されなかったためである。

**`pnpm package:verify` はこれを検出できない。** あのゲートは作業ツリーから tarball を pack して
検査するので、これから出荷する manifest は見るが、**既にレジストリに乗っている manifest は見ない**。
公開物が壊れたままでもローカルのゲートは緑になる。これを見つける検査は型検査ではなく、
レジストリからの install → 実際の import → runtime 呼び出しである。

**この判定に自動ゲートは存在しない。** 以前は「`api-lock.md` が 4 週間無変更であること」という
日数計測ベースの自動ゲートを最後の関門としていたが、`api-lock.md` / `scripts/api-lock.ts` /
`pnpm api:check` はいずれも org 標準の変更により削除された
（[API_STANDARD.md §4](https://github.com/nerima-games/.github/blob/main/API_STANDARD.md#4-自動-apiロックスナップショットツールは使わない)）。
1.0.0 への昇格は、計測期間や自動判定に代えて **maintainer（take）の裁量判断のみ**で行う
（[RELEASE_STANDARD.md §4.2](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#42-新しい昇格ポリシー人間による裁量判断)）。
**機械的に検証できる前提条件はすべて満たされ、検証済みである。**
公開レジストリからの install 検証も実施済みで、`0.4.0` がそれに合格している（下記）。

**そのうえで maintainer は `0.x` に留まる判断を下した。** これは未達の品質条件ではなく、
**下された決定**である。理由は品質ではなく証拠の広さで、詳細は下記チェックリストの最終項目にある。

凍結が特別扱いされる理由は [versioning.md](./versioning.md) §5 にある。
kernel は 14 リポジトリからピン留めされ、破壊的変更は深さ 5 の republish カスケードを起こす。
「あとで直せばいい」が最も効かない場所である。

## 前提条件

### (a) 能力フラグ監査の完了 — ✅ 完了

**成果物**: [`docs/capability-flag-audit.md`](./capability-flag-audit.md)

参照実装 `takeokunn/ts-minecraft` を ripgrep で実測し、必要な能力集合を確定した。

判明したこと:

- 必要な能力は **28**（監査 §3 の表。§7 の本文は「26」と書いており、これは監査内部の不整合）。
  plan.md §3.1 + §3.12 が挙げていたのは 7 つで、**21 が欠落**していた。
- plan.md が挙げた 7 つのうち **3 つは型が誤っていた**
  （`emissive` は 0..15 の数値、`transparent` は 3 値、`fluid` は 3 値）。
- 「非固体」概念が 5 箇所で異なるメンバーシップで重複していた（監査 §4.9）。1 つの `solid` に潰すと必ず退行する。
- `properties.solid` と `faces` は production で **0 回**しか読まれていない。移植しない。
- フラグに還元できない残余が 10 種類ある（監査 §6）。kernel には置かず体験モジュールに残す。

kernel での対応状況: **27 実装 / 1 下流所有**。下流所有 1 件は
`DOWNSTREAM_CAPABILITIES` に所有者と理由つきで記録され、`test/block-definition.test.ts` が
「実装済み + 下流所有 = 監査の 28」を機械的に検査している。`textureTiles` は renderer の
アトラス・面別 tile 割当・画像 asset に属するため、kernel の block property には置かない。
（`supportRule` は実装済み —— 監査 §4.6.1、`domain/block-support.ts`）

なお、監査が完了したことは「能力集合が凍結できる」を意味するが、当時は
**「ブロックテーブルが完成した」は意味しなかった**。現在は registry も完成し、
`BlockType` 語彙は **123 / 123** に達している（[testing.md](./testing.md) §5 条件 4）。
この 123 行は参照実装の 120 リテラルに、kernel で必要な 3 行を加えたものである。
旧段落が「120 中 18」と言い続けていたのは、状態を 2 箇所に書いた文書の常で、
片方だけが更新されたためである。

### (b) 縦切りスパイクによる契約形状の検証 — ✅ 完了

**要件**: 使い捨ての縦切りスパイクを

```
mc-kernel → mc-physics → mc-worldgen → mc-sim → mc-render → mx-gameplay
```

に 1 本通し、**実際の消費者を相手にして** `GameModule` / `StageRegistration` / `FrameServices` の契約形状を検証すること。

「使い捨て」であることが重要。成果物はスパイクのコードではなく、
**契約型がどう変わるべきかという知見**である。スパイクを本実装に育てようとすると、
検証のために切った手抜きが本実装に残る。

#### 検証すべき問い — 全 6 件の答え

| # | 問い | スパイクの答え |
| --- | --- | --- |
| 1 | `FrameServices` に何が入るか | **`ClockPort` だけ。確定。** 下記 |
| 2 | `StageRegistration.after` が存在しない stage を指したときの扱い | エッジ無しとして扱う。**強制はしない / 両方を報告する。** 下記 |
| 3 | `run` のエラーチャネルが `never` で足りるか | **足りる。** フレームレベルの回復策が存在しないため変更なし |
| 4 | `GameModule<ROut, E, RIn>` の 3 パラメータで足りるか | **足りない。** `RRegister` を追加した。下記 |
| 5 | stage が「今フレームの入力」をどう受け取るか | **登録時に `InputService` を取得して閉じ込める。** `FrameServices` にも `run` の引数にも入れない |
| 6 | チャンクダーティ通知が stage 契約に必要か | **不要。ただし所有者は `mc-sim` ではなく `mc-worldgen` になった。** 下記 |

#### 質問 6 の補足 —— plan.md §3.8 の記述は成立しない

本書の初版は「plan.md §3.8 どおり `mc-sim` の API のまま」と書いていた。**それは実装できない。**

§3.8 はチャンクダーティ通知を mc-sim の公開 API に挙げているが、§3.7 は
チャンクのライフサイクル管理・ライトグリッド・チャンクのセーブ形式を mc-worldgen に
与えている。フラグを持つのは worldgen、公開するのは sim、という分担にすると:

- worldgen は sim を呼べない（§2.1 のエッジは `sim → worldgen`。逆向きは循環）
- したがって sim は毎フレーム全ロード済みチャンクをポーリングするしかない
- それは §3.11 が落下ブロックについて記録した O(chunks × blocks) の失敗そのもので、
  `mc-render/docs/public-api.md` §3.3 が名指しで棄却している設計である

そこで**チャンネルはフラグと同じ場所に置いた** —— `mc-worldgen` の `ChunkStore` が
`subscribeDirty` を公開し、`mc-render` は §2.1 に既にある `render → worldgen` の
エッジ越しに購読する。stage 契約は変わらないので、この表の答え（不要）は変わらない。

**ここは人間が追認してよい箇所である。** 根拠と代替案の対照表は
`mc-worldgen/docs/public-api.md` §6-2 にある。

#### `FrameServices` は確定した — `ClockPort` だけ

`domain/frame.ts`:

```typescript
export type FrameServices = ClockPort
```

**プレースホルダではなくなった。**

素朴に数えると和はもっと大きい。実際に 1 本通したい stage 群
（入力サンプリング / physics / interactions / カメラミラー / チャンク同期 / 描画）を辿ると

```
ClockPort | PlayerService | InventoryService | InputService | FrameInput | BlockStore | RenderTarget
```

が出てくる。これを別名にすると kernel が `mc-sim` と `mc-render` を import しなければ名前を書けず、
tier モデル（plan.md §2.2）が禁じている。

**しかしこの和は `frameStages` が値だったことの副産物だった。** #4 を直すと崩れる（下記）。
崩れた後に残るのは「毎フレーム解決し直さなければならないサービス」だけで、実測するとそれは時計だけだった。

決め手は `mc-sim` の `PlayerServiceApi.cameraPose`（`mc-sim/application/player-service.ts:35`）:

```typescript
readonly cameraPose: Effect.Effect<CameraPoseSnapshot, never, ClockPort>
```

要求は**メソッド側**に付いていて、`PlayerService` の取得側には付いていない。
登録時にサービスを掴んだ stage は、1 フレーム後にそのメソッドを呼ぶ時点で `ClockPort` を必要とし、それ以外は必要としない。
他の候補はすべて逆の性質だった — 一度取得すれば残余要求は無い。

stage は時間を読まずに進めず、かつグローバルから読んではならない（plan.md §5.1-3）ので、`never` も候補ではなかった。

**この別名を広げるのは stage の *提供者*（ランタイムを組む人）にとって破壊的変更である**
（stage の *著者* にとってはそうではない）。ここで凍結する。
`test/clock-and-frame.test.ts` の
`FrameServices is exactly ClockPort — the frozen answer, not a placeholder`
が両方向の `Exclude` で等式としてピン留めしている。

#### `frameStages` は Effect になった（#4）

```typescript
interface GameModule<ROut, E, RIn, RRegister = never> {
  readonly layers: Layer.Layer<ROut, E, RIn>
  readonly frameStages: Effect.Effect<ReadonlyArray<StageRegistration>, never, RRegister>
}
```

配列は**値**なので文脈が無い。モジュールが stage を組み立てるためにサービスを取得できる瞬間が存在せず、
残る唯一の経路が `run` だったので、上の巨大な和が生まれていた。

徴候はスパイク以前からロスターに出ていた。`mx-gameplay/stages/registration.ts` は
`makeGameplayStages: Effect.Effect<ReadonlyArray<StageRegistration>>` を公開し、
「サービス集合 `RIn` に名前が付けられないので、これはまだ `GameModule` ではない」と書いていた。
mc-sim が公開されても解決しない。**配列が原因だった。**

`RRegister` を `RIn` と分けた理由は登録時文脈と Layer 構築時文脈が実測で別集合だったからで、
両方向の反例は [public-api.md](./public-api.md) §7 に書いてある。既定値 `never` により、
「stage の構築に何も要らない」通常のモジュールは 3 パラメータのままで書ける。

#### ダングリングエッジの扱い（#2）

**何も強制せず、両方を報告する。**
ダングリングエッジは「input があるなら input の後」を表明する正規の手段なので、拒否するとその語法が消える。
一方で、落ちたエッジも、フレーム骨格が知らない stage（`priorityOf` が `MAX_SAFE_INTEGER` を返し、フレーム末尾に落ちる）も、
失敗地点では誤字と区別がつかない。
`mc-compose` の `StageOrderPlan` が `dangling` と `unmatchedPhase` の両方を運び、
`ComposedGame.warnings` としてホストに見える形にしてある。

#### なぜ実消費者が必要なのか

契約型は「書けること」ではなく「**書きたくなること**」で評価される。
kernel 内のテストは kernel の想定どおりの stage しか書かないので、契約の欠陥が現れない。

参照実装が残した教訓（plan.md §3.8）がまさにこれで、
「THREE カメラが正でシミュレーションが描画から視線を読む逆転構造」は、
どちらのモジュールも単体では正しく見え、束ねて初めて逆転が見える種類の欠陥だった。

### (c) 下流実消費 — ✅ 過去検証済み（経緯は残す）

**要件**: 下流リポジトリが少なくとも 1 つ、実際に kernel を消費して契約を確認していること
([versioning.md](./versioning.md) §2)。

これは 2026-07-27 に `mc-dev-meta` workspace 上で**初めて機械的に測定された**記録である。
この作業では外部 workspace を再取得していないため、以下はその時点の結果として扱う。
測定手段は mc-dev-meta の `pnpm check:repoint` で、各ミラーのヘッダが約束している当の操作 —
**ミラーファイルを消し、import を `@nerima-games/mc-kernel` に張り替え、`tsc` を走らせる** —
を使い捨てコピーに対して実行する
(`mc-dev-meta/docs/testing.md` §6.1、`mc-dev-meta/domain/repoint-plan.ts`)。

**初回の結果: 3 リポジトリすべてで張り替えがコンパイルを通らなかった。** 合計 17 件。
**その測定時点では 17 件すべて修正済みで、`pnpm check:repoint` は緑、
`KNOWN_REPOINT_FINDINGS` は空であった。**
以下の分析は、何が起きたかの記録として残す —— 結論より経路のほうが再利用できるからである。

| 下流 | shipped source (`tsconfig.build.json`) | test / preview |
| --- | --- | --- |
| mx-gameplay | **0 件 — 通る** | 11 件 |
| mx-ui | **0 件 — 通る** | 3 件 |
| mx-redstone | **0 件 — 通る** | 3 件 |

原因は 1 つで、17 件はその 1 つが 3 リポジトリに転記されたものである。
各ミラーの `domain/frame-contract.ts` は

```typescript
export type FrameServices = never
```

と宣言していて、kernel は `ClockPort` である。
各ミラーのヘッダはこの差異を「前方互換な意図的乖離」と説明していて、**その説明は正しい** ——
stage の**著者**については。実際 shipped source は 3 つとも 0 件で通る。

正しくないのは、そこで話が終わると読めることである。
`StageRegistration` を受け取って `run(dt)` を**実行する**側では代入可能性が逆に働き、
caller が用意していない `ClockPort` を要求されるようになる。
3 リポジトリともそういうコードを自前のテストハーネスとプレビューアプリに持っており、
17 件はすべてそこに出た。

**本書は既にこれを散文で予告していた** —— 上の `FrameServices` 節の
「この別名を広げるのは stage の *提供者*(ランタイムを組む人)にとって破壊的変更である」。
予告されていたが誰もコンパイラを走らせていなかったので、**規模が分かっていなかった**。
そして `pnpm check:mirrors` は 3 つとも「一致」と報告し続けていた ——
形としては実際に一致しているからである。形の一致は張り替えが通る必要条件であって十分条件ではない。

#### この項目を ✅ にするために必要なこと

**ミラーを直すのではない。** `FrameServices = never` は kernel が未公開である限り正しい選択である
(`ClockPort` をローカルに再宣言すると kernel と同じ識別子文字列を持つ 2 つ目の `Context.Tag` ができ、
それは狭すぎる型よりはるかに悪い欠陥になる)。必要なのは下流側の**stage 実行コード**が
`ClockPort` を供給するようになることで、対象は各リポジトリのテストハーネスとプレビューアプリだけ、
shipped source は 1 行も要らない。作業内容は
`mc-dev-meta/domain/repoint-plan.ts` の `KNOWN_REPOINT_FINDINGS` に
所有者と修正内容つきで 8 エントリとして記録されている。

**それは landing し、`pnpm check:repoint` は緑になった。** 修正は 3 リポジトリの
テストコンテキストが `ClockPort` を供給するようにしたもので、shipped source は 1 行も変わっていない。
**ただし下記の但し書きつきである。**

#### ✅ になったときに、それが主張しないこと

`check:repoint` が緑であることは、**publish されたパッケージを install した検証を兼ねない**。

- 検証される: モジュール解決、`package.json#exports` マップ、`types` フィールド、
  バレルの再 export 形状、そして**全消費箇所での型の同一性**。
  張り替え先は `repos/` 内の実ディレクトリで、`exports` 経由で解決される。
- 追加で検証される: `pnpm package:verify` は実際に tarball を作り、`files` の内容、`exports` の全 target、
  clean consumer からの runtime import、declaration compile、`fixedClock` の runtime を確認する。これにより、生成物を読まない
  workspace の張り替えだけでは見つからないローカルの packaging 欠落を検出できる。
- `check:repoint` だけでは検証されない: **公開レジストリから取得した tarball の install。**
  これは本書冒頭で別途実施し、`0.4.0` は install / import / runtime に合格した。
  `0.4.0` より前の公開物が Node から import できないことも判明しており、ローカルの
  workspace 張り替えだけではこの差を見つけられない。
- 検証されない: **振る舞い。** これは typecheck である。
  互いに型が付いたまま、関数の意味について食い違う 2 つのモジュールはありうる。

## 凍結してよいと判断できる状態

- [x] (a) 能力フラグ監査が完了している
- [x] (b) 縦切りスパイクが `GameModule` / `StageRegistration` / `FrameServices` を実消費者で検証している
- [x] (b') その結果 `FrameServices` が確定し、プレースホルダである旨のコメントが消えている
- [x] 内部の完成条件（[testing.md](./testing.md) §5 の typecheck / lint / test / build / coverage）を満たしている
- [x] GitHub Packages の release workflow と、生成 tarball の `files` / `exports` / clean consumer runtime / declaration compile / runtime ゲートが用意されている
- [x] GitHub Packages への実 publish を行っている（`0.2.0`〜`0.2.18` の 19 バージョン。[versioning.md](./versioning.md) §1）
- [x] 公開レジストリから取得した tarball の install 検証を実施した（`pnpm package:verify` はローカル
      `pnpm pack` の tarball のみを見ており、この検証を代替しない）
- [x] **その検証に合格する版が公開されている** —— `0.4.0`。公開後にレジストリから install し直して
      確認した: root import が 158 export を解決し、`domain/block-registry` と `domain/chunk` の
      両 subpath も解決し、`fixedClock` / Chunk コーデックのラウンドトリップ / 座標変換が実際に動く。
      公開された manifest は `main: ./dist/index.js`、`exports` は 3 target、
      `peerDependencies` に `effect`。
      **これ以前の 19 バージョンはいずれも Node から import できない**（本書冒頭）。
- [x] 1.0.0 へ昇格する maintainer 判断が完了している —— **判断は「まだ切らない」であった。**

      機械的に検証できる条件がすべて満たされた状態で問うたうえでの結論であり、
      **品質の不足ではなく証拠の広さの問題である。** 実際の公開物での下流消費が確認できたのは
      **1 リポジトリの出荷ソースのみ**（`mx-ui`。ミラーを削除し公開 `0.4.0` へ張り替えて
      `tsc` が通り、実行時 import も成功し、`effect` は単一インスタンスに解決された）。
      残り 14 リポジトリは未確認で、`mx-ui` 自身のテストプロジェクトも
      `FrameServices = ClockPort` に追随していないため型検査を通らない（この作業の所有者は下流側）。

      1.0.0 は API を凍結し、以降の破壊的変更は深さ 5 の republish カスケードを伴う。
      **その代金を払う前に証拠を買う**、という判断である。

      **したがってこの項目は「未着手の作業」ではない。** 1.0.0 を進めるために
      mc-kernel 側でできることは残っていない。答えを変える条件は下流の吸収 ——
      各リポジトリが `0.4.0` にピンを上げ、ローカルのミラーを削除し、
      テストハーネスで `ClockPort` を供給すること —— であり、作業対象は下流リポジトリである。
- [x] 下流リポジトリが少なくとも 1 つ、実際に kernel を消費して契約を確認している（[versioning.md](./versioning.md) §2）
      — **3 リポジトリ（mx-gameplay / mx-ui / mx-redstone）で、ミラーを削除し import を
      `@nerima-games/mc-kernel` に張り替え、各リポジトリが宣言する全プロジェクトを実際に
      `tsc` に通してある。** ゲートは mc-dev-meta の `pnpm check:repoint`。(c) の 17 件は
      すべて修正済みで、`KNOWN_REPOINT_FINDINGS` は空である。

      **このチェックが主張していないこと**（過大なチェックは未チェックより悪い。
      1.0.0 を切る日に読まれるのはこの行だからである）:

| 検証済み | 未検証 |
| --- | --- |
| ミラー削除後に import が解決すること | `0.4.0` より前の公開パッケージの **install** |
| `exports` / `types` フィールド、`pnpm package:verify` による実 tarball の `files` / export target / clean install / runtime、公開 `0.4.0` の install / import / runtime | `0.4.0` より前の公開 tarball の **install** |
| 3 リポジトリの build / test / preview 全プロジェクトの型検査 | 実行時の挙動（`tsc` であって `vitest` ではない） |

workspace の張り替えは publish の**リハーサルであって publish ではない**。
ただし、現在は `0.4.0` の公開物検証を別途実施しており、`pnpm package:verify` は
`files` の欠落をローカル tarball 上で検出する。

**(歴史的経緯)** かつて plan.md §9 は「API ロックファイルのツール選定（api-extractor 相当の
Effect-TS 互換手段）」を未決事項として挙げていた。`@microsoft/api-extractor` は mc-kernel の実コードで
試したうえで却下され（api-extractor は `ClockPort` の Tag 識別子文字列をレポートに載せず、これを
改名してもレポートがバイト単位で同一のままだったため。詳細は [versioning.md](./versioning.md) §7-1
に記録として残っている）、代わりに自前の `scripts/api-lock.ts` を採用し、`api-lock.md` が
4 週間無変更であることを 1.0.0 昇格の自動ゲートとしていた。

**この自動ゲート（および `api-lock.md` / `scripts/api-lock.ts` 自体）は org 標準の変更により削除済みである。**
1.0.0 への昇格は日数計測を伴わず、[RELEASE_STANDARD.md §4.2](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#42-新しい昇格ポリシー人間による裁量判断)
が定めるとおり maintainer（take）の裁量判断のみで行う。内部品質の完成条件・下流実消費・公開レジストリからの
`0.4.0` install 検証は満たしている。1.0.0 への昇格はまだ宣言していない。

> **(歴史的経緯) 計測は過去に一度リセットされたことがある。** アイテム語彙の投入
> （`domain/item-type.ts` / `domain/block-item.ts`、`BlockDropRule.item` の型変更、
> `dropOfBlockId` の追加）で `api-lock.md` が動き、当時運用していた「4 週間無変更」の
> 計測がそのコミットから数え直しになった。
>
> それを承知でやった判断の理由は 3 つあり、これは自動ゲートの有無に関わらず今も参考になる。
>
> 1. plan.md §3.1 は kernel の公開 API に 「`BlockType` / `ItemType`（リテラル型）」 を挙げている。
>    **`ItemType` を欠いたまま凍結すると、凍結した API が仕様を満たしていない。**
> 2. 欠落は既に 3 リポジトリに暫定 `type ItemId = string` を生んでおり
>    （mc-sim / mc-playground-kit / mx-ui）、放置するほど repoint のコストが上がる。
> 3. `BlockDropRule.item` の型変更は凍結後には MAJOR、つまり深さ 5 の republish カスケードである
>    （[versioning.md](./versioning.md) §6-1）。**先に払うコストはカスケードより安い。**
>
> なお下流実消費はこの変更で**近づいた**。mc-compose の横断 E2E が書けなかった
> 「採掘がインベントリに反映される」は `dropOfBlockId` で書けるようになっている。

#### (b) 完了時点で残っている作業

スパイクは kernel の契約を確定させたが、ロスター側にはまだ追随が要る。凍結の前提条件ではないが、
凍結直後に必ず必要になるので記録しておく:

- `mx-gameplay` / `mx-redstone` / `mx-ui` の `domain/frame-contract.ts` と
  `mc-render` / `mc-sim` / `mc-playground-kit` の `domain/kernel-vocabulary.ts` は
  kernel が公開された時点で**削除**される。それぞれの mirror テストが形の一致を守っている。
  **ただし形の一致は削除して張り替えられることを意味しない。** `frame-contract.ts` の 3 つは
  形が一致したまま張り替えがコンパイルを通らない状態にあり、それが下記 (c) である。
  `kernel-vocabulary.ts` の 5 つはまだ同じ測定にかけていない
  (`mc-dev-meta` の `REPOINT_SPECS` に行を足せば同じゲートが答える)。
- `mc-playground-kit/domain/kernel-vocabulary.ts` は本改訂の時点でまだ旧形状
  （`frameStages` が配列）を持っている可能性がある。kit の所有者が追随する必要がある。
- `mc-compose` は `FrameServices` を運んで discharge する側に変わった。
  `mc-compose -> mc-render` のエッジは組織のアーキテクチャ記録で管理し、各リポジトリの
  直接 import 境界はそれぞれの lint 設定で検査する（このリポジトリでは `.oxlintrc.json` と
  `pnpm lint`）。

## 凍結後に変えられなくなるもの

参考までに、1.0.0 以降 MAJOR なしに変更できなくなるもの:

- 能力フラグ / プロパティの**既定値**（追加は MINOR、既定変更は MAJOR）
- 能力の**型**
- ブランデッド型の refine 条件（例: `MAX_STACK_COUNT = 64`）
- 座標変換関数のシグネチャと規約（`Position` vs `BlockPosition` の区別）
- `ClockPort` の Tag 文字列 `'@nerima-games/mc-kernel/ClockPort'`
- `FrameServices` の内容

このリストが「凍結前に一度は全部見ておくもの」でもある。

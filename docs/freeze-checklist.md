# API 凍結チェックリスト（1.0.0 の前提条件）

mc-kernel の公開 API を `1.0.0` として凍結する前に満たすべき条件。
**(a) (b) (b') は満たし、API ロックファイルも導入された（ツール選定は決着済み。[versioning.md](./versioning.md) §7）。
残る阻害要因は「ロックの 4 週間無変更」の経過待ち・完成条件・下流実消費の 3 つである。**

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

kernel での対応状況: **24 実装 / 4 保留**。保留 4 件は `PENDING_CAPABILITIES` に理由つきで記録され、
`test/block-definition.test.ts` が「実装済み + 保留 = 監査の 28」を機械的に検査している。

なお、監査が完了したことは「能力集合が凍結できる」を意味するが、
**「ブロックテーブルが完成した」は意味しない**。`BlockType` 語彙は 120 中 18 しか埋まっておらず、
これは完成条件（[testing.md](./testing.md) §5）の側の話である。

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

### (c) 下流実消費 — ⚠ 測定した。**まだ通っていない**

**要件**: 下流リポジトリが少なくとも 1 つ、実際に kernel を消費して契約を確認していること
([versioning.md](./versioning.md) §2)。

これは 2026-07-27 に**初めて機械的に測定された**。
測定手段は mc-dev-meta の `pnpm check:repoint` で、各ミラーのヘッダが約束している当の操作 —
**ミラーファイルを消し、import を `@nerima-games/mc-kernel` に張り替え、`tsc` を走らせる** —
を使い捨てコピーに対して実行する
(`mc-dev-meta/docs/testing.md` §6.1、`mc-dev-meta/domain/repoint-plan.ts`)。

**結果: 3 リポジトリすべてで張り替えがコンパイルを通らなかった。** 合計 17 件。

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

それが landing したあと `pnpm check:repoint` が緑になった時点で、この項目は ✅ にできる。
**その時点でも、下記の但し書きつきである。**

#### ✅ になったときに、それが主張しないこと

`check:repoint` が緑であることは、**publish されたパッケージを install した検証ではない**。

- 検証される: モジュール解決、`package.json#exports` マップ、`types` フィールド、
  バレルの再 export 形状、そして**全消費箇所での型の同一性**。
  張り替え先は `repos/` 内の実ディレクトリで、`exports` 経由で解決される。
- 検証されない: **`files` と tarball の中身。** tarball は作られないので、
  `domain/` を丸ごと落としたまま publish されるパッケージもこのゲートは通る。
  mc-render は実際にそれを publish する一歩手前まで行っている。
- 検証されない: **振る舞い。** これは typecheck である。
  互いに型が付いたまま、関数の意味について食い違う 2 つのモジュールはありうる。

## 凍結してよいと判断できる状態

- [x] (a) 能力フラグ監査が完了している
- [x] (b) 縦切りスパイクが `GameModule` / `StageRegistration` / `FrameServices` を実消費者で検証している
- [x] (b') その結果 `FrameServices` が確定し、プレースホルダである旨のコメントが消えている
- [x] API ロックファイルが**導入されている**（`api-lock.md` / `scripts/api-lock.ts` / `pnpm api:check`）
- [ ] その API ロックファイルが **4 週間無変更**である（plan.md §6 Step 3）
- [ ] 完成条件（[testing.md](./testing.md) §5）を満たしている
- [ ] 下流リポジトリが少なくとも 1 つ、実際に kernel を消費して契約を確認している（[versioning.md](./versioning.md) §2）
      — **(c) で初めて機械的に測定した。3 リポジトリすべてで張り替えが通らない（計 17 件）。**
      shipped source は 3 つとも 0 件で通り、落ちているのは stage を*実行する*側だけである。
      再現とゲートは mc-dev-meta の `pnpm check:repoint`

**plan.md §9 の未決事項「API ロックファイルのツール選定（api-extractor 相当の Effect-TS 互換手段）」は決着した。**
`@microsoft/api-extractor` は mc-kernel の実コードで試したうえで却下してある。理由と実測は
[versioning.md](./versioning.md) §7-1。要点だけ再掲すると、api-extractor は `ClockPort` の Tag 識別子文字列を
レポートに載せない —— つまり**下のリストが名指ししている当の値**（`'@nerima-games/mc-kernel/ClockPort'`）を
改名しても、そのレポートはバイト単位で同一のままだった。採用したのは自前の `scripts/api-lock.ts` で、
TypeScript 自身の declaration emit をメモリ上で走らせ、非 export の `ClockPort_base` まで含めて記録する。
新規依存はゼロ（`typescript` は既に devDependency）。

**4 週間の計測はこれで始められる。** 起点は `api-lock.md` が最後に変わったコミットであり、
`pnpm verify` と CI が「気付かないうちに変わっていた」を構造的に不可能にしている。
契約形状が確定し計測も始まった以上、**クリティカルパスは「時間の経過」そのものに移った** ——
残る 2 つ（完成条件・下流実消費）はこの 4 週間と並行して進められる。

> **⚠ 計測は一度リセットされている。** アイテム語彙の投入（`domain/item-type.ts` /
> `domain/block-item.ts`、`BlockDropRule.item` の型変更、`dropOfBlockId` の追加）で
> `api-lock.md` が動いた。**4 週間はそのコミットから数え直しである。**
>
> それを承知でやった理由は 3 つある。
>
> 1. plan.md §3.1 は kernel の公開 API に 「`BlockType` / `ItemType`（リテラル型）」 を挙げている。
>    **`ItemType` を欠いたまま凍結すると、凍結した API が仕様を満たしていない。**
> 2. 欠落は既に 3 リポジトリに暫定 `type ItemId = string` を生んでおり
>    （mc-sim / mc-playground-kit / mx-ui）、放置するほど repoint のコストが上がる。
> 3. `BlockDropRule.item` の型変更は凍結後には MAJOR、つまり深さ 5 の republish カスケードである
>    （[versioning.md](./versioning.md) §6-1）。**リセット 4 週間はカスケードより安い。**
>
> なお下流実消費（下記 3 つ目の未達項目）はこの変更で**近づいた**。mc-compose の横断 E2E が
> 書けなかった「採掘がインベントリに反映される」は `dropOfBlockId` で書けるようになっている。

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
  `mc-compose -> mc-render` のエッジが依存ホワイトリストに追加されている（下記 §なし、
  `mc-compose/docs/architecture.md` §5 を参照）。

## 凍結後に変えられなくなるもの

参考までに、1.0.0 以降 MAJOR なしに変更できなくなるもの:

- 能力フラグ / プロパティの**既定値**（追加は MINOR、既定変更は MAJOR）
- 能力の**型**
- ブランデッド型の refine 条件（例: `MAX_STACK_COUNT = 64`）
- 座標変換関数のシグネチャと規約（`Position` vs `BlockPosition` の区別）
- `ClockPort` の Tag 文字列 `'@nerima-games/mc-kernel/ClockPort'`
- `FrameServices` の内容

このリストが「凍結前に一度は全部見ておくもの」でもある。

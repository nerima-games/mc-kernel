# API 凍結チェックリスト（1.0.0 の前提条件）

mc-kernel の公開 API を `1.0.0` として凍結する前に満たすべき条件。
**(a) (b) (b') は満たした。残る阻害要因は API ロックファイル・完成条件・下流実消費の 3 つである。**

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
**「ブロックテーブルが完成した」は意味しない**。`BlockType` 語彙は 120 中 17 しか埋まっておらず、
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
| 6 | チャンクダーティ通知が stage 契約に必要か | **不要。** plan.md §3.8 どおり `mc-sim` の API のまま。`mc-render` の `render:chunk-sync` stage がそれを読む |

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

## 凍結してよいと判断できる状態

- [x] (a) 能力フラグ監査が完了している
- [x] (b) 縦切りスパイクが `GameModule` / `StageRegistration` / `FrameServices` を実消費者で検証している
- [x] (b') その結果 `FrameServices` が確定し、プレースホルダである旨のコメントが消えている
- [ ] API ロックファイルが導入され、**4 週間無変更**である（plan.md §6 Step 3）
- [ ] 完成条件（[testing.md](./testing.md) §5）を満たしている
- [ ] 下流リポジトリが少なくとも 1 つ、実際に kernel を消費して契約を確認している（[versioning.md](./versioning.md) §2）

**API ロックファイルのツールは未選定**（plan.md §9 の未決事項:「api-extractor 相当の Effect-TS 互換手段」）。
4 週間の計測はツールが決まらないと始まらないので、これがクリティカルパス上にある。
契約形状が確定した以上、**これがいま唯一のクリティカルパス**である。

#### (b) 完了時点で残っている作業

スパイクは kernel の契約を確定させたが、ロスター側にはまだ追随が要る。凍結の前提条件ではないが、
凍結直後に必ず必要になるので記録しておく:

- `mx-gameplay` / `mx-redstone` / `mx-ui` の `domain/frame-contract.ts` と
  `mc-render` / `mc-sim` / `mc-playground-kit` の `domain/kernel-vocabulary.ts` は
  kernel が公開された時点で**削除**される。それぞれの mirror テストが形の一致を守っている。
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

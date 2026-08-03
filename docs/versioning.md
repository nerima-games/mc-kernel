# バージョニングと公開

## 1. 現状

- **バージョン: `0.2.0`。**（`0.1.0` からの bump 理由は §6-1）
- **publish パイプラインは無い。** `package.json` の `exports` は TypeScript ソースを直接指しており、ビルド成果物は存在しない。
- 開発中は `mc-dev-meta` workspace（16 リポジトリを `repos/` に clone して 1 つの pnpm workspace として束ねる）による
  `workspace:*` 解決でモノレポ同等の DX を得る（plan.md §6 Step 0-2）。

## 2. 0.x に留める方針

**下流リポジトリが実際に消費して契約を確認するまで、`0.x` から出ない。**

plan.md §6 Step 3:

> 界面が安定した（API ロック 4 週間無変更）リポジトリから GitHub Packages 等へ npm 公開 + changesets 運用に切り替え。
> それまでは dev-meta workspace 統合で開発。

**この引用は plan.md 執筆時点（`api-lock.md` 導入前）の記録であり、現在は上書きされている。**
`api-lock.md` / `scripts/api-lock.ts` / `pnpm api:check` という自動 API スナップショット機構、および
それに紐づく「4 週間無変更で凍結」という日数計測ベースの自動ゲートは、org 標準として廃止された
（[API_STANDARD.md §4](https://github.com/nerima-games/.github/blob/main/API_STANDARD.md#4-自動-apiロックスナップショットツールは使わない)）。
`1.0.0` への昇格は、計測期間や自動判定に代えて **maintainer（take）の裁量判断のみ**で行う
（[RELEASE_STANDARD.md §4.2](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#42-新しい昇格ポリシー人間による裁量判断)）。
バージョニングと CHANGELOG 生成自体は changesets に一本化されている（§4、`.changeset/config.json` 参照）。

plan.md §8 のリスク表も同じことを別角度から書いている。

> **新規構築初期は全界面が高 churn** → npm 公開を遅らせ dev-meta workspace で開発。bump 連鎖を構造的に回避

`0.x` は「semver 上、マイナー bump で破壊してよい」区間である。
この区間を**実際に下流が使うまで**維持するのは、机上で正しい API と実際に使える API が違うからで、
kernel の場合その差が全リポジトリに波及する。

`1.0.0` を切る前提条件は [freeze-checklist.md](./freeze-checklist.md) にまとめてある。

## 3. 公開先

**GitHub Packages**（`https://npm.pkg.github.com`、`access: restricted`）。
`package.json` の `publishConfig` に設定済みだが、**publish 自体はまだ実行されない**。

```json
"publishConfig": {
  "registry": "https://npm.pkg.github.com",
  "access": "restricted"
}
```

**`.npmrc` にはレジストリ設定が入っていない。** 現在の `.npmrc` は `fast-check` / `pure-rand` の
hoist 設定だけであり、`@nerima-games:registry=` の行と認証トークンの受け渡しは publish パイプラインを追加するときに足す。

## 4. build / publish パイプラインは完成時に追加する

現在 `tsconfig.base.json` は `noEmit: true` であり、全 tsconfig が検査専用である。

完成条件（[testing.md](./testing.md) §5）に到達した時点で以下を追加する:

1. `tsconfig.build.json` を emit ありに変更し、`dist/` を生成する
2. `package.json` の `main` / `types` / `exports` を `dist/` に向ける
3. `files` から `src` を外し `dist` を入れる
4. GitHub Actions に publish job を追加する（`RELEASE_STANDARD.md §3` の設計に従い、
   changesets のリリース PR がバージョンを確定させた push でのみ発火する）

**changesets 自体は導入済み。** `.changeset/config.json`（`access: restricted`、`baseBranch: main`、
`@changesets/changelog-github`）と `@changesets/cli` devDependency は
org 標準（[RELEASE_STANDARD.md §1](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#1-changesets-導入)）
に従い先行して導入した。上記リストが「完成時に追加する」と言っているのは、
publish job の新設と `dist/` への切り替えのみである。

**先にやらない理由**: ビルド成果物を介すと型エラーがビルド時にしか出なくなり、
16 リポジトリを 1 つの workspace で開発している間の DX が落ちる。
また `exports` の形を先に固めると、パッケージ分割（plan.md §2.4 の「パッケージは自由に細かく」）の余地が狭まる。

## 5. なぜ**加算的な能力追加**がここまで重要なのか

**これが本リポジトリで最も重要な設計上の制約である。**

### 5-1. kernel は 14 リポジトリからピン留めされる

kernel を（推移的にではなく直接）依存に持つのは 15 リポジトリ、うち `mc-dev-meta` を除く実装リポジトリが 14。
つまり **kernel の破壊的変更は 14 リポジトリの同時修正を要求する**。

さらに悪いことに、それらは階層構造をなしている。

```
kernel
  └ physics / save / noise / meshing / audio
      └ worldgen
          └ sim
              └ render
                  └ playground-kit
                      └ mx-*（gameplay / redstone / ui / multiplayer）
                          └ compose
```

npm 公開後に kernel を major bump すると、**深さ 5 の republish カスケード**が発生する。
kernel 1.0.0 → 2.0.0 を出す ⇒ physics/save/noise/meshing/audio が追随 ⇒ worldgen が追随 ⇒ sim ⇒ render ⇒ mx-* ⇒ compose。
各段でテストを回し、各段で「本当に追随だけか」をレビューする。1 つのフラグの型を直すためにこれをやる。

### 5-2. だから能力モデルは加算的に設計されている

ブロック定義は**差分だけ**を書く。書かなかった能力は文書化された既定に解決される。

```typescript
// 消費側が書くもの
const sand: BlockDefinition = { type: 'sand', capabilities: { fallsWhenUnsupported: true } }
```

この定義は、kernel に 12 個目のフラグが増えても**そのまま動く**。
新フラグの既定値が、この定義が暗黙に得ていた値そのものだからである。
したがって能力追加は **semver-MINOR**（破壊的変更ではない）。

仕組みの詳細:

- `BlockCapabilityFlag` は `BLOCK_CAPABILITY_DEFAULTS` から**導出**されている。既定値を決めずにフラグを追加することが型レベルで不可能。
- `BLOCK_PROPERTY_DEFAULTS: BlockProperties` の型注釈により、既定値のないプロパティはコンパイルエラー。
- `resolveBlockCapabilities` は未知のキーを**拒否せず無視する**。これにより、
  古い kernel にピン留めされたリポジトリが新しい kernel 向けに書かれたデータを読んでも壊れない。

### 5-3. 消費側が守らないと保証が失われる 2 点

1. **`BlockCapabilities` / `BlockProperties` のリテラルを手書きしない。**
   オーバーライドを書いて解決関数に渡す。完全に埋めたレコードは、能力が増えるたびに必須キーが増える
   — それこそがこの設計が避けようとしている破壊である。
2. **`BlockCapabilityFlag` に対する `default` 節なしの網羅 `switch` を書かない。**
   `BLOCK_CAPABILITY_FLAGS` を回す。

いずれも現在は規約であり機械検査していない。実際に破られたら
`scripts/check-dependency-whitelist.ts` の検査に昇格させる。

### 5-4. 型を最初から正しくしておく理由も同じ

監査 §7:

> **非 boolean 能力（`lightEmission` / `hardness` / `friction` / `contactDamage` / `xpOnBreak` / `movementDrag`）を最初から数値で持つ。**
> boolean から数値へ広げるのは破壊的変更になる。

`emissive: boolean` を後から `lightEmission: number` に広げるのは加算的ではない。§5-1 のカスケードそのものである。
plan.md §3.1 が boolean と書いていた 3 つ（`emissive` / `transparent` / `fluid`）を監査に従って
数値 / 3 値 enum / 3 値 enum に直したのは、**今なら 0 円で、あとでは 5 段のカスケード**だから。

`test/block-capabilities.test.ts` の `the three capabilities plan.md typed wrongly (audit §5)` が、
この 3 つが boolean フラグ表に戻ってこないことを回帰テストとして固定している。

### 5-5. struct 2 種は別ファイル + API ロック

`harvestTool` と `drops` は struct であり最も揺れやすい。監査 §7 の指示どおり `domain/block-harvest.ts` に隔離してある。
**このファイルを変更するときのルール**: 新メンバーは optional にするか、既定値を伴うこと。必須かつ既定値なしは禁止。

## 6. bump の判断基準

> **`0.x` の間の読み替え（全 16 リポジトリ共通の方針）**
>
> 本リポジトリは `0.1.0` であり、下流が契約を実際に消費して確認するまで `0.x` から出ない。
> **semver では `0.x` の破壊的変更は major bump ではなく minor bump である**（`0.1.0` → `0.2.0`）。
> したがって以下の MAJOR / MINOR / PATCH は **`1.0.0` 到達後の分類**であり、
> `0.x` の間は次のように読み替える。
>
> | 分類 | `1.0.0` 到達後 | `0.x` の間（現在） |
> | --- | --- | --- |
> | MAJOR | major bump | **minor bump**（`0.1.0` → `0.2.0`） |
> | MINOR | minor bump | patch bump |
> | PATCH | patch bump | patch bump |
>
> 分類そのものは `0.x` でも意味を持つ。MAJOR に分類される変更は、
> bump の大きさに関わらず**下流に必ず影響するもの**であり、告知と協調リリースの対象である。
> `0.x` の間に major bump を切ることはない。

| 変更 | 分類（`1.0.0` 到達後の bump。`0.x` では上記の読み替え） |
| --- | --- |
| 能力フラグ / プロパティの**追加**（既定値つき） | MINOR |
| `BlockType` リテラルの追加 | MINOR |
| 新しい型・関数の公開 | MINOR |
| 既定値の変更 | **MAJOR**（下流の挙動が黙って変わる。最も危険） |
| 能力の型の変更（boolean → number 等） | **MAJOR** |
| 能力・型・関数の削除／改名 | **MAJOR** |
| `FrameServices` の拡張 | **MAJOR**（stage の提供者にとって破壊的。[public-api.md](./public-api.md) §7） |
| ドキュメント・コメントのみ | PATCH |

**既定値の変更が MAJOR である点に注意。** 加算安全性は「書かなかったものは既定に解決される」ことに立脚しているので、
既定を変えると「何も書いていない全ブロックの挙動が変わる」。追加より危険である。

### 6-1. 実例: `0.1.0` → `0.2.0`（アイテム語彙の投入）

`domain/item-type.ts` / `domain/block-item.ts` の追加そのものは MINOR（新しい型・関数の公開）だが、
同じ変更に **MAJOR 分類の項目が 2 つ**含まれている:

| 変更 | 分類 | なぜ必要だったか |
| --- | --- | --- |
| `BlockDropRule.item`: `BlockType \| 'self'` → `ItemType \| 'self'` | MAJOR（能力の型の変更） | `glowstone` は `glowstone_dust` を落とす。旧綴りは「別のブロック」しか言えず「ブロックでないもの」を言えない |
| `resolveDropItem`: `BlockType` → `ItemType \| undefined` | MAJOR（全域から部分へ） | 答えがアイテムになると「自分自身」は存在しないことがありうる（`air` / `water` / `lava` / `bedrock` / `snow`） |

どちらも §5-4 と同じ話である —— **今なら 0 円で、あとでは 5 段のカスケード**。
実際この時点で**下流のどの `package.json` も mc-kernel を依存に持っていない**
（各リポジトリはまだ `domain/kernel-vocabulary.ts` でミラーしている段階なので、ピン留めが存在しない）。

上の読み替え表に従い、MAJOR 分類 → `0.x` では minor bump、すなわち `0.1.0` → `0.2.0`。

当時はこの変更で `api-lock.md` が動き、plan.md §6 Step 3 の「4 週間無変更」の計測がこのコミットから
振り出しに戻る、という代価を払ってでもやる判断だった。根拠は「凍結後に同じ変更をすると深さ 5 の
republish になる」ことである。**この日数計測ベースの自動ゲート自体は org 標準として現在は廃止されており
（[freeze-checklist.md](./freeze-checklist.md)、[RELEASE_STANDARD.md §4](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#4-0x--100-昇格ポリシー旧ゲートの廃止)）、
現行の昇格判断は maintainer の裁量による**が、この判断そのもの（型を正しくするコストは早いほど安い）は
今も変わらず有効である。

## 7. API ロックファイル（廃止済み）

**本節は歴史的経緯の記録である。`api-lock.md` / `scripts/api-lock.ts` / `pnpm api:check` /
`pnpm api:update` は本リポジトリから削除済みで、現在は存在しない。** 自動 API スナップショット/diff
ツールを持たないことは org 標準として決定されており、新しく同種の仕組みを追加する提案は
[API_STANDARD.md §4](https://github.com/nerima-games/.github/blob/main/API_STANDARD.md#4-自動-apiロックスナップショットツールは使わない)
に反する。破壊的変更の判定は §3-2 に述べたとおり人間のレビューで行う
（判定基準そのものは [API_STANDARD.md §3](https://github.com/nerima-games/.github/blob/main/API_STANDARD.md) を参照）。

以前この節が記述していたのは、plan.md §6 Step 0-3 が初回コミットに求めた「公開 API のレポートを diff
レビュー」の実装だった。生成物は `api-lock.md`、生成器は `scripts/api-lock.ts`
（16 リポジトリに byte-identical で vendor）、検査は `pnpm api:check`、更新は `pnpm api:update`、
`pnpm verify` と CI に配線されていた。以下は残す価値がある部分——なぜ `@microsoft/api-extractor` ではなく
自前実装を選んだかの検討過程——のみを記録として残す。

### 7-1. なぜ api-extractor ではなかったのか

plan.md §9 が名指ししている `@microsoft/api-extractor` を最初に、mc-kernel の実コードで試した。**却下した。**

決め手は `ClockPort` である。TypeScript 自身の declaration emit はこの Tag を 2 つに分けて忠実に出す:

```ts
declare const ClockPort_base: Context.TagClass<ClockPort, "@nerima-games/mc-kernel/ClockPort", ClockService>
export declare class ClockPort extends ClockPort_base {}
```

api-extractor は**前半を捨てる**。`ClockPort_base` は barrel から export されていないので
「forgotten export」と分類し、`ae-forgotten-export` を**警告**として出したうえでレポートには

```ts
export class ClockPort extends ClockPort_base {}
```

としか書かない。自分のレポートに存在しないシンボルを指す空の殻である。
`Context.Tag` を契約たらしめているものは全部、捨てられた前半にある —— **Tag 識別子文字列**と**束ねられた service 型**。
Tag 識別子は Effect がリポジトリ境界を越えて Layer を解決する鍵であり、
これを変えると各リポジトリは単体では型検査を通ったまま、実行時に全消費者の配線が黙って壊れる。

実測: `'@nerima-games/mc-kernel/ClockPort'` → `'@nerima-games/mc-kernel/ClockPortRENAMED'` に改名して
api-extractor のレポートを再生成したところ、**バイト単位で同一**だった。
この変更を見られないロックファイルは、無いよりも悪い。「何も起きていない」と証明してしまうからである。

しかもこれは辺縁事例ではない。`Context.Tag` は 16 リポジトリの**全サービスの宣言方法**であり、
[freeze-checklist.md](./freeze-checklist.md) の「凍結後に変えられなくなるもの」は
`ClockPort` の Tag 文字列そのものを名指ししている。ロックすべき当のものが写らない。

副次的なコスト（上記より軽いが実在する）:

- api-extractor は `.d.ts` を食う。本リポジトリ群にビルド段はない（`tsconfig.build.json` は `noEmit: true`、
  `exports` は TypeScript ソースを直指し）ので、まず declaration emit をディスクに配線する必要がある。
- 16 の公開リポジトリに 47 パッケージの推移的依存と、リポジトリごとの `api-extractor.json` が増える。
- `ae-missing-release-tag` が `@public` タグの無い export 全部で発火する。mc-kernel だけで警告 70 件、
  実行結果は "completed with errors"。設定 1 行で黙らせられるが、満たすには全リポジトリの全 export にタグが要る。

api-extractor が**正しくやっていたこと**は採用した: 名前でソートする（barrel の並べ替えが diff にならない）、
ハッシュではなくシグネチャを出す（レビュアが読める）。ノイズ耐性テスト（本体編集・非公開ヘルパ追加・
barrel 並べ替え・devDependency bump）は api-extractor も**全部通っている**。差が出たのは検出側だけである。

### 7-2. 仕組み

1. `tsconfig.build.json`（typecheck ゲートと同じ出荷ソース）から Program を作る。
2. declaration emit を**メモリ上で**走らせる。ディスクには何も書かないので「ビルド段が無い」性質は保たれる。
   `dist/` も `.d.ts` も `.gitignore` の追加行も発生しない。
3. その仮想 `.d.ts` 群でもう一度 Program を作り、`index.d.ts` の export を型検査器に問う。
   これが公開面の正本である（`export *` を辿り、`export type` を尊重し、barrel が出していないものを除く）。
4. 各 export を tsc が出した通りのテキストで、名前順にレンダリングする。
5. 公開面が参照している**非 export の宣言**（上記 `ClockPort_base`）を第 2 節に取り込む。
   api-extractor が警告にして飛ばす工程はここである。

`checker.typeToString` を使っていなかったのは意図的だった。あれは表示用関数で、
`import("...")` の絶対パスを埋め込み、`FrameServices` を `ClockPort` に潰し、
`GameModule<ROut, E, RIn, RRegister = never>` の既定値を落とす。declaration emit は直列化用関数で、
「別のファイルで同じ意味になるテキスト」を出す義務があるため 3 つとも保たれていた。
`assertPortable`（旧 `scripts/api-lock.ts`）がこれを毎回の実行時不変条件として強制していた。

### 7-3. 決定性

スナップショットは公開 API の関数であり、それ以外の何の関数でもない。
タイムスタンプ・バージョン番号・絶対パス・ファイルパス・依存バージョン・ハッシュを含まない。
並びは `localeCompare` ではなくコード単位比較（ロケール依存を避ける）。ドキュメントコメントは落とす
（export の上の文章を書き直すのは API 変更ではないし、mc-kernel ではコメントの方がコードより長い）。

**diff がゼロであることを実測した編集**: 関数本体の変更、非 export ヘルパの追加、barrel の並べ替え、
ソースファイルの改名・移動、devDependency の bump、公開 export のコメント全面書き換え。

### 7-4. 捕まえないもの

- **挙動**。`resolveDropItem` の返り値が変わってもこのファイルは動かない。それはテストの仕事である。
- **interface / 型リテラルのメンバ順**。tsc の emit 順（＝ソース順）を保つので、
  メンバの並べ替えは API 変更でないのに diff になる。ロックがソースと同じ順で読めることを優先した。
  承認は 1 行で済む。
- **`typescript` の major bump**。declaration emit の書式が変わればレポート全体が動く。
  これは「まさに見るべきとき」なので許容し、TypeScript のバージョンはファイルに記録していない
  （記録すると、何も変えない bump のたびに API diff が出る）。

### 7-5. 運用（廃止済み・記録として）

- 公開面を変える PR には `pnpm api:update` の結果を**同じ PR に**含めていた。差分がレビュー対象そのものだった。
- plan.md §6 Step 3 の「**4 週間無変更**」の計測は、`api-lock.md` が最後に変わったコミットから数えていた。
- `pnpm api:check` は CI の独立ステップでもあった。

**現在の運用**: 1.0.0 への昇格は日数計測を伴わず、maintainer（take）の裁量判断のみで行う
（[RELEASE_STANDARD.md §4.2](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#42-新しい昇格ポリシー人間による裁量判断)、
[freeze-checklist.md](./freeze-checklist.md)）。バージョン bump と CHANGELOG 生成は changesets
（`.changeset/`、§3）に一本化されている。

# バージョニングと公開

## 1. 現状

- **バージョン: `0.1.0`。**
- **publish パイプラインは無い。** `package.json` の `exports` は TypeScript ソースを直接指しており、ビルド成果物は存在しない。
- 開発中は `mc-dev-meta` workspace（16 リポジトリを `repos/` に clone して 1 つの pnpm workspace として束ねる）による
  `workspace:*` 解決でモノレポ同等の DX を得る（plan.md §6 Step 0-2）。

## 2. 0.x に留める方針

**下流リポジトリが実際に消費して契約を確認するまで、`0.x` から出ない。**

plan.md §6 Step 3:

> 界面が安定した（API ロック 4 週間無変更）リポジトリから GitHub Packages 等へ npm 公開 + changesets 運用に切り替え。
> それまでは dev-meta workspace 統合で開発。

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
3. `files` から `domain` を外し `dist` を入れる
4. GitHub Actions に publish job を追加する（tag push トリガ）
5. changesets を導入する

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

## 7. API ロックファイル

plan.md §6 Step 0-3 が初回コミットに求める「公開 API のレポートを diff レビュー」の実装。
§9 の未決事項「API ロックファイルのツール選定（api-extractor 相当の Effect-TS 互換手段）」は**これで解決済み**。

| 項目 | 内容 |
| --- | --- |
| 生成物 | リポジトリ直下の `api-lock.md`（コミット対象） |
| 生成器 | `scripts/api-lock.ts`（16 リポジトリに byte-identical で vendor。`check-dependency-whitelist.ts` と同じ方式） |
| 検査 | `pnpm api:check` — `api-lock.md` が実際の公開 API と食い違えば非ゼロ終了 |
| 更新 | `pnpm api:update` |
| 配線 | `pnpm verify` の `check:deps` と `test` の間、および CI の独立ステップ |
| 追加依存 | **なし**（`typescript` は既に全 16 リポジトリの devDependency） |

### 7-1. なぜ api-extractor ではないのか

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

`checker.typeToString` を使っていないのは意図的。あれは表示用関数で、
`import("...")` の絶対パスを埋め込み、`FrameServices` を `ClockPort` に潰し、
`GameModule<ROut, E, RIn, RRegister = never>` の既定値を落とす。declaration emit は直列化用関数で、
「別のファイルで同じ意味になるテキスト」を出す義務があるため 3 つとも保たれる。
`assertPortable`（`scripts/api-lock.ts`）がこれを毎回の実行時不変条件として強制する。

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

### 7-5. 運用

- 公開面を変える PR は `pnpm api:update` の結果を**同じ PR に**含める。差分がレビュー対象そのものである。
- plan.md §6 Step 3 の「**4 週間無変更**」の計測は、`api-lock.md` が最後に変わったコミットから数える。
  これで計測の起点が客観的な事実になった（[freeze-checklist.md](./freeze-checklist.md)）。
- `pnpm api:check` は CI の独立ステップでもある。`verify` 経由だけにすると、
  ステップ名を見ただけでは落ちた理由が分からない。

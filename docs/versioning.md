# バージョニングと公開

## 1. 現状

- **バージョン: `0.4.0`。** `Chunk.blocks` の `ChunkBlocks` 化を含む、Node.js からロード可能にする修正を公開した版である。
  `0.2.19` は changesets が一度 CHANGELOG に書き出したが、`package.json` の version として
  コミットされる前に `0.3.0` の変更へ合流し、独立した version にはならなかった
  （変更履歴は [CHANGELOG.md](../CHANGELOG.md) を参照）。
- **最新の破壊的変更:** `Chunk.blocks` は生の `Uint8Array` ではなく `ChunkBlocks`。API の詳細は [public-api.md](./public-api.md) の「Chunk バイナリ形式」、変更履歴は [CHANGELOG.md](../CHANGELOG.md) の `0.3.0` を参照。
- **配布用 build は実装済み。** `pnpm build` が `src/` から型付き ESM と declaration / source map を `dist/` に生成し、
  `package.json` の `main` / `types` / `exports` は `dist/` を指す。`files` も `dist/` と配布メタデータに限定している。
- **GitHub Packages への公開は既に行われている。** `0.2.0` から `0.2.18` までの履歴上の版と
  現在の `0.4.0` が `https://npm.pkg.github.com` に公開済みである（`publishConfig.access` は
  Wave 0 で `restricted` から `public` に変更した。packages が public 化済みのため、`restricted`
  のままだと新規 publish が private に戻り下流 CI が 403 になる）。`0.3.0` は version 検出方式の
  穴により公開されなかった中間版である。
  公開レジストリから取得した `0.4.0` tarball の install / import / runtime 検証は
  [freeze-checklist.md](./freeze-checklist.md) に記録済みである（§4）。
- 開発中は `mc-dev-meta` workspace（16 リポジトリを `repos/` に clone して 1 つの pnpm workspace として束ねる）による
  `workspace:*` 解決でモノレポ同等の DX を得る（plan.md §6 Step 0-2）。

### 1-1. `effect` を exact-pinned `dependencies` として宣言する理由

**`effect` は `dependencies` に exact `3.22.1` で宣言する（Wave 0、org 全体のバージョンピン表）。**
mc-kernel は `Brand.refined` を実行時に使うため、`effect` は型だけでなく実行時にも必要な依存である。

以前は `peerDependencies` を検討していた: mc-kernel は `Context.Tag`（`ClockPort`）と Effect 値を
公開 API として export するため、消費側が使う `effect` インスタンスと異なるバージョンが同居すると
`Context.Tag` の解決自体は成功する一方、`Effect` の実行時に
`WARN: Executing an Effect versioned X with a Runtime of version Y, you may want to dedupe the effect dependencies`
という警告が出る、という version-mismatch リスクを懸念していたためである。

**この懸念は Wave 0 の org 全体 exact ピンで解消された。** `effect@3.22.1` は 15 リポジトリ全部で
`^`/`~` を使わない exact 一致が強制され（mc-dev-meta の `src/domain/toolchain.ts` の
`TOOLCHAIN.dependencies.effect` と `pnpm check:toolchain` が全リポジトリを照合する）、
range 指定自体が存在しないため複数バージョンが黙って同居する余地がない。

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

**GitHub Packages**（`https://npm.pkg.github.com`、`access: public`）。
`package.json` の `publishConfig` に設定済みで、**publish 自体は既に実行されている**
（`0.2.0`〜`0.2.18` と `0.4.0`、§1 参照）。`0.3.0` が未公開なのは publish の仕組みが
動いていないからではなく、次節が説明する version 検出の穴によるものである。

```json
"publishConfig": {
  "registry": "https://npm.pkg.github.com",
  "access": "public"
}
```

**`.npmrc` には認証情報を置かない。** 現在の `.npmrc` は `fast-check` / `pure-rand` の hoist 設定だけである。
publish workflow の `setup-node` が GitHub Packages の registry を設定し、publish step だけが `GITHUB_TOKEN` を
一時的に `NODE_AUTH_TOKEN` として受け取るため、開発用ファイルに registry や秘密情報を複製しない。

## 4. build / publish の現状

検査用設定と配布用設定を分けている。`tsconfig.base.json` と `tsconfig.build.json` は `noEmit: true` の
型検査用で、`tsconfig.release.json` だけが `noEmit: false` と `outDir: dist` を持つ唯一の emit 設定である。

実装済みの配布準備:

1. `pnpm build` が `src/` から JavaScript、declaration、source map を `dist/` に生成する
2. `package.json` の root export と、公開している各 `domain/*` subpath export が対応する `dist/` の JavaScript と型宣言を指す
3. `files` が `dist`、`tsconfig.base.json`、`LICENSE`、`README.md` に限定される
4. `prepublishOnly` が `pnpm verify` と `pnpm package:verify` を実行し、publish 前の型検査・lint・テスト・カバレッジ・実 tarball 境界検証を必須にする

構成済みのリリース導線:

1. `RELEASE_STANDARD.md §3` に従う `.github/workflows/release.yaml`。`main` への push を受けて
   `detect` ジョブが package version の変更を確認し、変更したときだけ `publish` ジョブが
   verify（coverage を含む）/ package boundary 検証を経て GitHub Packages へ publish する。
   `publish` が成功した場合だけ `tag` ジョブが `v<version>` タグを publish 済みコミットへ打つ
   （19 バージョンが公開されている一方、タグは `v0.2.18` の 1 つしか無く、
   どのコミットがどの版かを辿れなかったための追加）。
2. `pnpm package:verify` による、生成した tarball の `files` / `exports`、clean consumer の runtime import・declaration compile、`fixedClock` runtime の検証

**`detect` ジョブは `package.json` の version を `github.event.before` 時点のコミットと比較して判定する。**
このワークフローを追加した時点で `package.json` は既に `0.3.0` だったため、`0.3.0` への遷移を
検出できず、その版は公開されないまま履歴上スキップされた。以後の version bump は通常どおり
検出・公開され、現在の `0.4.0` はその経路で公開された Node.js からロード可能な版である。

`pnpm package:verify` が検証するのはローカルで `pnpm pack` した tarball である。一方、公開レジストリ
から取得した `0.4.0` tarball の install / import / runtime 検証は実施済みで、詳細を
[freeze-checklist.md](./freeze-checklist.md) に記録している。

**changesets 自体は導入済み。** `.changeset/config.json`（`access: public`、`baseBranch: main`、
`@changesets/changelog-github`）と `@changesets/cli` の devDependency は
org 標準（[RELEASE_STANDARD.md §1](https://github.com/nerima-games/.github/blob/main/RELEASE_STANDARD.md#1-changesets-導入)）に従う。
バージョンは `package.json` の該当フィールドを直接参照する（drift しやすい生の数字はここに書かない）。
バージョン bump と CHANGELOG 生成は changesets に一本化している。上記のとおり publish job 自体は
稼働しており未実装ではない。`0.3.0` は履歴上のスキップとして扱い、現在の残課題は下流の実消費を
踏まえた 1.0.0 昇格の maintainer 判断である。

**開発時の扱い**: 通常の `pnpm typecheck` は source を直接検査し、release build は `pnpm build` として
明示的に実行する。これにより開発中の型検査で `src/` が生成物に置き換わることはない。

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
- `resolveBlockCapabilities` と `resolveBlockProperties` は未知のキーを**拒否する**。このリポジトリは
  後方互換性を契約に含めず、スペルミスや未対応のデータを黙って受け入れない。

### 5-3. 消費側が守らないと保証が失われる 2 点

1. **`BlockCapabilities` / `BlockProperties` のリテラルを手書きしない。**
   オーバーライドを書いて解決関数に渡す。完全に埋めたレコードは、能力が増えるたびに必須キーが増える
   — それこそがこの設計が避けようとしている破壊である。
2. **`BlockCapabilityFlag` に対する `default` 節なしの網羅 `switch` を書かない。**
   `BLOCK_CAPABILITY_FLAGS` を回す。

いずれも現在は規約であり、能力の網羅性までは機械検査していない。依存境界の直接 import は
`.oxlintrc.json` の `no-restricted-imports` と `pnpm lint` で検査する。

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

`harvestTool` と `drops` は struct であり最も揺れやすい。監査 §7 の指示どおり、公開境界を `domain/block-harvest.ts` に隔離し、型・既定値は `domain/block-harvest-data.ts` に分離してある。
**このファイルを変更するときのルール**: 新メンバーは optional にするか、既定値を伴うこと。必須かつ既定値なしは禁止。

## 6. bump の判断基準

> **`0.x` の間の読み替え（全 16 リポジトリ共通の方針）**
>
> 本リポジトリは現在 `0.4.0` であり、下流が契約を実際に消費して確認するまで `0.x` から出ない。
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

副次的なコスト（上記より軽いが実在する、当時の検討記録）:

- api-extractor は `.d.ts` を食う。当時は配布用の declaration emit が無かったため、まず emit をディスクに
  配線する必要があった。この検討後、現在の配布 build は §4 の `tsconfig.release.json` に移行した。
- 16 の公開リポジトリに 47 パッケージの推移的依存と、リポジトリごとの `api-extractor.json` が増える。
- `ae-missing-release-tag` が `@public` タグの無い export 全部で発火する。mc-kernel だけで警告 70 件、
  実行結果は "completed with errors"。設定 1 行で黙らせられるが、満たすには全リポジトリの全 export にタグが要る。

api-extractor が**正しくやっていたこと**は採用した: 名前でソートする（barrel の並べ替えが diff にならない）、
ハッシュではなくシグネチャを出す（レビュアが読める）。ノイズ耐性テスト（本体編集・非公開ヘルパ追加・
barrel 並べ替え・devDependency bump）は api-extractor も**全部通っている**。差が出たのは検出側だけである。

### 7-2. 仕組み（廃止済み API lock の記録）

以下は現在は廃止された API lock generator の設計記録である。配布 build と publish の現行方針は §4 を正とする。

1. 当時の `tsconfig.build.json`（typecheck ゲートと同じ出荷ソース）から Program を作る。
2. declaration emit を**メモリ上で**走らせた。ディスクには何も書かないため、当時の「配布 build が無い」
   状態を保ったまま API を検査できた。
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

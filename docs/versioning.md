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

| 変更 | bump |
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

# ドキュメント

`@nerima-games/mc-kernel` は、Minecraft 関連パッケージ間で共有するプラットフォーム非依存の語彙です。Minecraft 本体や特定のランタイムには依存せず、識別子、座標、ブロック定義、時間の境界を提供します。

利用側はパッケージルートから import してください。内部モジュールへの deep import は公開契約に含まれません。

```ts
import {
  blockPosition,
  blockPositionKeyOf,
  blockTypeOfId,
  fixedClock,
} from "@nerima-games/mc-kernel";

const position = blockPosition(10, 64, -3);
const key = blockPositionKeyOf(position);
const blockType = blockTypeOfId("minecraft:stone");
const clock = fixedClock(1_000);
```

## はじめに

必要な Node.js と pnpm のバージョンは、リポジトリの [package.json](https://github.com/nerima-games/mc-kernel/blob/main/package.json) にある `engines` を参照してください。依存関係をインストールした後、公開前の検証は次のコマンドで実行できます。

```sh
pnpm install --frozen-lockfile
pnpm verify
```

## GitHub Pages

[`docs.yaml`](https://github.com/nerima-games/mc-kernel/blob/main/.github/workflows/docs.yaml) は、`main` へのドキュメント・MkDocs 設定・ワークフローの変更を検知して `mkdocs build --strict` を実行し、成功した成果物を GitHub Pages に公開します。初回のみリポジトリの Settings で Pages の Source を **GitHub Actions** に設定してください。手動実行は Actions の **Publish documentation** ワークフローから行えます。

## 文書一覧

| 文書 | 用途 |
| --- | --- |
| [architecture.md](./architecture.md) | パッケージ境界と依存規則 |
| [testing.md](./testing.md) | 検証の構成と CI の責務 |
| [versioning.md](./versioning.md) | 互換性と公開手順 |
| [block-position-key-migration.md](./block-position-key-migration.md) | 座標キーの consumer 移行 |
| [api-reference.md](./api-reference.md) | パッケージルートから公開する API の一覧 |

公開面の正本は `src/index.ts`、検査用スナップショットはリポジトリ直下の `api-lock.md` です。

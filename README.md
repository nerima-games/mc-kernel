# @nerima-games/mc-kernel

Minecraft-clone の各パッケージが共有する、依存を持たない基盤語彙です。

- ブランデッドな数値・識別子
- ブロック・チャンク座標と canonical な `BlockPositionKey`
- ブロック定義、能力、プロパティ
- フレーム契約と `ClockPort`

`src/` は出荷する実装、`tests/` はその検証だけを置く。公開 API は `src/index.ts` に限定し、`api-lock.md` のスナップショットで検査します。

## インストール

```console
pnpm add @nerima-games/mc-kernel
```

```ts
import { blockPosition, blockPositionKeyOf, CHUNK_SIZE_XZ } from '@nerima-games/mc-kernel'

const origin = blockPosition(0, 64, 0)
const key = blockPositionKeyOf(origin)

console.log(key, CHUNK_SIZE_XZ)
```

Node.js 24 以上と pnpm 11 以上をサポートします。パッケージは Node ESM と型宣言だけを公開します。

## 開発

```console
pnpm install
pnpm verify
```

| コマンド | 内容 |
| --- | --- |
| `pnpm typecheck` | 実装とテストを厳格に型検査 |
| `pnpm lint` | 出荷実装・テスト・スクリプトを lint |
| `pnpm test` | ユニットテスト |
| `pnpm test:coverage` | カバレッジ付きテスト |
| `pnpm check:package` | pack 済み tarball を別 consumer で検証 |
| `pnpm verify` | CI と同じ全検証 |

設計と運用の補足は [docs/README.md](./docs/README.md) を参照してください。

## License

MIT

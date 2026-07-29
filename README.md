# @nerima-games/mc-kernel

Minecraft-clone の各パッケージが共有する、依存を持たない基盤語彙です。

- ブランデッドな数値・識別子
- ブロック・チャンク座標と canonical な `BlockPositionKey`
- ブロック定義、能力、プロパティ
- フレーム契約と `ClockPort`

`src/` は出荷する実装、`tests/` はその検証だけを置く。公開 API は `src/index.ts` に限定し、`api-lock.md` のスナップショットで検査します。

## 利用境界

```ts
import { blockPosition, blockPositionKeyOf, CHUNK_SIZE_XZ } from '@nerima-games/mc-kernel'

const origin = blockPosition(0, 64, 0)
const key = blockPositionKeyOf(origin)

console.log(key, CHUNK_SIZE_XZ)
```

この import は公開 API の境界を表しますが、npm registry への配布は行いません。consumer は当面それぞれの
`domain/kernel-vocabulary.ts` を所有し、共有化は単一ワークスペースまたは Git submodule など、認証不要で
再現可能な統合方式を採用する時点で改めて検討します。開発環境は Node.js 24 以上と pnpm 11 以上をサポートします。

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

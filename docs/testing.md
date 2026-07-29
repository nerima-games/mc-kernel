# テスト

実装は `src/`、テストは `tests/` に分離します。Vitest は `tests/**/*.test.ts` と
`tests/**/*.spec.ts` だけを実行し、カバレッジ対象は `src/**/*.ts` です。

`pnpm verify` は次を順に実行します。

1. 実装・テストの strict 型検査
2. lint
3. 公開 API 契約の検査
4. ユニットテスト
5. tarball を使う独立 consumer の実行時・型解決検査

API を変更した場合は、意図した差分であることを確認してから `pnpm api:update` を実行します。
`api-lock.md` の無関係な変更は受け入れません。

## パフォーマンスベンチマーク

`pnpm bench:block-registry` は、ビルド済みの `dist/` を Node.js で直接実行し、ブロック
レジストリの主要な読み取り API を計測します。各 API は 65,536 件のブロック ID を 2,000 回
走査し、読み取り毎秒を出力します。

このベンチマークは回帰調査用です。CI の固定しきい値にはせず、同一マシン・同一 Node.js
バージョンでの差分を比較してください。

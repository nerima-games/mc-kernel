# Consumer 移行

`BlockPositionKey` はブロック座標を canonical な `"x,y,z"` で表す共有 key です。
`blockPositionKeyOf` で作成し、外部入力は `blockPositionOfKey` で検証します。

## 確認済みの移行対象

次の consumer は `domain/kernel-vocabulary` に kernel の型・値を複製しています。対象 import は合計 93 件です。

- `mc-sim`: 35 件
- `mc-worldgen`: 28 件
- `mc-render`: 12 件
- `mc-compose`: 9 件
- `mc-playground-kit`: 9 件

複製には座標、識別子、数量、ブロック特性、clock、camera、frame 契約が含まれます。これらは
`@nerima-games/mc-kernel` の公開 facade から提供します。

## 公開前提

consumer の置換は、`@nerima-games/mc-kernel` の対象バージョンが GitHub Packages から取得できることが前提です。
公開前に import だけを置換すると、各リポジトリの単独 CI が必ず失敗します。`workspace:*` は独立した
consumer リポジトリの依存指定として使いません。

## 実施順

1. このリポジトリで `pnpm verify` と package tarball の smoke test を通し、`0.2.0` を公開します。
2. 各 consumer の `dependencies` に `"@nerima-games/mc-kernel": "0.2.0"` を追加します。
3. `domain/kernel-vocabulary` からの import を package facade に置換し、各 consumer で型検査とテストを実行します。
4. 通過後にローカル mirror と mirror 固有の契約テストを削除します。
5. `mc-dev-meta/repos` の repository spec を新しい package 依存へ更新します。

`mx-gameplay` の 3D ブロック座標 key codec は同じ手順で置換できます。`mx-multiplayer`、`mx-redstone`、
`mx-ui` の frame 契約は、公開 facade との型一致を個別に確認してから対象化します。

## 対象外

`mx-redstone` の `PositionKey` は 2D 回路盤の座標を表す別概念です。`BlockPositionKey` に置換せず、
redstone 側で所有します。`CHUNK_HEIGHT`、buffer layout、block index も worldgen の所有です。

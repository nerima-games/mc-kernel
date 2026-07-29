# アーキテクチャ

## 境界

`@nerima-games/mc-kernel` は共有語彙を提供する最下層パッケージです。実行時のサービス、描画、永続化、
ワールド生成、ゲームプレイの実装は持ちません。これにより consumer 間の循環を避けます。

出荷コードは `src/` 配下だけです。公開される識別子は `src/index.ts` から明示的に export し、
内部モジュールへの deep import はサポートしません。

## 依存規則

- kernel は `@nerima-games/*` パッケージへ依存しない。
- consumer は package.json に宣言した直接依存だけを import する。
- 時刻は `ClockPort` 経由で注入し、出荷ロジックから壁時計を直接読まない。
- chunk の buffer layout、保存形式、ゲーム固有の振る舞いは所有するパッケージに置く。

## 所有の判断

複数パッケージで同じ意味と表現を共有する不変の語彙だけを kernel に置きます。
単一ドメイン固有のデータ構造やアルゴリズムは移しません。たとえば `BlockPositionKey` は共有語彙ですが、
2D 回路盤の座標キーと chunk buffer の添字は別の概念です。

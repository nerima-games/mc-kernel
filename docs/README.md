# mc-kernel ドキュメント

`@nerima-games/mc-kernel` は 16 リポジトリ構成の最下層であり、**他の 15 リポジトリすべてが import してよい唯一のリポジトリ**である。
したがってここの API は変えにくい。変えにくいものを変えにくいまま正しく作るための資料を以下にまとめる。

上位仕様は plan.md（**非公開**。以下 plan.md）。本ドキュメント群は plan.md を参照実装の実測で裏づけ、
kernel の実装に落とし込んだもの。

## 表記

| 表記 | 意味 |
| --- | --- |
| `<reference-impl>` | **参照実装のチェックアウトのルート**。凍結された `takeokunn/ts-minecraft` の作業コピーを指す。本ドキュメント群では `<reference-impl>/packages/…` の形か、単に `packages/…`（同じくルート相対）で引用する。手元のどこに clone してあっても読み替えられるようにするためのプレースホルダである |
| plan.md | リポジトリ構成仕様書（16 リポジトリ、確定済み）。**非公開**であり、公開読者は開けない。だから本ドキュメント群は「plan.md を読まなくても追える」ことを要件にしている —— plan.md の主張を引くときは必ず原文を引用し、参照実装での裏づけを file:line で添える |
| `nerima-games/<repo>` | 同 org の兄弟リポジトリ。リンクは GitHub の URL で張る |

## 索引

| ドキュメント | 内容 | 主な読者 |
| --- | --- | --- |
| [architecture.md](./architecture.md) | 4 階層アーキテクチャ、全 16 リポジトリの依存グラフ、kernel が唯一の例外である理由、名詞/動詞ルール、kit の devDependency 専用ルール、stage 全順序の所有者 | 全リポジトリの実装者 |
| [responsibility.md](./responsibility.md) | mc-kernel の責務と、**明示的な非スコープ** | kernel に何かを足したくなった人 |
| [public-api.md](./public-api.md) | 公開 API の全体像と、**各横断型がなぜ kernel にあるのか** | kernel を利用する全リポジトリ |
| [capability-flag-audit.md](./capability-flag-audit.md) | **能力フラグ監査（一次資料）。** 参照実装を実測して必要な能力集合を確定したもの。本リポジトリの能力モデルの権威 | 能力フラグを追加/変更する人 |
| [design-notes.md](./design-notes.md) | 参照実装の失敗（名指し判定の散乱）の実測、初日から焼き込む設計原則、「ブロック追加 = 定義テーブル 1 行」不変条件 | 設計判断の背景を知りたい人 |
| [testing.md](./testing.md) | 検証要件、完成条件、100% カバレッジゲート | CI / テストを触る人 |
| [versioning.md](./versioning.md) | 0.x → 1.0.0 の方針、GitHub Packages 公開、**加算的な能力追加がなぜ死活問題なのか** | リリース作業者 |
| [freeze-checklist.md](./freeze-checklist.md) | API を 1.0.0 で凍結する前に満たすべき前提条件 | 凍結を判断する人 |

## 読む順序

- **初めて kernel を使う**: [architecture.md](./architecture.md) → [public-api.md](./public-api.md)
- **ブロックの挙動を実装する**: [capability-flag-audit.md](./capability-flag-audit.md) → [public-api.md](./public-api.md) の「ブロック能力モデル」
- **kernel に何かを追加したい**: [responsibility.md](./responsibility.md)（非スコープを先に読む）→ [versioning.md](./versioning.md)
- **1.0.0 を切りたい**: [freeze-checklist.md](./freeze-checklist.md)

## ドキュメントの位置づけ

`capability-flag-audit.md` だけは**調査報告書**であり、他と性質が違う。
参照実装 `takeokunn/ts-minecraft` を ripgrep で実測した一次資料であって、本リポジトリの設計判断より上位にある。
実装と食い違った場合は監査が正しく、実装を直す。監査自身の誤り（§3 の表は 28 行だが §7 の本文は「26 能力」と書いている）も、
解消せずそのまま記録してある。

# mc-kernel 0.9の責務

`mc-kernel` 0.9は、複数のリポジトリが共有する語彙、値型、入力検証、静的データ、port契約を提供する。状態を進める処理、ゲーム操作、イベント適用などの実行時処理は、それぞれの所有リポジトリに置く。実行時処理の移管は、共有する状態型や静的ルールデータまでkernelから外すことを意味しない。

以下の表に示すのは実装の所有元を示すソースパスであり、packageのimport pathではない。利用側は、所有リポジトリが公開するAPIを確認してからimportする。

## 実行時処理の所有元

| 処理 | 実装の所有元（ソースパス） |
| --- | --- |
| 通常・特殊クラフト、調理、醸造、製錬、鍛造、石切り、`transmute` | `mc-sim:src/domain/` |
| インベントリ、ホットバー、装備、金床状態、砥石 | `mc-sim:src/domain/` |
| エンチャント候補の生成と状態 | `mc-sim:src/domain/` |
| エンチャントの適用 | `mx-gameplay:src/domain/` |
| エンティティ操作、vitals、wither、爆発、起爆済みTNT | `mc-sim:src/domain/` |
| ブロック相互作用、BlockWorld、作物、ゲームルール、統計、時刻、天候状態、乗り物状態 | `mc-sim:src/domain/` |
| Java・Bedrockの採掘時間とブロック破壊速度 | `mx-gameplay:src/domain/interactions/` |
| 食料の摂取処理、流体状態の更新 | `mx-gameplay:src/domain/` |
| ポータルの検出とlayout生成、光の更新 | `mc-worldgen:src/domain/` |
| レッドストーンの実行時処理 | `mx-redstone:src/domain/` |
| 飛翔体の実行時処理 | `mc-physics:src/domain/projectile.ts` |

## kernelに残る共有契約とデータ

| 残るAPI・データ | 境界 |
| --- | --- |
| Minecraftの共有語彙、値型、入力検証、port型 | 複数の所有者が同じ値と境界契約を使う。実行時処理そのものは含めない。 |
| 醸造・製錬の静的レシピ表、燃料表、定数 | `BrewingState`、`BrewingBottles`、`FurnaceState`、`CookingStation`、`COOKING_STATIONS`など、保存・共有するデータ型と定数もkernelに残る。状態の生成・更新や処理結果は実行時処理の所有元に属する。 |
| `itemDurabilityDefinitionFor` | アイテムの最大耐久値定義を引く静的データAPI。公開importは `@nerima-games/mc-kernel` のrootである。 |
| エンチャントID、コスト表、ルール配列、3種の `SUPPORTED_VANILLA_*_ANVIL_RULE_SET` 定数 | 静的な共有データとしてrootと `domain/enchantment` subpathに残る。金床state、計画、適用、codecなどの実行時処理はkernelに残らない。 |
| エンティティ属性・型、乗り物の値型、爆発データ | 値の形と共有データを表す。乗り物のsnapshot生成・検証や爆発の計画・適用は実行時処理の所有元に属する。 |
| `BlockAt`、`PortalAxis`、`PortalFrame`、`PortalLayout`、ポータル寸法定数 | ポータル生成に渡す共有型・寸法データ。検出とlayout生成は `mc-worldgen` が所有する。 |
| block entityのデータと検証、fluid・light・redstoneの静的データ | データ形状と検証はkernelに残る。状態の更新やcollection操作は各実行時処理の所有元に属する。 |
| 設定値の正規化・key binding API、天候の定数・型・判定関数 | 設定値と共有語彙を扱う。ゲーム内の設定適用や天候状態の更新は上位の所有元に属する。 |

kernelのAPIはroot exportまたは`package.json`で公開されたsubpathから読み込む。所有権表は移行先を示すもので、下流リポジトリのimport差し替えが完了したことを示すものではない。移行時の扱いは[0.8から0.9への利用者移行ガイド](consumer-migration.md)を参照する。

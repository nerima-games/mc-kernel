# mc-kernel 0.8から0.9への移行

このガイドは0.9の公開面とEffect 4への移行を説明する。表のソースパスは実装の所有元を示し、packageのimport pathではない。公開import例は、export mapとbarrelの両方で確認できたものだけを示す。

## 実行時処理の所有元を確認する

| 移動する実行時処理 | 実装の所有元（ソースパス） |
| --- | --- |
| クラフト、調理、醸造、製錬、鍛造、石切り、インベントリ、ホットバー | `mc-sim:src/domain/` |
| 装備、金床、エンチャント、砥石 | `mc-sim:src/domain/` |
| エンティティ操作、vitals、wither、爆発、TNT、BlockWorld、作物、ゲームルール、統計、時刻、天候状態、乗り物状態 | `mc-sim:src/domain/` |
| Java・Bedrockの採掘時間とブロック破壊速度 | `mx-gameplay:src/domain/interactions/` |
| 食料の摂取処理、流体状態の更新 | `mx-gameplay:src/domain/` |
| ポータルの検出・layout生成、光の更新 | `mc-worldgen:src/domain/` |
| レッドストーンの実行時処理 | `mx-redstone:src/domain/` |
| 飛翔体の実行時処理 | `mc-physics:src/domain/projectile.ts` |

確認できた公開importは `@nerima-games/mc-physics` のrootである。たとえば `launchProjectile` はこのroot exportから利用できる。

`mc-sim`、`mx-gameplay`、`mc-worldgen`、`mx-redstone`では、移動対象の各シンボルを利用する公開APIを確認できていない。これらの処理に依存するconsumerは、kernel 0.8のpinを保ち、owner packageが該当APIを公開してから切り替える。ソースディレクトリから直接importしたり、未確認の関数名を移行先として仮定したりしない。

## kernelに残る型・静的データを使う

| kernelに残るもの | 公開importと境界 |
| --- | --- |
| 醸造・製錬のレシピ、燃料データ、定数と共有state/data型 | `@nerima-games/mc-kernel`のroot、または実在する`@nerima-games/mc-kernel/domain/recipe`から読み込む。`BrewingState`、`BrewingBottles`、`FurnaceState`、`CookingStation`などは共有する値の形であり、stateの生成・更新や処理結果ではない。 |
| `itemDurabilityDefinitionFor` | `@nerima-games/mc-kernel`のrootから読み込む。定義元の`src/domain/item/equipment-data.ts`はソースパスであり、import pathではない。 |
| エンチャントID、コスト表、ルール配列、3種の `SUPPORTED_VANILLA_*_ANVIL_RULE_SET` 定数 | `@nerima-games/mc-kernel`のrootまたは実在する`@nerima-games/mc-kernel/domain/enchantment`から静的データとして読み込む。金床state・計画・適用APIとは別の契約である。 |
| `BlockAt`、`PortalAxis`、`PortalFrame`、`PortalLayout`、ポータル寸法定数 | `@nerima-games/mc-kernel`のrootから共有型・寸法データを読み込む。生成・検出の実行時処理は上表のowner packageの公開APIが確認できてから移す。 |
| entity/vehicleの共有型、爆発データ、block entityのデータと検証、fluid/light/redstoneの静的データ、weather/settingsの共有語彙 | `@nerima-games/mc-kernel`のrootから読み込む。state更新やcollection操作はruntime ownerが提供する。 |

### Effect 4のResultへ移行する

`addTick`、`secondsForTicks`、`itemComponentPatchFromUnknownEither`、`mergeItemComponentPatchesEither`はEffect 4の`Result.Result`を返す。関数名に`Either`が残る2つのitem component APIも、戻り値は`Either`ではなく`Result`である。

```typescript
import { Result } from "effect";
import {
  itemComponentPatchFromUnknownEither,
  mergeItemComponentPatchesEither,
} from "@nerima-games/mc-kernel";

const decoded = itemComponentPatchFromUnknownEither(input);
if (Result.isFailure(decoded)) {
  const error = decoded.failure;
} else {
  const patch = decoded.success;
}

const merged = mergeItemComponentPatchesEither(left, right);
if (Result.isFailure(merged)) {
  const error = merged.failure;
} else {
  const patch = merged.success;
}
```

`itemComponentPatchFromUnknownEither`の戻り値は`Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError>`、`mergeItemComponentPatchesEither`の戻り値は`Result.Result<ItemComponentPatch | undefined, ItemComponentPatchDecodeError>`である。`Result.isFailure`で失敗を絞り込むと`.failure`を、成功側では`.success`を参照できる。`addTick`と`secondsForTicks`も同じResult分岐を使い、それぞれ成功値として`SimulationTick`と`FixedDurationSecs`を返す。

公開名を接尾辞だけから改名・型変更しないでください。戻り値と型は0.9の型宣言で確認してください。

## BrandのコンストラクタAPIを変更する

`Brand.Brand.Constructor<T>`の型注釈を`Brand.Constructor<T>`に置き換えてください。`Brand.refined<T>`の呼び出しを`Brand.make<T>`に置き換えてください。引数の形はEffect 4の型宣言で確認してください。

## 時間と座標のbrand型に移行する

0.9では時間と座標の値を用途ごとのbrand型で区別します。実行時表現は`number`ですが、生の`number`を`SimulationTick`や`BlockAxis`などのbrand型として直接使うことはできません。時間型と構築子は`@nerima-games/mc-kernel/domain/quantities`、時間計算は`@nerima-games/mc-kernel/domain/frame-timing`、座標APIは`@nerima-games/mc-kernel/domain/coordinates`から読み込んでください。

時間の主な構築子は`DeltaTimeSecs`、`FixedDurationSecs`、`SimulationTick`、`NonNegativeTickCount`、`MonotonicTimeSecs`、`EpochMillis`、`InterpolationFraction`です。`frameDeltaBetween`は`MonotonicTimeSecs | undefined`と`MonotonicTimeSecs`を受け取り、`DeltaTimeSecs`を返します。`addTick`は`SimulationTick`と`NonNegativeTickCount`を受け取り、成功値は`SimulationTick`です。`secondsForTicks`は`NonNegativeTickCount`を受け取り、成功値は`FixedDurationSecs`です。`interpolationFraction`は`FixedDurationSecs`を受け取り、`InterpolationFraction`を返します。`addTick`と`secondsForTicks`の`Result`の扱いは前節のとおりです。`ClockPort`の`monotonicSecs`の値は`MonotonicTimeSecs`、`wallClockEpochMillis`の値は`EpochMillis`です。

座標では`BlockAxis`、`ChunkAxis`、`LocalAxis`、`PositionAxis`を使います。`blockPosition`には3つの`BlockAxis`、`chunkCoord`には2つの`ChunkAxis`、`position`には3つの`PositionAxis`を渡してください。`BlockAxis`と`ChunkAxis`は安全な整数、`LocalAxis`は0〜15の整数、`PositionAxis`は有限値です。

各brand構築子は値域を検証します。無効な値で構築子を直接呼び出すと例外が投げられます。外部値の検証では、例外を投げない`SimulationTick.result(value)`（`@nerima-games/mc-kernel/domain/quantities`）または`BlockAxis.option(value)`（`@nerima-games/mc-kernel/domain/coordinates`）を使ってください。

## ClockPortのサービス宣言を変更する

`ClockPort`を宣言するコードでは、`Context.TagClass`を`Context.ServiceClass`に、`Context.Tag`を`Context.Service`に置き換えてください。クラスとサービスの型は、0.9の型宣言で確認してください。

## 下流リポジトリごとに移行を検証する

移行先の公開APIを確認してから読み込みを切り替えてください。重複する実行時処理やfacadeを削除し、各下流リポジトリで型検査、lint、テストを実行してください。

このガイドで公開APIを確認できていない`mc-sim`、`mx-gameplay`、`mc-worldgen`、`mx-redstone`への該当移行は、owner packageの公開APIが利用でき、下流のimportがそのAPIでコンパイルできるまで未完了として扱ってください。このガイドは下流リポジトリの移行完了を報告するものではありません。

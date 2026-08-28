# 下流利用・移行契約

この文書は、下流リポジトリが `mc-kernel` の公開 API を利用するときの移行先と責務の境界を定める。目的は、同じ Minecraft の語彙・判定・純粋計算を複数のリポジトリで再定義しないことである。

## 正本へ移行するもの

### Dimension

`Dimension` の正本は `@nerima-games/mc-kernel` である。下流で定義した union、ディメンション配列、文字列の三択ガードは削除し、次の API を使う。

```ts
import {
  DIMENSIONS,
  isDimension,
  type Dimension,
} from '@nerima-games/mc-kernel'
```

`DIMENSIONS` は列挙値、`isDimension` は外部入力の検証、`Dimension` は検証済み値の型として使う。保存データやネットワーク入力では、文字列を型 assertion で通さず `isDimension` を通す。

現在、下流の一部には旧来の `mc-worldgen` 所有型と重複したガードが残っている。この worktree で編集できる範囲は `mc-kernel` なので、下流側の import 差し替えは別作業として明示的に残す。移行が完了するまで、互換目的で二つの `Dimension` を新たに増やしてはならない。

### ブロック状態と能力

ブロック ID、レジストリ照会、コピー境界を含む値オブジェクトは kernel の公開 API を使う。

```ts
import {
  BLOCK_REGISTRY,
  BlockState,
  blockCapabilitiesOf,
} from '@nerima-games/mc-kernel'
```

ブロックの opacity、collision、fluid kind、hardness、support rule、採掘道具、ドロップなど、単一ブロックから決まる能力は kernel の定義表と照会関数を正本にする。テクスチャのタイル番号、描画 atlas、ワールドへの配置・破壊順序は下流の責務である。

### 設定値と統計

設定と統計のうち、共有できる値モデル・既定値・外部入力の正規化・純粋な更新は kernel の公開 API を使う。

```ts
import {
  DEFAULT_SETTINGS,
  EMPTY_STATISTICS,
  applySettings,
  normaliseSettings,
  normaliseStatistics,
  record,
  unlock,
} from '@nerima-games/mc-kernel'
```

`Settings` は描画距離、視野角、品質、音量、感度、キー割り当ての値境界を持ち、`Statistics` は counter と achievement の解放集合を持つ。UI、renderer の preset 適用、入力デバイスへの接続、ゲームイベントの意味付け、player state の所有、保存・読み込みは下流の責務である。

生の設定・統計データは `normaliseSettings` / `normaliseStatistics` へ渡し、型 assertion で検証済みと偽装しない。root export に加えて `domain/settings` と `domain/statistics` の公開 subpath を利用できる。

### 純粋な共有計算

下記の領域で、下流に同じ入力から同じ結果を返す判定やデータ表がある場合は、対応する kernel API へ移行する。

- recipe、crafting、smelting、smithing、stonecutting
- brewing、enchantment、grindstone
- item stack、inventory value、equipment、hotbar、汎用 item component
- crop、vitals、weather、time of day
- projectile collision、explosion、primed TNT、bedrock mining
- frame timing、camera pose、block interaction、block break speed
- `BlockWorld` の読み取り・不変更新、fluid state の再構築、決定論的な水・溶岩の流動と混合
- redstone の layout、source/device/wire の評価、repeater・comparator・observer の状態遷移

移行後の import は公開 barrel または `package.json` に列挙された公開 subpath に限定し、`src/domain/*-data` の内部実装へ直接依存しない。wire ID、既存保存形式、乱数の責務を持つ呼び出し側の契約は変更しない。

item component の item-aware な既定値は `itemComponents`（`tool` は `ITEM_TOOL_COMPONENTS` / `itemToolComponentOf` を、`weapon` は `weaponComponent` / `isWeaponComponent` を含む）、stack limit は `itemComponentStackLimitOf`、値の runtime guard は `isItemComponents`、`isUseCooldownComponent`、`isWeaponComponent` を正本とする。`ItemComponents.useCooldown` / `ItemComponents.weapon` は公式 component の解決済み値であり、`ItemStack` / inventory の値として下流へ渡す。`ItemStack` の stack ごとの override、保存形式、実際の item 使用イベントは下流が所有し、kernel の既定値解決と重複する registry・数値 guard を残さない。

## 下流に残すもの

次の実装は共有語彙と純粋な更新結果を kernel から import しつつ、状態所有者である下流に置く。

- chunk/world から `BlockWorld` を構成する処理、fluid/redstone の tick scheduling、更新結果のワールドへの書き戻し
- fluid/redstone state の保存、イベント発火、ネットワーク同期、描画への接続
- inventory service、プレイヤー状態、ステージ順序、ワールド mutation
- texture atlas、portal frame geometry、door state transition
- UI 入力、エンティティ固有の効果、ゲーム固有のランダムドロップ

kernel が公開する `BlockWorld`、`updateFluids`、`updateRedstone` は、同じ入力から同じ更新結果を返す純粋な計算である。下流は chunk/world の入力、tick queue、状態保存、mutation とイベントの所有権を保持し、結果を自分の実行環境へ接続する。状態と mutation の所有権を kernel に移すためだけに、下流固有の world interface を kernel へ持ち込まない。

## `unknown` と型 assertion

外部データを受け取る decoder・validator の入口では `unknown` を使い、検証後に型付き core API へ渡す。これは不正な保存データやパケットを受け入れないための境界である。型を偽装する unsafe cast、`as const` 以外の型アサーション、non-null assertion、型検査の抑制ディレクティブは source と test で禁止している。

型 assertion で重複定義を隠すのではなく、次の順序で移行する。

1. 公開 API から型と guard を import する。
2. 生の入力は decoder・validator で検証する。
3. 検証済みの値だけを純粋な計算へ渡す。
4. 下流固有の状態を更新する。

## 残り候補の移植監査

`mc-sim/src/domain` と kernel の domain basename 比較で残る候補は次の扱いとする。

`vitals-hunger.ts` は差分に残らない。純粋な計算は kernel の同名モジュールへ移植済みで、`vitals.ts` の barrel から公開している。

| 候補 | 判定 | 根拠 |
| --- | --- | --- |
| `wither.ts` | kernel へ移植 | summon pattern、spawn charge、3D tracking/regen、armour/damage rule、skull descriptor、death/drop descriptor は副作用のない公式ルールであり、kernel の projectile/explosion/entity responsibility と整合する |
| `container-storage.ts` / `player-storage.ts` | 下流 | stateful storage と player gameplay state、および循環するローカル依存を持つ。責務文書の service・player state・persistence 上位境界に属する |
| `statistics.ts` | kernel の値モデルへ移行 | counter、unlock、正規化は kernel。state ledger の所有、イベントの意味付け、achievement registry、画面・保存への接続は下流 |
| `settings.ts` | kernel の値モデルへ移行 | 値境界、既定値、正規化、key binding 操作は kernel。UI、renderer preset、入力適用、保存への接続は下流 |
| `save-data.ts` | 下流 | 複数リポジトリをまたぐ persistence boundary である |
| `block-targeting.ts` | 下流 | `mc-physics` の raycast と camera/effect の application boundary に依存する |
| `recipe-core.ts` | 移植しない | kernel の recipe/crafting が後継の正本であり、後方互換用の重複 API は追加しない |

## 下流移行の完了条件

下流リポジトリごとに、次を満たした時点で移行済みとする。

- 重複した shared union、定数配列、文字列 guard が削除されている。
- import が kernel の root export または公開 subpath だけを参照している。
- kernel の registry ID と保存・通信 wire value が変わっていない。
- 下流の型検査、lint、テスト、coverage が実行されている。
- fluid や world mutation など、下流に残す責務を kernel に逆流させていない。

この文書の移行先は公開 API と責務の契約であり、下流の変更を完了したという報告ではない。現時点で `mc-kernel` 側の API・型安全ゲート・package export は整備済みだが、別 worktree にある下流の重複 import 差し替えは未完了として扱う。

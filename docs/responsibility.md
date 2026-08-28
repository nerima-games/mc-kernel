# 責務と非スコープ

出典: plan.md §3.1。

## 1. 責務

> 全リポジトリが共有する語彙。ブランデッド型・数学・ブロック/アイテム定義・Chunk データ構造・共有 Port

具体的には以下を所有する。

| 領域                    | 内容                                                                                                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 識別子                  | `WorldId` / `StageId` などのブランデッド型                                                                                                                                                                                                                                                         |
| データパック registry   | namespaced resource location、format/priority、対象 format の layer 選択、registry path mapping。JSON の読み出し・pack filesystem の所有は上位層                                                                                                                                                   |
| JSON と component patch | 有限・非循環な `JsonValue`、`TextComponent`、namespaced な item component patch、crafting / cooking / stonecutting / smithing / transmute / special の各 Java recipe document の厳格な decoder。JSON の読み出し、pack filesystem、未対応の公式 schema は上位層                                      |
| 数量                    | `StackCount` / `DeltaTimeSecs` / `MonotonicTimeSecs` / `CooldownSeconds` / `EpochMillis`                                                                                                                                                                                                           |
| 座標系                  | `Position`（連続）/ `BlockPosition`（格子）/ `ChunkCoord` / `LocalBlockCoord`、およびそれらの変換                                                                                                                                                                                                  |
| 幾何                    | `AABB` と交差判定                                                                                                                                                                                                                                                                                  |
| 飛翔体                  | `Arrow` の弾道状態遷移、重力・drag・寿命、ブロック/Entity の AABB 連続区間衝突。Entity とワールド更新の所有は上位                                                                                                                                                                                  |
| 爆発と着火済み TNT      | 有限上限付きの決定論的な爆発計画、抵抗・遮蔽・Entity exposure、TNT fuse の値遷移。ブロック変更・ダメージ適用・Entity 更新は上位                                                                                                                                                                    |
| Wither                  | summon pattern matching、spawn charge、3D tracking/regen、armour/damage rule、skull descriptor、death/drop descriptor。Entity spawn/despawn、projectile application、world mutation は上位                                                                                                         |
| ブロック語彙            | `BlockType` リテラル型と網羅性チェック                                                                                                                                                                                                                                                             |
| アイテム語彙            | `ItemType` リテラル型と網羅性チェック                                                                                                                                                                                                                                                              |
| ブロック↔アイテム橋渡し | `PlaceableItemType`（`ItemType ∩ BlockType` + 名前付き設置例外、監査 §6-8）と `drops` の解決                                                                                                                                                                                                       |
| ItemStack とレシピ      | `ItemStack` / `Slot` の数量境界、shaped / shapeless recipe の値型・tag・priority 照合と同梱データ                                                                                                                                                                                                  |
| special recipe          | 染色・付与・バナー複製・本の複製・飾り壺・花火 3 種・地図拡張・盾装飾の照合と適用、および対応する Java document の decoder。GUI・スロット搬送・経験値・サーバー権威は上位                                                                                                                          |
| item component の値     | vanilla が定義する component 値ごとのコンストラクタと `unknown` 境界 guard、属性 modifier・戦闘・防御・エンチャントの値。効果の適用と GUI は上位                                                                                                                                                   |
| インベントリ            | 36 スロットの追加・除去・集計と保存値の検証。搬送サービス・所有権・コンテナ状態は上位                                                                                                                                                                                                              |
| ホットバー              | プレイヤーインベントリ末尾 9 スロットの選択範囲、循環、インベントリスロット投影。選択状態・入力・UI は上位                                                                                                                                                                                         |
| 装備と耐久              | 6 スロット装備スナップショット、装備可能スロット・最大耐久カタログ、装備検証・交換・純粋な耐久減少／破損遷移                                                                                                                                                                                       |
| 食料                    | food component の栄養値・最終 saturation・食用条件、consumable component の使用動作・食後効果、`use_remainder` / `use_cooldown` と、ItemStack／Vitals に対する純粋な摂取結果・単調時計による使用間隔判定                                                                                           |
| 調理                    | furnace / blast furnace / smoker のレシピ・燃料・出力容量と、`FurnaceState` の純粋な時間遷移                                                                                                                                                                                                       |
| 醸造                    | 3 本の bottle slot、ingredient、blaze powder fuel charge、20 秒の `BrewingState` 遷移                                                                                                                                                                                                              |
| ディメンション          | Overworld・Nether・End の閉じた語彙と外部入力用 runtime guard                                                                                                                                                                                                                                      |
| 作物                    | 作物定義、土壌・ディメンション適合、成熟、経過時間・骨粉による成長、成熟時の保証ドロップ。ランダム tick・ワールド更新・収穫イベントは上位                                                                                                                                                          |
| 石切台                  | `StonecuttingRecipe` の exact/tag ingredient、priority、station 境界、入力消費と出力の純粋な照合・適用                                                                                                                                                                                             |
| 鍛造                    | netherite transform / trim recipe の型・tag・入力検証と `SmithingOperation` の純粋な変換                                                                                                                                                                                                           |
| 砥石                    | 単体・二入力のエンチャント除去、呪い保持、エンチャント本の本変換、耐久回復・スタック制約・経験値コストの純粋な計画                                                                                                                                                                                 |
| エンチャント            | 現在の `ItemType` roster に対応する 32 種の Anvil rule・コスト・適用対象・競合、およびエンチャントテーブルの level cost / offer 候補。既存 Anvil primitive を直接利用し、経験値・インベントリ・GUI・乱数 seed は上位                                                                               |
| 昼夜                    | `TimeState` の検証・正規化、時刻の進行・設定、昼夜・月齢・day length の純粋な計算。時計・状態サービス・ゲームループは上位                                                                                                                                                                          |
| 天候                    | `Weather` / `WeatherState` の語彙・検証・正規化。天候の状態管理・タイマー・遷移サービスは上位                                                                                                                                                                                                      |
| 設定値                  | `Settings` の描画距離・視野角・品質・音量・感度・key binding の値、既定値、検証・正規化・純粋な更新。画面、renderer preset、入力適用、保存は上位                                                                                                                                                   |
| 統計・実績              | `Statistics` の counter / unlocked 値、記録・解放・検証・正規化。イベントの意味付け、achievement registry、プレイヤー状態、画面、保存は上位                                                                                                                                                        |
| プレイヤー vitals       | `Vitals` の体力・飢餓・飽和・経験値・リスポーンの純粋な計算、外部入力の検証・正規化、`VitalsView` への変換。プレイヤー状態サービス、ダメージ源、タイマー、保存は上位                                                                                                                               |
| カメラ姿勢              | `PlayerPose` の pitch clamp・look 更新・足元位置更新・目の高さ snapshot・forward vector。姿勢の所有、入力デバイス、描画反映は上位                                                                                                                                                                  |
| フレーム時間            | `clampFrameDelta` / `frameDeltaBetween` / `frameDeltaLossSecs` / `frameDeltaLossBetween` の純粋な経過時間計算                                                                                                                                                                                      |
| ブロック能力モデル      | 能力フラグ表（boolean）+ プロパティ表（型付き値）+ `BlockDefinition`                                                                                                                                                                                                                               |
| 掘削ルールと採掘時間    | Java Edition の公式 `minecraft:tool` の順序付き rule 解決と、ブロック硬度・道具速度から tick 数を求める純粋関数。Bedrock の `minecraft:digger` / `minecraft:destructible_by_mining` は descriptor、tag query、状態値、item-specific speed の解決までを所有（操作状態・権威判定・ドロップ等は上位） |
| Entity と属性           | `EntityType` の閉じた語彙、attribute の値域・既定値・modifier 適用、Entity の純粋な状態操作。spawn/despawn・AI・ネットワークは上位                                                                                                                                                                 |
| ワールドの純粋更新      | `BlockWorld` の読み書き値、流体伝播、redstone の source/wire/device 評価と 1 tick 更新。world interface・tick queue・イベント bus・永続化形式は上位                                                                                                                                                |
| ネザーポータル          | 着火位置からの枠検出と寸法指定の枠生成。ワールドへの書き込み、ポータル間の紐付け、移動は上位                                                                                                                                                                                                       |
| 乗り物                  | 乗り物 snapshot の値型と検証。実体の所有・物理・入力は上位                                                                                                                                                                                                                                        |
| Sulfur Cube             | archetype の tag・registry 識別子、JSON の境界検証と正規化。物理・爆発・接触イベントの実行は上位                                                                                                                                                                                                   |
| 横断 Port               | `ClockPort`                                                                                                                                                                                                                                                                                        |
| 横断スナップショット    | `CameraPoseSnapshot`                                                                                                                                                                                                                                                                               |
| Anvil 変換              | 決定的な変換計画・適用、および versioned state snapshot codec                                                                                                                                                                                                                                      |
| モジュール契約          | `GameModule` / `StageRegistration` / `FrameServices`                                                                                                                                                                                                                                               |

## 2. 内部構成

**`domain/` のみ。型・純粋関数・データテーブルだけを置く。** ファイル分割の方針（data と logic を分ける、
struct は別ファイルに隔離する、公開境界と派生インデックスを分ける）は
[architecture.md](./architecture.md) §6 が正で、ここはその結果としての一覧を保守する。
現在のファイル数は `find src/domain -name '*.ts' | wc -l` で確認できる（この一覧の行数と一致するはず）。

```
index.ts                      # 公開バレル。他の利用リポジトリはここを import する
domain/
  identifiers.ts              # WorldId / StageId
  quantities.ts               # StackCount / DeltaTimeSecs / MonotonicTimeSecs / CooldownSeconds / EpochMillis

  # 座標系: primitive・key・変換・幾何・近傍を責務ごとに分離（architecture.md §6）
  coordinates.ts               # 公開語彙（Position / BlockPosition / ChunkCoord / LocalBlockCoord / AABB）
  coordinate-primitives.ts     # CHUNK_SIZE_XZ 等の定数とブランド型
  coordinate-keys.ts           # BlockPositionKey / ChunkKey の正準文字列キー化
  coordinate-conversions.ts    # チャンクローカル座標などの変換
  coordinate-geometry.ts       # AABB と交差判定
  coordinate-neighbours.ts     # 隣接ブロックの走査順
  projectile-collision.ts      # 線分と AABB の区間衝突
  projectile.ts                 # Arrow の純粋な弾道状態遷移
  explosion-data.ts             # 爆発の定数と値型
  explosion.ts                  # 爆発の純粋な計画と Entity 効果
  primed-tnt-data.ts           # 着火済み TNT の定数と値型
  primed-tnt.ts                # 着火済み TNT の fuse と爆発計画
  wither-data.ts                # Wither の定数と値型
  wither.ts                     # Wither の summon/lifecycle/damage/skull 純粋則
  vehicle.ts                    # 乗り物 snapshot の値型と検証

  # Entity: 語彙・属性・操作を分離（architecture.md §6）
  entity-types.ts              # EntityType の閉じた語彙と runtime guard
  entity-attributes-data.ts    # attribute の値域・既定値のデータ表
  entity-attributes-validation.ts # attribute の境界検証
  entity-attributes.ts         # attribute の解決と modifier 適用
  entity-operations.ts         # Entity の純粋な状態操作
  entity.ts                    # Entity の公開バレル

  # ブロック/アイテム語彙: データと型・guard を分離（architecture.md §6）
  block-type-data.ts           # BLOCK_TYPES の閉じたデータテーブル
  block-type.ts                # BlockType 型と外部入力用 runtime guard
  item-type-data.ts            # ITEM_TYPES の閉じたデータテーブル
  item-type.ts                 # ItemType 型と外部入力用 runtime guard
  block-item.ts                # ブロック↔アイテムの橋（交差を導出し、設置名の例外を明示）
  item-registry.ts             # ItemId の数値 wire ID とスタック上限
  block-break-speed-data.ts    # 公式の道具倍率テーブル
  block-break-speed.ts         # 硬度 lookup と採掘時間計算
  tool-component.ts            # minecraft:tool の順序付き rule 解決
  bedrock-mining-data.ts       # Bedrock 採掘 component の型・既定値・format version
  bedrock-mining-descriptors.ts # Bedrock の ID/state/tag descriptor と query 解決
  bedrock-mining.ts            # Bedrock digger/destructible_by_mining の検証・解決
  json-value.ts                # 有限・非循環 JSON 値の guard、decoder、構造的比較
  text-component-data.ts       # TextComponent の値型と style vocabulary
  text-component-validation.ts # 外部入力の TextComponent 検証
  text-component.ts            # TextComponent の公開境界
  item-component-patch.ts      # namespaced item component patch の immutable decoder と比較
  item-stack.ts                # ItemStack / Slot と数量・スタック上限の検証
  equipment-data.ts            # 装備スロット、装備可能アイテム、耐久値のデータ表
  equipment.ts                 # 装備スナップショット、スロット操作、耐久検証・遷移

  # item component: 値ごとに data・validation・logic を分離（architecture.md §6）
  item-components-data.ts      # component id・rarity・既定値のデータ表
  item-components-validation.ts # 解決済み ItemComponents の境界検証
  item-components.ts           # item ごとの component 解決（公開境界）
  item-component-values-data.ts       # 各 component が取りうる値の型
  item-component-values-validation.ts # 各 component 値の runtime guard
  item-component-values.ts     # 各 component 値のコンストラクタ（公開境界）
  item-attribute-modifiers-data.ts       # attribute modifier の値型と slot vocabulary
  item-attribute-modifiers-validation.ts # attribute modifier の境界検証
  item-attribute-modifiers.ts  # attribute modifier component の構築
  item-combat-data.ts          # 攻撃 component（use_effects / swing / attack_range 等）の値型
  item-combat-validation.ts    # 攻撃 component の境界検証
  item-combat.ts               # 攻撃 component の構築
  item-defense-data.ts         # 防御 component（damage_resistant / blocks_attacks）の値型
  item-defense-validation.ts   # 防御 component の境界検証
  item-defense.ts              # 防御 component の構築
  item-enchantments-data.ts    # 付与済み／保管済みエンチャントの値型
  item-enchantments-validation.ts # エンチャント component の境界検証
  item-enchantments.ts         # エンチャント component の構築
  item-tool-data.ts            # item ごとの既定 tool component のデータ表
  item-tool.ts                 # item-aware な tool component 解決
  weapon-data.ts               # minecraft:weapon の値型と既定値
  weapon-validation.ts         # weapon component の境界検証
  weapon.ts                    # weapon component の構築
  consumable-validation.ts     # consumable component の境界検証
  use-cooldown-validation.ts   # use_cooldown component の境界検証

  # コンテナ: データ表と操作を分離（architecture.md §6）
  inventory-data.ts            # 36 スロットの容量とスロット型
  inventory.ts                 # 追加・除去・集計・保存値の検証
  hotbar-data.ts               # 9 スロットの選択範囲と定数
  hotbar.ts                    # 選択の clamp・循環・インベントリ投影
  recipe-data.ts               # shaped / shapeless recipe の値型と境界検証
  recipe-matching.ts           # station・tag・pattern・priority の純粋な照合
  recipe-json.ts                # Java crafting recipe JSON の strict decoder と data-pack path
  recipe-vanilla-data.ts       # kernel が同梱する crafting recipe のデータ表
  recipe.ts                    # recipe の公開バレル
  recipe-registry.ts           # recipe の data-pack layer と format/priority 選択
  crafting-data.ts             # 作業台 recipe の値型と grid 境界
  crafting.ts                  # 作業台 recipe の照合・適用
  crafting-special-data.ts     # コードで定義される 10 種の special recipe の値型・構築・guard
  crafting-special.ts          # special recipe の照合・適用と染料の混色
  cooking-data.ts              # 可搬な cooking recipe の値型と構築
  cooking.ts                   # cooking recipe の照合・適用
  transmute-data.ts            # crafting transmute の値型・material 範囲・構築
  transmute.ts                 # transmute recipe の照合・適用
  food-data.ts                 # food component と食後効果のデータ表
  food.ts                      # 食用条件・摂取・食器変換の純粋なロジック
  consumable-data.ts           # consumable / use_remainder component の型・既定値・構築 options
  consumable.ts                # food 定義の投影と動的な consume component/effect の純粋な構築
  use-cooldown-data.ts         # use_cooldown component の型
  use-cooldown.ts              # cooldown の構築と単調時計による期限判定
  smelting-data.ts             # 調理 station・レシピ・燃料のデータ表
  smelting-indexes.ts          # 調理レシピの入力索引
  smelting.ts                  # FurnaceState と調理時間の純粋な状態遷移
  brewing-data.ts              # 醸造定数と potion recipe のデータ表
  brewing-indexes.ts           # 醸造レシピの入力索引
  brewing.ts                   # BrewingState と醸造時間の純粋な状態遷移
  dimension.ts                 # Overworld・Nether・End の語彙と runtime guard
  crop-data.ts                 # 作物・土壌・成熟時間・保証ドロップのデータ表
  crop.ts                      # 作付け判定・成熟・成長・骨粉・収穫結果の純粋なロジック
  smithing-data.ts             # 鍛造 station・transform・trim recipe のデータ表
  smithing-indexes.ts          # 鍛造レシピの入力索引
  smithing.ts                  # SmithingOperation と鍛造結果の純粋な変換
  grindstone-data.ts           # 砥石の呪い・耐久ボーナス・経験値コストのデータ表
  grindstone.ts                # 砥石の単体除去・二入力修理・結果計画
  stonecutting-data.ts         # 石切台 recipe のデータ表と境界検証
  stonecutting-indexes.ts      # 石切台 exact/tag ingredient の候補索引
  stonecutting.ts              # 石切台 recipe の照合・入力消費・出力生成
  enchantment-data.ts          # vanilla enchantment ID・Anvil cost・適用対象・競合のデータ表
  enchantment.ts               # Anvil primitive と vanilla enchantment rule の接続
  enchantment-table-data.ts    # エンチャントテーブルの重み・enchantability・定数のデータ表
  enchantment-table.ts         # level cost と 3 offers の純粋な生成
  time-of-day.ts               # TimeState と昼夜・月齢・時刻設定の純粋な計算
  weather.ts                   # WeatherState の語彙・検証・正規化
  settings-data.ts             # Settings の値型・既定値・境界のデータ表
  settings.ts                  # Settings の検証・正規化・key binding 操作
  statistics-data.ts           # Statistics の値型と空の既定値
  statistics.ts                # counter / achievement の記録・解放・正規化
  vitals-model.ts              # Vitals / VitalsView と公式の vitals 定数
  vitals-number.ts             # vitals の数値境界・正規化補助
  vitals-health.ts             # ダメージ・回復・死亡判定
  vitals-hunger.ts             # 飢餓・飽和・食料 tick の純粋な遷移
  vitals-experience.ts         # 経験値曲線・レベル・進捗
  vitals-lifecycle.ts          # リスポーンの状態遷移
  vitals-validation.ts         # 外部入力の検証・正規化
  vitals-view.ts               # UI 向け VitalsView 変換
  vitals.ts                    # vitals の公開バレル
  camera-pose.ts               # PlayerPose の look・pitch clamp・eye position・forward vector
  data-pack-registry.ts        # namespaced layer、format/priority、対象 format の優先順位解決、registry path mapping
  sulfur-cube-registry.ts      # Sulfur Cube archetype の decoder と data-pack layer 選択 facade

  # ブロック能力モデル
  block-capability-data.ts     # boolean 能力フラグの型・既定値・表
  block-capabilities.ts        # 外部入力の検証・既定値解決。data を公開バレル
  block-properties.ts          # 公開バレル
  block-property-data.ts       # 値 vocabulary、型、既定値
  block-property-validation.ts # 外部入力検証と既定値解決
  block-support-data.ts        # supportRule の値 vocabulary と既定値
  block-support.ts             # supportRule の判定（公開境界、監査 §4.6）
  block-harvest-data.ts        # harvestTool / drops の型と既定値
  block-harvest.ts             # harvestTool / drops の解決（公開境界）
  block-interaction-data.ts    # 破壊・設置判定の型と不破壊判定閾値
  block-interaction.ts         # 破壊・置換可能性・設置・アイテム配置橋の純粋な判定
  block-definition.ts          # BlockDefinition と解決関数、実装/下流境界の台帳

  # ブロックレジストリ: 宣言的データと派生インデックスを分離（architecture.md §6）
  block-registry.ts            # 公開境界。数値 id ↔ BlockType と accessor
  block-registry-types.ts      # BlockId 型と AIR_BLOCK_ID
  block-registry-entries.ts    # 宣言的なブロックレジストリの組み立て
  block-registry-entries-foundation.ts            # 基礎ブロック
  block-registry-entries-passable.ts              # passable な非 full 衝突形状のブロック群
  block-registry-entries-collision-shapes.ts      # その他の非 full 衝突形状のブロック群
  block-registry-entries-terrain.ts               # 地形ブロック
  block-registry-entries-ores-and-blocks.ts       # 鉱石・基本ブロック
  block-registry-entries-crops-and-redstone.ts    # 作物・レッドストーン
  block-registry-entries-end.ts                   # エンド・特殊ブロック
  block-registry-entries-structures-and-nether.ts # 構造物・ネザー
  block-registry-rules.ts      # レジストリ行が共有する既定値
  block-registry-indexes.ts    # レジストリ行から導出する id-indexed lookup
  block-state.ts               # 登録済み BlockId のみを許す owned バッファ（BlockState）

  # ワールドの純粋更新: world・fluid・redstone を責務ごとに分離（architecture.md §6）
  block-world.ts               # 位置引きのブロック読み書きを持つ純粋な world 値
  fluid-data.ts                # 流体の種類・流量・定数のデータ表
  fluid-state.ts               # FluidState の値型と world からの導出
  fluid-update.ts              # 1 tick 分の流体伝播
  fluid.ts                     # 流体の公開バレル
  redstone-data.ts             # 信号強度・device 種別・定数のデータ表
  redstone-state.ts            # RedstoneState の値型
  redstone-devices.ts          # repeater / comparator / observer 等の device 値
  redstone-device-update.ts    # device 1 個分の出力計算
  redstone-network.ts          # source・wire・device の伝播評価
  redstone-update-types.ts     # 更新結果と change list の値型
  redstone-update.ts           # 1 tick 分の redstone 更新
  redstone.ts                  # redstone の公開バレル
  portal-frame.ts              # ネザーポータル枠の検出と生成
  portal.ts                    # portal の公開バレル

  # Sulfur Cube: data・validation・logic を分離（architecture.md §6）
  sulfur-cube-data.ts          # archetype の tag・registry・component 識別子
  sulfur-cube-validation.ts    # archetype JSON の境界検証
  sulfur-cube.ts               # archetype の正規化と公開境界

  # Chunk データ構造とコーデック
  chunk.ts                     # Chunk / ChunkHeight / EncodedChunk と versioned codec

  # Anvil: validation・transformation・orchestration を分離（architecture.md §6）
  anvil.ts                     # Anvil の公開境界（計画・適用・snapshot codec）
  anvil-constants.ts           # 境界定数（ANVIL_TOO_EXPENSIVE_LEVEL 等）
  anvil-primitives.ts          # Anvil の branded primitive と境界定数
  anvil-normalization.ts       # エンチャントの正規化
  anvil-validation.ts          # 入力検証と拒否理由
  anvil-transformation.ts      # 修理・統合・repair cost の計算
  anvil-planning.ts            # 検証と計算を束ねた最終計画
  anvil-snapshot-codec.ts      # versioned snapshot の encode / decode

  camera.ts                    # CameraPoseSnapshot
  clock.ts                     # ClockPort
  frame.ts                     # GameModule / StageRegistration / FrameServices
  frame-timing.ts              # frame delta の clamp と loss の純粋計算
scripts/
  verify-package.mjs              # pack 済み成果物の exports / install / runtime ゲート
```

## 3. 非スコープ（明示）

kernel に**置いてはならない**もの。ここを守らないと「共有語彙」が「共有モノリス」に変わる。

### 3-1. サービス実装を持たない

`domain/` しか無いのは省略ではなく制約である。
`InventoryService`（`mc-sim`）/ `ChunkStore`（`mc-worldgen`）/ `WorldRenderer`（`mc-render`）のような**状態を持つサービス**は基盤層の資産であり、
kernel に置くと全リポジトリがそのサービスの都合に巻き込まれる。

kernel が持ってよい「サービスらしきもの」は **Port（インターフェース）だけ**である。
`ClockPort` は Context.Tag と型と、テスト用の固定実装（`fixedClock` / `FixedClockLayer`）を持つが、
実クロックを読むアダプタは持たない。実装は利用側が注入する。

プレイヤーの状態サービス、ダメージ源、食料タイマー、経験値の付与権限、保存形式は上位層が所有する。
kernel の vitals API は値を受け取って次の値を返す純粋な計算と、外部入力の境界検証だけを提供する。

### 3-2. ブロックテーブルを持つ（公開境界は `domain/block-registry.ts`）

この節はもともとこう書かれていた:

> **どのブロックが存在し、どの能力を持つかは kernel の管轄外。** kernel が持つのは
> 「ブロックとはどういう属性の集合か」という**仕組み**と、`BlockType` という**語彙**だけである。
>
> 理由は 2 つ。
>
> 1. どのブロックがどう振る舞うかは**コンテンツ**であり、そのコンテンツを所有するリポジトリが持つべきもの。
>    kernel が推測でテーブルを置くと、下流の各テーブルが「推測のフォーク」になる。
> 2. `docs/capability-flag-audit.md` はまさにその答えを出すための調査であり、
>    先に当て推量の表を置くと監査がそれに引きずられる。

理由 2 は満たされた（監査は完了している。[freeze-checklist.md](./freeze-checklist.md) (a)）。
理由 1 は**消費者が現れた時点で成立しなくなった。**

チャンクバッファの 1 バイトから能力を引きたいリポジトリは 3 つあり、
依存グラフ上で互いに届かない:

| リポジトリ    | kernel から何を引くか                                                                 | kernel 以外の責務依存  |
| ------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| `mc-meshing`  | 数値 id ごとの `opacity`（`transparentBlockIds`、plan.md §3.3）                       | なし                   |
| `mc-physics`  | 数値 id ごとの `passable` / `collisionShape`（plan.md §3.4 は id 名指しを禁じている） | なし                   |
| `mx-gameplay` | 数値 id ごとの `fallsWhenUnsupported`（plan.md §3.11）                                | sim / worldgen / audio |

plan.md §2.3-5 により**依存は推移しない**ので、「下流のどこか」は選択肢ではない。
3 者から見えるリポジトリは mc-kernel しかなく、他に置けば表は 3 つになる。
表が 3 つあるのは、plan.md §3.1 が参照実装の失敗として記録している
「挙動判定が 51 ファイル 229 箇所に散った」状態そのものである。

**理由 1 の懸念（推測のフォーク）は、場所ではなく仕組みが答えている。**
表の各行は「普通の不透明立方体との差分」しか書けないので
（`domain/block-definition.ts`）、間違った行は 1 行の間違いであってフォークではない。

もう半分の議論は独立に成立し、それだけで十分でもある。plan.md §3.1 は kernel に
「`Chunk` データ構造と**コーデック**」を与えている。数値 id は
`BlockType` が `Uint8Array` の中でどう綴られるかそのものであり、
**両端が別リポジトリにあるコーデックはコーデックではない。**

#### id は永久である

セーブファイルは id を保存するので、id はワイヤフォーマットであって配列添字ではない。
`BLOCK_REGISTRY` は全 id を**リテラルで**書き、`test/block-registry.test.ts` が
1 つずつピン留めしている。id 0-10 は mc-worldgen / mc-meshing が既に出荷している番号
（`BLOCK.SAND === 5`）を kernel が**採用した**ものである。逆にしなかったのは、
あちらの golden fixture がその番号で生成済みだからである。

#### ~~依然として持たないもの~~ → `drops` / `harvestTool` は**埋まった**

この節で残っている下流境界は `textureTiles` だけである。`drops` / `harvestTool` は
**アイテム名簿が来た**（`domain/item-type.ts`）ことで kernel に実装でき、
`BLOCK_REGISTRY` の各行が自分のドロップと道具要件を宣言している。

**なぜ別テーブルにしなかったか。** 監査 §3 は `drops` / `harvestTool` を
`opacity` / `hardness` と同じ 28 行の表に**能力として**並べている。能力表の外にある能力は能力ではない。
加えて監査 §7 の「定義テーブルは差分のみ記述する」が効いていて、既定が「自分自身 1 個」である以上
大半の行は drops について何も書かない —— `BlockType` をキーにした別表はその性質を持てず、
「退屈な答え」を書くためだけに全ブロック分の行が要る。
そして監査 §4.9 の一般形（同じ集合が 5 箇所で別メンバーシップになる）がそのまま当てはまる。
何より、別表にすると plan.md §3.1 の「ブロック追加 = 定義テーブル 1 行」が
**2 ファイル 2 行**になる。不変条件が壊れる。

**`supportRule` も埋まった** —— 参照実装の 120 リテラルに対応し、kernel 独自の 3 行を加えた
123 行の block roster が揃ったことで書けるようになり、`domain/block-support.ts` として入った。
`canBlockStaySupported(id, below)` が
その消費口で、mx-gameplay がフォールバックで代用していた per-block 規則をこれで置き換えた。

`textureTiles` は kernel が担当する未定義 property ではなく renderer 所有の境界である。renderer の
`block-texture-map` はアトラスのレイアウト、面ごとの tile 割当、画像 asset をまとめて扱い、
kernel の数値 id ではなく renderer の名前 lookup を入口にする。kernel の registry 順序と
renderer の map 順序は同一ではなく、renderer 固有の asset 集合もあるため、kernel に storage-index
の数値列を追加すると第二の source of truth になる。この判断と所有者は
`DOWNSTREAM_CAPABILITIES`（`domain/block-definition.ts`）に記録している。

**`drops` が表現しないと決めたもの**（いずれも監査が置き場所を決めている）:

| 事象                                                     | 置き場所      | 理由                                                                                                                                                                                    |
| -------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 乱数ドロップ（gravel → flint 10%、oak_leaves → sapling） | `mx-gameplay` | 監査 §6-9。kernel は純粋で RNG を持たない                                                                                                                                               |
| 幸運の倍率適用                                           | `mx-gameplay` | 同上。kernel は `affectedByFortune` を**運ぶ**だけ                                                                                                                                      |
| シルクタッチの**置換**（stone → stone、鉱石 → 鉱石）     | **実装済み**  | `BlockDropRule.silkTouchItem?: ItemType` を `domain/block-harvest.ts` で解決し、stone / grass_block / 14 種の鉱石を registry に登録。`requiresSilkTouch` の gate と置換を分離している。 |

#### 3-2-1. シルクタッチ置換の実装記録

**これは設計上の未決ではない。** 直し方は決まっており、`domain/block-harvest.ts` の
`resolveDrop` のヘッダに書いてある通り**加算的**である:

```
readonly silkTouchItem?: ItemType   // BlockDropRule に 1 メンバ
```

そして同ファイルの変更規則（「新メンバは optional であるか、`BLOCK_PROPERTY_DEFAULTS` に
既定値を持つこと」）を**満たしている**。14 の固定済み消費者のどれも壊さない。

**以下は旧 API ロック運用の歴史的記録である。**
実装当時は公開面の凍結クロックも更新対象になり、
[versioning.md](./versioning.md) の 4 週間ロックの起点を `git log -1 -- api-lock.md` で管理していた。
`BlockDropRule` は当時の `api-lock.md` に型本体が丸ごと転記されていた（141 エントリ中の 1 つ）:

```ts
type BlockDropRule = {
  readonly item: ItemType | "self";
  readonly count: number;
  readonly requiresSilkTouch: boolean;
  readonly silkTouchItem?: ItemType;
  readonly affectedByFortune: boolean;
};
```

optional メンバを追加したため、この公開型と下流のテストを同時に更新した。既存の item ID は変更せず、新規鉱石 item は名簿末尾に追加している。

現在の消費者は `resolveDrop` の `silkTouch` コンテキストを渡し、通常ドロップと置換ドロップを同じ純粋関数で解決する。通常の gate（glass など）は従来どおり `requiresSilkTouch` で制御される。

### 3-3. stage 全順序表を持たない

`StageId` / `StageRegistration` という型は kernel に置くが、**標準 stage 順序表は `mc-compose` の資産**（plan.md §2.3-3）。
kernel に置けば順序変更のたびに全リポジトリが bump される。

### 3-4. 「1 ブロック固有のルール」を持たない

監査 §6 が「フラグに還元できない残余」として 10 項目挙げている。これらは kernel に置かない。

ただし、公式 Java `minecraft:tool` の単一ブロック・ブロック配列・`#` 付きタグを含む順序付き rule 解決、`ToolResolutionContext.blockTags` に渡された明示的な tag membership の解決、Bedrock `minecraft:digger` / `minecraft:destructible_by_mining` の descriptor・状態・tag query・item-specific speed の解決、およびブロック硬度・道具速度から tick 数を求める副作用のない計算は例外である。複数 consumer が同じ式を必要とする共有ドメインロジックとして `tool-component.ts`、`bedrock-mining-descriptors.ts`、`bedrock-mining.ts`、`block-break-speed.ts` に置く。装備スナップショット内の耐久検証と純粋な減少・破損遷移も `equipment.ts` に置く。tag membership の構築、プレイヤー操作の進行状態、採掘イベントへの耐久適用、ドロップ生成、サーバー権威判定は上位が所有する。

| 残余                                                        | 置き場所      | 理由                                                         |
| ----------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| 右クリック UI ルーティング（CRAFTING_TABLE→作業台画面 等）  | `mx-ui`       | `interactable: boolean` に潰すと画面選択の情報が消える       |
| ドア状態遷移（`DOOR ⇄ DOOR_OPEN`）                          | `mx-gameplay` | ペア関係でありフラグではない                                 |
| 流体接触の生成規則（lava + water → OBSIDIAN / COBBLESTONE） | `mx-gameplay` | **2 セルの組み合わせ結果**であり単一ブロックの属性に落ちない |
| ポータル枠の幾何検証                                        | `mc-worldgen` | 構造パターン照合                                             |
| 道具 × ブロックの個別作用（エンダーアイ・火打石）           | `mx-gameplay` | アイテム側のルール                                           |
| レッドストーン部品の後片付け集合                            | `mx-redstone` | 当該モジュールのコンポーネント名簿                           |
| 作物のドロップ規則（熟度分岐 + 乱数）                       | `mx-gameplay` | `drops` では表現できない                                     |

将来これらが能力フラグへ流れ込まないよう、監査 §7 は「フラグではない拡張点」として
`interactionId?: string` と `stateVariants?: { open?, lit?, filled? }` を明示的に分離しておくことを推奨している。
kernel の能力フラグとしては定義しない（`domain/block-definition.ts` にも置かない）。導入する際は
能力フラグ表ではなく `BlockDefinition` の独立フィールドとして足すこと。

### 3-5. 参照実装から**移植しない**と決めたもの

`BlockPropertiesSchema` の `properties.solid` と `faces` は移植しない。
監査 §7 が production での参照を実測し、**ヒット 0** を確認している（`rg '\.solid\b'` / `rg '\.faces\b'`）。
誰も読まないフィールドを凍結対象 API に入れるのは、凍結を最も安く間違える方法である。

`test/block-definition.test.ts` がこの 2 つの不在を固定している。

### 3-6. `AIR` を能力で表現しない

`AIR` は「ブロックが無い」ことを表す番兵であり、能力フラグではない。`BlockId` は
`Uint8Array` の添字として使える安定した密な数値 ID なので、kernel は
`isEmpty(blockId)` を **id 0 の直接比較**として公開する。

`isEmpty` の引数は `number` とする。下流はチャンクバッファから読み出した未ブランドの byte を
そのまま渡せる必要があり、0 以外（範囲外・小数・`NaN` を含む）は空気ではない。
この predicate はレジストリ lookup や能力表を引かず、公開された `AIR_BLOCK_ID` と同じ契約を共有する。
`BlockIndex` 型や公開 mutable 配列を別に増やすものではない。

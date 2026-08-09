# ブロック能力フラグ監査 (capability flag audit)

- 作成日: 2026-07-26
- 対象: `mc-kernel` の `BlockDefinition` テーブル凍結の前提調査
- 参照実装: `<reference-impl>`(以下、パスはこのリポジトリルート相対)
- 上位仕様: plan.md（**非公開**）§3.1 / §3.12

## 1. 目的

plan.md §3.1 は能力フラグとして `passable` / `fallsWhenUnsupported` / `fluid` / `flammable` / `transparent` / `emissive`、§3.12 が `pistonImmovable` を挙げるが、末尾が「等」で閉じられており網羅リストではない。`mc-kernel` は 14 の下流リポジトリからピン留めバージョンで参照されるため、フラグの取りこぼしは追加時に連鎖 bump を招く。本書は参照実装の既存挙動判定を一次資料として、必要なフラグ集合を確定する。

## 2. 方法と計数

1. `packages/core/domain/block-type.ts:3-132` の `BlockTypeSchema` から語彙を取得。**リテラル数 120**(plan.md の記述は概数)。
   - **2026-07-27 追記: この 120 は再計数して確認済み。**`Schema.Literal(...)`(`block-type.ts:4-131`)は
     コメント 8 行を除いて **120 リテラル / distinct 120 / 重複なし**。独立した手書き配列である
     `INDEX_TO_BLOCK_TYPE`(`block-registry-entries.ts` / `block-registry-indexes.ts`)も **120 / distinct 120** で、**両者の集合は完全に一致**する
     (対称差が空)。コメント行を除外せずに行数で数えると 128 になるので、その混同だけは避けること。
     重複を確認したのは、閉じたリテラル union では**メンバー集合が型そのもの**であり、重複があれば
     行数が型の大きさを過大に言うため。詳細は [testing.md](./testing.md) §5.2。
2. `packages/` と `src/` を ripgrep で走査。除外: `node_modules` / `*.test.ts` / `*.spec.ts` / `**/test/**` / `dist*` / `coverage`。
3. 検出パターンと実測値:
   - ブロック名リテラルの生出現(`=== 'X'` / `!== 'X'` / `case 'X':` / `blockTypeToIndex('X')`): **335 箇所 / 80 ファイル**。うち多数は `packages/world/domain/terrain/*` の地形生成 **書き込み**であり挙動判定ではない。
   - 比較文脈(`===` / `!==` / `case`)に限定: **192 箇所 / 61 ファイル**。
   - ブロック名を列挙する membership テーブル(`new Set<BlockType>` / `HashSet.fromIterable<BlockType>` / `Record<BlockType, …>` / `new Set([blockTypeToIndex(…)])`): **約 30 定義 / 28 ファイル**。
   - 上記2つの和集合: **78 ファイル**。
4. plan.md §3.1 の「51ファイル229箇所」とは計数条件(テスト除外・比較文脈限定)が異なる。定義の差であり、どちらかが誤りとは判断しない。
5. 表の「出現数」は **その能力を担う識別子(定義+全参照)の ripgrep ヒット行数**(production のみ)の概算。

## 3. サマリ

| capability | 型 | 答える問い | 出現数 | plan.md |
|---|---|---|---|---|
| `passable` | boolean | プレイヤー/Mob がすり抜けるか | 47 | ✅ |
| `collisionShape` | enum `full\|slab\|cactus\|pressurePlate\|none` | 当たり判定の形状 | 4 | ❌ |
| `fluid` | enum `none\|water\|lava` | 流体源か、どちらの流体か | 43 | ⚠️(boolean 想定) |
| `fallsWhenUnsupported` | boolean | 下が空くと落下するか | 4 | ✅ |
| `replaceable` | boolean | 設置/落下/流体が上書きできるか | 12 | ❌ |
| `flammable` | boolean | 延焼するか | 3 | ✅ |
| `fireSource` | boolean | 永続的な火を支えるか | 2 | ❌ |
| `opacity` | enum `opaque\|transparentSolid\|fluid` | メッシュ分岐・光減衰 | 54 | ⚠️(boolean 想定) |
| `lightEmission` | number 0–15 | 発光レベル | 10 | ⚠️(boolean 想定) |
| `pistonImmovable` | boolean | ピストンが押せるか | 5 | ✅ (§3.12) |
| `hardness` | number 0–100 | 破壊時間の基数 | 6 | ❌ |
| `friction` | number 0–1 | 地表の摩擦 | 6 | ❌ |
| `harvestTool` | struct `{category, minTier}` | ドロップに必要な道具 | 33 | ❌ |
| `supportRule` | enum/struct | 直下に何を要求するか | 13 | ❌ |
| `canSupportAttachments` | boolean | 付属ブロックの足場になるか | 13 | ❌ |
| `brokenByWaterFlow` | boolean | 水流で破壊されるか | 7 | ❌ |
| `suffocates` | boolean | 頭が埋まると窒息するか | 6 | ❌ |
| `contactDamage` | number | 接触ダメージ量 | 8 | ❌ |
| `climbable` | boolean | よじ登れるか | 5 | ❌ |
| `railKind` | enum `none\|normal\|powered` | 乗り物の走行面か | 15 | ❌ |
| `movementDrag` | number | 移動を減速させるか | 5 | ❌ |
| `renderKind` | enum `cube\|cross\|cactus\|rail\|lilyPad\|fluid` | メッシュ生成の形状 | 15 | ❌ |
| `validSpawnSurface` | boolean | スポーン/村の地面として使えるか | 4 | ❌ |
| `drops` | struct `{item, silkTouchItem?, count, requiresSilkTouch, fortune}` | 破壊時のドロップ | 25 | ✅ (`block-harvest.ts`) |
| `xpOnBreak` | number | 破壊時の経験値 | 6 | ❌ |
| `footstepMaterial` | enum `grass\|wood\|stone\|default` | 足音の素材 | 9 | ✅ (`block-properties.ts`) |
| `tillable` | boolean | クワで耕せるか | 2 | ✅ |
| `textureTiles` | struct `{top, bottom, side}` | アトラスのどのタイルか | 2 | ❌ |

## 4. 各能力の根拠と提案セマンティクス

### 4.1 `passable` / `collisionShape` / `movementDrag` / `climbable` / `railKind`

`packages/game/domain/block-collision-predicates.ts` が物理側の中心。`PASSABLE_BLOCK_IDS`(:22-42、19 種の名指し)を `isPassableBlockType`(:44)、`isBlockSolid`(:107)、`isBlockSolidForMobPhysics`(:124)、`getBlockCollisionShapeAt`(:135)が共有する。形状分岐は :136(CACTUS)、:137(PRESSURE_PLATE)、:138(`SLAB_BLOCK_IDS`)。同ファイル :177-182 が `isInLadder`、:184-201 が `isOnRail` / `isOnPoweredRail`、:203-208 が `isInCobweb`。`packages/app/application/frame/stages/interaction-item-use-handler/minecart-mount.ts:45` と `vehicle-enter.ts:93` が RAIL/POWERED_RAIL を再び名指しする。

- 既定値: `passable=false` / `collisionShape='full'` / `climbable=false` / `railKind='none'` / `movementDrag=0`。未指定ブロックは「普通の固体立方体」に落ちるのが安全側。
- :18-21 のコメントが「LEAVES を passable に入れると樹冠をすり抜ける」既知バグを記録している。フラグ化後もこの回帰テストを移植すること。

### 4.2 `fluid` / `replaceable`

`packages/rendering/infrastructure/meshing/greedy-meshing-fluid-state.ts:25` `isFluidBlockId`、:27 `fluidTypeForBlockId` が WATER/LAVA を二値で振り分ける。`packages/world/application/fluid-state-ops.ts:48,69,71`、`packages/world/application/block-service-place-commit.ts:16-23`(`switch` で WATER/LAVA を seed)、`packages/app/.../interaction-bucket-handler/bucket-handler.ts:13,16` も同じ二分岐。**boolean ではなく種別 enum が必要**(バケツ・ダメージ・メッシュ材質が種別で分岐するため)。

`replaceable` は「そのセルに別ブロックを書けるか」。`packages/world/application/block-service-place-load.ts:50`(AIR か WATER なら設置可)、`packages/world/domain/falling-block.ts:15-19` `FALLABLE_INTO_BLOCK_IDXS`(AIR/WATER/LAVA)、`packages/world/application/fluid-service-helpers.ts:30`、`packages/app/.../interaction-farming-handler.config.ts:5` `SAPLING_REPLACEABLE_BLOCK_TYPES`(AIR/LEAVES/SAPLING)。

- 既定値: `fluid='none'` / `replaceable=false`。

### 4.3 `flammable` / `fireSource`

`packages/world/domain/fire-lifecycle.ts:18-30` が `FLAMMABLE_BLOCK_TYPES`(11 種)を列挙し :32 で index Set に変換、:75 `isFlammableIndex` が延焼判定に使う。:77-78 `isFireSourceIndex` は NETHERRACK / LAVA を名指しし、「永続的に火を支える」を表す別概念。:80-81 `isFireSupportIndex` は「AIR/FIRE/WATER 以外」= `canSupportAttachments` に近い派生。

- 既定値: `flammable=false` / `fireSource=false`。

### 4.4 `opacity` / `lightEmission`

`packages/worker/infrastructure/meshing/meshing-worker-config.ts:7-13` が **2 つの別集合**を持つ: `TRANSPARENT_IDS_ARRAY`(WATER。水シェーダ)と `TRANSPARENT_SOLID_IDS_ARRAY`(GLASS/LEAVES。アトラス+アルファ)。plan.md §3.3 の「優先度 transparentSolid > water > opaque」もこの三分法を前提にしている。したがって `transparent: boolean` では表現できず **3 値 enum** が必要。

`packages/block/domain/light.ts:14-17` が `properties.transparency` から光減衰テーブルを、:24-36 `EMISSIVE_LEVEL_OVERRIDES` が LAVA=15 / TORCH=14 / NETHER_PORTAL=11 / REDSTONE_ORE=9 / REDSTONE_TORCH=7 / END_PORTAL_FRAME=1 を定義する。:38-46 で boolean `emissive` と override を合成して 0–15 のテーブルを作り、:61 `isTransparent` / :63 `emissiveLightLevel` / :78 `isTransparentIndex` / :81 `emissiveLevelByIndex` として公開する。**boolean `emissive` は既に参照実装内で数値へ昇格されている**。

- 既定値: `opacity='opaque'` / `lightEmission=0`。

### 4.5 `hardness` / `friction` / `harvestTool` / `drops` / `xpOnBreak`

`packages/block/domain/block.ts:9-15` の `BlockPropertiesSchema` は既に `hardness: number` と `friction: number` を持つ。`packages/block/domain/break-speed.ts:6-10` が hardness テーブルを構築し、:29-43 `computeBreakTicks` が道具倍率と合成。`packages/game/domain/block-collision-predicates.ts:61-63,152-161` が friction を物理へ流す。

道具要件は `packages/world/domain/harvestable-blocks.ts:14-67` の 4 段階 HashSet(wooden→stone→iron→diamond)+ `packages/world/domain/block-utils.ts:22-27` `canHarvestBlock` / :32-63 `isEffectiveTool`(axe/shovel カテゴリ)。ゲートは `packages/world/application/block-service-break-helpers.ts:65,158`。**ティア(ドロップ可否)とカテゴリ(速度ボーナス)は別軸**なので struct 化する。

ドロップは `packages/world/application/block-service.config.ts:151-187` `INVENTORY_DROP_OVERRIDES`(24 エントリ)、:192-197 `blockDropsBaseItem`(ICE のみ false)、:204-215 `BLOCK_BASE_DROP_COUNT`、:270-276 `FORTUNE_ORE_BLOCKS`、`packages/app/.../interaction-break-handler.shared.ts:9` `NEVER_DROPPED_BLOCK_TYPES`。経験値は `packages/block/domain/blocks.config.ores.ts:8-45`。

- 既定値: `hardness=8`(`blocks.config.terrain.ts:9-14` の `defaultBlockProperties` に一致) / `friction=0.6`(同、`DEFAULT_BLOCK_FRICTION` と一致) / `harvestTool=undefined`(素手可) / `drops={item: 自身, count: 1}` / `xpOnBreak=0`。

#### 4.5.1 解決済み(2026-07-27): `hardness` 列の尺度混在

**この節は「未解決」として記録され、語彙を 120 に完成させる作業で決着した。**
決着させざるを得なかった理由は、84 行を新しく足す側にあった —— 一方の尺度で 84 行、
もう一方で 13 行という表は、列の値どうしを一切比較できない表である。

**採用したのは参照実装の 0-100 相対尺度**（`blocks.config.terrain.ts:4-8` が明示している）。
この節が当初推奨していた方であり、理由も当初のまま: 監査 §4.5 が引く既定値 8 が
`defaultBlockProperties.hardness` そのものであり、kernel の `bedrock` = 100 も同じ尺度で、
**出典を引ける尺度はこれしかない**。vanilla float 側には「相対順序の由来」以上の地位が無い。

修正した行（当初 8 行として記録したが、機械的に導出し直したところ **13 行**あった）:

| ブロック | 修正前 | 修正後（参照実装） |
| --- | --- | --- |
| `stone` | 8（未指定） | **25** |
| `grass_block` | 8（未指定） | **10** |
| `cobblestone` | 8（未指定） | **35** |
| `piston` | 8（未指定） | **55** |
| `sand` | 0.5 | **8** |
| `gravel` | 0.6 | **10** |
| `snow` | 0.1 | **2** |
| `glass` | 0.3 | **4** |
| `glowstone` | 0.3 | **4** |
| `oak_leaves` | 0.2 | **3** |
| `torch` | 0 | **1** |
| `oak_log` | 2 | **35** |
| `oak_planks` | 2 | **35** |

**当初の記録が 8 行としていたのは、目視で拾ったからである。**
`grass_block` / `cobblestone` / `piston` / `torch` / `glowstone` の 5 行は
「値が書いていない」形の誤りだったので、値を見比べる読み方では見えなかった。
**未指定は既定値の主張であり、既定値が正しくなければ未指定は誤りである** ——
この形の誤りを数え落とした事実の方が、13 という数より重要である。

`oak_log` / `oak_planks` の順序反転（既定 8 より柔らかい 2 → 参照実装は 35）は
当初の記録どおり実挙動の差だった。`break-speed.ts:29-43` は hardness を採掘時間の基数に
線形に使うので、丸太が土より速く掘れていた。

**ついでに `friction` 列にも同じ形の誤りが 10 行あった**（`air` / `bedrock` / `stone` /
`sand` / `water` / `snow` / `gravel` / `lava` / `torch` / `cobblestone`）。
いずれも参照実装が値を持つ行で kernel が既定 0.6 を取っていたもので、
`getBlockFrictionAt`（`block-collision-predicates.ts:152-161`）は
プレイヤーが立っているブロックの値を読むため、全て挙動の差である。
石の 0.8 / 砂の 0.5 / 雪の 0.3 / 氷の 0.98 が全て 0.6 になっていた。

両列とも `test/block-registry.test.ts` がブロックごとに参照実装の値で固定した。

#### 4.5.2 未解決(2026-07-27 記録): 参照実装の `hardness` 列自体に尺度が 2 つある

§4.5.1 を解決した際に、**同じ欠陥が参照実装の側にもあることが分かった**。
kernel はこれを転記しており、**変換していない**。

`packages/block/domain/blocks.config.end.ts` は 13 エントリを 1 つのヘルパー経由で作るが、
そのうち **12 個は vanilla の float**、1 個だけが 0-100 尺度である:

| ブロック | 参照実装の値 | どちらの尺度か |
| --- | --- | --- |
| `PURPUR_BLOCK` / `PURPUR_PILLAR` / `PURPUR_SLAB` / `PURPUR_STAIRS` | 1.5 | vanilla float |
| `SHULKER_BOX` | 2 | vanilla float |
| `DRAGON_EGG` | 3 | vanilla float |
| `ENDER_CHEST` | 22.5 | vanilla float |
| `CHORUS_FLOWER` / `CHORUS_PLANT` | 0.4 | vanilla float |
| `END_CRYSTAL` / `END_ROD` | 0 | どちらでも同じ |
| `END_GATEWAY` | **-1** | どちらでもない（下記） |
| `END_STONE_BRICKS` | 45 | **0-100 尺度** |

**変換せず転記した理由**: 参照実装自身の float → 尺度の対応は式ではなく手作りの順序である
（0.5→8, 1.5→25, 2.0→35, 3.0→50, 50→90）。変換するとは数値を選ぶことであり、
それは「列の見た目を整えるために内容を捏造する」ことになる。
**目に見える帰結**: purpur は土（8）より柔らかく読める。これは出典がそう言っている。

**したがって `hardness` 列はグループ境界を越えて比較してはならない。**
0-100 尺度に乗っているのは The End 以外の 103 行であり、The End の 17 行は別尺度である。

##### 範囲外の 2 値

`domain/block-properties.ts` は `hardness` を「0..100」と述べているが、
参照実装には両側にはみ出す値がある。扱いを分けた:

- **`END_PORTAL_FRAME` / `_FILLED` = 9000**: そのまま転記した。
  参照実装の「破壊不能」の綴りで、`bedrock` の 100 より上。
  **列の単調性（大きいほど硬い）を保つので、範囲外でも比較可能**である。
- **`END_GATEWAY` = -1**: **転記しなかった。0 にした。**
  負の hardness は「とても硬い」ではない。`computeBreakTicks`（`break-speed.ts:29-31`）は
  `hardness <= 0` で 0 を返すので、**-1 は「即座に壊れる」を意味し、意図の正反対**である。
  これは参照実装のバグである。0 は同関数の下で -1 と挙動が同一かつ範囲内なので、
  バグを継承せずに挙動を転記できる。なお `end_gateway` は `endBlockDrops` が
  `AIR` に写すのでいずれにせよ何も落とさない。

#### 4.5.3 `INVENTORY_DROP_OVERRIDES` は 24 エントリではなく 29 エントリ

§4.5 の本文は「`block-service.config.ts:151-187` `INVENTORY_DROP_OVERRIDES`(24 エントリ)」と
書いているが、**現在の参照実装では 29 ある**（機械的に数えた）。
24 はおそらく監査時点の値で、その後 5 行増えたものである。

実害は無かった（kernel は個々の行を名指しで転記しており、総数に依存していない）が、
**この文書がこの組織で 7 例目の「間違った測り方で正当化された数字」になるところだった**
という点で記録する価値がある。§2-1 の「リテラル数 120」は再計数して正しいことが
確認されている（`docs/testing.md` §5.2）—— 同じ文書の中で片方は正しく片方は古い。

### 4.6 `supportRule` / `canSupportAttachments` / `brokenByWaterFlow`

`packages/world/domain/block-support.ts` に集中。:22-32 `SUPPORT_SENSITIVE_BLOCK_TYPES`(TORCH/REDSTONE_*/PRESSURE_PLATE/RAIL/作物/草花)、:75-91 `SUPPORT_RULES`(作物→FARMLAND、SUGAR_CANE→DIRT/GRASS/SAND/自身、CACTUS→SAND/自身、LILY_PAD→WATER、草花→DIRT/GRASS/FARMLAND)、:47-61 `NON_SUPPORTING_BLOCK_TYPES`、:34-45 `WATER_BREAKABLE_BLOCK_TYPES` → :103 `isWaterBreakableBlockIndex`(`fluid-service-helpers.ts:30` から利用)。

- 既定値: `supportRule='none'` / `canSupportAttachments=true` / `brokenByWaterFlow=false`。

#### 4.6.1 追記: `supportRule` を実装した（3 テーブルを 1 列に畳んだ）

`domain/block-support.ts` に `SupportRule` として実装済み。**参照実装の 3 テーブルを 1 列にしてある**:

| 参照実装 | kernel |
| --- | --- |
| `SUPPORT_SENSITIVE_BLOCK_TYPES`（:22-32） | `kind !== 'none'`（導出。集合を持たない） |
| `SUPPORT_RULES`（:75-91） | `{ kind: 'oneOf', blocks }` |
| `NON_SUPPORTING_BLOCK_TYPES`（:47-61） | `{ kind: 'anySupporting' }` → 既存の `canSupportAttachments` を読む |

**感度集合を別に持たなかったのは §4.9 の結論の直接の適用である。**
同じ概念を 2 箇所に持てば 2 つのメンバーシップになる。`supportSensitive` フラグと
`supportRule` 表を両方持てば、「感度があるが規則が無い」（実在する状態）と
「規則があるが感度が無い」（誰も読まない規則）が別々に表現でき、後者は黙って壊れる。

**値は述語ではなくデータである。** 参照実装の `SUPPORT_RULES` は
`Map<BlockType, (blockBelow) => boolean>` でありクロージャを値に持つ。クロージャは
`api-lock.md` に差分として出せず、ミラーに転記して比較もできない。`'oneOf'` はリストを持つ。
参照実装の 5 エントリはすべて `Set.has` か `===` なので、表現力は失われていない。

**規則を持たない 6 種**（`torch` / `redstone_torch` / `redstone_wire` / `pressure_plate` /
`rail` / `powered_rail`）は `:75-89` に**行が無い**ことが根拠なので、
`NEEDS_ANY_SUPPORT` を「その不在を書き下したもの」として持つ。ここで
「土か石の上」などと**推論しなかった**ことが重要である（§4.9.1(c) の
「ここで推論すると、それはコンテンツの捏造になる」と同じ理由）。

19 行が非既定値（6 + 作物 3 + 草花 7 + 水辺 3）、残り 101 行は `'none'`。

### 4.7 `suffocates` / `contactDamage`

`packages/entity/domain/environment-hazard.config.ts:39-85` `NON_SUFFOCATING_BLOCKS`(約 45 種の否定リスト)→ `packages/entity/domain/environment-hazard-resolution.ts:4` `isSuffocatingBlock`。接触ダメージは `packages/app/.../physics-stage-survival/environment.ts:41,51`(CACTUS)、`environment-hazards.ts:54`(LAVA)、`environment-hazard.config.ts:7,26`(LAVA_DAMAGE=4 / CACTUS_DAMAGE=1)。

- 既定値: `suffocates=true`(固体既定に合わせる。ただし `passable=true` なら常に false を導出する方が安全) / `contactDamage=0`。
- 注意: 現行の否定リストは 45 種を数える一方、肯定側(窒息する固体)は既定で真。フラグ導入時は **`suffocates` を `!passable && opacity==='opaque'` から導出できるか**を先に検証すべき(本調査では否定リストに GLASS / STONE_SLAB / OAK_STAIRS が含まれるため、完全な導出は不可と判断した)。

### 4.8 `renderKind` / `textureTiles` / `footstepMaterial` / `validSpawnSurface`

`packages/rendering/infrastructure/meshing/plant-mesh.ts:18-28` `CROSS_PLANT_IDS`(9 種)、:30-34 CACTUS/RAIL/POWERED_RAIL/LILY_PAD、:43 `plantMeshLookup`、:45 `isPlantMeshBlockId`(`greedy-meshing-algorithms.ts:40,79,118,157,196,235` の 6 方向ループが参照)。テクスチャは `packages/rendering/infrastructure/textures/block-texture-map.config.ts:18` `TILE_MAP`(storage index 順に約 119 行、面ごとのタイル番号)→ `block-texture-map.ts:12` `getTileIndex`。足音は `packages/app/.../physics-stage-survival/footstep-sound-data.ts:3,5,15` の 3 素材リスト → `footstep-sound-logic.ts:13,16`。スポーン面は `packages/app/application/main/spawn-selection-search.ts:41-60` と `packages/entity/application/village/village-placement-surface.ts:6-12`(ほぼ同内容の重複)。

- 既定値: `renderKind='cube'` / `footstepMaterial='default'` / `validSpawnSurface=true` / `textureTiles` は必須(既定なし)。
- `TILE_MAP` は **配列の位置で BlockType に対応**しており、定義テーブルと順序が二重管理になっている。kernel では `BlockDefinition` の一フィールドに統合すべき典型例。

### 4.9 「非固体」概念の重複という重要な発見

同じ「非固体っぽいブロック群」が **5 箇所で独立に、しかも異なるメンバーシップで**列挙されている: `block-collision-predicates.ts:22`(衝突)、`environment-hazard.config.ts:39`(窒息)、`block-support.ts:47`(足場)、`spawn-selection-search.ts:41`(スポーン)、`village-placement-surface.ts:6`(村)。差分の例:

- GLASS: 窒息しない・スポーン面として不可 **だが衝突は固体**
- LEAVES: スポーン面/村地面として不可・窒息しない **だが衝突は固体**(:18-21 のバグ記録)
- SNOW: `NON_SUPPORTING` には含まれるが `PASSABLE` には含まれない

これらを 1 つの `solid` フラグに統合すると必ず退行する。**`passable` / `suffocates` / `canSupportAttachments` / `validSpawnSurface` は独立したフラグとして持つこと**が本監査の最重要結論のひとつ。

#### 4.9.1 追記(2026-07-27): 同じ欠陥をさらに 11 件見つけた

`BLOCK_TYPES` を 18 → 36 に広げ、`PASSABLE_BLOCK_IDS` の 19 メンバーを全て kernel の表に載せる作業の中で、
**同じ「集合ごとにメンバーシップが違う」欠陥が新たに 11 件見つかった**。本節が 3 件挙げていたものと同じ形である。

**(a) `NON_SUFFOCATING_BLOCKS` が漏らしている 6 件**

`PASSABLE_BLOCK_IDS`(`block-collision-predicates.ts:22-42`)には入っているが
`NON_SUFFOCATING_BLOCKS`(`environment-hazard.config.ts:39-85`)に無いもの:

`SUGAR_CANE` / `LILY_PAD` / `KELP` / `SEAGRASS` / `RAIL` / `POWERED_RAIL`

字義どおり読むと**レールの中に立っているプレイヤーが窒息する**。これは §4.7 が既に述べた
「`passable=true` なら常に false を導出する方が安全」という一方向の含意が要る理由の実例である。

**(b) `NON_SPAWN_SURFACE_BLOCK_IDS` が漏らしている 5 件**

`RAIL` / `POWERED_RAIL` / `KELP` / `SEAGRASS` / `STONE_SLAB` は
`NON_SPAWN_SURFACE_BLOCK_IDS`(`spawn-selection-search.ts:41-84`)に無い。

**(c) kernel 側の対処 —— この 2 つを別扱いにした理由**

- `suffocates` は **推論した**。§4.7 に明示の含意があり、「すり抜けられるのに窒息する」は
  未記載ではなく**非整合**だから。該当行にはその旨を書いてある。
- `validSpawnSurface` は **推論しなかった**。本節の結論そのものが「5 つの概念は独立」であり、
  `snow`(非支持だが passable でない)と `glass`(固体だがスポーン面でない)が
  「passable であること」から何も導けないことの証拠になっている。参照実装の沈黙をそのまま転記し、
  漏れとして記録した。**ここで推論すると、それはコンテンツの捏造になる。**

`KELP` / `SEAGRASS` が 3 つの表(上記 2 つと `NON_SUPPORTING_BLOCK_TYPES`)から同時に漏れているのは、
両者が `INDEX_TO_BLOCK_TYPE` の append-only 末尾にある最新の型だからである。
§6-8 が `BLOCK_ITEMS` について記録した漏れと**同じ 2 つのブロック**であり、
手書きの membership set は名簿が伸びるたびにこうなる、という一般則の追加証拠になる。

**(d) kernel 自身にも同じ欠陥が 1 件あった(修正済み)**

`oak_log` の行は `validSpawnSurface` を書いておらず、既定の `true` に落ちていた。
しかし参照実装は `WOOD` を `NON_SPAWN_SURFACE_BLOCK_IDS`(:45、コメント「log — semi-solid / tree」)と
`VILLAGE_NON_GROUND_IDS`(`village-placement-surface.ts:11`)の**両方**に挙げている。
本節が「互いに食い違う」として挙げた 2 つの重複リストが、ここでは一致していた —— 逃げ場がない。

**既定値が `true` のフラグは、書き忘れが「振る舞いへのオプトイン」になる**という点で危険度が違う。
`mx-gameplay/domain/chunk-store-port.ts` の転記にも同じ穴があり、
`mc-dev-meta` の `pnpm check:mirrors` は `MIRROR_SPECS` が `fallsWhenUnsupported` と `replaceable` の
2 つしか probe していなかったため**両者が同じ間違いで一致していた**。
`validSpawnSurface` の probe を追加した。教訓は id 1 個の話ではなく probe 配列の形の話である:
**ミラーが転記している能力の数より probe が少なければ、そのチェックは検査していない成功を報告する。**

### 4.10 追記(2026-07-27): 語彙を 120 に完成させて見つかった §4.9 の追加事例

§4.9 は参照実装の「非固体」概念の重複を 5 例挙げた。**残り 84 リテラルを転記した際に、
同じ形の不一致がさらに見つかった。**いずれも kernel は転記しており、推測で埋めていない。

#### 4.10.1 作物 3 種の `suffocates` が割れている（最も鋭い事例）

`block-support.ts:20` の `CROP_BLOCK_TYPES` は 3 メンバーの**閉じた集合**であり、
同ファイルのすべての規則がこの 3 つを同一に扱う。ところが
`NON_SUFFOCATING_BLOCKS`（`environment-hazard.config.ts:39-85`）は **2 つしか挙げていない**:

| ブロック | `NON_SUFFOCATING_BLOCKS` |
| --- | --- |
| `WHEAT_CROP` | 記載あり（:48） |
| `NETHER_WART_CROP` | 記載あり（:49） |
| `POTATO_CROP` | **記載なし** |

**これまでの 5 例は「別々のテーブルが別々のブロックについて食い違う」形だったが、
これは出典自身が集合として定義しているものを割っている。**

**kernel は補完していない。** 監査 §4.7 の「`passable=true` なら `suffocates=false` を
導出してよい」という含意は使えない —— **作物は passable ではない**。
`PASSABLE_BLOCK_IDS` に作物は 1 つも入っていないので、参照実装において作物は
衝突上は完全な立方体である。導出を許す規則が存在しない以上、埋めれば勘である。

#### 4.10.2 「作物は非固体」は `properties.solid` を読めば真、実際の挙動では偽

上と同じ根の話で、§7 が `properties.solid` を「production では読まれていない」として
**却下した判断を裏づける最良の事例**なので独立させる。

`plantBlockProperties` は作物に `solid: false` を与える。しかし衝突を決めるのは
`PASSABLE_BLOCK_IDS` だけであり（`getBlockCollisionShapeAt`、`:135-141`）、
作物はそこに無い。**`solid` を信じて実装すると、プレイヤーは小麦畑をすり抜ける。**
レッドストーン部品（`REDSTONE_WIRE` / `LEVER` / `STONE_BUTTON` / `REPEATER`）と
`DOOR` / `BED` も同じ形で、いずれも `solid: false` かつ衝突は完全な立方体である。

#### 4.10.3 `transmitsLight` と `!suffocates` の一致は崩れた

36 行時点では全行で `opacity !== 'opaque'` と `!suffocates` が一致しており、
`test/block-registry.test.ts` が「一致しているが依存してはならない」として空集合を固定していた。
**120 行では 10 行が分離する**（両方向に）:

- **不透明なのに窒息しない**: `farmland` / `ender_chest` / `shulker_box` /
  `enchanting_table` / `end_portal_frame` / `_filled`
- **透明なのに窒息する**: `ice` / `potato_crop` / `brewing_stand` / `fire`

当時の注記は「`oak_stairs` が入ったら崩れる」と予測していたが、
`OAK_STAIRS` は `transparency: true` なので実際には一致側に留まった —— **予測は結論が当たり、
理由が外れていた**。テーブル全体に対する表明として書いてあったので、それでも機能した。

#### 4.10.4 空のレジストリ行という欠陥の形（`piston`、`oak_log` に次ぐ 2 例目）

不一致は参照実装側だけではなかった。kernel の `piston` 行は**オーバーライドを 1 つも
書かない行**で、「普通の不透明立方体である」という主張の実例として置かれていた。
その主張は 2 列で偽だった —— `PISTON` は `NON_SPAWN_SURFACE_BLOCK_IDS` に記載があり
（`spawn-selection-search.ts:68`）、`hardness` も 55 である。

**`validSpawnSurface` のような既定 `true` のフラグでは、「何も書かない」が
「その挙動を選ぶ」になる。** `oak_log` で一度直したのと同じ欠陥であり、
今回は「述べることが無い行」という設計上の飾りが原因だった。
**表から空の行は無くした** —— 「確認して述べることが無い」と「確認していない」が
同じ綴りになる限り、この欠陥は再発する。

## 5. plan.md に無いフラグ(ギャップリスト)

plan.md §3.1 / §3.12 に列挙されていないが、参照実装の挙動に**必須**のもの:

1. `hardness` (number) — 採掘時間の基数。`break-speed.ts:6-43`
2. `friction` (number) — 地表摩擦。`block-collision-predicates.ts:61-63,152-161`
3. `harvestTool` (struct) — ドロップ可否のティア + 速度カテゴリ。`harvestable-blocks.ts:14-67`, `block-utils.ts:22-63`
4. `drops` (struct) — ドロップ品目/個数/シルクタッチ/幸運。`block-service.config.ts:151-276`
5. `xpOnBreak` (number) — `blocks.config.ores.ts:8-45`
6. `supportRule` (enum/struct) — `block-support.ts:75-101`
7. `canSupportAttachments` (boolean) — `block-support.ts:47-61`
8. `brokenByWaterFlow` (boolean) — `block-support.ts:34-45,103`
9. `replaceable` (boolean) — `block-service-place-load.ts:50`, `falling-block.ts:15-19`
10. `suffocates` (boolean) — `environment-hazard.config.ts:39-85`
11. `contactDamage` (number) — `environment.ts:41,51`, `environment-hazards.ts:54`
12. `climbable` (boolean) — `block-collision-predicates.ts:177-182`
13. `railKind` (enum) — `block-collision-predicates.ts:184-201`, `minecart-mount.ts:45`
14. `movementDrag` (number) — `block-collision-predicates.ts:203-208`
15. `collisionShape` (enum) — `block-collision-predicates.ts:136-139`
16. `renderKind` (enum) — `plant-mesh.ts:18-49`
17. `fireSource` (boolean) — `fire-lifecycle.ts:77-78`
18. `validSpawnSurface` (boolean) — `spawn-selection-search.ts:41-60`
19. `footstepMaterial` (enum) — `footstep-sound-data.ts:3-23`
20. `tillable` (boolean) — `block-service.config.ts:264-267`
21. `textureTiles` (struct) — `block-texture-map.config.ts:18`(現状は index 順の別配列で二重管理)

さらに **plan.md にある 3 つは型が誤っている**:

- `emissive: boolean` → `lightEmission: 0..15`(`light.ts:24-46` が既に override テーブルで数値化済み)
- `transparent: boolean` → `opacity: 3 値 enum`(`meshing-worker-config.ts:7-13` が 2 集合を保持、plan.md §3.3 自身が 3 優先度を要求)
- `fluid: boolean` → `fluid: 'none'|'water'|'lava'`(`greedy-meshing-fluid-state.ts:27`, `block-service-place-commit.ts:16-23`)

## 6. フラグに還元できない残余

以下は「1 ブロック固有のルール」であり、フラグ化しても呼び出し側の分岐が消えない。kernel には**置かず**、体験モジュール側に識別子比較として残すべきもの:

1. **右クリック UI ルーティング** — `interaction-right-click-target-routing.ts:12-27`。CRAFTING_TABLE / FURNACE / BED / ENCHANTING_TABLE / ANVIL / CHEST / DOOR が **それぞれ別画面**に分岐する。`interactable: boolean` に潰すと画面選択の情報が失われる。`interactionId?: string` を持たせるのが上限で、意味は mx-ui 側にある。
2. **ドア状態遷移** — `interaction-placement-handler.ts:87`(`DOOR ⇄ DOOR_OPEN`)、`block-service-break-helpers.ts:97`。ペア関係の表現であってフラグではない。同様に `REDSTONE_LAMP ⇄ REDSTONE_LAMP_LIT`(`redstone-lamp-world-effects.ts:83`)、`WATER_CAULDRON ⇄ CAULDRON`(`bucket-handler.ts:115-125`)。`stateVariants` のようなペア表として別枠で持つのが妥当。
3. **流体接触の生成規則** — `packages/world/domain/fluid-contact.ts:9-11` `resolveContact`(source lava→OBSIDIAN / flowing lava→COBBLESTONE)+ `fluid-service-contact-ops.ts:52,61-62`。**2 セルの組み合わせ結果**であり、単一ブロックの属性に落ちない。レシピ表が必要。
4. **ポータル枠の幾何検証** — `nether/portal-frame.ts:106-111`(OBSIDIAN の枠)、`end/end-portal-frame.ts:30`(END_PORTAL_FRAME_FILLED の 12 点リング)。構造パターン照合であり、フラグでは表現できない。
5. **エンダーアイ / 火打石など道具×ブロックの個別作用** — `interaction-ender-eye-handler.ts:138`、`interaction-flint-steel-handler.ts:38`(TNT 点火)、`interaction-farming-handler.ts:217`(SAPLING→木)。アイテム側のルールであってブロック属性ではない。
6. **AIR の同一性比較(71 箇所)** — `AIR` は「ブロックが無い」ことを表す番兵であり能力ではない。`greedy-meshing-ao.ts:20-85` の 24 箇所は AO 計算のための「隣が空か」判定。kernel では `isEmpty(blockId)` を **index 0 の定数比較**として公開し、フラグ表を引かせないこと(ホットパス)。
7. **レッドストーン部品の後片付け集合** — `interaction-break-handler.shared.ts:11-22` `REDSTONE_CLEANUP_BLOCK_TYPES`。mx-redstone が所有するコンポーネント名簿であり、kernel の語彙ではない。
8. **クリエイティブ/HUD の描画都合の集合** — `first-person-held-item.ts:58-76` `BLOCK_ITEMS`(「アイテムとして手に持てるブロック」)。これは `ItemType ∩ BlockType` の導出であり、フラグではなく型レベルで解決すべき(現に KELP / SEAGRASS / AMETHYST_* / RAIL などの新しい型が漏れている手書きの重複リストになっている)。
9. **作物のドロップ規則** — `interaction-break-handler.crop-drops.config.ts:9-` `CROP_DROP_RULES`。熟度で分岐し、熟した場合は乱数関数を返す。`drops` フラグでは表現できず、作物ごとのルール表として mx-gameplay に残す。
10. **アイテム→レッドストーン部品の設置表** — `interaction-redstone-handler.ts:69-80`。アイテム側の対応表であり、ブロック属性ではない。

## 7. kernel API への含意

- **`BlockDefinition` は現行の `BlockPropertiesSchema`(`block.ts:9-15`、5 フィールド)では足りない。** 上記 26 能力を持つフラットな struct にする。
- **現行 `properties.solid` と `faces` は production で一度も読まれていない**(`rg '\.solid\b'` / `rg '\.faces\b'` が production でヒット 0)。空フィールドを移植せず、`passable` / `renderKind` に統合すること。
- **既定値は「普通の不透明立方体」に倒す。** 全フラグに既定を持たせ、定義テーブルは差分のみ記述する(`blocks.config.terrain.ts:9-24` の `defaultBlockProperties` / `defaultBlockFaces` の方式を踏襲)。これにより新フラグ追加が **加算的**になり、下流の再ビルドを伴う破壊的変更を避けられる。
- **ホットパスは index 配列に事前展開する。** 参照実装は `light.ts:49-60`(`Uint8Array`)、`plant-mesh.ts:36-43`(`makeLookup`)、`block-collision-predicates.ts:61-63` で既にこの形をとっている。kernel は「宣言的テーブル」と「index 展開済みルックアップ」の両方を公開し、消費側に `Set`/`HashSet` を組ませない。
- **非 boolean 能力(`lightEmission` / `hardness` / `friction` / `contactDamage` / `xpOnBreak` / `movementDrag`)を最初から数値で持つ。** boolean から数値へ広げるのは破壊的変更になる。
- **`drops` / `harvestTool` は struct のため最も揺れやすい。** `BlockDefinition` にも API ロックを適用し、この 2 フィールドを別ファイルに切り出して差分レビューを容易にすること。
- **残余(§6)の受け皿を最初から用意する。** `interactionId?: string` と `stateVariants?: { open?, lit?, filled? }` を「フラグではない拡張点」として明示的に分離しておくと、体験モジュールが能力フラグを乱用しない。

## 8. 参照実装に「存在しない」概念(将来フラグの候補だが今回は根拠なし)

Minecraft 一般には能力フラグだが参照実装には**実装が無い**もの。根拠がないため v1 には**入れない**ことを推奨する(加算的に追加できる既定値設計は保つ)。

- **`blastResistance` / 爆発によるブロック破壊** — `packages/entity/domain/explosion.ts` と `explosion-resolution.ts:4,17` はエンティティへのダメージのみを計算し、ブロックを壊さない。耐性テーブルも免疫リストも存在しない。
- **`waterloggable`** — 実装なし。最も近いのは `WATER_BREAKABLE_BLOCK_TYPES`(`block-support.ts:34`)と AIR/WATER 置換規則(`block-service-place-load.ts:50`)。
- **`redstoneConductive` / `redstonePowerSource`** — `packages/entity/domain/redstone/redstone-simulation.ts:24` `canConduct` / :36 `isPowerSource` は `RedstoneComponentType` を取り `BlockType` を見ていない。導通は**ブロック属性ではなくコンポーネント属性**として実装済みで、kernel に持ち上げる根拠はない。
- **ブロックごとの破壊/設置音** — `packages/game/application/sound-manager.types.ts:4-6` に汎用の `blockBreak` / `blockPlace` があるのみ。素材別テーブルは足音(§4.8)にしか存在しない。

## 9. 確度と限界

- ripgrep のパターン網羅性に依存するため、動的に組み立てられる文字列比較やブロック名を経由しない index 直書きは検出できていない。
- 「出現数」列は識別子単位の ripgrep ヒット行数であり、意味的な判定箇所数と厳密には一致しない。優先順位付けには十分だが削減量の KPI には使えない。

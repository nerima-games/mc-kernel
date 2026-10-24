/**
 * Branded scalar quantities.
 * Every quantity here is a refined brand, not a nominal one: the constructor
 * validates values, so an invalid value can enter only through an explicit
 * cast. `X(v)` throws for invalid input; `X.result(v)` and `X.option(v)` return
 * validation results without throwing. Use them at trust boundaries.
 */
import { Brand } from 'effect'

/**
 * Maximum items in one inventory stack.
 *
 * Per-item limits (64 / 16 / 1) live in `item-components-data.ts`; this remains the
 * upper bound of the representable range shared by every item stack.
 */
export const MAX_STACK_COUNT = 99

const MIN_NON_NEGATIVE_VALUE = 0
const MIN_STACK_COUNT = 1

/** Number of items in a stack. Empty slots are represented by ItemSlot, not zero. */
export type StackCount = number & Brand.Brand<'StackCount'>

export const StackCount: Brand.Constructor<StackCount> = Brand.make<StackCount>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_STACK_COUNT && value <= MAX_STACK_COUNT
      ? true
      : `StackCount must be an integer in [${MIN_STACK_COUNT}, ${MAX_STACK_COUNT}], received ${value}`,
)

/** A positive quantity used when transferring items between slots. */
export type TransferQuantity = number & Brand.Brand<'TransferQuantity'>

export const TransferQuantity: Brand.Constructor<TransferQuantity> = Brand.make<TransferQuantity>(
  (value) =>
    Number.isSafeInteger(value) && value >= 1 && value <= 99
      ? true
      : `TransferQuantity must be an integer in [1, 99], received ${String(value)}`,
)

/** Official `max_stack_size`: an integer in [1, 99]. */
export type MaxStackSize = number & Brand.Brand<'MaxStackSize'>

export const MaxStackSize: Brand.Constructor<MaxStackSize> = Brand.make<MaxStackSize>(
  (value) =>
    Number.isSafeInteger(value) && value >= 1 && value <= 99
      ? true
      : `MaxStackSize must be a safe integer in [1, 99], received ${value}`,
)

/** Official `max_damage`: a positive safe integer. */
export type MaxDamage = number & Brand.Brand<'MaxDamage'>

export const MaxDamage: Brand.Constructor<MaxDamage> = Brand.make<MaxDamage>(
  (value) =>
    Number.isSafeInteger(value) && value > MIN_NON_NEGATIVE_VALUE
      ? true
      : `MaxDamage must be a positive safe integer, received ${value}`,
)

/** Official `damage`: a non-negative safe integer. */
export type ItemDamage = number & Brand.Brand<'ItemDamage'>

export const ItemDamage: Brand.Constructor<ItemDamage> = Brand.make<ItemDamage>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `ItemDamage must be a non-negative safe integer, received ${value}`,
)

/** Official `repair_cost`: a non-negative safe integer. */
export type RepairCost = number & Brand.Brand<'RepairCost'>

export const RepairCost: Brand.Constructor<RepairCost> = Brand.make<RepairCost>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `RepairCost must be a non-negative safe integer, received ${value}`,
)

/**
 * Elapsed simulation time for one frame, in seconds.
 *
 * Non-negative and finite. A zero delta is legal (a frame may be scheduled
 * twice within the same clock tick) and must be handled by stages rather than
 * rejected here.
 */
export type DeltaTimeSecs = number & Brand.Brand<'DeltaTimeSecs'>

export const DeltaTimeSecs: Brand.Constructor<DeltaTimeSecs> = Brand.make<DeltaTimeSecs>(
  (value) =>
    Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `DeltaTimeSecs must be a finite, non-negative number of seconds, received ${value}`,
)

/** A fixed simulation duration, in seconds. */
export type FixedDurationSecs = number & Brand.Brand<'FixedDurationSecs'>

export const FixedDurationSecs: Brand.Constructor<FixedDurationSecs> = Brand.make<FixedDurationSecs>(
  (value) =>
    Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `FixedDurationSecs must be a finite, non-negative number of seconds, received ${value}`,
)

/** A non-negative logical simulation tick index. */
export type SimulationTick = number & Brand.Brand<'SimulationTick'>

export const SimulationTick: Brand.Constructor<SimulationTick> = Brand.make<SimulationTick>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `SimulationTick must be a non-negative safe integer, received ${value}`,
)

/** A finite fraction used to interpolate between fixed simulation ticks. */
export type InterpolationFraction = number & Brand.Brand<'InterpolationFraction'>

export const InterpolationFraction: Brand.Constructor<InterpolationFraction> =
  Brand.make<InterpolationFraction>(
    (value) =>
      Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE && value < 1
        ? true
        : `InterpolationFraction must be a finite number in [0, 1), received ${value}`,
  )

/** Identifies one lifecycle generation of a running session. */
export type SessionEpoch = string & Brand.Brand<'SessionEpoch'>

export const SessionEpoch: Brand.Constructor<SessionEpoch> = Brand.make<SessionEpoch>(
  (value) =>
    typeof value === 'string' && value.trim().length > 0
      ? true
      : 'SessionEpoch must be a non-empty string, received invalid value',
)

/** A non-negative safe integer count of logical ticks. */
export type NonNegativeTickCount = number & Brand.Brand<'NonNegativeTickCount'>

export const NonNegativeTickCount: Brand.Constructor<NonNegativeTickCount> =
  Brand.make<NonNegativeTickCount>(
    (value) =>
      Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE
        ? true
        : `NonNegativeTickCount must be a non-negative safe integer, received ${value}`,
  )

/** A positive safe integer count of logical ticks. */
export type PositiveTickCount = number & Brand.Brand<'PositiveTickCount'>

export const PositiveTickCount: Brand.Constructor<PositiveTickCount> = Brand.make<PositiveTickCount>(
  (value) =>
    Number.isSafeInteger(value) && value > MIN_NON_NEGATIVE_VALUE
      ? true
      : `PositiveTickCount must be a positive safe integer, received ${value}`,
)

/**
 * A reading from a monotonic clock, in seconds.
 *
 * Monotonic means: never decreases, and is unaffected by wall-clock
 * adjustments. The origin is unspecified — only differences are meaningful.
 * Obtain it from `ClockPort`, never from a global.
 */
export type MonotonicTimeSecs = number & Brand.Brand<'MonotonicTimeSecs'>

export const MonotonicTimeSecs: Brand.Constructor<MonotonicTimeSecs> = Brand.make<MonotonicTimeSecs>(
  (value) =>
    Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `MonotonicTimeSecs must be a finite, non-negative number of seconds, received ${value}`,
)

/** Positive duration used by an item `use_cooldown` component. */
export type CooldownSeconds = number & Brand.Brand<'CooldownSeconds'>

export const CooldownSeconds: Brand.Constructor<CooldownSeconds> = Brand.make<CooldownSeconds>(
  (value) =>
    Number.isFinite(value) && value > MIN_NON_NEGATIVE_VALUE
      ? true
      : `CooldownSeconds must be a finite, positive number of seconds, received ${value}`,
)

/** Non-negative duration used by an item `consumable` component. */
export type ConsumeSeconds = number & Brand.Brand<'ConsumeSeconds'>

export const ConsumeSeconds: Brand.Constructor<ConsumeSeconds> = Brand.make<ConsumeSeconds>(
  (value) =>
    Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `ConsumeSeconds must be a finite, non-negative number of seconds, received ${value}`,
)

/** Non-negative scale used by an item `potion_duration_scale` component. */
export type PotionDurationScale = number & Brand.Brand<'PotionDurationScale'>

export const PotionDurationScale: Brand.Constructor<PotionDurationScale> =
  Brand.make<PotionDurationScale>(
    (value) =>
      Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
        ? true
        : `PotionDurationScale must be a finite, non-negative number, received ${value}`,
  )

/** Java integer used by the transient `additional_trade_cost` component. */
export type AdditionalTradeCost = number & Brand.Brand<'AdditionalTradeCost'>

export const AdditionalTradeCost: Brand.Constructor<AdditionalTradeCost> =
  Brand.make<AdditionalTradeCost>(
    (value) =>
      Number.isSafeInteger(value)
        ? true
        : `AdditionalTradeCost must be a safe integer, received ${value}`,
  )

/** Non-negative safe integer used by the `map_id` item component. */
export type MapId = number & Brand.Brand<'MapId'>

export const MapId: Brand.Constructor<MapId> = Brand.make<MapId>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE
      ? true
      : `MapId must be a non-negative safe integer, received ${value}`,
)

/** Non-negative duration used by an item `weapon` component. */
export type WeaponDisableBlockingSeconds = number & Brand.Brand<'WeaponDisableBlockingSeconds'>

export const WeaponDisableBlockingSeconds: Brand.Constructor<WeaponDisableBlockingSeconds> =
  Brand.make<WeaponDisableBlockingSeconds>(
    (value) =>
      Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
        ? true
        : `WeaponDisableBlockingSeconds must be a finite, non-negative number of seconds, received ${value}`,
  )

/** Fraction in [0, 1] used by `minimum_attack_charge`. */
export type AttackCharge = number & Brand.Brand<'AttackCharge'>

export const AttackCharge: Brand.Constructor<AttackCharge> = Brand.make<AttackCharge>(
  (value) =>
    Number.isFinite(value) && value >= 0 && value <= 1
      ? true
      : `AttackCharge must be a finite number in [0, 1], received ${value}`,
)

/** Fraction in [0, 1] used by `use_effects.speed_multiplier`. */
export type UseSpeedMultiplier = number & Brand.Brand<'UseSpeedMultiplier'>

export const UseSpeedMultiplier: Brand.Constructor<UseSpeedMultiplier> =
  Brand.make<UseSpeedMultiplier>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 1
        ? true
        : `UseSpeedMultiplier must be a finite number in [0, 1], received ${value}`,
  )

/** Distance in blocks used by an item `attack_range` component. */
export type AttackRangeDistance = number & Brand.Brand<'AttackRangeDistance'>

export const AttackRangeDistance: Brand.Constructor<AttackRangeDistance> =
  Brand.make<AttackRangeDistance>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 64
        ? true
        : `AttackRangeDistance must be a finite number in [0, 64], received ${value}`,
  )

/** Hitbox margin in blocks used by an item `attack_range` component. */
export type AttackHitboxMargin = number & Brand.Brand<'AttackHitboxMargin'>

export const AttackHitboxMargin: Brand.Constructor<AttackHitboxMargin> =
  Brand.make<AttackHitboxMargin>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 1
        ? true
        : `AttackHitboxMargin must be a finite number in [0, 1], received ${value}`,
  )

/** Mob reach multiplier in [0, 2] used by an item `attack_range` component. */
export type MobAttackRangeFactor = number & Brand.Brand<'MobAttackRangeFactor'>

export const MobAttackRangeFactor: Brand.Constructor<MobAttackRangeFactor> =
  Brand.make<MobAttackRangeFactor>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 2
        ? true
        : `MobAttackRangeFactor must be a finite number in [0, 2], received ${value}`,
  )

/** Non-negative integer tick duration used by an item `swing_animation`. */
export type SwingAnimationDuration = number & Brand.Brand<'SwingAnimationDuration'>

export const SwingAnimationDuration: Brand.Constructor<SwingAnimationDuration> =
  Brand.make<SwingAnimationDuration>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `SwingAnimationDuration must be a non-negative safe integer, received ${value}`,
  )

/** Non-negative delay used by an item `blocks_attacks` component. */
export type BlockingDelaySeconds = number & Brand.Brand<'BlockingDelaySeconds'>

export const BlockingDelaySeconds: Brand.Constructor<BlockingDelaySeconds> =
  Brand.make<BlockingDelaySeconds>(
    (value) =>
      Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
        ? true
        : `BlockingDelaySeconds must be a finite, non-negative number of seconds, received ${value}`,
  )

/** Non-negative cooldown scale used by an item `blocks_attacks` component. */
export type DisableCooldownScale = number & Brand.Brand<'DisableCooldownScale'>

export const DisableCooldownScale: Brand.Constructor<DisableCooldownScale> =
  Brand.make<DisableCooldownScale>(
    (value) =>
      Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
        ? true
        : `DisableCooldownScale must be a finite, non-negative number, received ${value}`,
  )

/** Finite base damage used by an item `blocks_attacks` damage reduction. */
export type DamageReductionBase = number & Brand.Brand<'DamageReductionBase'>

export const DamageReductionBase: Brand.Constructor<DamageReductionBase> =
  Brand.make<DamageReductionBase>(
    (value) =>
      Number.isFinite(value)
        ? true
        : `DamageReductionBase must be a finite number, received ${value}`,
  )

/** Finite damage factor used by an item `blocks_attacks` damage reduction. */
export type DamageReductionFactor = number & Brand.Brand<'DamageReductionFactor'>

export const DamageReductionFactor: Brand.Constructor<DamageReductionFactor> =
  Brand.make<DamageReductionFactor>(
    (value) =>
      Number.isFinite(value)
        ? true
        : `DamageReductionFactor must be a finite number, received ${value}`,
  )

/** Positive blocking angle in degrees used by an item `blocks_attacks` rule. */
export type HorizontalBlockingAngle = number & Brand.Brand<'HorizontalBlockingAngle'>

export const HorizontalBlockingAngle: Brand.Constructor<HorizontalBlockingAngle> =
  Brand.make<HorizontalBlockingAngle>(
    (value) =>
      Number.isFinite(value) && value > MIN_NON_NEGATIVE_VALUE
        ? true
        : `HorizontalBlockingAngle must be a finite, positive number, received ${value}`,
  )

/** Non-negative threshold used by an item `blocks_attacks.item_damage` rule. */
export type ItemDamageThreshold = number & Brand.Brand<'ItemDamageThreshold'>

export const ItemDamageThreshold: Brand.Constructor<ItemDamageThreshold> =
  Brand.make<ItemDamageThreshold>(
    (value) =>
      Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE
        ? true
        : `ItemDamageThreshold must be a finite, non-negative number, received ${value}`,
  )

/** Finite base item damage used by an item `blocks_attacks` rule. */
export type ItemDamageBase = number & Brand.Brand<'ItemDamageBase'>

export const ItemDamageBase: Brand.Constructor<ItemDamageBase> = Brand.make<ItemDamageBase>(
  (value) =>
    Number.isFinite(value)
      ? true
      : `ItemDamageBase must be a finite number, received ${value}`,
)

/** Finite item damage factor used by an item `blocks_attacks` rule. */
export type ItemDamageFactor = number & Brand.Brand<'ItemDamageFactor'>

export const ItemDamageFactor: Brand.Constructor<ItemDamageFactor> = Brand.make<ItemDamageFactor>(
  (value) =>
    Number.isFinite(value)
      ? true
      : `ItemDamageFactor must be a finite number, received ${value}`,
)

/** Official enchantment level in [0, 255]. */
export type EnchantmentLevel = number & Brand.Brand<'EnchantmentLevel'>

export const EnchantmentLevel: Brand.Constructor<EnchantmentLevel> = Brand.make<EnchantmentLevel>(
  (value) =>
    Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE && value <= 255
      ? true
      : `EnchantmentLevel must be a safe integer in [0, 255], received ${value}`,
)

/** Finite amount used by an item attribute modifier. */
export type AttributeModifierAmount = number & Brand.Brand<'AttributeModifierAmount'>

export const AttributeModifierAmount: Brand.Constructor<AttributeModifierAmount> =
  Brand.make<AttributeModifierAmount>(
    (value) =>
      Number.isFinite(value)
        ? true
        : `AttributeModifierAmount must be a finite number, received ${value}`,
  )

/** Portion of collision velocity restituted by an entity or block in [0, 1]. */
export type Bounciness = number & Brand.Brand<'Bounciness'>

export const Bounciness: Brand.Constructor<Bounciness> = Brand.make<Bounciness>(
  (value) =>
    Number.isFinite(value) && value >= 0 && value <= 1
      ? true
      : `Bounciness must be a finite number in [0, 1], received ${value}`,
)

/** Entity physics modifier in the official [0, 2048] range. */
export type EntityPhysicsModifier = number & Brand.Brand<'EntityPhysicsModifier'>

export const EntityPhysicsModifier: Brand.Constructor<EntityPhysicsModifier> =
  Brand.make<EntityPhysicsModifier>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 2048
        ? true
        : `EntityPhysicsModifier must be a finite number in [0, 2048], received ${value}`,
  )

/** Entity name/scoreboard display distance in blocks in [0, 512]. */
export type EntityVisibilityDistance = number & Brand.Brand<'EntityVisibilityDistance'>

export const EntityVisibilityDistance: Brand.Constructor<EntityVisibilityDistance> =
  Brand.make<EntityVisibilityDistance>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 512
        ? true
        : `EntityVisibilityDistance must be a finite number in [0, 512], received ${value}`,
  )

/** Knockback resistance after the 26.2 lower-bound change to -2. */
export type KnockbackResistance = number & Brand.Brand<'KnockbackResistance'>

export const KnockbackResistance: Brand.Constructor<KnockbackResistance> =
  Brand.make<KnockbackResistance>(
    (value) =>
      Number.isFinite(value) && value >= -2
        ? true
        : `KnockbackResistance must be a finite number >= -2, received ${value}`,
  )

/**
 * A wall-clock reading: milliseconds since the Unix epoch.
 *
 * Use this only for things a human will read or that must survive a save/load
 * round trip. Never use it to measure durations — it can jump backwards.
 * Obtain it from `ClockPort`, never from a global.
 */
export type EpochMillis = number & Brand.Brand<'EpochMillis'>

export const EpochMillis: Brand.Constructor<EpochMillis> = Brand.make<EpochMillis>(
  (value) =>
    Number.isSafeInteger(value)
      ? true
      : `EpochMillis must be a safe integer number of milliseconds, received ${value}`,
)

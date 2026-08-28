/**
 * Branded scalar quantities.
 * Every quantity here is a *refined* brand, not a nominal one: the constructor
 * performs the validation, so an invalid value can only enter the system by
 * someone writing an explicit cast. `X(v)` throws, `X.either(v)` / `X.option(v)`
 * do not — prefer the latter at trust boundaries.
 */
import { Brand } from 'effect'

/**
 * Maximum items in one inventory stack.
 *
 * Per-item limits (64 / 16 / 1) live in `item-components-data.ts`; this remains the
 * upper bound of the representable range shared by every item stack.
 */
export const MAX_STACK_COUNT = 64

const MIN_NON_NEGATIVE_VALUE = 0

/** Number of items in one inventory stack. Integer in [0, MAX_STACK_COUNT]. */
export type StackCount = number & Brand.Brand<'StackCount'>

export const StackCount: Brand.Brand.Constructor<StackCount> = Brand.refined<StackCount>(
  (value) => Number.isInteger(value) && value >= MIN_NON_NEGATIVE_VALUE && value <= MAX_STACK_COUNT,
  (value) => Brand.error(`StackCount must be an integer in [0, ${MAX_STACK_COUNT}], received ${value}`),
)

/** Official `max_stack_size`: an integer in [1, 99]. */
export type MaxStackSize = number & Brand.Brand<'MaxStackSize'>

export const MaxStackSize: Brand.Brand.Constructor<MaxStackSize> = Brand.refined<MaxStackSize>(
  (value) => Number.isSafeInteger(value) && value >= 1 && value <= 99,
  (value) => Brand.error(`MaxStackSize must be a safe integer in [1, 99], received ${value}`),
)

/** Official `max_damage`: a positive safe integer. */
export type MaxDamage = number & Brand.Brand<'MaxDamage'>

export const MaxDamage: Brand.Brand.Constructor<MaxDamage> = Brand.refined<MaxDamage>(
  (value) => Number.isSafeInteger(value) && value > MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`MaxDamage must be a positive safe integer, received ${value}`),
)

/** Official `damage`: a non-negative safe integer. */
export type ItemDamage = number & Brand.Brand<'ItemDamage'>

export const ItemDamage: Brand.Brand.Constructor<ItemDamage> = Brand.refined<ItemDamage>(
  (value) => Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`ItemDamage must be a non-negative safe integer, received ${value}`),
)

/** Official `repair_cost`: a non-negative safe integer. */
export type RepairCost = number & Brand.Brand<'RepairCost'>

export const RepairCost: Brand.Brand.Constructor<RepairCost> = Brand.refined<RepairCost>(
  (value) => Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`RepairCost must be a non-negative safe integer, received ${value}`),
)

/**
 * Elapsed simulation time for one frame, in seconds.
 *
 * Non-negative and finite. A zero delta is legal (a frame may be scheduled
 * twice within the same clock tick) and must be handled by stages rather than
 * rejected here.
 */
export type DeltaTimeSecs = number & Brand.Brand<'DeltaTimeSecs'>

export const DeltaTimeSecs: Brand.Brand.Constructor<DeltaTimeSecs> = Brand.refined<DeltaTimeSecs>(
  (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`DeltaTimeSecs must be a finite, non-negative number of seconds, received ${value}`),
)

/**
 * A reading from a monotonic clock, in seconds.
 *
 * Monotonic means: never decreases, and is unaffected by wall-clock
 * adjustments. The origin is unspecified — only differences are meaningful.
 * Obtain it from `ClockPort`, never from a global.
 */
export type MonotonicTimeSecs = number & Brand.Brand<'MonotonicTimeSecs'>

export const MonotonicTimeSecs: Brand.Brand.Constructor<MonotonicTimeSecs> = Brand.refined<MonotonicTimeSecs>(
  (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`MonotonicTimeSecs must be a finite, non-negative number of seconds, received ${value}`),
)

/** Positive duration used by an item `use_cooldown` component. */
export type CooldownSeconds = number & Brand.Brand<'CooldownSeconds'>

export const CooldownSeconds: Brand.Brand.Constructor<CooldownSeconds> = Brand.refined<CooldownSeconds>(
  (value) => Number.isFinite(value) && value > MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`CooldownSeconds must be a finite, positive number of seconds, received ${value}`),
)

/** Non-negative duration used by an item `consumable` component. */
export type ConsumeSeconds = number & Brand.Brand<'ConsumeSeconds'>

export const ConsumeSeconds: Brand.Brand.Constructor<ConsumeSeconds> = Brand.refined<ConsumeSeconds>(
  (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`ConsumeSeconds must be a finite, non-negative number of seconds, received ${value}`),
)

/** Non-negative scale used by an item `potion_duration_scale` component. */
export type PotionDurationScale = number & Brand.Brand<'PotionDurationScale'>

export const PotionDurationScale: Brand.Brand.Constructor<PotionDurationScale> =
  Brand.refined<PotionDurationScale>(
    (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
    (value) => Brand.error(`PotionDurationScale must be a finite, non-negative number, received ${value}`),
  )

/** Java integer used by the transient `additional_trade_cost` component. */
export type AdditionalTradeCost = number & Brand.Brand<'AdditionalTradeCost'>

export const AdditionalTradeCost: Brand.Brand.Constructor<AdditionalTradeCost> =
  Brand.refined<AdditionalTradeCost>(
    (value) => Number.isSafeInteger(value),
    (value) => Brand.error(`AdditionalTradeCost must be a safe integer, received ${value}`),
  )

/** Non-negative safe integer used by the `map_id` item component. */
export type MapId = number & Brand.Brand<'MapId'>

export const MapId: Brand.Brand.Constructor<MapId> = Brand.refined<MapId>(
  (value) => Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE,
  (value) => Brand.error(`MapId must be a non-negative safe integer, received ${value}`),
)

/** Non-negative duration used by an item `weapon` component. */
export type WeaponDisableBlockingSeconds = number & Brand.Brand<'WeaponDisableBlockingSeconds'>

export const WeaponDisableBlockingSeconds: Brand.Brand.Constructor<WeaponDisableBlockingSeconds> =
  Brand.refined<WeaponDisableBlockingSeconds>(
    (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
    (value) =>
      Brand.error(
        `WeaponDisableBlockingSeconds must be a finite, non-negative number of seconds, received ${value}`,
      ),
  )

/** Fraction in [0, 1] used by `minimum_attack_charge`. */
export type AttackCharge = number & Brand.Brand<'AttackCharge'>

export const AttackCharge: Brand.Brand.Constructor<AttackCharge> = Brand.refined<AttackCharge>(
  (value) => Number.isFinite(value) && value >= 0 && value <= 1,
  (value) => Brand.error(`AttackCharge must be a finite number in [0, 1], received ${value}`),
)

/** Fraction in [0, 1] used by `use_effects.speed_multiplier`. */
export type UseSpeedMultiplier = number & Brand.Brand<'UseSpeedMultiplier'>

export const UseSpeedMultiplier: Brand.Brand.Constructor<UseSpeedMultiplier> =
  Brand.refined<UseSpeedMultiplier>(
    (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    (value) => Brand.error(`UseSpeedMultiplier must be a finite number in [0, 1], received ${value}`),
  )

/** Distance in blocks used by an item `attack_range` component. */
export type AttackRangeDistance = number & Brand.Brand<'AttackRangeDistance'>

export const AttackRangeDistance: Brand.Brand.Constructor<AttackRangeDistance> =
  Brand.refined<AttackRangeDistance>(
    (value) => Number.isFinite(value) && value >= 0 && value <= 64,
    (value) => Brand.error(`AttackRangeDistance must be a finite number in [0, 64], received ${value}`),
  )

/** Hitbox margin in blocks used by an item `attack_range` component. */
export type AttackHitboxMargin = number & Brand.Brand<'AttackHitboxMargin'>

export const AttackHitboxMargin: Brand.Brand.Constructor<AttackHitboxMargin> =
  Brand.refined<AttackHitboxMargin>(
    (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    (value) => Brand.error(`AttackHitboxMargin must be a finite number in [0, 1], received ${value}`),
  )

/** Mob reach multiplier in [0, 2] used by an item `attack_range` component. */
export type MobAttackRangeFactor = number & Brand.Brand<'MobAttackRangeFactor'>

export const MobAttackRangeFactor: Brand.Brand.Constructor<MobAttackRangeFactor> =
  Brand.refined<MobAttackRangeFactor>(
    (value) => Number.isFinite(value) && value >= 0 && value <= 2,
    (value) => Brand.error(`MobAttackRangeFactor must be a finite number in [0, 2], received ${value}`),
  )

/** Non-negative integer tick duration used by an item `swing_animation`. */
export type SwingAnimationDuration = number & Brand.Brand<'SwingAnimationDuration'>

export const SwingAnimationDuration: Brand.Brand.Constructor<SwingAnimationDuration> =
  Brand.refined<SwingAnimationDuration>(
    (value) => Number.isSafeInteger(value) && value >= 0,
    (value) => Brand.error(`SwingAnimationDuration must be a non-negative safe integer, received ${value}`),
  )

/** Non-negative delay used by an item `blocks_attacks` component. */
export type BlockingDelaySeconds = number & Brand.Brand<'BlockingDelaySeconds'>

export const BlockingDelaySeconds: Brand.Brand.Constructor<BlockingDelaySeconds> =
  Brand.refined<BlockingDelaySeconds>(
    (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
    (value) => Brand.error(`BlockingDelaySeconds must be a finite, non-negative number of seconds, received ${value}`),
  )

/** Non-negative cooldown scale used by an item `blocks_attacks` component. */
export type DisableCooldownScale = number & Brand.Brand<'DisableCooldownScale'>

export const DisableCooldownScale: Brand.Brand.Constructor<DisableCooldownScale> =
  Brand.refined<DisableCooldownScale>(
    (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
    (value) => Brand.error(`DisableCooldownScale must be a finite, non-negative number, received ${value}`),
  )

/** Finite base damage used by an item `blocks_attacks` damage reduction. */
export type DamageReductionBase = number & Brand.Brand<'DamageReductionBase'>

export const DamageReductionBase: Brand.Brand.Constructor<DamageReductionBase> =
  Brand.refined<DamageReductionBase>(
    (value) => Number.isFinite(value),
    (value) => Brand.error(`DamageReductionBase must be a finite number, received ${value}`),
  )

/** Finite damage factor used by an item `blocks_attacks` damage reduction. */
export type DamageReductionFactor = number & Brand.Brand<'DamageReductionFactor'>

export const DamageReductionFactor: Brand.Brand.Constructor<DamageReductionFactor> =
  Brand.refined<DamageReductionFactor>(
    (value) => Number.isFinite(value),
    (value) => Brand.error(`DamageReductionFactor must be a finite number, received ${value}`),
  )

/** Positive blocking angle in degrees used by an item `blocks_attacks` rule. */
export type HorizontalBlockingAngle = number & Brand.Brand<'HorizontalBlockingAngle'>

export const HorizontalBlockingAngle: Brand.Brand.Constructor<HorizontalBlockingAngle> =
  Brand.refined<HorizontalBlockingAngle>(
    (value) => Number.isFinite(value) && value > MIN_NON_NEGATIVE_VALUE,
    (value) => Brand.error(`HorizontalBlockingAngle must be a finite, positive number, received ${value}`),
  )

/** Non-negative threshold used by an item `blocks_attacks.item_damage` rule. */
export type ItemDamageThreshold = number & Brand.Brand<'ItemDamageThreshold'>

export const ItemDamageThreshold: Brand.Brand.Constructor<ItemDamageThreshold> =
  Brand.refined<ItemDamageThreshold>(
    (value) => Number.isFinite(value) && value >= MIN_NON_NEGATIVE_VALUE,
    (value) => Brand.error(`ItemDamageThreshold must be a finite, non-negative number, received ${value}`),
  )

/** Finite base item damage used by an item `blocks_attacks` rule. */
export type ItemDamageBase = number & Brand.Brand<'ItemDamageBase'>

export const ItemDamageBase: Brand.Brand.Constructor<ItemDamageBase> = Brand.refined<ItemDamageBase>(
  (value) => Number.isFinite(value),
  (value) => Brand.error(`ItemDamageBase must be a finite number, received ${value}`),
)

/** Finite item damage factor used by an item `blocks_attacks` rule. */
export type ItemDamageFactor = number & Brand.Brand<'ItemDamageFactor'>

export const ItemDamageFactor: Brand.Brand.Constructor<ItemDamageFactor> = Brand.refined<ItemDamageFactor>(
  (value) => Number.isFinite(value),
  (value) => Brand.error(`ItemDamageFactor must be a finite number, received ${value}`),
)

/** Official enchantment level in [0, 255]. */
export type EnchantmentLevel = number & Brand.Brand<'EnchantmentLevel'>

export const EnchantmentLevel: Brand.Brand.Constructor<EnchantmentLevel> = Brand.refined<EnchantmentLevel>(
  (value) => Number.isSafeInteger(value) && value >= MIN_NON_NEGATIVE_VALUE && value <= 255,
  (value) => Brand.error(`EnchantmentLevel must be a safe integer in [0, 255], received ${value}`),
)

/** Finite amount used by an item attribute modifier. */
export type AttributeModifierAmount = number & Brand.Brand<'AttributeModifierAmount'>

export const AttributeModifierAmount: Brand.Brand.Constructor<AttributeModifierAmount> =
  Brand.refined<AttributeModifierAmount>(
    (value) => Number.isFinite(value),
    (value) => Brand.error(`AttributeModifierAmount must be a finite number, received ${value}`),
  )

/** Portion of collision velocity restituted by an entity or block in [0, 1]. */
export type Bounciness = number & Brand.Brand<'Bounciness'>

export const Bounciness: Brand.Brand.Constructor<Bounciness> = Brand.refined<Bounciness>(
  (value) => Number.isFinite(value) && value >= 0 && value <= 1,
  (value) => Brand.error(`Bounciness must be a finite number in [0, 1], received ${value}`),
)

/** Entity physics modifier in the official [0, 2048] range. */
export type EntityPhysicsModifier = number & Brand.Brand<'EntityPhysicsModifier'>

export const EntityPhysicsModifier: Brand.Brand.Constructor<EntityPhysicsModifier> =
  Brand.refined<EntityPhysicsModifier>(
    (value) => Number.isFinite(value) && value >= 0 && value <= 2048,
    (value) => Brand.error(`EntityPhysicsModifier must be a finite number in [0, 2048], received ${value}`),
  )

/** Entity name/scoreboard display distance in blocks in [0, 512]. */
export type EntityVisibilityDistance = number & Brand.Brand<'EntityVisibilityDistance'>

export const EntityVisibilityDistance: Brand.Brand.Constructor<EntityVisibilityDistance> =
  Brand.refined<EntityVisibilityDistance>(
    (value) => Number.isFinite(value) && value >= 0 && value <= 512,
    (value) => Brand.error(`EntityVisibilityDistance must be a finite number in [0, 512], received ${value}`),
  )

/** Knockback resistance after the 26.2 lower-bound change to -2. */
export type KnockbackResistance = number & Brand.Brand<'KnockbackResistance'>

export const KnockbackResistance: Brand.Brand.Constructor<KnockbackResistance> =
  Brand.refined<KnockbackResistance>(
    (value) => Number.isFinite(value) && value >= -2,
    (value) => Brand.error(`KnockbackResistance must be a finite number >= -2, received ${value}`),
  )

/**
 * A wall-clock reading: milliseconds since the Unix epoch.
 *
 * Use this only for things a human will read or that must survive a save/load
 * round trip. Never use it to measure durations — it can jump backwards.
 * Obtain it from `ClockPort`, never from a global.
 */
export type EpochMillis = number & Brand.Brand<'EpochMillis'>

export const EpochMillis: Brand.Brand.Constructor<EpochMillis> = Brand.refined<EpochMillis>(
  (value) => Number.isSafeInteger(value),
  (value) => Brand.error(`EpochMillis must be a safe integer number of milliseconds, received ${value}`),
)

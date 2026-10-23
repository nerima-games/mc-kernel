import * as itemComponentsResult from '../src/domain/item/item-components'
import {
  ITEM_COMPONENT_IDS,
  ITEM_RARITIES,
  ITEMS_WITH_SIXTEEN_STACK_LIMIT,
  ITEMS_WITH_SINGLE_STACK_LIMIT,
  ITEM_TOOL_COMPONENTS,
  isItemComponents,
  itemComponentStackLimitOf,
  itemToolComponentOf,
} from '../src/domain/item/item-components'
import { itemComponentsEqual } from '../src/domain/item/item-components-validation'
import * as itemComponentValuesResult from '../src/domain/item/item-component-values'
import { isChargedProjectilesOptions } from '../src/domain/item/item-component-values'
import {
  consumableComponentOf,
  foodComponentOf,
  useRemainderComponentOf,
} from '../src/domain/item/consumable'
import * as consumableResult from '../src/domain/item/consumable'
import * as useCooldownResult from '../src/domain/item/use-cooldown'
import * as itemCombatResult from '../src/domain/item/item-combat'
import * as itemAttributeModifiersResult from '../src/domain/item/item-attribute-modifiers'
import * as itemDefenseResult from '../src/domain/item/item-defense'
import * as itemEnchantmentsResult from '../src/domain/item/item-enchantments'
import * as weaponResult from '../src/domain/item/weapon'
import { textComponent } from '../src/domain/text/text-component'
import { ResourceLocation, TagLocation, UUID } from '../src/domain/text/identifiers'
import { StackCount } from '../src/domain/time/quantities'
import * as Quantities from '../src/domain/time/quantities'
import * as ItemPrimitive from '../src/domain/item/item-primitives'
import { BlockAxis } from '../src/domain/coordinates/coordinate-primitives'
import * as itemStackResult from '../src/domain/item/item-stack'
import { Result } from 'effect'
import { expectItemFailure, itemResultValue } from './item-result-assertions'
import { describe, expect, it } from 'vitest'

const itemComponentValue = <Args extends ReadonlyArray<unknown>, Value, Failure>(
  construct: (...args: Args) => Result.Result<Value, Failure>,
): ((...args: Args) => Value) => (...args) => itemResultValue(construct(...args))

const itemComponents = itemComponentValue(itemComponentsResult.itemComponents)
const itemStack = itemComponentValue(itemStackResult.itemStack)
const useCooldownComponent = itemComponentValue(useCooldownResult.useCooldownComponent)
const additionalTradeCostComponent = itemComponentValue(itemComponentValuesResult.additionalTradeCostComponent)
const bannerPatternsComponent = itemComponentValue(itemComponentValuesResult.bannerPatternsComponent)
const baseColorComponent = itemComponentValue(itemComponentValuesResult.baseColorComponent)
const blockStateComponent = itemComponentValue(itemComponentValuesResult.blockStateComponent)
const beesComponent = itemComponentValue(itemComponentValuesResult.beesComponent)
const breakSoundComponent = itemComponentValue(itemComponentValuesResult.breakSoundComponent)
const canBreakComponent = itemComponentValue(itemComponentValuesResult.canBreakComponent)
const canPlaceOnComponent = itemComponentValue(itemComponentValuesResult.canPlaceOnComponent)
const containerLootComponent = itemComponentValue(itemComponentValuesResult.containerLootComponent)
const customDataComponent = itemComponentValue(itemComponentValuesResult.customDataComponent)
const customModelDataComponent = itemComponentValue(itemComponentValuesResult.customModelDataComponent)
const blockEntityDataComponent = itemComponentValue(itemComponentValuesResult.blockEntityDataComponent)
const bucketEntityDataComponent = itemComponentValue(itemComponentValuesResult.bucketEntityDataComponent)
const debugStickStateComponent = itemComponentValue(itemComponentValuesResult.debugStickStateComponent)
const deathProtectionComponent = itemComponentValue(itemComponentValuesResult.deathProtectionComponent)
const dyeComponent = itemComponentValue(itemComponentValuesResult.dyeComponent)
const dyedColorComponent = itemComponentValue(itemComponentValuesResult.dyedColorComponent)
const entityDataComponent = itemComponentValue(itemComponentValuesResult.entityDataComponent)
const enchantableComponent = itemComponentValue(itemComponentValuesResult.enchantableComponent)
const equippableComponent = itemComponentValue(itemComponentValuesResult.equippableComponent)
const fireworkExplosionComponent = itemComponentValue(itemComponentValuesResult.fireworkExplosionComponent)
const fireworksComponent = itemComponentValue(itemComponentValuesResult.fireworksComponent)
const gliderComponent = itemComponentValue(itemComponentValuesResult.gliderComponent)
const hideAdditionalTooltipComponent = itemComponentValue(itemComponentValuesResult.hideAdditionalTooltipComponent)
const instrumentComponent = itemComponentValue(itemComponentValuesResult.instrumentComponent)
const jukeboxPlayableComponent = itemComponentValue(itemComponentValuesResult.jukeboxPlayableComponent)
const kineticWeaponComponent = itemComponentValue(itemComponentValuesResult.kineticWeaponComponent)
const lockComponent = itemComponentValue(itemComponentValuesResult.lockComponent)
const lodestoneTrackerComponent = itemComponentValue(itemComponentValuesResult.lodestoneTrackerComponent)
const mapColorComponent = itemComponentValue(itemComponentValuesResult.mapColorComponent)
const mapDecorationsComponent = itemComponentValue(itemComponentValuesResult.mapDecorationsComponent)
const mapIdComponent = itemComponentValue(itemComponentValuesResult.mapIdComponent)
const noteBlockSoundComponent = itemComponentValue(itemComponentValuesResult.noteBlockSoundComponent)
const ominousBottleAmplifierComponent = itemComponentValue(itemComponentValuesResult.ominousBottleAmplifierComponent)
const paintingVariantComponent = itemComponentValue(itemComponentValuesResult.paintingVariantComponent)
const potDecorationsComponent = itemComponentValue(itemComponentValuesResult.potDecorationsComponent)
const potionContentsComponent = itemComponentValue(itemComponentValuesResult.potionContentsComponent)
const potionDurationScaleComponent = itemComponentValue(itemComponentValuesResult.potionDurationScaleComponent)
const piercingWeaponComponent = itemComponentValue(itemComponentValuesResult.piercingWeaponComponent)
const profileComponent = itemComponentValue(itemComponentValuesResult.profileComponent)
const providesBannerPatternsComponent = itemComponentValue(itemComponentValuesResult.providesBannerPatternsComponent)
const providesTrimMaterialComponent = itemComponentValue(itemComponentValuesResult.providesTrimMaterialComponent)
const recipesComponent = itemComponentValue(itemComponentValuesResult.recipesComponent)
const repairableComponent = itemComponentValue(itemComponentValuesResult.repairableComponent)
const suspiciousStewComponent = itemComponentValue(itemComponentValuesResult.suspiciousStewComponent)
const sulfurCubeContentComponent = itemComponentValue(itemComponentValuesResult.sulfurCubeContentComponent)
const trimComponent = itemComponentValue(itemComponentValuesResult.trimComponent)
const tooltipDisplayComponent = itemComponentValue(itemComponentValuesResult.tooltipDisplayComponent)
const tooltipStyleComponent = itemComponentValue(itemComponentValuesResult.tooltipStyleComponent)
const writableBookContentComponent = itemComponentValue(itemComponentValuesResult.writableBookContentComponent)
const writtenBookContentComponent = itemComponentValue(itemComponentValuesResult.writtenBookContentComponent)
const attackRangeComponent = itemComponentValue(itemCombatResult.attackRangeComponent)
const damageTypeComponent = itemComponentValue(itemCombatResult.damageTypeComponent)
const minimumAttackChargeComponent = itemComponentValue(itemCombatResult.minimumAttackChargeComponent)
const swingAnimationComponent = itemComponentValue(itemCombatResult.swingAnimationComponent)
const useEffectsComponent = itemComponentValue(itemCombatResult.useEffectsComponent)
const attributeModifier = itemComponentValue(itemAttributeModifiersResult.attributeModifier)
const attributeModifiersComponent = itemComponentValue(itemAttributeModifiersResult.attributeModifiersComponent)
const blocksAttacksComponent = itemComponentValue(itemDefenseResult.blocksAttacksComponent)
const damageResistantComponent = itemComponentValue(itemDefenseResult.damageResistantComponent)
const enchantmentsComponent = itemComponentValue(itemEnchantmentsResult.enchantmentsComponent)
const storedEnchantmentsComponent = itemComponentValue(itemEnchantmentsResult.storedEnchantmentsComponent)
const weaponComponent = itemComponentValue(weaponResult.weaponComponent)
const consumableClearAllEffects = consumableResult.consumableClearAllEffects

const expectOptionsFailure = (
  item: unknown,
  options: unknown,
  failure: Readonly<{
    readonly kind: string
    readonly reason: string
    readonly field: string
    readonly message: string
    readonly value: unknown
  }>,
) => expectItemFailure(Reflect.apply(itemComponentsResult.itemComponents, undefined, [item, options]), {
  _tag: 'ItemValidationFailure',
  ...failure,
})

const expectMalformedOption = (options: unknown, field: string, message: string) => {
  const value = Array.isArray(options)
    ? options
    : typeof options === 'object' && options !== null
      ? Reflect.get(options, field)
      : options
  expectOptionsFailure('stone', options, {
    kind: 'TypeError', reason: 'invalid-value', field, message, value,
  })
}

describe('item components', () => {
  it('rejects hostile component records without throwing', () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error('hostile') } })
    expect(isItemComponents(hostile)).toBe(false)
    expect(Reflect.apply(itemComponentsEqual, undefined, [hostile, undefined])).toBe(false)
    const throwingValue: Record<string, unknown> = {}
    const otherThrowingValue: Record<string, unknown> = {}
    Object.defineProperty(throwingValue, 'x', { enumerable: true, get: () => { throw new Error('hostile') } })
    Object.defineProperty(otherThrowingValue, 'x', { enumerable: true, get: () => { throw new Error('hostile') } })
    expect(Reflect.apply(itemComponentsEqual, undefined, [throwingValue, otherThrowingValue])).toBe(false)
  })

  it('accepts resolved nested stack values at their item limit', () => {
    expect(isChargedProjectilesOptions([{ item: 'stone', count: 1, components: itemComponents('stone') }])).toBe(true)
    expect(isChargedProjectilesOptions([{ item: 'stone', count: 64, components: itemComponents('stone') }])).toBe(true)
    expect(isChargedProjectilesOptions([{ item: 'stone', count: 65, components: itemComponents('stone') }])).toBe(false)
    expect(isChargedProjectilesOptions([null])).toBe(false)
    expect(isChargedProjectilesOptions([{ item: 'ender_pearl', count: 16, components: itemComponents('ender_pearl') }])).toBe(true)
    expect(isChargedProjectilesOptions([{ item: 'ender_pearl', count: 17, components: itemComponents('ender_pearl') }])).toBe(false)
    expect(isChargedProjectilesOptions([{ item: 'diamond_pickaxe', count: 1, components: itemComponents('diamond_pickaxe') }])).toBe(true)
    expect(isChargedProjectilesOptions([{ item: 'diamond_pickaxe', count: 2, components: itemComponents('diamond_pickaxe') }])).toBe(false)
    expect(isItemComponents({ ...itemComponents('stone'), chargedProjectiles: [{ item: 'stone', count: 1 }] })).toBe(true)
  })
  it('distinguishes nested arrays with different lengths', () => {
    const left = itemComponents('stone', { customData: customDataComponent({ values: [ItemPrimitive.ItemComponentNbtNumber(1)] }) })
    const right = itemComponents('stone', { customData: customDataComponent({
      values: [ItemPrimitive.ItemComponentNbtNumber(1), ItemPrimitive.ItemComponentNbtNumber(2)],
    }) })
    expect(itemComponentsEqual(left, right)).toBe(false)
    const equalLengthLeft = itemComponents('stone', { customData: customDataComponent({ values: [ItemPrimitive.ItemComponentNbtNumber(1)] }) })
    const equalLengthRight = itemComponents('stone', { customData: customDataComponent({ values: [ItemPrimitive.ItemComponentNbtNumber(2)] }) })
    expect(itemComponentsEqual(equalLengthLeft, equalLengthRight)).toBe(false)
    expect(isChargedProjectilesOptions([{ item: 'stone', count: 1, components: {} }])).toBe(false)
  })
  it('publishes official identifiers and roster defaults', () => {
    expect(ITEM_COMPONENT_IDS).toEqual([
      'minecraft:damage',
      'minecraft:enchantment_glint_override',
      'minecraft:tooltip_display',
      'minecraft:custom_name',
      'minecraft:item_name',
      'minecraft:lore',
      'minecraft:item_model',
      'minecraft:custom_data',
      'minecraft:entity_data',
      'minecraft:bucket_entity_data',
      'minecraft:profile',
      'minecraft:block_entity_data',
      'minecraft:charged_projectiles',
      'minecraft:bundle_contents',
      'minecraft:container',
      'minecraft:bees',
      'minecraft:potion_contents',
      'minecraft:dyed_color',
      'minecraft:custom_model_data',
      'minecraft:map_id',
      'minecraft:map_color',
      'minecraft:map_decorations',
      'minecraft:writable_book_content',
      'minecraft:written_book_content',
      'minecraft:trim',
      'minecraft:suspicious_stew',
      'minecraft:hide_additional_tooltip',
      'minecraft:can_break',
      'minecraft:can_place_on',
      'minecraft:block_state',
      'minecraft:instrument',
      'minecraft:note_block_sound',
      'minecraft:recipes',
      'minecraft:lock',
      'minecraft:tooltip_style',
      'minecraft:base_color',
      'minecraft:equippable',
      'minecraft:glider',
      'minecraft:death_protection',
      'minecraft:repairable',
      'minecraft:enchantable',
      'minecraft:jukebox_playable',
      'minecraft:ominous_bottle_amplifier',
      'minecraft:painting/variant',
      'minecraft:lodestone_tracker',
      'minecraft:firework_explosion',
      'minecraft:fireworks',
      'minecraft:banner_patterns',
      'minecraft:pot_decorations',
      'minecraft:container_loot',
      'minecraft:debug_stick_state',
      'minecraft:max_damage',
      'minecraft:max_stack_size',
      'minecraft:rarity',
      'minecraft:repair_cost',
      'minecraft:unbreakable',
      'minecraft:food',
      'minecraft:consumable',
      'minecraft:use_remainder',
      'minecraft:use_cooldown',
      'minecraft:use_effects',
      'minecraft:tool',
      'minecraft:weapon',
      'minecraft:kinetic_weapon',
      'minecraft:piercing_weapon',
      'minecraft:attribute_modifiers',
      'minecraft:enchantments',
      'minecraft:stored_enchantments',
      'minecraft:blocks_attacks',
      'minecraft:damage_resistant',
      'minecraft:minimum_attack_charge',
      'minecraft:damage_type',
      'minecraft:swing_animation',
      'minecraft:attack_range',
      'minecraft:potion_duration_scale',
      'minecraft:break_sound',
      'minecraft:provides_banner_patterns',
      'minecraft:provides_trim_material',
      'minecraft:dye',
      'minecraft:additional_trade_cost',
      'minecraft:sulfur_cube_content',
    ])
    expect(ITEM_RARITIES).toEqual(['common', 'uncommon', 'rare', 'epic'])
    expect(itemComponentStackLimitOf('stone')).toBe(64)
    expect(itemComponentStackLimitOf('ender_pearl')).toBe(16)
    expect(itemComponentStackLimitOf('diamond_pickaxe')).toBe(1)
    expect(ITEMS_WITH_SINGLE_STACK_LIMIT).toContain('diamond_pickaxe')
    expect(ITEMS_WITH_SIXTEEN_STACK_LIMIT).toContain('ender_pearl')
  })

  it('resolves immutable generic component values', () => {
    const stone = itemComponents('stone')

    expect(stone).toEqual({
      maxStackSize: 64,
      maxDamage: undefined,
      damage: undefined,
      repairCost: 0,
      unbreakable: undefined,
      enchantmentGlintOverride: undefined,
      tooltipDisplay: undefined,
      customName: undefined,
      itemName: undefined,
      lore: undefined,
      itemModel: undefined,
      customData: undefined,
      entityData: undefined,
      bucketEntityData: undefined,
      profile: undefined,
      blockEntityData: undefined,
      chargedProjectiles: undefined,
      bundleContents: undefined,
      container: undefined,
      mapColor: undefined,
      mapDecorations: undefined,
      writableBookContent: undefined,
      writtenBookContent: undefined,
      trim: undefined,
      suspiciousStew: undefined,
      hideAdditionalTooltip: undefined,
      canBreak: undefined,
      canPlaceOn: undefined,
      bees: undefined,
      potionContents: undefined,
      dyedColor: undefined,
      customModelData: undefined,
      mapId: undefined,
      blockState: undefined,
      instrument: undefined,
      noteBlockSound: undefined,
      recipes: undefined,
      lock: undefined,
      tooltipStyle: undefined,
      baseColor: undefined,
      equippable: undefined,
      glider: undefined,
      deathProtection: undefined,
      repairable: undefined,
      enchantable: undefined,
      jukeboxPlayable: undefined,
      ominousBottleAmplifier: undefined,
      paintingVariant: undefined,
      lodestoneTracker: undefined,
      fireworkExplosion: undefined,
      fireworks: undefined,
      bannerPatterns: undefined,
      potDecorations: undefined,
      containerLoot: undefined,
      debugStickState: undefined,
      rarity: 'common',
      food: undefined,
      consumable: undefined,
      useRemainder: undefined,
      useCooldown: undefined,
      useEffects: undefined,
      tool: undefined,
      weapon: undefined,
      kineticWeapon: undefined,
      piercingWeapon: undefined,
      attributeModifiers: undefined,
      enchantments: undefined,
      storedEnchantments: undefined,
      blocksAttacks: undefined,
      damageResistant: undefined,
      minimumAttackCharge: undefined,
      damageType: undefined,
      swingAnimation: undefined,
      attackRange: undefined,
      potionDurationScale: undefined,
      breakSound: undefined,
      providesBannerPatterns: undefined,
      providesTrimMaterial: undefined,
      dye: undefined,
      additionalTradeCost: undefined,
      sulfurCubeContent: undefined,
    })
    expect(Object.isFrozen(stone)).toBe(true)
    expect(isItemComponents(stone)).toBe(true)

    const sword = itemComponents('diamond_sword')
    expect(sword.maxStackSize).toBe(1)
    expect(sword.maxDamage).toBe(1561)
    expect(sword.damage).toBe(0)
  })

  it('resolves portable collection, book, trim, stew, and predicate components', () => {
    const chargedProjectiles = [itemStack('arrow', StackCount(1))]
    const bundleContents = [itemStack('stone', StackCount(1))]
    const container = [{ slot: ItemPrimitive.ContainerSlotIndex(2), item: itemStack('diamond', StackCount(1)) }]
    const mapDecorations = {
      spawn: {
        type: 'player' as const,
        x: ItemPrimitive.MapDecorationCoordinate(1),
        z: ItemPrimitive.MapDecorationCoordinate(-2),
        rotation: ItemPrimitive.MapDecorationRotation(3),
      },
    }
    const writableBookContent = {
      pages: [ItemPrimitive.BookPageText('Page one'), {
        raw: ItemPrimitive.BookPageText('Page two'),
        filtered: ItemPrimitive.BookPageText('Filtered page two'),
      }],
    }
    const writtenBookContent = {
      pages: [ItemPrimitive.BookPageText('"Hello world!"')],
      title: { raw: ItemPrimitive.BookPageText('"A delightful read"') },
      author: ItemPrimitive.BookAuthor('Alex'),
      generation: ItemPrimitive.BookGeneration(0),
      resolved: false,
    }
    const trim = {
      pattern: ResourceLocation('minecraft:sentry'),
      material: ResourceLocation('minecraft:iron'),
    }
    const suspiciousStew = [{ id: ResourceLocation('minecraft:night_vision') }]
    const canBreak = [{ blocks: ResourceLocation('minecraft:dirt') }]
    const canPlaceOn = { blocks: TagLocation('#minecraft:grass') }

    const value = itemComponents('stone', {
      chargedProjectiles,
      bundleContents,
      container,
      mapColor: ItemPrimitive.RgbColor(0x123456),
      mapDecorations,
      writableBookContent,
      writtenBookContent,
      trim,
      suspiciousStew,
      hideAdditionalTooltip: true,
      canBreak,
      canPlaceOn,
    })

    expect(value.chargedProjectiles).toEqual(chargedProjectiles)
    expect(value.bundleContents).toEqual(bundleContents)
    expect(value.container).toEqual(container)
    expect(value.mapColor).toBe(mapColorComponent(ItemPrimitive.RgbColor(0x123456)))
    expect(value.mapDecorations).toEqual(mapDecorationsComponent(mapDecorations))
    expect(value.writableBookContent).toEqual(writableBookContentComponent(writableBookContent))
    expect(value.writtenBookContent).toEqual(writtenBookContentComponent(writtenBookContent))
    expect(value.trim).toEqual(trimComponent(trim))
    expect(value.suspiciousStew).toEqual(suspiciousStewComponent(suspiciousStew))
    expect(value.hideAdditionalTooltip).toEqual(hideAdditionalTooltipComponent())
    expect(value.canBreak).toEqual(canBreakComponent(canBreak))
    expect(value.canPlaceOn).toEqual(canPlaceOnComponent(canPlaceOn))
    expect(Object.isFrozen(value)).toBe(true)
    expect(isItemComponents(value)).toBe(true)
  })

  it('resolves food, consumable, and use_remainder defaults into stacks', () => {
    const goldenCarrotFood = foodComponentOf('golden_carrot')
    const goldenCarrotConsumable = consumableComponentOf('golden_carrot')
    const honeyBottleRemainder = useRemainderComponentOf('honey_bottle')
    if (
      goldenCarrotFood === undefined ||
      goldenCarrotConsumable === undefined ||
      honeyBottleRemainder === undefined
    ) {
      throw new Error('expected static food components')
    }

    expect(itemComponents('golden_carrot').food).toEqual(goldenCarrotFood)
    expect(itemComponents('golden_carrot').consumable).toEqual(goldenCarrotConsumable)
    expect(itemComponents('honey_bottle').useRemainder).toEqual(honeyBottleRemainder)
  })

  it('resolves evidence-backed tool defaults into stacks', () => {
    const diamondPickaxeTool = itemToolComponentOf('diamond_pickaxe')
    if (diamondPickaxeTool === undefined) {
      throw new Error('expected static tool component')
    }

    expect(ITEM_TOOL_COMPONENTS.diamond_pickaxe).toBe(diamondPickaxeTool)
    expect(itemComponents('diamond_pickaxe').tool).toBe(diamondPickaxeTool)
    expect(diamondPickaxeTool).toStrictEqual({
      rules: [
        {
          blocks: '#minecraft:mineable/pickaxe',
          speed: 8,
          correctForDrops: true,
        },
      ],
      damagePerBlock: 1,
    })
  })

  it('accepts official option relationships', () => {
    const cooldown = useCooldownComponent(Quantities.CooldownSeconds(0.5))
    const weapon = weaponComponent({
      itemDamagePerAttack: Quantities.ItemDamage(2),
      disableBlockingForSeconds: Quantities.WeaponDisableBlockingSeconds(0.25),
    })
    const kineticWeapon = kineticWeaponComponent({
      contactCooldownTicks: ItemPrimitive.KineticDurationTicks(4),
      damageMultiplier: ItemPrimitive.KineticDamageMultiplier(2),
    })
    const piercingWeapon = piercingWeaponComponent({ dealsKnockback: false, dismounts: true })
    const tooltipDisplay = tooltipDisplayComponent({
      hideTooltip: true,
      hiddenComponents: [ResourceLocation('minecraft:food')],
    })
    const potionDurationScale = potionDurationScaleComponent(Quantities.PotionDurationScale(1.5))
    const breakSound = breakSoundComponent(ResourceLocation('minecraft:item.custom'))
    const providesBannerPatterns = providesBannerPatternsComponent([ResourceLocation('minecraft:pattern')])
    const providesTrimMaterial = providesTrimMaterialComponent(ResourceLocation('minecraft:trim'))
    const dye = dyeComponent('red')
    const additionalTradeCost = additionalTradeCostComponent(Quantities.AdditionalTradeCost(2))
    const sulfurCubeContent = sulfurCubeContentComponent(ResourceLocation('minecraft:green_wool'))
    const useEffects = useEffectsComponent({ canSprint: true, speedMultiplier: Quantities.UseSpeedMultiplier(0.5) })
    const minimumAttackCharge = minimumAttackChargeComponent(Quantities.AttackCharge(0.25))
    const damageType = damageTypeComponent(ResourceLocation('minecraft:player_attack'))
    const swingAnimation = swingAnimationComponent({ type: 'stab', duration: Quantities.SwingAnimationDuration(8) })
    const attackRange = attackRangeComponent({
      minReach: Quantities.AttackRangeDistance(1),
      maxReach: Quantities.AttackRangeDistance(4),
      minCreativeReach: Quantities.AttackRangeDistance(2),
      maxCreativeReach: Quantities.AttackRangeDistance(6),
      hitboxMargin: Quantities.AttackHitboxMargin(0.4),
      mobFactor: Quantities.MobAttackRangeFactor(1.25),
    })
    const blocksAttacks = blocksAttacksComponent({
      damageReductions: [{
        type: ResourceLocation('minecraft:player_attack'),
        base: Quantities.DamageReductionBase(2),
        factor: Quantities.DamageReductionFactor(0.5),
      }],
      itemDamage: {
        threshold: Quantities.ItemDamageThreshold(0.5),
        base: Quantities.ItemDamageBase(1),
        factor: Quantities.ItemDamageFactor(0.25),
      },
      blockSound: ResourceLocation('minecraft:block.anvil.land'),
      disabledSound: ResourceLocation('minecraft:item.shield.block'),
      bypassedBy: TagLocation('#minecraft:axes'),
    })
    const damageResistant = damageResistantComponent([ResourceLocation('minecraft:fire')])
    const attributeModifiers = attributeModifiersComponent([
      attributeModifier({
        type: ResourceLocation('minecraft:generic.attack_damage'),
        id: ResourceLocation('minecraft:test_damage'),
        amount: Quantities.AttributeModifierAmount(3),
        operation: 'add_value',
        slot: 'mainhand',
      }),
    ])
    const enchantments = enchantmentsComponent({ 'minecraft:sharpness': 5 })
    const storedEnchantments = storedEnchantmentsComponent({ 'minecraft:protection': 4 })
    const customName = textComponent({ text: 'Custom name', color: 'gold' })
    const itemName = textComponent('Custom item')
    const lore = [textComponent({ text: 'Line 1' }), textComponent({ text: 'Line 2', italic: true })]
    const itemModel = ResourceLocation('minecraft:test_model')
    const customData = customDataComponent({
      source: ItemPrimitive.ItemComponentNbtString('test'),
      values: [ItemPrimitive.ItemComponentNbtNumber(1), true],
    })
    const entityData = entityDataComponent({
      id: ResourceLocation('minecraft:zombie'),
      Health: ItemPrimitive.ItemComponentNbtNumber(20),
      Pos: [1, 64, 2].map(ItemPrimitive.ItemComponentNbtNumber),
    })
    const bucketEntityData = bucketEntityDataComponent({ BucketVariant: ItemPrimitive.ItemComponentNbtNumber(1) })
    const profile = profileComponent({
      name: ItemPrimitive.ProfileName('Notch'),
      id: UUID('123e4567-e89b-12d3-a456-426614174000'),
      properties: [{
        name: ItemPrimitive.ProfilePropertyName('textures'),
        value: ItemPrimitive.ProfilePropertyValue('encoded'),
        signature: ItemPrimitive.ProfilePropertySignature('signed'),
      }],
    })
    const blockEntityData = blockEntityDataComponent({
      id: ResourceLocation('minecraft:chest'),
      CustomName: ItemPrimitive.ItemComponentNbtString('Chest'),
    })
    const bees = beesComponent([
      {
        entityData: {
          [ItemPrimitive.ItemComponentNbtKey('id')]: ItemPrimitive.ItemComponentNbtString('minecraft:bee'),
        },
        ticksInHive: ItemPrimitive.BeeHiveTicks(120),
        minTicksInHive: ItemPrimitive.BeeHiveTicks(60),
      },
    ])
    const potionContents = potionContentsComponent({
      potion: ResourceLocation('minecraft:water'),
      customEffects: [{
        id: ResourceLocation('minecraft:speed'),
        duration: ItemPrimitive.PotionEffectDurationTicks(200),
      }],
    })
    const dyedColor = dyedColorComponent([
      ItemPrimitive.DyeColorChannel(0.5),
      ItemPrimitive.DyeColorChannel(1),
      ItemPrimitive.DyeColorChannel(0.2),
    ])
    const customModelData = customModelDataComponent({
      floats: [ItemPrimitive.CustomModelDataFloat(0.5)],
      flags: [true],
      strings: [ItemPrimitive.CustomModelDataString('test_model')],
      colors: [ItemPrimitive.RgbColor(0xff00ff)],
    })
    const mapId = mapIdComponent(Quantities.MapId(42))
    const blockState = blockStateComponent({ axis: ItemPrimitive.BlockStatePropertyValue('y') })
    const instrument = instrumentComponent(ResourceLocation('minecraft:ponder_goat_horn'))
    const noteBlockSound = noteBlockSoundComponent(ResourceLocation('minecraft:block.note_block.harp'))
    const recipes = recipesComponent([ResourceLocation('minecraft:stick')])
    const lock = lockComponent(ItemPrimitive.ItemLock('secret'))
    const tooltipStyle = tooltipStyleComponent(ResourceLocation('minecraft:tooltip/default'))
    const baseColor = baseColorComponent('red')
    const equippable = equippableComponent({
      slot: 'head',
      equipSound: ResourceLocation('minecraft:item.armor.equip_diamond'),
    })
    const glider = gliderComponent()
    const deathProtection = deathProtectionComponent({
      deathEffects: [consumableClearAllEffects()],
    })
    const repairableItems = [ResourceLocation('minecraft:diamond'), ResourceLocation('minecraft:netherite_ingot')]
    const repairable = repairableComponent(repairableItems)
    const enchantability = ItemPrimitive.Enchantability(10)
    const enchantable = enchantableComponent(enchantability)
    const jukeboxSong = ResourceLocation('minecraft:test_song')
    const jukeboxPlayable = jukeboxPlayableComponent(jukeboxSong)
    const ominousBottleAmplifier = ominousBottleAmplifierComponent(ItemPrimitive.OminousBottleAmplifier(2))
    const paintingVariant = paintingVariantComponent(ResourceLocation('minecraft:kebab'))
    const lodestoneTracker = lodestoneTrackerComponent({
      target: {
        pos: [BlockAxis(1), BlockAxis(64), BlockAxis(-2)],
        dimension: ResourceLocation('minecraft:overworld'),
      },
      tracked: false,
    })
    const fireworkExplosion = fireworkExplosionComponent({
      shape: 'star',
      colors: [ItemPrimitive.RgbColor(0xff0000)],
      fadeColors: [ItemPrimitive.RgbColor(0x00ff00)],
      hasTrail: true,
      hasTwinkle: true,
    })
    const fireworks = fireworksComponent({
      explosions: [{ shape: 'burst', hasTrail: true }],
      flightDuration: ItemPrimitive.FireworksFlightDuration(3),
    })
    const bannerPatterns = bannerPatternsComponent([
      { pattern: ResourceLocation('minecraft:stripe'), color: 'red' },
    ])
    const potDecorations = potDecorationsComponent([
      ResourceLocation('minecraft:brick'),
      ResourceLocation('minecraft:heart_pottery_sherd'),
      ResourceLocation('minecraft:arms_up_pottery_sherd'),
      ResourceLocation('minecraft:skull_pottery_sherd'),
    ])
    const containerLoot = containerLootComponent({
      lootTable: ResourceLocation('minecraft:chests/simple_dungeon'),
      seed: ItemPrimitive.LootTableSeed(42n),
    })
    const debugStickState = debugStickStateComponent({ 'minecraft:oak_log': ItemPrimitive.BlockStatePropertyValue('axis') })

    expect(
      itemComponents('stone', {
        maxStackSize: Quantities.MaxStackSize(1),
        maxDamage: Quantities.MaxDamage(10),
        damage: Quantities.ItemDamage(4),
        repairCost: Quantities.RepairCost(4),
        unbreakable: true,
        enchantmentGlintOverride: false,
        tooltipDisplay,
        customName,
        itemName,
        lore,
        itemModel,
        customData,
        entityData,
        bucketEntityData,
        profile,
        blockEntityData,
        bees,
        potionContents,
        dyedColor,
        customModelData,
        mapId,
        blockState,
        instrument,
        noteBlockSound,
        recipes,
        lock,
        tooltipStyle,
        baseColor,
        equippable,
        glider: true,
        deathProtection: { deathEffects: [consumableClearAllEffects()] },
        repairable: repairableItems,
        enchantable: enchantability,
        jukeboxPlayable: jukeboxSong,
        ominousBottleAmplifier,
        paintingVariant,
        lodestoneTracker,
        fireworkExplosion,
        fireworks,
        bannerPatterns,
        potDecorations,
        containerLoot,
        debugStickState,
        rarity: 'rare',
        useCooldown: cooldown,
        useEffects,
        weapon,
        kineticWeapon,
        piercingWeapon,
        attributeModifiers,
        enchantments,
        storedEnchantments,
        blocksAttacks,
        damageResistant,
        minimumAttackCharge,
        damageType,
        swingAnimation,
        attackRange,
        potionDurationScale,
        breakSound,
        providesBannerPatterns,
        providesTrimMaterial,
        dye,
        additionalTradeCost,
        sulfurCubeContent,
      }),
    ).toEqual({
      maxStackSize: 1,
      maxDamage: 10,
      damage: 4,
      repairCost: 4,
      unbreakable: true,
      enchantmentGlintOverride: false,
      tooltipDisplay,
      customName,
      itemName,
      lore,
        itemModel,
        customData,
        entityData,
        bucketEntityData,
        profile,
        blockEntityData,
        bees,
        potionContents,
        dyedColor,
      customModelData,
      mapId,
      blockState,
      instrument,
      noteBlockSound,
      recipes,
      lock,
      tooltipStyle,
      baseColor,
      equippable,
      glider,
      deathProtection,
      repairable,
      enchantable,
      jukeboxPlayable,
      ominousBottleAmplifier,
      paintingVariant,
      lodestoneTracker,
      fireworkExplosion,
      fireworks,
      bannerPatterns,
      potDecorations,
      containerLoot,
      debugStickState,
      rarity: 'rare',
      food: undefined,
      consumable: undefined,
      useRemainder: undefined,
      useCooldown: cooldown,
      useEffects,
      tool: undefined,
      weapon,
      kineticWeapon,
      piercingWeapon,
      attributeModifiers,
      enchantments,
      storedEnchantments,
      blocksAttacks,
      damageResistant,
      minimumAttackCharge,
      damageType,
      swingAnimation,
      attackRange,
      potionDurationScale,
      breakSound,
      providesBannerPatterns,
      providesTrimMaterial,
      dye,
      additionalTradeCost,
      sulfurCubeContent,
    })
  })

  it('rejects invalid official relationships', () => {
    expectOptionsFailure('stone', { maxStackSize: 0 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'maxStackSize',
      message: 'MaxStackSize must be a safe integer in [1, 99], received 0', value: 0,
    })
    expectOptionsFailure('stone', { maxStackSize: 100 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'maxStackSize',
      message: 'MaxStackSize must be a safe integer in [1, 99], received 100', value: 100,
    })
    expectOptionsFailure('stone', { maxDamage: 0 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'maxDamage',
      message: 'MaxDamage must be a positive safe integer, received 0', value: 0,
    })
    expectOptionsFailure('stone', { maxDamage: 10 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'maxDamage',
      message: 'max_stack_size greater than 1 is incompatible with max_damage', value: 10,
    })
    expectOptionsFailure('stone', { damage: 1 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'damage',
      message: 'damage and max_damage must be present together', value: 1,
    })
    expectOptionsFailure('stone', { maxStackSize: 1, maxDamage: 10, damage: 11 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'damage',
      message: 'damage must be in [0, 10], received 11', value: 11,
    })
    expectOptionsFailure('stone', { damage: -1 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'damage',
      message: 'ItemDamage must be a non-negative safe integer, received -1', value: -1,
    })
    expectOptionsFailure('stone', { repairCost: -1 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'repairCost',
      message: 'RepairCost must be a non-negative safe integer, received -1', value: -1,
    })
    expectOptionsFailure('diamond_sword', { maxStackSize: 2 }, {
      kind: 'RangeError', reason: 'out-of-range', field: 'maxDamage',
      message: 'max_stack_size greater than 1 is incompatible with max_damage', value: 1561,
    })
  })

  it('rejects malformed runtime options at the public boundary', () => {
    expectOptionsFailure('stone', null, {
      kind: 'TypeError', reason: 'invalid-type', field: 'options',
      message: 'Item component options must be a non-null object', value: null,
    })
    expectOptionsFailure('stone', [], {
      kind: 'TypeError', reason: 'invalid-type', field: 'options',
      message: 'Item component options must be a non-null object', value: [],
    })

    const invalidOptions = [
      [{ unbreakable: false }, 'unbreakable', 'unbreakable is an empty component and can only be true'],
      [{ tooltipDisplay: {} }, 'tooltipDisplay', 'tooltipDisplay must be a valid tooltip_display component'],
      [{ customName: 1 }, 'customName', 'customName must be a valid text component'],
      [{ itemName: null }, 'itemName', 'itemName must be a valid text component'],
      [{ lore: Array.from({ length: 257 }, () => 'line') }, 'lore', 'lore must contain at most 256 valid text components'],
      [{ itemModel: 'INVALID!' }, 'itemModel', 'itemModel must be a valid resource location'],
      [{ customData: {} }, 'customData', 'customData must be a non-empty object containing NBT-compatible values'],
      [{ entityData: { Health: 20 } }, 'entityData', 'entityData must be NBT data containing a valid id'],
      [{ bucketEntityData: { value: Symbol() } }, 'bucketEntityData', 'bucketEntityData must contain NBT-compatible values'],
      [{ profile: 'invalid name' }, 'profile', 'profile must be a valid player name or profile object'],
      [{ profile: { name: 'invalid name' } }, 'profile', 'profile must be a valid player name or profile object'],
      [{ blockEntityData: { id: 'minecraft:chest', value: Symbol() } }, 'blockEntityData', 'blockEntityData must be NBT data containing a valid id'],
      [{ bees: [{ entityData: {}, ticksInHive: -1, minTicksInHive: 0 }] }, 'bees', 'bees must contain valid bee entries'],
      [{ potionContents: { customEffects: [{ id: 'INVALID!' }] } }, 'potionContents', 'potionContents must be a valid potion contents value'],
      [{ dyedColor: 0x1000000 }, 'dyedColor', 'dyedColor must be an RGB integer or three normalized color channels'],
      [{ customModelData: { floats: [Infinity] } }, 'customModelData', 'customModelData must contain valid floats, flags, strings, or colors arrays'],
      [{ mapId: -1 }, 'mapId', 'mapId must be a non-negative safe integer'],
      [{ blockState: { axis: 1 } }, 'blockState', 'blockState must be a map of property names to strings'],
      [{ instrument: 'INVALID!' }, 'instrument', 'instrument must be a valid resource location'],
      [{ noteBlockSound: 'INVALID!' }, 'noteBlockSound', 'noteBlockSound must be a valid resource location'],
      [{ recipes: ['INVALID!'] }, 'recipes', 'recipes must be a list of valid resource locations'],
      [{ lock: 1 }, 'lock', 'lock must be a string'],
      [{ tooltipStyle: 'INVALID!' }, 'tooltipStyle', 'tooltipStyle must be a valid resource location'],
      [{ baseColor: 'teal' }, 'baseColor', 'baseColor must be a valid dye color'],
      [{ equippable: { slot: 'invalid' } }, 'equippable', 'equippable must be a valid equippable component'],
      [{ glider: false }, 'glider', 'glider is an empty component and can only be true'],
      [{ deathProtection: { deathEffects: [{}] } }, 'deathProtection', 'deathProtection must be a valid death_protection component'],
      [{ repairable: 'INVALID!' }, 'repairable', 'repairable must contain valid item ids or an item tag'],
      [{ enchantable: 0 }, 'enchantable', 'enchantable must be a positive safe integer'],
      [{ jukeboxPlayable: 'INVALID!' }, 'jukeboxPlayable', 'jukeboxPlayable must be a valid resource location'],
      [{ ominousBottleAmplifier: 5 }, 'ominousBottleAmplifier', 'ominousBottleAmplifier must be an integer from 0 through 4'],
      [{ paintingVariant: 'INVALID!' }, 'paintingVariant', 'paintingVariant must be a valid resource location'],
      [{ lodestoneTracker: { tracked: 'yes' } }, 'lodestoneTracker', 'lodestoneTracker must be a valid lodestone_tracker component'],
      [{ fireworkExplosion: { shape: 'invalid' } }, 'fireworkExplosion', 'fireworkExplosion must be a valid firework_explosion component'],
      [{ fireworks: { flightDuration: 256 } }, 'fireworks', 'fireworks must be a valid fireworks component'],
      [{ bannerPatterns: [{ pattern: 'INVALID!', color: 'red' }] }, 'bannerPatterns', 'bannerPatterns must be a valid banner_patterns component'],
      [{ potDecorations: ['minecraft:brick'] }, 'potDecorations', 'potDecorations must contain four valid item ids'],
      [{ containerLoot: { lootTable: 'INVALID!' } }, 'containerLoot', 'containerLoot must be a valid container_loot component'],
      [{ debugStickState: { INVALID: 'axis' } }, 'debugStickState', 'debugStickState must map block ids to property names'],
      [{ enchantmentGlintOverride: 'yes' }, 'enchantmentGlintOverride', 'enchantmentGlintOverride must be a boolean'],
      [{ rarity: 'mythic' }, 'rarity', 'Unknown item rarity: mythic'],
      [{ food: {} }, 'food', 'food must be a valid food component'],
      [{ consumable: {} }, 'consumable', 'consumable must be a valid consumable component'],
      [{ useRemainder: {} }, 'useRemainder', 'useRemainder must be a valid use_remainder component'],
      [{ useCooldown: {} }, 'useCooldown', 'useCooldown must be a valid use_cooldown component'],
      [{ useEffects: {} }, 'useEffects', 'useEffects must be a valid use_effects component'],
      [{ tool: {} }, 'tool', 'tool must be a valid tool component'],
      [{ weapon: {} }, 'weapon', 'weapon must be a valid weapon component'],
      [{ kineticWeapon: { contactCooldownTicks: -1 } }, 'kineticWeapon', 'kineticWeapon must be a valid kinetic_weapon component'],
      [{ piercingWeapon: { dealsKnockback: 'yes' } }, 'piercingWeapon', 'piercingWeapon must be a valid piercing_weapon component'],
      [{ attributeModifiers: {} }, 'attributeModifiers', 'attributeModifiers must be a valid attribute_modifiers component'],
      [{ enchantments: { 'not valid': 1 } }, 'enchantments', 'enchantments must be a valid enchantments component'],
      [{ storedEnchantments: { 'not valid': 1 } }, 'storedEnchantments', 'storedEnchantments must be a valid stored_enchantments component'],
      [{ blocksAttacks: {} }, 'blocksAttacks', 'blocksAttacks must be a valid blocks_attacks component'],
      [{ damageResistant: {} }, 'damageResistant', 'damageResistant must be a valid damage_resistant component'],
      [{ minimumAttackCharge: 2 }, 'minimumAttackCharge', 'minimumAttackCharge must be a valid minimum_attack_charge component'],
      [{ damageType: 'INVALID!' }, 'damageType', 'damageType must be a valid damage_type component'],
      [{ swingAnimation: {} }, 'swingAnimation', 'swingAnimation must be a valid swing_animation component'],
      [{ attackRange: {} }, 'attackRange', 'attackRange must be a valid attack_range component'],
      [{ potionDurationScale: -1 }, 'potionDurationScale', 'potionDurationScale must be a valid potion_duration_scale component'],
      [{ breakSound: 'INVALID!' }, 'breakSound', 'breakSound must be a valid break_sound component'],
      [{ providesBannerPatterns: ['INVALID!'] }, 'providesBannerPatterns', 'providesBannerPatterns must be a valid provides_banner_patterns component'],
      [{ providesTrimMaterial: 'INVALID!' }, 'providesTrimMaterial', 'providesTrimMaterial must be a valid provides_trim_material component'],
      [{ dye: 'teal' }, 'dye', 'dye must be a valid dye component'],
      [{ additionalTradeCost: 1.5 }, 'additionalTradeCost', 'additionalTradeCost must be a valid additional_trade_cost component'],
      [{ sulfurCubeContent: 'INVALID!' }, 'sulfurCubeContent', 'sulfurCubeContent must be a valid sulfur_cube_content component'],
    ] as const

    for (const [options, field, message] of invalidOptions) {
      expectMalformedOption(options, field, message)
    }
    expectOptionsFailure('unobtainium', {}, {
      kind: 'TypeError', reason: 'invalid-value', field: 'item',
      message: 'Unknown item type: unobtainium', value: 'unobtainium',
    })
  })

  it('guards resolved component shapes', () => {
    const valid = itemComponents('stone')

    expect(isItemComponents({ ...valid, maxStackSize: 0 })).toBe(false)
    expect(isItemComponents({ ...valid, maxDamage: 0 })).toBe(false)
    expect(isItemComponents({ ...valid, damage: -1 })).toBe(false)
    expect(isItemComponents({ ...valid, repairCost: -1 })).toBe(false)
    expect(isItemComponents({ ...valid, rarity: 'mythic' })).toBe(false)
    expect(isItemComponents({ ...valid, unbreakable: false })).toBe(false)
    expect(isItemComponents({ ...valid, enchantmentGlintOverride: 'yes' })).toBe(false)
    expect(isItemComponents({ ...valid, tooltipDisplay: {} })).toBe(false)
    expect(isItemComponents({ ...valid, customName: 1 })).toBe(false)
    expect(isItemComponents({ ...valid, itemName: null })).toBe(false)
    expect(isItemComponents({ ...valid, lore: [1] })).toBe(false)
    expect(isItemComponents({ ...valid, itemModel: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, customData: {} })).toBe(false)
    expect(isItemComponents({ ...valid, entityData: {} })).toBe(false)
    expect(isItemComponents({ ...valid, bucketEntityData: { value: Symbol() } })).toBe(false)
    expect(isItemComponents({ ...valid, profile: 'invalid name' })).toBe(false)
    expect(isItemComponents({ ...valid, blockEntityData: { id: 'minecraft:chest', value: Symbol() } })).toBe(false)
    expect(isItemComponents({ ...valid, bees: [{ entityData: {}, ticksInHive: -1, minTicksInHive: 0 }] })).toBe(false)
    expect(isItemComponents({ ...valid, potionContents: { customEffects: [{ id: 'INVALID!' }] } })).toBe(false)
    expect(isItemComponents({ ...valid, dyedColor: 0x1000000 })).toBe(false)
    expect(isItemComponents({ ...valid, customModelData: { floats: [] } })).toBe(false)
    expect(isItemComponents({ ...valid, mapId: -1 })).toBe(false)
    expect(isItemComponents({ ...valid, blockState: { axis: 1 } })).toBe(false)
    expect(isItemComponents({ ...valid, instrument: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, noteBlockSound: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, recipes: ['INVALID!'] })).toBe(false)
    expect(isItemComponents({ ...valid, lock: 1 })).toBe(false)
    expect(isItemComponents({ ...valid, tooltipStyle: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, baseColor: 'teal' })).toBe(false)
    expect(isItemComponents({ ...valid, equippable: { slot: 'head' } })).toBe(false)
    expect(isItemComponents({ ...valid, glider: { showInTooltip: true } })).toBe(false)
    expect(isItemComponents({ ...valid, deathProtection: { deathEffects: [{}] } })).toBe(false)
    expect(isItemComponents({ ...valid, repairable: { items: 'INVALID!' } })).toBe(false)
    expect(isItemComponents({ ...valid, enchantable: { value: 0 } })).toBe(false)
    expect(isItemComponents({ ...valid, jukeboxPlayable: { song: 'INVALID!' } })).toBe(false)
    expect(isItemComponents({ ...valid, ominousBottleAmplifier: 5 })).toBe(false)
    expect(isItemComponents({ ...valid, paintingVariant: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, lodestoneTracker: { tracked: 'yes' } })).toBe(false)
    expect(isItemComponents({ ...valid, fireworkExplosion: { shape: 'star' } })).toBe(false)
    expect(isItemComponents({ ...valid, fireworks: { explosions: [], flightDuration: 256 } })).toBe(false)
    expect(
      isItemComponents({
        ...valid,
        bannerPatterns: [{ pattern: 'INVALID!', color: 'red' }],
      }),
    ).toBe(false)
    expect(isItemComponents({ ...valid, potDecorations: ['minecraft:brick'] })).toBe(false)
    expect(isItemComponents({ ...valid, containerLoot: { lootTable: 'INVALID!' } })).toBe(false)
    expect(isItemComponents({ ...valid, debugStickState: { INVALID: 'axis' } })).toBe(false)
    expect(isItemComponents({ ...valid, food: {} })).toBe(false)
    expect(isItemComponents({ ...valid, consumable: {} })).toBe(false)
    expect(isItemComponents({ ...valid, useRemainder: {} })).toBe(false)
    expect(isItemComponents({ ...valid, useCooldown: {} })).toBe(false)
    expect(isItemComponents({ ...valid, useEffects: {} })).toBe(false)
    expect(isItemComponents({ ...valid, tool: {} })).toBe(false)
    expect(isItemComponents({ ...valid, weapon: {} })).toBe(false)
    expect(isItemComponents({ ...valid, kineticWeapon: {} })).toBe(false)
    expect(isItemComponents({ ...valid, piercingWeapon: {} })).toBe(false)
    const nested = itemComponents('stone', {
      chargedProjectiles: [itemStack('arrow', StackCount(1))],
      bundleContents: [itemStack('stone', StackCount(1))],
      container: [{ slot: ItemPrimitive.ContainerSlotIndex(0), item: itemStack('stone', StackCount(1)) }],
    })
    expect(isItemComponents(nested)).toBe(true)
    expect(
      isItemComponents({
        ...nested,
        chargedProjectiles: [
          itemStack('arrow', StackCount(1), {
            components: itemComponents('arrow', { maxStackSize: Quantities.MaxStackSize(2) }),
          }),
        ],
      }),
    ).toBe(true)
    expect(isItemComponents({ ...nested, chargedProjectiles: {} })).toBe(false)
    expect(isItemComponents({ ...nested, bundleContents: {} })).toBe(false)
    expect(isItemComponents({ ...nested, container: {} })).toBe(false)
    expect(isItemComponents({ ...nested, chargedProjectiles: [null] })).toBe(false)
    expect(isItemComponents({ ...nested, chargedProjectiles: [{ item: 'stone', count: 0 }] })).toBe(false)
    expect(isItemComponents({ ...nested, bundleContents: [{ item: 'unknown', count: 1 }] })).toBe(false)
    expect(isItemComponents({ ...nested, container: [{ slot: -1, item: itemStack('stone', StackCount(1)) }] })).toBe(false)
    expect(isItemComponents({ ...valid, attributeModifiers: {} })).toBe(false)
    expect(isItemComponents({ ...valid, enchantments: [] })).toBe(false)
    expect(isItemComponents({ ...valid, storedEnchantments: [] })).toBe(false)
    expect(isItemComponents({ ...valid, blocksAttacks: {} })).toBe(false)
    expect(isItemComponents({ ...valid, damageResistant: {} })).toBe(false)
    expect(isItemComponents({ ...valid, minimumAttackCharge: 2 })).toBe(false)
    expect(isItemComponents({ ...valid, damageType: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, swingAnimation: {} })).toBe(false)
    expect(isItemComponents({ ...valid, attackRange: {} })).toBe(false)
    expect(isItemComponents({ ...valid, potionDurationScale: -1 })).toBe(false)
    expect(isItemComponents({ ...valid, breakSound: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, providesBannerPatterns: ['INVALID!'] })).toBe(false)
    expect(isItemComponents({ ...valid, providesTrimMaterial: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, dye: 'teal' })).toBe(false)
    expect(isItemComponents({ ...valid, additionalTradeCost: 1.5 })).toBe(false)
    expect(isItemComponents({ ...valid, sulfurCubeContent: 'INVALID!' })).toBe(false)
    expect(isItemComponents({ ...valid, maxStackSize: 2, maxDamage: 1, damage: 0 })).toBe(false)
    expect(isItemComponents({ ...valid, extra: true })).toBe(false)
    expect(isItemComponents({})).toBe(false)
  })
})

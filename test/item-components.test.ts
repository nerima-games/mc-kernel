import {
  ITEM_COMPONENT_IDS,
  ITEM_RARITIES,
  ITEMS_WITH_SIXTEEN_STACK_LIMIT,
  ITEMS_WITH_SINGLE_STACK_LIMIT,
  ITEM_TOOL_COMPONENTS,
  isItemComponents,
  itemComponentStackLimitOf,
  itemComponents,
  itemToolComponentOf,
} from '../src/domain/item/item-components'
import { itemComponentsEqual } from '../src/domain/item/item-components-validation'
import { isChargedProjectilesOptions } from '../src/domain/item/item-component-values'
import {
  consumableClearAllEffects,
  consumableComponentOf,
  foodComponentOf,
  useRemainderComponentOf,
} from '../src/domain/item/consumable'
import { useCooldownComponent } from '../src/domain/item/use-cooldown'
import {
  additionalTradeCostComponent,
  bannerPatternsComponent,
  baseColorComponent,
  blockStateComponent,
  beesComponent,
  breakSoundComponent,
  canBreakComponent,
  canPlaceOnComponent,
  containerLootComponent,
  customDataComponent,
  customModelDataComponent,
  blockEntityDataComponent,
  bucketEntityDataComponent,
  debugStickStateComponent,
  deathProtectionComponent,
  dyeComponent,
  dyedColorComponent,
  entityDataComponent,
  enchantableComponent,
  equippableComponent,
  fireworkExplosionComponent,
  fireworksComponent,
  gliderComponent,
  hideAdditionalTooltipComponent,
  instrumentComponent,
  jukeboxPlayableComponent,
  kineticWeaponComponent,
  lockComponent,
  lodestoneTrackerComponent,
  mapColorComponent,
  mapDecorationsComponent,
  mapIdComponent,
  noteBlockSoundComponent,
  ominousBottleAmplifierComponent,
  paintingVariantComponent,
  potDecorationsComponent,
  potionContentsComponent,
  potionDurationScaleComponent,
  piercingWeaponComponent,
  profileComponent,
  providesBannerPatternsComponent,
  providesTrimMaterialComponent,
  recipesComponent,
  repairableComponent,
  suspiciousStewComponent,
  sulfurCubeContentComponent,
  trimComponent,
  tooltipDisplayComponent,
  tooltipStyleComponent,
  writableBookContentComponent,
  writtenBookContentComponent,
} from '../src/domain/item/item-component-values'
import {
  attackRangeComponent,
  damageTypeComponent,
  minimumAttackChargeComponent,
  swingAnimationComponent,
  useEffectsComponent,
} from '../src/domain/item/item-combat'
import { attributeModifier, attributeModifiersComponent } from '../src/domain/item/item-attribute-modifiers'
import { blocksAttacksComponent, damageResistantComponent } from '../src/domain/item/item-defense'
import { enchantmentsComponent, storedEnchantmentsComponent } from '../src/domain/item/item-enchantments'
import { weaponComponent } from '../src/domain/item/weapon'
import { textComponent } from '../src/domain/text/text-component'
import { ResourceLocation, TagLocation, UUID } from '../src/domain/text/identifiers'
import { itemStack } from '../src/domain/item/item-stack'
import { StackCount } from '../src/domain/time/quantities'
import * as Quantities from '../src/domain/time/quantities'
import * as ItemPrimitive from '../src/domain/item/item-primitives'
import { BlockAxis } from '../src/domain/coordinates/coordinate-primitives'
import { describe, expect, it } from 'vitest'

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
    const invoke = (item: unknown, options: unknown) =>
      () => Reflect.apply(itemComponents, undefined, [item, options])

    expect(invoke('stone', { maxStackSize: 0 })).toThrow()
    expect(invoke('stone', { maxStackSize: 100 })).toThrow()
    expect(() => Reflect.apply(itemComponents, undefined, ['stone', { maxDamage: 0 }])).toThrow()
    expect(invoke('stone', { maxDamage: 10 })).toThrow(RangeError)
    expect(invoke('stone', { damage: 1 })).toThrow(RangeError)
    expect(invoke('stone', { maxStackSize: 1, maxDamage: 10, damage: 11 })).toThrow(
      RangeError,
    )
    expect(() => Reflect.apply(itemComponents, undefined, ['stone', { damage: -1 }])).toThrow()
    expect(invoke('stone', { repairCost: -1 })).toThrow()
    expect(invoke('diamond_sword', { maxStackSize: 2 })).toThrow(RangeError)
  })

  it('rejects malformed runtime options at the public boundary', () => {
    const invoke = (item: unknown, options: unknown) =>
      () => Reflect.apply(itemComponents, undefined, [item, options])

    expect(invoke('stone', null)).toThrow(TypeError)
    expect(invoke('stone', [])).toThrow(TypeError)
    expect(invoke('stone', { unbreakable: false })).toThrow(TypeError)
    expect(invoke('stone', { tooltipDisplay: {} })).toThrow(TypeError)
    expect(invoke('stone', { customName: 1 })).toThrow(TypeError)
    expect(invoke('stone', { itemName: null })).toThrow(TypeError)
    expect(invoke('stone', { lore: Array.from({ length: 257 }, () => 'line') })).toThrow(TypeError)
    expect(invoke('stone', { itemModel: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { customData: {} })).toThrow(TypeError)
    expect(invoke('stone', { entityData: { Health: 20 } })).toThrow(TypeError)
    expect(invoke('stone', { bucketEntityData: { value: Symbol() } })).toThrow(TypeError)
    expect(invoke('stone', { profile: 'invalid name' })).toThrow(TypeError)
    expect(invoke('stone', { profile: { name: 'invalid name' } })).toThrow(TypeError)
    expect(
      invoke('stone', { blockEntityData: { id: 'minecraft:chest', value: Symbol() } }),
    ).toThrow(TypeError)
    expect(invoke('stone', { bees: [{ entityData: {}, ticksInHive: -1, minTicksInHive: 0 }] })).toThrow(TypeError)
    expect(invoke('stone', { potionContents: { customEffects: [{ id: 'INVALID!' }] } })).toThrow(TypeError)
    expect(invoke('stone', { dyedColor: 0x1000000 })).toThrow(TypeError)
    expect(invoke('stone', { customModelData: { floats: [Infinity] } })).toThrow(TypeError)
    expect(invoke('stone', { mapId: -1 })).toThrow(TypeError)
    expect(invoke('stone', { blockState: { axis: 1 } })).toThrow(TypeError)
    expect(invoke('stone', { instrument: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { noteBlockSound: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { recipes: ['INVALID!'] })).toThrow(TypeError)
    expect(invoke('stone', { lock: 1 })).toThrow(TypeError)
    expect(invoke('stone', { tooltipStyle: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { baseColor: 'teal' })).toThrow(TypeError)
    expect(invoke('stone', { equippable: { slot: 'invalid' } })).toThrow(TypeError)
    expect(invoke('stone', { glider: false })).toThrow(TypeError)
    expect(invoke('stone', { deathProtection: { deathEffects: [{}] } })).toThrow(TypeError)
    expect(invoke('stone', { repairable: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { enchantable: 0 })).toThrow(TypeError)
    expect(invoke('stone', { jukeboxPlayable: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { ominousBottleAmplifier: 5 })).toThrow(TypeError)
    expect(invoke('stone', { paintingVariant: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { lodestoneTracker: { tracked: 'yes' } })).toThrow(TypeError)
    expect(invoke('stone', { fireworkExplosion: { shape: 'invalid' } })).toThrow(TypeError)
    expect(invoke('stone', { fireworks: { flightDuration: 256 } })).toThrow(TypeError)
    expect(invoke('stone', { bannerPatterns: [{ pattern: 'INVALID!', color: 'red' }] })).toThrow(
      TypeError,
    )
    expect(invoke('stone', { potDecorations: ['minecraft:brick'] })).toThrow(TypeError)
    expect(invoke('stone', { containerLoot: { lootTable: 'INVALID!' } })).toThrow(TypeError)
    expect(invoke('stone', { debugStickState: { INVALID: 'axis' } })).toThrow(TypeError)
    expect(invoke('stone', { enchantmentGlintOverride: 'yes' })).toThrow(TypeError)
    expect(invoke('stone', { rarity: 'mythic' })).toThrow(TypeError)
    expect(invoke('stone', { food: {} })).toThrow(TypeError)
    expect(invoke('stone', { consumable: {} })).toThrow(TypeError)
    expect(invoke('stone', { useRemainder: {} })).toThrow(TypeError)
    expect(invoke('stone', { useCooldown: {} })).toThrow(TypeError)
    expect(invoke('stone', { useEffects: {} })).toThrow(TypeError)
    expect(invoke('stone', { tool: {} })).toThrow(TypeError)
    expect(invoke('stone', { weapon: {} })).toThrow(TypeError)
    expect(invoke('stone', { kineticWeapon: { contactCooldownTicks: -1 } })).toThrow(TypeError)
    expect(invoke('stone', { piercingWeapon: { dealsKnockback: 'yes' } })).toThrow(TypeError)
    expect(invoke('stone', { attributeModifiers: {} })).toThrow(TypeError)
    expect(invoke('stone', { enchantments: { 'not valid': 1 } })).toThrow(TypeError)
    expect(invoke('stone', { storedEnchantments: { 'not valid': 1 } })).toThrow(TypeError)
    expect(invoke('stone', { blocksAttacks: {} })).toThrow(TypeError)
    expect(invoke('stone', { damageResistant: {} })).toThrow(TypeError)
    expect(invoke('stone', { minimumAttackCharge: 2 })).toThrow(TypeError)
    expect(invoke('stone', { damageType: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { swingAnimation: {} })).toThrow(TypeError)
    expect(invoke('stone', { attackRange: {} })).toThrow(TypeError)
    expect(invoke('stone', { potionDurationScale: -1 })).toThrow(TypeError)
    expect(invoke('stone', { breakSound: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { providesBannerPatterns: ['INVALID!'] })).toThrow(TypeError)
    expect(invoke('stone', { providesTrimMaterial: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('stone', { dye: 'teal' })).toThrow(TypeError)
    expect(invoke('stone', { additionalTradeCost: 1.5 })).toThrow(TypeError)
    expect(invoke('stone', { sulfurCubeContent: 'INVALID!' })).toThrow(TypeError)
    expect(invoke('unobtainium', {})).toThrow(TypeError)
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

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
} from '../src/domain/item-components'
import {
  consumableClearAllEffects,
  consumableComponentOf,
  foodComponentOf,
  useRemainderComponentOf,
} from '../src/domain/consumable'
import { useCooldownComponent } from '../src/domain/use-cooldown'
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
} from '../src/domain/item-component-values'
import {
  attackRangeComponent,
  damageTypeComponent,
  minimumAttackChargeComponent,
  swingAnimationComponent,
  useEffectsComponent,
} from '../src/domain/item-combat'
import { attributeModifier, attributeModifiersComponent } from '../src/domain/item-attribute-modifiers'
import { blocksAttacksComponent, damageResistantComponent } from '../src/domain/item-defense'
import { enchantmentsComponent, storedEnchantmentsComponent } from '../src/domain/item-enchantments'
import { weaponComponent } from '../src/domain/weapon'
import { textComponent } from '../src/domain/text-component'
import { ResourceLocation } from '../src/domain/identifiers'
import { itemStack } from '../src/domain/item-stack'
import { describe, expect, it } from 'vitest'

describe('item components', () => {
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
    const chargedProjectiles = [itemStack('arrow', 1)]
    const bundleContents = [itemStack('stone', 1)]
    const container = [{ slot: 2, item: itemStack('diamond', 1) }]
    const mapDecorations = {
      spawn: { type: 'player' as const, x: 1.5, z: -2.25, rotation: 3.5 },
    }
    const writableBookContent = {
      pages: ['Page one', { raw: 'Page two', filtered: 'Filtered page two' }],
    }
    const writtenBookContent = {
      pages: ['"Hello world!"'],
      title: { raw: '"A delightful read"' },
      author: 'Alex',
      generation: 0,
      resolved: false,
    }
    const trim = {
      pattern: 'minecraft:sentry',
      material: 'minecraft:iron',
    }
    const suspiciousStew = [{ id: 'minecraft:night_vision' }]
    const canBreak = [{ blocks: 'minecraft:dirt' }]
    const canPlaceOn = { blocks: '#minecraft:grass' }

    const value = itemComponents('stone', {
      chargedProjectiles,
      bundleContents,
      container,
      mapColor: 0x123456,
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
    expect(value.mapColor).toBe(mapColorComponent(0x123456))
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
    const cooldown = useCooldownComponent(0.5)
    const weapon = weaponComponent({ itemDamagePerAttack: 2, disableBlockingForSeconds: 0.25 })
    const kineticWeapon = kineticWeaponComponent({ contactCooldownTicks: 4, damageMultiplier: 2 })
    const piercingWeapon = piercingWeaponComponent({ dealsKnockback: false, dismounts: true })
    const tooltipDisplay = tooltipDisplayComponent({
      hideTooltip: true,
      hiddenComponents: ['minecraft:food'],
    })
    const potionDurationScale = potionDurationScaleComponent(1.5)
    const breakSound = breakSoundComponent('minecraft:item.custom')
    const providesBannerPatterns = providesBannerPatternsComponent(['minecraft:pattern'])
    const providesTrimMaterial = providesTrimMaterialComponent('minecraft:trim')
    const dye = dyeComponent('red')
    const additionalTradeCost = additionalTradeCostComponent(2)
    const sulfurCubeContent = sulfurCubeContentComponent('minecraft:green_wool')
    const useEffects = useEffectsComponent({ canSprint: true, speedMultiplier: 0.5 })
    const minimumAttackCharge = minimumAttackChargeComponent(0.25)
    const damageType = damageTypeComponent('minecraft:player_attack')
    const swingAnimation = swingAnimationComponent({ type: 'stab', duration: 8 })
    const attackRange = attackRangeComponent({
      minReach: 1,
      maxReach: 4,
      minCreativeReach: 2,
      maxCreativeReach: 6,
      hitboxMargin: 0.4,
      mobFactor: 1.25,
    })
    const blocksAttacks = blocksAttacksComponent({
      damageReductions: [{ type: 'minecraft:player_attack', base: 2, factor: 0.5 }],
      itemDamage: { threshold: 0.5, base: 1, factor: 0.25 },
      blockSound: 'minecraft:block.anvil.land',
      disabledSound: 'minecraft:item.shield.block',
      bypassedBy: '#minecraft:axes',
    })
    const damageResistant = damageResistantComponent(['minecraft:fire'])
    const attributeModifiers = attributeModifiersComponent([
      attributeModifier({
        type: 'minecraft:generic.attack_damage',
        id: 'minecraft:test_damage',
        amount: 3,
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
    const customData = customDataComponent({ source: 'test', values: [1, true] })
    const bees = beesComponent([
      {
        entityData: { id: 'minecraft:bee' },
        ticksInHive: 120,
        minTicksInHive: 60,
      },
    ])
    const potionContents = potionContentsComponent({
      potion: 'minecraft:water',
      customEffects: [{ id: 'minecraft:speed', duration: 200 }],
    })
    const dyedColor = dyedColorComponent([0.5, 1, 0.2])
    const customModelData = {
      floats: [0.5],
      flags: [true],
      strings: ['test_model'],
      colors: [0xff00ff],
    }
    const mapId = mapIdComponent(42)
    const blockState = blockStateComponent({ axis: 'y' })
    const instrument = instrumentComponent('minecraft:ponder_goat_horn')
    const noteBlockSound = noteBlockSoundComponent('minecraft:block.note_block.harp')
    const recipes = recipesComponent(['minecraft:stick'])
    const lock = lockComponent('secret')
    const tooltipStyle = tooltipStyleComponent('minecraft:tooltip/default')
    const baseColor = baseColorComponent('red')
    const equippable = equippableComponent({
      slot: 'head',
      equipSound: 'minecraft:item.armor.equip_diamond',
    })
    const glider = gliderComponent()
    const deathProtection = deathProtectionComponent({
      deathEffects: [consumableClearAllEffects()],
    })
    const repairable = repairableComponent(['minecraft:diamond', 'minecraft:netherite_ingot'])
    const enchantable = enchantableComponent(10)
    const jukeboxPlayable = jukeboxPlayableComponent('minecraft:test_song')
    const ominousBottleAmplifier = ominousBottleAmplifierComponent(2)
    const paintingVariant = paintingVariantComponent('minecraft:kebab')
    const lodestoneTracker = lodestoneTrackerComponent({
      target: { pos: [1, 64, -2], dimension: 'minecraft:overworld' },
      tracked: false,
    })
    const fireworkExplosion = fireworkExplosionComponent({
      shape: 'star',
      colors: [0xff0000],
      fadeColors: [0x00ff00],
      hasTrail: true,
      hasTwinkle: true,
    })
    const fireworks = fireworksComponent({
      explosions: [{ shape: 'burst', hasTrail: true }],
      flightDuration: 3,
    })
    const bannerPatterns = bannerPatternsComponent([
      { pattern: 'minecraft:stripe', color: 'red' },
    ])
    const potDecorations = potDecorationsComponent([
      'minecraft:brick',
      'minecraft:heart_pottery_sherd',
      'minecraft:arms_up_pottery_sherd',
      'minecraft:skull_pottery_sherd',
    ])
    const containerLoot = containerLootComponent({
      lootTable: 'minecraft:chests/simple_dungeon',
      seed: 42n,
    })
    const debugStickState = debugStickStateComponent({ 'minecraft:oak_log': 'axis' })

    expect(
      itemComponents('stone', {
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
        entityData: { id: 'minecraft:zombie', Health: 20, Pos: [1, 64, 2] },
        bucketEntityData: { BucketVariant: 1 },
        profile: {
          name: 'Notch',
          id: '123e4567-e89b-12d3-a456-426614174000',
          properties: [{ name: 'textures', value: 'encoded', signature: 'signed' }],
        },
        blockEntityData: { id: 'minecraft:chest', CustomName: 'Chest' },
        bees: [{ entityData: { id: 'minecraft:bee' }, ticksInHive: 120, minTicksInHive: 60 }],
        potionContents: { potion: 'minecraft:water', customEffects: [{ id: 'minecraft:speed', duration: 200 }] },
        dyedColor,
        customModelData,
        mapId: 42,
        blockState,
        instrument,
        noteBlockSound,
        recipes,
        lock,
        tooltipStyle,
        baseColor,
        equippable: { slot: 'head', equipSound: 'minecraft:item.armor.equip_diamond' },
        glider: true,
        deathProtection: { deathEffects: [consumableClearAllEffects()] },
        repairable: ['minecraft:diamond', 'minecraft:netherite_ingot'],
        enchantable: 10,
        jukeboxPlayable: 'minecraft:test_song',
        ominousBottleAmplifier: 2,
        paintingVariant: 'minecraft:kebab',
        lodestoneTracker: {
          target: { pos: [1, 64, -2], dimension: 'minecraft:overworld' },
          tracked: false,
        },
        fireworkExplosion: {
          shape: 'star',
          colors: [0xff0000],
          fadeColors: [0x00ff00],
          hasTrail: true,
          hasTwinkle: true,
        },
        fireworks: {
          explosions: [{ shape: 'burst', hasTrail: true }],
          flightDuration: 3,
        },
        bannerPatterns: [{ pattern: 'minecraft:stripe', color: 'red' }],
        potDecorations: [
          'minecraft:brick',
          'minecraft:heart_pottery_sherd',
          'minecraft:arms_up_pottery_sherd',
          'minecraft:skull_pottery_sherd',
        ],
        containerLoot: { lootTable: 'minecraft:chests/simple_dungeon', seed: 42n },
        debugStickState: { 'minecraft:oak_log': 'axis' },
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
        entityData: entityDataComponent({ id: 'minecraft:zombie', Health: 20, Pos: [1, 64, 2] }),
        bucketEntityData: bucketEntityDataComponent({ BucketVariant: 1 }),
        profile: profileComponent({
          name: 'Notch',
          id: '123e4567-e89b-12d3-a456-426614174000',
          properties: [{ name: 'textures', value: 'encoded', signature: 'signed' }],
        }),
        blockEntityData: blockEntityDataComponent({ id: 'minecraft:chest', CustomName: 'Chest' }),
        bees,
        potionContents,
        dyedColor,
      customModelData: customModelDataComponent(customModelData),
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
    expect(() => itemComponents('stone', { maxStackSize: 0 })).toThrow()
    expect(() => itemComponents('stone', { maxStackSize: 100 })).toThrow()
    expect(() => Reflect.apply(itemComponents, undefined, ['stone', { maxDamage: 0 }])).toThrow()
    expect(() => itemComponents('stone', { maxDamage: 10 })).toThrow(RangeError)
    expect(() => itemComponents('stone', { damage: 1 })).toThrow(RangeError)
    expect(() => itemComponents('stone', { maxStackSize: 1, maxDamage: 10, damage: 11 })).toThrow(
      RangeError,
    )
    expect(() => Reflect.apply(itemComponents, undefined, ['stone', { damage: -1 }])).toThrow()
    expect(() => itemComponents('stone', { repairCost: -1 })).toThrow()
    expect(() => itemComponents('diamond_sword', { maxStackSize: 2 })).toThrow(RangeError)
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
      chargedProjectiles: [itemStack('arrow', 1)],
      bundleContents: [itemStack('stone', 1)],
      container: [{ slot: 0, item: itemStack('stone', 1) }],
    })
    expect(isItemComponents(nested)).toBe(true)
    expect(
      isItemComponents({
        ...nested,
        chargedProjectiles: [
          itemStack('arrow', 1, {
            components: itemComponents('arrow', { maxStackSize: 2 }),
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
    expect(isItemComponents({ ...nested, container: [{ slot: -1, item: itemStack('stone', 1) }] })).toBe(false)
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

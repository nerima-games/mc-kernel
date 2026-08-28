import {
  DYE_COLORS,
  EQUIPPABLE_SLOTS,
  additionalTradeCostComponent,
  bannerPatternsComponent,
  baseColorComponent,
  blockEntityDataComponent,
  blockStateComponent,
  beesComponent,
  breakSoundComponent,
  bundleContentsComponent,
  bucketEntityDataComponent,
  canBreakComponent,
  canPlaceOnComponent,
  chargedProjectilesComponent,
  containerComponent,
  containerLootComponent,
  customDataComponent,
  customModelDataComponent,
  debugStickStateComponent,
  deathProtectionComponent,
  dyeComponent,
  dyedColorComponent,
  entityDataComponent,
  enchantableComponent,
  equippableComponent,
  fireworkExplosionComponent,
  fireworksComponent,
  FIREWORK_EXPLOSION_SHAPES,
  gliderComponent,
  hideAdditionalTooltipComponent,
  instrumentComponent,
  isAdditionalTradeCostComponent,
  isBaseColorComponent,
  isBlockStateComponent,
  isBreakSoundComponent,
  isBlockEntityDataComponent,
  isBlockEntityDataOptions,
  isBeesComponent,
  isBeesOptions,
  isBundleContentsComponent,
  isBundleContentsOptions,
  isBucketEntityDataComponent,
  isBucketEntityDataOptions,
  isCanBreakComponent,
  isCanBreakOptions,
  isCanPlaceOnComponent,
  isCanPlaceOnOptions,
  isChargedProjectilesComponent,
  isChargedProjectilesOptions,
  isContainerComponent,
  isContainerOptions,
  isCustomDataComponent,
  isCustomModelDataComponent,
  isCustomModelDataOptions,
  isDeathProtectionComponent,
  isDeathProtectionOptions,
  isDyeComponent,
  isDyedColorComponent,
  isEnchantableComponent,
  isEnchantableValue,
  isEntityDataComponent,
  isEntityDataOptions,
  isEquippableComponent,
  isEquippableOptions,
  isGliderComponent,
  isInstrumentComponent,
  isItemComponentNbtObject,
  isItemComponentNbtValue,
  isKineticWeaponComponent,
  isKineticWeaponCondition,
  isKineticWeaponConditionOptions,
  isKineticWeaponOptions,
  isHideAdditionalTooltipComponent,
  isHideAdditionalTooltipOptions,
  isJukeboxPlayableComponent,
  isLockComponent,
  isLodestoneTrackerComponent,
  isLodestoneTrackerOptions,
  isMapColorComponent,
  isMapDecorationsComponent,
  isMapDecorationsOptions,
  isMapIdComponent,
  isNoteBlockSoundComponent,
  isOminousBottleAmplifierComponent,
  isPaintingVariantComponent,
  isPiercingWeaponComponent,
  isPiercingWeaponOptions,
  isPotDecorationsComponent,
  isPotDecorationsOptions,
  isPotionContentsComponent,
  isPotionDurationScaleComponent,
  isPotionContentsOptions,
  isProvidesBannerPatternsComponent,
  isProvidesTrimMaterialComponent,
  isProfileComponent,
  isProfileOptions,
  isRepairableComponent,
  isRecipesComponent,
  isSulfurCubeContentComponent,
  isSulfurCubeContentOptions,
  isSuspiciousStewComponent,
  isSuspiciousStewOptions,
  isTrimComponent,
  isTrimOptions,
  isWritableBookContentComponent,
  isWritableBookContentOptions,
  isWrittenBookContentComponent,
  isWrittenBookContentOptions,
  isBannerPatternsComponent,
  isBannerPatternsOptions,
  isContainerLootComponent,
  isContainerLootOptions,
  isDebugStickStateComponent,
  isFireworkExplosionComponent,
  isFireworkExplosionOptions,
  isFireworksComponent,
  isFireworksOptions,
  isTooltipDisplayComponent,
  isTooltipStyleComponent,
  jukeboxPlayableComponent,
  kineticWeaponComponent,
  lockComponent,
  lodestoneTrackerComponent,
  MAP_DECORATION_TYPES,
  mapColorComponent,
  mapDecorationsComponent,
  mapIdComponent,
  noteBlockSoundComponent,
  ominousBottleAmplifierComponent,
  paintingVariantComponent,
  piercingWeaponComponent,
  potDecorationsComponent,
  potionContentsComponent,
  potionDurationScaleComponent,
  profileComponent,
  providesBannerPatternsComponent,
  providesTrimMaterialComponent,
  repairableComponent,
  recipesComponent,
  sulfurCubeContentComponent,
  suspiciousStewComponent,
  trimComponent,
  tooltipDisplayComponent,
  tooltipStyleComponent,
  writableBookContentComponent,
  writtenBookContentComponent,
} from '../src/domain/item-component-values'
import { consumableClearAllEffects } from '../src/domain/consumable'
import { ResourceLocation, TagLocation } from '../src/domain/identifiers'
import { itemStack } from '../src/domain/item-stack'
import { describe, expect, it } from 'vitest'

describe('item component values', () => {
  it('constructs immutable simple component values', () => {
    expect(DYE_COLORS).toEqual([
      'white',
      'orange',
      'magenta',
      'light_blue',
      'yellow',
      'lime',
      'pink',
      'gray',
      'light_gray',
      'cyan',
      'purple',
      'blue',
      'brown',
      'green',
      'red',
      'black',
    ])
    expect(potionDurationScaleComponent()).toBe(1)
    expect(additionalTradeCostComponent()).toBe(0)
    expect(breakSoundComponent('minecraft:item.break')).toBe('minecraft:item.break')
    expect(providesTrimMaterialComponent('minecraft:gold')).toBe('minecraft:gold')
    expect(dyeComponent('black')).toBe('black')

    const customData = customDataComponent({
      text: 'value',
      count: 2n,
      flags: [true, false],
      nested: { value: 1 },
    })
    const entityData = entityDataComponent({
      id: 'minecraft:zombie',
      Health: 20,
      Pos: [1, 64, 2],
    })
    const bucketEntityData = bucketEntityDataComponent({ BucketVariant: 1 })
    const blockEntityData = blockEntityDataComponent({ id: 'minecraft:chest', CustomName: 'Chest' })
    const bees = beesComponent([
      {
        entityData: { id: 'minecraft:bee', Health: '20' },
        ticksInHive: 120,
        minTicksInHive: 60,
      },
    ])
    const defaultBees = beesComponent()
    const potionContents = potionContentsComponent({
      potion: 'minecraft:strong',
      customColor: 0x336699,
      customEffects: [
        {
          id: 'minecraft:speed',
          duration: 200,
          amplifier: 1,
          ambient: true,
          showParticles: false,
          showIcon: false,
          hiddenEffect: { id: 'minecraft:haste' },
        },
      ],
    })
    const defaultPotionContents = potionContentsComponent()
    const namedPotionContents = potionContentsComponent('minecraft:water')
    const profile = profileComponent({
      name: 'Notch',
      id: '123e4567-e89b-12d3-a456-426614174000',
      properties: [{ name: 'textures', value: 'encoded', signature: 'signed' }],
    })
    const simpleProfile = profileComponent('Notch')
    const packedDyedColor = dyedColorComponent(0xff7f00)
    const normalizedDyedColor = dyedColorComponent([0.5, 1, 0.2])
    const customModelData = customModelDataComponent({
      floats: [0.5],
      flags: [true],
      strings: ['test_model'],
      colors: [0xff00ff],
    })
    const defaultCustomModelData = customModelDataComponent()
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
      model: 'minecraft:diamond',
      cameraOverlay: 'minecraft:overlay',
      allowedEntities: ['minecraft:zombie'],
      canBeSheared: true,
      shearingSound: 'minecraft:item.shears.snip',
      dispensable: false,
      swappable: false,
      damageOnHurt: false,
      equipOnInteract: true,
    })
    const defaultEquippable = equippableComponent({ slot: 'saddle' })
    const kineticWeapon = kineticWeaponComponent({
      contactCooldownTicks: 4,
      delayTicks: 2,
      dismountConditions: { maxDurationTicks: 3, minSpeed: 1.5, minRelativeSpeed: 0.25 },
      knockbackConditions: { maxDurationTicks: 4 },
      damageConditions: { maxDurationTicks: 5, minSpeed: 0.5 },
      forwardMovement: 0.75,
      damageMultiplier: 2,
      sound: 'minecraft:item.trident.throw',
      hitSound: 'minecraft:entity.player.attack.knockback',
    })
    const defaultKineticWeapon = kineticWeaponComponent()
    const piercingWeapon = piercingWeaponComponent({
      dealsKnockback: false,
      dismounts: true,
      sound: 'minecraft:item.trident.hit',
      hitSound: 'minecraft:entity.player.attack.crit',
    })
    const defaultPiercingWeapon = piercingWeaponComponent()
    const glider = gliderComponent()
    const deathProtection = deathProtectionComponent({
      deathEffects: [consumableClearAllEffects()],
    })
    const defaultDeathProtection = deathProtectionComponent()
    const repairable = repairableComponent('#minecraft:repairs/diamond_armor')
    const enchantable = enchantableComponent(10)
    const jukeboxPlayable = jukeboxPlayableComponent('minecraft:test_song')
    const ominousBottleAmplifier = ominousBottleAmplifierComponent(4)
    const paintingVariant = paintingVariantComponent('minecraft:kebab')
    const sulfurCubeContent = sulfurCubeContentComponent('minecraft:green_wool')
    const lodestoneTracker = lodestoneTrackerComponent({
      target: { pos: [10, 64, -10], dimension: 'minecraft:overworld' },
    })
    const defaultLodestoneTracker = lodestoneTrackerComponent()
    const fireworkExplosion = fireworkExplosionComponent({
      shape: 'large_ball',
      colors: [0xff0000],
      fadeColors: [0x00ff00],
      hasTrail: true,
      hasTwinkle: true,
    })
    const defaultFireworks = fireworksComponent()
    const fireworks = fireworksComponent({
      explosions: [{ shape: 'small_ball' }],
      flightDuration: 2,
    })
    const bannerPatterns = bannerPatternsComponent([
      { pattern: 'minecraft:stripe', color: 'blue' },
    ])
    const defaultBannerPatterns = bannerPatternsComponent()
    const potDecorations = potDecorationsComponent()
    const customPotDecorations = potDecorationsComponent([
      'minecraft:brick',
      'minecraft:heart_pottery_sherd',
      'minecraft:arms_up_pottery_sherd',
      'minecraft:skull_pottery_sherd',
    ])
    const containerLoot = containerLootComponent({
      lootTable: 'minecraft:chests/simple_dungeon',
      seed: 42n,
    })
    const containerLootWithoutSeed = containerLootComponent({
      lootTable: 'minecraft:chests/simple_dungeon',
    })
    const debugStickState = debugStickStateComponent({ 'minecraft:oak_log': 'axis' })
    const defaultDebugStickState = debugStickStateComponent()

    expect(customData).toEqual({
      text: 'value',
      count: 2n,
      flags: [true, false],
      nested: { value: 1 },
    })
    expect(Object.isFrozen(customData)).toBe(true)
    expect(Object.isFrozen(customData['flags'])).toBe(true)
    expect(Object.isFrozen(customData['nested'])).toBe(true)
    expect(entityData).toEqual({ id: 'minecraft:zombie', Health: 20, Pos: [1, 64, 2] })
    expect(Object.isFrozen(entityData)).toBe(true)
    expect(Object.isFrozen(entityData['Pos'])).toBe(true)
    expect(bucketEntityData).toEqual({ BucketVariant: 1 })
    expect(Object.isFrozen(bucketEntityData)).toBe(true)
    expect(blockEntityData).toEqual({ id: 'minecraft:chest', CustomName: 'Chest' })
    expect(Object.isFrozen(blockEntityData)).toBe(true)
    expect(bees).toEqual([
      {
        entityData: { id: 'minecraft:bee', Health: '20' },
        ticksInHive: 120,
        minTicksInHive: 60,
      },
    ])
    expect(Object.isFrozen(bees)).toBe(true)
    const firstBee = bees[0]
    expect(firstBee).toBeDefined()
    if (firstBee === undefined) throw new Error('bees must contain the fixture entry')
    expect(Object.isFrozen(firstBee)).toBe(true)
    expect(Object.isFrozen(firstBee.entityData)).toBe(true)
    expect(defaultBees).toEqual([])
    expect(potionContents).toEqual({
      potion: 'minecraft:strong',
      customColor: 0x336699,
      customEffects: [
        {
          id: 'minecraft:speed',
          amplifier: 1,
          duration: 200,
          ambient: true,
          showParticles: false,
          showIcon: false,
          hiddenEffect: {
            id: 'minecraft:haste',
            amplifier: 0,
            duration: 0,
            ambient: false,
            showParticles: true,
            showIcon: true,
          },
        },
      ],
    })
    expect(defaultPotionContents).toEqual({ customEffects: [] })
    expect(namedPotionContents).toBe('minecraft:water')
    expect(profile).toEqual({
      name: 'Notch',
      id: '123e4567-e89b-12d3-a456-426614174000',
      properties: [{ name: 'textures', value: 'encoded', signature: 'signed' }],
    })
    expect(Object.isFrozen(profile)).toBe(true)
    if (typeof profile !== 'string' && profile.properties !== undefined) {
      expect(Object.isFrozen(profile.properties)).toBe(true)
      const [property] = profile.properties
      if (property !== undefined) {
        expect(Object.isFrozen(property)).toBe(true)
      }
    }
    expect(simpleProfile).toBe('Notch')
    expect(packedDyedColor).toBe(0xff7f00)
    expect(normalizedDyedColor).toEqual([0.5, 1, 0.2])
    expect(Object.isFrozen(normalizedDyedColor)).toBe(true)
    expect(customModelData).toEqual({
      floats: [0.5],
      flags: [true],
      strings: ['test_model'],
      colors: [0xff00ff],
    })
    expect(Object.isFrozen(customModelData)).toBe(true)
    expect(Object.isFrozen(customModelData.floats)).toBe(true)
    expect(Object.isFrozen(customModelData.flags)).toBe(true)
    expect(Object.isFrozen(customModelData.strings)).toBe(true)
    expect(Object.isFrozen(customModelData.colors)).toBe(true)
    expect(defaultCustomModelData).toEqual({ floats: [], flags: [], strings: [], colors: [] })
    expect(mapId).toBe(42)
    expect(blockState).toEqual({ axis: 'y' })
    expect(Object.isFrozen(blockState)).toBe(true)
    expect(instrument).toBe('minecraft:ponder_goat_horn')
    expect(noteBlockSound).toBe('minecraft:block.note_block.harp')
    expect(recipes).toEqual(['minecraft:stick'])
    expect(Object.isFrozen(recipes)).toBe(true)
    expect(lock).toBe('secret')
    expect(tooltipStyle).toBe('minecraft:tooltip/default')
    expect(baseColor).toBe('red')
    expect(equippable).toEqual({
      slot: 'head',
      equipSound: 'minecraft:item.armor.equip_diamond',
      model: 'minecraft:diamond',
      cameraOverlay: 'minecraft:overlay',
      allowedEntities: ['minecraft:zombie'],
      canBeSheared: true,
      shearingSound: 'minecraft:item.shears.snip',
      dispensable: false,
      swappable: false,
      damageOnHurt: false,
      equipOnInteract: true,
    })
    expect(Object.isFrozen(equippable)).toBe(true)
    expect(Object.isFrozen(equippable.allowedEntities)).toBe(true)
    expect(defaultEquippable).toEqual({
      slot: 'saddle',
      canBeSheared: false,
      shearingSound: 'minecraft:item.shears.snip',
      dispensable: true,
      swappable: true,
      damageOnHurt: true,
      equipOnInteract: false,
    })
    expect(Object.isFrozen(defaultEquippable)).toBe(true)
    expect(kineticWeapon).toEqual({
      contactCooldownTicks: 4,
      delayTicks: 2,
      dismountConditions: { maxDurationTicks: 3, minSpeed: 1.5, minRelativeSpeed: 0.25 },
      knockbackConditions: { maxDurationTicks: 4, minSpeed: 0, minRelativeSpeed: 0 },
      damageConditions: { maxDurationTicks: 5, minSpeed: 0.5, minRelativeSpeed: 0 },
      forwardMovement: 0.75,
      damageMultiplier: 2,
      sound: 'minecraft:item.trident.throw',
      hitSound: 'minecraft:entity.player.attack.knockback',
    })
    expect(Object.isFrozen(kineticWeapon)).toBe(true)
    expect(Object.isFrozen(kineticWeapon.dismountConditions)).toBe(true)
    expect(Object.isFrozen(kineticWeapon.knockbackConditions)).toBe(true)
    expect(Object.isFrozen(kineticWeapon.damageConditions)).toBe(true)
    expect(defaultKineticWeapon).toEqual({
      contactCooldownTicks: 10,
      delayTicks: 0,
      forwardMovement: 0,
      damageMultiplier: 1,
    })
    expect(Object.isFrozen(defaultKineticWeapon)).toBe(true)
    expect(piercingWeapon).toEqual({
      dealsKnockback: false,
      dismounts: true,
      sound: 'minecraft:item.trident.hit',
      hitSound: 'minecraft:entity.player.attack.crit',
    })
    expect(Object.isFrozen(piercingWeapon)).toBe(true)
    expect(defaultPiercingWeapon).toEqual({ dealsKnockback: true, dismounts: false })
    expect(Object.isFrozen(defaultPiercingWeapon)).toBe(true)
    expect(glider).toEqual({})
    expect(Object.isFrozen(glider)).toBe(true)
    expect(deathProtection).toEqual({ deathEffects: [consumableClearAllEffects()] })
    expect(Object.isFrozen(deathProtection)).toBe(true)
    expect(Object.isFrozen(deathProtection.deathEffects)).toBe(true)
    expect(defaultDeathProtection).toEqual({ deathEffects: [] })
    expect(Object.isFrozen(defaultDeathProtection.deathEffects)).toBe(true)
    expect(repairable).toEqual({ items: '#minecraft:repairs/diamond_armor' })
    expect(Object.isFrozen(repairable)).toBe(true)
    expect(enchantable).toEqual({ value: 10 })
    expect(Object.isFrozen(enchantable)).toBe(true)
    expect(jukeboxPlayable).toEqual({ song: 'minecraft:test_song' })
    expect(Object.isFrozen(jukeboxPlayable)).toBe(true)
    expect(ominousBottleAmplifier).toBe(4)
    expect(paintingVariant).toBe('minecraft:kebab')
    expect(sulfurCubeContent).toBe('minecraft:green_wool')
    expect(FIREWORK_EXPLOSION_SHAPES).toEqual([
      'small_ball',
      'large_ball',
      'star',
      'creeper',
      'burst',
    ])
    expect(lodestoneTracker).toEqual({
      target: { pos: [10, 64, -10], dimension: 'minecraft:overworld' },
      tracked: true,
    })
    expect(Object.isFrozen(lodestoneTracker)).toBe(true)
    expect(Object.isFrozen(lodestoneTracker.target)).toBe(true)
    expect(Object.isFrozen(lodestoneTracker.target?.pos)).toBe(true)
    expect(defaultLodestoneTracker).toEqual({ tracked: true })
    expect(fireworkExplosion).toEqual({
      shape: 'large_ball',
      colors: [0xff0000],
      fadeColors: [0x00ff00],
      hasTrail: true,
      hasTwinkle: true,
    })
    expect(Object.isFrozen(fireworkExplosion)).toBe(true)
    expect(Object.isFrozen(fireworkExplosion.colors)).toBe(true)
    expect(Object.isFrozen(fireworkExplosion.fadeColors)).toBe(true)
    expect(defaultFireworks).toEqual({ explosions: [], flightDuration: 1 })
    expect(fireworks).toEqual({
      explosions: [
        {
          shape: 'small_ball',
          colors: [],
          fadeColors: [],
          hasTrail: false,
          hasTwinkle: false,
        },
      ],
      flightDuration: 2,
    })
    expect(Object.isFrozen(fireworks)).toBe(true)
    expect(Object.isFrozen(fireworks.explosions)).toBe(true)
    expect(Object.isFrozen(fireworks.explosions[0])).toBe(true)
    expect(bannerPatterns).toEqual([{ pattern: 'minecraft:stripe', color: 'blue' }])
    expect(Object.isFrozen(bannerPatterns)).toBe(true)
    expect(Object.isFrozen(bannerPatterns[0])).toBe(true)
    expect(defaultBannerPatterns).toEqual([])
    expect(potDecorations).toEqual([
      'minecraft:brick',
      'minecraft:brick',
      'minecraft:brick',
      'minecraft:brick',
    ])
    expect(customPotDecorations).toEqual([
      'minecraft:brick',
      'minecraft:heart_pottery_sherd',
      'minecraft:arms_up_pottery_sherd',
      'minecraft:skull_pottery_sherd',
    ])
    expect(Object.isFrozen(potDecorations)).toBe(true)
    expect(containerLoot).toEqual({ lootTable: 'minecraft:chests/simple_dungeon', seed: 42n })
    expect(containerLootWithoutSeed).toEqual({ lootTable: 'minecraft:chests/simple_dungeon' })
    expect(debugStickState).toEqual({ 'minecraft:oak_log': 'axis' })
    expect(Object.isFrozen(debugStickState)).toBe(true)
    expect(defaultDebugStickState).toEqual({})

    const tag = providesBannerPatternsComponent('#minecraft:pattern_item')
    const location = providesBannerPatternsComponent('minecraft:pattern_item')
    const locations = providesBannerPatternsComponent(['minecraft:pattern_item', 'minecraft:other'])
    const tooltip = tooltipDisplayComponent({
      hideTooltip: true,
      hiddenComponents: ['minecraft:food'],
    })

    if (typeof tag === 'string') {
      expect(TagLocation.is(tag)).toBe(true)
    }
    if (typeof location === 'string') {
      expect(ResourceLocation.is(location)).toBe(true)
    }
    expect(locations).toEqual(['minecraft:pattern_item', 'minecraft:other'])
    expect(Object.isFrozen(locations)).toBe(true)
    expect(tooltip).toEqual({
      hideTooltip: true,
      hiddenComponents: ['minecraft:food'],
    })
    expect(Object.isFrozen(tooltip)).toBe(true)
    expect(Object.isFrozen(tooltip.hiddenComponents)).toBe(true)
  })

  it('constructs immutable portable component values', () => {
    expect(MAP_DECORATION_TYPES).toContain('trial_chambers')
    expect(mapColorComponent()).toBe(4603950)

    const mapDecorations = mapDecorationsComponent({
      spawn: { type: 'player', x: 1.5, z: -2.25, rotation: 3.5 },
    })
    expect(mapDecorations).toEqual({
      spawn: { type: 'player', x: 1.5, z: -2.25, rotation: 3.5 },
    })
    expect(Object.isFrozen(mapDecorations)).toBe(true)
    expect(Object.isFrozen(mapDecorations['spawn'])).toBe(true)

    const arrowStack = itemStack('arrow', 1)
    expect(chargedProjectilesComponent([arrowStack])).toEqual([arrowStack])
    expect(bundleContentsComponent([arrowStack])).toEqual([arrowStack])
    expect(containerComponent([{ slot: 2, item: arrowStack }])).toEqual([
      { slot: 2, item: arrowStack },
    ])

    const writableBookContent = writableBookContentComponent({
      pages: [
        'Page one',
        { raw: 'Page two', filtered: 'Filtered page two' },
        { raw: 'Page without a filter' },
      ],
    })
    expect(writableBookContent).toEqual({
      pages: [
        'Page one',
        { raw: 'Page two', filtered: 'Filtered page two' },
        { raw: 'Page without a filter' },
      ],
    })
    expect(Object.isFrozen(writableBookContent)).toBe(true)
    expect(Object.isFrozen(writableBookContent.pages)).toBe(true)

    const writtenBookContent = writtenBookContentComponent({
      pages: ['"Hello world!"', { raw: '"A second page"', filtered: '"Filtered page"' }],
      title: { raw: '"A delightful read"', filtered: '"Filtered title"' },
      author: 'Alex',
      generation: 0,
      resolved: false,
    })
    expect(writtenBookContent).toEqual({
      pages: ['"Hello world!"', { raw: '"A second page"', filtered: '"Filtered page"' }],
      title: { raw: '"A delightful read"', filtered: '"Filtered title"' },
      author: 'Alex',
      generation: 0,
      resolved: false,
    })
    expect(Object.isFrozen(writtenBookContent)).toBe(true)
    expect(Object.isFrozen(writtenBookContent.pages)).toBe(true)
    expect(Object.isFrozen(writtenBookContent.title)).toBe(true)

    const trim = trimComponent({
      pattern: {
        assetId: 'minecraft:sentry',
        description: { text: 'Sentry' },
        decal: false,
      },
      material: {
        assetName: 'iron',
        ingredient: 'iron_ingot',
        itemModelIndex: 0.5,
        overrideArmorMaterials: { diamond: 'minecraft:diamond' },
        description: { text: 'Iron' },
      },
    })
    expect(trim).toEqual({
      pattern: {
        assetId: 'minecraft:sentry',
        description: { text: 'Sentry' },
        decal: false,
      },
      material: {
        assetName: 'iron',
        ingredient: 'iron_ingot',
        itemModelIndex: 0.5,
        overrideArmorMaterials: { diamond: 'minecraft:diamond' },
        description: { text: 'Iron' },
      },
    })
    expect(Object.isFrozen(trim)).toBe(true)
    expect(Object.isFrozen(trim.pattern)).toBe(true)
    expect(Object.isFrozen(trim.material)).toBe(true)
    if (typeof trim.material !== 'string' && trim.material.overrideArmorMaterials !== undefined) {
      expect(Object.isFrozen(trim.material.overrideArmorMaterials)).toBe(true)
    }

    const suspiciousStew = suspiciousStewComponent([
      { id: 'minecraft:night_vision' },
      { id: 'minecraft:poison', duration: 40 },
    ])
    expect(suspiciousStew).toEqual([
      { id: 'minecraft:night_vision', duration: 160 },
      { id: 'minecraft:poison', duration: 40 },
    ])
    expect(Object.isFrozen(suspiciousStew)).toBe(true)
    expect(Object.isFrozen(suspiciousStew[0])).toBe(true)

    expect(hideAdditionalTooltipComponent()).toEqual({})

    const canBreak = canBreakComponent({
      blocks: 'minecraft:dirt',
      state: { axis: 'y' },
      nbt: { foo: 'bar' },
    })
    expect(canBreak).toEqual({
      blocks: 'minecraft:dirt',
      state: { axis: 'y' },
      nbt: { foo: 'bar' },
    })
    expect(Object.isFrozen(canBreak)).toBe(true)
    if (!('length' in canBreak)) {
      expect(Object.isFrozen(canBreak.nbt)).toBe(true)
      expect(Object.isFrozen(canBreak.state)).toBe(true)
    }

    const canPlaceOn = canPlaceOnComponent([
      { blocks: ['#minecraft:grass', 'minecraft:dirt'] },
    ])
    expect(canPlaceOn).toEqual([
      { blocks: ['#minecraft:grass', 'minecraft:dirt'] },
    ])
    expect(Object.isFrozen(canPlaceOn)).toBe(true)
    if (Array.isArray(canPlaceOn)) {
      expect(Object.isFrozen(canPlaceOn[0])).toBe(true)
      expect(Object.isFrozen(canPlaceOn[0].blocks)).toBe(true)
    }

    expect(canPlaceOnComponent({})).toEqual({})
  })

  it('guards every supported simple component shape', () => {
    const tooltip = tooltipDisplayComponent()

    expect(isPotionDurationScaleComponent(0)).toBe(true)
    expect(isPotionDurationScaleComponent(1.5)).toBe(true)
    expect(isPotionDurationScaleComponent(-1)).toBe(false)
    expect(isPotionDurationScaleComponent(Infinity)).toBe(false)
    expect(isPotionDurationScaleComponent('1')).toBe(false)

    expect(isAdditionalTradeCostComponent(-2)).toBe(true)
    expect(isAdditionalTradeCostComponent(2)).toBe(true)
    expect(isAdditionalTradeCostComponent(1.5)).toBe(false)
    expect(isAdditionalTradeCostComponent(Infinity)).toBe(false)

    expect(isBreakSoundComponent('minecraft:item.break')).toBe(true)
    expect(isBreakSoundComponent('INVALID!')).toBe(false)
    expect(isBreakSoundComponent(1)).toBe(false)

    expect(isProvidesBannerPatternsComponent('minecraft:pattern_item')).toBe(true)
    expect(isProvidesBannerPatternsComponent('#minecraft:pattern_item')).toBe(true)
    expect(isProvidesBannerPatternsComponent([])).toBe(true)
    expect(isProvidesBannerPatternsComponent(['minecraft:pattern_item'])).toBe(true)
    expect(isProvidesBannerPatternsComponent(['INVALID!'])).toBe(false)
    expect(isProvidesBannerPatternsComponent({})).toBe(false)

    expect(isProvidesTrimMaterialComponent('minecraft:gold')).toBe(true)
    expect(isProvidesTrimMaterialComponent('INVALID!')).toBe(false)
    expect(isProvidesTrimMaterialComponent(1)).toBe(false)

    for (const dye of DYE_COLORS) {
      expect(isDyeComponent(dye)).toBe(true)
    }
    expect(isDyeComponent('teal')).toBe(false)
    expect(isDyeComponent(1)).toBe(false)

    expect(isItemComponentNbtValue(true)).toBe(true)
    expect(isItemComponentNbtValue(2n)).toBe(true)
    expect(isItemComponentNbtValue(1)).toBe(true)
    expect(isItemComponentNbtValue('value')).toBe(true)
    expect(isItemComponentNbtValue(Infinity)).toBe(false)
    expect(isItemComponentNbtValue(undefined)).toBe(false)
    expect(isItemComponentNbtValue(null)).toBe(false)
    expect(isItemComponentNbtValue([1, { nested: 'value' }])).toBe(true)
    expect(isItemComponentNbtValue([Symbol('invalid')])).toBe(false)
    expect(isItemComponentNbtValue({ nested: { value: 1 } })).toBe(true)
    expect(isItemComponentNbtValue(new Date())).toBe(false)

    const nullPrototype: Record<string, unknown> = Object.create(null)
    nullPrototype['value'] = 'valid'
    expect(isItemComponentNbtValue(nullPrototype)).toBe(true)

    const shared = { value: 'shared' }
    expect(isItemComponentNbtValue({ first: shared, second: shared })).toBe(true)

    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic
    expect(isItemComponentNbtValue(cyclic)).toBe(false)

    expect(isCustomDataComponent({ value: 'valid' })).toBe(true)
    expect(isCustomDataComponent(nullPrototype)).toBe(true)
    expect(isCustomDataComponent({})).toBe(false)
    expect(isCustomDataComponent([])).toBe(false)
    expect(isCustomDataComponent(new Date())).toBe(false)
    expect(isCustomDataComponent({ value: undefined })).toBe(false)
    expect(isCustomDataComponent(cyclic)).toBe(false)

    expect(isItemComponentNbtObject({ nested: 'value' })).toBe(true)
    expect(isItemComponentNbtObject([])).toBe(false)
    expect(isItemComponentNbtObject(new Date())).toBe(false)
    expect(isEntityDataOptions({ id: 'minecraft:zombie' })).toBe(true)
    expect(isEntityDataOptions({})).toBe(false)
    expect(isEntityDataOptions({ id: 'INVALID!', value: 1 })).toBe(false)
    expect(isEntityDataComponent(entityDataComponent({ id: 'minecraft:zombie' }))).toBe(true)
    expect(isEntityDataComponent({ id: 'INVALID!' })).toBe(false)
    expect(isBucketEntityDataOptions({})).toBe(true)
    expect(isBucketEntityDataOptions({ value: Symbol() })).toBe(false)
    expect(isBucketEntityDataComponent(bucketEntityDataComponent({ BucketVariant: 1 }))).toBe(true)
    expect(isBucketEntityDataComponent([])).toBe(false)
    expect(isBlockEntityDataOptions({ id: 'minecraft:chest' })).toBe(true)
    expect(isBlockEntityDataOptions({})).toBe(false)
    expect(isBlockEntityDataComponent(blockEntityDataComponent({ id: 'minecraft:chest' }))).toBe(true)
    expect(isBeesOptions([])).toBe(true)
    expect(
      isBeesOptions([{ entityData: { id: 'minecraft:bee' }, ticksInHive: 0, minTicksInHive: 0 }]),
    ).toBe(true)
    expect(isBeesComponent(beesComponent())).toBe(true)
    expect(
      isBeesOptions([{ entityData: { id: 'minecraft:bee' }, ticksInHive: -1, minTicksInHive: 0 }]),
    ).toBe(false)
    expect(
      isBeesOptions([{ entityData: { id: 1 }, ticksInHive: 0, minTicksInHive: 0 }]),
    ).toBe(false)
    expect(isBeesComponent({})).toBe(false)
    const arrowStack = itemStack('arrow', 1)
    expect(isChargedProjectilesOptions([arrowStack])).toBe(true)
    expect(isChargedProjectilesOptions([{}])).toBe(false)
    expect(isChargedProjectilesComponent(chargedProjectilesComponent([arrowStack]))).toBe(true)
    expect(isChargedProjectilesComponent({})).toBe(false)
    expect(isBundleContentsOptions([arrowStack])).toBe(true)
    expect(isBundleContentsOptions([{}])).toBe(false)
    expect(isBundleContentsComponent(bundleContentsComponent([arrowStack]))).toBe(true)
    expect(isBundleContentsComponent({})).toBe(false)
    expect(isContainerOptions([{ slot: 0, item: arrowStack }])).toBe(true)
    expect(isContainerOptions([null])).toBe(false)
    expect(isContainerOptions([{}])).toBe(false)
    expect(isContainerComponent(containerComponent([{ slot: 0, item: arrowStack }]))).toBe(true)
    expect(isContainerComponent({})).toBe(false)
    expect(isPotionContentsOptions('minecraft:water')).toBe(true)
    expect(isPotionContentsOptions({ customEffects: [{ id: 'minecraft:speed' }] })).toBe(true)
    expect(isPotionContentsOptions([])).toBe(false)
    expect(isPotionContentsOptions({ customEffects: [], extra: true })).toBe(false)
    expect(isPotionContentsOptions({ potion: 'INVALID!' })).toBe(false)
    expect(isPotionContentsOptions({ customColor: 0x1000000 })).toBe(false)
    expect(isPotionContentsComponent(potionContentsComponent())).toBe(true)
    expect(isPotionContentsComponent('minecraft:water')).toBe(true)
    expect(isPotionContentsComponent('INVALID!')).toBe(false)
    expect(isPotionContentsComponent({ customEffects: [] })).toBe(true)
    expect(isPotionContentsComponent({})).toBe(false)
    expect(isPotionContentsComponent({ customEffects: [{ id: 'minecraft:speed' }] })).toBe(false)
    const cyclicPotionEffect: Record<string, unknown> = { id: 'minecraft:speed' }
    cyclicPotionEffect['hiddenEffect'] = cyclicPotionEffect
    expect(isPotionContentsOptions({ customEffects: [cyclicPotionEffect] })).toBe(false)
    expect(isProfileOptions('Notch')).toBe(true)
    expect(isProfileOptions('invalid name')).toBe(false)
    expect(isProfileOptions({})).toBe(true)
    expect(isProfileOptions({ name: 'invalid name' })).toBe(false)
    expect(isProfileOptions({ id: 'bad' })).toBe(false)
    expect(isProfileOptions({ properties: [{ name: 'textures', value: 'encoded' }] })).toBe(true)
    expect(isProfileOptions({ properties: [{ name: 'textures', value: 'encoded', extra: true }] })).toBe(false)
    expect(
      isProfileComponent(
        profileComponent({
          name: 'Notch',
          id: '123e4567-e89b-12d3-a456-426614174000',
          properties: [{ name: 'textures', value: 'encoded' }],
        }),
      ),
    ).toBe(true)
    expect(isProfileComponent({ id: 'bad' })).toBe(false)
    expect(profileComponent({})).toEqual({})
    expect(profileComponent({ name: 'Notch' })).toEqual({ name: 'Notch' })
    expect(profileComponent({ id: '123e4567-e89b-12d3-a456-426614174000' })).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(profileComponent({ properties: [{ name: 'textures', value: 'encoded' }] })).toEqual({
      properties: [{ name: 'textures', value: 'encoded' }],
    })
    expect(isProfileComponent(profileComponent('Notch'))).toBe(true)

    expect(isDyedColorComponent(0)).toBe(true)
    expect(isDyedColorComponent(0xffffff)).toBe(true)
    expect(isDyedColorComponent(-1)).toBe(false)
    expect(isDyedColorComponent(0x1000000)).toBe(false)
    expect(isDyedColorComponent(1.5)).toBe(false)
    expect(isDyedColorComponent([0, 0.5, 1])).toBe(true)
    expect(isDyedColorComponent([0, 0.5])).toBe(false)
    expect(isDyedColorComponent([0, 0.5, 1, 0])).toBe(false)
    expect(isDyedColorComponent([-0.1, 0.5, 1])).toBe(false)
    expect(isDyedColorComponent([0, Number.NaN, 1])).toBe(false)
    expect(isDyedColorComponent(['0', 0.5, 1])).toBe(false)
    expect(isDyedColorComponent('red')).toBe(false)

    const customModelData = customModelDataComponent({
      floats: [0.5],
      flags: [true],
      strings: ['test_model'],
      colors: [0xff00ff],
    })
    expect(isCustomModelDataOptions({})).toBe(true)
    expect(isCustomModelDataOptions(customModelData)).toBe(true)
    expect(isCustomModelDataOptions({ unknown: [] })).toBe(false)
    expect(isCustomModelDataOptions({ floats: [Infinity] })).toBe(false)
    expect(isCustomModelDataComponent(customModelData)).toBe(true)
    expect(isCustomModelDataComponent({ floats: [], flags: [], strings: [], colors: [] })).toBe(true)
    expect(isCustomModelDataComponent({ floats: [] })).toBe(false)
    expect(isCustomModelDataComponent({ floats: [], flags: [], strings: [], colors: [0x1000000] })).toBe(false)

    expect(isMapIdComponent(0)).toBe(true)
    expect(isMapIdComponent(42)).toBe(true)
    expect(isMapIdComponent(-1)).toBe(false)
    expect(isMapIdComponent(1.5)).toBe(false)
    expect(isMapIdComponent(Infinity)).toBe(false)
    expect(isMapIdComponent('42')).toBe(false)

    expect(isMapColorComponent(0)).toBe(true)
    expect(isMapColorComponent(0xffffff)).toBe(true)
    expect(isMapColorComponent(-1)).toBe(false)
    expect(isMapColorComponent(0x1000000)).toBe(false)
    expect(isMapColorComponent(1.5)).toBe(false)
    expect(isMapColorComponent(Infinity)).toBe(false)
    expect(isMapDecorationsOptions({})).toBe(true)
    expect(
      isMapDecorationsOptions({
        spawn: { type: 'player', x: 1, z: 2, rotation: 0 },
      }),
    ).toBe(true)
    expect(
      isMapDecorationsOptions({
        spawn: { type: 'invalid', x: 1, z: 2, rotation: 0 },
      }),
    ).toBe(false)
    expect(
      isMapDecorationsOptions({
        spawn: { type: 'player', x: 1, z: 2, rotation: 0, extra: true },
      }),
    ).toBe(false)
    expect(isMapDecorationsComponent(mapDecorationsComponent())).toBe(true)

    expect(isWritableBookContentOptions({})).toBe(true)
    expect(isWritableBookContentOptions({ pages: ['Page'] })).toBe(true)
    expect(
      isWritableBookContentOptions({ pages: Array.from({ length: 101 }, () => 'Page') }),
    ).toBe(false)
    expect(isWritableBookContentOptions({ pages: [{ raw: 'Page', extra: true }] })).toBe(false)
    expect(isWritableBookContentComponent(writableBookContentComponent())).toBe(true)
    expect(isWritableBookContentComponent({ pages: [] })).toBe(true)
    expect(isWritableBookContentComponent({})).toBe(false)

    const writtenBookOptions = {
      pages: ['"Page"'],
      title: '"Title"',
      author: 'Alex',
      generation: 0,
      resolved: false,
    }
    expect(isWrittenBookContentOptions(writtenBookOptions)).toBe(true)
    expect(isWrittenBookContentOptions({ ...writtenBookOptions, pages: ['not-json'] })).toBe(false)
    expect(isWrittenBookContentOptions({ ...writtenBookOptions, generation: 4 })).toBe(false)
    expect(isWrittenBookContentComponent(writtenBookContentComponent(writtenBookOptions))).toBe(true)

    expect(isTrimOptions({ pattern: 'minecraft:sentry', material: 'minecraft:iron' })).toBe(true)
    expect(isTrimOptions({ pattern: 'INVALID!', material: 'minecraft:iron' })).toBe(false)
    expect(
      isTrimOptions({
        pattern: 'minecraft:sentry',
        material: 'minecraft:iron',
        showInTooltip: 1,
      }),
    ).toBe(false)
    const inlineTrim = trimComponent({
      pattern: { assetId: 'minecraft:sentry', description: { text: 'Sentry' }, decal: false },
      material: {
        assetName: 'iron',
        ingredient: 'iron_ingot',
        itemModelIndex: 0.5,
        description: { text: 'Iron' },
      },
    })
    expect(isTrimComponent(inlineTrim)).toBe(true)
    expect(
      isTrimComponent({
        pattern: 'minecraft:sentry',
        material: 'minecraft:iron',
        showInTooltip: true,
      }),
    ).toBe(false)
    expect(isTrimComponent({ pattern: 'minecraft:sentry', material: 'minecraft:iron' })).toBe(true)

    expect(isSuspiciousStewOptions([])).toBe(true)
    expect(isSuspiciousStewOptions([{ id: 'minecraft:night_vision' }])).toBe(true)
    expect(isSuspiciousStewOptions([{ id: 'INVALID!' }])).toBe(false)
    expect(isSuspiciousStewOptions([{ id: 'minecraft:poison', duration: -1 }])).toBe(false)
    expect(isSuspiciousStewComponent(suspiciousStewComponent())).toBe(true)
    expect(isSuspiciousStewComponent([{ id: 'minecraft:poison' }])).toBe(false)

    expect(isHideAdditionalTooltipOptions(true)).toBe(true)
    expect(isHideAdditionalTooltipOptions(false)).toBe(false)
    expect(isHideAdditionalTooltipComponent(hideAdditionalTooltipComponent())).toBe(true)
    expect(isHideAdditionalTooltipComponent({ hidden: true })).toBe(false)

    expect(isCanBreakOptions({ blocks: 'minecraft:dirt' })).toBe(true)
    expect(isCanBreakOptions([{ blocks: '#minecraft:grass' }])).toBe(true)
    expect(isCanBreakOptions({ predicates: { blocks: 'minecraft:dirt' } })).toBe(false)
    expect(isCanBreakOptions({ blocks: 'INVALID!' })).toBe(false)
    expect(isCanBreakOptions({ state: { axis: 1 } })).toBe(false)
    expect(isCanPlaceOnOptions({ blocks: 'minecraft:dirt' })).toBe(true)
    expect(
      isCanBreakComponent(canBreakComponent({ blocks: 'minecraft:dirt' })),
    ).toBe(true)
    expect(
      isCanPlaceOnComponent(canPlaceOnComponent({ blocks: 'minecraft:dirt' })),
    ).toBe(true)
    expect(isCanBreakComponent({ predicates: [], showInTooltip: true })).toBe(false)

    expect(isBlockStateComponent({ axis: 'y' })).toBe(true)
    expect(isBlockStateComponent({})).toBe(true)
    expect(isBlockStateComponent({ axis: 1 })).toBe(false)
    expect(isBlockStateComponent([])).toBe(false)
    expect(isBlockStateComponent(null)).toBe(false)

    expect(isInstrumentComponent('minecraft:ponder_goat_horn')).toBe(true)
    expect(isInstrumentComponent('INVALID!')).toBe(false)
    expect(isInstrumentComponent(1)).toBe(false)
    expect(isNoteBlockSoundComponent('minecraft:block.note_block.harp')).toBe(true)
    expect(isNoteBlockSoundComponent('INVALID!')).toBe(false)
    expect(isNoteBlockSoundComponent(1)).toBe(false)
    expect(isRecipesComponent([])).toBe(true)
    expect(isRecipesComponent(['minecraft:stick'])).toBe(true)
    expect(isRecipesComponent(['INVALID!'])).toBe(false)
    expect(isRecipesComponent({})).toBe(false)
    expect(isLockComponent('')).toBe(true)
    expect(isLockComponent('secret')).toBe(true)
    expect(isLockComponent(1)).toBe(false)
    expect(isTooltipStyleComponent('minecraft:tooltip/default')).toBe(true)
    expect(isTooltipStyleComponent('INVALID!')).toBe(false)
    expect(isTooltipStyleComponent(1)).toBe(false)
    expect(isBaseColorComponent('red')).toBe(true)
    expect(isBaseColorComponent('teal')).toBe(false)
    expect(isBaseColorComponent(1)).toBe(false)

    expect(EQUIPPABLE_SLOTS).toEqual([
      'head',
      'chest',
      'legs',
      'feet',
      'body',
      'mainhand',
      'offhand',
      'saddle',
    ])
    expect(isEquippableOptions({ slot: 'head' })).toBe(true)
    expect(isEquippableOptions({ slot: 'saddle', allowedEntities: ['minecraft:horse'] })).toBe(true)
    expect(isEquippableOptions({ slot: 'invalid' })).toBe(false)
    expect(isEquippableOptions({ slot: 'head', unknown: true })).toBe(false)
    expect(isEquippableComponent(equippableComponent({ slot: 'head' }))).toBe(true)
    expect(isEquippableComponent({ slot: 'head' })).toBe(false)

    expect(isKineticWeaponConditionOptions({ maxDurationTicks: 1 })).toBe(true)
    expect(isKineticWeaponConditionOptions({})).toBe(false)
    expect(isKineticWeaponConditionOptions({ maxDurationTicks: -1 })).toBe(false)
    expect(
      isKineticWeaponCondition({ maxDurationTicks: 1, minSpeed: 0, minRelativeSpeed: 0 }),
    ).toBe(true)
    expect(isKineticWeaponCondition({ maxDurationTicks: 1, minSpeed: 0 })).toBe(false)
    expect(isKineticWeaponOptions({})).toBe(true)
    expect(
      isKineticWeaponOptions({
        contactCooldownTicks: 1,
        dismountConditions: { maxDurationTicks: 2, minSpeed: 0.5 },
      }),
    ).toBe(true)
    expect(isKineticWeaponOptions({ contactCooldownTicks: -1 })).toBe(false)
    expect(isKineticWeaponOptions({ dismountConditions: {} })).toBe(false)
    expect(isKineticWeaponComponent(kineticWeaponComponent())).toBe(true)
    expect(
      isKineticWeaponComponent(
        kineticWeaponComponent({
          dismountConditions: { maxDurationTicks: 1, minSpeed: 0, minRelativeSpeed: 0 },
          knockbackConditions: { maxDurationTicks: 2, minSpeed: 0, minRelativeSpeed: 0 },
          damageConditions: { maxDurationTicks: 3, minSpeed: 0, minRelativeSpeed: 0 },
        }),
      ),
    ).toBe(true)
    expect(
      isKineticWeaponComponent({
        contactCooldownTicks: 10,
        forwardMovement: 0,
        damageMultiplier: 1,
      }),
    ).toBe(false)
    expect(isKineticWeaponComponent(null)).toBe(false)

    expect(isPiercingWeaponOptions({})).toBe(true)
    expect(isPiercingWeaponOptions({ dealsKnockback: true })).toBe(true)
    expect(isPiercingWeaponOptions({ dealsKnockback: 'yes' })).toBe(false)
    expect(isPiercingWeaponComponent(piercingWeaponComponent())).toBe(true)
    expect(isPiercingWeaponComponent({ dealsKnockback: true })).toBe(false)

    expect(isGliderComponent({})).toBe(true)
    expect(isGliderComponent({ showInTooltip: true })).toBe(false)
    expect(isGliderComponent([])).toBe(false)

    expect(isDeathProtectionOptions({})).toBe(true)
    expect(isDeathProtectionOptions({ deathEffects: [consumableClearAllEffects()] })).toBe(true)
    expect(isDeathProtectionOptions({ deathEffects: [{}] })).toBe(false)
    expect(isDeathProtectionComponent(deathProtectionComponent())).toBe(true)
    expect(isDeathProtectionComponent({ deathEffects: [{}] })).toBe(false)

    expect(isRepairableComponent(repairableComponent('minecraft:diamond'))).toBe(true)
    expect(isRepairableComponent({ items: 'INVALID!' })).toBe(false)

    expect(isEnchantableValue(1)).toBe(true)
    expect(isEnchantableValue(0)).toBe(false)
    expect(isEnchantableValue(1.5)).toBe(false)
    expect(isEnchantableValue(Infinity)).toBe(false)
    expect(isEnchantableComponent(enchantableComponent(1))).toBe(true)
    expect(isEnchantableComponent({ value: 0 })).toBe(false)

    expect(isJukeboxPlayableComponent(jukeboxPlayableComponent('minecraft:test_song'))).toBe(true)
    expect(isJukeboxPlayableComponent({ song: 'INVALID!' })).toBe(false)

    expect(isOminousBottleAmplifierComponent(0)).toBe(true)
    expect(isOminousBottleAmplifierComponent(4)).toBe(true)
    expect(isOminousBottleAmplifierComponent(-1)).toBe(false)
    expect(isOminousBottleAmplifierComponent(5)).toBe(false)
    expect(isOminousBottleAmplifierComponent(1.5)).toBe(false)

    expect(isPaintingVariantComponent('minecraft:kebab')).toBe(true)
    expect(isPaintingVariantComponent('INVALID!')).toBe(false)
    expect(isSulfurCubeContentOptions('minecraft:green_wool')).toBe(true)
    expect(isSulfurCubeContentOptions('INVALID!')).toBe(false)
    expect(isSulfurCubeContentComponent(sulfurCubeContentComponent('minecraft:green_wool'))).toBe(true)
    expect(isSulfurCubeContentComponent('INVALID!')).toBe(false)

    expect(isLodestoneTrackerOptions({})).toBe(true)
    expect(
      isLodestoneTrackerOptions({
        target: { pos: [0, 64, 0], dimension: 'minecraft:overworld' },
        tracked: false,
      }),
    ).toBe(true)
    expect(isLodestoneTrackerOptions({ target: { pos: [0, 64], dimension: 'minecraft:overworld' } })).toBe(false)
    expect(
      isLodestoneTrackerOptions({
        target: { pos: [0, 'invalid', 0], dimension: 'minecraft:overworld' },
      }),
    ).toBe(false)
    expect(isLodestoneTrackerOptions({ target: null })).toBe(false)
    expect(isLodestoneTrackerOptions({ tracked: 'yes' })).toBe(false)
    expect(isLodestoneTrackerComponent({ tracked: true })).toBe(true)
    expect(
      isLodestoneTrackerComponent({
        target: { pos: [0, 64, 0], dimension: ResourceLocation('minecraft:overworld') },
        tracked: false,
      }),
    ).toBe(true)
    expect(isLodestoneTrackerComponent({ target: { pos: [0, 64, 0], dimension: 'minecraft:overworld' }, tracked: true })).toBe(true)
    expect(isLodestoneTrackerComponent({ target: { pos: [0, 64, 0], dimension: 'INVALID!' }, tracked: true })).toBe(false)
    expect(isLodestoneTrackerComponent({ target: null, tracked: true })).toBe(false)
    expect(isLodestoneTrackerComponent({})).toBe(false)

    expect(isFireworkExplosionOptions({ shape: 'star' })).toBe(true)
    expect(
      isFireworkExplosionOptions({
        shape: 'star',
        colors: [0, 0xffffff],
        fadeColors: [],
        hasTrail: true,
        hasTwinkle: false,
      }),
    ).toBe(true)
    expect(isFireworkExplosionOptions({ shape: 'invalid' })).toBe(false)
    expect(isFireworkExplosionOptions({ shape: 'star', extra: true })).toBe(false)
    expect(isFireworkExplosionOptions({ shape: 'star', colors: [0x1000000] })).toBe(false)
    expect(isFireworkExplosionOptions({ shape: 'star', colors: 'invalid' })).toBe(false)
    expect(isFireworkExplosionOptions({ shape: 'star', hasTrail: 'yes' })).toBe(false)
    expect(
      isFireworkExplosionComponent({
        shape: 'star',
        colors: [],
        fadeColors: [],
        hasTrail: false,
        hasTwinkle: false,
      }),
    ).toBe(true)
    expect(isFireworkExplosionComponent({ shape: 'star' })).toBe(false)
    expect(isFireworkExplosionComponent({ shape: 'star', colors: [], fadeColors: [], hasTrail: false })).toBe(false)

    expect(isFireworksOptions({})).toBe(true)
    expect(
      isFireworksOptions({ explosions: [{ shape: 'star' }], flightDuration: 0xff }),
    ).toBe(true)
    expect(isFireworksOptions({ explosions: [1] })).toBe(false)
    expect(isFireworksOptions({ flightDuration: 0x100 })).toBe(false)
    expect(isFireworksComponent({ explosions: [], flightDuration: 1 })).toBe(true)
    expect(
      isFireworksComponent({
        explosions: [
          { shape: 'star', colors: [], fadeColors: [], hasTrail: false, hasTwinkle: false },
        ],
        flightDuration: 1,
      }),
    ).toBe(true)
    expect(
      isFireworksComponent({
        explosions: [{ shape: 'star' }],
        flightDuration: 1,
      }),
    ).toBe(false)
    expect(
      isFireworksComponent({
        explosions: Array.from({ length: 257 }, () => ({
          shape: 'star',
          colors: [],
          fadeColors: [],
          hasTrail: false,
          hasTwinkle: false,
        })),
        flightDuration: 1,
      }),
    ).toBe(false)

    expect(isBannerPatternsOptions([])).toBe(true)
    expect(isBannerPatternsOptions([{ pattern: 'minecraft:stripe', color: 'blue' }])).toBe(true)
    expect(isBannerPatternsOptions([{ pattern: 'INVALID!', color: 'blue' }])).toBe(false)
    expect(isBannerPatternsOptions([{ pattern: 'minecraft:stripe', color: 'teal' }])).toBe(false)
    expect(isBannerPatternsComponent([])).toBe(true)
    expect(
      isBannerPatternsComponent([
        { pattern: ResourceLocation('minecraft:stripe'), color: 'blue' },
      ]),
    ).toBe(true)
    expect(isBannerPatternsComponent([{ pattern: 'minecraft:stripe', color: 'blue' }])).toBe(true)
    expect(isBannerPatternsComponent([{ pattern: 'INVALID!', color: 'blue' }])).toBe(false)

    const validPotDecorations = [
      'minecraft:brick',
      'minecraft:heart_pottery_sherd',
      'minecraft:arms_up_pottery_sherd',
      'minecraft:skull_pottery_sherd',
    ]
    expect(isPotDecorationsOptions(validPotDecorations)).toBe(true)
    expect(isPotDecorationsOptions(validPotDecorations.slice(0, 3))).toBe(false)
    expect(isPotDecorationsOptions([...validPotDecorations.slice(0, 3), 'INVALID!'])).toBe(false)
    expect(
      isPotDecorationsComponent(validPotDecorations.map((value) => ResourceLocation(value))),
    ).toBe(true)
    expect(isPotDecorationsComponent(validPotDecorations)).toBe(true)
    expect(
      isPotDecorationsComponent([...validPotDecorations.slice(0, 3), 'INVALID!']),
    ).toBe(false)

    expect(isContainerLootOptions({ lootTable: 'minecraft:chests/simple_dungeon' })).toBe(true)
    expect(
      isContainerLootOptions({
        lootTable: 'minecraft:chests/simple_dungeon',
        seed: -(2n ** 63n),
      }),
    ).toBe(true)
    expect(isContainerLootOptions({ lootTable: 'INVALID!' })).toBe(false)
    expect(isContainerLootOptions({ lootTable: 'minecraft:chests/simple_dungeon', seed: 1 })).toBe(false)
    expect(isContainerLootComponent({ lootTable: ResourceLocation('minecraft:chests/simple_dungeon') })).toBe(true)
    expect(
      isContainerLootComponent({
        lootTable: ResourceLocation('minecraft:chests/simple_dungeon'),
        seed: (2n ** 63n) - 1n,
      }),
    ).toBe(true)
    expect(isContainerLootComponent({ lootTable: 'minecraft:chests/simple_dungeon' })).toBe(true)
    expect(isContainerLootComponent({ lootTable: 'INVALID!' })).toBe(false)
    expect(
      isContainerLootComponent({
        lootTable: ResourceLocation('minecraft:chests/simple_dungeon'),
        seed: 2n ** 63n,
      }),
    ).toBe(false)

    expect(isDebugStickStateComponent({})).toBe(true)
    expect(isDebugStickStateComponent({ 'minecraft:oak_log': 'axis' })).toBe(true)
    expect(isDebugStickStateComponent({ INVALID: 'axis' })).toBe(false)
    expect(isDebugStickStateComponent({ 'minecraft:oak_log': 1 })).toBe(false)

    expect(isTooltipDisplayComponent(tooltip)).toBe(true)
    expect(isTooltipDisplayComponent({ hideTooltip: true, hiddenComponents: [] })).toBe(true)
    expect(isTooltipDisplayComponent({ hideTooltip: true })).toBe(false)
    expect(isTooltipDisplayComponent({ hideTooltip: 'yes', hiddenComponents: [] })).toBe(false)
    expect(isTooltipDisplayComponent({ hideTooltip: false, hiddenComponents: ['INVALID!'] })).toBe(false)
    expect(isTooltipDisplayComponent({ hideTooltip: false, hiddenComponents: 1 })).toBe(false)
    expect(isTooltipDisplayComponent({ hideTooltip: false, hiddenComponents: [], extra: true })).toBe(false)
    expect(isTooltipDisplayComponent(null)).toBe(false)
    expect(isTooltipDisplayComponent([])).toBe(false)
  })

  it('rejects malformed constructor input at the runtime boundary', () => {
    expect(() => Reflect.apply(potionDurationScaleComponent, undefined, [-1])).toThrow()
    expect(() => Reflect.apply(potionDurationScaleComponent, undefined, ['1'])).toThrow()
    expect(() => Reflect.apply(additionalTradeCostComponent, undefined, [1.5])).toThrow()
    expect(() => Reflect.apply(additionalTradeCostComponent, undefined, ['1'])).toThrow()
    expect(() => breakSoundComponent('INVALID!')).toThrow()
    expect(() => providesTrimMaterialComponent('INVALID!')).toThrow()
    expect(() => Reflect.apply(providesBannerPatternsComponent, undefined, ['INVALID!'])).toThrow()
    expect(() => Reflect.apply(providesBannerPatternsComponent, undefined, [[]])).not.toThrow()
    expect(() => providesBannerPatternsComponent(['#minecraft:pattern_item'])).toThrow(TypeError)
    expect(() =>
      providesBannerPatternsComponent(['minecraft:pattern_item', 'INVALID!']),
    ).toThrow()
    expect(() => Reflect.apply(providesBannerPatternsComponent, undefined, [1])).toThrow(TypeError)
    expect(() => dyeComponent('teal')).toThrow(RangeError)
    expect(() => Reflect.apply(customDataComponent, undefined, [{}])).toThrow(TypeError)
    expect(() => Reflect.apply(customDataComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(customDataComponent, undefined, [{ value: new Date() }])).toThrow(TypeError)
    expect(() => Reflect.apply(entityDataComponent, undefined, [{ Health: 20 }])).toThrow(TypeError)
    expect(() => Reflect.apply(bucketEntityDataComponent, undefined, [{ value: Symbol() }])).toThrow(TypeError)
    expect(() => profileComponent('invalid name')).toThrow(TypeError)
    expect(() => Reflect.apply(profileComponent, undefined, [{ id: 'bad' }])).toThrow(TypeError)
    expect(() => Reflect.apply(blockEntityDataComponent, undefined, [{ id: 'INVALID!' }])).toThrow(TypeError)
    expect(() => beesComponent([{ entityData: { id: 'minecraft:bee' }, ticksInHive: -1, minTicksInHive: 0 }])).toThrow(
      TypeError,
    )
    expect(() => potionContentsComponent({ customEffects: [{ id: 'INVALID!' }] })).toThrow(TypeError)
    expect(() => Reflect.apply(dyedColorComponent, undefined, [0x1000000])).toThrow(RangeError)
    expect(() => Reflect.apply(dyedColorComponent, undefined, [[0, 0.5]])).toThrow(RangeError)
    expect(() => Reflect.apply(customModelDataComponent, undefined, [{ floats: [Infinity] }])).toThrow(TypeError)
    expect(() => Reflect.apply(customModelDataComponent, undefined, [{ unknown: [] }])).toThrow(TypeError)
    expect(() => Reflect.apply(mapIdComponent, undefined, [-1])).toThrow(RangeError)
    expect(() => Reflect.apply(mapColorComponent, undefined, [0x1000000])).toThrow(RangeError)
    expect(() => Reflect.apply(mapDecorationsComponent, undefined, [{
      spawn: { type: 'invalid', x: 0, z: 0, rotation: 0 },
    }])).toThrow(TypeError)
    expect(() => writtenBookContentComponent({
      pages: ['not-json'],
      title: '"Title"',
      author: 'Alex',
      generation: 0,
      resolved: false,
    })).toThrow(TypeError)
    expect(() => Reflect.apply(chargedProjectilesComponent, undefined, [[{}]])).toThrow(TypeError)
    expect(() => Reflect.apply(bundleContentsComponent, undefined, [[{}]])).toThrow(TypeError)
    expect(() => Reflect.apply(containerComponent, undefined, [[{}]])).toThrow(TypeError)
    expect(() => Reflect.apply(writableBookContentComponent, undefined, [{ pages: [{ raw: 'Page', extra: true }] }])).toThrow(
      TypeError,
    )
    expect(() => trimComponent({ pattern: 'INVALID!', material: 'minecraft:iron' })).toThrow(TypeError)
    expect(() => suspiciousStewComponent([{ id: 'INVALID!' }])).toThrow(TypeError)
    expect(() => canBreakComponent({ blocks: 'INVALID!' })).toThrow(TypeError)
    expect(() => Reflect.apply(canPlaceOnComponent, undefined, [{ blocks: 'INVALID!' }])).toThrow(
      TypeError,
    )
    expect(() => Reflect.apply(blockStateComponent, undefined, [{ axis: 1 }])).toThrow(TypeError)
    expect(() => instrumentComponent('INVALID!')).toThrow(TypeError)
    expect(() => noteBlockSoundComponent('INVALID!')).toThrow(TypeError)
    expect(() => Reflect.apply(recipesComponent, undefined, [['INVALID!']])).toThrow(TypeError)
    expect(() => Reflect.apply(lockComponent, undefined, [1])).toThrow(TypeError)
    expect(() => tooltipStyleComponent('INVALID!')).toThrow(TypeError)
    expect(() => Reflect.apply(baseColorComponent, undefined, ['teal'])).toThrow(TypeError)
    expect(() => Reflect.apply(equippableComponent, undefined, [{ slot: 'invalid' }])).toThrow(TypeError)
    expect(() => Reflect.apply(equippableComponent, undefined, [null])).toThrow(TypeError)
    expect(() => equippableComponent({ slot: 'head', allowedEntities: ['#minecraft:undead'] })).toThrow(
      TypeError,
    )
    expect(() => Reflect.apply(kineticWeaponComponent, undefined, [{ contactCooldownTicks: -1 }])).toThrow(TypeError)
    expect(() => Reflect.apply(kineticWeaponComponent, undefined, [{ dismountConditions: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(piercingWeaponComponent, undefined, [{ dealsKnockback: 'yes' }])).toThrow(TypeError)
    expect(() => Reflect.apply(deathProtectionComponent, undefined, [{ deathEffects: [{}] }])).toThrow(TypeError)
    expect(() => Reflect.apply(deathProtectionComponent, undefined, [null])).toThrow(TypeError)
    expect(() => repairableComponent('INVALID!')).toThrow(TypeError)
    expect(() => repairableComponent(['#minecraft:repairs/diamond_armor'])).toThrow(TypeError)
    expect(() => enchantableComponent(0)).toThrow(RangeError)
    expect(() => Reflect.apply(enchantableComponent, undefined, [1.5])).toThrow(RangeError)
    expect(() => jukeboxPlayableComponent('INVALID!')).toThrow(TypeError)
    expect(() => ominousBottleAmplifierComponent(-1)).toThrow(RangeError)
    expect(() => ominousBottleAmplifierComponent(5)).toThrow(RangeError)
    expect(() => paintingVariantComponent('INVALID!')).toThrow(TypeError)
    expect(() => sulfurCubeContentComponent('INVALID!')).toThrow(TypeError)
    expect(() =>
      Reflect.apply(lodestoneTrackerComponent, undefined, [{ target: { pos: [0, 64], dimension: 'minecraft:overworld' } }]),
    ).toThrow(TypeError)
    expect(() => Reflect.apply(fireworkExplosionComponent, undefined, [{ shape: 'invalid' }])).toThrow(TypeError)
    expect(() => Reflect.apply(fireworksComponent, undefined, [{ flightDuration: 0x100 }])).toThrow(TypeError)
    expect(() =>
      Reflect.apply(bannerPatternsComponent, undefined, [[{ pattern: 'INVALID!', color: 'blue' }]]),
    ).toThrow(TypeError)
    expect(() => Reflect.apply(potDecorationsComponent, undefined, [['minecraft:brick']])).toThrow(TypeError)
    expect(() => containerLootComponent({ lootTable: 'INVALID!' })).toThrow(TypeError)
    expect(() => Reflect.apply(debugStickStateComponent, undefined, [{ INVALID: 'axis' }])).toThrow(TypeError)
    expect(() => Reflect.apply(tooltipDisplayComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(tooltipDisplayComponent, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(tooltipDisplayComponent, undefined, [{ hideTooltip: 'yes' }])).toThrow(TypeError)
    expect(() => Reflect.apply(tooltipDisplayComponent, undefined, [{ hiddenComponents: 1 }])).toThrow(TypeError)
    expect(() =>
      Reflect.apply(tooltipDisplayComponent, undefined, [{ hiddenComponents: ['INVALID!'] }]),
    ).toThrow(TypeError)
  })
})

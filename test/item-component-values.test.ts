import { Result } from 'effect'
import * as itemComponentValuesResult from '../src/domain/item/item-component-values'
import { expectItemFailure, itemResultValue, unwrapItemResultFn } from './item-result-assertions'
import { consumableClearAllEffects } from '../src/domain/item/consumable'
import { ResourceLocation as ResourceLocationBrand, TagLocation, UUID } from '../src/domain/text/identifiers'
import { itemStack as itemStackResult } from '../src/domain/item/item-stack'
import * as ItemPrimitive from '../src/domain/item/item-primitives'
import { StackCount, MapId } from '../src/domain/time/quantities'
import { BlockAxis } from '../src/domain/coordinates/coordinate-primitives'
import { isVanillaPotionEffectId } from '../src/domain/item/item-component-values-validation'
import { describe, expect, it } from 'vitest'
import { ok } from 'node:assert/strict'

const {
  DYE_COLORS,
  EQUIPPABLE_SLOTS,
  FIREWORK_EXPLOSION_SHAPES,
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
  MAP_DECORATION_TYPES,
} = itemComponentValuesResult
const additionalTradeCostComponent = unwrapItemResultFn(itemComponentValuesResult.additionalTradeCostComponent)
const bannerPatternsComponent = unwrapItemResultFn(itemComponentValuesResult.bannerPatternsComponent)
const baseColorComponent = unwrapItemResultFn(itemComponentValuesResult.baseColorComponent)
const blockEntityDataComponent = unwrapItemResultFn(itemComponentValuesResult.blockEntityDataComponent)
const blockStateComponent = unwrapItemResultFn(itemComponentValuesResult.blockStateComponent)
const beesComponent = unwrapItemResultFn(itemComponentValuesResult.beesComponent)
const breakSoundComponent = unwrapItemResultFn(itemComponentValuesResult.breakSoundComponent)
const bundleContentsComponent = unwrapItemResultFn(itemComponentValuesResult.bundleContentsComponent)
const bucketEntityDataComponent = unwrapItemResultFn(itemComponentValuesResult.bucketEntityDataComponent)
const canBreakComponent = unwrapItemResultFn(itemComponentValuesResult.canBreakComponent)
const canPlaceOnComponent = unwrapItemResultFn(itemComponentValuesResult.canPlaceOnComponent)
const chargedProjectilesComponent = unwrapItemResultFn(itemComponentValuesResult.chargedProjectilesComponent)
const containerComponent = unwrapItemResultFn(itemComponentValuesResult.containerComponent)
const containerLootComponent = unwrapItemResultFn(itemComponentValuesResult.containerLootComponent)
const customDataComponent = unwrapItemResultFn(itemComponentValuesResult.customDataComponent)
const customModelDataComponent = unwrapItemResultFn(itemComponentValuesResult.customModelDataComponent)
const debugStickStateComponent = unwrapItemResultFn(itemComponentValuesResult.debugStickStateComponent)
const deathProtectionComponent = unwrapItemResultFn(itemComponentValuesResult.deathProtectionComponent)
const dyeComponent = unwrapItemResultFn(itemComponentValuesResult.dyeComponent)
const dyedColorComponent = unwrapItemResultFn(itemComponentValuesResult.dyedColorComponent)
const entityDataComponent = unwrapItemResultFn(itemComponentValuesResult.entityDataComponent)
const enchantableComponent = unwrapItemResultFn(itemComponentValuesResult.enchantableComponent)
const equippableComponent = unwrapItemResultFn(itemComponentValuesResult.equippableComponent)
const fireworkExplosionComponent = unwrapItemResultFn(itemComponentValuesResult.fireworkExplosionComponent)
const fireworksComponent = unwrapItemResultFn(itemComponentValuesResult.fireworksComponent)
const gliderComponent = unwrapItemResultFn(itemComponentValuesResult.gliderComponent)
const hideAdditionalTooltipComponent = unwrapItemResultFn(itemComponentValuesResult.hideAdditionalTooltipComponent)
const instrumentComponent = unwrapItemResultFn(itemComponentValuesResult.instrumentComponent)
const jukeboxPlayableComponent = unwrapItemResultFn(itemComponentValuesResult.jukeboxPlayableComponent)
const kineticWeaponComponent = unwrapItemResultFn(itemComponentValuesResult.kineticWeaponComponent)
const lockComponent = unwrapItemResultFn(itemComponentValuesResult.lockComponent)
const lodestoneTrackerComponent = unwrapItemResultFn(itemComponentValuesResult.lodestoneTrackerComponent)
const mapColorComponent = unwrapItemResultFn(itemComponentValuesResult.mapColorComponent)
const mapDecorationsComponent = unwrapItemResultFn(itemComponentValuesResult.mapDecorationsComponent)
const mapIdComponent = unwrapItemResultFn(itemComponentValuesResult.mapIdComponent)
const noteBlockSoundComponent = unwrapItemResultFn(itemComponentValuesResult.noteBlockSoundComponent)
const ominousBottleAmplifierComponent = unwrapItemResultFn(itemComponentValuesResult.ominousBottleAmplifierComponent)
const paintingVariantComponent = unwrapItemResultFn(itemComponentValuesResult.paintingVariantComponent)
const piercingWeaponComponent = unwrapItemResultFn(itemComponentValuesResult.piercingWeaponComponent)
const potDecorationsComponent = unwrapItemResultFn(itemComponentValuesResult.potDecorationsComponent)
const potionContentsComponent = unwrapItemResultFn(itemComponentValuesResult.potionContentsComponent)
const potionDurationScaleComponent = unwrapItemResultFn(itemComponentValuesResult.potionDurationScaleComponent)
const profileComponent = unwrapItemResultFn(itemComponentValuesResult.profileComponent)
const providesBannerPatternsComponent = unwrapItemResultFn(itemComponentValuesResult.providesBannerPatternsComponent)
const providesTrimMaterialComponent = unwrapItemResultFn(itemComponentValuesResult.providesTrimMaterialComponent)
const repairableComponent = unwrapItemResultFn(itemComponentValuesResult.repairableComponent)
const recipesComponent = unwrapItemResultFn(itemComponentValuesResult.recipesComponent)
const sulfurCubeContentComponent = unwrapItemResultFn(itemComponentValuesResult.sulfurCubeContentComponent)
const suspiciousStewComponent = unwrapItemResultFn(itemComponentValuesResult.suspiciousStewComponent)
const trimComponent = unwrapItemResultFn(itemComponentValuesResult.trimComponent)
const tooltipDisplayComponent = unwrapItemResultFn(itemComponentValuesResult.tooltipDisplayComponent)
const tooltipStyleComponent = unwrapItemResultFn(itemComponentValuesResult.tooltipStyleComponent)
const writableBookContentComponent = unwrapItemResultFn(itemComponentValuesResult.writableBookContentComponent)
const writtenBookContentComponent = unwrapItemResultFn(itemComponentValuesResult.writtenBookContentComponent)
const ResourceLocation = (value: Parameters<typeof ResourceLocationBrand>[0]) => itemResultValue(ResourceLocationBrand.result(value))
const itemStack = (...args: Parameters<typeof itemStackResult>) => itemResultValue(itemStackResult(...args))

describe('item component values', () => {
  it('copies nested NBT objects and rejects non-plain prototypes', () => {
    const input = { nested: { values: [1, 2].map(ItemPrimitive.ItemComponentNbtNumber) } }
    const customData = customDataComponent(input)

    expect(customData).toEqual(input)
    expect(customData).not.toBe(input)
    const nested = customData['nested']
    const nestedValues = typeof nested === 'object' && nested !== null ? Reflect.get(nested, 'values') : undefined
    expect(nested).not.toBe(input.nested)
    expect(nestedValues).not.toBe(input.nested.values)
    expect(Object.isFrozen(nestedValues)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.nested)).toBe(false)

    const nullPrototype: Record<string, unknown> = Object.create(null)
    nullPrototype['value'] = 1
    const nullPrototypeSnapshot = itemResultValue(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [nullPrototype]))
    expect(nullPrototypeSnapshot).toEqual({ value: 1 })
    expect(nullPrototypeSnapshot).not.toBe(nullPrototype)

    const withDate = { created: new Date(0) }
    expectItemFailure(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [withDate]), {
      _tag: 'ItemValidationFailure',
      field: 'custom_data',
      reason: 'invalid-value',
      value: withDate,
    })
  })

  it('returns tagged failures for cyclic and hostile NBT input snapshots', () => {
    const rejectHostile = (value: unknown, field: string) =>
      expectItemFailure(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [value]), {
        _tag: 'ItemValidationFailure',
        field,
        reason: 'hostile-input',
        message: `Unable to inspect ${field}`,
      })

    const revoked = Proxy.revocable({}, {})
    revoked.revoke()
    rejectHostile(revoked.proxy, 'custom_data')

    const hostileLength = new Proxy([], {
      get: (target, key, receiver) => key === 'length'
        ? (() => { throw new Error('hostile') })()
        : Reflect.get(target, key, receiver),
    })
    rejectHostile(hostileLength, 'custom_data')

    const hostileIndex = new Proxy([1], {
      get: (target, key, receiver) => key === '0'
        ? (() => { throw new Error('hostile') })()
        : Reflect.get(target, key, receiver),
    })
    rejectHostile(hostileIndex, 'custom_data[0]')

    const hostilePrototype = new Proxy({}, { getPrototypeOf: () => { throw new Error('hostile') } })
    rejectHostile(hostilePrototype, 'custom_data')

    let prototypeReads = 0
    const changingPrototype = new Proxy({}, {
      getPrototypeOf: () => {
        prototypeReads += 1
        return prototypeReads === 1 ? { custom: true } : Object.prototype
      },
    })
    expectItemFailure(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [changingPrototype]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      field: 'custom_data',
      reason: 'invalid-value',
      message: 'custom_data must be a non-empty object containing NBT-compatible values',
    })
    expect(prototypeReads).toBe(1)

    const hostileKeys = new Proxy({}, { ownKeys: () => { throw new Error('hostile') } })
    rejectHostile(hostileKeys, 'custom_data')

    const hostileEntry = new Proxy({ leaf: 1 }, {
      get: (target, key, receiver) => key === 'leaf'
        ? (() => { throw new Error('hostile') })()
        : Reflect.get(target, key, receiver),
    })
    rejectHostile(hostileEntry, 'custom_data.leaf')

    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic
    expectItemFailure(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [cyclic]), {
      _tag: 'ItemValidationFailure',
      field: 'custom_data.self',
      reason: 'invalid-value',
      message: 'Cyclic custom_data.self input is invalid',
    })

    const cyclicArray: unknown[] = []
    cyclicArray.push(cyclicArray)
    expectItemFailure(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [cyclicArray]), {
      _tag: 'ItemValidationFailure',
      field: 'custom_data[0]',
      reason: 'invalid-value',
      message: 'Cyclic custom_data[0] input is invalid',
    })

    let deeplyNested: unknown = 'leaf'
    for (let depth = 0; depth < 200; depth += 1) deeplyNested = { nested: deeplyNested }
    const deepFailure = expectItemFailure(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [deeplyNested]), {
      _tag: 'ItemValidationFailure',
      reason: 'hostile-input',
    })
    expect(Reflect.get(deepFailure, 'field')).toMatch(/^custom_data(?:\.nested)+$/)
  })

  it('distinguishes vanilla potion effect ids from data pack ids', () => {
    expect(isVanillaPotionEffectId(ResourceLocation('minecraft:speed'))).toBe(true)
    expect(isVanillaPotionEffectId(ResourceLocation('example:custom_effect'))).toBe(false)
    expect(isVanillaPotionEffectId('not a resource location')).toBe(false)
  })

  it('returns a tagged failure when tooltip options cannot be snapshotted', () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error('hostile') } })
    expectItemFailure(Reflect.apply(itemComponentValuesResult.tooltipDisplayComponent, undefined, [hostile]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      field: 'tooltipDisplay',
      reason: 'hostile-input',
      message: 'Unable to inspect tooltipDisplay',
    })
  })

  it('returns a tagged failure when a validator encounters a revoked function proxy', () => {
    const revoked = Proxy.revocable(() => undefined, {})
    revoked.revoke()

    const failure = expectItemFailure(Reflect.apply(itemComponentValuesResult.repairableComponent, undefined, [revoked.proxy]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      field: 'repairable',
      reason: 'hostile-input',
      message: 'Unable to inspect repairable',
    })
    expect(Reflect.get(failure, 'value')).toBe(revoked.proxy)
  })

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
    expect(breakSoundComponent(ResourceLocation('minecraft:item.break'))).toBe('minecraft:item.break')
    expect(providesTrimMaterialComponent(ResourceLocation('minecraft:gold'))).toBe('minecraft:gold')
    expect(dyeComponent('black')).toBe('black')

    const customData = customDataComponent({
      text: ItemPrimitive.ItemComponentNbtString('value'),
      count: ItemPrimitive.ItemComponentNbtLong(2n),
      flags: [true, false],
      nested: { value: ItemPrimitive.ItemComponentNbtNumber(1) },
    })
    const entityData = entityDataComponent({
      id: ResourceLocation('minecraft:zombie'),
      Health: ItemPrimitive.ItemComponentNbtNumber(20),
      Pos: [1, 64, 2].map(ItemPrimitive.ItemComponentNbtNumber),
    })
    const bucketEntityData = bucketEntityDataComponent({ BucketVariant: ItemPrimitive.ItemComponentNbtNumber(1) })
    const blockEntityData = blockEntityDataComponent({
      id: ResourceLocation('minecraft:chest'),
      CustomName: ItemPrimitive.ItemComponentNbtString('Chest'),
    })
    const bees = beesComponent([
      {
        entityData: {
          [ItemPrimitive.ItemComponentNbtKey('id')]: ItemPrimitive.ItemComponentNbtString('minecraft:bee'),
          [ItemPrimitive.ItemComponentNbtKey('Health')]: ItemPrimitive.ItemComponentNbtString('20'),
        },
        ticksInHive: ItemPrimitive.BeeHiveTicks(120),
        minTicksInHive: ItemPrimitive.BeeHiveTicks(60),
      },
    ])
    const defaultBees = beesComponent()
    const potionContents = potionContentsComponent({
      potion: ResourceLocation('minecraft:strong'),
      customColor: ItemPrimitive.RgbColor(0x336699),
      customEffects: [
        {
          id: ResourceLocation('minecraft:speed'),
          duration: ItemPrimitive.PotionEffectDurationTicks(200),
          amplifier: ItemPrimitive.EffectAmplifier(1),
          ambient: true,
          showParticles: false,
          showIcon: false,
          hiddenEffect: { id: ResourceLocation('minecraft:haste') },
        },
      ],
    })
    const defaultPotionContents = potionContentsComponent()
    const namedPotionContents = potionContentsComponent(ResourceLocation('minecraft:water'))
    const profile = profileComponent({
      name: ItemPrimitive.ProfileName('Notch'),
      id: UUID('123e4567-e89b-12d3-a456-426614174000'),
      properties: [{
        name: ItemPrimitive.ProfilePropertyName('textures'),
        value: ItemPrimitive.ProfilePropertyValue('encoded'),
        signature: ItemPrimitive.ProfilePropertySignature('signed'),
      }],
    })
    const simpleProfile = profileComponent(ItemPrimitive.ProfileName('Notch'))
    const packedDyedColor = dyedColorComponent(ItemPrimitive.RgbColor(0xff7f00))
    const normalizedDyedColor = dyedColorComponent([
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
    const defaultCustomModelData = customModelDataComponent()
    const mapId = mapIdComponent(MapId(42))
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
      model: ResourceLocation('minecraft:diamond'),
      cameraOverlay: ResourceLocation('minecraft:overlay'),
      allowedEntities: [ResourceLocation('minecraft:zombie')],
      canBeSheared: true,
      shearingSound: ResourceLocation('minecraft:item.shears.snip'),
      dispensable: false,
      swappable: false,
      damageOnHurt: false,
      equipOnInteract: true,
    })
    const defaultEquippable = equippableComponent({ slot: 'saddle' })
    const kineticWeapon = kineticWeaponComponent({
      contactCooldownTicks: ItemPrimitive.KineticDurationTicks(4),
      delayTicks: ItemPrimitive.KineticDurationTicks(2),
      dismountConditions: {
        maxDurationTicks: ItemPrimitive.KineticDurationTicks(3),
        minSpeed: ItemPrimitive.KineticSpeed(1.5),
        minRelativeSpeed: ItemPrimitive.KineticSpeed(0.25),
      },
      knockbackConditions: { maxDurationTicks: ItemPrimitive.KineticDurationTicks(4) },
      damageConditions: {
        maxDurationTicks: ItemPrimitive.KineticDurationTicks(5),
        minSpeed: ItemPrimitive.KineticSpeed(0.5),
      },
      forwardMovement: ItemPrimitive.KineticMovement(0.75),
      damageMultiplier: ItemPrimitive.KineticDamageMultiplier(2),
      sound: ResourceLocation('minecraft:item.trident.throw'),
      hitSound: ResourceLocation('minecraft:entity.player.attack.knockback'),
    })
    const defaultKineticWeapon = kineticWeaponComponent()
    const piercingWeapon = piercingWeaponComponent({
      dealsKnockback: false,
      dismounts: true,
      sound: ResourceLocation('minecraft:item.trident.hit'),
      hitSound: ResourceLocation('minecraft:entity.player.attack.crit'),
    })
    const defaultPiercingWeapon = piercingWeaponComponent()
    const glider = gliderComponent()
    const deathProtection = deathProtectionComponent({
      deathEffects: [consumableClearAllEffects()],
    })
    const defaultDeathProtection = deathProtectionComponent()
    const repairable = repairableComponent(TagLocation('#minecraft:repairs/diamond_armor'))
    const enchantable = enchantableComponent(ItemPrimitive.Enchantability(10))
    const jukeboxPlayable = jukeboxPlayableComponent(ResourceLocation('minecraft:test_song'))
    const ominousBottleAmplifier = ominousBottleAmplifierComponent(ItemPrimitive.OminousBottleAmplifier(4))
    const paintingVariant = paintingVariantComponent(ResourceLocation('minecraft:kebab'))
    const sulfurCubeContent = sulfurCubeContentComponent(ResourceLocation('minecraft:green_wool'))
    const lodestoneTracker = lodestoneTrackerComponent({
      target: {
        pos: [BlockAxis(10), BlockAxis(64), BlockAxis(-10)],
        dimension: ResourceLocation('minecraft:overworld'),
      },
    })
    const defaultLodestoneTracker = lodestoneTrackerComponent()
    const fireworkExplosion = fireworkExplosionComponent({
      shape: 'large_ball',
      colors: [ItemPrimitive.RgbColor(0xff0000)],
      fadeColors: [ItemPrimitive.RgbColor(0x00ff00)],
      hasTrail: true,
      hasTwinkle: true,
    })
    const defaultFireworks = fireworksComponent()
    const fireworks = fireworksComponent({
      explosions: [{ shape: 'small_ball' }],
      flightDuration: ItemPrimitive.FireworksFlightDuration(2),
    })
    const bannerPatterns = bannerPatternsComponent([
      { pattern: ResourceLocation('minecraft:stripe'), color: 'blue' },
    ])
    const defaultBannerPatterns = bannerPatternsComponent()
    const potDecorations = potDecorationsComponent()
    const customPotDecorations = potDecorationsComponent([
      ResourceLocation('minecraft:brick'),
      ResourceLocation('minecraft:heart_pottery_sherd'),
      ResourceLocation('minecraft:arms_up_pottery_sherd'),
      ResourceLocation('minecraft:skull_pottery_sherd'),
    ])
    const containerLoot = containerLootComponent({
      lootTable: ResourceLocation('minecraft:chests/simple_dungeon'),
      seed: ItemPrimitive.LootTableSeed(42n),
    })
    const containerLootWithoutSeed = containerLootComponent({
      lootTable: ResourceLocation('minecraft:chests/simple_dungeon'),
    })
    const debugStickState = debugStickStateComponent({ 'minecraft:oak_log': ItemPrimitive.BlockStatePropertyValue('axis') })
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
    ok(firstBee !== undefined)
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

    const tag = providesBannerPatternsComponent(TagLocation('#minecraft:pattern_item'))
    const location = providesBannerPatternsComponent(ResourceLocation('minecraft:pattern_item'))
    const locations = providesBannerPatternsComponent([
      ResourceLocation('minecraft:pattern_item'),
      ResourceLocation('minecraft:other'),
    ])
    const tooltip = tooltipDisplayComponent({
      hideTooltip: true,
      hiddenComponents: [ResourceLocation('minecraft:food')],
    })

    if (typeof tag === 'string') {
      expect(TagLocation.is(tag)).toBe(true)
    }
    if (typeof location === 'string') {
      expect(ResourceLocationBrand.is(location)).toBe(true)
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
      spawn: {
        type: 'player',
        x: ItemPrimitive.MapDecorationCoordinate(1),
        z: ItemPrimitive.MapDecorationCoordinate(-2),
        rotation: ItemPrimitive.MapDecorationRotation(3),
      },
    })
    expect(mapDecorations).toEqual({
      spawn: { type: 'player', x: 1, z: -2, rotation: 3 },
    })
    expect(Object.isFrozen(mapDecorations)).toBe(true)
    expect(Object.isFrozen(mapDecorations['spawn'])).toBe(true)

    const arrowStack = itemStack('arrow', StackCount(1))
    expect(chargedProjectilesComponent([arrowStack])).toEqual([arrowStack])
    expect(bundleContentsComponent([arrowStack])).toEqual([arrowStack])
    expect(containerComponent([{ slot: ItemPrimitive.ContainerSlotIndex(2), item: arrowStack }])).toEqual([
      { slot: 2, item: arrowStack },
    ])
    expectItemFailure(Reflect.apply(itemComponentValuesResult.chargedProjectilesComponent, undefined, [[null]]), {
      _tag: 'ItemValidationFailure',
      field: 'charged_projectiles',
      reason: 'invalid-value',
      value: [null],
    })

    const writableBookContent = writableBookContentComponent({
      pages: [
        ItemPrimitive.BookPageText('Page one'),
        {
          raw: ItemPrimitive.BookPageText('Page two'),
          filtered: ItemPrimitive.BookPageText('Filtered page two'),
        },
        { raw: ItemPrimitive.BookPageText('Page without a filter') },
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
      pages: [
        ItemPrimitive.BookPageText('"Hello world!"'),
        {
          raw: ItemPrimitive.BookPageText('"A second page"'),
          filtered: ItemPrimitive.BookPageText('"Filtered page"'),
        },
        { raw: ItemPrimitive.BookPageText('"A third page without a filter"') },
      ],
      title: {
        raw: ItemPrimitive.BookPageText('"A delightful read"'),
        filtered: ItemPrimitive.BookPageText('"Filtered title"'),
      },
      author: ItemPrimitive.BookAuthor('Alex'),
      generation: ItemPrimitive.BookGeneration(0),
      resolved: false,
    })
    expect(writtenBookContent).toEqual({
      pages: [
        '"Hello world!"',
        { raw: '"A second page"', filtered: '"Filtered page"' },
        { raw: '"A third page without a filter"' },
      ],
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
        assetId: ResourceLocation('minecraft:sentry'),
        description: { text: 'Sentry' },
        decal: false,
      },
      material: {
        assetName: ItemPrimitive.TrimAssetName('iron'),
        ingredient: 'iron_ingot',
        itemModelIndex: ItemPrimitive.TrimItemModelIndex(0.5),
        overrideArmorMaterials: {
          [ItemPrimitive.TrimArmorMaterialKey('diamond')]: ResourceLocation('minecraft:diamond'),
        },
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

    expect(trimComponent({
      pattern: ResourceLocation('minecraft:sentry'),
      material: ResourceLocation('minecraft:iron'),
    })).toEqual({
      pattern: 'minecraft:sentry',
      material: 'minecraft:iron',
    })

    const suspiciousStew = suspiciousStewComponent([
      { id: ResourceLocation('minecraft:night_vision') },
      { id: ResourceLocation('minecraft:poison'), duration: ItemPrimitive.PotionEffectDurationTicks(40) },
    ])
    expect(suspiciousStew).toEqual([
      { id: 'minecraft:night_vision', duration: 160 },
      { id: 'minecraft:poison', duration: 40 },
    ])
    expect(Object.isFrozen(suspiciousStew)).toBe(true)
    expect(Object.isFrozen(suspiciousStew[0])).toBe(true)

    expect(hideAdditionalTooltipComponent()).toEqual({})

    const canBreak = canBreakComponent({
      blocks: ResourceLocation('minecraft:dirt'),
      state: { axis: ItemPrimitive.BlockStatePropertyValue('y') },
      nbt: { foo: ItemPrimitive.ItemComponentNbtString('bar') },
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
      { blocks: [TagLocation('#minecraft:grass'), ResourceLocation('minecraft:dirt')] },
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
    expect(isEntityDataComponent(entityDataComponent({ id: ResourceLocation('minecraft:zombie') }))).toBe(true)
    expect(isEntityDataComponent({ id: 'INVALID!' })).toBe(false)
    expect(isBucketEntityDataOptions({})).toBe(true)
    expect(isBucketEntityDataOptions({ value: Symbol() })).toBe(false)
    expect(isBucketEntityDataComponent(bucketEntityDataComponent({ BucketVariant: ItemPrimitive.ItemComponentNbtNumber(1) }))).toBe(true)
    expect(isBucketEntityDataComponent([])).toBe(false)
    expect(isBlockEntityDataOptions({ id: 'minecraft:chest' })).toBe(true)
    expect(isBlockEntityDataOptions({})).toBe(false)
    expect(isBlockEntityDataComponent(blockEntityDataComponent({ id: ResourceLocation('minecraft:chest') }))).toBe(true)
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
    const arrowStack = itemStack('arrow', StackCount(1))
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
    expect(isContainerComponent(containerComponent([{ slot: ItemPrimitive.ContainerSlotIndex(0), item: arrowStack }]))).toBe(true)
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
          name: ItemPrimitive.ProfileName('Notch'),
          id: UUID('123e4567-e89b-12d3-a456-426614174000'),
          properties: [{
            name: ItemPrimitive.ProfilePropertyName('textures'),
            value: ItemPrimitive.ProfilePropertyValue('encoded'),
          }],
        }),
      ),
    ).toBe(true)
    expect(isProfileComponent({ id: 'bad' })).toBe(false)
    expect(profileComponent({})).toEqual({})
    expect(profileComponent({ name: ItemPrimitive.ProfileName('Notch') })).toEqual({ name: 'Notch' })
    expect(profileComponent({ id: UUID('123e4567-e89b-12d3-a456-426614174000') })).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(profileComponent({ properties: [{
      name: ItemPrimitive.ProfilePropertyName('textures'),
      value: ItemPrimitive.ProfilePropertyValue('encoded'),
    }] })).toEqual({
      properties: [{ name: 'textures', value: 'encoded' }],
    })
    expect(isProfileComponent(profileComponent(ItemPrimitive.ProfileName('Notch')))).toBe(true)

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
      floats: [ItemPrimitive.CustomModelDataFloat(0.5)],
      flags: [true],
      strings: [ItemPrimitive.CustomModelDataString('test_model')],
      colors: [ItemPrimitive.RgbColor(0xff00ff)],
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
      spawn: {
        type: 'player',
        x: ItemPrimitive.MapDecorationCoordinate(1),
        z: ItemPrimitive.MapDecorationCoordinate(2),
        rotation: ItemPrimitive.MapDecorationRotation(0),
      },
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
      pages: [ItemPrimitive.BookPageText('"Page"')],
      title: ItemPrimitive.BookPageText('"Title"'),
      author: ItemPrimitive.BookAuthor('Alex'),
      generation: ItemPrimitive.BookGeneration(0),
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
      pattern: {
        assetId: ResourceLocation('minecraft:sentry'),
        description: { text: 'Sentry' },
        decal: false,
      },
      material: {
        assetName: ItemPrimitive.TrimAssetName('iron'),
        ingredient: 'iron_ingot',
        itemModelIndex: ItemPrimitive.TrimItemModelIndex(0.5),
        description: { text: 'Iron' },
      },
    })
    expect(isTrimComponent(inlineTrim)).toBe(true)
    const invalidTrim = {
      pattern: {
        assetId: 'minecraft:sentry',
        description: { text: 'Sentry' },
        decal: false,
      },
      material: {
        assetName: 'iron',
        ingredient: 'iron_ingot',
        itemModelIndex: 0.5,
        overrideArmorMaterials: { diamond: undefined },
        description: { text: 'Iron' },
      },
    }
    expectItemFailure(Reflect.apply(itemComponentValuesResult.trimComponent, undefined, [invalidTrim]), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'invalid-value',
      field: 'trim',
      message: 'Invalid trim component options',
      value: invalidTrim,
    })
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
      isCanBreakComponent(canBreakComponent({ blocks: ResourceLocation('minecraft:dirt') })),
    ).toBe(true)
    expect(
      isCanPlaceOnComponent(canPlaceOnComponent({ blocks: ResourceLocation('minecraft:dirt') })),
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
          dismountConditions: {
            maxDurationTicks: ItemPrimitive.KineticDurationTicks(1),
            minSpeed: ItemPrimitive.KineticSpeed(0),
            minRelativeSpeed: ItemPrimitive.KineticSpeed(0),
          },
          knockbackConditions: {
            maxDurationTicks: ItemPrimitive.KineticDurationTicks(2),
            minSpeed: ItemPrimitive.KineticSpeed(0),
            minRelativeSpeed: ItemPrimitive.KineticSpeed(0),
          },
          damageConditions: {
            maxDurationTicks: ItemPrimitive.KineticDurationTicks(3),
            minSpeed: ItemPrimitive.KineticSpeed(0),
            minRelativeSpeed: ItemPrimitive.KineticSpeed(0),
          },
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

    expect(isRepairableComponent(repairableComponent(ResourceLocation('minecraft:diamond')))).toBe(true)
    expect(isRepairableComponent({ items: 'INVALID!' })).toBe(false)

    expect(isEnchantableValue(1)).toBe(true)
    expect(isEnchantableValue(0)).toBe(false)
    expect(isEnchantableValue(1.5)).toBe(false)
    expect(isEnchantableValue(Infinity)).toBe(false)
    expect(isEnchantableComponent(enchantableComponent(ItemPrimitive.Enchantability(1)))).toBe(true)
    expect(isEnchantableComponent({ value: 0 })).toBe(false)

    expect(isJukeboxPlayableComponent(jukeboxPlayableComponent(ResourceLocation('minecraft:test_song')))).toBe(true)
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
    expect(isSulfurCubeContentComponent(sulfurCubeContentComponent(ResourceLocation('minecraft:green_wool')))).toBe(true)
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
        target: {
          pos: [BlockAxis(0), BlockAxis(64), BlockAxis(0)],
          dimension: ResourceLocation('minecraft:overworld'),
        },
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

  it('validates debug-stick state record prototypes and values', () => {
    const nullPrototype: Record<string, string> = Object.create(null)
    nullPrototype['minecraft:oak_log'] = 'axis'
    const snapshot = debugStickStateComponent(nullPrototype)
    expect(snapshot).toStrictEqual({ 'minecraft:oak_log': 'axis' })
    expect(Object.isFrozen(snapshot)).toBe(true)

    const expectInvalid = (value: unknown) => expectItemFailure(
      Reflect.apply(itemComponentValuesResult.debugStickStateComponent, undefined, [value]),
      {
        _tag: 'ItemValidationFailure',
        kind: 'TypeError',
        reason: 'invalid-value',
        field: 'debug_stick_state',
        message: 'Invalid debug_stick_state component value',
        value,
      },
    )

    expectInvalid(1)
    expectInvalid(null)
    expectInvalid([])
    expectInvalid(new Date(0))
    expectInvalid({ 'minecraft:oak_log': 1 })
  })

  it('rejects malformed constructor input at the runtime boundary', () => {
    const reject = (
      result: Parameters<typeof expectItemFailure>[0],
      field: string,
      kind: string,
      value: unknown,
      reason = kind === 'RangeError' ? 'out-of-range' : 'invalid-value',
    ) => expectItemFailure(result, { _tag: 'ItemValidationFailure', field, kind, reason, value })

    reject(itemComponentValuesResult.potionDurationScaleComponent(-1), 'potion_duration_scale', 'RangeError', -1)
    reject(Reflect.apply(itemComponentValuesResult.potionDurationScaleComponent, undefined, ['1']), 'potion_duration_scale', 'RangeError', '1')
    reject(itemComponentValuesResult.additionalTradeCostComponent(1.5), 'additional_trade_cost', 'RangeError', 1.5)
    reject(Reflect.apply(itemComponentValuesResult.additionalTradeCostComponent, undefined, ['1']), 'additional_trade_cost', 'RangeError', '1')
    reject(itemComponentValuesResult.breakSoundComponent('INVALID!'), 'break_sound', 'TypeError', 'INVALID!')
    reject(itemComponentValuesResult.providesTrimMaterialComponent('INVALID!'), 'provides_trim_material', 'TypeError', 'INVALID!')
    reject(itemComponentValuesResult.providesBannerPatternsComponent('INVALID!'), 'provides_banner_patterns', 'TypeError', 'INVALID!')
    expect(Result.isSuccess(itemComponentValuesResult.providesBannerPatternsComponent([]))).toBe(true)
    reject(itemComponentValuesResult.providesBannerPatternsComponent(['#minecraft:pattern_item']), 'provides_banner_patterns', 'TypeError', ['#minecraft:pattern_item'], 'invalid-type')
    reject(itemComponentValuesResult.providesBannerPatternsComponent(['minecraft:pattern_item', 'INVALID!']), 'provides_banner_patterns', 'TypeError', 'INVALID!')
    reject(Reflect.apply(itemComponentValuesResult.providesBannerPatternsComponent, undefined, [1]), 'provides_banner_patterns', 'TypeError', 1, 'invalid-type')
    reject(itemComponentValuesResult.dyeComponent('teal'), 'dye', 'RangeError', 'teal')
    reject(itemComponentValuesResult.customDataComponent({}), 'custom_data', 'TypeError', {})
    reject(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [null]), 'custom_data', 'TypeError', null)
    const invalidCustomData = { value: new Date() }
    reject(Reflect.apply(itemComponentValuesResult.customDataComponent, undefined, [invalidCustomData]), 'custom_data', 'TypeError', invalidCustomData)
    reject(Reflect.apply(itemComponentValuesResult.entityDataComponent, undefined, [{ Health: 20 }]), 'entity_data', 'TypeError', { Health: 20 })
    reject(Reflect.apply(itemComponentValuesResult.bucketEntityDataComponent, undefined, [{ value: Symbol() }]), 'bucket_entity_data', 'TypeError', { value: expect.anything() })
    reject(Reflect.apply(itemComponentValuesResult.profileComponent, undefined, ['invalid name']), 'profile', 'TypeError', 'invalid name')
    reject(Reflect.apply(itemComponentValuesResult.profileComponent, undefined, [{ id: 'bad' }]), 'profile', 'TypeError', { id: 'bad' })
    reject(Reflect.apply(itemComponentValuesResult.blockEntityDataComponent, undefined, [{ id: 'INVALID!' }]), 'block_entity_data', 'TypeError', { id: 'INVALID!' })
    const invalidBees = [{ entityData: { id: 'minecraft:bee' }, ticksInHive: -1, minTicksInHive: 0 }]
    reject(Reflect.apply(itemComponentValuesResult.beesComponent, undefined, [invalidBees]), 'bees', 'TypeError', invalidBees)
    const invalidPotionContents = { customEffects: [{ id: 'INVALID!' }] }
    reject(Reflect.apply(itemComponentValuesResult.potionContentsComponent, undefined, [invalidPotionContents]), 'potion_contents', 'TypeError', invalidPotionContents)
    reject(Reflect.apply(itemComponentValuesResult.dyedColorComponent, undefined, [0x1000000]), 'dyed_color', 'RangeError', 0x1000000)
    reject(Reflect.apply(itemComponentValuesResult.dyedColorComponent, undefined, [[0, 0.5]]), 'dyed_color', 'RangeError', [0, 0.5])
    reject(Reflect.apply(itemComponentValuesResult.customModelDataComponent, undefined, [{ floats: [Infinity] }]), 'custom_model_data', 'TypeError', { floats: [Infinity] })
    reject(Reflect.apply(itemComponentValuesResult.customModelDataComponent, undefined, [{ unknown: [] }]), 'custom_model_data', 'TypeError', { unknown: [] })
    reject(itemComponentValuesResult.mapIdComponent(-1), 'map_id', 'RangeError', -1)
    reject(itemComponentValuesResult.mapColorComponent(0x1000000), 'map_color', 'RangeError', 0x1000000)
    const invalidDecorations = { spawn: { type: 'invalid', x: 0, z: 0, rotation: 0 } }
    reject(Reflect.apply(itemComponentValuesResult.mapDecorationsComponent, undefined, [invalidDecorations]), 'map_decorations', 'TypeError', invalidDecorations)
    const invalidBook = {
      pages: ['not-json'],
      title: '"Title"',
      author: 'Alex',
      generation: 0,
      resolved: false,
    }
    reject(Reflect.apply(itemComponentValuesResult.writtenBookContentComponent, undefined, [invalidBook]), 'written_book_content', 'TypeError', invalidBook)
    reject(Reflect.apply(itemComponentValuesResult.chargedProjectilesComponent, undefined, [[{}]]), 'charged_projectiles', 'TypeError', [{}])
    reject(Reflect.apply(itemComponentValuesResult.bundleContentsComponent, undefined, [[{}]]), 'bundle_contents', 'TypeError', [{}])
    reject(Reflect.apply(itemComponentValuesResult.containerComponent, undefined, [[{}]]), 'container', 'TypeError', [{}])
    const invalidWritableBook = { pages: [{ raw: 'Page', extra: true }] }
    reject(Reflect.apply(itemComponentValuesResult.writableBookContentComponent, undefined, [invalidWritableBook]), 'writable_book_content', 'TypeError', invalidWritableBook)
    const invalidTrim = { pattern: 'INVALID!', material: 'minecraft:iron' }
    reject(Reflect.apply(itemComponentValuesResult.trimComponent, undefined, [invalidTrim]), 'trim', 'TypeError', invalidTrim)
    const invalidStew = [{ id: 'INVALID!' }]
    reject(Reflect.apply(itemComponentValuesResult.suspiciousStewComponent, undefined, [invalidStew]), 'suspicious_stew', 'TypeError', invalidStew)
    reject(Reflect.apply(itemComponentValuesResult.canBreakComponent, undefined, [{ blocks: 'INVALID!' }]), 'can_break', 'TypeError', { blocks: 'INVALID!' })
    reject(Reflect.apply(itemComponentValuesResult.canPlaceOnComponent, undefined, [{ blocks: 'INVALID!' }]), 'can_place_on', 'TypeError', { blocks: 'INVALID!' })
    reject(Reflect.apply(itemComponentValuesResult.blockStateComponent, undefined, [{ axis: 1 }]), 'block_state', 'TypeError', { axis: 1 })
    reject(itemComponentValuesResult.instrumentComponent('INVALID!'), 'instrument', 'TypeError', 'INVALID!')
    reject(itemComponentValuesResult.noteBlockSoundComponent('INVALID!'), 'note_block_sound', 'TypeError', 'INVALID!')
    reject(itemComponentValuesResult.recipesComponent(['INVALID!']), 'recipes', 'TypeError', ['INVALID!'])
    reject(Reflect.apply(itemComponentValuesResult.lockComponent, undefined, [1]), 'lock', 'TypeError', 1)
    reject(itemComponentValuesResult.tooltipStyleComponent('INVALID!'), 'tooltip_style', 'TypeError', 'INVALID!')
    reject(itemComponentValuesResult.baseColorComponent('teal'), 'base_color', 'TypeError', 'teal')
    reject(Reflect.apply(itemComponentValuesResult.equippableComponent, undefined, [{ slot: 'invalid' }]), 'equippable', 'TypeError', { slot: 'invalid' })
    reject(Reflect.apply(itemComponentValuesResult.equippableComponent, undefined, [null]), 'equippable', 'TypeError', null)
    const invalidEquippableEntities = { slot: 'head', allowedEntities: ['#minecraft:undead'] }
    reject(Reflect.apply(itemComponentValuesResult.equippableComponent, undefined, [invalidEquippableEntities]), 'equippable', 'TypeError', invalidEquippableEntities)
    reject(Reflect.apply(itemComponentValuesResult.kineticWeaponComponent, undefined, [{ contactCooldownTicks: -1 }]), 'kinetic_weapon', 'TypeError', { contactCooldownTicks: -1 })
    reject(Reflect.apply(itemComponentValuesResult.kineticWeaponComponent, undefined, [{ dismountConditions: {} }]), 'kinetic_weapon', 'TypeError', { dismountConditions: {} })
    reject(Reflect.apply(itemComponentValuesResult.piercingWeaponComponent, undefined, [{ dealsKnockback: 'yes' }]), 'piercing_weapon', 'TypeError', { dealsKnockback: 'yes' })
    const invalidDeathProtection = { deathEffects: [{}] }
    reject(Reflect.apply(itemComponentValuesResult.deathProtectionComponent, undefined, [invalidDeathProtection]), 'death_protection', 'TypeError', invalidDeathProtection)
    reject(Reflect.apply(itemComponentValuesResult.deathProtectionComponent, undefined, [null]), 'death_protection', 'TypeError', null)
    reject(Reflect.apply(itemComponentValuesResult.repairableComponent, undefined, ['INVALID!']), 'repairable', 'TypeError', 'INVALID!')
    reject(Reflect.apply(itemComponentValuesResult.repairableComponent, undefined, [['#minecraft:repairs/diamond_armor']]), 'repairable', 'TypeError', ['#minecraft:repairs/diamond_armor'])
    reject(itemComponentValuesResult.enchantableComponent(0), 'enchantable', 'RangeError', 0)
    reject(itemComponentValuesResult.enchantableComponent(1.5), 'enchantable', 'RangeError', 1.5)
    reject(itemComponentValuesResult.jukeboxPlayableComponent('INVALID!'), 'jukebox_playable', 'TypeError', 'INVALID!')
    reject(itemComponentValuesResult.ominousBottleAmplifierComponent(-1), 'ominous_bottle_amplifier', 'RangeError', -1)
    reject(itemComponentValuesResult.ominousBottleAmplifierComponent(5), 'ominous_bottle_amplifier', 'RangeError', 5)
    reject(itemComponentValuesResult.paintingVariantComponent('INVALID!'), 'painting_variant', 'TypeError', 'INVALID!')
    reject(Reflect.apply(itemComponentValuesResult.sulfurCubeContentComponent, undefined, ['INVALID!']), 'sulfur_cube_content', 'TypeError', 'INVALID!')
    const invalidLodestone = { target: { pos: [0, 64], dimension: 'minecraft:overworld' } }
    reject(Reflect.apply(itemComponentValuesResult.lodestoneTrackerComponent, undefined, [invalidLodestone]), 'lodestone_tracker', 'TypeError', invalidLodestone)
    reject(Reflect.apply(itemComponentValuesResult.fireworkExplosionComponent, undefined, [{ shape: 'invalid' }]), 'firework_explosion', 'TypeError', { shape: 'invalid' })
    reject(Reflect.apply(itemComponentValuesResult.fireworksComponent, undefined, [{ flightDuration: 0x100 }]), 'fireworks', 'TypeError', { flightDuration: 0x100 })
    const invalidBannerPatterns = [{ pattern: 'INVALID!', color: 'blue' }]
    reject(Reflect.apply(itemComponentValuesResult.bannerPatternsComponent, undefined, [invalidBannerPatterns]), 'banner_patterns', 'TypeError', invalidBannerPatterns)
    reject(Reflect.apply(itemComponentValuesResult.potDecorationsComponent, undefined, [['minecraft:brick']]), 'pot_decorations', 'TypeError', ['minecraft:brick'])
    reject(Reflect.apply(itemComponentValuesResult.containerLootComponent, undefined, [{ lootTable: 'INVALID!' }]), 'container_loot', 'TypeError', { lootTable: 'INVALID!' })
    expectItemFailure(itemComponentValuesResult.debugStickStateComponent({ INVALID: 'axis' }), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'invalid-value',
      field: 'debug_stick_state.block',
      message: 'ResourceLocation has invalid syntax, received "INVALID"',
      value: 'INVALID',
    })
    reject(Reflect.apply(itemComponentValuesResult.tooltipDisplayComponent, undefined, [null]), 'tooltipDisplay', 'TypeError', null, 'invalid-type')
    reject(Reflect.apply(itemComponentValuesResult.tooltipDisplayComponent, undefined, [[]]), 'tooltipDisplay', 'TypeError', [], 'invalid-type')
    reject(Reflect.apply(itemComponentValuesResult.tooltipDisplayComponent, undefined, [{ hideTooltip: 'yes' }]), 'hideTooltip', 'TypeError', 'yes', 'invalid-type')
    reject(Reflect.apply(itemComponentValuesResult.tooltipDisplayComponent, undefined, [{ hiddenComponents: 1 }]), 'hiddenComponents', 'TypeError', 1, 'invalid-type')
    reject(Reflect.apply(itemComponentValuesResult.tooltipDisplayComponent, undefined, [{ hiddenComponents: ['INVALID!'] }]), 'hiddenComponents', 'TypeError', ['INVALID!'])
  })

  it('validates and brands one snapshot of hostile dyed-color channels', () => {
    let colorReads = 0
    const changingColor = new Proxy([0, 0.5, 1], {
      get: (target, property, receiver) => {
        if (property === '0') {
          colorReads += 1
          return colorReads === 1 ? 0 : 1.5
        }
        return Reflect.get(target, property, receiver)
      },
    })
    const result = Reflect.apply(
      itemComponentValuesResult.dyedColorComponent,
      undefined,
      [changingColor],
    )

    expect(result).toMatchObject({
      _tag: 'Success',
      success: [0, 0.5, 1],
    })
    expect(colorReads).toBe(1)

    const unreadableColor = new Proxy([0, 0.5, 1], {
      get: (target, property, receiver) => {
        if (property === '0') throw new Error('hostile color')
        return Reflect.get(target, property, receiver)
      },
    })
    expectItemFailure(
      Reflect.apply(itemComponentValuesResult.dyedColorComponent, undefined, [unreadableColor]),
      {
        _tag: 'ItemValidationFailure',
        kind: 'TypeError',
        reason: 'hostile-input',
        field: 'dyed_color[0]',
        message: 'Unable to inspect dyed_color[0]',
      },
    )
  })

  it('validates and brands one snapshot of kinetic weapon options', () => {
    let cooldownReads = 0
    const changingOptions = new Proxy({ contactCooldownTicks: 12 }, {
      get: (target, property, receiver) => {
        if (property === 'contactCooldownTicks') {
          cooldownReads += 1
          return cooldownReads === 1 ? 12 : -1
        }
        return Reflect.get(target, property, receiver)
      },
    })
    const component = itemResultValue(Reflect.apply(
      itemComponentValuesResult.kineticWeaponComponent,
      undefined,
      [changingOptions],
    ))
    expect(component).toMatchObject({ contactCooldownTicks: 12 })
    expect(cooldownReads).toBe(1)

    const hostileOptions = new Proxy({ contactCooldownTicks: 12 }, {
      get: (target, property, receiver) => property === 'contactCooldownTicks'
        ? (() => { throw new Error('hostile') })()
        : Reflect.get(target, property, receiver),
    })
    expectItemFailure(Reflect.apply(
      itemComponentValuesResult.kineticWeaponComponent,
      undefined,
      [hostileOptions],
    ), {
      _tag: 'ItemValidationFailure',
      kind: 'TypeError',
      reason: 'hostile-input',
      field: 'kinetic_weapon.contactCooldownTicks',
      message: 'Unable to inspect kinetic_weapon.contactCooldownTicks',
      value: hostileOptions,
    })
  })
})

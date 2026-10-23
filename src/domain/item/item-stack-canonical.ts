import { Brand } from 'effect'
import type { ItemComponents } from './item-components-validation.js'
import { itemComponentStackLimitOf } from './item-components-data.js'
import { itemToolComponentOf } from './item-tool.js'
import { itemUseComponentsOf } from './consumable.js'
import { itemDurabilityDefinitionFor } from './equipment-data.js'
import type { ItemStack } from './item-stack.js'
import type { ItemType } from './item-type.js'
import type {
  ItemDamage,
  MaxDamage,
  MaxStackSize,
  RepairCost,
  StackCount,
} from '../time/quantities.js'

const canonicalMaxStackSize = Brand.nominal<MaxStackSize>()
const canonicalMaxDamage = Brand.nominal<MaxDamage>()
const canonicalItemDamage = Brand.nominal<ItemDamage>()
const canonicalRepairCost = Brand.nominal<RepairCost>()

const canonicalItemComponents = (item: ItemType): ItemComponents => {
  const maxStackSize = canonicalMaxStackSize(itemComponentStackLimitOf(item))
  const maxDamageValue = itemDurabilityDefinitionFor(item)?.maxDurability
  const maxDamage = maxDamageValue === undefined ? undefined : canonicalMaxDamage(maxDamageValue)
  const damage = maxDamage === undefined ? undefined : canonicalItemDamage(0)
  const useComponents = itemUseComponentsOf(item)
  const components: ItemComponents = {
    maxStackSize,
    maxDamage,
    damage,
    repairCost: canonicalRepairCost(0),
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
    food: useComponents?.food,
    consumable: useComponents?.consumable,
    useRemainder: useComponents?.useRemainder,
    useCooldown: undefined,
    useEffects: undefined,
    tool: itemToolComponentOf(item),
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
  }
  return Object.freeze(components)
}

export const itemStackForCanonicalItem = (
  item: ItemType,
  count: StackCount,
): ItemStack => Object.freeze({ item, count, components: canonicalItemComponents(item) })

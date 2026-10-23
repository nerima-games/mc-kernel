import { StackCount } from '../src/domain/time/quantities'
import { ResourceLocation } from '../src/domain/text/identifiers'
import { textComponent } from '../src/domain/text/text-component'
import type { BeeEntryOptions, ItemComponentNbtValue, TrimMaterialInlineOptions } from '../src/domain/item/item-component-values-data'
import { customDataComponent } from '../src/domain/item/item-component-values'
import { ItemComponentNbtKey, ItemComponentNbtLong, ItemComponentNbtString, TrimArmorMaterialKey, TrimAssetName, TrimItemModelIndex, BeeHiveTicks } from '../src/domain/item/item-primitives'
import { itemStack, itemStackWithCount, type ItemStack } from '../src/domain/item/item-stack'

const stack = itemStack('stone', StackCount(2))
const stackCount: StackCount = stack.count
const changedStack = itemStackWithCount(stack, StackCount(1))
const nbtLong: ItemComponentNbtValue = ItemComponentNbtLong(1n)
const customData = customDataComponent({ value: ItemComponentNbtString('valid') })
const bee: BeeEntryOptions = {
  entityData: {
    [ItemComponentNbtKey('id')]: ItemComponentNbtString('minecraft:bee'),
  },
  ticksInHive: BeeHiveTicks(1),
  minTicksInHive: BeeHiveTicks(0),
}
const trim: TrimMaterialInlineOptions = {
  assetName: TrimAssetName('iron'),
  ingredient: 'iron_ingot',
  itemModelIndex: TrimItemModelIndex(0.5),
  overrideArmorMaterials: {
    [TrimArmorMaterialKey('diamond')]: ResourceLocation('minecraft:diamond'),
  },
  description: textComponent('Iron'),
}

// @ts-expect-error Item stack counts require the StackCount brand.
itemStack('stone', 2)
// @ts-expect-error Count updates also require StackCount.
itemStackWithCount(stack, 1)
// @ts-expect-error The public ItemStack field keeps its semantic count brand.
const rawStack: ItemStack = { item: 'stone', count: 2, components: stack.components }
// @ts-expect-error Raw bigint values are not NBT long values at the typed boundary.
const rawNbtLong: ItemComponentNbtValue = 1n
// @ts-expect-error Custom data values must use the NBT primitive brands.
customDataComponent({ value: 1n })
// @ts-expect-error Bee entity-data keys and string values require their item NBT brands.
const rawBee: BeeEntryOptions = { entityData: { id: 'minecraft:bee' }, ticksInHive: 1, minTicksInHive: 0 }
// @ts-expect-error Trim model indexes and override keys require semantic brands.
const rawTrim: TrimMaterialInlineOptions = { assetName: 'iron', ingredient: 'iron_ingot', itemModelIndex: 0.5, overrideArmorMaterials: { diamond: ResourceLocation('minecraft:diamond') }, description: textComponent('Iron') }

export const compileFixtureReferences: readonly unknown[] = [
  stackCount,
  changedStack,
  nbtLong,
  customData,
  bee,
  trim,
  rawStack,
  rawNbtLong,
  rawBee,
  rawTrim,
]

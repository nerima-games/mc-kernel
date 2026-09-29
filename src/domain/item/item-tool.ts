/** Item-aware resolution for the portable Java minecraft:tool component. */
import { ITEM_TOOL_COMPONENTS } from './item-tool-data.js'
import type { ItemType } from './item-type.js'
import type { ToolComponent } from './tool-component.js'

export { ITEM_TOOL_COMPONENTS } from './item-tool-data.js'

export const itemToolComponentOf = (item: ItemType): ToolComponent | undefined =>
  ITEM_TOOL_COMPONENTS[item]

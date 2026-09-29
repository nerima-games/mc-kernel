export const BEDROCK_DIGGER_MIN_FORMAT_VERSION = '1.20.30'

export const BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION = '1.21.50'

export const DEFAULT_BEDROCK_SECONDS_TO_DESTROY = 0

export type BedrockTagQueryOperator = 'any_tag' | 'all_tags'

export type BedrockBlockStateValue = string | number | boolean

export type BedrockBlockStates = Readonly<Record<string, BedrockBlockStateValue>>

export type BedrockBlockDescriptor =
  | string
  | {
      readonly name?: string
      readonly states?: BedrockBlockStates
      readonly tags?: string
    }

export type BedrockBlock = {
  readonly name: string
  readonly states: BedrockBlockStates
  readonly tags: ReadonlySet<string>
}

export type BedrockDiggerDestroySpeed = {
  readonly block: BedrockBlockDescriptor
  readonly speed: number
}

export type BedrockDiggerComponent = {
  readonly destroy_speeds?: readonly BedrockDiggerDestroySpeed[]
  readonly use_efficiency?: boolean
}

export type BedrockItemDescriptor =
  | string
  | {
      readonly tags: string
    }

export type BedrockItem = {
  readonly name: string
  readonly tags: ReadonlySet<string>
}

export type BedrockItemSpecificSpeed = {
  readonly item: BedrockItemDescriptor
  readonly destroy_speed: number
}

export type BedrockDestructibleByMining =
  | boolean
  | {
      readonly seconds_to_destroy?: number
      readonly item_specific_speeds?: readonly BedrockItemSpecificSpeed[]
    }

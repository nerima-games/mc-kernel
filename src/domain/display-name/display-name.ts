import { Result, Schema } from 'effect'
import { BLOCK_TYPES } from '../block/block-type-data.js'
import type { BlockType } from '../block/block-type.js'
import { ITEM_TYPES } from '../item/item-type-data.js'
import type { ItemType } from '../item/item-type.js'
import { BLOCK_DISPLAY_NAMES, ITEM_DISPLAY_NAMES } from './display-name-data.js'
import type { DisplayName } from './display-name-data.js'

export type DisplayLanguage = 'en' | 'ja'
export const DisplayLanguageSchema: Schema.Codec<DisplayLanguage, DisplayLanguage> =
  Schema.Literals(['en', 'ja'])

const ItemTypeSchema: Schema.Codec<ItemType, ItemType> = Schema.Literals(ITEM_TYPES)
const BlockTypeSchema: Schema.Codec<BlockType, BlockType> = Schema.Literals(BLOCK_TYPES)

export type DisplayNameRequest =
  | Readonly<{ kind: 'item'; id: ItemType; language: DisplayLanguage }>
  | Readonly<{ kind: 'block'; id: BlockType; language: DisplayLanguage }>

export const DisplayNameRequestSchema: Schema.Codec<DisplayNameRequest, DisplayNameRequest> =
  Schema.Union([
    Schema.Struct({
      kind: Schema.Literal('item'),
      id: ItemTypeSchema,
      language: DisplayLanguageSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal('block'),
      id: BlockTypeSchema,
      language: DisplayLanguageSchema,
    }),
  ])

export const DisplayNameSchema: Schema.Codec<DisplayName, string> = Schema.NonEmptyString.pipe(
  Schema.brand('DisplayName'),
)

export type DisplayNameFailure = Readonly<{
  readonly _tag: 'InvalidDisplayNameRequest'
}>

export const getDisplayName = (
  input: unknown,
): Result.Result<DisplayName, DisplayNameFailure> => {
  const decoded = Schema.decodeUnknownResult(DisplayNameRequestSchema, {
    onExcessProperty: 'error',
  })(input)
  if (Result.isFailure(decoded)) {
    return Result.fail({
      _tag: 'InvalidDisplayNameRequest',
    })
  }

  const request = decoded.success
  if (request.kind === 'item') {
    return Result.succeed(ITEM_DISPLAY_NAMES[request.id][request.language])
  }
  return Result.succeed(BLOCK_DISPLAY_NAMES[request.id][request.language])
}

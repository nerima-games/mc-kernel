---
"@nerima-games/mc-kernel": minor
---

Except for branded value constructors, builders and decoders across the block, coordinates, entity, item, recipe, text, and world APIs that previously threw for invalid input now return Effect `Result` failures. Callers of these APIs must check `Result.isFailure` and handle or propagate `.failure`. Boolean guards such as `isBlockFace` and `isJsonValue` remain boolean predicates. Separately, the item-component patch decoder is renamed from `itemComponentPatchFromUnknown` and `itemComponentPatchFromUnknownEither` to `decodeItemComponentPatch`, and the merge API is renamed from `mergeItemComponentPatchesEither` to `mergeItemComponentPatches`.

See the [public API reference](../docs/public-api.md) for the affected signatures and [Effect 4のResultへ移行する](../docs/consumer-migration.md#effect-4のresultへ移行する) in `docs/consumer-migration.md` for failure handling and the item-component patch renames.

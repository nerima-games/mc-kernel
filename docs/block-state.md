# Block-state vocabulary and codec

## Scope

This API stores a block's mutable state beside its existing `BlockId`. It does not change block IDs or the current `BlockState` chunk buffer. The vocabulary covers the state properties selected for this kernel registry; it does not add unrelated vanilla properties such as `lit`, `eye`, or crop `stage`.

Each registered block type has a definition. The current registry contains 123 types: 43 have properties in this vocabulary, and the other 80 accept only the empty state. Those 43 types correspond to 41 vanilla block IDs after aliases. The full Java Edition 26.3 crosswalk is recorded below the codec design once the implementation table is complete. The golden registry input is `test/golden/vanilla-block.json`; names without an exact vanilla block ID are identified as aliases in that table.

## Value and encoding rules

The public value schema is a strict object containing optional `facing`, `half`, `hinge`, `open`, `age`, `level`, `powered`, `delay`, `shape`, and directional `connections` fields. A per-block definition restricts which fields and values are valid. Omitted fields resolve to that block's default. An explicitly invalid value, an unsupported field, an unknown block ID, or an undecodable integer returns a typed failure.

The codec returns one unsigned 32-bit integer per cell. Its block-specific layout uses property slots in this order: `facing`, `half`, `hinge`, `open`, `age`, `level`, `powered`, `delay`, `shape`, then `connections` in `down`, `north`, `east`, `south`, `west`, `up` order. The legal-value list for each slot starts with its default, so the complete default state encodes as zero. Slots are packed from the least significant bit upward. Reserved field codes and nonzero unused high bits are invalid. The maximum layout width is 9 bits; the remaining bits are reserved in codec version 1.

The integer codec does not define byte order. Save and network formats own serialization of the `EncodedBlockState` value and their versioning. `BlockId` remains the selector for each block's state layout.

## C7 integration proposal

Add `state?: BlockStateValues` to C7's `BlockEditSchema`. Omission means the block-specific default. The coordinator validates explicit values against the edit's block before checking revisions or writing. An invalid block-state value returns `WorldWriteInvalidBatch` with a new `invalid-block-state` reason, leaving the batch atomicity and revision rules unchanged. Chunk storage uses `encodeBlockState`; replicated and saved representations may carry the encoded value under their own versioned schemas.


# @nerima-games/mc-kernel

## 0.3.0

### Minor Changes

- **Breaking:** `Chunk.blocks` is now `ChunkBlocks` (an encapsulated `BlockState`), not a raw `Uint8Array`. `chunk()` and `decodeChunk()` still accept a raw `Uint8Array` as input and validate it into a `ChunkBlocks`, but the value stored on `Chunk.blocks` (and returned by `decodeChunk`) no longer supports the `[]` index operator. Use `blocks.get(index)` / `blocks.set(index, blockId)` for element access, `blocks.length` for the count, and `blocks.toBytes()` (copy) or `blocks.copyTo(target, offset?)` (write into a caller-owned buffer) to get raw bytes back out. See `docs/public-api.md` § Chunk バイナリ形式 for the full API.

## 0.2.19

### Patch Changes

- Expose canonical `ChunkKey` encoding and decoding for chunk-coordinate storage.

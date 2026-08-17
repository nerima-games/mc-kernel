# @nerima-games/mc-kernel

## 0.4.0

### Minor Changes

- [#31](https://github.com/nerima-games/mc-kernel/pull/31) [`912b059`](https://github.com/nerima-games/mc-kernel/commit/912b05977afcc6c9df49982676abf55f65aa1d4c) Thanks [@takeokunn](https://github.com/takeokunn)! - **Breaking for consumers: `effect` moved from `dependencies` to `peerDependencies`.**
  
  mc-kernel exports a `Context.Tag` (`ClockPort`) and `Effect` values, so the copy
  of `effect` a consumer runs has to be the copy the kernel's values were built
  against. Declaring it as a regular dependency let a second copy be installed
  silently — and `effect` 4.x is already published on the `rc` and `beta`
  dist-tags, so a consumer moving to 4 while this package pinned `^3.22.1` would
  have got exactly that.
  
  A consumer that relied on mc-kernel to pull `effect` in transitively must now
  declare `effect` in its own `package.json`. Every package in the Effect
  organisation that builds on `effect` — `@effect/platform`, `@effect/schema`,
  `@effect/cli`, `@effect/experimental`, `@effect/vitest` — declares it the same
  way; none declares it as a dependency.
  
  `0.x` classifies a breaking change as MINOR, hence the bump level here. See
  `docs/versioning.md` §1-1 and §6.
  
  Nothing else in the public surface changed: the package still exports the same
  158 names. The axis brand constructors were renamed internally from `blockAxis`
  / `chunkAxis` / `localAxis` to `BlockAxis` / `ChunkAxis` / `LocalAxis`, but the
  barrel only ever re-exported the PascalCase spelling, so the boundary is
  unaffected.

- **This is the first release consumers can actually import.**
  
  Every version published so far — 0.2.0 through 0.2.18 — ships raw TypeScript.
  Their manifests point `main`, `types` and `exports` at `./src/index.ts`, `files`
  carries `src` with no `dist`, and no subpath export is declared at all. Installing
  one and importing it fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`,
  because Node does not strip types under `node_modules`, and
  `@nerima-games/mc-kernel/domain/chunk` reports that the subpath is not defined by
  `exports`.
  
  The compiled ESM build that fixes this has been in the repository for a while. It
  never reached the registry: the release workflow decides whether to publish by
  diffing the version against the previous commit, and the version was already at
  its current value when that workflow landed, so no later push could ship it. Both
  halves are fixed now — the workflow splits detection from publishing, and this
  release carries the version change that lets it fire.
  
  Verified by installing from GitHub Packages into an empty project rather than by
  type-checking: the root import resolves, both subpath exports resolve, and
  `fixedClock`, the chunk codec round trip and the coordinate conversions all run.
  Note that `pnpm package:verify` cannot catch this class of defect — it packs a
  tarball from the working tree, so it inspects the manifest about to be shipped and
  never the one already on the registry.

## 0.3.0

### Minor Changes

- **Breaking:** `Chunk.blocks` is now `ChunkBlocks` (an encapsulated `BlockState`), not a raw `Uint8Array`. `chunk()` and `decodeChunk()` still accept a raw `Uint8Array` as input and validate it into a `ChunkBlocks`, but the value stored on `Chunk.blocks` (and returned by `decodeChunk`) no longer supports the `[]` index operator. Use `blocks.get(index)` / `blocks.set(index, blockId)` for element access, `blocks.length` for the count, and `blocks.toBytes()` (copy) or `blocks.copyTo(target, offset?)` (write into a caller-owned buffer) to get raw bytes back out. See `docs/public-api.md` § Chunk バイナリ形式 for the full API.

## 0.2.19

### Patch Changes

- Expose canonical `ChunkKey` encoding and decoding for chunk-coordinate storage.

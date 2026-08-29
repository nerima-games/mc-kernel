---
"@nerima-games/mc-kernel": minor
---

**Eight new shared-vocabulary domains, and two MAJOR-classified changes buried inside them: a changed default and a changed wire format.**

## New domains (MINOR: new types and functions)

`domain/random-source`, `domain/status-effect`, `domain/entity-type`, `domain/biome`,
`domain/light`, `domain/heightmap`, `domain/block-entity`, and `domain/tag-membership` are now
public, each exported from the root barrel and its own `@nerima-games/mc-kernel/domain/*`
subpath. Every one satisfies `docs/responsibility.md` §3-2's admission test: at least two
repositories need the vocabulary and cannot reach each other through the dependency graph
(`mc-noise` / `mc-meshing` / `mc-physics` / `mc-save` / `mc-audio` are the five repositories with
no edge but kernel). See `docs/public-api.md` for the full surface of each.

## Breaking (MAJOR per `docs/versioning.md` §6, shipped as a `0.x` minor bump)

**`ingredientMatches`'s default for an omitted `itemTags` argument changed from an empty map to
`VANILLA_ITEM_TAG_MEMBERSHIPS`** (`src/domain/recipe-data.ts:466`, consumed at four call sites in
`src/domain/recipe-matching.ts`). Previously, calling `ingredientMatches` without an explicit
`itemTags` meant every tag ingredient silently failed to match. It now resolves against the
kernel's vanilla tag table (`domain/tag-membership.ts`). `docs/versioning.md` §6 classifies a
default-value change as MAJOR ("下流の挙動が黙って変わる。最も危険") because it changes the
behaviour of every caller that never wrote anything — exactly the risk that classification exists
to flag. A caller that depended on the old empty-default behaviour (tag ingredients never
matching) must now pass an empty `Map` explicitly.

**The `Chunk` wire format gained a v2 encoding** (`src/domain/chunk.ts`). Block elements widen
from 8-bit to 16-bit; `encodeChunk` always emits v2 and never re-emits v1, though `decodeChunk`
still reads v1 bytes through a compatibility path. The payload-length header field at byte offset
20 changes meaning from an element count to a byte count — the two were indistinguishable under
v1's one-byte elements, but diverge now. `decodeChunk` validates each 16-bit element against the
block registry before narrowing it to the one-byte-per-element shape `BlockState` stores, so a
corrupt id above 255 cannot alias a valid id through truncation. `BlockId` numbering itself is
unchanged (`BLOCK.SAND === 5` still holds). Any code that parses encoded chunk bytes directly
(rather than through `encodeChunk` / `decodeChunk`) must account for the new element width and
payload-length semantics.

## Package is `0.x`

Per `docs/versioning.md` §6, a `0.x` package reads MAJOR-classified changes as a **minor** bump
(`0.4.0` → `0.5.0`), not a major bump — hence `minor` above for both the tag-matching default and
the chunk wire format, alongside the eight new domains. `1.0.0` is deferred to a maintainer
decision made after downstream repositories actually consume this contract
(`docs/versioning.md` §2, §7).

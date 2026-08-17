---
"@nerima-games/mc-kernel": minor
---

**Breaking for consumers: `effect` moved from `dependencies` to `peerDependencies`.**

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

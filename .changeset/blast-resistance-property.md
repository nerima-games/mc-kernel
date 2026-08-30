---
"@nerima-games/mc-kernel": minor
---

Add a `blastResistance` block property and `resistsExplosion(id, power)` predicate to `explosion.ts`. Reproduces mx-gameplay's `block-vocabulary.ts` mirror of `resistsNormalExplosion`, which flags `bedrock` and `obsidian` as immune to normal creeper/TNT explosions; every other block defaults to `blastResistance: 0`.

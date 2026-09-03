---
"@nerima-games/mc-kernel": patch
---

Fill in `footstepMaterial` for the standable blocks the registry left silent: 92 of 123 rows previously fell through to the silent `default` (only ~15 grass/wood/stone rows were classified), so a player heard footsteps on grass, planks and a handful of stone blocks and nothing anywhere else — deepslate, roughly a quarter of solid terrain, was silent underfoot. All 107 standable rows now carry `grass`, `wood`, or `stone` (the only cues `mc-audio`'s `FOOTSTEP_MATERIALS` maps to a sound); the 16 remaining `default` rows are deliberate — fluids, void/portal blocks, and decorative attachments nobody stands on. Where the real material has no vocabulary member (glass, sand-family, ice, metal and gem storage blocks, lamp glass, shell), the nearest existing material is used rather than staying silent.

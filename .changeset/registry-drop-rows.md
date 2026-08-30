---
"@nerima-games/mc-kernel": patch
---

Fix two block-registry drop-rule omissions: `glowstone` now carries `silkTouchItem: 'glowstone'` (silk touch previously still yielded `glowstone_dust`), and `tall_grass`/`fern` now resolve to `drops: DROPS_NOTHING` instead of falling through to "drops one of itself".

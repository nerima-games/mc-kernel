---
"@nerima-games/mc-kernel": minor
---

Make `ItemStack` canonical and immutable: zero-count stacks are replaced by empty `ItemSlot` values, and kernel-owned split, merge, equality, resolved component validation, deep snapshot isolation, and conflicting component-patch rejection are added. Downstream `mc-sim` inventory/state code must migrate zero-count sentinels to empty slots and use the canonical payload for stack moves and snapshots; `mx-gameplay` and `mx-multiplayer` must pass component payloads through recipe/anvil and wire projections; `mc-compose` must remove duplicate item metadata and sidecar normalization in favor of the kernel representation.

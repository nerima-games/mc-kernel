---
"@nerima-games/mc-kernel": minor
---

Make `ItemStack` canonical and immutable with only `item`, `count`, and resolved `components`. Zero-count stacks are replaced by empty `ItemSlot` values. Component patches are resolved at decoder, recipe, and wire boundaries and are not retained on the stack. Kernel-owned `splitItemStack`, `mergeItemStacks`, structural equality, `applyItemComponentPatch`, deep snapshot isolation, and conflicting patch rejection define the public contract; `TransferQuantity` is the branded quantity for moves. Downstream `mc-sim` inventory/state code must migrate zero-count sentinels to empty slots and use the canonical payload for stack moves and snapshots; `mx-gameplay` and `mx-multiplayer` must pass resolved component payloads through recipe/anvil and wire projections and remove sidecars. `mc-compose` must remove duplicate item metadata and sidecar normalization in favor of the kernel representation.

---
"@nerima-games/mc-kernel": minor
---

Add the kernel-owned chunk read/edit vocabulary: `BlockRead`, `ReadView`, `BlockEdit`, `BlockWriteBatch`, and branded world/chunk/light revisions. Existing `block-world.ts` consumers (`fluid-update.ts`, `redstone-update.ts`, `redstone-network.ts`, and `redstone-device-update.ts`) remain on the pure compatibility map until their owning downstream services migrate to the new world-scoped contract. `mc-worldgen` owns live chunk state and atomic writes; `mc-meshing` consumes detached snapshots or read-only section views.

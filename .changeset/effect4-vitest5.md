---
"@nerima-games/mc-kernel": minor
---

Upgrade `effect` and `@effect/vitest` to 4.0.5 and Vitest to 5.0.5. Add `fast-check` as a direct test dependency.

Public functions that returned `Either` now return Effect `Result` values. Branded constructors use `Brand.make`, and `ClockPort` uses `Context.Service`. Exported symbol names and validation behavior remain unchanged.

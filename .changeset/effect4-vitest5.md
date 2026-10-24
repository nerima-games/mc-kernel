---
"@nerima-games/mc-kernel": minor
---

Upgrade the runtime dependency `effect` to 4.0.5.

Public functions that returned `Either` now return Effect `Result` values. Branded constructors use `Brand.make`, and `ClockPort` uses `Context.Service`. For APIs whose only change is the Effect 4 migration, exported symbol names and validation behavior remain unchanged.

See `docs/consumer-migration.md` for the affected symbols and migration steps.

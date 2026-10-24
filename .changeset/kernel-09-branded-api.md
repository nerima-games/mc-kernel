---
"@nerima-games/mc-kernel": minor
---

Public signatures now use roughly 70 branded scalar types where parameters, return values, and fields were previously represented by raw `number` or `string` types. Downstream consumers must construct values with the exported brand constructors and validate untrusted input with `.option` or `.result`, handling invalid values explicitly.

Compare your 0.8 call sites with the current branded signatures in the [public API reference](../docs/public-api.md). For construction and untrusted-input handling, see [BrandのコンストラクタAPIを変更する](../docs/consumer-migration.md#brandのコンストラクタapiを変更する) and [時間と座標のbrand型に移行する](../docs/consumer-migration.md#時間と座標のbrand型に移行する) in `docs/consumer-migration.md`.

---
"@nerima-games/mc-kernel": minor
---

Add fifteen tags to `DomainEventSchema` and require damage cause and explosion source metadata. Event decoders now reject undeclared properties recursively. This also changes the five tags introduced in 0.9.0: extra fields their decoders previously ignored now fail decoding. The stricter decoding ships in the 0.10.0 minor release, before `mx-gameplay` publishes a producer for these events.

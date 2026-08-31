---
"@nerima-games/mc-kernel": minor
---

Merge the player-settings value rules into one settings domain: captionsEnabled joins the type, rebindKey replaces bindKey with conflict-swap semantics (the colliding action gives up its code rather than being silently overwritten), and two defaults change to what a player actually gets — audioEnabled true (the browser autoplay gate already prevents a cold-open blast, so false only produced a silent game) and mouseSensitivity 1, the multiplier identity. Pre-1.0 minor, but note the removed export and the changed defaults: a consumer reading DEFAULT_SETTINGS or normalising an empty object sees different values.

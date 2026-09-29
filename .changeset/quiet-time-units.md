---
'@nerima-games/mc-kernel': minor
---

Add unit-safe fixed simulation time brands and pure tick arithmetic. Downstream `mc-physics` should replace local fixed substep duration vocabulary, `mc-sim` should replace its frame-timing forwarders and own the fixed-step accumulator/loop, and `mc-render` should use `InterpolationFraction` for presentation interpolation while retaining `ClockPort` injection.

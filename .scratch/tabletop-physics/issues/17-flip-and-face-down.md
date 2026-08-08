# 17 — Flip and turn face-down

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

**What to build:** Two independent axes already live on `mtg-card` (ticket 12): `face: 'front' |
'back'` (which printed side; `'back'` is structurally unreachable when `backImageUrl` is null)
and `faceDown: boolean` (concealment, orthogonal to `face`). Wire the gestures that change them.

"Flip" and "Turn face down" are two separate context-menu items (same surface as furniture's
Lock/Unlock), each shown/enabled per the card's own state — no combined "turn over" gesture, no
hover affordance, no keyboard modifier. "Flip" only appears (or is enabled) when
`backImageUrl !== null`. `faceDown` renders as a plain image swap to the table's
`cardBackImageUrl` (the same asset the sleeve picker reuses) with no additional visual treatment.

A card returning to hand or library (any zone-entry into `hand`/`library`, using the same
zone-entry detection ticket 13 upgraded) resets both axes to `face: 'front'`, `faceDown: false`,
mirroring the Shuffler's own `mulligan()` reset.

Accepted, known limitation (not fixed here): the Shuffler's own `currentFace` on `GameState`
stays whatever it was before a table-side flip, since there's no inbound Spine→Shuffler event
path today. A table-flipped card later discarded may show its pre-flip face on the Shuffler's
screen. Consult the `two-faced-cards` owner before implementing.

**Blocked by:** 12

- [ ] "Flip" context-menu item swaps `face`, present/enabled only when the card has a back face
- [ ] "Turn face down" context-menu item toggles `faceDown`, renders the table's generic back
- [ ] A card entering hand or library resets to `face: 'front'`, `faceDown: false`
- [ ] Two-client test: both clients see the same resulting face after a flip or face-down toggle

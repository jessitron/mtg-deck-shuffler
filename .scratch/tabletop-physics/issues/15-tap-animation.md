# 15 — Animate tap as a quick rotation

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

**What to build:** Toggling `props.tapped` (ticket 12) should read as a quick rotation rather
than an instant snap. A 0.5s ease-out local counter-rotation catch-up, matching the Shuffler's
card-motion timing (not its 0.8s flip), keyed off `props.tapped` changing — never off sniffing a
±90° rotation delta, which would misfire on a card free-rotated through 90° by the player.
Initialize the "previous tapped" ref to the first-seen value, not `false`, so a card arriving
already-tapped doesn't swing on mount or on a store reconnect. Because the trigger is a prop
change, remote peers animate identically for free — no extra sync work.

Consult the `animations` owner before implementing; the counter-transform mechanism itself was
already specified there during the spec's grilling and just needs applying here.

**Blocked by:** 12

- [ ] Tapping/untapping a card plays a 0.5s ease-out rotation catch-up
- [ ] A card that arrives already-tapped does not animate on mount or reconnect
- [ ] Free-rotating a card through 90° does not trigger a tap animation
- [ ] A remote peer sees the same animation when the tapped prop syncs in

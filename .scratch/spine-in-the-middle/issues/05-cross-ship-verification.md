# 05 — Cross-ship verification: one test exercises Spine + Tabletop together

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

**What to build:** `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts`
already spawns a real Tabletop. Extend it (or add a sibling spec) to also spawn a real
Spine (`services/spine`, ephemeral SQLite) and assert, end to end, that shuffling up
produces a `seat.joined` event on the Spine's admin page *and* draws the seat on the
Tabletop's canvas. This is the test that would have caught today's original problem —
nothing currently exercises the Spine and the Tabletop in the same run.

Test-only; no production behavior change.

**Blocked by:** 03, 04 — needs the full join flow (single call, async, notify) in place
to verify

- [ ] Extended/sibling verification spec spawns a real Spine alongside the real
      Tabletop, using an ephemeral SQLite DB
- [ ] Shuffling up through the Shuffler is asserted to produce a full `seat.joined`
      event (deckName, playmat, sleeve, commanders, gameUrl) visible on the Spine's
      admin page
- [ ] The same shuffle-up is asserted to draw the seat on the Tabletop's canvas
- [ ] Existing per-ship unit suites still pass: `bin/test` (Spine), `npm test`
      (Shuffler)

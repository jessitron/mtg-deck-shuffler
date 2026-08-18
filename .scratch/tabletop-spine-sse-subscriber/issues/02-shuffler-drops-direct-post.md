# 02 — Shuffler's card.played reaches the Tabletop only through the Spine

Mountain: spine-gathers-data
Ship: fleet
Status: resolved

**What to build:** Playing or discarding a card in the Shuffler no longer waits on, or can
be blocked by, the Tabletop being slow or unreachable — the card's only path to the
Tabletop is now Shuffler → Spine → SSE → Tabletop, matching how `seat.joined` already
works. Delete the Shuffler's direct, blocking HTTP POST entirely: the blocking
`sendCardToTableFirst` call in `apps/shuffler/src/app.ts`, `HttpTabletopGateway.sendCardToTable`,
the `TabletopPort` interface it implements, and `FakeTabletopGateway`'s matching method.
Only `sendCardPlayedToSpineBestEffort` remains on the play/discard path, unchanged — a
failure there becomes a `log.warn`, same as any other best-effort Spine send today; a card
can now silently fail to reach the Tabletop, a deliberate trade already made in the
2026-08-11 "atomic swap" decision. On the Tabletop side, remove the now-unused
`POST /api/tables/:tableName/cards` route and `handleCardArrival`'s HTTP-shaped entry
point — the extracted dedup/self-heal/placement logic from ticket 01 stays, now driven
only by the SSE subscriber. Leave no dead types, dead tests, or dead config behind (e.g.
any `TABLETOP_URL` usage that was specific to `card.played`).

Extend `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts` (currently
spawning only a real Tabletop) to also spawn a real Spine, play a card through the
Shuffler, and assert it lands on the Tabletop's canvas with no direct HTTP call between
the two ships anywhere in the code — the test that proves `card.played` now only reaches
the Tabletop via the Spine. Update existing Shuffler tests on the play/discard routes to
drop assertions about the deleted Tabletop POST, and add a test confirming play/discard
still succeeds when the Spine is unreachable.

Update `apps/tabletop/CLAUDE.md` (the `rooms.ts`/server section, to describe the
subscription as the only path) and `apps/shuffler/CLAUDE.md` (the port-tabletop section
and "Table Mode" description) to drop the deleted direct-POST path, once this lands.

**Blocked by:** 01 — Tabletop gains a live Spine SSE subscriber for card.played. This
ticket must not start until 01 has landed on `main` **and been confirmed working
end-to-end**: removing the direct POST before the SSE subscriber is proven live would
leave `main` in a state where cards silently stop reaching the Tabletop until this ticket
also lands.

- [x] `sendCardToTableFirst`'s call site in `app.ts` is removed; play/discard no longer
      blocks on or can fail due to the Tabletop
- [x] `HttpTabletopGateway.sendCardToTable`, `TabletopPort`, and
      `FakeTabletopGateway`'s matching method are deleted
- [x] `sendCardPlayedToSpineBestEffort` remains the sole Shuffler→Spine send on this path,
      unchanged
- [x] Tabletop's `POST /api/tables/:tableName/cards` route and `handleCardArrival`'s
      HTTP entry point are removed; the SSE-driven path from ticket 01 is the only consumer
      of the shared card-arrival logic
- [x] No dead types, tests, or `card.played`-specific config remain on either ship
- [x] `verify-tabletop-integration.spec.ts` spawns a real Spine alongside the real
      Tabletop, plays a card through the Shuffler, and asserts it reaches the canvas with
      zero direct Shuffler→Tabletop HTTP calls in the code
- [x] Shuffler play/discard tests updated to drop the deleted-POST assertions and add a
      Spine-unreachable-is-still-successful case
- [x] `apps/tabletop/CLAUDE.md` and `apps/shuffler/CLAUDE.md` updated to describe the
      single Shuffler → Spine → SSE → Tabletop path
- [x] Each ship's existing unit suite (`bin/test` for the Spine, `npm test` for the
      Shuffler and the Tabletop) plus the extended verification spec all pass

## Comments

- 2026-08-18: `applyCardArrival` ended up with a second consumer beyond the SSE dispatcher.
  Deleting the production HTTP route (`POST /api/tables/:tableName/cards`) also broke six
  unrelated Playwright specs and `cardArrival.test.ts`, which used it purely as a
  test-seeding seam (they drive the Tabletop server as a separately-spawned process, so
  they can't call `applyCardArrival` in-process). Asked Jess how to handle it; she picked
  keeping a small **test-only** seam (`src/server/testSeedRoute.ts`, `POST
  /test/tables/:tableName/cards`, only mounted when `ENABLE_TEST_SEED_ROUTE=true`) over
  migrating those specs to a fake-SSE seam or leaving the production route in place. The
  production route and `handleCardArrival` are still fully deleted; the SSE dispatcher is
  the only *production* consumer.
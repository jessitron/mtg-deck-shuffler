# 06 — `?seat=<seatId>` on the Tabletop URL

Mountain: spine-gathers-data
Ship: spine
Status: ready-for-agent

**What to build:** `table_url` in `services/spine/app.rb` (lines 201-204, today returns a
bare `<TABLETOP_PUBLIC_URL>/t/<table_id>`) grows a `?seat=<seatId>` param carrying the
seatId just minted for the calling player, so the URL the Shuffler receives from `/join`
(and hands to its player) already identifies their seat. The `/join` route's response
building (`app.rb` lines 133-138) needs to pass the seat id through to `table_url`.

This is the concrete unblock for `.scratch/tabletop-view-rotation/spec.md`'s explicitly
deferred "client-side which seat is this browser" scope. That spec's own seat-relative
Home logic stays out of scope here — this ticket only makes the seat identity available on
the URL; consuming it for view logic is that other spec's job.

**Blocked by:** 03 — Give Seat ID a legible format (so the URL carries the new legible
seatId, not the old bare UUID).

**Status:** ready-for-agent

- [x] `table_url` accepts/threads through the seat id just minted and appends
      `?seat=<seatId>` to the returned URL
- [x] The `/join` route's response uses the updated `table_url`, so the URL returned to
      the Shuffler already carries `?seat=`
- [x] A Spine-level test (alongside the existing `/join` integration tests in
      `services/spine/test/integration/`) asserts the returned URL includes
      `?seat=<seatId>` matching the seat just minted

## Comments

`table_url(table_id, seat_id)` in `services/spine/app.rb` now takes the minted seat id and
appends `?seat=#{CGI.escapeURIComponent(seat_id)}`. The `/join` route passes
`outcome[:seat_id]` through. Added `test_table_url_carries_the_minted_seat_id_as_a_query_param`
in `test/integration/join_test.rb`, and updated the existing `tableUrl` assertions in
`join_test.rb` and `join_delivery_test.rb` to expect the `?seat=` suffix. Full Spine suite
(`bin/test`) passes: 86 runs, 240 assertions, 0 failures. Checked the Shuffler side
(`apps/shuffler/src/GameState.ts`, `port-spine/*`, `active-game-page.ts`) — it stores and
forwards `tableUrl` opaquely without parsing it, so no changes needed there. No owner's
trigger matched this change (no telemetry wiring, UI, card faces, or shape mechanics
touched), so none were consulted.

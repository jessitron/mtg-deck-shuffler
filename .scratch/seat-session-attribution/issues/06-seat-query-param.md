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

- [ ] `table_url` accepts/threads through the seat id just minted and appends
      `?seat=<seatId>` to the returned URL
- [ ] The `/join` route's response uses the updated `table_url`, so the URL returned to
      the Shuffler already carries `?seat=`
- [ ] A Spine-level test (alongside the existing `/join` integration tests in
      `services/spine/test/integration/`) asserts the returned URL includes
      `?seat=<seatId>` matching the seat just minted

## Comments

# 01 — Spine: seat-release capability + `seat.left.v1` contract event

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** A player's seat at a Spine table can be released, freeing that seat
number for reuse. Releasing a seat is a first-class capability — analogous to today's
`take_seat!` — that deletes the `Seat` row and mints a new `seat.left` event through the
existing `append_event!` path. A new Roda route (analogous to `r.post "join"`) exposes
this, using the same rescue/response-shape convention already used there: specific
rescued exceptions map to meaningful JSON error bodies with real HTTP status codes, never
a generic 500.

This also introduces the new contract event kind itself: `payloads/seat.left.v1.json`,
following the existing payload conventions in `contracts/README.md`. The envelope carries
"who" via `initiator` (as `seat.joined.v1` already does); the payload carries only what
changed. The schema is validated on both the Spine and the Shuffler/Tabletop sides,
failing loudly (not best-effort) on an unknown name/version, per the existing house rule.

Freeing a seat number must compose correctly with the Spine's existing
`next_available_seat_number` assignment logic — that logic is reused as-is, not changed,
but the newly-freed number needs to actually become available to it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `Table`/`Seat` models support releasing a seat by table + seat identity, deleting
      the `Seat` row
- [ ] Releasing a seat mints a `seat.left` event via `append_event!`
- [ ] `contracts/payloads/seat.left.v1.json` exists, follows existing payload
      conventions, and is validated on Spine and on Shuffler/Tabletop
- [ ] A new Roda route exposes seat release, following the existing
      exception→JSON-error-body convention used by the join route
- [ ] After a seat is released, `next_available_seat_number` can assign that freed number
      again
- [ ] Model-layer tests (`table_test.rb` pattern): one behavior per `test_...` method,
      `assert_raises` per invariant
- [ ] A dedicated event-shape assertion test for `seat.left`, mirroring the existing
      `seat_taken`-event-shape test

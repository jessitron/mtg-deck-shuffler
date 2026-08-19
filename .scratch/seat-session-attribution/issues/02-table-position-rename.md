# 02 — Rename "seat number" to "table position"

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

**What to build:** "Seat number" currently names both the seat's occupancy identity and
its 1-4 table slot, which is exactly the confusion that let `card.played` send
`String(spineSeatNumber)` where a real seatId belonged (fixed ad hoc in `544c932b`).
Rename the 1-4-slot concept to **table position** everywhere it appears, leaving the seat
occupancy's own identity (Seat ID, ticket 03) untouched:

- Spine: `Table#next_available_seat_number` and its call sites in
  `services/spine/models/table.rb` (`prepare_seat`, `Table.join!`) — rename to talk about
  table position.
- Contract: `contracts/payloads/seat.taken.v1.json`'s `payload.seat` field (currently
  `{ "type": "integer", "minimum": 1, "maximum": 4, "description": "Seat number at the
  table, 1-4." }`) — rename the field and its description to table position. Decide at
  implementation time whether the JSON key itself (`seat`) changes or only its
  description — check what `services/spine/test/models/table_test.rb`'s
  `test_take_seat_mints_a_seat_taken_event` currently asserts and keep it green (or update
  it deliberately) either way.
- Shuffler: `GameState.spineSeatNumber` and its call sites (`GameState.ts`, `app.ts`,
  `port-persist-state/types.ts`, `port-persist-prep/*`) — rename the *prose*/local
  vocabulary (comments, variable names in new code) to table position; the persisted field
  name itself may stay `spineSeatNumber` to avoid forcing a persistence-version bump.

Purely a rename — no behavior change. Table positions are still assigned sequentially and
still reused once a seat is freed (that reuse logic belongs to
`.scratch/leave-and-join-table/spec.md`, not this ticket).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `next_available_seat_number` (and callers) renamed to table-position vocabulary in
      `services/spine/models/table.rb`
- [ ] `contracts/payloads/seat.taken.v1.json`'s `payload.seat` field/description renamed to
      table position
- [ ] `services/spine/test/models/table_test.rb`'s seat.taken event-shape test updated to
      match whatever key/description change was made, still passing
- [ ] Shuffler-side prose/comments/new-code vocabulary updated to "table position"; the
      persisted `spineSeatNumber` field name is left as-is (no persistence-version bump)
- [ ] No behavioral change: table positions are still assigned sequentially, 1-4

## Comments

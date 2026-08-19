# 02 — Rename "seat number" to "table position"

Mountain: spine-gathers-data
Ship: fleet
Status: done

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

**Status:** done

- [x] `next_available_seat_number` (and callers) renamed to table-position vocabulary in
      `services/spine/models/table.rb`
- [x] `contracts/payloads/seat.taken.v1.json`'s `payload.seat` field/description renamed to
      table position
- [x] `services/spine/test/models/table_test.rb`'s seat.taken event-shape test updated to
      match whatever key/description change was made, still passing
- [x] Shuffler-side prose/comments/new-code vocabulary updated to "table position"; the
      persisted `spineSeatNumber` field name is left as-is (no persistence-version bump)
- [x] No behavioral change: table positions are still assigned sequentially, 1-4

## Comments

Renamed the 1-4 table-slot concept end to end, leaving the seat's own identity (seatId)
untouched:

- **Spine** (`services/spine/models/table.rb`): `next_available_seat_number` →
  `next_available_table_position`; `prepare_seat`'s and `take_seat!`'s `number:` param →
  `table_position:`; `join_outcome`'s `:seat_number` key → `:table_position`; error message
  text ("seat # ... already taken" → "table position # ... already taken"). The `Seat`
  model's own DB column (`number`) is untouched — out of scope, same as the persisted
  Shuffler field. `app.rb`'s internal references to `outcome[:seat_number]` were updated to
  `outcome[:table_position]` to match; its *external* wire vocabulary (`/join`'s JSON
  response key `seatNumber`, and the `seat.number`/now `table.position` span attribute
  name) is a separate HTTP API surface not named by this ticket, so it was left alone
  except fixing the one now-stale internal reference.
- **Contract** (`contracts/payloads/seat.taken.v1.json`): the `payload.seat` field was
  renamed to `payload.tablePosition` (JSON key changed, not just the description) — nothing
  else in the fleet read the old `seat` key, so this was a clean rename.
  `services/spine/test/models/table_test.rb`'s `test_take_seat_mints_a_seat_taken_event`
  (and the other seat-number-named test) were updated to match and stay green.
- **Shuffler**: `GameState.ts`, `app.ts`, `port-persist-state/types.ts`, and
  `port-persist-prep/*` already had no seat-number *prose* to rename — only the persisted
  `spineSeatNumber` field name itself, which stays as-is per the ticket. Cleaned up
  matching vocabulary in `apps/shuffler/CLAUDE.md`'s prose ("bare 1-4 seat position" / "a
  seat number never matches a seat GUID" → "table position").
- Spine suite: 79 runs, 232 assertions, 0 failures. Shuffler: 43 suites, 361 tests, all
  green (including `test/port-spine/cardPlayedContract.test.ts`).

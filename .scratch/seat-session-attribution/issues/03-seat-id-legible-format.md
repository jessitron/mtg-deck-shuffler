# 03 — Give Seat ID a legible format

Mountain: spine-gathers-data
Ship: spine
Status: ready-for-agent

**What to build:** `Table#prepare_seat` in `services/spine/models/table.rb` currently
mints a Seat ID as a bare `SecureRandom.uuid` (line 162). Change it to mint
`<player-name-slug>-<8hex>` instead — same mechanism (`SecureRandom` under the hood),
mirroring `TableSlug.mint` (`services/spine/lib/table_slug.rb`, which already builds
`"#{name_slug(table_name)}-#{SecureRandom.hex(4)}"`) — so a seatId reads as a name in
Honeycomb traces the same way a table id already does. Reuse `TableSlug`'s `name_slug`
helper (or extract it to somewhere both can share) rather than reimplementing
slugification.

Collision handling needs nothing beyond what `SeatOccupied` already guards: a
player-name-slug collision at the same table only matters combined with an (vanishingly
unlikely) 8-hex suffix collision, same reasoning as `TableSlug.mint`'s own comment.

Still Spine-minted, never Shuffler-minted — the earlier `notes/GLOSSARY.md` draft that
said otherwise was a corrected error; don't reintroduce it.

**Blocked by:** 02 — Rename "seat number" to "table position" (same method,
`prepare_seat`; landing the rename first keeps this diff clean).

**Status:** ready-for-agent

- [x] `Table#prepare_seat` mints seat ids shaped `<player-name-slug>-<8hex>`, not a bare
      UUID
- [x] Slugification is shared with (not duplicated from) `TableSlug.mint`'s `name_slug`
      helper
- [x] `services/spine/test/models/table_test.rb`'s seat.taken/seat.joined event-shape test
      asserts the new format (`<slug>-<8hex>`, not a bare UUID)
- [x] `services/spine/test/test_helper.rb`'s envelope-building helpers updated if they
      construct seat ids
- [x] Contract-level test (Shuffler side, `apps/shuffler/test/port-spine/
      cardPlayedContract.test.ts`, mirroring the `544c932b` fix) still validates with the
      new format

## Comments

`Table#prepare_seat` (`services/spine/models/table.rb`) now mints
`seat_id = "#{TableSlug.name_slug(player_name)}-#{SecureRandom.hex(4)}"`, reusing
`Spine::TableSlug.name_slug` (already required by `table.rb` for `TableSlug.mint`) rather
than duplicating slugification. Added a new test to `table_test.rb`,
`test_take_seat_mints_a_seat_id_shaped_like_a_player_name_slug_plus_hex_suffix`, asserting
`seat.id` matches `/\Ajess-[0-9a-f]{8}\z/`; confirmed it failed against the old bare-UUID
mint before the change, and passes after.

`test_helper.rb` needed no change — its `SecureRandom.uuid` usages build arbitrary
envelope/initiator values for tests unrelated to `prepare_seat`'s minting (e.g. gameId,
event id, an `initiator.seatId` used only to check that `append_event!` preserves
whatever value it's given), not seat ids constructed to mirror the new format.

The Shuffler's `cardPlayedContract.test.ts` needed no change either: `FakeSpineGateway`
already mints its own `fake-seat-<tableId>-<seatNumber>` seatId independent of the real
Spine, and `contracts/payloads/card.played.v1.json`'s `seatId` is a bare non-empty-string
check with no format constraint — both already validate against the new shape.
Full suites green: Spine (`bin/test`, 85 runs/238 assertions) and Shuffler
(`npx jest`, 43 suites/364 tests), plus `npm run build`.

Consulted `fleet-is-observable-context` before implementing (seat.id feeds a Honeycomb
span attribute per the game.id/seat.id correlation work) — no format contract existed to
violate, and the change is a legibility upside for that owner. Ran
`fleet-is-observable-update` after landing to record the new shape.

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

- [ ] `Table#prepare_seat` mints seat ids shaped `<player-name-slug>-<8hex>`, not a bare
      UUID
- [ ] Slugification is shared with (not duplicated from) `TableSlug.mint`'s `name_slug`
      helper
- [ ] `services/spine/test/models/table_test.rb`'s seat.taken/seat.joined event-shape test
      asserts the new format (`<slug>-<8hex>`, not a bare UUID)
- [ ] `services/spine/test/test_helper.rb`'s envelope-building helpers updated if they
      construct seat ids
- [ ] Contract-level test (Shuffler side, `apps/shuffler/test/port-spine/
      cardPlayedContract.test.ts`, mirroring the `544c932b` fix) still validates with the
      new format

## Comments

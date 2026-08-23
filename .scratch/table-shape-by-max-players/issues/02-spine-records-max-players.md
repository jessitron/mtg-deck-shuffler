# 02 — Spine: table.created records maxPlayers at creation

**What to build:** The first player to create a table states a max-players value (2–4),
and the Spine records it once, at table creation — not to enforce it yet, just because a
table's declared size is an administrative fact that belongs in the Spine's log.
`Table.join!`/`Table.create_with_event!` gain a `max_players` parameter (defaulting to 4),
written once when a table is first created via a new `tables.max_players` integer column
(migration, following the existing additive-column pattern). The `table.created` event
payload gains a matching `maxPlayers` field, consistent with how `name`/`creator` already
live as both column and event field. A second (or third, fourth) join at the same table
name ignores whatever `max_players` that later request carries — the stored value never
changes after creation, mirroring the Tabletop's own draw-once guard. No enforcement:
`Table::SEAT_NUMBERS`, `next_available_seat_number`, and `TableFull` are untouched — those
already cap every table at the hard 4-seat limit today (`TableFull`, HTTP 409), independent
of the new declared `maxPlayers`; a table can still be joined past its own declared max
today, and that gap is intentionally out of scope here.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `tables` gains a `max_players` integer column, defaulting to 4, via migration
- [ ] `Table.create_with_event!` accepts `max_players` and stores it once on the row
- [ ] `table.created`'s event payload carries a matching `maxPlayers` field
- [ ] A second join at an existing table with a different `maxPlayers` value leaves the
      stored value unchanged
- [ ] `join_test.rb` (or equivalent) proves both of the above

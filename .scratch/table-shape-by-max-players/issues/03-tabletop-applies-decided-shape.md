# 03 — seat.joined v2: Tabletop applies the decided shape once

**What to build:** `seat.joined`'s payload gains a required `maxPlayers` field — a new
contract version (`contracts/payloads/seat.joined.vN.json`, per `contracts/README.md`'s
versioning rule; check `contracts/payloads/seat.joined.v*.json` at build time for the next
free version number rather than assuming one). The Tabletop's in-memory `RoomEntry`
(`apps/tabletop/src/server/rooms.ts`) gains a `maxPlayers` field, populated once from the
first `seat.joined` event a table ever receives (defaulting to 4 if a stored value is ever
missing). `ensureStackDrawn` keeps its existing "only once, guarded by
`entry.seats.size === 0`" behavior — the change is that the shape it draws now comes from
`entry.maxPlayers` via ticket 01's `stackBounds(maxPlayers)`/`playerAreaOrigin(maxPlayers, ...)`
instead of the fixed constant. `apps/tabletop/DESIGN.md`'s "How a table comes into being"
section is updated to describe the max-players-carrying `seat.joined` call.

Consult `owners/tabletop-shape-mechanics` before finalizing the plan — the draw-once guard
is exactly its territory, and this ticket changes what it draws from.

**Blocked by:** 01 (needs `stackBounds`/`playerAreaOrigin` parameterized by `maxPlayers`)

**Status:** ready-for-agent

- [ ] `seat.joined` v2 contract requires `maxPlayers`
- [ ] `RoomEntry` gains `maxPlayers`, set once from the table's first `seat.joined` event
- [ ] `ensureStackDrawn` draws the shape from `entry.maxPlayers`, still only once per table
- [ ] Posting `seat.joined` with `maxPlayers: 2` directly to the Tabletop's HTTP seam
      (`POST /api/tables/:tableSlug/events`) results in the narrower rectangle being drawn,
      provable without the Shuffler UI
- [ ] `apps/tabletop/DESIGN.md`'s "How a table comes into being" section reflects the new
      contract field

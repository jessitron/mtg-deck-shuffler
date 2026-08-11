# 03 — Join a table by name, get a seat

Mountain: spine-tells-the-story
Ship: spine
Status: ready-for-agent

**What to build:** `POST /join` (or an equivalent path — the naming is an implementation
detail) takes `{name, playerName}` and returns `{tableId, seatNumber}`. If no active
table has that name, one is created first (minting a `table.created` event), then a seat
is taken (minting a `seat.taken` event). Seat auto-assignment is 1–4; taking an
already-occupied seat or joining a full table is rejected. Table names are unique among
active tables. This single endpoint replaces today's `POST /tables`, `POST
/tables/:table_id/seats`, and `GET /tables/lookup` — none of those three exist in the new
app.

**Blocked by:** 02

- [ ] `POST /join {name, playerName}` on a never-seen name creates the table and seats
      the player, returning `{tableId, seatNumber: 1}`
- [ ] A second `POST /join` with the same name and a different player returns the same
      `tableId` and the next open seat number
- [ ] Joining a table that already has 4 seated players is rejected
- [ ] Table names are unique among active tables (domain invariant carried over
      unchanged)
- [ ] Domain unit tests cover table creation, seat assignment, seat-occupied, and
      table-full branching without going through HTTP
- [ ] HTTP integration tests hit `POST /join` end-to-end and assert on status codes and
      response bodies

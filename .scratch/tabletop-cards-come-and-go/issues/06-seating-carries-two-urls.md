# 06 — Seating carries the two URLs; the library links home

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**`gameUrl` already shipped** as part of the Spine join work: `seat.joined.v1` carries it,
the Shuffler mints it and stores it on `TableInfo`/`GameState`, and the Tabletop uses it
for the library furniture's clickable link. That part of this ticket is done.

**What's left:** this ticket originally also planned an `eventsUrl` field — a
Shuffler-minted inbox URL the Tabletop server would POST events back to. That transport
is superseded: the return channel routes through the Spine instead (see
`.scratch/shuffler-spine-sse-subscriber/`, where the Shuffler opens its own Spine SSE
subscription rather than exposing an HTTP inbox). No `eventsUrl` field is needed. Confirm
with that spec's design before doing any further work here — this ticket may be fully
subsumed by it.

- [x] `gameUrl` on `seat.joined`, minted by the Shuffler, used for the library link
- [ ] Confirm no remaining work in this ticket once `shuffler-spine-sse-subscriber` lands

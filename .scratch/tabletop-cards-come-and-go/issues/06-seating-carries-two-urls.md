# 06 — Seating carries the two URLs; the library links home

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** `seat.joined.v1` gains two Shuffler-minted URL fields: `gameUrl` (public,
player-clickable — becomes the library furniture's link target) and `eventsUrl` (where the
Tabletop *server* will POST events back; minted from the environment-appropriate base —
localhost in dev, cluster-internal name in prod). The Shuffler sends both on every
`seat.joined`. The Tabletop stores both per seat in memory, composes no URLs itself, and
needs zero Shuffler-related configuration. Replaying `seat.joined` on Tabletop start/restart
re-establishes the mapping. The library furniture on the table becomes a clickable link to
`gameUrl`.

No `gameId` crosses the boundary — the id stays the Shuffler's private business.

**Blocked by:** 05 — needs contract validation in place for the amended `seat.joined.v1`.

- [ ] `seat.joined.v1.json` gains required `gameUrl` and `eventsUrl` fields (no `gameId`)
- [ ] The Shuffler mints both URLs correctly in dev and prod
- [ ] The Tabletop stores `gameUrl`/`eventsUrl` per seat in memory
- [ ] Restarting the Tabletop and replaying `seat.joined` re-establishes the per-seat URLs
- [ ] The library furniture on the table links to that seat's `gameUrl`
- [ ] Clicking the library link from a running table opens the correct Shuffler game

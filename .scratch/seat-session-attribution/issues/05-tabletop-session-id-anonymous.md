# 05 — Tabletop session id: persists across refresh, plus anonymous pseudonym

Mountain: spine-gathers-data
Ship: tabletop
Status: ready-for-agent

**What to build:** Unlike the Shuffler, the Tabletop has no durable anchor like `gameId`,
so its `sessionId` must itself survive a refresh — this is the Tabletop client's first use
of `localStorage`/`sessionStorage` for anything (confirmed absent today; also flagged as
missing by `tabletop-view-rotation`'s spec).

- A seated visitor (arrived via `?seat=<seatId>`, ticket 06) gets a `sessionId` persisted
  client-side across a refresh, so prior actions during this visit stay attributed to the
  same session.
- An unseated visitor (a spectator, or anyone on a bare `/t/<slug>` URL) gets a pseudonym
  shaped `anonymous-<word>-<word><random>` (e.g. `anonymous-hippo-234134tr`) — a visibly
  different shape than a real seatId's `name-slug-8hex`, so interpretation can tell a real
  occupant from a pseudonymous visitor without a separate flag. This pseudonym doubles as
  both the session's identity token (`sessionId`) and its display label (no separate
  display-name concept needed), and persists across a refresh but isn't meant to be
  permanent.
- Per `docs/agents/coding-standards.md`, the `anonymous-` prefix is exported as a named
  constant from the module that defines it, since ticket 04's contract description and any
  future consumer need to agree on it.
- `initiator` becomes `{ seatId?, sessionId }` shaped for the Tabletop the first time it
  emits an envelope-level event itself — it doesn't yet, so this ticket is the
  generator/persistence logic in isolation, not wiring into an actual send.

**Blocked by:** 04 — Add `sessionId` to the envelope; Shuffler mints one per page load
(defines the field/shape this ticket implements the Tabletop side of).

**Status:** ready-for-agent

- [ ] Tabletop mints and persists (survives a simulated refresh) a `sessionId` for a
      seated visitor via client-side storage
- [ ] Tabletop generates an `anonymous-<word>-<word><random>` pseudonym for an unseated
      visitor, persisted the same way
- [ ] The `anonymous-` prefix is a named, exported constant, not hand-copied
- [ ] Unit test covers pseudonym format and persistence across a simulated refresh (per
      `mattpocock-skills:codebase-design` guidance — a unit test is the right seam here,
      not a browser test) for both the seated and unseated cases

## Comments

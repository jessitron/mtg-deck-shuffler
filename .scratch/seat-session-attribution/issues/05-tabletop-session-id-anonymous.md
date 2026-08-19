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

- [x] Tabletop mints and persists (survives a simulated refresh) a `sessionId` for a
      seated visitor via client-side storage
- [x] Tabletop generates an `anonymous-<word>-<word><random>` pseudonym for an unseated
      visitor, persisted the same way
- [x] The `anonymous-` prefix is a named, exported constant, not hand-copied
- [x] Unit test covers pseudonym format and persistence across a simulated refresh (per
      `mattpocock-skills:codebase-design` guidance — a unit test is the right seam here,
      not a browser test) for both the seated and unseated cases

## Comments

Implemented 2026-08-19. New module `apps/tabletop/src/client/sessionId.ts`:
`getOrCreateSessionId(seatId: string | undefined, storage: Storage): string` reads/writes a
single `localStorage`/`sessionStorage`-shaped key (`tabletop.sessionId`); `storage` is injected
rather than reaching for `window.localStorage` directly, which is what makes this a unit-test
seam instead of a browser test. A seated visitor (`seatId` defined) gets `crypto.randomUUID()`;
an unseated one gets `generateAnonymousPseudonym()`, shaped
`anonymous-<word>-<word><random-8-chars>` — visibly different from a real seatId's
`name-slug-8hex`. `ANONYMOUS_SESSION_ID_PREFIX` ("anonymous-") is exported per
`docs/agents/coding-standards.md` so ticket 04's envelope description and any future consumer
agree on it without hand-copying the literal.

Not wired into an actual envelope send (Tabletop doesn't emit envelope-level events itself
yet, per this ticket's scope) and not wired to the `?seat=` query param (ticket 06).

Tests: `apps/tabletop/test/sessionId.test.ts`, 7 new cases — pseudonym format/randomness,
seated vs. unseated session id shape, and persistence across a simulated refresh (same
in-memory `FakeStorage` instance reused across two calls) for both cases, plus a case showing
two independent storages don't collide. Full Tabletop suite green (154 tests, 17 files) —
this worktree's root `node_modules` was missing entirely (`npm install` had never been run
here), which broke 7 unrelated pre-existing test files needing `undici`; ran `npm install` at
the repo root to fix it, not a code change.

No owner consulted — this is a standalone client module with no UI, no tldraw `ShapeUtil`
hooks, no card-face rendering, and no telemetry wiring; none of `owners/INDEX.md`'s triggers
match, and no client-storage owner exists yet.

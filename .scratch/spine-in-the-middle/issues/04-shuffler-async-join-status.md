# 04 — Shuffler: `/game` stops waiting on the join; status UI + domain-log entry

Mountain: spine-gathers-data
Ship: shuffler
Status: ready-for-agent

**What to build:** `/game` renders immediately instead of waiting on the Spine join
(a slow or unreachable Spine no longer delays seeing your hand). The join fires
unawaited from the request/response cycle, `.catch()`-guarded, same best-effort spirit
as today. The `/game` page gets a small HTMX status element, polling a new endpoint,
that shows nothing while no join has been attempted, a transient "joining the table…"
while pending, and either nothing further (success) or a dismissible warning banner
(failure) once the outcome is known. A successful join is logged in the Shuffler's own
domain log (narration-visible, same log used for other things that happen during a
game) — a failed join stays UI-only, not logged there.

This layers async behavior on top of ticket 03's already-working synchronous flow; the
game keeps working throughout.

**Blocked by:** 03

- [ ] `/start-game`, `/restart-game`, `/yo` render their response first; the join call
      fires after, unawaited, `.catch()`-guarded
- [ ] A small per-game "join outcome" slot — riding on `PersistedGameState`'s existing
      optional `spineTableId`/`spineSeatNumber` fields, no version bump — records
      pending/success/failure
- [ ] New `GET /games/:gameId/table-status`-style endpoint reads that slot
- [ ] `/game` page gets an HTMX element polling that endpoint: silent while unattempted,
      "joining the table…" while pending, silent on success, dismissible warning banner
      on failure
- [ ] A successful join appends an entry to the Shuffler's own domain log (e.g. "joined
      table `<name>` as seat `<n>`") via the same log/record mechanism used for other
      narrated happenings (`apps/shuffler/src/GameState.ts`)
- [ ] A failed join is not written to that domain log (UI-only; the existing
      `log.warn`/span-attribute best-effort precedent already answers "which games have
      a Spine-record gap" from Honeycomb)
- [ ] `apps/shuffler/CLAUDE.md`'s Table Mode section is updated to describe the one
      Spine call instead of two separate Tabletop/Spine sends, and the async
      render-then-join sequencing
- [ ] Jest test on the new table-status endpoint covering pending/success/failure states
- [ ] `npm test` passes

# ADR-0004 — A stage boundary is a consistency point

**Status:** accepted

## Context

A journey's stages do world-touching work that cannot be transactionally rolled back.
Something still has to bound what a crash, a retry, or a concurrent delivery can
corrupt. An early implementation saved the run in an `ensure` *around* stage
execution — outside outcome handling — so a save that raised after a decided outcome
left partial mid-body writes for the next delivery to pick up silently, and two
concurrent deliveries of one row could both read `over? == false` and both traverse.

## Decision

**A journey promises consistency *between* stages and none *during* one.** State
crossing a stage boundary is committed or it is not; nothing mid-stage is ever
projected.

- Snapshots capture only at boundaries, and specifically **inside outcome
  application** — a stage that escapes without reaching an outcome (a `StageError`,
  a `ListenerError`, any misuse) projects nothing, and the row holds at the boundary
  it last reached.
- Retry re-runs a **whole** stage; a snagged stage's mid-flight state carries no
  coherence promise. Consistency checks assert around steps, never within.
- **Two suspension tiers** follow: *ephemeral* suspension (a fiber yield —
  [ADR-0021](0021-the-fiber-outfit.md)) may occur mid-stage and lives only
  in-process; *durable* suspension (snapshot serialization, cross-process resume) is
  boundary-only. Only boundaries ever serialize.
- **A store failure is not a stage failure.** `Journey::StoreError` is in the
  `StageError` family, so no stage rescue can fold it into a snag; it escapes to
  whoever owns retries. `StaleStoreError` is its one actionable subclass: the journey
  tables carry `lock_version`, so single-flight belongs to the framework — the losing
  delivery's retried job re-`find`s a fresh row, exits if the winner finished, and
  otherwise resumes from the winner's boundary. One mechanism also interlocks
  abandonment and purge against a live writer.
- Transactional effects ride the same boundary: mail claims settle at outcome
  application ([ADR-0019](0019-mail.md)); provisional next-stages commit only on
  completion ([ADR-0002](0002-registers-itinerary-transactional-step.md)).

## Consequences

- Crash-window reasoning is local: whatever a half-run stage did stays unprojected,
  and a resumed run re-enters that stage from the top. Stage authors write for
  re-entry (idempotency guards, `enacted?`, `unique_by:` —
  [ADR-0006](0006-enactments.md)) rather than for mid-stage recovery.
- Anything that must survive a boundary must be a declared snapshot member
  ([ADR-0008](0008-snapshots.md)); anything that must *not* repeat across one needs a
  guard the registers can answer.
- Effects that must not straddle a crash window split across two stages — the
  create-then-drive rule for durable children ([ADR-0012](0012-excursions.md)) is
  this decision applied to a specific hazard.

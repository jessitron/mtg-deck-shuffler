# ADR-0009 — Snapshot schema versioning: restore never guesses

**Status:** accepted

## Context

Snapshots outlive the classes that captured them: a run can snag across a deploy
that reshapes what its journey snapshots. A restore that guessed at a stale shape
would corrupt state silently, at the worst possible moment — mid-resume, in a
background job.

## Decision

Every snapshot carries the schema version of the class that captured it, and restore
dispatches on it:

```ruby
snapshot_version 2
snapshot_upcast(from: 1, to: 2) {|members| members.merge(thing: normalize(members[:thing])) }
```

- `snapshot_version N` declares (inherited; a subclass may bump independently;
  undeclared reads as 1). Bump whenever a member's presence or format changes.
- `snapshot_upcast(from:, to:)` registers a **single-step** transform over the
  captured members Hash; `to:` must be exactly one above `from:`, and restore chains
  consecutive steps (1→2→3) automatically.
- Dispatch, through one chokepoint shared by the in-memory and AR `after_find`
  restore paths: equal → restore unchanged; bridgeable gap → run the chain; missing
  step, or a stored version newer than the class's own → raise
  `Journey::SnapshotVersionMismatch` (a `StageError`) **before any ivar is touched**.
- AR-backed journeys stamp a `snapshot_schema_version` column (default 1, not null)
  on every boundary write and check it on load. It is not a snapshot column, so the
  purge never clears it.
- **A snapshot with no members skips the gate**: a version stamps what members
  *mean*, so with none there is nothing to misinterpret — which keeps every
  already-finished row loadable after a bump, and stops an upcaster from
  manufacturing data over an empty hash.

## Consequences

- A version-stranded run fails loudly and diagnosably instead of restoring garbage;
  the failed job is the trace (a load failure has no journey to record on, so
  `JourneyJob` must not discard it).
- The upcaster registry is the deliberate, reviewable place shape migrations live —
  a chain of small steps rather than one clever transform.
- Forgetting the bump is the anti-pattern: changing what a member captures without
  `snapshot_version` + `snapshot_upcast` trades a named error for silent corruption.

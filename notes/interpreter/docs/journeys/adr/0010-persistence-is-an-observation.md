# ADR-0010 — Persistence is an observation

**Status:** accepted

## Context

Durability could have been baked into the machinery (every journey knows how to save
itself) or bolted on per class (each journey hand-writing column updates). The first
couples a pure-Ruby core to ActiveRecord; the second scatters the boundary rule
([ADR-0004](0004-a-boundary-is-a-consistency-point.md)) across the fleet and lets a
save site drift outside outcome application — which shipped, once, as an after-stage
`ensure` that projected mid-stage state.

## Decision

**All persistence mapping is from snapshots, and the wiring is a listener.**

- `include Briefasaurus::ActiveRecordJourney` is **sugar over observation**: all it
  contributes is a `Journey::PersistenceListener` watching its own journey, plus AR
  ergonomics — identity, finders, `launch`, the `after_find` load path. The machinery
  holds no persistence knowledge.
- The listener subscribes to the **outcome events**, which is what places the write
  inside outcome application: a journey at rest is always durable (every commit and
  snag writes); a stage that escapes without an outcome writes nothing.
- Every write rides `#snapshot` through a **store** (`Journey::Store::ActiveRecord`)
  mapping registers onto ordinary columns — `log` (JSON), `cursor` → `stage`,
  `error` → `error_message`, `failed`, `enacted` — and each declared member with a
  same-named column as JSON. Projection stays columnar so reporting can query run
  tables. A member with no matching column stays in-memory only.
- **The store, not the journey, ends resumability**: arrival and abandonment take the
  members-blanking write ([ADR-0008](0008-snapshots.md)).
- A store failure escapes as `StoreError`; staleness (`lock_version`) as
  `StaleStoreError`, which `JourneyJob` retries — re-`find`, exit if the winner
  finished, resume from the winner's boundary otherwise
  ([ADR-0004](0004-a-boundary-is-a-consistency-point.md)).
- Async dispatch is `.launch`, which routes through the outfit's launch strategy and
  enqueues the shared `Briefasaurus::JourneyJob` (find → `traverse!`). A bespoke job
  class re-creating the run bypasses the seam and duplicates the machinery.
- **`reload` does not refresh the registers** — `after_find` does. A journey whose
  row changed underneath keeps stale in-memory registers; load a fresh instance when
  the question is what the row now says.
- **Table ownership:** a migration lands in engine `db/migrate` only when the engine
  can guarantee the table exists in every host; `DeduplicationRun`'s table is
  CouchDB-backed in at least one real host, so its migrations live in
  `spec/dummy/db/migrate`. Match the table's existing migration home.

The store protocol (`write` / `write_without_members`) is the framework's; the AR
store and `ActiveRecordJourney` are the host's concretization, on the app side of the
line ([ADR-0023](0023-the-framework-host-boundary.md)).

## Consequences

- A plain `Journey` is testable with no database anywhere; persistence is a growth
  direction (swap the include), transparent to most clients.
- An alternate store is a store swap, not a rewrite.
- Nothing mid-stage is ever projected, by construction — the placement requirement is
  satisfied by *what the listener subscribes to*, not by discipline at save sites.
- Growing a run onto `ActiveRecordJourney` extends its lifetime, which drags in the
  durable-authority rule — [ADR-0022](0022-durable-journeys-need-durable-authority.md).

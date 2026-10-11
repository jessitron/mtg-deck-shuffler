# ADR-0016 — Succession: `exec` hands work on and does not return

**Status:** accepted

## Context

Nesting is `fork`: the parent stays on the stack and waits. A long-lived,
program-shaped journey that moves through phases it will never return through —
authenticate, then gather requirements, then serve — would accumulate a frame per
phase under `excurse`, for parents that exist only to wait on successors.

## Decision

**`exec` is a tail call between journeys**: this journey hands its remaining work to
a different journey and does not return.

```ruby
stage def authenticate = exec(GatheringRequirements, session:)
```

- The successor is **provisional until the declaring stage completes** — `stage
  :other` one level up — so a stage that snags after `exec` leaves none behind.
  The predecessor reaches `:finished` normally at the same boundary; no new outcome
  state exists.
- **The conveyance loops onto the successor.** A journey that finished having handed
  its work on has not stopped — it has moved, and the thing driving it moves with
  it. `traverse` still returns `self`; `traverse!` raises on what the *end of the
  chain* did (`journey_last`), not on the predecessor's clean finish.
- **Fresh log, linked ledger.** The successor starts a fresh log — `past?(:x)` stays
  "I did this," not "someone in my lineage did this" — while `enacted?` /
  `enacted_at` walk back through `journey_predecessor`, because an idempotency
  guard that weakens at a succession boundary is not one.
- The successor inherits the outfit; no frame is added; nobody waits. A tree walk
  renders a succession as a link in a chain, never as a child.
- Durably, a successor is its own row carrying `succeeds_run_id`; the migration
  ships with the first fleet journey that execs. Until then a resumed successor
  loses its link (and the guard's cross-succession reach) — a stated limit.

## Consequences

- Reach for `exec` when a journey has genuinely finished its own business and
  something else takes over — never to jump stages (that is `stage :name`) and never
  where the parent needs the child's result back (that is `excurse`).
- `past?` stays a local question everywhere; program-trace questions belong to the
  chain, not the log.

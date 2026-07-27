# ADR-0018 — The tree walk belongs to the outfit

**Status:** accepted

## Context

The motivating case is a whole program: journeys all the way up, everything in
flight at every depth, and someone wants to save it, inventory it, or diagnose it. A
journey cannot answer "tree-walk me" — once children are half-finished, fibered, or
threaded, only the execution environment knows where they all are or can hold them
still. And a parent's children are a **tree**, not a stack: a snagged excursion
whose parent went on to start a different child is off the driving chain and still
live state. The driving chain is only the tree's rightmost path.

## Decision

**A walk is requested of the outfit; the mechanism is a true Visitor.**

- `excurse` and `detach` register children on the parent's live `Children` register
  (pruned when a child is over), so the tree covers **what exists**, while a save
  carries **what a class declared** — not a gap: an inline excursion belongs either
  to a completed stage (done with its excursions) or an unclosed one (never part of
  consistent state), so create-then-excurse remains the whole rule for a child that
  must survive ([ADR-0012](0012-excursions.md)).
- The journey `journey_accept`s a visitor — **one callback per kind of element**:
  one per framework register (a closed set, each treated differently),
  `visit_member(name, value, **options)` with the declaration riding verbatim,
  `visit_child(name, journey:, reference:, address:)` where the **node offers and
  the visitor chooses** (capture a durable child whole, or emit a placeholder
  because the row is the record), opt-in-by-absence `visit_stray` for unaccounted
  ivars, and an `enter_journey`/`leave_journey` frame pair whose `leave` return value
  *is* the frame's artifact, so a descending visitor composes a tree functionally. A
  single `visit(kind, …)` was rejected: it pushes dispatch into every visitor and
  turns adding a kind into an audit of every `case`.
- **A snapshotting walk is boundary-only**, and a conveyance that cannot promise
  quiescence **refuses** it rather than emitting a torn artifact (the inline loop is
  always quiescent between stages; a fiber outfit stops by not resuming; a thread
  outfit needs a barrier). Every other visitor — inventory, diagnostics, purge
  reach, operator renderings — may walk torn and says so.
- **Addresses come from declarations, never minted ordinals.** A node is addressed by
  a frozen Symbol path from the mediating outfit's root: a single-occupant child by
  its declared/synthesized name, a detached set's members through the collection
  holding them (`[:run, :fetches, 0]`). Repeated inline excursions of one class share
  an address deliberately — an invented `:item_interpretation_2` would be an
  identity `excurse` never asks the provisioner for.
- **Resume is a provisioner**: a restored child is provided under the name it was
  addressed by, so a re-entering parent excurses normally and gets its own child
  back; only children whose address was unique in the walk are provided back — the
  rest re-run under the synthesized-name fall-through, which is what "never promised
  a stable name" entitles them to. State round-trips, control re-derives.
- `#snapshot` itself ships as the **degenerate visitor** — one journey, no descent —
  which is the acceptance test that the callback set is right.
- There is no bare `accept` (a friendly public one would advertise exactly the
  "tree-walk me" this decision forbids) and no bang form (the walk's mechanism is
  not a bypass of it).

## Consequences

- Different artifacts are different visitors over one walk; adding one never touches
  the machinery.
- What may be lost in a save is principled: caches and recreatable work; never a
  declared member.
- The journey stack becoming an outfit element (beside the conveyance) is where a
  walk asks what is in flight; the fiber outfit's lobby is its first concrete form
  ([ADR-0021](0021-the-fiber-outfit.md)).

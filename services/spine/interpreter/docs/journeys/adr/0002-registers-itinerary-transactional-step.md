# ADR-0002 — Registers, itinerary, and the transactional step

**Status:** accepted

## Context

The framework's predecessor kept all traversal state in one `@log` array: the current
position was derived as `log.last`, repeats raised, and the walk was a hand-written
loop per journey. That single register could not express retry (a repeated stage), a
forward jump (the next stage is a plan, not a history entry), or resumption (where do
we pick up?). Resumability, snapshots, and verification all demand the same thing:
framework state that is plain and enumerable, domain state that is declared, nothing
load-bearing hiding in an opaque ivar.

## Decision

Traversal state is **separate registers** plus the plan they walk:

| Register | Meaning |
|---|---|
| **log** | append-only *history* of completed stages; tolerates repeats |
| **cursor** (`stage`) | forward *program counter*: the stage to attempt next |
| **error** | the error from the most recent snag or failure, or nil ([ADR-0003](0003-terminality-is-declared.md)) |
| **enacted** | ledger of effects handed over ([ADR-0006](0006-enactments.md)) |

The **itinerary** is the ordered plan: the framework's `:provision` stage
([ADR-0005](0005-needs-substitute-collaborators-never-authority.md)), then `:depart`,
each `stage`-declared method in declaration order, then `:arrive`. `:depart`/`:arrive`
are blank, overridable lifecycle stages (overrides must call `super` — enforced by the
`Briefasaurus/JourneyLifecycleSuper` cop, future-proofing base-hook additions);
`:finished` is the one reserved sentinel, reached only through `:arrive` — user code
writing `stage :finished` raises `StageError`. `diversion` declares jump-only stages:
reachable via `stage :name` from a running stage, never walked by default, falling
through afterward to the itinerary position the cursor last held.

A **conveyance** — the mover — drives the walk. It is a stepping generator over the
journey; `continue` pulls one step, `traverse`/`traverse!` pull them all, and holding
the enumerator and driving it by hand is condoned, not a workaround. Correctness lives
in the private **`journey_do_stage`** primitive every driver yields:

1. Run the stage the cursor points at.
2. Normal return → the provisional next (set by `stage :x` inside the body) commits,
   or the cursor falls through to itinerary-next by position; the stage is appended to
   the log; `error` clears.
3. Snag → provisional discarded, cursor **holds**, `error` set, stage not logged.
4. `fail!` → terminal; the walk stops for good.
5. `StageError` or any non-`StandardError` → misuse; propagates through everything.

The program counter is derived from the log, not stored: a diversion never moves it,
which is what makes a diverted-and-restored journey fall through correctly.

`traverse`/`traverse!` both return `self` — the journey is its own record. Both take
targets: `traverse(to: :call_llm)` parks the cursor *on* the stage,
`traverse(through: :strip_noise)` stops once it has committed; target names are
validated eagerly, both kwargs together raise `ArgumentError`. Cursor *writes*
(`stage :x`) validate lazily — resolution happens in the step primitive.

**Position is asked by stage name, never by counting.** `at?(:name)` reads the
cursor; `past?(:name)` reads the log (repeat-tolerant, so a diverted-back stage reads
`past?` and `at?` true together — a feature of the log-based reading);
`ahead_of?(:name)` is `!past?`, uniform across itinerary stages and diversions. Every
declared stage also gets generated `at_<name>?`/`past_<name>?` sugar; an unknown name
raises `StageError` eagerly, never a silent `false`; a generated name colliding with
an existing method raises at declaration time.

## Consequences

- Every consumer — blessed verbs, bespoke enumerator drivers, REPLs, fiber
  conveyances — gets identical semantics, because commit-or-park lives in one place.
- Retry is first-class: step a parked journey again and the same stage re-runs.
- `log.include?("call_llm")` and step-count literals in specs are smells;
  `past_call_llm?`, `at?(:stage)`, and `staged_at` (see the
  [testing guide](../guide/16-testing.md)) say the same thing without coupling to
  itinerary shape.
- The plain-and-enumerable register set is what makes snapshots
  ([ADR-0008](0008-snapshots.md)), persistence ([ADR-0010](0010-persistence-is-an-observation.md)),
  and verification possible without special cases.

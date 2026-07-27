# ADR-0003 — Terminality is declared, never inferred — from either side

**Status:** accepted

## Context

Frameworks habitually infer failure from exceptions, which makes an outage and an
answer indistinguishable: an expired OAuth token (retry fixes it) and a revoked
consent (no retry ever will) both surface as a raise. Inferring terminality either
kills retryable runs or — worse — retries forever against a run that can never move,
holding email-derived columns the whole time. Separately, real systems need to end
runs *from outside*: purges, revocations, retention sweeps, and stranded jobs all had
to improvise (`update_all(failed: true)` hand-rolled in a privacy sweeper) because
the framework named no verb for it.

## Decision

A stage signals its outcome by how it returns, and only business logic may declare an
outcome terminal:

- **Normal return** → the stage commits.
- **`error!(value)`**, or a raised `StandardError` (sugar for the same thing) → the
  journey **snags**: cursor holds, `error` set, retryable. `error?` true,
  `failed?` false.
- **`fail!(reason)`** → terminal, business-declared failure, spoken from *inside* a
  running stage. The framework never infers failure from an exception.
- **`abandon!(reason)`** → terminal, declared from *outside* a parked run: the world
  revoked the run's mandate (a purge, a revocation, a retention sweep, a stranded
  job). Same register footprint as `fail!` — no new state, no new predicate — but a
  register write plus a boundary save rather than a throw, so it works on a run
  nobody is stepping. Cursor and log stay put (how far it got stays diagnosable);
  snapshot columns clear, because resumability is over. It guards disposability
  first, so a settled outcome is never rewritten. (`cancel!` was rejected: it
  collides with domain cancellation and implies the traveler's own polite choice.)
- **`fail_on Matcher`** declares, once per class, which *raised* errors are answers
  rather than outages. Matchers are anything answering `===` — the semantics are
  Ruby's own exception matching — and declarations accumulate and inherit. It reaches
  raises the stage never sees (an adapter, a gate, a library) and survives an
  excursion boundary: a child that *snagged* still snags the parent (parked is
  resumable), while a child that *failed* fails it, carrying the child's reason.
  `fail_on StandardError` is inference wearing a declaration's coat and ends retry as
  a concept; declare the errors that are genuinely answers. The test: can the
  condition change on its own? A revoked consent cannot (declare it); an exhausted
  credit allowance can (deliberately don't).
- **`StageError`** (in the `ScriptError` family) means the machinery was misused; it
  is never caught by the failure-handling path and never parks the cursor.

Predicates read the registers: `succeeded?` = finished with no error; `snagged?` =
`error?` && !`failed?`; `halted?` = nothing left to step right now; `over?` =
`finished?` || `failed?` — the disposability guard's question. `error` may hold an
Exception or any interpretable error-ish value; `traverse!` raises it (wrapping
non-exceptions in `JourneyError`).

A snag nothing will ever retry is an abandonment in fact: `RetentionSweep` is
scheduled abandonment over runs untouched past the resumability window, not a new
mechanism.

## Consequences

- Retry loops cannot spin on permanently-dead runs, and transient outages cannot kill
  runs that a retry would have saved.
- "Which side may end a run" is answered by the class, not by whoever wrote a given
  `raise` or `rescue` site. Rescuing an error just to `fail!` on it is a smell —
  that's a `fail_on` declaration.
- Hand-rolled `update_all(failed: true)` bypasses the boundary save, the listener
  notification, and the column clearing; `abandon!` is the verb.
- Waiting is *not* an error and gets its own outcome — [ADR-0020](0020-waits.md).

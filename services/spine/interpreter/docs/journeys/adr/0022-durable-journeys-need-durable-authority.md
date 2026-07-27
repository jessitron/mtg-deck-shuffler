# ADR-0022 — A durable journey may act only on authority that is itself durable

**Status:** accepted

## Context

Moving a journey onto `ActiveRecordJourney` extends the run's lifetime across process
and job-redelivery boundaries. The audit round caught the failure this invites, in
the act: a training-contribution journey went durable while its authorization was a
`params[:consent] == "true"` checkbox — never recorded anywhere, gone by the time a
redelivered job resumed — so a later process would re-fetch a user's raw email and
mail it onward on the strength of an authorization that no longer existed. The run
got a longer life than the thing that authorized it.

## Decision

**The authorization a durable journey acts on must survive exactly as long as the
run, or the resume path must not exist.** Two coherent packages, no third:

1. **Record the authority.** A purpose-scoped consent event, written through the
   consent manager at submission, its id a snapshot member, **re-verified at the
   boundary that re-derives the sensitive input** (`journey_restored?` marks it) —
   so revocation reaches a pending run the same way it reaches any other
   ([ADR-0003](0003-terminality-is-declared.md): revocation records the event,
   abandons in-flight runs, then purges — abandon-first so derived rows cannot
   reappear after the purge).
2. **Give the durability back.** Bare `Journey`, inline delivery, no resume path — a
   resume that cannot reproduce its own authorization is not a convenience, it is a
   liability with a cron schedule.

The never-acceptable third is the unnamed one: durable run, transient authority.

## Consequences

- "Should this journey be AR-backed?" is not only an ops question; it is an
  authority-lifetime question, asked at the moment of the include.
- Per-request flags, checkboxes, and session state are disqualified as the basis for
  anything a `JourneyJob` may later resume.
- Waits lengthen quiet lifetimes ([ADR-0020](0020-waits.md)); the rule is
  unchanged — the authority must outlive the wait.

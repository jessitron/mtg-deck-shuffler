# Owners

Standing guardians for things that must keep holding as this fleet grows — a **capability** that
must keep working, or an **invariant** that must stay true. Each owner is a knowledge base, not a
process: when you plan a change, scan the one-liners below and open any file whose trigger matches.
Owners never close. Created by the `seamapping:create-capability-owner` skill.

*(Distinct from `notes/features/*/` — those are per-feature owners with `-context`/`-review`/`-update`
skills, listed in `notes/features/HOW-TO-CREATE-A-FEATURE-OWNER.md`. Both get consulted; see
CLAUDE.md → Task Implementation Process.)*

- [the fleet is observable](fleet-is-observable.md) — *capability* — consult me before changes to
  telemetry wiring, env/secret sourcing, run/deploy scripts, OTel dependency versions, HTTP
  middleware, or trace-context propagation — and before recording that something happened
  (**never `span.addEvent`; create a log instead**).

# ADR-0008 — Snapshots: state round-trips, control re-derives — and content lives in flight

**Status:** accepted

## Context

Journey stages pass work forward through instance variables — the composed-method
pattern. A `JourneyJob` resuming a persisted run in a fresh process finds every ivar
nil; without a principled capture/restore story, resumption would force every journey
to abandon implicit ivar-passing for explicit parameter threading. Separately, those
ivars can hold email-derived content, and this project's privacy floor forbids that
content ever resting in an engine-owned store.

## Decision

**`snapshot` declares which domain ivars round-trip across a process boundary**,
alongside the four framework registers:

```ruby
snapshot :heuristic_candidates, :deduplication_run_id   # plain data, verbatim
snapshot normalized_emails: { persist: false }          # in flight only, never a column
snapshot retrieval: EmailRetrieval                      # rich object via Archetype.for
snapshot items: [BriefingItem]                          # array-of, element-wise
snapshot consent_event: { capture: ->(e) { e&.id },     # custom lambdas — the escape hatch
                          restore: ->(id) { id && ConsentEvent.find_by(id:) } }
```

`#snapshot` returns a **frozen, detached** `Journey::Snapshot` (cursor, log, error,
failed, enacted, members, version); `Class.from_snapshot` builds a **fresh**
instance without running `initialize`. Capture and restore each run an ordered ladder
of affordances, most-specific first — class override → declared lambda →
`to_journey_snapshot`/`from_journey_snapshot` → Archetype codec
([ADR-0024](0024-archetypes.md)) → verbatim. A keyword member's non-Hash value is
sugar for `archetype:`, resolved through `Archetype.for`. A journey is itself a valid
snapshot member (its `to_journey_snapshot` wraps `#snapshot`), which is what lets a
mid-flight child cross a boundary as a declared member.

**The rule of the split:** *state round-trips, control re-derives.* The program
counter is derived from the restored log; a resumed stage re-runs from the top and
re-states its own needs, wakes, and appetites. Caches and recreatable work may be
lost; anything load-bearing and undeclared is a latent bug — declare it.

**Content lives in flight; only identifiers persist.** Members holding email-derived
content are `persist: false`: capture omits them from every snapshot and
`ActiveRecordJourney` refuses to write them even if a same-named column exists. Every
register and persisted column holds names and ids, never payloads. The rule is not
"minimize what's stored" — content has no business surviving a stage boundary at all;
only what identifies it does. (This is why a restored LLM completion carries its
telemetry but no response text, and why re-deriving costs one re-billed call on a
narrow window rather than verbatim bodies at rest for the life of every snagged
run.)

**Snapshot columns are mid-flight state.** They exist only to resume, so they live
exactly as long as resumability, which ends at `finished?` or abandonment — the store
drops them at that boundary ([ADR-0010](0010-persistence-is-an-observation.md)); no
class hand-clears its own columns in `arrive`. Telemetry columns are separate and
survive. The purge derives its reach from `journey_snapshot_members.keys &
column_names` with **no** `persist:` filter, so a later flag-first refactor can never
silently narrow what a purge reaches.

## Consequences

- Stage bodies keep reading `@retrieval` and `@completion` after a process boundary;
  resumption costs a declaration, not a rewrite.
- Cross-process resumability is bounded by what a snapshot may carry: stages
  depending on `persist: false` content must guard for restored-empty state and
  divert back to re-derive (the `ExtractionRun` resume-boundary pattern).
- An undeclared ivar a later stage depends on silently vanishes on restore — the
  known failure mode; the fix is always a `snapshot` declaration.
- Changing what a member captures requires a version bump —
  [ADR-0009](0009-snapshot-schema-versioning.md).

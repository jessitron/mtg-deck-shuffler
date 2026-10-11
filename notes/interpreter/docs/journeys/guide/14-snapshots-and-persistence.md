# 14. Snapshots and persistence: surviving process boundaries

Stages hand work forward through plain ivars. `snapshot` declares which of those
round-trip across a process boundary, alongside the four framework registers —
*state round-trips, control re-derives*
([ADR-0008](../adr/0008-snapshots.md)).

## Declaring members

```ruby
snapshot :heuristic_candidates, :deduplication_run_id    # plain data, verbatim
snapshot normalized_emails: { persist: false },          # content: in flight only
         prompt_messages:   { persist: false }
snapshot retrieval:       EmailRetrieval,                # rich object via Archetype.for
         completion:      LlmAdapter::CompletionRecord,
         extracted_items: [BriefingItem]                 # array-of, element-wise
snapshot consent_event: {                                # custom lambdas — the escape hatch
  capture: ->(event) { event&.id },
  restore: ->(id) { id && ConsentEvent.find_by(id:) }
}
```

A keyword member's non-Hash value resolves through `Archetype.for`
([ADR-0024](../adr/0024-archetypes.md)); domain objects that shape their own
serialization implement `#to_archetype`. Journeys are snapshot members already
(a mid-flight child crosses as a declared member). `#snapshot` returns a frozen
value; `Class.from_snapshot` builds a fresh instance without running `initialize`.

**Content lives in flight; only identifiers persist.** `persist: false` members are
omitted from every snapshot and refused by the AR store even if a column exists —
which is why a stage entered on a resumed run whose content member is gone guards
and diverts back to re-derive:

```ruby
stage def normalize
  return stage :retrieve if restored_without_email_content?
  need(:@normalized_emails) { … }
end
```

**Versioning** ([ADR-0009](../adr/0009-snapshot-schema-versioning.md)): when you
change what a member captures — shape, rename, codec — bump and bridge:

```ruby
snapshot_version 2
snapshot_upcast(from: 1, to: 2) {|members| members.merge(items: normalize(members[:items])) }
```

Restore dispatches on the stored version and **never guesses**: equal restores,
bridgeable gaps chain single-step upcasts, anything else raises
`SnapshotVersionMismatch` before touching an ivar. Member-less snapshots skip the
gate, so finished rows stay loadable after a bump.

## Going durable

```ruby
class ExtractionRun < ApplicationRecord
  include Briefasaurus::ActiveRecordJourney
  # …
end

run = ExtractionRun.new(user_identity:, source_emails:)
run.launch                     # save!, then the outfit's launch strategy → JourneyJob
```

`ActiveRecordJourney` is **sugar over observation**
([ADR-0010](../adr/0010-persistence-is-an-observation.md)): a
`PersistenceListener` on the run's own listener scope projects `#snapshot` through
the store at every **outcome** — so a journey at rest is always durable, a stage
that escapes without an outcome writes nothing, and registers map to ordinary
columns (`log`, `stage`, `error_message`, `failed`, `enacted`,
`snapshot_schema_version`, the wait's `wake_at`) that reporting can query.
Members with matching columns persist as JSON; the store drops member columns at
arrival and abandonment — never hand-clear them in `arrive`.

What the framework handles for you:

- **Resume**: `JourneyJob` does `find` → `traverse!`; `after_find` restores
  registers and members, `:provision` re-warms macro needs, and stage bodies read
  `@retrieval` as if the process boundary never happened. Never write a custom job
  class — `.launch` is the seam.
- **Single-flight**: `lock_version` on the journey tables; a concurrent delivery's
  refused write escapes as `StaleStoreError`, retried by the job — re-`find`, exit
  if the winner finished, resume from its boundary otherwise.
- **Store failures are not stage failures**: `StoreError` is in the `StageError`
  family; the row holds at the last boundary.
- **`reload` does not refresh the registers** — `after_find` does. Load a fresh
  instance when the question is what the row now says.
- **Lifecycle of stragglers**: `RetentionSweep` abandons runs untouched past the
  resumability window; the purge abandons in-flight runs first, then nulls snapshot
  columns and the ledger.

Two rules that come with durability: **table ownership** — a migration lands in
engine `db/migrate` only when every host has the table (`DeduplicationRun`'s is
CouchDB-backed in one host, so its migrations live in `spec/dummy/db/migrate`;
match the table's existing home) — and **durable authority**
([ADR-0022](../adr/0022-durable-journeys-need-durable-authority.md)): a durable
journey may act only on authority that survives as long as the run — record it as
a re-checkable event (its id a snapshot member, re-verified where the sensitive
input is re-derived), or keep the journey non-durable.

## How it's tested

The round-trip is the spec — capture, rehydrate, keep walking:

```ruby
it "resumes after a process boundary with its members intact" do
  run.traverse(through: :call_llm)

  resumed = described_class.find(run.id)        # fresh instance, after_find restore
  provide item_repository: repository           # re-provide the world

  resumed.traverse!

  expect(resumed).to be_succeeded
  expect(resumed).to be_past_interpret
end
```

`staged_at(Klass, :stage, members: {...})` manufactures mid-flight states through
the public snapshot contract without walking there ([chapter 16](16-testing.md)).
Real persistence behavior — rollback, purge-cascade completeness — stays
`type: :model`, driving the journey for real.

## Pitfalls

| You wrote | Instead |
|---|---|
| An undeclared ivar a later stage depends on | `snapshot` it — it silently vanishes on restore otherwise |
| Email-derived content in a columned member | `persist: false`, and a divert-back guard on the stages that need it |
| Changing a member's captured shape silently | `snapshot_version` bump + `snapshot_upcast` step |
| A custom job class for an AR journey | `.launch` — the job re-creating the run bypasses the seam |
| Clearing snapshot columns in `arrive` | The store does it at arrival/abandonment |
| `run.reload` to see another worker's progress | `Klass.find(id)` — reload skips the register load |
| Durable journey, per-request authorization | Record the authority or drop the durability ([ADR-0022](../adr/0022-durable-journeys-need-durable-authority.md)) |

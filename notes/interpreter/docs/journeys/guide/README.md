# Journeys — The Guide

Every feature of the framework, in reading order, each with working examples and the
way it is tested. The [README](../README.md) motivates the whole thing;
the [ADRs](../adr/README.md) hold the decisions each chapter leans on; the
[glossary](../glossary.md) defines the vocabulary.

A recurring theme in the testing sections: journey specs are **straight-line,
deterministic, fully isolated, and fast** — no mocks, no spies, and usually no
stubs. Inputs are `provide`d, effects are read off a manifest, time moves only when
the spec says so. If a spec for a journey needs a mock, a seam is missing.

## Reading order

1. [Journeys and stages](01-journeys-and-stages.md) — declaring a process; when to
   reach for a journey at all
2. [Driving and predicates](02-driving-and-predicates.md) — traverse, continue,
   targets, and asking where a run is
3. [Outcomes](03-outcomes.md) — snags, failures, `fail_on`, `abandon!`
4. [Needs](04-needs.md) — every world input through one seam
5. [Enactments](05-enactments.md) — every outbound effect declared, mediated,
   recorded
6. [Excursions](06-excursions.md) — driving sub-journeys
7. [Condition handling](07-condition-handling.md) — what a child's trouble means to
   its owner
8. [Guides](08-guides.md) — retries and other flow-changing middleware
9. [Detachments](09-detachments.md) — N children in flight, all awaited
10. [Succession](10-succession.md) — `exec`: handing work on
11. [Outfits](11-outfits.md) — the execution bundle, and the fiber outfit
12. [Mail](12-mail.md) — journeys talking to each other
13. [Waiting](13-waiting.md) — waits, wakes, and the concierge
14. [Snapshots and persistence](14-snapshots-and-persistence.md) — surviving process
    boundaries
15. [Listeners and telemetry](15-listeners-and-telemetry.md) — observation
16. [Testing](16-testing.md) — the `type: :journey` harness in full

## Where the real examples live

The fleet is the worked example set: `app/models/briefasaurus/extraction_run.rb`
(the flagship — needs, enactments, excursions, resume boundaries, a sealed
manifest), `data_purge.rb` (sealed obligations), `consent_revocation.rb`
(abandon-then-purge cascade), `deduplication_run.rb`,
`journeys/training_contribution_journey.rb` (durable authority), and
`lib/journey/retries_guide.rb` (a guide written as a journey). Framework specs under
`spec/briefasaurus/journey*` pin every behavior described here.

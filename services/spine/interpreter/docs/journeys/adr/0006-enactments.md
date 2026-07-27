# ADR-0006 — Enactments: every outbound effect is declared, mediated, and recorded

**Status:** accepted

## Context

Needs mediate what a journey reads from the world ([ADR-0005](0005-needs-substitute-collaborators-never-authority.md));
this is the output half of the same principle
([ADR-0026](0026-every-input-and-output-is-named.md)). The dual problem is what a
journey does *to* the world — writes, deletes, deliveries,
recorded charges. Unmediated, those calls are untestable without spies, invisible to
telemetry, and unguarded under retry. And a symbol-keyed effect call
(`enact(:confirmatoins, items:)`) is working Ruby that invents a manifest entry —
nothing in the language is watching. Finally: a journey resumed in a fresh process
had no memory of what it had already handed over, so `guaranteed:` promises were
unenforceable across a boundary and every author hand-rolled idempotency guards.

## Decision

**The bright line:** a call whose return value is used downstream is a `need`; a call
whose return is unused — it exists only for its effect — is an **enactment**.
`enact` returns `nil`, always, so the line cannot blur silently.

**Effects are declared**, and the macro generates the mediated entry point a stage
calls. Three declaration forms (the same shapes `need` and `excursion` use):

```ruby
enact def store_canonical_item!(item:) = item_repository.store(item)  # def-capture (canonical)
enact(:clear_preference_store) { preference_store.set(:personal_context, nil) }  # block
enact :confirm_items                          # bare — backward-looking: confirm_items! exists above
```

**One name per enactment**: the ledger key, the mediated call, and the raw action are
one word wearing at most a bang — `:confirm_items`, `confirm_items`,
`confirm_items!`. There are **no forward promises**: every bare form in this DSL is
a backward-looking capture. Call the generated method, not the symbol form — the
generated method hands Ruby's typo guard back. Name effects as **verbs** — an
enactment names what was done, so the ledger reads as a record of doing — take
payloads by **keyword** (a manifest is read by name), and route handovers through the
**enactor** — one call, `enactor.call(name, args, kwargs, action)`;
`NullEnactor` (production) runs the action, a `TestEnactor` records to its
manifest without executing.

**Declaration levels are cumulative, each checked mechanically:**

| Declared | Checked |
|---|---|
| the declaration itself | the name (typo → `NoMethodError`), plus arity and required keywords read off the action's own signature — enforced *at handover*, including under a `TestEnactor` that never runs the action |
| `as: { key: matcher }` | each annotated value via any `===`-responder; an `as:` key naming no parameter raises at class load |
| `unique_by:` | one ledger entry per discriminator; a repeat handover is **elided** — never reaches the enactor, with `:effect_elided` firing in place of `:effect_enacted`, so enforced idempotency is never a silence |
| `seal_enactments!` | the set is closed — an undeclared handover raises `UndeclaredEnactment` (inherited, so a family stays sealed) |
| `guaranteed: true` | reaching `:finished` without the handover raises `UnfulfilledEnactment` (success path only; checked after the arrival write, so a retry loop can't re-break it) |

Options with nowhere to sit on a def-capture line ride a **`docket`** annotation
above it ([ADR-0007](0007-the-mediation-convention.md)). A stage that is one handover
declares itself as one — `stage enact def sweep!` — with `docket payload: -> { … }`
deriving the payload from the journey, and the mediating macro innermost.

**Effects are at-least-once, and the journey records what it handed over.** The
**`enacted` register** — the fourth framework register — is a ledger of effect
names against handover times, written when the enactor returns without raising
(handover, not delivery — so a `TestEnactor` records exactly as production does),
captured/restored/persisted with the other registers, surviving arrival (it is the
record of what the run did; purge nulls it). `enacted?(:name)` is the guard at the
top of any stage whose effect must not repeat; `enacted_at(:name)` answers when it
left — on the run's own row, because correlating against telemetry in another system
after the fact is the harder problem. The ledger holds **names and times, never
payloads** (a payload may carry email content), and a `unique_by:` discriminator must
be a String/Integer/Symbol — the register rides the snapshot into a JSON column, and
a discriminator needing a codec would drag the Archetype layer into a framework
register. Effects needing finer keys than a name copy the `UsageAccount` pattern: a
replay key backed by a partial unique index and `create_or_find_by!`.

A durable exactly-once outbox is deliberately out of scope: `enact` is a seam, not
a delivery guarantee.

## Consequences

- Journey specs assert `have_enacted(:name).with(payload)` off the manifest and
  spy on nothing. Converting a direct call to an enact requires auditing downstream
  assertions — under a `TestEnactor` the action never runs, so an assertion reading
  its side effects silently measures stale state.
- Needing an enact's return value means it was a `need`.
- Calling the raw `name!` from a stage body is an off-manifest effect —
  mechanically detectable under [ADR-0007](0007-the-mediation-convention.md).
- Re-entered stages are guardable by declaration (`unique_by:`) or by register read
  (`enacted?`) instead of hand-rolled instance state.

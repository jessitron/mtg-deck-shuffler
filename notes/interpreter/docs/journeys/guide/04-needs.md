# 4. Needs: every world input through one seam

A **need** is a value the journey reads from the world — a collaborator, an LLM
completion, a repository query, a feature-flag read, `Time.current`. Declaring it
routes it through the **provisioner**, so a spec, a REPL, or a tooling layer can
supply it without stubbing anything
([ADR-0005](../adr/0005-needs-substitute-collaborators-never-authority.md)).

## Two forms, one seam

**Class macro**, for collaborators the whole journey uses:

```ruby
class DeduplicationRun < ApplicationRecord
  include Briefasaurus::ActiveRecordJourney

  # (stages above, per the declaration order)

  need(:item_repository)           { Briefasaurus.item_repository(user_identity:) }
  need(:llm_adapter)               { Briefasaurus.dedup_llm_adapter(user_identity:) }
  need(:candidate_selection_maker) { DefaultCandidateSelection.method(:new) }
end
```

The macro registers the need, defines a private lazy accessor, and the framework's
`:provision` stage (first on every itinerary) resolves each into its backing ivar —
so a `find`-resumed run in a fresh process reaches working collaborators without an
`initialize` that never ran. This replaces the hand-rolled
`attr_writer` + resolving-`initialize` + `||=`-reader pattern outright.

**Inline**, for a world read inside one stage:

```ruby
@candidates   = need(:candidates, as: [BriefingItem]) { item_repository.including_drafts }
completion    = need(:completion) { llm_adapter.complete(messages:, schema:) }
anonymized_at = need(:anonymized_at) { Time.current }
```

`need` returns the value, so it composes in expressions. An `@`-prefixed name
assigns the ivar while keying the need on the bare name:
`need(:@personal_context) { preference_store.get(:personal_context) }` — a
`provide` targets `:personal_context`.

## Resolution rules that matter

- **The block is the production default** — unprovided, the block runs. It is not a
  fallback for a broken provisioner; it is how production works.
- **Ladder**: the provisioner's answer → an inline block → a registered macro
  block → the raw `name!` method
  ([ADR-0007](../adr/0007-the-mediation-convention.md)) → raise
  `Journey::UnmetNeed` (a `StageError`: a missed input seam is a logic error the
  snag path never swallows).
- **`nil` from a provisioner means unprovided**, so resolution falls to the
  default. A plain Hash is a condoned provisioner and answers `nil` for every key
  it never had; treating that as a provision would silently swallow a default —
  including one that writes a durable record. The trade: a provisioner cannot
  deliberately provide `nil`; a need whose value may legitimately be nil says so in
  its own block.
- A bodyless `need :thing` is a **stated hard dependency**: nothing provides it →
  `UnmetNeed` is the documented, intended outcome.
- **`as:`** tags the need with an archetype
  ([ADR-0024](../adr/0024-archetypes.md)) for metadata and tooling; resolution does
  not validate against it.
- `seal_needs!` closes the macro-declared key set (`UndeclaredNeed` for a key the
  macro never declared — distinct from `UnmetNeed`).
- **Hoist `need` calls toward the top of stage bodies** where practical: a retry
  re-enters the stage from the top, and hoisted needs mean minimal repeated work.

## What is never a need

**Seams substitute collaborators, never authority.** Consent, entitlement, and
identity must hold no matter who is driving; putting a duty behind a need makes
every substitution path a bypass. Enforcement lives *below* the seam (the
consent-gated adapter handout in `UserServicesFactory`); a journey-side
`consent_manager.consented?` check stays a direct, unmediated guard — an early
exit, not the wall. Likewise a purge's target set is an obligation: derive it
inside the effect's own action, never through a need.

## How it's tested

`type: :journey` groups install a raise-on-unprovided `TestProvisioner`; specs line
up `provide`s instead of mocking:

```ruby
RSpec.describe Briefasaurus::DeduplicationRun, type: :journey do
  subject(:run) { described_class.new(user_identity:) }

  it "asks the model about the contested candidates" do
    provide item_repository: repository, llm_adapter: adapter
    provide(:candidates) { [draft, duplicate] }
    provide completion: dedup_completion

    run.traverse!

    expect(run).to have_enacted(:confirm_items).with(items: [draft])
  end
end
```

- `provide(**pairs)` for standing values; `provide(:name) { |journey| … }` when the
  value depends on journey state; `provide_once(...)` for next-resolution-only;
  `provide(:name, what:, when:, once:)` is the generic form.
- **Unprovided needs raise even when they have a default block** — a missed seam
  fails loudly rather than quietly reaching the world. And because `:provision`
  warms every macro need eagerly, provide *every* declared collaborator up front,
  even for a single-stage walk.
- Prefer **fakes** (`Briefasaurus::Fakes::LlmAdapter`, `Fakes::ItemRepository`) over
  doubles; provide a block that calls the real collaborator when an example asserts
  on call counts — a static value would bypass the call entirely.
- Every journey with a consent check also keeps one `type: :model` spec driving the
  real gate — the provisioner seam is how journey specs run at all, so the gate is
  proven below it.

## Pitfalls

| You wrote | Instead |
|---|---|
| `Briefasaurus.item_repository(...)`, `Time.current`, or a flag read in a stage body | Route through `need` — macro for whole-journey collaborators, inline for one-stage reads |
| `attr_writer` + resolving `initialize` + `||=` readers | Macro `need`s; `:provision` warms them and `find`-resume works |
| A consent/entitlement check behind a need | Direct guard in the journey; enforcement below the seam ([ADR-0005](../adr/0005-needs-substitute-collaborators-never-authority.md)) |
| A provisioner answering `nil` to mean "provide nothing" | `nil` means unprovided; provide a sentinel or null object |
| Mocking a collaborator in a journey spec | `provide` a fake |

# 5. Enactments: every outbound effect declared, mediated, recorded

An **enactment** is the dual of a need: a pure output — a write, a delete, a
delivery, a recorded charge. Declared, it becomes assertable (specs read a
manifest), interceptable (a test enactor records without executing), observable
(listeners see it), and guardable under retry (the ledger remembers it)
([ADR-0006](../adr/0006-enactments.md)).

**The bright line:** return value used downstream → `need`. Return value unused —
the call exists only for its effect — → `enact`. `enact` returns `nil` always,
so the line cannot blur.

## Declaring effects

```ruby
# def-capture — canonical: the bang is in your face, the effect name derives from it
enact def store_canonical_item!(item:) = item_repository.store(item)

# block — for a closure or a one-liner that doesn't want a method
enact(:clear_preference_store) { preference_store.set(:personal_context, nil) }

# bare name — backward-looking only: confirm_items! already exists above,
# and its real job is carrying options
enact :confirm_items
```

Each declaration generates the **mediated entry point** a stage calls —
`store_canonical_item(item:)`, the declared name itself. Call the generated
method, not `enact(:symbol, …)`: the symbol form throws away Ruby's typo guard —
`enact(:stroe_canonical_item, item:)` is working Ruby that invents a manifest entry —
and the generated method hands it back. Name effects as **verbs**, so a stage body
reads as the thing it does, and prefer **keyword payloads**: a manifest is read by name, and
`have_enacted(:x).with(items: […])` says what `with([…])` does not.

## Firming up by degrees

```ruby
docket unique_by: ->(item:) { item.id }, as: { item: BriefingItem }
enact def record_item_sources!(item:) = item.sources.each {|s| BriefingItemSource.create_or_find_by!(**s.to_h) }

docket guaranteed: true do
  enact def confirm_items!(items:) = item_repository.confirm(*items)
  enact def dismiss_items!(items:)    = item_repository.dismiss(*items)
end

seal_enactments!
```

| Declared | Checked |
|---|---|
| the declaration | name (typo → `NoMethodError`), plus arity and required keywords off the action's own signature — **at handover, even under a `TestEnactor` that never runs the action** |
| `as: { key: matcher }` | each annotated value via any `===`-responder; a key naming no parameter raises at class load |
| `unique_by:` | one ledger entry per discriminator; a repeat handover is **elided** — skipped with `:effect_elided` firing in place of `:effect_enacted` |
| `seal_enactments!` | the set is closed; undeclared → `UndeclaredEnactment` (inherited — a sealed family stays sealed) |
| `guaranteed: true` | reaching `:finished` without it → `UnfulfilledEnactment` (success path only) |

`unique_by:` takes a callable over the payload, or subscript sugar (a Symbol keys
the keyword payload, an Integer the positional). Discriminators must be
String/Integer/Symbol — the ledger rides the snapshot into a JSON column, and
`unique_by: :item_id` keeps a `BriefingItem` (and its excerpt) out of a store that
persists.

## Stages that are one handover

A stage whose whole body is one effect declares itself as one — mediating macro
innermost, payload derived from the journey (a stage takes no arguments):

```ruby
docket payload: -> { extraction_charge }, unique_by: :operation_type
stage enact def charge_extraction_usage!(operation_type:, count:, source:)
  usage_policy.record_usage(operation_type:, count:, source:)
end
```

Composition earns its keep where the stage is the whole handover; where a stage does
more than hand over, a two-line stage calling the enactment says more with the same
number of names.

## At-least-once, and the ledger

A stage that enacts and then snags enacts again when re-stepped — `enact`
is a seam, not an exactly-once guarantee. What makes that checkable is the
**`enacted` ledger**: the fourth register, effect names against handover times,
written when the enactor returns without raising, surviving arrival and the
process boundary:

```ruby
stage def send_contribution_email
  return if enacted?(:deliver_contribution)
  deliver_contribution(eml: @eml)
end
```

`enacted?(:name)` (optionally with a payload for discriminated effects),
`enacted_at(:name)`, and the register itself are the public readers. For paid or
externally visible effects needing finer keys than a name, copy the `UsageAccount`
pattern: a replay key backed by a partial unique index and `create_or_find_by!`. The
ledger holds names and times, never payloads. A child's ledger is its own; across a
succession the guard walks the predecessor link ([chapter 10](10-succession.md)).

## How it's tested

Effects never execute in `type: :journey` groups; assertions read the manifest:

```ruby
it "confirms the cleared items and dismisses the duplicates, once each" do
  provide item_repository: repository, llm_adapter: adapter, completion: dedup_completion
  provide(:candidates) { [draft, duplicate] }

  run.traverse!

  expect(run).to have_enacted(:confirm_items).with(items: [draft])
  expect(run).to have_enacted(:dismiss_items).with(items: [duplicate])
  expect(run).not_to have_enacted(:soft_deletions)
end
```

The declaration's free half closes the harness's one blind spot: a payload missing a
required keyword raises at handover even though the action never ran, so a spec
cannot pass over a payload production would reject.

**The migration hazard**, learned the hard way: once a call becomes an enact, a
`TestEnactor` intercepts it — so any downstream assertion that reads state the
action would have mutated silently measures stale state *without failing*. Convert
those assertions to `have_enacted` with the same pinned values; never loosen a
behavioral assertion. Behavior that only means something when the effect really
happens — transactional rollback, purge-cascade completeness, an email genuinely
delivered — stays a `type: :model` spec driving the journey for real.

## Pitfalls

| You wrote | Instead |
|---|---|
| An outbound write/delete/delivery called directly in a stage | `enact def verb!(payload)` + the generated `verb` the stage calls |
| `enact(:symbol, …)` at a call site | The generated method under the declared name — take the typo guard back |
| Using an enact's return value | It's always `nil`; that call wanted to be a `need` |
| A per-item guard by hand (`return if @stored.include?(id)`) | `unique_by:` — the same guarantee as a declaration, with an observable elision |
| A once-per-run guard forgotten under retry | `return if enacted?(:name)` at the top of the stage |
| `enact stage def name!` | Mediating macro innermost: `stage enact def name!` — the outer macro rejects a queued docket rather than swallowing it |
| An implementation named without the bang | Bangless is mediated, bang is the action ([ADR-0007](../adr/0007-the-mediation-convention.md)) |
| Calling `name!` from a stage body | Off-manifest — call the mediated form |

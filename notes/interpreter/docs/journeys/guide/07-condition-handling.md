# 7. Condition handling: what a child's trouble means to its owner

By default a snagging child snags its owner and a failed child fails it,
carrying the child's reason. Everything beyond that default is the **owner's**
explicit choice — a child never decides what its trouble means to whoever sent it
([ADR-0014](../adr/0014-a-childs-trouble-is-the-owners-to-interpret.md)).

## The boundary table

| The child | The owner |
|---|---|
| snagged | snags, carrying the child's error — parked and resumable |
| failed | fails, carrying the child's reason — reachable as `ChildFailed` |
| is on wait | goes on wait, on the child's wake ([chapter 13](13-waiting.md)) |
| arrived | carries on |

## Handling with `rescue`

A failed child raises `Journey::ChildFailed` (carrying the child and its reason)
into the owner's stage body, so the fallback is Ruby's own idiom:

```ruby
stage def make_lunch
  @lunch = excurse(MakeSandwich).product
rescue Briefasaurus::Journey::ChildFailed
  @lunch = order_takeout
end
```

Unhandled, the owner fails — the strict default, unchanged.

## Handling with values: `on_error: :return`

When both paths belong in one place, turn trouble into a **pattern-matchable
value**. A clean call still returns the child; trouble comes back as a
`Journey::Trouble` deconstructing to `{child:, reason:, failed:, snagged:}`:

```ruby
stage def make_lunch
  case excurse(MakeSandwich, on_error: :return)
  in Briefasaurus::Journey::Trouble(failed: true, reason:) then @lunch = order_takeout(reason)
  in Briefasaurus::Journey::Trouble(child:)                then error!(child.error)  # keep the snag
  in MakeSandwich => sandwich                              then @lunch = sandwich.product
  end
end
```

A block on the call is the anonymous spelling of the same slot —
`excurse(MakeSandwich) {|trouble| order_takeout(trouble.reason) }` — running in the
owner's context, so the owner's own machinery (`stage :x`, an enact, `error!`) is
legal inside it. `on_error:` and a block together raise `ArgumentError`. The one
exception: the *named* excursion form's block already means deferred construction,
so it takes `on_error:` alone.

For a rejoined party the same vocabulary composes: a troubled rejoin returns a
`Journey::Muster(arrived:, troubled:)` whose `troubled` is made of Troubles, so a
handler written for one child reads a whole party
([chapter 9](09-detachments.md)).

**Snagged and failed stay distinguishable in the value** — downgrading a failure
into data must be a knowing act. And a `Trouble` is **flight-only**: it carries the
child itself and defines no codec; to carry trouble across a stage boundary,
extract identifiers (the child's id, `reason.class.name`) into declared members.

## The default ladder

Most specific wins: call site → drive/outfit (`traverse(on_error:)`, the outfit
slot) → journey class (`self.journey_default_on_error = :return`, inherited) →
ambient (`:propagate`). A whole subsystem written in pattern-matching-on-values
style is a house style, not a deviation — and every rung is still the owner's
declaration. The hazard of a broad `:return`: a caller that ignores the value drops
trouble silently where `:propagate` would have stopped.

## How it's tested

Trouble paths are provided like any other input — make the child fail, and assert
what the owner did about it:

```ruby
it "orders takeout when the sandwich fails" do
  provide(:make_sandwich) { failed_journey(reason: :empty_fridge) }

  run.traverse!

  expect(run).to have_enacted(:takeout_order)
  expect(run).to be_succeeded
end

it "keeps a snagged child's snag" do
  provide(:make_sandwich) { snagged_journey(error: Timeout::Error.new) }

  run.traverse

  expect(run).to be_snagged
end
```

## Pitfalls

| You wrote | Instead |
|---|---|
| A child calling its own failure a snag so the parent keeps options | The owner decides: `rescue ChildFailed` or `on_error: :return` |
| `on_error:` **and** a block | One slot, two spellings — pick one |
| Snapshotting a `Trouble` | Flight-only; extract identifiers into declared members |
| An app-wide `:return` with call sites ignoring the value | Discarded trouble is silent; keep `:return` where the value is read |
| A guide that absorbs a child's failure and returns as if nothing happened | That's an `on_error:` strategy written in the wrong place ([chapter 8](08-guides.md)) |

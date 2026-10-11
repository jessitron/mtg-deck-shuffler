# 10. Succession: `exec` hands work on and does not return

Nesting is `fork`: the parent stays and waits. `exec` is the missing sibling — a
tail call between journeys. This journey hands its remaining work to a different
journey and never comes back; no frame is added, nobody waits, the successor
inherits the outfit ([ADR-0016](../adr/0016-succession.md)).

```ruby
class Authentication
  include Briefasaurus::Journey

  stage def verify_credentials = check(@session)
  stage def hand_off           = exec(GatheringRequirements, session: @session)
end
```

The rules, each one boundary discipline applied:

- **Provisional until the stage commits** — `stage :other` one level up. A stage
  that snags after `exec` leaves no successor behind; on commit, the predecessor
  reaches `:finished` normally and **the conveyance loops onto the successor**.
- **`traverse` still returns `self`; `traverse!` asks the end of the chain** —
  a predecessor that handed its work on finished cleanly, and the strict form
  reports what the chain's last journey did (`journey_last`).
- **Fresh log, linked ledger.** The successor's log starts empty — `past?(:x)`
  stays "I did this," never "someone in my lineage did this" — while
  `enacted?`/`enacted_at` walk back through `journey_predecessor`, because an
  idempotency guard that weakens at a succession boundary is not one.
- A tree walk renders a succession as a link in a chain, never as a child.
- Durably, a successor is its own row carrying `succeeds_run_id`; the migration
  ships with the first fleet journey that execs. Until then a resumed successor
  loses its predecessor link — a stated limit.

**When to reach for it:** a journey has genuinely finished its own business and
something else takes over — the program-shaped run moving through phases it will
never return through. Not for jumping stages (that's `stage :name`), and not when
the parent needs the child's result (that's `excurse`).

## How it's tested

```ruby
it "hands off and the drive follows" do
  run.traverse!

  successor = run.journey_last
  expect(run).to be_finished
  expect(successor).to be_a(GatheringRequirements)
  expect(successor).to be_succeeded
  expect(successor.past_verify_credentials?).to be(false)   # fresh log
end

it "leaves no successor behind a snagged stage" do
  provide(:handoff_check) { raise Timeout::Error }
  run.traverse
  expect(run).to be_snagged
  expect(run.journey_last).to eq(run)
end
```

## Pitfalls

| You wrote | Instead |
|---|---|
| `exec` to skip ahead in this journey | `stage :name` — exec is for handing work to a *different* journey |
| `exec` then reading the successor's result in a later stage | There is no later stage; if you need the result, `excurse` |
| Expecting `past?` to span the chain | The log is local by design; the *ledger* spans the chain |

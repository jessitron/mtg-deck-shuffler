# 2. Driving and predicates

A **conveyance** — the mover — walks a journey one stage at a time through the
private `journey_do_stage` primitive, so every driver gets identical
commit-or-park semantics ([ADR-0002](../adr/0002-registers-itinerary-transactional-step.md)).

## The verbs

```ruby
run.continue          # step exactly one stage
run.traverse          # drive until finished, parked, or waiting; returns self, never raises on business outcomes
run.traverse!         # same, then raises if parked on an error
```

- `traverse` leaves a snagged journey **paused on the snagged stage, inspectable
  and retryable** — the caller reads `error?` / `failed?` / `succeeded?` /
  `waiting?` afterward. The camel stopped; it didn't bolt.
- `traverse!` raises the captured `error` if it is an `Exception`, else wraps it in
  `Journey::JourneyError`. It does **not** raise on a wait — waiting is not an
  error ([chapter 13](13-waiting.md)).
- Both return `self`: the journey is its own record; there is no meaningful return
  value to branch on.
- Driving a disposed-of journey (`over?` — finished or failed) raises
  `Journey::StageError`. Repeat the process with a new instance.

**Targets** stop a drive partway — the everyday way specs manufacture mid-flight
states:

```ruby
run.traverse(to: :call_llm)         # stop with the cursor parked ON :call_llm
run.traverse(through: :normalize)   # stop once :normalize has just committed
run.traverse(wait: false)           # stop when you would otherwise have to wait
```

Target names validate eagerly (`StageError` on a typo, before any stage runs);
`to:` and `through:` together raise `ArgumentError`. A snag or arrival still
stops the walk naturally before the target — assert on state afterward.
`wait: false` is a stopping condition in the same family: it suppresses *sleeping*,
never *arranging* (a job concierge still books its wake), and travels into excursed
children and rejoined parties.

**Per-drive kit** rides the same verbs: `traverse(provisioner:, enactor:,
listeners:, conveyance:, on_error:)` — each keyword deriving this drive's outfit
([chapter 11](11-outfits.md)).

**Bespoke driving is condoned.** The conveyance is a stepping generator; holding its
enumerator and consuming it your own way (`each_slice`, `lazy.take_while`, a REPL)
is a first-class alternative, not a workaround — correctness lives in the stage
primitive, not the driver.

## Asking where a run is

By stage **name**, never by counting log entries:

```ruby
run.at?(:call_llm)        # the cursor is parked on it (it runs next)
run.past?(:normalize)     # it has completed (it's in the log)
run.ahead_of?(:publish)   # !past? — uniform for itinerary stages and diversions
run.at_call_llm?          # generated sugar for every declared stage/diversion
run.past_normalize?
```

Unknown names raise `StageError` eagerly — never a silent `false`. `past?` is
log-based and repeat-tolerant: a stage diverted back onto reads `past?` *and* `at?`
true together, which is the log telling the truth about a retry. System stages get
no generated sugar; use `at?(:provision)`.

## Outcome predicates

```ruby
run.started?     # any stage has committed
run.finished?    # cursor reached :finished
run.succeeded?   # finished with no error
run.error?       # an error is present (parked or failed)
run.failed?      # terminal — business declared
run.snagged?  # error? && !failed? — parked, retryable
run.waiting?  # parked waiting, nothing wrong
run.halted?      # nothing left to step right now
run.over?        # finished? || failed? — disposed of
```

## How it's tested

Manufacture "before" states by driving to a target, or by rehydrating at a named
stage — never by stepping N times:

```ruby
it "parks on the LLM stage when the provider is down" do
  provide item_repository: repo, llm_adapter: adapter
  provide(:completion) { raise LlmAdapter::Error, "outage" }

  run.traverse

  expect(run).to be_snagged
  expect(run).to be_at_call_llm
  expect(run.error).to be_a(LlmAdapter::Error)
end

it "resumes the same stage on retry" do
  run.traverse                                # parked, as above
  provide(:completion) { good_completion }    # the world recovers

  run.traverse!

  expect(run).to be_succeeded
end
```

`staged_at(Klass, :stage_name, members:, …)` + `run_stage(journey)` park a fresh
journey at a named stage through the public snapshot contract and perform exactly
that one stage — see [chapter 16](16-testing.md).

## Pitfalls

| You wrote | Instead |
|---|---|
| `log.include?("call_llm")` | `past_call_llm?` / `past?(:call_llm)` |
| `expect(run.stage).to eq(:x)` in journey specs | `be_at_x` (raw cursor reads belong to framework specs testing the register itself) |
| `5.times { run.continue }` | `traverse(to:/through:)` or `staged_at` — step counts break silently when the itinerary changes |
| Branching on `traverse`'s return value | It returns `self`; read the predicates |
| A custom `#reset`/`#retry` | A snagged run is retried by stepping it again; an `over?` run is replaced by a new instance ([ADR-0001](../adr/0001-a-process-is-a-journey.md)) |

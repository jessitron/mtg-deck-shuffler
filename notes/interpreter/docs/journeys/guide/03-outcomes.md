# 3. Outcomes: snags, failures, `fail_on`, `abandon!`

Four things can become of a stage — it completes, it snags, someone declares the
run lost, or it waits ([chapter 13](13-waiting.md)) — and the framework never
guesses which. Terminality is declared, from inside or outside, never inferred
([ADR-0003](../adr/0003-terminality-is-declared.md)).

## Inside a running stage

```ruby
stage def retrieve
  emails = email_store.fetch(@references)      # raises on outage → snag, retryable
  error!(:nothing_retrieved) if emails.empty?  # explicit snag, non-exception value
  @emails = emails
end

stage def check_mandate
  fail!(:mandate_revoked) unless mandate.current?   # terminal: retrying is meaningless
end
```

- **Normal return** → the stage commits: appended to the log, `error` clears,
  cursor advances.
- **`error!(value)`** or a raised `StandardError` (sugar for the same thing) → a
  **snag**: cursor holds on the snagged stage, `error` set, retryable by
  stepping again. The transient default.
- **`fail!(reason)`** → terminal, business-declared. `failed?` and `over?` become
  true.
- `error` may hold an Exception or any interpretable value; it clears when the
  parked stage later succeeds, so it always reflects *current* state.

## `fail_on` — terminality declared once per class

A raised error snags, which is right for an outage and wrong for an answer:

```ruby
class ExtractionRun < ApplicationRecord
  include Briefasaurus::ActiveRecordJourney

  # A revocation does not become a grant by being retried.
  fail_on Briefasaurus::ConsentRequired
end
```

Matchers are anything answering `===` — a class, a module, a lambda
(`fail_on ->(err) { err.message.include?("permanent") }`), or a block
(`fail_on {|err| !err.retryable? }`, which is the same thing, since `Proc#===`
calls the proc); declarations accumulate and inherit. Two things it buys over remembering terminality at every raise site:
it **reaches raises you don't own** (an adapter or library raising inside your
stage), and it **survives an excursion boundary** (a child that `fail!`s reaches
you as terminal instead of downgrading into an endlessly retried snag — a child
that merely snagged still snags you, correctly, since that child is parked and
resumable).

The test for declaring: **can the condition change on its own?** Revoked consent
cannot — declare it. An exhausted credit allowance replenishes — deliberately don't.
`fail_on StandardError` is inference wearing a declaration's coat and ends retry as
a concept.

## `abandon!` — ending a run from outside

Purges, revocations, retention sweeps, and stranded jobs need to end a run nobody is
stepping:

```ruby
InFlightRuns.for(user_identity:).each(&:abandon!)
```

`abandon!(reason)` writes the registers and saves rather than throwing an outcome:
`failed?` and `over?` become true (so the disposability guard and `JourneyJob`'s
`over?` check treat the run as done), cursor and log stay put (how far it got stays
on the record), and snapshot columns clear (resumability is over). Nobody claims the
business failed — that is `fail!`'s word. Hand-rolling the effect with
`update_all(failed: true)` bypasses the boundary save, the listener notification,
and the column clearing.

`RetentionSweep` is scheduled abandonment: every run untouched past
`Briefasaurus.resumability_window` (an upper bound on the retry schedule) is
abandoned, so a snag nobody will retry stops holding its columns.

## Misuse is its own family

`Journey::StageError` (in the `ScriptError` family) means the machinery was used
wrong — `stage :finished`, an unmet need, an undeclared handover, a broken listener,
a refused store write. It is never caught by the failure path, never parks the
cursor, and never converts into a business outcome. If you find yourself rescuing
one in a stage, the bug is upstream of the rescue.

## How it's tested

Each path is a straight-line spec — no mocks, and the "world recovers" move is just
providing a different answer before stepping again:

```ruby
it "snags on an outage and retries the same stage" do
  provide(:completion) { raise LlmAdapter::Error, "503" }
  run.traverse
  expect(run).to be_snagged.and be_at_call_llm

  provide(:completion) { good_completion }
  run.traverse!
  expect(run).to be_succeeded
end

it "fails terminally on revoked consent, even from inside the child" do
  provide(:interpretation) { raise Briefasaurus::ConsentRequired }
  run.traverse
  expect(run).to be_failed
  expect { run.traverse }.to raise_error(Briefasaurus::Journey::StageError)  # disposed of
end

it "abandonment ends a parked run without erasing where it got to" do
  run.traverse(through: :normalize)
  run.abandon!(:purge)
  expect(run).to be_over
  expect(run).to be_past_normalize      # the log holds
end
```

## Pitfalls

| You wrote | Instead |
|---|---|
| `rescue SomeError; fail!(e)` in a stage | `fail_on SomeError` at the class level — it also reaches raises inside excursed children |
| Inferring `failed?` from a rescued exception | Only `fail!`/`fail_on`/`abandon!` mark terminality |
| `fail_on StandardError` | Name the specific errors that are answers, not outages |
| `update_all(failed: true)` from a sweep or purge | `abandon!(reason)` |
| Retrying a `failed?` run | Meaningless — build a new journey (or let a guide re-create it, [chapter 8](08-guides.md)) |
| Rescuing `StageError` to keep going | It's a logic error; fix the misuse |

# 16. Testing: the `type: :journey` harness

The payoff the whole seam architecture buys: journey logic tests are
**straight-line, deterministic, fully isolated, and fast** — no mocks, no spies,
and usually no stubs. Inputs are provided, effects are read off a manifest, whole
children are provided past, mail is really posted, and time moves only when the
spec moves it.

## What the harness installs

Tagging a group `type: :journey` layers three strategies over the ambient outfit
for each example — the same derivation moves production uses:

- a **`TestProvisioner`** that raises `UnmetNeed` on any unprovided need (even one
  with a default block — a missed seam fails loudly instead of quietly reaching the
  world);
- a **`TestEnactor`** that records every handover to its manifest and executes
  nothing;
- a **`TestConcierge`** — a frozen virtual clock that never blocks, never books,
  never advances on its own.

Give the group an **explicit `subject`** (implicit-subject construction fails for
keyword-arg journeys), and scope fixture-building `before` blocks that install
instance-level overrides *out* of any outer `describe` a `type: :journey` sibling
shares.

## The grammar

```ruby
RSpec.describe Briefasaurus::DeduplicationRun, type: :journey do
  subject(:run) { described_class.new(user_identity:) }

  it "confirms what the model cleared" do
    provide item_repository: repository, llm_adapter: adapter    # standing values
    provide(:candidates) { [draft, duplicate] }                  # computed per resolution
    provide completion: dedup_completion

    run.traverse!

    expect(run).to have_enacted(:confirm_items).with(items: [draft])
    expect(run).not_to have_enacted(:soft_deletions)
    expect(run).to be_succeeded
  end
end
```

- **`provide(**pairs)`** standing; **`provide(:name) { |journey| … }`** when the
  value depends on journey state; **`provide_once(...)`** next-resolution-only;
  `provide(:name, what:, when:, once:)` generic. Because `:provision` warms every
  macro need eagerly, provide every declared collaborator up front even for a
  single-stage walk.
- Prefer **fakes** over doubles wherever one exists; provide a block calling the
  real collaborator when the example asserts on call counts.
- **`have_enacted(:name)`**, optionally `.with(*args, **kwargs)` for an exact
  payload match. Enacted actions never run in these groups — and the
  declaration's signature check still fires at handover, so a payload production
  would reject fails here too.
- **`post mail, to: run.journey_handle`** posts real mail through the real courier
  ([chapter 12](12-mail.md)); **`advance(seconds)` / `advance(to: time)`** moves
  the virtual clock ([chapter 13](13-waiting.md)); every other wake is made due by
  making it true.

## Manufacturing mid-flight states

By stage **name**, never by step count:

```ruby
# Walk there for real:
run.traverse(to: :call_llm)          # cursor parked ON the stage
run.traverse(through: :normalize)    # the stage has just committed

# Or park a fresh journey there through the public snapshot contract:
journey = staged_at(ExtractionRun, :interpret,
                    members: { completion: canned_completion },
                    attributes: { user_identity: })
run_stage(journey)                   # perform exactly that one stage
```

Step-count literals coupled to itinerary shape (`5.times { … }`) are forbidden —
they break silently when the itinerary changes. A spec never calls a stage method
directly; `send(:stage_name)` is reserved for examples where bypassing the
machinery is itself the point (and the raw `name!` forms exist exactly for
unit-testing an action or receive body off-manifest).

## The standard coverage for a journey

- Each stage's happy path.
- Each recoverable snag, and that stepping again retries the same stage.
- Each terminal `fail!`/`fail_on` path, and that it marks `failed?` without retry.
- The disposability guard (driving a finished/failed journey raises).
- `succeeded?`/`snagged?`/`failed?` transitions.
- For AR journeys: a `find`-reloaded record resumes with declared members intact.
- For waiting journeys: the park is observable, and the anchor holds across
  re-entry.

## Where `type: :journey` ends

Recording effects is interception: behavior that only means something when the
effect really happens — transactional rollback, purge-cascade completeness, an
email genuinely delivered, the real consent gate refusing — stays a
**`type: :model`** spec driving the journey for real (overrides through
`Briefasaurus.overrides`, not per-instance setters). The `type: :journey` section
alongside it proves the needs and enactments are provide-addressable, in domain
language rather than framework mechanics.

The **step cap** guards every example: an accidental stage loop raises
`StepCapExceeded` carrying the tail of the log — the loop's own confession —
instead of hanging CI. Raise the cap per example for a legitimately long walk.

## Pitfalls

| You wrote | Instead |
|---|---|
| `allow(Thing).to receive(...)` in a journey spec | `provide` — if it can't be provided, a seam is missing; fix the journey |
| Asserting DB/fake state an enacted action would have written | The action never ran; `have_enacted(...).with(...)` pins the same values |
| Loosening an assertion to get past interception | Never — convert it, value-for-value |
| Implicit subject | Explicit `subject(:run)` |
| `Time`/`sleep`/`Timecop` in a journey spec | `advance` |
| Providing a static completion when counting adapter calls | Provide a block that calls the fake, so the call actually happens |
| A hung spec on a mail/wait loop | The step cap already converted it into `StepCapExceeded`; read the log tail it carries |

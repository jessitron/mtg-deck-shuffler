# 1. Journeys and stages

A Journey models one run of a multi-step, non-transactional process
([ADR-0001](../adr/0001-a-process-is-a-journey.md)). The class declares the process;
the instance is one specific execution of it, and its own record of how that
execution went.

## Declaring a journey

```ruby
class EpisodeImport
  include Briefasaurus::Journey

  attr_reader :show_notes

  stage def fetch_audio      = @audio = need(:audio) { audio_store.fetch(@url) }
  stage def transcribe       = @transcript = excurse(TranscriptAcquisition, audio: @audio)
  stage def generate_notes   = @show_notes = compose_notes(@transcript)

  def initialize(url:) = @url = url

  private

  def compose_notes(transcript) = "…"
end
```

- **Name it as a noun-ified process** — `EpisodeImport`, `ExtractionRun`,
  `CandidateSelection`. Never `FooJourney`; the same rule holds for inner classes
  (`DeduplicationRun::CandidateSelection`).
- `stage def name … end` declares a method and adds it to the **itinerary** in
  declaration order. `stage :a, :b` registers already-defined methods, and
  `stage(:name) { … }` captures the body as a block — one name only, since one body
  cannot be two stages. `diversion` takes all three the same way.
- **Stage bodies are private** (as are `depart`/`arrive` overrides and diversions).
  The machinery resolves stages by name internally; a public stage invites callers
  to run stages out of order, outside the commit-or-snag transaction. A journey's
  public API is verbs (`traverse`/`traverse!`/`continue`/`launch`), predicates, and
  the domain readers over accomplished state.
- Stage bodies communicate through plain ivars (`@audio`, `@transcript`) — the
  composed-method pattern. Declare with `snapshot` anything a later stage depends on
  across a process boundary ([chapter 14](14-snapshots-and-persistence.md)).

## The itinerary and lifecycle

Every itinerary is: `:provision` (framework machinery — resolves macro `need`s,
never overridden), then `:depart`, the declared stages in order, then `:arrive`,
then the reserved `:finished` sentinel.

`depart` and `arrive` are blank, overridable hooks — setup (guards, counters) and
finalization respectively:

```ruby
def depart
  super                       # always first line
  ensure_consented!
  self.emails_requested = source_emails.length
end

def arrive
  emit("extraction_run.succeeded", level: :info, item_count: @extracted_items.length)
  super                       # always last line (before any early return's fallthrough)
end
```

**Every override calls `super`** — first line for `depart`, last for `arrive`. The
base hooks are no-ops today; the convention future-proofs base-hook additions, and
the `Briefasaurus/JourneyLifecycleSuper` cop enforces it.

`stage :finished` in user code raises `StageError` — a journey reaches `:finished`
only by exhausting the itinerary through `:arrive` (ending early is `stage :arrive`).

## Redirects and diversions

Inside a running stage, `stage :other` **provisionally** redirects the cursor; the
redirect commits only if the stage completes normally
([ADR-0002](../adr/0002-registers-itinerary-transactional-step.md)). This is the
divert-back idiom for re-deriving lost state:

```ruby
stage def interpret
  return stage :call_llm if completion_text_missing?   # go re-derive, then come back through
  need(:@interpretation) { excurse(ItemInterpretation, completion: @completion) }
end
```

A **diversion** is a jump-only stage: on no itinerary, reachable only via
`stage :name`, and falling through afterward to wherever the cursor last sat on the
itinerary — a one-shot excursion off the plan, not a rewrite of it:

```ruby
diversion def pause
  wait for: @schedule.interval(@attempts)
  stage :attempt
end
```

## Declaration order

One order in every journey, by the stepdown rule
([ADR-0007](../adr/0007-the-mediation-convention.md)): class-wide facts (AR setup,
`snapshot`, `snapshot_version`, `fail_on`), then **stages** (the table of contents),
then **needs**, then **enacts**, then **excursions**, with `seal_enactments!`
at the end when the manifest is closed. A reader who knows where to look in one
journey knows where to look in all of them.

## When to reach for a journey

Use one when any of these hold: the work isn't safely retried as a single
transaction; intermediate state matters to the caller; a stage calls an external
service, spends quota, or waits; you want multiple named outputs. A pure query,
calculation, or single safe transaction stays a plain method — and a single
outbound effect belongs in a `enact` action, not a class invented to hold it. A
one-stage journey is a fine starting point for work that will grow steps; most
world-touching work does.

## How it's tested

The stage list is pinned by driving, and position asserted by name:

```ruby
RSpec.describe EpisodeImport, type: :journey do
  subject(:run) { described_class.new(url: "https://…") }

  it "walks fetch, transcribe, notes in order" do
    provide audio: fake_audio, transcript_acquisition: done_acquisition
    provide(:completion) { canned_completion }

    run.traverse!

    expect(run).to be_succeeded
    expect(run).to be_past_transcribe
  end
end
```

Never assert `log.include?("transcribe")` or step-count literals
(`5.times { … }`) — they hard-code the log's string shape and the itinerary's
length where `past_transcribe?` and `traverse(to:)` say the same thing robustly.
Chapter 16 covers the harness in full.

## Pitfalls

| You wrote | Instead |
|---|---|
| `class FooJourney` | `class Foo` — noun-ified process, no suffix ([ADR-0001](../adr/0001-a-process-is-a-journey.md)) |
| A public stage method | Stages under `private`; expose readers over accomplished state |
| One monolithic stage | Named `stage`s that read as a table of contents |
| Returning a result hash/struct from a stage | Store on the instance; expose `attr_reader`s |
| Business logic in the controller/job that drove the journey | Move it into stages |
| A `depart`/`arrive` override without `super` | The cop will catch it; add it |
| Needs declared above the stages | Stepdown order: stages, needs, enacts, excursions ([ADR-0007](../adr/0007-the-mediation-convention.md)) |

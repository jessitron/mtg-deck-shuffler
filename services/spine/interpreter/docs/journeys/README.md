# Journeys

A Journey is a noun-ified process object: a class whose instance owns one specific
run of a multi-step, non-transactional task — the kind that calls paid APIs, waits on
the world, half-finishes, and gets retried. The instance is its own record; you drive
it, then ask it what happened.

This README shows the problem before it shows the solution. If you want the rules,
they're in the [ADRs](adr/README.md); if you want the features one at a time with
tests, that's the [guide](guide/README.md); vocabulary is in the
[glossary](glossary.md).

---

## The hidden story

Let me show you a codebase. It's a good codebase. Everyone involved read the right
books.

*Go on.*

It ingests podcast episodes. When a new episode appears in a feed, the app fetches
the audio, gets it transcribed by a paid API, has an LLM write show notes, publishes
the updated feed, and charges the customer's transcription quota. Five distinct
responsibilities, so — five service objects:

```ruby
app/services/
  episode_importer.rb        # orchestrates the others
  audio_fetcher.rb           # downloads audio, stages it in S3
  transcription_requester.rb # kicks off the paid transcription job
  show_notes_generator.rb    # LLM call, writes notes to the episode row
  feed_publisher.rb          # regenerates the feed, purges the CDN
```

Each one has a single public method, a focused name, and a spec file. This is what
"doing it right" looked like: the alternative was a 2,000-line `Episode` model or a
controller that did everything, and the team correctly refused both. Fat models were
split along responsibility lines, each split got a name, and every name got a class.

*This sounds fine. I've written this five times. What's the problem?*

The problem is everything these five classes know about each other that nothing
says out loud. Watch:

```ruby
class EpisodeImporter
  def call(episode)
    return if episode.status == "imported"

    AudioFetcher.new.call(episode)              # must run first…
    TranscriptionRequester.new.call(episode)    # …because this reads episode.audio_s3_key
    # transcription is async; ShowNotesGenerator is invoked from
    # TranscriptionWebhooksController when the callback arrives
  end
end
```

```ruby
class TranscriptionRequester
  def call(episode)
    return if $redis.get("transcribing:#{episode.id}")  # don't double-charge!

    job_id = TranscriptionAPI.request(url: presigned_url(episode.audio_s3_key))
    $redis.setex("transcribing:#{episode.id}", 4.hours.to_i, job_id)
    episode.update!(status: "transcribing")
    QuotaLedger.increment!(episode.podcast.account, minutes: episode.duration / 60)
  end
end
```

Now let me ask the questions the code can't answer.

**Where's the process?** There's a story here — fetch, then transcribe, then wait,
then summarize, then publish, then charge — and it isn't written anywhere. It's
smeared across an orchestrator that runs the first two steps, a webhooks controller
that runs the third, a Sidekiq job that retries the fourth, and a `status` column
that three different classes write to and two others branch on. To learn the order
of operations, you read all five classes plus the controller plus the job, and
reconstruct the timeline in your head.

*The `status` column is the story. `"pending"`, `"fetched"`, `"transcribing"`,
`"transcribed"`, `"imported"`. That's your process, right there in the database.*

It's the process's *shadow*. Nothing enforces the sequence — any class can write any
status; nothing says which statuses can follow which; and when someone adds
`"notes_failed"` next sprint (they will), every `case episode.status` in the app is
now quietly wrong. And notice what the statuses can't say: *how far did the LLM
call get before it died?* *Was the quota already charged?* The status is one word
summarizing a dozen facts, and everyone who needs one of the other eleven goes
spelunking.

**Where's the state between steps?** `AudioFetcher` writes `audio_s3_key` onto the
episode row — not because that column is episode data, but because it's the only
place `TranscriptionRequester` can find it. The `transcribing:#{id}` Redis key is
doing three jobs at once: a mutex, a job-id store, and a four-hour timeout — and if
the process crashes after `TranscriptionAPI.request` but before the `setex`, we've
paid for a transcription that nothing remembers requesting. Retry pays again.

*So fix that one bug. Swap the two lines.*

Then the crash between `setex` and `update!` leaves a Redis key with no matching
status, and the poller ignores the episode forever. There is no order of those lines
that's safe, because the real requirement is "these facts must survive together
across a crash boundary," and neither a status column nor a Redis key is a place to
keep facts-that-survive-together. Every service solves it locally — a guard here, a
`SETNX` there, an `update!` somewhere else — and the sum of the local solutions is
the system's actual (undocumented) crash behavior.

**Who's allowed to retry what?** Sidekiq retries `GenerateShowNotesJob` on any
`StandardError`. Good — except when the LLM provider says the account is out of
credits, which is not going to get better in 30 seconds, and now there are 25
scheduled retries against an account that can't pay, each one burning a rate-limit
slot. Meanwhile when the *transcription* provider has an outage, that error path
marks the episode `"failed"` — terminally — even though it would have succeeded an
hour later. Two errors, and the code treats the permanent one as transient and the
transient one as permanent, because **nothing in a raised exception says which kind
it is**, and each rescue site guessed.

**And how do you test any of this?** The `EpisodeImporter` spec is 300 lines of
mocks. `allow(AudioFetcher).to receive(:new).and_return(fetcher_double)` — times
five, times every context. The specs don't test the process; they test that the
orchestrator calls the mocks in the order the mocks were configured to expect,
which is the same fact written twice. When someone reorders two steps, the specs
fail — and when someone breaks the *actual* contract between two services (the
S3-key handoff, say), the specs pass, because the double never read the column.

*All right. I've felt every one of these. But this is just... what async code in
Rails is like. You add guards and you write runbooks.*

That's the claim I want to push on. None of these people did anything wrong —
they factored by responsibility, which is what we were all taught. But
responsibility-factoring answers "who does this?" and the questions that hurt were
all "**what happens, in what order, what survives a crash, what must not happen
twice, and how far did we get?**" Those are questions about *the process*, and the
process is the one thing that never got a class.

---

## The same story, told by a Journey

Here is the process, as a process:

```ruby
class EpisodeImport < ApplicationRecord
  include Briefasaurus::ActiveRecordJourney

  snapshot :transcript_id, :show_notes
  snapshot audio: { persist: false }            # raw audio never rests in our store

  # An account that can't pay doesn't become solvent by being retried.
  fail_on TranscriptionAPI::InsufficientCredits

  stage def fetch_audio
    @audio = need(:audio) { audio_store.fetch(episode.enclosure_url) }
  end

  stage def transcribe
    @transcript_id = excurse(TranscriptAcquisition, audio: @audio).transcript_id
  end

  docket unique_by: :transcript_id
  stage enact def charge_transcription!(transcript_id:, minutes:)
    quota_ledger.charge(account:, minutes:)
  end

  stage def generate_show_notes
    completion = need(:completion) { llm_adapter.complete(messages: notes_prompt) }
    @show_notes = completion.text
  end

  stage def publish
    return if enacted?(:publish_feed)
    publish_feed(episode_id: episode.id, notes: @show_notes)
  end

  need(:audio_store)   { AudioStore.for(podcast) }
  need(:llm_adapter)   { LlmAdapters.for(account) }
  need(:quota_ledger)  { QuotaLedger.for(account) }

  enact def publish_feed!(episode_id:, notes:)
    episode.update!(show_notes: notes)
    FeedBuilder.rebuild(podcast)
    cdn.purge(podcast.feed_path)
  end

  seal_enactments!
end
```

Read the `stage` lines top to bottom. That's the story — fetch, transcribe, charge,
summarize, publish — in one place, in order, as a table of contents. It isn't
documentation *about* the process; it *is* the process, and the machinery walks it.

*Okay, it reads nicely. Now tell me what happened to my status column, my Redis
key, and my double-charge guard, because those existed for reasons.*

They're all still here — as facts the framework owns instead of conventions you
maintain:

**The status column became four registers.** A journey carries a **log**
(completed stages), a **cursor** (the stage it will attempt next), an **error**
(what went wrong, if anything), and an **enacted ledger** (which effects it has
handed over, and when). Ask it anything: `run.past_transcribe?`,
`run.at?(:publish)`, `run.snagged?`, `run.enacted?(:charge_transcription)`.
Nobody writes these; the machinery does, transactionally with each stage —
[ADR-0002](adr/0002-registers-itinerary-transactional-step.md). Your `"notes_failed"` sprint
never happens, because "how far did it get" and "what went wrong" were never one
word fighting over one column.

**The S3-key-on-the-episode-row hack became `snapshot`.** Stages hand work forward
through plain ivars — `@audio`, `@transcript_id` — and the `snapshot` declaration
says which of those survive a process boundary. The run persists itself at every
stage boundary, resumes in a fresh worker with those ivars restored, and the raw
audio is declared `persist: false` so it *cannot* rest in the database — a resumed
run re-fetches it. Facts that must survive together, surviving together —
[ADR-0008](adr/0008-snapshots.md).

**The Redis mutex became the `enacted` ledger.** The quota charge is declared
with `unique_by: :transcript_id`: charging is recorded on the run itself, a
re-entered stage's repeat handover is elided — skipped, with an event announcing the
skip — and the record survives crashes because it rides the same boundary write as
everything else. There is no order of lines that double-charges, because the guard
isn't lines anymore — [ADR-0006](adr/0006-enactments.md).

**The two mis-classified errors became declarations.** A raised error *parks* the
journey — cursor holds, retryable — so the transcription outage is a **snag**:
step the run again in an hour and it picks up exactly where it stopped. And
`fail_on TranscriptionAPI::InsufficientCredits` declares, once, that *that* answer
is terminal. The framework never guesses which errors are permanent; you say so,
per class, and the declaration even reaches errors raised inside sub-journeys —
[ADR-0003](adr/0003-terminality-is-declared.md).

*What's `excurse`? You buried a whole class in that one-liner.*

Caught. `TranscriptAcquisition` is its own journey — request the job, then poll —
and `excurse` drives it as a child of this one: same execution kit threaded through,
its progress visible to the same listeners, its failure classified by the same
rules. The polling inside it is worth a look, because "wait politely" is its own
discipline:

```ruby
class TranscriptAcquisition
  include Briefasaurus::Journey

  attr_reader :transcript_id

  stage def request
    return if @job_id
    @job_id = need(:job_id) { transcription_api.request(audio: @audio) }
  end

  stage def await_result
    wait for: 30 unless result_ready?
    @transcript_id = need(:transcript_id) { transcription_api.result(@job_id) }
  end
  # ...
end
```

`wait for: 30` parks the run — not as an error, as *waiting*: "nothing is wrong,
and nothing has happened yet." Under an inline drive the wait is honest; under a
job backend the run becomes a row with a `wake_at` and a job scheduled for it, no
worker held; under the fiber outfit one reactor watches every parked run in the
tree. The stage body is identical in all three worlds —
[ADR-0020](adr/0020-waits.md), [ADR-0021](adr/0021-the-fiber-outfit.md).

And notice `request`: the paid API call and the recording of `@job_id` can't strand
money in a crash window, because `@job_id` is snapshot state written at the same
boundary that committed the stage. The orphaned-transcription bug isn't fixed here;
it's unrepresentable.

*Fine. Now the part I actually don't believe: testing. Your service objects were at
least mockable. This thing touches S3, a transcription API, an LLM, Redis, and a
CDN. I've seen what specs for that look like.*

You've seen what they look like when the seams are implicit. Every world-touching
read above went through `need`, and every world-touching write through `enact` —
and those aren't style, they're seams the test harness owns. Here's a real spec:

```ruby
RSpec.describe EpisodeImport, type: :journey do
  subject(:run) { described_class.new(episode:) }

  it "charges for exactly the minutes transcribed, once" do
    provide audio_store: fake_audio_store, quota_ledger: ledger, llm_adapter: fake_llm
    provide transcript_acquisition: finished_acquisition(transcript_id: "t-1", minutes: 42)
    provide(:completion) { fake_llm.complete(messages: anything) }

    run.traverse!

    expect(run).to have_enacted(:charge_transcription)
      .with(transcript_id: "t-1", minutes: 42)
    expect(run).to have_enacted(:publish_feed)
  end
end
```

No mocks. No stubs. No spies. `provide` answers the needs — including the entire
`TranscriptAcquisition` child, provided past under its synthesized name without ever
running. The enactments never execute; they're recorded on a manifest, and the
spec asserts the manifest. If a stage reaches for a need nobody provided, the spec
fails loudly rather than quietly touching the real world. Straight-line,
deterministic, fully isolated, fast — and the waiting is testable the same way,
because time in a journey spec only moves when the spec says `advance 30`.

*One question you haven't answered. The service-object version had five small
classes; you have journeys with needs, enacts, snapshots, dockets, waits.
Isn't this just more machinery?*

It's the same machinery your version had — the status column, the Redis keys, the
retry policy, the mock forest, the runbook — except written down once, owned by a
framework, checked by tests, and shaped the same in every process you'll ever write
here. The service-object version doesn't lack the machinery; it lacks the *names*.
You paid for a process model either way. This one you can read.

---

## Where to go next

- **[The guide](guide/README.md)** — every feature, in reading order, each with
  working examples and the spec that pins it.
- **[The ADRs](adr/README.md)** — the decisions and invariants, with the failures
  that motivated them. Start with
  [ADR-0001](adr/0001-a-process-is-a-journey.md).
- **[The glossary](glossary.md)** — the travel lexicon, one entry per concept.
- **[The roadmap](roadmap.md)** — accepted changes not yet made.
- **Real journeys** — `app/models/briefasaurus/extraction_run.rb` is the flagship;
  `app/models/briefasaurus/data_purge.rb` shows a sealed manifest;
  `lib/journey/retries_guide.rb` is a guide implemented as a journey.

*(The examples above use a fictional podcast app so the story stays small; the
framework currently lives in this repository as `Briefasaurus::Journey`, en route to
extraction as its own gem — [ADR-0023](adr/0023-the-framework-host-boundary.md).)*

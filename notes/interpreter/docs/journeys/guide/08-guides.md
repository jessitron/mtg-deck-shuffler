# 8. Guides: flow-changing middleware, as journeys

A **guide** is middleware for a single excursion — the thing you reach for instead
of a hand-written retry loop. It is a journey wrapping another journey, built from
a **maker** because re-creation is the point: a failed journey is over, and only a
guide holding the maker can lawfully build the next attempt
([ADR-0015](../adr/0015-guides.md)).

## Engaging one

Any keyword `excurse` doesn't claim for itself is a guide lookup, its value
splatting into the guide's construction — one feature at two levels of detail:

```ruby
stage def fetch = @page = excurse(FetchPage, url:, retries: 3)
stage def fetch = @page = excurse(FetchPage, url:,
                                  retries: { times: 3, wait: 30, backoff: :exponential })
```

You get the `FetchPage` back, not the wrapper — a guide answers `journey_guided`
with what it guided. Names resolve by registry
(`Journey.guide(:name, Klass)` for what an application adds) then by convention:
`retries:` finds `RetriesGuide` in the `Journey` namespace with no registration.
Engaging a guide whose keyword the child's own `initialize` declares is an
`ArgumentError` naming both; the escape hatch is building the child yourself and
using the bare form.

## What `retries:` actually does

`RetriesGuide` re-**creates** the child on a **declared failure** and drives the
new one; between attempts it parks on a `Wake` (a wait diversion — no worker
sleeps, and the backoff is testable on a virtual clock,
[chapter 13](13-waiting.md)). A *snag* is deliberately not retried: a snagged
child is already retryable by whoever is stepping the run, and absorbing it would
take that decision away from them.

## The rules that keep guides sane

- **A guide governs the excursion that engaged it and nothing below.**
  `excurse(DoThing, retries: 3)` says nothing about `DoThing`'s own children.
- **There is no ambient or standing guide set, deliberately.** A standing guide
  would silently extend behavior past the rule above — and it doesn't terminate: it
  would apply to the excursions guides themselves make. Subsystems that want
  retries write `retries:` at the call sites that want them, which is also where a
  reader looks for them.
- **A class never declares its own standing guides** — self-wrapping is the one
  relationship the mechanism cannot express, and every rung is the owner's
  declaration. (Which is also why `fail_on` is not a guide: it is a journey's
  declaration about its own stage bodies — a sibling of this layer, not a subject
  of it.)
- A guide decides **whether and how the child runs again** — a question about
  driving. Reinterpreting outcomes belongs to condition strategies
  ([chapter 7](07-condition-handling.md)); a guide that swallows a failure into
  silence is an `on_error:` written in the wrong place.

Writing your own: a journey named `<Name>Guide` in the `Journey` namespace, taking
`(maker, **options)`, is reachable with no registration. Its mechanism is ordinary
journey machinery — stages, a diversion back to the attempt, a counter — so it is
specced like any journey.

## How it's tested

The guide's behavior reads off the child it returns and the clock it parked on:

```ruby
it "re-creates and retries a failed child, backing off" do
  attempts = 0
  provide(:fetch_page) { attempts += 1; attempts < 3 ? failed_fetch : good_fetch }

  run.traverse                       # first two attempts fail; guide parks between
  advance 30                         # virtual clock — no real waiting
  run.traverse
  advance 60
  run.traverse!

  expect(run).to be_succeeded
  expect(attempts).to eq(3)
end
```

(`RetriesGuide`'s own spec pins re-creation, the declared-failure-only rule, and
schedule arithmetic; an application guide's spec follows the same shape.)

## Pitfalls

| You wrote | Instead |
|---|---|
| A hand-rolled retry loop around a sub-journey | `excurse(Child, retries: n)` — a loop trips the disposability guard; a guide re-creates |
| Retrying snags in a guide | Snags are the stepper's to retry; guides act on declared failures |
| A standing/ambient guide set | Write the keyword at the call sites that want it |
| "I am always retried" declared on the child class | The owner's call site declares it |
| A guide inspecting the child's registers to reinterpret a stage | Guides drive; strategies interpret |

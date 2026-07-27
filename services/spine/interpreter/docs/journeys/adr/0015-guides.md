# ADR-0015 — Guides: middleware is a journey wrapping a journey

**Status:** accepted

## Context

Crosscutting behavior that *changes flow* — retry this child, wait between attempts,
try another way — kept being requested of the listener layer, whose whole contract is
describe-never-decide ([ADR-0011](0011-listeners-describe-never-decide.md)). Written
by hand at call sites, a retry loop around a sub-journey also trips the disposability
guard: a failed journey is over, and a loop cannot re-drive it.

## Decision

**A middleware is a `Guide` — a Journey wrapping another Journey, built from a
maker.** Its mechanism is the journey machinery itself, recursively applied — its own
stages, a diversion back to the driving stage, a counter — not a second pipeline
concept. It takes a **maker**, not a built child, because re-creation is what a
modifier is usually for (journeys are disposable —
[ADR-0001](0001-a-process-is-a-journey.md)).

- **Engagement is a keyword on `excurse`**: any keyword the verbs don't claim is a
  guide lookup, its value splatting into the guide's construction — one feature at
  two levels of detail:

  ```ruby
  excurse(FetchPage, url:, retries: 3)
  excurse(FetchPage, url:, retries: { times: 3, wait: 30, backoff: :exponential })
  ```

- **Names resolve by registry, then convention**: `retries:` finds `RetriesGuide` in
  the `Journey` namespace with no registration (non-inheriting constant lookup;
  hand-rolled camelization — no Rails on the framework side of the line).
  `Journey.guide(:name, Klass)` registers what an application adds. Engaging a guide
  whose keyword the target's own `initialize` declares is an `ArgumentError` naming
  both (a collision is a message, not a silent theft; `**rest` constructors are the
  documented blind spot; escape hatch: build the child yourself, use the bare form).
- **A guide governs the one excursion that engaged it and does not descend.** There
  is deliberately no ambient/standing guide set: it would hand callers silent
  extension, and it does not terminate — a standing guide would apply to the
  excursions guides themselves make. A subsystem that wants retries writes
  `retries:` at the call sites that want them, which is also where a reader looks.
- **A class never declares its own standing guides** — that is self-wrapping, the one
  relationship the mechanism cannot express. Same rule as condition strategies: every
  rung is the *owner's* declaration. (`fail_on` is therefore not a guide and never
  will be: it is a journey's declaration about its own stage bodies — a sibling of
  this layer, not a subject of it.)
- **`RetriesGuide`** is the shipped exemplar: it re-*creates* on a **declared
  failure** only — a snag is already retryable by whoever steps the run, and
  absorbing it would take that decision away — waits by parking on a `Wake`
  ([ADR-0020](0020-waits.md)) rather than sleeping, and answers `journey_guided`,
  so the owner gets back the child it named, not the wrapper.
- A guide decides **whether and how the child runs again** — a question about
  driving. It does not inspect a child's registers to reinterpret a stage, does not
  manufacture outfits, and does not swallow failure into silence (that is an
  `on_error:` strategy's job, in its proper place —
  [ADR-0014](0014-a-childs-trouble-is-the-owners-to-interpret.md)).

## Consequences

- `excurse(Child, retries: n)` replaces every hand-rolled retry loop, correctly —
  re-creating what a loop could only illegally re-drive.
- New crosscutting behaviors are new guides — plain journeys, testable like any
  other — reachable by convention with zero registration when named `<Name>Guide`.
- Flow-changing requests aimed at listeners have a principled redirect: listeners
  describe, guides decide.

# ADR-0001 — A process is a Journey: a noun-ified process object that is its own record

**Status:** accepted

## Context

Multi-step, world-touching work does not fit a service object. Any real process —
retrieve emails, call an LLM, store items, charge a quota — has stages that take
indeterminate time, fail recoverably or terminally, pend on external state, consume
paid quota, and leave persistent artifacts that no transaction can roll back. A
service object flattens all of that into one call whose only outputs are a return
value and whatever exceptions escape, which forces callers to invent result objects,
status flags, callbacks, and retry bookkeeping — externalizing state the process
itself should own.

And whatever the call did not return is gone. The doer is discarded at return, its
past results with it, so the facts wanted six months later — which stage stalled,
what it cost, what it had already handed over — were never anywhere to be kept. This
is what survives the obvious answer of "return a richer struct": a result object
holds only what somebody knew to ask for at design time, and the questions that
matter arrive later than the design does.

## Decision

A non-transactional, multi-step task is modeled as a **Journey**: a class including
`Journey` (or `ActiveRecordJourney` when a run must survive a process boundary) whose
instance represents **one specific run** of the process — "the extraction Bob Smith
started at 8:20 AM."

- **Named as a noun-ified process** — `ExtractionRun`, `EmailRetrieval`,
  `CandidateSelection`. The word "Journey" never appears in the class name.
- **The journey is its own record.** It embraces mutability: collaborators query the
  instance after driving it (`cursor`, `log`, `error`, `succeeded?`, `failed?`,
  `snagged?`, `over?`, plus domain readers) rather than a separate result/status
  object or callbacks.
- **Journeys are disposable.** A run that is `over?` — reached `:finished`, or was
  failed/abandoned — cannot be re-driven; the disposability guard raises
  `Journey::StageError`. Repeating the process means a new instance. A *snagged*
  journey (parked on a recoverable snag) is not over and is retried by stepping it
  again — retry is re-entry, never reset.
- The whole-journey `#travel` template method does not exist: traversal is a
  conveyance stepping declared stages ([ADR-0002](0002-registers-itinerary-transactional-step.md)),
  so there is no single method for a subclass to monolithically override.

## Consequences

- Callers read outcomes off the instance; there is no parallel result-object type to
  keep in sync.
- Disposability makes retry semantics unambiguous: anything that "re-runs" a
  finished/failed journey is creating a new one, visibly (this is why guides
  re-*create* rather than reset — [ADR-0015](0015-guides.md)).
- A one-stage Journey is a legitimate starting point for work that will grow steps;
  converting a service object later is the more disruptive move. Pure queries,
  calculations, and single safe transactions stay plain methods — and a single
  outbound effect belongs in a `enact` action ([ADR-0006](0006-enactments.md)),
  not a class invented to hold it.

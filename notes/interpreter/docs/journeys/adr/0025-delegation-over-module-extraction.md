# ADR-0025 — Break up big classes by delegation, not module extraction

**Status:** accepted

## Context

The core journey file grew as every layer landed on one class body. The reflexive
Ruby fix — split it into modules and re-`include` them — is a fig leaf: the design
isn't improved so much as the problem is obscured, since everything still shares one
object's ivars, one namespace, and one set of implicit invariants, and the count of
things a reader must hold in mind is unchanged.

## Decision

**Extract named collaborators that own state and answer questions; keep mixins only
for what a host genuinely answers for.** The test applied to every candidate: does it
hold state and enforce rules (a collaborator), or does it only relocate methods that
still live on the journey's own ivars (a mixin)?

The extractions that resulted, each removing state and rules from the journey rather
than relocating lines:

- **`Declarations`** — what a class declared and the rules of declaring (registries,
  inheritance-by-copy, the docket, sealing switches).
- **`Position`** — log, cursor, and derived program counter as one object, because
  they change together on every commit and the rules over them (provisional-next,
  diversion fall-through, counter-from-log) are the pattern's least obvious. The
  plan is asked for, never held.
- **`Outcome`** — the closed value the outcome path throws and records, ending the
  two-ivars-that-could-disagree shape.
- **`Snapshotter`** / **`Audience`** / **`Excursion`** (a request object — the four
  call-site shapes *are* the state) / **`Handover`** (one effect's crossing, a
  sequence of gates over a single triple) / **`EnactedLedger`** (owns its entries,
  answers questions, serializes itself — the pattern to copy).
- Retired outright where there was no state and no rule: a twelve-line
  observer-protocol veneer was deleted, not preserved.

What stays a mixin: the class-side DSL host (macros must run in the declaring class's
context), and the methods a host answers for (`#snapshot`, the listener list, the
traversal surface).

## Consequences

- This is general guidance for the codebase, not just history of one file: when a
  class grows past comfort, find the collaborator with its own state and name it;
  another `include` is the fig leaf.
- Collaborators needing journey internals get **public machinery** methods
  (`journey_`-prefixed, on the `journey_do_stage` precedent) rather than `send` —
  namespaced so they never read as journey-author API. The `@journey_` ivar prefix is
  reserved for the machinery, so framework state never collides with a stage's
  domain ivars.

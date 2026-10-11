# ADR-0014 — A child's trouble is the owner's to interpret

**Status:** accepted

## Context

Under the original excursion rules, a snagging child's error re-raised into the
parent's stage body (rescuable), but a failed child went through `fail!`'s throw —
past every `rescue` in the body. `sandwich = excurse(MakeSandwich)` with an empty
fridge ended the parent with no opportunity to order takeout: the child's declaration
bound an owner that had declared nothing, inverting the principle that terminality's
consequences are the owner's explicit choice.

## Decision

**Two halves, one mechanism — the condition-system shape without restarts.**

- **A failed child raises rather than throws.** `Journey::ChildFailed <
  StandardError` carries the child and its reason into the parent's stage body;
  the terminality classifier treats it as terminal by default. Unhandled, the parent
  fails carrying the child's reason — exactly the old behavior. Handled, the fallback
  is Ruby's own idiom: `rescue Journey::ChildFailed`.
- **Any excursion or rejoin may carry a condition-handler strategy** — anything
  answering `call(trouble)`, sugared as a block on the invoking call, or named via
  `on_error:` (a Symbol resolving through a registry; block and `on_error:` are one
  slot, both together is `ArgumentError`; the *named* excursion form's block is
  already spent on deferred construction, so it takes `on_error:` only). The handler
  is **held by the owner, never the child**, runs in the **owner's context** (so the
  owner's own machinery is legal inside it), and **may influence the return value**.
- Two strategies ship. **`:propagate`** (default): an unhandled snag snags the
  owner, an unhandled failure fails it. **`:return`**: trouble comes back as a value —
  `Journey::Trouble(child:, reason:, failed:, snagged:)` for one child,
  `Journey::Muster(arrived:, troubled:)` for a rejoin, its `troubled` made of
  Troubles — so a stage body reads good and bad paths in one `case … in`. A clean
  call returns what it always returned; a Muster appears only when there is trouble
  to describe.
- **Snagged and failed stay distinguishable** in the value: a strategy decides how
  much of a child's terminality the owner accepts, and downgrading a failure into
  data must be a knowing act.
- **The default is selectable at every level** — call site, drive/outfit, journey
  class, ambient (`:propagate`) — because pattern-matching-on-values is a legitimate
  house style. Every rung is the **owner's** declaration; a child never decides what
  its trouble means to whoever sent it.
- A `Trouble` carries the child itself (every promised idiom takes the journey) and
  is **flight-only** — never a snapshot member; extract identifiers to cross a
  boundary. `ChildFailed` and `Trouble` are two things converted at one point: the
  exception serves the stack and the classifier, the value serves `case … in` — the
  snag case raises the child's *original* error, so unifying them would demand a
  `ChildSnagged` nobody asked for.
- A **waiting** child is not trouble and never reaches a strategy: an owner blocked
  on a child on wait goes on wait, on the child's wake
  ([ADR-0020](0020-waits.md)).

## Consequences

- The complete boundary table: child snagged → owner snags; failed → owner fails
  (`ChildFailed` rescuable); on wait → owner on wait; arrived → carry on.
- Restarts — a handler that *resumes* the child at a named recovery point — are
  deliberately absent; they wait on mid-stage suspension the fiber outfit does not do
  ([ADR-0021](0021-the-fiber-outfit.md)).
- The hazard of an app-wide `:return`: a caller that ignores the value drops trouble
  silently where `:propagate` would have stopped — diagnostic-listener territory,
  warn-never-raise ([ADR-0011](0011-listeners-describe-never-decide.md)).
